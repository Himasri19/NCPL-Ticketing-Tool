"""
Vercel serverless entrypoint for the NCPL Ticketing FastAPI backend.

Vercel's @vercel/python runtime detects the ASGI `app` export and runs it
directly via its built-in ASGI adapter (Vercel 2024+). For older runtimes
or tighter compatibility we also expose a Mangum `handler`.

Deploy path:
  - This file lives at repo root: /api/index.py
  - Vercel routes any request to /api/* to this function (see vercel.json)
  - The FastAPI app already prefixes its routes with /api, so
    /api/auth/me on Vercel reaches api.auth.me → FastAPI /api/auth/me.
"""

import sys
import os
from pathlib import Path

# Make the `backend` package importable when Vercel executes this file.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.server import app  # noqa: E402  — FastAPI ASGI app

try:
    # Mangum adapts ASGI → AWS/Vercel-compatible Lambda-style handler.
    from mangum import Mangum  # noqa: E402
    handler = Mangum(app, lifespan="off")
except ImportError:
    handler = None
