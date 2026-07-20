# Purple Bee Bot — WhatsApp Guide

## What it does

Purple Bee Bot is connected to WhatsApp via the Meta WhatsApp Cloud API.
You can create tasks directly from WhatsApp — they appear on your Tasks page automatically, no refresh needed.

---

## Requirements before you start

| Item | Status |
|---|---|
| WhatsApp Phone ID / Token | ✅ Set in `.env` |
| Backend running | Must be running on port **3005** |
| ngrok tunnel running | Must be active and pointing to port 3005 |
| Webhook registered | Must be set on the Meta dashboard |
| Your phone approved | Must be added under "To" numbers on Meta |

---

## Setup checklist (one-time per session)

### 1. Start the backend
```bash
cd /Users/xspark3/Desktop/Purple_Bee/backend
npm run dev
```
You should see:
```
✅ Database connected
✅ Server running on port 3005
```

If you see `EADDRINUSE` (port already in use):
```bash
lsof -ti:3005 | xargs kill -9
npm run dev
```

### 2. Start ngrok
```bash
ngrok http 3005
```
You should see a `Forwarding` line with your public URL:
```
https://unmoved-pseudomonastically-lashawna.ngrok-free.dev -> http://localhost:3005
```
(This is a **reserved** ngrok domain — it stays the same across restarts, so you usually don't need to re-verify the webhook every time.)

### 3. Start the frontend
```bash
cd /Users/xspark3/Desktop/Purple_Bee
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Register the webhook with Meta (only if it's not already saved)

1. Go to **developers.facebook.com** → your app → **WhatsApp** → **Configuration**
2. Click **Edit** next to Webhook
3. Fill in:
   - **Callback URL:**
     ```
     https://unmoved-pseudomonastically-lashawna.ngrok-free.dev/webhook/whatsapp
     ```
   - **Verify token:**
     ```
     purplebee_whatsapp_2024
     ```
4. Click **Verify and Save**

**✅ Success looks like:** page saves with no error, and backend terminal shows `✅ WhatsApp webhook verified`

---

## Approve your phone number for testing

Meta only allows messages to/from approved numbers during development.

1. Meta → **WhatsApp** → **API Setup**
2. Under the **"To"** section, click **Manage phone number list** / **Add phone number**
3. Add your personal WhatsApp number
4. WhatsApp sends you a code — enter it to confirm

---

## Find the numbers you need

| Number | Where to find it | What it's for |
|---|---|---|
| **Bot number** | Meta → API Setup → "From" section (test number) | The number you **send messages TO** |
| **Your number** | Meta → API Setup → "To" section (numbers you approved) | The number you **send messages FROM** |

---

## Send your first test message

1. Open WhatsApp **on the phone number you approved**
2. Message the **bot's test number** (shown under "From")
3. Send:
   ```
   new task
   ```

**✅ Success looks like:**
- Your phone gets a reply asking you to pick a project
- Backend terminal shows:
  ```
  📱 WhatsApp from 27XXXXXXXXX: new task
  ```

---

## Complete the task creation flow

| Bot asks | You reply (example) |
|---|---|
| Pick a project (1, 2, or 3) | `1` |
| What's the task title? | `Test task` |
| Priority? | `2` |
| Column? | `1` |
| Confirm? | `yes` |

**✅ Success:** phone shows `✅ Task created!`

---

## Check it landed in the app

1. Open `http://localhost:5173`
2. Go to **Tasks**
3. Look for your new task — it should already be there, no refresh needed

---

## Upload the Purple Bee logo as the bot's profile picture

1. Meta → **WhatsApp** → **API Setup**
2. Find your phone number card → click the **⋯ (three dots)** or **Manage**
3. This opens **WhatsApp Manager** (business.facebook.com)
4. Go to **Phone numbers** → select your test number
5. Open **Business Profile** settings
6. Click the profile picture placeholder → **Upload photo**
7. Select the Purple Bee logo file from your computer → save

---

## Troubleshooting

**Bot doesn't reply**
- Check backend is running (port 3005)
- Check ngrok is running and still pointing to 3005
- Confirm your phone number is in the approved "To" list

**Webhook won't verify**
- Backend must be running BEFORE you click "Verify and Save" on Meta
- Double-check the verify token is exactly `purplebee_whatsapp_2024` (no extra spaces)

**"Forbidden" when testing the webhook URL directly**
- The verify token in the URL doesn't match `REACT_APP_WHATSAPP_WEBHOOK_TOKEN` in `.env`

**Task doesn't appear on Tasks page**
- Frontend must be open and connected to backend via Socket.IO
- Check browser console for connection errors

**ngrok URL changed**
- If you're on a free ngrok plan without a reserved domain, the URL changes every restart
- Re-register the webhook on Meta with the new URL each time

---

## Important notes

- Port **3005** is the current backend port (changed from 3001 to avoid conflicts)
- The reserved ngrok domain (`unmoved-pseudomonastically-lashawna.ngrok-free.dev`) means you generally don't need to re-verify the webhook after restarting ngrok — only if the domain itself changes
- Tasks created via WhatsApp are tagged `sourceChannel: 'whatsapp'` and show a **📱 WhatsApp** badge in the notification panel
- During development, Meta restricts messaging to approved test numbers only — this is normal and expected until the app goes through Meta's app review for production access
