import json
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

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
    api_key = settings.SUPABASE_SECRET_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
    service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
    bucket = settings.SUPABASE_PRODUCT_IMAGES_BUCKET
    if not base_url or not api_key:
        raise HTTPException(503, "Configura SUPABASE_URL y una clave de Supabase en el backend")
    # Storage needs an Authorization identity in addition to the API key.
    # New sb_secret keys are not JWTs, so pair them with this project's legacy
    # service_role JWT rather than incorrectly sending sb_secret as a Bearer.
    authorization_token = service_role_key or (api_key if api_key.startswith("eyJ") else "")
    if not authorization_token:
        raise HTTPException(
            503,
            "Storage requiere SUPABASE_SERVICE_ROLE_KEY: agrega la clave service_role JWT de este proyecto en el backend",
        )

    object_path = f"products/{product_id}/{uuid.uuid4().hex}.{extension}"
    encoded_path = "/".join(quote(part, safe="") for part in object_path.split("/"))
    endpoint = f"{base_url}/storage/v1/object/{quote(bucket, safe='')}/{encoded_path}"
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {authorization_token}",
        "Content-Type": content_type,
        "x-upsert": "false",
    }
    request = Request(endpoint, data=content, method="POST", headers=headers)
    try:
        with urlopen(request, timeout=20) as response:
            if response.status not in (200, 201):
                raise HTTPException(502, "Supabase Storage no pudo guardar la imagen")
    except HTTPError as exc:
        raw_error = exc.read(2048).decode("utf-8", errors="replace")
        try:
            response_error = json.loads(raw_error)
            detail = response_error.get("message") or response_error.get("error_description") or response_error.get("error")
        except (json.JSONDecodeError, AttributeError):
            detail = None
        safe_detail = str(detail or "revisa que la clave y el bucket sean correctos")[:300]
        raise HTTPException(502, f"Supabase Storage respondió HTTP {exc.code}: {safe_detail}") from exc
    except URLError as exc:
        raise HTTPException(502, "No se pudo conectar con Supabase Storage") from exc

    return f"{base_url}/storage/v1/object/public/{quote(bucket, safe='')}/{encoded_path}"
