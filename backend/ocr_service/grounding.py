import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def _fuzzy_find(value: str, text: str) -> float:
    if not value or not text:
        return 0.0

    norm_value = _normalize(value)
    norm_text = _normalize(text)

    if not norm_value:
        return 0.0

    if norm_value in norm_text:
        return 1.0

    words = norm_value.split()
    if len(words) <= 2:
        single_word = norm_value
        if single_word in norm_text:
            return 0.95
        return 0.0

    matched = sum(1 for w in words if w in norm_text)
    ratio = matched / len(words)
    return ratio


def _check_date(value: Any, text: str) -> float:
    if not value:
        return 0.0
    s = str(value)
    date_forms = [
        s,
        s.replace("-", "/"),
        s.replace("-", ""),
    ]
    for form in date_forms:
        if _normalize(form) in _normalize(text):
            return 1.0
    return 0.0


def _check_number(value: Any, text: str) -> float:
    if value is None:
        return 0.0
    s = str(value)
    formats = [s]
    try:
        n = float(s)
        if n == int(n):
            formats.append(str(int(n)))
            formats.append(f"{int(n):,}")
        formats.append(f"{n:,.2f}")
    except ValueError:
        pass
    norm_text = _normalize(text)
    for form in formats:
        if _normalize(form) in norm_text:
            return 1.0
    return 0.0


def check_confidence(
    ocr_text: str,
    extracted_fields: dict[str, Any],
    collection_fields: list[dict],
) -> dict[str, dict]:
    results = {}
    field_map = {}
    for f in collection_fields:
        field_map[f.get("name")] = f

    for field_name, value in extracted_fields.items():
        if value is None or value == "":
            results[field_name] = {
                "score": 0.0,
                "flagged": True,
                "note": "No value extracted",
            }
            continue

        field_def = field_map.get(field_name, {})
        field_type = field_def.get("type", "text")

        if field_type == "date":
            score = _check_date(value, ocr_text)
        elif field_type == "number":
            score = _check_number(value, ocr_text)
        elif field_type == "bool":
            score = 1.0 if str(value).lower() in ocr_text.lower() else 0.0
        elif field_type == "select":
            score = 1.0 if str(value).lower() in ocr_text.lower() else 0.0
        else:
            score = _fuzzy_find(str(value), ocr_text)

        flagged = score < 0.5
        if score >= 0.99:
            note = "Exact match in source text"
        elif score >= 0.7:
            note = "Partial match in source text"
        elif score > 0.0:
            note = "Weak match — may not be in source text"
        else:
            note = "Not found in source text — verify carefully"

        results[field_name] = {
            "score": round(score, 3),
            "flagged": flagged,
            "note": note,
        }

    return results
