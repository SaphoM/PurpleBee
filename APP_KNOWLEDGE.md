# PurpleBee — App Guide

This document explains, in plain language, what PurpleBee is, every page and
feature it has, the words it uses, and how to do common tasks. It is written
for people using the app (and it also powers the in-app assistant on the
AI Insights page).

---

## 1. What PurpleBee is for and who uses it

PurpleBee is a team productivity workspace. It brings together:

- **Tasks and projects** (plan work, assign it, track it to completion)
- **A shared calendar** (see what is due when)
- **Analytics** (charts about the team's work)
- **A team directory** (who is online, what they are working on)
- **Team chat** (announcements, project channels, direct messages, voice notes)
- **AI Insights** (automatic analysis of your team's task data, plus a
  help assistant)

It is used by a company's staff every day: **members** do their assigned
work, **managers** coordinate projects and people, and **admins** run the
workspace (invite people, manage roles, post announcements).

Everything you see belongs to **your team workspace**. Only people in your
team can see your team's data — that is enforced in the database, not just
the interface.

---

## 2. Every page and what it does

The pages are listed in the left sidebar. The address bar uses "hash" links
(for example `#tasks`), so each page has its own bookmarkable address.

### Login page (first screen)
- **Quick Login** lists existing accounts so you can sign in with one click
  (a demo convenience for this workspace). If you don't want to see it, tick
  **"Don't show Quick Login again"**.
- **Email & Password** sign-in for normal use.
- **Create Account** registers a new user (name, email, password).
- People who were **invited** land on an invite page with their name and
  email pre-filled; they set their own password and join the team.
- **Forgot password?** sends a reset link to your email; you choose a new
  password on a special reset page.

### Dashboard (`#dashboard`)
A live overview:
- Counts of your tasks by status (To Do, In Progress, Review, Completed)
  and by priority (Low, Medium, High, Urgent).
- Upcoming and overdue tasks with days-until-due.
- Recent activity across the team and project progress summaries.
- The dashboard has two visual styles, **Classic** and **Modern** — you pick
  one in Settings → Appearance.

### Projects (`#projects`)
The team's projects, each with its own tasks and members.
- Create a project (name, description, colour).
- Open a project to see its tasks on a board, its members, and its progress.
- Assign tasks to members; admins/managers can also use **"Assign all to…"**
  to hand every unassigned project task to one person in a single step.
- Project cards show progress bars and how many tasks are done/open.

### Tasks (`#tasks`)
Your personal task board — every task assigned to you or created by you.
- Two views: **List** and **Kanban** (drag cards between columns to change
  status).
- Each task has: title, optional description, **status** (To Do → In
  Progress → Review → Completed), **priority** (Low/Medium/High/Urgent),
  a **due date** (required when creating — the past is not allowed),
  tags, progress percentage, subtasks, file attachments, links, and
  progress notes.
- Filters and search narrow the list by status, priority, project, or word.
- Tasks can be **recurring** (repeat on a pattern).
- Clicking a task opens its detail panel with everything about it.

### Calendar (`#calendar`)
A month/week calendar showing your tasks on their due dates, so you can see
busy periods and deadlines at a glance.

### Analytics (`#charts`)
Charts computed from real task data:
- Task status distribution and priority mix.
- Workload per team member.
- Completion trends over time (velocity).
Useful in team meetings to see where work is piling up.

### Team (`#team`)
The people directory.
- Each member shows their role badge (Admin / Manager / Member), how many
  tasks they have, and their workload.
- **Online now** (green dot) and **Last seen** tell you who is around.
- **Admins can invite new members** by email; the invite link lets the
  person set their own password and join. Admins can also change roles and
  remove members.

### Chat (`#chat`)
Team messaging, WhatsApp-style.
- **Categories** at the top: **Announcements** (team-wide channel — admins
  post news here), **Direct** (private one-to-one messages with any team
  member), and one category per project (task discussions).
- **Statuses** (stories): right above the category tabs, round profile
  pictures show temporary **statuses** — short text or a photo that
  disappears after **24 hours**. Tap "Add status" to post one; tap someone's
  circle to view theirs. You can have **one status at a time** — posting a
  new one replaces your old one. You can delete your own status any time.
- **Messages** show read receipts: one grey tick = sent, two grey ticks =
  delivered, two blue ticks = seen. You can also see who has read an
  announcement. Typing indicators appear while someone writes.
- **Voice notes**: the **microphone button** in the message box records a
  short voice message and sends it (hold-to-talk is not needed — click to
  start, click to stop & send, or cancel). Receivers get an audio player
  right in the chat. Your browser may ask for microphone permission the
  first time; if your device has no microphone, the button is hidden.
- **Attachments**: the paperclip attaches images (with preview), PDFs,
  documents, spreadsheets, text files, or zips.
- **Reactions**: right-click (or long-press) a message to react with an
  emoji, reply, copy, edit, or delete it. Deleted messages leave a "This
  message was deleted" placeholder.
- Hovering a member's name shows their profile (role, tasks, online state).

### AI Insights (`#ai-insights`)
An automatic analysis of your team's **task data** — see section 3 below for
how to read it. There is also a small **assistant bubble** in the
bottom-right corner ("Hello there 👋 Ask me anything") — a helper that
answers questions **about how to use PurpleBee**. It only knows things from
this guide; it is not a general chatbot.

### Settings (`#settings`)
Four tabs:
- **Account**: your name, email, role, and **profile picture** (click the
  camera overlay on your avatar to upload a new picture), and **Change
  password** (current password + new password, applied immediately — no
  email needed).
- **Notifications**: choose which in-app notification types you want (task
  assigned, task due soon, task completed, project invite, mentions, general
  updates, AI insights) and allow browser notifications.
- **Appearance**: light/dark mode, accent colour (Purple, Blue, Green,
  Amber, Red, Pink), dashboard style (Classic/Modern), and other display
  options.
- **General**: workspace/team info and app preferences (including hiding
  Quick Login).

### Extra UI pieces
- **Purple Bee Bot** (bottom-right chat bubble on most pages): a guided
  assistant for quick task updates — create, edit, or delete tasks by
  answering its questions, without leaving your page.
- **Welcome tips**: a short tour shown on first login (can be reopened).
- **Session warning**: before you are logged out for inactivity, a warning
  appears so you can stay signed in.
- A notification **bell** in the top bar lists recent events and links to
  them.

---

## 3. Key concepts, words, and data fields

**Workspace / team** — the company instance of PurpleBee (currently one
team, "X Spark"). All data belongs to it.

**Roles**
- **Member** — works on tasks assigned to them, chats, sees their projects.
- **Manager** — everything a member can do, plus managing projects and work
  distribution.
- **Admin** — everything, plus inviting/removing people, changing roles,
  and posting team announcements.

**Task** — a unit of work.
- *Status*: `To Do`, `In Progress`, `Review`, `Completed`.
- *Priority*: `Low`, `Medium`, `High`, `Urgent`.
- *Due date*: required at creation; cannot be in the past; drives
  calendar placement, overdue warnings, and notifications.
- *Subtasks*: small checklist items inside a task.
- *Progress*: 0–100%, plus dated **progress notes** to log how work went.
- *Attachments / links*: files and URLs stored on the task.
- *Recurring*: the task re-creates itself on a pattern.

**Project** — a container for related tasks and members, with its own
progress summary.

**Conversation** — a chat thread. Types: **announcement** (everyone in the
team), **direct** (two people), **project** (everyone in a project).
A "category" in the chat sidebar groups conversations by type.

**Message receipts** — sent (1 grey tick) / delivered (2 grey ticks) /
seen (2 blue ticks). Driven by real delivery and read events.

**Status (story)** — a temporary profile update (text or photo) visible in
the chat sidebar for 24 hours, then automatically removed. One per person.

**Voice note** — a recorded audio message; stored like an attachment and
played inline.

**Attachment** — a file stored in the workspace's storage; images show a
preview, other types show as a file chip.

**Notification** — in-app (bell + toasts) and optional browser popups, with
per-type preferences.

**AI Score** (on AI Insights) — a 0–100 number summarising task health:
how much work is done, on time, and not stuck. Higher is better.

**Insight card** (on AI Insights) — one suggestion or warning computed
from task data. Categories:
- **Productivity** — what's going well (e.g. completion rates, focus areas).
- **Risks** — problems forming (overdue work, too many urgent tasks,
  bottlenecks, people carrying too much).
- **Suggestions** — concrete next steps (e.g. reassign overdue work,
  clear the review queue).
- **Forecasts** — rough predictions (e.g. when current work will finish,
  expected workload trend).
Each card has a severity: **critical** (red — deal with it now), **warning**
(amber), **success** (green), **info** (blue). Use the thumbs up/down on a
card to say whether it helped; use the filter chips to show only one
category.

---

## 4. How to do common tasks, step by step

**Sign in** — open the app, use Quick Login or the Email & Password tab.

**Create a project** — Projects page → New Project → name (and colour/
description) → Create. Then open it to add tasks and members.

**Create a task** — Tasks page (or a project board) → New Task → fill in
title, project, assignee, priority, and a due date (required) → Create.
The same modal appears from the Purple Bee Bot if you prefer guided steps.

**Move a task to the next stage** — on the Kanban view, drag the card to
the next column, or open the task and change its status.

**Invite a teammate** — Team page (admin) → Invite → their email and role →
Send. Share the invite link it produces; the person sets their own password.

**Send a message** — Chat → pick Announcements, a Direct chat, or a project
category → type → Enter (or the send button).

**Post an announcement** — Chat → Announcements category → type your
message → send. Everyone in the team sees it (and may also get an
email/Telegram notification, depending on workspace settings).

**Attach a file** — paperclip button in the message box → choose the file →
send. Images show thumbnails.

**Send a voice note** — microphone button in the message box → speak →
click the red button again to send (or the X to cancel).

**Post a status** — Chat → tap **Add status** (first circle) → type a short
message or add a photo → Post. It disappears after 24 hours.

**View someone's status** — tap their circle in the statuses row.

**Change your profile picture** — Settings → Account → click your avatar
(the small camera badge on it) → choose an image (up to 5 MB).

**Change your password** — Settings → Account → Change password → current +
new password. (If you've forgotten it, use "Forgot password?" on the login
page — you'll get an email reset link.)

**Turn dark mode on** — Settings → Appearance (or the sun/moon button),
pick a theme and accent colour.

**Read the AI Insights** — open AI Insights: start with the **AI Score**
gauge, then scan **critical** cards first, then warnings; use the category
filters to focus (e.g. only Risks). Thumbs up/down trains nothing but tells
the team which insights were useful. "Refresh" recomputes from the latest
task data.

**Ask the assistant** — AI Insights page → bottom-right bubble → type a
question like "How do I create a task?" → send.

---

## 5. Rules, limitations, and things PurpleBee does NOT do

- **It is not a general AI chatbot.** The AI Insights page's assistant
  only answers questions about PurpleBee itself (using this guide). It
  will refuse off-topic questions (math, news, coding help, jokes).
- **AI Insights are computed from your own task data** — completion rates,
  overdue counts, workloads, and due dates. They are rules-based analytics
  shown as "AI" cards; they do not browse the internet or know anything
  outside your workspace.
- **Due dates are mandatory on tasks** and cannot be in the past when
  creating one.
- **Statuses last exactly 24 hours** and you can only have **one** —
  posting again replaces the previous one. There is no status history.
- **Voice notes need a working microphone** and a modern browser
  (Chrome, Edge, Firefox, or Safari). Without microphone support the
  record button is simply hidden.
- **Everything needs internet** — there is no offline mode; you'll be
  told if a save fails.
- **Your data is private to your team.** Database security prevents
  members of other teams from reading your projects, messages, files,
  or statuses.
- **Only admins** can invite people, change roles, and remove members.
  Managers coordinate work; members do their assigned tasks.
- **File attachments** are limited by the workspace storage quota and
  per-file size caps enforced by storage; very large files may be
  rejected.
- **Deleting a message** doesn't erase the fact it existed — teammates
  see "This message was deleted".
- **One-click Quick Login** is a convenience for this workspace's known
  accounts; hide it if you don't want it. Real sign-in is email +
  password.
- **Sessions expire** after inactivity — you get a warning shortly
  before logout.
- **Notifications** are in-app (and browser, if allowed). Email/Telegram
  delivery exists for announcements and is configured by admins; not
  every event emails you.
- There is **no built-in video calls, time tracking, or payroll** —
  PurpleBee is about planning, doing, chatting, and understanding work.
- Changing your name/email/role beyond self-service (e.g. renaming a
  user) is an admin task done with admin tools.
