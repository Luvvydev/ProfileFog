#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors = []

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

def main():
    check_json("manifest.json")
    check_json("rules/tracker_rules.json")
    check_json("rules/cleanup_rules.json")
    check_dnr_ids("rules/tracker_rules.json")
    check_dnr_ids("rules/cleanup_rules.json")
    check_node("service_worker.js")
    check_node("popup.js")
    check_node("options.js")

    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("Validation passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
