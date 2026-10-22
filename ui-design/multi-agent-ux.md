# CASETRACE — Multi-Agent UX Feasibility

**Branch:** `refactor/interface`
**Scope:** What can actually be visualized given the current backend contracts and frontend implementation.

---

## 1. Available Backend Evidence

The following data is available to the frontend via existing contracts.

### From `GET /api/investigations/[id]`
- `agents[]`: name, status (pending/running/completed/failed)
- `progress`: current_stage, completed_stages, total_stages, percent
- `status`: investigation lifecycle state
- `timeline[]`: reconstructed clinical events with source references
- `hypotheses[]`: with verdict, supporting/opposing anchors
- `limitations[]`

### From `GET /api/investigations/[id]/events`
- `sequence`: monotonic integer per investigation
- `type`: event type string (agent.started, tool.started, tool.completed, finding.proposed, etc.)
- `timestamp`: ISO 8601
- `payload`: varies by event type — includes `agent`, `agent_run_id`, `tool`, `tool_execution_id`, `record_count`, `source_refs`, `error_code`, `stage`, `task_id`, `lead_id`, etc.

### From `GET /api/investigations/[id]/tools`
- Per tool execution: `id`, `agent_run_id`, `agent` (name), `attempt`, `tool` (name), `status`, `arguments` (allowlisted scalars), `source_refs`, `started_at`, `completed_at`, `duration_ms`, `error_code`

### From `GET /api/investigations/[id]/findings`
- Per finding: `id`, `type`, `status`, `title`, `claim`, `claim_kind`, `support_level`, `anchors[]`, `alternatives[]`, `limitations[]`, `verification` (status, classification, checks[])

### From SSE stream
- Same event types as the events endpoint, delivered in real time
- `sequence` for deduplication and ordering

---

## 2. Three Visualization Approaches

### Approach A: Agent Execution Board

A grid of agent cards, each showing current status, last action, and tool call count. Events update the cards in real time.

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ RETRIEVAL AGENT  │  │ TIMELINE AGENT   │  │ LABORATORY AGENT │
│ ✓ Completed      │  │ ✓ Completed      │  │ ✓ Completed      │
│ 12 tool calls    │  │ 8 tool calls     │  │ 6 tool calls     │
│ Last: get_docs   │  │ Last: get_notes  │  │ Last: get_labs   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐
│ CONTRADICTION    │  │ SYNTHESIS AGENT  │
│ ● Running        │  │ ○ Pending        │
│ 3 tool calls     │  │ —                │
│ get_document...  │  │                  │
└──────────────────┘  └──────────────────┘
```

**Feasibility:** HIGH. All required data is available:
- Agent names and statuses from `investigation.agents[]`
- Tool call counts derivable from events filtered by `agent_run_id`
- Last action from most recent `tool.started` event for each agent

**Limitation:** Cannot show parallel execution timing accurately — the backend runs specialists concurrently but events are serialized in the stream. The board would show all three specialists as "running" simultaneously, which is accurate but not visually timed.

**Risk:** LOW. This is essentially what the current `AgentActivity` component does, but with a cleaner card layout.

---

### Approach B: Agent Workflow / Dependency Graph

A directed graph showing agent dependencies: Retrieval → [Timeline, Laboratory, Medication] → Contradiction → Synthesis.

```
[Retrieval] ──→ [Timeline]    ──→ [Contradiction] ──→ [Synthesis]
            ──→ [Laboratory]  ──↗
            ──→ [Medication]  ──↗
```

Nodes colored by status. Edges show dependency relationships.

**Feasibility:** MEDIUM-LOW. The dependency structure is documented in `multi-agent-architecture.md` but is NOT exposed as data by the backend. The frontend would need to hardcode the dependency graph for the known agent set.

**Available evidence:**
- Agent names and statuses: YES (from `investigation.agents[]`)
- Dependency edges: NO — not in any API response
- Parallel execution timing: NO — events are serialized

**Required frontend derivation:** The dependency graph would need to be hardcoded based on the known agent sequence (retrieval → specialists → contradiction → synthesis). This is a fixed workflow for the current implementation.

**Risk:** MEDIUM. Hardcoding the graph is acceptable for the current fixed workflow, but it would misrepresent the system if the workflow changes. It also cannot show adaptive strategy task dependencies, which are dynamic.

**Verdict:** Implementable with hardcoded edges for baseline strategy. NOT appropriate for adaptive strategy runs where task dependencies are dynamic and not exposed via the current API.

---

### Approach C: Hybrid Orchestration Visualization with Execution Details

Combines the workflow rail (stage-level progress) with the agent execution board (agent-level status) and an activity feed (tool-level detail). Three levels of granularity, progressively disclosed.

```
WORKFLOW STAGES (stage-level)
✓ Record Discovery → ✓ Timeline Analysis → ✓ Lab Analysis →
✓ Med Analysis → ● Contradiction Investigation → ○ Synthesis

AGENT EXECUTION BOARD (agent-level)
[Retrieval ✓ 12 calls] [Timeline ✓ 8 calls] [Lab ✓ 6 calls]
[Medication ✓ 4 calls] [Contradiction ● 3 calls] [Synthesis ○]

ACTIVITY FEED (tool-level, most recent)
● get_document · DOC-021 retrieved · 14:02:15
● get_lab_result · LAB-009 retrieved · 14:02:18
● verification.started · 14:02:20
```

**Feasibility:** HIGH. All three levels use available data:
- Stage level: `stage.*` events from the event stream
- Agent level: `investigation.agents[]` + event-derived tool counts
- Tool level: `tool.*` events from the stream + `GET /api/investigations/[id]/tools`

**Risk:** LOW. This is an extension of the current implementation, not a redesign.

---

## 3. Recommendation

**Recommended approach: Approach C (Hybrid)**

Reasons:
1. It uses only data that is actually available from the backend — no invented relationships.
2. It communicates three meaningful levels of investigation progress simultaneously.
3. It degrades gracefully: if stage events are absent (baseline run), the stage rail shows nothing; if tool events are absent, the activity feed shows nothing.
4. It does not require hardcoding agent dependencies, which would misrepresent adaptive runs.
5. It is an incremental improvement over the current implementation, not a rewrite.

The agent execution board (Approach A) should be the visual centerpiece of the agent section, replacing the current minimal status list. The workflow rail (already implemented) provides stage context. The activity feed (already implemented as `ActivitySummary`) provides tool-level detail.

---

## 4. Feasibility Matrix

| Visualization Element | Available Backend Evidence | Existing Frontend Capability | Required Transformation | Missing Data | Implementation Risk | Recommended Scope |
|---|---|---|---|---|---|---|
| Investigation status badge | `investigation.status` | ✓ `StatusBadge` | None | None | None | Include |
| Stage progress rail | `stage.*` events | ✓ `WorkflowRail` | Add status icons, timestamps | None | Low | Include |
| Stage progress bar | `progress.completed_stages/total_stages` | ✓ `<progress>` element | Format stage name | None | Low | Include |
| Agent status cards | `investigation.agents[]` | ✓ Partial in `AgentActivity` | Redesign as prominent cards | None | Low | Include |
| Agent tool call count | `tool.started` events filtered by `agent_run_id` | ✓ Derived in `AgentActivity` | Expose in agent card | None | Low | Include |
| Agent last action | Most recent `tool.started` per `agent_run_id` | ✓ Derivable | Add to agent card | None | Low | Include |
| Agent dependency graph | Hardcoded from architecture docs | ✗ Not implemented | Hardcode for baseline only | Dynamic edges for adaptive | Medium | Defer — misrepresents adaptive runs |
| Parallel execution timing | Not available (events serialized) | ✗ Not implemented | Cannot be accurate | Parallel timing data | High | Not appropriate |
| Tool execution list | `GET /api/investigations/[id]/tools` | ✓ `ToolInspector` | Pagination, formatting | None | Low | Include |
| Tool parameters | Allowlisted scalars in tools API | ✓ `ToolInspector` | None | Full parameters (by design) | None | Include with caveat |
| Tool source references | `source_refs` in tools API | ✓ `ToolInspector` | None | None | Low | Include |
| Activity feed (recent events) | SSE + events endpoint | ✓ `ActivitySummary` | Increase to 6–8 events | None | Low | Include |
| Finding lifecycle (proposed→verified) | `finding.*` events + findings endpoint | ✓ `FindingCard` | Visual upgrade animation | None | Low | Include |
| Finding verification checks | `finding.verification.checks[]` | ✓ `FindingCard` details | None | None | Low | Include |
| Task/lead activity | `task.*` / `lead.*` events | ✓ `TaskActivity` | Clarify baseline absence | None | Low | Include (with baseline notice) |
| Adaptive task dependencies | `event.payload.dependencies[]` | ✓ `TaskActivity` | None | None | Low | Include |
| SSE reconnection state | Connection state string | ✓ `useInvestigation` | Improve display | None | Low | Include |
| Investigation timeline | `investigation.timeline[]` | ✓ `InvestigationTimeline` | Add precision icons | None | Low | Include |
| Hypothesis comparison | `investigation.hypotheses[]` | ✓ `Hypotheses` | None | None | Low | Include |

---

## 5. What Must NOT Be Visualized

The following would misrepresent the system and must not be implemented:

| Element | Reason |
|---|---|
| Animated "thinking" indicators between tool calls | No backend event supports this; would fabricate agent reasoning |
| Agent-to-agent message bubbles or chat | Agents communicate through structured state, not messages |
| Parallel execution swimlanes with accurate timing | Event stream is serialized; timing would be invented |
| Confidence percentages on findings | Backend explicitly does not emit numerical confidence |
| "Agent decided to investigate X" narrative text | Chain-of-thought is not exposed; any such text would be fabricated |
| Real-time tool parameter streaming | Parameters are only available after execution via the audit endpoint |
| Dependency graph for adaptive runs | Dynamic task dependencies are not exposed in the current API |

---

## 6. Implementation Notes for Prompt 02+

The agent execution board should be implemented as a new `AgentBoard` component that:
1. Receives `investigation.agents[]` for role summaries
2. Receives the events array to derive per-agent tool call counts and last actions
3. Renders one card per agent with: name (humanized), status badge, tool call count, last action (humanized tool name), started/completed timestamps
4. Updates reactively as SSE events arrive

This replaces the current minimal agent status list in the workspace left panel and the verbose `AgentActivity` component (which moves to the Activity tab).
