from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json
import re
import os

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

from database import init_db, get_connection
from categorizer import COURSES, TOPICS, FORMATS, categorize_video
from analytics_engine import (
    get_monthly_leaderboard,
    get_low_ctr_triage,
    get_change_log_analysis,
    calculate_change_impact,
    get_competitor_analysis,
    get_exam_seasonality,
    get_channel_summary,
    get_12m_yoy_trend,
    get_all_lists_overview,
    get_list_detail,
    get_video_detail,
    get_upload_planner_overview,
    get_session_details,
    get_planned_videos_filtered,
    run_auto_matching,
    get_review_queue,
    validate_planner_entries,
    get_session_progress_analytics,
    get_shorts_overview,
    get_syllabus_grid_data,
    toggle_topic_format_na,
    create_flat_topics,
    create_grouped_topics,
    create_single_topic,
    delete_topic,
    plan_topic_formats,
    run_topic_video_matching,
    get_topic_match_queue,
    confirm_topic_match,
    reject_topic_match,
    manual_link_topic_video,
    get_all_videos_reverse_match,
    reassign_video_topic,
    unlink_video_topic,
    get_all_syllabus_topics_flat,
    natural_sort_key
)
from seed_data import generate_seed_data
from youtube_client import YouTubeClient

init_db()

# Auto-seed sample CFA/FRM dataset if freshly deployed database is empty
try:
    _conn = get_connection()
    _cursor = _conn.cursor()
    _cursor.execute("SELECT COUNT(*) FROM videos")
    _count = _cursor.fetchone()[0]
    if _count == 0:
        print("Fresh database detected. Initializing CFA/FRM dataset...")
        generate_seed_data()
    _conn.close()
except Exception as _e:
    print(f"Startup database check notice: {_e}")

app = FastAPI(
    title="Falcon CFA/FRM YouTube Analytics API",
    version="2.0.0",
    description="Cross-video leaderboards, hierarchical list drill-downs, 12-month YoY comparisons, CTR triage, competitor benchmarks, and Upload Planner."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ADMIN_KEY = os.environ.get("FALCON_ADMIN_KEY", "")
REQUIRE_AUTH = os.environ.get("REQUIRE_AUTH", "false").lower() in ("true", "1", "yes")

@app.middleware("http")
async def verify_admin_key(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    
    # If REQUIRE_AUTH is true and request is hitting an API route
    if REQUIRE_AUTH and request.url.path.startswith("/api"):
        # Exclude Google OAuth routes and basic health status
        if not (request.url.path.startswith("/api/auth/google") or request.url.path == "/api/status"):
            provided_key = request.headers.get("x-admin-key") or request.query_params.get("admin_key")
            if not ADMIN_KEY or provided_key != ADMIN_KEY:
                return JSONResponse(status_code=401, content={"detail": "Unauthorized: Invalid or missing Falcon Admin Key"})
    
    return await call_next(request)

yt_client = YouTubeClient()

# Request Models
class ChangeLogCreate(BaseModel):
    video_id: str
    change_date: str
    change_type: str
    old_title: Optional[str] = ""
    new_title: Optional[str] = ""
    old_thumbnail: Optional[str] = ""
    new_thumbnail: Optional[str] = ""
    notes: Optional[str] = ""
    ctr_before_14d: float
    ctr_after_14d: float
    channel_ctr_before_14d: float
    channel_ctr_after_14d: float
    views_before_14d: Optional[int] = 0
    views_after_14d: Optional[int] = 0

class VideoCategorizeUpdate(BaseModel):
    course: str
    topic: str
    format: str

class SettingsUpdate(BaseModel):
    youtube_api_key: Optional[str] = None
    channel_id: Optional[str] = None
    oauth_client_id: Optional[str] = None
    oauth_client_secret: Optional[str] = None
    manual_channel_subscribers: Optional[int] = None

class CompetitorCreate(BaseModel):
    name: str
    channel_handle: str
    subscriber_count: int = 10000
    video_count: int = 50
    total_views: int = 1000000
    avatar_url: Optional[str] = ""

class ListCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None
    description: Optional[str] = ""
    is_course: Optional[int] = 0

class PinnedListsUpdate(BaseModel):
    pinned_ids: List[str]

class AddVideoToList(BaseModel):
    video_id: str

class VideoListsUpdate(BaseModel):
    list_ids: List[str]

# Upload Planner Models
class CourseCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class SubjectCreate(BaseModel):
    name: str
    parent_id: str
    description: Optional[str] = ""

class SubjectBulkCreate(BaseModel):
    parent_id: str
    names: List[str]
    description: Optional[str] = ""

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None
    description: Optional[str] = None

class CourseTargetItem(BaseModel):
    course_id: str
    target_count: int

class SessionCreate(BaseModel):
    name: str
    start_date: str
    end_date: str
    course_targets: Optional[List[CourseTargetItem]] = None

class SessionUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[int] = None
    course_targets: Optional[List[CourseTargetItem]] = None

class TargetSet(BaseModel):
    session_id: Optional[str] = None
    list_id: str
    target_count: int

class TargetHierarchyItem(BaseModel):
    list_id: str
    target_count: int

class HierarchyTargetSave(BaseModel):
    session_id: Optional[str] = None
    total_target: int
    targets: List[TargetHierarchyItem]
    mode: Optional[str] = "replace"  # "replace" | "add"

class BulkStatusRequest(BaseModel):
    video_ids: List[str]
    status: str
    scheduled_date: Optional[str] = None
    session_id: Optional[str] = None

class BulkDeleteRequest(BaseModel):
    video_ids: List[str]

class LinkVideoPayload(BaseModel):
    video_id: Optional[str] = None
    youtube_url: Optional[str] = None

class RawPlannerEntry(BaseModel):
    course_text: Optional[str] = ""
    subject_text: Optional[str] = ""
    video_name: str
    session_text: Optional[str] = ""
    id: Optional[str] = None

class BulkCreateItem(BaseModel):
    title: str
    course_id: Optional[str] = None
    subject_id: Optional[str] = None
    list_ids: Optional[List[str]] = []
    session_id: Optional[str] = None
    status: Optional[str] = "Planned"
    assigned_month: Optional[str] = None
    assigned_week: Optional[str] = None
    notes: Optional[str] = ""
    content_type: Optional[str] = "video"
    hook: Optional[str] = ""
    series: Optional[str] = ""
    target_duration_sec: Optional[int] = 60
    production_stage: Optional[str] = "Idea"

class PlannedVideoCreate(BaseModel):
    title: str
    session_id: Optional[str] = None
    list_ids: Optional[List[str]] = []
    status: Optional[str] = "Planned"
    assigned_month: Optional[str] = None
    assigned_week: Optional[str] = None
    notes: Optional[str] = ""
    content_type: Optional[str] = "video"
    hook: Optional[str] = ""
    series: Optional[str] = ""
    target_duration_sec: Optional[int] = 60
    production_stage: Optional[str] = "Idea"

class PlannedVideoUpdate(BaseModel):
    title: Optional[str] = None
    session_id: Optional[str] = None
    list_ids: Optional[List[str]] = None
    status: Optional[str] = None
    assigned_month: Optional[str] = None
    assigned_week: Optional[str] = None
    linked_video_id: Optional[str] = None
    notes: Optional[str] = None
    content_type: Optional[str] = None
    hook: Optional[str] = None
    series: Optional[str] = None
    target_duration_sec: Optional[int] = None
    production_stage: Optional[str] = None

class ShortsTargetUpdate(BaseModel):
    session_id: str
    shorts_target: int

# -------------------------------------------------------------
# Section 01: Channel Summary & System Status
# -------------------------------------------------------------

@app.get("/api/status")
def get_system_status():
    summary = get_channel_summary()
    auth = yt_client.get_auth_status()
    last_sync = yt_client.get_setting("last_youtube_sync")
    return {
        "status": "online",
        "channel_name": "Falcon Edufin" if auth["has_api_key"] else "Falcon EduFin (CFA & FRM Prep)",
        "channel_id": auth["channel_id"],
        "demo_mode": False if auth["has_api_key"] else auth["demo_mode"],
        "has_api_key": auth["has_api_key"],
        "has_oauth": auth["has_oauth"],
        "last_youtube_sync": last_sync,
        "summary": summary,
        "supported_courses": COURSES,
        "supported_topics": TOPICS,
        "supported_formats": FORMATS,
    }

@app.get("/api/channel/summary")
def get_summary_endpoint():
    return get_channel_summary()

@app.get("/api/channel/yoy-trend")
def get_channel_yoy_trend():
    return get_12m_yoy_trend(scope_type="channel")

# -------------------------------------------------------------
# Sections 02 & 03: Hierarchical Lists & Drill-Down Views
# -------------------------------------------------------------

@app.get("/api/lists")
def get_lists():
    return get_all_lists_overview()

@app.post("/api/lists")
def create_new_list(payload: ListCreate):
    conn = get_connection()
    cursor = conn.cursor()
    lid = f"list_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    cursor.execute("""
        INSERT INTO lists (id, name, parent_id, description, is_course, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (lid, payload.name, payload.parent_id if payload.parent_id else None, payload.description or "", payload.is_course or 0, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return {"status": "success", "id": lid, "name": payload.name}

@app.get("/api/lists/{list_id}/details")
def get_list_details_endpoint(list_id: str):
    detail = get_list_detail(list_id)
    if not detail:
        raise HTTPException(status_code=404, detail="List not found")
    return detail

@app.post("/api/lists/{list_id}/videos")
def add_video_to_list(list_id: str, payload: AddVideoToList):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
        VALUES (?, ?, 0, ?)
    """, (list_id, payload.video_id, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/lists/{list_id}/videos/{video_id}")
def remove_video_from_list(list_id: str, video_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM list_videos WHERE list_id = ? AND video_id = ?", (list_id, video_id))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/videos/{video_id}/details")
def get_video_details_endpoint(video_id: str):
    detail = get_video_detail(video_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Video not found")
    return detail

@app.get("/api/videos/{video_id}/lists")
def get_video_lists(video_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT list_id FROM list_videos WHERE video_id = ?", (video_id,))
    assigned = [r["list_id"] for r in cursor.fetchall()]
    cursor.execute("SELECT id, name, parent_id, is_course FROM lists ORDER BY is_course DESC, name ASC")
    all_lists = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT title, course, topic FROM videos WHERE id = ?", (video_id,))
    v_row = cursor.fetchone()
    conn.close()
    return {
        "video_id": video_id,
        "title": v_row["title"] if v_row else "",
        "assigned_list_ids": assigned,
        "all_lists": all_lists
    }

@app.post("/api/videos/{video_id}/lists")
def update_video_lists(video_id: str, payload: VideoListsUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM list_videos WHERE video_id = ?", (video_id,))
    for lid in payload.list_ids:
        cursor.execute("""
            INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
            VALUES (?, ?, 0, ?)
        """, (lid, video_id, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return {"status": "success", "video_id": video_id, "assigned_list_ids": payload.list_ids}

@app.get("/api/dashboard/pinned-lists")
def get_pinned_lists():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = 'pinned_dashboard_lists'")
    row = cursor.fetchone()
    conn.close()
    pinned = json.loads(row["value"]) if row and row["value"] else ["list_cfa_l1", "list_frm_p1", "list_marathons", "list_cfa_l1_fi"]
    return {"pinned_ids": pinned}

@app.post("/api/dashboard/pinned-lists")
def update_pinned_lists(payload: PinnedListsUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO settings (key, value) VALUES ('pinned_dashboard_lists', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (json.dumps(payload.pinned_ids),))
    conn.commit()
    conn.close()
    return {"status": "success", "pinned_ids": payload.pinned_ids}

# -------------------------------------------------------------
# Existing Leaderboard, Low-CTR, Change-Log, Competitors, Settings
# -------------------------------------------------------------

@app.get("/api/leaderboard")
def get_leaderboard(
    dimension: str = Query("course", pattern="^(course|topic|format)$"),
    start_month: Optional[str] = None,
    end_month: Optional[str] = None
):
    return get_monthly_leaderboard(dimension, start_month, end_month)

@app.get("/api/seasonality/{month}")
def get_seasonality_info(month: str):
    return get_exam_seasonality(month)

@app.get("/api/low-ctr")
def get_low_ctr():
    return get_low_ctr_triage()

@app.get("/api/change-log")
def get_change_log():
    return get_change_log_analysis()

@app.post("/api/change-log")
def create_change_log(entry: ChangeLogCreate):
    impact = calculate_change_impact(
        entry.ctr_before_14d,
        entry.ctr_after_14d,
        entry.channel_ctr_before_14d,
        entry.channel_ctr_after_14d
    )

    conn = get_connection()
    cursor = conn.cursor()

    if entry.new_title:
        cursor.execute("UPDATE videos SET title = ? WHERE id = ?", (entry.new_title, entry.video_id))
    if entry.new_thumbnail:
        cursor.execute("UPDATE videos SET thumbnail_url = ? WHERE id = ?", (entry.new_thumbnail, entry.video_id))

    cursor.execute("""
        INSERT INTO change_log (
            video_id, change_date, change_type, old_title, new_title,
            old_thumbnail, new_thumbnail, notes, ctr_before_14d, ctr_after_14d,
            channel_ctr_before_14d, channel_ctr_after_14d, impact_score,
            views_before_14d, views_after_14d, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry.video_id, entry.change_date, entry.change_type, entry.old_title, entry.new_title,
        entry.old_thumbnail, entry.new_thumbnail, entry.notes, entry.ctr_before_14d, entry.ctr_after_14d,
        entry.channel_ctr_before_14d, entry.channel_ctr_after_14d, impact,
        entry.views_before_14d, entry.views_after_14d, datetime.utcnow().isoformat()
    ))
    conn.commit()
    conn.close()

    return {"status": "success", "impact_score": impact}

@app.get("/api/competitors")
def get_competitors():
    return get_competitor_analysis()

@app.post("/api/competitors")
def add_competitor(comp: CompetitorCreate):
    conn = get_connection()
    cursor = conn.cursor()
    cid = f"comp_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    cursor.execute("""
        INSERT INTO competitors (id, name, channel_handle, subscriber_count, video_count, total_views, avatar_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (cid, comp.name, comp.channel_handle, comp.subscriber_count, comp.video_count, comp.total_views, comp.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80", datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return {"status": "success", "id": cid}

@app.post("/api/videos/{video_id}/categorize")
def update_video_categorization(video_id: str, data: VideoCategorizeUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE videos 
        SET course = ?, topic = ?, format = ?, category_override = 1, updated_at = ?
        WHERE id = ?
    """, (data.course, data.topic, data.format, datetime.utcnow().isoformat(), video_id))
    conn.commit()
    conn.close()
    return {"status": "success", "video_id": video_id}

@app.get("/api/videos")
def get_videos(course: Optional[str] = None, topic: Optional[str] = None, format: Optional[str] = None, search: Optional[str] = None, limit: Optional[int] = None):
    conn = get_connection()
    query = "SELECT * FROM videos WHERE 1=1"
    params = []
    if course:
        query += " AND course = ?"
        params.append(course)
    if topic:
        query += " AND topic = ?"
        params.append(topic)
    if format:
        query += " AND format = ?"
        params.append(format)
    if search:
        query += " AND (title LIKE ? OR id = ?)"
        params.extend([f"%{search.strip()}%", search.strip()])
    query += " ORDER BY views DESC"
    if limit:
        query += " LIMIT ?"
        params.append(limit)

    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_app_base_url(request: Request) -> str:
    host = request.headers.get("host", "localhost:8000")
    scheme = "https" if "vercel.app" in host or request.headers.get("x-forwarded-proto") == "https" else "http"
    return f"{scheme}://{host}"

@app.get("/api/settings")
def get_settings(request: Request):
    ch_subs = yt_client.get_setting("channel_subscribers")
    manual_subs = yt_client.get_setting("manual_channel_subscribers")
    client_secret = yt_client.get_setting("oauth_client_secret")
    oauth_creds = yt_client.get_setting("youtube_oauth_credentials")
    base_url = get_app_base_url(request)
    
    api_key = yt_client.get_setting("youtube_api_key") or ""
    channel_id = yt_client.get_setting("channel_id") or ""
    
    # Check if critical settings are backed by env vars (permanent on Vercel)
    has_api_key_env = bool(os.environ.get("FALCON_YT_API_KEY", "").strip())
    has_channel_env = bool(os.environ.get("FALCON_CHANNEL_ID", "").strip())
    
    return {
        "youtube_api_key": api_key,
        "channel_id": channel_id,
        "oauth_client_id": yt_client.get_setting("oauth_client_id") or "",
        "has_oauth_client_secret": bool(client_secret and len(client_secret.strip()) > 0),
        "has_oauth": bool(oauth_creds and len(oauth_creds.strip()) > 0),
        "oauth_redirect_uri": f"{base_url}/api/auth/google/callback",
        "last_youtube_sync": yt_client.get_setting("last_youtube_sync") or None,
        "channel_subscribers": int(ch_subs) if ch_subs and str(ch_subs).isdigit() else 0,
        "manual_channel_subscribers": int(manual_subs) if manual_subs and str(manual_subs).isdigit() else None,
        "has_api_key_env": has_api_key_env,
        "has_channel_env": has_channel_env,
    }

@app.post("/api/settings")
def update_settings(settings: SettingsUpdate):
    if settings.youtube_api_key is not None:
        yt_client.save_setting("youtube_api_key", settings.youtube_api_key.strip())
    if settings.channel_id is not None:
        yt_client.save_setting("channel_id", settings.channel_id.strip())
    if settings.oauth_client_id is not None:
        yt_client.save_setting("oauth_client_id", settings.oauth_client_id.strip())
    if settings.oauth_client_secret is not None:
        yt_client.save_setting("oauth_client_secret", settings.oauth_client_secret.strip())
    if settings.manual_channel_subscribers is not None:
        if settings.manual_channel_subscribers > 0:
            yt_client.save_setting("manual_channel_subscribers", str(settings.manual_channel_subscribers))
        else:
            yt_client.save_setting("manual_channel_subscribers", "")
    
    # Check if critical settings are persisted via env vars (fully permanent on Vercel)
    has_api_key_env = bool(os.environ.get("FALCON_YT_API_KEY", "").strip())
    has_channel_env = bool(os.environ.get("FALCON_CHANNEL_ID", "").strip())
    is_vercel = bool(os.environ.get("VERCEL"))
    
    needs_env_setup = is_vercel and (not has_api_key_env or not has_channel_env)
    return {
        "status": "success",
        "needs_env_setup": needs_env_setup,
        "message": (
            "Settings saved. Note: for permanent storage on Vercel, add FALCON_YT_API_KEY and FALCON_CHANNEL_ID as Environment Variables in your Vercel project settings."
            if needs_env_setup else "Settings saved successfully."
        )
    }

@app.get("/api/auth/google/login")
def google_oauth_login(request: Request, redirect: bool = True):
    client_id = yt_client.get_setting("oauth_client_id")
    client_secret = yt_client.get_setting("oauth_client_secret")
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400, 
            detail="OAuth Client ID and Client Secret must both be saved in Settings before connecting."
        )
    
    from google_auth_oauthlib.flow import Flow
    redirect_uri = f"{get_app_base_url(request)}/api/auth/google/callback"
    scopes = [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
    ]
    client_config = {
        "web": {
            "client_id": client_id.strip(),
            "client_secret": client_secret.strip(),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }
    flow = Flow.from_client_config(client_config, scopes=scopes, redirect_uri=redirect_uri)
    auth_url, _ = flow.authorization_url(
        access_type="offline", 
        include_granted_scopes="true", 
        prompt="consent"
    )
    if redirect:
        return RedirectResponse(url=auth_url, status_code=307)
    return {"auth_url": auth_url}

@app.get("/api/auth/google/callback")
def google_oauth_callback(request: Request, code: Optional[str] = None, error: Optional[str] = None):
    import urllib.parse
    base_url = get_app_base_url(request)
    frontend_url = base_url if "vercel.app" in request.headers.get("host", "") else "http://localhost:5173"
    if error:
        return RedirectResponse(url=f"{frontend_url}/?oauth_error={urllib.parse.quote(error)}")
    if not code:
        return RedirectResponse(url=f"{frontend_url}/?oauth_error=no_authorization_code_received")
    
    client_id = yt_client.get_setting("oauth_client_id")
    client_secret = yt_client.get_setting("oauth_client_secret")
    if not client_id or not client_secret:
        return RedirectResponse(url=f"{frontend_url}/?oauth_error=missing_client_credentials")
    
    try:
        from google_auth_oauthlib.flow import Flow
        redirect_uri = f"{base_url}/api/auth/google/callback"
        scopes = [
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
        ]
        client_config = {
            "web": {
                "client_id": client_id.strip(),
                "client_secret": client_secret.strip(),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri]
            }
        }
        flow = Flow.from_client_config(client_config, scopes=scopes, redirect_uri=redirect_uri)
        flow.fetch_token(code=code)
        credentials = flow.credentials
        expiry_val = getattr(credentials, "expiry", None)
        creds_data = {
            "token": getattr(credentials, "token", None),
            "refresh_token": getattr(credentials, "refresh_token", None),
            "token_uri": getattr(credentials, "token_uri", None),
            "client_id": getattr(credentials, "client_id", None),
            "client_secret": getattr(credentials, "client_secret", None),
            "scopes": getattr(credentials, "scopes", None),
            "expiry": expiry_val.isoformat() if expiry_val is not None else None
        }
        yt_client.save_setting("youtube_oauth_credentials", json.dumps(creds_data))
        return RedirectResponse(url="http://localhost:5173/?oauth_connected=1")
    except Exception as e:
        err_str = urllib.parse.quote(str(e))
        return RedirectResponse(url=f"http://localhost:5173/?oauth_error={err_str}")

@app.post("/api/auth/google/disconnect")
def google_oauth_disconnect():
    yt_client.save_setting("youtube_oauth_credentials", "")
    return {"status": "success", "message": "YouTube OAuth credentials cleared", "has_oauth": False}

@app.post("/api/youtube/sync")
def sync_channel_endpoint():
    try:
        from sync_youtube import sync_youtube_channel
        res = sync_youtube_channel()
        try:
            run_auto_matching()
        except Exception:
            pass
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/seed/reset")
def reset_seed():
    generate_seed_data()
    return {"status": "success", "message": "Demo CFA/FRM dataset with hierarchical lists successfully reloaded"}

# -------------------------------------------------------------
# Section 05: Upload Planner API Endpoints
# -------------------------------------------------------------

@app.get("/api/planner/overview")
def get_planner_overview():
    return get_upload_planner_overview()

@app.get("/api/planner/structure")
def get_planner_structure():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Fetch all courses
    cursor.execute("""
        SELECT id, name, description, created_at 
        FROM lists 
        WHERE is_course = 1 
        ORDER BY name ASC
    """)
    courses_raw = [dict(r) for r in cursor.fetchall()]
    
    # Fetch all subjects
    cursor.execute("""
        SELECT id, name, parent_id, description, created_at 
        FROM lists 
        WHERE is_course = 0 AND parent_id IS NOT NULL AND (is_topic IS NULL OR is_topic = 0)
        ORDER BY name ASC
    """)
    subjects_raw = [dict(r) for r in cursor.fetchall()]
    
    # Video counts per list in planned_video_lists
    cursor.execute("""
        SELECT list_id, count(DISTINCT planned_video_id) as cnt
        FROM planned_video_lists
        GROUP BY list_id
    """)
    list_video_counts = {r["list_id"]: r["cnt"] for r in cursor.fetchall()}
    
    # Nest subjects under courses
    subjects_by_course = {}
    for s in subjects_raw:
        pid = s["parent_id"]
        s["video_count"] = list_video_counts.get(s["id"], 0)
        subjects_by_course.setdefault(pid, []).append(s)
        
    courses = []
    for c in courses_raw:
        c_subs = subjects_by_course.get(c["id"], [])
        c_subs.sort(key=lambda s: natural_sort_key(s.get("name") or ""))
        all_lids = [c["id"]] + [sub["id"] for sub in c_subs]
        placeholders = ",".join(["?"] * len(all_lids))
        cursor.execute(f"""
            SELECT count(DISTINCT planned_video_id) as total_vids
            FROM planned_video_lists
            WHERE list_id IN ({placeholders})
        """, tuple(all_lids))
        total_vids = cursor.fetchone()["total_vids"]
        
        courses.append({
            **c,
            "subjects": c_subs,
            "subject_count": len(c_subs),
            "video_count": total_vids
        })

    # Fetch all sessions
    cursor.execute("SELECT id, name, start_date, end_date, is_active, created_at FROM sessions ORDER BY start_date ASC")
    sessions_raw = [dict(r) for r in cursor.fetchall()]
    
    # Fetch list_targets for courses
    cursor.execute("""
        SELECT lt.session_id, lt.list_id, lt.target_count, l.name as list_name
        FROM list_targets lt
        JOIN lists l ON lt.list_id = l.id
        WHERE lt.session_id IS NOT NULL
    """)
    targets_raw = cursor.fetchall()
    targets_by_session = {}
    for t in targets_raw:
        targets_by_session.setdefault(t["session_id"], []).append({
            "course_id": t["list_id"],
            "course_name": t["list_name"],
            "target_count": t["target_count"]
        })

    # Video counts and uploads per session
    cursor.execute("""
        SELECT 
            session_id, 
            count(*) as planned_count,
            sum(CASE WHEN status = 'Uploaded' THEN 1 ELSE 0 END) as uploaded_count
        FROM planned_videos
        WHERE session_id IS NOT NULL
        GROUP BY session_id
    """)
    session_video_stats = {r["session_id"]: (r["planned_count"], r["uploaded_count"] or 0) for r in cursor.fetchall()}

    sessions = []
    for s in sessions_raw:
        s_targets = targets_by_session.get(s["id"], [])
        tot_target = sum(t["target_count"] for t in s_targets)
        p_cnt, u_cnt = session_video_stats.get(s["id"], (0, 0))
        sessions.append({
            **s,
            "course_targets": s_targets,
            "total_target": tot_target,
            "planned": p_cnt,
            "uploaded": u_cnt
        })

    conn.close()
    return {"courses": courses, "sessions": sessions}

# ----------------- Course CRUD -----------------
@app.post("/api/planner/courses")
def create_course(payload: CourseCreate):
    conn = get_connection()
    cursor = conn.cursor()
    slug = re.sub(r'[^a-zA-Z0-9]', '_', payload.name.lower()).strip('_')
    cid = f"course_{slug}_{datetime.now().strftime('%m%d%H%M')}"
    now_str = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO lists (id, name, parent_id, description, is_course, created_at)
        VALUES (?, ?, NULL, ?, 1, ?)
    """, (cid, payload.name.strip(), payload.description or "", now_str))
    conn.commit()
    conn.close()
    return {"status": "success", "id": cid, "name": payload.name.strip()}

@app.put("/api/planner/courses/{course_id}")
def update_course(course_id: str, payload: CourseUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    fields = []
    values = []
    if payload.name is not None:
        fields.append("name = ?")
        values.append(payload.name.strip())
    if payload.description is not None:
        fields.append("description = ?")
        values.append(payload.description)
    if fields:
        values.append(course_id)
        cursor.execute(f"UPDATE lists SET {', '.join(fields)} WHERE id = ? AND is_course = 1", tuple(values))
        conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/planner/courses/{course_id}")
def delete_course(course_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM lists WHERE parent_id = ?", (course_id,))
    child_ids = [r["id"] for r in cursor.fetchall()]
    all_to_remove = [course_id] + child_ids
    placeholders = ",".join(["?"] * len(all_to_remove))

    cursor.execute(f"DELETE FROM planned_video_lists WHERE list_id IN ({placeholders})", tuple(all_to_remove))
    cursor.execute(f"DELETE FROM list_targets WHERE list_id IN ({placeholders})", tuple(all_to_remove))
    cursor.execute(f"DELETE FROM lists WHERE id IN ({placeholders})", tuple(all_to_remove))
    conn.commit()
    conn.close()
    return {"status": "success"}

# ----------------- Subject CRUD -----------------
@app.post("/api/planner/subjects")
def create_subject(payload: SubjectCreate):
    conn = get_connection()
    cursor = conn.cursor()
    slug = re.sub(r'[^a-zA-Z0-9]', '_', payload.name.lower()).strip('_')
    sid = f"sub_{slug}_{datetime.now().strftime('%m%d%H%M')}"
    now_str = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO lists (id, name, parent_id, description, is_course, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
    """, (sid, payload.name.strip(), payload.parent_id, payload.description or "", now_str))
    conn.commit()
    conn.close()
    return {"status": "success", "id": sid, "name": payload.name.strip()}

@app.post("/api/planner/subjects/bulk")
def create_subjects_bulk(payload: SubjectBulkCreate):
    conn = get_connection()
    cursor = conn.cursor()
    created = []
    now_str = datetime.now().isoformat()
    for idx, raw_name in enumerate(payload.names):
        name = raw_name.strip()
        if not name:
            continue
        slug = re.sub(r'[^a-zA-Z0-9]', '_', name.lower()).strip('_')
        sid = f"sub_{slug}_{datetime.now().strftime('%m%d%H%M')}_{idx}"
        cursor.execute("""
            INSERT INTO lists (id, name, parent_id, description, is_course, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
        """, (sid, name, payload.parent_id, payload.description or "", now_str))
        created.append({"id": sid, "name": name})
    conn.commit()
    conn.close()
    return {"status": "success", "count": len(created), "subjects": created}

@app.put("/api/planner/subjects/{subject_id}")
def update_subject(subject_id: str, payload: SubjectUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    fields = []
    values = []
    if payload.name is not None:
        fields.append("name = ?")
        values.append(payload.name.strip())
    if payload.parent_id is not None:
        fields.append("parent_id = ?")
        values.append(payload.parent_id)
    if payload.description is not None:
        fields.append("description = ?")
        values.append(payload.description)
    if fields:
        values.append(subject_id)
        cursor.execute(f"UPDATE lists SET {', '.join(fields)} WHERE id = ? AND is_course = 0", tuple(values))
        conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/planner/subjects/{subject_id}")
def delete_subject(subject_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM planned_video_lists WHERE list_id = ?", (subject_id,))
    cursor.execute("DELETE FROM list_targets WHERE list_id = ?", (subject_id,))
    cursor.execute("DELETE FROM lists WHERE id = ? AND is_course = 0", (subject_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

# ----------------- Session CRUD -----------------
@app.get("/api/planner/sessions")
def list_sessions():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, start_date, end_date, is_active, created_at FROM sessions ORDER BY start_date ASC")
    sessions = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return sessions

@app.get("/api/planner/sessions/{session_id}")
def get_session(session_id: str):
    data = get_session_details(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    return data

@app.post("/api/planner/sessions")
def create_session(sess: SessionCreate):
    conn = get_connection()
    cursor = conn.cursor()
    slug = re.sub(r'[^a-zA-Z0-9]', '_', sess.name.lower()).strip('_')
    s_id = f"session_{slug}_{datetime.now().strftime('%m%d%H%M')}"
    now_str = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO sessions (id, name, start_date, end_date, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
    """, (s_id, sess.name.strip(), sess.start_date, sess.end_date, now_str))
    
    if sess.course_targets:
        for ct in sess.course_targets:
            if ct.target_count > 0:
                cursor.execute("""
                    INSERT INTO list_targets (session_id, list_id, target_count, created_at)
                    VALUES (?, ?, ?, ?)
                """, (s_id, ct.course_id, ct.target_count, now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "id": s_id}

@app.put("/api/planner/sessions/{session_id}")
def update_session(session_id: str, sess: SessionUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    fields = []
    values = []
    if sess.name is not None:
        fields.append("name = ?")
        values.append(sess.name.strip())
    if sess.start_date is not None:
        fields.append("start_date = ?")
        values.append(sess.start_date)
    if sess.end_date is not None:
        fields.append("end_date = ?")
        values.append(sess.end_date)
    if sess.is_active is not None:
        fields.append("is_active = ?")
        values.append(sess.is_active)

    if fields:
        values.append(session_id)
        cursor.execute(f"UPDATE sessions SET {', '.join(fields)} WHERE id = ?", tuple(values))

    # Sync course_targets if provided
    if sess.course_targets is not None:
        now_str = datetime.now().isoformat()
        cursor.execute("DELETE FROM list_targets WHERE session_id = ?", (session_id,))
        for ct in sess.course_targets:
            if ct.target_count > 0:
                cursor.execute("""
                    INSERT INTO list_targets (session_id, list_id, target_count, created_at)
                    VALUES (?, ?, ?, ?)
                """, (session_id, ct.course_id, ct.target_count, now_str))

    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/planner/sessions/{session_id}")
def delete_session(session_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    cursor.execute("UPDATE planned_videos SET session_id = NULL WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM list_targets WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/api/planner/targets")
def set_target(t: TargetSet):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO list_targets (session_id, list_id, target_count, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id, list_id) DO UPDATE SET
            target_count = excluded.target_count
    """, (t.session_id, t.list_id, max(0, t.target_count), now_str))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/planner/targets/hierarchy")
def get_targets_hierarchy(session_id: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Resolve session: If no session specified, operate in session-independent mode
    is_independent = not session_id or session_id in ("independent", "global", "ALL", "")
    if is_independent:
        cursor.execute("SELECT list_id, SUM(target_count) as target_count FROM list_targets GROUP BY list_id")
        target_map = {r["list_id"]: r["target_count"] for r in cursor.fetchall()}
        target_session_id = None
        session_data = {
            "id": "independent",
            "name": "Course & Curriculum Targets",
            "start_date": "",
            "end_date": "",
            "total_target": sum(target_map.values()) if target_map else 0
        }
    else:
        cursor.execute("SELECT id, name, start_date, end_date, total_target FROM sessions WHERE id = ?", (session_id,))
        s_row = cursor.fetchone()
        session_data = dict(s_row) if s_row else {
            "id": "independent",
            "name": "Course & Curriculum Targets",
            "start_date": "",
            "end_date": "",
            "total_target": 0
        }
        target_session_id = session_data["id"]
        cursor.execute("SELECT list_id, target_count FROM list_targets WHERE session_id = ?", (target_session_id,))
        target_map = {r["list_id"]: r["target_count"] for r in cursor.fetchall()}

    # 3. Fetch all programs (CFA Program, FRM Program)
    cursor.execute("SELECT id, name, description FROM lists WHERE is_course = 0 AND parent_id IS NULL AND (id IN ('list_cfa', 'list_frm') OR name LIKE '%Program%')")
    programs_raw = [dict(r) for r in cursor.fetchall()]

    # 4. Fetch all courses
    cursor.execute("SELECT id, name, parent_id, description FROM lists WHERE is_course = 1 ORDER BY name ASC")
    courses_raw = [dict(r) for r in cursor.fetchall()]

    # 5. Fetch all subjects
    cursor.execute("SELECT id, name, parent_id, description FROM lists WHERE is_course = 0 AND parent_id IS NOT NULL ORDER BY name ASC")
    subjects_raw = [dict(r) for r in cursor.fetchall()]

    # Map subjects by course
    subjects_by_course = {}
    for sub in subjects_raw:
        pid = sub["parent_id"]
        sub["target"] = target_map.get(sub["id"], 0)
        subjects_by_course.setdefault(pid, []).append(sub)
    for subs in subjects_by_course.values():
        subs.sort(key=lambda s: natural_sort_key(s.get("name") or ""))

    # Map courses by program
    courses_by_program = {}
    other_courses = []
    for c in courses_raw:
        c["target"] = target_map.get(c["id"], 0)
        c["subjects"] = subjects_by_course.get(c["id"], [])
        pid = c.get("parent_id")
        if pid and any(p["id"] == pid for p in programs_raw):
            courses_by_program.setdefault(pid, []).append(c)
        else:
            # Fuzzy match by prefix (e.g. CFA Level 3 -> list_cfa)
            matched_p = None
            for p in programs_raw:
                p_keyword = p["name"].split()[0].upper()
                if c["name"].upper().startswith(p_keyword):
                    matched_p = p["id"]
                    break
            if matched_p:
                courses_by_program.setdefault(matched_p, []).append(c)
            else:
                other_courses.append(c)

    programs = []
    for p in programs_raw:
        p_courses = courses_by_program.get(p["id"], [])
        p_target = target_map.get(p["id"], 0)
        # If program target not explicitly set, default to sum of its course targets
        if p_target <= 0 and p_courses:
            p_courses_sum = sum(c["target"] for c in p_courses)
            if p_courses_sum > 0:
                p_target = p_courses_sum
        programs.append({
            "id": p["id"],
            "name": p["name"],
            "target": p_target,
            "courses": p_courses
        })

    if other_courses:
        other_target = target_map.get("program_other", 0)
        if other_target <= 0:
            other_target = sum(c["target"] for c in other_courses)
        programs.append({
            "id": "program_other",
            "name": "Other Specializations",
            "target": other_target,
            "courses": other_courses
        })

    # Total target determination
    total_target = session_data.get("total_target") or 0
    if total_target <= 0:
        total_target = sum(p["target"] for p in programs)
        if total_target <= 0:
            total_target = sum(c["target"] for c in courses_raw)

    cursor.execute("SELECT id, name FROM sessions ORDER BY start_date ASC")
    all_sessions = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "session_id": target_session_id,
        "session_name": session_data["name"],
        "start_date": session_data.get("start_date", ""),
        "end_date": session_data.get("end_date", ""),
        "total_target": total_target,
        "programs": programs,
        "available_sessions": all_sessions
    }

@app.post("/api/planner/targets/hierarchy")
def save_targets_hierarchy(payload: HierarchyTargetSave):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    is_add_mode = (payload.mode or "").lower() == "add"

    # Update session total_target if scoped to a specific session
    if payload.session_id and payload.session_id not in ("independent", "global", "ALL", ""):
        if is_add_mode:
            cursor.execute("UPDATE sessions SET total_target = COALESCE(total_target, 0) + ? WHERE id = ?", (payload.total_target, payload.session_id))
            for t in payload.targets:
                cursor.execute("SELECT id, target_count FROM list_targets WHERE session_id = ? AND list_id = ?", (payload.session_id, t.list_id))
                row = cursor.fetchone()
                if row:
                    new_val = max(0, row["target_count"] + t.target_count)
                    cursor.execute("UPDATE list_targets SET target_count = ? WHERE id = ?", (new_val, row["id"]))
                elif t.target_count > 0:
                    cursor.execute("""
                        INSERT INTO list_targets (session_id, list_id, target_count, created_at)
                        VALUES (?, ?, ?, ?)
                    """, (payload.session_id, t.list_id, t.target_count, now_str))
        else:
            cursor.execute("UPDATE sessions SET total_target = ? WHERE id = ?", (payload.total_target, payload.session_id))
            cursor.execute("DELETE FROM list_targets WHERE session_id = ?", (payload.session_id,))
            for t in payload.targets:
                if t.target_count > 0:
                    cursor.execute("""
                        INSERT INTO list_targets (session_id, list_id, target_count, created_at)
                        VALUES (?, ?, ?, ?)
                    """, (payload.session_id, t.list_id, t.target_count, now_str))
    else:
        # Session-independent mode (session_id IS NULL)
        if is_add_mode:
            for t in payload.targets:
                cursor.execute("SELECT id, target_count FROM list_targets WHERE session_id IS NULL AND list_id = ?", (t.list_id,))
                row = cursor.fetchone()
                if row:
                    new_val = max(0, row["target_count"] + t.target_count)
                    cursor.execute("UPDATE list_targets SET target_count = ? WHERE id = ?", (new_val, row["id"]))
                elif t.target_count > 0:
                    cursor.execute("""
                        INSERT INTO list_targets (session_id, list_id, target_count, created_at)
                        VALUES (NULL, ?, ?, ?)
                    """, (t.list_id, t.target_count, now_str))
        else:
            # Replace mode: update existing or insert new target
            for t in payload.targets:
                cursor.execute("SELECT id FROM list_targets WHERE session_id IS NULL AND list_id = ?", (t.list_id,))
                row = cursor.fetchone()
                if row:
                    cursor.execute("UPDATE list_targets SET target_count = ? WHERE id = ?", (t.target_count, row["id"]))
                elif t.target_count > 0:
                    cursor.execute("""
                        INSERT INTO list_targets (session_id, list_id, target_count, created_at)
                        VALUES (NULL, ?, ?, ?)
                    """, (t.list_id, t.target_count, now_str))

    conn.commit()
    conn.close()
    return {"status": "success", "session_id": payload.session_id, "mode": payload.mode or "replace", "total_target": payload.total_target}

def derive_month_from_week(week_str: Optional[str]) -> Optional[str]:
    if not week_str or "-W" not in str(week_str):
        return None
    try:
        parts = str(week_str).split("-W")
        year = int(parts[0])
        week = int(parts[1])
        first_day_of_year = datetime(year, 1, 4)
        monday_week1 = first_day_of_year - timedelta(days=first_day_of_year.isoweekday() - 1)
        target_monday = monday_week1 + timedelta(weeks=week - 1)
        return target_monday.strftime("%Y-%m")
    except Exception:
        return None

@app.get("/api/planner/videos")
def get_planned_videos(session_id: Optional[str] = None, list_id: Optional[str] = None, status: Optional[str] = None, content_type: Optional[str] = None):
    return get_planned_videos_filtered(session_id=session_id, list_id=list_id, status=status, content_type=content_type)

@app.post("/api/planner/videos")
def create_planned_video(pv: PlannedVideoCreate):
    conn = get_connection()
    cursor = conn.cursor()
    prefix = "ps" if pv.content_type == "short" else "pv"
    pv_id = f"{prefix}_{re.sub(r'[^a-zA-Z0-9]', '_', pv.title.lower())[:25]}_{datetime.now().strftime('%m%d%H%M%S')}"
    now_str = datetime.now().isoformat()
    assigned_month = pv.assigned_month or derive_month_from_week(pv.assigned_week)
    cursor.execute("""
        INSERT INTO planned_videos (id, title, session_id, status, assigned_month, assigned_week, notes, content_type, hook, series, target_duration_sec, production_stage, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        pv_id, 
        pv.title, 
        pv.session_id, 
        pv.status or "Planned", 
        assigned_month, 
        pv.assigned_week, 
        pv.notes or "", 
        pv.content_type or "video",
        pv.hook or "",
        pv.series or "",
        pv.target_duration_sec or 60,
        pv.production_stage or "Idea",
        now_str, 
        now_str
    ))

    for lid in pv.list_ids or []:
        cursor.execute("""
            INSERT OR IGNORE INTO planned_video_lists (planned_video_id, list_id)
            VALUES (?, ?)
        """, (pv_id, lid))

    conn.commit()
    conn.close()

    # Automatically check if matches any published video
    run_auto_matching()

    return {"status": "success", "id": pv_id}

@app.post("/api/planner/validate-entries")
def validate_entries_endpoint(entries: List[RawPlannerEntry]):
    raw_dicts = [e.dict() for e in entries]
    return validate_planner_entries(raw_dicts)

@app.post("/api/planner/videos/bulk")
def bulk_create_planned_videos(items: List[BulkCreateItem]):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    created_ids = []

    for idx, item in enumerate(items):
        prefix = "ps" if item.content_type == "short" else "pv"
        pv_id = f"{prefix}_{re.sub(r'[^a-zA-Z0-9]', '_', item.title.lower())[:20]}_{datetime.now().strftime('%m%d%H%M%S')}_{idx}"
        assigned_month = item.assigned_month or derive_month_from_week(item.assigned_week)
        final_status = item.status or ("Uploaded" if item.production_stage == "Uploaded" else "Planned")
        final_content_type = item.content_type or ("short" if prefix == "ps" else "video")
        cursor.execute("""
            INSERT INTO planned_videos (id, title, session_id, status, assigned_month, assigned_week, notes, content_type, hook, series, target_duration_sec, production_stage, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pv_id, 
            item.title, 
            item.session_id or None, 
            final_status, 
            assigned_month, 
            item.assigned_week or None, 
            item.notes or "", 
            final_content_type,
            item.hook or "",
            item.series or "",
            item.target_duration_sec or 60,
            item.production_stage or "Idea",
            now_str, 
            now_str
        ))

        # Collect list associations
        list_ids = set(item.list_ids or [])
        if item.course_id:
            list_ids.add(item.course_id)
        if item.subject_id:
            list_ids.add(item.subject_id)

        for lid in list_ids:
            if lid:
                cursor.execute("""
                    INSERT OR IGNORE INTO planned_video_lists (planned_video_id, list_id)
                    VALUES (?, ?)
                """, (pv_id, lid))

        created_ids.append(pv_id)

    conn.commit()
    conn.close()

    run_auto_matching()
    return {"status": "success", "count": len(created_ids), "ids": created_ids}

@app.get("/api/planner/progress-analytics")
def get_planner_progress_analytics(session_id: Optional[str] = None, course_id: Optional[str] = None):
    data = get_session_progress_analytics(session_id=session_id, course_id=course_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analytics data not found for given parameters")
    return data

@app.get("/api/planner/shorts/overview")
def get_shorts_overview_endpoint(session_id: Optional[str] = None):
    return get_shorts_overview(session_id=session_id)

@app.post("/api/planner/shorts/target")
def update_shorts_target_endpoint(body: ShortsTargetUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE sessions SET shorts_target = ? WHERE id = ?", (max(0, body.shorts_target), body.session_id))
    conn.commit()
    conn.close()
    return {"status": "success", "session_id": body.session_id, "shorts_target": body.shorts_target}

@app.put("/api/planner/videos/{pv_id}")
def update_planned_video(pv_id: str, pv: PlannedVideoUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    fields: List[str] = ["updated_at = ?"]
    values: List[Any] = [now_str]

    if pv.title is not None:
        fields.append("title = ?")
        values.append(pv.title)
    if pv.session_id is not None:
        fields.append("session_id = ?")
        values.append(pv.session_id if pv.session_id != "" else None)
    if pv.status is not None:
        fields.append("status = ?")
        values.append(pv.status)
    if pv.content_type is not None:
        fields.append("content_type = ?")
        values.append(pv.content_type)
    if pv.hook is not None:
        fields.append("hook = ?")
        values.append(pv.hook)
    if pv.series is not None:
        fields.append("series = ?")
        values.append(pv.series)
    if pv.target_duration_sec is not None:
        fields.append("target_duration_sec = ?")
        values.append(pv.target_duration_sec)
    if pv.production_stage is not None:
        fields.append("production_stage = ?")
        values.append(pv.production_stage)
        # Auto-sync status to Uploaded if stage is Uploaded
        if pv.production_stage == "Uploaded" and pv.status is None:
            fields.append("status = ?")
            values.append("Uploaded")
    if pv.assigned_month is not None:
        fields.append("assigned_month = ?")
        values.append(pv.assigned_month if pv.assigned_month != "" else None)
    elif pv.assigned_week is not None and pv.assigned_week != "":
        derived_m = derive_month_from_week(pv.assigned_week)
        if derived_m:
            fields.append("assigned_month = ?")
            values.append(derived_m)
    if pv.assigned_week is not None:
        fields.append("assigned_week = ?")
        values.append(pv.assigned_week if pv.assigned_week != "" else None)
    if pv.linked_video_id is not None:
        fields.append("linked_video_id = ?")
        values.append(pv.linked_video_id if pv.linked_video_id != "" else None)
    if pv.notes is not None:
        fields.append("notes = ?")
        values.append(pv.notes)

    values.append(pv_id)
    cursor.execute(f"UPDATE planned_videos SET {', '.join(fields)} WHERE id = ?", tuple(values))

    if pv.list_ids is not None:
        cursor.execute("DELETE FROM planned_video_lists WHERE planned_video_id = ?", (pv_id,))
        for lid in pv.list_ids:
            cursor.execute("""
                INSERT OR IGNORE INTO planned_video_lists (planned_video_id, list_id)
                VALUES (?, ?)
            """, (pv_id, lid))

    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/planner/videos/{pv_id}")
def delete_planned_video(pv_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM planned_videos WHERE id = ?", (pv_id,))
    cursor.execute("DELETE FROM planned_video_lists WHERE planned_video_id = ?", (pv_id,))
    cursor.execute("DELETE FROM match_review_queue WHERE planned_video_id = ?", (pv_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

def extract_youtube_video_id(url_or_id: Optional[str]) -> Optional[str]:
    if not url_or_id:
        return None
    s = str(url_or_id).strip()
    if not s:
        return None
    if re.match(r'^[a-zA-Z0-9_-]{11}$', s):
        return s
    patterns = [
        r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})',
        r'[\?&]v=([a-zA-Z0-9_-]{11})',
        r'\/([a-zA-Z0-9_-]{11})(?:\?|&|$|\/)'
    ]
    for p in patterns:
        m = re.search(p, s)
        if m:
            return m.group(1)
    return s

@app.post("/api/planner/videos/bulk-status")
def bulk_update_planned_videos_status(payload: BulkStatusRequest):
    if not payload.video_ids:
        return {"status": "success", "updated_count": 0}
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    placeholders = ",".join("?" for _ in payload.video_ids)
    
    update_clause = "status = ?, updated_at = ?"
    params: List[Any] = [payload.status, now_str]
    if payload.scheduled_date is not None:
        update_clause += ", scheduled_date = ?"
        params.append(payload.scheduled_date)
    if payload.session_id is not None:
        update_clause += ", session_id = ?"
        params.append(payload.session_id if payload.session_id != "EVERGREEN" else None)
        
    params.extend(payload.video_ids)
    cursor.execute(f"""
        UPDATE planned_videos
        SET {update_clause}
        WHERE id IN ({placeholders})
    """, tuple(params))
    
    updated_count = cursor.rowcount
    conn.commit()
    conn.close()
    return {"status": "success", "updated_count": updated_count}

@app.post("/api/planner/videos/bulk-delete")
def bulk_delete_planned_videos(payload: BulkDeleteRequest):
    if not payload.video_ids:
        return {"status": "success", "deleted_count": 0}
    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" for _ in payload.video_ids)
    cursor.execute(f"DELETE FROM planned_videos WHERE id IN ({placeholders})", tuple(payload.video_ids))
    cursor.execute(f"DELETE FROM planned_video_lists WHERE planned_video_id IN ({placeholders})", tuple(payload.video_ids))
    cursor.execute(f"DELETE FROM match_review_queue WHERE planned_video_id IN ({placeholders})", tuple(payload.video_ids))
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return {"status": "success", "deleted_count": deleted_count}

@app.post("/api/planner/videos/{pv_id}/link")
def link_video(pv_id: str, payload: Optional[LinkVideoPayload] = None):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    raw_input = None
    if payload:
        raw_input = payload.youtube_url or payload.video_id

    extracted_id = extract_youtube_video_id(raw_input) if raw_input else None
    linked_video_info = None

    if extracted_id:
        cursor.execute("SELECT id, title, views, likes, comments, thumbnail_url, published_at FROM videos WHERE id = ?", (extracted_id,))
        v_row = cursor.fetchone()

        if not v_row:
            api_key = yt_client.get_setting("youtube_api_key")
            if api_key:
                try:
                    from googleapiclient.discovery import build
                    yt = build("youtube", "v3", developerKey=api_key)
                    resp = yt.videos().list(part="snippet,statistics,contentDetails", id=extracted_id).execute()
                    if resp.get("items"):
                        item = resp["items"][0]
                        snip = item["snippet"]
                        stats = item.get("statistics", {})
                        from sync_youtube import parse_iso_duration
                        dur_sec = parse_iso_duration(item.get("contentDetails", {}).get("duration", ""))
                        cats = categorize_video(snip["title"], snip.get("description", ""))
                        v_views = int(stats.get("viewCount", 0))
                        v_likes = int(stats.get("likeCount", 0))
                        v_comments = int(stats.get("commentCount", 0))
                        v_thumb = snip.get("thumbnails", {}).get("high", {}).get("url") or snip.get("thumbnails", {}).get("default", {}).get("url", "")
                        
                        cursor.execute("""
                            INSERT INTO videos (
                                id, title, description, thumbnail_url, published_at,
                                duration_seconds, course, topic, format, category_override,
                                views, likes, comments, impressions, ctr, avg_view_duration,
                                watch_time_hours, subscribers_gained, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 5.0, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET views = excluded.views, updated_at = excluded.updated_at
                        """, (
                            extracted_id, snip["title"], snip.get("description", "")[:1000], v_thumb, snip["publishedAt"],
                            dur_sec, cats["course"], cats["topic"], cats["format"],
                            v_views, v_likes, v_comments, v_views * 15, int(dur_sec * 0.4),
                            round((v_views * int(dur_sec * 0.4)) / 3600.0, 1), int(v_views * 0.016), now_str
                        ))
                except Exception as e:
                    print("Error fetching video details from YouTube API:", e)

        cursor.execute("""
            UPDATE planned_videos 
            SET linked_video_id = ?, status = 'Uploaded', updated_at = ?
            WHERE id = ?
        """, (extracted_id, now_str, pv_id))

        cursor.execute("SELECT id, title, views, likes, comments, thumbnail_url, published_at FROM videos WHERE id = ?", (extracted_id,))
        final_row = cursor.fetchone()
        linked_video_info = dict(final_row) if final_row else {"id": extracted_id, "title": "YouTube Video"}
    else:
        cursor.execute("""
            UPDATE planned_videos 
            SET linked_video_id = NULL, status = 'Planned', updated_at = ?
            WHERE id = ?
        """, (now_str, pv_id))

    cursor.execute("DELETE FROM match_review_queue WHERE planned_video_id = ?", (pv_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "linked_video_id": extracted_id, "linked_video": linked_video_info}

@app.get("/api/planner/review-queue")
def get_planner_review_queue():
    try:
        run_auto_matching()
    except Exception:
        pass
    return get_review_queue()

@app.post("/api/planner/review-queue/{queue_id}/confirm")
def confirm_match(queue_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM match_review_queue WHERE id = ?", (queue_id,))
    item = cursor.fetchone()
    if not item:
        conn.close()
        raise HTTPException(status_code=404, detail="Review item not found")

    now_str = datetime.now().isoformat()
    cursor.execute("""
        UPDATE planned_videos
        SET linked_video_id = ?, status = 'Uploaded', updated_at = ?
        WHERE id = ?
    """, (item["video_id"], now_str, item["planned_video_id"]))

    # Auto-sync back to syllabus grid: link video to associated lists (Topic, Subject, Course)
    cursor.execute("SELECT list_id FROM planned_video_lists WHERE planned_video_id = ?", (item["planned_video_id"],))
    for r in cursor.fetchall():
        cursor.execute("""
            INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
            VALUES (?, ?, 1, ?)
        """, (r["list_id"], item["video_id"], now_str))

    cursor.execute("DELETE FROM match_review_queue WHERE planned_video_id = ?", (item["planned_video_id"],))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/api/planner/review-queue/{queue_id}/reject")
def reject_match(queue_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT planned_video_id, video_id FROM match_review_queue WHERE id = ?", (queue_id,))
    item = cursor.fetchone()
    now_str = datetime.now().isoformat()
    if item:
        cursor.execute("""
            INSERT OR IGNORE INTO rejected_matches (planned_video_id, video_id, created_at)
            VALUES (?, ?, ?)
        """, (item["planned_video_id"], item["video_id"], now_str))
    cursor.execute("""
        UPDATE match_review_queue
        SET status = 'REJECTED', created_at = ?
        WHERE id = ?
    """, (now_str, queue_id))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/api/planner/auto-match")
def trigger_auto_match():
    return run_auto_matching()


# -------------------------------------------------------------
# Section 07: Syllabus Matcher (Topic × Format Coverage Grid)
# -------------------------------------------------------------

class FlatTopicsCreate(BaseModel):
    course_id: str
    subject_id: str
    topics: List[str]

class GroupedTopicsCreate(BaseModel):
    rows: List[Dict[str, Any]]

class SingleTopicCreate(BaseModel):
    course_id: str
    subject_id: str
    topic_name: str

class ToggleNABody(BaseModel):
    topic_id: str
    format: str
    is_na: bool

class PlanTopicFormatsBody(BaseModel):
    topic_id: str
    formats: List[str]
    session_id: Optional[str] = None
    notes: Optional[str] = ""

class LinkVideoBody(BaseModel):
    topic_id: Optional[str] = None
    topic_ids: Optional[List[str]] = None
    video_id: str
    action: str = "link"
    format: Optional[str] = None


@app.get("/api/syllabus/grid")
def get_syllabus_grid():
    return get_syllabus_grid_data()

@app.post("/api/syllabus/topics/flat")
def create_flat_topics_endpoint(payload: FlatTopicsCreate):
    return create_flat_topics(
        course_id=payload.course_id,
        subject_id=payload.subject_id,
        topic_names=payload.topics
    )

@app.post("/api/syllabus/topics/grouped")
def create_grouped_topics_endpoint(payload: GroupedTopicsCreate):
    return create_grouped_topics(rows=payload.rows)

@app.post("/api/syllabus/topics/single")
def create_single_topic_endpoint(payload: SingleTopicCreate):
    return create_single_topic(
        course_id=payload.course_id,
        subject_id=payload.subject_id,
        topic_name=payload.topic_name
    )

@app.delete("/api/syllabus/topics/{topic_id}")
def delete_topic_endpoint(topic_id: str):
    return delete_topic(topic_id)

@app.post("/api/syllabus/toggle-na")
def toggle_na_endpoint(payload: ToggleNABody):
    return toggle_topic_format_na(
        topic_id=payload.topic_id,
        format_name=payload.format,
        is_na=payload.is_na
    )

@app.post("/api/syllabus/plan")
def plan_topic_formats_endpoint(payload: PlanTopicFormatsBody):
    return plan_topic_formats(
        topic_id=payload.topic_id,
        formats=payload.formats,
        session_id=payload.session_id,
        notes=payload.notes or ""
    )

@app.post("/api/syllabus/run-matcher")
def run_matcher_endpoint():
    return run_topic_video_matching()

@app.get("/api/syllabus/match-queue")
def get_match_queue_endpoint():
    return get_topic_match_queue()

@app.post("/api/syllabus/match-queue/{queue_id}/confirm")
def confirm_match_endpoint(queue_id: int):
    return confirm_topic_match(queue_id)

@app.post("/api/syllabus/match-queue/{queue_id}/reject")
def reject_match_endpoint(queue_id: int):
    return reject_topic_match(queue_id)

@app.post("/api/syllabus/link-video")
def link_video_endpoint(payload: LinkVideoBody):
    return manual_link_topic_video(
        topic_id=payload.topic_id,
        video_id=payload.video_id,
        action=payload.action,
        topic_ids=payload.topic_ids,
        target_format=payload.format
    )


# -------------------------------------------------------------
# Reverse Matcher & Full Video Analytics Endpoints
# -------------------------------------------------------------

class ReassignTopicBody(BaseModel):
    video_id: str
    new_topic_id: str
    old_topic_id: Optional[str] = None

class UnlinkTopicBody(BaseModel):
    video_id: str
    topic_id: str


@app.get("/api/syllabus/reverse-match/videos")
def get_reverse_match_videos_endpoint():
    return get_all_videos_reverse_match()


@app.post("/api/syllabus/reverse-match/reassign")
def reassign_topic_endpoint(payload: ReassignTopicBody):
    return reassign_video_topic(
        video_id=payload.video_id,
        new_topic_id=payload.new_topic_id,
        old_topic_id=payload.old_topic_id
    )


@app.post("/api/syllabus/reverse-match/unlink")
def unlink_topic_endpoint(payload: UnlinkTopicBody):
    return unlink_video_topic(
        video_id=payload.video_id,
        topic_id=payload.topic_id
    )


@app.get("/api/syllabus/topics/all")
def get_all_topics_endpoint():
    return get_all_syllabus_topics_flat()



