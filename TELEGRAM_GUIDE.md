# Purple Bee Bot — Telegram Guide

## What it does

Purple Bee Bot is connected to Telegram via **@PurpleBee2bot**.  
You can create tasks directly from Telegram — they appear on your Tasks page automatically, no refresh needed.

---

## Requirements before you start

| Item | Status |
|---|---|
| Telegram bot token | ✅ Set in `.env` as `VITE_TELEGRAM_BOT_TOKEN` |
| Backend running | Must be running on port 3001 |
| ngrok tunnel running | Must be active and pointing to port 3001 |
| Webhook registered | Must be set on the Telegram Bot API |

---

## Setup checklist (one-time)

### 1. Start the backend
```bash
cd /Users/xspark3/Desktop/Purple_Bee/backend
npm run dev
```
You should see: `✅ Server running on port 3001`

### 2. Start ngrok
```bash
ngrok http 3001
```
Copy the `https://` URL it gives you (e.g. `https://xxxx.ngrok-free.app`).

### 3. Register the webhook with Telegram
Paste this URL in your browser — replace `{TOKEN}` and `{NGROK_URL}`:

```
https://api.telegram.org/bot{TOKEN}/setWebhook?url={NGROK_URL}/webhook/telegram
```

Using your actual token (find it in `.env` as `VITE_TELEGRAM_BOT_TOKEN` — never commit the real value):
```
https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://YOUR-NGROK-URL/webhook/telegram
```

You should get back:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### 4. Start the frontend
```bash
cd /Users/xspark3/Desktop/Purple_Bee
npm run dev
```

---

## How to create a task from Telegram

Open Telegram and go to **@PurpleBee2bot**.

### Option A — Basic trigger
Send:
```
new task
```
or
```
/newtask
```
The bot will walk you through each step.

### Option B — With title in one line
```
/newtask Fix login page bug
```
This skips the title step — the bot goes straight to project selection.

---

## Full step-by-step flow

```
You:   /newtask

Bot:   Which project?
       1. 🌐 Client Portal
       2. 📣 Winter Campaign
       3. 🛡️ Ops & Compliance
       Reply with the number (1–3).

You:   1

Bot:   ✅ Project: 🌐 Client Portal — ✈ Telegram
       What's the task title?

You:   Fix the login page bug

Bot:   Title: "Fix the login page bug"
       Priority?
       1. Low
       2. Medium
       3. High
       4. Urgent

You:   3

Bot:   Priority: high
       Column?
       1. To Do
       2. In Progress
       3. Review

You:   1

Bot:   📋 Confirm task:
       • Title: Fix the login page bug
       • Project: Client Portal
       • Priority: high
       • Status: todo
       • Channel: ✈ Telegram
       Reply "yes" to create or "no" to cancel.

You:   yes

Bot:   ✅ Task created! It will appear on your Tasks page automatically.
       Send /newtask to create another.
```

---

## Commands

| Command | What it does |
|---|---|
| `/newtask` | Start the task creation flow |
| `/newtask [title]` | Start with title pre-filled (skips title step) |
| `cancel` or `/cancel` | Cancel the current flow at any step |
| `new task` | Same as `/newtask` (plain text also works) |

---

## How the task gets to the app

1. You confirm "yes" in Telegram
2. Backend emits a `task:bot-created` socket event to the frontend
3. The frontend task store receives it and calls `addTask()` immediately
4. The task appears on the **Tasks page** — no manual refresh needed
5. `sourceChannel: 'telegram'` is stored on the task so you can see where it came from

---

## Troubleshooting

### Bot doesn't reply
- Check that the backend is still running (`npm run dev` in the backend folder)
- Check that ngrok is still running (free ngrok URLs expire when you close the terminal)
- Re-register the webhook if the ngrok URL changed (repeat Step 3 above)

### Task doesn't appear on Tasks page
- Make sure the frontend is open in the browser
- The frontend must be running and connected to the backend via Socket.IO
- Check the browser console for any connection errors

### "Webhook was not set" error
- Your ngrok URL may have changed — get the new URL and re-run Step 3
- Make sure the backend is running before registering the webhook

### Bot token error
- Your `.env` file has the token as `VITE_TELEGRAM_BOT_TOKEN`
- The backend reads it as `REACT_APP_TELEGRAM_BOT_TOKEN` — both are set in `.env`

---

## Important notes

- The **free ngrok URL changes every time you restart ngrok**. You must re-register the webhook each time.
- To get a permanent URL, upgrade to a paid ngrok plan or deploy the backend to a server (Render, Railway, etc.)
- The bot currently maps projects to the 3 seeded demo projects (Client Portal, Winter Campaign, Ops & Compliance). When Supabase is connected with real project data, this list will pull from the database.
- Tasks created via Telegram are tagged `sourceChannel: 'telegram'` and show a **✈ Telegram** badge in the notification panel.
