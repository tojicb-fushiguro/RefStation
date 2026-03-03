/**
 * api.js — fetch artwork from ArtStation; offline fallback.
 */

const BASE        = 'https://www.artstation.com';
const RANDOM_URL  = `${BASE}/api/v2/community/projects/random.json`;
const CATS_URL    = `${BASE}/categories.json`;
const MEDIUMS_URL = `${BASE}/mediums.json`;
const OFFLINE_URL = 'offline/offline.json';

async function fetchJSON(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRandomProject(filterQuery = '') {
  const url = filterQuery ? `${RANDOM_URL}?${filterQuery}` : RANDOM_URL;
  try {
    const data = await fetchJSON(url);
    if (!data || !data.assets) return null;
    return normaliseProject(data);
  } catch {
    return null;
  }
}

export async function fetchOfflineProject(index) {
  try {
    const list = await fetchJSON(OFFLINE_URL);
    if (!Array.isArray(list) || !list.length) return null;
    return normaliseOfflineItem(list[index % list.length], index);
  } catch {
    return null;
  }
}

export async function fetchFilterOptions() {
  const [categories, mediums] = await Promise.allSettled([
    fetchJSON(CATS_URL),
    fetchJSON(MEDIUMS_URL),
  ]);
  return {
    categories: categories.status === 'fulfilled' ? categories.value : [],
    mediums:    mediums.status    === 'fulfilled' ? mediums.value    : [],
  };
}

// Returns ALL image assets from a project (for multi-image)
export function getProjectImages(project) {
  return (project._rawAssets || []).filter(a => a.asset_type === 'image');
}

function normaliseProject(data) {
  const assets = data.assets || [];
  const imageAssets = assets.filter(a => a.asset_type === 'image');
  if (!imageAssets.length) return null;

  const first = imageAssets[0];
  return {
    hash_id:    data.hash_id || String(data.id),
    id:         data.id,
    title:      data.title   || 'Untitled',
    url:        data.url     || `${BASE}/artwork/${data.hash_id}`,
    imageUrl:   first.large_image_url || first.image_url,
    imageCount: imageAssets.length,
    _rawAssets: imageAssets,
    cover: {
      smaller_square_image_url:
        data.cover?.smaller_square_image_url || first.large_image_url,
    },
    user: {
      full_name:              data.user?.full_name              || 'Unknown Artist',
      artstation_profile_url: data.user?.artstation_profile_url || BASE,
      medium_avatar_url:      data.user?.medium_avatar_url      || 'assets/img/default_avatar.jpg',
    },
    offline: false,
  };
}

function normaliseOfflineItem(item, index) {
  const assets = Array.isArray(item.assets) ? item.assets : [];
  const imageAssets = assets.filter(a => a.asset_type === 'image');
  const first = imageAssets[0] || {};

  return {
    hash_id:    item.hash_id || `offline-${index}`,
    id:         item.id,
    title:      item.title   || 'Offline Artwork',
    url:        item.url     || '#',
    imageUrl:   first.large_image_url || item.cover?.smaller_square_image_url || '',
    imageCount: imageAssets.length || 1,
    _rawAssets: imageAssets,
    cover: {
      smaller_square_image_url:
        item.cover?.smaller_square_image_url || first.large_image_url || '',
    },
    user: {
      full_name:              item.user?.full_name              || 'Unknown Artist',
      artstation_profile_url: item.user?.artstation_profile_url || BASE,
      medium_avatar_url:      item.user?.medium_avatar_url      || 'assets/img/default_avatar.jpg',
    },
    offline: true,
  };
}