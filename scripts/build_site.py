#!/usr/bin/env python3
"""Generate GitHub Pages-ready HTML routes from the shared shell and page fragments."""
from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src"
TEMPLATE_PATH = SOURCE / "template.html"
PAGES_PATH = SOURCE / "pages.json"
CONTENT_DIR = SOURCE / "pages"
ICON_BY_SLUG = {
    "home": "home",
    "about": "about",
    "leadership": "leadership",
    "updates": "updates",
    "events": "events",
    "gallery": "gallery",
    "budget": "budget",
    "documents": "documents",
    "members": "members",
    "contact": "contact",
    "donations": "support",
}
MOBILE_TABS = (
    ("home", "Home", "home"),
    ("about", "Union", "union"),
    ("events", "Events", "events"),
    ("members", "Members", "members"),
)


def safe_search_json(pages: list[dict[str, str]]) -> str:
    """Encode JSON safely for a script element's text content."""
    encoded = json.dumps(pages, ensure_ascii=False, separators=(",", ":"))
    return encoded.replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")


def icon(name: str, extra_class: str = "icon") -> str:
    return (
        f'<svg class="{extra_class}" aria-hidden="true">'
        f'<use href="assets/icons.svg#{html.escape(name, quote=True)}"></use></svg>'
    )


def make_sidebar_nav(pages: list[dict[str, str]], current_slug: str) -> str:
    grouped: dict[str, list[dict[str, str]]] = {}
    for page in pages:
        grouped.setdefault(page["group"], []).append(page)
    chunks: list[str] = []
    for group, members in grouped.items():
        links: list[str] = []
        for page in members:
            slug = page["slug"]
            active = slug == current_slug
            current = ' aria-current="page"' if active else ""
            active_class = " is-active" if active else ""
            label = html.escape(page["label"])
            route = html.escape(page["route"], quote=True)
            links.append(
                f'<a class="side-link{active_class}" href="{route}"{current}>'
                f'{icon(ICON_BY_SLUG[slug])}<span>{label}</span>'
                f'<span class="side-link-arrow" aria-hidden="true">↗</span></a>'
            )
        chunks.append(
            '<div class="nav-group">'
            f'<span class="nav-group-label">{html.escape(group)}</span>'
            f'{"".join(links)}</div>'
        )
    return "\n        ".join(chunks)


def make_mobile_nav(pages: list[dict[str, str]], current_slug: str) -> str:
    by_slug = {page["slug"]: page for page in pages}
    active_tab = by_slug[current_slug]["tab"]
    links: list[str] = []
    for slug, label, icon_id in MOBILE_TABS:
        page = by_slug[slug]
        active = active_tab == page["tab"]
        current = ' aria-current="page"' if active else ""
        active_class = " is-active" if active else ""
        links.append(
            f'<a class="mobile-tab{active_class}" href="{html.escape(page["route"], quote=True)}"{current}>'
            f'<span class="tab-icon">{icon(icon_id)}</span><span>{html.escape(label)}</span></a>'
        )
    return "\n      ".join(links)


def gallery_markup() -> tuple[str, str, int]:
    """Generate usable no-JS gallery cards from the committed image manifest."""
    manifest_path = ROOT / "data" / "gallery-manifest.json"
    records = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(records, list) or not records:
        raise SystemExit("data/gallery-manifest.json must contain a non-empty photo list")
    seen: set[str] = set()
    categories: list[str] = []
    cards: list[str] = []
    for index, record in enumerate(records):
        required = ("src", "category", "caption", "alt", "width", "height")
        if any(not record.get(key) for key in required):
            raise SystemExit(f"Gallery record {index} is missing a required field")
        src = str(record["src"])
        if src in seen:
            raise SystemExit(f"Duplicate gallery source: {src}")
        seen.add(src)
        image_path = (ROOT / src).resolve()
        if not image_path.is_relative_to(ROOT.resolve()) or not image_path.is_file():
            raise SystemExit(f"Gallery image is missing or unsafe: {src}")
        category = str(record["category"])
        if category not in categories:
            categories.append(category)
        safe_src = html.escape(src, quote=True)
        safe_cat = html.escape(category, quote=True)
        safe_caption = html.escape(str(record["caption"]))
        safe_alt = html.escape(str(record["alt"]), quote=True)
        width, height = int(record["width"]), int(record["height"])
        role = str(record.get("role", ""))
        boundary = str(record.get("boundary", ""))
        caption_lines = [f'<span class="gallery-kind">{html.escape(category.upper())}</span>']
        if role:
            caption_lines.append(f"<strong>{html.escape(role)}</strong>")
        caption_lines.append(f'<small>{safe_caption}</small>')
        if boundary:
            caption_lines.append(f'<small class="gallery-boundary">{html.escape(boundary)}</small>')
        cards.append(
            f'<figure class="gallery-card" data-gallery-card data-category="{safe_cat}">'
            f'<a class="gallery-image-link" href="{safe_src}" target="_blank" rel="noopener noreferrer" '
            f'data-gallery-open data-gallery-index="{index}" aria-label="Open full-size photo {index + 1}: {safe_alt}">'
            f'<img src="{safe_src}" width="{width}" height="{height}" alt="{safe_alt}" loading="lazy" decoding="async">'
            '<span class="gallery-open-mark" aria-hidden="true">↗</span></a>'
            f'<figcaption>{"".join(caption_lines)}</figcaption></figure>'
        )
    filters = ['<button class="gallery-filter is-active" type="button" data-gallery-filter="all" aria-pressed="true">All photos</button>']
    for category in categories:
        safe = html.escape(category, quote=True)
        filters.append(f'<button class="gallery-filter" type="button" data-gallery-filter="{safe}" aria-pressed="false">{html.escape(category)}</button>')
    return "\n".join(filters), "\n".join(cards), len(records)


def main() -> None:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    pages = json.loads(PAGES_PATH.read_text(encoding="utf-8"))
    if not isinstance(pages, list) or not pages:
        raise SystemExit("src/pages.json must contain a non-empty page list")
    slugs = [page.get("slug") for page in pages]
    routes = [page.get("route") for page in pages]
    if len(set(slugs)) != len(slugs) or len(set(routes)) != len(routes):
        raise SystemExit("Page slugs and output routes must be unique")
    if "home" not in slugs or "index.html" not in routes:
        raise SystemExit("The route manifest must define the home page as index.html")
    gallery_filters, gallery_cards, gallery_count = gallery_markup()
    for page in pages:
        slug = page.get("slug", "")
        if slug not in ICON_BY_SLUG:
            raise SystemExit(f"Unknown page slug: {slug}")
        if page.get("route") != ("index.html" if slug == "home" else f"{slug}.html"):
            raise SystemExit(f"Only root-level static routes are supported for {slug}")
        required = ("label", "group", "title", "description", "keywords", "tab")
        if any(not page.get(key) for key in required):
            raise SystemExit(f"Page {slug} is missing required route metadata")
        fragment_path = CONTENT_DIR / f"{slug}.html"
        if not fragment_path.is_file():
            raise SystemExit(f"Page content is missing: {fragment_path.relative_to(ROOT)}")
        content = fragment_path.read_text(encoding="utf-8")
        content = content.replace("{{GALLERY_FILTERS}}", gallery_filters)
        content = content.replace("{{GALLERY_CARDS}}", gallery_cards)
        content = content.replace("{{GALLERY_COUNT}}", str(gallery_count))
        values = {
            "{{TITLE}}": html.escape(page["title"]),
            "{{DESCRIPTION}}": html.escape(page["description"], quote=True),
            "{{SLUG}}": html.escape(slug, quote=True),
            "{{LABEL}}": html.escape(page["label"]),
            "{{NAVIGATION}}": make_sidebar_nav(pages, slug),
            "{{MOBILE_NAV}}": make_mobile_nav(pages, slug),
            "{{CONTENT}}": content,
            "{{SEARCH_INDEX}}": safe_search_json(pages),
            "{{MORE_ACTIVE}}": " is-active" if page["tab"] == "more" else "",
        }
        rendered = template
        for key, value in values.items():
            rendered = rendered.replace(key, value)
        if "{{" in rendered or "}}" in rendered:
            raise SystemExit(f"Unresolved template marker on page {slug}")
        (ROOT / page["route"]).write_text(rendered, encoding="utf-8")
        print(f"Built {page['route']}")
    print(f"Built {len(pages)} static pages.")


if __name__ == "__main__":
    main()
