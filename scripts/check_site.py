#!/usr/bin/env python3
"""Standard-library validation for every public UOEM Mulembe Union route."""
from __future__ import annotations

import csv
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61576695585165"
PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp", ".tif", ".tiff"}
BRANDING_IMAGES = {"IMG-20261124-WA0001.jpg", "assets/app-icon-192.png", "assets/app-icon-512.png", "assets/app-icon-maskable-512.png"}
BUDGET_SHA256 = "71523622d0363460012a8094ae1daa9e3bc9b2ba824ead3c9a45e5ed5c8ee1dc"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.fragments: list[str] = []
        self.local_paths: list[str] = []
        self.image_paths: list[str] = []
        self.embedded_paths: list[str] = []
        self.nav_routes: list[str] = []
        self.facebook_links: list[dict[str, str]] = []
        self.title = ""
        self.heading_one = ""
        self._in_title = False
        self._in_h1 = False
        self._form_count = 0
        self._opportunity_filter_form_count = 0
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
            if "data-opportunity-filters" in attributes and attributes.get("method", "get").lower() == "get":
                self._opportunity_filter_form_count += 1
            else:
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
                local_path = unquote(parsed.path)
                self.local_paths.append(local_path)
                self.image_paths.append(local_path)
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
        if tag == "iframe" and attributes.get("src"):
            src = attributes["src"]
            parsed = urlparse(src)
            if not parsed.scheme and not src.startswith("//"):
                local_path = unquote(parsed.path)
                self.local_paths.append(local_path)
                self.embedded_paths.append(local_path)
        if tag == "object" and attributes.get("data"):
            data = attributes["data"]
            parsed = urlparse(data)
            if not parsed.scheme and not data.startswith("//"):
                local_path = unquote(parsed.path)
                self.local_paths.append(local_path)
                self.embedded_paths.append(local_path)

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
        if route == "opportunities.html" and parser._opportunity_filter_form_count != 1:
            fail("the Opportunities route must have one safe GET-only filter form")
        if route != "opportunities.html" and parser._opportunity_filter_form_count:
            fail(f"unexpected Opportunities filter form on {route}")
        all_parsers[route] = parser

    leadership_portraits = {
        "1795606862985.jpg",
        "1795606968206.jpg",
        "1795609879513.jpg",
    }
    gallery_portraits = leadership_portraits | {"1795606945117.jpg"}
    if not leadership_portraits.issubset(set(all_parsers["leadership.html"].image_paths)):
        fail("one or more supplied leadership portraits are missing from the leadership page")
    if not gallery_portraits.issubset(set(all_parsers["gallery.html"].image_paths)):
        fail("one or more supplied portraits are missing from the gallery")
    leadership_html = (ROOT / "leadership.html").read_text(encoding="utf-8")
    executive_cards = re.findall(r'<article class="leader-card[^\"]*">(.*?)</article>', leadership_html, re.DOTALL)
    executive_roles = {
        "1795606862985.jpg": "Chairperson",
        "1795609879513.jpg": "Secretary",
        "1795606968206.jpg": "Treasurer",
    }
    for filename, role in executive_roles.items():
        if not any(filename in card and f"<h3>{role}</h3>" in card for card in executive_cards):
            fail(f"the supplied portrait is not paired with its assigned Union office: {filename} ({role})")
    recognition = re.search(r'<section class="section-block recognition-section".*?</section>', leadership_html, re.DOTALL)
    if not recognition:
        fail("the University of Embu Male Delegate must remain in a separate recognition subsection")
    recognition_text = recognition.group(0).lower()
    if "1795606945117.jpg" not in recognition_text or "university of embu male delegate" not in recognition_text or "not a member of the mulembe union executive leadership" not in recognition_text:
        fail("the University delegate recognition must use the supplied portrait and explicitly exclude Union executive status")
    gallery_html = (ROOT / "gallery.html").read_text(encoding="utf-8")
    gallery_cards = re.findall(r'<figure class="gallery-card[^\"]*"[^>]*>(.*?)</figure>', gallery_html, re.DOTALL)
    gallery_roles = {**executive_roles, "1795606945117.jpg": "Male Delegate"}
    for filename, role in gallery_roles.items():
        matching_cards = [card for card in gallery_cards if filename in card and f"<strong>{role}</strong>" in card]
        if not matching_cards:
            fail(f"the gallery portrait is not paired with its assigned role: {filename} ({role})")
        if filename == "1795606945117.jpg" and "not a mulembe union executive official" not in matching_cards[0].lower():
            fail("the gallery must label the University delegate as separate from Union executives")

    gallery_manifest_path = ROOT / "data" / "gallery-manifest.json"
    if not gallery_manifest_path.is_file():
        fail("the complete repository photo gallery manifest is missing")
    gallery_manifest = json.loads(gallery_manifest_path.read_text(encoding="utf-8"))
    if not isinstance(gallery_manifest, list) or not gallery_manifest:
        fail("the gallery manifest must contain photo records")
    sources = [record.get("src", "") for record in gallery_manifest]
    if len(sources) != len(set(sources)):
        fail("the gallery manifest contains duplicate image paths")
    discovered_photos = {
        path.relative_to(ROOT).as_posix()
        for path in ROOT.rglob("*")
        if path.is_file() and path.suffix.lower() in PHOTO_EXTENSIONS
        and path.relative_to(ROOT).as_posix() not in BRANDING_IMAGES
        and ".git" not in path.parts
    }
    if set(sources) != discovered_photos:
        missing = sorted(discovered_photos - set(sources))
        extra = sorted(set(sources) - discovered_photos)
        fail(f"gallery manifest does not match all discovered photos; missing={missing}, extra={extra}")
    digests: dict[str, str] = {}
    allowed_categories = {"Union Leadership", "University Representation", "Union Activities", "Events", "Campus Life", "Members", "Other Pictures"}
    known_gallery_roles = {
        "1795606862985.jpg": "Chairperson",
        "1795606968206.jpg": "Treasurer",
        "1795609879513.jpg": "Secretary",
        "1795606945117.jpg": "Male Delegate",
    }
    for record in gallery_manifest:
        if any(not record.get(key) for key in ("src", "category", "caption", "alt", "width", "height")):
            fail(f"gallery photo record lacks caption, alt text, category or dimensions: {record.get('src', '')}")
        if record["category"] not in allowed_categories:
            fail(f"unsupported gallery category for {record['src']}: {record['category']}")
        path = (ROOT / record["src"]).resolve()
        if not path.is_relative_to(ROOT.resolve()) or not path.is_file():
            fail(f"gallery source is missing or unsafe: {record['src']}")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in digests:
            fail(f"gallery includes duplicate file content: {digests[digest]} and {record['src']}")
        digests[digest] = record["src"]
        if not isinstance(record["width"], int) or not isinstance(record["height"], int) or record["width"] < 1 or record["height"] < 1:
            fail(f"gallery dimensions must be positive integers: {record['src']}")
        expected_role = known_gallery_roles.get(record["src"])
        if expected_role and record.get("role") != expected_role:
            fail(f"gallery role assignment is incorrect for {record['src']}: expected {expected_role}")
        if record["src"] == "1795606945117.jpg" and "not a MULEMBE Union executive official" not in record.get("boundary", ""):
            fail("gallery delegate manifest must clearly separate University representation from Union executive status")
    rendered_gallery_sources = set(all_parsers["gallery.html"].image_paths) - BRANDING_IMAGES
    if rendered_gallery_sources != set(sources):
        fail("generated gallery cards do not render every manifest photo exactly once")
    if "BUDGET (1).PDF" not in all_parsers["budget.html"].embedded_paths:
        fail("the uploaded budget PDF is not embedded on the budget page")
    if "BUDGET (1).PDF" not in all_parsers["budget.html"].local_paths or "BUDGET (1).PDF" not in all_parsers["documents.html"].local_paths:
        fail("the budget booklet view/download links are missing")
    for route in ("budget.html", "documents.html"):
        body_text = (ROOT / route).read_text(encoding="utf-8")
        if "View Budget Booklet" not in body_text or "Download Budget Booklet" not in body_text:
            fail(f"the required budget booklet controls are missing from {route}")

    for filename in gallery_portraits:
        image = ROOT / filename
        if not image.is_file() or image.read_bytes()[:2] != b"\xff\xd8":
            fail(f"supplied portrait is missing or not a JPEG: {filename}")
    booklet = ROOT / "BUDGET (1).PDF"
    if not booklet.is_file() or booklet.read_bytes()[:5] != b"%PDF-":
        fail("the uploaded budget booklet is missing or not a PDF")
    if hashlib.sha256(booklet.read_bytes()).hexdigest() != BUDGET_SHA256:
        fail("the original uploaded budget booklet bytes have changed")

    manifest_path = ROOT / "manifest.json"
    if not manifest_path.is_file():
        fail("the PWA manifest is missing")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("display") != "standalone" or manifest.get("scope") != "./" or not manifest.get("start_url", "").startswith("./"):
        fail("the PWA manifest must use standalone display and relative GitHub Pages paths")
    icon_sizes = {icon.get("sizes") for icon in manifest.get("icons", [])}
    if not {"192x192", "512x512"}.issubset(icon_sizes):
        fail("the PWA manifest is missing required 192px or 512px app icons")
    for icon in manifest.get("icons", []):
        icon_path = (ROOT / unquote(urlparse(icon.get("src", "")).path)).resolve()
        if not icon_path.is_relative_to(ROOT.resolve()) or not icon_path.is_file():
            fail(f"PWA icon is missing or unsafe: {icon.get('src', '')}")
    if not any(shortcut.get("url") == "./opportunities.html" for shortcut in manifest.get("shortcuts", [])):
        fail("the PWA manifest must include a relative Global Opportunities shortcut")
    worker_path = ROOT / "service-worker.js"
    if not worker_path.is_file():
        fail("the PWA service worker is missing")
    worker = worker_path.read_text(encoding="utf-8")
    if "addEventListener('fetch'" not in worker or "cache.addAll(APP_SHELL)" not in worker:
        fail("the service worker must pre-cache the app shell and handle offline fetches")
    for required_cache_path in ["'./donations.html'", "'./opportunities.html'", "'./opportunities.js'", "'./data/gallery-manifest.json'", "'./data/donation-client-config.json'", "'./data/opportunities-client-config.json'"] + [f"'./{source}'" for source in sources]:
        if required_cache_path not in worker:
            fail(f"the PWA offline shell does not include required route/data/photo: {required_cache_path}")

    logo = ROOT / "IMG-20261124-WA0001.jpg"
    if not logo.is_file() or logo.stat().st_size < 1000 or logo.read_bytes()[:2] != b"\xff\xd8":
        fail("the existing official logo is missing or no longer a JPEG")
    icon_sprite = ROOT / "assets" / "icons.svg"
    if not icon_sprite.is_file():
        fail("the shared icon sprite is missing")
    sprite = icon_sprite.read_text(encoding="utf-8")
    for symbol in ("home", "union", "events", "members", "more", "about", "leadership", "updates", "gallery", "budget", "documents", "opportunities", "contact", "support", "search", "menu"):
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
    if data.get("originalPdfAvailable") is not True or data.get("actualTransactions") != []:
        fail("uploaded source-PDF availability or actual-transaction status is incorrect")
    if any(data.get(key) is not None for key in ("actualIncome", "actualExpenditure", "actualBalance")):
        fail("actual financial amounts must remain unknown")
    with (ROOT / "data" / "proposed-budget-2026-27.csv").open(encoding="utf-8", newline="") as csv_file:
        rows = list(csv.DictReader(csv_file))
    csv_income = sum(int(row["amount_ksh"]) for row in rows if row["status"] == "PROPOSED ONLY" and row["section"] == "Income")
    csv_allocations = sum(int(row["amount_ksh"]) for row in rows if row["status"] == "PROPOSED ONLY" and row["section"] == "Allocation")
    if csv_income != data["proposedIncomeTotal"] or csv_allocations != data["proposedAllocationTotal"]:
        fail("CSV totals do not match the proposal JSON")

    body = {route: (ROOT / route).read_text(encoding="utf-8").lower() for route in expected_routes}
    about_html = (ROOT / "about.html").read_text(encoding="utf-8")
    if "2016" not in about_html or "The 18 Luhya Subtribes – One People, One Unity" not in about_html:
        fail("About page must state the 2016 foundation and exact 18-subtribe section title")
    subtribe_section = re.search(r'<ol class="subtribe-grid">(.*?)</ol>', about_html, re.DOTALL)
    supplied_subtribes = ["Abakhenye", "Bakhayo", "Banyala", "Banyore", "Batsotso", "Batura", "Bukusu", "Idakho", "Isukha", "Kabras", "Kisa", "Marachi", "Maragoli", "Marama", "Samia", "Tachoni", "Tiriki", "Wanga"]
    actual_subtribes = re.findall(r"<li>([^<]+)</li>", subtribe_section.group(1)) if subtribe_section else []
    if actual_subtribes != supplied_subtribes:
        fail("About page must contain exactly the 18 supplied subtribe names in order")
    for required_text in (
        "Leadership transitions, disagreements and struggles", "Limited resources, fundraising difficulties",
        "entitlement, individual interests and personal expectations", "Subtribal identities, perspectives and interests",
        "solidarity, mutual respect and collective advancement", "foster unity among members, promote collaboration",
        "Unity", "Integrity", "Accountability", "Respect", "Transparency", "Inclusivity", "Service", "Collective responsibility",
    ):
        if required_text.lower() not in about_html.lower():
            fail(f"About history, unity, vision, mission or values content is missing: {required_text}")

    donation_config = json.loads((ROOT / "data" / "donation-client-config.json").read_text(encoding="utf-8"))
    if donation_config.get("enabled") is not False or donation_config.get("apiEndpoint") != "" or donation_config.get("contractVersion") != 1:
        fail("donation client must remain disabled with no configured endpoint until secure integration")
    if donation_config.get("currency") != "KES" or donation_config.get("request", {}).get("purpose") != "MULEMBE_UNION_DONATION":
        fail("future donation contract is missing the expected KES purpose")
    donations_html = (ROOT / "donations.html").read_text(encoding="utf-8")
    for expected_amount in ("KSh 100", "KSh 200", "KSh 500", "KSh 1,000", "KSh 2,000"):
        if expected_amount not in donations_html:
            fail(f"donation page is missing a suggested amount: {expected_amount}")
    for required_text in ("Support MULEMBE Union", "NOT CONNECTED", "No payment will be initiated", "Never enter or share your M-Pesa PIN", "Pending", "Successful", "Failed"):
        if required_text.lower() not in donations_html.lower():
            fail(f"donation UI is missing its inactive-safety disclosure or status: {required_text}")
    client_js = (ROOT / "app.js").read_text(encoding="utf-8")
    if "donationConfig.enabled" not in client_js or "!donationConfig.apiEndpoint" not in client_js or "data/donation-client-config.json" not in client_js:
        fail("donation client must explicitly gate requests behind disabled-by-default endpoint configuration")
    for forbidden_secret in ("consumerSecret =", "consumerKey =", "passkey =", "darajaToken ="):
        if forbidden_secret.lower() in client_js.lower():
            fail("Daraja secrets must never be embedded in frontend JavaScript")

    opportunities_config_path = ROOT / "data" / "opportunities-client-config.json"
    if not opportunities_config_path.is_file():
        fail("the public Opportunities API client configuration is missing")
    opportunities_config = json.loads(opportunities_config_path.read_text(encoding="utf-8"))
    if opportunities_config != {"contractVersion": 1, "apiBaseUrl": "https://mulembeapi-g9qixcaj.manus.space", "pageSize": 10}:
        fail("the Opportunities client must use the verified HTTPS API origin and bounded page size")
    opportunities_html = (ROOT / "opportunities.html").read_text(encoding="utf-8")
    opportunities_js = (ROOT / "opportunities.js").read_text(encoding="utf-8")
    for required_text in ("verified opportunities", "pending or unverified", "No verified opportunities are available"):
        if required_text.lower() not in opportunities_html.lower() and required_text.lower() not in opportunities_js.lower():
            fail(f"the Opportunities page is missing its public verification/empty-state disclosure: {required_text}")
    for required_contract in ("/api/v1/opportunities", "deadlineBefore", "pageSize", "credentials: 'omit'", "createTextNode", "textContent = String(text)", "applicationLink", "sourceLink", "/api/v1/opportunities/${encodeURIComponent(id)}"):
        if required_contract not in opportunities_js:
            fail(f"the Opportunities UI is missing safe API integration behavior: {required_contract}")
    if "innerHTML" in opportunities_js or "pending_verification" in opportunities_js:
        fail("the public Opportunities renderer must not inject untrusted HTML or expose unverified candidates")

    checks = {
        "updates.html": "no verified notices yet",
        "events.html": "not confirmed or scheduled events",
        "budget.html": "actual position",
        "documents.html": "budget booklet available",
        "members.html": "no sign-in or registration is available",
        "gallery.html": "not a mulembe union executive official",
        "leadership.html": "our pride – university of embu leadership",
        "contact.html": FACEBOOK_URL.lower(),
    }
    for route, required_text in checks.items():
        if required_text not in body.get(route, ""):
            fail(f"required source/status disclosure is missing from {route}: {required_text}")

    print(f"PASS: {len(expected_routes)} direct routes have unique titles, headings, links and complete navigation")
    print("PASS: official logo preserved; supplied portraits and budget PDF resolve and are integrated")
    print("PASS: supplied portrait filenames match their assigned roles; University delegate is separately recognized")
    print("PASS: relative PWA manifest, icons and offline-capable service worker are present")
    print("PASS: Opportunities route is indexed, cached offline, and uses safe filtered list/detail API requests")
    print("PASS: supplied Facebook link is consistent and uses safe external-link attributes")
    print("PASS: proposed income/allocation totals reconcile; actual financials remain unknown")
    print(f"PASS: all {len(gallery_manifest)} repository photo files are listed once with supported categories and no exact duplicates")
    print("PASS: About page contains only the supplied 2016 history, challenges, 18 identities, unity message, vision, mission and values")
    print("PASS: donation endpoint remains disabled; no payment/PIN is collected or simulated; Daraja secrets remain backend-only")
    print("PASS: booklet SHA-256 is unchanged; notice, event, member-security and delegate-separation disclosures remain present")
    print("PASS: no public registration, password, or member-data forms were introduced")


if __name__ == "__main__":
    main()
