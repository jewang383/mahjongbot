# 🀄 Mahjong Night Slack Bot

A Slack bot that lets your organization schedule in-person mahjong nights and RSVP with one click. The bot auto-arranges committed players into tables of 4 and DMs reminders before the session starts.

## Features

- **`/mahjong`** slash command opens a scheduling form (date, time, location, notes)
- Posts a session message with **Commit / Waitlist / Can't make it** buttons
- **Live updates**: the message reflects counts and the committed list as people click
- **🀄 Show tables**: ephemeral button arranges committed players into tables of 4 with overflow flagged as standby
- **Reminders**: DMs all committed players ~3 hours before the session
- **Cancel**: session creator can cancel via overflow menu
- **Zero infra**: Slack Socket Mode means no public URL needed; runs anywhere with internet

## Setup

**👉 Follow [`SETUP.md`](./SETUP.md) for a beginner-friendly, no-code-required walkthrough.**

For developers:

```bash
cp .env.example .env       # fill in SLACK_BOT_TOKEN and SLACK_APP_TOKEN
npm install
npm start
```

## Stack

- [Slack Bolt for JS](https://slack.dev/bolt-js/) (Socket Mode)
- `node-schedule` for reminder cron
- JSON file persistence (`data/sessions.json`)

## Roadmap

- Skill-aware seat shuffling
- Persistent storage backend (Postgres / SQLite) for multi-instance deploys
- Recurring sessions (e.g., every other Friday)
- Per-user opt-out of reminder DMs
