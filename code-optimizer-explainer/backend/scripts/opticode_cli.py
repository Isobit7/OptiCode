#!/usr/bin/env python3
"""
OptiCode Terminal CLI Tool
Usage:
    python opticode_cli.py explain <filename>
    python opticode_cli.py humanize <filename>
    python opticode_cli.py audit <filename>
    python opticode_cli.py translate <filename> --target Rust
"""

import sys
import os
import argparse
import json
import httpx

API_BASE_URL = os.getenv("OPTICODE_API_URL", "http://localhost:8000")


def main():
    parser = argparse.ArgumentParser(description="OptiCode Terminal CLI — Supercharged Code Intelligence")
    parser.add_argument("action", choices=["explain", "humanize", "audit", "translate", "prettify", "shorten"], help="Action to run")
    parser.add_argument("file", help="Path to input code file")
    parser.add_argument("--target", default="TypeScript", help="Target language for translation")
    parser.add_argument("--lang", default="", help="Override programming language hint")

    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File '{args.file}' not found.")
        sys.exit(1)

    with open(args.file, "r", encoding="utf-8") as f:
        code = f.read()

    endpoint_map = {
        "explain": "/api/explain",
        "humanize": "/api/humanize",
        "audit": "/api/security-audit",
        "translate": "/api/translate",
        "prettify": "/api/prettify",
        "shorten": "/api/shorten",
    }

    url = f"{API_BASE_URL}{endpoint_map[args.action]}"
    payload = {"code": code}
    if args.lang:
        payload["language"] = args.lang
    if args.action == "translate":
        payload["target_language"] = args.target

    print(f"🚀 Running OptiCode {args.action.upper()} on {args.file}...")
    try:
        response = httpx.post(url, json=payload, timeout=30.0)
        if response.status_code != 200:
            print(f"Error ({response.status_code}): {response.text}")
            sys.exit(1)

        data = response.json()
        print("\n" + "=" * 60 + "\n")
        if args.action == "explain":
            print(data.get("explanation", ""))
        elif args.action == "humanize":
            print(data.get("humanized_code", ""))
        elif args.action == "audit":
            print(f"SECURITY GRADE: {data.get('grade')} (Score: {data.get('score')}/100)")
            print(f"Secrets Found: {data.get('secrets_found')}\n")
            print(data.get("summary", ""))
            print("\nSANITIZED CODE:\n")
            print(data.get("sanitized_code", ""))
        elif args.action == "translate":
            print(f"TRANSLATED CODE ({data.get('target_language')}):\n")
            print(data.get("translated_code", ""))
        elif args.action == "prettify":
            print(data.get("formatted_code", ""))
        elif args.action == "shorten":
            print(data.get("shortened_code", ""))
        print("\n" + "=" * 60)
    except Exception as err:
        print(f"CLI Error: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
