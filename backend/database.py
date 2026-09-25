import sqlite3
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

IS_VERCEL = bool(os.environ.get("VERCEL"))
DB_DIR = "/tmp" if IS_VERCEL else os.path.dirname(__file__)
DB_PATH = os.path.join(DB_DIR, "falcon_yt.db")

# If on Vercel and bundled DB exists, copy it to /tmp
if IS_VERCEL:
    bundled_db = os.path.join(os.path.dirname(__file__), "falcon_yt.db")
    if os.path.exists(bundled_db) and not os.path.exists(DB_PATH):
        try:
            import shutil
            shutil.copy2(bundled_db, DB_PATH)
        except Exception as _e:
            print(f"Notice copying bundled DB: {_e}")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Videos table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        thumbnail_url TEXT DEFAULT '',
        published_at TEXT NOT NULL,
        duration_seconds INTEGER DEFAULT 0,
        course TEXT NOT NULL,
        topic TEXT NOT NULL,
        format TEXT NOT NULL,
        category_override INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        ctr REAL DEFAULT 0.0,
        avg_view_duration INTEGER DEFAULT 0,
        watch_time_hours REAL DEFAULT 0.0,
        subscribers_gained INTEGER DEFAULT 0,
        updated_at TEXT
    );
    """)

    # Monthly metrics table (for pivot leaderboard & YoY comparisons)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS monthly_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        month TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        watch_time_hours REAL DEFAULT 0.0,
        impressions INTEGER DEFAULT 0,
        ctr REAL DEFAULT 0.0,
        avg_view_duration INTEGER DEFAULT 0,
        subscribers_gained INTEGER DEFAULT 0,
        FOREIGN KEY (video_id) REFERENCES videos(id),
        UNIQUE(video_id, month)
    );
    """)

    # Lists table (Hierarchical list system)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        description TEXT DEFAULT '',
        is_course INTEGER DEFAULT 0,
        created_at TEXT,
        FOREIGN KEY (parent_id) REFERENCES lists(id) ON DELETE SET NULL
    );
    """)

    # List-Videos many-to-many relationship
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS list_videos (
        list_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        auto_assigned INTEGER DEFAULT 1,
        created_at TEXT,
        PRIMARY KEY (list_id, video_id),
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );
    """)

    # Change log table (Before/After impact tracking)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS change_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        change_date TEXT NOT NULL,
        change_type TEXT NOT NULL,
        old_title TEXT,
        new_title TEXT,
        old_thumbnail TEXT,
        new_thumbnail TEXT,
        notes TEXT,
        ctr_before_14d REAL DEFAULT 0.0,
        ctr_after_14d REAL DEFAULT 0.0,
        channel_ctr_before_14d REAL DEFAULT 0.0,
        channel_ctr_after_14d REAL DEFAULT 0.0,
        impact_score REAL DEFAULT 0.0,
        views_before_14d INTEGER DEFAULT 0,
        views_after_14d INTEGER DEFAULT 0,
        created_at TEXT,
        FOREIGN KEY (video_id) REFERENCES videos(id)
    );
    """)

    # Competitor channels
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS competitors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        channel_handle TEXT,
        subscriber_count INTEGER DEFAULT 0,
        video_count INTEGER DEFAULT 0,
        total_views INTEGER DEFAULT 0,
        avatar_url TEXT,
        updated_at TEXT
    );
    """)

    # Competitor videos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS competitor_videos (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        title TEXT NOT NULL,
        published_at TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        thumbnail_url TEXT,
        course TEXT,
        topic TEXT,
        format TEXT,
        velocity REAL DEFAULT 0.0,
        outlier_score REAL DEFAULT 1.0,
        FOREIGN KEY (channel_id) REFERENCES competitors(id)
    );
    """)

    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    """)

    # -------------------------------------------------------------
    # Upload Planner Data Model
    # -------------------------------------------------------------
    # Exam Sessions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT
    );
    """)

    # List Targets scoped to sessions (or ongoing if session_id is NULL)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS list_targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        list_id TEXT NOT NULL,
        target_count INTEGER NOT NULL,
        created_at TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
        UNIQUE(session_id, list_id)
    );
    """)

    # Planned Video Entries
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS planned_videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        session_id TEXT,
        status TEXT DEFAULT 'Planned',
        linked_video_id TEXT,
        assigned_month TEXT DEFAULT NULL,
        assigned_week TEXT DEFAULT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (linked_video_id) REFERENCES videos(id) ON DELETE SET NULL
    );
    """)

    # Check for assigned_month column migration
    cursor.execute("PRAGMA table_info(planned_videos)")
    pv_cols = [col[1] for col in cursor.fetchall()]
    if "assigned_month" not in pv_cols:
        cursor.execute("ALTER TABLE planned_videos ADD COLUMN assigned_month TEXT DEFAULT NULL")
    if "content_type" not in pv_cols:
        cursor.execute("ALTER TABLE planned_videos ADD COLUMN content_type TEXT DEFAULT 'video'")
    if "hook" not in pv_cols:
        cursor.execute("ALTER TABLE planned_videos ADD COLUMN hook TEXT DEFAULT ''")
    if "series" not in pv_cols:
        cursor.execute("ALTER TABLE planned_videos ADD COLUMN series TEXT DEFAULT ''")
    if "target_duration_sec" not in pv_cols:
        cursor.execute("ALTER TABLE planned_videos ADD COLUMN target_duration_sec INTEGER DEFAULT 60")
    if "production_stage" not in pv_cols:
        cursor.execute("ALTER TABLE planned_videos ADD COLUMN production_stage TEXT DEFAULT 'Idea'")

    # Check for format column in planned_videos
    if "format" not in pv_cols:
        cursor.execute("ALTER TABLE planned_videos ADD COLUMN format TEXT DEFAULT ''")

    # Check for total_target and shorts_target columns in sessions
    cursor.execute("PRAGMA table_info(sessions)")
    sess_cols = [col[1] for col in cursor.fetchall()]
    if "total_target" not in sess_cols:
        cursor.execute("ALTER TABLE sessions ADD COLUMN total_target INTEGER DEFAULT 0")
    if "shorts_target" not in sess_cols:
        cursor.execute("ALTER TABLE sessions ADD COLUMN shorts_target INTEGER DEFAULT 0")

    # Lists table is_topic column
    cursor.execute("PRAGMA table_info(lists)")
    list_cols = [col[1] for col in cursor.fetchall()]
    if "is_topic" not in list_cols:
        cursor.execute("ALTER TABLE lists ADD COLUMN is_topic INTEGER DEFAULT 0")

    # Topic format configuration (for gray / Not Applicable cells)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS topic_format_config (
        topic_id TEXT NOT NULL,
        format TEXT NOT NULL,
        is_na INTEGER DEFAULT 1,
        PRIMARY KEY(topic_id, format),
        FOREIGN KEY (topic_id) REFERENCES lists(id) ON DELETE CASCADE
    );
    """)

    # Topic match queue (for uncertain video-to-topic matches)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS topic_match_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        confidence REAL DEFAULT 0.0,
        status TEXT DEFAULT 'PENDING',
        created_at TEXT,
        FOREIGN KEY (topic_id) REFERENCES lists(id) ON DELETE CASCADE,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        UNIQUE(topic_id, video_id)
    );
    """)

    # Planned Videos multi-list association
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS planned_video_lists (
        planned_video_id TEXT NOT NULL,
        list_id TEXT NOT NULL,
        PRIMARY KEY (planned_video_id, list_id),
        FOREIGN KEY (planned_video_id) REFERENCES planned_videos(id) ON DELETE CASCADE,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    );
    """)

    # Match Review Queue for uncertain auto-matches
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS match_review_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        planned_video_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        confidence REAL DEFAULT 0.0,
        status TEXT DEFAULT 'PENDING',
        created_at TEXT,
        FOREIGN KEY (planned_video_id) REFERENCES planned_videos(id) ON DELETE CASCADE,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        UNIQUE(planned_video_id, video_id)
    );
    """)

    # Permanent match rejection history: remembers user's choice to never suggest this pair again
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rejected_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        planned_video_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        created_at TEXT,
        UNIQUE(planned_video_id, video_id)
    );
    """)

    # Permanent syllabus topic rejection history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rejected_topic_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        created_at TEXT,
        UNIQUE(topic_id, video_id)
    );
    """)

    # Partial index for session-independent targets
    cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_list_targets_null_session 
    ON list_targets(list_id) WHERE session_id IS NULL;
    """)

    # Core lists and syllabus topics are designed and managed by the user.
    # Do NOT auto-seed or auto-add subjects/topics here to prevent duplicates.
    # (ensure_core_curriculum_lists and ensure_seed_syllabus_topics disabled)

    conn.commit()
    conn.close()

def ensure_core_curriculum_lists(cursor):
    # Strict guard: NEVER auto-add subjects if lists already exist
    cursor.execute("SELECT count(*) as cnt FROM lists")
    if cursor.fetchone()["cnt"] > 0:
        return
    core_lists = [
        # Top-level programs
        ("list_cfa", "CFA Program", None, "All Chartered Financial Analyst levels and subjects", 0),
        ("list_frm", "FRM Program", None, "Financial Risk Manager Part 1 and Part 2 curricula", 0),

        # Courses
        ("list_cfa_l1", "CFA Level 1", "list_cfa", "Foundational investment tools and asset valuation", 1),
        ("list_cfa_l2", "CFA Level 2", "list_cfa", "Asset valuation and financial statement analysis deep dives", 1),
        ("list_cfa_l3", "CFA Level 3", "list_cfa", "Portfolio management and structured response exam prep", 1),
        ("list_frm_p1", "FRM Part 1", "list_frm", "Foundations of risk, quant, financial markets and valuation", 1),
        ("list_frm_p2", "FRM Part 2", "list_frm", "Market, credit, operational and liquidity risk management", 1),

        # CFA Level 1 Subjects
        ("list_cfa_l1_ethics", "Ethical & Professional Standards", "list_cfa_l1", "Code of ethics and Standards of Professional Conduct", 0),
        ("list_cfa_l1_quant", "Quantitative Methods", "list_cfa_l1", "Time value of money, hypothesis testing, and probability", 0),
        ("list_cfa_l1_economics", "Economics", "list_cfa_l1", "Micro, macro, and international economics", 0),
        ("list_cfa_l1_fsa", "Financial Statement Analysis", "list_cfa_l1", "Income statement, balance sheet, cash flows & ratios", 0),
        ("list_cfa_l1_corporate_issue", "Corporate Issuers", "list_cfa_l1", "Corporate governance, capital structure, and liquidity", 0),
        ("list_cfa_l1_equity", "Equity Investments", "list_cfa_l1", "Market structure, industry analysis, and DCF/multiples", 0),
        ("list_cfa_l1_fi", "Fixed Income", "list_cfa_l1", "Bond features, duration, convexity, and yield curve risks", 0),
        ("list_cfa_l1_deriv", "Derivatives", "list_cfa_l1", "Forwards, futures, options, and swap mechanics", 0),
        ("list_cfa_l1_alt_invest", "Alternative Investments", "list_cfa_l1", "Real estate, private equity, commodities, and hedge funds", 0),
        ("list_cfa_l1_portfolio_manag", "Portfolio Management", "list_cfa_l1", "Portfolio concept, IPS, and risk tolerance", 0),

        # CFA Level 2 Subjects
        ("list_cfa_l2_ethics", "Ethical & Professional Standards", "list_cfa_l2", "Applications of the Code and Standards", 0),
        ("list_cfa_l2_quantitative_me", "Quantitative Methods", "list_cfa_l2", "Multiple regression, time series, and machine learning", 0),
        ("list_cfa_l2_economics", "Economics", "list_cfa_l2", "Currency exchange rates and economic growth", 0),
        ("list_cfa_l2_financial_state", "Financial Statement Analysis", "list_cfa_l2", "Intercorporate investments, pensions, and multinational operations", 0),
        ("list_cfa_l2_corporate_issue", "Corporate Issuers", "list_cfa_l2", "Mergers & acquisitions, capital structure, and corporate restructurings", 0),
        ("list_cfa_l2_equity", "Equity Investments", "list_cfa_l2", "Equity valuation models, DDM, FCF, and multiples", 0),
        ("list_cfa_l2_fi", "Fixed Income", "list_cfa_l2", "Term structure, arbitrage-free valuation, and credit analysis", 0),
        ("list_cfa_l2_derivatives", "Derivatives", "list_cfa_l2", "Pricing and valuation of forwards, futures, and swaps", 0),
        ("list_cfa_l2_alt_invest", "Alternative Investments", "list_cfa_l2", "Private equity, real estate, and commodities valuation", 0),
        ("list_cfa_l2_portfolio_manag", "Portfolio Management", "list_cfa_l2", "Active portfolio management, factor models, and risk budgeting", 0),

        # CFA Level 3 Subjects
        ("list_cfa_l3_ethics", "Ethical & Professional Standards", "list_cfa_l3", "Global Investment Performance Standards (GIPS) and asset manager code", 0),
        ("list_cfa_l3_economics", "Economics", "list_cfa_l3", "Capital market expectations and macroeconomic forecasting", 0),
        ("list_cfa_l3_equity", "Equity Investments", "list_cfa_l3", "Equity portfolio construction, passive & active strategies", 0),
        ("list_cfa_l3_fi", "Fixed Income", "list_cfa_l3", "Fixed income portfolio construction, liability-driven and index strategies", 0),
        ("list_cfa_l3_deriv", "Derivatives", "list_cfa_l3", "Hedging and risk management with options, swaps, and futures", 0),
        ("list_cfa_l3_alt_invest", "Alternative Investments", "list_cfa_l3", "Hedge fund strategies and alternative asset allocation", 0),
        ("list_cfa_l3_portfolio_manag", "Portfolio Management & Wealth Planning", "list_cfa_l3", "Private wealth management, institutional IPS, and performance evaluation", 0),

        # FRM Part 1 Subjects
        ("list_frm_p1_risk", "Foundations of Risk", "list_frm_p1", "Risk management frameworks, MPT, and CAPM", 0),
        ("list_frm_p1_quant", "Quantitative Analysis", "list_frm_p1", "Probability, distributions, regression and GARCH volatility", 0),
        ("list_frm_p1_markets", "Financial Markets & Products", "list_frm_p1", "Futures, options, swaps, and hedging strategies", 0),
        ("list_frm_p1_val", "Valuation & Risk Models", "list_frm_p1", "Value at Risk (VaR), stress testing, and scenario analysis", 0),

        # FRM Part 2 Subjects
        ("list_frm_p2_market_risk", "Market Risk", "list_frm_p2", "VaR models, volatility forecasting, and extreme value theory", 0),
        ("list_frm_p2_credit_risk", "Credit Risk", "list_frm_p2", "Credit derivatives, counterparty credit risk, and default models", 0),
        ("list_frm_p2_operational_ris", "Operational Risk & Resiliency", "list_frm_p2", "Basel regulations, operational resilience, and model risk", 0),
        ("list_frm_p2_liquidity___tre", "Liquidity & Treasury Risk", "list_frm_p2", "Liquidity risk measurement, ALM, and repo funding", 0),
        ("list_frm_p2_risk_management", "Risk Management Principles", "list_frm_p2", "Portfolio risk, factor investing, and hedge fund due diligence", 0),
        ("list_frm_p2_current_issues", "Current Issues in Financial Markets", "list_frm_p2", "Recent market crises, climate risk, and fintech", 0),

        # Cross-cutting Lists
        ("list_marathons", "Revision Marathons & Cram Sessions", None, "Full syllabus fast recaps and formula sprints", 0),
        ("list_doubt_clearing", "Doubt Clearing & Live Q&A", None, "Live problem solving and student question resolution", 0),
        ("list_strategies", "Exam Strategy & Career Guides", None, "Roadmaps, pass strategies, and career guidance", 0),
    ]

    now_str = datetime.now().isoformat()
    for lid, name, parent_id, desc, is_course in core_lists:
        cursor.execute("""
            INSERT OR IGNORE INTO lists (id, name, parent_id, description, is_course, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (lid, name, parent_id, desc, is_course, now_str))


def ensure_seed_syllabus_topics(cursor):
    """
    Seeds initial realistic Topic-level lists under Subjects for Syllabus Matcher coverage grid.
    Topics have parent_id pointing to a Subject list and is_topic = 1.
    """
    cursor.execute("SELECT count(*) as cnt FROM lists WHERE is_topic = 1")
    row = cursor.fetchone()
    if row and row["cnt"] > 0:
        return

    now_str = datetime.now().isoformat()
    topics = [
        # CFA L1 Fixed Income
        ("list_top_fi_dur", "Duration & Convexity Deep Dive", "list_cfa_l1_fi"),
        ("list_top_fi_pricing", "Bond Pricing Basics & Yield to Maturity", "list_cfa_l1_fi"),
        ("list_top_fi_curves", "Yield Curve Term Structure & Spot Rates", "list_cfa_l1_fi"),
        ("list_top_fi_credit", "Credit Analysis & Corporate Spreads", "list_cfa_l1_fi"),
        ("list_top_fi_abs", "Asset-Backed Securities & Prepayment Risk", "list_cfa_l1_fi"),
        
        # CFA L1 Quantitative Methods
        ("list_top_quant_hyp", "Hypothesis Testing & p-Values", "list_cfa_l1_quant"),
        ("list_top_quant_dist", "Normal & Student's t Distributions", "list_cfa_l1_quant"),
        ("list_top_quant_tvm", "Time Value of Money & Cash Flow Additivity", "list_cfa_l1_quant"),
        
        # CFA L1 FSA
        ("list_top_fsa_statements", "Balance Sheet & Income Statement Financial Reporting", "list_cfa_l1_fsa"),
        ("list_top_fsa_cashflow", "Cash Flow Statement (Direct vs Indirect)", "list_cfa_l1_fsa"),
        ("list_top_fsa_ratios", "Financial Ratios & DuPont Analysis", "list_cfa_l1_fsa"),
        
        # CFA L1 Ethics
        ("list_top_ethics_standards", "Standards of Professional Conduct", "list_cfa_l1_ethics"),
        ("list_top_ethics_gips", "GIPS Standards Overview & Compliance", "list_cfa_l1_ethics"),

        # FRM Part 1 Foundations of Risk
        ("list_top_frm_var", "Value at Risk (VaR) & Expected Shortfall", "list_frm_p1_risk"),
        ("list_top_frm_mpt", "Modern Portfolio Theory & CAPM", "list_frm_p1_risk"),

        # FRM Part 1 Quant
        ("list_top_frm_quant_reg", "Linear Regression & Heteroskedasticity", "list_frm_p1_quant"),
        ("list_top_frm_quant_dist", "Binomial & Poisson Distributions", "list_frm_p1_quant"),
    ]

    for tid, tname, pid in topics:
        cursor.execute("""
            INSERT OR IGNORE INTO lists (id, name, parent_id, description, is_course, is_topic, created_at)
            VALUES (?, ?, ?, 'Syllabus curriculum topic', 0, 1, ?)
        """, (tid, tname, pid, now_str))

    # Seed Gray / Not-Applicable cells
    # e.g., Ethics topics do not have numeric Question Solving
    cursor.execute("""
        INSERT OR IGNORE INTO topic_format_config (topic_id, format, is_na)
        VALUES ('list_top_ethics_standards', 'Question Solving', 1)
    """)
    cursor.execute("""
        INSERT OR IGNORE INTO topic_format_config (topic_id, format, is_na)
        VALUES ('list_top_ethics_gips', 'Question Solving', 1)
    """)
    cursor.execute("""
        INSERT OR IGNORE INTO topic_format_config (topic_id, format, is_na)
        VALUES ('list_top_fi_abs', 'Question Solving', 1)
    """)

    # Seed some video mappings so initial coverage grid is immediately alive
    initial_mappings = [
        ("list_top_fi_dur", "cfa_l1_01"),
        ("list_top_fi_pricing", "cfa_l1_01"),
        ("list_top_fi_curves", "cfa_l1_01"),
        ("list_top_fi_dur", "cfa_l1_08"), # Question solving video!
        ("list_top_quant_hyp", "cfa_l1_02"),
        ("list_top_quant_dist", "cfa_l1_02"),
        ("list_top_fsa_statements", "cfa_l1_03"),
        ("list_top_ethics_standards", "cfa_l1_05"),
        ("list_top_ethics_gips", "cfa_l1_05"),
    ]
    for tid, vid in initial_mappings:
        cursor.execute("""
            INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
            VALUES (?, ?, 1, ?)
        """, (tid, vid, now_str))

    # Seed a planned video for yellow cell demonstration
    cursor.execute("""
        INSERT OR IGNORE INTO planned_videos (id, title, status, format, notes, created_at, updated_at)
        VALUES ('pv_fi_credit_rev', 'Credit Analysis & Corporate Spreads - Revision', 'Planned', 'Revision', 'Planned via Syllabus Matcher', ?, ?)
    """, (now_str, now_str))
    cursor.execute("""
        INSERT OR IGNORE INTO planned_video_lists (planned_video_id, list_id)
        VALUES ('pv_fi_credit_rev', 'list_top_fi_credit')
    """)
    cursor.execute("""
        INSERT OR IGNORE INTO planned_video_lists (planned_video_id, list_id)
        VALUES ('pv_fi_credit_rev', 'list_cfa_l1_fi')
    """)
    cursor.execute("""
        INSERT OR IGNORE INTO planned_video_lists (planned_video_id, list_id)
        VALUES ('pv_fi_credit_rev', 'list_cfa_l1')
    """)


if __name__ == "__main__":
    init_db()
    print("Database initialized at:", DB_PATH)
