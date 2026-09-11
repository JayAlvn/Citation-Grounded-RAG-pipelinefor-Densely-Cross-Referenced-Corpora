
from ingestion.references import extract_references
from ingestion.structure import _CONTAINERS

# turns one chunk's metadata into its node id. 
def _node_of(meta: dict) ->  str | None:
    container = None
    for key in meta:
        if key == "source" or key == "page":
            continue
        if key not in _CONTAINERS:
            return f"{key}:{meta[key]}"
        container = key
    if container is not None:
        return f"{container}:{meta[container]}"
    
    return None


def build_edges(texts: list[str], metas: list[dict]) -> list[tuple]:

    edges = set()
    nodes = set()

    for meta in metas:
        node = _node_of(meta)
        if node is not None:
            nodes.add(node)
    
    for text, meta in zip(texts, metas):
        source = _node_of(meta)
        if source is None:
            continue
        for ref in extract_references(text):
            if ref["external"]:
                target = f"ext:{ref['instrument']}"
                edge_type = "external"
            else:
                target = f"{ref['kind']}:{ref['id']}"
                if target == source:
                    continue
                if target in nodes:
                    edge_type = "internal"
                else:
                    edge_type = "missing"
        
            edges.add((source, target, edge_type))

    return sorted(edges)


if __name__ == "__main__":
    texts = [
        "Article 5 applies, as does Annex III.",
        "See Article 99 and Article 11 of Regulation (EU) 2019/2144.",
        "Annex III lists high-risk systems.",
    ]
    metas = [
        {"source": "x.pdf", "article": 6, "chapter": "III"},
        {"source": "x.pdf", "article": 5, "chapter": "II"},
        {"source": "x.pdf", "annex": "III"},
    ]
    for edge in build_edges(texts, metas):
        print(edge)