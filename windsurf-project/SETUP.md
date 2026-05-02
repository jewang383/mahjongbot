# Mahjong Night Slack Bot — Setup Guide (no coding required)

This guide walks you through three things:

1. **Create the Slack app** in your workspace
2. **Run the bot** for free on Replit (browser-based, no install)
3. **Use it** in your Slack channel

Total time: ~15 minutes.

---

## Step 1 — Create the Slack app

You'll need permission to add an app to your Slack workspace. If you don't have it, ask a workspace admin.

1. Go to **https://api.slack.com/apps** and click **"Create New App"**.
2. Choose **"From an app manifest"**.
3. Pick your workspace.
4. **Open the file `manifest.yml`** in this project. Copy ALL of its contents.
5. Paste it into the manifest box on Slack's site (replace whatever's there). Click **Next** → **Create**.

You're now on your new app's settings page. Keep this tab open.

### 1a — Get your **Bot Token** (`xoxb-...`)

1. In the left sidebar, click **OAuth & Permissions**.
2. Click the green **"Install to Workspace"** button at the top. Approve the prompt.
3. Back on the OAuth page, copy the **Bot User OAuth Token** (starts with `xoxb-`). Save it somewhere — you'll paste it into Replit in Step 2.

### 1b — Get your **App Token** (`xapp-...`)

1. In the left sidebar, click **Basic Information**.
2. Scroll to **App-Level Tokens** → click **Generate Token and Scopes**.
3. Name: `socket`. Add the scope **`connections:write`**. Click **Generate**.
4. Copy the token (starts with `xapp-`). Save it.

### 1c — Add the bot to your channel

In Slack, go to the channel where you want to schedule mahjong nights and run:

```
/invite @Mahjong Night
```

---

## Step 2 — Put the code on GitHub (5 min, all in browser)

1. Go to **https://github.com** and sign up / log in (free).
2. Click the **`+`** in the top-right → **"New repository"**.
3. Name it `mahjong-night-bot`. Leave it **Public**. Don't tick "Add a README". Click **Create repository**.
4. On the new empty repo page, you'll see a link **"uploading an existing file"** in the quick-setup section. Click it.
5. **Open Finder** and navigate to the project folder: `/Users/jewang/CascadeProjects/windsurf-project`.
6. Select **all files and folders** inside it (Cmd+A) — you should see `index.js`, `package.json`, `manifest.yml`, `SETUP.md`, `README.md`, `lib/`, `.env.example`, `.gitignore`, etc.
   - **Do NOT include**: `node_modules/` or `data/` (these shouldn't exist yet anyway, but if they do, skip them).
7. **Drag them all** into the GitHub upload area in your browser.
8. Scroll down, click **Commit changes**.

Your code is now on GitHub. Copy the URL of this repo from your browser's address bar — you'll need it next.

## Step 3 — Run the bot on Replit (free, browser-based)

1. Go to **https://replit.com** and sign up / log in (free — sign up with GitHub if you can, it makes the next step easier).
2. Click **"Create Repl"** (top-right button or `+` icon).
3. In the dialog, click the **"Import from GitHub"** tab (or the GitHub icon).
4. Paste the URL of the GitHub repo you just created. Click **Import from GitHub**.
   - If Replit asks for permission to access your GitHub account, approve it.
5. Replit may ask which "language" to use — pick **Node.js**. If it auto-detects, you're fine.
6. Once the Repl opens, click the **Secrets** (🔒 padlock) tab in the left sidebar and add **three** secrets:
   - `SLACK_BOT_TOKEN` = your `xoxb-...` token from Step 1a
   - `SLACK_APP_TOKEN` = your `xapp-...` token from Step 1b
   - `TIMEZONE` = your timezone, e.g. `America/Los_Angeles` (optional)
7. Click the green **▶ Run** button at the top.
8. The first run will take ~30 seconds (it's installing dependencies). Then in the console you should see:

   ```
   ⚡️ Mahjong Night Slack bot is running (Socket Mode)
   ⏰ Reminder cron running (3h before each session)
   ```

That's it — your bot is live.

> **If `npm install` doesn't run automatically**, type `npm install` in the Shell tab and press enter, then click ▶ Run again.

### Keep it running 24/7

Replit free repls sleep when idle. Two easy options:

- **Pay $7/mo** for Replit's "Always-On" toggle (simplest), OR
- **Free**: sign up at https://uptimerobot.com and create an HTTP monitor pinging your Repl's web URL every 5 minutes. (You'll need to add a tiny web server endpoint — ask me to add this if you want.)

---

## Step 4 — Use the bot

In your Slack channel, type:

```
/mahjong
```

A form pops up. Pick a date, time, location, notes. Click **Post**.

The bot posts a message to the channel with **Commit / Waitlist / Can't make it / Show tables** buttons. Members click to RSVP. The message updates live with counts and a committed list.

When 4+ members commit, anyone can click **🀄 Show tables** to see the auto-arranged tables of 4 (only that user sees the result, so it doesn't spam the channel).

3 hours before the session, committed players get a DM reminder and the channel gets a heads-up in the session thread.

The session creator can cancel the session via the **⋯** overflow menu on the message.

---

## Troubleshooting

- **"Couldn't open the schedule form"** → invite the bot to the channel: `/invite @Mahjong Night`
- **Bot is silent after clicking Run on Replit** → double-check the two tokens are pasted into Replit Secrets exactly (no extra spaces). Restart with the **▶** button.
- **Reminders aren't firing** → make sure the Repl is awake. Check the console for `⏰ Reminder cron running`.

---

## What's where (for the curious)

- `index.js` — main bot wiring (slash command, modal, buttons)
- `lib/store.js` — saves sessions to `data/sessions.json` on disk
- `lib/blocks.js` — Slack message layouts (Block Kit)
- `lib/reminders.js` — DM cron job
- `manifest.yml` — Slack app config (already used in Step 1)
