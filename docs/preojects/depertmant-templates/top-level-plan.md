Goal

We want the Contracts (Umowy) area to adapt automatically based on the Department (Dział) the contract belongs to, without fragmenting the system or confusing users.

The same core contract system must work for:

Construction

Property administration (wspólnoty)

SaaS

Funeral homes (nekrolog)

Sales / operations
…while still feeling like one product, not many mini-apps.

Core Principle (Important)

A contract is always the same legal object.
Departments only change context, defaults, and workflow.

This avoids duplication, keeps accounting unified, and preserves legal consistency.

Mental Model (Hierarchy)
Company
 ├─ Departments (Działy)
 │   ├─ Contracts (Umowy)
 │   │   ├─ Linked decisions
 │   │   ├─ Linked invoices
 │   │   ├─ Linked jobs / projects (optional)
 │   │   └─ Linked documents
 │   └─ Templates & rules


So:

Department = organizational context

Contract = legal anchor

Everything else attaches to the contract

How the Contracts Page Should Adapt
1. One Contracts Page, Many “Views”

There is still one /contracts section, but it changes based on:

selected Department

or Full Company View

If no department is selected

User sees:

“All contracts in company”

Simple list

No extra fields

Grandma-safe mode

If a department is selected

Contracts page becomes department-aware.

Department Templates → Contract Behavior

Each Department Template defines:

A. Contract Categories (Left Sidebar)

Different departments show different contract groupings.

Examples:

Construction (Budownictwo)

Umowy z klientami

Umowy z podwykonawcami

Umowy materiałowe

Aneksy

Protokoły odbioru (linked, not contracts themselves)

Property Administration (Administracja)

Umowy zarządcze

Umowy serwisowe

Umowy sprzątania / ochrony

Umowy techniczne

Uchwały wspólnoty (linked decisions)

SaaS / Product

Umowy B2B

Regulaminy

Umowy subskrypcyjne

Umowy partnerskie

NDA

Funeral Home (Nekrolog)

Umowy z rodziną

Umowy usługowe (transport, kremacja)

Umowy cmentarne

Umowy podwykonawcze

Zlecenia jednorazowe

Same contract table, different folders and labels.

B. Contract Metadata (Visible Fields)

Department decides which fields are:

visible

optional

hidden

Examples:

Construction contract shows:

inwestycja / adres

kosztorys powiązany

etap realizacji

protokół odbioru (status)

Administration contract shows:

wspólnota / budynek

okres obowiązywania

stawka miesięczna

liczba lokali

SaaS contract shows:

plan

billing cycle

SLA

auto-renew

Same contract model. Different lenses.

C. Default Links (Automatic)

When creating a contract inside a department:

The system automatically:

links it to the department

suggests relevant decision type

suggests correct document folder

sets default invoice behavior

Example:

Construction → contract automatically expects:

decision: “Zgoda na realizację projektu”

invoices linked to kosztorys

Funeral → contract expects:

decision: “Zgoda na wykonanie usługi pogrzebowej”

one-time invoice

Contract Creation Flow (Low Friction)
Grandma path:

Click “New contract”

Fill name + contractor

Done

Power user path:

Department pre-selected

Template applied

Extra fields unlocked

Workflow visible

No one is forced into complexity.

Contracts + Decisions (Very Important)

Departments do not change decision system.
They scope it.

Rule:

A contract always references one or more decisions.

Department template defines:

which decision categories are expected

whether decision is required or optional

Example:

Construction contract → must have “Approval for costs”

SaaS contract → must have “Approval for commercial terms”

Funeral contract → must have “Authorization from family”

This keeps your legal/audit model intact.

Contracts + Jobs / Projects (Optional Layer)

You already noticed this correctly:

Department ≠ Project

Department can contain many projects/jobs

So:

Contract can optionally link to:

one job

many jobs

no jobs

Construction:

One contract → many construction jobs

Administration:

One contract → ongoing service, no “project” needed

Funeral:

One contract → one case/job

This stays optional and does not pollute simple flows.

Inbox / Ledger / Analytics (Why This Works)

Because everything still links to:

contract

department

decision

You can now:

see profitability per department

compare construction vs administration

audit contracts by department

restrict employee access per department

Without duplicating accounting.

Summary for Your AI (Short Version)

We are not creating multiple contract systems.
We are creating department-aware contract views.

Departments define:

how contracts are grouped

which metadata is visible

which decisions are expected

which workflows are suggested

Contracts remain legally identical across the system.

