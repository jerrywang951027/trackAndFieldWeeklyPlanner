# Sprint Coach — Architecture

This document explains how the app is put together: the tech stack, how the pieces talk to each other, the data model, and the request flow for every meaningful interaction.

It is the companion to [`README.md`](../README.md) (which focuses on "how do I run it"). This one focuses on "how does it work and why".

---

## 1. What the app is, in one paragraph

Sprint Coach is a single-user web app that asks a sprint athlete a few questions, then uses Anthropic's Claude (via an internal LLM gateway) to generate a periodized 7-day training plan, render it in a dashboard, accept daily logs and readiness check-ins, and revise the plan when the athlete describes a change in plain English. It runs as one Next.js process with a local JSON file as the entire database. Designed as a learning project: minimal infra, but the seams are drawn so any one piece (storage, auth, model provider, event categories) can be swapped without touching the rest.

---

## 2. Tech stack

### Runtime & framework

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node 20+ | Required by Next 16 |
| Framework | **Next.js 16** (App Router, RSC, Server Actions, Turbopack) | Single repo for UI + server, no separate API tier needed |
| Language | **TypeScript 6** (strict) | Type safety end-to-end including server actions |

### UI

| Layer | Choice |
|---|---|
| Styling | **Tailwind CSS v4** (CSS-first config via `@theme inline`) |
| Component primitives | Hand-rolled shadcn-style components on top of **Radix UI** (Slot, Slider, Select, Checkbox, Label, Progress, etc.) |
| Icons | **lucide-react** |
| Charts | **recharts** (line chart for training load) |
| Class composition | `class-variance-authority`, `clsx`, `tailwind-merge` (via the `cn()` helper) |

### Data & domain

| Layer | Choice |
|---|---|
| Persistence | Single JSON file at `.data/store.json` (atomic write via tmp + rename) |
| Validation | **zod** for every form / action input and for the LLM tool output |
| Dates | **date-fns** |
| Domain types | Plain TypeScript in `db/schema.ts` |

### AI

| Layer | Choice |
|---|---|
| Provider SDK | **`@anthropic-ai/sdk`** (Messages API) |
| Endpoint | Configurable via `ANTHROPIC_BASE_URL` — defaults to the internal SFDC eng-ai-model-gateway (LiteLLM proxy) |
| Default model | `claude-opus-4-7` (overridable via `ANTHROPIC_MODEL`) |
| Structured output | **Forced `tool_use`** with a `tool_choice: { type: "tool", name: "emit_weekly_plan" }` — Claude's equivalent of OpenAI's `response_format: json_schema` |
| Validation | zod parses the tool's `input` after each call, with one auto-retry on failure |

### Tooling

| Layer | Choice |
|---|---|
| Lint | ESLint 9 flat config + `typescript-eslint` |
| Build | `next build` (Turbopack) |
| Package mgr | npm |

---

## 3. System diagram

A bird's-eye view of every external actor and every internal layer.

```mermaid
flowchart TB
  subgraph browser [Browser]
    UI[React UI - Tailwind + Radix + recharts]
  end

  subgraph nextjs [Next.js process - one container]
    subgraph routes [App Router routes]
      RSC[React Server Components - pages]
      Actions[Server Actions - mutations]
    end
    subgraph domain [Domain & AI layer]
      Queries[lib/queries.ts]
      Domain[lib/sprintDomain.ts]
      AI[lib/ai - planGenerator, explainWorkout]
      Anthropic[lib/anthropic.ts - SDK wrapper]
    end
    subgraph storage [Storage layer]
      FileStore[db/fileStore.ts - read, updateStore, nextId]
    end
  end

  subgraph external [External]
    JsonFile[(.data/store.json on disk)]
    Gateway[Anthropic Messages gateway - LiteLLM proxy]
    Claude[Claude Opus 4.7]
  end

  UI -- "navigation - HTTP GET" --> RSC
  UI -- "form submit, button click - server action RPC" --> Actions
  RSC --> Queries
  Actions --> Queries
  Actions --> AI
  Queries --> FileStore
  Actions --> FileStore
  AI --> Anthropic
  Anthropic -- "HTTPS POST /v1/messages, x-api-key" --> Gateway
  Gateway --> Claude
  FileStore <-- "read JSON, write JSON via tmp+rename" --> JsonFile
```

### Layered view

```mermaid
flowchart LR
  L1[Presentation - RSC pages + client islands]
  L2[Server Actions - mutation entrypoints]
  L3[Queries + Domain + AI - business logic]
  L4[Persistence - fileStore]
  L5[External - LLM gateway + disk]

  L1 --> L2
  L1 --> L3
  L2 --> L3
  L3 --> L4
  L4 --> L5
  L3 --> L5
```

Each layer only talks down. Pages don't touch the file store directly; everything goes through `lib/queries.ts` or a server action. The file store doesn't know what entities mean; that's `db/schema.ts` + `lib/sprintDomain.ts`.

---

## 4. Directory map (what lives where)

```
project701/
├─ app/                          Next.js App Router
│  ├─ layout.tsx                 Root layout (TopNav, dark theme)
│  ├─ page.tsx                   Redirect: / -> /onboarding or /home
│  ├─ error.tsx                  Global error boundary
│  ├─ loading.tsx                Skeleton for slow RSCs
│  ├─ not-found.tsx              404
│  ├─ globals.css                Tailwind v4 import + design tokens
│  ├─ onboarding/
│  │  ├─ page.tsx                Hosts the wizard
│  │  ├─ OnboardingWizard.tsx    6-step client wizard
│  │  └─ actions.ts              completeOnboarding server action
│  ├─ home/page.tsx              Daily dashboard
│  ├─ plan/
│  │  ├─ page.tsx                Week grid + Adjust card + history
│  │  └─ [workoutId]/page.tsx    Single-workout detail
│  ├─ log/[workoutId]/
│  │  ├─ page.tsx                Quick-log RSC
│  │  └─ LogForm.tsx             Client form
│  ├─ recovery/page.tsx          Daily readiness check-in
│  ├─ progress/page.tsx          Charts + PRs + streak
│  ├─ profile/page.tsx           Profile summary
│  ├─ learn/page.tsx             Stub
│  └─ actions/
│     ├─ plan.ts                 generateWeeklyPlan + adjustWeeklyPlan
│     └─ log.ts                  saveWorkoutLog + saveReadiness
│
├─ components/
│  ├─ ui/                        shadcn-style primitives (Button, Card, Slider, ...)
│  ├─ TopNav.tsx
│  ├─ WorkoutCard.tsx
│  ├─ WeekGrid.tsx
│  ├─ ReadinessForm.tsx
│  ├─ TrainingLoadChart.tsx
│  ├─ ConsistencyHeatmap.tsx
│  ├─ GeneratePlanButton.tsx     Client - useTransition + elapsed timer
│  ├─ AdjustPlanCard.tsx         Client - free-text adjustment input
│  └─ AdjustmentHistory.tsx      RSC - timeline of past adjustments
│
├─ db/
│  ├─ schema.ts                  Plain TS types (Athlete, Workout, ...)
│  └─ fileStore.ts               JSON file persistence + write mutex
│
├─ lib/
│  ├─ athlete.ts                 getCurrentAthleteId() - the auth seam
│  ├─ anthropic.ts               Anthropic SDK client wrapper
│  ├─ queries.ts                 All read helpers (used by RSCs)
│  ├─ sprintDomain.ts            Events, season-phase, readiness scoring
│  ├─ useElapsed.ts              Client hook for "Generating... 47s"
│  ├─ utils.ts                   cn() helper
│  └─ ai/
│     ├─ schemas.ts              zod WeeklyPlanSchema (output contract)
│     ├─ planGenerator.ts        Builds prompt, calls Claude, validates
│     └─ explainWorkout.ts       Lazy "why" explanations
│
├─ .data/store.json              The entire database (gitignored)
├─ .env.local                    ANTHROPIC_API_KEY + URL + model
├─ prompts/initialPrompts.md     Original product brief
└─ docs/ARCHITECTURE.md          You are here
```

---

## 5. Data model

All entities live in [`db/schema.ts`](../db/schema.ts) as plain TypeScript types and are persisted as arrays inside one JSON object.

```mermaid
erDiagram
  ATHLETES ||--o{ ATHLETE_EVENTS : "has events"
  ATHLETES ||--o{ GOALS : "has goals"
  ATHLETES ||--|| AVAILABILITY : "has one"
  ATHLETES ||--o{ MEETS : "has meets"
  ATHLETES ||--o{ INJURY_HISTORY : "has injuries"
  ATHLETES ||--o{ WEEKLY_PLANS : "has weeks"
  ATHLETES ||--o{ DAILY_READINESS : "checks in"
  ATHLETES ||--o{ PLAN_ADJUSTMENTS : "asks coach"

  WEEKLY_PLANS ||--|{ WORKOUTS : "7 per plan"
  WORKOUTS ||--o{ WORKOUT_LOGS : "logged after"
  WEEKLY_PLANS ||--o{ PLAN_ADJUSTMENTS : "spawned by"

  ATHLETES {
    string id PK
    string name
    int age
    enum sex
    enum level
    string createdAt
  }
  ATHLETE_EVENTS {
    int id PK
    string eventCode
    bool isPrimary
    float prSeconds
  }
  GOALS {
    int id PK
    enum kind
    string notes
  }
  AVAILABILITY {
    string athleteId PK
    int daysPerWeek
    int sessionMinutes
    bool hasTrack
    bool hasGym
  }
  MEETS {
    int id PK
    string name
    string date
    enum priority
  }
  INJURY_HISTORY {
    int id PK
    string area
    enum severity
    bool active
  }
  WEEKLY_PLANS {
    int id PK
    string weekStartDate
    string focus
    string generatedByModel
    string createdAt
  }
  WORKOUTS {
    int id PK
    string date
    enum type
    string title
    int intensity
    int durationMin
    json blocks
    string whyExplanation
  }
  WORKOUT_LOGS {
    int id PK
    bool completed
    int rpe
    string notes
    string loggedAt
  }
  DAILY_READINESS {
    int id PK
    string date
    float sleepHours
    int soreness
    int fatigue
    int mood
  }
  PLAN_ADJUSTMENTS {
    int id PK
    string weekStartDate
    int weeklyPlanId
    int previousPlanId
    string note
    string model
    string appliedAt
  }
```

A few intentional design choices:

- **`eventCode` is a string**, not an enum, so adding `sprints_50m` or `mid_distance_800m` later doesn't require migrations.
- **`workout.blocks` is JSON**, so any event category (sprints, jumps, throws) can express its session shape without schema changes.
- **`PLAN_ADJUSTMENTS` keeps a pointer to `previousPlanId`** so an "undo" feature is one query away.
- **Single-athlete enforced in code**, not in schema — everything is keyed by `athleteId`, but `lib/athlete.ts` always returns `"me"`. Swap that function and the schema scales to multi-user.

---

## 6. Storage layer

[`db/fileStore.ts`](../db/fileStore.ts) is the entire persistence layer. About 100 lines of code.

```mermaid
flowchart LR
  caller[caller - server action or query]
  read[readStore]
  upd[updateStore fn]
  lock[promise-chain mutex - global]
  emptyDef[emptyStore defaults]
  diskA[(.data/store.json)]
  diskB[(.data/store.json - tmp file)]
  rename[rename tmp -> store.json - atomic]

  caller --> read
  read --> diskA
  diskA --> emptyDef
  emptyDef --> read

  caller --> upd
  upd --> lock
  lock --> read
  read --> upd
  upd -- "writes JSON" --> diskB
  diskB --> rename
  rename --> diskA
```

**Why each piece:**

- **No in-memory cache.** Every read hits disk. The file is small and a single user means concurrency is essentially zero, but more importantly Next.js dev hot-reload can spin up duplicate module instances, and an in-memory cache would desync them.
- **Atomic writes** (write to `*.tmp`, then `rename`) so a crash mid-write never corrupts the file.
- **Promise-chain mutex on `globalThis`** so two near-simultaneous server actions in one process can't read-modify-clobber each other.
- **Shallow-merged defaults** in `readStore()` mean we can add new collections / sequences to the schema without breaking existing `.data/store.json` files.

---

## 7. AI integration

The planner is the most interesting subsystem. It needs to produce **valid structured JSON** every time, because the rest of the app trusts those shapes.

```mermaid
flowchart TD
  start([generateWeeklyPlanFromContext ctx])
  build[Build athlete context JSON]
  prompt["Compose: SYSTEM_PROMPT (+ ADJUSTMENT addendum if revise) + user msg"]
  call[anthropic.messages.create]
  resp{Response stop_reason == tool_use?}
  parse[Find tool_use block, run WeeklyPlanSchema.safeParse]
  ok{zod ok?}
  retry["Append: 'previous response was invalid: ...' as new user turn"]
  done([Return plan])
  fail([Throw error])

  start --> build --> prompt
  prompt --> call --> resp
  resp -- yes --> parse
  resp -- no --> retry
  parse --> ok
  ok -- yes --> done
  ok -- no --> retry
  retry --> call
  retry -. "max 1 retry" .-> fail
```

### The "structured output" trick

Claude doesn't have OpenAI's `response_format: json_schema`. The closest equivalent is **forcing the model to call a specific tool**:

1. Define a single tool, `emit_weekly_plan`, whose `input_schema` is the JSON Schema for a `WeeklyPlan`.
2. Pass `tool_choice: { type: "tool", name: "emit_weekly_plan" }` — Claude is required to invoke that tool exactly once.
3. The tool's `input` field arrives already parsed as a JS object. We then run it through the zod `WeeklyPlanSchema` for belt-and-suspenders validation.
4. On schema failure we retry exactly once, appending the error message to the conversation so Claude can self-correct.

This pattern is what makes the rest of the system simple: by the time `generateWeeklyPlan` returns, every consumer can assume a valid, fully populated 7-day plan.

### Two modes: fresh vs revise

The same function powers both **first-time generation** and **adjustment**.

- **Fresh mode**: just the athlete context. System prompt = `SYSTEM_PROMPT`.
- **Revise mode**: triggered when `ctx.adjustmentNote` and `ctx.previousPlan` are both set. The user message includes the existing plan + the verbatim request. System prompt = `SYSTEM_PROMPT + ADJUSTMENT_PROMPT_ADDENDUM` ("preserve unchanged workouts, apply only what was requested, keep the date range"). Temperature drops to 0.5 in revise mode.

### The auth seam at the SDK level

[`lib/anthropic.ts`](../lib/anthropic.ts) is the only file that knows the Anthropic SDK exists. To switch model providers or add custom headers (e.g. an SFDC app-context header), edit that one file.

---

## 8. End-to-end request flows

### 8.1 Onboarding

```mermaid
sequenceDiagram
  participant Browser
  participant Wizard as OnboardingWizard - client
  participant Action as completeOnboarding - server action
  participant Zod as zod schema
  participant Store as fileStore.updateStore
  participant Disk as .data/store.json
  participant Router as next/navigation.redirect

  Browser->>Wizard: Fill 6 steps, click Finish
  Wizard->>Action: payload (typed OnboardingInput)
  Action->>Zod: safeParse
  alt invalid
    Zod-->>Action: error
    Action-->>Wizard: { ok: false, error }
    Wizard-->>Browser: red error banner
  else valid
    Zod-->>Action: parsed data
    Action->>Store: updateStore(mutateAll)
    Store->>Disk: read
    Disk-->>Store: snapshot
    Store->>Store: upsert athlete, replace events/goals/availability/meets/injuries
    Store->>Disk: write tmp + rename
    Action->>Router: redirect("/home")
    Router-->>Browser: 303 -> GET /home
  end
```

### 8.2 First weekly plan

```mermaid
sequenceDiagram
  participant Browser
  participant Btn as GeneratePlanButton - client
  participant Action as generateWeeklyPlan - server action
  participant Queries as lib/queries
  participant Planner as planGenerator
  participant SDK as anthropic SDK
  participant GW as Gateway / Claude
  participant Store as fileStore.updateStore

  Browser->>Btn: click "Generate this week's plan"
  Btn->>Action: generateWeeklyPlan({ force: false })
  Action->>Queries: getAthleteWithContext, getRecentReadiness, getRecentLogs
  Queries-->>Action: PlannerContext
  Action->>Planner: generateWeeklyPlanFromContext(ctx)
  Planner->>Planner: Build prompt + WeeklyPlanSchema JSON
  Planner->>SDK: messages.create({ tools, tool_choice: emit_weekly_plan })
  SDK->>GW: POST /v1/messages
  GW-->>SDK: tool_use { input: WeeklyPlan }
  SDK-->>Planner: parsed response
  Planner->>Planner: WeeklyPlanSchema.safeParse
  alt parse fails
    Planner->>SDK: retry once with error message appended
    SDK->>GW: POST /v1/messages
    GW-->>Planner: revised tool_use
  end
  Planner-->>Action: { plan, model }
  Action->>Store: updateStore - insert weekly_plan + 7 workouts
  Action-->>Btn: { ok: true, planId, created: true }
  Btn->>Browser: useTransition resolves, page re-renders
  Browser->>Action (via RSC): GET /plan
```

### 8.3 Adjust an existing plan (the newest feature)

```mermaid
sequenceDiagram
  participant Browser
  participant Card as AdjustPlanCard - client
  participant Action as adjustWeeklyPlan - server action
  participant Queries as lib/queries
  participant Planner as planGenerator - revise mode
  participant SDK as anthropic SDK
  participant Store as fileStore.updateStore

  Browser->>Card: type request, click "Apply adjustment"
  Card->>Action: adjustWeeklyPlan({ note })
  Action->>Queries: getCurrentWeekPlan
  Queries-->>Action: existing plan + 7 workouts (or null)
  alt no plan exists
    Action-->>Card: { ok: false, error: "Generate one first" }
  else plan exists
    Action->>Queries: getAthleteWithContext + recent readiness/logs
    Action->>Planner: ctx with adjustmentNote + previousPlan
    Planner->>SDK: messages.create with REVISE system prompt
    SDK-->>Planner: revised plan via tool_use
    Planner-->>Action: { plan, model }
    Action->>Store: updateStore - atomic: delete stale plan + workouts + stale logs, insert new plan + workouts, append PlanAdjustment row
    Action-->>Card: { ok: true, planId }
    Card->>Browser: router.refresh() -> new week grid + new entry in history timeline
  end
```

### 8.4 Daily logging

```mermaid
sequenceDiagram
  participant Browser
  participant Detail as plan/[workoutId] - RSC
  participant Form as LogForm - client
  participant Action as saveWorkoutLog - server action
  participant Store as fileStore.updateStore

  Browser->>Detail: GET /plan/123
  Detail-->>Browser: workout, existing log (if any)
  Browser->>Form: adjust RPE slider, type notes, click Save
  Form->>Action: saveWorkoutLog({ workoutId, rpe, notes })
  Action->>Store: updateStore - upsert workout_log
  Store-->>Action: ok
  Action-->>Form: { ok: true }
  Form->>Browser: router.push(/plan/123)
  Browser->>Detail: re-render with Logged badge
```

### 8.5 Recovery check-in

```mermaid
sequenceDiagram
  participant Browser
  participant Page as recovery - RSC
  participant Form as ReadinessForm - client
  participant Action as saveReadiness - server action
  participant Store as fileStore.updateStore

  Browser->>Page: GET /recovery
  Page-->>Browser: today's readiness (if any), last 7 days
  Browser->>Form: sliders + sleep input + Save
  Form->>Action: saveReadiness({ date, sleep, soreness, fatigue, mood })
  Action->>Store: updateStore - insert new readiness row
  Store-->>Action: ok
  Action-->>Form: { ok: true }
  Form->>Browser: router.refresh - dashboard readiness recomputes
```

### 8.6 Reading the dashboard (`/home`)

```mermaid
sequenceDiagram
  participant Browser
  participant Home as home/page.tsx - RSC
  participant Queries as lib/queries
  participant Domain as lib/sprintDomain
  participant Store as fileStore.readStore

  Browser->>Home: GET /home
  Home->>Queries: getAthlete + getAthleteWithContext
  Queries->>Store: readStore
  Store-->>Queries: data snapshot
  Queries-->>Home: athlete + events + goals + meets + injuries
  Home->>Queries: getCurrentWeekPlan(weekStart)
  Queries-->>Home: plan + workouts
  Home->>Queries: getReadinessForDate(today) + getRecentReadiness(7)
  Queries-->>Home: today + last 7
  Home->>Domain: readinessScore, averageReadiness, deriveSeasonPhase
  Domain-->>Home: scores + season phase
  Home-->>Browser: streamed HTML - today's card + 3 stat cards + weekly focus
```

---

## 9. Frontend rendering model

```mermaid
flowchart LR
  RSC[React Server Components]
  Client[Client islands]
  Stream[Streaming HTML]
  Hydrate[Hydration]

  RSC -- "DB reads, server-only logic" --> Stream
  Stream --> Browser
  RSC -- "embeds" --> Client
  Client -- "useState, useTransition, useRouter" --> Hydrate
```

We lean heavily on RSCs:

- **Pages are server components by default.** They fetch via `lib/queries.ts` (which hits the file store) and render full HTML.
- **Client components are islands.** Just the things that need interactivity: `OnboardingWizard`, `LogForm`, `ReadinessForm`, `GeneratePlanButton`, `AdjustPlanCard`, the charts. Each marked with `"use client"`.
- **Mutations go through Server Actions.** No `/api/*` route handlers. The action is imported as a function from the client island; Next.js wires up the RPC.
- **No global client state.** Each island manages its own form state; revalidation happens via `revalidatePath()` in actions plus `router.refresh()` from clients.

---

## 10. Seams (designed for easy replacement)

| Concern | Seam | How to replace |
|---|---|---|
| Single-user assumption | [`lib/athlete.ts`](../lib/athlete.ts) | Swap `getCurrentAthleteId()` to read from your auth provider's session |
| Storage backend | [`db/fileStore.ts`](../db/fileStore.ts) | Re-implement `readStore()` and `updateStore(fn)` against Postgres / SQLite / Supabase; consumers (`lib/queries.ts` + actions) call only those two |
| Model provider | [`lib/anthropic.ts`](../lib/anthropic.ts) | Replace with an OpenAI client (and rework `planGenerator.ts` to use `response_format` instead of `tool_use`) |
| Event-specific training rules | [`lib/sprintDomain.ts`](../lib/sprintDomain.ts) + the `SYSTEM_PROMPT` in `planGenerator.ts` | Flip `supported: true` on more entries in `ALL_EVENT_CATEGORIES`, extend the system prompt with per-event coaching principles |
| Output schema for plans | [`lib/ai/schemas.ts`](../lib/ai/schemas.ts) + JSON Schema in `planGenerator.ts` | Add new fields to both; zod validates on read |

---

## 11. What's deliberately out of scope (v1)

- Authentication, accounts, multi-user
- Mobile apps (responsive web only)
- Real-time/WebSocket features
- Wearable / Strava integration
- AI chat coach (free-form Q&A — easy add: another action calling `messages.create` without tools)
- Educational content with RAG (the Learn tab is a stub)
- Notifications / reminders
- Payment / premium tier

The seams above mean each of these can be added without disturbing the rest.

---

## 12. Reading the code in order (for someone new)

If you want to build a mental model fast, read these files in this order:

1. [`db/schema.ts`](../db/schema.ts) — what data exists
2. [`db/fileStore.ts`](../db/fileStore.ts) — how it persists
3. [`lib/queries.ts`](../lib/queries.ts) — how anything reads it
4. [`lib/sprintDomain.ts`](../lib/sprintDomain.ts) — sport-specific helpers
5. [`lib/ai/schemas.ts`](../lib/ai/schemas.ts) → [`lib/ai/planGenerator.ts`](../lib/ai/planGenerator.ts) → [`lib/anthropic.ts`](../lib/anthropic.ts) — the AI pipeline
6. [`app/actions/plan.ts`](../app/actions/plan.ts) and [`app/actions/log.ts`](../app/actions/log.ts) — every mutation
7. [`app/home/page.tsx`](../app/home/page.tsx) — a representative RSC
8. [`app/plan/page.tsx`](../app/plan/page.tsx) — the most feature-dense page (week grid + generate + adjust + history)
9. [`components/AdjustPlanCard.tsx`](../components/AdjustPlanCard.tsx) — a representative client island calling a server action with `useTransition`

That's the whole shape of the app.
