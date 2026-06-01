const fields = [
  "enabled", "mode", "searchEngine", "maxPerHour", "minDelayMinutes", "maxDelayMinutes",
  "dwellSeconds", "closeTabs", "openActive", "pauseOnSensitiveTab", "privacyHardening",
  "trackerBlocker", "trackingParameterCleanup", "trackerLearning", "autoBlockLearnedTrackers",
  "cookieBlockLearnedTrackers", "learningReviewMode", "seedKnownTrackers", "headerHeuristics",
  "cnameWatcher", "fingerprintWatcher", "breakageProtection", "avoidRecentTargets"
];

let currentState = null;

init();

async function init() {
  document.getElementById("saveSettings").addEventListener("click", saveSettings);
  document.getElementById("refreshState").addEventListener("click", refresh);
  document.getElementById("clearRequestLog").addEventListener("click", async () => {
    const result = await send({ type: "clearRequestLog" });
    render(result.state);
    setStatus("Request log cleared.");
  });
  document.getElementById("clearCnameSuspects").addEventListener("click", async () => {
    const result = await send({ type: "clearCnameSuspects" });
    render(result.state);
    setStatus("CNAME watcher list cleared.");
  });
  document.getElementById("clearFingerprintEvents").addEventListener("click", async () => {
    const result = await send({ type: "clearFingerprintEvents" });
    render(result.state);
    setStatus("Fingerprint watcher list cleared.");
  });
  document.getElementById("clearLearnedTrackers").addEventListener("click", async () => {
    const result = await send({ type: "clearLearnedTrackers" });
    render(result.state);
    setStatus("Learned tracker memory cleared.");
  });
  document.getElementById("learnedList").addEventListener("click", handleDomainAction);
  document.getElementById("exportData").addEventListener("click", exportData);
  document.getElementById("importData").addEventListener("click", () => document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", importData);
  for (const id of fields) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener(el.type === "checkbox" ? "change" : "input", () => setStatus("Unsaved changes."));
  }
  await refresh();
}

async function refresh() {
  const result = await send({ type: "getState" });
  render(result.state);
  setStatus("Ready.");
}

function render(state) {
  currentState = state;
  const settings = state.settings || {};
  for (const id of fields) setValue(id, settings[id]);

  const learned = state.learnedTrackers || {};
  document.getElementById("observedCount").textContent = String(learned.totalObservedDomains || 0);
  document.getElementById("readyCount").textContent = String(learned.readyCount || 0);
  document.getElementById("blockedCount").textContent = String(learned.blockedCount || 0);
  document.getElementById("cookieCount").textContent = String(learned.cookieBlockedCount || 0);
  document.getElementById("requestLogCount").textContent = String((state.requestLog || []).length);
  document.getElementById("cnameCount").textContent = String(state.cnameSuspects?.total || 0);
  document.getElementById("fingerprintCount").textContent = String((state.fingerprintEvents || []).length);

  renderLearned(learned.recent || []);
  renderCnameSuspects(state.cnameSuspects?.recent || []);
  renderFingerprintEvents(state.fingerprintEvents || [], state.fingerprintEventLimit || 120);
  renderRequestLog(state.requestLog || [], state.requestLogLimit || 300);
}


function renderCnameSuspects(items) {
  const root = document.getElementById("cnameList");
  root.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "Possible CNAME cloaking signals will appear here.";
    root.appendChild(empty);
    return;
  }

  for (const item of items.slice(0, 40)) {
    const row = document.createElement("div");
    row.className = "watcher-row";

    const main = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.host || "unknown";

    const indicators = Object.entries(item.indicators || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)
      .map(([key, count]) => `${key} ×${count}`);

    const meta = document.createElement("span");
    meta.textContent = [
      `${item.count || 0} hits`,
      `${item.firstPartyCount || 0} sites`,
      indicators.join(", "),
      formatTime(item.lastSeen)
    ].filter(Boolean).join(" · ");

    main.append(title, meta);
    row.appendChild(main);
    root.appendChild(row);
  }
}

function renderFingerprintEvents(items, limit) {
  const root = document.getElementById("fingerprintList");
  root.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "Fingerprinting signals will appear here when the watcher is enabled.";
    root.appendChild(empty);
    return;
  }

  const note = document.createElement("p");
  note.textContent = `Showing ${items.length} of ${limit} retained events.`;
  root.appendChild(note);

  for (const item of items.slice(0, 60)) {
    const row = document.createElement("div");
    row.className = "watcher-row";

    const main = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.api || "unknown";

    const meta = document.createElement("span");
    meta.textContent = [
      item.domain || "",
      item.firstParty ? `on ${item.firstParty}` : "",
      formatTime(item.at)
    ].filter(Boolean).join(" · ");

    main.append(title, meta);
    row.appendChild(main);
    root.appendChild(row);
  }
}


function renderRequestLog(items, limit) {
  const root = document.getElementById("requestLogList");
  root.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "Request events will appear as pages load and rules match.";
    root.appendChild(empty);
    return;
  }

  const note = document.createElement("p");
  note.textContent = `Showing ${items.length} of ${limit} retained events.`;
  root.appendChild(note);

  for (const item of items.slice(0, 80)) {
    const row = document.createElement("div");
    row.className = `request-row ${item.action || "observed"}`;

    const main = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.domain || "unknown";

    const meta = document.createElement("span");
    const parts = [
      item.action || "observed",
      item.type || "other",
      item.firstParty ? `on ${item.firstParty}` : "",
      item.reason || "",
      formatTime(item.at)
    ].filter(Boolean);
    meta.textContent = parts.join(" · ");

    main.append(title, meta);

    const pill = document.createElement("span");
    pill.className = "request-pill";
    pill.textContent = item.source || "observer";

    row.append(main, pill);
    root.appendChild(row);
  }
}

function formatTime(value) {
  const ts = Number(value) || 0;
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function renderLearned(items) {
  const root = document.getElementById("learnedList");
  root.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "Learned domains will appear after browsing activity is observed.";
    root.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "tracker-row";

    const main = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.domain;

    const meta = document.createElement("span");
    const parts = [
      item.state || "observed",
      `${item.firstPartyCount || 0} sites`,
      `${item.requestCount || 0} requests`
    ];
    if (item.heuristicScore) parts.push(`score ${item.heuristicScore}`);
    if (item.seeded) parts.push("seed");
    if (item.cookieSignals || item.setCookieSignals) parts.push("cookies");
    meta.textContent = parts.join(" · ");

    main.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      button("Allow", "allowed", item.domain),
      button("Cookie", "manual_cookie_blocked", item.domain),
      button("Block", "manual_blocked", item.domain),
      button("Reset", "reset", item.domain)
    );

    row.append(main, actions);
    root.appendChild(row);
  }
}

function button(label, action, domain) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.dataset.action = action;
  btn.dataset.domain = domain;
  return btn;
}

async function handleDomainAction(event) {
  const btn = event.target.closest("button[data-action][data-domain]");
  if (!btn) return;
  const result = await send({
    type: "setLearnedTrackerState",
    domain: btn.dataset.domain,
    state: btn.dataset.action
  });
  render(result.state);
  setStatus(`${btn.dataset.domain} updated.`);
}

async function saveSettings() {
  const result = await send({ type: "saveSettings", patch: collectPatch() });
  render(result.state);
  setStatus("Settings saved.");
}

function collectPatch() {
  const patch = {};
  for (const id of fields) {
    const el = document.getElementById(id);
    if (!el) continue;
    patch[id] = el.type === "checkbox" ? el.checked : (el.type === "number" ? Number(el.value) : el.value);
  }
  return patch;
}

async function exportData() {
  const result = await send({ type: "exportData" });
  const blob = new Blob([JSON.stringify(result.exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `profilefog-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const payload = JSON.parse(text);
  const result = await send({ type: "importData", payload });
  event.target.value = "";
  render(result.state);
  setStatus("Import complete.");
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") el.checked = Boolean(value);
  else el.value = value;
}

function setStatus(text) {
  document.getElementById("statusLine").textContent = text;
}

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "Extension error");
  return response;
}
