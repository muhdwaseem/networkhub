"""Resolves real product photos for RainbowStone house brands (Datacom, Excel,
Avalon, ExTell) that plain HTTP requests to rainbowstone.ae 403 on. Scrapling's
stealthy Fetcher (curl_cffi TLS/header impersonation) gets a clean 200 on the
same URLs - verified by hand before writing this script.

Two-step split, matching this repo's Node backfill scripts: this script only
resolves and downloads image bytes to local files (nothing written to
Supabase). scripts/backfill-rainbowstone-images-from-manifest.mjs then does
the actual Storage upload + product row update, reusing the same idiom
(dry-run-by-default, --commit to write) as every other backfill script here.

Usage:
    py -3 scripts/rainbowstone_resolve_images.py [--limit N]
"""
import json
import re
import sys
import time
from pathlib import Path

import openpyxl
import requests
from scrapling.fetchers import Fetcher

LIMIT = None
if "--limit" in sys.argv:
    LIMIT = int(sys.argv[sys.argv.index("--limit") + 1])

TARGET_BRANDS = ["Datacom", "Excel", "Avalon", "ExTell"]
XLSX_PATH = "D:/Claude-Projects/sample-tech-catalog/RainbowStone_Product_Master_Catalog_Cleaned.xlsx"
DOWNLOAD_DIR = Path("scripts/_rainbowstone_downloads")
MANIFEST_PATH = Path("scripts/_rainbowstone_manifest.json")
DELAY_S = 0.8

IMG_RE = re.compile(r'id="productImageView"[^>]*?src="([^"]+)"|src="([^"]+)"[^>]*?id="productImageView"')


def load_env():
    env = {}
    with open(".env.local", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k] = v
    return env


def load_reference_links():
    """Maps (brand_lower, sku_stripped) -> reference link, straight from the
    source workbook - the link column the import script deliberately didn't
    persist to the database (see import-rainbowstone-catalog.mjs's header
    comment)."""
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True, data_only=True)
    by_sku = {}
    by_name = {}
    for ws in wb.worksheets:
        rows = ws.iter_rows(values_only=True)
        for row in rows:
            if not row or len(row) < 8:
                continue
            brand, sku, name, link = row[2], row[3], row[4], row[7]
            if not brand or not name or not link:
                continue
            brand = str(brand).strip()
            if brand not in TARGET_BRANDS:
                continue
            name_key = (brand.lower(), str(name).strip().lower())
            by_name[name_key] = str(link).strip()
            if sku and str(sku).strip() not in ("", "-"):
                sku_key = (brand.lower(), str(sku).strip())
                by_sku[sku_key] = str(link).strip()
    return by_sku, by_name


def fetch_missing_products(env):
    url = env["NEXT_PUBLIC_SUPABASE_URL"]
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    rows = []
    for brand in TARGET_BRANDS:
        offset = 0
        while True:
            r = requests.get(
                f"{url}/rest/v1/products",
                headers=headers,
                params={
                    "select": "id,brand,sku,name,images",
                    "brand": f"eq.{brand}",
                    "offset": offset,
                    "limit": 1000,
                },
            )
            r.raise_for_status()
            page = r.json()
            rows.extend(page)
            if len(page) < 1000:
                break
            offset += 1000
    return [p for p in rows if not p.get("images")]


def resolve_link(product, by_sku, by_name):
    brand_lower = product["brand"].strip().lower()
    sku = (product.get("sku") or "").strip()
    if sku and (brand_lower, sku) in by_sku:
        return by_sku[(brand_lower, sku)]
    name_key = (brand_lower, product["name"].strip().lower())
    return by_name.get(name_key)


def extract_image_path(html):
    m = IMG_RE.search(html)
    if not m:
        return None
    return m.group(1) or m.group(2)


def main():
    env = load_env()
    print("Loading reference links from workbook ...")
    by_sku, by_name = load_reference_links()
    print(f"  {len(by_sku)} SKU-keyed links, {len(by_name)} name-keyed links.")

    print("\nFetching missing-image products for", ", ".join(TARGET_BRANDS), "...")
    products = fetch_missing_products(env)
    print(f"  {len(products)} missing-image products across the 4 brands.")

    candidates = []
    for p in products:
        link = resolve_link(p, by_sku, by_name)
        if link:
            candidates.append((p, link))
    print(f"  {len(candidates)} resolved to a reference link.")

    if LIMIT:
        candidates = candidates[:LIMIT]
    print(f"\nProcessing {len(candidates)} products ...")

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8")) if MANIFEST_PATH.exists() else []
    done_ids = {m["id"] for m in manifest}

    # Recover from a killed prior run: a local file already downloaded but
    # never recorded in the manifest (the manifest is only saved after a
    # successful download, but the process can die mid-batch) shouldn't be
    # re-fetched over the network.
    candidate_by_id = {p["id"]: p for p, _ in candidates}
    for existing_file in DOWNLOAD_DIR.glob("*"):
        pid = existing_file.stem
        if pid in done_ids or pid not in candidate_by_id:
            continue
        p = candidate_by_id[pid]
        manifest.append({"id": pid, "brand": p["brand"], "name": p["name"], "localPath": str(existing_file), "ext": existing_file.suffix.lstrip(".")})
        done_ids.add(pid)
    if manifest:
        print(f"  Recovered {len(manifest)} already-downloaded files from a prior run.")

    failures = []

    def save_manifest():
        MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    for i, (p, link) in enumerate(candidates):
        if p["id"] in done_ids:
            continue
        try:
            page = Fetcher.get(link, stealthy_headers=True)
            if page.status != 200:
                failures.append({"id": p["id"], "name": p["name"], "reason": f"page status {page.status}"})
                time.sleep(DELAY_S)
                continue
            html = page.body.decode("utf-8", errors="ignore")
            img_path = extract_image_path(html)
            if not img_path:
                failures.append({"id": p["id"], "name": p["name"], "reason": "no #productImageView on page"})
                time.sleep(DELAY_S)
                continue
            img_url = img_path if img_path.startswith("http") else f"https://rainbowstone.ae{img_path}"
            img_res = Fetcher.get(img_url, stealthy_headers=True)
            if img_res.status != 200 or not img_res.body:
                failures.append({"id": p["id"], "name": p["name"], "reason": f"image fetch status {img_res.status}"})
                time.sleep(DELAY_S)
                continue

            ext = img_url.rsplit(".", 1)[-1].split("?")[0].lower()
            if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
                ext = "jpg"
            local_path = DOWNLOAD_DIR / f"{p['id']}.{ext}"
            local_path.write_bytes(img_res.body)

            manifest.append({"id": p["id"], "brand": p["brand"], "name": p["name"], "localPath": str(local_path), "ext": ext})
            save_manifest()
            print(f"  [{i + 1}/{len(candidates)}] ok  {p['brand']:8s} {p['name'][:60]}")
        except Exception as exc:
            failures.append({"id": p["id"], "name": p["name"], "reason": str(exc)})
        time.sleep(DELAY_S)

    save_manifest()
    print(f"\nDone. resolved+downloaded={len(manifest)} failed={len(failures)}")
    print(f"Manifest written to {MANIFEST_PATH}")
    if failures:
        print("\nFailures:")
        for f in failures[:30]:
            print(f"  [{f['id']}] {f['name'][:60]}: {f['reason']}")
        if len(failures) > 30:
            print(f"  ... and {len(failures) - 30} more")


if __name__ == "__main__":
    main()
