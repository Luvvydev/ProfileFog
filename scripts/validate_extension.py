#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors = []
VALID_RESOURCE_TYPES = {"main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"}
REQUIRED_FILES = ["manifest.json", "service_worker.js", "popup.html", "popup.css", "popup.js", "options.html", "options.css", "options.js", "fingerprint_watcher.js", "fingerprint_page.js", "rules/tracker_rules.json", "rules/cleanup_rules.json", "rules/public_suffixes.json"]

def check_json(path):
    try:
        with open(ROOT / path, "r", encoding="utf-8") as f:
            json.load(f)
    except Exception as exc:
        errors.append(f"{path}: {exc}")

def check_node(path):
    try:
        subprocess.run(["node", "--check", str(ROOT / path)], check=True, capture_output=True, text=True)
    except FileNotFoundError:
        print("node not found, skipped JavaScript syntax checks")
    except subprocess.CalledProcessError as exc:
        errors.append(f"{path}: {exc.stderr.strip() or exc.stdout.strip()}")

def check_dnr_ids(path):
    try:
        rules = json.load(open(ROOT / path, "r", encoding="utf-8"))
    except Exception:
        return
    ids = [rule.get("id") for rule in rules]
    dupes = sorted({rule_id for rule_id in ids if ids.count(rule_id) > 1})
    if dupes:
        errors.append(f"{path}: duplicate rule ids {dupes}")

def load_json(path):
    with open(ROOT / path, "r", encoding="utf-8") as f:
        return json.load(f)

def check_required_files():
    for path in REQUIRED_FILES:
        if not (ROOT / path).is_file():
            errors.append(f"missing required file: {path}")


def check_manifest():
    try:
        manifest = load_json("manifest.json")
    except Exception:
        return
    if manifest.get("manifest_version") != 3:
        errors.append("manifest.json: manifest_version must be 3")
    if manifest.get("name") != "ProfileFog":
        errors.append("manifest.json: extension name should be ProfileFog")
    if not manifest.get("options_ui", {}).get("page"):
        errors.append("manifest.json: options_ui.page is missing")
    content_scripts = manifest.get("content_scripts", [])
    if not any("fingerprint_watcher.js" in item.get("js", []) for item in content_scripts):
        errors.append("manifest.json: fingerprint_watcher.js content script is missing")
    resources = manifest.get("web_accessible_resources", [])
    if not any("fingerprint_page.js" in item.get("resources", []) for item in resources):
        errors.append("manifest.json: fingerprint_page.js web accessible resource is missing")


def check_dnr_resource_types(path):
    try:
        rules = load_json(path)
    except Exception:
        return
    for rule in rules:
        rid = rule.get("id")
        for resource_type in rule.get("condition", {}).get("resourceTypes", []):
            if resource_type not in VALID_RESOURCE_TYPES:
                errors.append(f"{path}: rule {rid} has invalid resourceType {resource_type}")


def check_cleanup_regex_size(path):
    try:
        rules = load_json(path)
    except Exception:
        return
    for rule in rules:
        regex = rule.get("condition", {}).get("regexFilter", "")
        if regex and len(regex.encode("utf-8")) > 512:
            errors.append(f"{path}: rule {rule.get('id')} regexFilter is too large for safe Chrome DNR use")


def check_request_log_cap():
    source = (ROOT / "service_worker.js").read_text(encoding="utf-8")
    match = re.search(r"MAX_REQUEST_LOG_EVENTS\s*=\s*(\d+)", source)
    if not match:
        errors.append("service_worker.js: MAX_REQUEST_LOG_EVENTS is missing")
        return
    if int(match.group(1)) > 300:
        errors.append("service_worker.js: request log cap must be 300 or lower")



def check_watcher_caps():
    source = (ROOT / "service_worker.js").read_text(encoding="utf-8")
    caps = {
        "MAX_REQUEST_LOG_EVENTS": 300,
        "MAX_FINGERPRINT_EVENTS": 200,
        "MAX_CNAME_SUSPECTS": 150,
    }
    for name, limit in caps.items():
        match = re.search(rf"{name}\s*=\s*(\d+)", source)
        if not match:
            errors.append(f"service_worker.js: {name} is missing")
        elif int(match.group(1)) > limit:
            errors.append(f"service_worker.js: {name} must be {limit} or lower")

def check_no_release_junk():
    package = ROOT / "dist" / "ProfileFog.zip"
    if not package.exists():
        return
    junk = [".DS_Store", "__MACOSX", "_metadata", ".git/"]
    try:
        with zipfile.ZipFile(package, "r") as zf:
            for name in zf.namelist():
                if any(part in name for part in junk):
                    errors.append(f"release junk present in package: {name}")
    except Exception as exc:
        errors.append(f"dist/ProfileFog.zip: {exc}")

def main():
    check_required_files()
    check_json("manifest.json")
    check_json("rules/tracker_rules.json")
    check_json("rules/cleanup_rules.json")
    check_json("rules/public_suffixes.json")
    check_dnr_ids("rules/tracker_rules.json")
    check_dnr_ids("rules/cleanup_rules.json")
    check_manifest()
    check_dnr_resource_types("rules/tracker_rules.json")
    check_dnr_resource_types("rules/cleanup_rules.json")
    check_cleanup_regex_size("rules/cleanup_rules.json")
    check_request_log_cap()
    check_watcher_caps()
    check_no_release_junk()
    check_node("service_worker.js")
    check_node("popup.js")
    check_node("options.js")
    check_node("fingerprint_watcher.js")
    check_node("fingerprint_page.js")

    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("Validation passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
