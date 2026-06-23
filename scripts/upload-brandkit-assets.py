#!/usr/bin/env python3
"""
Upload MotusDAO Brand Kit v2 images to Supabase Storage.

Usage:
  python3 scripts/upload-brandkit-assets.py

Expected:
  - .env.local exists in project root
  - SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_KEY with service_role privileges
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib import error, request

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env.local"
SUPABASE_URL_FALLBACK = "https://ryjkpaiknsnjyydxwugl.supabase.co"
BUCKET = "brandkit"
DEST_PREFIX = "motusdao-brandkit-v2"
ASSETS = [
    Path("/Users/main/.cursor/projects/Users-main-MotusDAO-Hub-Psi/assets/8d10ae41-0799-4912-9fc1-c0c7ff13be78-fc274501-4ad0-425f-b10c-850cfc480fe8.png"),
    Path("/Users/main/.cursor/projects/Users-main-MotusDAO-Hub-Psi/assets/0b4768cd-df9c-4f82-9cc5-61b31270426c-1a867e7b-18ed-4e61-acf3-ff8982a636c6.png"),
    Path("/Users/main/.cursor/projects/Users-main-MotusDAO-Hub-Psi/assets/2454e9ab-1f7d-41f8-ad40-c5e138a779b0-07ac588f-227f-4b63-bf65-77eabb31208e.png"),
    Path("/Users/main/.cursor/projects/Users-main-MotusDAO-Hub-Psi/assets/98e08d0b-caee-4ebf-9bc4-8040ea3a02fe-151d165a-309e-4791-a493-11924a05832f.png"),
    Path("/Users/main/.cursor/projects/Users-main-MotusDAO-Hub-Psi/assets/86379f57-401d-46bf-b440-25b1df311d91-89767f74-c153-41a4-8046-2a771e560aef.png"),
    Path("/Users/main/.cursor/projects/Users-main-MotusDAO-Hub-Psi/assets/f8f5e4c2-c1cf-4055-a3f0-c8fd3461a1b7-37037005-4b2a-4b41-91a2-62cbcdf0ddcb.png"),
    Path("/Users/main/.cursor/projects/Users-main-MotusDAO-Hub-Psi/assets/f8db679b-7347-4936-9e85-6f7c3b4a1b36-ccd55605-238e-4f65-ad21-726816214180.png"),
]


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def post(url: str, body: bytes, headers: dict[str, str]) -> bytes:
    req = request.Request(url, data=body, headers=headers, method="POST")
    with request.urlopen(req) as res:
        return res.read()


def main() -> None:
    env = read_env(ENV_PATH)
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL_FALLBACK)
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_KEY")
    if not key:
        raise SystemExit("Missing SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_KEY in .env.local")

    auth_headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }

    bucket_payload = json.dumps({"id": BUCKET, "name": BUCKET, "public": True}).encode()
    try:
        post(
            f"{supabase_url}/storage/v1/bucket",
            bucket_payload,
            {**auth_headers, "Content-Type": "application/json"},
        )
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        if "row-level security policy" in detail.lower() or "unauthorized" in detail.lower():
            raise SystemExit(
                "Bucket creation blocked by RLS. Use SUPABASE_SERVICE_ROLE_KEY (service_role), not anon key."
            ) from exc
        if exc.code not in (400, 409):
            raise SystemExit(f"Failed to create bucket: {exc.code} {detail}") from exc

    uploaded_urls: list[str] = []
    for idx, asset in enumerate(ASSETS, start=1):
        if not asset.exists():
            raise SystemExit(f"Missing asset file: {asset}")

        object_path = f"{DEST_PREFIX}/{idx:02d}.png"
        upload_url = f"{supabase_url}/storage/v1/object/{BUCKET}/{object_path}"

        try:
            post(
                upload_url,
                asset.read_bytes(),
                {
                    **auth_headers,
                    "Content-Type": "image/png",
                    "x-upsert": "true",
                },
            )
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise SystemExit(f"Upload failed ({object_path}): {exc.code} {detail}") from exc

        uploaded_urls.append(f"{supabase_url}/storage/v1/object/public/{BUCKET}/{object_path}")

    print(json.dumps(uploaded_urls, indent=2))


if __name__ == "__main__":
    main()
