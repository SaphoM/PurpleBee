# PurpleBee — Database Schema

Reference for the **live** Supabase schema (`kpiridirhzrzmbcwdxyb` — Purple B Production, eu-central-1), pulled 5 Nov 2026.
All tables live in the `public` schema. 35 app tables, 318 columns. Migrations source of truth: `supabase/migrations/` (31 files; the initial schema is `20260517155211_initial_schema.sql`).

> Column types shown as Postgres `data_type`. `uuid` columns flagged `→` reference `auth.users`/`profiles(id)`.

---

## Core entities

### `profiles` — one row per user (mirror of `auth.users`)
| column | type | notes |
|---|---|---|
| id | uuid PK | → `auth.users.id` |
| email | text | |
| name | text | display name |
| avatar | text | dicebear URL / data URL |
| role | `app_role` enum | `admin` · `manager` · `user` |
| title | text | job title |
| department | text | |
| notification_preferences | jsonb | per-channel toggles |
| last_seen_at | timestamptz | presence |
| created_at / updated_at | timestamptz | |

### `teams`
| id | uuid PK |
| name / description | text |
| created_by | uuid → profiles |
| created_at / updated_at | timestamptz |

### `team_members` — the team-scoping join (team_id is how RLS scopes most tables)
| id | uuid PK |
| team_id | uuid → teams |
| user_id | uuid → profiles (unique per team) |
| role | `app_role` |
| joined_at | timestamptz |

### `projects` — a project card + template + value + lifecycle
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name / description | text | editable inline (admin/manager) |
| icon | text | emoji **or** uploaded company-logo data URL |
| color | text | hex |
| template_id | text | primary template (drives icon/colour) |
| template_ids | text[] | **all** templates the project was created with (multi-template) |
| status | `project_status` enum | `planning` · `active` · `on-hold` · `completed` · `support` |
| team_id | uuid → teams | |
| created_by | uuid → profiles | |
| product_name | text | Product Sales only |
| attachments / links | jsonb | project references (docs, Figma, GitHub…) |
| value / currency | numeric / text | **never** in bulk select — read only via `get_project_value()` RPC |
| value_visibility | text | `admins` · `managers` · `team` · `selected` |
| value_visible_user_ids | uuid[] | when visibility = selected |
| card_display | jsonb | per-project card field toggles |
| project_type | text | `external` (default) · `internal` |
| project_lead_id | uuid → profiles | single accountable lead |
| planned_start_date / planned_completion_date | date | time-progress only (never stored as %) |
| **support_owner_id** | uuid → profiles | Support & Maintenance owner (set at completion handover) |
| created_at / updated_at | timestamptz | |

### `project_tasks` — template-driven checklist rows inside a project
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid → projects (cascade delete) | |
| title / description | text | |
| priority | `task_priority` enum | `low` · `medium` · `high` · `urgent` |
| estimated_hours | numeric | |
| tags | text[] | |
| assigned_to | uuid → profiles | primary (legacy single) |
| **assigned_to_ids** | uuid[] | **multi-assignee list** (source of truth) |
| order | int | ordering within the project |
| linked_task_id | uuid → tasks | the board task clone; drives live progress % |
| template_id | text | which template the task came from (tab grouping) |
| created_at / updated_at | timestamptz | |

---

## Board tasks

### `tasks` — the Kanban/List board
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| title / description | text | |
| status | `task_status` enum | `todo` · `in-progress` · `review` · `completed` |
| priority | `task_priority` enum | |
| assigned_to | uuid → profiles | primary (legacy single) |
| **assigned_to_ids** | uuid[] | **multi-assignee list** (source of truth) |
| due_date | timestamptz | |
| tags | text[] | |
| progress | int 0–100 | **the** value that drives "In Progress" (todo→0, in-progress→10, review→75, completed→100) |
| is_recurring / recurring_frequency / recurring_end_date / recurring_days_of_week | | recurrence |
| estimated_hours / actual_hours | numeric | time tracking |
| team_id / project_id / created_by | uuid | scoping |
| attachments / links | jsonb | file + reference links |
| created_at / updated_at | timestamptz | |

### `subtasks`
| id | uuid PK |
| task_id | uuid → tasks (cascade) |
| title | text |
| completed | boolean |
| order | int |
| created_at | timestamptz |

### `task_collaborators` — helpers/reviewers on a task (separate from assignees)
| id | uuid PK |
| task_id | uuid → tasks (cascade) |
| user_id | uuid → profiles |
| role | `collaborator_role` enum (`helper` · `reviewer`) |
| allocated_minutes | int |
| added_at | timestamptz |

### `progress_notes` — one row per progress change
| id | uuid PK |
| task_id | uuid → tasks |
| user_id | uuid → profiles |
| text | text |
| progress | int (snapshot at note time) |
| trigger | text (`drag` · `slider` · `mini-task` · `quick-set`) |
| created_at | timestamptz |

### `task_activity` — audit diff log
| id | uuid PK |
| task_id | uuid → tasks (taskTitle snapshot survives delete) |
| task_title | text (denormalised) |
| team_id | uuid → teams |
| actor_id / actor_name | uuid / text |
| action | text (`created` · `updated` · `deleted` · `attachment_added` · …) |
| field / old_value / new_value | text |
| created_at | timestamptz |

### `task_links`
| id | uuid PK, task_id uuid → tasks |
| title / url | text |
| type | `link_type` enum (`link` · `figma` · `github` · `notion` · `google-doc` · `google-drive` · `sharepoint` · `onedrive` · `loom` · `youtube` · `vimeo` · `discovery-meeting` · `wireframe` · `requirements` · `scope-doc`) |
| added_by / added_at | uuid / timestamptz |

### `attachments` — shared by tasks and messages
| id | uuid PK |
| task_id | uuid → tasks (nullable, cascade) |
| message_id | uuid → messages (nullable, cascade) |
| name / url / type / size / preview_url | text / bigint |
| uploaded_by | uuid → profiles |
| uploaded_at | timestamptz |

### `time_entries` — time tracking sessions
| id | uuid PK, task_id uuid → tasks, user_id uuid → profiles |
| started_at / ended_at | timestamptz |
| duration_minutes | numeric |
| created_at | timestamptz |

---

## Projects — value audit + value history

### `project_value_history` — every value/currency change (immutable audit trail)
| id | uuid PK, project_id uuid → projects, team_id uuid → teams |
| project_name / actor_name | text |
| actor_id | uuid → profiles |
| old_value / new_value | numeric, old_currency / new_currency text |
| created_at | timestamptz |

Read path: `project_value_history` rows are only fetched for admin/manager; the live value is read via the `get_project_value()` SECURITY DEFINER RPC which returns nulls when the caller isn't permitted.

---

## Chat (team chat)

### `conversations`
| id | uuid PK |
| type | `conversation_type` enum (`task` · `dm` · `team` · `announcement` · `telegram`) |
| name / description | text |
| task_id | uuid → tasks (nullable) |
| task_title | text (snapshot) |
| team_id | uuid → teams |
| pinned | boolean |
| created_at / updated_at | timestamptz |

### `conversation_participants`
| id | uuid PK, conversation_id uuid → conversations (cascade), user_id uuid → profiles |
| role | `app_role` |
| unread_count | int, last_read_at timestamptz, joined_at timestamptz |

### `messages`
| id | uuid PK, conversation_id uuid → conversations (cascade), sender_id uuid → profiles |
| text | text |
| reply_to | uuid → messages (nullable) |
| created_at / updated_at | timestamptz |

### `message_reactions`
| id | uuid PK, message_id uuid → messages, user_id uuid → profiles |
| emoji / created_at | text / timestamptz |

### `message_reads` — WhatsApp-style receipts
| id | uuid PK, message_id uuid → messages, user_id uuid → profiles |
| read_at | timestamptz |

---

## Notifications + activity

### `notifications`
| id | uuid PK, user_id uuid → profiles |
| type | `notification_type` enum (`task-assigned` · `task-due` · `task-completed` · `task-reopened` · `task-updated` · `attachment-added` · `mention` · `update` · `ai-insight` · `project-invite` · `project-updated`) |
| title / message | text |
| task_id / conversation_id | uuid (nullable) |
| read | boolean |
| action_url | text (deep link, e.g. `#tasks?taskId=…`) |
| created_at | timestamptz |

### `activity_log`
| id | uuid PK, user_id uuid → profiles |
| event_type / record_id / outcome | text |
| metadata | jsonb |
| event_timestamp | timestamptz |

### `ai_insights`
| id | uuid PK, user_id uuid → profiles |
| type | `ai_insight_type` enum (`recommendation` · `warning` · `suggestion` · `forecast`) |
| title / message / suggested_action | text |
| actionable | boolean, confidence int, dismissed boolean |
| created_at | timestamptz |

### `reports`
| id | uuid PK, user_id uuid → profiles |
| type | `report_type` enum (`daily` · `weekly` · `monthly`), period text |
| data | jsonb (snapshot payload) |
| generated_at | timestamptz |

---

## Media library

### `media_library` — central reusable image store (project/company logos)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| url | text | data URL or remote URL |
| name | text | original filename |
| size / type | int / text | bytes / MIME |
| team_id | uuid → teams | scoping |
| uploaded_by | uuid → profiles | |
| created_at | timestamptz | |

RLS: team members (and admins/managers) have full access scoped by `team_id` or `uploaded_by`. Mock mode stores the same shape in `localStorage['purplebee-media-library']` and never hits this table.

---

## Calendar, focus, settings, invites, presence

### `calendar_events`
| id | uuid PK, user_id uuid → profiles, task_id uuid → tasks (nullable) |
| title / description / color | text |
| start_date / end_date | timestamptz |
| all_day | boolean |
| created_at / updated_at | timestamptz |

### `focus_sessions`
| id | uuid PK, user_id uuid → profiles, task_id uuid → tasks (nullable) |
| duration / actual_duration / breaks / distractions | int |
| started_at / ended_at | timestamptz |
| completed | boolean |

### `user_settings`
| id | uuid PK, user_id uuid → profiles (unique) |
| dark_mode / show_tips / has_seen_welcome_tips | boolean |
| view_mode | `view_mode` enum (`kanban` · `list` · `calendar` · `timeline`) |
| notification_email / notification_push / notification_sound | boolean |
| created_at / updated_at | timestamptz |

### `invites`
| id | uuid PK, team_id uuid → teams, invited_by uuid → profiles, accepted_by uuid → profiles |
| email / department | text |
| role | `app_role` |
| token | uuid (acceptance link) |
| status | text (`pending` · `accepted` · `expired`) |
| expires_at / created_at / updated_at | timestamptz |

### `user_statuses` — ephemeral status posts
| id | uuid PK, user_id uuid → profiles, team_id uuid → teams |
| text / media_url / media_type | text |
| created_at / expires_at | timestamptz |

### `integrations`
| id | uuid PK, user_id uuid → profiles |
| type | `integration_type` enum (`whatsapp` · `telegram` · `slack` · `calendar` · `email`) |
| is_active | boolean |
| config | jsonb |
| created_at / updated_at | timestamptz |

---

## WhatsApp/Telegram bot (edge-function bridge)

### `bot_projects`
| id | text PK (mirrors the app project id) |
| name / icon | text |
| created_at / updated_at | timestamptz |

### `bot_project_members`
| id | uuid PK, project_id text → bot_projects, user_id text |
| created_at | timestamptz |

### `bot_tasks`
| id | uuid PK, user_id text, telegram_chat_id text, project_id text → bot_projects |
| project_name / title / description | text |
| status / priority | text |
| due_date | timestamptz |
| estimated_hours / progress | numeric / int |
| tags | text[] | subtasks jsonb |
| source_channel | text (`whatsapp` · `telegram` · `in-app`) |
| created_at / updated_at | timestamptz |

### `telegram_links`
| id | uuid PK, user_id text, telegram_user_id text |
| linked_at / created_at | timestamptz |

### `telegram_link_codes`
| code | text PK, user_id text |
| expires_at | timestamptz |
| used | boolean |
| created_at | timestamptz |

---

## Multi-assignee (added 5 Nov 2026)

`tasks.assigned_to_ids uuid[]` and `project_tasks.assigned_to_ids uuid[]` were added in `20261105130000_multi_assignee.sql`, backfilled from the legacy `assigned_to` single column (`ARRAY[assigned_to]`).

- App-side source of truth: `getAssigneeIds(task)` = `assignedToIds ∪ {assignedTo}`.
- RLS `tasks` SELECT/UPDATE now accept `assigned_to_ids @> ARRAY[auth.uid()]` in addition to `assigned_to = auth.uid()`.
- `tasks.fetchAll` widens its `OR` filter with `assigned_to_ids.cs.{userId}`, so co-assignees see the task without a team row.
- Project-scoped reads (`project_tasks`, `projects`) are unaffected — project RLS is team/creator/admin-based, no per-task assignee check exists there.

---

## Row Level Security

Every app table has RLS enabled (35/35). Highlights:

| table(s) | policy shape |
|---|---|
| `projects` SELECT | team members (`team_id`) + creator + `is_admin_or_manager()` |
| `projects` INSERT | `created_by = auth.uid()` |
| `projects` UPDATE / DELETE | creator + `is_admin_or_manager()` (this is what restricts name/lead/status edits to admin/manager server-side) |
| `project_tasks` ALL | project access (creator/team) + `is_admin_or_manager()` |
| `tasks` SELECT | assignee (single **or** multi-array) + creator + team + `is_admin_or_manager()` |
| `tasks` INSERT | any authenticated user |
| `tasks` UPDATE | assignee (single or multi) + creator + `is_admin_or_manager()` |
| `tasks` DELETE | creator + `is_admin_or_manager()` |
| `media_library` ALL | team members + uploader + `is_admin_or_manager()` |
| `project_value_history` | inserted fire-and-forget; fetched for managers/admins in the UI; value reads only via `get_project_value()` RPC |
| chat tables | conversation participants / team membership |

Helpers used by policies: `auth.uid()`, `is_admin_or_manager()`, `team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())`.

---

## Client ↔ DB mapping (app code)

| app layer | file | maps to |
|---|---|---|
| Types | `src/types/index.ts` | `Task`, `Project` (extended), `Notification`, `ChatMessage`, etc. |
| Project store | `src/stores/projectStore.ts` | `projects` + `project_tasks` (z-weighted reads/writes) |
| Task store | `src/stores/taskStore.ts` | `tasks` + `subtasks` + `task_activity` |
| User store | `src/stores/userStore.ts` | `profiles` + team membership + `title`/`department` |
| Data service | `src/lib/dataService.ts` | `projectDb`, `taskDb`, `mediaLibraryDb`, `projectValueHistoryDb`, … — every method gates on `shouldPersist(mockMode)` (mock ON → in-memory/localStorage only) |
| Persistence | `projectDb.fetchAll` | explicit column list — **deliberately excludes** `value`/`currency` (leak-safe); value fetched on demand via RPC |
| Mock mode | `keepMockData` (settings) | seeds (`seedProjects`, `mockTasks`, `teamProfiles`) vs DB hydration (`hydrateFromDb`) |

---

## Enums

| enum | values |
|---|---|
| `app_role` | admin, manager, user |
| `task_status` | todo, in-progress, review, completed |
| `task_priority` | low, medium, high, urgent |
| `project_status` | planning, active, on-hold, completed, **support** |
| `collaborator_role` | helper, reviewer |
| `conversation_type` | task, dm, team, announcement, telegram |
| `notification_type` | task-assigned, task-due, task-completed, task-reopened, task-updated, attachment-added, mention, update, ai-insight, project-invite, project-updated |
| `ai_insight_type` | recommendation, warning, suggestion, forecast |
| `report_type` | daily, weekly, monthly |
| `integration_type` | whatsapp, telegram, slack, calendar, email |
| `link_type` | link, figma, github, notion, google-doc, google-drive, sharepoint, onedrive, loom, youtube, vimeo, discovery-meeting, wireframe, requirements, scope-doc |
| `recurring_frequency` | daily, weekly, biweekly, monthly, yearly |
| `view_mode` | kanban, list, calendar, timeline |

---

## Migration history (31 files)

`20260517155211_initial_schema` (base) → references → telegram/bot → project value + card display → project type + planned dates → attachments/links → invites → chat receipts → user statuses → time entries → project lead + external default → **project enhancements** (20261105120000: `template_ids`, `support_owner_id`, `project_tasks.template_id`, `media_library`, `support` enum) → **multi-assignee** (20261105130000: `assigned_to_ids` on both task tables + RLS). All post-initial migrations are additive/idempotent (`IF NOT EXISTS`).
