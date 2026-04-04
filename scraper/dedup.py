"""
dedup.py
去重邏輯：以 MD5(URL) 作為唯一 ID，比對已存在的新聞。
"""

import hashlib
import json
import os


NEWS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "news.json")


def url_to_id(url: str) -> str:
    """將 URL 轉換為 MD5 hash 作為唯一 ID。"""
    return hashlib.md5(url.encode("utf-8")).hexdigest()


def load_existing_ids() -> set[str]:
    """讀取已存在的新聞 ID set。"""
    if not os.path.exists(NEWS_PATH):
        return set()
    try:
        with open(NEWS_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return {item["id"] for item in data.get("news", [])}
    except (json.JSONDecodeError, KeyError):
        return set()


def filter_new_articles(articles: list[dict]) -> list[dict]:
    """
    過濾出尚未存在的新聞，並為每篇新聞加上 id 欄位。
    回傳：只包含新增的新聞列表。
    """
    existing_ids = load_existing_ids()
    new_articles = []

    for article in articles:
        article_id = url_to_id(article["url"])
        if article_id not in existing_ids:
            article["id"] = article_id
            new_articles.append(article)
            existing_ids.add(article_id)  # 防止同次抓到重複 URL

    print(f"  Dedup: {len(articles)} fetched → {len(new_articles)} new articles")
    return new_articles
