1) Recommended terminology and hierarchy
Level 1: “Dział firmy” (Business Area / Line of Business)

This is what your current “project switcher” is behaving like.

Examples:

SaaS (ksiegai.pl)

Budownictwo

Administracja nieruchomości

Transport zwierząt

This level is about:

separate invoice prefixes

separate reporting

separate decision trees

separate teams

separate default accounts/cost categories

Level 2: “Zlecenie / Kontrakt / Job / Projekt budowlany”

Inside the “Budownictwo” dział, you have many jobs:

Budowa domu – Kowalski – 2026

Remont dachu – Wspólnota X

Elewacja – Klient Y

This is the true “project” in construction sense.

2) How this maps to your current system (minimal change)

You do not need to rebuild everything. You can:

Keep your existing “Project” system internally as the scope system

Change UI label to “Działy” (or “Obszary”)

Add a sub-module inside each dział called:

Zlecenia (for Budownictwo)

Sprawy / Zgłoszenia (for Administracja)

Klienci / Umowy (for SaaS, maybe)

So the header selector becomes:

Dział: SaaS / Budownictwo / Administracja

And then within Budownictwo:

Zlecenia (list of jobs)

3) What each level owns (clear responsibilities)
Dział (Level 1) owns:

defaults and policies

invoice numbering prefix

budget style and reporting

decision framework (charter decisions at this level)

team membership defaults

integrations

Zlecenie / Kontrakt (Level 2) owns:

actual execution

kosztorys baseline

documents for that job (protocols, photos, WZ, invoices)

job profitability

job timeline/milestones

change orders

This cleanly solves your “projects inside projects” concern.

4) How decisions should work with this hierarchy

You get a perfect governance chain:

Company decisions (global)
→ Dział charter decisions (authorizing that line of business)
→ Zlecenie charter decision (accepting a specific job)
→ sub-decisions (budget changes, additional works, freeze, closure)

This is coherent and scalable.

5) What happens to your profitability tracking (it gets better)

Now you can report at two levels:

By dział (macro)

Budownictwo overall profitability

SaaS overall profitability

By zlecenie (micro)

which job made profit

which job caused losses

This matches how real businesses operate.

6) What to call things in Polish (suggestions)

For Level 1 (current “project”):

Działy

Obszary działalności

Linie biznesowe

Segmenty

My recommendation: Działy (simple, non-corporate, intuitive).

For Level 2:

Construction: Zlecenia or Kontrakty

Administration: Sprawy or Zlecenia (depending on workflow)

SaaS: Umowy / Klienci / Subskrypcje (different domain)

7) Minimal implementation path (no explosion)

Rename “Projekty” (Level 1) → Działy in UI copy

Keep the header selector exactly as-is

Inside the “Budownictwo” dział, add a new module: Zlecenia

Move kosztorys + job documents under Zlecenie, not under dział

Keep invoices/costs linkable to either:

dział (default)

plus optionally zlecenie (for detailed costing)

That last point is key:
Dział is always known; zlecenie is optional but recommended in construction.