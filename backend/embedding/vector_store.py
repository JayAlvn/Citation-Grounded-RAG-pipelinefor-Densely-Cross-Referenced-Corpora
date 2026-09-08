import chromadb

from .embedder import embed_batch, embed_text

client = chromadb.PersistentClient(path='./chroma_db')

collection = client.get_or_create_collection(
    'fraud_rag',
    metadata={"hnsw:space": "cosine"},
)

# Location keys a chunk may carry; absent ones are left out entirely,
# since Chroma rejects None metadata values.
_LOCATION_KEYS = ("page", "recital", "article", "chapter")


def _chunk_text(chunk: str | dict) -> str:
    if isinstance(chunk, dict):
        return chunk["text"]
    
    return chunk

def _chunk_metadata(chunk: str | dict, doc_name: str) -> dict:
    
    meta = {"source:": doc_name}

    if isinstance(chunk, dict):
        for key in _LOCATION_KEYS:
            if key in chunk:
                meta[key] = chunk[key]

    return meta

def _prepare_chunks(chunks: list[str] | list[dict], doc_name: str) -> tuple[list[str], list[dict]]:

    texts = []
    metadatas = []

    for chunk in chunks:
        meta = {"source": doc_name}
        if isinstance(chunk, dict):
            texts.append(chunk["text"])
            for key in _LOCATION_KEYS:
                if key in chunk:
                    meta[key] = chunk[key]

        else:
            texts.append(chunk)

        metadatas.append(meta)

    return texts, metadatas

def store_chunks(texts: list[str], embeddings: list, metadatas: list[dict],
                 doc_name: str) -> None:
    ids = [f"{doc_name}_chunk_{i}" for i in range(len(texts))]

    collection.delete(where={"source": doc_name})
    collection.upsert(
        documents=texts,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas,
    )

def embed_and_store_chunks(chunks: list[str] | list[dict], doc_name: str) -> None:
    texts, metadatas = _prepare_chunks(chunks, doc_name)
    embeddings = embed_batch(texts)
    store_chunks(texts, embeddings, metadatas, doc_name)

def query(query_text: str, n=2, source: str | None = None) -> list[str]:
    query_vector = embed_text(query_text)
    where = {"source": source} if source else None
    results = collection.query(query_embeddings=[query_vector], n_results=n, where=where)

    return results['documents'][0], results['distances'][0]

def _where_all(conditions: dict) -> dict:
    """Chroma accepts a bare {key: value} only for a single condition."""
    clauses = [{key: {"$eq": value}} for key, value in conditions.items()]

    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


def _chunk_index(chunk_id: str) -> int:
    """Sort key recovering position from the '{doc}_chunk_{i}' id."""
    tail = chunk_id.rsplit("_chunk_", 1)[-1]

    return int(tail) if tail.isdigit() else 0


def metadata_lookup(conditions: dict, limit: int = 6) -> tuple[list[str], list[dict]]:
    if not conditions:
        return [], []

    data = collection.get(where=_where_all(conditions),
                          include=["documents", "metadatas"])

    ordered = sorted(zip(data["ids"], data["documents"], data["metadatas"]),
                     key=lambda row: _chunk_index(row[0]))[:limit]

    return [row[1] for row in ordered], [row[2] for row in ordered]


def get_all_chunks(source: str | None = None):

    where = {"source": source} if source else None
    data = collection.get(where=where, include=['documents'])

    return data["ids"], data["documents"]


def _values_for(metas: list[dict], key: str) -> list:
    values = []
    for meta in metas:
        if key in meta:
            values.append(meta[key])

    return values

def get_document_stats(doc_name: str) -> dict:
    data = collection.get(where={
        "source": doc_name},
        include=["metadatas"]
    )
    metas = data["metadatas"]

    if not metas:
        return {}

    stats = {"chunks": len(metas)}

    pages = _values_for(metas, "page")
    if pages:
        stats["pages"] = max(pages)

    for key in ("article", "recital", "chapter"):
        values = _values_for(metas, key)
        if values:
            stats[key + "s"] = len(set(values))

    return stats


def semantic_rank(query_text: str, source: str | None = None):
    ids_all, _ = get_all_chunks(source)
    total = len(ids_all)
    if total == 0:
        return []

    query_vector = embed_text(query_text)

    where  = {"source": source} if source else None

    results = collection.query(
        query_embeddings = [query_vector],
        n_results = total,
        where=where,
        include =["documents", "distances", "metadatas"],
    )
    return list(zip(
        results["ids"][0],
        results["documents"][0],
        results["distances"][0],
        results["metadatas"][0],
    ))

def delete_document(doc_name: str):
    collection.delete(where={"source": doc_name})