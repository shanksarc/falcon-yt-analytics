# CFA/FRM YouTube Channel Analytics App — Project Spec

## 1. Purpose

Build a tool that analyzes a CFA/FRM education YouTube channel to:
- Show which courses, topics, and video formats perform best, broken down by month
- Identify underperforming videos (low CTR) that need title/thumbnail fixes
- Track changes made to videos and measure whether those changes actually helped
- Benchmark against competitor channels to spot topics/formats that work well in the niche

The core problem being solved: YouTube Studio only supports per-video inspection. This app should provide a **cross-video, sortable leaderboard** so patterns are visible at a glance instead of requiring manual digging through Studio.

---

## 2. Data Sources

| Source | Auth needed | Provides |
|---|---|---|
| YouTube Data API v3 | API key (or OAuth) | Title, description, tags, thumbnail, publish date, duration, views, likes, comments — for **any** public channel (own or competitors) |
| YouTube Analytics API | OAuth (channel owner only) | CTR, average view duration, retention, traffic sources, subscriber gain — **own channel only** |

Competitor data is limited to public metrics (views, likes, comments) — no CTR or retention, since those are private to the channel owner.

---

## 3. Video Categorization Layer

YouTube has no concept of "course" or "video type" — this must be built manually or semi-automatically.

**Categories to tag per video:**
- **Course**: CFA L1 / CFA L2 / CFA L3 / FRM Part 1 / FRM Part 2
- **Topic**: e.g. Fixed Income, Quant, Ethics, Derivatives, Risk Management
- **Format**: Lecture / Discussion / Doubt-clearing / Revision / General

**Tagging approach:**
- If titles follow a consistent pattern, auto-parse course/topic/format from the title string
- Otherwise, use an LLM classifier on title + description to assign tags
- New uploads get tagged once at upload time (fast, ongoing) rather than re-processed later

---

## 4. Feature 1 — Monthly Performance Leaderboard

**Goal:** See which course/topic/format performed best in each month, historically, to guide upload planning.

- Pull channel history using the YouTube Analytics API with a `month` dimension (supports full historical range)
- Join with the categorization tags
- Build a pivot: **rows = month, columns = course/topic/format, values = views / watch time / CTR**
- Sortable/filterable view — no manual per-video digging required

**Domain-specific insight to check:** CFA exam windows are roughly Feb/May/Aug/Nov; FRM is May/Nov. Expect topic-level spikes 1–3 months before relevant exam windows — this pattern, if confirmed in the data, should directly drive upload scheduling (revision/discussion content pre-exam, foundational/lecture content off-season).

---

## 5. Feature 2 — Low-CTR Detection ("Needs Improvement" Flag)

**Goal:** Automatically surface videos whose thumbnail/title are likely underperforming.

- CTR is only meaningful **relative to its own category** — compare each video's CTR against the average CTR for its course/topic/format bucket, not a fixed global threshold
- Flag videos meaningfully below their category baseline as candidates for a title/thumbnail refresh

---

## 6. Feature 3 — Change Log & Before/After Impact Analysis

**Goal:** After editing a flagged video's title/thumbnail on YouTube, log the change in-app and later see whether it actually helped.

**Change log fields per entry:**
- Video ID
- Date of change
- What changed (title only / thumbnail only / both)
- Old vs. new title/thumbnail (optional, for reference)

**Impact measurement — must control for confounders:**
- Compare a **fixed window before vs. after** the change (e.g., 14 days), not lifetime totals — older videos naturally get fewer daily views regardless of edits
- Subtract the **channel-wide metric shift** over the same two windows, to separate "this video specifically improved" from "the whole channel moved that month" (e.g., due to an exam-season spike)

**Suggested metric:**
```
Impact = (CTR_after_14d − CTR_before_14d) − (ChannelCTR_after_14d − ChannelCTR_before_14d)
```

**Second-order value:** once enough change events are logged, look for patterns across *types* of changes (e.g., "adding exam level to title improves CTR more than thumbnail-only changes") — this informs future uploads, not just the single edited video.

---

## 7. Feature 4 — Competitor Channel Benchmarking

**Goal:** Track competitor CFA/FRM channels to see what's working in the niche and spot topic/format ideas.

- Uses YouTube Data API only (public data — no OAuth needed for competitor channels)
- Available: views, likes, comments, titles, thumbnails, publish dates
- Not available: competitor CTR, retention, traffic sources (private to them)

**Normalization needed to make comparisons meaningful:**
- **Views ÷ days since published** (velocity), not raw view count — a 2-week-old video with 5K views may be outperforming a 2-year-old video with 50K
- **Compare each video against that channel's own average**, not raw numbers across channels of different sizes — this surfaces genuine outliers, not just "which channel is biggest"
- **Track multiple competitors**, not one — a topic that's a hit across 3–4 channels is a much stronger signal than one lucky video
- **Watch title/thumbnail framing**, not just topics — phrasing patterns (e.g., "in 10 minutes," exam-part callouts) are often as important as the topic itself

**Caveat:** CFA/FRM exam-prep content is a fairly narrow, saturated niche — competitor topics will likely overlap heavily with existing coverage. The larger signal is usually in *format and title framing*, not undiscovered topics.

---

## 8. Suggested Build Order

1. One-time historical pull: own channel data (Analytics API, monthly dimension) + categorization tagging
2. Build the monthly leaderboard (sortable pivot view)
3. Add category-baseline CTR flagging
4. Add the change log + before/after impact calculation
5. Add competitor tracking as a parallel, separate data table/view
6. (Optional, later) Automate the data pull on a schedule; keep sorting/analysis manual or semi-automated

---

## 9. Open Considerations

- OAuth setup is required only for **own-channel** analytics (CTR, retention) — competitor tracking doesn't need it
- Categorization quality drives everything downstream — worth getting this right early, even if manual at first
- Views/CTR suggestions should be treated as **hypotheses to test**, not guarantees — no tool can predict YouTube's algorithm with certainty