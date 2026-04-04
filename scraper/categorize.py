"""
categorize.py
分類邏輯：優先使用新聞原始分類標籤，無法判斷時用關鍵字規則回退。
同時計算時段 (morning / afternoon)。
"""

from datetime import datetime, timezone, timedelta

# 台灣時區 UTC+8
TW_TZ = timezone(timedelta(hours=8))

# 分類關鍵字規則（全小寫比對，優先順序由上到下）
CATEGORY_RULES = [
    (
        "LLM",
        [
            "gpt", "claude", "gemini", "llama", "mistral", "falcon", "grok",
            "llm", "large language model", "foundation model", "language model",
            "transformer", "fine-tun", "pre-train", "rlhf", "prompt",
        ],
    ),
    (
        "AI Company",
        [
            "openai", "google deepmind", "anthropic", "meta ai", "microsoft ai",
            "nvidia", "apple intelligence", "amazon aws", "hugging face",
            "stability ai", "cohere", "inflection", "xai", "elon musk",
            "sam altman", "sundar pichai", "funding", "valuation", "acquisition",
        ],
    ),
    (
        "AI Service",
        [
            "api", "saas", "product launch", "new feature", "release",
            "plugin", "integration", "chatbot", "assistant", "copilot",
            "subscription", "pricing", "update", "beta", "preview",
        ],
    ),
    (
        "AI Application",
        [
            "healthcare", "medical", "education", "autonomous", "vehicle",
            "robotics", "manufacturing", "finance", "legal", "art",
            "music", "video", "image generation", "deepfake", "cybersecurity",
            "agriculture", "climate", "science", "research", "drug",
        ],
    ),
]

# RSS 來源的原始 tag 映射（部分 RSS 有固定的 category 標籤）
TAG_MAPPING = {
    "machine learning": "LLM",
    "artificial intelligence": "AI Application",
    "deep learning": "LLM",
    "natural language processing": "LLM",
    "generative ai": "LLM",
    "nlp": "LLM",
    "computer vision": "AI Application",
    "startups": "AI Company",
    "enterprise": "AI Service",
    "cloud": "AI Service",
}


def map_category_from_tags(tags: list[str]) -> str | None:
    """嘗試從原始 tag 直接映射到分類。"""
    for tag in tags:
        normalized = tag.lower().strip()
        for raw, cat in TAG_MAPPING.items():
            if raw in normalized:
                return cat
    return None


def map_category_from_keywords(title: str, summary: str) -> str:
    """用關鍵字規則從標題和摘要判斷分類，最後 fallback 到 'AI Application'。"""
    text = (title + " " + summary).lower()
    for category, keywords in CATEGORY_RULES:
        for kw in keywords:
            if kw in text:
                return category
    return "AI Application"


def get_time_slot(published_iso: str) -> str:
    """
    根據發布時間（台灣時間）判斷時段：
    00:00–11:59 → morning
    12:00–23:59 → afternoon
    """
    try:
        dt = datetime.fromisoformat(published_iso)
        dt_tw = dt.astimezone(TW_TZ)
        return "morning" if dt_tw.hour < 12 else "afternoon"
    except Exception:
        return "morning"


def get_date(published_iso: str) -> str:
    """取得台灣時間的日期字串，格式 YYYY-MM-DD。"""
    try:
        dt = datetime.fromisoformat(published_iso)
        dt_tw = dt.astimezone(TW_TZ)
        return dt_tw.strftime("%Y-%m-%d")
    except Exception:
        return datetime.now(TW_TZ).strftime("%Y-%m-%d")


def categorize_articles(articles: list[dict]) -> list[dict]:
    """為每篇新聞加上 mapped_category, time_slot, date 欄位。"""
    for article in articles:
        tags = article.get("original_categories", [])
        title = article.get("title", "")
        summary = article.get("summary", "")
        published = article.get("published", "")

        # 優先從原始 tag 映射
        category = map_category_from_tags(tags)
        if not category:
            # 回退到關鍵字規則
            category = map_category_from_keywords(title, summary)

        article["mapped_category"] = category
        article["time_slot"] = get_time_slot(published)
        article["date"] = get_date(published)

    return articles
