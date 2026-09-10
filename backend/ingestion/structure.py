"""Structural markers in legal/regulatory documents.
Recitals, articles and chapters are addressable by number, so queries like
"clause 148" can be answered by an exact metadata filter. This module locates
those markers in extracted text; the chunker turns them into boundaries.
"""
import re

# A recital marker sits alone on its line: "(148)".
_CLAUSE = re.compile(r"^\((\d{1,3})\)[ \t]*$", re.M)
_UNIT = r"Article|Section|Clause|Rule|Annex|Schedule|Exhibit|Appendix|Chapter|Part|Title"

_HEADING = re.compile(
    rf"^({_UNIT})\s+(\d{{1,3}}|[IVXLC]{{1,7}}|[A-Z])[ \t]*$",
    re.M | re.I,
)

_CONTAINERS = ("chapter", "part", "title")

def _find_recitals(text: str) -> list[tuple[int, str, int]]:
    """Locate recital markers, skipping footnote markers."""
    marks = []
    expected = 1
    for m in _CLAUSE.finditer(text):
        if int(m.group(1)) == expected:
            marks.append((m.start(), "recital", expected))
            expected += 1
    return marks


def find_markers(text: str) -> list[tuple[int, str, int | str]]:
    """Return (offset, kind, value) for every structural marker, in order."""

    marks = _find_recitals(text)

    for m in _HEADING.finditer(text):
        kind = m.group(1).lower()
        value = m.group(2)
        if value.isdigit():
            value = int(value)
        marks.append((m.start(), kind, value))  

    marks.sort(key=lambda mark: mark[0])

    return marks
