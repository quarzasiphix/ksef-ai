We want to introduce a Project system into the application in a way that is fully optional, low-friction, and invisible for simple users, while still powerful for advanced users.

This is not a task manager or kanban feature.
A “Project” is only a logical grouping of activity inside one company (invoices, income, costs, reports).

Core philosophy (very important)

Projects must never be forced on the user.

For users with only one activity, the application must behave exactly as it does today.

The user should not need to understand what a project is unless they explicitly create more than one.

The system should feel like:

“normal accounting” for beginners,

“multi-activity accounting” for power users.

Where projects live
A user can:

add projects in Settings,

edit them,

archive them.

Nothing else changes unless more than one project exists.

The Project selector in the header must only appear when a company has 2 or more active projects.

If a company has 0 or 1 project:

The UI stays exactly as it is now.

There is no project selector anywhere.

Everything works as a full company view.

If a company has 2 or more projects:

A Project selector appears in the header bar.

It appears next to the workspace tabs (Skrzynka / Faktury / Kontrakty).

This is the only global place where project switching happens.

This rule is strict.

Meaning of “All projects”

The selector must always include a top option called:

“Cała firma”

This means:

full company view,

no filtering,

showing each project within 1 ledger. 

Do not call this “All projects” in the UI — the language must be business-friendly.

How project selection works conceptually

Selecting a project does not change modes and does not navigate away.

It simply:

narrows the scope of data shown across the app:

dashboard,

income,

expenses,

invoices,

reports.

by default creates documents like invoices, customers clients products, to the project. 
and also in the document new systems, we will have to implement a way to select with a project, in a similar way we have to select decisions, to a document, 

so i think every company should have a default project their business exists in, in a way to make it backwards compatible, so the current view of everything we have, is just default, 
and once a new a project exists in a company. 

The user should always feel:

“I’m still in the same app, just looking at a narrower slice.”

Behavior for documents and data

Documents may internally belong to a project or be unassigned.

Unassigned documents:

are visible in “Cała firma”,

are hidden when a specific project is selected.

The system should never force the user to fix this unless they choose to.

Project assignment must remain:

optional,

quiet,

non-blocking.

UX tone and restraint

Do not introduce new complexity in core flows.

Do not add warnings, modals, or tooltips about projects by default.

Do not expose project language unless the selector is visible.

For users who never add a second project:

the app should feel unchanged forever.

For users who do:

the feature should feel natural and powerful.

Mental model to preserve

Beginner user thinks:
“I have one company.”

Advanced user thinks:
“I have several types of activity inside one company.”

The same system must support both without asking the user to decide upfront.

Summary

Projects exist quietly in the background.

They become visible only when the user proves they need them by creating more than one.

The header selector appears only then, defaults to Cała firma, and acts as a global scope filter, not a mode switch.

This is a deliberate design choice and must be preserved.


add projects to settings "C:\Users\quarza\Documents\projects\ksef-fix\LATEST\ksef-ai\src\modules\settings"

Projects should be managed in the Settings module under a new "Projects" section.

The Projects section should include:
- List of all projects with status (active/archived)
- Ability to add new projects with name and description
- Ability to edit existing projects
- Ability to archive projects
- Default project selection with clear indication

When a project is archived, all documents assigned to it should become unassigned and visible in "Cała firma".

Project creation should include a brief description field to help users understand the purpose of each project.

Project editing should allow renaming and updating the description, but not changing the project's document assignments.

Archived projects should be hidden from the project selector by default, with an option to show them in the settings.

The default project should be automatically selected when a new project is created, and users should be able to change this default at any time from the settings.

All project-related functionality should be accessible only through the Settings module, maintaining the principle that projects are optional and invisible until needed.

        