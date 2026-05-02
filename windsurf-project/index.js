import "dotenv/config";
import pkg from "@slack/bolt";
const { App } = pkg;

import {
  createSession,
  getSession,
  setRsvp,
  updateSession,
  cancelSession,
} from "./lib/store.js";
import { scheduleModal, sessionMessage, tablesEphemeral } from "./lib/blocks.js";
import { startReminderCron } from "./lib/reminders.js";

if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN) {
  console.error(
    "Missing SLACK_BOT_TOKEN or SLACK_APP_TOKEN. Copy .env.example to .env and fill in your Slack app credentials."
  );
  process.exit(1);
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// ---------- Slash command: /mahjong ----------

app.command("/mahjong", async ({ command, ack, client, respond }) => {
  await ack();
  const text = (command.text || "").trim().toLowerCase();

  if (text === "" || text === "schedule") {
    // Open scheduling modal
    const today = new Date().toISOString().slice(0, 10);
    try {
      await client.views.open({
        trigger_id: command.trigger_id,
        view: {
          ...scheduleModal(today),
          private_metadata: JSON.stringify({ channel: command.channel_id }),
        },
      });
    } catch (e) {
      console.error("views.open failed", e?.data || e);
      await respond({ response_type: "ephemeral", text: "Couldn't open the schedule form. Make sure the bot is added to this channel." });
    }
    return;
  }

  if (text === "help") {
    await respond({
      response_type: "ephemeral",
      text:
        "*🀄 Mahjong Night Bot*\n" +
        "• `/mahjong` or `/mahjong schedule` — schedule a new session\n" +
        "• `/mahjong help` — this message\n" +
        "Use the buttons on the session message to RSVP or view tables.",
    });
    return;
  }

  await respond({
    response_type: "ephemeral",
    text: `Unknown subcommand \`${text}\`. Try \`/mahjong help\`.`,
  });
});

// ---------- Modal submit: create session ----------

app.view("mahjong_schedule_modal", async ({ ack, body, view, client }) => {
  const v = view.state.values;
  const meta = JSON.parse(view.private_metadata || "{}");
  const channel = meta.channel;

  if (!channel) {
    await ack({
      response_action: "errors",
      errors: { title: "No channel context — please run /mahjong from inside a channel." },
    });
    return;
  }

  const input = {
    title: v.title.value.value,
    date: v.date.value.selected_date,
    time: v.time.value.selected_time,
    location: v.location.value.value || "",
    notes: v.notes.value.value || "",
    creatorId: body.user.id,
    channel,
  };

  await ack();

  const session = createSession(input);

  try {
    const res = await client.chat.postMessage({
      channel,
      ...sessionMessage(session),
    });
    updateSession(session.id, { ts: res.ts });
  } catch (e) {
    console.error("postMessage failed", e?.data || e);
    // DM the creator a fallback note
    try {
      const im = await client.conversations.open({ users: body.user.id });
      await client.chat.postMessage({
        channel: im.channel.id,
        text:
          "I couldn't post the session in that channel. Please invite me to the channel first (`/invite @MahjongBot`) and try again.",
      });
    } catch {}
  }
});

// ---------- RSVP buttons ----------

async function handleRsvp(status, { ack, body, action, client, respond }) {
  await ack();
  const sessionId = action.value;
  const sess = getSession(sessionId);
  if (!sess) return;
  if (sess.cancelled) return;

  const updated = setRsvp(sessionId, body.user.id, status);
  if (!updated) return;

  // Update the original message in place
  try {
    await client.chat.update({
      channel: sess.channel,
      ts: sess.ts,
      ...sessionMessage(updated),
    });
  } catch (e) {
    console.error("chat.update failed", e?.data || e);
  }
}

app.action("rsvp_committed", (args) => handleRsvp("committed", args));
app.action("rsvp_waitlisted", (args) => handleRsvp("waitlisted", args));
app.action("rsvp_declined", (args) => handleRsvp("declined", args));

// ---------- Show tables (ephemeral to clicker) ----------

app.action("show_tables", async ({ ack, body, action, client }) => {
  await ack();
  const sess = getSession(action.value);
  if (!sess) return;
  try {
    await client.chat.postEphemeral({
      channel: sess.channel,
      user: body.user.id,
      ...tablesEphemeral(sess),
    });
  } catch (e) {
    console.error("postEphemeral failed", e?.data || e);
  }
});

// ---------- Overflow menu (cancel session) ----------

app.action("session_overflow_menu", async ({ ack, body, action, client, respond }) => {
  await ack();
  const selected = action.selected_option?.value || "";
  const [op, sessionId] = selected.split(":");
  const sess = getSession(sessionId);
  if (!sess) return;

  if (op === "cancel") {
    if (body.user.id !== sess.creatorId) {
      await client.chat.postEphemeral({
        channel: sess.channel,
        user: body.user.id,
        text: "Only the session creator can cancel it.",
      });
      return;
    }
    const updated = cancelSession(sessionId);
    try {
      await client.chat.update({
        channel: sess.channel,
        ts: sess.ts,
        ...sessionMessage(updated),
      });
    } catch (e) {
      console.error("cancel update failed", e?.data || e);
    }
  }
});

// ---------- Boot ----------

(async () => {
  await app.start();
  console.log("⚡️ Mahjong Night Slack bot is running (Socket Mode)");
  startReminderCron(app);
})();
