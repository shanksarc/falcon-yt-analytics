# Comprehensive Theme Overhaul: Pastel-Tinted Minimal Neo-SaaS Aesthetic

## 1. Design Vision & Visual DNA
Transform the entire application into an airy, bright, modern dashboard aesthetic characterized by:
- Soft off-white canvas backgrounds.
- Pill-shaped floating input controls and filters.
- Metric/KPI cards with subtle pastel tint fills (mint, soft peach, light lavender, and warm rose).
- Clean radial progress indicators, rounded bar charts, and smooth purple spline curves.
- Ultra-soft, ambient drop shadows and generous rounded corners (`rounded-2xl` and `rounded-3xl`).

---

## 2. Color Tokens & Surface Specifications (Tailwind CSS)

### Canvas & Structural Backgrounds:
- **Root App Shell**: Clean soft grey-white (`bg-[#F7F9FC]` or `bg-[#F8FAFC]`).
- **Sidebar & Primary Surfaces**: Pure Crisp White (`bg-white`).
- **Cards & Data Containers**: Pure White (`bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] border border-slate-100/60`).

### Pastel Accent Tile System (For Top KPI Cards):
Instead of uniform dark cards, assign distinct low-saturation pastel tints to key stat tiles:
- **Tile 1 (e.g., Planned Lectures / Primary Progress)**: 
  - Background: Soft Mint (`bg-[#EBFBF7]` or `bg-emerald-50/70`)
  - Accent Text: Emerald / Teal (`text-[#0D9488]` or `text-emerald-700`)
- **Tile 2 (e.g., Shorts / Engagement)**: 
  - Background: Soft Peach / Warm Cream (`bg-[#FFF5ED]` or `bg-orange-50/70`)
  - Accent Text: Warm Terracotta / Amber (`text-[#EA580C]` or `text-amber-700`)
- **Tile 3 (e.g., Pipeline Backlog / Signups)**: 
  - Background: Soft Lilac / Lavender (`bg-[#F3EEFF]` or `bg-purple-50/80`)
  - Accent Text: Deep Iris / Violet (`text-[#7C3AED]` or `text-purple-700`)
- **Tile 4 (e.g., Upload Velocity / Target Pacing)**: 
  - Background: Soft Rose / Blush (`bg-[#FFF0F2]` or `bg-rose-50/70`)
  - Accent Text: Rose (`text-[#E11D48]` or `text-rose-700`)

### Typography & Numbers:
- **Primary Hero Numbers**: Deep Charcoal (`text-[#1E293B]`), bold, large tracking-tight (`text-3xl font-bold tracking-tight`).
- **Card Subtext / Labels**: Subtle Slate (`text-[#64748B]` / `text-[12px] font-medium`).
- **Percentage Trends / Badges**: Small green/red pill badges or inline text (`text-emerald-600 font-semibold text-xs`).

---

## 3. Component Architecture & UI Elements

### A. Top Utility & Search Bar (Floating Capsule Style):
- Replace full-width borders with floating capsule elements:
  - Search input: Pill container (`bg-white rounded-full px-5 py-2.5 text-sm text-slate-700 border border-slate-200/70 shadow-sm flex items-center gap-2`).
  - Dropdown Filter / Date selector: Pill container (`bg-white rounded-full px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200/70 shadow-sm flex items-center gap-2 hover:bg-slate-50`).
  - User avatar: Circular with subtle status ring (`ring-2 ring-slate-100 rounded-full`).

### B. Navigation & Sidebar:
- Sidebar background: Pure White (`bg-white border-r border-slate-100`).
- Menu Items:
  - Inactive: Slate text with muted line icons (`text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl px-3 py-2.5 transition`).
  - Active: Bold purple or indigo highlight (`text-[#7C3AED] font-semibold bg-purple-50/60 rounded-xl`).

### C. Visualizations & Charting Styles:
- **Splines / Line Charts**: Use clean purple stroke (`#7C3AED` or `#8B5CF6`) with small highlighted data node circles and light drop shadow under lines.
- **Micro Bar Charts**: Rounded pill bars (`rounded-full`) in alternating duotone hues (e.g., deep blue-purple and soft orange).
- **Radial Gauges**: Thin concentric circular arcs for progress completion percentages instead of heavy rectangular progress bars.

---

## 4. Execution Directives for Upload Planner
1. Update `UploadPlannerHeader` and its 4 top stat cards to use the pastel tile system (Mint, Peach, Lilac, Rose) with bold dark values (`text-2xl font-bold text-slate-800`).
2. Turn top controls (`Scan`, `Bulk Import`, `Date Range`) into pill-shaped white buttons with soft outlines and light shadows.
3. Replace all dark page wrappers (`bg-zinc-950`, `bg-zinc-900`) with clean `bg-[#F8FAFC]` canvas and `bg-white` cards.