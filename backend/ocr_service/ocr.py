import io
import logging
import os
from typing import Tuple

import cv2
import easyocr
import fitz
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

MIN_NATIVE_TEXT_LENGTH = 80

_reader = None


def _get_reader() -> easyocr.Reader:
    global _reader
    if _reader is None:
        logger.info("Initializing EasyOCR reader (CPU mode)...")
        _reader = easyocr.Reader(["en"], gpu=False)
        logger.info("EasyOCR reader ready")
    return _reader


def _preprocess_image(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    coords = np.column_stack(np.where(binary > 0))
    if len(coords) > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = 90 + angle
        if abs(angle) > 1:
            h, w = binary.shape
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            binary = cv2.warpAffine(
                binary, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE,
            )

    kernel = np.ones((1, 1), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    return binary


def _ocr_image(img: np.ndarray) -> str:
    reader = _get_reader()
    processed = _preprocess_image(img)
    results = reader.readtext(processed, detail=0, paragraph=True)
    return "\n".join(results).strip()


def _ocr_image_pil(pil_img: Image.Image) -> str:
    img_array = np.array(pil_img.convert("RGB"))
    return _ocr_image(img_array)


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, str]:
    doc = fitz.open(stream=file_bytes, filetype="pdf")

    native_text_parts = []
    for page in doc:
        native_text_parts.append(page.get_text())

    native_text = "\n".join(native_text_parts).strip()

    if len(native_text) >= MIN_NATIVE_TEXT_LENGTH:
        doc.close()
        return native_text, "native_pdf"

    ocr_parts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        text = _ocr_image_pil(img)
        ocr_parts.append(text)

    doc.close()
    return "\n\n".join(ocr_parts).strip(), "scanned_pdf"


def extract_text_from_image(file_bytes: bytes) -> Tuple[str, str]:
    img = Image.open(io.BytesIO(file_bytes))
    text = _ocr_image_pil(img)
    return text, "image_ocr"


def extract_text(file_bytes: bytes, filename: str) -> Tuple[str, str]:
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in (".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"):
        return extract_text_from_image(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {ext}")
