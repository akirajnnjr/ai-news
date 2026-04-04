# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

"""
main.py
AI news auto-scraper main entry point.
執行方式：python scraper/main.py
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta

# 確保可以引入同層模組
sys.path.insert(0, os.path.dirname(__file__))

from fetch_feeds import fetch_all_sources
from dedup import filter_new_articles
from categorize import categorize_articles

TW_TZ = timezone(timedelta(hours=8))
NEWS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "news.json")


def load_news_db() -> dict:
    """讀取現有的 news.json，若不存在則回傳初始結構。"""
    if not os.path.exists(NEWS_PATH):
        return {"last_updated": "", "total": 0, "news": []}
    try:
        with open(NEWS_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {"last_updated": "", "total": 0, "news": []}


def save_news_db(db: dict) -> None:
    """將更新後的資料寫回 news.json。"""
    os.makedirs(os.path.dirname(NEWS_PATH), exist_ok=True)
    with open(NEWS_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    print(f"\n  [OK] Saved to {os.path.abspath(NEWS_PATH)}")


def main():
    print("=" * 50)
    print("AI News Scraper - Starting...")
    print(f"Time: {datetime.now(TW_TZ).strftime('%Y-%m-%d %H:%M:%S')} (TW)")
    print("=" * 50)

    # 1. 抓取所有啟用的 RSS 來源
    print("\n[1/4] Fetching RSS feeds...")
    fetched = fetch_all_sources()

    if not fetched:
        print("  No articles fetched. Exiting.")
        return

    # 2. 去重比對
    print("\n[2/4] Deduplicating...")
    new_articles = filter_new_articles(fetched)

    if not new_articles:
        print("  No new articles. Database is up to date.")
        return

    # 3. 分類
    print("\n[3/4] Categorizing...")
    categorized = categorize_articles(new_articles)

    # 顯示分類統計
    from collections import Counter
    cat_counts = Counter(a["mapped_category"] for a in categorized)
    for cat, count in cat_counts.most_common():
        print(f"  {cat}: {count} articles")

    # 4. 更新資料庫
    print("\n[4/4] Updating database...")
    db = load_news_db()

    # 新文章加到最前面（最新在上）
    db["news"] = categorized + db["news"]
    db["total"] = len(db["news"])
    db["last_updated"] = datetime.now(TW_TZ).isoformat()

    save_news_db(db)

    print(f"\n{'=' * 50}")
    print(f"Done! Added {len(new_articles)} new articles.")
    print(f"Total articles in database: {db['total']}")
    print("=" * 50)


if __name__ == "__main__":
    main()
