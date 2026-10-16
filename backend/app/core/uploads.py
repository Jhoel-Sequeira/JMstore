import os
from pathlib import Path

from app.core.config import BACKEND_DIR


# Vercel's deployment directory is read-only. Its /tmp directory is writable,
# but temporary files are not persistent across deployments or instances.
UPLOADS_DIR = (
    Path("/tmp/jmstore/uploads")
    if os.getenv("VERCEL")
    else BACKEND_DIR / "uploads"
)
LOGOS_DIR = UPLOADS_DIR / "logos"

