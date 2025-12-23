Architecture improvements I would implement next (practical and high ROI)

Switch to a “route config” object to avoid 300+ lines of JSX routes.

Makes it easier to add sections (KSeF module, HR module, etc.)

Enables generating sidebar/nav from the same structure.

Add an AppGate component that handles:

auth loading

redirect decisions

domain bounce

logging
Then ProtectedRoute becomes tiny.

Add a dedicated PremiumUpsellPage route
Instead of opening dialogs in the guard, redirect to /premium?reason=accounting and let that page decide to open a dialog or show a plan comparison. Much more controllable.

Add explicit “role / team permission” guard
You already have TeamManagement. The next inevitable step is:

owner/admin/member roles

per-business-profile membership

route guards like RequireRole('admin')

Normalize invoice routes
You currently have:

/income/:id, /expense/:id, /invoices/:id

edit routes differ slightly (/income/edit/:id vs /expense/:id/edit)
It works, but it will create bugs later. Standardize:

/invoices/:id for detail

/invoices/:id/edit

query param or state for type if needed

One product-level insight from this router

Your app is no longer “invoicing”—it’s an operating system for a Polish entity, because you’ve already got:

spółka registry flows, resolutions, CIT dashboard

accounting shell, balance sheet, shareholders

inbox with received invoices / discussions

contracts hub + decisions hub

bank accounts, capital commitments/events

That is exactly the “KSeF forces a shared structure” narrative you’ve been developing. Your router already proves that story.