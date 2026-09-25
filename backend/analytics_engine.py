import sqlite3
import json
import re
import difflib
from typing import List, Dict, Any, Optional, Set, Tuple
from datetime import datetime, timedelta
from database import get_connection

# Exam seasonality helper
def get_exam_seasonality(month_str: str) -> Dict[str, Any]:
    try:
        dt = datetime.strptime(month_str, "%Y-%m")
        month = dt.month
        
        cfa_exam_months = [2, 5, 8, 11]
        frm_exam_months = [5, 11]

        cfa_status = []
        if month in cfa_exam_months:
            cfa_status.append("Exam Month")
        elif (month + 1) % 12 in cfa_exam_months or (month + 1) in cfa_exam_months:
            cfa_status.append("Peak Revision Lead-up (T-1)")
        elif (month + 2) % 12 in cfa_exam_months or (month + 2) in cfa_exam_months:
            cfa_status.append("Heavy Practice Lead-up (T-2)")
        elif (month + 3) % 12 in cfa_exam_months or (month + 3) in cfa_exam_months:
            cfa_status.append("Concept Build-up (T-3)")
        else:
            cfa_status.append("Off-season / Core Prep")

        frm_status = []
        if month in frm_exam_months:
            frm_status.append("FRM Exam Month")
        elif (month + 1) % 12 in frm_exam_months or (month + 1) in frm_exam_months:
            frm_status.append("FRM Peak Revision (T-1)")
        elif (month + 2) % 12 in frm_exam_months or (month + 2) in frm_exam_months:
            frm_status.append("FRM Practice Lead-up (T-2)")

        is_high_season = month in [1, 2, 4, 5, 7, 8, 10, 11]

        return {
            "month": month_str,
            "month_num": month,
            "is_high_season": is_high_season,
            "cfa_phase": " | ".join(cfa_status),
            "frm_phase": " | ".join(frm_status) if frm_status else "Standard Cycle",
            "recommended_formats": "Revision / Marathon / Q&A" if is_high_season else "Core Lecture / Foundational"
        }
    except Exception:
        return {"month": month_str, "is_high_season": False, "cfa_phase": "N/A", "frm_phase": "N/A"}

def natural_sort_key(s: Any) -> Tuple[List[Any], str]:
    """
    Splits string into numeric and non-numeric chunks for natural (alphanumeric) sorting.
    Treats 'R1', 'R2', 'R10' as 1, 2, 10 instead of lexical 1, 10, 2 (so R1 -> R2 -> R10).
    Also handles 'CR1', 'ORR1', 'S1', 'S10', 'B1', etc. correctly.
    """
    if s is None:
        return ([], "")
    str_val = str(s).strip()
    parts = re.split(r'(\d+)', str_val)
    tokens = [(0, int(p)) if p.isdigit() else (1, p.lower()) for p in parts if p]
    return (tokens, str_val.lower())

# -------------------------------------------------------------
# Core Data Model: Hierarchical Lists & Recursive Rollup Engine
# -------------------------------------------------------------

def get_descendant_list_ids(conn: sqlite3.Connection, root_list_id: str) -> Set[str]:
    """
    Recursively discovers all child, grandchild, etc. list IDs starting from root_list_id.
    Includes the root_list_id itself.
    """
    descendants = {root_list_id}
    queue = [root_list_id]
    cursor = conn.cursor()

    while queue:
        curr_id = queue.pop(0)
        cursor.execute("SELECT id FROM lists WHERE parent_id = ?", (curr_id,))
        children = [r["id"] for r in cursor.fetchall()]
        for c in children:
            if c not in descendants:
                descendants.add(c)
                queue.append(c)
    return descendants

def get_list_video_ids(conn: sqlite3.Connection, list_id: str, recursive: bool = True) -> List[str]:
    """
    Returns unique video IDs belonging to this list (and its descendants if recursive=True).
    """
    cursor = conn.cursor()
    if not recursive:
        cursor.execute("SELECT DISTINCT video_id FROM list_videos WHERE list_id = ?", (list_id,))
        return [r["video_id"] for r in cursor.fetchall()]

    all_list_ids = list(get_descendant_list_ids(conn, list_id))
    placeholders = ",".join("?" for _ in all_list_ids)
    cursor.execute(f"SELECT DISTINCT video_id FROM list_videos WHERE list_id IN ({placeholders})", all_list_ids)
    return [r["video_id"] for r in cursor.fetchall()]

def get_list_summary_stats(conn: sqlite3.Connection, list_id: str) -> Dict[str, Any]:
    """
    Computes combined performance stats reflecting every video assigned to this list
    and all its child lists' videos.
    """
    v_ids = get_list_video_ids(conn, list_id, recursive=True)
    if not v_ids:
        return {
            "video_count": 0,
            "total_views": 0,
            "total_watch_time": 0.0,
            "total_subscribers": 0,
            "avg_ctr": 0.0,
            "avg_view_duration": 0,
            "yoy_views_growth": 0.0
        }

    placeholders = ",".join("?" for _ in v_ids)
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT 
            COUNT(id) as video_count,
            COALESCE(SUM(views), 0) as total_views,
            COALESCE(SUM(watch_time_hours), 0.0) as total_watch_time,
            COALESCE(SUM(subscribers_gained), 0) as total_subscribers,
            ROUND(AVG(ctr), 2) as avg_ctr,
            ROUND(AVG(avg_view_duration), 0) as avg_avd
        FROM videos
        WHERE id IN ({placeholders})
    """, v_ids)
    row = dict(cursor.fetchone())

    # Calculate YoY Views Growth (2024 vs 2023)
    cursor.execute(f"""
        SELECT 
            SUM(CASE WHEN month LIKE '2024%' THEN views ELSE 0 END) as cur_views,
            SUM(CASE WHEN month LIKE '2023%' THEN views ELSE 0 END) as prev_views
        FROM monthly_metrics
        WHERE video_id IN ({placeholders})
    """, v_ids)
    yoy_row = cursor.fetchone()
    cur_v = yoy_row["cur_views"] or 0
    prev_v = yoy_row["prev_views"] or 0
    growth = round(((cur_v - prev_v) / (prev_v if prev_v > 0 else 1)) * 100, 1)

    return {
        "video_count": row["video_count"],
        "total_views": row["total_views"],
        "total_watch_time": round(row["total_watch_time"], 1),
        "total_subscribers": row["total_subscribers"],
        "avg_ctr": row["avg_ctr"] or 0.0,
        "avg_view_duration": int(row["avg_avd"] or 0),
        "yoy_views_growth": growth
    }

# -------------------------------------------------------------
# Reusable Component Engine: 12-Month Trend with YoY Comparison
# -------------------------------------------------------------

def get_12m_yoy_trend(scope_type: str = "channel", scope_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Computes 12-month performance, comparing each month against the same month of the previous year.
    Supported scopes: 'channel', 'list' (with recursive child rollup), 'video'.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Determine targeted video IDs
    if scope_type == "video":
        v_ids = [scope_id]
    elif scope_type == "list":
        v_ids = get_list_video_ids(conn, scope_id, recursive=True)
    else:
        # channel-wide
        cursor.execute("SELECT id FROM videos")
        v_ids = [r["id"] for r in cursor.fetchall()]

    if not v_ids:
        conn.close()
        return {"scope_type": scope_type, "scope_id": scope_id, "months": [], "totals": {}}

    placeholders = ",".join("?" for _ in v_ids)

    # Fetch monthly sums for 2023 and 2024
    cursor.execute(f"""
        SELECT 
            month,
            SUM(views) as views,
            SUM(watch_time_hours) as watch_time_hours,
            SUM(subscribers_gained) as subscribers_gained,
            SUM(impressions) as impressions,
            CASE 
                WHEN SUM(impressions) > 0 
                THEN ROUND(SUM(impressions * ctr) / SUM(impressions), 2)
                ELSE ROUND(AVG(ctr), 2)
            END as weighted_ctr
        FROM monthly_metrics
        WHERE video_id IN ({placeholders})
          AND (month LIKE '2023%' OR month LIKE '2024%')
        GROUP BY month
        ORDER BY month ASC
    """, v_ids)

    monthly_map = {r["month"]: dict(r) for r in cursor.fetchall()}
    conn.close()

    months_result = []
    tot_cur_views, tot_prev_views = 0, 0
    tot_cur_watch, tot_prev_watch = 0.0, 0.0
    tot_cur_subs, tot_prev_subs = 0, 0

    # 12 months (01 to 12)
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for i in range(1, 13):
        m_str = f"{i:02d}"
        cur_key = f"2024-{m_str}"
        prev_key = f"2023-{m_str}"

        cur = monthly_map.get(cur_key, {"views": 0, "watch_time_hours": 0.0, "subscribers_gained": 0, "weighted_ctr": 0.0})
        prev = monthly_map.get(prev_key, {"views": 0, "watch_time_hours": 0.0, "subscribers_gained": 0, "weighted_ctr": 0.0})

        c_v, p_v = cur["views"] or 0, prev["views"] or 0
        c_w, p_w = round(cur["watch_time_hours"] or 0.0, 1), round(prev["watch_time_hours"] or 0.0, 1)
        c_s, p_s = cur["subscribers_gained"] or 0, prev["subscribers_gained"] or 0
        c_ctr, p_ctr = cur["weighted_ctr"] or 0.0, prev["weighted_ctr"] or 0.0

        v_yoy = round(((c_v - p_v) / (p_v if p_v > 0 else 1)) * 100, 1)
        w_yoy = round(((c_w - p_w) / (p_w if p_w > 0 else 1)) * 100, 1)
        s_yoy = round(((c_s - p_s) / (p_s if p_s > 0 else 1)) * 100, 1)
        ctr_yoy = round(c_ctr - p_ctr, 2)

        tot_cur_views += c_v
        tot_prev_views += p_v
        tot_cur_watch += c_w
        tot_prev_watch += p_w
        tot_cur_subs += c_s
        tot_prev_subs += p_s

        months_result.append({
            "month_num": i,
            "month_label": month_names[i-1],
            "cur_month": cur_key,
            "prev_month": prev_key,
            "seasonality": get_exam_seasonality(cur_key),
            "views": {"cur": c_v, "prev": p_v, "yoy_pct": v_yoy},
            "watch_time": {"cur": c_w, "prev": p_w, "yoy_pct": w_yoy},
            "subscribers": {"cur": c_s, "prev": p_s, "yoy_pct": s_yoy},
            "ctr": {"cur": c_ctr, "prev": p_ctr, "yoy_delta": ctr_yoy}
        })

    totals = {
        "views": {
            "cur": tot_cur_views,
            "prev": tot_prev_views,
            "yoy_pct": round(((tot_cur_views - tot_prev_views) / (tot_prev_views if tot_prev_views > 0 else 1)) * 100, 1)
        },
        "watch_time": {
            "cur": round(tot_cur_watch, 1),
            "prev": round(tot_prev_watch, 1),
            "yoy_pct": round(((tot_cur_watch - tot_prev_watch) / (tot_prev_watch if tot_prev_watch > 0 else 1)) * 100, 1)
        },
        "subscribers": {
            "cur": tot_cur_subs,
            "prev": tot_prev_subs,
            "yoy_pct": round(((tot_cur_subs - tot_prev_subs) / (tot_prev_subs if tot_prev_subs > 0 else 1)) * 100, 1)
        }
    }

    return {
        "scope_type": scope_type,
        "scope_id": scope_id,
        "months": months_result,
        "totals": totals
    }

# -------------------------------------------------------------
# Section 01: Channel Summary
# -------------------------------------------------------------

def get_channel_summary() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    # Query video stats, excluding legacy demo/seed videos if real videos exist
    cursor.execute("SELECT COUNT(*) FROM videos WHERE id NOT LIKE 'cfa_%' AND id NOT LIKE 'frm_%' AND id NOT LIKE 'gen_%'")
    real_count = cursor.fetchone()[0]
    demo_filter = "WHERE id NOT LIKE 'cfa_%' AND id NOT LIKE 'frm_%' AND id NOT LIKE 'gen_%'" if real_count > 0 else ""

    cursor.execute(f"""
        SELECT 
            COUNT(id) as total_videos,
            COALESCE(SUM(views), 0) as total_views,
            COALESCE(SUM(watch_time_hours), 0.0) as total_watch_time,
            COALESCE(SUM(subscribers_gained), 0) as total_subscribers,
            ROUND(AVG(ctr), 2) as avg_ctr,
            ROUND(AVG(avg_view_duration), 0) as avg_avd
        FROM videos
        {demo_filter}
    """)
    row = dict(cursor.fetchone())

    # YoY channel views growth
    mm_filter = "WHERE video_id NOT LIKE 'cfa_%' AND video_id NOT LIKE 'frm_%' AND video_id LIKE 'gen_%'" if real_count > 0 else ""
    cursor.execute("""
        SELECT 
            SUM(CASE WHEN month LIKE '2024%' THEN views ELSE 0 END) as cur_views,
            SUM(CASE WHEN month LIKE '2023%' THEN views ELSE 0 END) as prev_views
        FROM monthly_metrics
    """)
    yoy = cursor.fetchone()
    cur_v = yoy["cur_views"] or 0
    prev_v = yoy["prev_views"] or 0
    views_growth = round(((cur_v - prev_v) / (prev_v if prev_v > 0 else 1)) * 100, 1)

    # Check for accurate channel subscriber count and channel views in settings
    cursor.execute("SELECT key, value FROM settings WHERE key IN ('channel_subscribers', 'manual_channel_subscribers', 'channel_views', 'manual_channel_views')")
    s_rows = {r["key"]: r["value"] for r in cursor.fetchall()}
    
    channel_subs = None
    if s_rows.get("manual_channel_subscribers"):
        try:
            channel_subs = int(s_rows["manual_channel_subscribers"])
        except (ValueError, TypeError):
            pass
    if channel_subs is None and s_rows.get("channel_subscribers"):
        try:
            channel_subs = int(s_rows["channel_subscribers"])
        except (ValueError, TypeError):
            pass

    channel_views = None
    if s_rows.get("manual_channel_views"):
        try:
            channel_views = int(s_rows["manual_channel_views"])
        except (ValueError, TypeError):
            pass
    if channel_views is None and s_rows.get("channel_views"):
        try:
            channel_views = int(s_rows["channel_views"])
        except (ValueError, TypeError):
            pass

    conn.close()
    return {
        "total_videos": row["total_videos"],
        "total_views": channel_views if (channel_views is not None and channel_views > 0) else row["total_views"],
        "total_watch_time": round(row["total_watch_time"], 1),
        "total_subscribers": channel_subs if channel_subs is not None else row["total_subscribers"],
        "avg_ctr": row["avg_ctr"] or 0.0,
        "avg_view_duration": int(row["avg_avd"] or 0),
        "yoy_growth_pct": views_growth
    }

# -------------------------------------------------------------
# Section 02 & 03: Course & List Overview + Recursive Drill-Down
# -------------------------------------------------------------

def get_all_lists_overview() -> Dict[str, Any]:
    """
    Returns all lists with rollup performance stats, segregated into:
    - course_blocks: lists with is_course = 1 (Section 02)
    - pinned_blocks: lists pinned by user for Section 03
    - all_lists: full catalog for custom list picker
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM lists ORDER BY is_course DESC, name ASC")
    raw_lists = [dict(r) for r in cursor.fetchall()]

    # Load pinned list preferences
    cursor.execute("SELECT value FROM settings WHERE key = 'pinned_dashboard_lists'")
    pref_row = cursor.fetchone()
    pinned_ids = json.loads(pref_row["value"]) if pref_row and pref_row["value"] else ["list_cfa_l1", "list_frm_p1", "list_marathons", "list_cfa_l1_fi"]

    all_lists = []
    course_blocks = []
    pinned_blocks = []

    for l in raw_lists:
        lid = l["id"]
        stats = get_list_summary_stats(conn, lid)
        obj = {
            **l,
            "stats": stats
        }
        all_lists.append(obj)
        if l["is_course"]:
            course_blocks.append(obj)
        if lid in pinned_ids:
            pinned_blocks.append(obj)

    conn.close()
    return {
        "course_blocks": course_blocks,
        "pinned_blocks": pinned_blocks,
        "all_lists": all_lists,
        "pinned_ids": pinned_ids
    }

def get_list_detail(list_id: str) -> Dict[str, Any]:
    """
    Recursive detailed list view:
    1. Top: 12-Month Trend with YoY comparison
    2. Then: Subject-wise performance (immediate child lists)
    3. Then: Video-wise performance (videos mapped directly to this list or its children)
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM lists WHERE id = ?", (list_id,))
    list_info = cursor.fetchone()
    if not list_info:
        conn.close()
        return None
    list_info = dict(list_info)

    # Compute rollup stats for this list
    stats = get_list_summary_stats(conn, list_id)

    # 1. 12-month YoY trend
    trend = get_12m_yoy_trend(scope_type="list", scope_id=list_id)

    # 2. Child Lists (Subject-wise performance)
    cursor.execute("SELECT * FROM lists WHERE parent_id = ? ORDER BY name ASC", (list_id,))
    children = [dict(r) for r in cursor.fetchall()]
    child_blocks = []
    for ch in children:
        ch_stats = get_list_summary_stats(conn, ch["id"])
        child_blocks.append({
            **ch,
            "stats": ch_stats
        })

    # 3. Video-wise performance (all videos in list and descendants)
    v_ids = get_list_video_ids(conn, list_id, recursive=True)
    videos = []
    if v_ids:
        placeholders = ",".join("?" for _ in v_ids)
        cursor.execute(f"""
            SELECT * FROM videos WHERE id IN ({placeholders}) ORDER BY views DESC
        """, v_ids)
        videos = [dict(r) for r in cursor.fetchall()]

    # Breadcrumb ancestry
    breadcrumbs = []
    curr = list_info
    while curr:
        breadcrumbs.insert(0, {"id": curr["id"], "name": curr["name"]})
        if curr["parent_id"]:
            cursor.execute("SELECT * FROM lists WHERE id = ?", (curr["parent_id"],))
            p = cursor.fetchone()
            curr = dict(p) if p else None
        else:
            curr = None

    conn.close()
    return {
        "list": list_info,
        "breadcrumbs": breadcrumbs,
        "stats": stats,
        "trend": trend,
        "child_lists": child_blocks,
        "videos": videos
    }

def get_video_detail(video_id: str) -> Dict[str, Any]:
    """
    Single Video detail view:
    1. Top: 12-Month Trend with YoY comparison for this video
    2. Video stats, categories, and all lists this video belongs to
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM videos WHERE id = ?", (video_id,))
    v = cursor.fetchone()
    if not v:
        conn.close()
        return None
    video_info = dict(v)

    # Fetch lists this video belongs to
    cursor.execute("""
        SELECT l.id, l.name, l.parent_id, l.is_course 
        FROM list_videos lv
        JOIN lists l ON lv.list_id = l.id
        WHERE lv.video_id = ?
    """, (video_id,))
    member_lists = [dict(r) for r in cursor.fetchall()]

    # 12-month YoY trend for this video
    trend = get_12m_yoy_trend(scope_type="video", scope_id=video_id)

    conn.close()
    return {
        "video": video_info,
        "member_lists": member_lists,
        "trend": trend
    }

# -------------------------------------------------------------
# Existing Leaderboard, Low-CTR, Change-Log, Competitors
# -------------------------------------------------------------

def get_monthly_leaderboard(dimension: str = "course", start_month: Optional[str] = None, end_month: Optional[str] = None) -> Dict[str, Any]:
    valid_dimensions = ["course", "topic", "format"]
    if dimension not in valid_dimensions:
        dimension = "course"

    conn = get_connection()
    query = f"""
        SELECT 
            m.month,
            v.{dimension} as dim_val,
            SUM(m.views) as total_views,
            SUM(m.watch_time_hours) as total_watch_time,
            SUM(m.impressions) as total_impressions,
            CASE 
                WHEN SUM(m.impressions) > 0 
                THEN ROUND(SUM(m.impressions * m.ctr) / SUM(m.impressions), 2)
                ELSE ROUND(AVG(m.ctr), 2)
            END as weighted_ctr,
            ROUND(AVG(m.avg_view_duration), 0) as avg_avd,
            COUNT(DISTINCT v.id) as video_count
        FROM monthly_metrics m
        JOIN videos v ON m.video_id = v.id
        WHERE 1=1
    """
    params = []
    if start_month:
        query += " AND m.month >= ?"
        params.append(start_month)
    if end_month:
        query += " AND m.month <= ?"
        params.append(end_month)

    query += f" GROUP BY m.month, v.{dimension} ORDER BY m.month DESC, total_views DESC"

    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    months_dict = {}
    distinct_dimensions = set()

    for r in rows:
        m = r["month"]
        d = r["dim_val"]
        distinct_dimensions.add(d)

        if m not in months_dict:
            months_dict[m] = {
                "month": m,
                "seasonality": get_exam_seasonality(m),
                "total_views": 0,
                "total_watch_time": 0.0,
                "total_impressions": 0,
                "breakdown": {}
            }

        months_dict[m]["total_views"] += r["total_views"]
        months_dict[m]["total_watch_time"] += round(r["total_watch_time"], 1)
        months_dict[m]["total_impressions"] += r["total_impressions"]
        months_dict[m]["breakdown"][d] = {
            "views": r["total_views"],
            "watch_time_hours": round(r["total_watch_time"], 1),
            "impressions": r["total_impressions"],
            "ctr": r["weighted_ctr"],
            "avg_avd": int(r["avg_avd"] or 0),
            "video_count": r["video_count"]
        }

    return {
        "dimension": dimension,
        "distinct_dimensions": sorted(list(distinct_dimensions)),
        "months": list(months_dict.values())
    }

def get_low_ctr_triage() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            course,
            format,
            ROUND(AVG(ctr), 2) as baseline_ctr,
            ROUND(AVG(views), 0) as avg_views,
            COUNT(*) as sample_size
        FROM videos
        GROUP BY course, format
    """)
    baselines = {(r["course"], r["format"]): dict(r) for r in cursor.fetchall()}

    cursor.execute("""
        SELECT 
            id, title, course, topic, format, views, impressions, ctr,
            avg_view_duration, watch_time_hours, published_at, thumbnail_url
        FROM videos
        ORDER BY views DESC
    """)
    videos = [dict(r) for r in cursor.fetchall()]
    conn.close()

    flagged = []
    for v in videos:
        key = (v["course"], v["format"])
        base_info = baselines.get(key, {"baseline_ctr": 5.0, "sample_size": 1})
        baseline = base_info["baseline_ctr"]

        ctr = v["ctr"]
        delta = ctr - baseline
        pct_diff = round(((ctr - baseline) / (baseline if baseline > 0 else 1.0)) * 100, 1)
        is_underperforming = (ctr < baseline * 0.98) and (v["impressions"] >= 500)

        recommendations = []
        if is_underperforming:
            if v["format"] == "Revision / Marathon":
                recommendations.append("Add clear exam-year callout and chapter timestamps in thumbnail")
            elif v["format"] == "Core Lecture":
                recommendations.append("Simplify thumbnail text to 3 high-impact words (Topic + Key Formula)")
            elif v["format"] == "Doubt-clearing / Q&A":
                recommendations.append("Highlight the specific tricky question/formula in the title")
            else:
                recommendations.append("A/B test high-contrast thumbnail with bold topic font")

            if "CFA" in v["course"]:
                recommendations.append(f"Ensure '{v['course']}' badge is prominent in top-left corner")
            elif "FRM" in v["course"]:
                recommendations.append(f"Ensure '{v['course']}' badge and exam session callout are prominent in thumbnail")
            else:
                recommendations.append("Add clear topic title and high-contrast thumbnail text")

        status = "NEEDS_FIX" if is_underperforming else ("OPTIMAL" if ctr >= baseline * 1.05 else "AVERAGE")

        flagged.append({
            **v,
            "category_baseline_ctr": baseline,
            "category_sample_size": base_info["sample_size"],
            "ctr_difference": round(delta, 2),
            "ctr_pct_gap": pct_diff,
            "status": status,
            "is_flagged": is_underperforming,
            "recommendations": recommendations
        })

    flagged.sort(key=lambda x: (not x["is_flagged"], x["ctr_pct_gap"]))
    return flagged

def calculate_change_impact(
    ctr_before: float, 
    ctr_after: float, 
    channel_ctr_before: float, 
    channel_ctr_after: float
) -> float:
    video_delta = ctr_after - ctr_before
    channel_delta = channel_ctr_after - channel_ctr_before
    return round(video_delta - channel_delta, 2)

def get_change_log_analysis() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            c.id, c.video_id, c.change_date, c.change_type,
            c.old_title, c.new_title, c.old_thumbnail, c.new_thumbnail,
            c.notes, c.ctr_before_14d, c.ctr_after_14d,
            c.channel_ctr_before_14d, c.channel_ctr_after_14d,
            c.impact_score, c.views_before_14d, c.views_after_14d,
            v.title as current_title, v.course, v.topic, v.format, v.thumbnail_url
        FROM change_log c
        JOIN videos v ON c.video_id = v.id
        ORDER BY c.change_date DESC
    """)
    changes = [dict(r) for r in cursor.fetchall()]

    type_stats = {}
    for ch in changes:
        ct = ch["change_type"]
        if ct not in type_stats:
            type_stats[ct] = {
                "count": 0,
                "total_impact": 0.0,
                "positive_count": 0,
                "avg_impact": 0.0
            }
        type_stats[ct]["count"] += 1
        type_stats[ct]["total_impact"] += ch["impact_score"]
        if ch["impact_score"] > 0:
            type_stats[ct]["positive_count"] += 1

    for ct, data in type_stats.items():
        if data["count"] > 0:
            data["avg_impact"] = round(data["total_impact"] / data["count"], 2)
            data["win_rate"] = round((data["positive_count"] / data["count"]) * 100, 1)

    conn.close()
    return {
        "changes": changes,
        "strategy_insights": type_stats
    }

def get_competitor_analysis() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM competitors ORDER BY subscriber_count DESC")
    competitors = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT 
            cv.*,
            c.name as channel_name,
            c.avatar_url as channel_avatar
        FROM competitor_videos cv
        JOIN competitors c ON cv.channel_id = c.id
        ORDER BY cv.velocity DESC
    """)
    videos = [dict(r) for r in cursor.fetchall()]

    topic_aggregates = {}
    for v in videos:
        top = v["topic"] or "General"
        if top not in topic_aggregates:
            topic_aggregates[top] = {
                "topic": top,
                "video_count": 0,
                "total_velocity": 0.0,
                "high_outliers": 0
            }
        topic_aggregates[top]["video_count"] += 1
        topic_aggregates[top]["total_velocity"] += v["velocity"]
        if v["outlier_score"] >= 1.5:
            topic_aggregates[top]["high_outliers"] += 1

    for t, data in topic_aggregates.items():
        data["avg_velocity"] = round(data["total_velocity"] / (data["video_count"] or 1), 1)

    sorted_topics = sorted(topic_aggregates.values(), key=lambda x: x["avg_velocity"], reverse=True)

    conn.close()
    return {
        "competitors": competitors,
        "videos": videos,
        "top_performing_topics": sorted_topics
    }

# -------------------------------------------------------------
# Upload Planner Engine (Sessions, Targets, Planned Entries, Pacing)
# -------------------------------------------------------------

def calculate_pacing(target: int, uploaded: int, end_date_str: str, start_date_str: Optional[str] = None) -> Dict[str, Any]:
    """
    Computes semantic status and pacing metrics based on upload velocity:
    - TARGET_MET: Uploaded >= Target (#3EA65E, checkmark)
    - ON_TRACK: Pace needed <= recent velocity (#3EA65E, checkmark)
    - AT_RISK: Pace needed noticeably higher than recent velocity (#E8A33D, warning triangle)
    - CRITICAL: Pace needed unrealistic or overdue (#FF0000, filled dot)
    - NO_TARGET: Target <= 0 (#5A5A5A, outline dot)
    """
    if target <= 0:
        return {
            "target": 0,
            "uploaded": uploaded,
            "remaining": 0,
            "completion_pct": 0.0,
            "weeks_remaining": 0.0,
            "pace_needed": 0.0,
            "velocity": 0.0,
            "status": "NO_TARGET",
            "color": "#5A5A5A",
            "icon": "circle_outline",
            "status_label": "No target set",
            "display_text": "No target set"
        }

    remaining = max(0, target - uploaded)
    completion_pct = round(min(100.0, (uploaded / target) * 100), 1)

    if uploaded >= target:
        return {
            "target": target,
            "uploaded": uploaded,
            "remaining": 0,
            "completion_pct": 100.0,
            "weeks_remaining": 0.0,
            "pace_needed": 0.0,
            "velocity": 0.0,
            "status": "TARGET_MET",
            "color": "#3EA65E",
            "icon": "check",
            "status_label": "Target met",
            "display_text": "Target met"
        }

    try:
        end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")
        now = datetime.now()
        days_remaining = (end_dt - now).days + 1
        weeks_remaining = max(0.0, days_remaining / 7.0)

        if days_remaining <= 0:
            return {
                "target": target,
                "uploaded": uploaded,
                "remaining": remaining,
                "completion_pct": completion_pct,
                "weeks_remaining": 0.0,
                "pace_needed": float(remaining),
                "velocity": 0.0,
                "status": "CRITICAL",
                "color": "#FF0000",
                "icon": "filled_dot",
                "status_label": "Overdue",
                "display_text": f"{remaining} behind (Session ended)"
            }

        pace = round(remaining / max(0.1, weeks_remaining), 1)

        # Recent upload velocity calculation
        velocity = 0.0
        if start_date_str:
            try:
                start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
                if now > start_dt:
                    weeks_elapsed = max(1.0, (now - start_dt).days / 7.0)
                    velocity = round(uploaded / weeks_elapsed, 2)
                else:
                    # Session hasn't started yet: expected pace is target / total duration
                    total_weeks = max(1.0, (end_dt - start_dt).days / 7.0)
                    velocity = round(target / total_weeks, 2)
            except Exception:
                velocity = 0.0

        # Semantic status classification based on velocity vs pace needed
        if velocity <= 0.05:
            if pace <= 1.0:
                status = "ON_TRACK"
                color = "#3EA65E"
                icon = "check"
                status_label = "On track"
            elif pace <= 2.2:
                status = "AT_RISK"
                color = "#E8A33D"
                icon = "warning"
                status_label = "At risk"
            else:
                status = "CRITICAL"
                color = "#FF0000"
                icon = "filled_dot"
                status_label = "Critical"
        else:
            ratio = pace / velocity
            if ratio <= 1.25:
                status = "ON_TRACK"
                color = "#3EA65E"
                icon = "check"
                status_label = "On track"
            elif ratio <= 2.0:
                status = "AT_RISK"
                color = "#E8A33D"
                icon = "warning"
                status_label = "At risk"
            else:
                status = "CRITICAL"
                color = "#FF0000"
                icon = "filled_dot"
                status_label = "Critical"

        # If session ends very soon (<= 2 weeks) with a notable backlog, escalate to critical
        if weeks_remaining <= 2.0 and remaining >= 3:
            status = "CRITICAL"
            color = "#FF0000"
            icon = "filled_dot"
            status_label = "Critical"

        return {
            "target": target,
            "uploaded": uploaded,
            "remaining": remaining,
            "completion_pct": completion_pct,
            "weeks_remaining": round(weeks_remaining, 1),
            "pace_needed": pace,
            "velocity": velocity,
            "status": status,
            "color": color,
            "icon": icon,
            "status_label": status_label,
            "display_text": f"{pace} vids/week needed"
        }
    except Exception:
        return {
            "target": target,
            "uploaded": uploaded,
            "remaining": remaining,
            "completion_pct": completion_pct,
            "weeks_remaining": 0.0,
            "pace_needed": 0.0,
            "velocity": 0.0,
            "status": "NO_TARGET",
            "color": "#5A5A5A",
            "icon": "circle_outline",
            "status_label": "Date error",
            "display_text": "Date error"
        }

def get_upload_planner_overview() -> Dict[str, Any]:
    """
    Returns summary of all exam sessions with session-level Targets, Planned, Uploaded,
    completion %, and pacing indicators.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sessions ORDER BY start_date ASC")
    sessions_rows = [dict(r) for r in cursor.fetchall()]

    sessions_data = []
    for s in sessions_rows:
        s_id = s["id"]
        # Total targets set for this session
        cursor.execute("SELECT SUM(target_count) as total_target FROM list_targets WHERE session_id = ?", (s_id,))
        t_row = cursor.fetchone()
        target_count = t_row["total_target"] if t_row and t_row["total_target"] is not None else 0

        # Planned videos in this session
        cursor.execute("SELECT count(*) as cnt FROM planned_videos WHERE session_id = ?", (s_id,))
        planned_count = cursor.fetchone()["cnt"]

        # Uploaded videos in this session
        cursor.execute("SELECT count(*) as cnt FROM planned_videos WHERE session_id = ? AND status = 'Uploaded'", (s_id,))
        uploaded_count = cursor.fetchone()["cnt"]

        pacing = calculate_pacing(target_count, uploaded_count, s["end_date"], s.get("start_date"))

        sessions_data.append({
            "id": s["id"],
            "name": s["name"],
            "start_date": s["start_date"],
            "end_date": s["end_date"],
            "is_active": bool(s["is_active"]),
            "target": target_count,
            "planned": planned_count,
            "uploaded": uploaded_count,
            "completion_pct": pacing["completion_pct"] if "completion_pct" in pacing else 0,
            "pacing": pacing
        })

    # Evergreen / Unassigned Planned Videos Count
    cursor.execute("SELECT count(*) as cnt FROM planned_videos WHERE session_id IS NULL OR session_id = ''")
    evergreen_count = cursor.fetchone()["cnt"]

    # Pending Review Queue Count
    cursor.execute("SELECT count(*) as cnt FROM match_review_queue WHERE status = 'PENDING'")
    review_queue_count = cursor.fetchone()["cnt"]

    conn.close()
    return {
        "sessions": sessions_data,
        "evergreen_planned_count": evergreen_count,
        "review_queue_count": review_queue_count
    }

def get_session_details(session_id: str) -> Dict[str, Any]:
    """
    Returns full details for a session:
    - Session info & overall pacing
    - Course & Subject breakdown blocks (List block pattern) with Targets, Planned, Uploaded, Pacing
    - Planned Video Entries belonging to this session
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    s_row = cursor.fetchone()
    if not s_row:
        conn.close()
        return None

    session = dict(s_row)

    # 1. Fetch all lists with hierarchy
    cursor.execute("SELECT id, name, parent_id, is_course FROM lists ORDER BY is_course DESC, name ASC")
    all_lists = [dict(r) for r in cursor.fetchall()]

    # 2. Fetch targets for this session
    cursor.execute("SELECT list_id, target_count FROM list_targets WHERE session_id = ?", (session_id,))
    targets_map = {r["list_id"]: r["target_count"] for r in cursor.fetchall()}

    # 3. Fetch planned video counts & uploaded counts per list for this session
    cursor.execute("""
        SELECT 
            pvl.list_id,
            COUNT(pv.id) as planned_count,
            SUM(CASE WHEN pv.status = 'Uploaded' THEN 1 ELSE 0 END) as uploaded_count
        FROM planned_video_lists pvl
        JOIN planned_videos pv ON pvl.planned_video_id = pv.id
        WHERE pv.session_id = ?
        GROUP BY pvl.list_id
    """, (session_id,))
    counts_map = {r["list_id"]: {"planned": r["planned_count"], "uploaded": r["uploaded_count"]} for r in cursor.fetchall()}

    list_blocks = []
    overall_target = 0
    overall_uploaded = 0
    overall_planned = 0

    for l in all_lists:
        lid = l["id"]
        t = targets_map.get(lid, 0)
        c = counts_map.get(lid, {"planned": 0, "uploaded": 0})
        pacing = calculate_pacing(t, c["uploaded"], session["end_date"], session.get("start_date"))

        overall_target += t
        overall_planned += c["planned"]
        overall_uploaded += c["uploaded"]

        list_blocks.append({
            "id": lid,
            "name": l["name"],
            "parent_id": l["parent_id"],
            "is_course": bool(l["is_course"]),
            "target": t,
            "planned": c["planned"],
            "uploaded": c["uploaded"],
            "completion_pct": pacing.get("completion_pct", 0),
            "pacing": pacing
        })

    session_pacing = calculate_pacing(overall_target, overall_uploaded, session["end_date"], session.get("start_date"))
    session["overall_stats"] = {
        "target": overall_target,
        "planned": overall_planned,
        "uploaded": overall_uploaded,
        "completion_pct": session_pacing.get("completion_pct", 0),
        "pacing": session_pacing
    }

    # 4. Fetch planned videos in this session
    cursor.execute("""
        SELECT 
            pv.*,
            v.title as linked_video_title,
            v.published_at as linked_video_published_at,
            v.views as linked_video_views
        FROM planned_videos pv
        LEFT JOIN videos v ON pv.linked_video_id = v.id
        WHERE pv.session_id = ?
        ORDER BY pv.created_at DESC
    """, (session_id,))
    pv_rows = [dict(r) for r in cursor.fetchall()]

    # Fetch list associations for these videos
    for pv in pv_rows:
        cursor.execute("""
            SELECT l.id, l.name
            FROM planned_video_lists pvl
            JOIN lists l ON pvl.list_id = l.id
            WHERE pvl.planned_video_id = ?
        """, (pv["id"],))
        pv["lists"] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "session": session,
        "list_blocks": list_blocks,
        "planned_videos": pv_rows
    }

def get_planned_videos_filtered(session_id: Optional[str] = None, list_id: Optional[str] = None, status: Optional[str] = None, content_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns planned videos with flexible filters across Session, List, Status, and Content Type.
    """
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT DISTINCT
            pv.*,
            s.name as session_name,
            v.title as linked_video_title,
            v.published_at as linked_video_published_at,
            v.views as linked_video_views,
            v.likes as linked_video_likes,
            v.comments as linked_video_comments
        FROM planned_videos pv
        LEFT JOIN sessions s ON pv.session_id = s.id
        LEFT JOIN videos v ON pv.linked_video_id = v.id
        LEFT JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
        WHERE 1=1
    """
    params = []

    if session_id:
        if session_id == "EVERGREEN":
            query += " AND (pv.session_id IS NULL OR pv.session_id = '')"
        else:
            query += " AND pv.session_id = ?"
            params.append(session_id)

    if list_id:
        query += " AND pvl.list_id = ?"
        params.append(list_id)

    if status and status != "ALL":
        query += " AND pv.status = ?"
        params.append(status)

    if content_type and content_type != "ALL":
        if content_type == "video":
            query += " AND (pv.content_type = 'video' OR pv.content_type IS NULL OR pv.content_type = '')"
        else:
            query += " AND pv.content_type = ?"
            params.append(content_type)

    query += " ORDER BY pv.created_at DESC"
    cursor.execute(query, tuple(params))
    videos = [dict(r) for r in cursor.fetchall()]

    for v in videos:
        cursor.execute("""
            SELECT l.id, l.name, l.is_course, l.parent_id
            FROM planned_video_lists pvl
            JOIN lists l ON pvl.list_id = l.id
            WHERE pvl.planned_video_id = ?
        """, (v["id"],))
        v["lists"] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return videos

def get_shorts_overview(session_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns dedicated performance metrics, stage pipeline, and series breakdown for YouTube Shorts.
    """
    conn = get_connection()
    cursor = conn.cursor()

    active_session = None
    if session_id and session_id not in ("ALL", "EVERGREEN", ""):
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        s_row = cursor.fetchone()
        if s_row:
            active_session = dict(s_row)

    query = """
        SELECT DISTINCT
            pv.*,
            s.name as session_name,
            v.title as linked_video_title,
            v.published_at as linked_video_published_at,
            v.views as linked_video_views,
            v.likes as linked_video_likes,
            v.comments as linked_video_comments
        FROM planned_videos pv
        LEFT JOIN sessions s ON pv.session_id = s.id
        LEFT JOIN videos v ON pv.linked_video_id = v.id
        WHERE pv.content_type = 'short'
    """
    params = []
    if session_id:
        if session_id == "EVERGREEN":
            query += " AND (pv.session_id IS NULL OR pv.session_id = '')"
        elif session_id != "ALL":
            query += " AND pv.session_id = ?"
            params.append(session_id)

    query += " ORDER BY pv.created_at DESC"
    cursor.execute(query, tuple(params))
    shorts = [dict(r) for r in cursor.fetchall()]

    for sh in shorts:
        cursor.execute("""
            SELECT l.id, l.name, l.is_course, l.parent_id
            FROM planned_video_lists pvl
            JOIN lists l ON pvl.list_id = l.id
            WHERE pvl.planned_video_id = ?
        """, (sh["id"],))
        sh["lists"] = [dict(r) for r in cursor.fetchall()]

    stage_counts = {
        "Idea": 0,
        "Scripted": 0,
        "Recorded": 0,
        "Scheduled": 0,
        "Uploaded": 0
    }
    series_counts = {}
    course_counts = {}
    total_views = 0
    total_likes = 0

    for sh in shorts:
        st = sh.get("production_stage") or (sh.get("status") if sh.get("status") in ["Uploaded", "Scheduled"] else "Idea")
        if st in stage_counts:
            stage_counts[st] += 1
        else:
            stage_counts["Idea"] += 1

        ser = sh.get("series") or "General Bite"
        series_counts[ser] = series_counts.get(ser, 0) + 1

        c_name = "Unassigned"
        for l in sh.get("lists", []):
            if l.get("is_course") or l["id"] in ['list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2']:
                c_name = l["name"]
                break
        course_counts[c_name] = course_counts.get(c_name, 0) + 1

        if sh.get("linked_video_views"):
            total_views += sh["linked_video_views"]
        if sh.get("linked_video_likes"):
            total_likes += sh["linked_video_likes"]

    # Target calculation
    target = 0
    if active_session:
        target = active_session.get("shorts_target") or 0
    else:
        cursor.execute("SELECT SUM(shorts_target) as tot_st FROM sessions")
        st_row = cursor.fetchone()
        target = st_row["tot_st"] if st_row and st_row["tot_st"] is not None else 0

    uploaded_count = stage_counts.get("Uploaded", 0)
    planned_count = len(shorts)

    end_date = active_session.get("end_date") if active_session else None
    start_date = active_session.get("start_date") if active_session else None

    if target > 0 and end_date:
        pacing = calculate_pacing(target, uploaded_count, end_date, start_date)
    else:
        pacing = {
            "status": "NO_TARGET" if target <= 0 else "ON_TRACK",
            "completion_pct": round((uploaded_count / max(1, target)) * 100, 1) if target > 0 else (round((uploaded_count / max(1, planned_count)) * 100, 1) if planned_count > 0 else 0.0),
            "display_text": f"{uploaded_count} uploaded" if target <= 0 else f"{uploaded_count} of {target} target",
            "color": "#3EA65E" if uploaded_count >= target and target > 0 else "#5A5A5A"
        }

    cursor.execute("SELECT id, name, start_date, end_date, is_active, shorts_target FROM sessions ORDER BY start_date ASC")
    sessions_list = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "session_id": session_id,
        "active_session": active_session,
        "available_sessions": sessions_list,
        "target": target,
        "planned_total": planned_count,
        "stage_counts": stage_counts,
        "series_counts": series_counts,
        "course_counts": course_counts,
        "total_views": total_views,
        "total_likes": total_likes,
        "pacing": pacing,
        "shorts": shorts
    }

# -------------------------------------------------------------
# Title Similarity Matching Algorithm (Enhanced)
# -------------------------------------------------------------

def clean_title_for_matching(s: str) -> str:
    if not s:
        return ""
    # Strip hashtags
    s = re.sub(r'#\w+', '', s)
    # Strip course names and exam levels e.g. CFA Level 1/2/3, FRM Part 1/2, CA Final
    s = re.sub(r'\b(cfa|frm)\s*(level|part)?\s*[123iIvV]*\b', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(fsa|quant|derivatives|equity|fixed income|ethics|corporate issuers|economics|portfolio management)\b', '', s, flags=re.IGNORECASE)
    # Strip episode / part markers e.g. Part 1, Pt 2, Session, Episode, Ep
    s = re.sub(r'\b(part|pt|ep|episode|session)\s*\d+\b', '', s, flags=re.IGNORECASE)
    # Strip years (e.g. 2021, 2022, 2023, 2024, 2025, 2026, 2027)
    s = re.sub(r'\b202\d\b', '', s)
    # Strip delimiters and punctuation
    s = re.sub(r'[|:–—\-_/()\[\].,!?*]', ' ', s)
    # Collapse multiple whitespaces
    s = re.sub(r'\s+', ' ', s).strip().lower()
    return s

def string_similarity(s1: str, s2: str) -> float:
    """
    Enhanced title similarity using:
    1. Cleaned text SequenceMatcher
    2. Whitespace-agnostic SequenceMatcher (solves compound words e.g. "inter corporate" vs "intercorporate")
    3. Stemmed token set Jaccard
    4. Key phrase containment
    """
    c1 = clean_title_for_matching(s1)
    c2 = clean_title_for_matching(s2)

    if not c1 or not c2:
        return 0.0
    if c1 == c2:
        return 1.0

    # 1. SequenceMatcher on cleaned text
    sm1 = difflib.SequenceMatcher(None, c1, c2).ratio()

    # 2. Whitespace-agnostic SequenceMatcher (catches compound words)
    c1_ns = c1.replace(' ', '')
    c2_ns = c2.replace(' ', '')
    sm2 = difflib.SequenceMatcher(None, c1_ns, c2_ns).ratio()

    # 3. Stemmed token Jaccard similarity
    def stem(w):
        if w.endswith('ies'): return w[:-3] + 'y'
        if w.endswith('es') and len(w) > 4: return w[:-2]
        if w.endswith('s') and len(w) > 3 and not w.endswith('ss'): return w[:-1]
        return w

    tokens1 = set(stem(w) for w in c1.split() if len(w) > 1)
    tokens2 = set(stem(w) for w in c2.split() if len(w) > 1)

    inter = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    jaccard = len(inter) / len(union) if union else 0.0

    # 4. Substring containment bonus (if key topic is completely contained in upload title)
    containment = 0.0
    if (len(c1_ns) >= 8 and c1_ns in c2_ns) or (len(c2_ns) >= 8 and c2_ns in c1_ns):
        containment = 0.85

    # If titles share no words/stems at all and no substring containment, cap at 0.15 (prevents anagram/letter-soup collisions)
    if len(inter) == 0 and containment == 0.0:
        return 0.15

    score = max(sm1, sm2, jaccard, containment)
    return round(score, 3)

def run_auto_matching() -> Dict[str, Any]:
    """
    Runs title similarity matching between published videos in `videos` and open planned entries.
    Every match with confidence >= min_confidence is placed into match_review_queue for user confirmation.
    No videos are silently linked without user confirmation.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get planned videos that do not have a linked_video_id yet
    cursor.execute("SELECT * FROM planned_videos WHERE (linked_video_id IS NULL OR linked_video_id = '')")
    open_planned = [dict(r) for r in cursor.fetchall()]

    # Get published videos
    cursor.execute("SELECT id, title, published_at FROM videos ORDER BY published_at DESC")
    all_videos = [dict(r) for r in cursor.fetchall()]

    review_queue_added = 0
    now_str = datetime.now().isoformat()

    # Query all permanently rejected matches across system
    cursor.execute("SELECT planned_video_id, video_id FROM rejected_matches")
    rejected_pairs = {(r["planned_video_id"], r["video_id"]) for r in cursor.fetchall()}

    for p in open_planned:
        # Check all existing entries for this planned video (PENDING, DISMISSED, etc.)
        cursor.execute("SELECT id, video_id, confidence, status FROM match_review_queue WHERE planned_video_id = ?", (p["id"],))
        existing_rows = [dict(r) for r in cursor.fetchall()]
        
        # Set of video IDs that the user explicitly dismissed/rejected for this planned entry
        dismissed_vids = {r["video_id"] for r in existing_rows if r["status"] in ('DISMISSED', 'REJECTED')}
        has_dismissed = len(dismissed_vids) > 0

        # If user previously dismissed a match for this planned video, require high confidence (>= 0.80) to suggest a new candidate
        min_confidence = 0.80 if has_dismissed else 0.55

        best_match = None
        best_score = 0.0

        for v in all_videos:
            if v["id"] in dismissed_vids or (p["id"], v["id"]) in rejected_pairs:
                continue
            sim = string_similarity(p["title"], v["title"])
            if sim > best_score:
                best_score = sim
                best_match = v

        if best_match and best_score >= min_confidence:
            pending = next((r for r in existing_rows if r["status"] == 'PENDING'), None)
            if pending:
                if best_match["id"] != pending["video_id"] or abs(best_score - pending["confidence"]) > 0.001:
                    cursor.execute("""
                        UPDATE match_review_queue
                        SET video_id = ?, confidence = ?, created_at = ?
                        WHERE id = ?
                    """, (best_match["id"], best_score, now_str, pending["id"]))
            else:
                cursor.execute("""
                    INSERT INTO match_review_queue (planned_video_id, video_id, confidence, status, created_at)
                    VALUES (?, ?, ?, 'PENDING', ?)
                """, (p["id"], best_match["id"], best_score, now_str))
                review_queue_added += 1
        else:
            # If no eligible match >= min_confidence exists (or user dismissed candidates), clear any remaining pending match
            cursor.execute("DELETE FROM match_review_queue WHERE planned_video_id = ? AND status = 'PENDING'", (p["id"],))

    conn.commit()
    conn.close()

    return {
        "review_queue_added": review_queue_added,
        "unlinked_planned_checked": len(open_planned)
    }

def get_review_queue() -> List[Dict[str, Any]]:
    """
    Returns pending matches requiring user confirmation, enriched with views, duration, and watch time.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            mrq.id as queue_id,
            mrq.confidence,
            mrq.status,
            pv.id as planned_id,
            pv.title as planned_title,
            pv.status as planned_status,
            pv.session_id,
            s.name as session_name,
            v.id as video_id,
            v.title as video_title,
            v.thumbnail_url as video_thumbnail,
            v.published_at as video_published_at,
            v.views as video_views,
            v.watch_time_hours as video_watch_time_hours,
            v.duration_seconds as video_duration_seconds
        FROM match_review_queue mrq
        JOIN planned_videos pv ON mrq.planned_video_id = pv.id
        LEFT JOIN sessions s ON pv.session_id = s.id
        JOIN videos v ON mrq.video_id = v.id
        WHERE mrq.status = 'PENDING'
        ORDER BY mrq.confidence DESC
    """)
    items = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return items

# -------------------------------------------------------------
# Phase 1c: Shared Entry Validation & Fuzzy Matching
# -------------------------------------------------------------

COURSE_ALIASES = {
    "cfa l1": "CFA Level 1",
    "cfa level 1": "CFA Level 1",
    "cfa 1": "CFA Level 1",
    "l1": "CFA Level 1",
    "cfa l2": "CFA Level 2",
    "cfa level 2": "CFA Level 2",
    "cfa 2": "CFA Level 2",
    "l2": "CFA Level 2",
    "cfa l3": "CFA Level 3",
    "cfa level 3": "CFA Level 3",
    "cfa 3": "CFA Level 3",
    "l3": "CFA Level 3",
    "frm p1": "FRM Part 1",
    "frm part 1": "FRM Part 1",
    "frm 1": "FRM Part 1",
    "p1": "FRM Part 1",
    "frm p2": "FRM Part 2",
    "frm part 2": "FRM Part 2",
    "frm 2": "FRM Part 2",
    "p2": "FRM Part 2",
}

SUBJECT_ALIASES = {
    "quant": "Quantitative Methods",
    "quants": "Quantitative Methods",
    "quantitative": "Quantitative Methods",
    "fi": "Fixed Income",
    "ethics": "Ethical & Professional Standards",
    "fsa": "Financial Statement Analysis",
    "fra": "Financial Statement Analysis",
    "equity": "Equity Investments",
    "equities": "Equity Investments",
    "deriv": "Derivatives",
    "derivatives": "Derivatives",
    "alt": "Alternative Investments",
    "pm": "Portfolio Management",
    "portfolio": "Portfolio Management",
    "risk": "Foundations of Risk",
    "val": "Valuation & Risk Models",
    "valuation": "Valuation & Risk Models",
    "markets": "Financial Markets & Products"
}

def validate_planner_entries(raw_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Shared validation and fuzzy-matching logic for individual form and bulk import.
    Matches Course, Subject, and Exam Session against existing database records.
    Returns structured results with match confidence, candidates, and auto-linked IDs.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Fetch Lists & Hierarchy
    cursor.execute("SELECT id, name, parent_id, is_course FROM lists")
    all_lists = [dict(r) for r in cursor.fetchall()]

    # Courses are lists with is_course = 1 or top-level programs
    courses = [l for l in all_lists if l.get("is_course") or l.get("id") in ("list_cfa_l1", "list_cfa_l2", "list_cfa_l3", "list_frm_p1", "list_frm_p2")]
    if not courses:
        courses = [l for l in all_lists if l.get("parent_id") is None]

    # 2. Fetch Sessions
    cursor.execute("SELECT id, name, start_date, end_date FROM sessions WHERE is_active = 1 ORDER BY start_date ASC")
    active_sessions = [dict(r) for r in cursor.fetchall()]

    conn.close()

    validated_results = []

    for idx, entry in enumerate(raw_entries):
        raw_course = str(entry.get("course_text", "")).strip()
        raw_subject = str(entry.get("subject_text", "")).strip()
        video_name = str(entry.get("video_name", "")).strip()
        raw_session = str(entry.get("session_text", "")).strip()
        row_id = entry.get("id") or f"row_{idx+1}"

        # ---------------- Course Matching ----------------
        norm_course = raw_course.lower()
        alias_course = COURSE_ALIASES.get(norm_course, raw_course)

        best_course = None
        best_course_score = 0.0
        course_candidates = []

        for c in courses:
            score = string_similarity(alias_course, c["name"])
            # Exact substring check
            if norm_course and (norm_course in c["name"].lower() or c["name"].lower() in norm_course):
                score = max(score, 0.85)
            course_candidates.append({"id": c["id"], "name": c["name"], "score": score})
            if score > best_course_score:
                best_course_score = score
                best_course = c

        course_candidates.sort(key=lambda x: x["score"], reverse=True)

        if best_course_score >= 0.70:
            course_status = "CONFIDENT"
            matched_course_id = best_course["id"]
            matched_course_name = best_course["name"]
        elif best_course_score >= 0.40:
            course_status = "FLAGGED"
            matched_course_id = best_course["id"] if best_course else (courses[0]["id"] if courses else None)
            matched_course_name = best_course["name"] if best_course else ""
        else:
            course_status = "FLAGGED"
            matched_course_id = courses[0]["id"] if courses else None
            matched_course_name = courses[0]["name"] if courses else ""

        # ---------------- Subject Matching ----------------
        norm_subj = raw_subject.lower()
        alias_subj = SUBJECT_ALIASES.get(norm_subj, raw_subject)

        # Child lists under matched course
        relevant_subjects = [l for l in all_lists if matched_course_id and l.get("parent_id") == matched_course_id]
        if not relevant_subjects:
            # Fallback to all non-course lists
            relevant_subjects = [l for l in all_lists if not l.get("is_course")]

        best_subject = None
        best_subject_score = 0.0
        subject_candidates = []

        for s in relevant_subjects:
            score = string_similarity(alias_subj, s["name"])
            if norm_subj and (norm_subj in s["name"].lower() or s["name"].lower() in norm_subj):
                score = max(score, 0.85)
            subject_candidates.append({"id": s["id"], "name": s["name"], "score": score})
            if score > best_subject_score:
                best_subject_score = score
                best_subject = s

        subject_candidates.sort(key=lambda x: x["score"], reverse=True)

        if best_subject_score >= 0.70:
            subject_status = "CONFIDENT"
            matched_subject_id = best_subject["id"]
            matched_subject_name = best_subject["name"]
        elif best_subject_score >= 0.35:
            subject_status = "FLAGGED"
            matched_subject_id = best_subject["id"] if best_subject else (relevant_subjects[0]["id"] if relevant_subjects else None)
            matched_subject_name = best_subject["name"] if best_subject else ""
        else:
            subject_status = "FLAGGED"
            matched_subject_id = relevant_subjects[0]["id"] if relevant_subjects else None
            matched_subject_name = relevant_subjects[0]["name"] if relevant_subjects else ""

        # ---------------- Session Matching ----------------
        norm_session = raw_session.lower()
        is_na_session = norm_session in ("", "n/a", "na", "not applicable", "none", "evergreen", "someday")

        matched_session_id = None
        matched_session_name = "Not Applicable"
        session_status = "CONFIDENT"
        session_candidates = [{"id": "", "name": "Not Applicable", "score": 1.0 if is_na_session else 0.0}]

        if not is_na_session:
            best_sess = None
            best_sess_score = 0.0

            for s in active_sessions:
                score = string_similarity(raw_session, s["name"])
                # Check for month/year presence, e.g. "May 2027" or "Nov 2026"
                if raw_session.lower() in s["name"].lower():
                    score = max(score, 0.90)
                # Boost if matches course name as well
                if matched_course_name and matched_course_name[:3].lower() in s["name"].lower():
                    score += 0.05

                session_candidates.append({"id": s["id"], "name": s["name"], "score": score})
                if score > best_sess_score:
                    best_sess_score = score
                    best_sess = s

            session_candidates.sort(key=lambda x: x["score"], reverse=True)

            if best_sess_score >= 0.65:
                session_status = "CONFIDENT"
                matched_session_id = best_sess["id"]
                matched_session_name = best_sess["name"]
            else:
                # Fallback to Not Applicable with flag so user notices and can fix
                session_status = "FLAGGED"
                matched_session_id = None
                matched_session_name = "Not Applicable"

        is_confident_all = (course_status == "CONFIDENT") and (subject_status == "CONFIDENT") and (session_status == "CONFIDENT")

        validated_results.append({
            "id": row_id,
            "raw_course": raw_course,
            "raw_subject": raw_subject,
            "video_name": video_name,
            "raw_session": raw_session,
            "matched_course_id": matched_course_id,
            "matched_course_name": matched_course_name,
            "course_match_status": course_status,
            "course_candidates": course_candidates[:4],
            "matched_subject_id": matched_subject_id,
            "matched_subject_name": matched_subject_name,
            "subject_match_status": subject_status,
            "subject_candidates": subject_candidates[:5],
            "matched_session_id": matched_session_id,
            "matched_session_name": matched_session_name,
            "session_match_status": session_status,
            "session_candidates": session_candidates[:4],
            "is_confident_all": is_confident_all
        })

    return validated_results

# -------------------------------------------------------------
# Phase 4: Progress Section Analytics
# -------------------------------------------------------------

def get_session_progress_analytics(session_id: Optional[str] = None, course_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Multi-tiered progress analytics:
    1. Global / Full Plan (irrespective of course or session):
       - Overall target, uploaded, planned, scheduled, backlog, overdue, pacing
       - Course-wise performance blocks (clickable to drill down)
       - Overall burnup chart, velocity, status donut
    2. Course Drill-Down (course_id provided):
       - Course-level summary & pacing
       - Subject-wise breakdown for the course
       - Session-wise breakdown for the course (targets & progress across sessions)
    3. Session Analytics (session_id provided):
       - Scoped to that session
    """
    conn = get_connection()
    cursor = conn.cursor()

    now = datetime.now()
    cur_year, cur_week_num, _ = now.isocalendar()
    current_iso_week = f"{cur_year}-W{cur_week_num:02d}"

    is_global = (not session_id or session_id in ("ALL", "")) and (not course_id or course_id in ("ALL", ""))
    is_course_mode = bool(course_id and course_id not in ("ALL", ""))

    # Fetch all courses for easy reference
    cursor.execute("SELECT id, name, description FROM lists WHERE is_course = 1 ORDER BY name ASC")
    all_courses = [dict(r) for r in cursor.fetchall()]

    # ---------------- 3. Weekly Velocity Helper (Past 8 Weeks) ----------------
    def get_velocity_data():
        v_weeks = []
        tot_recent = 0
        for w_offset in range(7, -1, -1):
            w_start = now - timedelta(days=(w_offset * 7) + now.weekday())
            w_end = w_start + timedelta(days=6)
            w_start_str = w_start.strftime("%Y-%m-%d")
            w_end_str = w_end.strftime("%Y-%m-%d")
            w_label = w_start.strftime("W%W (%b %d)")

            cursor.execute("""
                SELECT count(*) as cnt FROM videos
                WHERE published_at >= ? AND published_at <= ?
            """, (w_start_str + "T00:00:00", w_end_str + "T23:59:59"))
            cnt = cursor.fetchone()["cnt"]
            tot_recent += cnt

            v_weeks.append({
                "week_label": w_label,
                "start_date": w_start_str,
                "count": cnt
            })

        avg_vel = round(tot_recent / 8.0, 1)
        for vw in v_weeks:
            vw["average"] = avg_vel
        return {"weeks": v_weeks, "average_velocity": avg_vel}

    def get_pending_videos(pvs):
        pending = [dict(pv) for pv in pvs if pv.get("status") != "Uploaded"]
        for pv in pending:
            s_id = pv.get("session_id")
            if s_id:
                cursor.execute("SELECT name FROM sessions WHERE id = ?", (s_id,))
                sr = cursor.fetchone()
                pv["session_name"] = sr["name"] if sr else s_id
            else:
                pv["session_name"] = "Evergreen"

            cursor.execute("""
                SELECT l.id, l.name, l.is_course, l.parent_id
                FROM planned_video_lists pvl
                JOIN lists l ON pvl.list_id = l.id
                WHERE pvl.planned_video_id = ?
            """, (pv["id"],))
            pv["lists"] = [dict(r) for r in cursor.fetchall()]

        def sort_key(v):
            w = v.get("assigned_week")
            is_overdue = bool(w and w < current_iso_week)
            if is_overdue:
                return (0, w or "")
            if w:
                return (1, w)
            if v.get("assigned_month"):
                return (2, v.get("assigned_month"))
            return (3, v.get("created_at") or "")

        pending.sort(key=sort_key)
        return pending

    # =========================================================================
    # MODE 1: COURSE DRILL-DOWN MODE
    # =========================================================================
    if is_course_mode:
        cursor.execute("SELECT * FROM lists WHERE id = ?", (course_id,))
        c_row = cursor.fetchone()
        course_info = dict(c_row) if c_row else {"id": course_id, "name": "Selected Course"}

        # Get child subjects under this course
        cursor.execute("SELECT id, name, description FROM lists WHERE parent_id = ? ORDER BY name ASC", (course_id,))
        child_subjects = [dict(r) for r in cursor.fetchall()]
        child_ids = [s["id"] for s in child_subjects]
        all_course_lids = [course_id] + child_ids
        placeholders = ",".join(["?"] * len(all_course_lids))

        # Planned videos query (optionally filtered by session_id)
        if session_id and session_id not in ("ALL", ""):
            if session_id == "evergreen":
                cursor.execute(f"""
                    SELECT DISTINCT pv.*
                    FROM planned_videos pv
                    JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
                    WHERE pvl.list_id IN ({placeholders}) AND (pv.session_id IS NULL OR pv.session_id = '') AND (pv.content_type IS NULL OR pv.content_type = 'video' OR pv.content_type = '')
                """, tuple(all_course_lids))
            else:
                cursor.execute(f"""
                    SELECT DISTINCT pv.*
                    FROM planned_videos pv
                    JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
                    WHERE pvl.list_id IN ({placeholders}) AND pv.session_id = ? AND (pv.content_type IS NULL OR pv.content_type = 'video' OR pv.content_type = '')
                """, tuple(all_course_lids) + (session_id,))
        else:
            cursor.execute(f"""
                SELECT DISTINCT pv.*
                FROM planned_videos pv
                JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
                WHERE pvl.list_id IN ({placeholders}) AND (pv.content_type IS NULL OR pv.content_type = 'video' OR pv.content_type = '')
            """, tuple(all_course_lids))

        planned_videos = [dict(r) for r in cursor.fetchall()]
        total_entries = len(planned_videos)

        uploaded_count = sum(1 for pv in planned_videos if pv.get("status") == "Uploaded")
        scheduled_count = 0
        overdue_count = 0
        backlog_count = 0

        for pv in planned_videos:
            if pv.get("status") == "Uploaded":
                continue
            w = pv.get("assigned_week")
            if w:
                if w < current_iso_week:
                    overdue_count += 1
                else:
                    scheduled_count += 1
            else:
                backlog_count += 1

        # Target calculation for this course (course target takes precedence, else sum of subjects)
        if session_id and session_id not in ("ALL", ""):
            if session_id == "evergreen":
                target_count = 0
            else:
                cursor.execute("SELECT target_count FROM list_targets WHERE session_id = ? AND list_id = ?", (session_id, course_id))
                ct_row = cursor.fetchone()
                if ct_row and ct_row["target_count"] and ct_row["target_count"] > 0:
                    target_count = ct_row["target_count"]
                else:
                    cursor.execute(f"""
                        SELECT SUM(target_count) as total_target
                        FROM list_targets
                        WHERE session_id = ? AND list_id IN ({placeholders}) AND list_id != ?
                    """, (session_id,) + tuple(all_course_lids) + (course_id,))
                    t_row = cursor.fetchone()
                    target_count = t_row["total_target"] if t_row and t_row["total_target"] is not None else 0
        else:
            cursor.execute("SELECT SUM(target_count) as total_target FROM list_targets WHERE list_id = ?", (course_id,))
            ct_row = cursor.fetchone()
            if ct_row and ct_row["total_target"] and ct_row["total_target"] > 0:
                target_count = ct_row["total_target"]
            else:
                cursor.execute(f"""
                    SELECT SUM(target_count) as total_target
                    FROM list_targets
                    WHERE list_id IN ({placeholders}) AND list_id != ?
                """, tuple(all_course_lids) + (course_id,))
                t_row = cursor.fetchone()
                target_count = t_row["total_target"] if t_row and t_row["total_target"] is not None else 0

        # Determine dates for pacing
        if session_id and session_id not in ("ALL", "", "evergreen"):
            cursor.execute("SELECT start_date, end_date FROM sessions WHERE id = ?", (session_id,))
            s_dates = cursor.fetchone()
            start_date_str = s_dates["start_date"] if s_dates else "2026-07-01"
            end_date_str = s_dates["end_date"] if s_dates else "2026-11-25"
        else:
            cursor.execute("SELECT MIN(start_date) as min_s, MAX(end_date) as max_e FROM sessions WHERE is_active = 1")
            s_dates = cursor.fetchone()
            start_date_str = s_dates["min_s"] if s_dates and s_dates["min_s"] else "2026-07-01"
            end_date_str = s_dates["max_e"] if s_dates and s_dates["max_e"] else "2026-11-25"

        pacing = calculate_pacing(target_count, uploaded_count, end_date_str, start_date_str)
        if target_count <= 0 and total_entries > 0:
            pacing["completion_pct"] = round((uploaded_count / total_entries) * 100, 1)

        # ---------------- SUBJECTS BREAKDOWN (Child Lists) ----------------
        subject_breakdown = []
        for sub in child_subjects:
            sub_id = sub["id"]
            if session_id and session_id not in ("ALL", ""):
                if session_id == "evergreen":
                    cursor.execute("""
                        SELECT DISTINCT pv.id, pv.status, pv.assigned_week
                        FROM planned_videos pv
                        JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
                        WHERE pvl.list_id = ? AND (pv.session_id IS NULL OR pv.session_id = '')
                    """, (sub_id,))
                    sub_pvs = [dict(r) for r in cursor.fetchall()]
                    sub_target = 0
                else:
                    cursor.execute("""
                        SELECT DISTINCT pv.id, pv.status, pv.assigned_week
                        FROM planned_videos pv
                        JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
                        WHERE pvl.list_id = ? AND pv.session_id = ?
                    """, (sub_id, session_id))
                    sub_pvs = [dict(r) for r in cursor.fetchall()]
                    cursor.execute("SELECT target_count FROM list_targets WHERE session_id = ? AND list_id = ?", (session_id, sub_id))
                    st_row = cursor.fetchone()
                    sub_target = st_row["target_count"] if st_row else 0
            else:
                cursor.execute("""
                    SELECT DISTINCT pv.id, pv.status, pv.assigned_week
                    FROM planned_videos pv
                    JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
                    WHERE pvl.list_id = ?
                """, (sub_id,))
                sub_pvs = [dict(r) for r in cursor.fetchall()]
                cursor.execute("SELECT SUM(target_count) as total_t FROM list_targets WHERE list_id = ?", (sub_id,))
                st_row = cursor.fetchone()
                sub_target = st_row["total_t"] if st_row and st_row["total_t"] is not None else 0

            sub_planned = len(sub_pvs)
            sub_uploaded = sum(1 for p in sub_pvs if p.get("status") == "Uploaded")
            sub_scheduled = sum(1 for p in sub_pvs if p.get("status") != "Uploaded" and p.get("assigned_week"))
            sub_backlog = sub_planned - (sub_uploaded + sub_scheduled)
            sub_pacing = calculate_pacing(sub_target, sub_uploaded, end_date_str, start_date_str)
            comp_pct = sub_pacing.get("completion_pct", 0.0)
            if sub_target <= 0 and sub_planned > 0:
                comp_pct = round((sub_uploaded / sub_planned) * 100, 1)

            subject_breakdown.append({
                "id": sub_id,
                "name": sub["name"],
                "target": sub_target,
                "planned": sub_planned,
                "uploaded": sub_uploaded,
                "scheduled": sub_scheduled,
                "backlog": sub_backlog,
                "completion_pct": comp_pct,
                "status": sub_pacing.get("status", "NO_TARGET"),
                "color": sub_pacing.get("color", "#5A5A5A"),
                "display_text": sub_pacing.get("display_text", "No target set")
            })

        # ---------------- SESSION-WISE BREAKDOWN (For this course) ----------------
        cursor.execute("SELECT * FROM sessions ORDER BY start_date ASC")
        all_sessions = [dict(r) for r in cursor.fetchall()]

        session_breakdown = []
        for s in all_sessions:
            s_id = s["id"]
            # Target for this course & subjects in this session
            cursor.execute(f"""
                SELECT SUM(target_count) as s_target
                FROM list_targets
                WHERE session_id = ? AND list_id IN ({placeholders})
            """, (s_id,) + tuple(all_course_lids))
            st_row = cursor.fetchone()
            s_target = st_row["s_target"] if st_row and st_row["s_target"] is not None else 0

            # Planned videos in this session for this course
            cursor.execute(f"""
                SELECT DISTINCT pv.id, pv.status, pv.assigned_week
                FROM planned_videos pv
                JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
                WHERE pv.session_id = ? AND pvl.list_id IN ({placeholders})
            """, (s_id,) + tuple(all_course_lids))
            s_pvs = [dict(r) for r in cursor.fetchall()]
            s_planned = len(s_pvs)
            s_uploaded = sum(1 for p in s_pvs if p.get("status") == "Uploaded")
            s_scheduled = sum(1 for p in s_pvs if p.get("status") != "Uploaded" and p.get("assigned_week"))
            s_backlog = s_planned - (s_uploaded + s_scheduled)

            s_pacing = calculate_pacing(s_target, s_uploaded, s["end_date"], s.get("start_date"))
            s_comp_pct = s_pacing.get("completion_pct", 0.0)
            if s_target <= 0 and s_planned > 0:
                s_comp_pct = round((s_uploaded / s_planned) * 100, 1)

            # Include session if it has any targets or planned videos
            if s_target > 0 or s_planned > 0 or s_uploaded > 0:
                session_breakdown.append({
                    "id": s_id,
                    "name": s["name"],
                    "start_date": s["start_date"],
                    "end_date": s["end_date"],
                    "is_active": bool(s["is_active"]),
                    "target": s_target,
                    "planned": s_planned,
                    "uploaded": s_uploaded,
                    "scheduled": s_scheduled,
                    "backlog": s_backlog,
                    "completion_pct": s_comp_pct,
                    "status": s_pacing.get("status", "NO_TARGET"),
                    "color": s_pacing.get("color", "#5A5A5A"),
                    "display_text": s_pacing.get("display_text", "No target set")
                })

        # Check for Evergreen / Someday (session_id IS NULL)
        cursor.execute(f"""
            SELECT DISTINCT pv.id, pv.status, pv.assigned_week
            FROM planned_videos pv
            JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
            WHERE (pv.session_id IS NULL OR pv.session_id = '') AND pvl.list_id IN ({placeholders})
        """, tuple(all_course_lids))
        eg_pvs = [dict(r) for r in cursor.fetchall()]
        if eg_pvs:
            eg_planned = len(eg_pvs)
            eg_uploaded = sum(1 for p in eg_pvs if p.get("status") == "Uploaded")
            eg_scheduled = sum(1 for p in eg_pvs if p.get("status") != "Uploaded" and p.get("assigned_week"))
            session_breakdown.append({
                "id": "evergreen",
                "name": "Evergreen / Someday (No Session)",
                "start_date": None,
                "end_date": None,
                "is_active": True,
                "target": 0,
                "planned": eg_planned,
                "uploaded": eg_uploaded,
                "scheduled": eg_scheduled,
                "backlog": eg_planned - (eg_uploaded + eg_scheduled),
                "completion_pct": round((eg_uploaded / eg_planned) * 100, 1) if eg_planned > 0 else 0.0,
                "status": "NO_TARGET",
                "color": "#5A5A5A",
                "display_text": "Ongoing backlog"
            })

        # ---------------- Course Burnup Chart ----------------
        try:
            start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")
        except Exception:
            start_dt = now - timedelta(days=60)
            end_dt = now + timedelta(days=60)

        total_days = max(1, (end_dt - start_dt).days)
        steps = 10
        interval_days = max(7, total_days // steps)

        cursor.execute(f"""
            SELECT v.published_at
            FROM planned_videos pv
            JOIN videos v ON pv.linked_video_id = v.id
            WHERE pv.id IN (
                SELECT planned_video_id FROM planned_video_lists WHERE list_id IN ({placeholders})
            ) AND pv.status = 'Uploaded'
            ORDER BY v.published_at ASC
        """, tuple(all_course_lids))
        upload_dates = [r["published_at"][:10] for r in cursor.fetchall() if r["published_at"]]

        burnup_timeline = []
        curr_t = start_dt
        while curr_t <= end_dt:
            date_str = curr_t.strftime("%Y-%m-%d")
            label = curr_t.strftime("%b %d")
            frac = min(1.0, (curr_t - start_dt).days / total_days)
            ideal_val = round(frac * (target_count or total_entries), 1)

            if curr_t <= now:
                actual_val = sum(1 for d in upload_dates if d <= date_str)
                if not upload_dates and uploaded_count > 0:
                    actual_val = min(uploaded_count, round(frac * uploaded_count))
            else:
                actual_val = None

            burnup_timeline.append({
                "date": date_str,
                "label": label,
                "ideal": ideal_val,
                "actual": actual_val
            })
            curr_t += timedelta(days=interval_days)

        last_label = end_dt.strftime("%b %d")
        if not burnup_timeline or burnup_timeline[-1]["label"] != last_label:
            burnup_timeline.append({
                "date": end_dt.strftime("%Y-%m-%d"),
                "label": last_label,
                "ideal": target_count or total_entries,
                "actual": uploaded_count if end_dt <= now else None
            })

        velocity_data = get_velocity_data()

        # YouTube performance for uploaded planned videos in this course
        if session_id and session_id not in ("ALL", ""):
            if session_id == "evergreen":
                cursor.execute(f"""
                    SELECT pv.id, pv.title, v.views, v.likes, v.comments, v.watch_time_hours
                    FROM planned_videos pv
                    JOIN videos v ON pv.linked_video_id = v.id
                    WHERE pv.id IN (
                        SELECT planned_video_id FROM planned_video_lists WHERE list_id IN ({placeholders})
                    )
                    AND pv.status = 'Uploaded'
                    AND (pv.session_id IS NULL OR pv.session_id = '')
                    ORDER BY v.views DESC
                """, tuple(all_course_lids))
            else:
                cursor.execute(f"""
                    SELECT pv.id, pv.title, v.views, v.likes, v.comments, v.watch_time_hours
                    FROM planned_videos pv
                    JOIN videos v ON pv.linked_video_id = v.id
                    WHERE pv.id IN (
                        SELECT planned_video_id FROM planned_video_lists WHERE list_id IN ({placeholders})
                    )
                    AND pv.status = 'Uploaded'
                    AND pv.session_id = ?
                    ORDER BY v.views DESC
                """, tuple(all_course_lids) + (session_id,))
        else:
            cursor.execute(f"""
                SELECT pv.id, pv.title, v.views, v.likes, v.comments, v.watch_time_hours
                FROM planned_videos pv
                JOIN videos v ON pv.linked_video_id = v.id
                WHERE pv.id IN (
                    SELECT planned_video_id FROM planned_video_lists WHERE list_id IN ({placeholders})
                )
                AND pv.status = 'Uploaded'
                ORDER BY v.views DESC
            """, tuple(all_course_lids))

        yt_rows = [dict(r) for r in cursor.fetchall()]
        youtube_stats = {
            "total_views": sum(r["views"] or 0 for r in yt_rows),
            "total_likes": sum(r["likes"] or 0 for r in yt_rows),
            "total_comments": sum(r["comments"] or 0 for r in yt_rows),
            "total_watch_time_hours": round(sum(r["watch_time_hours"] or 0 for r in yt_rows), 1),
            "uploaded_count": len(yt_rows),
            "top_videos": yt_rows[:3]
        }

        pending_pvs = get_pending_videos(planned_videos)
        conn.close()

        return {
            "mode": "COURSE",
            "course": course_info,
            "session_filter": session_id if session_id and session_id != "ALL" else None,
            "all_courses": all_courses,
            "target": target_count,
            "uploaded": uploaded_count,
            "planned": total_entries,
            "scheduled": scheduled_count,
            "backlog": backlog_count,
            "overdue": overdue_count,
            "completion_pct": pacing.get("completion_pct", 0),
            "pacing": pacing,
            "youtube_stats": youtube_stats,
            "burnup_chart": {
                "timeline": burnup_timeline,
                "target": target_count or total_entries,
                "status_color": pacing.get("color", "#3EA65E")
            },
            "weekly_velocity": velocity_data,
            "status_distribution": {
                "Planned": backlog_count,
                "Scheduled": scheduled_count,
                "Uploaded": uploaded_count,
                "Overdue": overdue_count,
                "Total": total_entries
            },
            "subjects": subject_breakdown,
            "sessions": session_breakdown,
            "pending_planned_videos": pending_pvs,
            "grouped_bars": [
                {
                    "id": s["id"],
                    "name": s["name"],
                    "target": s["target"],
                    "uploaded": s["uploaded"],
                    "planned": s["planned"],
                    "completion_pct": s["completion_pct"],
                    "color": s["color"]
                } for s in subject_breakdown
            ]
        }

    # =========================================================================
    # MODE 2: GLOBAL / FULL PLAN (All Videos Planned Irrespective of Course or Session)
    # =========================================================================
    if is_global:
        cursor.execute("SELECT * FROM planned_videos WHERE (content_type IS NULL OR content_type = 'video' OR content_type = '')")
        planned_videos = [dict(r) for r in cursor.fetchall()]
        total_entries = len(planned_videos)

        uploaded_count = sum(1 for pv in planned_videos if pv.get("status") == "Uploaded")
        scheduled_count = 0
        overdue_count = 0
        backlog_count = 0

        for pv in planned_videos:
            if pv.get("status") == "Uploaded":
                continue
            w = pv.get("assigned_week")
            if w:
                if w < current_iso_week:
                    overdue_count += 1
                else:
                    scheduled_count += 1
            else:
                backlog_count += 1

        # Sum targets across all lists and sessions without double-counting
        cursor.execute("SELECT SUM(total_target) as total_target FROM sessions WHERE is_active = 1")
        s_tot_row = cursor.fetchone()
        if s_tot_row and s_tot_row["total_target"] and s_tot_row["total_target"] > 0:
            target_count = s_tot_row["total_target"]
        else:
            cursor.execute("""
                SELECT SUM(lt.target_count) as total_target 
                FROM list_targets lt
                JOIN lists l ON lt.list_id = l.id
                WHERE l.is_course = 1
            """)
            t_row = cursor.fetchone()
            target_count = t_row["total_target"] if t_row and t_row["total_target"] is not None else 0

        # Find min start date & max end date of active sessions
        cursor.execute("SELECT MIN(start_date) as min_s, MAX(end_date) as max_e FROM sessions WHERE is_active = 1")
        s_dates = cursor.fetchone()
        start_date_str = s_dates["min_s"] if s_dates and s_dates["min_s"] else "2026-07-01"
        end_date_str = s_dates["max_e"] if s_dates and s_dates["max_e"] else "2026-11-25"

        pacing = calculate_pacing(target_count, uploaded_count, end_date_str, start_date_str)
        if target_count <= 0 and total_entries > 0:
            pacing["completion_pct"] = round((uploaded_count / total_entries) * 100, 1)

        # ---------------- Course-Wise Breakdown (Hero Blocks) ----------------
        course_breakdown = []
        for c in all_courses:
            c_id = c["id"]
            cursor.execute("SELECT id FROM lists WHERE parent_id = ?", (c_id,))
            c_subj_ids = [r["id"] for r in cursor.fetchall()]
            c_lids = [c_id] + c_subj_ids
            c_placeholders = ",".join(["?"] * len(c_lids))

            # Total targets for this course (course target takes precedence over subjects to avoid double-counting)
            cursor.execute("SELECT SUM(target_count) as c_target FROM list_targets WHERE list_id = ?", (c_id,))
            ct_row = cursor.fetchone()
            c_target = ct_row["c_target"] if ct_row and ct_row["c_target"] is not None else 0
            if c_target <= 0 and c_subj_ids:
                cursor.execute(f"SELECT SUM(target_count) as c_target FROM list_targets WHERE list_id IN ({c_placeholders}) AND list_id != ?", tuple(c_lids) + (c_id,))
                sub_t_row = cursor.fetchone()
                c_target = sub_t_row["c_target"] if sub_t_row and sub_t_row["c_target"] is not None else 0

            # Planned videos for this course
            cursor.execute(f"""
                SELECT DISTINCT pv.id, pv.status, pv.assigned_week, pv.session_id
                FROM planned_videos pv
                JOIN planned_video_lists pvl ON pv.id = pvl.planned_video_id
                WHERE pvl.list_id IN ({c_placeholders})
            """, tuple(c_lids))
            c_pvs = [dict(r) for r in cursor.fetchall()]
            c_planned = len(c_pvs)
            c_uploaded = sum(1 for p in c_pvs if p.get("status") == "Uploaded")
            c_scheduled = sum(1 for p in c_pvs if p.get("status") != "Uploaded" and p.get("assigned_week"))
            c_backlog = c_planned - (c_uploaded + c_scheduled)
            c_overdue = sum(1 for p in c_pvs if p.get("status") != "Uploaded" and p.get("assigned_week") and p.get("assigned_week") < current_iso_week)

            c_pacing = calculate_pacing(c_target, c_uploaded, end_date_str, start_date_str)
            comp_pct = c_pacing.get("completion_pct", 0.0)
            if c_target <= 0 and c_planned > 0:
                comp_pct = round((c_uploaded / c_planned) * 100, 1)

            # Count distinct sessions associated
            c_sessions = set(p["session_id"] for p in c_pvs if p.get("session_id"))

            course_breakdown.append({
                "id": c_id,
                "name": c["name"],
                "description": c.get("description", ""),
                "target": c_target,
                "planned": c_planned,
                "uploaded": c_uploaded,
                "scheduled": c_scheduled,
                "backlog": c_backlog,
                "overdue": c_overdue,
                "completion_pct": comp_pct,
                "status": c_pacing.get("status", "NO_TARGET"),
                "color": c_pacing.get("color", "#5A5A5A"),
                "display_text": c_pacing.get("display_text", "No target set"),
                "subject_count": len(c_subj_ids),
                "session_count": len(c_sessions)
            })

        # ---------------- Global Burnup Chart Data ----------------
        try:
            start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")
        except Exception:
            start_dt = now - timedelta(days=60)
            end_dt = now + timedelta(days=60)

        total_days = max(1, (end_dt - start_dt).days)
        steps = 10
        interval_days = max(7, total_days // steps)

        cursor.execute("""
            SELECT v.published_at
            FROM planned_videos pv
            JOIN videos v ON pv.linked_video_id = v.id
            WHERE pv.status = 'Uploaded'
            ORDER BY v.published_at ASC
        """)
        upload_dates = [r["published_at"][:10] for r in cursor.fetchall() if r["published_at"]]

        burnup_timeline = []
        curr_t = start_dt
        while curr_t <= end_dt:
            date_str = curr_t.strftime("%Y-%m-%d")
            label = curr_t.strftime("%b %d")
            frac = min(1.0, (curr_t - start_dt).days / total_days)
            ideal_val = round(frac * (target_count or total_entries), 1)

            if curr_t <= now:
                actual_val = sum(1 for d in upload_dates if d <= date_str)
                if not upload_dates and uploaded_count > 0:
                    actual_val = min(uploaded_count, round(frac * uploaded_count))
            else:
                actual_val = None

            burnup_timeline.append({
                "date": date_str,
                "label": label,
                "ideal": ideal_val,
                "actual": actual_val
            })
            curr_t += timedelta(days=interval_days)

        last_label = end_dt.strftime("%b %d")
        if not burnup_timeline or burnup_timeline[-1]["label"] != last_label:
            burnup_timeline.append({
                "date": end_dt.strftime("%Y-%m-%d"),
                "label": last_label,
                "ideal": target_count or total_entries,
                "actual": uploaded_count if end_dt <= now else None
            })

        velocity_data = get_velocity_data()

        # YouTube performance for all uploaded planned videos
        cursor.execute("""
            SELECT pv.id, pv.title, v.views, v.likes, v.comments, v.watch_time_hours
            FROM planned_videos pv
            JOIN videos v ON pv.linked_video_id = v.id
            WHERE pv.status = 'Uploaded'
            ORDER BY v.views DESC
        """)
        yt_rows = [dict(r) for r in cursor.fetchall()]
        youtube_stats = {
            "total_views": sum(r["views"] or 0 for r in yt_rows),
            "total_likes": sum(r["likes"] or 0 for r in yt_rows),
            "total_comments": sum(r["comments"] or 0 for r in yt_rows),
            "total_watch_time_hours": round(sum(r["watch_time_hours"] or 0 for r in yt_rows), 1),
            "uploaded_count": len(yt_rows),
            "top_videos": yt_rows[:3]
        }

        pending_pvs = get_pending_videos(planned_videos)
        conn.close()

        return {
            "mode": "GLOBAL",
            "title": "Full Plan Analytics (All Videos Planned)",
            "all_courses": all_courses,
            "target": target_count,
            "uploaded": uploaded_count,
            "planned": total_entries,
            "scheduled": scheduled_count,
            "backlog": backlog_count,
            "overdue": overdue_count,
            "completion_pct": pacing.get("completion_pct", 0),
            "pacing": pacing,
            "youtube_stats": youtube_stats,
            "burnup_chart": {
                "timeline": burnup_timeline,
                "target": target_count or total_entries,
                "status_color": pacing.get("color", "#3EA65E")
            },
            "weekly_velocity": velocity_data,
            "status_distribution": {
                "Planned": backlog_count,
                "Scheduled": scheduled_count,
                "Uploaded": uploaded_count,
                "Overdue": overdue_count,
                "Total": total_entries
            },
            "courses": course_breakdown,
            "pending_planned_videos": pending_pvs,
            "grouped_bars": [
                {
                    "id": c["id"],
                    "name": c["name"],
                    "target": c["target"],
                    "uploaded": c["uploaded"],
                    "planned": c["planned"],
                    "completion_pct": c["completion_pct"],
                    "color": c["color"]
                } for c in course_breakdown
            ]
        }

    # =========================================================================
    # MODE 3: SESSION ANALYTICS (Single Session Scope)
    # =========================================================================
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    s_row = cursor.fetchone()
    if not s_row:
        conn.close()
        return {}

    session = dict(s_row)
    start_date_str = session.get("start_date") or "2026-07-01"
    end_date_str = session.get("end_date") or "2026-11-25"

    target_count = session.get("total_target") or 0
    if target_count <= 0:
        cursor.execute("""
            SELECT SUM(lt.target_count) as total_target 
            FROM list_targets lt
            JOIN lists l ON lt.list_id = l.id
            WHERE lt.session_id = ? AND l.is_course = 1
        """, (session_id,))
        t_row = cursor.fetchone()
        target_count = t_row["total_target"] if t_row and t_row["total_target"] is not None else 0

    cursor.execute("SELECT * FROM planned_videos WHERE session_id = ?", (session_id,))
    planned_videos = [dict(r) for r in cursor.fetchall()]

    uploaded_count = 0
    scheduled_count = 0
    planned_backlog_count = 0
    overdue_count = 0

    for pv in planned_videos:
        st = pv.get("status")
        w = pv.get("assigned_week")
        if st == "Uploaded":
            uploaded_count += 1
        elif w:
            if w < current_iso_week:
                overdue_count += 1
            else:
                scheduled_count += 1
        else:
            planned_backlog_count += 1

    total_entries = len(planned_videos)
    pacing = calculate_pacing(target_count, uploaded_count, end_date_str, start_date_str)
    if target_count <= 0 and total_entries > 0:
        pacing["completion_pct"] = round((uploaded_count / total_entries) * 100, 1)

    # Burnup chart
    try:
        start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")
    except Exception:
        start_dt = now - timedelta(days=60)
        end_dt = now + timedelta(days=60)

    total_days = max(1, (end_dt - start_dt).days)
    steps = 10
    interval_days = max(7, total_days // steps)

    cursor.execute("""
        SELECT v.published_at
        FROM planned_videos pv
        JOIN videos v ON pv.linked_video_id = v.id
        WHERE pv.session_id = ? AND pv.status = 'Uploaded'
        ORDER BY v.published_at ASC
    """, (session_id,))
    upload_dates = [r["published_at"][:10] for r in cursor.fetchall() if r["published_at"]]

    burnup_timeline = []
    curr_t = start_dt
    while curr_t <= end_dt:
        date_str = curr_t.strftime("%Y-%m-%d")
        label = curr_t.strftime("%b %d")
        frac = min(1.0, (curr_t - start_dt).days / total_days)
        ideal_val = round(frac * target_count, 1)

        if curr_t <= now:
            actual_val = sum(1 for d in upload_dates if d <= date_str)
            if not upload_dates and uploaded_count > 0:
                actual_val = min(uploaded_count, round(frac * uploaded_count))
        else:
            actual_val = None

        burnup_timeline.append({
            "date": date_str,
            "label": label,
            "ideal": ideal_val,
            "actual": actual_val
        })
        curr_t += timedelta(days=interval_days)

    last_label = end_dt.strftime("%b %d")
    if not burnup_timeline or burnup_timeline[-1]["label"] != last_label:
        burnup_timeline.append({
            "date": end_dt.strftime("%Y-%m-%d"),
            "label": last_label,
            "ideal": target_count,
            "actual": uploaded_count if end_dt <= now else None
        })

    # Grouped subjects
    cursor.execute("""
        SELECT l.id, l.name, l.parent_id,
               COALESCE(lt.target_count, 0) as target,
               COUNT(pv.id) as planned_count,
               SUM(CASE WHEN pv.status = 'Uploaded' THEN 1 ELSE 0 END) as uploaded_count
        FROM lists l
        LEFT JOIN list_targets lt ON l.id = lt.list_id AND lt.session_id = ?
        LEFT JOIN planned_video_lists pvl ON l.id = pvl.list_id
        LEFT JOIN planned_videos pv ON pvl.planned_video_id = pv.id AND pv.session_id = ?
        WHERE l.is_course = 0
        GROUP BY l.id
        HAVING target > 0 OR planned_count > 0 OR uploaded_count > 0
        ORDER BY target DESC, l.name ASC
    """, (session_id, session_id))

    grouped_bars = []
    for r in cursor.fetchall():
        sub_t = r["target"]
        sub_u = r["uploaded_count"] or 0
        sub_p = r["planned_count"] or 0
        sub_pacing = calculate_pacing(sub_t, sub_u, end_date_str, start_date_str)
        grouped_bars.append({
            "id": r["id"],
            "name": r["name"],
            "target": sub_t,
            "uploaded": sub_u,
            "planned": sub_p,
            "completion_pct": sub_pacing.get("completion_pct", 0),
            "status": sub_pacing.get("status", "NO_TARGET"),
            "color": sub_pacing.get("color", "#5A5A5A")
        })

    velocity_data = get_velocity_data()

    # YouTube performance for uploaded planned videos in this session
    cursor.execute("""
        SELECT pv.id, pv.title, v.views, v.likes, v.comments, v.watch_time_hours
        FROM planned_videos pv
        JOIN videos v ON pv.linked_video_id = v.id
        WHERE pv.session_id = ? AND pv.status = 'Uploaded'
        ORDER BY v.views DESC
    """, (session_id,))
    yt_rows = [dict(r) for r in cursor.fetchall()]
    youtube_stats = {
        "total_views": sum(r["views"] or 0 for r in yt_rows),
        "total_likes": sum(r["likes"] or 0 for r in yt_rows),
        "total_comments": sum(r["comments"] or 0 for r in yt_rows),
        "total_watch_time_hours": round(sum(r["watch_time_hours"] or 0 for r in yt_rows), 1),
        "uploaded_count": len(yt_rows),
        "top_videos": yt_rows[:3]
    }

    pending_pvs = get_pending_videos(planned_videos)
    conn.close()

    return {
        "mode": "SESSION",
        "session": session,
        "all_courses": all_courses,
        "target": target_count,
        "uploaded": uploaded_count,
        "planned": total_entries,
        "completion_pct": pacing.get("completion_pct", 0),
        "pacing": pacing,
        "youtube_stats": youtube_stats,
        "burnup_chart": {
            "timeline": burnup_timeline,
            "target": target_count,
            "status_color": pacing.get("color", "#3EA65E")
        },
        "weekly_velocity": velocity_data,
        "status_distribution": {
            "Planned": planned_backlog_count,
            "Scheduled": scheduled_count,
            "Uploaded": uploaded_count,
            "Overdue": overdue_count,
            "Total": total_entries
        },
        "pending_planned_videos": pending_pvs,
        "grouped_bars": grouped_bars
    }


# =====================================================================
# SYLLABUS MATCHER ENGINE (Topic × Format Curriculum Coverage Grid)
# =====================================================================

SYLLABUS_FORMATS = ["Discussion", "Question Solving", "Revision", "General"]

def normalize_format_to_syllabus(fmt: str, title: str = "") -> str:
    """
    Maps video category formats and titles to the 4 canonical Syllabus Matcher columns:
    - Revision: Revision / Marathon, Fast-track, Formula Revision, Cram
    - Question Solving: Doubt-clearing / Q&A, Practice Questions, Question Papers
    - Discussion: Core Lecture, Discussion / Podcast
    - General: Strategy / General, Guides, Evergreen
    """
    comb = f"{fmt or ''} {title or ''}".lower().strip()
    if any(k in comb for k in ["revision", "fasttrack", "fast track", "formula revision", "rapid revision", "marathon", "crash", "recap"]):
        return "Revision"
    if any(k in comb for k in ["doubt", "q&a", "question", "problem", "mock", "reality check"]):
        return "Question Solving"
    if any(k in comb for k in ["discussion", "podcast", "interview", "lecture", "core", "class"]):
        return "Discussion"
    return "General"


def get_syllabus_grid_data() -> Dict[str, Any]:
    """
    Constructs the full hierarchical Syllabus Matcher Coverage Grid:
    Course -> Subject -> Topic -> [Discussion, Question Solving, Revision, General]
    Computes Basic Coverage (%) and Full Coverage (%) at Channel, Course, and Subject levels.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Ensure accurate hierarchy: subjects have is_topic = 0, topics have is_topic = 1
    cursor.execute("""
        UPDATE lists 
        SET is_topic = 0 
        WHERE is_course = 1 
           OR parent_id IN ('list_cfa', 'list_frm') 
           OR parent_id IN (SELECT id FROM lists WHERE is_course = 1)
    """)
    cursor.execute("""
        UPDATE lists 
        SET is_topic = 1 
        WHERE parent_id IN (
            SELECT id FROM lists WHERE parent_id IN (
                SELECT id FROM lists WHERE is_course = 1
            )
        ) AND is_course = 0
    """)
    conn.commit()

    # 1. Fetch Courses
    cursor.execute("""
        SELECT id, name, parent_id, is_course, description 
        FROM lists 
        WHERE is_course = 1 OR id IN ('list_cfa_l1', 'list_cfa_l2', 'list_cfa_l3', 'list_frm_p1', 'list_frm_p2')
        ORDER BY id ASC
    """)
    raw_courses = [dict(r) for r in cursor.fetchall()]

    course_order = ["list_cfa_l1", "list_cfa_l2", "list_cfa_l3", "list_frm_p1", "list_frm_p2"]
    def course_sort_key(c):
        if c["id"] in course_order:
            return (0, course_order.index(c["id"]))
        return (1, c["name"])
    courses_sorted = sorted(raw_courses, key=course_sort_key)

    # 2. Fetch all subjects
    cursor.execute("""
        SELECT id, name, parent_id, description, is_course, is_topic
        FROM lists 
        WHERE is_course = 0 AND (is_topic IS NULL OR is_topic = 0) AND parent_id IS NOT NULL
        ORDER BY name ASC
    """)
    all_subjects = [dict(r) for r in cursor.fetchall()]

    # 3. Fetch all topics
    cursor.execute("""
        SELECT id, name, parent_id, description, created_at, is_topic
        FROM lists 
        WHERE is_topic = 1
        ORDER BY name ASC
    """)
    all_topics = [dict(r) for r in cursor.fetchall()]

    # 4. Fetch N/A overrides
    cursor.execute("SELECT topic_id, format, is_na FROM topic_format_config WHERE is_na = 1")
    na_configs = {}
    for r in cursor.fetchall():
        key = (r["topic_id"], r["format"])
        na_configs[key] = True

    # 5. Fetch confirmed videos mapped to topics
    cursor.execute("""
        SELECT lv.list_id as topic_id, v.id, v.title, v.format, v.views, v.duration_seconds, v.published_at, v.thumbnail_url
        FROM list_videos lv
        JOIN videos v ON lv.video_id = v.id
    """)
    topic_videos_map: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for r in cursor.fetchall():
        t_id = r["topic_id"]
        if t_id not in topic_videos_map:
            topic_videos_map[t_id] = {f: [] for f in SYLLABUS_FORMATS}
        canon_fmt = normalize_format_to_syllabus(r["format"], r["title"])
        topic_videos_map[t_id][canon_fmt].append({
            "id": r["id"],
            "title": r["title"],
            "format": r["format"],
            "canonical_format": canon_fmt,
            "views": r["views"] or 0,
            "duration_seconds": r["duration_seconds"] or 0,
            "published_at": r["published_at"],
            "thumbnail_url": r["thumbnail_url"] or ""
        })

    # 6. Fetch planned video entries mapped to topics
    cursor.execute("""
        SELECT pvl.list_id as topic_id, pv.id, pv.title, pv.status, pv.format, pv.session_id, s.name as session_name
        FROM planned_video_lists pvl
        JOIN planned_videos pv ON pvl.planned_video_id = pv.id
        LEFT JOIN sessions s ON pv.session_id = s.id
        WHERE (pv.linked_video_id IS NULL OR pv.linked_video_id = '') AND pv.status != 'Uploaded'
    """)
    topic_planned_map: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for r in cursor.fetchall():
        t_id = r["topic_id"]
        if t_id not in topic_planned_map:
            topic_planned_map[t_id] = {f: [] for f in SYLLABUS_FORMATS}
        raw_fmt = r["format"] or ""
        canon_fmt = normalize_format_to_syllabus(raw_fmt, r["title"])
        topic_planned_map[t_id][canon_fmt].append({
            "id": r["id"],
            "title": r["title"],
            "status": r["status"] or "Planned",
            "format": raw_fmt or canon_fmt,
            "canonical_format": canon_fmt,
            "session_id": r["session_id"],
            "session_name": r["session_name"] or "No Session"
        })

    # 7. Check pending match review queue count
    cursor.execute("SELECT count(*) as cnt FROM topic_match_queue WHERE status = 'PENDING'")
    queue_row = cursor.fetchone()
    pending_queue_count = queue_row["cnt"] if queue_row else 0

    # Build tree and calculate rollups
    tree_courses = []
    total_channel_topics = 0
    total_channel_topics_with_video = 0
    total_channel_topics_full_covered = 0
    total_channel_videos_linked = 0
    total_channel_planned_linked = 0
    channel_format_counts = {fmt: {"covered_topics": 0, "applicable_topics": 0, "video_count": 0, "planned_count": 0} for fmt in SYLLABUS_FORMATS}

    for c in courses_sorted:
        course_id = c["id"]
        course_subjs = [s for s in all_subjects if s["parent_id"] == course_id]
        course_subjs = sorted(course_subjs, key=lambda s: natural_sort_key(s.get("name") or ""))
        
        course_topics_count = 0
        course_topics_with_video = 0
        course_topics_full_covered = 0
        course_subjects_data = []
        course_format_counts = {fmt: {"covered_topics": 0, "applicable_topics": 0, "video_count": 0, "planned_count": 0} for fmt in SYLLABUS_FORMATS}

        for s in course_subjs:
            subj_id = s["id"]
            subj_topics = [t for t in all_topics if t["parent_id"] == subj_id]
            subj_topics = sorted(subj_topics, key=lambda t: natural_sort_key(t.get("name") or ""))
            
            subj_topics_count = len(subj_topics)
            subj_topics_with_video = 0
            subj_topics_full_covered = 0
            built_topics = []
            subj_format_counts = {fmt: {"covered_topics": 0, "applicable_topics": 0, "video_count": 0, "planned_count": 0} for fmt in SYLLABUS_FORMATS}

            for top in subj_topics:
                top_id = top["id"]
                formats_data = {}
                has_any_video = False
                all_applicable_covered = True
                applicable_count = 0

                for fmt in SYLLABUS_FORMATS:
                    is_na = na_configs.get((top_id, fmt), False)
                    vids = topic_videos_map.get(top_id, {}).get(fmt, [])
                    plans = topic_planned_map.get(top_id, {}).get(fmt, [])

                    if not is_na:
                        subj_format_counts[fmt]["applicable_topics"] += 1
                        applicable_count += 1
                        if len(vids) == 0:
                            all_applicable_covered = False

                    if len(vids) > 0:
                        has_any_video = True
                        total_channel_videos_linked += len(vids)
                        subj_format_counts[fmt]["covered_topics"] += 1
                        subj_format_counts[fmt]["video_count"] += len(vids)

                    if len(plans) > 0:
                        total_channel_planned_linked += len(plans)
                        subj_format_counts[fmt]["planned_count"] += len(plans)

                    # Traffic-light cell state
                    if is_na:
                        cell_state = "gray"
                    elif len(vids) > 0:
                        cell_state = "green"
                    elif len(plans) > 0:
                        cell_state = "yellow"
                    else:
                        cell_state = "red"

                    formats_data[fmt] = {
                        "format": fmt,
                        "state": cell_state,
                        "is_na": is_na,
                        "video_count": len(vids),
                        "videos": vids,
                        "planned_count": len(plans),
                        "planned": plans
                    }

                # Topic-level rollups
                is_full = (all_applicable_covered if applicable_count > 0 else True)
                if has_any_video:
                    subj_topics_with_video += 1
                if is_full:
                    subj_topics_full_covered += 1

                built_topics.append({
                    "id": top_id,
                    "name": top["name"],
                    "parent_id": subj_id,
                    "subject_name": s["name"],
                    "course_id": course_id,
                    "course_name": c["name"],
                    "formats": formats_data,
                    "has_video": has_any_video,
                    "is_full_covered": is_full
                })

            course_topics_count += subj_topics_count
            course_topics_with_video += subj_topics_with_video
            course_topics_full_covered += subj_topics_full_covered

            subj_basic_pct = round((subj_topics_with_video / subj_topics_count) * 100, 1) if subj_topics_count > 0 else 0.0
            subj_full_pct = round((subj_topics_full_covered / subj_topics_count) * 100, 1) if subj_topics_count > 0 else 0.0

            # Subj format breakdown
            subj_format_breakdown = {}
            for fmt, sfc in subj_format_counts.items():
                app = sfc["applicable_topics"]
                cov = sfc["covered_topics"]
                pct = round((cov / app) * 100, 1) if app > 0 else 0.0
                subj_format_breakdown[fmt] = {
                    "covered_topics": cov,
                    "applicable_topics": app,
                    "total_topics": subj_topics_count,
                    "pct": pct,
                    "video_count": sfc["video_count"],
                    "planned_count": sfc["planned_count"]
                }
                # Rollup to course
                course_format_counts[fmt]["applicable_topics"] += app
                course_format_counts[fmt]["covered_topics"] += cov
                course_format_counts[fmt]["video_count"] += sfc["video_count"]
                course_format_counts[fmt]["planned_count"] += sfc["planned_count"]

            course_subjects_data.append({
                "id": subj_id,
                "name": s["name"],
                "course_id": course_id,
                "course_name": c["name"],
                "topics_count": subj_topics_count,
                "topics_with_video": subj_topics_with_video,
                "topics_full_covered": subj_topics_full_covered,
                "basic_coverage_pct": subj_basic_pct,
                "full_coverage_pct": subj_full_pct,
                "format_breakdown": subj_format_breakdown,
                "topics": built_topics
            })

        total_channel_topics += course_topics_count
        total_channel_topics_with_video += course_topics_with_video
        total_channel_topics_full_covered += course_topics_full_covered

        course_basic_pct = round((course_topics_with_video / course_topics_count) * 100, 1) if course_topics_count > 0 else 0.0
        course_full_pct = round((course_topics_full_covered / course_topics_count) * 100, 1) if course_topics_count > 0 else 0.0

        # Course format breakdown
        course_format_breakdown = {}
        for fmt, cfc in course_format_counts.items():
            app = cfc["applicable_topics"]
            cov = cfc["covered_topics"]
            pct = round((cov / app) * 100, 1) if app > 0 else 0.0
            course_format_breakdown[fmt] = {
                "covered_topics": cov,
                "applicable_topics": app,
                "total_topics": course_topics_count,
                "pct": pct,
                "video_count": cfc["video_count"],
                "planned_count": cfc["planned_count"]
            }
            # Rollup to channel
            channel_format_counts[fmt]["applicable_topics"] += app
            channel_format_counts[fmt]["covered_topics"] += cov
            channel_format_counts[fmt]["video_count"] += cfc["video_count"]
            channel_format_counts[fmt]["planned_count"] += cfc["planned_count"]

        tree_courses.append({
            "id": course_id,
            "name": c["name"],
            "topics_count": course_topics_count,
            "topics_with_video": course_topics_with_video,
            "topics_full_covered": course_topics_full_covered,
            "basic_coverage_pct": course_basic_pct,
            "full_coverage_pct": course_full_pct,
            "format_breakdown": course_format_breakdown,
            "subjects": course_subjects_data
        })

    channel_basic_pct = round((total_channel_topics_with_video / total_channel_topics) * 100, 1) if total_channel_topics > 0 else 0.0
    channel_full_pct = round((total_channel_topics_full_covered / total_channel_topics) * 100, 1) if total_channel_topics > 0 else 0.0

    channel_format_breakdown = {}
    for fmt, chfc in channel_format_counts.items():
        app = chfc["applicable_topics"]
        cov = chfc["covered_topics"]
        pct = round((cov / app) * 100, 1) if app > 0 else 0.0
        channel_format_breakdown[fmt] = {
            "covered_topics": cov,
            "applicable_topics": app,
            "total_topics": total_channel_topics,
            "pct": pct,
            "video_count": chfc["video_count"],
            "planned_count": chfc["planned_count"]
        }

    conn.close()

    return {
        "formats": SYLLABUS_FORMATS,
        "analytics": {
            "total_topics": total_channel_topics,
            "topics_with_video": total_channel_topics_with_video,
            "topics_full_covered": total_channel_topics_full_covered,
            "basic_coverage_pct": channel_basic_pct,
            "full_coverage_pct": channel_full_pct,
            "total_videos_linked": total_channel_videos_linked,
            "total_planned_linked": total_channel_planned_linked,
            "pending_queue_count": pending_queue_count,
            "unstarted_topics": max(0, total_channel_topics - total_channel_topics_with_video),
            "format_breakdown": channel_format_breakdown,
            "metric_definitions": {
                "basic_coverage": {
                    "title": "Topic Reach (≥1 Video)",
                    "short_desc": "Percentage of syllabus topics with at least one published video of any format.",
                    "focus": "Breadth — Ensures no topic is left completely uncovered on your channel."
                },
                "full_coverage": {
                    "title": "Complete Mastery (All Formats)",
                    "short_desc": "Percentage of syllabus topics with every required video format published (Discussion + Question Solving + Revision).",
                    "focus": "Depth — Measures comprehensive 360° preparation for students."
                }
            }
        },
        "courses": tree_courses
    }


def toggle_topic_format_na(topic_id: str, format_name: str, is_na: bool) -> Dict[str, Any]:
    """
    Sets or removes the Gray (Not Applicable) override for a Topic × Format cell.
    """
    conn = get_connection()
    cursor = conn.cursor()
    if is_na:
        cursor.execute("""
            INSERT OR REPLACE INTO topic_format_config (topic_id, format, is_na)
            VALUES (?, ?, 1)
        """, (topic_id, format_name))
    else:
        cursor.execute("""
            DELETE FROM topic_format_config 
            WHERE topic_id = ? AND format = ?
        """, (topic_id, format_name))
    conn.commit()
    conn.close()
    return {"status": "success", "topic_id": topic_id, "format": format_name, "is_na": is_na}


def create_flat_topics(course_id: str, subject_id: str, topic_names: List[str]) -> Dict[str, Any]:
    """
    Primary everyday bulk paste: creates topic-level lists under a selected Subject.
    Avoids duplicate topic names under the same subject. Automatically runs video matching.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    created_topics = []

    # Get existing topic names under subject (case-insensitive)
    cursor.execute("SELECT id, LOWER(name) as lower_name FROM lists WHERE parent_id = ?", (subject_id,))
    existing = {r["lower_name"]: r["id"] for r in cursor.fetchall()}

    for idx, raw_name in enumerate(topic_names):
        name = raw_name.strip()
        if not name:
            continue
        lower_name = name.lower()
        if lower_name in existing:
            created_topics.append({"id": existing[lower_name], "name": name, "status": "EXISTS"})
            continue

        safe_slug = re.sub(r'[^a-zA-Z0-9]', '_', lower_name)[:18].strip('_')
        tid = f"list_top_{subject_id[-8:]}_{safe_slug}_{datetime.now().strftime('%m%d%H%M%S')}_{idx}"
        
        cursor.execute("""
            INSERT INTO lists (id, name, parent_id, description, is_course, is_topic, created_at)
            VALUES (?, ?, ?, 'Syllabus curriculum topic', 0, 1, ?)
        """, (tid, name, subject_id, now_str))
        existing[lower_name] = tid
        created_topics.append({"id": tid, "name": name, "status": "CREATED"})

    conn.commit()
    conn.close()

    # Trigger auto-matching for newly added topics
    match_res = run_topic_video_matching([t["id"] for t in created_topics if t["status"] == "CREATED"])

    return {
        "status": "success",
        "total_submitted": len(topic_names),
        "created_count": len([t for t in created_topics if t["status"] == "CREATED"]),
        "topics": created_topics,
        "match_results": match_res
    }


def create_grouped_topics(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Creates topic lists from parsed & staged grouped shorthand lines.
    Matches Course and Subject without creating duplicate Course/Subject lists.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    created_ids = []

    for idx, r in enumerate(rows):
        subj_id = r.get("matched_subject_id") or r.get("subject_id")
        topic_name = str(r.get("topic_name") or r.get("video_name") or "").strip()
        if not subj_id or not topic_name:
            continue

        # Check existing
        cursor.execute("SELECT id FROM lists WHERE parent_id = ? AND LOWER(name) = ?", (subj_id, topic_name.lower()))
        found = cursor.fetchone()
        if found:
            created_ids.append(found["id"])
            continue

        safe_slug = re.sub(r'[^a-zA-Z0-9]', '_', topic_name.lower())[:18].strip('_')
        tid = f"list_top_{subj_id[-8:]}_{safe_slug}_{datetime.now().strftime('%m%d%H%M%S')}_{idx}"
        cursor.execute("""
            INSERT INTO lists (id, name, parent_id, description, is_course, is_topic, created_at)
            VALUES (?, ?, ?, 'Syllabus curriculum topic', 0, 1, ?)
        """, (tid, topic_name, subj_id, now_str))
        created_ids.append(tid)

    conn.commit()
    conn.close()

    match_res = run_topic_video_matching(created_ids)
    return {
        "status": "success",
        "created_count": len(created_ids),
        "created_ids": created_ids,
        "match_results": match_res
    }


def create_single_topic(course_id: str, subject_id: str, topic_name: str) -> Dict[str, Any]:
    """
    Adds one topic under a subject list.
    """
    clean_name = topic_name.strip()
    if not clean_name:
        raise ValueError("Topic name cannot be empty")
    return create_flat_topics(course_id=course_id, subject_id=subject_id, topic_names=[clean_name])


def delete_topic(topic_id: str) -> Dict[str, Any]:
    """
    Deletes a topic list and its relational mappings.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM topic_format_config WHERE topic_id = ?", (topic_id,))
    cursor.execute("DELETE FROM topic_match_queue WHERE topic_id = ?", (topic_id,))
    cursor.execute("DELETE FROM list_videos WHERE list_id = ?", (topic_id,))
    cursor.execute("DELETE FROM planned_video_lists WHERE list_id = ?", (topic_id,))
    cursor.execute("DELETE FROM lists WHERE id = ?", (topic_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "deleted_topic_id": topic_id}


def plan_topic_formats(
    topic_id: str,
    formats: List[str],
    session_id: Optional[str] = None,
    notes: str = ""
) -> Dict[str, Any]:
    """
    Plan Button per-topic action:
    Checking multiple formats creates one separate Planned Video Entry per checked format,
    pre-linked to this Topic in planned_video_lists. Flips cell(s) in grid immediately to yellow.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get topic details and ancestry
    cursor.execute("SELECT id, name, parent_id FROM lists WHERE id = ?", (topic_id,))
    topic_row = cursor.fetchone()
    if not topic_row:
        conn.close()
        raise ValueError("Topic not found")
    
    topic_name = topic_row["name"]
    subject_id = topic_row["parent_id"]

    # Subject's parent is the Course
    course_id = None
    if subject_id:
        cursor.execute("SELECT parent_id FROM lists WHERE id = ?", (subject_id,))
        subj_row = cursor.fetchone()
        if subj_row:
            course_id = subj_row["parent_id"]

    now_str = datetime.now().isoformat()
    created_planned = []

    for fmt in formats:
        clean_fmt = fmt.strip()
        pv_id = f"pv_syl_{topic_id[-8:]}_{clean_fmt[:4].lower()}_{datetime.now().strftime('%m%d%H%M%S')}_{len(created_planned)}"
        title = f"{topic_name} - {clean_fmt}"
        plan_notes = notes or f"Planned via Syllabus Matcher for {clean_fmt} format"

        cursor.execute("""
            INSERT INTO planned_videos (
                id, title, session_id, status, format, notes, content_type, production_stage, created_at, updated_at
            )
            VALUES (?, ?, ?, 'Planned', ?, ?, 'video', 'Idea', ?, ?)
        """, (pv_id, title, session_id or None, clean_fmt, plan_notes, now_str, now_str))

        # Associate in planned_video_lists with Topic, Subject, and Course
        for lid in [topic_id, subject_id, course_id]:
            if lid:
                cursor.execute("""
                    INSERT OR IGNORE INTO planned_video_lists (planned_video_id, list_id)
                    VALUES (?, ?)
                """, (pv_id, lid))

        created_planned.append({"id": pv_id, "title": title, "format": clean_fmt})

    conn.commit()
    conn.close()

    # Run auto matching to check if an uploaded video already matches
    run_auto_matching()

    return {
        "status": "success",
        "created_count": len(created_planned),
        "created_entries": created_planned
    }


# =====================================================================
# =====================================================================
# RULE-BASED TOPIC RECONCILIATION & AUTO-MATCHER ENGINE
# =====================================================================

ENGLISH_STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'did', 'do',
    'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
    'he', 'her', 'here', 'hereby', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
    'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of',
    'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 's', 'same',
    'she', 'should', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
    'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
    'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'you',
    'your', 'yours'
}

CURRICULUM_BOILERPLATE = ENGLISH_STOP_WORDS | {
    'introduction', 'intro', 'overview', 'basics', 'basic', 'fundamentals', 'fundamental',
    'principles', 'principle', 'concept', 'concepts', 'guide', 'guidance', 'code', 'standard',
    'standards', 'session', 'class', 'classes', 'lecture', 'part', 'level', 'reading', 'readings',
    'chapter', 'module', 'unit', 'study', 'test', 'exam', 'prep', 'preparation', 'revision',
    'fasttrack', 'marathon', 'cram', 'recap', 'questions', 'question', 'doubt', 'qna', 'q&a',
    'discussion', 'podcast', 'interview', 'notes', 'formula', 'paper', 'shashank', 'wandhe',
    'falcon', 'edufin', 'video', 'videos', 'new', 'vs', 'difference', 'compare', 'comparison',
    'understanding', 'application', 'applications', 'approach', 'approaches', 'methods', 'method',
    'measures', 'models', 'model', 'tools', 'tool', 'features', 'structures', 'structure',
    'types', 'type', 'uses', 'properties', 'property', 'definitions', 'definition', 'terminology',
    'part1', 'part2', 'part3', 'parti', 'partii', 'level1', 'level2', 'level3',
    'r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08', 'r09', 'r10', 'r11', 'r12', 'r13', 'r14',
    'r15', 'r16', 'r17', 'r18', 'r19', 'r20', 'r21', 'r22', 'r23', 'r24', 'r25', 'r26', 'r27', 'r28',
    'r29', 'r30', 'r31', 'r32', 'r33', 'r34', 'r35', 'r36', 'r37', 'r38', 'r39', 'r40', 'r41', 'r42',
    'r43', 'r44', 'r45', 'r46', 'r47', 'r48', 'r49', 'r50', 'r51', 'r52', 'r53', 'r54', 'r55', 'r56',
    'r57', 'r58', 'r59', 'r60'
}

GENERIC_STOP_WORDS = CURRICULUM_BOILERPLATE

META_STRATEGY_PATTERNS = [
    r'last \d+ days strategy', r'last \d+ months preparation strategy', r'last \d+ days revision',
    r'which exam session', r'which calculator', r'how to register', r'exam form registration',
    r'avoid these \d+ mistakes', r'should you register', r'do you need to be a math expert',
    r'mentorship video classes', r'study sequence', r'study plan', r'detailed preparation strategy',
    r'new syllabus', r'syllabus changes', r'curriculum changes', r'checking available dates',
    r'everything you need to know about cfa', r'order of preparation', r'exam review',
    r'quartile guidance', r'a success story', r'work experience submission', r'salary',
    r'exam fees', r'common topics in cfa and frm', r'how difficult is frm', r'books release date',
    r'how much time required', r'should you defer', r'self study books', r'preparation strategy',
    r'cfa level 2 vs cfa level 1', r'question\s*banks?', r'mock\s*tests?', r'study\s*notes',
    r'sample\s*papers?', r'test\s*package', r'how\s*to\s*prepare', r'sequence\s*of\s*topics'
]

SUBJECT_ALIASES = {
    'fsa': ['fsa', 'financial statement', 'financial reporting', 'financial statements'],
    'fi': ['fixed income', 'bond', 'bonds', 'debt'],
    'quants': ['quantitative', 'quants', 'statistics', 'probability'],
    'derivatives': ['derivatives', 'derivative', 'options', 'futures', 'swaps'],
    'corp': ['corporate issuers', 'corporate finance', 'corporate issuer'],
    'pm': ['portfolio management', 'portfolio'],
    'equity': ['equity', 'equities', 'stock'],
    'economics': ['economics', 'macroeconomics', 'microeconomics', 'currency exchange'],
    'ethics': ['ethics', 'ethical', 'standards of professional conduct', 'gips'],
    'frm_fmp': ['financial markets and products', 'fmp'],
    'frm_vrm': ['valuation and risk models', 'vrm'],
    'frm_mr': ['market risk', 'b1 market risk'],
    'frm_cr': ['credit risk'],
    'frm_or': ['operational risk'],
    'frm_lr': ['liquidity risk', 'liquidity and treasury risk']
}

def canonical_subject(name: Optional[str]) -> Optional[str]:
    """
    Normalizes a syllabus subject or video topic name into a canonical subject key.
    """
    if not name:
        return None
    s = name.lower()
    s = re.sub(r'^(?:[sb]\d+\s*[:.\-]?\s*)', '', s).strip()
    if any(k in s for k in ['financial statement', 'fsa', 'financial reporting']):
        return 'fsa'
    if any(k in s for k in ['fixed income', 'bond', 'bonds', 'debt']):
        return 'fi'
    if any(k in s for k in ['quantitative', 'quants', 'statistics', 'probability']):
        return 'quants'
    if any(k in s for k in ['derivative', 'derivatives', 'option', 'options', 'future', 'futures', 'swap', 'swaps']):
        return 'derivatives'
    if any(k in s for k in ['corporate issuer', 'corporate finance']):
        return 'corp'
    if any(k in s for k in ['portfolio management', 'wealth planning', 'risk management principle', 'investment management']):
        return 'pm'
    if any(k in s for k in ['equity', 'equities', 'stock']):
        return 'equity'
    if any(k in s for k in ['economics', 'macroeconomics', 'microeconomics', 'geopolitics', 'currency exchange']):
        return 'economics'
    if any(k in s for k in ['ethic', 'ethical', 'standards of professional conduct', 'gips']):
        return 'ethics'
    if any(k in s for k in ['alternative investment', 'real estate', 'hedge fund', 'digital asset', 'private capital']):
        return 'alt_invest'
    if any(k in s for k in ['market risk']):
        return 'market_risk'
    if any(k in s for k in ['credit risk', 'private credit']):
        return 'credit_risk'
    if any(k in s for k in ['operational risk', 'resiliency']):
        return 'operational_risk'
    if any(k in s for k in ['liquidity', 'treasury']):
        return 'liquidity_risk'
    if any(k in s for k in ['financial markets and products', 'financial markets & products', 'fmp']):
        return 'frm_fmp'
    if any(k in s for k in ['valuation and risk models', 'valuation & risk models', 'vrm']):
        return 'frm_vrm'
    if any(k in s for k in ['foundations of risk']):
        return 'frm_foundations'
    if any(k in s for k in ['general / strategy', 'strategy', 'general prep', 'guidance']):
        return 'meta'
    return None

def is_meta_strategy_video(title: str) -> bool:
    t = title.lower()
    return any(re.search(p, t) for p in META_STRATEGY_PATTERNS)

def stem_token(word: str) -> str:
    w = word.lower()
    if w.endswith('ies') and len(w) > 4: return w[:-3] + 'y'
    if w.endswith('es') and len(w) > 4: return w[:-2]
    if w.endswith('s') and not w.endswith('ss') and len(w) > 3: return w[:-1]
    if w.endswith('ing') and len(w) > 5: return w[:-3]
    if w.endswith('ed') and len(w) > 4: return w[:-2]
    return w

def extract_video_courses(title: str, db_course: str = '') -> Set[str]:
    comb = f'{title} {db_course}'.lower()
    courses = set()
    if re.search(r'\bcfa\s*(?:level|l)?\s*1\b|\bcfa\s*(?:level|l)?\s*i\b', comb) or 'cfa l1' in comb:
        courses.add('cfa_l1')
    if re.search(r'\bcfa\s*(?:level|l)?\s*2\b|\bcfa\s*(?:level|l)?\s*ii\b', comb) or 'cfa l2' in comb:
        courses.add('cfa_l2')
    if re.search(r'\bcfa\s*(?:level|l)?\s*3\b|\bcfa\s*(?:level|l)?\s*iii\b', comb) or 'cfa l3' in comb:
        courses.add('cfa_l3')
    if re.search(r'\bfrm\s*(?:part|p|level)?\s*1\b|\bfrm\s*(?:part|p|level)?\s*i\b', comb) or 'frm part 1' in comb or 'frm p1' in comb:
        courses.add('frm_p1')
    if re.search(r'\bfrm\s*(?:part|p|level)?\s*2\b|\bfrm\s*(?:part|p|level)?\s*ii\b', comb) or 'frm part 2' in comb or 'frm p2' in comb:
        courses.add('frm_p2')
    return courses

def normalize_course_name(course_str: Optional[str]) -> str:
    c = (course_str or '').lower()
    if 'cfa' in c and ('1' in c or 'i' in c and 'ii' not in c and 'iii' not in c): return 'cfa_l1'
    if 'cfa' in c and ('2' in c or 'ii' in c): return 'cfa_l2'
    if 'cfa' in c and ('3' in c or 'iii' in c): return 'cfa_l3'
    if 'frm' in c and ('1' in c or 'i' in c and 'ii' not in c): return 'frm_p1'
    if 'frm' in c and ('2' in c or 'ii' in c): return 'frm_p2'
    return ''

def clean_topic_title(raw_name: str) -> str:
    """
    Strips leading topic code prefixes (e.g. E5, EQ5, PC6, FSA12, FI1, D8, ETH10, CF1, QM1, R18, S1, B1).
    """
    s = re.sub(r'^(?:[A-Za-z]{1,5}\d{1,3}|Reading\s*\d+|Book\s*\d+|Session\s*\d+|R\d+|S\d+|B\d+)\s*[:.\-]?\s*', '', raw_name, flags=re.IGNORECASE)
    s = re.sub(r'\[\d+\]', '', s)
    return s.strip()

def extract_topic_phrases_and_ngrams(clean_name: str) -> List[Tuple[str, int]]:
    """
    Extracts high-quality topic phrases.
    Guarantees:
    - Never extracts pure boilerplate phrases (e.g. 'Introduction to', 'Part I', 'Overview of').
    - Disallows sub-phrases starting or ending with stop words/prepositions.
    - Requires at least 2 substantive domain words for sub-ngrams.
    """
    phrases = []
    # 1. Delimited clauses (e.g. before colons, hyphens, parentheses)
    for p in re.split(r'[:\-\—\(\)&,/]', clean_name):
        p_clean = p.strip()
        words = [w for w in re.findall(r'[a-zA-Z0-9]+', p_clean)]
        domain_words = [w for w in words if w.lower() not in CURRICULUM_BOILERPLATE and len(w) >= 3]
        if domain_words and len(words) >= 2:
            phrases.append((p_clean, len(domain_words)))
        elif len(domain_words) == 1 and len(words) == 1 and len(domain_words[0]) >= 5:
            phrases.append((domain_words[0], 1))

    # 2. Whole clean title
    words = [w for w in re.findall(r'[a-zA-Z0-9]+', clean_name)]
    domain_words = [w for w in words if w.lower() not in CURRICULUM_BOILERPLATE and len(w) >= 3]
    if len(words) >= 2 and domain_words:
        phrases.append((' '.join(words), len(domain_words)))

    # 3. Contiguous sub-phrases of length 2 or 3
    for n in (2, 3):
        for i in range(len(words) - n + 1):
            sub_words = words[i:i+n]
            # Disallow leading or trailing stop words/fillers
            if sub_words[0].lower() in ENGLISH_STOP_WORDS or sub_words[-1].lower() in ENGLISH_STOP_WORDS:
                continue
            sub_domain = [w for w in sub_words if w.lower() not in CURRICULUM_BOILERPLATE and len(w) >= 3]
            # Require at least 2 substantive domain words for sub-ngrams
            if len(sub_domain) >= 2:
                phrases.append((' '.join(sub_words), len(sub_domain)))

    # Deduplicate preserving order
    seen = set()
    deduped = []
    for p, count in phrases:
        p_norm = p.lower()
        if p_norm not in seen:
            seen.add(p_norm)
            deduped.append((p, count))

    deduped.sort(key=lambda x: -x[1])
    return deduped

def parse_structured_video_title(title: str, db_course: str = '', db_topic: str = '') -> Dict[str, Any]:
    t = title
    t_lower = t.lower()
    
    parsed = {
        'original_title': title,
        'topic_text': '',
        'detected_course': None,
        'detected_subject': canonical_subject(db_topic) or canonical_subject(title),
        'detected_format': 'Discussion',
        'is_meta': is_meta_strategy_video(title)
    }
    
    if parsed['is_meta']:
        return parsed

    # Detect video format type based on channel naming patterns
    if any(k in t_lower for k in ['fasttrack revision', 'formula revision', 'rapid revision', 'revision', 'fasttrack', 'fast track', 'marathon', 'cram', 'recap']):
        parsed['detected_format'] = 'Revision'
    elif any(k in t_lower for k in ['q&a', 'doubt', 'questions to solve', 'question paper', 'reality check', 'practice question', 'mock']):
        parsed['detected_format'] = 'Question Solving'
    elif any(k in t_lower for k in ['discussion', 'podcast', 'interview', 'lecture']):
        parsed['detected_format'] = 'Discussion'

    # Detect course from title and DB
    comb = f'{title} {db_course}'.lower()
    if re.search(r'\bcfa\s*(?:level|l)?\s*1\b|\bcfa\s*(?:level|l)?\s*i\b', comb) or 'cfa l1' in comb:
        parsed['detected_course'] = 'cfa_l1'
    elif re.search(r'\bcfa\s*(?:level|l)?\s*2\b|\bcfa\s*(?:level|l)?\s*ii\b', comb) or 'cfa l2' in comb:
        parsed['detected_course'] = 'cfa_l2'
    elif re.search(r'\bcfa\s*(?:level|l)?\s*3\b|\bcfa\s*(?:level|l)?\s*iii\b', comb) or 'cfa l3' in comb:
        parsed['detected_course'] = 'cfa_l3'
    elif re.search(r'\bfrm\s*(?:part|p|level)?\s*1\b|\bfrm\s*(?:part|p|level)?\s*i\b', comb) or 'frm part 1' in comb or 'frm p1' in comb:
        parsed['detected_course'] = 'frm_p1'
    elif re.search(r'\bfrm\s*(?:part|p|level)?\s*2\b|\bfrm\s*(?:part|p|level)?\s*ii\b', comb) or 'frm part 2' in comb or 'frm p2' in comb:
        parsed['detected_course'] = 'frm_p2'

    # Extract topic text from delimited segments or inline text
    if '|' in t:
        parts = [p.strip() for p in t.split('|') if p.strip()]
        first = parts[0]
        first_clean = re.sub(r'\b(?:Revision|FastTrack Revision|FastTrack|Part \d+|Session \d+)\b', '', first, flags=re.IGNORECASE).strip()
        parsed['topic_text'] = first_clean or first
    else:
        clean = t
        clean = re.sub(r'\b(?:cfa level \d+|cfa l\d+|frm part [i|1|2|ii]+|frm p[1|2])\b', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\b(?:Revision|FastTrack Revision|Formula Revision|Rapid Revision)\b', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\b(?:20\d\d|session|by\s*shashank\s*wandhe|falcon\s*edufin|r\d+)\b', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\s+', ' ', clean).strip()
        parsed['topic_text'] = clean

    return parsed

def reconcile_topic_with_video(topic: Dict[str, Any], video: Dict[str, Any], parsed: Dict[str, Any]) -> Tuple[float, str, str, int]:
    """
    Reconciles a Topic from the topic list against a published YouTube video using structured naming rules:
    - Rejects meta/strategy/channel guidance videos.
    - Disqualifies cross-course mismatches (CFA Level 1 vs CFA Level 2 vs FRM Part 1/2).
    - Disqualifies cross-subject mismatches (e.g. CFA Economics topic CANNOT match FSA video).
    - Requires topic substantive domain terms to overlap with the video.
    - Requires multi-word contiguous phrase matches or >= 2 distinctive domain terms for auto-linking.
    - Detects video format (specifically Revision).
    """
    if parsed.get('is_meta'):
        return (0.0, '', '', 0)

    v_title = video['title']
    v_low = v_title.lower()

    # 1. Strict Course Check: Disqualify completely if courses differ
    t_course = normalize_course_name(topic.get('course_name'))
    v_courses = extract_video_courses(v_title, video.get('course') or '')
    if t_course and v_courses and t_course not in v_courses:
        return (0.0, '', '', 0)

    # 2. Strict Subject Check: Disqualify completely if subjects differ!
    t_subj = canonical_subject(topic.get('subject_name'))
    v_subj = parsed.get('detected_subject') or canonical_subject(video.get('topic')) or canonical_subject(v_title)
    
    if t_subj and v_subj and t_subj != 'meta' and v_subj != 'meta' and t_subj != v_subj:
        # Cross-subject mismatch! Immediate disqualification
        return (0.0, '', '', 0)

    clean_topic = clean_topic_title(topic['name'])
    t_low = clean_topic.lower()

    # Substantive domain tokens of topic
    t_words = [w for w in re.findall(r'[a-zA-Z0-9]+', t_low)]
    t_domain = [w for w in t_words if w not in CURRICULUM_BOILERPLATE and len(w) >= 3]
    t_domain_stemmed = set(stem_token(w) for w in t_domain)

    # Substantive domain tokens of video
    v_words = [w for w in re.findall(r'[a-zA-Z0-9]+', v_low)]
    v_domain = [w for w in v_words if w not in CURRICULUM_BOILERPLATE and len(w) >= 3]
    v_domain_stemmed = set(stem_token(w) for w in v_domain)

    overlap = t_domain_stemmed.intersection(v_domain_stemmed)

    # TVM acronym support
    if 'time value of money' in t_low and re.search(r'\btvm\b', v_low):
        overlap.add('tvm')

    # If topic has domain keywords, at least one must overlap with the video
    if t_domain_stemmed and not overlap:
        return (0.0, '', '', 0)

    phrases = extract_topic_phrases_and_ngrams(clean_topic)

    v_stemmed = ' '.join(stem_token(w) for w in v_words)
    v_topic_text = parsed.get('topic_text') or ''
    v_topic_stemmed = ' '.join(stem_token(w) for w in re.findall(r'[a-zA-Z0-9]+', v_topic_text.lower()))

    matched_phrase = None
    matched_word_count = 0
    matched_is_primary = False

    for p, w_count in phrases:
        p_low = p.lower()
        p_stemmed = ' '.join(stem_token(w) for w in re.findall(r'[a-zA-Z0-9]+', p_low))
        
        # Primary check: against isolated topic segment
        if v_topic_stemmed and (p_stemmed in v_topic_stemmed or v_topic_stemmed in p_stemmed):
            matched_phrase = p
            matched_word_count = w_count
            matched_is_primary = True
            break
            
        # Secondary check: against full video title
        if p_low in v_low or p_stemmed in v_stemmed:
            matched_phrase = p
            matched_word_count = w_count
            break

    score = 0.0
    reason = ''
    has_subject_match = bool(t_subj and v_subj and t_subj == v_subj)

    if matched_phrase and matched_word_count >= 2:
        # Multi-word domain phrase matched
        base = 0.88 + min(0.08, 0.03 * matched_word_count)
        if matched_is_primary:
            base += 0.03
        score = base
        reason = f'Contiguous topic phrase match: "{matched_phrase}"'
    elif matched_phrase and matched_is_primary:
        # Primary topic segment matches
        score = 0.90
        reason = f'Primary topic segment match: "{matched_phrase}"'
    elif len(overlap) >= 2:
        score = 0.85
        reason = f'Multiple distinctive domain terms match: {list(overlap)}'
    elif len(overlap) == 1:
        sole_term = list(overlap)[0]
        # Single distinctive term with matching subject -> put in REVIEW QUEUE (score 0.65)
        if has_subject_match and len(sole_term) >= 5:
            score = 0.65
            reason = f'Single distinctive term "{sole_term}" in matching subject (requires review)'
        else:
            return (0.0, '', '', 0)

    if score > 0.0 and has_subject_match:
        score += 0.05
    if score > 0.0 and t_course and t_course in v_courses:
        score += 0.05

    return (round(min(1.0, score), 3), reason, parsed['detected_format'], matched_word_count)


def run_topic_video_matching(target_topic_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Rule-based Topic Video Auto-Matcher:
    1. First checks the topic list (topic name, parent subject, course).
    2. Reconciles against YouTube videos based on channel naming structures:
       - Delimited segments: [Topic Name] | [Course] | [Subject] | [Format / Session]
       - Inline revision format: [Topic] Revision [Course] [Session]
    3. Selects best candidate topic match per video to avoid duplicate cross-subject links.
    4. Confident matches (>= 0.85) -> auto-linked in list_videos and format synchronized.
    5. Plausible candidate matches (0.50 - 0.84) -> added to topic_match_queue with match reason.
    6. Disallows isolated single-word matches without subject alignment and review.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    # 1. Fetch target topics
    if target_topic_ids:
        placeholders = ",".join("?" * len(target_topic_ids))
        cursor.execute(f"""
            SELECT t.id, t.name, t.parent_id, s.name as subject_name, c.name as course_name, c.id as course_id
            FROM lists t
            LEFT JOIN lists s ON t.parent_id = s.id
            LEFT JOIN lists c ON s.parent_id = c.id
            WHERE t.id IN ({placeholders})
        """, tuple(target_topic_ids))
    else:
        cursor.execute("""
            SELECT t.id, t.name, t.parent_id, s.name as subject_name, c.name as course_name, c.id as course_id
            FROM lists t
            LEFT JOIN lists s ON t.parent_id = s.id
            LEFT JOIN lists c ON s.parent_id = c.id
            WHERE t.is_topic = 1
        """)
    topics = [dict(r) for r in cursor.fetchall()]

    # 2. Fetch published videos
    cursor.execute("SELECT id, title, course, topic, format, published_at FROM videos ORDER BY published_at DESC")
    all_videos = [dict(r) for r in cursor.fetchall()]

    # 3. Clean up prior spurious auto-assigned matches for these topics
    if target_topic_ids:
        placeholders = ",".join("?" * len(target_topic_ids))
        cursor.execute(f"DELETE FROM list_videos WHERE list_id IN ({placeholders}) AND auto_assigned = 1", tuple(target_topic_ids))
        cursor.execute(f"DELETE FROM topic_match_queue WHERE topic_id IN ({placeholders}) AND status = 'PENDING'", tuple(target_topic_ids))
    else:
        cursor.execute("DELETE FROM list_videos WHERE list_id IN (SELECT id FROM lists WHERE is_topic = 1) AND auto_assigned = 1")
        cursor.execute("DELETE FROM topic_match_queue WHERE status = 'PENDING'")
    conn.commit()

    # 4. Parse all published videos once with title, course, and topic
    parsed_videos = {v["id"]: parse_structured_video_title(v["title"], v.get("course") or "", v.get("topic") or "") for v in all_videos}

    # 5. Existing links (e.g. manual links where auto_assigned = 0)
    cursor.execute("SELECT list_id, video_id FROM list_videos")
    existing_links = set((r["list_id"], r["video_id"]) for r in cursor.fetchall())

    # Set of videos already mapped to a topic (to prevent duplicate and cross-subject mapping)
    cursor.execute("""
        SELECT lv.video_id 
        FROM list_videos lv
        JOIN lists l ON lv.list_id = l.id
        WHERE l.is_topic = 1
    """)
    mapped_video_ids = set(r["video_id"] for r in cursor.fetchall())

    cursor.execute("SELECT topic_id, video_id, status FROM topic_match_queue")
    queue_records = {(r["topic_id"], r["video_id"]): r["status"] for r in cursor.fetchall()}

    cursor.execute("SELECT topic_id, video_id FROM rejected_topic_matches")
    rejected_topic_pairs = {(r["topic_id"], r["video_id"]) for r in cursor.fetchall()}

    auto_linked = 0
    queued = 0

    # 6. Reconcile videos against topics, picking best matching topic candidate per video
    for vid in all_videos:
        v_id = vid["id"]
        # Skip video if already mapped to an active syllabus topic
        if v_id in mapped_video_ids:
            continue

        parsed = parsed_videos[v_id]
        if parsed.get("is_meta"):
            continue

        candidates = []
        for top in topics:
            top_id = top["id"]
            if (top_id, v_id) in existing_links or (top_id, v_id) in rejected_topic_pairs:
                continue

            prev_status = queue_records.get((top_id, v_id))
            if prev_status in ("REJECTED", "CONFIRMED"):
                continue

            score, reason, detected_fmt, w_count = reconcile_topic_with_video(top, vid, parsed)
            if score >= 0.50:
                candidates.append((score, top, reason, detected_fmt, w_count))

        if not candidates:
            continue

        # Sort candidates by score descending, then word count descending
        candidates.sort(key=lambda x: (-x[0], -x[4]))
        best_cand = candidates[0]
        raw_score, best_top, best_reason, detected_fmt, _ = best_cand
        best_score = min(1.0, round(raw_score, 2))
        best_top_id = best_top["id"]

        if best_score >= 0.85:
            # Confident match -> auto-link video to Topic
            cursor.execute("""
                INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                VALUES (?, ?, 1, ?)
            """, (best_top_id, v_id, now_str))
            existing_links.add((best_top_id, v_id))
            mapped_video_ids.add(v_id)

            # Ensure parent subject and course have link
            if best_top["parent_id"]:
                cursor.execute("""
                    INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                    VALUES (?, ?, 1, ?)
                """, (best_top["parent_id"], v_id, now_str))
            if best_top.get("course_id"):
                cursor.execute("""
                    INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                    VALUES (?, ?, 1, ?)
                """, (best_top["course_id"], v_id, now_str))

            # If detected format is Revision, synchronize video format
            if detected_fmt == "Revision" and vid.get("format") != "Revision / Marathon":
                cursor.execute("UPDATE videos SET format = 'Revision / Marathon' WHERE id = ?", (v_id,))

            cursor.execute("DELETE FROM topic_match_queue WHERE video_id = ?", (v_id,))
            auto_linked += 1

        elif best_score >= 0.50:
            # Candidate / uncertain match -> add to review queue with reason
            prev_status = queue_records.get((best_top_id, v_id))
            if prev_status != "PENDING":
                cursor.execute("""
                    INSERT OR IGNORE INTO topic_match_queue (topic_id, video_id, confidence, status, match_reason, created_at)
                    VALUES (?, ?, ?, 'PENDING', ?, ?)
                """, (best_top_id, v_id, best_score, best_reason, now_str))
                queue_records[(best_top_id, v_id)] = "PENDING"
                queued += 1

    # Clean up subject auto-assigned links that no longer have any active linked topic under that subject
    cursor.execute("""
        DELETE FROM list_videos
        WHERE auto_assigned = 1
          AND list_id IN (SELECT id FROM lists WHERE is_topic = 0 AND parent_id IS NOT NULL)
          AND (list_id, video_id) NOT IN (
              SELECT t.parent_id, lv.video_id
              FROM list_videos lv
              JOIN lists t ON lv.list_id = t.id
              WHERE t.is_topic = 1 AND t.parent_id IS NOT NULL
          )
    """)

    conn.commit()
    conn.close()

    return {
        "auto_linked_count": auto_linked,
        "review_queue_added": queued,
        "topics_scanned": len(topics),
        "videos_scanned": len(all_videos)
    }


def get_topic_match_queue() -> List[Dict[str, Any]]:
    """
    Returns pending matches in topic_match_queue with enriched topic and video metadata including match_reason.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            tmq.id, tmq.topic_id, tmq.video_id, tmq.confidence, tmq.status, tmq.created_at, tmq.match_reason,
            t.name as topic_name,
            s.name as subject_name,
            c.name as course_name,
            v.title as video_title,
            v.format as video_format,
            v.views as video_views,
            v.duration_seconds as video_duration,
            v.thumbnail_url as video_thumbnail
        FROM topic_match_queue tmq
        JOIN lists t ON tmq.topic_id = t.id
        LEFT JOIN lists s ON t.parent_id = s.id
        LEFT JOIN lists c ON s.parent_id = c.id
        JOIN videos v ON tmq.video_id = v.id
        WHERE tmq.status = 'PENDING'
        ORDER BY tmq.confidence DESC, tmq.created_at DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows



def confirm_topic_match(queue_id: int) -> Dict[str, Any]:
    """
    User confirms uncertain match: links video to Topic in list_videos and marks CONFIRMED.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT topic_id, video_id FROM topic_match_queue WHERE id = ?", (queue_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError("Match queue item not found")

    top_id = row["topic_id"]
    vid_id = row["video_id"]
    now_str = datetime.now().isoformat()

    # Link to topic
    cursor.execute("""
        INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
        VALUES (?, ?, 1, ?)
    """, (top_id, vid_id, now_str))

    # Link to subject and course
    cursor.execute("SELECT parent_id FROM lists WHERE id = ?", (top_id,))
    subj_row = cursor.fetchone()
    if subj_row and subj_row["parent_id"]:
        subj_id = subj_row["parent_id"]
        cursor.execute("""
            INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
            VALUES (?, ?, 1, ?)
        """, (subj_id, vid_id, now_str))
        cursor.execute("SELECT parent_id FROM lists WHERE id = ?", (subj_id,))
        course_row = cursor.fetchone()
        if course_row and course_row["parent_id"]:
            cursor.execute("""
                INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                VALUES (?, ?, 1, ?)
            """, (course_row["parent_id"], vid_id, now_str))

    # Check and update format if video title is revision
    cursor.execute("SELECT title, format FROM videos WHERE id = ?", (vid_id,))
    v_info = cursor.fetchone()
    if v_info:
        v_comb = f"{v_info['title'] or ''}".lower()
        if any(k in v_comb for k in ['revision', 'fasttrack', 'fast track', 'formula revision', 'marathon', 'cram', 'recap']):
            cursor.execute("UPDATE videos SET format = 'Revision / Marathon' WHERE id = ?", (vid_id,))

    cursor.execute("UPDATE topic_match_queue SET status = 'CONFIRMED' WHERE id = ?", (queue_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "queue_id": queue_id, "topic_id": top_id, "video_id": vid_id}


def reject_topic_match(queue_id: int) -> Dict[str, Any]:
    """
    User rejects uncertain match: marks queue entry as REJECTED and records to rejected_topic_matches.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT topic_id, video_id FROM topic_match_queue WHERE id = ?", (queue_id,))
    item = cursor.fetchone()
    now_str = datetime.now().isoformat()
    if item:
        cursor.execute("""
            INSERT OR IGNORE INTO rejected_topic_matches (topic_id, video_id, created_at)
            VALUES (?, ?, ?)
        """, (item["topic_id"], item["video_id"], now_str))
    cursor.execute("UPDATE topic_match_queue SET status = 'REJECTED' WHERE id = ?", (queue_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "queue_id": queue_id}


def manual_link_topic_video(
    topic_id: Optional[str] = None,
    video_id: str = "",
    action: str = "link",
    topic_ids: Optional[List[str]] = None,
    target_format: Optional[str] = None
) -> Dict[str, Any]:
    """
    Manually links or unlinks a video from one or multiple topics.
    Supports 1-to-many linkages where a single YouTube video covers multiple topics.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    target_topic_ids = []
    if topic_ids:
        target_topic_ids.extend(topic_ids)
    if topic_id and topic_id not in target_topic_ids:
        target_topic_ids.append(topic_id)

    if not target_topic_ids:
        conn.close()
        return {"status": "error", "message": "No topic_id provided"}

    for tid in target_topic_ids:
        if action == "link":
            # 1. Link video to topic
            cursor.execute("""
                INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                VALUES (?, ?, 0, ?)
            """, (tid, video_id, now_str))

            # 2. Also ensure parent subject and grandparent course are linked in list_videos
            cursor.execute("SELECT parent_id FROM lists WHERE id = ?", (tid,))
            top_row = cursor.fetchone()
            if top_row and top_row["parent_id"]:
                subj_id = top_row["parent_id"]
                cursor.execute("""
                    INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                    VALUES (?, ?, 0, ?)
                """, (subj_id, video_id, now_str))
                cursor.execute("SELECT parent_id FROM lists WHERE id = ?", (subj_id,))
                subj_row = cursor.fetchone()
                if subj_row and subj_row["parent_id"]:
                    course_id = subj_row["parent_id"]
                    cursor.execute("""
                        INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                        VALUES (?, ?, 0, ?)
                    """, (course_id, video_id, now_str))

            # 3. Clean pending item from topic match queue
            cursor.execute("DELETE FROM topic_match_queue WHERE video_id = ? AND topic_id = ?", (video_id, tid))
        else:
            # Unlink
            cursor.execute("""
                DELETE FROM list_videos WHERE list_id = ? AND video_id = ?
            """, (tid, video_id))

    # Format synchronization
    if action == "link":
        cursor.execute("SELECT title, format FROM videos WHERE id = ?", (video_id,))
        v_row = cursor.fetchone()
        if v_row:
            v_title = (v_row["title"] or "").lower()
            if target_format:
                fmt_map = {
                    "Revision": "Revision / Marathon",
                    "Question Solving": "Doubt-clearing / Q&A",
                    "Discussion": "Core Lecture",
                    "General": "Strategy / General"
                }
                new_fmt = fmt_map.get(target_format)
                if new_fmt:
                    cursor.execute("UPDATE videos SET format = ? WHERE id = ?", (new_fmt, video_id))
            elif any(k in v_title for k in ["revision", "fasttrack", "fast track", "formula revision", "marathon", "cram", "recap"]):
                cursor.execute("UPDATE videos SET format = 'Revision / Marathon' WHERE id = ?", (video_id,))

    conn.commit()
    conn.close()
    return {
        "status": "success",
        "action": action,
        "topic_id": topic_id,
        "topic_ids": target_topic_ids,
        "video_id": video_id
    }


# =====================================================================
# FULL VIDEO ANALYTICS & REVERSE MATCHER HELPERS
# =====================================================================

def get_all_videos_reverse_match() -> Dict[str, Any]:
    """
    Returns all published videos joined with their Syllabus Matcher linkages.
    Used for reverse-matching verification (Video -> Topic).
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            v.id, v.title, v.thumbnail_url, v.published_at, v.duration_seconds,
            v.course, v.topic, v.format, v.views, v.impressions, v.ctr,
            t.id as topic_id, t.name as topic_name,
            s.name as subject_name, cr.name as course_name,
            lv.auto_assigned
        FROM videos v
        LEFT JOIN list_videos lv ON v.id = lv.video_id
        LEFT JOIN lists t ON lv.list_id = t.id AND t.is_topic = 1
        LEFT JOIN lists s ON t.parent_id = s.id
        LEFT JOIN lists cr ON s.parent_id = cr.id
        ORDER BY v.published_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    videos_map: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        v_id = r["id"]
        if v_id not in videos_map:
            videos_map[v_id] = {
                "id": r["id"],
                "title": r["title"],
                "thumbnail_url": r["thumbnail_url"] or "",
                "published_at": r["published_at"] or "",
                "duration_seconds": r["duration_seconds"] or 0,
                "course": r["course"] or "",
                "topic": r["topic"] or "",
                "format": r["format"] or "Core Lecture",
                "views": r["views"] or 0,
                "impressions": r["impressions"] or 0,
                "ctr": round(r["ctr"] or 0.0, 2),
                "matched_topics": []
            }
        if r["topic_id"]:
            videos_map[v_id]["matched_topics"].append({
                "topic_id": r["topic_id"],
                "topic_name": r["topic_name"],
                "subject_name": r["subject_name"] or "General",
                "course_name": r["course_name"] or "General Prep",
                "auto_assigned": r["auto_assigned"]
            })

    video_list = list(videos_map.values())
    for v in video_list:
        v["is_matched"] = len(v["matched_topics"]) > 0

    matched_count = sum(1 for v in video_list if v["is_matched"])
    unmatched_count = len(video_list) - matched_count

    return {
        "total_videos": len(video_list),
        "matched_count": matched_count,
        "unmatched_count": unmatched_count,
        "videos": video_list
    }


def reassign_video_topic(video_id: str, new_topic_id: str, old_topic_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Manually assigns or reassigns a video to a new topic.
    If old_topic_id is provided, removes the video from that topic.
    Also ensures parent subject and grandparent course are linked in list_videos.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()

    # 1. Unlink from old topic if provided
    if old_topic_id:
        cursor.execute("DELETE FROM list_videos WHERE list_id = ? AND video_id = ?", (old_topic_id, video_id))

    # 2. Link to new topic
    cursor.execute("""
        INSERT OR REPLACE INTO list_videos (list_id, video_id, auto_assigned, created_at)
        VALUES (?, ?, 0, ?)
    """, (new_topic_id, video_id, now_str))

    # 3. Link parent subject and grandparent course
    cursor.execute("SELECT parent_id FROM lists WHERE id = ?", (new_topic_id,))
    top_row = cursor.fetchone()
    if top_row and top_row["parent_id"]:
        subj_id = top_row["parent_id"]
        cursor.execute("""
            INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
            VALUES (?, ?, 0, ?)
        """, (subj_id, video_id, now_str))
        cursor.execute("SELECT parent_id FROM lists WHERE id = ?", (subj_id,))
        subj_row = cursor.fetchone()
        if subj_row and subj_row["parent_id"]:
            course_id = subj_row["parent_id"]
            cursor.execute("""
                INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
                VALUES (?, ?, 0, ?)
            """, (course_id, video_id, now_str))

    # 4. Synchronize format if video is revision
    cursor.execute("SELECT title, format FROM videos WHERE id = ?", (video_id,))
    v_row = cursor.fetchone()
    if v_row:
        t_low = (v_row["title"] or "").lower()
        if any(k in t_low for k in ["revision", "fasttrack", "fast track", "formula revision", "marathon", "cram", "recap"]):
            cursor.execute("UPDATE videos SET format = 'Revision / Marathon' WHERE id = ?", (video_id,))

    # 5. Clear pending item from match review queue if any
    cursor.execute("DELETE FROM topic_match_queue WHERE video_id = ?", (video_id,))

    conn.commit()
    conn.close()
    return {"status": "success", "video_id": video_id, "topic_id": new_topic_id}


def unlink_video_topic(video_id: str, topic_id: str) -> Dict[str, Any]:
    """
    Unlinks a video from a specific topic.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM list_videos WHERE list_id = ? AND video_id = ?", (topic_id, video_id))
    conn.commit()
    conn.close()
    return {"status": "success", "video_id": video_id, "topic_id": topic_id}


def get_all_syllabus_topics_flat() -> List[Dict[str, Any]]:
    """
    Returns flat list of all syllabus topics with subject and course metadata for quick selection.
    Naturally sorted so R1, R2, ..., R10 appear in intuitive curriculum order.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            t.id, t.name, t.parent_id,
            s.name as subject_name, s.id as subject_id,
            cr.name as course_name, cr.id as course_id
        FROM lists t
        LEFT JOIN lists s ON t.parent_id = s.id
        LEFT JOIN lists cr ON s.parent_id = cr.id
        WHERE t.is_topic = 1
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    course_order = ["list_cfa_l1", "list_cfa_l2", "list_cfa_l3", "list_frm_p1", "list_frm_p2"]
    def flat_sort_key(r):
        c_id = r.get("course_id") or ""
        c_prio = course_order.index(c_id) if c_id in course_order else 99
        return (
            c_prio,
            natural_sort_key(r.get("course_name") or ""),
            natural_sort_key(r.get("subject_name") or ""),
            natural_sort_key(r.get("name") or "")
        )

    rows.sort(key=flat_sort_key)
    return rows




