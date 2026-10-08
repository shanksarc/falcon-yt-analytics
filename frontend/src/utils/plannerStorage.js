// Planner storage & client-side synchronization utility
// Ensures planned videos are instantly visible (optimistic UI) and persist across Vercel cold starts / multi-container serverless instances.

const STORAGE_KEY = 'falcon_custom_planned_videos';
const DELETED_STORAGE_KEY = 'falcon_deleted_planned_video_ids';

/**
 * Retrieve set of video IDs that have been deleted by the user.
 * Persisting this in localStorage prevents ephemeral Vercel lambda containers
 * or cold-start bundled SQLite DBs from resurrecting deleted videos.
 */
export function getDeletedPlannedVideoIds() {
  try {
    const raw = localStorage.getItem(DELETED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    console.warn('Failed to read deleted planned video IDs:', e);
    return new Set();
  }
}

/**
 * Retrieve custom planned videos stored in localStorage.
 */
export function getLocalPlannedVideos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const deletedIds = getDeletedPlannedVideoIds();
    return (Array.isArray(parsed) ? parsed : []).filter(v => v && v.id && !deletedIds.has(v.id));
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
    // If previously marked deleted, unmark it because user explicitly recreated/saved it
    const deletedSet = getDeletedPlannedVideoIds();
    if (deletedSet.has(video.id)) {
      deletedSet.delete(video.id);
      localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(Array.from(deletedSet)));
    }

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
    window.dispatchEvent(new CustomEvent('falcon_planner_updated', { detail: { video, videoId: video.id, action: 'save' } }));
  } catch (e) {
    console.warn('Failed to save local planned video:', e);
  }
}

/**
 * Permanently remove a planned video and record it in the persistent deleted registry.
 */
export function removeLocalPlannedVideo(videoId) {
  if (!videoId) return;
  try {
    // 1. Record ID in persistent deleted registry so server responses won't resurrect it
    const deletedSet = getDeletedPlannedVideoIds();
    deletedSet.add(videoId);
    localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(Array.from(deletedSet)));

    // 2. Remove from active local videos list
    const current = getLocalPlannedVideos();
    const filtered = current.filter(v => v.id !== videoId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    // 3. Dispatch planner update event with deletion details
    window.dispatchEvent(new CustomEvent('falcon_planner_updated', { detail: { videoId, action: 'delete' } }));
  } catch (e) {
    console.warn('Failed to remove local planned video:', e);
  }
}

/**
 * Merges server videos with locally stored videos.
 * Guarantees that any video planned in the online app is immediately present,
 * and crucially ensures that ANY deleted video is NEVER resurrected.
 */
export function mergePlannedVideos(serverVideos = [], localVideos = []) {
  const serverArr = Array.isArray(serverVideos) ? serverVideos : [];
  const localArr = Array.isArray(localVideos) ? localVideos : [];
  const deletedIds = getDeletedPlannedVideoIds();
  
  const map = new Map();
  
  // 1. Insert server videos that have NOT been deleted by the user
  serverArr.forEach(v => {
    if (v && v.id && !deletedIds.has(v.id)) {
      map.set(v.id, v);
    }
  });
  
  // 2. Overlay local videos that aren't on the server yet or have newer local updates
  localArr.forEach(v => {
    if (v && v.id && !deletedIds.has(v.id)) {
      if (!map.has(v.id)) {
        map.set(v.id, v);
      } else {
        const serverItem = map.get(v.id);
        const serverTime = serverItem.updated_at ? new Date(serverItem.updated_at).getTime() : 0;
        const localTime = v.updated_at ? new Date(v.updated_at).getTime() : 0;
        if (localTime > serverTime) {
          map.set(v.id, { ...serverItem, ...v });
        }
      }
    }
  });

  // 3. Sort by created_at descending
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Background sync: syncs locally saved videos to the backend server
 * and propagates deleted video IDs so serverless instances purge them from /tmp DB.
 */
export async function syncLocalVideosToServer(serverVideos = []) {
  const local = getLocalPlannedVideos();
  const deletedIds = Array.from(getDeletedPlannedVideoIds());

  const serverMap = new Map((serverVideos || []).map(v => [v.id, v]));
  const missingOnServer = local.filter(v => !serverMap.has(v.id));

  // Find videos that exist on server but have a newer local update
  // (critical for linked_video_id / status changes surviving cold-starts)
  const staleOnServer = local.filter(v => {
    if (!serverMap.has(v.id)) return false;
    const serverItem = serverMap.get(v.id);
    const serverTime = serverItem.updated_at ? new Date(serverItem.updated_at).getTime() : 0;
    const localTime = v.updated_at ? new Date(v.updated_at).getTime() : 0;
    // Only re-sync if local is newer AND has meaningful link/status changes
    return localTime > serverTime && (
      v.linked_video_id !== serverItem.linked_video_id ||
      v.status !== serverItem.status
    );
  });

  // If nothing to sync or purge, return early
  if (missingOnServer.length === 0 && deletedIds.length === 0 && staleOnServer.length === 0) return;

  try {
    // Call bulk client sync endpoint with missing videos, deleted IDs, and stale updates
    const syncRes = await fetch('/api/planner/sync-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videos: missingOnServer,
        deleted_ids: deletedIds,
        link_updates: staleOnServer.map(v => ({
          id: v.id,
          linked_video_id: v.linked_video_id || null,
          status: v.status,
          production_stage: v.production_stage,
          updated_at: v.updated_at
        }))
      })
    });

    if (!syncRes.ok && missingOnServer.length > 0) {
      // Fallback: send individual items if sync-client endpoint has an issue
      for (const item of missingOnServer) {
        if (deletedIds.includes(item.id)) continue;
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
