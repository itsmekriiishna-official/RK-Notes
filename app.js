/* ═════════════════════════════════════
   RK Notes  —  app.js
   by itsmekriiishna-official
   ═════════════════════════════════════ */
'use strict';

// ── CONFIG ──────────────────────────────────────────
const STORE_KEY  = 'rk_notes_v1';
const THEME_KEY  = 'rk_theme';

// ── STATE ───────────────────────────────────────────
let notes       = [];
let view        = 'all';      // 'all' | 'pinned' | 'trash' | tag:xxx
let query       = '';
let sortMode    = 'updated';  // 'updated' | 'created' | 'az'
let viewMode    = 'grid';     // 'grid' | 'list'
let theme       = localStorage.getItem(THEME_KEY) || 'dark';
let editId      = null;
let deleteId    = null;
let editColor   = 'default';
let editPinned  = false;
let editTags    = [];
let autoTimer   = null;
let toastTimer  = null;

// ── BOOT ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);

function boot() {
  loadNotes();
  applyTheme();
  bindAll();
  render();
}

// ── PERSISTENCE ─────────────────────────────────────
function loadNotes() {
  try { notes = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { notes = []; }
}
function saveNotes() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(notes)); } catch { showToast('⚠️ Storage full!'); }
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── THEME ────────────────────────────────────────────
function applyTheme() {
  document.body.className = theme;
  const lbl = document.getElementById('themeLbl');
  if (lbl) lbl.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d0d16' : '#f5f5fc');
}

// ── FILTER ──────────────────────────────────────────
function getTagFromView(v) {
  return v && v.startsWith('tag:') ? v.slice(4) : null;
}

function filteredNotes() {
  const tag = getTagFromView(view);
  let r = [...notes];

  if (view === 'trash') {
    r = r.filter(n => n.trashed);
  } else if (view === 'pinned') {
    r = r.filter(n => !n.trashed && n.pinned);
  } else if (tag) {
    r = r.filter(n => !n.trashed && (n.tags || []).includes(tag));
  } else {
    r = r.filter(n => !n.trashed);
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    r = r.filter(n =>
      (n.title   || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.tags    || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // Sort
  switch (sortMode) {
    case 'az':
      r.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'created':
      r.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    default:
      r.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  // Pinned first (not in trash view)
  if (view !== 'trash') {
    const pinned = r.filter(n => n.pinned);
    const rest   = r.filter(n => !n.pinned);
    r = [...pinned, ...rest];
  }

  return r;
}

// ── RENDER ──────────────────────────────────────────
function render() { renderNotes(); renderBadges(); renderTags(); updateFooter(); }

function renderNotes() {
  const grid  = document.getElementById('notesGrid');
  const empty = document.getElementById('emptyState');
  const items = filteredNotes();

  // View mode
  grid.className = 'notes-grid' + (viewMode === 'list' ? ' list-view' : '');
  grid.innerHTML = '';

  // Empty state
  if (!items.length) {
    grid.style.display = 'none';
    empty.style.display = 'flex';
    setEmpty();
    return;
  }

  grid.style.display = 'grid';
  empty.style.display = 'none';

  items.forEach(n => grid.appendChild(buildCard(n)));

  // Page title
  const tag  = getTagFromView(view);
  const titles = { all: 'All Notes', pinned: 'Pinned', trash: 'Trash' };
  document.getElementById('pageTitle').textContent = tag ? `#${tag}` : (titles[view] || 'All Notes');
}

function setEmpty() {
  const h = document.getElementById('emptyH');
  const p = document.getElementById('emptyP');
  const b = document.getElementById('emptyNewBtn');
  if (query)          { h.textContent = 'No results found'; p.textContent = `Nothing matches "${query}"`; b.style.display = 'none'; }
  else if (view==='pinned') { h.textContent = 'No pinned notes'; p.textContent = 'Pin important notes to keep them at the top.'; b.style.display = 'none'; }
  else if (view==='trash')  { h.textContent = 'Trash is empty'; p.textContent = 'Deleted notes appear here.'; b.style.display = 'none'; }
  else { h.textContent = 'No notes yet'; p.textContent = 'Hit the button above to write your first note.'; b.style.display = 'inline-flex'; }
}

function renderBadges() {
  const all    = notes.filter(n => !n.trashed).length;
  const pinned = notes.filter(n => !n.trashed && n.pinned).length;
  const trash  = notes.filter(n => n.trashed).length;
  document.getElementById('chipAll').textContent    = all;
  document.getElementById('chipPinned').textContent = pinned;
  document.getElementById('chipTrash').textContent  = trash;
}

function renderTags() {
  const map = {};
  notes.filter(n => !n.trashed).forEach(n => (n.tags || []).forEach(t => { map[t] = (map[t] || 0) + 1; }));
  const sec  = document.getElementById('sidebarTagsSection');
  const list = document.getElementById('sidebarTagsList');
  if (!Object.keys(map).length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  list.innerHTML = '';
  Object.entries(map).sort((a, b) => b[1] - a[1]).forEach(([t, cnt]) => {
    const btn = document.createElement('button');
    btn.className = 'tag-nav-btn' + (view === `tag:${t}` ? ' active' : '');
    btn.innerHTML = `<span class="tag-dot"></span><span>${esc(t)}</span><span class="tag-count-chip">${cnt}</span>`;
    btn.addEventListener('click', () => { switchView(`tag:${t}`); closeSidebar(); });
    list.appendChild(btn);
  });
}

function updateFooter() {
  const cnt = notes.filter(n => !n.trashed).length;
  document.getElementById('footerCount').textContent = `${cnt} note${cnt !== 1 ? 's' : ''}`;
}

// ── BUILD CARD ───────────────────────────────────────
function buildCard(n) {
  const card = document.createElement('div');
  card.className = 'note-card';
  card.dataset.id = n.id;
  if (n.color && n.color !== 'default') card.dataset.color = n.color;

  const preview = (n.content || '').trim() || 'No additional content.';
  const date    = fmtDate(n.updatedAt);
  const tagsHtml = (n.tags || []).map(t => `<span class="card-tag">#${esc(t)}</span>`).join('');

  if (n.trashed) {
    card.innerHTML = `
      <div class="card-body" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:9px">
        <div class="card-top">
          <div class="card-title ${!n.title ? 'untitled' : ''}">${esc(n.title || 'Untitled')}</div>
        </div>
        <div class="card-preview">${esc(preview)}</div>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
        <div class="card-meta">
          <span class="card-date">${date}</span>
          <div class="card-trash-row">
            <button class="card-restore-btn" data-act="restore" data-id="${n.id}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Restore
            </button>
            <button class="card-restore-btn perma" data-act="perma" data-id="${n.id}">Delete forever</button>
          </div>
        </div>
      </div>`;
  } else {
    card.innerHTML = `
      <div class="card-body" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:9px">
        <div class="card-top">
          <div class="card-title ${!n.title ? 'untitled' : ''}">${esc(n.title || 'Untitled')}</div>
          ${n.pinned ? `<span class="card-pin-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg></span>` : ''}
        </div>
        <div class="card-preview">${esc(preview)}</div>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
      </div>
      <div class="card-meta">
        <span class="card-date">${date}</span>
        <div class="card-actions">
          <button class="card-act-btn ${n.pinned ? 'pinned' : ''}" data-act="pin" data-id="${n.id}" title="${n.pinned ? 'Unpin' : 'Pin'}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="${n.pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
          </button>
          <button class="card-act-btn del" data-act="trash" data-id="${n.id}" title="Move to trash">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>`;
  }

  // Click → edit (not on action buttons)
  card.addEventListener('click', e => {
    if (e.target.closest('[data-act]')) return;
    if (!n.trashed) openEditor(n.id);
  });

  // Action buttons
  card.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const { act, id } = btn.dataset;
      if      (act === 'pin')     doPin(id);
      else if (act === 'trash')  { deleteId = id; openModal('confirmModal'); }
      else if (act === 'restore') doRestore(id);
      else if (act === 'perma')   doPerma(id);
    });
  });

  return card;
}

// ── ACTIONS ──────────────────────────────────────────
function doPin(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  n.pinned = !n.pinned;
  n.updatedAt = now();
  saveNotes(); render();
  showToast(n.pinned ? '📌 Pinned' : 'Unpinned');
}

function doTrash(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  n.trashed = true;
  n.updatedAt = now();
  saveNotes();
  closeEditor();
  closeModal('confirmModal');
  render();
  showToast('🗑️ Moved to trash');
}

function doRestore(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  n.trashed = false;
  n.updatedAt = now();
  saveNotes(); render();
  showToast('✓ Restored');
}

function doPerma(id) {
  notes = notes.filter(x => x.id !== id);
  saveNotes(); render();
  showToast('Permanently deleted', true);
}

// ── EDITOR ───────────────────────────────────────────
function openEditor(id = null) {
  editId     = id;
  const n    = id ? notes.find(x => x.id === id) : null;
  editColor  = n?.color   || 'default';
  editPinned = n?.pinned  || false;
  editTags   = n?.tags    ? [...n.tags] : [];

  document.getElementById('epTitle').value   = n?.title   || '';
  document.getElementById('epContent').value = n?.content || '';

  // Color ring
  document.querySelectorAll('.ep-color').forEach(b => b.classList.toggle('active', b.dataset.c === editColor));
  document.getElementById('editorPanel').dataset.c = editColor !== 'default' ? editColor : '';

  updateEpPin();
  renderEpTags();
  updateEpStats();
  document.getElementById('epTimestamp').textContent = n ? 'Edited ' + fmtDate(n.updatedAt) : '';
  document.getElementById('epSaveIndicator').style.display = 'none';
  document.getElementById('epDeleteBtn').style.display = id ? 'flex' : 'none';

  openModal('editorModal');
  setTimeout(() => document.getElementById('epTitle').focus(), 90);
}

function closeEditor() {
  closeModal('editorModal');
  editId = null; editTags = []; editPinned = false; editColor = 'default';
}

function saveNote() {
  const title   = document.getElementById('epTitle').value.trim();
  const content = document.getElementById('epContent').value.trim();
  if (!title && !content) { showToast('⚠️ Cannot save an empty note.', true); return; }
  const ts = now();

  if (editId) {
    const idx = notes.findIndex(x => x.id === editId);
    if (idx !== -1) {
      notes[idx] = { ...notes[idx], title, content, tags: [...editTags], color: editColor, pinned: editPinned, updatedAt: ts };
    }
    showToast('✓ Note updated');
  } else {
    notes.unshift({ id: uid(), title, content, tags: [...editTags], color: editColor, pinned: editPinned, trashed: false, createdAt: ts, updatedAt: ts });
    showToast('✓ Note created');
  }
  saveNotes(); closeEditor(); render();
}

function renderEpTags() {
  const chips = document.getElementById('epTagChips');
  chips.innerHTML = editTags.map(t => `
    <span class="ep-chip">#${esc(t)}<button class="ep-chip-rm" data-t="${esc(t)}">×</button></span>
  `).join('');
  chips.querySelectorAll('.ep-chip-rm').forEach(b => {
    b.addEventListener('click', () => { editTags = editTags.filter(x => x !== b.dataset.t); renderEpTags(); });
  });
}

function updateEpPin() {
  const btn = document.getElementById('epPinBtn');
  btn.classList.toggle('pinned', editPinned);
  btn.title = editPinned ? 'Unpin note' : 'Pin note';
}

function updateEpStats() {
  const content = document.getElementById('epContent').value;
  const words   = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars   = content.length;
  document.getElementById('epStats').textContent = `${words} word${words!==1?'s':''} · ${chars} char${chars!==1?'s':''}`;
}

// Auto-save (only when editing existing note)
function scheduleAutoSave() {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    if (!editId) return;
    const title   = document.getElementById('epTitle').value.trim();
    const content = document.getElementById('epContent').value.trim();
    if (!title && !content) return;
    const idx = notes.findIndex(x => x.id === editId);
    if (idx === -1) return;
    notes[idx] = { ...notes[idx], title, content, tags: [...editTags], color: editColor, pinned: editPinned, updatedAt: now() };
    saveNotes(); render();
    const ind = document.getElementById('epSaveIndicator');
    ind.style.display = 'flex';
    setTimeout(() => { ind.style.display = 'none'; }, 2200);
  }, 1800);
}

// ── MODALS ───────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── TOAST ────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── SIDEBAR / VIEWS ──────────────────────────────────
function switchView(v) {
  view = v;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  const titles = { all: 'All Notes', pinned: 'Pinned', trash: 'Trash' };
  document.getElementById('pageTitle').textContent = v.startsWith('tag:') ? `#${v.slice(4)}` : (titles[v] || 'All Notes');
  render();
}

function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('open'); }

// ── UTILS ─────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function now() { return new Date().toISOString(); }
function fmtDate(iso) {
  if (!iso) return '';
  const d    = new Date(iso);
  const mins = Math.floor((Date.now() - d) / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins <  1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  if (days <  7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

// ── BIND ─────────────────────────────────────────────
function bindAll() {

  // New note
  ['newNoteBtn','emptyNewBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openEditor());
  });

  // Sidebar nav buttons
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => { switchView(btn.dataset.view); closeSidebar(); });
  });

  // Hamburger / close sidebar
  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Sort
  document.getElementById('sortSelect').addEventListener('change', e => { sortMode = e.target.value; renderNotes(); });

  // View mode
  document.getElementById('gridViewBtn').addEventListener('click', () => {
    viewMode = 'grid';
    document.getElementById('gridViewBtn').classList.add('active');
    document.getElementById('listViewBtn').classList.remove('active');
    renderNotes();
  });
  document.getElementById('listViewBtn').addEventListener('click', () => {
    viewMode = 'list';
    document.getElementById('listViewBtn').classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');
    renderNotes();
  });

  // Search
  const si = document.getElementById('searchInput');
  const sc = document.getElementById('searchClearBtn');
  si.addEventListener('input', () => {
    query = si.value;
    sc.classList.toggle('visible', !!query);
    renderNotes();
  });
  sc.addEventListener('click', () => { si.value = ''; query = ''; sc.classList.remove('visible'); renderNotes(); });

  // Theme
  document.getElementById('themeBtn').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, theme);
    applyTheme();
  });

  // Editor — close
  document.getElementById('epCloseBtn').addEventListener('click', closeEditor);
  document.getElementById('epCancelBtn').addEventListener('click', closeEditor);
  document.getElementById('editorModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeEditor(); });

  // Editor — save
  document.getElementById('epSaveBtn').addEventListener('click', saveNote);

  // Editor — delete
  document.getElementById('epDeleteBtn').addEventListener('click', () => { if (editId) { deleteId = editId; openModal('confirmModal'); } });

  // Editor — pin
  document.getElementById('epPinBtn').addEventListener('click', () => { editPinned = !editPinned; updateEpPin(); });

  // Editor — colors
  document.querySelectorAll('.ep-color').forEach(btn => {
    btn.addEventListener('click', () => {
      editColor = btn.dataset.c;
      document.querySelectorAll('.ep-color').forEach(b => b.classList.toggle('active', b.dataset.c === editColor));
      document.getElementById('editorPanel').dataset.c = editColor !== 'default' ? editColor : '';
    });
  });

  // Editor — tag input
  const ti = document.getElementById('epTagInput');
  ti.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && ti.value.trim()) {
      e.preventDefault();
      const tag = ti.value.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
      if (tag && !editTags.includes(tag) && editTags.length < 10) { editTags.push(tag); renderEpTags(); }
      ti.value = '';
    }
    if (e.key === 'Backspace' && !ti.value && editTags.length) { editTags.pop(); renderEpTags(); }
  });

  // Editor — content stats + auto-save
  document.getElementById('epContent').addEventListener('input', () => { updateEpStats(); scheduleAutoSave(); });
  document.getElementById('epTitle').addEventListener('input', scheduleAutoSave);

  // Confirm modal
  document.getElementById('confirmOkBtn').addEventListener('click', () => doTrash(deleteId));
  document.getElementById('confirmCancelBtn').addEventListener('click', () => { closeModal('confirmModal'); deleteId = null; });
  document.getElementById('confirmModal').addEventListener('click', e => { if (e.target === e.currentTarget) { closeModal('confirmModal'); deleteId = null; } });

  // Global keyboard shortcuts
  document.addEventListener('keydown', e => {
    const edOpen   = document.getElementById('editorModal').classList.contains('open');
    const confOpen = document.getElementById('confirmModal').classList.contains('open');

    if (e.key === 'Escape') {
      if (confOpen) { closeModal('confirmModal'); deleteId = null; }
      else if (edOpen) closeEditor();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (edOpen) saveNote();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      if (!edOpen) openEditor();
    }
  });
}
