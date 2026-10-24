// Club Event Radar: the website.
// It lists published events from Supabase and sends new posts to the AI agent.

(function () {
  const config = window.EVENT_RADAR_CONFIG;
  const db = window.supabase.createClient(config.supabaseUrl, config.publishableKey);
  const agentUrl = `${config.supabaseUrl}/functions/v1/submit-event`;
  // Flyers are shown only when they come from this project's flyers bucket.
  const flyerPrefix = `${config.supabaseUrl}/storage/v1/object/public/flyers/`;
  const MAX_FLYER_BYTES = 5 * 1024 * 1024;

  // Only the columns the website is allowed to read.
  const COLUMNS = "id, created_at, status, title, club, event_date, start_time, end_time, " +
    "place_name, place_detail, cost, free_food, summary, flyer_url";

  const RESULT_LABELS = {
    published: "Published",
    waiting: "Waiting for a moderator",
    rejected: "Not posted",
    duplicate: "Already posted",
    error: "Something went wrong",
  };

  const form = document.getElementById("post-form");
  const textarea = document.getElementById("announcement");
  const flyerInput = document.getElementById("flyer");
  const postButton = document.getElementById("post-button");
  const result = document.getElementById("result");
  const board = document.getElementById("board");
  const refreshButton = document.getElementById("refresh");
  const chips = document.querySelectorAll(".chip");

  const signInForm = document.getElementById("sign-in-form");
  const signInButton = document.getElementById("sign-in-button");
  const signInMessage = document.getElementById("sign-in-message");
  const modPanel = document.getElementById("mod-panel");
  const modWho = document.getElementById("mod-who");
  const signOutButton = document.getElementById("sign-out");
  const waitingBoard = document.getElementById("waiting-board");

  let events = [];
  let filter = "all";

  // ---------- helpers ----------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // "2026-10-29" as a local date, so the day never shifts with the time zone.
  function parseDate(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function todayString() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  // "19:00:00" becomes "7:00 PM".
  function formatTime(value) {
    if (!value) return "";
    const [h, m] = value.split(":").map(Number);
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  }

  function whenText(event) {
    const parts = [];
    if (event.event_date) {
      parts.push(parseDate(event.event_date).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      }));
    }
    const start = formatTime(event.start_time);
    const end = formatTime(event.end_time);
    if (start && end) parts.push(`${start} to ${end}`);
    else if (start) parts.push(start);
    return parts.join(" · ") || "Date and time to be announced";
  }

  // ---------- event cards ----------

  function eventCard(event) {
    const li = el("li", "event");

    if (event.event_date) {
      const date = parseDate(event.event_date);
      const box = el("div", "date");
      box.append(
        el("span", "mon", date.toLocaleDateString("en-US", { month: "short" })),
        el("span", "day", String(date.getDate())),
      );
      li.append(box);
    } else {
      const box = el("div", "date tba");
      box.append(el("span", "day", "TBA"));
      li.append(box);
    }

    const body = el("div", "event-body");
    body.append(el("p", "when", whenText(event)));
    body.append(el("h3", "", event.title || "Untitled event"));

    const place = [event.place_name, event.place_detail].filter(Boolean).join(", ");
    const meta = [event.club, place].filter(Boolean).join(" · ");
    if (meta) body.append(el("p", "meta", meta));
    if (event.summary) body.append(el("p", "summary", event.summary));

    const tags = el("p", "tags");
    if (event.cost) tags.append(el("span", "tag", event.cost));
    if (event.free_food) tags.append(el("span", "tag food", "🍕 Free food"));
    if (tags.childElementCount > 0) body.append(tags);

    li.append(body);

    if (event.flyer_url && event.flyer_url.startsWith(flyerPrefix)) {
      const img = el("img", "flyer");
      img.src = event.flyer_url;
      img.alt = `Flyer for ${event.title || "this event"}`;
      img.loading = "lazy";
      li.append(img);
    }
    return li;
  }

  function renderBoard() {
    board.replaceChildren();
    const shown = filter === "food" ? events.filter((e) => e.free_food) : events;
    if (shown.length === 0) {
      board.append(el("li", "empty",
        filter === "food" ? "No events with free food yet." : "No events yet. Post the first one!"));
      return;
    }
    for (const event of shown) board.append(eventCard(event));
  }

  async function loadEvents() {
    refreshButton.disabled = true;
    const { data, error } = await db
      .from("events")
      .select(COLUMNS)
      .eq("status", "published")
      .gte("event_date", todayString())
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false });
    refreshButton.disabled = false;

    if (error) {
      board.replaceChildren(el("li", "empty", "Couldn't load events. Please try Refresh."));
      console.error(error);
      return;
    }
    events = data || [];
    renderBoard();
  }

  // ---------- the agent's answer ----------

  function showResult(kind, message, reasons) {
    result.className = `result ${kind}`;
    result.replaceChildren();
    result.append(el("p", "result-label", RESULT_LABELS[kind] || RESULT_LABELS.error));
    if (message) result.append(el("p", "", message));
    if (reasons && reasons.length > 0) {
      const list = el("ul", "reasons");
      for (const reason of reasons) list.append(el("li", "", reason));
      result.append(list);
    }
    result.hidden = false;
  }

  async function sendPost(submitEvent) {
    submitEvent.preventDefault();
    const text = textarea.value.trim();
    if (!text) {
      showResult("error", "Please write your announcement first.", []);
      return;
    }
    const flyer = flyerInput.files[0];
    if (flyer && !["image/jpeg", "image/png"].includes(flyer.type)) {
      showResult("error", "The photo must be a JPG or PNG.", []);
      return;
    }
    if (flyer && flyer.size > MAX_FLYER_BYTES) {
      showResult("error", "The photo is too big. Please use a JPG or PNG up to 5 MB.", []);
      return;
    }

    postButton.disabled = true;
    postButton.textContent = "Checking your post…";
    try {
      const body = new FormData();
      body.append("announcement", text);
      if (flyer) body.append("flyer", flyer);
      const response = await fetch(agentUrl, {
        method: "POST",
        headers: { apikey: config.publishableKey },
        body,
      });
      const answer = await response.json().catch(() => ({}));

      if (!answer.ok) {
        showResult("error", answer.message || "The agent didn't answer. Please try again.", []);
        return;
      }
      showResult(answer.status, answer.message, answer.reasons);
      if (answer.status === "published" || answer.status === "waiting") {
        textarea.value = "";
        flyerInput.value = "";
      }
      if (answer.status === "published") {
        await loadEvents();
      }
    } catch (err) {
      console.error(err);
      showResult("error", "Couldn't reach the agent. Check your connection and try again.", []);
    } finally {
      postButton.disabled = false;
      postButton.textContent = "Post it";
    }
  }

  // ---------- moderators ----------

  let moderatorEmail = "";

  function reviewCard(event) {
    const li = eventCard(event);
    const review = el("div", "review");
    review.append(el("p", "why", event.status_reason || "Waiting for a moderator."));
    if (event.note_for_moderator) review.append(el("p", "", `Note from the agent: ${event.note_for_moderator}`));
    review.append(el("p", "original", event.announcement));

    const actions = el("p", "actions");
    const approve = el("button", "", "Approve");
    const reject = el("button", "ghost", "Reject");
    approve.type = "button";
    reject.type = "button";
    approve.addEventListener("click", () => reviewPost(event.id, "published", [approve, reject]));
    reject.addEventListener("click", () => reviewPost(event.id, "rejected", [approve, reject]));
    actions.append(approve, reject);
    review.append(actions);

    li.querySelector(".event-body").append(review);
    return li;
  }

  async function loadWaiting() {
    const { data, error } = await db
      .from("events")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: true });

    waitingBoard.replaceChildren();
    if (error) {
      console.error(error);
      waitingBoard.append(el("li", "empty", "Couldn't load waiting posts."));
      return;
    }
    if (!data || data.length === 0) {
      waitingBoard.append(el("li", "empty", "No posts are waiting."));
      return;
    }
    for (const event of data) waitingBoard.append(reviewCard(event));
  }

  async function reviewPost(id, status, buttons) {
    for (const button of buttons) button.disabled = true;
    const { error } = await db
      .from("events")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: moderatorEmail })
      .eq("id", id);
    if (error) {
      console.error(error);
      for (const button of buttons) button.disabled = false;
      alert("Couldn't save that. Please try again.");
      return;
    }
    await Promise.all([loadWaiting(), loadEvents()]);
  }

  function showModerator(session) {
    moderatorEmail = session?.user?.email || "";
    signInForm.hidden = Boolean(session);
    modPanel.hidden = !session;
    if (session) {
      modWho.textContent = `Signed in as ${moderatorEmail}`;
      loadWaiting();
    } else {
      waitingBoard.replaceChildren();
    }
  }

  async function signIn(submitEvent) {
    submitEvent.preventDefault();
    signInButton.disabled = true;
    signInMessage.hidden = true;
    const { error } = await db.auth.signInWithPassword({
      email: document.getElementById("mod-email").value.trim(),
      password: document.getElementById("mod-password").value,
    });
    signInButton.disabled = false;
    if (error) {
      signInMessage.textContent = "That email and password didn't work.";
      signInMessage.hidden = false;
      return;
    }
    document.getElementById("mod-password").value = "";
  }

  // ---------- wire it up ----------

  signInForm.addEventListener("submit", signIn);
  signOutButton.addEventListener("click", () => db.auth.signOut());
  db.auth.onAuthStateChange((_event, session) => {
    // Run outside the auth callback, as supabase-js recommends.
    setTimeout(() => showModerator(session), 0);
  });

  form.addEventListener("submit", sendPost);
  refreshButton.addEventListener("click", loadEvents);
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      filter = chip.dataset.filter;
      for (const other of chips) other.setAttribute("aria-pressed", String(other === chip));
      renderBoard();
    });
  }

  loadEvents();
})();
