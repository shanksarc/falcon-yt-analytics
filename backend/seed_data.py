import sqlite3
import random
import json
from datetime import datetime
from database import get_connection, init_db
from categorizer import categorize_video

def generate_seed_data():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    # Clear existing tables
    cursor.execute("DELETE FROM topic_format_config")
    cursor.execute("DELETE FROM topic_match_queue")
    cursor.execute("DELETE FROM match_review_queue")
    cursor.execute("DELETE FROM planned_video_lists")
    cursor.execute("DELETE FROM planned_videos")
    cursor.execute("DELETE FROM list_targets")
    cursor.execute("DELETE FROM sessions")
    cursor.execute("DELETE FROM list_videos")
    cursor.execute("DELETE FROM lists")
    cursor.execute("DELETE FROM monthly_metrics")
    cursor.execute("DELETE FROM change_log")
    cursor.execute("DELETE FROM competitor_videos")
    cursor.execute("DELETE FROM competitors")
    cursor.execute("DELETE FROM videos")

    print("Populating CFA/FRM Channel Dataset with Hierarchical Lists & YoY Data...")

    # Realistic CFA / FRM videos
    video_templates = [
        # CFA L1
        ("cfa_l1_01", "CFA Level 1 Fixed Income: Duration, Convexity & Yield Curves (Full 2025 Lecture)", 4800, "2024-04-12", 42500, 1850, 142, 620000, 5.8, 1420, 16750.0, 480),
        ("cfa_l1_02", "CFA Level 1 Quantitative Methods: Hypothesis Testing & Normal Distribution Made Easy", 3600, "2024-05-02", 36200, 1420, 95, 510000, 5.2, 1150, 11560.0, 390),
        ("cfa_l1_03", "CFA Level 1 FSA: Balance Sheet & Income Statement Financial Reporting Analysis", 5200, "2024-06-15", 28900, 980, 88, 590000, 3.4, 980, 7860.0, 280),
        ("cfa_l1_04", "CFA Level 1 Equity Investments: Industry Analysis & Gordon Growth Model", 3100, "2024-07-20", 31400, 1200, 76, 480000, 5.4, 920, 8020.0, 310),
        ("cfa_l1_05", "CFA Level 1 Ethics Masterclass: Standards of Professional Conduct & GIPS in 2 Hours", 7200, "2024-09-10", 64800, 2900, 260, 890000, 6.7, 2100, 37800.0, 850),
        ("cfa_l1_06", "CFA Level 1 Derivatives: Forward & Futures Pricing & Black Scholes Explained", 4100, "2024-10-05", 21500, 890, 64, 490000, 3.1, 1050, 6270.0, 190),
        ("cfa_l1_07", "CFA L1 100 Formula Marathon | Rapid Revision for Nov Exam", 9000, "2024-10-25", 82000, 4100, 480, 940000, 8.4, 2800, 63770.0, 1450),
        ("cfa_l1_08", "CFA L1 Fixed Income Doubt Clearing Live Q&A Session", 3600, "2024-11-02", 15400, 620, 110, 280000, 4.3, 1100, 4700.0, 130),

        # CFA L2
        ("cfa_l2_01", "CFA Level 2 Fixed Income: Arbitrage-Free Valuation & Binomial Trees Deep Dive", 5400, "2024-04-18", 22400, 1150, 98, 380000, 4.9, 1650, 10260.0, 260),
        ("cfa_l2_02", "CFA Level 2 FSA: Multinational Operations & Currency Translation (Current Rate vs Temporal)", 4600, "2024-05-22", 19800, 920, 82, 340000, 4.8, 1400, 7700.0, 210),
        ("cfa_l2_03", "CFA Level 2 Equity: Residual Income Model & FCFF / FCFE Valuation Complete Guide", 4900, "2024-06-28", 27600, 1340, 115, 420000, 5.5, 1520, 11650.0, 340),
        ("cfa_l2_04", "CFA Level 2 Quantitative Methods: Machine Learning & Time Series Regression", 4200, "2024-08-14", 16200, 710, 54, 390000, 3.0, 1120, 5040.0, 140),
        ("cfa_l2_05", "CFA Level 2 Full Revision Marathon | High Yield Topics for Nov Exam", 10800, "2024-10-20", 54000, 3100, 340, 680000, 7.6, 3200, 48000.0, 890),

        # CFA L3
        ("cfa_l3_01", "CFA Level 3 Portfolio Management: IPS Construction for Institutional & Private Wealth", 6200, "2024-03-15", 18900, 940, 92, 310000, 5.1, 1950, 10230.0, 220),
        ("cfa_l3_02", "CFA Level 3 Fixed Income: Liability-Driven Investing (LDI) & Immunization Strategies", 5100, "2024-05-10", 16500, 820, 74, 290000, 4.7, 1720, 7880.0, 180),
        ("cfa_l3_03", "CFA Level 3 Structured Response (Essay Exam) Past Paper Solving Session", 5800, "2024-07-30", 24300, 1600, 180, 330000, 6.4, 2150, 14510.0, 390),
        ("cfa_l3_04", "How to Clear CFA Level 3 in 2025: Essay vs Multiple Choice Strategy Guide", 2400, "2024-09-01", 31200, 1820, 145, 410000, 6.9, 890, 7710.0, 540),

        # FRM Part 1
        ("frm_p1_01", "FRM Part 1 Foundations of Risk Management: MPT, CAPM and Multifactor Models", 4500, "2024-03-20", 26500, 1200, 95, 450000, 5.0, 1380, 10150.0, 310),
        ("frm_p1_02", "FRM Part 1 Quantitative Analysis: GARCH Models & Volatility Estimation", 3900, "2024-04-25", 18200, 840, 62, 380000, 3.8, 1250, 6320.0, 180),
        ("frm_p1_03", "FRM Part 1 Financial Markets & Products: Interest Rate Futures & Swaps Pricing", 4800, "2024-06-08", 22100, 1050, 88, 410000, 4.6, 1490, 9150.0, 240),
        ("frm_p1_04", "FRM Part 1 Valuation & Risk Models: Value at Risk (VaR) Historical vs Parametric", 5100, "2024-08-05", 34800, 1850, 130, 520000, 5.9, 1680, 16240.0, 470),
        ("frm_p1_05", "FRM Part 1 Complete Revision Marathon | All 4 Books Formulas in 5 Hours", 9600, "2024-10-15", 48600, 2750, 310, 610000, 7.3, 2900, 39150.0, 920),

        # FRM Part 2
        ("frm_p2_01", "FRM Part 2 Market Risk: Extreme Value Theory (EVT) & Expected Shortfall", 5000, "2024-04-05", 17400, 890, 75, 320000, 4.8, 1620, 7830.0, 190),
        ("frm_p2_02", "FRM Part 2 Credit Risk: Credit Value Adjustment (CVA), DVA & Wrong-Way Risk", 5400, "2024-05-18", 19200, 990, 84, 350000, 4.9, 1750, 9330.0, 210),
        ("frm_p2_03", "FRM Part 2 Operational Risk & Resilience: Basel III Framework & Standardized Approach", 4200, "2024-07-12", 14300, 650, 48, 310000, 3.2, 1280, 5080.0, 120),
        ("frm_p2_04", "FRM Part 2 Liquidity Risk: Net Stable Funding Ratio (NSFR) & Liquidity Coverage Ratio", 4600, "2024-09-08", 15800, 780, 61, 300000, 4.5, 1540, 6760.0, 160),

        # General / Strategy
        ("gen_01", "CFA vs FRM in 2025: Career Scope, Salary, Difficulty & Exam Pass Rates Comparison", 2100, "2024-01-15", 145000, 7800, 620, 1650000, 8.2, 780, 31410.0, 2800),
        ("gen_02", "Study With Me: 4 Hours Deep Work for CFA Exam (Pomodoro with Alpha Waves)", 14400, "2024-02-01", 38000, 1400, 110, 580000, 4.8, 4200, 44330.0, 420),
        ("gen_03", "How I Passed CFA Level 1 on First Attempt while Working Full-Time", 1800, "2024-03-01", 92000, 5200, 410, 1120000, 7.5, 680, 17370.0, 1650),
    ]

    for item in video_templates:
        vid_id, title, dur, pub_date, views, likes, comments, impressions, ctr, avd, watch_hrs, subs = item
        cat = categorize_video(title)
        
        cursor.execute("""
            INSERT INTO videos (
                id, title, description, thumbnail_url, published_at,
                duration_seconds, course, topic, format, category_override,
                views, likes, comments, impressions, ctr, avg_view_duration,
                watch_time_hours, subscribers_gained, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            vid_id,
            title,
            f"Falcon EduFin curriculum video covering {cat['topic']} for {cat['course']}.",
            f"https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80",
            f"{pub_date}T10:00:00Z",
            dur,
            cat["course"],
            cat["topic"],
            cat["format"],
            0,
            views,
            likes,
            comments,
            impressions,
            ctr,
            avd,
            watch_hrs,
            subs,
            datetime.utcnow().isoformat()
        ))

    # Generate 2023 (previous year) and 2024 (current year) monthly metrics for YoY comparison
    # 2024 is roughly 25-35% higher than 2023 reflecting channel growth!
    months_2023 = [f"2023-{m:02d}" for m in range(1, 13)]
    months_2024 = [f"2024-{m:02d}" for m in range(1, 13)]
    cfa_exam_months = [2, 5, 8, 11]
    frm_exam_months = [5, 11]

    cursor.execute("SELECT id, course, format, views, watch_time_hours, impressions, ctr, avg_view_duration, subscribers_gained FROM videos")
    all_videos = cursor.fetchall()

    for v in all_videos:
        vid_id = v["id"]
        course = v["course"]
        fmt = v["format"]
        base_views = v["views"]
        base_watch = v["watch_time_hours"]
        base_impr = v["impressions"]
        base_ctr = v["ctr"]
        base_avd = v["avg_view_duration"]
        base_subs = v["subscribers_gained"]

        # Insert 2023 data (Previous Year Baseline, roughly 75% of 2024)
        for m_str in months_2023:
            m_num = int(m_str.split("-")[1])
            season_mult = 1.0
            if "CFA" in course and m_num in cfa_exam_months:
                season_mult = 1.8 if fmt == "Revision / Marathon" else 1.3
            elif "FRM" in course and m_num in frm_exam_months:
                season_mult = 1.9

            m_views = int((base_views / 12) * 0.76 * season_mult * random.uniform(0.85, 1.15))
            m_watch = round((base_watch / 12) * 0.76 * season_mult * random.uniform(0.85, 1.15), 1)
            m_impr = int((base_impr / 12) * 0.76 * season_mult * random.uniform(0.85, 1.15))
            m_ctr = round(base_ctr * 0.94 * random.uniform(0.95, 1.05), 2)
            m_avd = int(base_avd * random.uniform(0.9, 1.05))
            m_subs = int((base_subs / 12) * 0.72 * season_mult * random.uniform(0.8, 1.2))

            cursor.execute("""
                INSERT INTO monthly_metrics (
                    video_id, month, views, watch_time_hours, impressions, ctr, avg_view_duration, subscribers_gained
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (vid_id, m_str, m_views, m_watch, m_impr, m_ctr, m_avd, m_subs))

        # Insert 2024 data (Current Year)
        for m_str in months_2024:
            m_num = int(m_str.split("-")[1])
            season_mult = 1.0
            if "CFA" in course:
                if m_num in cfa_exam_months:
                    season_mult = 2.0 if fmt == "Revision / Marathon" else 1.35
                elif (m_num + 1) in cfa_exam_months:
                    season_mult = 2.2 if fmt in ["Revision / Marathon", "Doubt-clearing / Q&A"] else 1.5
                else:
                    season_mult = 0.8
            elif "FRM" in course:
                if m_num in frm_exam_months:
                    season_mult = 2.1
                elif (m_num + 1) in frm_exam_months:
                    season_mult = 2.2
                else:
                    season_mult = 0.75

            m_views = int((base_views / 12) * season_mult * random.uniform(0.85, 1.15))
            m_watch = round((base_watch / 12) * season_mult * random.uniform(0.85, 1.15), 1)
            m_impr = int((base_impr / 12) * season_mult * random.uniform(0.85, 1.15))
            m_ctr = round(base_ctr * random.uniform(0.95, 1.05), 2)
            m_avd = int(base_avd * random.uniform(0.95, 1.1))
            m_subs = int((base_subs / 12) * season_mult * random.uniform(0.85, 1.2))

            cursor.execute("""
                INSERT INTO monthly_metrics (
                    video_id, month, views, watch_time_hours, impressions, ctr, avg_view_duration, subscribers_gained
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (vid_id, m_str, m_views, m_watch, m_impr, m_ctr, m_avd, m_subs))

    # Populate Hierarchical Lists System
    print("Setting up Hierarchical Lists...")
    lists_data = [
        # Top Level Programs (Upward extension)
        ("list_cfa", "CFA Program", None, "All Chartered Financial Analyst levels and subjects", 0),
        ("list_frm", "FRM Program", None, "Financial Risk Manager Part 1 and Part 2 curricula", 0),

        # Course Level Lists (Section 02 Course Blocks)
        ("list_cfa_l1", "CFA Level 1", "list_cfa", "Foundational investment tools and asset valuation", 1),
        ("list_cfa_l2", "CFA Level 2", "list_cfa", "Asset valuation and financial statement analysis deep dives", 1),
        ("list_cfa_l3", "CFA Level 3", "list_cfa", "Portfolio management and structured response exam prep", 1),
        ("list_frm_p1", "FRM Part 1", "list_frm", "Foundations of risk, quant, financial markets and valuation", 1),
        ("list_frm_p2", "FRM Part 2", "list_frm", "Market, credit, operational and liquidity risk management", 1),

        # Subject Child Lists under CFA Level 1
        ("list_cfa_l1_fi", "Fixed Income", "list_cfa_l1", "Bond features, duration, convexity, and yield curve risks", 0),
        ("list_cfa_l1_quant", "Quantitative Methods", "list_cfa_l1", "Time value of money, hypothesis testing, and probability", 0),
        ("list_cfa_l1_fsa", "Financial Statement Analysis", "list_cfa_l1", "Income statement, balance sheet, cash flows & ratios", 0),
        ("list_cfa_l1_equity", "Equity Investments", "list_cfa_l1", "Market structure, industry analysis, and DCF/multiples", 0),
        ("list_cfa_l1_ethics", "Ethical & Professional Standards", "list_cfa_l1", "Code of ethics and Standards of Professional Conduct", 0),
        ("list_cfa_l1_deriv", "Derivatives", "list_cfa_l1", "Forwards, futures, options, and swap mechanics", 0),

        # Sub-topic under Fixed Income (Downward extension demonstration)
        ("list_cfa_l1_fi_dur", "Duration & Convexity Deep Dive", "list_cfa_l1_fi", "Macaulay, Modified duration and key rate immunization", 0),

        # Subject Child Lists under FRM Part 1
        ("list_frm_p1_risk", "Foundations of Risk", "list_frm_p1", "Risk management frameworks, MPT, and CAPM", 0),
        ("list_frm_p1_quant", "Quantitative Analysis", "list_frm_p1", "Probability, distributions, regression and GARCH volatility", 0),
        ("list_frm_p1_markets", "Financial Markets & Products", "list_frm_p1", "Futures, options, swaps, and hedging strategies", 0),
        ("list_frm_p1_val", "Valuation & Risk Models", "list_frm_p1", "Value at Risk (VaR), stress testing, and scenario analysis", 0),

        # Cross-cutting Lists (Multi-membership)
        ("list_marathons", "Revision Marathons & Cram Sessions", None, "Full syllabus fast recaps and formula sprints", 0),
        ("list_doubt_clearing", "Doubt Clearing & Live Q&A", None, "Live problem solving and student question resolution", 0),
        ("list_strategies", "Exam Strategy & Career Guides", None, "Roadmaps, pass strategies, and career guidance", 0),
    ]

    for lid, name, parent_id, desc, is_course in lists_data:
        cursor.execute("""
            INSERT INTO lists (id, name, parent_id, description, is_course, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (lid, name, parent_id, desc, is_course, datetime.utcnow().isoformat()))

    # Map Videos to Lists (Many-to-Many membership)
    # Each video sits in:
    # 1. Its course list (e.g. list_cfa_l1)
    # 2. Its specific subject list (e.g. list_cfa_l1_fi)
    # 3. If marathon, also in list_marathons!
    # 4. If doubt clearing, also in list_doubt_clearing!
    # 5. If strategy, in list_strategies!
    video_list_mappings = [
        # CFA L1 videos
        ("list_cfa_l1", "cfa_l1_01"),
        ("list_cfa_l1_fi", "cfa_l1_01"),
        ("list_cfa_l1_fi_dur", "cfa_l1_01"), # in sub-topic too!

        ("list_cfa_l1", "cfa_l1_02"),
        ("list_cfa_l1_quant", "cfa_l1_02"),

        ("list_cfa_l1", "cfa_l1_03"),
        ("list_cfa_l1_fsa", "cfa_l1_03"),

        ("list_cfa_l1", "cfa_l1_04"),
        ("list_cfa_l1_equity", "cfa_l1_04"),

        ("list_cfa_l1", "cfa_l1_05"),
        ("list_cfa_l1_ethics", "cfa_l1_05"),

        ("list_cfa_l1", "cfa_l1_06"),
        ("list_cfa_l1_deriv", "cfa_l1_06"),

        ("list_cfa_l1", "cfa_l1_07"),
        ("list_marathons", "cfa_l1_07"), # Multi-membership in Marathons!

        ("list_cfa_l1", "cfa_l1_08"),
        ("list_cfa_l1_fi", "cfa_l1_08"),
        ("list_doubt_clearing", "cfa_l1_08"), # Multi-membership in Doubt Clearing!

        # CFA L2 videos
        ("list_cfa_l2", "cfa_l2_01"),
        ("list_cfa_l2", "cfa_l2_02"),
        ("list_cfa_l2", "cfa_l2_03"),
        ("list_cfa_l2", "cfa_l2_04"),
        ("list_cfa_l2", "cfa_l2_05"),
        ("list_marathons", "cfa_l2_05"), # Multi-membership

        # CFA L3 videos
        ("list_cfa_l3", "cfa_l3_01"),
        ("list_cfa_l3", "cfa_l3_02"),
        ("list_cfa_l3", "cfa_l3_03"),
        ("list_cfa_l3", "cfa_l3_04"),
        ("list_strategies", "cfa_l3_04"), # Multi-membership

        # FRM Part 1 videos
        ("list_frm_p1", "frm_p1_01"),
        ("list_frm_p1_risk", "frm_p1_01"),

        ("list_frm_p1", "frm_p1_02"),
        ("list_frm_p1_quant", "frm_p1_02"),

        ("list_frm_p1", "frm_p1_03"),
        ("list_frm_p1_markets", "frm_p1_03"),

        ("list_frm_p1", "frm_p1_04"),
        ("list_frm_p1_val", "frm_p1_04"),

        ("list_frm_p1", "frm_p1_05"),
        ("list_marathons", "frm_p1_05"), # Multi-membership

        # FRM Part 2 videos
        ("list_frm_p2", "frm_p2_01"),
        ("list_frm_p2", "frm_p2_02"),
        ("list_frm_p2", "frm_p2_03"),
        ("list_frm_p2", "frm_p2_04"),

        # General / Strategy videos
        ("list_strategies", "gen_01"),
        ("list_strategies", "gen_03"),
    ]

    for lid, vid in video_list_mappings:
        cursor.execute("""
            INSERT OR IGNORE INTO list_videos (list_id, video_id, auto_assigned, created_at)
            VALUES (?, ?, 1, ?)
        """, (lid, vid, datetime.utcnow().isoformat()))

    # Pinned dashboard list blocks for Section 03
    pinned_lists = ["list_cfa_l1", "list_frm_p1", "list_marathons", "list_cfa_l1_fi"]
    cursor.execute("""
        INSERT INTO settings (key, value) VALUES ('pinned_dashboard_lists', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (json.dumps(pinned_lists),))

    # Populate Change Log entries with Before/After 14d impact
    change_records = [
        {
            "video_id": "cfa_l1_03",
            "change_date": "2024-08-10",
            "change_type": "Thumbnail Only",
            "old_title": "CFA Level 1 FSA: Balance Sheet & Income Statement Financial Reporting Analysis",
            "new_title": "CFA Level 1 FSA: Balance Sheet & Income Statement Financial Reporting Analysis",
            "old_thumbnail": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80",
            "new_thumbnail": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80",
            "notes": "Redesigned thumbnail with high-contrast CFA L1 Gold badge and 3-step cheat sheet preview.",
            "ctr_before_14d": 3.4,
            "ctr_after_14d": 5.8,
            "channel_ctr_before_14d": 5.4,
            "channel_ctr_after_14d": 5.6,
            "views_before_14d": 980,
            "views_after_14d": 2150
        },
        {
            "video_id": "cfa_l1_06",
            "change_date": "2024-09-05",
            "change_type": "Both",
            "old_title": "Derivatives Concept Lecture - Part 1",
            "new_title": "CFA Level 1 Derivatives: Forward & Futures Pricing & Black Scholes Explained",
            "old_thumbnail": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&q=80",
            "new_thumbnail": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80",
            "notes": "Added exact CFA Level 1 naming + explicit Black Scholes callout to attract search intent.",
            "ctr_before_14d": 3.1,
            "ctr_after_14d": 6.2,
            "channel_ctr_before_14d": 5.5,
            "channel_ctr_after_14d": 5.7,
            "views_before_14d": 720,
            "views_after_14d": 1890
        },
        {
            "video_id": "cfa_l2_04",
            "change_date": "2024-09-18",
            "change_type": "Title Only",
            "old_title": "Machine Learning & Big Data Analysis for Finance",
            "new_title": "CFA Level 2 Quantitative Methods: Machine Learning & Time Series Regression",
            "old_thumbnail": "",
            "new_thumbnail": "",
            "notes": "Indexed against CFA Level 2 syllabus readings to capture targeted exam search queries.",
            "ctr_before_14d": 3.0,
            "ctr_after_14d": 4.5,
            "channel_ctr_before_14d": 5.6,
            "channel_ctr_after_14d": 5.5,
            "views_before_14d": 510,
            "views_after_14d": 1050
        },
        {
            "video_id": "frm_p1_02",
            "change_date": "2024-07-15",
            "change_type": "Thumbnail Only",
            "old_title": "FRM Part 1 Quantitative Analysis: GARCH Models & Volatility Estimation",
            "new_title": "FRM Part 1 Quantitative Analysis: GARCH Models & Volatility Estimation",
            "old_thumbnail": "",
            "new_thumbnail": "",
            "notes": "Replaced generic stock photo with handwritten GARCH formula snippet thumbnail.",
            "ctr_before_14d": 3.8,
            "ctr_after_14d": 4.6,
            "channel_ctr_before_14d": 5.1,
            "channel_ctr_after_14d": 5.3,
            "views_before_14d": 640,
            "views_after_14d": 920
        }
    ]

    for cr in change_records:
        video_delta = cr["ctr_after_14d"] - cr["ctr_before_14d"]
        channel_delta = cr["channel_ctr_after_14d"] - cr["channel_ctr_before_14d"]
        impact = round(video_delta - channel_delta, 2)

        cursor.execute("""
            INSERT INTO change_log (
                video_id, change_date, change_type, old_title, new_title,
                old_thumbnail, new_thumbnail, notes, ctr_before_14d, ctr_after_14d,
                channel_ctr_before_14d, channel_ctr_after_14d, impact_score,
                views_before_14d, views_after_14d, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cr["video_id"],
            cr["change_date"],
            cr["change_type"],
            cr["old_title"],
            cr["new_title"],
            cr["old_thumbnail"],
            cr["new_thumbnail"],
            cr["notes"],
            cr["ctr_before_14d"],
            cr["ctr_after_14d"],
            cr["channel_ctr_before_14d"],
            cr["channel_ctr_after_14d"],
            impact,
            cr["views_before_14d"],
            cr["views_after_14d"],
            datetime.utcnow().isoformat()
        ))

    # Populate Competitors & Public Video stats
    competitors = [
        ("comp_01", "Mark Meldrum CFA", "@MarkMeldrum", 225000, 840, 28500000, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80"),
        ("comp_02", "AnalystPrep (CFA & FRM)", "@AnalystPrep", 148000, 620, 16200000, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"),
        ("comp_03", "Fintree Education", "@FintreeIndia", 112000, 510, 12800000, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80"),
    ]

    for cid, name, handle, subs, vids, tot_views, avatar in competitors:
        cursor.execute("""
            INSERT INTO competitors (id, name, channel_handle, subscriber_count, video_count, total_views, avatar_url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (cid, name, handle, subs, vids, tot_views, avatar, datetime.utcnow().isoformat()))

    comp_videos = [
        ("cv_01", "comp_01", "CFA Level 1 2025: Fixed Income Duration & Convexity Complete Review", "2024-05-10", 86000, 3200, 240, "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&q=80", 2.5),
        ("cv_02", "comp_01", "Why Most Candidates Fail CFA Level 2 (And How to Pass in 2025)", "2024-07-01", 145000, 6800, 510, "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&q=80", 4.2),
        ("cv_03", "comp_01", "CFA Level 3 Asset Allocation & Currency Management Walkthrough", "2024-03-12", 42000, 1800, 115, "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=300&q=80", 1.2),
        ("cv_04", "comp_01", "CFA Exam Strategy: Last 30 Days Action Plan for Nov Candidates", "2024-10-10", 72000, 3400, 290, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80", 2.1),

        ("cv_05", "comp_02", "FRM Part 1 Market Risk: Value at Risk (VaR) in 15 Minutes", "2024-06-15", 58000, 2200, 180, "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=300&q=80", 2.2),
        ("cv_06", "comp_02", "FRM Part 1 Full Marathon 2024: 100 Most Tested Concepts", "2024-09-20", 94000, 4100, 380, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80", 3.6),
        ("cv_07", "comp_02", "CFA Level 1 Financial Statement Analysis: Inventory Methods (FIFO vs LIFO)", "2024-04-02", 34000, 1100, 92, "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=300&q=80", 1.3),
        ("cv_08", "comp_02", "FRM Part 2 Credit Risk: Merton Model Explained Step-by-Step", "2024-08-11", 28000, 950, 78, "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&q=80", 1.1),

        ("cv_09", "comp_03", "CFA Level 1 Quant Juice: Time Value of Money & Annuities Fast Tricks", "2024-02-18", 112000, 5600, 480, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80", 4.5),
        ("cv_10", "comp_03", "CFA Level 1 Derivatives: Options Payoff Diagrams Made Crystal Clear", "2024-05-30", 49000, 2100, 160, "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&q=80", 1.9),
        ("cv_11", "comp_03", "How to Pass CFA Level 1 with 90th Percentile - Utkarsh Jain", "2024-07-22", 78000, 3900, 320, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80", 3.1),
    ]

    for vid, cid, title, pub_date, views, likes, comments, thumb, outlier_mult in comp_videos:
        cat = categorize_video(title)
        pub_dt = datetime.strptime(pub_date, "%Y-%m-%d")
        days = max(1, (datetime(2024, 12, 31) - pub_dt).days)
        velocity = round(views / days, 1)

        cursor.execute("""
            INSERT INTO competitor_videos (
                id, channel_id, title, published_at, views, likes, comments,
                thumbnail_url, course, topic, format, velocity, outlier_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            vid, cid, title, f"{pub_date}T00:00:00Z", views, likes, comments,
            thumb, cat["course"], cat["topic"], cat["format"], velocity, outlier_mult
        ))

    # -------------------------------------------------------------
    # Upload Planner Seed Data (Sessions, Targets, Planned Entries)
    # -------------------------------------------------------------
    sessions_seed = [
        ("session_cfa_nov_2026", "CFA Nov 2026 Exam Window", "2026-07-01", "2026-11-25", 1),
        ("session_frm_nov_2026", "FRM Nov 2026 Exam Window", "2026-07-01", "2026-11-20", 1),
        ("session_cfa_feb_2027", "CFA Feb 2027 Exam Window", "2026-10-01", "2027-02-28", 1),
        ("session_cfa_may_2027", "CFA May 2027 Exam Window", "2026-11-01", "2027-05-31", 1),
    ]

    for sid, sname, sstart, send, sactive in sessions_seed:
        cursor.execute("""
            INSERT INTO sessions (id, name, start_date, end_date, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (sid, sname, sstart, send, sactive, datetime.utcnow().isoformat()))

    # List Targets (Manual goals per list in sessions)
    targets_seed = [
        # CFA Nov 2026
        ("session_cfa_nov_2026", "list_cfa_l1", 18),
        ("session_cfa_nov_2026", "list_cfa_l1_fi", 5),
        ("session_cfa_nov_2026", "list_cfa_l1_quant", 1),
        ("session_cfa_nov_2026", "list_marathons", 3),
        ("session_cfa_nov_2026", "list_cfa_l1_ethics", 3),
        ("session_cfa_nov_2026", "list_cfa_l2", 10),
        ("session_cfa_nov_2026", "list_cfa_l1_equity", 2),

        # FRM Nov 2026
        ("session_frm_nov_2026", "list_frm_p1", 12),
        ("session_frm_nov_2026", "list_frm_p1_val", 4),
        ("session_frm_nov_2026", "list_frm_p2", 8),

        # CFA Feb 2027
        ("session_cfa_feb_2027", "list_cfa_l1", 15),
        ("session_cfa_feb_2027", "list_cfa_l1_fsa", 4),
        ("session_cfa_feb_2027", "list_cfa_l1_fi", 4),
    ]

    for sess_id, list_id, target_cnt in targets_seed:
        cursor.execute("""
            INSERT INTO list_targets (session_id, list_id, target_count, created_at)
            VALUES (?, ?, ?, ?)
        """, (sess_id, list_id, target_cnt, datetime.utcnow().isoformat()))

    # Planned Video Entries
    planned_videos_seed = [
        # In Session CFA Nov 2026
        ("pv_01", "CFA L1 Fixed Income: Duration, Convexity & Yield Curves Full Lecture", "session_cfa_nov_2026", "Uploaded", "cfa_l1_01", ["list_cfa_l1", "list_cfa_l1_fi"]),
        ("pv_02", "CFA L1 Quantitative Methods: Hypothesis Testing & Normal Distribution Made Easy", "session_cfa_nov_2026", "Uploaded", "cfa_l1_02", ["list_cfa_l1", "list_cfa_l1_quant"]),
        ("pv_03", "CFA L1 100 Formula Marathon Rapid Revision for Nov Exam", "session_cfa_nov_2026", "Uploaded", "cfa_l1_07", ["list_cfa_l1", "list_marathons"]),
        ("pv_04", "CFA L1 Fixed Income Doubt Clearing Live Q&A Session", "session_cfa_nov_2026", "Uploaded", "cfa_l1_08", ["list_cfa_l1", "list_cfa_l1_fi", "list_doubt_clearing"]),
        ("pv_05", "CFA Level 1 Fixed Income: Bond Pricing, Spot Rates and Forward Rates", "session_cfa_nov_2026", "In Progress", None, ["list_cfa_l1", "list_cfa_l1_fi"]),
        ("pv_06", "CFA Level 1 Ethics: 30 Case Studies You Must Know Before Exam", "session_cfa_nov_2026", "In Progress", None, ["list_cfa_l1", "list_cfa_l1_ethics"]),
        ("pv_07", "CFA Level 1 Quant: Central Limit Theorem & Standard Error in 20 Mins", "session_cfa_nov_2026", "Planned", None, ["list_cfa_l1", "list_cfa_l1_quant"]),
        ("pv_08", "CFA Level 2 Full Revision Marathon High Yield Topics for Nov Exam", "session_cfa_nov_2026", "Uploaded", "cfa_l2_05", ["list_cfa_l2", "list_marathons"]),
        ("pv_09", "CFA Level 2 Equity: DDM vs Free Cash Flow Valuation Comparison", "session_cfa_nov_2026", "In Progress", None, ["list_cfa_l2", "list_cfa_l1_equity"]),

        # In Session FRM Nov 2026
        ("pv_10", "FRM Part 1 Complete Revision Marathon All 4 Books in 5 Hours", "session_frm_nov_2026", "Uploaded", "frm_p1_05", ["list_frm_p1", "list_marathons"]),
        ("pv_11", "FRM Part 1 Valuation: Binomial Option Pricing & Black Scholes Model", "session_frm_nov_2026", "In Progress", None, ["list_frm_p1", "list_frm_p1_val"]),
        ("pv_12", "FRM Part 2 Market Risk: Value at Risk vs Expected Shortfall", "session_frm_nov_2026", "Planned", None, ["list_frm_p2"]),

        # In Session CFA Feb 2027
        ("pv_13", "CFA Level 1 FSA: Leases & Pension Accounting Explained Simply", "session_cfa_feb_2027", "Planned", None, ["list_cfa_l1", "list_cfa_l1_fsa"]),
        ("pv_14", "CFA Level 1 Fixed Income: Credit Analysis Models & Spread Measures", "session_cfa_feb_2027", "Planned", None, ["list_cfa_l1", "list_cfa_l1_fi"]),

        # Evergreen / Someday (No Session)
        ("pv_15", "How to Use Texas Instruments BA II Plus Calculator Like a Pro (All Shortcuts)", None, "Planned", None, ["list_cfa_l1", "list_frm_p1"]),
        ("pv_16", "CFA vs FRM: Which Finance Charter Should You Choose in 2025?", None, "Planned", None, []),
    ]

    for pvid, pvtitle, pvsess, pvstatus, pvlink, pvlists in planned_videos_seed:
        cursor.execute("""
            INSERT INTO planned_videos (id, title, session_id, status, linked_video_id, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (pvid, pvtitle, pvsess, pvstatus, pvlink, "", datetime.utcnow().isoformat(), datetime.utcnow().isoformat()))

        for lid in pvlists:
            cursor.execute("""
                INSERT OR IGNORE INTO planned_video_lists (planned_video_id, list_id)
                VALUES (?, ?)
            """, (pvid, lid))

    # Match Review Queue demo entries (Uncertain match needing user review)
    review_queue_seed = [
        ("pv_05", "cfa_l1_01", 0.68),
        ("pv_06", "cfa_l1_05", 0.55),
    ]

    for q_pvid, q_vid, q_conf in review_queue_seed:
        cursor.execute("""
            INSERT OR IGNORE INTO match_review_queue (planned_video_id, video_id, confidence, status, created_at)
            VALUES (?, ?, ?, 'PENDING', ?)
        """, (q_pvid, q_vid, q_conf, datetime.utcnow().isoformat()))

    # Ensure syllabus topics & initial configurations
    from database import ensure_seed_syllabus_topics
    ensure_seed_syllabus_topics(cursor)

    conn.commit()
    conn.close()
    print("Seed data with Hierarchical Lists, YoY Metrics & Upload Planner successfully populated!")

if __name__ == "__main__":
    generate_seed_data()

