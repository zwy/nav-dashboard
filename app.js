/* ===================================================
 * nav-dashboard  app.js  v1.1.1
 * 修复：openUrl 协议白名单 / normalizeUrl 无效自赋值
 * =================================================== */

const COLORS = ['#01696f','#437a22','#964219','#a12c7b','#006494','#7a39bb','#da7101','#d19900','#a13544'];
const DATA_VERSION = 2;
const STORAGE_KEY = 'navdata';
const SNAPSHOT_KEY = 'navdata_snapshot';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

/* ---------- URL 规范化（用于去重比对） ---------- */
function normalizeUrl(raw) {
  try {
    let s = raw.trim();
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    const u = new URL(s);
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    // 注：u.search 保留原值，无需自赋值
    return u.hostname + u.pathname + u.search;
  } catch { return raw.trim().toLowerCase(); }
}

function domainOf(url) { try { return new URL(url).hostname; } catch { return ''; } }
function faviconUrl(url) { const h = domainOf(url); return h ? `https://www.google.com/s2/favicons?domain=${h}&sz=64` : ''; }
function hostLabel(url) { const h = domainOf(url); return h ? h.replace(/^www\./, '') : url; }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s) { return String(s).replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }

/* ---------- 默认示例数据 ---------- */
const DEFAULT_DATA = {
  version: DATA_VERSION,
  categories: [
    { id: 'cat-work',  name: '工作',  color: '#01696f' },
    { id: 'cat-dev',   name: '开发',  color: '#7a39bb' },
    { id: 'cat-tools', name: '工具',  color: '#da7101' },
    { id: 'cat-news',  name: '资讯',  color: '#006494' },
  ],
  bookmarks: [
    { id:'bk1', title:'GitHub',       url:'https://github.com',                description:'代码托管平台',     categoryId:'cat-dev',   tags:['代码','开源'] },
    { id:'bk2', title:'Hacker News',  url:'https://news.ycombinator.com',       description:'技术新闻聚合',     categoryId:'cat-news',  tags:['新闻','技术'] },
    { id:'bk3', title:'Excalidraw',   url:'https://excalidraw.com',             description:'手绘风格白板工具', categoryId:'cat-tools', tags:['绘图']        },
    { id:'bk4', title:'Notion',       url:'https://notion.so',                  description:'笔记与项目管理',   categoryId:'cat-work',  tags:['笔记','项目'] },
    { id:'bk5', title:'MDN Web Docs', url:'https://developer.mozilla.org',      description:'Web 技术文档',     categoryId:'cat-dev',   tags:['文档','Web']  },
    { id:'bk6', title:'Can I use',    url:'https://caniuse.com',                description:'浏览器兼容性查询', categoryId:'cat-dev',   tags:['CSS','兼容性'] },
  ]
};

/* ============================================================
 * App 单例
 * ========================================================== */
const App = (() => {
  let data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  let currentCat = 'all';
  let searchQuery = '';
  let editBkId = null;
  let editCatId = null;
  let selectedColor = COLORS[0];
  let urlTimer = null;
  let importPayload = null;   // 待确认的导入数据 { bookmarks, categories, source }
  let canUndo = false;

  /* ---------- 持久化 ---------- */
  function save(takeSnapshot = true) {
    if (takeSnapshot) {
      try { localStorage.setItem(SNAPSHOT_KEY, localStorage.getItem(STORAGE_KEY) || ''); } catch(_) {}
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(_) {}
    updateUndoBtn();
  }

  function load() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        if (!parsed.version) parsed.version = 1;
        data = parsed;
      }
    } catch(_) {}
    updateUndoBtn();
  }

  function updateUndoBtn() {
    try {
      const snap = localStorage.getItem(SNAPSHOT_KEY);
      canUndo = !!(snap && snap !== '{}' && snap !== '');
    } catch(_) { canUndo = false; }
    const btn = document.getElementById('undo-btn');
    if (btn) btn.disabled = !canUndo;
  }

  /* ---------- 撤销最后一步 ---------- */
  function undo() {
    try {
      const snap = localStorage.getItem(SNAPSHOT_KEY);
      if (!snap) { toast('没有可撤销的操作'); return; }
      data = JSON.parse(snap);
      localStorage.setItem(STORAGE_KEY, snap);
      localStorage.removeItem(SNAPSHOT_KEY);
      canUndo = false;
      updateUndoBtn();
      render();
      toast('已撤销上一步操作');
    } catch(_) { toast('撤销失败'); }
  }

  /* ---------- 去重检测 ---------- */
  function isDuplicate(url, excludeId = null) {
    const norm = normalizeUrl(url);
    return data.bookmarks.some(b => b.id !== excludeId && normalizeUrl(b.url) === norm);
  }

  function findDuplicate(url, excludeId = null) {
    const norm = normalizeUrl(url);
    return data.bookmarks.find(b => b.id !== excludeId && normalizeUrl(b.url) === norm) || null;
  }

  /* ---------- 渲染 ---------- */
  function renderSidebar() {
    const list = document.getElementById('cat-list');
    document.getElementById('count-all').textContent = data.bookmarks.length;
    list.querySelectorAll('[data-id]:not([data-id="all"])').forEach(e => e.remove());
    data.categories.forEach(cat => {
      const count = data.bookmarks.filter(b => b.categoryId === cat.id).length;
      const div = document.createElement('div');
      div.className = 'cat-item' + (currentCat === cat.id ? ' active' : '');
      div.dataset.id = cat.id;
      div.innerHTML = `<div class="cat-dot" style="background:${cat.color}"></div>
        <span>${escHtml(cat.name)}</span>
        <span class="cat-count">${count}</span>
        <div class="cat-actions">
          <button title="编辑" onclick="event.stopPropagation();App.openCatModal('${cat.id}')">✎</button>
        </div>`;
      div.addEventListener('click', () => selectCat(cat.id));
      list.appendChild(div);
    });
    list.querySelector('[data-id="all"]').className = 'cat-item' + (currentCat === 'all' ? ' active' : '');
  }

  function renderContent() {
    const root = document.getElementById('view-root');
    let bks = [...data.bookmarks];
    if (currentCat !== 'all') bks = bks.filter(b => b.categoryId === currentCat);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      bks = bks.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (bks.length === 0) {
      root.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🔖</div>
        <h3>${searchQuery ? '没有匹配的书签' : '还没有书签'}</h3>
        <p>${searchQuery ? '试试其他关键词' : '点击右上角「添加书签」开始收藏'}</p>
      </div>`;
      return;
    }
    if (currentCat !== 'all' || searchQuery) {
      const cat = data.categories.find(c => c.id === currentCat);
      root.innerHTML = `<div class="cat-group">
        <div class="cat-group-header">
          <div class="dot" style="background:${cat ? cat.color : '#7a7974'}"></div>
          <h3>${cat ? escHtml(cat.name) : '全部'}</h3>
          <span class="count">${bks.length} 个书签</span>
        </div>
        <div class="grid">${bks.map(bkCardHtml).join('')}</div>
      </div>`;
    } else {
      let html = '';
      const uncats = bks.filter(b => !data.categories.find(c => c.id === b.categoryId));
      if (uncats.length) html += groupHtml('未分类', '#7a7974', uncats);
      data.categories.forEach(cat => {
        const cb = bks.filter(b => b.categoryId === cat.id);
        if (!cb.length) return;
        html += groupHtml(cat.name, cat.color, cb);
      });
      root.innerHTML = html;
    }
  }

  function groupHtml(name, color, bks) {
    return `<div class="cat-group">
      <div class="cat-group-header">
        <div class="dot" style="background:${color}"></div>
        <h3>${escHtml(name)}</h3>
        <span class="count">${bks.length}</span>
      </div>
      <div class="grid">${bks.map(bkCardHtml).join('')}</div>
    </div>`;
  }

  function bkCardHtml(bk) {
    const fav = faviconUrl(bk.url);
    const faviconHtml = fav
      ? `<img src="${fav}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<span style="font-size:14px">🌐</span>`;
    const tags = (bk.tags || []).filter(t => t).map(t => `<span class="bk-tag">${escHtml(t)}</span>`).join('');
    const desc = bk.description ? `<div class="bk-desc">${escHtml(bk.description)}</div>` : '';
    const tagsRow = tags ? `<div class="bk-tags">${tags}</div>` : '';
    return `<div class="bk-card" onclick="App.openUrl('${escAttr(bk.url)}')">
      <div class="bk-actions">
        <button class="bk-action-btn" title="编辑" onclick="event.stopPropagation();App.openBkModal('${bk.id}')">✎</button>
        <button class="bk-action-btn del" title="删除" onclick="event.stopPropagation();App.deleteBk('${bk.id}')">✕</button>
      </div>
      <div class="bk-card-top"><div class="bk-favicon">${faviconHtml}</div><div class="bk-title">${escHtml(bk.title)}</div></div>
      <div class="bk-url">${escHtml(hostLabel(bk.url))}</div>${desc}${tagsRow}
    </div>`;
  }

  function render() { renderSidebar(); renderContent(); }

  /* ---------- 书签 CRUD ---------- */
  function selectCat(id) { currentCat = id; render(); }

  /**
   * openUrl — 协议白名单：只允许 http / https
   * 防止 javascript: / data: 等协议被注入执行
   */
  function openUrl(url) {
    if (!/^https?:\/\//i.test(url)) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleSearch(q) { searchQuery = q.trim(); renderContent(); }

  function openBkModal(id) {
    editBkId = id || null;
    const bk = id ? data.bookmarks.find(b => b.id === id) : null;
    document.getElementById('bk-modal-title').textContent = id ? '编辑书签' : '添加书签';
    const sel = document.getElementById('bk-cat');
    sel.innerHTML = '<option value="">— 无分类 —</option>' +
      data.categories.map(c =>
        `<option value="${c.id}"${bk && bk.categoryId === c.id ? ' selected' : ''}>${escHtml(c.name)}</option>`
      ).join('');
    if (bk) {
      document.getElementById('bk-url').value = bk.url;
      document.getElementById('bk-title').value = bk.title;
      document.getElementById('bk-desc').value = bk.description || '';
      document.getElementById('bk-tags').value = (bk.tags || []).join(', ');
      if (!bk.categoryId) sel.value = '';
    } else {
      ['bk-url','bk-title','bk-desc','bk-tags'].forEach(id => document.getElementById(id).value = '');
      if (currentCat !== 'all') sel.value = currentCat;
    }
    document.getElementById('bk-dup-warning').style.display = 'none';
    document.getElementById('bk-modal').classList.add('open');
    setTimeout(() => document.getElementById('bk-url').focus(), 50);
  }

  function closeBkModal() { document.getElementById('bk-modal').classList.remove('open'); editBkId = null; }

  function onUrlInput(val) {
    clearTimeout(urlTimer);
    const dupWarn = document.getElementById('bk-dup-warning');
    if (val.startsWith('http') && isDuplicate(val, editBkId)) {
      const dup = findDuplicate(val, editBkId);
      dupWarn.style.display = 'flex';
      dupWarn.querySelector('.dup-text').textContent = `已存在相同书签：${dup ? dup.title : ''}`;
    } else {
      dupWarn.style.display = 'none';
    }
    urlTimer = setTimeout(() => {
      const titleEl = document.getElementById('bk-title');
      if (!titleEl.value && val.startsWith('http')) {
        try {
          const h = new URL(val).hostname.replace(/^www\./, '');
          titleEl.value = h.charAt(0).toUpperCase() + h.slice(1);
        } catch(_) {}
      }
    }, 500);
  }

  function saveBk() {
    const url = document.getElementById('bk-url').value.trim();
    const title = document.getElementById('bk-title').value.trim();
    const desc = document.getElementById('bk-desc').value.trim();
    const catId = document.getElementById('bk-cat').value;
    const tags = document.getElementById('bk-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    if (!url) { flashInput('bk-url', '请输入网址'); return; }
    if (!title) { flashInput('bk-title', '请输入名称'); return; }
    let finalUrl = url;
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

    if (isDuplicate(finalUrl, editBkId)) {
      const dup = findDuplicate(finalUrl, editBkId);
      if (!confirm(`已存在相同链接的书签「${dup ? dup.title : ''}」，仍要继续保存？`)) return;
    }

    if (editBkId) {
      const bk = data.bookmarks.find(b => b.id === editBkId);
      Object.assign(bk, { url: finalUrl, title, description: desc, categoryId: catId || null, tags });
      save(); toast('书签已更新');
    } else {
      data.bookmarks.unshift({ id: uid(), title, url: finalUrl, description: desc, categoryId: catId || null, tags, createdAt: new Date().toISOString() });
      save(); toast('书签已添加');
    }
    closeBkModal(); render();
  }

  function deleteBk(id) {
    if (!confirm('确认删除这个书签？')) return;
    save();
    data.bookmarks = data.bookmarks.filter(b => b.id !== id);
    save(false); render(); toast('已删除');
  }

  /* ---------- 分类 CRUD ---------- */
  function openCatModal(id) {
    editCatId = id || null;
    const cat = id ? data.categories.find(c => c.id === id) : null;
    document.getElementById('cat-modal-title').textContent = id ? '编辑分类' : '新建分类';
    document.getElementById('cat-name').value = cat ? cat.name : '';
    document.getElementById('cat-del-btn').style.display = id ? '' : 'none';
    selectedColor = cat ? cat.color : COLORS[0];
    renderColorOpts();
    document.getElementById('cat-modal').classList.add('open');
    setTimeout(() => document.getElementById('cat-name').focus(), 50);
  }

  function closeCatModal() { document.getElementById('cat-modal').classList.remove('open'); editCatId = null; }

  function renderColorOpts() {
    document.getElementById('color-opts').innerHTML = COLORS.map(c =>
      `<div class="color-opt${c === selectedColor ? ' selected' : ''}" style="background:${c}" onclick="App.pickColor('${c}')" title="${c}"></div>`
    ).join('');
  }

  function pickColor(c) { selectedColor = c; renderColorOpts(); }

  function saveCat() {
    const name = document.getElementById('cat-name').value.trim();
    if (!name) { flashInput('cat-name', '请输入名称'); return; }
    if (editCatId) {
      const cat = data.categories.find(c => c.id === editCatId);
      cat.name = name; cat.color = selectedColor;
      save(); toast('分类已更新');
    } else {
      data.categories.push({ id: uid(), name, color: selectedColor });
      save(); toast('分类已创建');
    }
    closeCatModal(); render();
  }

  function deleteCatConfirm() {
    if (!confirm('删除分类后，该分类下的书签将变为「未分类」，确认删除？')) return;
    data.bookmarks.forEach(b => { if (b.categoryId === editCatId) b.categoryId = null; });
    data.categories = data.categories.filter(c => c.id !== editCatId);
    if (currentCat === editCatId) currentCat = 'all';
    save(); closeCatModal(); render(); toast('分类已删除');
  }

  /* ---------- 导出 ---------- */
  function exportData() {
    const payload = {
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      ...data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nav-bookmarks-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast('已导出 JSON 文件');
  }

  /* ---------- JSON 导入 ---------- */
  function importJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.bookmarks) throw new Error('格式不正确，缺少 bookmarks 字段');
        showImportModal({
          bookmarks: parsed.bookmarks || [],
          categories: parsed.categories || [],
          source: 'json'
        });
      } catch(err) { toast('解析失败：' + err.message); }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  /* ---------- Chrome 书签 HTML 导入 ---------- */
  function importChromeHtml(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const result = parseChromeBookmarksHtml(e.target.result);
        if (!result.bookmarks.length) throw new Error('未解析到任何书签，请确认是浏览器导出的书签文件');
        showImportModal({ ...result, source: 'chrome' });
      } catch(err) { toast('解析失败：' + err.message); }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  /* ---------- 解析 Chrome 书签 HTML ---------- */
  function parseChromeBookmarksHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const categories = [];
    const bookmarks = [];
    const catMap = {};

    function getCatId(folderName) {
      if (!folderName) return null;
      if (catMap[folderName]) return catMap[folderName];
      const existing = data.categories.find(c => c.name === folderName);
      if (existing) { catMap[folderName] = existing.id; return existing.id; }
      const id = uid();
      categories.push({ id, name: folderName, color: COLORS[categories.length % COLORS.length] });
      catMap[folderName] = id;
      return id;
    }

    function walkDl(dl, folderName) {
      const items = dl.querySelectorAll(':scope > dt');
      items.forEach(dt => {
        const a = dt.querySelector(':scope > a');
        const h3 = dt.querySelector(':scope > h3');
        const subDl = dt.querySelector(':scope > dl');
        if (a && a.href && /^https?:\/\//i.test(a.href)) {
          bookmarks.push({
            id: uid(),
            title: a.textContent.trim() || hostLabel(a.href),
            url: a.href,
            description: '',
            categoryId: getCatId(folderName),
            tags: [],
            createdAt: new Date().toISOString()
          });
        }
        if (h3 && subDl) {
          const subFolder = h3.textContent.trim();
          const skipNames = ['书签栏','其他书签','移动设备书签','Bookmarks bar','Other bookmarks','Mobile bookmarks'];
          const nextFolder = skipNames.includes(subFolder) ? folderName : subFolder;
          walkDl(subDl, nextFolder);
        }
      });
    }

    const rootDl = doc.querySelector('dl');
    if (rootDl) walkDl(rootDl, null);
    return { bookmarks, categories };
  }

  /* ---------- 导入确认弹窗 ---------- */
  function showImportModal(payload) {
    importPayload = payload;
    const modal = document.getElementById('import-modal');
    const newBks = payload.bookmarks.filter(b => !isDuplicate(b.url));
    const dupBks = payload.bookmarks.length - newBks.length;
    const newCats = payload.categories.filter(c => !data.categories.find(x => x.name === c.name));
    document.getElementById('import-preview-content').innerHTML = `
      <div class="preview-row"><span>书签总数</span><strong>${payload.bookmarks.length}</strong></div>
      <div class="preview-row"><span>新书签（不重复）</span><strong>${newBks.length}</strong></div>
      <div class="preview-row"><span>重复书签</span><strong>${dupBks}</strong></div>
      <div class="preview-row"><span>新增分类</span><strong>${newCats.length}</strong></div>
      <div class="preview-row"><span>来源</span><strong>${payload.source === 'chrome' ? 'Chrome 书签 HTML' : 'JSON 文件'}</strong></div>
    `;
    selectStrategy('merge');
    modal.classList.add('open');
  }

  function selectStrategy(val) {
    document.querySelectorAll('.strategy-opt').forEach(el => {
      el.classList.toggle('selected', el.dataset.value === val);
      el.querySelector('input').checked = (el.dataset.value === val);
    });
  }

  function closeImportModal() {
    document.getElementById('import-modal').classList.remove('open');
    importPayload = null;
  }

  function confirmImport() {
    if (!importPayload) return;
    const strategy = document.querySelector('.strategy-opt.selected')?.dataset.value || 'merge';
    save();
    if (strategy === 'overwrite') {
      data.bookmarks = importPayload.bookmarks;
      const newCats = importPayload.categories.filter(c => !data.categories.find(x => x.name === c.name));
      data.categories = [...data.categories, ...newCats];
    } else {
      let added = 0;
      importPayload.bookmarks.forEach(b => {
        if (!isDuplicate(b.url)) {
          data.bookmarks.push({ ...b, id: uid() });
          added++;
        }
      });
      importPayload.categories.forEach(c => {
        if (!data.categories.find(x => x.name === c.name)) {
          data.categories.push({ ...c, id: uid() });
        }
      });
      toast(`已导入 ${added} 个书签（跳过 ${importPayload.bookmarks.length - added} 个重复）`);
    }
    save(false);
    closeImportModal();
    render();
    if (strategy === 'overwrite') toast(`已覆盖，共 ${data.bookmarks.length} 个书签`);
  }

  /* ---------- UI 工具 ---------- */
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2400);
  }

  function flashInput(id, msg) {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--color-error)';
    el.placeholder = msg;
    el.focus();
    setTimeout(() => { el.style.borderColor = ''; }, 1500);
  }

  /* ---------- 主题切换 ---------- */
  function initTheme() {
    const toggle = document.querySelector('[data-theme-toggle]');
    const root = document.documentElement;
    let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);
    updateToggleIcon(toggle, theme);
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      updateToggleIcon(toggle, theme);
    });
  }

  function updateToggleIcon(btn, theme) {
    btn.innerHTML = theme === 'dark'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.title = theme === 'dark' ? '切换到浅色' : '切换到深色';
  }

  /* ---------- 初始化 ---------- */
  function init() {
    load();
    render();
    initTheme();
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeBkModal(); closeCatModal(); closeImportModal(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); document.getElementById('search').focus(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo(); }
    });
    document.querySelectorAll('.strategy-opt').forEach(el => {
      el.addEventListener('click', () => selectStrategy(el.dataset.value));
    });
  }

  return {
    init, selectCat, openUrl, handleSearch,
    openBkModal, closeBkModal, saveBk, deleteBk, onUrlInput,
    openCatModal, closeCatModal, saveCat, deleteCatConfirm, pickColor,
    exportData, importJson, importChromeHtml,
    closeImportModal, confirmImport,
    undo
  };
})();

App.init();
