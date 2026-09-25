# Feature Spec: Syllabus Matcher

## Overview

The Syllabus Matcher answers one question: **for every topic in the syllabus, do I have a video for it — and if so, what kind?** It cross-references the full topic list (course → subject → topic) against your uploaded videos, by video Format (Discussion / Question Solving / Revision / General), and gives you a traffic-light view of coverage plus roll-up percentages at the subject and course level.

This feature reuses two things already built rather than introducing new systems:
- **Topics are simply another List tier**, one level below Subject (Course → Subject → Topic), using the same hierarchical List system already in place — no separate topic structure needed.
- **Discussion / Question Solving / Revision / General are the existing Format tags** from the original categorization layer — this matcher is effectively a **Topic × Format coverage grid**, not a new tagging concept.

---

## 1. Topic List Input

### Bulk paste — flat mode (primary, everyday method)
Select **Course** and **Subject** first via two dropdowns above the text box (populated from the existing List hierarchy), then paste a **plain flat list, one topic per line** — no headers, no markers needed, since course/subject context is already set by the dropdowns:

```
Bond Pricing Basics
Yield to Maturity
Duration and Convexity
Present Value of Bonds
```

- Every non-empty line becomes one Topic-level List, nested under the Course → Subject selected in the dropdowns
- Since Course/Subject are picked from the existing hierarchy (not typed), there's no fuzzy-matching step needed for this mode — it's unambiguous by construction
- Show a simple preview list before committing (just the parsed topic names, so the user can scan for accidental blank lines or duplicates), then confirm to create

This is the expected everyday flow: open a Subject, paste its topic list, done — one Subject at a time.

### Bulk paste — grouped mode (secondary, for loading multiple subjects/courses at once)
For loading an entire curriculum in one go rather than subject-by-subject, the same grouped shorthand used by the Planner's bulk import is also supported, with course/subject markers embedded directly in the pasted text:

```
Course: CFA Level 1

Fixed Income:
- Bond Pricing Basics
- Yield to Maturity
- Duration and Convexity

Ethics:
- GIPS Standards Overview
- Code of Ethics Case Studies
```

- `Course:` sets the active course for following lines until the next `Course:` line
- A subject line ending in `:` sets the active subject for following dash-entries
- Each `- Topic name` line becomes one Topic-level List, nested under the currently active Course → Subject
- Course and Subject names are matched against the existing List hierarchy the same way the Planner's bulk import does (fuzzy match, confirm-if-uncertain) — **do not create duplicate Course/Subject Lists**; only new Topic-level Lists get created under the existing structure
- Show a preview/staging table before committing, same pattern as the Planner's bulk import — flag any Course/Subject that couldn't be confidently matched, let the user correct before finalizing

### Individual entry
A simple form to add one Topic at a time under a selected Course → Subject, for smaller additions/corrections after the initial bulk load.

---

## 2. Matching Videos to Topics

Reuses the same title-similarity matching + confirmation-queue pattern already used for List auto-assignment and the Change Log's upload-matching.

- The matcher scans existing (and newly fetched) videos and attempts to match each one to a Topic, by title similarity
- **Confident match** → auto-links the video to that Topic + infers its Format from the video's existing Format tag (already assigned during the original categorization step)
- **Uncertain match** → surfaces in a confirmation queue: "Is [video title] a match for [topic name]?" — user confirms or rejects
- **Multiple videos per topic are expected and supported** — e.g. a topic can have a Discussion video, a Question Solving video, and a Revision video all linked simultaneously, or multiple part-videos of the same Format
- Once confirmed, a video is linked to its Topic; this link is what drives the traffic-light grid below

---

## 3. Coverage Grid (main view)

A table, one row per Topic, organized under expandable/collapsible Subject and Course groupings.

**Columns:** Topic name → Discussion → Question Solving → Revision → General → Plan

**Traffic-light button states (per Topic × Format cell):**

| Color | Meaning |
|---|---|
| Gray | Not applicable for this topic (e.g. a topic that doesn't warrant a "Question Solving" video) |
| Green | Video available — at least one confirmed video linked for this Topic + Format |
| Yellow | Planned — a Planned Video Entry exists for this Topic + Format but hasn't been uploaded yet |
| Red | Not available — no video, and nothing planned |

- **Expand/collapse** at the Course level and Subject level, so the grid can be browsed one course or one subject at a time rather than showing every topic across the whole curriculum at once
- If a Topic has multiple videos for the same Format (e.g. a 3-part Revision series), the cell still shows green, with a small indicator (e.g. a count) — clicking the cell shows the individual linked videos

---

## 4. Plan Button (per-topic action)

Clicking **Plan** on a Topic's row opens a small popup:

- **Checkboxes** for which Format(s) to plan (Discussion / Question Solving / Revision / General) — checking multiple creates **one separate Planned Video Entry per checked Format**, each pre-linked to this Topic
- **Session linkage**: choose an existing open Session, or leave as "No session / open" — same optional-session behavior as the rest of the Planner
- On submit, each newly created Planned Video Entry appears in the Upload Planner (Manage Plan → Planned Entries) exactly as if it had been added there directly, and that Topic's corresponding cell(s) immediately flip to yellow in the Coverage Grid

### Auto-sync back to the grid
When a Planned Video Entry created this way gets uploaded and matched (via the existing auto-match system from the Planner), its cell automatically flips from yellow to green — no manual update required. This keeps the Coverage Grid and the Planner in sync without duplicate data entry.

---

## 5. Coverage Analytics (top of page)

Round-dial percentage indicators, rolling up from Topic level to Subject and Course level.

**Two metrics, shown separately, at every level (Course, Subject, and overall channel):**

1. **Basic coverage** — % of topics with **at least one** video of any Format. This is the primary, top-line number ("76% of Fixed Income topics have some video").
2. **Full coverage** — % of topics with **all applicable Formats** present (respecting Gray/not-applicable cells — a topic marked gray for a Format doesn't count against full coverage for that Format). This is the stricter, secondary number, shown alongside but visually smaller/less prominent than Basic coverage.

**Example:** A subject with 20 topics, 6 of which have at least one video → Basic coverage = 30%. Of those 6, only 2 have all applicable Formats filled in → Full coverage = 10%.

- Show these dials at three levels: overall channel, per Course, and per Subject (visible when a Course/Subject is expanded)
- Use the same status-color logic already established elsewhere in the app for visual consistency (though here it reflects coverage completeness rather than pacing/urgency)

---

## Build Notes

- This feature depends on the List hierarchy and Format tagging already existing — no new taxonomy needs to be built, only the Topic tier added beneath Subject
- Depends on the Planner's Planned Video Entry system (for the Plan button) and its existing auto-match logic (for the auto-sync-to-green behavior)
- The bulk paste parser should share code with the Planner's bulk import parser where possible, since the grouped-shorthand format and Course/Subject matching logic are identical — only the leaf level differs (Topic name only, vs. Topic name + session for the Planner)