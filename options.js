const fields = [
  "enabled", "mode", "searchEngine", "maxPerHour", "minDelayMinutes", "maxDelayMinutes",
  "dwellSeconds", "closeTabs", "openActive", "pauseOnSensitiveTab", "privacyHardening",
  "trackerBlocker", "trackingParameterCleanup", "trackerLearning", "autoBlockLearnedTrackers",
  "cookieBlockLearnedTrackers", "learningReviewMode", "seedKnownTrackers", "headerHeuristics",
  "breakageProtection", "avoidRecentTargets"
];

let currentState = null;

init();

async function init() {
  document.getElementById("saveSettings").addEventListener("click", saveSettings);
  document.getElementById("refreshState").addEventListener("click", refresh);
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

  renderLearned(learned.recent || []);
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
