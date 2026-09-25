# Development Map: Upload Planner (v2)

## Overview

The planner has three connected parts, built in this order since each depends on the previous:

1. **Entry layer** — two ways to add planned videos: individual form, or bulk paste
2. **Weekly Schedule** — drag-and-drop allocation of planned videos into specific weeks
3. **Progress section** — dials, charts, and bars showing status across the whole plan

The Target/Planned/Uploaded summary cards from the original spec still apply — they just now pull their "Planned" counts from whatever gets created in the entry layer below.

---

## Phase 1: Entry Layer

Every planned video needs the same four fields, regardless of which entry method created it: **Course, Subject, Video name, Exam session (or "Not Applicable")**.

### 1a. Individual Entry Form
- Course: dropdown, populated from existing List hierarchy (top-level Lists)
- Subject: dependent dropdown, populated from the selected Course's child Lists
- Video name: free text
- Exam session: dropdown of existing open Sessions, plus a "Not Applicable" option
- On submit → creates one Planned Video Entry, status `Planned`

### 1b. Bulk Paste Import
A text box where the user pastes multiple videos at once and the app parses them into the same four fields per row.

**Recommended input format** (grouped shorthand, since typing the course name once per block is much faster than repeating it per line):

```
Course: CFA Level 1

Fixed Income:
- Bond Pricing Basics | May 2027
- Yield to Maturity Explained | N/A

Ethics:
- GIPS Standards Overview | May 2027

Course: FRM Part 1
Quant:
- Hypothesis Testing Basics | Nov 2026
```

- `Course:` line sets the active course for all following lines until the next `Course:` line
- A subject line ending in `:` sets the active subject for following dash-entries
- Each `- Video name | Session` line becomes one row, using the currently active course + subject
- `| N/A` (or omitted) means no target session
- Also support a flat fallback format (`Course, Subject, Video name, Session` per line) for users who prefer not to use the grouped shorthand — the parser should detect which format is being used automatically

**Before committing, show a preview/staging table** of all parsed rows:
- Each row displays the matched Course/Subject/Session, or a flag icon if something couldn't be confidently matched
- User can correct any row inline before hitting final "Add all" — nothing gets created silently without review

### 1c. Validation / Error-Checking (shared by both entry methods)
- Course and Subject text is **fuzzy-matched** against existing List names (handles typos, casing, minor wording differences)
- **Confident match** → auto-link to that List, no user action needed
- **No confident match** → flag the row and prompt: link to an existing similar List, or confirm creating a new one (prevents silently spawning duplicate/near-duplicate Lists from typos)
- Session names are matched the same way against existing open Sessions; unrecognized session text falls back to "Not Applicable" with a flag so the user notices and can fix it
- This validation logic should be one shared function used by both the individual form and the bulk import, not duplicated — keeps matching behavior consistent everywhere

---

## Phase 2: Summary Cards (already specced — just wire up the data source)

The Target / Planned / Uploaded cards and pacing indicators from the original Upload Planner spec and the status-color system remain as designed. Once Phase 1 exists, "Planned" counts on those cards are simply a count of Planned Video Entries per List/Session — no new design work needed here.

---

## Phase 3: Weekly Schedule (revised)

### Problem with the original design
A single week-by-week board spanning the entire session (often several months) doesn't give enough room to actually allocate videos — it either cramps everything into two visible weeks or forces excessive horizontal scrolling. It also has no coarse, "figure out roughly when" option — every video has to be pinned to an exact week immediately, which is more precision than the user has at planning time for anything beyond the very near term.

### Revised design: two tiers — coarse (12-month) and fine (rolling 4-week)

**Tier 1 — 12-Month Allocation Grid**
- Shows 12 month boxes (real calendar months, rolling forward from today), sitting alongside the unscheduled backlog panel.
- This is the **default, coarse allocation step** — drag a Planned Video Entry from the backlog straight onto a month box when you only know roughly when it should go out, without needing to commit to a specific week yet.
- A video with no month assigned stays in the backlog as **pending** — this is expected and fine, not an error state.
- Each month box shows a lightweight count (e.g. "6 planned") rather than full entry details — this stays a coarse allocation surface, not a detailed one.

**Tier 2 — Rolling 4-Week View**
- Sits next to the same backlog panel, showing only the **next 4 real calendar weeks from today** (not the whole session) — this is the fine-grained, near-term allocation surface.
- This view **rolls forward with real time**: as a week passes, it drops off the left and a new week appears on the right, so it's always "the next 4 weeks," not a fixed range tied to session start.
- Drag entries here directly from the backlog, or **promote** an entry that was already coarsely placed on a month box down into a specific week once it's close enough to plan precisely.

**Clicking a month box** (from Tier 1) opens a focused window/modal scoped to that month, containing:
- The videos currently allocated to that month
- That month's weeks, laid out for drag-and-drop, so the user can go from "sometime in March" to "week of March 10th" without leaving the month's context
- Anything not dragged into a specific week within that window simply **stays allocated at the month level** — still pending, not lost, not an error

### Card density — minimize wasted space
Full video detail (title, course, subject, session, status) is unnecessary in the schedule views — this is what was consuming space in the original design.
- **Backlog, month boxes, and week columns** should show a **minimized, truncated title only** (e.g. first several words + ellipsis) plus a small status-color dot/icon — nothing else by default.
- Full details (full title, course, subject, target session) appear only **on hover or click**, not inline in the card at rest.
- This keeps many more cards visible per screen without scrolling, which matters most in the 4-week view and inside the month drill-down modal, where density is the main usability constraint.

### Shared behavior (applies to both tiers)
- **Overdue / rolled over**: entries scheduled for a past week (in Tier 2) that are still not uploaded should visually carry forward into the current week in the "critical" status color, so nothing silently falls through.
- **Drag and drop**: dragging a card (backlog → month, backlog → week, month → week, or between weeks) simply updates that entry's assigned month/week field(s).
- **Completion sync**: when an entry's status changes to `Uploaded` (via auto-match or manual confirmation), it's marked complete in whichever view it was scheduled in, and the change propagates up to the Phase 2 summary cards and pacing calculations in real time.

---

## Phase 4: Progress Section

Use different visualization types for different questions — avoid repeating the same bar chart for everything.

| Visualization | Shows | Why this type |
|---|---|---|
| **Radial dial/gauge** | Overall % complete toward a Session's target | Best for a single "how far along am I" glance — put this at the very top of the Progress section |
| **Burnup chart** (line: ideal pace vs actual cumulative uploads, over the session timeline) | Whether you're ahead, on pace, or behind — visually, not just as a number | The single most useful chart for planning decisions — shows trend, not just a snapshot |
| **Weekly velocity bar chart** | Videos uploaded per week, historically | Shows consistency/rhythm — spot slow weeks at a glance |
| **Status distribution donut** | Count breakdown: Planned / Scheduled / Uploaded / Overdue across the whole plan | Quick sense of where the bulk of unfinished work sits |
| **Grouped bar: courses/subjects side-by-side** | Compare completion % across multiple Lists at once | Useful for deciding what to prioritize next, complements the individual List cards |

Apply the same status-color system (green/amber/red/gray) from the earlier design doc to all of these — e.g. the burnup chart's actual-progress line should shift color if it drops behind the ideal-pace line, the dial's fill color should reflect on-track/at-risk/critical the same way the summary cards already do.

---

## Build Order Summary

1. Entry layer (form + bulk parser + shared validation) — nothing else works without planned entries existing
2. Wire summary cards to read from entries created above
3. Weekly Schedule (depends on entries existing, and benefits from summary cards already being live for context)
4. Progress section (depends on scheduling data for the burnup/velocity charts; dial and donut can be built as soon as entries + statuses exist)