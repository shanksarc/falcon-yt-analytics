# UI Specification: Refactor Sidebar & App Shell (Prodify-Inspired Clean Aesthetic)

## 1. Core Shell Architecture
Ensure the application uses a strict 2-column flexbox container to eliminate layout overlap:
- Root wrapper: `flex h-screen w-full overflow-hidden bg-[#F6F8FC] font-sans antialiased text-slate-800`
- Sidebar `<aside>`: `w-64 shrink-0 h-full bg-[#F6F8FC] border-r border-slate-200/70 flex flex-col justify-between p-4 overflow-y-auto`
- Main content `<main>`: `flex-1 h-full overflow-y-auto p-8 bg-[#F6F8FC]`

---

## 2. Sidebar Component Breakdown

### A. Top User Profile Card (Header)
Replace the simple text brand with an interactive account selector card:
- Container: `flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/60 shadow-sm mb-6`
- Avatar: Rounded-full profile picture or initial with an online green indicator dot (`w-9 h-9 rounded-full relative`).
- Details:
  - User name: `text-xs font-bold text-slate-900 leading-tight` ("Falcon Edufin" / Channel Name)
  - Status: `text-[11px] text-emerald-600 font-medium flex items-center gap-1` ("Online" or "Live Channel")
- Chevron: Dropdown arrow icon `ChevronDown` (`w-3.5 h-3.5 text-slate-400`).

---

### B. Navigation Menu Items
Structure the navigation into clean vertical groups with generous vertical whitespace (`space-y-1`):

- **Main Navigation Group**:
  - `Home / Dashboard` (`Home` icon)
  - `Upload Planner` (Active State)
  - `Performance Overview` (`BarChart2` icon)
  - `Monthly Leaderboard` (`Trophy` icon)
  - `Low-CTR Triage` (`AlertTriangle` icon + badge)
  - `Competitor Benchmarking` (`Crosshair` icon)

- **Active State Style**:
  - `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-600 bg-white shadow-sm border border-slate-200/50`
- **Inactive State Style**:
  - `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors`
- **Notification Badges**:
  - Inside the flex row: `px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100`

---

### C. Secondary Project / Scope Section
Below primary links, include a dedicated "Scopes / Focus" sub-list:
- Header: `flex items-center justify-between px-3 mt-6 mb-2`
  - Title: `text-[11px] font-bold text-slate-800 tracking-tight` ("My Focus" or "Exam Tracks")
  - Action: `text-[11px] text-indigo-600 font-semibold hover:underline` ("+ Add")
- List Items: Clean dots corresponding to categories:
  - CFA Program (`w-2 h-2 rounded-full bg-purple-500`)
  - FRM Program (`w-2 h-2 rounded-full bg-blue-500`)
  - YouTube Shorts (`w-2 h-2 rounded-full bg-teal-400`)

---

### D. Settings & Bottom Feature Card
Pin settings and an informative utility card to the bottom of the sidebar:

- **Settings Link**:
  - `flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 mb-3` (`Settings` icon).

- **Bottom Gradient Banner Card**:
  - Container: `rounded-2xl p-4 bg-gradient-to-br from-[#5D5FEF] to-[#7B7DF6] text-white shadow-md shadow-indigo-100 space-y-2.5`
  - Header: `text-xs font-bold flex items-center gap-1.5` ("• Falcon Pro" or "Exam Seasonal Mode")
  - Body text: `text-[11px] text-indigo-100 leading-snug` ("CFA & FRM exam windows are approaching. Prioritize marathon lectures.")
  - Action Button: `w-full py-2 bg-white hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl shadow-sm transition text-center` ("Sync Channel" or "View Schedule")

---

## 3. Reference Implementation (React / Tailwind)

```tsx
import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  BarChart3, 
  Trophy, 
  AlertCircle, 
  Users2, 
  Settings, 
  ChevronDown,
  Sparkles
} from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-full bg-[#F6F8FC] border-r border-slate-200/70 flex flex-col justify-between p-4 overflow-y-auto">
      <div className="space-y-6">
        
        {/* Profile Card Header */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/60 shadow-sm cursor-pointer hover:border-slate-300 transition">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200">
                FE
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 leading-tight">Falcon Edufin</div>
              <div className="text-[11px] text-emerald-600 font-medium">Live Channel</div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400"/>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 transition">
            <LayoutDashboard className="w-4 h-4 text-slate-500"/>
            <span>Overview</span>
          </button>
          
          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-600 bg-white shadow-sm border border-slate-200/60">
            <CalendarDays className="w-4 h-4 text-indigo-600"/>
            <span>Upload Planner</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 transition">
            <BarChart3 className="w-4 h-4 text-slate-500"/>
            <span>Monthly Leaderboard</span>
          </button>

          <button className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 transition">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-slate-500"/>
              <span>Low-CTR Triage</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">16</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 transition">
            <Users2 className="w-4 h-4 text-slate-500"/>
            <span>Competitor Benchmarking</span>
          </button>
        </nav>

        {/* Tracks / Exam Scopes */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-bold text-slate-800">Exam Tracks</span>
            <button className="text-[11px] text-indigo-600 font-semibold hover:underline">+ Add</button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 font-medium cursor-pointer hover:text-slate-900">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>CFA Level 1 & 2</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 font-medium cursor-pointer hover:text-slate-900">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>FRM Part 1 & 2</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 font-medium cursor-pointer hover:text-slate-900">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>YouTube Shorts</span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer & Promo Card */}
      <div className="space-y-3 pt-4">
        <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition">
          <Settings className="w-4 h-4 text-slate-400"/>
          <span>Settings</span>
        </button>

        {/* Bottom Feature Card */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#5D5FEF] to-[#7B7DF6] text-white shadow-md shadow-indigo-100 space-y-2.5">
          <div className="text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-200"/>
            <span>Seasonality Alert</span>
          </div>
          <p className="text-[11px] text-indigo-100 leading-relaxed">
            Prioritize marathon & revision lectures 30–60 days before exam windows.
          </p>
          <button className="w-full py-2 bg-white hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl shadow-sm transition">
            Sync Channel
          </button>
        </div>
      </div>
    </aside>
  );
}