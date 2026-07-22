import httpx
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:7b")


async def _request(
    endpoint: str,
    payload: dict,
    timeout: int = 120,
) -> dict:
    url = f"{OLLAMA_BASE_URL}{endpoint}"
    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout)) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code >= 400:
            body = resp.text
            logger.error(f"Ollama {resp.status_code} on {endpoint}: {body[:500]}")
        resp.raise_for_status()
        return resp.json()


async def generate(
    prompt: str,
    system: str = "",
    model: str = DEFAULT_MODEL,
    temperature: float = 0.1,
    json_mode: bool = False,
    json_schema: Optional[dict] = None,
    max_tokens: int = 2048,
) -> str:
    body = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "temperature": temperature,
        "stream": False,
        "options": {
            "num_predict": max_tokens,
        },
    }
    if json_schema is not None:
        body["format"] = json_schema
    elif json_mode:
        body["format"] = "json"

    try:
        data = await _request("/api/generate", body)
        return data.get("response", "")
    except Exception as e:
        logger.error(f"Ollama request failed: {e}")
        raise


def pb_field_to_json_schema(field: dict) -> dict:
    ftype = field.get("type", "text")
    values = field.get("values", [])

    schema = {}

    if ftype == "number":
        schema["type"] = "number"
        if field.get("min") is not None:
            schema["minimum"] = field["min"]
        if field.get("max") is not None:
            schema["maximum"] = field["max"]
    elif ftype == "bool":
        schema["type"] = "boolean"
    elif ftype == "select":
        if values:
            schema["type"] = "string"
            schema["enum"] = list(values)
        else:
            schema["type"] = "string"
    elif ftype == "date":
        schema["type"] = "string"
    elif ftype == "email":
        schema["type"] = "string"
    elif ftype == "url":
        schema["type"] = "string"
    elif ftype == "editor":
        schema["type"] = "string"
    elif ftype == "relation":
        schema["type"] = "string"
    elif ftype == "json":
        schema["type"] = "string"
    else:
        schema["type"] = "string"

    return schema


def build_field_json_schema(
    fields: list[dict],
    include_optional: bool = True,
) -> dict:
    properties = {}
    required_fields = []

    for f in fields:
        fname = f.get("name", "")
        ftype = f.get("type", "text")
        if fname in ("id", "created", "updated"):
            continue
        if ftype in ("file", "autodate"):
            continue

        prop_schema = pb_field_to_json_schema(f)
        properties[fname] = prop_schema

        if f.get("required", False):
            required_fields.append(fname)

    schema: dict[str, Any] = {
        "type": "object",
        "properties": properties,
    }
    if required_fields:
        schema["required"] = required_fields

    return schema


async def check_model() -> bool:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
            models = resp.json().get("models", [])
            available = [m["name"] for m in models]
            logger.info(f"Available Ollama models: {available}")
            return DEFAULT_MODEL in available
    except Exception as e:
        logger.warning(f"Cannot reach Ollama: {e}")
        return False
