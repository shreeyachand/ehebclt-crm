import json
import logging
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from collection_detection import detect_collection
from field_extraction import extract_fields
from grounding import check_confidence
from ocr import extract_text
from ollama_client import check_model

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting OCR service — checking Ollama...")
    try:
        available = await check_model()
        if not available:
            logger.warning("qwen2.5-coder:7b not found in Ollama. Run: ollama pull qwen2.5-coder:7b")
        else:
            logger.info("Ollama model qwen2.5-coder:7b is available")
    except Exception as e:
        logger.warning(f"Ollama health check failed: {e}")
    yield


app = FastAPI(title="Document OCR Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"}
MAX_FILE_SIZE = 50 * 1024 * 1024


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/process")
async def process_document(
    file: UploadFile = File(...),
    collections: str = Form(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50MB limit")

    try:
        collections_data = json.loads(collections)
        if not isinstance(collections_data, list):
            raise ValueError("collections must be a JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid collections JSON: {e}")

    result_id = str(uuid.uuid4())

    logger.info(f"[{result_id}] Processing {file.filename} ({len(file_bytes)} bytes)")

    ocr_text, extraction_path = extract_text(file_bytes, file.filename)
    logger.info(f"[{result_id}] Extraction path: {extraction_path}, text length: {len(ocr_text)}")

    if not ocr_text.strip():
        return {
            "id": result_id,
            "filename": file.filename,
            "ocr_text": "",
            "extraction_path": extraction_path,
            "detected_collection": "none",
            "detection_confidence": 0.0,
            "extracted_fields": {},
            "field_confidence": {},
            "collection_fields": [],
            "error": "No text could be extracted from the document",
        }

    detected_collection, detection_confidence = await detect_collection(
        ocr_text, collections_data
    )
    logger.info(f"[{result_id}] Detected collection: {detected_collection} (confidence={detection_confidence:.2f})")

    if detected_collection == "none" or detection_confidence < 0.3:
        logger.info(f"[{result_id}] No suitable collection found — flagging for manual triage")
        return {
            "id": result_id,
            "filename": file.filename,
            "ocr_text": ocr_text,
            "extraction_path": extraction_path,
            "detected_collection": "none",
            "detection_confidence": detection_confidence,
            "extracted_fields": {},
            "field_confidence": {},
            "collection_fields": [],
            "error": "Could not determine which collection this document belongs to",
        }

    target_collection = None
    for col in collections_data:
        if col.get("name") == detected_collection:
            target_collection = col
            break

    if not target_collection:
        logger.warning(f"[{result_id}] Detected collection '{detected_collection}' not found in provided list")
        return {
            "id": result_id,
            "filename": file.filename,
            "ocr_text": ocr_text,
            "extraction_path": extraction_path,
            "detected_collection": "none",
            "detection_confidence": 0.0,
            "extracted_fields": {},
            "field_confidence": {},
            "collection_fields": [],
            "error": f"Detected collection '{detected_collection}' not in provided collection list",
        }

    fields = target_collection.get("fields", [])
    extracted = await extract_fields(ocr_text, detected_collection, fields)
    logger.info(f"[{result_id}] Extracted {len(extracted)} fields")

    confidence = check_confidence(ocr_text, extracted, fields)
    flagged_count = sum(1 for v in confidence.values() if v.get("flagged"))
    logger.info(f"[{result_id}] Confidence check: {flagged_count} flagged fields")

    return {
        "id": result_id,
        "filename": file.filename,
        "ocr_text": ocr_text,
        "extraction_path": extraction_path,
        "detected_collection": detected_collection,
        "detection_confidence": detection_confidence,
        "extracted_fields": extracted,
        "field_confidence": confidence,
        "collection_fields": fields,
        "error": None,
    }
