'use strict';
// ═══════════════════════════════════════════
//  RK Notes — app.js  Desktop Grid Edition
// ═══════════════════════════════════════════

const STORE   = 'rk_notes_v1';
const THEME_K = 'rk_theme';

let notes      = [];
let filterMode = 'all';   // 'all' | 'pinned' | 'trash'
let darkMode   = localStorage.getItem(THEME_K) === 'dark';
let editId     = null;
let ctxId      = null;
let sheetColor = 'none';
let sheetTags  = [];
let autoSaveT;
let curView    = 'home';  // 'home' | 'detail' | 'ai' | 'profile'

/* ─────────────────── BOOT ─────────────────── */
document.addEventListener('DOMContentLoaded', boot);

function boot() {
  load();
  applyTheme();
  updateGreeting();
  bindAll();
  renderHome();
  renderNotesList();
  updateFolderCounts();
  updateProfileStats();
  showView('home');
}

/* ─────────────────── STORAGE ─────────────────── */
function load()  { try { notes = JSON.parse(localStorage.getItem(STORE)) || []; } catch { notes = []; } }
function save()  { try { localStorage.setItem(STORE, JSON.stringify(notes)); } catch { toast('Storage full'); } }
function uid()   { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function now()   { return new Date().toISOString(); }

/* ─────────────────── THEME ─────────────────── */
function applyTheme() {
  document.body.classList.toggle('dark', darkMode);
  document.querySelectorAll('.toggle-sw').forEach(t => t.classList.toggle('on', darkMode));
}

/* ─────────────────── GREETING ─────────────────── */
function updateGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  const el = document.getElementById('homeGreeting');
  if (el) el.textContent = `${g}, RK 👋`;
}

/* ─────────────────── VIEW SWITCHING ─────────────────── */
function showView(name) {
  curView = name;

  // Content panel views
  document.querySelectorAll('.cp-view').forEach(v => v.classList.remove('active'));
  const vMap = { home: 'viewHome', detail: 'viewDetail', ai: 'viewAI', profile: 'viewProfile' };
  const vEl = document.getElementById(vMap[name] || 'viewHome');
  if (vEl) vEl.classList.add('active');

  // Rail active state
  document.querySelectorAll('.rail-btn[data-nav]').forEach(b =>
    b.classList.toggle('active', b.dataset.nav === name));

  // Navbar links
  document.querySelectorAll('.nav-link[data-nav]').forEach(l =>
    l.classList.toggle('active', l.dataset.nav === name));

  // Sidebar quick btns
  document.querySelectorAll('.sb-quick-btn[data-nav]').forEach(b =>
    b.classList.toggle('active', b.dataset.nav === name));

  // Re-render relevant views
  if (name === 'home')    renderHome();
  if (name === 'profile') updateProfileStats();
}

/* ─────────────────── HOME ─────────────────── */
function renderHome() {
  const active = notes.filter(n => !n.trashed);
  const today  = notes.filter(n => !n.trashed && isToday(n.createdAt));

  const glanceNotes = document.getElementById('glanceNotes');
  const glanceToday = document.getElementById('glanceNotesToday');
  const sbBadge     = document.getElementById('sbNoteBadge');

  if (glanceNotes) glanceNotes.textContent = active.length;
  if (glanceToday) glanceToday.textContent = today.length;
  if (sbBadge)     sbBadge.textContent     = active.length;

  const list = document.getElementById('recentNotesList');
  if (!list) return;
  list.innerHTML = '';

  const recents = active.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);
  if (!recents.length) {
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--tx3);font-size:13px">No notes yet — click New Note to create one!</div>`;
    return;
  }

  recents.forEach((n, i) => {
    if (i === 0) {
      const el = document.createElement('div');
      el.className = 'recent-note-featured';
      el.innerHTML = `
        <div class="rnf-left">
          <div class="rnf-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <div class="rnf-title">${esc(n.title || 'Untitled')}</div>
            <div class="rnf-meta">${fmtDate(n.updatedAt)}</div>
          </div>
        </div>
        <div class="rnf-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>`;
      el.addEventListener('click', () => openDetail(n.id));
      list.appendChild(el);
    } else {
      const el = document.createElement('div');
      el.className = 'recent-note-row';
      el.innerHTML = `
        <div class="rnr-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="rnr-body">
          <div class="rnr-title">${esc(n.title || 'Untitled')}</div>
          <div class="rnr-preview">${esc((n.content || '').slice(0, 80) || 'No content')}</div>
        </div>
        <div class="rnr-right">
          <span class="rnr-date">${fmtDate(n.updatedAt)}</span>
          <span class="rnr-arrow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>`;
      el.addEventListener('click', () => openDetail(n.id));
      list.appendChild(el);
    }
  });
}

/* ─────────────────── NOTES LIST ─────────────────── */
function renderNotesList() {
  const list  = document.getElementById('allNotesList');
  const empty = document.getElementById('emptyNotes');
  const eh    = document.getElementById('emptyNotesH');
  const ep    = document.getElementById('emptyNotesP');
  if (!list) return;

  let items = [...notes];
  if      (filterMode === 'pinned') items = items.filter(n => !n.trashed && n.pinned);
  else if (filterMode === 'trash')  items = items.filter(n => n.trashed);
  else                              items = items.filter(n => !n.trashed);

  items.sort((a,b) => {
    if (filterMode !== 'trash') {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return  1;
    }
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  list.innerHTML = '';
  if (!items.length) {
    list.style.display = 'none';
    empty.style.display = 'flex';
    if (eh) eh.textContent = filterMode === 'trash' ? 'Trash is empty' : filterMode === 'pinned' ? 'No pinned notes' : 'No notes yet';
    if (ep) ep.textContent = filterMode === 'trash' ? 'Deleted notes appear here.' : filterMode === 'pinned' ? 'Pin notes to see them here.' : 'Click New Note to get started';
    return;
  }
  list.style.display = 'flex';
  empty.style.display = 'none';

  items.forEach(n => list.appendChild(buildListItem(n)));

  // Update folder counts
  updateFolderCounts();
}

function buildListItem(n) {
  const el = document.createElement('div');
  el.className = 'note-list-item' + (n.pinned ? ' pinned' : '');
  el.dataset.id = n.id;
  if (n.color && n.color !== 'none') el.dataset.color = n.color;

  // Mark selected
  if (n.id === editId) el.classList.add('selected');

  const tagsHtml = (n.tags || []).map(t => `<span class="nli-tag">#${esc(t)}</span>`).join('');

  if (n.trashed) {
    el.innerHTML = `
      <div class="nli-top">
        <div class="nli-title ${!n.title ? 'untitled' : ''}">${esc(n.title || 'Untitled')}</div>
      </div>
      <div class="nli-preview">${esc((n.content||'').slice(0,80) || 'No content')}</div>
      <div class="nli-restore-row">
        <button class="nli-restore-btn" data-act="restore" data-id="${n.id}">↩ Restore</button>
        <button class="nli-restore-btn perma" data-act="perma" data-id="${n.id}">Delete forever</button>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="nli-top">
        <div class="nli-title ${!n.title?'untitled':''}">${esc(n.title||'Untitled')}</div>
        ${n.pinned ? '<span class="nli-pin">📌</span>' : ''}
      </div>
      <div class="nli-preview">${esc((n.content||'').slice(0,90)||'No content')}</div>
      <div class="nli-bottom">
        <div class="nli-tags">${tagsHtml}</div>
        <span class="nli-date">${fmtDate(n.updatedAt)}</span>
      </div>`;
    el.addEventListener('click', e => { if (!e.target.closest('[data-act]')) openDetail(n.id); });
    el.addEventListener('contextmenu', e => { e.preventDefault(); showCtx(e.clientX, e.clientY, n); });
  }

  el.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.dataset.act === 'restore') doRestore(btn.dataset.id);
      if (btn.dataset.act === 'perma')   doPerma(btn.dataset.id);
    });
  });

  return el;
}

/* ─────────────────── FOLDER COUNTS ─────────────────── */
function updateFolderCounts() {
  const all    = notes.filter(n => !n.trashed).length;
  const pinned = notes.filter(n => !n.trashed && n.pinned).length;
  const trash  = notes.filter(n =>  n.trashed).length;

  const setCount = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setCount('folderCountAll',    all);
  setCount('folderCountPinned', pinned);
  setCount('folderCountTrash',  trash);

  const sbBadge = document.getElementById('sbNoteBadge');
  if (sbBadge) sbBadge.textContent = all;
}

/* ─────────────────── DETAIL PANEL ─────────────────── */
function openDetail(id) {
  editId = id;
  const n = notes.find(x => x.id === id);
  if (!n) return;

  const titleEl   = document.getElementById('detailTitle');
  const contentEl = document.getElementById('detailContent');
  const dateEl    = document.getElementById('detailDate');
  const tagRowEl  = document.getElementById('detailTagRow');
  const wcEl      = document.getElementById('detailWordCount');

  if (titleEl)   titleEl.value   = n.title   || '';
  if (contentEl) contentEl.value = n.content || '';
  if (dateEl)    dateEl.textContent = fmtDate(n.updatedAt);
  if (tagRowEl)  tagRowEl.innerHTML = (n.tags||[]).map(t => `<span class="detail-tag">#${esc(t)}</span>`).join('');
  if (wcEl)      wcEl.textContent   = wordCount(n.content);

  // Mark selected in list
  document.querySelectorAll('.note-list-item').forEach(el =>
    el.classList.toggle('selected', el.dataset.id === id));

  showView('detail');
}

function closeDetail() {
  editId = null;
  document.querySelectorAll('.note-list-item').forEach(el => el.classList.remove('selected'));
  showView('home');
}

function saveDetail() {
  if (!editId) return;
  const title   = (document.getElementById('detailTitle')?.value   || '').trim();
  const content = (document.getElementById('detailContent')?.value || '').trim();
  const idx = notes.findIndex(x => x.id === editId);
  if (idx === -1) return;
  notes[idx] = { ...notes[idx], title, content, updatedAt: now() };
  save();
  renderHome();
  renderNotesList();
  const dateEl = document.getElementById('detailDate');
  if (dateEl) dateEl.textContent = fmtDate(now());
  const wcEl = document.getElementById('detailWordCount');
  if (wcEl) wcEl.textContent = wordCount(content);
  toast('✓ Note saved');
}

function wordCount(text) {
  const w = (text || '').trim();
  const c = w ? w.split(/\s+/).length : 0;
  return `${c} word${c !== 1 ? 's' : ''}`;
}

/* ─────────────────── NEW NOTE SHEET ─────────────────── */
function openSheet() {
  sheetColor = 'none'; sheetTags = [];
  const fields = ['sheetNoteTitle','sheetNoteBody','sheetTagInp'];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const wcEl = document.getElementById('sheetWC');
  if (wcEl) wcEl.textContent = '0 words';
  document.querySelectorAll('.sh-color').forEach(b => b.classList.toggle('active', b.dataset.c === 'none'));
  renderSheetChips();
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('newNoteSheet').classList.add('open');
  setTimeout(() => document.getElementById('sheetNoteTitle')?.focus(), 320);
}

function closeSheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('newNoteSheet').classList.remove('open');
}

function saveSheet() {
  const title   = (document.getElementById('sheetNoteTitle')?.value || '').trim();
  const content = (document.getElementById('sheetNoteBody')?.value  || '').trim();
  if (!title && !content) { toast('Note is empty'); return; }
  const ts = now();
  notes.unshift({ id: uid(), title, content, tags: [...sheetTags], color: sheetColor, pinned: false, trashed: false, createdAt: ts, updatedAt: ts });
  save();
  closeSheet();
  renderHome();
  renderNotesList();
  updateProfileStats();
  updateFolderCounts();
  toast('✓ Note created');
}

function renderSheetChips() {
  const wrap = document.getElementById('sheetChips');
  if (!wrap) return;
  wrap.innerHTML = sheetTags.map(t => `
    <span class="s-chip">#${esc(t)}<button class="s-chip-rm" data-t="${esc(t)}">×</button></span>
  `).join('');
  wrap.querySelectorAll('.s-chip-rm').forEach(b => {
    b.addEventListener('click', () => { sheetTags = sheetTags.filter(x => x !== b.dataset.t); renderSheetChips(); });
  });
}

/* ─────────────────── ACTIONS ─────────────────── */
function doPin(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  n.pinned = !n.pinned; n.updatedAt = now();
  save(); renderHome(); renderNotesList();
  toast(n.pinned ? '📌 Pinned' : 'Unpinned');
}

function doTrash(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  n.trashed = true; n.updatedAt = now();
  if (editId === id) closeDetail();
  save(); renderHome(); renderNotesList(); updateFolderCounts();
  toast('🗑️ Moved to trash');
}

function doRestore(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  n.trashed = false; n.updatedAt = now();
  save(); renderNotesList(); renderHome(); updateFolderCounts();
  toast('✓ Restored');
}

function doPerma(id) {
  notes = notes.filter(x => x.id !== id);
  save(); renderNotesList(); updateFolderCounts();
  toast('Deleted permanently');
}

/* ─────────────────── CONTEXT MENU ─────────────────── */
function showCtx(x, y, note) {
  ctxId = note.id;
  const menu = document.getElementById('ctxMenu');
  const ptEl = document.getElementById('ctxPinTxt');
  if (ptEl) ptEl.textContent = note.pinned ? 'Unpin note' : 'Pin note';
  menu.style.display = 'block';
  const mw = 200, mh = 160;
  menu.style.left = Math.min(x, window.innerWidth  - mw - 10) + 'px';
  menu.style.top  = (y + mh > window.innerHeight ? y - mh : y) + 'px';
}
function hideCtx() { document.getElementById('ctxMenu').style.display = 'none'; ctxId = null; }

function doDuplicate(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  const ts = now();
  const dup = { ...n, id: uid(), title: (n.title || 'Untitled') + ' Copy', createdAt: ts, updatedAt: ts, pinned: false };
  notes.unshift(dup);
  save(); renderHome(); renderNotesList(); updateFolderCounts(); updateProfileStats();
  toast('📋 Note duplicated');
}

function doExport(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  const title = n.title || 'Untitled';
  const content = n.content || '';
  const text = `Title: ${title}\nUpdated: ${fmtDate(n.updatedAt)}\n\n${content}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('⬇️ Exported successfully');
}

/* ─────────────────── SEARCH ─────────────────── */
function openSearch() {
  document.getElementById('searchOverlay').classList.add('open');
  setTimeout(() => document.getElementById('searchOvInput')?.focus(), 100);
}

function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
  const inp = document.getElementById('searchOvInput');
  if (inp) inp.value = '';
  const res = document.getElementById('searchResults');
  if (res) res.innerHTML = '';
  const emp = document.getElementById('searchEmpty');
  if (emp) emp.style.display = 'flex';
}

function doSearch(q) {
  const res   = document.getElementById('searchResults');
  const empty = document.getElementById('searchEmpty');
  if (!res || !empty) return;
  if (!q.trim()) { res.innerHTML = ''; empty.style.display = 'flex'; empty.querySelector('p').textContent = 'Start typing to search your notes'; return; }
  const ql    = q.toLowerCase();
  const found = notes.filter(n => !n.trashed && (
    (n.title||'').toLowerCase().includes(ql) ||
    (n.content||'').toLowerCase().includes(ql) ||
    (n.tags||[]).some(t => t.toLowerCase().includes(ql))
  ));
  res.innerHTML = '';
  if (!found.length) { empty.style.display = 'flex'; empty.querySelector('p').textContent = `No results for "${q}"`; return; }
  empty.style.display = 'none';
  found.forEach(n => {
    const el = document.createElement('div');
    el.className = 'recent-note-row';
    el.style.cssText = 'cursor:pointer; border-radius:0; border-left:none; border-right:none;';
    el.innerHTML = `
      <div class="rnr-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="rnr-body">
        <div class="rnr-title">${esc(n.title||'Untitled')}</div>
        <div class="rnr-preview">${esc((n.content||'').slice(0,60)||'')}</div>
      </div>
      <div class="rnr-right">
        <span class="rnr-date">${fmtDate(n.updatedAt)}</span>
      </div>`;
    el.addEventListener('click', () => { closeSearch(); openDetail(n.id); });
    res.appendChild(el);
  });
}

/* ─────────────────── PROFILE STATS ─────────────────── */
function updateProfileStats() {
  const cnt = notes.filter(n => !n.trashed).length;
  const el  = document.getElementById('pStatNotes');
  if (el) el.textContent = cnt;
}

/* ─────────────────── UTILS ─────────────────── */
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '';
  const d  = new Date(iso);
  const m  = Math.floor((Date.now() - d) / 60000);
  const h  = Math.floor(m / 60);
  const dy = Math.floor(h / 24);
  if (m  <  1) return 'Just now';
  if (m  < 60) return `${m}m ago`;
  if (h  < 24) return `${h}h ago`;
  if (dy <  7) return `${dy}d ago`;
  return d.toLocaleDateString(undefined, {month:'short', day:'numeric'});
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso), n = new Date();
  return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toastBar');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ─────────────────── BIND ALL ─────────────────── */
function bindAll() {

  // ── Navigation: rail buttons
  document.querySelectorAll('.rail-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.nav));
  });

  // ── Navigation: navbar links
  document.querySelectorAll('.nav-link[data-nav]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showView(a.dataset.nav); });
  });

  // ── Navigation: sidebar quick buttons (with data-nav)
  document.querySelectorAll('.sb-quick-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.nav));
  });

  // ── Sidebar folders
  document.querySelectorAll('.sb-folder-row[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      filterMode = btn.dataset.filter;
      document.querySelectorAll('.sb-folder-row').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === filterMode));
      document.querySelectorAll('.filter-chip').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === filterMode));
      renderNotesList();
      showView('home');
    });
  });

  // ── New note buttons
  document.getElementById('newNoteBtn')?.addEventListener('click',     openSheet);
  document.getElementById('homeNewNoteBtn')?.addEventListener('click', openSheet);
  document.getElementById('sbNewNoteBtn')?.addEventListener('click',   openSheet);

  // ── Media capture buttons
  document.getElementById('recordAudioBtn')?.addEventListener('click', openAudioSheet);
  document.getElementById('sbRecordBtn')?.addEventListener('click',    openAudioSheet);

  document.getElementById('uploadAudioBtn')?.addEventListener('click', () =>
    document.getElementById('audioFileInput')?.click());
  document.getElementById('sbUploadBtn')?.addEventListener('click', () =>
    document.getElementById('audioFileInput')?.click());

  document.getElementById('youtubeNoteBtn')?.addEventListener('click', () => openLinkSheet('youtube'));
  document.getElementById('sbYoutubeBtn')?.addEventListener('click',   () => openLinkSheet('youtube'));

  document.getElementById('meetingNoteBtn')?.addEventListener('click', () => openLinkSheet('meeting'));
  document.getElementById('sbMeetingBtn')?.addEventListener('click',   () => openLinkSheet('meeting'));

  // ── Audio file upload
  document.getElementById('audioFileInput')?.addEventListener('change', e => {
    if (e.target.files.length) {
      const name = e.target.files[0].name;
      const ts = now();
      notes.unshift({ id: uid(), title: 'Uploaded Audio', content: 'Audio file: ' + name, color: 'ocean', pinned: false, trashed: false, createdAt: ts, updatedAt: ts });
      save(); renderHome(); renderNotesList(); updateProfileStats(); updateFolderCounts();
      toast('✓ Audio uploaded and saved');
    }
    e.target.value = '';
  });

  // ── Audio record sheet
  document.getElementById('audioCloseBtn')?.addEventListener('click', closeAudioSheet);
  document.getElementById('audioToggleBtn')?.addEventListener('click', toggleAudioRecord);

  // ── Link sheet
  document.getElementById('linkCloseBtn')?.addEventListener('click', closeLinkSheet);
  document.getElementById('linkSubmitBtn')?.addEventListener('click', submitLinkSheet);

  // ── Note sheet
  document.getElementById('sheetCloseBtn')?.addEventListener('click', closeSheet);
  document.getElementById('sheetOverlay')?.addEventListener('click', closeSheet);
  document.getElementById('sheetSaveBtn')?.addEventListener('click', saveSheet);

  // ── Sheet color pickers
  document.querySelectorAll('.sh-color').forEach(btn => {
    btn.addEventListener('click', () => {
      sheetColor = btn.dataset.c;
      document.querySelectorAll('.sh-color').forEach(b =>
        b.classList.toggle('active', b.dataset.c === sheetColor));
    });
  });

  // ── Sheet tag input
  const sti = document.getElementById('sheetTagInp');
  if (sti) {
    sti.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ',') && sti.value.trim()) {
        e.preventDefault();
        const tag = sti.value.trim().toLowerCase().replace(/[^a-z0-9\-_]/g,'');
        if (tag && !sheetTags.includes(tag) && sheetTags.length < 10) { sheetTags.push(tag); renderSheetChips(); }
        sti.value = '';
      }
      if (e.key === 'Backspace' && !sti.value && sheetTags.length) { sheetTags.pop(); renderSheetChips(); }
    });
  }

  // ── Sheet word count
  document.getElementById('sheetNoteBody')?.addEventListener('input', () => {
    const w = document.getElementById('sheetNoteBody').value.trim();
    const c = w ? w.split(/\s+/).length : 0;
    const wc = document.getElementById('sheetWC');
    if (wc) wc.textContent = `${c} word${c!==1?'s':''}`;
  });

  // ── Detail panel
  document.getElementById('detailBackBtn')?.addEventListener('click', closeDetail);
  document.getElementById('detailSaveBtn')?.addEventListener('click', saveDetail);
  document.getElementById('dtbAddBtn')?.addEventListener('click', () => { closeDetail(); openSheet(); });
  document.getElementById('detailMoreBtn')?.addEventListener('click', () => {
    if (editId) { const n = notes.find(x=>x.id===editId); if (n) showCtx(window.innerWidth - 40, 120, n); }
  });

  // ── Detail word count on input
  document.getElementById('detailContent')?.addEventListener('input', () => {
    const val = document.getElementById('detailContent').value;
    const wcEl = document.getElementById('detailWordCount');
    if (wcEl) wcEl.textContent = wordCount(val);
  });

  // ── Auto-save detail
  ['detailTitle','detailContent'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      clearTimeout(autoSaveT);
      autoSaveT = setTimeout(() => { if (editId) saveDetail(); }, 2000);
    });
  });

  // ── Filter chips in notes panel
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      filterMode = btn.dataset.filter;
      document.querySelectorAll('.filter-chip').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === filterMode));
      document.querySelectorAll('.sb-folder-row').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === filterMode));
      renderNotesList();
    });
  });

  // ── Navbar search
  const navSearch = document.getElementById('navSearchInput');
  if (navSearch) {
    navSearch.addEventListener('focus', openSearch);
    navSearch.addEventListener('input', e => doSearch(e.target.value));
  }

  // ── Search overlay
  document.getElementById('searchOpenBtn')?.addEventListener('click', openSearch);
  document.getElementById('searchCloseBtn')?.addEventListener('click', closeSearch);
  document.getElementById('searchOvInput')?.addEventListener('input', e => doSearch(e.target.value));

  // ── See all notes
  document.getElementById('seeAllBtn')?.addEventListener('click', () => showView('notes'));

  // ── AI
  document.querySelectorAll('.ai-sugg').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = document.getElementById('aiField');
      if (field) field.value = btn.dataset.q;
      toast('💡 AI feature coming soon!');
    });
  });
  document.getElementById('aiSendBtn')?.addEventListener('click', () => toast('💡 AI feature coming soon!'));
  document.getElementById('aiBackBtn')?.addEventListener('click', () => showView('home'));

  // ── Theme toggles (all instances in the DOM)
  ['themeToggle','themeToggle2','themeToggleNav'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      darkMode = !darkMode;
      localStorage.setItem(THEME_K, darkMode ? 'dark' : 'light');
      applyTheme();
    });
  });

  // ── Clear trash
  document.getElementById('clearTrashBtn')?.addEventListener('click', () => {
    notes = notes.filter(n => !n.trashed);
    save(); renderNotesList(); updateProfileStats(); updateFolderCounts();
    toast('✓ Trash cleared');
  });

  // ── View toggle (list / grid — visual only for now)
  document.getElementById('viewListBtn')?.addEventListener('click', () => {
    document.getElementById('viewListBtn')?.classList.add('active');
    document.getElementById('viewGridBtn')?.classList.remove('active');
    document.getElementById('allNotesList').style.gridTemplateColumns = '';
  });
  document.getElementById('viewGridBtn')?.addEventListener('click', () => {
    document.getElementById('viewGridBtn')?.classList.add('active');
    document.getElementById('viewListBtn')?.classList.remove('active');
    document.getElementById('allNotesList').style.gridTemplateColumns = '1fr 1fr';
  });

  // ── Context menu
  document.getElementById('ctxEdit')?.addEventListener('click',  () => { hideCtx(); if (ctxId) openDetail(ctxId); });
  document.getElementById('ctxPin')?.addEventListener('click',   () => { const id = ctxId; hideCtx(); doPin(id); });
  document.getElementById('ctxDuplicate')?.addEventListener('click', () => { const id = ctxId; hideCtx(); doDuplicate(id); });
  document.getElementById('ctxExport')?.addEventListener('click', () => { const id = ctxId; hideCtx(); doExport(id); });
  document.getElementById('ctxTrash')?.addEventListener('click', () => { const id = ctxId; hideCtx(); doTrash(id); });
  document.addEventListener('click', e => {
    const m = document.getElementById('ctxMenu');
    if (m && !m.contains(e.target)) hideCtx();
  });

  // ── Share note (Copy to clipboard)
  document.getElementById('detailShareBtn')?.addEventListener('click', () => {
    if (!editId) return;
    const n = notes.find(x => x.id === editId);
    if (!n) return;
    const title = n.title || 'Untitled';
    const text = `${title}\n\n${n.content || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      toast('📋 Copied note to clipboard');
    }).catch(() => {
      toast('Failed to copy note');
    });
  });

  // ── Collapse sidebar panel
  document.getElementById('sbCollapseBtn')?.addEventListener('click', () => {
    document.getElementById('sidebarPanel')?.classList.toggle('collapsed');
    const isCollapsed = document.getElementById('sidebarPanel')?.classList.contains('collapsed');
    document.querySelector('.app-grid').style.gridTemplateColumns = isCollapsed ? 'var(--rail-w) 0px var(--notes-w) 1fr' : 'var(--rail-w) var(--sidebar-w) var(--notes-w) 1fr';
  });

  // ── Top navbar hamburger toggle
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('iconRail')?.classList.toggle('collapsed');
    const isRailCollapsed = document.getElementById('iconRail')?.classList.contains('collapsed');
    const railWidth = isRailCollapsed ? '0px' : 'var(--rail-w)';
    const isSidebarCollapsed = document.getElementById('sidebarPanel')?.classList.contains('collapsed');
    const sidebarWidth = isSidebarCollapsed ? '0px' : 'var(--sidebar-w)';
    document.querySelector('.app-grid').style.gridTemplateColumns = `${railWidth} ${sidebarWidth} var(--notes-w) 1fr`;
  });

  // ── Dynamic Custom labels creation
  const addLabelBtn = document.querySelector('.sb-add-label');
  const labelInputWrap = document.getElementById('labelInputWrap');
  const labelNameInput = document.getElementById('labelNameInput');

  addLabelBtn?.addEventListener('click', () => {
    if (labelInputWrap) {
      labelInputWrap.style.display = 'block';
      labelNameInput?.focus();
    }
  });

  labelNameInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = labelNameInput.value.trim();
      if (val) {
        // Create new dynamic folder row
        const folderContainer = document.getElementById('sbFolders');
        const colors = ['#7C6FF7', '#FF6B81', '#00C896', '#FFC107', '#4A90D9'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Add to labels list
        const labelsList = document.querySelector('.sb-labels');
        const newRow = document.createElement('div');
        newRow.className = 'sb-label-row';
        newRow.innerHTML = `<span class="sb-label-dot" style="background:${randomColor}"></span><span>${esc(val)}</span>`;
        labelsList.insertBefore(newRow, labelInputWrap);

        // Also add dynamic folder tab
        if (folderContainer) {
          const newFolderBtn = document.createElement('button');
          newFolderBtn.className = 'sb-folder-row';
          newFolderBtn.dataset.filter = 'tag-' + val.toLowerCase();
          newFolderBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span class="sf-name">${esc(val)}</span>
            <span class="sf-count">0</span>
          `;
          
          // Wire up event to folder counts & render
          newFolderBtn.addEventListener('click', () => {
            filterMode = 'tag-' + val.toLowerCase();
            document.querySelectorAll('.sb-folder-row').forEach(b => b.classList.remove('active'));
            newFolderBtn.classList.add('active');
            
            // Filter implementation for dynamic tag folder
            renderDynamicFolder(val.toLowerCase());
          });

          folderContainer.appendChild(newFolderBtn);
        }

        toast(`✓ Created label: ${val}`);
        labelNameInput.value = '';
        if (labelInputWrap) labelInputWrap.style.display = 'none';
      }
    } else if (e.key === 'Escape') {
      labelNameInput.value = '';
      if (labelInputWrap) labelInputWrap.style.display = 'none';
    }
  });

  // Function to render dynamic filtered folders
  function renderDynamicFolder(tag) {
    const list  = document.getElementById('allNotesList');
    const empty = document.getElementById('emptyNotes');
    if (!list) return;
    
    let items = notes.filter(n => !n.trashed && (n.tags || []).includes(tag));
    list.innerHTML = '';
    
    if (!items.length) {
      list.style.display = 'none';
      if (empty) {
        empty.style.display = 'flex';
        document.getElementById('emptyNotesH').textContent = `No notes in #${tag}`;
        document.getElementById('emptyNotesP').textContent = 'Add this tag to your notes to view them here';
      }
      return;
    }
    list.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    items.forEach(n => list.appendChild(buildListItem(n)));
  }

  // ── Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('searchOverlay')?.classList.contains('open')) { closeSearch(); return; }
      if (document.getElementById('newNoteSheet')?.classList.contains('open'))  { closeSheet(); return; }
      if (document.getElementById('audioRecordSheet')?.classList.contains('open')) { closeAudioSheet(); return; }
      if (document.getElementById('linkSheet')?.classList.contains('open'))     { closeLinkSheet(); return; }
      if (curView === 'detail') { closeDetail(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openSheet(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (curView === 'detail') saveDetail();
      else if (document.getElementById('newNoteSheet')?.classList.contains('open')) saveSheet();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); openSearch(); }
  });
}

/* ─────────────────── AUDIO RECORDING ─────────────────── */
let recInterval = null;
let recTime = 0;
let isRecording = false;

function openAudioSheet() {
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('audioRecordSheet').classList.add('open');
  isRecording = false; recTime = 0;
  const timer  = document.getElementById('audioTimer');
  const btn    = document.getElementById('audioToggleBtn');
  const hint   = document.getElementById('audioHint');
  if (timer) timer.textContent = '00:00';
  if (btn)   btn.classList.remove('recording');
  if (hint)  hint.textContent = 'Tap to start recording';
}

function closeAudioSheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('audioRecordSheet').classList.remove('open');
  clearInterval(recInterval);
  isRecording = false;
}

function toggleAudioRecord() {
  const btn  = document.getElementById('audioToggleBtn');
  const hint = document.getElementById('audioHint');
  if (!isRecording) {
    isRecording = true;
    btn?.classList.add('recording');
    if (hint) hint.textContent = 'Tap to stop & save';
    recTime = 0;
    recInterval = setInterval(() => {
      recTime++;
      const m = String(Math.floor(recTime/60)).padStart(2,'0');
      const s = String(recTime%60).padStart(2,'0');
      const timerEl = document.getElementById('audioTimer');
      if (timerEl) timerEl.textContent = m+':'+s;
    }, 1000);
  } else {
    clearInterval(recInterval);
    const ts  = now();
    const dur = document.getElementById('audioTimer')?.textContent || '00:00';
    notes.unshift({ id:uid(), title:'Voice Note', content:'Audio recording duration: '+dur, color:'gold', pinned:false, trashed:false, createdAt:ts, updatedAt:ts });
    save(); renderHome(); renderNotesList(); updateProfileStats(); updateFolderCounts();
    closeAudioSheet();
    toast('✓ Voice note saved');
  }
}

/* ─────────────────── LINK SHEET ─────────────────── */
let linkSheetType = '';

function openLinkSheet(type) {
  linkSheetType = type;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('linkSheet').classList.add('open');
  const inp   = document.getElementById('linkInput');
  const title = document.getElementById('linkSheetTitle');
  const icon  = document.getElementById('linkSheetIcon');
  if (inp)   inp.value = '';
  if (title) title.textContent = type === 'youtube' ? 'YouTube Note' : 'Meeting Link';
  if (icon) {
    if (type === 'youtube') {
      icon.innerHTML = '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>';
    } else {
      icon.innerHTML = '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>';
    }
  }
  setTimeout(() => inp?.focus(), 320);
}

function closeLinkSheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('linkSheet').classList.remove('open');
}

function submitLinkSheet() {
  const url = document.getElementById('linkInput')?.value.trim() || '';
  if (!url) { toast('Please enter a valid URL'); return; }
  const ts = now();
  const t  = linkSheetType === 'youtube' ? 'YouTube Summary' : 'Meeting Transcription';
  const c  = linkSheetType === 'youtube' ? 'coral' : 'mint';
  notes.unshift({ id:uid(), title:t, content:'Link: '+url+'\n\n(AI summary coming soon…)', color:c, pinned:false, trashed:false, createdAt:ts, updatedAt:ts });
  save(); closeLinkSheet(); renderHome(); renderNotesList(); updateProfileStats(); updateFolderCounts();
  toast('✓ ' + t + ' created');
}
