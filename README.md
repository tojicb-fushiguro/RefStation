# 🚉 RefStation

> Turn every new tab into an inspiring art study station 🎨

**RefStation** is a Chrome Extension (Manifest V3) that replaces your new tab with curated ArtStation artwork for inspiration, practice, and focus.  
It blends a beautiful full-screen art viewer with practical tools like favorites, notes, gesture timer, autoplay, offline fallback, and backup/import support.

---

## ✨ Highlights

- 🖼️ **Immersive art-first new tab**
- 🎯 **Built for artists and learners**
- ❤️ **Favorites + History + Pin workflow**
- 📝 **Per-artwork study notes**
- ⏱️ **Autoplay and gesture drawing timer**
- 📴 **Offline fallback support**
- 💾 **Export/Import your full data**
- ⌨️ **Keyboard shortcut-driven UX**
<img width="1919" height="1034" alt="image" src="https://github.com/user-attachments/assets/aaae2e95-1da5-4f4a-9816-75cc9ef59474" />
<img width="568" height="701" alt="image" src="https://github.com/user-attachments/assets/2f2ddde0-95bf-4fca-8546-bb949483ee30" />

Add specific notes for specific picture


---

## 🧠 What RefStation Does

### 🖼️ Artwork Experience
- Pulls random artwork projects from ArtStation
- Shows artwork title, artist details, and source links
- Supports **multi-image projects** with image-level navigation
- Lets you download current artwork (with fallback behavior)

### 🔎 Smart Filtering
- Filter by:
  - **Medium**
  - **Subject Matter**
- Filter options are loaded from ArtStation endpoints

### ⏱️ Productivity Tools
- **Autoplay** with configurable duration (minimum 5 seconds)
- Circular autoplay progress indicator
- **Gesture Timer** for timed drawing sessions (30s, 1m, 2m, 5m, 10m)

### 🗂️ Personal Workspace
- **History drawer** (paged)
- **Favorites drawer** (paged, removable entries)
- **Study notes** tied to each artwork
- **Pinned artwork mode** (freeze current piece until unpinned)

### 📴 Offline Resilience
- If online fetch fails, app falls back to `offline/offline.json`
- Offline indicator appears in UI
- Rotating offline index prevents showing the same fallback repeatedly

### 💾 Data Portability
- Export full user data to JSON backup
- Import backup JSON and restore:
  - favorites
  - notes
  - history
  - settings
  - pinned artwork
<img width="1919" height="187" alt="image" src="https://github.com/user-attachments/assets/fb5b29ea-7f2b-4dae-9999-14729a489c56" />
<img width="1919" height="202" alt="image" src="https://github.com/user-attachments/assets/cbcbbc46-e40e-42aa-bab6-e517a62990bd" />

---

## 📁 Project Structure

```text
RefStation/
├── artstation.html
├── manifest.json
├── assets/
│   ├── css/
│   │   └── app.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       ├── state.js
│       ├── ui.js
│       └── background.js
└── offline/
    └── offline.json
```

---

## ⚙️ Tech Stack

- Chrome Extension **Manifest V3**
- Vanilla JavaScript (ES modules)
- HTML + CSS (custom glassmorphism UI)
- `chrome.storage.local` with browser fallback
- ArtStation API endpoints for random projects and filter metadata
<img width="465" height="615" alt="image" src="https://github.com/user-attachments/assets/4b65f143-17bf-47a4-8be0-1a7f71cfa2f2" />

Discover your Flow State
---

## ⌨️ Keyboard Shortcuts

- `← / →` : previous / next artwork
- `Shift + ← / Shift + →` : previous / next image in current project
- `F` : toggle favorite
- `D` : download image
- `N` : open note panel
- `H` : open history
- `V` : open favorites
- `P` : pin/unpin artwork
- `S` : open settings

---

## ✅ Strengths

- Clean modular code structure (`api`, `state`, `ui`, `app`)
- Thoughtful UX and polished visual design
- Good resilience (timeouts + offline fallback)
- Good personalization depth for a new-tab extension
- Data backup/restore built in
- Safe HTML escaping in UI-rendered content

---

## ⚠️ Current Limitations

- No automated tests yet
- Live content depends on ArtStation endpoint availability
- Chrome-first packaging (not yet multi-browser release-ready)
- Permissions can likely be tightened further over time
- License is currently unspecified

---

## 🚀 Installation (Developer Mode)

1. Clone or download this repository
2. Open `chrome://extensions/`
3. Turn on **Developer mode**
4. Click **Load unpacked**
5. Select the `RefStation` folder
6. Open a new tab and enjoy 🎉

---

## 🛠️ Suggested Next Steps

- Add unit tests (especially around storage/state)
- Add architecture + storage key documentation
- Add release notes/changelog
- Add screenshots/GIFs in README
- Add optional import merge mode
- Improve accessibility audit and semantic labels

---

## 👤 Author

**tojicb-fushiguro**

---

## 🙏 Inspiration

RefStation is **heavily inspired by the ArtStation Discover extension** in concept and overall direction.  
However, the **implementation/code in this repository is fully my own**, with many added features and UX improvements.

---

## 📄 License

License is **currently not specified**.

This project is heavily inspired by the ArtStation Discover extension concept, while the implementation and additional features are original.

If you are the owner of any related concept/assets and have concerns, please open an issue.

---

## 🙌 Credits

- Artwork content from **ArtStation**
- Built by **tojicb-fushiguro**

---

**RefStation** = daily inspiration + learning flow + better new tabs 🚀
