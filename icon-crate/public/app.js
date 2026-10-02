import { ICONS } from "./icons.js";
import { localMatch } from "./match.js";

const form = document.getElementById("search");
const input = document.getElementById("keyword");
const crate = document.getElementById("crate");
const slots = document.getElementById("crate-slots");
const pile = document.getElementById("pile");
const pileCount = document.getElementById("pile-count");
const statusEl = document.getElementById("status");
const notice = document.getElementById("notice");
const modeEl = document.getElementById("mode");
const emptyKeyword = document.getElementById("empty-keyword");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const byId = new Map(ICONS.map((icon) => [icon.id, icon]));
const elements = new Map();
let requestSeq = 0;

// Small deterministic hash so each icon keeps the same "tossed" pose.
function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

function buildIcons() {
  for (const icon of ICONS) {
    const li = document.createElement("li");
    li.className = "icon";
    li.dataset.id = icon.id;
    li.title = `${icon.name} — ${icon.tags.join(", ")}`;
    const r = hash(icon.id);
    const r2 = hash(icon.id + "y");
    li.style.setProperty("--rot", `${Math.round((r - 0.5) * 28)}deg`);
    li.style.setProperty("--lift", `${Math.round((r2 - 0.5) * 18)}px`);
    li.style.setProperty("--bob-delay", `${(r * -4).toFixed(2)}s`);

    const tile = document.createElement("span");
    tile.className = "tile";
    const glyph = document.createElement("span");
    glyph.className = "glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = icon.emoji;
    const rank = document.createElement("span");
    rank.className = "rank";
    rank.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = icon.name;

    tile.append(rank, glyph);
    li.append(tile, label);
    elements.set(icon.id, li);
    pile.append(li);
  }
  updateCount(0);
}

function updateCount(matched) {
  pileCount.textContent = `${ICONS.length - matched} icons`;
}

function setCrateState(state) {
  crate.dataset.state = state;
}

function showNotice(text, kind = "info") {
  notice.hidden = !text;
  notice.textContent = text || "";
  notice.dataset.kind = kind;
}

// Move icons between pile and crate with a FLIP animation:
// measure, reorder the DOM, then animate each icon from its old spot.
function arrange(matchIds) {
  const first = new Map();
  for (const [id, el] of elements) first.set(id, el.getBoundingClientRect());

  const matched = new Set(matchIds);
  matchIds.forEach((id, i) => {
    const el = elements.get(id);
    el.classList.add("in-crate");
    el.querySelector(".rank").textContent = i + 1;
    el.setAttribute("aria-label", `${i + 1}. ${byId.get(id).name}`);
    slots.append(el);
  });
  for (const icon of ICONS) {
    if (matched.has(icon.id)) continue;
    const el = elements.get(icon.id);
    el.classList.remove("in-crate");
    el.querySelector(".rank").textContent = "";
    el.removeAttribute("aria-label");
    pile.append(el);
  }
  updateCount(matchIds.length);

  if (reducedMotion.matches) return;

  let returning = 0;
  for (const [id, el] of elements) {
    const a = first.get(id);
    const b = el.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    const toCrate = matched.has(id);
    const delay = toCrate ? 80 + matchIds.indexOf(id) * 70 : Math.min(returning++ * 15, 300);
    const scale = a.width / b.width || 1;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, zIndex: 5 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - (toCrate ? 60 : 20)}px) scale(${toCrate ? 1.2 : 1})`, zIndex: 5, offset: 0.55 },
        { transform: "translate(0, 0) scale(1)", zIndex: 5 },
      ],
      { duration: toCrate ? 720 : 520, delay, easing: "cubic-bezier(.3,.7,.25,1)", fill: "backwards" },
    );
  }
}

async function search(keyword) {
  keyword = keyword.trim();
  if (!keyword) {
    input.focus();
    return;
  }
  const seq = ++requestSeq;
  form.classList.add("busy");
  form.querySelector("button").disabled = true;
  setCrateState("loading");
  crate.setAttribute("aria-busy", "true");
  statusEl.textContent = `Asking for “${keyword}” matches…`;
  showNotice("");
  arrange([]);

  let data;
  let failed = null;
  try {
    const res = await fetch("/api/sort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) failed = data.error || `The server returned an error (${res.status}).`;
  } catch {
    failed = "Couldn't reach the local server. Is it still running?";
    data = { mode: "local", ids: localMatch(keyword, ICONS) };
  }
  if (seq !== requestSeq) return; // a newer search took over

  form.classList.remove("busy");
  form.querySelector("button").disabled = false;
  crate.removeAttribute("aria-busy");

  // Never trust the response blindly: keep only known, unique IDs.
  const seen = new Set();
  const ids = (Array.isArray(data?.ids) ? data.ids : []).filter(
    (id) => typeof id === "string" && byId.has(id) && !seen.has(id) && seen.add(id),
  );

  if (failed) {
    showNotice(
      `⚠️ ${failed}${ids.length ? " Showing local keyword matches instead." : ""}`,
      "error",
    );
  } else if (data.mode === "local" && data.notice) {
    showNotice(data.notice, "info");
  }

  const source = data?.mode === "claude" ? "Claude" : "local keyword matching";
  if (ids.length === 0) {
    setCrateState(failed && data?.mode !== "local" ? "idle" : "empty");
    emptyKeyword.textContent = `“${keyword}”`;
    statusEl.textContent = `No matches for “${keyword}” (${source}).`;
  } else {
    setCrateState("filled");
    statusEl.textContent = `${ids.length} match${ids.length === 1 ? "" : "es"} for “${keyword}”, sorted by ${source}.`;
  }
  arrange(ids);
}

async function loadStatus() {
  try {
    const status = await (await fetch("/api/status")).json();
    modeEl.hidden = false;
    if (status.mode === "claude") {
      modeEl.dataset.mode = "claude";
      modeEl.textContent = `✨ Sorted by Claude (${status.model})`;
    } else {
      modeEl.dataset.mode = "local";
      modeEl.textContent = "🔎 Local keyword-matching fallback — Claude is not configured";
      showNotice(status.missing, "info");
    }
  } catch {
    modeEl.hidden = false;
    modeEl.dataset.mode = "local";
    modeEl.textContent = "⚠️ Can't reach the local server";
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  search(input.value);
});

document.querySelectorAll(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    input.value = chip.textContent;
    search(chip.textContent);
  }),
);

buildIcons();
loadStatus();
