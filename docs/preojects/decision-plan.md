a governance tree:

Company governance (global)

Project governance (scoped)

Sub-resolutions under a project

Project lifecycle states (active / frozen / closed) that cascade

This can be implemented in a way that is legally coherent for Sp. z o.o., while still staying optional and “grandma-safe” for JDG.

Below is a clean design that matches your intent.

1) Model: Decisions as a hierarchy with scopes
Two top-level scopes

Company decisions (global)
“Zgody i uchwały spółki” — apply to everything.

Project decisions (scoped)
“Uchwały dla projektu X” — apply only to that project.

One special decision type: “Project Charter”

When a project is created, the core legal artifact is a decision/resolution that:

creates the project as an economic initiative

defines the scope and authority

Call it:

“Uchwała o uruchomieniu projektu”
or softer:

“Decyzja o uruchomieniu obszaru działalności”

This “charter” becomes the parent for project-specific decisions.

2) Project = governance container, not just a label

A project should have:

name, description

optional roadmap metadata (not tasks; governance milestones)

lifecycle status: active | frozen | closed | archived

founding decision (charter decision)

This makes your statement true:

“Project exists because a decision created it.”

3) Roadmap: keep it governance-grade, not Trello

You can store a “roadmap” for a project as a sequence of governance milestones, not tasks.

Examples of milestones:

“Zatwierdzono budżet”

“Wybrano dostawcę”

“Podpisano umowę ramową”

“Start sprzedaży”

“Zamrożono projekt”

Each milestone can be represented as either:

a decision

or a decision-linked event

So the roadmap is basically the timeline of decisions + key actions.

That’s consistent with your ledger/event log vision.

4) Sub-resolutions (project decisions) and inheritance

Every project-specific decision should have:

project_id

optional parent_decision_id (default: the project charter)

This forms a tree:

Company decision
→ Project charter decision (creates Project A)
→ Decision: budget for Project A
→ Decision: approve contract #1
→ Decision: approve hiring for Project A

This gives you:

traceability

authority chain

audit clarity

5) Freezing a project: what it means and how it cascades

Your idea is solid: a freeze resolution should affect everything under that project.

Define a “freeze decision”

“Uchwała o zamrożeniu projektu”

This updates project status: frozen

Cascade behavior (important)

When project is frozen:

Hard blocks

cannot issue new invoices under that project

cannot create new costs/expenses under that project

cannot create new project decisions (“sub-resolutions”)

Allowed

viewing history

reconciliation of existing bank payments

closing settlements already in motion

generating reports

Soft optional

allow “exception” decisions:

“Zgoda na wyjątek (freeze override)”

only for authorized roles

This keeps the system usable while respecting governance.

Does it “freeze sub-resolutions”?

In practice, you do not “freeze past decisions” (they already exist).
What freezes is their ability to spawn new actions.

So the cascade is:

past decisions remain valid records

but the project enters a state where no new actions can be initiated without an explicit override decision.

That is legally and operationally coherent.

6) Company decisions vs project decisions: how users experience it
In “Cała firma”

Decisions show grouped:

Company-level

Projects (each project has its own decision subtree)

In Project view

Default: show only project decisions

Optional toggle: “Pokaż decyzje firmy” (read-only context)

This makes project governance feel like its own world, without hiding the parent company context.

7) Grandma-safe fallback (non-spółka users)

For JDG or simple users:

projects remain optional groupings

charter decision is optional and can be auto-created silently or hidden

You can have an internal default:

if user never uses decisions, project still works

decisions appear only in advanced mode / spółka mode

So your governance tree becomes a “pro” layer, not mandatory complexity.

8) What to build first (minimal version that proves the concept)

Phase 1:

project has status: active/frozen

project can have “charter decision” link

decisions can be tagged to a project

if project is frozen → block new invoices/costs/decisions under it

Phase 2:

decision hierarchy (parent/child)

roadmap view is basically decision timeline + key events

Phase 3:

override/exception decisions + role-based permissions