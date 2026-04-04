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

// 狀態
let state = {
  allNews: [],
  selectedDate: null,    // null = today
  selectedCat: 'all',
  selectedSlot: 'all',   // 'all' | 'morning' | 'afternoon'
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
  return d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' });
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
    if (state.selectedSlot !== 'all' && n.time_slot !== state.selectedSlot) return false;
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

    return `
      <a class="news-card" href="${escHtml(n.url)}" target="_blank" rel="noopener">
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
}

function selectCat(cat) {
  state.selectedCat = cat;
  renderCatList();
  renderNewsList();
}

function selectSlot(slot) {
  state.selectedSlot = slot;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.slot === slot);
  });
  renderNewsList();
}

// ============================
// Start
// ============================
document.addEventListener('DOMContentLoaded', init);
