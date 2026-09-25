# Feature Spec: Performance Overview Tab

## Overview

The Performance Overview tab is the main dashboard. It has four sections, plus a core data model (the "List" system) that everything else in this tab depends on. Build the List system first — Sections 02, 03, and drill-down views all reference it.

---

## Core Data Model: Lists (build this before the sections below)

Lists replace rigid fixed categories (course/subject/topic) with a flexible, user-editable grouping system.

**Requirements:**
- A **List** is a named group of videos (e.g. "CFA Level 1", "Fixed Income", "FRM Part 2 – Risk Management").
- Users can **create new Lists** at any time.
- When the app fetches new videos from the channel, it **auto-assigns each video to the best-matching existing List** based on title/description parsing.
- Auto-assignment must be **fully overridable** — users can move a video to a different List, remove it from a List, or add it to more.
- **A single video can belong to multiple Lists simultaneously** (e.g. a video can sit inside "CFA Level 1" and "Fixed Income" and "Discussion Videos" at the same time).
- **Lists support parent-child hierarchy.**
  - Example: `CFA Level 1` (parent) → `Fixed Income`, `Quant`, `Ethics` (children)
  - Hierarchy must be **extendable upward** (e.g. a new top-level parent like `CFA` above `CFA Level 1`, `CFA Level 2`, `CFA Level 3`) and **extendable downward** (e.g. sub-lists under `Fixed Income` like `Bond Pricing`, `Duration & Convexity`).
  - No fixed depth limit — the hierarchy should support any number of levels in either direction.
- A List's performance stats should reflect the combined performance of every video assigned to it (and, for a parent List, the combined performance of all its child Lists' videos).

---

## Reusable Component: 12-Month Trend with YoY Comparison

This component appears at the **top of every detail view** — course, subject/child-list, and single video.

- Show the **past 12 months of performance**, each month compared against the **same month from the previous year**.
- Applies to any performance metric being tracked (views, watch time, CTR, subscriber gain, etc.).
- Below this comparison block, show the rest of the detailed stats for that specific course / subject / video.

Build this once as a shared component — it's used identically at every drill-down level.

---

## Section 01 — Channel Summary

- Overall, basic channel-wide analytics: total views, total watch time, total videos, total subscribers, average CTR, average retention, and similar top-line numbers.
- This is a snapshot, not broken down by List — it's the "whole channel at a glance" section.

---

## Section 02 — Course-Wise Performance (Blocks with Drill-Down)

- Display each course as a **clickable block**, showing quick summary stats (e.g. total views, trend direction, video count).
- Clicking a course block opens a **detailed course view** containing:
  1. **Top:** the 12-month trend / YoY comparison component (see above)
  2. **Then:** subject-wise performance — a breakdown of the course's child Lists (subjects), each summarized
  3. **Then:** video-wise performance — individual videos within the course, with detailed stats per video
- Clicking into a subject or a single video should open the **same detailed view pattern** (12-month trend + YoY comparison at top, followed by relevant stats) — this view is recursive across course → subject → video.

---

## Section 03 — Customizable List-Level Performance Blocks

- Located on the main Performance Overview page.
- Shows performance blocks for **any List**, not just courses — since courses are just one type of List, this section is the general-purpose version of Section 02.
- Users can **add or remove blocks** to customize which Lists appear on their main dashboard view.
- Each block follows the same click-to-drill-down behavior described in Section 02.

---

## Section 04 — Monthly Time Series (Channel-Wide)

- A time-series chart showing monthly performance across the whole channel.
- Each month compared against the **same month from the previous year** (same YoY comparison logic as the reusable component, but channel-wide rather than per-course/list/video).
- Must include, at minimum: **overall views** and **subscribers gained**, tracked month over month.

---

## Build Notes

- Sections 02 and 03 both rely on the List data model — build Lists first.
- The 12-month YoY trend component should be built once and reused across Section 04 (channel-wide) and every drill-down level in Sections 02/03 (course, subject, video) — same visual/logic pattern, different data scope.
- Section 03's customization (add/remove blocks) should persist per user, not reset on reload.