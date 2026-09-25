# Visual Status System: Scannable Planner Dashboard

## The problem with the current version

Every number, progress bar, and card currently uses the same white/gray/red regardless of whether that item is doing well, falling behind, or has no target at all. That's why it reads as flat — there's nothing to catch the eye and tell you "look here first." The fix is a **semantic status system**: a small, fixed set of colors and icons where each one always means the same thing, applied consistently across every card.

This extends the earlier redesign rules — red is still rare and meaningful, not decorative. We're just widening the palette to cover a few real states instead of using white for everything.

---

## Status Palette (use everywhere, same meaning every time)

| Status | Color | When it applies |
|---|---|---|
| **On track** | Green `#3EA65E` | Current pace meets or beats the pace needed to hit target |
| **At risk** | Amber `#E8A33D` | Pace needed is noticeably higher than recent upload velocity (e.g. 1.5–2x), but still plausible |
| **Critical / overdue** | Red `#FF0000` | Pace needed is unrealistic given recent velocity, or the session ends soon with a large gap remaining |
| **No target set** | Muted gray `#5A5A5A` | Nothing to measure against yet — deliberately quiet, not alarming |
| **Target met** | Green `#3EA65E` + checkmark icon | Uploaded ≥ Target |

Define the At risk / Critical thresholds using each List or Session's own recent upload velocity (e.g. average uploads/week over the last 4–8 weeks) compared against the pace-needed number already being calculated — don't use arbitrary fixed thresholds, since a 3/week pace is easy for a high-output list and hard for a low-output one.

---

## Icon System (small, functional, not decorative)

- ✓ **Checkmark (green)** — target met
- ⚠ **Warning triangle (amber)** — at risk
- ● **Filled dot (red)** — critical/overdue
- ○ **Outline dot (gray)** — no target set
- Use exactly **one** status icon per card, placed next to the title or the big number — not one icon per line of text.

---

## Where to apply this

### Session cards (top row)
- **Big fraction number** (e.g. "6/43") should render in the status color, not always white — this is the single highest-value change, since it's the first thing your eye lands on.
- **Progress bar**: make it visible and consistent on every card (currently only 2 of 4 show a bar), fill color = status color, and show the percentage as a label directly on or beside the bar rather than only in small text below.
- **"X vids/week needed" line**: color this text with the same status color — a red "6.0 vids/week needed" communicates urgency instantly; a green "1.2 vids/week needed" tells you it's comfortable.
- Add the status icon next to the session name.
- Sessions with no target ("CFA May 2027 Exam Window" in the reference) should look deliberately quieter — muted gray text throughout, no progress bar (since there's nothing to show progress against) — so your eye correctly skips it rather than wondering why it's empty.

### Course/Subject target cards (bottom grid)
- Same treatment: big fraction number in status color, status icon next to the List name, "no target set" cards rendered in muted gray with reduced visual weight (e.g. slightly lower opacity) so they visually recede behind cards that have real targets and progress.
- Consider a thin colored left-edge border (3–4px) on each card as a secondary, peripheral-vision cue — useful for fast scanning down a grid without reading each card's text.

### Match review queue banner
- Keep as-is structurally, but if the queue ever holds more than a few items, consider an amber (not red) tint on the banner background — reserve red specifically for "overdue/critical" progress states so it doesn't get diluted by routine review-queue notifications.

---

## Guardrails (don't let this slide back into clutter)

- **Exactly 5 status states, always the same colors.** Don't introduce new colors for other purposes elsewhere in the app — if a new use case comes up, map it to one of these five rather than adding a sixth.
- **One icon per card**, not per stat line.
- Color and icon should always agree — never show a green number next to a warning icon.
- Muted/gray "no target" cards should be visually quieter, not just colorless — slightly reduced opacity or size helps them recede without needing extra visual elements.