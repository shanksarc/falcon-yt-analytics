# UI/UX Refactoring Task: Upload Planner Screen Decluttering

## Objective
Refactor the Upload Planner page to establish a clean visual hierarchy, eliminate vertical navigation stacking, remove duplicate progress metrics, and restrict accent color usage.

---

### 1. Navigation & Header Consolidation
- **Seasonality Banner**:
  - Remove the full-width text row below the header.
  - Move "Exam Seasonality (CFA / FRM Windows)" into a dismissible banner (`Alert` component with an `x` close button) or an info-icon tooltip (`TooltipProvider`) placed beside the "Upload Planner" page title.
- **Sub-Navigation Tabs**:
  - Convert the `Progress & Analytics`, `Full Video List`, `Weekly Schedule`, `Shorts Hub`, and `Manage Plan` buttons into a single, cohesive Segmented Control / Tab Bar (`TabsList` / `TabsTrigger`).
  - Remove the bright red active background from tabs. Active tabs should use subtle contrast (`bg-zinc-800 text-zinc-100 border border-zinc-700`).

---

### 2. Header & Action Bar Reorganization
- **Top Row Layout**:
  - Left: Page title `Upload Planner` with subtitle `Track pacing toward exam targets, allocate weekly uploads, and manage course content.`
  - Right: Consolidated action group:
    - Primary CTA: `+ Plan Video` (with a split dropdown or adjacent secondary button for `+ Plan Short`).
    - Secondary utilities: Group `Scan new uploads`, `Bulk import`, and `Set targets` into an outlined button group or an overflow menu (`MoreHorizontal` icon dropdown) to prevent button sprawl.

---

### 3. Metric Card Consolidation & Redundancy Removal
The current layout duplicates data across the top KPI cards and the lower progress card. Merge them into a single 4-card grid:

- **Card 1: Lecture Progress**
  - Metric: `1 / 8 Live` (`13%`)
  - Component: Embed a slim progress bar directly inside this card.
  - Subtext/Pills: `1 Live` · `0 Sched` · `7 Backlog`
- **Card 2: Shorts Progress**
  - Metric: `0 / 4 Live` (`0%`)
  - Component: Embed a slim progress bar directly inside this card.
  - Subtext/Pills: `0 Live` · `0 Ready` · `4 Ideas`
- **Card 3: Total Pipeline Backlog**
  - Metric: `11 Items`
  - Subtext: `11 in production · 0 scheduled`
- **Card 4: Overall Upload Velocity**
  - Metric: `8%` (`1 of 12 Total Uploaded`)
  - Subtext: Pacing indicator relative to upcoming exam target window.

*Action*: Completely delete the redundant full-width card `% Upload Completion Progress` below the grid.

---

### 4. Color Palette & Visual Weight Strict Rules
- **Color Discipline**:
  - **Red**: Restrict red exclusively to the YouTube logo badge, high-priority alert badges (e.g., `Low-CTR Triage`), and destructive actions.
  - **Primary CTA**: Keep `+ Plan video` distinctive, but tone down all competing red badges and active tab fills.
  - **Status Colors**: Standardize status pills:
    - Live / Published: `text-emerald-400 bg-emerald-950/40 border-emerald-800/50`
    - In Production / Backlog: `text-zinc-400 bg-zinc-900 border-zinc-800`
    - Target / Active Filter: Muted amber (`text-amber-300 bg-amber-950/30 border-amber-800/40`).
- **Surface Elevation**:
  - Page Background: `#09090b` (Zinc-950) / `#F8FAFC` (Neo-SaaS)
  - Card Background: `#121215` (Zinc-900 / elevated) / `#FFFFFF` (Neo-SaaS)
  - Borders: Subdued `#27272a` (Zinc-800) / `#E2E8F0` (Neo-SaaS) with `rounded-xl` borders.

---

### 5. Transition to App-Level Sidebar Navigation (SaaS 2-Column Layout)
Replace stacked horizontal navigation bars with a standard modern SaaS 2-column layout:

- **Left Sidebar Navigation (`<aside>`)**:
  - Fixed width `w-64` (collapsible to `w-20`), `bg-white border-r border-slate-100 flex flex-col justify-between p-4`.
  - **Top Brand Block**:
    - Falcon logo badge + `Falcon Analytics` in `font-bold text-slate-800`.
    - Channel status pill: `Live Channel` (emerald) / `Demo Mode` (slate).
  - **Primary Nav List (`<nav>`)**:
    - `Performance Overview`
    - `Upload Planner` (Active: `bg-purple-50 text-[#7C3AED] font-semibold rounded-xl`)
    - `Monthly Leaderboard`
    - `Low-CTR Triage` (With red pill badge counter)
    - `Change Log & Impact`
    - `Competitor Benchmarking`
  - **Bottom Sidebar Area**:
    - Sync trigger & channel status card (`Sync Channel`).
    - User profile / Settings link with avatar.

- **Main Content Canvas (`<main>`)**:
  - **Top Utility Header (`h-16`)**:
    - Left: Minimal breadcrumb (`Falcon / [Active View]`) + Search bar pill (`bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 text-xs text-slate-600`).
    - Right: `Sync Channel` trigger, notification bell, user avatar.
  - **Page Content**:
    - Active view container with responsive spacing (`px-6 py-6 md:px-8 md:py-8 bg-[#F8FAFC]`).
    - Retains 4 pastel KPI stat cards in Upload Planner, followed by secondary tab views.