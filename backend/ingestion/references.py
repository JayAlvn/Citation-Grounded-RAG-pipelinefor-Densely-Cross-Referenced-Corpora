import re 
from ingestion.structure import _UNIT

_REFERENCE = re.compile(
    rf"\b((?i:{_UNIT}))\s+(\d{{1,3}}|[IVXLC]{{1,7}}|[A-Z])\b(?:\((\d{{1,3}})\))?"
)

#points at another document
#e.g "Article 11 of Regulation .."
_OF_ANOTHER = re.compile(
    rf"\s+of\s+(?:the\s+)?(?!(?:{_UNIT})\b)"
    r"([A-Z][^,;:\n]{0,60}?)"
    r"(?=[,;:\n]|\.\s|\.$|\s+(?:of|and)\b|$)"
)

#three or more capitals after a number
#e.g "Artivle 114 TFEU"
_ACRONYM = re.compile(r"[ \t]+([A-Z]{3,})\b")

#returns true if the match sits alone, that is, a title, not reference
def _is_heading(text: str, start: int, end: int) -> bool:
    line_start = text.rfind("\n", 0, start) + 1
    line_end = text.find("\n", end)

    if line_end == -1:
        line_end = len(text)

    before = text[line_start:start].strip()
    after = text[end:line_end].strip()

    return before == "" and after == ""

#determines if the text after reference names another document 
def _instrument(text: str, end: int) -> str | None:
    named = _OF_ANOTHER.match(text, end)
    if named:
        return named.group(1).strip()
    
    acronym = _ACRONYM.match(text, end)
    if acronym:
        return acronym.group(1)
    
    return None

def extract_references(text: str) -> list[dict]:

    refs = []
    seen = set()

    for match in _REFERENCE.finditer(text):
        if _is_heading(text, match.start(), match.end()):
            continue

        kind = match.group(1).lower()
        ident = match.group(2)

        if ident.isdigit():
            ident = int(ident)
        
        paragraph = match.group(3)
        if paragraph is not None:
            paragraph = int(paragraph)

        #internal or external
        instrument = _instrument(text, match.end())

        key = (kind, ident, instrument)
        if key in seen:
            continue
        seen.add(key)

        refs.append({
            "kind": kind,
            "id": ident,
            "paragraph": paragraph,
            "external": instrument is not None,
            "instrument": instrument,
        })

    return refs

if __name__ == "__main__":
    sample = (
    "Article 6\n"
    "Classification rules\n"
    "1. As referred to in Article 5(2) and Annex III, the requirements of\n"
    "Chapter III, Section 2 apply. Article 11 of Regulation (EU) 2019/2144\n"
    "applies, as does Article 114 TFEU. See also Article 5 of this Regulation.\n"
    )
    for ref in extract_references(sample):
        print(ref)

