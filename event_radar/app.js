// Club Event Radar: the website. It runs in each visitor's browser (GitHub Pages only serves it).
// It reads published events from the database, refreshes itself every few seconds, and sends new posts
// to the AI agent. It knows only the project address and the publishable key, so it can do only what
// the security rules allow.
(function () {
  "use strict";
  var cfg = window.EVENT_RADAR_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  if (!cfg.supabaseUrl || /YOUR-PROJECT-REF/.test(cfg.supabaseUrl) || !cfg.publishableKey || /YOUR-KEY/.test(cfg.publishableKey)) {
    $("boardStatus").textContent = "Add your Project URL and publishable key to config.js first.";
    return;
  }
  if (/^sb_secret_/.test(cfg.publishableKey)) {
    $("boardStatus").textContent = "Stop: config.js holds the secret key. Replace it with the publishable key, then create a new secret key in Supabase.";
    return;
  }

  var baseUrl = cfg.supabaseUrl.replace(/\/+$/, "");
  var db = window.supabase.createClient(baseUrl, cfg.publishableKey);
  var AGENT_URL = baseUrl + "/functions/v1/submit-event";
  var REFRESH_MS = 15000; // the board checks for new posts this often while the tab is open
  // The website may read only these columns (the menu), never the raw announcement or moderator notes.
  var PUBLIC_COLUMNS = [
    "id", "created_at", "title", "club", "event_date", "start_time", "end_time", "place_name", "place_detail", "cost", "free_food", "summary",
    "flyer_url",
  ].join(",");

  /* ---------- small helpers ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text; // always textContent: posts are typed by strangers
    return e;
  }
  function parseDate(d) { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDate(d) { return d ? parseDate(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Date to be announced"; }
  function fmtDayHead(d) { return d ? parseDate(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Date to be announced"; }
  function fmtTime(t) {
    if (!t) return "";
    var p = t.split(":"), h = +p[0], ap = h >= 12 ? "PM" : "AM";
    return (h % 12 || 12) + ":" + p[1] + " " + ap;
  }
  function today() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function isThisWeek(d) { if (!d) return false; var diff = (parseDate(d) - today()) / 86400000; return diff >= 0 && diff < 7; }
  function isRecent(iso) { return iso && (Date.now() - Date.parse(iso)) < 5 * 60 * 1000; }
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.className = "toast show";
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = "toast"; }, 2400);
  }
  // What the agent looked at before it decided: the club list, the club's earlier posts, the lessons.
  function memo(lines) {
    if (!lines || !lines.length) return null;
    var box = el("div", "memo");
    box.appendChild(el("p", "memo-title", "What the agent looked at"));
    var ul = el("ul");
    lines.forEach(function (l) { ul.appendChild(el("li", null, l)); });
    box.appendChild(ul);
    return box;
  }

  /* ---------- drawers: the menu's add-ons slide in from the right ---------- */
  var openId = null;
  function openDrawer(id) {
    closeDrawer();
    var d = $(id); if (!d) return;
    d.hidden = false; $("scrim").hidden = false; openId = id;
    var first = d.querySelector("textarea, input:not([type=hidden])"); if (first) first.focus();
  }
  function closeDrawer() {
    if (!openId) return;
    $(openId).hidden = true; $("scrim").hidden = true; openId = null;
  }
  $("openPost").addEventListener("click", function () { openDrawer("postDrawer"); });
  $("scrim").addEventListener("click", closeDrawer);
  qa("[data-close]").forEach(function (b) { b.addEventListener("click", closeDrawer); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  /* ---------- one event card: date badge, details, and (from Stage 7) the flyer ---------- */
  function dateBadge(d) {
    var box = el("div", "date");
    if (!d) { box.className = "date tba"; box.appendChild(el("span", "day-num", "TBA")); return box; }
    var day = parseDate(d);
    box.appendChild(el("span", "mon", day.toLocaleDateString("en-US", { month: "short" })));
    box.appendChild(el("span", "day-num", String(day.getDate())));
    return box;
  }
  function card(ev, extra) {
    var li = el("article", "event");
    li.appendChild(dateBadge(ev.event_date));
    var body = el("div", "event-body");
    var time = ev.start_time ? fmtTime(ev.start_time) + (ev.end_time ? " to " + fmtTime(ev.end_time) : "") : "Time to be announced";
    body.appendChild(el("p", "when", fmtDate(ev.event_date) + " · " + time));
    body.appendChild(el("h3", null, ev.title || "Untitled event"));
    var where = [ev.place_name, ev.place_detail].filter(Boolean).join(", ");
    var meta = [ev.club, where].filter(Boolean).join(" · ");
    if (meta) body.appendChild(el("p", "meta", meta));
    if (ev.summary) body.appendChild(el("p", "summary", ev.summary));
    var tags = el("p", "tags");
    if (ev.cost) tags.appendChild(el("span", "tag", ev.cost));
    if (ev.free_food) tags.appendChild(el("span", "tag food", "🍕 Free food"));
    if (ev.place_name === "Online") tags.appendChild(el("span", "tag", "💻 Online"));
    if (tags.childNodes.length) body.appendChild(tags);
    if (extra) body.appendChild(extra);
    li.appendChild(body);
    if (ev.flyer_url && ev.flyer_url.indexOf(baseUrl + "/storage/v1/object/public/flyers/") === 0) {
      var img = el("img", "flyer");
      img.src = ev.flyer_url;
      img.alt = "Flyer for " + (ev.title || "this event");
      img.loading = "lazy";
      li.appendChild(img);
    }
    return li;
  }

  /* ---------- the board: published events, grouped by day, refreshed by itself ---------- */
  var events = [], filter = "all", seen = null;
  function visible() {
    return events.filter(function (ev) {
      if (filter === "week") return isThisWeek(ev.event_date);
      if (filter === "food") return ev.free_food;
      if (filter === "online") return ev.place_name === "Online";
      return true;
    });
  }
  function renderBoard() {
    var list = $("board"), shown = visible(), i = 0;
    list.textContent = "";
    if (!shown.length) {
      var empty = el("div", "empty");
      empty.appendChild(el("b", null, events.length ? "Nothing matches this filter." : "No events yet."));
      empty.appendChild(el("span", null, events.length ? "Try another filter." : "Post one in the club chat, and it shows up here."));
      list.appendChild(empty);
    }
    var groups = {}, order = [];
    shown.forEach(function (ev) { var k = ev.event_date || ""; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(ev); });
    order.forEach(function (k) {
      var day = el("section", "day"), head = el("div", "day-head");
      head.appendChild(el("h2", null, fmtDayHead(k)));
      head.appendChild(el("span", "n", groups[k].length + (groups[k].length === 1 ? " event" : " events")));
      day.appendChild(head);
      groups[k].forEach(function (ev) {
        var c = card(ev);
        c.style.setProperty("--i", String(i++));
        if (seen && !seen[ev.id] && isRecent(ev.created_at)) c.classList.add("new");
        day.appendChild(c);
      });
      list.appendChild(day);
    });
    $("statCount").textContent = String(events.length);
    $("statWeek").textContent = String(events.filter(function (ev) { return isThisWeek(ev.event_date); }).length);
    $("statFood").textContent = String(events.filter(function (ev) { return ev.free_food; }).length);
    $("boardStatus").textContent = shown.length ? shown.length + (shown.length === 1 ? " event" : " events") + (filter !== "all" ? " shown" : "") : "";
  }
  function loadBoard(quiet) {
    if (!quiet) $("boardStatus").textContent = "Loading…";
    $("live").classList.add("busy");
    return db.from("events").select(PUBLIC_COLUMNS).eq("status", "published")
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("start_time", { ascending: true, nullsFirst: false })
      .then(function (res) {
        $("live").classList.remove("busy");
        if (res.error) { $("boardStatus").textContent = "Couldn't load events: " + res.error.message; return; }
        var changed = res.data.length !== events.length || res.data.some(function (ev, k) { return !events[k] || events[k].id !== ev.id; });
        if (!changed && quiet) return;
        var before = seen; seen = {};
        res.data.forEach(function (ev) { seen[ev.id] = true; });
        var fresh = res.data.filter(function (ev) { return before && !before[ev.id] && isRecent(ev.created_at); }).length;
        events = res.data;
        var keep = seen; seen = before; renderBoard(); seen = keep;
        if (fresh) toast(fresh === 1 ? "A new event just arrived" : fresh + " new events just arrived");
      });
  }
  $("refreshBtn").addEventListener("click", function () { loadBoard(false); });
  qa("#filters .chip").forEach(function (b) {
    b.addEventListener("click", function () {
      filter = b.getAttribute("data-filter");
      qa("#filters .chip").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      renderBoard();
    });
  });
  setInterval(function () { if (document.visibilityState === "visible" && !openId) loadBoard(true); }, REFRESH_MS);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") loadBoard(true); });

  /* ---------- posting by hand: send it to the AI agent ---------- */
  var LABELS = { published: "Published", waiting: "Waiting for a moderator", rejected: "Not posted", duplicate: "Already posted", paused: "The agent is paused", limit: "Daily limit reached", error: "Something went wrong" };
  function showResult(data) {
    var box = $("postResult"), kind = data.ok || data.status === "limit" ? data.status : "error";
    box.hidden = false;
    box.className = "result " + kind;
    box.textContent = "";
    box.appendChild(el("p", "result-label", LABELS[kind] || kind));
    box.appendChild(el("p", null, data.message || ""));
    if (data.reasons && data.reasons.length) {
      var ul = el("ul", "reasons");
      data.reasons.forEach(function (r) { ul.appendChild(el("li", null, r)); });
      box.appendChild(ul);
    }
    if (data.event && data.status !== "rejected") box.appendChild(card(data.event));
    var looked = memo(data.looked_at);
    if (looked) box.appendChild(looked);
  }
  $("postForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var form = $("postForm"), btn = $("postBtn");
    var photo = $("flyer").files[0];
    if (photo && photo.size > 5 * 1024 * 1024) { showResult({ ok: false, message: "The photo must be 5 MB or smaller." }); return; }
    btn.disabled = true;
    btn.textContent = "The agent is reading it…";
    // The publishable key goes on the apikey header only (never as an Authorization bearer token).
    fetch(AGENT_URL, { method: "POST", headers: { apikey: cfg.publishableKey }, body: new FormData(form) })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false, message: "The agent didn't answer (" + r.status + "). Is the function deployed?" }; });
      })
      .then(function (data) {
        showResult(data);
        // Paused: keep the text, so the post can be sent again once the agent is back.
        if (data.ok && data.status !== "paused") { form.reset(); loadBoard(true); }
      })
      .catch(function () { showResult({ ok: false, message: "Couldn't reach the agent. Check your internet connection and the Project URL in config.js." }); })
      .then(function () { btn.disabled = false; btn.textContent = "Post it"; });
  });

  // Say who drafts the cards (a quick check that doesn't call the AI).
  fetch(AGENT_URL, { headers: { apikey: cfg.publishableKey } })
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.ai) $("aiNote").textContent = "Event cards are drafted by an AI agent, " + d.ai + ", and checked against the posting rules."; })
    .catch(function () { /* the website still works without this note */ });

  /* ---------- moderator: sign-in, the review queue, and the tools ---------- */
  var session = null;
  $("openMod").addEventListener("click", function () { openDrawer("modDrawer"); });
  qa(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      qa(".tab").forEach(function (o) { o.setAttribute("aria-selected", String(o === t)); });
      qa(".tabpanel").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t.getAttribute("data-tab"); });
    });
  });
  function renderMod() {
    $("signInForm").hidden = Boolean(session);
    $("modArea").hidden = !session;
    if (session) {
      $("modWho").textContent = session.user.email;
      loadWaiting();
      loadLessons();
      loadPermissions();
    }
  }
  function review(ev, status) {
    var stamp = { reviewed_at: new Date().toISOString(), reviewed_by: session.user.email };
    db.from("events")
      .update({ status: status, reviewed_at: stamp.reviewed_at, reviewed_by: stamp.reviewed_by })
      .eq("id", ev.id)
      .then(function (res) {
        if (res.error) { $("waitingStatus").textContent = "Couldn't save that: " + res.error.message; return; }
        // Approving an update retires the post it replaces, so the website never shows both.
        if (status === "published" && ev.updates_id) {
          return db.from("events")
            .update({ status: "replaced", status_reason: "Replaced by a newer post the moderator approved.", reviewed_at: stamp.reviewed_at, reviewed_by: stamp.reviewed_by })
            .eq("id", ev.updates_id).in("status", ["published", "waiting"]);
        }
      })
      .then(function () {
        toast(status === "published" ? "Approved and posted" : "Rejected");
        loadWaiting();
        loadBoard(true);
      });
  }
  function loadWaiting() {
    $("waitingStatus").textContent = "Loading…";
    db.from("events").select("*").eq("status", "waiting").order("created_at", { ascending: true })
      .then(function (res) {
        var list = $("waitingList");
        list.textContent = "";
        if (res.error) { $("waitingStatus").textContent = "Couldn't load waiting posts: " + res.error.message; return; }
        res.data.forEach(function (ev) {
          var box = el("div", "review");
          if (ev.status_reason) box.appendChild(el("p", "why", "Why it's waiting: " + ev.status_reason));
          box.appendChild(el("p", "original", "Original post: " + ev.announcement));
          var looked = memo(ev.agent_notes);
          if (looked) box.appendChild(looked);
          // Teach the agent while the post is fresh: the lesson is saved with the decision.
          var teachLabel = el("label", "teach-inline");
          teachLabel.appendChild(el("span", null, "Teach the agent something (optional)"));
          var teachInput = el("input");
          teachInput.type = "text"; teachInput.maxLength = 300;
          teachInput.placeholder = "One sentence the agent should remember next time.";
          teachLabel.appendChild(teachInput);
          box.appendChild(teachLabel);
          var approve = el("button", null, "Approve");
          var reject = el("button", "ghost", "Reject");
          approve.type = reject.type = "button";
          function decideThen(status) {
            var lesson = teachInput.value.trim();
            if (lesson) { saveLesson(lesson, ev.id).then(function () { review(ev, status); }); return; }
            review(ev, status);
          }
          approve.addEventListener("click", function () { decideThen("published"); });
          reject.addEventListener("click", function () { decideThen("rejected"); });
          var row = el("div", "actions-row");
          row.appendChild(approve);
          row.appendChild(reject);
          box.appendChild(row);
          var li = el("li");
          li.appendChild(card(ev, box));
          list.appendChild(li);
        });
        $("waitingCount").textContent = String(res.data.length);
        $("waitingStatus").textContent = res.data.length ? res.data.length + " waiting" : "Nothing is waiting. Nice work.";
      });
  }
  $("signInForm").addEventListener("submit", function (e) {
    e.preventDefault();
    $("signInMsg").textContent = "Signing in…";
    db.auth.signInWithPassword({ email: $("modEmail").value.trim(), password: $("modPassword").value })
      .then(function (res) {
        $("modPassword").value = "";
        // Show Supabase's own reason, such as "Invalid login credentials", so problems are easy to spot.
        $("signInMsg").textContent = res.error ? "Sign-in didn't work: " + res.error.message : "";
      })
      .catch(function () { $("signInMsg").textContent = "Supabase couldn't be reached. Check your internet connection and try again."; });
  });
  $("signOutBtn").addEventListener("click", function () { db.auth.signOut(); });
  db.auth.onAuthStateChange(function (_event, s) { session = s; renderMod(); });
  db.auth.getSession().then(function (res) { session = res.data.session; renderMod(); });

  // Tools: clear the board. Every post goes; the club list and the lessons stay.
  $("clearBtn").addEventListener("click", function () {
    if (!window.confirm("Delete every post on the board? This can't be undone. The club list and the lessons stay.")) return;
    $("toolsMsg").textContent = "Clearing…";
    db.from("events").delete().not("id", "is", null).then(function (res) {
      if (res.error) { $("toolsMsg").textContent = "Couldn't clear the board: " + res.error.message; return; }
      $("toolsMsg").textContent = "The board is empty.";
      toast("Board cleared");
      loadWaiting(); loadBoard(true);
    });
  });

  /* ---------- lessons: what moderators teach the agent ---------- */
  function saveLesson(text, fromPost) {
    return db.from("lessons").insert({ lesson: text.slice(0, 300), created_by: session.user.email, from_post: fromPost || null })
      .then(function (res) {
        $("teachMsg").textContent = res.error ? "Couldn't save the lesson: " + res.error.message : "Saved. The agent reads it with the next post.";
        if (!res.error) toast("Lesson saved");
        loadLessons();
      });
  }
  function loadLessons() {
    $("lessonsStatus").textContent = "Loading…";
    db.from("lessons").select("*").order("created_at", { ascending: true })
      .then(function (res) {
        var list = $("lessonsList");
        list.textContent = "";
        if (res.error) { $("lessonsStatus").textContent = "Couldn't load the lessons: " + res.error.message; return; }
        res.data.forEach(function (l) {
          var li = el("li", "lesson" + (l.active ? "" : " off"));
          var sw = el("label", "switch");
          var box = el("input");
          box.type = "checkbox"; box.checked = l.active;
          box.setAttribute("aria-label", (l.active ? "Switch off: " : "Switch on: ") + l.lesson);
          box.addEventListener("change", function () {
            db.from("lessons").update({ active: box.checked }).eq("id", l.id).then(function (r) {
              if (r.error) { $("lessonsStatus").textContent = "Couldn't change that: " + r.error.message; box.checked = !box.checked; return; }
              toast(box.checked ? "Lesson on" : "Lesson off: the agent forgets it");
              loadLessons();
            });
          });
          sw.appendChild(box);
          sw.appendChild(el("span", "knob"));
          li.appendChild(sw);
          var body = el("div", "lesson-body");
          body.appendChild(el("p", "lesson-text", l.lesson));
          body.appendChild(el("p", "lesson-meta", (l.active ? "On" : "Off, the agent no longer reads it") + (l.created_by ? " · by " + l.created_by : "") + " · " + new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })));
          li.appendChild(body);
          list.appendChild(li);
        });
        var on = res.data.filter(function (l) { return l.active; }).length;
        $("lessonsCount").textContent = String(on);
        $("lessonsStatus").textContent = res.data.length ? on + " of " + res.data.length + " lesson" + (res.data.length === 1 ? "" : "s") + " switched on" : "No lessons yet. The agent follows only the posting rules.";
      });
  }
  $("teachForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var text = $("lessonText").value.trim();
    if (!text) return;
    saveLesson(text, null).then(function () { $("lessonText").value = ""; });
  });

  /* ---------- permissions: the switches and numbers the agent reads on every post ---------- */
  function shownValue(p) { return p.kind === "switch" ? (p.value === 1 ? "On" : "Off") : String(p.value); }
  function stamp(iso) {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  // A change needs a reason typed first, and is saved under the signed-in moderator's email.
  function savePermission(p, value, reasonInput, undo) {
    var reason = reasonInput.value.trim();
    if (reason.length < 3) {
      $("permissionsStatus").textContent = "Type a reason for changing “" + p.label + "” first.";
      reasonInput.focus();
      if (undo) undo();
      return;
    }
    db.from("agent_permissions")
      .update({ value: value, reason: reason.slice(0, 300), changed_by: session.user.email, updated_at: new Date().toISOString() })
      .eq("key", p.key)
      .then(function (res) {
        if (res.error) {
          $("permissionsStatus").textContent = "Couldn't change “" + p.label + "”: " + res.error.message;
          if (undo) undo();
          return;
        }
        toast("“" + p.label + "” is now " + shownValue({ kind: p.kind, value: value }));
        loadPermissions();
      });
  }
  function loadPermissions() {
    $("permissionsStatus").textContent = "Loading…";
    db.from("agent_permissions").select("*").order("sort", { ascending: true })
      .then(function (res) {
        var list = $("permissionsList");
        list.textContent = "";
        if (res.error) { $("permissionsStatus").textContent = "Couldn't load the permissions: " + res.error.message; return; }
        res.data.forEach(function (p) {
          var li = el("li", "lesson" + (p.kind === "switch" && p.value !== 1 ? " off" : ""));
          var reasonInput = el("input");
          reasonInput.type = "text"; reasonInput.maxLength = 300;
          reasonInput.placeholder = "Why are you changing it? (needed first)";

          if (p.kind === "switch") {
            var sw = el("label", "switch");
            var box = el("input");
            box.type = "checkbox"; box.checked = p.value === 1;
            box.setAttribute("aria-label", (box.checked ? "Switch off: " : "Switch on: ") + p.label);
            box.addEventListener("change", function () {
              savePermission(p, box.checked ? 1 : 0, reasonInput, function () { box.checked = !box.checked; });
            });
            sw.appendChild(box);
            sw.appendChild(el("span", "knob"));
            li.appendChild(sw);
          } else {
            li.appendChild(el("span", "count", String(p.value)));
          }

          var body = el("div", "lesson-body");
          body.appendChild(el("p", "lesson-text", p.label + ": " + shownValue(p)));
          body.appendChild(el("p", "lesson-meta", "Reason: " + p.reason));
          body.appendChild(el("p", "lesson-meta", "Changed by " + (p.changed_by || "nobody yet") + " · " + stamp(p.updated_at)));
          var why = el("label", "teach-inline");
          why.appendChild(el("span", null, p.kind === "switch" ? "Reason, then flip the switch" : "New number and reason"));
          if (p.kind === "number") {
            var num = el("input");
            num.type = "number"; num.min = "0"; num.max = "100000"; num.step = "1"; num.value = String(p.value);
            num.setAttribute("aria-label", "New value for " + p.label);
            why.appendChild(num);
          }
          why.appendChild(reasonInput);
          body.appendChild(why);
          if (p.kind === "number") {
            var save = el("button", "ghost small", "Save");
            save.type = "button";
            save.addEventListener("click", function () {
              var n = Number(num.value);
              if (!Number.isInteger(n) || n < 0 || n > 100000) { $("permissionsStatus").textContent = "“" + p.label + "” must be a whole number from 0 to 100000."; return; }
              savePermission(p, n, reasonInput, null);
            });
            var row = el("div", "actions-row");
            row.appendChild(save);
            body.appendChild(row);
          }
          li.appendChild(body);
          list.appendChild(li);
        });
        $("permissionsCount").textContent = String(res.data.length);
        var paused = res.data.some(function (p) { return p.key === "paused" && p.value === 1; });
        $("permissionsStatus").textContent = paused
          ? "The agent is paused: it reads no posts and calls no AI until Paused is switched off."
          : res.data.length + " switches and numbers. The agent reads them with every post.";
      });
  }

  loadBoard(false);
})();
