
# QuestFlow — MVP Spec (v0.1)

## 1) Goal & Pitch
**Goal:** Turn your MTGA **dailies/weeklies** and limited time into a **schedule** that **maximizes gold/gem EV** and finishes quests efficiently.  
**One‑liner:** *“Know exactly what to play tonight for the best rewards.”*

## 2) Users & Value
- **Time‑boxed player:** 30–90 minutes/day wants best EV.  
- **New/returning player:** avoid dead queues; finish quests on time.

## 3) Inputs (MVP)
- **Quests:** list (e.g., “Cast 25 red/green spells”, “Win 2 games”), with remaining counts.  
- **Time budget:** minutes available today/this week.  
- **Win rate estimates:** by queue (BO1/BO3; optionally per format).  
- **Queues/events enabled:** Standard/Historic, Midweek, Quick Draft, Premier Draft (toggle).  
- **Current resources (optional):** gold, gems, tokens.

## 4) Outputs
- **Tonight’s plan:** ordered steps (queue, target matches/wins), **ETA** per step.  
- **EV summary:** expected gold/gems/packs change; quest completion projections.  
- **What‑if panel:** sliders for win rate/time to compare plans.  
- **Export:** copy to clipboard or ICS reminder block.

## 5) Core Flows
1. Enter quests + time + win rates → **Compute plan**.  
2. Show plan & EV; user tweaks toggles; re‑compute instantly.  
3. Mark steps done; progress updates in‑app (no game hooks).

## 6) EV & Scheduling Algorithm (MVP)
- **EV(queue) =** P(win)·reward_win + (1−P)·reward_loss − entry_cost/expected_runs.  
- **Quest progress rate:** expected triggers per match from archetype heuristics or user‑set “avg triggers per game.”  
- **Planner:** greedy by **EV per minute** subject to **quest completion** constraints and **time budget**; small knapsack pass for drafts.  
- **Events:** static reward tables; approximate tree expectation for limited ladders.

> Transparent math; tables configurable in admin JSON; no automation.

## 7) Data Model (Supabase)
- `user(id, email)`  
- `quest(id, user_id, type {win,cast,color:...}, remaining, expires_at)`  
- `settings(user_id, win_rates JSON, queues_enabled JSON, minutes_per_game)`  
- `plan(id, user_id, created_at, horizon {today,week})`  
- `plan_step(plan_id, order, queue, target, est_minutes, ev_delta)`  
- `reward_table(id, name, payload JSON, version)`

## 8) API Sketch
- `POST /plan/compute` → plan + EV summary  
- `POST /quest/save`  
- `GET /rewards/:version`  
- `POST /plan/completeStep`

## 9) UI (PWA)
- **Planner form:** quests (chips), time slider, win‑rate sliders, queue toggles.  
- **Results:** “Tonight” card with steps, EV totals, progress bars.  
- **What‑if:** sticky panel (adjust win rate/time → recompute).  
- **History:** last 7 plans; quick re‑use.

## 10) Non‑Functional
- P95 plan compute < 400ms.  
- Works offline with last inputs; stores only local data unless user signs in.  
- Mobile‑first; accessible sliders and ARIA labels.

## 11) Pricing
- **Free:** 5 plans/week, no history.  
- **Pro $3/mo** or **bundle $6/mo** (with Wildcard Whisperer): unlimited plans, save history, ICS export, custom reward tables.

## 12) ToS‑Safe
- No overlays, bots, or direct client interaction.  
- Optional manual entry of logs/records; not required.

## 13) Analytics (privacy‑respecting)
- plan_compute, plan_accept, what_if_adjust, step_complete.  
- Store only aggregates; no deck/opponent data.

## 14) Roadmap (P1 → P2)
- **P1:** auto‑winrate estimation from user’s self‑logged results; weekly reminder emails.  
- **P2:** community EV presets, seasonal events, team sharing.
