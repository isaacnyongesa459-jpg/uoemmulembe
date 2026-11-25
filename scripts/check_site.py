#!/usr/bin/env python3
"""Standard-library validation for every public UOEM Mulembe Union route."""
from __future__ import annotations

import csv
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61576695585165"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.fragments: list[str] = []
        self.local_paths: list[str] = []
        self.nav_routes: list[str] = []
        self.facebook_links: list[dict[str, str]] = []
        self.title = ""
        self.heading_one = ""
        self._in_title = False
        self._in_h1 = False
        self._form_count = 0
        self._password_input_count = 0
        self.page_slug = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key: (value or "") for key, value in attrs}
        if attributes.get("id"):
            self.ids.append(attributes["id"])
        if tag == "body":
            self.page_slug = attributes.get("data-page", "")
        if tag == "title":
            self._in_title = True
        if tag == "h1":
            self._in_h1 = True
        if tag == "form":
            self._form_count += 1
        if tag == "input" and attributes.get("type", "").lower() == "password":
            self._password_input_count += 1
        if tag == "a":
            href = attributes.get("href", "")
            parsed = urlparse(href)
            if href.startswith("#") and href != "#":
                self.fragments.append(unquote(href[1:]))
            elif href and not parsed.scheme and not href.startswith("//"):
                local_path = unquote(parsed.path)
                if local_path:
                    self.local_paths.append(local_path)
                    if local_path.endswith(".html"):
                        self.nav_routes.append(local_path)
            if href == FACEBOOK_URL:
                self.facebook_links.append(attributes)
        if tag == "img" and attributes.get("src"):
            parsed = urlparse(attributes["src"])
            if not parsed.scheme and not attributes["src"].startswith("//"):
                self.local_paths.append(unquote(parsed.path))
        if tag == "link" and attributes.get("href"):
            href = attributes["href"]
            parsed = urlparse(href)
            if not parsed.scheme and not href.startswith("//"):
                self.local_paths.append(unquote(parsed.path))
        if tag == "script" and attributes.get("src"):
            src = attributes["src"]
            parsed = urlparse(src)
            if not parsed.scheme and not src.startswith("//"):
                self.local_paths.append(unquote(parsed.path))

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        if tag == "h1":
            self._in_h1 = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        if self._in_h1:
            self.heading_one += data


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def main() -> None:
    manifest_path = ROOT / "src" / "pages.json"
    pages = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected_routes = {page["route"] for page in pages}
    if len(expected_routes) != len(pages):
        fail("route manifest contains duplicate routes")
    expected_page_slugs = {page["slug"] for page in pages}
    actual_page_slugs = {path.stem for path in (ROOT / "src" / "pages").glob("*.html")}
    if actual_page_slugs != expected_page_slugs:
        fail("page fragments and route manifest do not match")
    if "index.html" not in expected_routes:
        fail("the home page must be served as index.html")

    all_parsers: dict[str, PageParser] = {}
    for route in sorted(expected_routes):
        page_path = ROOT / route
        if not page_path.is_file():
            fail(f"generated public route is missing: {route}")
        parser = PageParser()
        parser.feed(page_path.read_text(encoding="utf-8"))
        parser.close()
        if not parser.title.strip() or "UOEM Mulembe Union" not in parser.title:
            fail(f"page title is missing or malformed: {route}")
        if not parser.heading_one.strip():
            fail(f"main page heading is missing: {route}")
        if parser.page_slug not in expected_page_slugs:
            fail(f"page slug metadata is missing or invalid: {route}")
        duplicates = sorted({value for value in parser.ids if parser.ids.count(value) > 1})
        if duplicates:
            fail(f"duplicate id(s) on {route}: {', '.join(duplicates)}")
        missing_targets = sorted(set(parser.fragments) - set(parser.ids))
        if missing_targets:
            fail(f"broken fragment link(s) on {route}: {', '.join(missing_targets)}")
        for local_path in parser.local_paths:
            candidate = (ROOT / local_path).resolve()
            if not candidate.is_relative_to(ROOT.resolve()) or not candidate.is_file():
                fail(f"missing or unsafe local link/asset on {route}: {local_path}")
        if not expected_routes.issubset(set(parser.nav_routes)):
            missing_routes = sorted(expected_routes - set(parser.nav_routes))
            fail(f"page navigation is incomplete on {route}: {', '.join(missing_routes)}")
        if len(parser.facebook_links) < 3:
            fail(f"the official Facebook destination is missing from shared navigation/footer on {route}")
        for link in parser.facebook_links:
            rel_values = set(link.get("rel", "").lower().split())
            if link.get("target") != "_blank" or "noopener" not in rel_values:
                fail(f"Facebook links must open safely in a new tab ({route})")
        if parser._form_count or parser._password_input_count:
            fail(f"unexpected public form/password collection on {route}")
        all_parsers[route] = parser

    logo = ROOT / "IMG-20261124-WA0001.jpg"
    if not logo.is_file() or logo.stat().st_size < 1000 or logo.read_bytes()[:2] != b"\xff\xd8":
        fail("the existing official logo is missing or no longer a JPEG")
    icon_sprite = ROOT / "assets" / "icons.svg"
    if not icon_sprite.is_file():
        fail("the shared icon sprite is missing")
    sprite = icon_sprite.read_text(encoding="utf-8")
    for symbol in ("home", "union", "events", "members", "more", "about", "leadership", "updates", "gallery", "budget", "documents", "contact", "search", "menu"):
        if f'id="{symbol}"' not in sprite:
            fail(f"navigation icon is missing: {symbol}")

    data = json.loads((ROOT / "data" / "proposed-budget-2026-27.json").read_text(encoding="utf-8"))
    if data.get("dataStatus") != "PROPOSED_ONLY":
        fail("budget status must remain PROPOSED_ONLY")
    if sum(int(row["amount"]) for row in data["income"]) != data["proposedIncomeTotal"]:
        fail("proposed income line items do not match the stated total")
    if sum(int(row["amount"]) for row in data["allocations"]) != data["proposedAllocationTotal"]:
        fail("proposed allocation items do not match the stated total")
    if data["proposedIncomeTotal"] != 69500 or data["proposedAllocationTotal"] != 59000:
        fail("proposal totals differ from the source brief")
    if data.get("originalPdfAvailable") is not False or data.get("actualTransactions") != []:
        fail("missing source-PDF or actual-transaction status disclosure")
    if any(data.get(key) is not None for key in ("actualIncome", "actualExpenditure", "actualBalance")):
        fail("actual financial amounts must remain unknown")
    with (ROOT / "data" / "proposed-budget-2026-27.csv").open(encoding="utf-8", newline="") as csv_file:
        rows = list(csv.DictReader(csv_file))
    csv_income = sum(int(row["amount_ksh"]) for row in rows if row["status"] == "PROPOSED ONLY" and row["section"] == "Income")
    csv_allocations = sum(int(row["amount_ksh"]) for row in rows if row["status"] == "PROPOSED ONLY" and row["section"] == "Allocation")
    if csv_income != data["proposedIncomeTotal"] or csv_allocations != data["proposedAllocationTotal"]:
        fail("CSV totals do not match the proposal JSON")

    body = {route: (ROOT / route).read_text(encoding="utf-8").lower() for route in expected_routes}
    checks = {
        "updates.html": "no verified notices yet",
        "events.html": "not confirmed or scheduled events",
        "budget.html": "actual position",
        "documents.html": "original pdf unavailable",
        "members.html": "no sign-in or registration is available",
        "gallery.html": "no photos supplied",
        "contact.html": FACEBOOK_URL.lower(),
    }
    for route, required_text in checks.items():
        if required_text not in body.get(route, ""):
            fail(f"required source/status disclosure is missing from {route}: {required_text}")

    print(f"PASS: {len(expected_routes)} direct routes have unique titles, headings, links and complete navigation")
    print("PASS: official logo preserved; local icons and assets resolve")
    print("PASS: supplied Facebook link is consistent and uses safe external-link attributes")
    print("PASS: proposed income/allocation totals reconcile; actual financials remain unknown")
    print("PASS: notice, event, PDF, member-security and gallery status disclosures are present")
    print("PASS: no public registration, password, or member-data forms were introduced")


if __name__ == "__main__":
    main()
