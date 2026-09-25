# Upload Planner: Information Architecture Fix

## The problem

Current flow to see progress: Upload Planner tab → session card list → click a session → land on "Targets by course & subject" (a setup/editing screen) → click the "Progress & Analytics" sub-tab → finally see the dial and charts.

That's backwards. **Analytics is a daily-use view; planning/setup is occasional.** The screen you check every day should be one click away, not four. Right now the setup screen (course/subject target grid, Bulk Import, + Plan Video button) occupies the default, most prominent position — exactly the opposite of how often each is actually used.

---

## The fix: reorder by frequency of use, not by workflow order

### New default landing: Progress & Analytics
When the user opens the Upload Planner tab, they should land directly on an analytics view — not a session list, not a targets grid.

- Show the dial, burnup chart, and weekly velocity chart **immediately**, for whichever session is most relevant (e.g. the one ending soonest, or the last one the user viewed).
- If there are multiple active sessions, put a **compact session switcher** (a dropdown or a small row of tabs) at the top of this same analytics view — so switching sessions doesn't mean leaving analytics and re-entering it, it's just a change of context on the same screen.
- This single view replaces the current multi-step path of: session card list → click in → sub-tab click.

### Demote the setup/planning UI to a secondary, clearly-separate area
Everything currently front-and-center — the course/subject target grid, "Bulk Import," "+ Plan Video," "New exam session" — is setup work you'll do once per session and revisit occasionally, not daily. Move it behind a single clearly-labeled entry point, e.g. a **"Manage Plan"** tab or button, separate from the analytics view.

- Inside "Manage Plan," keep everything that currently exists: the session list/creation, the targets-by-course-and-subject grid, Bulk Import, + Plan Video, and All Planned Entries.
- This isn't about hiding these features or making them harder to use when needed — it's about not making them compete for attention with the numbers you actually check every day.

### Weekly Schedule
This sits in between — it's touched more often than target-setup (weekly, to allocate/rebalance) but less often than analytics (daily). Keep it as its own clearly visible tab alongside Progress & Analytics, rather than bundling it into "Manage Plan" — but analytics should still be the default landing, with Weekly Schedule one click away, not Manage Plan.

---

## Resulting structure

```
Upload Planner tab
├── Progress & Analytics   ← DEFAULT landing (dial, burnup, velocity, session switcher)
├── Weekly Schedule        ← one click away, used weekly
└── Manage Plan            ← one click away, used occasionally
    ├── Sessions (list/create)
    ├── Targets by course & subject
    ├── Bulk Import
    ├── + Plan Video
    └── All Planned Entries
```

## Guardrail

Don't just move the sub-tab order (Progress & Analytics currently sits in the middle) — actually change what loads by default when the tab is opened. Reordering tabs without changing the default selected one won't fix the underlying issue: the first thing rendered on screen should be the numbers, not the setup grid.
