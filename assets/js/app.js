/**
 * app.js — entry point
 */
import { fetchRandomProject, fetchOfflineProject, getProjectImages } from './api.js';
import {
  loadSettings, buildFilterQuery, addToHistory, getHistory, nextOfflineIndex,
  addFavorite, removeFavorite, isFavorite, getFavorites,
  getPinnedArtwork, setPinnedArtwork
} from './state.js';
import {
  renderProject, bindEvents, initIdleHandler, startClock,
  updateImageCounter, setAutoplayRingProgress, setAutoplayIcon,
  showErrorToast, setFavoriteBtn, openNotePanel, showGestureTimer,
  updateGestureDisplay, initClickOutside, setPinUI, EL
} from './ui.js';

let settings = {};
let filterQuery = '';
let currentProject = null;
let navOffset = 0;
let currentImages = [];
let currentImgIndex = 0;
// Viewer mode (history/favorites sequence browsing)
let viewerMode  = null;   // null | 'history' | 'favorites'
let viewerList  = [];
let viewerIndex = -1;
let autoplayTimer = null;
let autoplayPaused = false;
let autoplayTick = 0;
let gestureTimer = null;
let gestureRemaining = 0;
let isPinnedMode = false;

async function init() {
  settings = await loadSettings();
  filterQuery = buildFilterQuery(settings);

  startClock();
  initIdleHandler();
  initClickOutside();

  bindEvents({
    onNext: handleNext,
    onPrev: handlePrev,
    onImgNext: handleImgNext,
    onImgPrev: handleImgPrev,
    onHistoryItemClick: handleHistoryItemClick,
    onFavoriteItemClick: handleFavoriteItemClick,
    onAutoplayToggle: handleAutoplayToggle,
    onFavoriteToggle: handleFavoriteToggle,
    onPinToggle: handlePinToggle,
    onNoteOpen: () => currentProject && openNotePanel(currentProject.hash_id),
    onSettingsSave: () => window.location.reload(),
    onSettingsReset: () => window.location.reload(),
    onImportDone: () => window.location.reload()
  });

  const pinned = await getPinnedArtwork();
  if (pinned) {
    isPinnedMode = true;
    await displayProject(pinned);
    setPinUI(true);
  } else {
    await loadNextImage();
    setPinUI(false);
  }

  if (!isPinnedMode && settings.autoplay) startAutoplay();
  if (!isPinnedMode && settings.gestureEnabled) startGestureTimer();

  initKeyboardShortcuts();
}

async function loadNextImage() {
  viewerMode = null;
  viewerList = [];
  viewerIndex = -1;
  navOffset = 0;
  let project = navigator.onLine ? await fetchRandomProject(filterQuery) : null;
  if (!project) project = await loadOfflineImage();
  else await addToHistory(project);
  if (!project) return showErrorToast('Could not load any artwork. Please check your connection.');
  await displayProject(project);
}

async function loadOfflineImage() {
  try {
    const res = await fetch('offline/offline.json');
    const list = await res.json();
    if (!list.length) return null;
    const idx = await nextOfflineIndex(list.length);
    return await fetchOfflineProject(idx);
  } catch { return null; }
}

async function displayProject(project) {
  currentProject = project;
  currentImages = getProjectImages(project);
  currentImgIndex = 0;
  renderProject(project);
  updateImageCounter(0, currentImages.length);
  setFavoriteBtn(await isFavorite(project.hash_id));
}

function handleImgNext() {
  if (!currentImages.length) return;
  currentImgIndex = (currentImgIndex + 1) % currentImages.length;
  switchToImage(currentImgIndex);
}
function handleImgPrev() {
  if (!currentImages.length) return;
  currentImgIndex = (currentImgIndex - 1 + currentImages.length) % currentImages.length;
  switchToImage(currentImgIndex);
}
function switchToImage(index) {
  const asset = currentImages[index];
  if (!asset) return;
  EL.artwork.classList.remove('loaded');
  const img = new Image();
  img.onload = () => { EL.artwork.src = img.src; EL.artwork.classList.add('loaded'); };
  img.src = asset.large_image_url || asset.image_url;
  updateImageCounter(index, currentImages.length);
}

async function handleNext() {
  pauseAutoplay();
  resetGestureTimer();

  // If browsing selected History/Favorites list
  if (viewerMode) {
    if (viewerIndex < viewerList.length - 1) {
      viewerIndex++;
      await displayProject(viewerList[viewerIndex]);
      return;
    }

    // End reached -> leave viewer mode, continue normal flow
    viewerMode = null;
    viewerList = [];
    viewerIndex = -1;
  }

  if (navOffset <= 0) {
    await loadNextImage();
    return;
  }

  navOffset--;
  await navigateHistory();
}
async function handlePrev() {
  pauseAutoplay();
  resetGestureTimer();

  // If browsing selected History/Favorites list
  if (viewerMode) {
    if (viewerIndex > 0) {
      viewerIndex--;
      await displayProject(viewerList[viewerIndex]);
    } else {
      showErrorToast('Start of selected list.');
    }
    return;
  }

  navOffset++;
  await navigateHistory();
}
async function navigateHistory() {
  const history = await getHistory();
  const idx = history.length - 1 - navOffset;
  if (idx < 0) { navOffset = history.length - 1; return showErrorToast('No more history available.'); }
  await displayProject(history[idx]);
}

async function handleHistoryItemClick(hashId) {
  pauseAutoplay();

  viewerMode = 'history';
  viewerList = await getHistory();
  viewerIndex = viewerList.findIndex(p => p.hash_id === hashId);
  if (viewerIndex < 0) return;

  await displayProject(viewerList[viewerIndex]);
}
async function handleFavoriteItemClick(hashId) {
  pauseAutoplay();

  viewerMode = 'favorites';
  viewerList = await getFavorites();
  viewerIndex = viewerList.findIndex(p => p.hash_id === hashId);
  if (viewerIndex < 0) return;

  await displayProject(viewerList[viewerIndex]);
}
async function handleFavoriteToggle() {
  if (!currentProject) return;
  const already = await isFavorite(currentProject.hash_id);
  if (already) { await removeFavorite(currentProject.hash_id); setFavoriteBtn(false); }
  else { await addFavorite(currentProject); setFavoriteBtn(true); }
}

async function handlePinToggle() {
  if (!currentProject) return;
  if (isPinnedMode) {
    isPinnedMode = false;
    await setPinnedArtwork(null);
    setPinUI(false);
    if (settings.autoplay) startAutoplay();
    if (settings.gestureEnabled) startGestureTimer();
  } else {
    isPinnedMode = true;
    await setPinnedArtwork(currentProject);
    setPinUI(true);
    pauseAutoplay();
    stopGesture();
  }
}

const TICK_MS = 100;
function startAutoplay() {
  if (isPinnedMode) return;
  if (autoplayTimer) return;
  autoplayPaused = false; autoplayTick = 0;
  EL.autoplayWrap.classList.remove('hidden');
  setAutoplayIcon(true);
  const totalTicks = ((settings.autoplayTime || 10) * 1000) / TICK_MS;
  autoplayTimer = setInterval(async () => {
    if (autoplayPaused || isPinnedMode) return;
    autoplayTick++;
    setAutoplayRingProgress((autoplayTick / totalTicks) * 100);
    if (autoplayTick >= totalTicks) {
      autoplayTick = 0; setAutoplayRingProgress(0); await loadNextImage();
    }
  }, TICK_MS);
}
function pauseAutoplay() { autoplayPaused = true; setAutoplayIcon(false); }
function resumeAutoplay() { if (isPinnedMode) return; autoplayPaused = false; setAutoplayIcon(true); }
function handleAutoplayToggle() {
  if (isPinnedMode) return;
  if (!autoplayTimer) startAutoplay();
  else if (autoplayPaused) resumeAutoplay();
  else pauseAutoplay();
}

function startGestureTimer() {
  if (isPinnedMode) return;
  gestureRemaining = settings.gestureDuration || 30;
  showGestureTimer(gestureRemaining);
  gestureTimer = setInterval(async () => {
    if (isPinnedMode) return;
    gestureRemaining--;
    updateGestureDisplay(gestureRemaining);
    if (gestureRemaining <= 0) {
      stopGesture();
      await loadNextImage();
      startGestureTimer();
    }
  }, 1000);
}
function stopGesture() {
  clearInterval(gestureTimer);
  gestureTimer = null;
}
function resetGestureTimer() {
  if (!settings.gestureEnabled || isPinnedMode) return;
  stopGesture(); startGestureTimer();
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', async (e) => {
    const target = e.target;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (typing) return;

    if (e.key === 'ArrowLeft' && e.shiftKey) return handleImgPrev();
    if (e.key === 'ArrowRight' && e.shiftKey) return handleImgNext();
    if (e.key === 'ArrowLeft') return handlePrev();
    if (e.key === 'ArrowRight') return handleNext();

    const k = e.key.toLowerCase();
    if (k === 'f') return handleFavoriteToggle();
    if (k === 'd') return EL.downloadBtn?.click();
    if (k === 'n') return currentProject && openNotePanel(currentProject.hash_id);
    if (k === 'h') return EL.historyOpenBtn?.click();
    if (k === 'v') return EL.favoritesOpenBtn?.click();
    if (k === 'p') return handlePinToggle();
    if (k === 's') return EL.settingsBtn?.click();
  });
}

document.addEventListener('DOMContentLoaded', init);