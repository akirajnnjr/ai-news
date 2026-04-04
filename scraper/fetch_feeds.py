# -*- coding: utf-8 -*-
"""
fetch_feeds.py
抓取所有啟用的 RSS 來源，回傳標準化的新聞列表。
"""

import feedparser
import json
import os
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime


SOURCES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sources.json")


def load_sources() -> list[dict]:
    """讀取 sources.json，回傳啟用的來源列表。"""
    with open(SOURCES_PATH, encoding="utf-8") as f:
        config = json.load(f)
    return [s for s in config["sources"] if s.get("enabled", True)]


def parse_published(entry) -> str:
    """解析發布時間，回傳 ISO 8601 格式字串 (UTC)。"""
    # feedparser 提供的 published_parsed (time.struct_time, UTC)
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        return dt.isoformat()
    # fallback: published 字串
    if hasattr(entry, "published") and entry.published:
        try:
            dt = parsedate_to_datetime(entry.published)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            pass
    # 最後 fallback: 現在時間
    return datetime.now(timezone.utc).isoformat()


def get_original_categories(entry) -> list[str]:
    """取得新聞原始分類標籤列表。"""
    cats = []
    if hasattr(entry, "tags"):
        for tag in entry.tags:
            label = tag.get("label") or tag.get("term") or ""
            if label:
                cats.append(label.strip())
    return list(dict.fromkeys(cats))  # 去重，保持順序


def fetch_all_sources() -> list[dict]:
    """
    抓取所有啟用的 RSS 來源。
    回傳格式化的新聞列表，每筆包含：
      title, url, summary, published, source, original_categories
    """
    sources = load_sources()
    results = []

    for source in sources:
        print(f"  -> Fetching: {source['name']} ...")
        try:
            feed = feedparser.parse(source["url"])
            if feed.bozo and feed.bozo_exception:
                print(f"    [WARN] Warning for {source['name']}: {feed.bozo_exception}")

            for entry in feed.entries:
                url = getattr(entry, "link", "") or getattr(entry, "id", "")
                if not url:
                    continue

                summary = ""
                if hasattr(entry, "summary"):
                    summary = entry.summary
                elif hasattr(entry, "description"):
                    summary = entry.description

                # 去除 HTML 標籤（簡單處理）
                import re
                summary = re.sub(r"<[^>]+>", "", summary).strip()
                summary = summary[:500]  # 最多 500 字

                item = {
                    "title": getattr(entry, "title", "").strip(),
                    "url": url.strip(),
                    "summary": summary,
                    "published": parse_published(entry),
                    "source": source["name"],
                    "original_categories": get_original_categories(entry),
                }
                results.append(item)

        except Exception as e:
            print(f"    [ERROR] Error fetching {source['name']}: {e}")

    print(f"\n  Total fetched: {len(results)} articles")
    return results
