#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick test script to verify scraper_api.py works correctly
"""

import json
import sys
import os

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test import
try:
    from scraper_api import scrape_website
    print("[OK] scraper_api.py imports successfully")
except ImportError as e:
    print(f"[ERROR] Failed to import scraper_api: {e}")
    sys.exit(1)

# Test with a simple website
print("\n[TEST] Testing scraper with example.com (limit 1 page)...")
try:
    result = scrape_website("https://example.com", max_pages=1)
    
    if result.get("success"):
        data = result.get("data", {})
        items = data.get("items", [])
        print(f"[OK] Scraper test successful!")
        print(f"   - Site: {data.get('site', 'N/A')}")
        print(f"   - Items found: {len(items)}")
        if items:
            print(f"   - First item title: {items[0].get('title', 'N/A')[:50]}...")
        else:
            print("   - Note: No items found (this is okay for a test)")
    else:
        print(f"[ERROR] Scraper test failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)
        
except Exception as e:
    print(f"[ERROR] Test failed with exception: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n[OK] All tests passed! Scraper is ready to use.")

