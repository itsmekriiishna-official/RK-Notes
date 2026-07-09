'use strict';
// ═══════════════════════════════════════════
//  RK Notes — app.js  (Reference UI Match)
// ═══════════════════════════════════════════

const STORE    = 'rk_notes_v1';
const THEME_K  = 'rk_theme';

let notes      = [];
let curScreen  = 'home';
let filterMode = 'all';   // 'all' | 'pinned' | 'trash'
let darkMode   = localStorage.getItem(THEME_K) === 'dark';
let editId     = null;
let ctxId      = null;
let sheetColor = 'none';
let sheetTags  = [];
let autoSaveT;
let toastT;

/* ─────────────────── BOOT ─────────────────── */
document.addEventListener('DOMContentLoaded', boot);

function boot() {
  load();
  applyTheme();
  updateClock();
  setInterval(updateClock, 15000);
  bindAll();
  renderHome();
  renderNotesList();
  updateProfileStats();
}

/* ─────────────────── STORAGE ─────────────────── */
function load()  { try { notes = JSON.parse(localStorage.getItem(STORE)) || []; } catch { notes = []; } }
function save()  { try { localStorage.setItem(STORE, JSON.stringify(notes)); } catch { toast('Storage full'); } }
function uid()   { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function now()   { return new Date().toISOString(); }

/* ─────────────────── THEME ─────────────────── */
function applyTheme() {
  document.body.classList.toggle('dark', darkMode);
  const t = document.getElementById('themeToggle');
  if (t) t.classList.toggle('on', darkMode);
}

/* ─────────────────── CLOCK ─────────────────── */
function updateClock() {
  const d = new Date();
  document.getElementById('statusTime').textContent =
    d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
}

/* ─────────────────── SCREEN ROUTING ─────────────────── */
function goScreen(name) {
  curScreen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const sc = document.getElementById('screen' + cap(name));
  if (sc) sc.classList.add('active');

  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === name));

  if (name === 'home')    renderHome();
  if (name === 'notes')   renderNotesList();
  if (name === 'profile') updateProfileStats();
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ─────────────────── HOME ─────────────────── */
function renderHome() {
  const active = notes.filter(n => !n.trashed);
  const today  = notes.filter(n => !n.trashed && isToday(n.createdAt));

  document.getElementById('glanceNotes').textContent     = active.length;
  document.getElementById('glanceNotesToday').textContent = today.length;

  const list = document.getElementById('recentNotesList');
  list.innerHTML = '';

  const recents = active.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0,5);
  if (!recents.length) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--tx3);font-size:13.5px">No notes yet — tap + to create one!</div>`;
    return;
  }

  recents.forEach((n, i) => {
    if (i === 0) {
      // Featured purple card
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
      // List row
      const el = document.createElement('div');
      el.className = 'recent-note-row';
      el.innerHTML = `
        <div class="rnr-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="rnr-body">
          <div class="rnr-title">${esc(n.title || 'Untitled')}</div>
          <div class="rnr-preview">${esc((n.content || '').slice(0, 60) || 'No content')}</div>
        </div>
        <div class="rnr-right">
          <span class="rnr-date">${fmtDate(n.updatedAt)}</span>
          <span class="rnr-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </div>`;
      el.addEventListener('click', () => openDetail(n.id));
      list.appendChild(el);
    }
  });
}

/* ─────────────────── NOTES LIST ─────────────────── */
function renderNotesList() {
  const list   = document.getElementById('allNotesList');
  const empty  = document.getElementById('emptyNotes');
  const eh     = document.getElementById('emptyNotesH');
  const ep     = document.getElementById('emptyNotesP');

  let items = [...notes];
  if (filterMode === 'pinned') items = items.filter(n => !n.trashed && n.pinned);
  else if (filterMode === 'trash') items = items.filter(n => n.trashed);
  else items = items.filter(n => !n.trashed);

  items.sort((a,b) => {
    if (!filterMode.startsWith('trash')) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return  1;
    }
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  list.innerHTML = '';
  if (!items.length) {
    list.style.display = 'none';
    empty.style.display = 'flex';
    eh.textContent = filterMode === 'trash' ? 'Trash is empty' : filterMode === 'pinned' ? 'No pinned notes' : 'No notes yet';
    ep.textContent = filterMode === 'trash' ? 'Deleted notes appear here.' : filterMode === 'pinned' ? 'Pin important notes to see them here.' : 'Tap + to create your first note';
    return;
  }
  list.style.display = 'flex';
  empty.style.display = 'none';

  items.forEach(n => list.appendChild(buildListItem(n)));
}

function buildListItem(n) {
  const el = document.createElement('div');
  el.className = 'note-list-item' + (n.pinned ? ' pinned' : '');
  el.dataset.id = n.id;
  if (n.color && n.color !== 'none') el.dataset.color = n.color;

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
    addLongPress(el, n);
  }

  el.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const {act, id} = btn.dataset;
      if (act === 'restore') doRestore(id);
      if (act === 'perma')   doPerma(id);
    });
  });

  return el;
}

/* ─────────────────── DETAIL PANEL ─────────────────── */
function openDetail(id) {
  editId = id;
  const n = notes.find(x => x.id === id);
  if (!n) return;

  document.getElementById('detailTitle').value   = n.title   || '';
  document.getElementById('detailContent').value = n.content || '';
  document.getElementById('detailDate').textContent = fmtDate(n.updatedAt);

  const tagRow = document.getElementById('detailTagRow');
  tagRow.innerHTML = (n.tags||[]).map(t => `<span class="detail-tag">#${esc(t)}</span>`).join('');

  document.getElementById('detailPanel').classList.add('open');
  document.getElementById('detailContent').focus();
}

function closeDetail() {
  document.getElementById('detailPanel').classList.remove('open');
  editId = null;
}

function saveDetail() {
  if (!editId) return;
  const title   = document.getElementById('detailTitle').value.trim();
  const content = document.getElementById('detailContent').value.trim();
  const idx = notes.findIndex(x => x.id === editId);
  if (idx === -1) return;
  notes[idx] = { ...notes[idx], title, content, updatedAt: now() };
  save(); renderHome(); renderNotesList();
  toast('✓ Note saved');
  document.getElementById('detailDate').textContent = fmtDate(now());
}

/* ─────────────────── NEW NOTE SHEET ─────────────────── */
function openSheet() {
  sheetColor = 'none'; sheetTags = [];
  document.getElementById('sheetNoteTitle').value = '';
  document.getElementById('sheetNoteBody').value  = '';
  document.getElementById('sheetTagInp').value    = '';
  document.getElementById('sheetWC').textContent  = '0 words';
  document.querySelectorAll('.sh-color').forEach(b => b.classList.toggle('active', b.dataset.c === 'none'));
  renderSheetChips();
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('newNoteSheet').classList.add('open');
  setTimeout(() => document.getElementById('sheetNoteTitle').focus(), 320);
}

function closeSheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('newNoteSheet').classList.remove('open');
}

function saveSheet() {
  const title   = document.getElementById('sheetNoteTitle').value.trim();
  const content = document.getElementById('sheetNoteBody').value.trim();
  if (!title && !content) { toast('Note is empty'); return; }
  const ts = now();
  notes.unshift({ id: uid(), title, content, tags: [...sheetTags], color: sheetColor, pinned: false, trashed: false, createdAt: ts, updatedAt: ts });
  save(); closeSheet(); renderHome(); renderNotesList(); updateProfileStats();
  toast('✓ Note created');
}

function renderSheetChips() {
  const wrap = document.getElementById('sheetChips');
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
  save(); closeDetail(); renderHome(); renderNotesList();
  toast('🗑️ Moved to trash');
}

function doRestore(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  n.trashed = false; n.updatedAt = now();
  save(); renderNotesList(); renderHome();
  toast('✓ Restored');
}

function doPerma(id) {
  notes = notes.filter(x => x.id !== id);
  save(); renderNotesList();
  toast('Deleted permanently');
}

/* ─────────────────── CONTEXT MENU ─────────────────── */
function showCtx(x, y, note) {
  ctxId = note.id;
  const menu = document.getElementById('ctxMenu');
  document.getElementById('ctxPinTxt').textContent = note.pinned ? 'Unpin note' : 'Pin note';
  menu.style.display = 'block';
  const mw = 200, mh = 130;
  let left = Math.min(x, window.innerWidth - mw - 10);
  let top  = y + mh > window.innerHeight ? y - mh : y;
  menu.style.left = left + 'px';
  menu.style.top  = top  + 'px';
}

function hideCtx() { document.getElementById('ctxMenu').style.display = 'none'; ctxId = null; }

function addLongPress(el, note) {
  let t;
  el.addEventListener('touchstart', () => { t = setTimeout(() => showCtx(window.innerWidth/2, window.innerHeight/2, note), 550); }, {passive:true});
  el.addEventListener('touchend',   () => clearTimeout(t));
  el.addEventListener('touchmove',  () => clearTimeout(t));
}

/* ─────────────────── SEARCH ─────────────────── */
function openSearch() {
  document.getElementById('searchOverlay').classList.add('open');
  setTimeout(() => document.getElementById('searchOvInput').focus(), 100);
}

function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
  document.getElementById('searchOvInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchEmpty').style.display = 'flex';
}

function doSearch(q) {
  const res   = document.getElementById('searchResults');
  const empty = document.getElementById('searchEmpty');
  if (!q.trim()) { res.innerHTML = ''; empty.style.display = 'flex'; empty.querySelector('p').textContent = 'Start typing to search your notes'; return; }
  const ql = q.toLowerCase();
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
    el.style.cursor = 'pointer';
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
  const el = document.getElementById('pStatNotes');
  if (el) el.textContent = cnt;
}

/* ─────────────────── UTILS ─────────────────── */
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

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
  const d = new Date(iso); const n = new Date();
  return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toastBar');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ─────────────────── BIND ─────────────────── */
function bindAll() {

  // Bottom nav
  document.querySelectorAll('.bnav-btn[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => goScreen(btn.dataset.screen));
  });

  // FAB → new note sheet
  document.getElementById('fabBtn').addEventListener('click', openSheet);

  // New note button on home
  document.getElementById('newNoteBtn').addEventListener('click', openSheet);

  // New Media Capture Buttons
  document.getElementById('recordAudioBtn').addEventListener('click', openAudioSheet);
  document.getElementById('uploadAudioBtn').addEventListener('click', () => document.getElementById('audioFileInput').click());
  document.getElementById('youtubeNoteBtn').addEventListener('click', () => openLinkSheet('youtube'));
  document.getElementById('meetingNoteBtn').addEventListener('click', () => openLinkSheet('meeting'));

  // Audio Upload logic
  document.getElementById('audioFileInput').addEventListener('change', e => {
    if (e.target.files.length) {
      const name = e.target.files[0].name;
      const ts = now();
      notes.unshift({ id: uid(), title: 'Uploaded Audio', content: 'Audio file: ' + name, color: 'ocean', pinned: false, trashed: false, createdAt: ts, updatedAt: ts });
      save(); renderHome(); renderNotesList(); updateProfileStats();
      toast('✓ Audio uploaded and saved');
    }
    e.target.value = '';
  });

  // Audio Record Sheet logic
  document.getElementById('audioCloseBtn').addEventListener('click', closeAudioSheet);
  document.getElementById('audioToggleBtn').addEventListener('click', toggleAudioRecord);

  // Link Sheet logic
  document.getElementById('linkCloseBtn').addEventListener('click', closeLinkSheet);
  document.getElementById('linkSubmitBtn').addEventListener('click', submitLinkSheet);

  // AI btn on home
  document.getElementById('aiBtn').addEventListener('click', () => goScreen('ai'));

  // See all
  document.getElementById('seeAllBtn')?.addEventListener('click', () => goScreen('notes'));

  // Sheet
  document.getElementById('sheetCloseBtn').addEventListener('click', closeSheet);
  document.getElementById('sheetOverlay').addEventListener('click', closeSheet);
  document.getElementById('sheetSaveBtn').addEventListener('click', saveSheet);

  // Sheet colors
  document.querySelectorAll('.sh-color').forEach(btn => {
    btn.addEventListener('click', () => {
      sheetColor = btn.dataset.c;
      document.querySelectorAll('.sh-color').forEach(b => b.classList.toggle('active', b.dataset.c === sheetColor));
    });
  });

  // Sheet tag input
  const sti = document.getElementById('sheetTagInp');
  sti.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && sti.value.trim()) {
      e.preventDefault();
      const tag = sti.value.trim().toLowerCase().replace(/[^a-z0-9\-_]/g,'');
      if (tag && !sheetTags.includes(tag) && sheetTags.length < 10) { sheetTags.push(tag); renderSheetChips(); }
      sti.value = '';
    }
    if (e.key === 'Backspace' && !sti.value && sheetTags.length) { sheetTags.pop(); renderSheetChips(); }
  });

  // Sheet word count
  document.getElementById('sheetNoteBody').addEventListener('input', () => {
    const w = document.getElementById('sheetNoteBody').value.trim();
    const c = w ? w.split(/\s+/).length : 0;
    document.getElementById('sheetWC').textContent = `${c} word${c!==1?'s':''}`;
  });

  // Detail panel
  document.getElementById('detailBackBtn').addEventListener('click', closeDetail);
  document.getElementById('detailSaveBtn').addEventListener('click', saveDetail);
  document.getElementById('dtbAddBtn').addEventListener('click', () => { closeDetail(); openSheet(); });
  document.getElementById('detailMoreBtn').addEventListener('click', () => {
    if (editId) { const n = notes.find(x=>x.id===editId); if (n) showCtx(window.innerWidth-40, 120, n); }
  });

  // Auto-save detail
  ['detailTitle','detailContent'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      clearTimeout(autoSaveT);
      autoSaveT = setTimeout(() => { if (editId) saveDetail(); }, 2000);
    });
  });

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      filterMode = btn.dataset.filter;
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.dataset.filter === filterMode));
      renderNotesList();
    });
  });

  // Search
  ['searchOpenBtn','searchOpenBtn2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', openSearch);
  });
  document.getElementById('searchCloseBtn').addEventListener('click', closeSearch);
  document.getElementById('searchOvInput').addEventListener('input', e => doSearch(e.target.value));

  // Context menu actions
  document.getElementById('ctxEdit').addEventListener('click', () => { hideCtx(); if (ctxId) openDetail(ctxId); });
  document.getElementById('ctxPin').addEventListener('click', () => { const id = ctxId; hideCtx(); doPin(id); });
  document.getElementById('ctxTrash').addEventListener('click', () => { const id = ctxId; hideCtx(); doTrash(id); });
  document.addEventListener('click', e => { if (!document.getElementById('ctxMenu').contains(e.target)) hideCtx(); });
  document.addEventListener('touchstart', e => { if (!document.getElementById('ctxMenu').contains(e.target)) hideCtx(); }, {passive:true});

  // AI suggestions
  document.querySelectorAll('.ai-sugg').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('aiField').value = btn.dataset.q;
      toast('💡 AI feature coming soon!');
    });
  });
  document.getElementById('aiSendBtn').addEventListener('click', () => toast('💡 AI feature coming soon!'));
  document.getElementById('aiBackBtn').addEventListener('click', () => goScreen('home'));

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    darkMode = !darkMode;
    localStorage.setItem(THEME_K, darkMode ? 'dark' : 'light');
    applyTheme();
  });

  // Clear trash
  document.getElementById('clearTrashBtn')?.addEventListener('click', () => {
    notes = notes.filter(n => !n.trashed);
    save(); renderNotesList(); updateProfileStats();
    toast('✓ Trash cleared');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('searchOverlay').classList.contains('open')) { closeSearch(); return; }
      if (document.getElementById('newNoteSheet').classList.contains('open')) { closeSheet(); return; }
      if (document.getElementById('detailPanel').classList.contains('open')) { closeDetail(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openSheet(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (document.getElementById('detailPanel').classList.contains('open')) saveDetail();
      else if (document.getElementById('newNoteSheet').classList.contains('open')) saveSheet();
    }
  });
}

/* ─────────────────── MEDIA RECORDING LOGIC ─────────────────── */
let recInterval = null;
let recTime = 0;
let isRecording = false;

function openAudioSheet() {
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('audioRecordSheet').classList.add('open');
  isRecording = false; recTime = 0;
  document.getElementById('audioTimer').textContent = '00:00';
  document.getElementById('audioToggleBtn').classList.remove('recording');
  document.getElementById('audioHint').textContent = 'Tap to start recording';
}

function closeAudioSheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('audioRecordSheet').classList.remove('open');
  clearInterval(recInterval);
  isRecording = false;
}

function toggleAudioRecord() {
  const btn = document.getElementById('audioToggleBtn');
  const hint = document.getElementById('audioHint');
  if (!isRecording) {
    isRecording = true;
    btn.classList.add('recording');
    hint.textContent = 'Tap to stop & save';
    recTime = 0;
    recInterval = setInterval(() => {
      recTime++;
      const m = String(Math.floor(recTime / 60)).padStart(2, '0');
      const s = String(recTime % 60).padStart(2, '0');
      document.getElementById('audioTimer').textContent = m + ':' + s;
    }, 1000);
  } else {
    // Stop & Save
    clearInterval(recInterval);
    const ts = now();
    const duration = document.getElementById('audioTimer').textContent;
    notes.unshift({ id: uid(), title: 'Voice Note', content: 'Audio recording duration: ' + duration, color: 'gold', pinned: false, trashed: false, createdAt: ts, updatedAt: ts });
    save(); renderHome(); renderNotesList(); updateProfileStats();
    closeAudioSheet();
    toast('✓ Voice note saved');
  }
}

let linkSheetType = '';
function openLinkSheet(type) {
  linkSheetType = type;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('linkSheet').classList.add('open');
  document.getElementById('linkInput').value = '';
  document.getElementById('linkSheetTitle').textContent = type === 'youtube' ? 'YouTube Note' : 'Meeting Link';
  const ic = document.getElementById('linkSheetIcon');
  if (type === 'youtube') ic.innerHTML = '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>';
  else ic.innerHTML = '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>';
  setTimeout(() => document.getElementById('linkInput').focus(), 320);
}

function closeLinkSheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('linkSheet').classList.remove('open');
}

function submitLinkSheet() {
  const url = document.getElementById('linkInput').value.trim();
  if (!url) { toast('Please enter a valid URL'); return; }
  const ts = now();
  const t = linkSheetType === 'youtube' ? 'YouTube Summary' : 'Meeting Transcription';
  const c = linkSheetType === 'youtube' ? 'coral' : 'mint';
  notes.unshift({ id: uid(), title: t, content: 'Link processed: ' + url + '\\n\\n(AI summary would appear here...)', color: c, pinned: false, trashed: false, createdAt: ts, updatedAt: ts });
  save(); closeLinkSheet(); renderHome(); renderNotesList(); updateProfileStats();
  toast('✓ ' + t + ' created');
}
