from __future__ import annotations

import os
import re
from html import unescape
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


_IMAGE_ATTR_PATTERN = re.compile(
    r"""(?:src|data-src|data-lazy|content)\s*=\s*["'](?P<url>https?://[^"'?#>]+\.(?:jpg|jpeg|png|webp)(?:[^"' >]*)?)["']""",
    re.IGNORECASE,
)
_JSON_URL_PATTERN = re.compile(
    r"""https?:\\/\\/[^\s"'\\]+?\.(?:jpg|jpeg|png|webp)(?:\\/[^\s"'\\]*)*""",
    re.IGNORECASE,
)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int, minimum: int = 0) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return max(minimum, int(raw))
    except ValueError:
        return default


def _normalize_url(value: str) -> str | None:
    url = unescape(value.strip()).replace("\\/", "/")
    if not url:
        return None
    if url.startswith("http://"):
        return f"https://{url[7:]}"
    if url.startswith("https://"):
        return url
    return None


def _allowed_hosts() -> tuple[str, ...]:
    raw = os.getenv("AUTOSTAT_ALLOWED_HOSTS", "autoastat.com,autostat.org,autostat.md")
    values = {
        host.strip().lower().lstrip(".")
        for host in raw.split(",")
        if host.strip()
    }
    return tuple(sorted(values))


def _is_allowed_host(url: str) -> bool:
    hostname = (urlparse(url).hostname or "").lower().lstrip(".")
    if not hostname:
        return False
    return any(hostname == allowed or hostname.endswith(f".{allowed}") for allowed in _allowed_hosts())


def _dedupe(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for url in urls:
        normalized = _normalize_url(url)
        if not normalized or normalized in seen:
            continue
        if not _is_allowed_host(normalized):
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def _build_vin_url(vin: str) -> str | None:
    template = os.getenv("AUTOSTAT_VIN_URL_TEMPLATE", "").strip()
    if not template:
        return None
    if "{vin}" not in template:
        return None
    return template.format(vin=vin.upper())


def _fetch_html(url: str) -> str:
    request = Request(
        url,
        headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": os.getenv("AUTOSTAT_USER_AGENT", "car-import-mvp/0.1 secondary-enrichment"),
        },
        method="GET",
    )
    timeout_seconds = _env_int("AUTOSTAT_TIMEOUT_SECONDS", 20, minimum=1)
    with urlopen(request, timeout=timeout_seconds) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="ignore")


def fetch_autostat_gallery_images(vin: str, lot_number: str | None = None) -> list[str]:
    if not _env_bool("AUTOSTAT_ENABLED", False):
        return []

    url = _build_vin_url(vin)
    if not url:
        return []

    try:
        html = _fetch_html(url)
    except (HTTPError, URLError, TimeoutError, OSError):
        return []

    matches: list[str] = []
    matches.extend(match.group("url") for match in _IMAGE_ATTR_PATTERN.finditer(html))
    matches.extend(match.group(0) for match in _JSON_URL_PATTERN.finditer(html))

    filtered = _dedupe(matches)
    max_images = _env_int("AUTOSTAT_MAX_IMAGES_PER_LOT", 20, minimum=0)
    if lot_number:
        lot_filtered = [url for url in filtered if lot_number.lower() in url.lower()]
        if lot_filtered:
            filtered = lot_filtered + [url for url in filtered if url not in lot_filtered]
    return filtered[:max_images]
