import json
import logging
from typing import Tuple

from ollama_client import build_field_json_schema, generate

logger = logging.getLogger(__name__)

DETECTION_SYSTEM_PROMPT = """You are a document classifier for a property management CRM.
Given OCR text from a scanned document and a list of available data collections,
select the single best-matching collection.

Return ONLY a JSON object matching the schema provided.
If no collection matches well, set "collection" to "none".
Do not invent collection names — use only the ones listed."""


async def detect_collection(
    ocr_text: str,
    collections: list[dict],
) -> Tuple[str, float]:
    collection_names = [c["name"] for c in collections]
    collections_summary = _summarize_collections(collections)

    user_prompt = f"""Available collections: {', '.join(collection_names)}

Collection details:
{collections_summary}

OCR Text:
{ocr_text}

Which collection best matches this document?"""

    schema = _build_detection_schema(collection_names)

    response = await generate(
        prompt=user_prompt,
        system=DETECTION_SYSTEM_PROMPT,
        json_schema=schema,
        temperature=0.1,
    )

    try:
        result = json.loads(response.strip())
        candidate = str(result.get("collection", "none"))
        confidence = float(result.get("confidence", 0.0))
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        logger.warning(f"Failed to parse detection response: {response[:200]} — {e}")
        return "none", 0.0

    logger.info(
        f"Collection detection: {candidate} (confidence={confidence:.2f})"
    )
    return candidate, confidence


def _build_detection_schema(collection_names: list[str]) -> dict:
    return {
        "type": "object",
        "properties": {
            "collection": {
                "type": "string",
                "enum": collection_names + ["none"],
                "description": "The best-matching collection name, or 'none'",
            },
            "confidence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Confidence score between 0 and 1",
            },
            "reason": {
                "type": "string",
                "description": "Brief one-sentence explanation",
            },
        },
        "required": ["collection", "confidence"],
    }


def _summarize_collections(collections: list[dict]) -> str:
    lines = []
    for col in collections:
        name = col.get("name", "unknown")
        fields = col.get("fields", [])
        field_descriptions = []
        for f in fields:
            fname = f.get("name", "")
            ftype = f.get("type", "")
            if fname in ("id", "created", "updated"):
                continue
            if ftype == "file":
                continue
            desc = fname
            if ftype == "select":
                vals = f.get("values", [])
                if vals:
                    desc += f" ({', '.join(vals[:3])}{'...' if len(vals) > 3 else ''})"
            if f.get("required"):
                desc += " [required]"
            field_descriptions.append(desc)
        lines.append(f"  {name}: {', '.join(field_descriptions)}")
    return "\n".join(lines)
