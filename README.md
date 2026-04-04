# AI News Hub

Automatically aggregates the latest AI news from major sources, categorizes them, and publishes to GitHub Pages. Updated twice daily via GitHub Actions.

**Live site:** `https://akirajnnjr.github.io/ai-news/`

---

## Features

- Fetches RSS feeds from 6 major AI news sources
- Deduplication via URL hash — no repeated articles
- Categorizes news using the article's own tags, with keyword fallback
- Time-slot labeling (morning / afternoon) based on Taiwan time
- All history retained in a single JSON file
- Static GitHub Pages frontend — no backend required

## Categories

| Category | Description |
|---|---|
| LLM | Language models, training, fine-tuning, prompting |
| AI Company | Company news, funding, leadership, acquisitions |
| AI Service | Product launches, APIs, SaaS updates |
| AI Application | Industry use cases, healthcare, robotics, etc. |

## Project Structure

```
ai-news/
├── .github/workflows/update_news.yml   # Scheduled GitHub Actions
├── scraper/
│   ├── main.py                         # Entry point
│   ├── fetch_feeds.py                  # RSS fetcher
│   ├── dedup.py                        # Deduplication logic
│   └── categorize.py                   # Category mapping
├── data/
│   ├── news.json                       # Full news database
│   └── sources.json                    # RSS source config
├── assets/
│   ├── style.css
│   └── app.js
└── index.html                          # GitHub Pages frontend
```

## Managing RSS Sources

Edit `data/sources.json` to add or remove sources. No code changes needed.

```json
{
  "sources": [
    { "name": "My Source", "url": "https://example.com/feed.xml", "enabled": true, "language": "en" },
    { "name": "Paused Source", "url": "https://...", "enabled": false, "language": "en" }
  ]
}
```

Set `enabled: false` to pause a source without deleting it.

## Running Locally

```bash
pip install -r requirements.txt
python scraper/main.py
```

Run twice to verify deduplication (second run should report 0 new articles).

## Schedule

GitHub Actions runs automatically at:

| Taiwan Time | UTC Cron |
|---|---|
| 08:00 daily | `0 0 * * *` |
| 14:00 daily | `0 6 * * *` |

You can also trigger a run manually from the Actions tab on GitHub.

## GitHub Pages Setup

1. Make the repository **public**
2. Settings -> Pages -> Branch: `main` / Folder: `/ (root)` -> Save
3. Settings -> Actions -> General -> Workflow permissions -> Read and write -> Save
