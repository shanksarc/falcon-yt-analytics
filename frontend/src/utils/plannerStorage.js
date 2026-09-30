// Planner storage & client-side synchronization utility
// Ensures planned videos are instantly visible (optimistic UI) and persist across Vercel cold starts / multi-container serverless instances.

const STORAGE_KEY = 'falcon_custom_planned_videos';

/**
 * Retrieve custom planned videos stored in localStorage.
 */
export function getLocalPlannedVideos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to read local planned videos:', e);
    return [];
  }
}

/**
 * Save or update a planned video in localStorage.
 */
export function saveLocalPlannedVideo(video) {
  if (!video || !video.id) return;
  try {
    const current = getLocalPlannedVideos();
    const existingIdx = current.findIndex(v => v.id === video.id);
    let updated;
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = { ...updated[existingIdx], ...video, updated_at: new Date().toISOString() };
    } else {
      updated = [{ ...video, created_at: video.created_at || new Date().toISOString() }, ...current];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('falcon_planner_updated', { detail: { video, action: 'save' } }));
  } catch (e) {
    console.warn('Failed to save local planned video:', e);
  }
}

/**
 * Remove a planned video from localStorage.
 */
export function removeLocalPlannedVideo(videoId) {
  if (!videoId) return;
  try {
    const current = getLocalPlannedVideos();
    const filtered = current.filter(v => v.id !== videoId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('falcon_planner_updated', { detail: { videoId, action: 'delete' } }));
  } catch (e) {
    console.warn('Failed to remove local planned video:', e);
  }
}

/**
 * Merges server videos with locally stored videos.
 * Guarantees that any video planned in the online app is immediately present,
 * even if the server is an ephemeral Vercel lambda.
 */
export function mergePlannedVideos(serverVideos = [], localVideos = []) {
  const serverArr = Array.isArray(serverVideos) ? serverVideos : [];
  const localArr = Array.isArray(localVideos) ? localVideos : [];
  
  const map = new Map();
  
  // First insert all server videos
  serverArr.forEach(v => {
    if (v && v.id) map.set(v.id, v);
  });
  
  // Then overlay local videos that aren't on the server yet or have newer local updates
  localArr.forEach(v => {
    if (v && v.id) {
      if (!map.has(v.id)) {
        map.set(v.id, v);
      } else {
        // If local is present on server, check if local has more recent updates
        const serverItem = map.get(v.id);
        const serverTime = serverItem.updated_at ? new Date(serverItem.updated_at).getTime() : 0;
        const localTime = v.updated_at ? new Date(v.updated_at).getTime() : 0;
        if (localTime > serverTime) {
          map.set(v.id, { ...serverItem, ...v });
        }
      }
    }
  });

  // Sort by created_at descending
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Background sync: syncs locally saved videos to the backend server
 * so server endpoints (progress analytics, review queue, etc.) know about them.
 */
export async function syncLocalVideosToServer(serverVideos = []) {
  const local = getLocalPlannedVideos();
  if (local.length === 0) return;

  const serverIds = new Set((serverVideos || []).map(v => v.id));
  const missingOnServer = local.filter(v => !serverIds.has(v.id));

  if (missingOnServer.length === 0) return;

  try {
    // Try bulk client sync endpoint first
    const syncRes = await fetch('/api/planner/sync-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videos: missingOnServer })
    });

    if (!syncRes.ok) {
      // Fallback: send individual items if sync-client endpoint not available
      for (const item of missingOnServer) {
        await fetch('/api/planner/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            session_id: item.session_id || null,
            list_ids: (item.lists || []).map(l => l.id || l),
            status: item.status || 'Planned',
            assigned_month: item.assigned_month || null,
            assigned_week: item.assigned_week || null,
            notes: item.notes || '',
            content_type: item.content_type || 'video',
            hook: item.hook || '',
            series: item.series || '',
            target_duration_sec: item.target_duration_sec || 60,
            production_stage: item.production_stage || 'Idea',
            is_urgent: item.is_urgent ? 1 : 0
          })
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.debug('Background sync notice:', err);
  }
}
