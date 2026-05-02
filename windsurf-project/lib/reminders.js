import schedule from "node-schedule";
import { listSessions, updateSession } from "./store.js";

// Parse session date+time as a Date in the configured timezone.
// Note: For an MVP we treat TIMEZONE as informational and rely on the host's
// local time matching it. For production, swap in a tz-aware library (luxon).
function sessionStart(session) {
  return new Date(`${session.date}T${session.time}:00`);
}

export function startReminderCron(app) {
  const hoursBefore = Number(process.env.REMINDER_HOURS_BEFORE || 3);

  // Run every minute; cheap and simple.
  schedule.scheduleJob("* * * * *", async () => {
    const now = Date.now();
    const windowMs = hoursBefore * 60 * 60 * 1000;

    for (const sess of listSessions()) {
      if (sess.cancelled || sess.reminderSent) continue;
      const startMs = sessionStart(sess).getTime();
      if (Number.isNaN(startMs)) continue;
      const diff = startMs - now;
      // Send if start is within [now, hoursBefore from now]
      if (diff <= windowMs && diff > 0) {
        await sendReminders(app, sess).catch((err) =>
          console.error("Reminder send failed for", sess.id, err)
        );
        updateSession(sess.id, { reminderSent: true });
      }
    }
  });

  console.log(`⏰ Reminder cron running (${hoursBefore}h before each session)`);
}

async function sendReminders(app, session) {
  const committed = session.committedOrder || [];
  if (committed.length === 0) return;

  const when = `${session.date} at ${session.time}`;
  const place = session.location ? ` at *${session.location}*` : "";
  const text =
    `🀄 *Reminder*: _${session.title}_ starts soon — ${when}${place}.\n` +
    `You're committed. See you there!`;

  // DM each committed player
  await Promise.all(
    committed.map(async (userId) => {
      try {
        const im = await app.client.conversations.open({ users: userId });
        await app.client.chat.postMessage({
          channel: im.channel.id,
          text,
        });
      } catch (e) {
        console.error("DM reminder failed for", userId, e?.data || e?.message);
      }
    })
  );

  // Also ping the channel if known
  if (session.channel) {
    try {
      await app.client.chat.postMessage({
        channel: session.channel,
        thread_ts: session.ts || undefined,
        text: `🀄 Reminder: *${session.title}* starts at ${session.time} today. ${committed.length} committed.`,
      });
    } catch (e) {
      console.error("Channel reminder failed", e?.data || e?.message);
    }
  }
}
