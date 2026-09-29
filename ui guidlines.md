# Falcon YT Analytics — UI & Design System Guidelines
> Target: Antigravity / Frontend Development Engine  
> Scope: Global (Applies across all 8 modules and dashboard views)

---

## 1. Information Hierarchy & Three-Column Workspace Architecture

Instead of stacking every control, KPI, and seasonality alert vertically in the center feed, the platform adopts a strict 3-column workspace layout:

```
+------------------+------------------------------------------+---------------------+
| LEFT NAV (Fixed) | MAIN WORKSPACE (Scrollable Feed)         | RIGHT DOCK (Fixed)  |
| w-60 (240px)     | flex-1 (Primary tables, matrices, data)  | w-80 (320px)        |
+------------------+------------------------------------------+---------------------+
```

### 1.1 Left Navigation (`w-60` / 240px)
- Preserves core routing: Overview, Upload Planner, Syllabus Matcher, Leaderboard, Low-CTR Triage, Competitors.
- Remove all floating alert widgets and secondary sync buttons from this sidebar.

### 1.2 Main Workspace (`flex-1`)
- Scrollable central feed dedicated exclusively to primary tables, syllabus coverage matrices, and data visualizers.

### 1.3 Right Sidebar Dock (`w-80` / 320px) — Static & Contextual Rail
Move non-primary, static, and persistent widgets here to unclutter the main canvas:
- **Block 1: Channel Sync & Health Card**
  - "Sync Channel" action button (primary soft-pill button with `.soft-button-primary`).
  - Channel connection status (Live Channel / Demo Mode indicator).
  - Total indexed videos and last sync timestamp.
- **Block 2: Seasonality Calendar & Exam Countdown**
  - Next exam window badge (e.g., "Nov CFA/FRM Window · 42 Days Left").
  - Target pacing gauge with soft-inset groove (e.g., "Weekly Velocity: 2 videos / week needed").
- **Block 3: Contextual Inspector / Selected Item Drawer**
  - When clicking a row in the Syllabus Matcher or Upload Planner, detailed metadata (tags, video URL link, notes, status toggle) renders here instead of cluttering the main table row.

### 1.4 Eliminate "Card Soup"
- **Do not wrap every metric or variable into an isolated container.** A screen must not consist of dozens of floating cards with distinct borders and drop shadows.
- Group related metrics into **unified panels**:
  - Top Summary Bar: Single horizontal banner with a light background, separated only by subtle hairline dividers.
  - Pacing & Targets: One consolidated panel combining target velocity, burnup trajectory, and completion stats rather than 4 separate cards.
  - Use whitespace and section titles to create structure; do not rely on nested boxes inside boxes.

### 1.5 Elevation, Borders & Soft-UI Surfaces
- **Canvas Base Background:** `#EBEEF2` (cool, soft slate-gray). Never use harsh pure white `#FFFFFF` as the full-page background.
- **Card Surface:** `#F0F3F7` or `#FFFFFF` with soft blending.
- **Primary Accent:** Vivid Electric Blue `#2F65F6` (for primary buttons, active toggles, and progress thumbs).
- **Secondary Accent:** Muted Slate `#64748B` for micro-labels; `#1E293B` for primary metric numerals.
- **Accent Gradients:** `linear-gradient(135deg, #3A72F8 0%, #2054E2 100%)` for primary CTAs.
- **Borders:** Subtle hairline borders only (`border border-slate-200/80` or `rgba(255, 255, 255, 0.6)`). Avoid thick or dark borders.
- **Card Padding:** Standardized rhythm (`p-5` or `p-6` for full panels; `p-3` or `p-4` for compact list items).

---

## 2. Text Pruning & Microcopy Rules

### 2.1 Zero-Value Explanatory Subtitles (Strip Completely)
Remove all instructional subtitles that explain obvious UI actions or summarize what the header already conveys[cite: 12, 13].
- ❌ *"Aggregate performance across your entire channel"*[cite: 12]
- ❌ *"Click any block to drill down into individual videos"*[cite: 12]
- ❌ *"Track pacing toward exam targets, allocate uploads, and manage lecture pipeline"*[cite: 13]
- ❌ *"Pin your most-tracked playlists for quick comparison"*[cite: 12]
- ❌ *"Monthly progress across entire channel compared against the same month of the previous year"*[cite: 12]
- ❌ *"Quick pacing of pending lectures to shoot & upload (excluding uploaded). Showing 5 at a time"*[cite: 10, 13]
- **Rule:** If a business user or creator needs a hint, place a subtle gray info icon (`ⓘ`) with a tooltip. Never burn vertical screen space with static explanatory sentences.

### 2.2 Numerical & Unit Redundancy
Show formatted metric values **once**. Never duplicate numbers in expanded or parenthetical format[cite: 12, 13].
- ❌ `448.5k` above `448,509 total views`[cite: 12]
- ❌ `125.0kh` above `Total watch hours`[cite: 12]
- ❌ `7.4k` above `7,400 total subscribers`[cite: 12]
- ❌ `129 Views` with subtext `129 total`[cite: 10, 13]
- ✅ Display: **448.5k** with a clean label `VIEWS` or `WATCH HOURS (125.0k hrs)`.

### 2.3 Domain Shorthands & Abbreviations
Always use established CFA/FRM and financial curriculum abbreviations in tables, filter tags, badges, and compact cards[cite: 10, 13]:
- **Courses:** `CFA L1`, `CFA L2`, `CFA L3`, `FRM P1`, `FRM P2`.
- **Subjects:**
  - Quantitative Methods ➔ `QM`[cite: 10, 13]
  - Financial Statement Analysis ➔ `FSA`[cite: 7]
  - Corporate Issuers ➔ `Corp Issuers`[cite: 7]
  - Portfolio Management ➔ `Portfolio Mgmt`[cite: 7]
  - Ethical & Professional Standards ➔ `Ethics`[cite: 7]
- **Exam Windows:** "CFA Feb 2027 Exam Window" ➔ `Feb '27 Window`[cite: 10, 13].

### 2.4 Removal of Text Affordances
- Remove explicit navigation text such as `"Drill down >"` or `"View in Grid ↗"` from clickable cards[cite: 5, 6, 12].
- Make the entire card container an interactive surface (`cursor-pointer hover:border-slate-300 hover:shadow-md transition-all`).

---

## 3. Navigation & Action Hierarchy

### 3.1 Single Source of Truth for Global Actions
- **No duplicate buttons across views:**
  - Retain **"Sync Channel"** strictly in the global top-right navbar[cite: 12, 13].
  - Remove redundant "Sync Channel" buttons from sub-headers, page hero sections, and sidebar cards[cite: 10, 12, 13].
  - Consolidate creation actions: Use a single primary CTA (`+ Plan Video`) with a dropdown chevron for secondary options (`+ Plan Short`, `Bulk Import`)[cite: 10, 13].
- **Sidebar Cleanliness:**
  - Remove floating bottom widgets (e.g., the purple "Seasonality Alert / Sync Channel" container).
  - Show contextual alerts as dismissible top banners or status chips inside the relevant workspace only[cite: 10, 13].

---

## 4. Tables, Grids & Data Density

### 4.1 Replace Card Grids with Interactive Matrix Tables
- When displaying course subjects or syllabus breakdowns, avoid rendering dozens of individual cards with semi-circular dials[cite: 5, 6].
- Use an **expandable data table (Matrix View)**[cite: 7]:
  - Row Header: Course / Subject with topic count pill[cite: 7].
  - Progress: Single inline horizontal progress bar (`bg-emerald-500` on `bg-slate-100`)[cite: 7].
  - Format Status: Use compact semantic dot/badge indicators instead of repeated sub-labels[cite: 7]:
    - 🟢 Green dot / check: Published[cite: 7]
    - 🟡 Amber clock: In Backlog / Planned[cite: 7]
    - ⚪ Light gray ring: Missing / Gap[cite: 7]
  - Table Rows: Minimum row height `h-12` or `h-14` with subtle hover highlighting (`hover:bg-slate-50/80`)[cite: 7].

### 4.2 Repetitive Table Actions
- In backlog or upload tables, replace repeated full-text action buttons (e.g., dozens of wide `[ Mark Uploaded ]` buttons) with compact icon action buttons (e.g., a simple checkmark button `[✓]` with a hover tooltip)[cite: 10, 13].

---

## 5. Zero-State & Sparse Data Handling

### 5.1 No Charting Over Zero Values
- Never render chart axes, gridlines, color legends, or empty bar outlines for empty datasets (e.g., YoY time series with 0 recorded months, or CFA Level 3 with 0 entries)[cite: 12, 13].
- Replace unpopulated charts with a clean, low-profile **empty state**:
  - Example: Centered container with a light icon and concise text: *"No YoY trend data available yet — requires 12 months of channel history"*[cite: 12].
- **0% Gauges:** Remove or hide all completion gauges showing `0%` (such as "Full Mastery 0%"). A gauge showing 0% across 20 consecutive items acts as visual noise[cite: 5, 6, 7].

---

## 6. Typography, Badges & Color Tokens

### 6.1 Typography Scale
- **Section Headers:** `text-lg font-semibold text-slate-900 tracking-tight`
- **Panel Titles:** `text-sm font-semibold text-slate-800`
- **Metric Labels (Subtext):** `text-xs font-medium text-slate-500 uppercase tracking-wider`
- **Primary Numeric Values:** `text-2xl font-bold text-slate-900`
- **Secondary Sub-values:** `text-xs font-normal text-slate-600` (ensure minimum 4.5:1 contrast against background; avoid low-contrast light grays)[cite: 12, 13].

### 6.2 Semantic Color Tokens
- **Brand / Primary Action:** Indigo/Blue (`bg-blue-600 hover:bg-blue-700 text-white`).
- **Live / Uploaded / Complete:** Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`)[cite: 4, 7, 10].
- **In Production / Planned:** Amber (`bg-amber-50 text-amber-700 border-amber-200`)[cite: 7, 10, 13].
- **Backlog / Missing / Gap:** Slate / Rose (`bg-slate-100 text-slate-600` or `bg-rose-50 text-rose-700 border-rose-200`)[cite: 4, 7, 10].

---

## 7. Soft-UI & Clean Neumorphic Component Tokens

Adopt the soft-surface, high-depth visual style across all rails, cards, and interactive controls:

### 7.1 Color Tokens & Canvas Surface
- **Canvas Base Background:** `#EBEEF2` (cool, soft slate-gray). Never use harsh pure white `#FFFFFF` as the full-page background.
- **Card Surface:** `#F0F3F7` or `#FFFFFF` with soft blending.
- **Primary Accent:** Vivid Electric Blue `#2F65F6` (for primary buttons, active toggles, and progress thumbs).
- **Secondary Accent:** Muted Slate `#64748B` for micro-labels; `#1E293B` for primary metric numerals.
- **Accent Gradients:** `linear-gradient(135deg, #3A72F8 0%, #2054E2 100%)` for primary CTAs.

### 7.2 Dual-Shadow Elevation Tokens
Implement soft directional shadows to give components their tactile, physical depth:

```css
/* Soft Raised Surface (Cards, Unpressed Buttons) */
.soft-raised {
  background: #F0F3F7;
  border-radius: 20px;
  box-shadow: 6px 6px 14px rgba(166, 175, 195, 0.55),
              -6px -6px 14px rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: all 0.2s ease;
}

/* Soft Inset Surface (Search Bars, Progress Grooves, Sunken Toggles) */
.soft-inset {
  background: #E6EAF0;
  border-radius: 14px;
  box-shadow: inset 3px 3px 6px rgba(166, 175, 195, 0.6),
              inset -3px -3px 6px rgba(255, 255, 255, 0.9);
  border: none;
}

/* Primary Action Glow (Active Blue Buttons) */
.soft-button-primary {
  background: linear-gradient(135deg, #3B72FF 0%, #1E56E3 100%);
  color: #FFFFFF;
  border-radius: 9999px;
  box-shadow: 4px 6px 12px rgba(30, 86, 227, 0.35),
              inset 0 1px 1px rgba(255, 255, 255, 0.3);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
```