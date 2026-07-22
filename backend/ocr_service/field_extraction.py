import json
import logging
from typing import Any

from ollama_client import build_field_json_schema, generate

logger = logging.getLogger(__name__)


async def extract_fields(
    ocr_text: str,
    collection_name: str,
    fields: list[dict],
) -> dict[str, Any]:
    schema = build_field_json_schema(fields)

    field_list = "\n".join(
        f"  - {f['name']} ({f.get('type', 'text')})"
        + (f" allowed: {f['values']}" if f.get("values") else "")
        + (" [required]" if f.get("required") else "")
        for f in fields
        if f.get("name") not in ("id", "created", "updated")
        and f.get("type") not in ("file",)
    )

    user_prompt = f"""Collection: {collection_name}

Fields:
{field_list}

OCR Text:
{ocr_text}

Extract the field values as a JSON object matching the required schema.
Set missing or uncertain fields to null.
For dates use YYYY-MM-DD format.
For numbers use raw numeric values."""

    response = await generate(
        prompt=user_prompt,
        json_schema=schema,
        temperature=0.1,
        max_tokens=4096,
    )

    try:
        result = json.loads(response.strip())
        if not isinstance(result, dict):
            logger.warning(f"Extraction returned non-dict: {type(result)}")
            return {}
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Failed to parse extraction response: {response[:300]} — {e}")
        return {}

    cleaned = {
        key: _normalize_null(val)
        for key, val in result.items()
    }

    logger.info(f"Extracted {len(cleaned)} fields from {collection_name}")
    return cleaned


def _normalize_null(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str) and value.strip().lower() in ("null", "none", ""):
        return None
    return value
