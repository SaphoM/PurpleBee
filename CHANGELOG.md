# Changelog

## features/intergration — Telegram bot & in-app chat task management

### Added
- **Telegram bot (@PurpleBee2bot) task management** — full Create / Edit / Delete Task conversation flow, mirrored in the in-app chat widget:
  - Create Task: pick a project → pick one of your existing tasks there (to add details) or type a new title → subtasks → description → status → priority → due date → estimated hours → tags
  - Edit Task: pick a project → pick an existing task → menu-driven edits (description, status, priority, due date, hours, tags, subtasks, progress) applied immediately
  - Delete Task: only tasks the requester created are shown/selectable — enforced both in the UI (delete button hidden) and in the bot flow (creator-filtered list + rejection message as a safety net)
  - Project and task lists are paginated (3 at a time with "Show more") for users with many projects/tasks; a "➕ New Task" option is always visible on the task-pick step
  - Due date accepts natural language ("today", "tomorrow", "Friday", "next week") in addition to YYYY-MM-DD; Telegram also gets a native tappable quick-reply keyboard for these options
- **Telegram account linking** — Settings → Connect Telegram generates a short-lived code and deep link (`t.me/PurpleBee2bot?start=<code>`); linking a Telegram chat to a Purple Bee account switches that chat into **database mode**, where all task data reads/writes go straight to Supabase (`bot_projects`, `bot_project_members`, `bot_tasks`) instead of the in-memory/reset-mode snapshot
- **Task ownership (`createdBy`)** — added to the `Task` model and backfilled on all creation paths (in-app modal, chat widget, bot flows); only the creator can delete a task, everywhere (Tasks page UI, in-app widget, and the bot's Delete flow)
- **Dashboard** — Priority Distribution now reflects only active tasks (To Do / In Progress / Review), with a distinct "You're all caught up!" empty state when nothing is left to do

### Changed
- **WhatsApp reverted to its original, default behaviour** — verifies the webhook and logs/emits incoming messages only. It does **not** run the Create/Edit/Delete Task conversation flow; that's Telegram and the in-app widget only.

### New database tables (Supabase migrations)
- `telegram_links`, `telegram_link_codes` — account linking
- `bot_projects`, `bot_project_members` — project membership for authenticated bot users
- `bot_tasks` (+ `progress` column) — durable task storage for authenticated bot users, separate from `public.tasks` since that table's `assigned_to`/`created_by` are UUID (tied to Supabase Auth, which this app doesn't use yet) and can't hold this app's text user IDs
