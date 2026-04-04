/**
 * app.js - AI News GitHub Pages Frontend
 * 讀取 data/news.json，動態渲染新聞列表
 */

const NEWS_URL = 'data/news.json';

// 分類設定
const CATEGORIES = [
  { key: 'all',            label: 'All',              dotClass: 'cat-dot-all' },
  { key: 'LLM',            label: 'LLM',              dotClass: 'cat-dot-llm' },
  { key: 'AI Company',     label: 'AI Company',       dotClass: 'cat-dot-company' },
  { key: 'AI Service',     label: 'AI Service',       dotClass: 'cat-dot-service' },
  { key: 'AI Application', label: 'AI Application',   dotClass: 'cat-dot-application' },
];

const CATEGORY_TAG_MAP = {
  'LLM':            'tag-llm',
  'AI Company':     'tag-company',
  'AI Service':     'tag-service',
  'AI Application': 'tag-application',
};

// 翻譯設定
const USER_LANG = (navigator.language || 'en').toLowerCase();  // e.g. zh-TW, ja, ko
const NEED_TRANSLATION = !USER_LANG.startsWith('en');          // 若瀏覽器語言非英語才翻譯
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';
const translationCache = new Map();  // key: "text|lang", value: translatedText

// 狀態
let state = {
  allNews: [],
  selectedDate: null,
  selectedCat: 'all',
  lastUpdated: '',
};

// ============================
// 初始化
// ============================
async function init() {
  try {
    const res = await fetch(NEWS_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    state.allNews = data.news || [];
    state.lastUpdated = data.last_updated || '';

    // 預設選擇最新的日期
    const dates = getUniqueDates();
    state.selectedDate = dates[0] || getTodayStr();

    renderAll();
  } catch (err) {
    document.getElementById('news-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">資料載入失敗</div>
        <div class="empty-desc">${err.message}<br>請確認 data/news.json 存在且 GitHub Pages 已啟用。</div>
      </div>`;
    console.error('Failed to load news:', err);
  }
}

// ============================
// Helper
// ============================
function getTodayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

function getUniqueDates() {
  const dates = [...new Set(state.allNews.map(n => n.date))];
  return dates.sort((a, b) => b.localeCompare(a)); // 最新在前
}

function formatDate(dateStr) {
  const today = getTodayStr();
  const yesterday = new Date(Date.now() - 86400000)
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  const d = new Date(dateStr + 'T12:00:00');
  // 加入年份
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('zh-TW', {
      timeZone: 'Asia/Taipei',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  } catch { return ''; }
}

function getFilteredNews() {
  return state.allNews.filter(n => {
    if (n.date !== state.selectedDate) return false;
    if (state.selectedCat !== 'all' && n.mapped_category !== state.selectedCat) return false;
    return true;
  });
}

function countByDate(date) {
  return state.allNews.filter(n => n.date === date).length;
}

// ============================
// Render Functions
// ============================
function renderAll() {
  renderHeader();
  renderDateList();
  renderCatList();
  renderNewsList();
  translateVisible();
}

function renderHeader() {
  const el = document.getElementById('last-updated');
  if (!el) return;
  if (state.lastUpdated) {
    const d = new Date(state.lastUpdated);
    el.textContent = '更新於 ' + d.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  }
}

function renderDateList() {
  const dates = getUniqueDates();
  const container = document.getElementById('date-list');
  container.innerHTML = dates.map(date => `
    <li class="date-item ${date === state.selectedDate ? 'active' : ''}"
        data-date="${date}" onclick="selectDate('${date}')">
      <span>${formatDate(date)}</span>
      <span class="date-count">${countByDate(date)}</span>
    </li>
  `).join('');
}

function renderCatList() {
  const container = document.getElementById('cat-list');
  container.innerHTML = CATEGORIES.map(cat => `
    <li class="cat-item ${cat.key === state.selectedCat ? 'active' : ''}"
        onclick="selectCat('${cat.key}')">
      <span class="cat-dot ${cat.dotClass}"></span>
      <span>${cat.label}</span>
    </li>
  `).join('');
}

function renderNewsList() {
  const filtered = getFilteredNews();
  const container = document.getElementById('news-list');
  const statsEl = document.getElementById('stats-count');

  if (statsEl) statsEl.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">沒有符合的新聞</div>
        <div class="empty-desc">試著換個日期或分類篩選</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(n => {
    const tagClass = CATEGORY_TAG_MAP[n.mapped_category] || 'tag-application';
    const origTags = (n.original_categories || []).slice(0, 4)
      .map(t => `<span class="orig-tag">${escHtml(t)}</span>`).join('');
    const transId = 'trans-' + n.id;

    return `
      <a class="news-card" href="${escHtml(n.url)}" target="_blank" rel="noopener"
         data-news-id="${escHtml(n.id)}">
        <div class="card-header">
          <div class="card-title">${escHtml(n.title)}</div>
        </div>
        ${n.summary ? `<div class="card-summary">${escHtml(n.summary)}</div>` : ''}
        ${origTags ? `<div class="original-tags">${origTags}</div>` : ''}
        <div class="card-footer">
          <span class="tag-badge ${tagClass}">${escHtml(n.mapped_category)}</span>
          <span class="card-sep">·</span>
          <span class="card-source">${escHtml(n.source)}</span>
          <span class="card-sep">·</span>
          <span class="card-time">${formatTime(n.published)}</span>
        </div>
        ${NEED_TRANSLATION ? `<div class="card-translation" id="${transId}">Translating...</div>` : ''}
      </a>`;
  }).join('');
}

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================
// Event Handlers
// ============================
function selectDate(date) {
  state.selectedDate = date;
  renderDateList();
  renderNewsList();
  translateVisible();
}

function selectCat(cat) {
  state.selectedCat = cat;
  renderCatList();
  renderNewsList();
  translateVisible();
}

// ============================
// Translation
// ============================
async function translateText(text, targetLang) {
  if (!text) return '';
  const cacheKey = targetLang + '|' + text;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

  try {
    const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=en|${encodeURIComponent(targetLang)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const translated = data?.responseData?.translatedText || text;
    // MyMemory 有時回傳 MYMEMORY WARNING 開頭的錯誤訊息
    if (translated.startsWith('MYMEMORY WARNING')) return text;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

async function translateCard(newsItem) {
  if (!NEED_TRANSLATION) return;
  const el = document.getElementById('trans-' + newsItem.id);
  if (!el) return;

  // 翻譯標題（必要）+ 摘要（前150字）
  const titlePromise = translateText(newsItem.title, USER_LANG);
  const summaryText = (newsItem.summary || '').slice(0, 200);
  const summaryPromise = summaryText ? translateText(summaryText, USER_LANG) : Promise.resolve('');

  const [title, summary] = await Promise.all([titlePromise, summaryPromise]);

  if (!el) return;  // 可能在結果回來前已換頁
  if (title && title !== newsItem.title) {
    el.innerHTML = `<span class="trans-title">${escHtml(title)}</span>` +
      (summary && summary !== summaryText ? `<span class="trans-summary">${escHtml(summary)}</span>` : '');
    el.style.display = 'block';
  } else {
    el.style.display = 'none'; // 翻譯結果與原文相同時隱藏
  }
}

function translateVisible() {
  if (!NEED_TRANSLATION) return;
  const filtered = getFilteredNews();
  // 使用並行發送，但限制同時最多 5 個請求，避免被 rate limit
  const BATCH = 5;
  let index = 0;
  function nextBatch() {
    const batch = filtered.slice(index, index + BATCH);
    if (batch.length === 0) return;
    index += BATCH;
    Promise.all(batch.map(n => translateCard(n))).then(nextBatch);
  }
  nextBatch();
}

async function refreshNews() {
  const btn = document.getElementById('refresh-btn');
  const icon = document.getElementById('refresh-icon');
  if (btn.disabled) return;

  btn.disabled = true;
  icon.style.display = 'inline-block';
  icon.style.animation = 'spin 0.8s linear infinite';

  try {
    const res = await fetch(NEWS_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.allNews = data.news || [];
    state.lastUpdated = data.last_updated || '';

    const dates = getUniqueDates();
    // 保持選中的日期，若不存在則回到最新
    if (!dates.includes(state.selectedDate)) {
      state.selectedDate = dates[0] || getTodayStr();
    }
    renderAll();
  } catch (err) {
    console.error('Refresh failed:', err);
  } finally {
    btn.disabled = false;
    icon.style.animation = '';
  }
}


// ============================
// Start
// ============================
document.addEventListener('DOMContentLoaded', init);
