from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
import uuid

from fastapi import HTTPException

from app.core.config import settings


MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {
    "image/png": ("png", b"\x89PNG\r\n\x1a\n"),
    "image/jpeg": ("jpg", b"\xff\xd8\xff"),
}


def validate_image(content: bytes, content_type: str | None) -> str:
    image_type = IMAGE_TYPES.get((content_type or "").lower())
    if image_type is None:
        raise HTTPException(415, "Selecciona una imagen PNG o JPG")
    extension, signature = image_type
    if not content.startswith(signature):
        raise HTTPException(400, "El archivo no parece ser una imagen válida")
    if len(content) > MAX_PRODUCT_IMAGE_BYTES:
        raise HTTPException(413, "La imagen no puede superar 5 MB")
    return extension


def upload_product_image(product_id: int, extension: str, content_type: str, content: bytes) -> str:
    base_url = settings.SUPABASE_URL.rstrip("/")
    secret_key = settings.SUPABASE_SECRET_KEY
    bucket = settings.SUPABASE_PRODUCT_IMAGES_BUCKET
    if not base_url or not secret_key:
        raise HTTPException(503, "Configura SUPABASE_URL y SUPABASE_SECRET_KEY en el backend")

    object_path = f"products/{product_id}/{uuid.uuid4().hex}.{extension}"
    encoded_path = "/".join(quote(part, safe="") for part in object_path.split("/"))
    endpoint = f"{base_url}/storage/v1/object/{quote(bucket, safe='')}/{encoded_path}"
    request = Request(endpoint, data=content, method="POST", headers={
        "apikey": secret_key,
        "Content-Type": content_type,
        "x-upsert": "false",
    })
    try:
        with urlopen(request, timeout=20) as response:
            if response.status not in (200, 201):
                raise HTTPException(502, "Supabase Storage no pudo guardar la imagen")
    except HTTPError as exc:
        raise HTTPException(502, "Supabase Storage rechazó la imagen") from exc
    except URLError as exc:
        raise HTTPException(502, "No se pudo conectar con Supabase Storage") from exc

    return f"{base_url}/storage/v1/object/public/{quote(bucket, safe='')}/{encoded_path}"
