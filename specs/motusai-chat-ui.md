# MotusAI Chat UI — Agent loop (Investigate → QA → Result)

> Slice: cinematic chat (`AnimatedAIChat`) ported from ChatAlphaMotusDAO into Hub-Psi.
> Use with **RootRouter MCP** + the existing **QA stop hook** (`.cursor/hooks/qa-loop.mjs`).

---

## Workspace

```
/Users/main/MotusDAO-Hub-Psi/motusdao-hub
```

Reference UI repo (read-only inspiration):

```
/Users/main/ChatAlphaMotusDAO
```

---

## Phases (one agent session or chained chats)

| Phase | Goal | RootRouter | Exit |
|-------|------|------------|------|
| **1. Investigate** | Map scope, anchors, regressions | `index_repo` + `select_context` | Written plan + files list |
| **2. Implement** | Minimal diff vs spec | skip (warm path) | Code matches AC |
| **3. QA** | Independent verification | optional `select_context` for test paths | Gate green + manual UI |
| **4. Result** | Handoff | `stats` | Summary + tokens saved |

---

## Phase 1 — Investigate (RootRouter required)

```text
MCP rootrouter:
1. index_repo — path: /Users/main/MotusDAO-Hub-Psi/motusdao-hub
2. index_repo — path: /Users/main/ChatAlphaMotusDAO, agentId: chat-alpha-motusdao
3. select_context — agentId: chat-alpha-motusdao, tokenBudget: 4000,
   query: "AnimatedAIChat motusai page UI scroll messages container api/chat role usuario psm"
4. select_context — tokenBudget: 4000,
   query: "MotusAI animated-ai-chat page motusai api/chat sessions jitsi WaaP role"
```

Then **Read** only:

- `specs/motusai-chat-ui.md` (this file)
- `components/ui/animated-ai-chat.tsx`
- `app/motusai/page.tsx`
- `app/api/chat/route.ts`
- Gaps from `select_context` chunks

Do **not** `@` whole folders.

---

## Phase 2 — Implement

Scope (locked):

- UI: `components/ui/animated-ai-chat.tsx`, `app/motusai/page.tsx`
- API: `/api/chat` only (no new `/api/motusai` unless spec updated)
- Preserve: usuario quick prompts, PSM Modo Supervisor, human therapist → `/api/sessions` + Jitsi
- No resizable panels / drag handles

Non-goals:

- Topbar `LiquidGlass` port (separate slice)
- Chat history persistence in DB
- Auth gate redirect like ChatAlpha (`/` → login only)

---

## Acceptance criteria

| ID | Criterion | How to verify |
|----|-----------|---------------|
| AC-1 | Chat uses `AnimatedAIChat` centered `max-w-2xl` | Visual / code |
| AC-2 | Send message calls `POST /api/chat` with `{ messages }` | Network tab |
| AC-3 | PSM: disclaimer banner + Modo Supervisor + caso clínico ejemplo | UI role=psm |
| AC-4 | Usuario: ansiedad, relajación, terapeuta humano | UI role=usuario |
| AC-5 | Assistant markdown + RAG sources render | Send question with RAG on |
| AC-6 | **Scroll stays inside message panel** — page does not jump on send | Manual QA |
| AC-7 | `npx tsc --noEmit` passes | Gate |
| AC-8 | `npm run lint` passes on touched files | Gate |

---

## Phase 3 — QA (loop hook)

Enable the Cursor stop hook for this slice:

```bash
export MOTUS_QA_LOOP=1
export MOTUS_ACTIVE_SPEC=specs/motusai-chat-ui.md
export MOTUS_QA_TYPECHECK=1
export MOTUS_QA_CMDS="npm run lint;;npx tsc --noEmit"
```

Manual UI checklist (`/motusai`):

1. Send a message — **page body must not scroll**; only the message list scrolls.
2. Long thread — input stays visible at bottom.
3. Mobile width — chips wrap; no horizontal page scroll.
4. Toggle theme light/dark — readable contrast.
5. PSM: supervisor prompt returns 5-section markdown.

Optional: read-only subagent prompt:

```text
Read specs/motusai-chat-ui.md. Verify AC-1..AC-8 against
components/ui/animated-ai-chat.tsx and app/motusai/page.tsx only.
Report pass/fail per AC with file:line evidence. Do not edit files.
```

---

## Phase 4 — Result (handoff)

```text
MCP rootrouter: stats
```

Deliver:

- What changed (2–3 bullets)
- AC table pass/fail
- RootRouter tokens saved
- Known follow-ups (if any)

---

## Copy-paste — full Cursor Agent prompt

```text
Workspace: /Users/main/MotusDAO-Hub-Psi/motusdao-hub

## Loop: Investigate → Implement → QA → Result
Follow specs/motusai-chat-ui.md

### 1 Investigate (RootRouter first)
- index_repo /Users/main/MotusDAO-Hub-Psi/motusdao-hub
- index_repo /Users/main/ChatAlphaMotusDAO agentId chat-alpha-motusdao
- select_context (both repos) per spec queries
- Read spec + anchor files only

### 2 Implement
Fix/improve MotusAI chat per acceptance criteria. Minimal diff.

### 3 QA
User reports page scrolls down on send — AC-6 is priority.
Run lint + tsc. Manual scroll test.

### 4 Result
rootrouter stats + AC checklist + short summary
```

---

## Cursor `/loop` (optional recurring QA)

For repeated UI smoke while iterating:

```text
/loop 10m QA MotusAI: open specs/motusai-chat-ui.md, verify AC-6 scroll behavior
in components/ui/animated-ai-chat.tsx (messagesContainerRef scroll, overscroll-y-contain).
Report pass/fail only.
```

---

## Exit conditions

Loop ends when:

- All AC pass
- `MOTUS_QA_LOOP` gate commands green (or hook disabled)
- User confirms UI on `/motusai`
