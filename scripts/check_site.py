#!/usr/bin/env python3
"""Static checks for the UOEM public site; requires only Python's standard library."""
from __future__ import annotations

import csv
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.fragments: list[str] = []
        self.local_assets: list[str] = []
        self.title_text = False
        self.title = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if attributes.get("id"):
            self.ids.append(attributes["id"] or "")
        if tag == "a":
            href = attributes.get("href") or ""
            if href.startswith("#") and href != "#":
                self.fragments.append(href[1:])
            elif href and not urlparse(href).scheme and not href.startswith("//"):
                local_path = unquote(urlparse(href).path)
                if local_path:
                    self.local_assets.append(local_path)
        for name in ("src", "content"):
            value = attributes.get(name) or ""
            if name == "src" and value and not urlparse(value).scheme and not value.startswith("//"):
                self.local_assets.append(unquote(value))
        if tag == "link":
            href = attributes.get("href") or ""
            if href and not href.startswith("#") and not urlparse(href).scheme and not href.startswith("//"):
                self.local_assets.append(unquote(urlparse(href).path))
        if tag == "title":
            self.title_text = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.title_text = False

    def handle_data(self, data: str) -> None:
        if self.title_text:
            self.title += data


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def main() -> None:
    html_path = ROOT / "index.html"
    if not html_path.is_file():
        fail("index.html is missing")
    parser = SiteParser()
    parser.feed(html_path.read_text(encoding="utf-8"))
    parser.close()
    if not parser.title.strip():
        fail("page title is missing")
    duplicates = sorted({value for value in parser.ids if parser.ids.count(value) > 1})
    if duplicates:
        fail(f"duplicate HTML id(s): {', '.join(duplicates)}")
    missing_targets = sorted(set(parser.fragments) - set(parser.ids))
    if missing_targets:
        fail(f"broken in-page link target(s): {', '.join(missing_targets)}")
    missing_assets = sorted({path for path in parser.local_assets if not (ROOT / path).is_file()})
    if missing_assets:
        fail(f"missing local asset(s): {', '.join(missing_assets)}")

    logo = ROOT / "IMG-20261124-WA0001.jpg"
    if not logo.is_file() or logo.stat().st_size < 1000:
        fail("the repository's official logo is missing or unexpectedly small")
    if logo.read_bytes()[:2] != b"\xff\xd8":
        fail("the preserved official logo is not a JPEG image")

    data_path = ROOT / "data" / "proposed-budget-2026-27.json"
    data = json.loads(data_path.read_text(encoding="utf-8"))
    if data.get("dataStatus") != "PROPOSED_ONLY":
        fail("budget figures must retain the PROPOSED_ONLY status")
    if sum(int(item["amount"]) for item in data["income"]) != data["proposedIncomeTotal"]:
        fail("proposed income line items do not match the stated total")
    if sum(int(item["amount"]) for item in data["allocations"]) != data["proposedAllocationTotal"]:
        fail("proposed allocation line items do not match the stated total")
    if data["proposedIncomeTotal"] != 69500 or data["proposedAllocationTotal"] != 59000:
        fail("budget totals differ from the supplied project brief")
    if data.get("actualTransactions") != [] or any(data.get(key) is not None for key in ("actualIncome", "actualExpenditure", "actualBalance")):
        fail("proposed figures must not be represented as known actuals")
    if data.get("originalPdfAvailable") is not False:
        fail("source PDF availability must be explicit")

    csv_path = ROOT / "data" / "proposed-budget-2026-27.csv"
    with csv_path.open(encoding="utf-8", newline="") as csv_file:
        rows = list(csv.DictReader(csv_file))
    csv_income = sum(int(row["amount_ksh"]) for row in rows if row["status"] == "PROPOSED ONLY" and row["section"] == "Income")
    csv_allocations = sum(int(row["amount_ksh"]) for row in rows if row["status"] == "PROPOSED ONLY" and row["section"] == "Allocation")
    if csv_income != data["proposedIncomeTotal"] or csv_allocations != data["proposedAllocationTotal"]:
        fail("downloadable CSV totals differ from the proposed JSON data")
    if any(row["status"] not in ("PROPOSED ONLY", "PROPOSED TOTAL") for row in rows):
        fail("budget CSV contains an unexpected financial status")

    html = html_path.read_text(encoding="utf-8").lower()
    for required in ("member portal", "not live yet", "no active election", "proposal only", "no verified notices"):
        if required not in re.sub(r"\s+", " ", html):
            fail(f"expected public status disclosure is missing: {required}")
    print("PASS: HTML title, unique IDs, internal anchors and local assets")
    print("PASS: official logo exists and remains a JPEG")
    print("PASS: proposed budget item totals reconcile; actuals remain unknown")
    print("PASS: downloadable CSV totals match the proposed JSON data")
    print("PASS: member, elections, notices and source-document status disclosures")


if __name__ == "__main__":
    main()
