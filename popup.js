const fields = ["enabled"];

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

  bindClick("openOptions", openSettings);
  bindClick("openOptionsFooter", openSettings);

  bindClick("runNow", async () => {
    await withBusy("runNow", async () => {
      const result = await send({ type: "runNow" });
      render(result.state);
    });
  });

  bindClick("pauseSite", async () => {
    const result = await send({ type: "togglePauseCurrentSite" });
    render(result.state);
  });

  const currentPageTrackers = document.getElementById("currentPageTrackers");
  if (currentPageTrackers) currentPageTrackers.addEventListener("click", handleDomainAction);
}

function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
}

function openSettings() {
  chrome.runtime.openOptionsPage();
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
  const settings = state.settings || {};

  setValue("enabled", settings.enabled);
  renderStatus(state);
  renderCurrentPage(state);
  renderTrackerStats(state);
  renderLearnedTrackers(state);
}

function renderStatus(state) {
  const settings = state.settings || {};
  const enabled = Boolean(settings.enabled);
  document.body.classList.toggle("is-on", enabled);
  document.getElementById("statusText").textContent = enabled ? "On" : "Off";

  const subtitle = document.getElementById("subtitle");
  if (subtitle) subtitle.textContent = `${searchEngineLabel(settings.searchEngine)} noise`;

  if (!enabled) {
    document.getElementById("nextRun").textContent = "Paused";
    return;
  }

  if (!state.nextRunAt) {
    document.getElementById("nextRun").textContent = "Scheduling";
    return;
  }

  const date = new Date(state.nextRunAt);
  const hourCount = Array.isArray(state.hourlyRuns) ? state.hourlyRuns.length : 0;
  document.getElementById("nextRun").textContent = `${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${hourCount}/${settings.maxPerHour || 0}`;
}

function searchEngineLabel(value) {
  if (value === "google") return "Google";
  if (value === "bing") return "Bing";
  if (value === "brave") return "Brave";
  return "DuckDuckGo";
}

function renderCurrentPage(state) {
  const page = state.currentPage || {};
  const info = document.getElementById("currentPageInfo");
  const siteName = document.getElementById("currentSiteName");
  const siteMeta = document.getElementById("currentSiteMeta");
  const pauseButton = document.getElementById("pauseSite");
  const root = document.getElementById("currentPageTrackers");
  if (!info || !siteName || !siteMeta || !pauseButton || !root) return;

  root.innerHTML = "";

  if (!page.root) {
    info.textContent = "Page";
    siteName.textContent = "Open a website";
    siteMeta.textContent = "No page loaded";
    pauseButton.disabled = true;
    pauseButton.textContent = "Pause";
    appendEmpty(root, "No site yet");
    return;
  }

  const count = page.trackerCount || 0;
  pauseButton.disabled = false;
  pauseButton.textContent = page.paused ? "Resume" : "Pause";
  siteName.textContent = page.root;
  siteMeta.textContent = page.paused ? `${count} seen · paused` : `${count} seen`;
  info.textContent = "This page";

  const items = page.trackers || [];
  if (!items.length) {
    appendEmpty(root, "No trackers seen here");
    return;
  }

  for (const item of items.slice(0, 6)) {
    root.appendChild(renderTrackerRow(item, { site: page.root, currentPage: true }));
  }
}

function appendEmpty(root, text) {
  const empty = document.createElement("p");
  empty.textContent = text;
  root.appendChild(empty);
}

function renderTrackerStats(state) {
  const stats = state.trackerStats || {};
  setText("blockedTotal", String(stats.totalBlocked || 0));
  setText("cleanedTotal", String(stats.totalCleaned || 0));
}

function renderLearnedTrackers(state) {
  const learned = state.learnedTrackers || {};
  setText("learnedObservedTotal", String(learned.totalObservedDomains || 0));
  setText("learnedReadyTotal", String(learned.readyCount || 0));
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
  if (item.requestCount != null) pieces.push(`${item.requestCount || 0} req`);
  if (item.count != null) pieces.push(`${item.count || 0} hits`);
  meta.textContent = pieces.join(" · ");

  main.append(name, meta);

  const actions = document.createElement("div");
  actions.className = "learned-actions wrap";

  if (options.currentPage && item.state !== "site_allowed") {
    actions.appendChild(makeActionButton("Allow here", "site_allowed", item.domain, options.site));
  }
  if (item.state === "site_allowed") {
    actions.appendChild(makeActionButton("Reset here", "reset_site", item.domain, options.site));
  }
  if (!["allowed", "site_allowed"].includes(item.state)) actions.appendChild(makeActionButton("Allow", "allowed", item.domain));
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
  if (state === "manual_blocked") return "blocked";
  if (state === "blocked") return "blocked";
  if (state === "manual_cookie_blocked") return "cookie";
  if (state === "cookie_blocked") return "cookie";
  if (state === "ready") return "ready";
  if (state === "site_allowed") return "allowed here";
  if (state === "allowed") return "allowed";
  return state || "seen";
}

async function saveFromUi() {
  if (saving) return;
  const result = await send({ type: "saveSettings", patch: collectUiPatch() });
  render(result.state);
}

function collectUiPatch() {
  return {
    enabled: getValue("enabled")
  };
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") el.checked = Boolean(value);
  else el.value = value;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getValue(id) {
  const el = document.getElementById(id);
  if (!el) return undefined;
  return el.type === "checkbox" ? el.checked : el.value;
}

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "Extension error");
  return response;
}

async function withBusy(buttonId, fn) {
  const button = document.getElementById(buttonId);
  if (!button) return fn();
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
