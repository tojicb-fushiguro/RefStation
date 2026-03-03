/**
 * RefStation
 * Author: tojicb-fushiguro
 */
/**
 * state.js — storage, history, settings, favorites, notes, pin, import/export
 */

const HISTORY_MAX = 320;
const FAV_MAX = 200;
export const PAGE_SIZE = 8;

function storageGet(keys) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(keys, resolve);
    } else {
      const result = {};
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        try { result[key] = raw !== null ? JSON.parse(raw) : undefined; }
        catch { result[key] = raw; }
      }
      resolve(result);
    }
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set(obj, resolve);
    } else {
      for (const [k, v] of Object.entries(obj)) localStorage.setItem(k, JSON.stringify(v));
      resolve();
    }
  });
}

export async function loadSettings() {
  const data = await storageGet([
    'medium', 'category', 'autoplay', 'autoplay_time',
    'gesture_enabled', 'gesture_duration'
  ]);
  return {
    medium: data.medium ?? '',
    category: data.category ?? '',
    autoplay: data.autoplay ?? false,
    autoplayTime: data.autoplay_time ?? 10,
    gestureEnabled: data.gesture_enabled ?? false,
    gestureDuration: data.gesture_duration ?? 30,
  };
}

export async function saveSettings(s) {
  await storageSet({
    medium: s.medium,
    category: s.category,
    autoplay: s.autoplay,
    autoplay_time: s.autoplayTime,
    gesture_enabled: s.gestureEnabled,
    gesture_duration: s.gestureDuration,
  });
}

export async function resetFilters() { await storageSet({ medium: '', category: '' }); }

export function buildFilterQuery({ medium, category }) {
  const parts = [];
  if (medium && medium !== 'All Media') parts.push(`medium=${encodeURIComponent(medium.toLowerCase().replace(/\s/g, ''))}`);
  if (category && category !== 'All Subject Matter') parts.push(`category=${encodeURIComponent(category.toLowerCase().replace(/\s/g, ''))}`);
  return parts.join('&');
}

export async function getHistory() {
  const data = await storageGet(['history']);
  try { return Array.isArray(data.history) ? data.history : JSON.parse(data.history || '[]'); }
  catch { return []; }
}

export async function addToHistory(project) {
  const list = await getHistory();
  if (list.some(p => p.hash_id === project.hash_id)) return;
  if (list.length >= HISTORY_MAX) list.shift();
  list.push(project);
  await storageSet({ history: list });
}

export async function getHistoryPage(startIndex) {
  const list = await getHistory();
  const start = Math.max(0, startIndex);
  return { items: list.slice(start, start + PAGE_SIZE), total: list.length, start };
}

export async function getFavorites() {
  const data = await storageGet(['favorites']);
  try { return Array.isArray(data.favorites) ? data.favorites : JSON.parse(data.favorites || '[]'); }
  catch { return []; }
}

export async function addFavorite(project) {
  const list = await getFavorites();
  if (list.some(p => p.hash_id === project.hash_id)) return false;
  if (list.length >= FAV_MAX) list.shift();
  list.push(project);
  await storageSet({ favorites: list });
  return true;
}

export async function removeFavorite(hashId) {
  const list = await getFavorites();
  await storageSet({ favorites: list.filter(p => p.hash_id !== hashId) });
}

export async function isFavorite(hashId) {
  const list = await getFavorites();
  return list.some(p => p.hash_id === hashId);
}

export async function getFavoritesPage(startIndex) {
  const list = await getFavorites();
  const start = Math.max(0, startIndex);
  return { items: list.slice(start, start + PAGE_SIZE), total: list.length, start };
}

export async function getNotes() {
  const data = await storageGet(['notes']);
  try { return data.notes && typeof data.notes === 'object' ? data.notes : JSON.parse(data.notes || '{}'); }
  catch { return {}; }
}

export async function saveNote(hashId, text) {
  const notes = await getNotes();
  if (text.trim()) notes[hashId] = text.trim();
  else delete notes[hashId];
  await storageSet({ notes });
}

export async function getNote(hashId) {
  const notes = await getNotes();
  return notes[hashId] || '';
}

export async function nextOfflineIndex(total) {
  const data = await storageGet(['offline']);
  let idx = (typeof data.offline === 'number') ? data.offline + 1 : 0;
  if (idx >= total) idx = 0;
  await storageSet({ offline: idx });
  return idx;
}

// Pin
export async function getPinnedArtwork() {
  const data = await storageGet(['pinned_artwork']);
  return data.pinned_artwork || null;
}
export async function setPinnedArtwork(project) { await storageSet({ pinned_artwork: project || null }); }

// Export / Import
export async function exportAllData() {
  const data = await storageGet([
    'favorites', 'notes', 'history',
    'medium', 'category', 'autoplay', 'autoplay_time', 'gesture_enabled', 'gesture_duration',
    'pinned_artwork'
  ]);
  return {
    exportedAt: new Date().toISOString(),
    favorites: data.favorites || [],
    notes: data.notes || {},
    history: data.history || [],
    settings: {
      medium: data.medium ?? '',
      category: data.category ?? '',
      autoplay: data.autoplay ?? false,
      autoplay_time: data.autoplay_time ?? 10,
      gesture_enabled: data.gesture_enabled ?? false,
      gesture_duration: data.gesture_duration ?? 30
    },
    pinnedArtwork: data.pinned_artwork || null
  };
}

export async function importAllDataReplace(payload) {
  await storageSet({
    favorites: Array.isArray(payload.favorites) ? payload.favorites : [],
    notes: payload.notes && typeof payload.notes === 'object' ? payload.notes : {},
    history: Array.isArray(payload.history) ? payload.history : [],
    medium: payload.settings?.medium ?? '',
    category: payload.settings?.category ?? '',
    autoplay: payload.settings?.autoplay ?? false,
    autoplay_time: payload.settings?.autoplay_time ?? 10,
    gesture_enabled: payload.settings?.gesture_enabled ?? false,
    gesture_duration: payload.settings?.gesture_duration ?? 30,
    pinned_artwork: payload.pinnedArtwork || null
  });

}
