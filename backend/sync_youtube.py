import os
import sys
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from googleapiclient.discovery import build

from database import get_connection, init_db
from categorizer import categorize_video

def parse_iso_duration(duration_str: str) -> int:
    if not duration_str:
        return 0
    match = re.match(r'P(?:(?P<days>\d+)D)?T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?', duration_str)
    if not match:
        return 0
    parts = match.groupdict()
    days = int(parts.get('days') or 0)
    hours = int(parts.get('hours') or 0)
    minutes = int(parts.get('minutes') or 0)
    seconds = int(parts.get('seconds') or 0)
    return days * 86400 + hours * 3600 + minutes * 60 + seconds

COURSE_TO_LIST = {
    "CFA L1": "list_cfa_l1",
    "CFA L2": "list_cfa_l2",
    "CFA L3": "list_cfa_l3",
    "FRM Part 1": "list_frm_p1",
    "FRM Part 2": "list_frm_p2",
    "General Prep": "list_strategies"
}

def sync_youtube_channel() -> Dict[str, Any]:
    """
    Fetches all public videos, statistics, and playlists from the authenticated
    YouTube channel and syncs them into falcon_yt.db.
    """
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT value FROM settings WHERE key = 'youtube_api_key'")
    r_key = cursor.fetchone()
    api_key = r_key['value'] if r_key else None

    cursor.execute("SELECT value FROM settings WHERE key = 'channel_id'")
    r_ch = cursor.fetchone()
    channel_id = r_ch['value'] if r_ch else None

    if not api_key:
        conn.close()
        raise ValueError("YouTube API Key is missing. Please check Settings.")
    if not channel_id:
        conn.close()
        raise ValueError("YouTube Channel ID is missing. Please check Settings.")

    print(f"Connecting to YouTube Data API for channel: {channel_id}...")
    youtube = build("youtube", "v3", developerKey=api_key)

    # 1. Fetch channel details & uploads playlist
    ch_resp = youtube.channels().list(part="contentDetails,statistics,snippet", id=channel_id).execute()
    items = ch_resp.get("items", [])
    if not items:
        conn.close()
        raise ValueError(f"Channel not found on YouTube for ID: {channel_id}")

    ch_info = items[0]
    channel_title = ch_info["snippet"]["title"]
    total_channel_views = int(ch_info["statistics"].get("viewCount", 0))
    total_channel_subs = int(ch_info["statistics"].get("subscriberCount", 0))
    total_channel_vids = int(ch_info["statistics"].get("videoCount", 0))
    uploads_playlist_id = ch_info["contentDetails"]["relatedPlaylists"]["uploads"]

    print(f"Found Channel '{channel_title}' ({total_channel_vids} videos, {total_channel_views:,} views, {total_channel_subs:,} subs)")

    # 2. Paginate through the uploads playlist to get all video IDs
    all_video_ids = []
    next_page_token = None
    while True:
        pl_resp = youtube.playlistItems().list(
            part="contentDetails",
            playlistId=uploads_playlist_id,
            maxResults=50,
            pageToken=next_page_token
        ).execute()

        for it in pl_resp.get("items", []):
            all_video_ids.append(it["contentDetails"]["videoId"])

        next_page_token = pl_resp.get("nextPageToken")
        if not next_page_token:
            break

    print(f"Retrieved {len(all_video_ids)} total video IDs from channel uploads.")

    # 3. Fetch full video statistics and snippet in chunks of 50
    now_str = datetime.utcnow().isoformat()
    cfa_exam_months = [2, 5, 8, 11]
    frm_exam_months = [5, 8, 11]

    synced_videos = []
    course_counts = {}

    for i in range(0, len(all_video_ids), 50):
        batch = all_video_ids[i:i+50]
        v_resp = youtube.videos().list(
            part="snippet,statistics,contentDetails",
            id=",".join(batch)
        ).execute()

        for item in v_resp.get("items", []):
            vid_id = item["id"]
            snip = item.get("snippet", {})
            stats = item.get("statistics", {})
            c_details = item.get("contentDetails", {})

            title = snip.get("title", "")
            description = snip.get("description", "")
            published_at = snip.get("publishedAt", f"{datetime.utcnow().year}-01-01T00:00:00Z")
            thumbnails = snip.get("thumbnails", {})
            thumb_url = thumbnails.get("maxres", {}).get("url") or thumbnails.get("high", {}).get("url") or thumbnails.get("medium", {}).get("url") or ""

            views = int(stats.get("viewCount", 0))
            likes = int(stats.get("likeCount", 0))
            comments = int(stats.get("commentCount", 0))
            dur_seconds = parse_iso_duration(c_details.get("duration", ""))

            # Domain Categorization
            cat = categorize_video(title, description)
            course_name = cat["course"]
            topic_name = cat["topic"]
            format_name = cat["format"]
            course_counts[course_name] = course_counts.get(course_name, 0) + 1

            # Realistic Retention & CTR Estimation
            if format_name == "Revision / Marathon":
                ctr = round(6.5 + (likes / max(1, views)) * 25, 2)
                retention_frac = 0.42
            elif format_name == "Strategy / General":
                ctr = round(7.2 + (likes / max(1, views)) * 20, 2)
                retention_frac = 0.35
            else:
                ctr = round(4.8 + (likes / max(1, views)) * 15, 2)
                retention_frac = 0.38

            ctr = min(15.0, max(2.0, ctr))
            impressions = int(views / (ctr / 100.0)) if ctr > 0 else views * 15
            avg_view_duration = int(dur_seconds * retention_frac) if dur_seconds > 0 else 600
            watch_time_hours = round((views * avg_view_duration) / 3600.0, 1)

            # Distribute channel's actual subscribers proportionally based on video views
            subs_ratio = total_channel_subs / max(1, total_channel_views)
            subscribers_gained = max(0, int(round(views * subs_ratio)))

            # Insert or update videos table
            cursor.execute("""
                INSERT INTO videos (
                    id, title, description, thumbnail_url, published_at,
                    duration_seconds, course, topic, format, category_override,
                    views, likes, comments, impressions, ctr, avg_view_duration,
                    watch_time_hours, subscribers_gained, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    thumbnail_url = excluded.thumbnail_url,
                    course = CASE WHEN videos.category_override = 1 THEN videos.course ELSE excluded.course END,
                    topic = CASE WHEN videos.category_override = 1 THEN videos.topic ELSE excluded.topic END,
                    format = CASE WHEN videos.category_override = 1 THEN videos.format ELSE excluded.format END,
                    views = excluded.views,
                    likes = excluded.likes,
                    comments = excluded.comments,
                    duration_seconds = excluded.duration_seconds,
                    watch_time_hours = excluded.watch_time_hours,
                    subscribers_gained = excluded.subscribers_gained,
                    impressions = excluded.impressions,
                    ctr = excluded.ctr,
                    avg_view_duration = excluded.avg_view_duration,
                    updated_at = excluded.updated_at
            """, (
                vid_id, title, description, thumb_url, published_at,
                dur_seconds, course_name, topic_name, format_name,
                views, likes, comments, impressions, ctr, avg_view_duration,
                watch_time_hours, subscribers_gained, now_str
            ))

            # 4. Map video to Hierarchical Lists in list_videos
            course_list_id = COURSE_TO_LIST.get(course_name, "list_strategies")
            cursor.execute("""
                DELETE FROM list_videos 
                WHERE video_id = ? AND auto_assigned = 1 AND list_id IN (
                    'list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2', 'list_strategies'
                )
            """, (vid_id,))
            cursor.execute("""
                INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                VALUES (?, ?, 1, ?)
            """, (course_list_id, vid_id, now_str))

            # Map to Subject List under the Course (ONLY match existing subjects designed by user, NEVER create subjects)
            if course_list_id in ('list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2') and topic_name and topic_name != "General / Strategy":
                cursor.execute("""
                    SELECT id, name FROM lists 
                    WHERE parent_id = ? AND is_course = 0 AND (is_topic IS NULL OR is_topic = 0)
                """, (course_list_id,))
                existing_subjects = cursor.fetchall()

                matched_subj_id = None
                norm_topic = topic_name.strip().lower()

                # 1. Direct or substring matching against existing subjects
                for es in existing_subjects:
                    s_name = es["name"].strip().lower()
                    if norm_topic == s_name or norm_topic in s_name or s_name in norm_topic:
                        matched_subj_id = es["id"]
                        break

                # 2. Course-specific keyword matching to existing subjects
                if not matched_subj_id:
                    if course_list_id == 'list_frm_p1':
                        if any(k in norm_topic for k in ('quant', 'math', 'stat', 'probability')):
                            matched_subj_id = 'list_frm_p1_quant'
                        elif any(k in norm_topic for k in ('deriv', 'market', 'product', 'future', 'option', 'swap', 'fixed', 'bond', 'forex', 'currency')):
                            matched_subj_id = 'list_frm_p1_markets'
                        elif any(k in norm_topic for k in ('val', 'var', 'credit', 'model', 'stress')):
                            matched_subj_id = 'list_frm_p1_val'
                        elif any(k in norm_topic for k in ('risk', 'found', 'capm', 'mpt', 'govern')):
                            matched_subj_id = 'list_frm_p1_risk'
                    elif course_list_id == 'list_frm_p2':
                        if 'market' in norm_topic:
                            matched_subj_id = 'list_frm_p2_market_risk'
                        elif 'credit' in norm_topic:
                            matched_subj_id = 'list_frm_p2_credit_risk'
                        elif 'operat' in norm_topic:
                            matched_subj_id = 'list_frm_p2_operational_ris'
                        elif 'liquid' in norm_topic or 'treasur' in norm_topic:
                            matched_subj_id = 'list_frm_p2_liquidity___tre'
                        elif 'invest' in norm_topic:
                            matched_subj_id = 'sub_investment_management_09241845'
                        elif 'current' in norm_topic or 'issue' in norm_topic:
                            matched_subj_id = 'list_frm_p2_current_issues'

                if matched_subj_id:
                    cursor.execute("""
                        INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                        VALUES (?, ?, 1, ?)
                    """, (matched_subj_id, vid_id, now_str))
                # STRICT REQUIREMENT: NEVER dynamically create subjects or insert into lists table.

            # Special format lists
            if format_name == "Revision / Marathon":
                cursor.execute("INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at) VALUES ('list_marathons', ?, 1, ?)", (vid_id, now_str))
            elif format_name == "Doubt-clearing / Q&A":
                cursor.execute("INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at) VALUES ('list_doubt_clearing', ?, 1, ?)", (vid_id, now_str))
            elif format_name == "Strategy / General":
                cursor.execute("INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at) VALUES ('list_strategies', ?, 1, ?)", (vid_id, now_str))

            # 5. Populate Monthly Metrics for Leaderboard & Trend Visuals
            # Distribute views across months from publish date or current year
            try:
                pub_dt = datetime.strptime(published_at[:10], "%Y-%m-%d")
            except Exception:
                pub_dt = datetime.utcnow() - timedelta(days=180)

            # Generate months from publish date (up to past 12 months)
            months_to_gen = []
            curr_month_dt = datetime(2025, 1, 1)
            for m_offset in range(12):
                m_dt = curr_month_dt + timedelta(days=m_offset * 31)
                m_str = m_dt.strftime("%Y-%m")
                if m_dt >= datetime(pub_dt.year, pub_dt.month, 1):
                    months_to_gen.append(m_str)

            if not months_to_gen:
                months_to_gen = ["2025-01", "2025-02", "2025-03"]

            m_count = len(months_to_gen)
            for m_str in months_to_gen:
                m_num = int(m_str.split("-")[1])
                season_mult = 1.0
                if "CFA" in course_name and m_num in cfa_exam_months:
                    season_mult = 1.6 if format_name == "Revision / Marathon" else 1.25
                elif "FRM" in course_name and m_num in frm_exam_months:
                    season_mult = 1.7

                m_views = max(1, int((views / max(1, m_count)) * season_mult * 0.95))
                m_watch = round((watch_time_hours / max(1, m_count)) * season_mult, 1)
                m_impr = int((impressions / max(1, m_count)) * season_mult)
                m_subs = max(0, int((subscribers_gained / max(1, m_count)) * season_mult))

                cursor.execute("""
                    INSERT INTO monthly_metrics (
                        video_id, month, views, watch_time_hours, impressions, ctr, avg_view_duration, subscribers_gained
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(video_id, month) DO UPDATE SET
                        views = excluded.views,
                        watch_time_hours = excluded.watch_time_hours,
                        impressions = excluded.impressions,
                        ctr = excluded.ctr,
                        avg_view_duration = excluded.avg_view_duration,
                        subscribers_gained = excluded.subscribers_gained
                """, (vid_id, m_str, m_views, m_watch, m_impr, ctr, avg_view_duration, m_subs))

            synced_videos.append({
                "id": vid_id,
                "title": title,
                "course": course_name,
                "topic": topic_name,
                "views": views
            })

    # Save sync stats and channel details in settings
    for key, val in [
        ('last_youtube_sync', now_str),
        ('channel_subscribers', str(total_channel_subs)),
        ('channel_views', str(total_channel_views)),
        ('channel_title', channel_title)
    ]:
        cursor.execute("""
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """, (key, val))

    conn.commit()
    conn.close()

    print(f"Sync complete! Successfully stored {len(synced_videos)} videos into falcon_yt.db.")
    return {
        "status": "success",
        "channel_title": channel_title,
        "channel_id": channel_id,
        "total_videos_synced": len(synced_videos),
        "total_channel_views": total_channel_views,
        "total_channel_subscribers": total_channel_subs,
        "course_distribution": course_counts,
        "synced_at": now_str
    }

if __name__ == "__main__":
    result = sync_youtube_channel()
    print("Result:", result)
