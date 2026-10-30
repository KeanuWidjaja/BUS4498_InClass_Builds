// Stage 14: the chat-channel reader for GroupMe (Supabase Edge Function "read-channel").
// It reads the new messages in the club's GroupMe group, sends each one to the
// AI agent (submit-event), and posts the agent's decision back to the group.
// The scheduled job "read-chat-channel" calls it every minute; GroupMe's bot
// callback can call it too, for instant updates.

import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SOURCE = "groupme";
const GROUPME_API = "https://api.groupme.com/v3";
const BATCH_SIZE = 20;
const THREAD_WINDOW_SECONDS = 10 * 60;
const THREAD_MAX = 4;
const MAX_REPLY_CHARS = 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
};

type Message = {
  id: string;
  created_at: number;
  sender_id: string;
  sender_type: string;
  name: string;
  text: string | null;
  system: boolean;
};

type Cursor = { last_id: string; read_count: number };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function settings() {
  return {
    token: Deno.env.get("GROUPME_TOKEN") ?? "",
    groupId: Deno.env.get("GROUPME_GROUP_ID") ?? "",
    botId: Deno.env.get("GROUPME_BOT_ID") ?? "",
  };
}

// Keys from SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS (JSON); fall back to the legacy ones.
function projectKey(newName: string, legacyName: string): string {
  const raw = Deno.env.get(newName);
  if (raw) {
    try {
      const keys = JSON.parse(raw);
      if (keys?.default) return keys.default;
    } catch {
      // Fall through to the legacy key.
    }
  }
  return Deno.env.get(legacyName) ?? "";
}

function database() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    projectKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

// Ask GroupMe for messages. Returns [] when there are none (GroupMe answers 304).
async function fetchMessages(token: string, groupId: string, query: string): Promise<Message[]> {
  const res = await fetch(`${GROUPME_API}/groups/${encodeURIComponent(groupId)}/messages?${query}`, {
    headers: { "X-Access-Token": token },
  });
  if (res.status === 304) return [];
  if (!res.ok) throw new Error(`GroupMe answered ${res.status} when reading messages.`);
  const data = await res.json();
  return (data?.response?.messages ?? []) as Message[];
}

// GroupMe ids are long numbers written as text; compare them as numbers.
function byOldest(a: Message, b: Message): number {
  if (a.created_at !== b.created_at) return a.created_at - b.created_at;
  return BigInt(a.id) < BigInt(b.id) ? -1 : 1;
}

// Plain messages from people only: no bots, no system notices, no empty text.
function isPersonMessage(m: Message): boolean {
  return m.sender_type !== "bot" && m.sender_type !== "system" && !m.system && (m.text ?? "").trim() !== "";
}

// The same person's earlier messages from the 10 minutes before this one (at most 4, oldest first).
async function threadFor(token: string, groupId: string, message: Message): Promise<string[]> {
  const earlier = await fetchMessages(token, groupId, `before_id=${message.id}&limit=${BATCH_SIZE}`);
  return earlier
    .filter((m) =>
      m.sender_id === message.sender_id &&
      isPersonMessage(m) &&
      message.created_at - m.created_at <= THREAD_WINDOW_SECONDS
    )
    .sort(byOldest)
    .slice(-THREAD_MAX)
    .map((m) => (m.text ?? "").trim());
}

async function postToGroup(botId: string, text: string): Promise<void> {
  if (!botId) return;
  const res = await fetch(`${GROUPME_API}/bots/post`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bot_id: botId, text: text.slice(0, MAX_REPLY_CHARS) }),
  });
  if (!res.ok) console.error(`GroupMe answered ${res.status} when the bot posted.`);
}

// The agent's decision, in a few plain words for the group.
function replyText(name: string, result: Record<string, unknown>): string {
  const event = (result.event ?? {}) as Record<string, unknown>;
  const title = String(event.title ?? "").trim();
  const reasons = Array.isArray(result.reasons) ? result.reasons.map(String) : [];
  const because = reasons.length ? `\n- ${reasons.join("\n- ")}` : "";
  switch (result.status) {
    case "published":
      return `✅ ${name}, "${title || "your event"}" is on the Event Radar website.`;
    case "waiting":
      return `⏳ ${name}, "${title || "your post"}" is waiting for a moderator.${because}`;
    case "rejected":
      return `🚫 ${name}, your post wasn't added.${because}`;
    case "duplicate":
      return `🔁 ${name}, this event is already posted.`;
    default:
      return `⚠️ ${name}, ${String(result.message ?? "the agent couldn't read your post.")}`;
  }
}

async function sendToAgent(message: Message, thread: string[]): Promise<{ httpStatus: number; result: Record<string, unknown> }> {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/submit-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": projectKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"),
    },
    body: JSON.stringify({
      announcement: (message.text ?? "").trim(),
      source: SOURCE,
      source_id: message.id,
      source_name: message.name ?? "",
      thread,
    }),
  });
  const result = await res.json().catch(() => ({ ok: false, message: "The agent gave no answer." }));
  return { httpStatus: res.status, result };
}

async function readCursor(db: ReturnType<typeof database>): Promise<Cursor | null> {
  const { data, error } = await db
    .from("channel_cursor")
    .select("last_id, read_count")
    .eq("source", SOURCE)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function saveCursor(db: ReturnType<typeof database>, cursor: Cursor): Promise<void> {
  const { error } = await db
    .from("channel_cursor")
    .upsert({ source: SOURCE, ...cursor, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// GET ?check=groupme: does the token work, can it see the group, is the bot there? Results only, never values.
async function check(): Promise<Response> {
  const { token, groupId, botId } = settings();
  const result = { ok: true, token: false, group: false, bot: botId ? false : null as boolean | null, message: "" };
  if (!token) return json({ ...result, message: "GROUPME_TOKEN isn't set in Supabase → Edge Functions → Secrets." });

  const me = await fetch(`${GROUPME_API}/users/me`, { headers: { "X-Access-Token": token } });
  result.token = me.ok;
  if (!result.token) return json({ ...result, message: "GroupMe didn't accept GROUPME_TOKEN." });

  if (groupId) {
    const group = await fetch(`${GROUPME_API}/groups/${encodeURIComponent(groupId)}`, {
      headers: { "X-Access-Token": token },
    });
    result.group = group.ok;
  }
  if (!result.group) {
    return json({ ...result, message: "The token works, but it can't open GROUPME_GROUP_ID. Check the group id." });
  }

  if (botId) {
    const bots = await fetch(`${GROUPME_API}/bots`, { headers: { "X-Access-Token": token } });
    const list = bots.ok ? ((await bots.json())?.response ?? []) : [];
    result.bot = list.some((b: { bot_id: string; group_id: string }) => b.bot_id === botId && b.group_id === groupId);
  }
  result.message = result.bot === false
    ? "The token and the group work, but GROUPME_BOT_ID isn't a bot in this group, so decisions won't be posted back."
    : result.bot === null
    ? "The token and the group work. No GROUPME_BOT_ID is set, so decisions won't be posted back to the group."
    : "The token, the group, and the bot all work.";
  return json(result);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const { token, groupId, botId } = settings();

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      if (url.searchParams.get("check")) {
        if (url.searchParams.get("check") !== SOURCE) {
          return json({ ok: false, message: "This reader is for GroupMe. Use ?check=groupme." }, 400);
        }
        return await check();
      }
      const cursor = await readCursor(database());
      return json({
        ok: true,
        ready: Boolean(token && groupId),
        last_message_id: cursor?.last_id ?? "",
        read_count: cursor?.read_count ?? 0,
        bot: Boolean(botId),
      });
    }

    if (req.method !== "POST") return json({ ok: false, message: "Use POST to read the group." }, 405);

    // The body is ignored: the scheduled job, GroupMe's callback, and a person all mean "read now".
    if (!token || !groupId) {
      return json({ ok: false, message: "Add GROUPME_TOKEN and GROUPME_GROUP_ID in Supabase → Edge Functions → Secrets." }, 503);
    }

    const db = database();
    const cursor = await readCursor(db);

    // First run: bookmark the newest message and stop. Old history is never read.
    if (!cursor || !cursor.last_id) {
      const newest = await fetchMessages(token, groupId, "limit=1");
      // An empty group starts at "0", so its very first message is read.
      const lastId = newest[0]?.id ?? "0";
      await saveCursor(db, { last_id: lastId, read_count: cursor?.read_count ?? 0 });
      return json({ ok: true, started: true, last_message_id: lastId, read: 0, message: "Bookmarked the newest message. New messages are read from now on." });
    }

    const messages = (await fetchMessages(token, groupId, `after_id=${cursor.last_id}&limit=${BATCH_SIZE}`))
      .sort(byOldest);

    let lastId = cursor.last_id;
    let readCount = cursor.read_count;
    let skipped = 0;
    const decisions: { id: string; status: string }[] = [];

    for (const message of messages) {
      if (!isPersonMessage(message)) {
        skipped++;
        lastId = message.id;
        continue;
      }

      const thread = await threadFor(token, groupId, message);
      const { httpStatus, result } = await sendToAgent(message, thread);

      // The agent is down or out of AI: keep the bookmark here and try again next minute.
      // The agent never decides the same message twice, so trying again is safe.
      if (httpStatus >= 500) {
        console.error(`submit-event answered ${httpStatus} for message ${message.id}.`);
        break;
      }

      if (!result.already_read) {
        await postToGroup(botId, replyText(message.name || "Hi", result));
      }
      decisions.push({ id: message.id, status: String(result.status ?? "error") });
      readCount++;
      lastId = message.id;
    }

    if (lastId !== cursor.last_id || readCount !== cursor.read_count) {
      await saveCursor(db, { last_id: lastId, read_count: readCount });
    }

    return json({ ok: true, read: decisions.length, skipped, last_message_id: lastId, decisions });
  } catch (err) {
    console.error(err);
    return json({ ok: false, message: "The reader couldn't finish. It tries again on the next run." }, 500);
  }
});
