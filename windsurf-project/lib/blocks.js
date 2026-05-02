// Slack Block Kit builders for the session message and the schedule modal.

export function scheduleModal(defaultDate) {
  return {
    type: "modal",
    callback_id: "mahjong_schedule_modal",
    title: { type: "plain_text", text: "Schedule Mahjong" },
    submit: { type: "plain_text", text: "Post" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "title",
        label: { type: "plain_text", text: "Title" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          initial_value: "Mahjong Night",
          max_length: 80,
        },
      },
      {
        type: "input",
        block_id: "date",
        label: { type: "plain_text", text: "Date" },
        element: {
          type: "datepicker",
          action_id: "value",
          initial_date: defaultDate,
        },
      },
      {
        type: "input",
        block_id: "time",
        label: { type: "plain_text", text: "Start time" },
        element: {
          type: "timepicker",
          action_id: "value",
          initial_time: "19:00",
        },
      },
      {
        type: "input",
        block_id: "location",
        optional: true,
        label: { type: "plain_text", text: "Location" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          placeholder: { type: "plain_text", text: "e.g. Community Hall, Room B" },
        },
      },
      {
        type: "input",
        block_id: "notes",
        optional: true,
        label: { type: "plain_text", text: "Notes" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          multiline: true,
          placeholder: { type: "plain_text", text: "Bring snacks, etc." },
        },
      },
    ],
  };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

function userMention(id) {
  return `<@${id}>`;
}

function bullets(ids) {
  return ids.map((id) => `• ${userMention(id)}`).join("\n");
}

export function sessionMessage(session) {
  const committed = session.committedOrder || [];
  const waitlisted = Object.entries(session.rsvps || {})
    .filter(([, v]) => v === "waitlisted")
    .map(([id]) => id);
  const declined = Object.entries(session.rsvps || {})
    .filter(([, v]) => v === "declined")
    .map(([id]) => id);

  const tablesPossible = Math.floor(committed.length / 4);
  const remainder = committed.length % 4;

  const headerLines = [
    `*🀄 ${escape(session.title)}*`,
    `📅 ${formatDate(session.date)} · 🕖 ${formatTime(session.time)}`,
  ];
  if (session.location) headerLines.push(`📍 ${escape(session.location)}`);
  if (session.notes) headerLines.push(`📝 ${escape(session.notes)}`);
  headerLines.push(`_Scheduled by ${userMention(session.creatorId)}_`);

  const statusLine = [
    `✅ *${committed.length}* committed`,
    `⏳ *${waitlisted.length}* waitlisted`,
    `❌ *${declined.length}* not attending`,
  ].join("   ·   ");

  const tableSummary =
    committed.length === 0
      ? "_No one has committed yet — be the first!_"
      : `*${tablesPossible}* full table${tablesPossible === 1 ? "" : "s"} of 4` +
        (remainder > 0 ? `  _(need ${4 - remainder} more for another table — ${remainder} on standby)_` : "");

  const blocks = [
    { type: "section", text: { type: "mrkdwn", text: headerLines.join("\n") } },
    { type: "divider" },
    { type: "section", text: { type: "mrkdwn", text: statusLine } },
    { type: "section", text: { type: "mrkdwn", text: tableSummary } },
  ];

  if (committed.length > 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Committed (in seat order):*\n${bullets(committed)}` },
    });
  }
  if (waitlisted.length > 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Waitlisted:*\n${bullets(waitlisted)}` },
    });
  }

  if (session.cancelled) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: ":no_entry: *This session has been cancelled.*" }],
    });
  } else {
    blocks.push({
      type: "actions",
      block_id: "rsvp_actions",
      elements: [
        {
          type: "button",
          action_id: "rsvp_committed",
          text: { type: "plain_text", text: "✅ Commit" },
          style: "primary",
          value: session.id,
        },
        {
          type: "button",
          action_id: "rsvp_waitlisted",
          text: { type: "plain_text", text: "⏳ Waitlist" },
          value: session.id,
        },
        {
          type: "button",
          action_id: "rsvp_declined",
          text: { type: "plain_text", text: "❌ Can't make it" },
          value: session.id,
        },
        {
          type: "button",
          action_id: "show_tables",
          text: { type: "plain_text", text: "🀄 Show tables" },
          value: session.id,
        },
        {
          type: "overflow",
          action_id: "session_overflow_menu",
          options: [
            {
              text: { type: "plain_text", text: "Cancel session (creator only)" },
              value: `cancel:${session.id}`,
            },
          ],
        },
      ],
    });
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: `Session ID: \`${session.id}\`` }],
  });

  return {
    text: `${session.title} — ${formatDate(session.date)} ${formatTime(session.time)}`,
    blocks,
  };
}

export function tablesEphemeral(session) {
  const committed = session.committedOrder || [];
  const tableSize = 4;
  const seatedCount = committed.length - (committed.length % tableSize);
  const seated = committed.slice(0, seatedCount);
  const overflow = committed.slice(seatedCount);
  const tables = [];
  for (let i = 0; i < seated.length; i += tableSize) {
    tables.push(seated.slice(i, i + tableSize));
  }

  if (tables.length === 0) {
    return {
      text: "No full tables yet.",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              committed.length === 0
                ? "🀄 No one has committed yet."
                : `🀄 Need *${4 - committed.length % 4}* more committed player${4 - (committed.length % 4) === 1 ? "" : "s"} to form a table of 4. Currently *${committed.length}* committed.`,
          },
        },
      ],
    };
  }

  const blocks = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*🀄 Tables for ${escape(session.title)}*` },
    },
  ];
  tables.forEach((tbl, i) => {
    const seats = tbl.map((id, idx) => `${idx + 1}. ${userMention(id)}`).join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Table ${i + 1}*\n${seats}` },
    });
  });
  if (overflow.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Standby* (will play if more commit or someone drops):\n${overflow.map(userMention).join(", ")}`,
      },
    });
  }
  return { text: "Tables", blocks };
}

function escape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
