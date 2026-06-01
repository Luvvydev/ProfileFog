const TOPIC_LABELS = {
  home: "Home",
  cooking: "Cooking",
  pets: "Pets",
  tech: "Tech",
  travel: "Travel",
  outdoors: "Outdoors",
  sports: "Sports",
  fashion: "Fashion",
  auto: "Auto",
  finance: "Finance",
  hobbies: "Hobbies",
  wellness: "Wellness"
};

const fields = [
  "enabled", "mode", "searchEngine", "maxPerHour", "minDelayMinutes", "maxDelayMinutes",
  "dwellSeconds", "closeTabs", "openActive", "pauseOnSensitiveTab", "privacyHardening",
  "trackerBlocker", "trackingParameterCleanup", "trackerLearning", "autoBlockLearnedTrackers",
  "cookieBlockLearnedTrackers", "learningReviewMode", "seedKnownTrackers", "headerHeuristics",
  "breakageProtection", "avoidRecentTargets"
];

let currentState = null;
let saving = false;

init();

async function init() {
  bindStaticEvents();
  const result = await send({ type: "getState" });
  render(result.state);
}

function bindStaticEvents() {
  for (const id of fields) {
    const el = document.getElementById(id);
    if (!el) continue;
    const eventName = el.type === "checkbox" ? "change" : "input";
    el.addEventListener(eventName, debounce(saveFromUi, 250));
  }

  document.getElementById("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("runNow").addEventListener("click", async () => {
    await withBusy("runNow", async () => {
      const result = await send({ type: "runNow" });
      render(result.state);
    });
  });

  document.getElementById("clearLogs").addEventListener("click", async () => {
    const result = await send({ type: "clearLogs" });
    render(result.state);
  });

  document.getElementById("clearTrackerStats").addEventListener("click", async () => {
    const result = await send({ type: "clearTrackerStats" });
    render(result.state);
  });

  document.getElementById("clearLearnedTrackers").addEventListener("click", async () => {
    const result = await send({ type: "clearLearnedTrackers" });
    render(result.state);
  });

  document.getElementById("pauseSite").addEventListener("click", async () => {
    const result = await send({ type: "togglePauseCurrentSite" });
    render(result.state);
  });

  document.getElementById("learnedTrackers").addEventListener("click", handleDomainAction);
  document.getElementById("currentPageTrackers").addEventListener("click", handleDomainAction);

  document.getElementById("exportData").addEventListener("click", exportData);
  document.getElementById("importData").addEventListener("click", () => document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", importData);
}

async function handleDomainAction(event) {
  const button = event.target.closest("button[data-action][data-domain]");
  if (!button) return;
  const action = button.dataset.action;
  const domain = button.dataset.domain;
  let result;

  if (action === "site_allowed" || action === "reset_site") {
    result = await send({
      type: "setSiteDomainRule",
      domain,
      site: button.dataset.site || currentState?.currentPage?.root || "",
      state: action
    });
  } else {
    result = await send({
      type: "setLearnedTrackerState",
      domain,
      state: action
    });
  }

  render(result.state);
}

function render(state) {
  currentState = state;
  const settings = state.settings;

  setValue("enabled", settings.enabled);
  setValue("mode", settings.mode);
  setValue("searchEngine", settings.searchEngine);
  setValue("maxPerHour", settings.maxPerHour);
  setValue("minDelayMinutes", settings.minDelayMinutes);
  setValue("maxDelayMinutes", settings.maxDelayMinutes);
  setValue("dwellSeconds", settings.dwellSeconds);
  setValue("closeTabs", settings.closeTabs);
  setValue("openActive", settings.openActive);
  setValue("pauseOnSensitiveTab", settings.pauseOnSensitiveTab);
  setValue("privacyHardening", settings.privacyHardening);
  setValue("trackerBlocker", settings.trackerBlocker);
  setValue("trackingParameterCleanup", settings.trackingParameterCleanup);
  setValue("trackerLearning", settings.trackerLearning);
  setValue("autoBlockLearnedTrackers", settings.autoBlockLearnedTrackers);
  setValue("cookieBlockLearnedTrackers", settings.cookieBlockLearnedTrackers);
  setValue("learningReviewMode", settings.learningReviewMode);
  setValue("seedKnownTrackers", settings.seedKnownTrackers);
  setValue("headerHeuristics", settings.headerHeuristics);
  setValue("breakageProtection", settings.breakageProtection);
  setValue("avoidRecentTargets", settings.avoidRecentTargets);

  renderTopics(settings.topics || {});
  renderStatus(state);
  renderCurrentPage(state);
  renderTrackerStats(state);
  renderLearnedTrackers(state);
  renderLogs(state.logs || []);
}

function renderTopics(topics) {
  const root = document.getElementById("topics");
  root.innerHTML = "";
  for (const [key, label] of Object.entries(TOPIC_LABELS)) {
    const item = document.createElement("label");
    item.className = "topic";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.topic = key;
    input.checked = Boolean(topics[key]);
    input.addEventListener("change", debounce(saveFromUi, 250));

    const span = document.createElement("span");
    span.textContent = label;

    item.append(input, span);
    root.appendChild(item);
  }
}

function renderStatus(state) {
  const enabled = state.settings.enabled;
  document.getElementById("statusText").textContent = enabled ? "On" : "Off";

  if (!enabled) {
    document.getElementById("nextRun").textContent = "Next run: ready when enabled";
    return;
  }

  if (!state.nextRunAt) {
    document.getElementById("nextRun").textContent = "Next run: scheduling soon";
    return;
  }

  const date = new Date(state.nextRunAt);
  const hourCount = Array.isArray(state.hourlyRuns) ? state.hourlyRuns.length : 0;
  document.getElementById("nextRun").textContent = `Next run: ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${hourCount}/${state.settings.maxPerHour} this hour`;
}

function renderCurrentPage(state) {
  const page = state.currentPage || {};
  const info = document.getElementById("currentPageInfo");
  const siteName = document.getElementById("currentSiteName");
  const siteMeta = document.getElementById("currentSiteMeta");
  const pauseButton = document.getElementById("pauseSite");
  const root = document.getElementById("currentPageTrackers");
  root.innerHTML = "";

  if (!page.root) {
    info.textContent = "Open a website";
    siteName.textContent = "Open a website";
    siteMeta.textContent = "Page controls activate after a site loads.";
    pauseButton.disabled = true;
    return;
  }

  const count = page.trackerCount || 0;
  pauseButton.disabled = false;
  pauseButton.textContent = page.paused ? "Resume site" : "Pause site";
  siteName.textContent = page.root;
  siteMeta.textContent = `${count} tracker domain${count === 1 ? "" : "s"}${page.paused ? " · protection paused" : ""}`;
  info.textContent = `${count} domain${count === 1 ? "" : "s"}${page.paused ? " · paused" : ""}`;

  const items = page.trackers || [];
  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "Page tracker controls appear here as requests are observed.";
    root.appendChild(empty);
    return;
  }

  for (const item of items) {
    root.appendChild(renderTrackerRow(item, { site: page.root, currentPage: true }));
  }
}

function renderTrackerStats(state) {
  const stats = state.trackerStats || {};
  const enabledRulesets = state.enabledRulesets || [];

  document.getElementById("blockedTotal").textContent = String(stats.totalBlocked || 0);
  document.getElementById("cleanedTotal").textContent = String(stats.totalCleaned || 0);

  const root = document.getElementById("trackerStats");
  root.innerHTML = "";

  const rulesLine = document.createElement("p");
  const active = [];
  if (enabledRulesets.includes("tracker_rules")) active.push("tracker blocker");
  if (enabledRulesets.includes("cleanup_rules")) active.push("link cleanup");
  rulesLine.textContent = active.length ? `Active: ${active.join(", ")}` : "Tracker controls are ready.";
  root.appendChild(rulesLine);

  const topDomains = Object.entries(stats.byDomain || {}).slice(0, 5);
  if (topDomains.length) {
    const list = document.createElement("div");
    list.className = "domain-list";

    for (const [domain, count] of topDomains) {
      const row = document.createElement("div");
      const name = document.createElement("span");
      name.textContent = domain;
      const value = document.createElement("strong");
      value.textContent = String(count);
      row.append(name, value);
      list.appendChild(row);
    }

    root.appendChild(list);
  }
}

function renderLearnedTrackers(state) {
  const learned = state.learnedTrackers || {};
  document.getElementById("learnedObservedTotal").textContent = String(learned.totalObservedDomains || 0);
  document.getElementById("learnedSuspiciousTotal").textContent = String(learned.suspiciousCount || 0);
  document.getElementById("learnedBlockedTotal").textContent = String(learned.blockedCount || 0);
  document.getElementById("learnedCookieTotal").textContent = String(learned.cookieBlockedCount || 0);
  document.getElementById("learnedReadyTotal").textContent = String(learned.readyCount || 0);

  const root = document.getElementById("learnedTrackers");
  root.innerHTML = "";

  const threshold = learned.thresholds || {};
  const summary = document.createElement("p");
  summary.textContent = `Review at ${threshold.blockSites || 5} sites and ${threshold.blockRequests || 8} requests. Cookie mode starts at ${threshold.suspiciousSites || 3} sites.`;
  root.appendChild(summary);

  const items = learned.recent || [];
  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "Learned domains will appear as you browse.";
    root.appendChild(empty);
    return;
  }

  for (const item of items) {
    root.appendChild(renderTrackerRow(item, { currentPage: false }));
  }
}

function renderTrackerRow(item, options = {}) {
  const row = document.createElement("div");
  row.className = "learned-row";

  const main = document.createElement("div");
  main.className = "learned-main";

  const name = document.createElement("strong");
  name.textContent = item.domain;

  const meta = document.createElement("span");
  const pieces = [formatState(item.state)];
  if (item.firstPartyCount != null) pieces.push(`${item.firstPartyCount || 0} sites`);
  if (item.requestCount != null) pieces.push(`${item.requestCount || 0} requests`);
  if (item.heuristicScore) pieces.push(`score ${item.heuristicScore}`);
  if (item.seeded) pieces.push("seed");
  if (item.cookieSignals || item.setCookieSignals) pieces.push("cookies");
  if (item.count != null) pieces.push(`${item.count || 0} page hits`);
  meta.textContent = pieces.join(" · ");

  main.append(name, meta);

  const actions = document.createElement("div");
  actions.className = "learned-actions wrap";

  if (options.currentPage && item.state !== "site_allowed") {
    actions.appendChild(makeActionButton("Allow site", "site_allowed", item.domain, options.site));
  }
  if (item.state === "site_allowed") {
    actions.appendChild(makeActionButton("Reset site", "reset_site", item.domain, options.site));
  }
  if (!["allowed", "site_allowed"].includes(item.state)) actions.appendChild(makeActionButton("Allow all", "allowed", item.domain));
  if (!["manual_cookie_blocked", "cookie_blocked"].includes(item.state)) actions.appendChild(makeActionButton("Cookie", "manual_cookie_blocked", item.domain));
  if (!["blocked", "manual_blocked"].includes(item.state)) actions.appendChild(makeActionButton("Block", "manual_blocked", item.domain));
  actions.appendChild(makeActionButton("Reset", "reset", item.domain));

  row.append(main, actions);
  return row;
}

function makeActionButton(label, action, domain, site = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tiny";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.domain = domain;
  if (site) button.dataset.site = site;
  return button;
}

function formatState(state) {
  if (state === "manual_blocked") return "manual block";
  if (state === "blocked") return "block";
  if (state === "manual_cookie_blocked") return "manual cookie";
  if (state === "cookie_blocked") return "cookie";
  if (state === "ready") return "ready";
  if (state === "site_allowed") return "site allow";
  if (state === "allowed") return "allow";
  return state || "observed";
}

function renderLogs(logs) {
  const root = document.getElementById("logs");
  root.innerHTML = "";

  if (!logs.length) {
    const empty = document.createElement("p");
    empty.textContent = "Activity will appear here.";
    root.appendChild(empty);
    return;
  }

  for (const log of logs.slice(0, 30)) {
    const item = document.createElement("div");
    item.className = "log-item";

    const title = document.createElement("div");
    title.className = "log-title";
    title.textContent = log.label || log.type || "Activity";

    const meta = document.createElement("div");
    meta.className = "log-meta";
    const time = new Date(log.at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    meta.textContent = `${time} · ${log.detail || ""}`;

    item.append(title, meta);
    root.appendChild(item);
  }
}

async function saveFromUi() {
  if (saving) return;
  const patch = collectUiPatch();
  const result = await send({ type: "saveSettings", patch });
  render(result.state);
}

function collectUiPatch() {
  const topics = {};
  document.querySelectorAll("[data-topic]").forEach(input => {
    topics[input.dataset.topic] = input.checked;
  });

  return {
    enabled: getValue("enabled"),
    mode: getValue("mode"),
    searchEngine: getValue("searchEngine"),
    maxPerHour: getNumber("maxPerHour"),
    minDelayMinutes: getNumber("minDelayMinutes"),
    maxDelayMinutes: getNumber("maxDelayMinutes"),
    dwellSeconds: getNumber("dwellSeconds"),
    closeTabs: getValue("closeTabs"),
    openActive: getValue("openActive"),
    pauseOnSensitiveTab: getValue("pauseOnSensitiveTab"),
    privacyHardening: getValue("privacyHardening"),
    trackerBlocker: getValue("trackerBlocker"),
    trackingParameterCleanup: getValue("trackingParameterCleanup"),
    trackerLearning: getValue("trackerLearning"),
    autoBlockLearnedTrackers: getValue("autoBlockLearnedTrackers"),
    cookieBlockLearnedTrackers: getValue("cookieBlockLearnedTrackers"),
    learningReviewMode: getValue("learningReviewMode"),
    seedKnownTrackers: getValue("seedKnownTrackers"),
    headerHeuristics: getValue("headerHeuristics"),
    breakageProtection: getValue("breakageProtection"),
    avoidRecentTargets: getValue("avoidRecentTargets"),
    topics
  };
}

async function exportData() {
  const result = await send({ type: "exportData" });
  const blob = new Blob([JSON.stringify(result.exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `noiseprofile-export-${new Date().toISOString().slice(0, 10)}.json`;
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
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") el.checked = Boolean(value);
  else el.value = value;
}

function getValue(id) {
  const el = document.getElementById(id);
  return el.type === "checkbox" ? el.checked : el.value;
}

function getNumber(id) {
  return Number(document.getElementById(id).value);
}

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "Extension error");
  return response;
}

async function withBusy(buttonId, fn) {
  const button = document.getElementById(buttonId);
  button.disabled = true;
  try {
    await fn();
  } finally {
    button.disabled = false;
  }
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
