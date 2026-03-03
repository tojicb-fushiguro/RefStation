/**
 * ui.js — DOM rendering and event handlers
 */
import { fetchFilterOptions } from './api.js';
import {
  loadSettings, saveSettings, resetFilters,
  getHistory, getHistoryPage, PAGE_SIZE,
  getFavoritesPage, removeFavorite,
  getNote, saveNote,
  exportAllData, importAllDataReplace
} from './state.js';

const $ = id => document.getElementById(id);

export const EL = {
  artwork: $('artwork'),
  header: $('header'),
  artworkName: $('artwork-name'),
  authorName: $('author-name'),
  offlineLabel: document.querySelector('.offline-label'),
  clock: $('clock'),
  date: $('date'),
  pinIndicator: $('pin-indicator'),

  actionButtons: $('action-buttons'),
  favoriteBtn: $('favorite-btn'),
  downloadBtn: $('download-btn'),
  openBtn: $('open-btn'),
  noteBtn: $('note-btn'),
  pinBtn: $('pin-btn'),

  imageCounter: $('image-counter'),
  imgPrev: $('img-prev'),
  imgNext: $('img-next'),
  imgIndex: $('img-index'),

  gestureTimer: $('gesture-timer'),
  gestureCountdown: $('gesture-countdown'),

  settingsBtn: $('settings-btn'),
  prevBtn: $('prev-btn'),
  nextBtn: $('next-btn'),

  autoplayWrap: $('autoplay-wrap'),
  autoplayBtn: $('autoplay-btn'),
  autoplayIcon: $('autoplay-icon'),
  ringProgress: $('ring-progress'),

  historyOpenBtn: $('history-open-btn'),
  historyContainer: $('history-container'),
  historyItems: $('history-items'),
  historyPrev: $('history-prev'),
  historyNext: $('history-next'),
  historyClose: $('history-close'),

  favoritesOpenBtn: $('favorites-open-btn'),
  favContainer: $('favorites-container'),
  favItems: $('favorites-items'),
  favPrev: $('fav-prev'),
  favNext: $('fav-next'),
  favClose: $('favorites-close'),

  notePanel: $('note-panel'),
  noteClose: $('note-close'),
  noteTextarea: $('note-textarea'),
  noteSave: $('note-save'),
  noteDelete: $('note-delete'),

  settingsModal: $('settings-modal'),
  modalClose: $('modal-close'),
  modalSave: $('modal-save'),
  modalReset: $('modal-reset'),
  mediumSelect: $('medium-select'),
  categorySelect: $('category-select'),
  autoplayCb: $('autoplay-checkbox'),
  durationLabel: $('duration-label'),
  durationInput: $('duration-input'),
  durationError: $('duration-error'),
  gestureCb: $('gesture-checkbox'),
  gestureDurLabel: $('gesture-duration-label'),
  gestureDurSelect: $('gesture-duration-select'),
  exportBtn: $('export-btn'),
  importBtn: $('import-btn'),
  importFile: $('import-file'),

  noResultsModal: $('no-results-modal'),
  noResultsClose: $('no-results-close'),
  noResultsOk: $('no-results-ok'),
  errorToast: $('error-toast'),
  noteToast: $('note-toast'),
};

let currentNoteHashId = null;
let historyPageStart = 0;
let favPageStart = 0;
let errorTimer = null, noteTimer = null, downloadTimer = null;

export function startClock() {
  const tick = () => {
    const now = new Date();
    EL.clock.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    EL.date.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  };
  tick(); setInterval(tick, 1000);
}

let idleTimer = null;
export function initIdleHandler() {
  const reset = () => {
    document.querySelectorAll('.ui').forEach(el => el.classList.remove('hidden-ui'));
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.querySelectorAll('.ui').forEach(el => el.classList.add('hidden-ui')), 5000);
  };
  document.addEventListener('mousemove', reset);
  document.addEventListener('keydown', reset);
  reset();
}

export function renderProject(project) {
  if (!project) return;
  EL.artworkName.innerHTML = `<a href="${esc(project.url)}" target="_blank">${esc(project.title)}</a>`;
  const avatar = project.user.medium_avatar_url || 'assets/img/default_avatar.jpg';
  EL.authorName.innerHTML = `<a href="${esc(project.user.artstation_profile_url)}" target="_blank"><img src="${esc(avatar)}" alt="" />${esc(project.user.full_name)}</a>`;
  EL.offlineLabel.classList.toggle('hidden', !project.offline);
  EL.openBtn.onclick = () => window.open(project.url, '_blank');
  EL.downloadBtn.onclick = () => downloadImage(project.imageUrl, project.title);

  EL.artwork.classList.remove('loaded');
  const img = new Image();
  img.onload = () => { EL.artwork.src = img.src; EL.artwork.classList.add('loaded'); EL.header.classList.add('visible'); };
  img.src = project.imageUrl;
}

export function updateImageCounter(current, total) {
  EL.imageCounter.classList.toggle('hidden', total <= 1);
  if (total > 1) EL.imgIndex.textContent = `${current + 1} / ${total}`;
}

export async function renderHistoryPage() {
  const { items, total, start } = await getHistoryPage(historyPageStart);
  EL.historyPrev.disabled = start <= 0;
  EL.historyNext.disabled = start + PAGE_SIZE >= total;
  EL.historyItems.innerHTML = Array.from({ length: PAGE_SIZE }, (_, i) => {
    const item = items[i];
    if (!item) return `<div class="history-item empty"></div>`;
    return `<div class="history-item" data-id="${esc(item.hash_id)}"><img class="thumb" src="${esc(item.cover?.smaller_square_image_url || '')}" alt=""><div class="info"><div class="title">${esc(item.title)}</div><div class="name">${esc(item.user?.full_name || '')}</div></div></div>`;
  }).join('');
}

export async function renderFavoritesPage() {
  const { items, total, start } = await getFavoritesPage(favPageStart);
  EL.favPrev.disabled = start <= 0;
  EL.favNext.disabled = start + PAGE_SIZE >= total;
  EL.favItems.innerHTML = Array.from({ length: PAGE_SIZE }, (_, i) => {
    const item = items[i];
    if (!item) return `<div class="history-item empty"></div>`;
    return `<div class="history-item" data-id="${esc(item.hash_id)}"><img class="thumb" src="${esc(item.cover?.smaller_square_image_url || '')}" alt=""><div class="info"><div class="title">${esc(item.title)}</div><div class="name">${esc(item.user?.full_name || '')}</div></div><button class="fav-remove" data-id="${esc(item.hash_id)}">&#10005; Remove</button></div>`;
  }).join('');
}

export async function openHistoryDrawer() {
  EL.favContainer.classList.remove('open');
  EL.favContainer.classList.add('hidden');

  const history = await getHistory();
  historyPageStart = Math.max(0, history.length - PAGE_SIZE);

  EL.historyContainer.classList.remove('hidden');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => EL.historyContainer.classList.add('open'));
  });
  renderHistoryPage();
}

export function closeHistoryDrawer() { EL.historyContainer.classList.remove('open'); setTimeout(() => !EL.historyContainer.classList.contains('open') && EL.historyContainer.classList.add('hidden'), 350); }

export async function openFavoritesDrawer() {
  EL.historyContainer.classList.remove('open');
  EL.historyContainer.classList.add('hidden');

  const { total } = await getFavoritesPage(0);
  favPageStart = Math.max(0, total - PAGE_SIZE);

  EL.favContainer.classList.remove('hidden');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => EL.favContainer.classList.add('open'));
  });
  renderFavoritesPage();
}
export function closeFavoritesDrawer() { EL.favContainer.classList.remove('open'); setTimeout(() => !EL.favContainer.classList.contains('open') && EL.favContainer.classList.add('hidden'), 350); }

export async function openNotePanel(hashId) {
  currentNoteHashId = hashId;
  EL.noteTextarea.value = await getNote(hashId);
  EL.notePanel.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => EL.notePanel.classList.add('open')));
  EL.noteTextarea.focus();
}
export function closeNotePanel() { EL.notePanel.classList.remove('open'); setTimeout(() => !EL.notePanel.classList.contains('open') && EL.notePanel.classList.add('hidden'), 300); }

export async function openSettingsModal() {
  const s = await loadSettings();
  EL.autoplayCb.checked = s.autoplay;
  EL.durationInput.value = s.autoplayTime;
  EL.durationLabel.classList.toggle('hidden', !s.autoplay);
  EL.gestureCb.checked = s.gestureEnabled;
  EL.gestureDurLabel.classList.toggle('hidden', !s.gestureEnabled);
  EL.gestureDurSelect.value = String(s.gestureDuration);

  try {
    const { categories, mediums } = await fetchFilterOptions();
    populateSelect(EL.mediumSelect, mediums, s.medium);
    populateSelect(EL.categorySelect, categories, s.category);
  } catch {}

  EL.settingsModal.classList.remove('hidden');
}
export function closeSettingsModal() { EL.settingsModal.classList.add('hidden'); }

function populateSelect(selectEl, items, selectedValue) {
  const first = selectEl.options[0];
  selectEl.innerHTML = ''; selectEl.appendChild(first);
  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item.uri || item.name; opt.textContent = item.name;
    if (opt.value === selectedValue || opt.textContent === selectedValue) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

export function showErrorToast(msg) {
  if (msg) EL.errorToast.innerHTML = `<strong>Sorry</strong> — ${esc(msg)}`;
  EL.errorToast.classList.remove('hidden');
  clearTimeout(errorTimer); errorTimer = setTimeout(() => EL.errorToast.classList.add('hidden'), 5000);
}
export function showNoteToast() {
  EL.noteToast.classList.remove('hidden');
  clearTimeout(noteTimer); noteTimer = setTimeout(() => EL.noteToast.classList.add('hidden'), 2200);
}
export function showDownloadToast(msg) {
  let t = document.getElementById('download-toast');
  if (!t) { t = document.createElement('div'); t.id = 'download-toast'; t.className = 'toast success'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(downloadTimer); downloadTimer = setTimeout(() => t.classList.add('hidden'), 2500);
}
export function showNoResultsModal() { EL.noResultsModal.classList.remove('hidden'); }

const C = 2 * Math.PI * 16;
export function setAutoplayRingProgress(pct) { EL.ringProgress.style.strokeDashoffset = C * (1 - pct / 100); }
export function setAutoplayIcon(playing) { EL.autoplayIcon.innerHTML = playing ? '&#9646;&#9646;' : '&#9654;'; }

export function showGestureTimer(seconds) { EL.gestureTimer.classList.remove('hidden'); updateGestureDisplay(seconds); }
export function hideGestureTimer() { EL.gestureTimer.classList.add('hidden'); }
export function updateGestureDisplay(seconds) {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  EL.gestureCountdown.textContent = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
  EL.gestureTimer.classList.toggle('warning', seconds <= 5);
}

export function setFavoriteBtn(isFav) {
  EL.favoriteBtn.innerHTML = isFav ? '&#9829;' : '&#9825;';
  EL.favoriteBtn.classList.toggle('active', isFav);
}
export function setPinUI(isPinned) {
  EL.pinIndicator.classList.toggle('hidden', !isPinned);
  EL.pinBtn.style.color = isPinned ? '#f1c40f' : '#fff';
}

async function downloadImage(url, title) {
  try {
    EL.downloadBtn.disabled = true; EL.downloadBtn.style.opacity = '.5';
    const res = await fetch(url); if (!res.ok) throw new Error();
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = (title || 'artwork').replace(/[^a-z0-9]/gi, '_') + '.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    showDownloadToast('✓ Download started');
  } catch {
    window.open(url, '_blank');
    showDownloadToast('Opened in new tab (fallback)');
  } finally {
    EL.downloadBtn.disabled = false; EL.downloadBtn.style.opacity = '1';
  }
}

export function bindEvents(handlers) {
  const {
    onNext, onPrev, onImgNext, onImgPrev,
    onHistoryItemClick, onFavoriteItemClick,
    onAutoplayToggle, onFavoriteToggle, onPinToggle, onNoteOpen,
    onSettingsSave, onSettingsReset, onImportDone
  } = handlers;

  EL.nextBtn.addEventListener('click', onNext);
  EL.prevBtn.addEventListener('click', onPrev);
  EL.imgNext.addEventListener('click', onImgNext);
  EL.imgPrev.addEventListener('click', onImgPrev);

  EL.historyOpenBtn.addEventListener('click', async () => { await openHistoryDrawer(); });
  EL.historyClose.addEventListener('click', closeHistoryDrawer);
  EL.historyPrev.addEventListener('click', async () => { historyPageStart = Math.max(0, historyPageStart - PAGE_SIZE); renderHistoryPage(); });
  EL.historyNext.addEventListener('click', async () => {
    const h = await getHistory();
    historyPageStart = Math.min(Math.max(0, h.length - PAGE_SIZE), historyPageStart + PAGE_SIZE);
    renderHistoryPage();
  });
  EL.historyItems.addEventListener('click', e => {
    const item = e.target.closest('.history-item[data-id]');
    if (item) { closeHistoryDrawer(); onHistoryItemClick(item.dataset.id); }
  });

  EL.favoritesOpenBtn.addEventListener('click', async () => { await openFavoritesDrawer(); });
  EL.favClose.addEventListener('click', closeFavoritesDrawer);
  EL.favPrev.addEventListener('click', () => { favPageStart = Math.max(0, favPageStart - PAGE_SIZE); renderFavoritesPage(); });
  EL.favNext.addEventListener('click', async () => {
    const { total } = await getFavoritesPage(0);
    favPageStart = Math.min(Math.max(0, total - PAGE_SIZE), favPageStart + PAGE_SIZE);
    renderFavoritesPage();
  });
  EL.favItems.addEventListener('click', async e => {
    const rm = e.target.closest('.fav-remove');
    if (rm) { e.stopPropagation(); await removeFavorite(rm.dataset.id); renderFavoritesPage(); return; }
    const item = e.target.closest('.history-item[data-id]');
    if (item) { closeFavoritesDrawer(); onFavoriteItemClick(item.dataset.id); }
  });

  EL.favoriteBtn.addEventListener('click', onFavoriteToggle);
  EL.pinBtn.addEventListener('click', onPinToggle);

  EL.noteBtn.addEventListener('click', onNoteOpen);
  EL.noteClose.addEventListener('click', closeNotePanel);
  EL.noteSave.addEventListener('click', async () => { if (!currentNoteHashId) return; await saveNote(currentNoteHashId, EL.noteTextarea.value); closeNotePanel(); showNoteToast(); });
  EL.noteDelete.addEventListener('click', async () => { if (!currentNoteHashId) return; await saveNote(currentNoteHashId, ''); closeNotePanel(); });

  EL.autoplayBtn.addEventListener('click', onAutoplayToggle);

  EL.settingsBtn.addEventListener('click', openSettingsModal);
  EL.modalClose.addEventListener('click', closeSettingsModal);
  EL.settingsModal.addEventListener('click', e => { if (e.target === EL.settingsModal) closeSettingsModal(); });
  EL.autoplayCb.addEventListener('change', () => EL.durationLabel.classList.toggle('hidden', !EL.autoplayCb.checked));
  EL.gestureCb.addEventListener('change', () => EL.gestureDurLabel.classList.toggle('hidden', !EL.gestureCb.checked));

  EL.modalSave.addEventListener('click', async () => {
    const duration = parseInt(EL.durationInput.value, 10);
    if (EL.autoplayCb.checked && (isNaN(duration) || duration < 5)) { EL.durationError.classList.remove('hidden'); return; }
    EL.durationError.classList.add('hidden');
    await saveSettings({
      medium: EL.mediumSelect.value,
      category: EL.categorySelect.value,
      autoplay: EL.autoplayCb.checked,
      autoplayTime: duration || 10,
      gestureEnabled: EL.gestureCb.checked,
      gestureDuration: parseInt(EL.gestureDurSelect.value, 10),
    });
    closeSettingsModal(); onSettingsSave();
  });

  EL.modalReset.addEventListener('click', async () => { await resetFilters(); closeSettingsModal(); onSettingsReset(); });

  EL.exportBtn.addEventListener('click', async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `refstation-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showDownloadToast('✓ Data exported');
  });

  EL.importBtn.addEventListener('click', () => EL.importFile.click());
  EL.importFile.addEventListener('change', async () => {
    const file = EL.importFile.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAllDataReplace(parsed);
      showDownloadToast('✓ Data imported');
      onImportDone?.();
    } catch {
      showErrorToast('Invalid backup file');
    } finally {
      EL.importFile.value = '';
    }
  });

  EL.noResultsClose.addEventListener('click', () => EL.noResultsModal.classList.add('hidden'));
  EL.noResultsOk.addEventListener('click', async () => { EL.noResultsModal.classList.add('hidden'); await resetFilters(); onSettingsReset(); });
}

export function initClickOutside() {
  document.addEventListener('click', (e) => {
    if (!EL.historyContainer.classList.contains('hidden') && !EL.historyContainer.contains(e.target) && e.target !== EL.historyOpenBtn) closeHistoryDrawer();
    if (!EL.favContainer.classList.contains('hidden') && !EL.favContainer.contains(e.target) && e.target !== EL.favoritesOpenBtn) closeFavoritesDrawer();
    if (!EL.notePanel.classList.contains('hidden') && !EL.notePanel.contains(e.target) && e.target !== EL.noteBtn) closeNotePanel();
  });
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}