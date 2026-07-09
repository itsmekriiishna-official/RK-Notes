# RK Notes

> **A beautiful, fast, and fully responsive notes app — built for every platform.**

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6366f1?style=for-the-badge" />
  <img src="https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge" />
  <img src="https://img.shields.io/badge/platform-Web-38bdf8?style=for-the-badge" />
  <img src="https://img.shields.io/badge/made%20by-itsmekriiishna-a78bfa?style=for-the-badge" />
</p>

---

## ✨ Features

| Feature | Details |
|---|---|
| 📝 **Rich Note Editor** | Title, body, 6 note colours, tags, word/char count |
| 📌 **Pin Notes** | Keep your most important notes at the top |
| 🔍 **Instant Search** | Real-time full-text search across all notes |
| 🏷️ **Tag System** | Add multiple tags, filter by tag from sidebar |
| 🗑️ **Trash & Restore** | Soft-delete with the ability to restore or permanently delete |
| 🌗 **Dark / Light Theme** | Persisted across sessions |
| 🗂️ **Grid & List Views** | Switch between masonry grid and compact list |
| ↕️ **Sort Options** | By last edited · date created · title A–Z |
| 💾 **Auto-Save** | Edits are auto-saved 1.8 s after you stop typing |
| ⌨️ **Keyboard Shortcuts** | `Ctrl+N` New · `Ctrl+S` Save · `Esc` Close |
| 📱 **Fully Responsive** | Works perfectly on mobile, tablet and desktop |
| ⚡ **Zero Dependencies** | Pure HTML + CSS + Vanilla JS — no frameworks |

---

## 🖥️ Screenshots

> Open `index.html` in any modern browser to see it live.

---

## 🚀 Getting Started

### Option 1 — Open directly

Just double-click `index.html` — no server or build step required.

### Option 2 — Clone & run locally

```bash
git clone https://github.com/itsmekriiishna-official/RK-Notes.git
cd RK-Notes
# Open index.html in your browser
start index.html       # Windows
open index.html        # macOS
xdg-open index.html    # Linux
```

---

## 📁 Project Structure

```
RK-Notes/
├── index.html   ← App shell (HTML)
├── style.css    ← Complete design system & styles
├── app.js       ← All app logic (CRUD, search, sort, themes)
└── README.md
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + N` | Create a new note |
| `Ctrl + S` | Save the current note |
| `Esc` | Close editor / dismiss dialog |

---

## 🎨 Colour Themes

Notes can be painted with 6 accent colours:

- **Coral** — warm pink-red
- **Gold** — warm amber yellow
- **Mint** — cool emerald green
- **Ocean** — bright sky blue
- **Lavender** — soft violet
- **Default** — adapts to the app theme

---

## 💾 Data Storage

All notes are stored in your browser's `localStorage` under the key `rk_notes_v1`.  
No server, no account, no data leaves your device.

---

## 📄 License

MIT © [itsmekriiishna-official](https://github.com/itsmekriiishna-official)