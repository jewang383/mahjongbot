import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve("./data");
const FILE = path.join(DATA_DIR, "sessions.json");

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ sessions: [] }, null, 2));
}

function read() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return { sessions: [] };
  }
}

function write(data) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export function listSessions() {
  return read().sessions;
}

export function getSession(id) {
  return read().sessions.find((s) => s.id === id) || null;
}

export function createSession(input) {
  const data = read();
  const session = {
    id: uid(),
    title: input.title || "Mahjong Night",
    date: input.date,           // YYYY-MM-DD
    time: input.time || "19:00", // HH:MM
    location: input.location || "",
    notes: input.notes || "",
    creatorId: input.creatorId,
    channel: input.channel,
    ts: null,                   // set after we post the message
    rsvps: {},                  // userId -> 'committed' | 'waitlisted' | 'declined'
    committedOrder: [],
    reminderSent: false,
    cancelled: false,
    createdAt: Date.now(),
  };
  data.sessions.push(session);
  write(data);
  return session;
}

export function updateSession(id, patch) {
  const data = read();
  const i = data.sessions.findIndex((s) => s.id === id);
  if (i === -1) return null;
  data.sessions[i] = { ...data.sessions[i], ...patch };
  write(data);
  return data.sessions[i];
}

export function setRsvp(sessionId, userId, status) {
  const data = read();
  const sess = data.sessions.find((s) => s.id === sessionId);
  if (!sess) return null;
  const current = sess.rsvps[userId];
  if (current === status) {
    // Toggle off
    delete sess.rsvps[userId];
    sess.committedOrder = sess.committedOrder.filter((u) => u !== userId);
  } else {
    sess.rsvps[userId] = status;
    if (status === "committed") {
      if (!sess.committedOrder.includes(userId)) sess.committedOrder.push(userId);
    } else {
      sess.committedOrder = sess.committedOrder.filter((u) => u !== userId);
    }
  }
  write(data);
  return sess;
}

export function cancelSession(id) {
  return updateSession(id, { cancelled: true });
}

export function computeTables(session, tableSize = 4) {
  const order = session.committedOrder || [];
  const seatedCount = order.length - (order.length % tableSize);
  const seated = order.slice(0, seatedCount);
  const overflow = order.slice(seatedCount);
  const tables = [];
  for (let i = 0; i < seated.length; i += tableSize) {
    tables.push(seated.slice(i, i + tableSize));
  }
  return { tables, overflow };
}
