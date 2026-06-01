const ALARM_TICK = "noiseTick";
const CLOSE_PREFIX = "closeTab:";
const MAX_LOGS = 80;
const MAX_RECENT_OPENED = 30;
const TRACKER_RULESET_ID = "tracker_rules";
const CLEANUP_RULESET_ID = "cleanup_rules";
const MAX_TRACKER_RECENT = 40;
const MAX_TRACKER_DOMAINS = 30;
const LEARNED_TRACKERS_KEY = "learnedTrackers";
const PAGE_TRACKERS_KEY = "pageTrackers";
const SITE_RULES_KEY = "siteRules";
const PAUSED_SITES_KEY = "pausedSites";
const SEED_VERSION_KEY = "seedTrackerVersion";
const SEED_TRACKER_VERSION = 1;
const LEARNED_RULE_ID_BASE = 20000;
const LEARNED_BLOCK_RULE_ID_BASE = 20000;
const LEARNED_COOKIE_RULE_ID_BASE = 21200;
const SITE_ALLOW_RULE_ID_BASE = 22400;
const SITE_PAUSE_RULE_ID_BASE = 23600;
const BREAKAGE_ALLOW_RULE_ID_BASE = 24800;
const LEARNED_RULE_ID_LIMIT = 24999;
const MAX_LEARNED_DOMAINS = 220;
const MAX_LEARNED_DYNAMIC_RULES = 120;
const MAX_COOKIE_DYNAMIC_RULES = 90;
const MAX_SITE_ALLOW_RULES = 90;
const MAX_PAUSED_SITE_RULES = 40;
const MAX_BREAKAGE_ALLOW_RULES = 120;
const MAX_PAGE_TRACKER_PAGES = 35;
const MAX_PAGE_TRACKERS_PER_PAGE = 80;
const MAX_FIRST_PARTIES_PER_DOMAIN = 30;
const LEARN_SUSPICIOUS_FIRST_PARTIES = 3;
const LEARN_BLOCK_FIRST_PARTIES = 5;
const LEARN_MIN_REQUESTS_TO_BLOCK = 8;
const LEARNED_RESOURCE_TYPES = ["script", "image", "xmlhttprequest", "ping", "media", "font", "stylesheet", "sub_frame", "websocket", "webtransport", "other"];
const LEARN_EVENT_DEDUPE_MS = 10 * 60 * 1000;
const MAX_RECENT_LEARN_EVENTS = 1000;
let cachedSettings = null;
let cachedSettingsAt = 0;
let recentLearnEvents = new Map();
const OBSERVED_RESOURCE_TYPES = new Set(["sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"]);

const DEFAULT_SETTINGS = {
  enabled: false,
  mode: "mixed",
  searchEngine: "duckduckgo",
  maxPerHour: 4,
  minDelayMinutes: 8,
  maxDelayMinutes: 22,
  dwellSeconds: 35,
  closeTabs: true,
  openActive: false,
  pauseOnSensitiveTab: true,
  privacyHardening: true,
  trackerBlocker: true,
  trackingParameterCleanup: true,
  trackerLearning: true,
  autoBlockLearnedTrackers: true,
  cookieBlockLearnedTrackers: true,
  learningReviewMode: true,
  seedKnownTrackers: true,
  headerHeuristics: true,
  breakageProtection: true,
  avoidRecentTargets: true,
  topics: {
    home: true,
    cooking: true,
    pets: true,
    tech: true,
    travel: true,
    outdoors: true,
    sports: true,
    fashion: true,
    auto: true,
    finance: false,
    hobbies: true,
    wellness: true
  }
};

const SEARCH_ENGINES = {
  duckduckgo: "https://duckduckgo.com/?q=",
  google: "https://www.google.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  brave: "https://search.brave.com/search?q="
};

const TOPIC_QUERIES = {
  home: [
    "small apartment storage ideas", "best air purifying plants", "how to organize a closet", "standing desk setup ideas",
    "budget patio lighting", "minimalist bedroom layout", "ergonomic chair comparison", "kitchen cabinet organization",
    "robot vacuum maintenance", "soundproof curtains for bedroom", "how to clean stainless steel", "home office cable management"
  ],
  cooking: [
    "easy pasta dinner recipes", "cast iron skillet care", "best rice cooker features", "meal prep lunch ideas",
    "homemade pizza dough tips", "air fryer vegetable recipes", "coffee grinder burr vs blade", "healthy slow cooker meals",
    "beginner sourdough guide", "knife sharpening basics", "high protein breakfast ideas", "freezer friendly meals"
  ],
  pets: [
    "cat enrichment toys", "dog leash training tips", "automatic pet feeder reviews", "best litter box setup",
    "safe houseplants for cats", "dog grooming at home", "cat window perch ideas", "puppy crate training schedule",
    "pet hair vacuum attachments", "how to introduce cats slowly", "dog puzzle feeders", "cat scratching post placement"
  ],
  tech: [
    "mechanical keyboard switches", "usb c hub comparison", "noise cancelling headphones features", "best password manager basics",
    "monitor arm desk setup", "mesh wifi placement guide", "external ssd buying guide", "mac productivity shortcuts",
    "laptop cooling stand reviews", "home nas beginner guide", "privacy browser settings", "bluetooth tracker comparison"
  ],
  travel: [
    "weekend trip packing list", "carry on backpack comparison", "best city walking shoes", "travel adapter guide",
    "budget hotel booking tips", "train travel packing ideas", "road trip snack ideas", "how to avoid jet lag",
    "airport lounge alternatives", "travel laundry bag ideas", "portable charger for travel", "quiet beach towns to visit"
  ],
  outdoors: [
    "beginner hiking gear checklist", "camping stove comparison", "waterproof jacket features", "best daypack size",
    "how to read trail markers", "backyard bird feeder tips", "bike helmet fit guide", "kayak beginner tips",
    "winter gloves for walking", "portable hammock setup", "fishing tackle box basics", "picnic cooler comparison"
  ],
  sports: [
    "beginner tennis racket guide", "soccer cleats firm ground vs turf", "basketball shooting drills", "running shoe rotation",
    "golf grip basics", "pickleball paddle comparison", "home gym resistance bands", "sports recovery stretching",
    "cycling cadence tips", "swimming goggles anti fog", "baseball glove care", "table tennis paddle guide"
  ],
  fashion: [
    "capsule wardrobe basics", "best fabric for summer shirts", "how to care for leather boots", "men casual outfit ideas",
    "winter jacket insulation types", "sneaker cleaning kit", "watch strap material guide", "office casual shoes",
    "rain jacket style guide", "linen shirt care", "jeans fit guide", "backpack outfit ideas"
  ],
  auto: [
    "dash cam features to look for", "tire pressure basics", "car detailing starter kit", "how to clean car interior",
    "jump starter battery pack", "windshield wiper size guide", "car phone mount comparison", "fuel efficient driving tips",
    "ceramic coating basics", "emergency car kit list", "car seat cover materials", "winter tires vs all season"
  ],
  finance: [
    "budget spreadsheet template", "compound interest basics", "high yield savings account features", "cash back card categories",
    "how to track subscriptions", "emergency fund calculator", "used car loan basics", "renters insurance coverage basics",
    "grocery budget ideas", "sinking fund examples", "credit score factors", "side income tax basics"
  ],
  hobbies: [
    "beginner chess opening principles", "watercolor painting supplies", "3d printing filament types", "model kit tools beginner",
    "digital piano practice routine", "photography composition tips", "home espresso dialing in", "board games for two players",
    "beginner guitar chord practice", "aquarium cycling guide", "gardening seed starter tray", "journaling prompts"
  ],
  wellness: [
    "sleep hygiene checklist", "desk stretching routine", "beginner yoga mat guide", "hydration reminder ideas",
    "walking routine for beginners", "meal planning for energy", "blue light settings at night", "simple breathing exercises",
    "foam roller basics", "morning routine ideas", "neck posture exercises", "healthy snack ideas"
  ]
};

const ARTICLE_URLS = {
  home: [
    "https://en.wikipedia.org/wiki/Houseplant", "https://en.wikipedia.org/wiki/Interior_design", "https://en.wikipedia.org/wiki/Ergonomics",
    "https://en.wikipedia.org/wiki/Home_office", "https://en.wikipedia.org/wiki/Vacuum_cleaner"
  ],
  cooking: [
    "https://en.wikipedia.org/wiki/Cooking", "https://en.wikipedia.org/wiki/Pasta", "https://en.wikipedia.org/wiki/Cast-iron_cookware",
    "https://en.wikipedia.org/wiki/Coffee_preparation", "https://en.wikipedia.org/wiki/Sourdough"
  ],
  pets: [
    "https://en.wikipedia.org/wiki/Cat", "https://en.wikipedia.org/wiki/Dog_training", "https://en.wikipedia.org/wiki/Pet_food",
    "https://en.wikipedia.org/wiki/Dog_grooming", "https://en.wikipedia.org/wiki/Cat_play_and_toys"
  ],
  tech: [
    "https://en.wikipedia.org/wiki/Computer_keyboard", "https://en.wikipedia.org/wiki/USB-C", "https://en.wikipedia.org/wiki/Password_manager",
    "https://en.wikipedia.org/wiki/Wireless_mesh_network", "https://en.wikipedia.org/wiki/Solid-state_drive"
  ],
  travel: [
    "https://en.wikipedia.org/wiki/Travel", "https://en.wikipedia.org/wiki/Backpacking_(travel)", "https://en.wikipedia.org/wiki/Jet_lag",
    "https://en.wikipedia.org/wiki/Road_trip", "https://en.wikipedia.org/wiki/Travel_literature"
  ],
  outdoors: [
    "https://en.wikipedia.org/wiki/Hiking", "https://en.wikipedia.org/wiki/Camping", "https://en.wikipedia.org/wiki/Bird_feeding",
    "https://en.wikipedia.org/wiki/Cycling", "https://en.wikipedia.org/wiki/Kayaking"
  ],
  sports: [
    "https://en.wikipedia.org/wiki/Tennis", "https://en.wikipedia.org/wiki/Association_football", "https://en.wikipedia.org/wiki/Basketball",
    "https://en.wikipedia.org/wiki/Pickleball", "https://en.wikipedia.org/wiki/Running"
  ],
  fashion: [
    "https://en.wikipedia.org/wiki/Fashion", "https://en.wikipedia.org/wiki/Sneakers", "https://en.wikipedia.org/wiki/Jeans",
    "https://en.wikipedia.org/wiki/Jacket", "https://en.wikipedia.org/wiki/Wristwatch"
  ],
  auto: [
    "https://en.wikipedia.org/wiki/Dashcam", "https://en.wikipedia.org/wiki/Automobile_safety", "https://en.wikipedia.org/wiki/Tire",
    "https://en.wikipedia.org/wiki/Automobile_repair_shop", "https://en.wikipedia.org/wiki/Windscreen_wiper"
  ],
  finance: [
    "https://en.wikipedia.org/wiki/Personal_finance", "https://en.wikipedia.org/wiki/Budget", "https://en.wikipedia.org/wiki/Compound_interest",
    "https://en.wikipedia.org/wiki/Savings_account", "https://en.wikipedia.org/wiki/Credit_score"
  ],
  hobbies: [
    "https://en.wikipedia.org/wiki/Chess", "https://en.wikipedia.org/wiki/Watercolor_painting", "https://en.wikipedia.org/wiki/3D_printing",
    "https://en.wikipedia.org/wiki/Board_game", "https://en.wikipedia.org/wiki/Aquarium"
  ],
  wellness: [
    "https://en.wikipedia.org/wiki/Sleep_hygiene", "https://en.wikipedia.org/wiki/Stretching", "https://en.wikipedia.org/wiki/Yoga_as_exercise",
    "https://en.wikipedia.org/wiki/Walking", "https://en.wikipedia.org/wiki/Posture_(psychology)"
  ]
};

const SENSITIVE_HOST_PARTS = [
  "bank", "paypal.com", "stripe.com", "checkout", "cart", "billing", "payment", "wallet",
  "accounts.google.com", "myaccount.google.com", "mail.google.com", "gmail.com", "outlook.live.com",
  "chase.com", "bankofamerica.com", "wellsfargo.com", "capitalone.com", "americanexpress.com",
  "irs.gov", "ssa.gov", "health", "clinic", "hospital", "medical", "password", "login"
];

const PRIVACY_CONTROLS = [
  { label: "Network prediction", path: ["network", "networkPredictionEnabled"], value: false },
  { label: "Alternate error pages", path: ["services", "alternateErrorPagesEnabled"], value: false },
  { label: "Link auditing", path: ["websites", "hyperlinkAuditingEnabled"], value: false },
  { label: "Ad topics", path: ["websites", "topicsEnabled"], value: false },
  { label: "Ad measurement", path: ["websites", "adMeasurementEnabled"], value: false },
  { label: "Protected Audience", path: ["websites", "fledgeEnabled"], value: false }
];

const TRACKING_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "mc_cid", "mc_eid", "igshid",
  "ref", "spm", "scid", "yclid"
];


const SEED_TRACKER_DOMAINS = [
  "adservice.google.com", "ad.doubleclick.net", "stats.g.doubleclick.net", "pagead2.googlesyndication.com",
  "securepubads.g.doubleclick.net", "adnxs.com", "ib.adnxs.com", "adsrvr.org", "match.adsrvr.org",
  "criteo.com", "criteo.net", "bidr.io", "openx.net", "pubmatic.com", "rubiconproject.com",
  "scorecardresearch.com", "sb.scorecardresearch.com", "quantserve.com", "pixel.quantserve.com",
  "bluekai.com", "demdex.net", "everesttech.net", "2o7.net", "omtrdc.net", "adobedtm.com",
  "segment.com", "segment.io", "cdn.segment.com", "api.segment.io", "mixpanel.com", "amplitude.com",
  "hotjar.com", "hotjar.io", "static.hotjar.com", "fullstory.com", "rs.fullstory.com",
  "mouseflow.com", "crazyegg.com", "newrelic.com", "nr-data.net", "datadoghq-browser-agent.com",
  "connect.facebook.net", "graph.facebook.com", "analytics.tiktok.com", "analytics.twitter.com",
  "ads.linkedin.com", "px.ads.linkedin.com", "snapads.com", "sc-static.net", "taboola.com",
  "outbrain.com", "teads.tv", "media.net", "mathtag.com", "moatads.com", "rlcdn.com"
];

const BREAKAGE_ALLOW_DOMAINS = [
  "accounts.google.com", "gstatic.com", "googleapis.com", "googleusercontent.com",
  "recaptcha.net", "hcaptcha.com", "challenges.cloudflare.com", "cloudflare.com", "cloudflareinsights.com",
  "stripe.com", "js.stripe.com", "paypal.com", "paypalobjects.com", "braintreegateway.com", "adyen.com",
  "shopify.com", "shopifycdn.net", "squareup.com", "klarna.com", "affirm.com",
  "auth0.com", "okta.com", "okta-emea.com", "duosecurity.com", "onelogin.com",
  "github.com", "githubassets.com", "gitlab.com", "discord.com", "discordapp.com",
  "slack.com", "slack-edge.com", "zoom.us", "vimeo.com", "player.vimeo.com",
  "youtube.com", "youtube-nocookie.com", "ytimg.com",
  "cloudfront.net", "akamaihd.net", "akamaized.net", "fastly.net", "cdn.jsdelivr.net", "jsdelivr.net",
  "unpkg.com", "cdnjs.cloudflare.com"
];


const LEARNER_EXCLUDED_ROOT_DOMAINS = new Set([
  "google.com", "gstatic.com", "googleapis.com", "googleusercontent.com", "youtube.com", "ytimg.com",
  "microsoft.com", "microsoftonline.com", "live.com", "office.com", "apple.com", "icloud.com",
  "stripe.com", "paypal.com", "shopify.com", "squareup.com", "adyen.com",
  "hcaptcha.com", "recaptcha.net", "cloudflare.com", "cloudfront.net", "akamaihd.net",
  "auth0.com", "okta.com", "duosecurity.com", "github.com", "gitlab.com",
  "discord.com", "discordapp.com", "slack.com", "slack-edge.com", "zoom.us",
  "braintreegateway.com", "adyen.com", "shopifycdn.net", "klarna.com", "affirm.com",
  "githubassets.com", "gitlab.com", "vimeo.com", "youtube-nocookie.com",
  "fastly.net", "jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com"
]);


const PUBLIC_SUFFIX_EXCEPTIONS = new Set([
  "city.kawasaki.jp"
]);

const PUBLIC_SUFFIX_RULES = new Set([
  "ac", "ad", "ae", "aero", "af", "ag", "ai", "al", "am", "app", "ar", "arpa", "as", "asia", "at", "au", "aw", "ax", "az",
  "ba", "bar", "be", "bg", "biz", "blog", "br", "bs", "bt", "by", "bz", "ca", "cat", "cc", "ch", "cl", "cloud", "club", "cn", "co", "com", "coop", "cx", "cy", "cz",
  "de", "dev", "dk", "edu", "ee", "es", "eu", "fi", "fm", "fr", "games", "gg", "gov", "gr", "hk", "hr", "hu", "id", "ie", "im", "in", "info", "io", "is", "it",
  "jp", "kr", "li", "live", "lt", "lu", "lv", "me", "mil", "mobi", "mx", "net", "news", "nl", "no", "nz", "online", "org", "pl", "pro", "pt", "ru", "se", "shop", "site", "sk", "store", "tv", "uk", "us", "xyz", "za",
  "ac.uk", "co.uk", "gov.uk", "ltd.uk", "me.uk", "net.uk", "nhs.uk", "org.uk", "plc.uk", "police.uk", "sch.uk",
  "asn.au", "com.au", "edu.au", "gov.au", "id.au", "net.au", "org.au",
  "ac.at", "co.at", "gv.at", "or.at", "biz.at", "info.at",
  "com.br", "edu.br", "gov.br", "net.br", "org.br", "blog.br", "dev.br",
  "com.cn", "edu.cn", "gov.cn", "net.cn", "org.cn", "ac.cn", "ah.cn", "bj.cn", "cq.cn", "fj.cn", "gd.cn", "gs.cn", "gz.cn", "gx.cn", "ha.cn", "hb.cn", "he.cn", "hi.cn", "hk.cn", "hl.cn", "hn.cn", "jl.cn", "js.cn", "jx.cn", "ln.cn", "mo.cn", "nm.cn", "nx.cn", "qh.cn", "sc.cn", "sd.cn", "sh.cn", "sn.cn", "sx.cn", "tj.cn", "tw.cn", "xj.cn", "xz.cn", "yn.cn", "zj.cn",
  "co.jp", "ac.jp", "ad.jp", "ed.jp", "go.jp", "gr.jp", "lg.jp", "ne.jp", "or.jp",
  "co.kr", "ac.kr", "go.kr", "ne.kr", "or.kr", "pe.kr", "re.kr",
  "com.mx", "edu.mx", "gob.mx", "net.mx", "org.mx",
  "co.nz", "ac.nz", "geek.nz", "gen.nz", "govt.nz", "health.nz", "iwi.nz", "kiwi.nz", "maori.nz", "net.nz", "org.nz", "parliament.nz", "school.nz",
  "co.in", "firm.in", "gen.in", "ind.in", "net.in", "org.in", "ac.in", "edu.in", "res.in", "gov.in", "mil.in",
  "com.sg", "edu.sg", "gov.sg", "net.sg", "org.sg", "per.sg",
  "com.tr", "edu.tr", "gov.tr", "net.tr", "org.tr", "web.tr",
  "co.za", "net.za", "org.za", "web.za",
  "com.ar", "edu.ar", "gob.ar", "gov.ar", "int.ar", "mil.ar", "net.ar", "org.ar", "tur.ar",
  "com.es", "edu.es", "gob.es", "nom.es", "org.es",
  "asso.fr", "com.fr", "gouv.fr", "nom.fr", "prd.fr", "tm.fr",
  "com.hk", "edu.hk", "gov.hk", "idv.hk", "net.hk", "org.hk",
  "co.id", "ac.id", "biz.id", "desa.id", "go.id", "mil.id", "my.id", "net.id", "or.id", "sch.id", "web.id",
  "com.pl", "edu.pl", "gov.pl", "net.pl", "org.pl", "waw.pl",
  "com.pt", "edu.pt", "gov.pt", "net.pt", "org.pt",
  "com.ru", "edu.ru", "gov.ru", "net.ru", "org.ru", "pp.ru",
  "github.io", "gitlab.io", "pages.dev", "web.app", "firebaseapp.com", "appspot.com", "herokuapp.com", "herokuapp.com", "vercel.app", "now.sh", "netlify.app", "netlify.com", "workers.dev", "r2.dev", "pages.dev",
  "cloudfront.net", "azurewebsites.net", "azurestaticapps.net", "blob.core.windows.net", "githubpreview.dev", "githubusercontent.com",
  "wordpress.com", "wpcomstaging.com", "blogspot.com", "tumblr.com", "medium.com", "substack.com", "readthedocs.io", "pythonanywhere.com", "glitch.me", "repl.co", "replit.app", "surge.sh", "fly.dev", "railway.app", "render.com", "onrender.com"
]);


chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await applyPrivacyControls(settings);
  await applyTrackerControls(settings);
  await applySeedTrackerData(settings);
  await syncLearnedTrackerRules(settings);
  await setIconState(settings.enabled);
  if (settings.enabled) await scheduleNext(settings);
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await applyPrivacyControls(settings);
  await applyTrackerControls(settings);
  await applySeedTrackerData(settings);
  await syncLearnedTrackerRules(settings);
  await setIconState(settings.enabled);
  if (settings.enabled) await scheduleNext(settings);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_TICK) {
    runTick();
    return;
  }
  if (alarm.name.startsWith(CLOSE_PREFIX)) {
    const tabId = Number(alarm.name.slice(CLOSE_PREFIX.length));
    if (Number.isFinite(tabId)) closeNoiseTab(tabId);
  }
});

if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    recordRuleMatch(info).catch(() => {});
  });
}

if (chrome.webRequest?.onBeforeRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      observeThirdPartyRequest(details).catch(() => {});
    },
    { urls: ["<all_urls>"] }
  );
}

if (chrome.webRequest?.onBeforeSendHeaders) {
  try {
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
        const signals = getRequestHeaderSignals(details);
        if (signals.hasSignals) observeThirdPartyRequest(details, signals).catch(() => {});
      },
      { urls: ["<all_urls>"] },
      ["requestHeaders", "extraHeaders"]
    );
  } catch (_) {
    try {
      chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
          const signals = getRequestHeaderSignals(details);
          if (signals.hasSignals) observeThirdPartyRequest(details, signals).catch(() => {});
        },
        { urls: ["<all_urls>"] },
        ["requestHeaders"]
      );
    } catch (_) {}
  }
}

if (chrome.webRequest?.onHeadersReceived) {
  try {
    chrome.webRequest.onHeadersReceived.addListener(
      (details) => {
        const signals = getResponseHeaderSignals(details);
        if (signals.hasSignals) observeThirdPartyRequest(details, signals).catch(() => {});
      },
      { urls: ["<all_urls>"] },
      ["responseHeaders", "extraHeaders"]
    );
  } catch (_) {
    try {
      chrome.webRequest.onHeadersReceived.addListener(
        (details) => {
          const signals = getResponseHeaderSignals(details);
          if (signals.hasSignals) observeThirdPartyRequest(details, signals).catch(() => {});
        },
        { urls: ["<all_urls>"] },
        ["responseHeaders"]
      );
    } catch (_) {}
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "getState") {
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      if (message?.type === "saveSettings") {
        const merged = await saveSettings(message.patch || {});
        await applyPrivacyControls(merged);
        await applyTrackerControls(merged);
        await syncLearnedTrackerRules(merged);
        if (merged.enabled) await scheduleNext(merged);
        else await stopAll();
        await setIconState(merged.enabled);
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      if (message?.type === "runNow") {
        await runTick({ manual: true });
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      if (message?.type === "clearLogs") {
        await chrome.storage.local.set({ logs: [] });
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      if (message?.type === "clearTrackerStats") {
        await chrome.storage.local.set({ trackerStats: emptyTrackerStats() });
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      if (message?.type === "clearLearnedTrackers") {
        await clearLearnedTrackers();
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      if (message?.type === "setLearnedTrackerState") {
        await setLearnedTrackerState(message.domain, message.state);
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      if (message?.type === "setSiteDomainRule") {
        await setSiteDomainRule(message.domain, message.site, message.state);
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      if (message?.type === "togglePauseCurrentSite") {
        await togglePauseCurrentSite();
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      if (message?.type === "exportData") {
        sendResponse({ ok: true, exportData: await buildExportData() });
        return;
      }
      if (message?.type === "importData") {
        await importExtensionData(message.payload || {});
        sendResponse({ ok: true, state: await getPublicState() });
        return;
      }
      sendResponse({ ok: false, error: "Unknown message" });
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();
  return true;
});

async function getSettings() {
  const data = await chrome.storage.local.get(["settings"]);
  return normalizeSettings(data.settings || {});
}

async function getCachedSettings(maxAgeMs = 5000) {
  const now = Date.now();
  if (cachedSettings && now - cachedSettingsAt < maxAgeMs) return cachedSettings;
  cachedSettings = await getSettings();
  cachedSettingsAt = now;
  return cachedSettings;
}

function normalizeSettings(raw) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...raw,
    topics: {
      ...DEFAULT_SETTINGS.topics,
      ...(raw.topics || {})
    }
  };
  merged.maxPerHour = clamp(Number(merged.maxPerHour) || DEFAULT_SETTINGS.maxPerHour, 1, 20);
  merged.minDelayMinutes = clamp(Number(merged.minDelayMinutes) || DEFAULT_SETTINGS.minDelayMinutes, 1, 180);
  merged.maxDelayMinutes = clamp(Number(merged.maxDelayMinutes) || DEFAULT_SETTINGS.maxDelayMinutes, merged.minDelayMinutes, 240);
  merged.dwellSeconds = clamp(Number(merged.dwellSeconds) || DEFAULT_SETTINGS.dwellSeconds, 5, 900);
  merged.privacyHardening = Boolean(merged.privacyHardening);
  merged.trackerBlocker = merged.trackerBlocker !== false;
  merged.trackingParameterCleanup = merged.trackingParameterCleanup !== false;
  merged.trackerLearning = merged.trackerLearning !== false;
  merged.autoBlockLearnedTrackers = merged.autoBlockLearnedTrackers !== false;
  merged.cookieBlockLearnedTrackers = merged.cookieBlockLearnedTrackers !== false;
  merged.learningReviewMode = merged.learningReviewMode !== false;
  merged.seedKnownTrackers = merged.seedKnownTrackers !== false;
  merged.headerHeuristics = merged.headerHeuristics !== false;
  merged.breakageProtection = merged.breakageProtection !== false;
  merged.avoidRecentTargets = merged.avoidRecentTargets !== false;
  if (!SEARCH_ENGINES[merged.searchEngine]) merged.searchEngine = DEFAULT_SETTINGS.searchEngine;
  if (!["search", "browse", "mixed"].includes(merged.mode)) merged.mode = DEFAULT_SETTINGS.mode;
  return merged;
}

async function saveSettings(patch) {
  const current = await getSettings();
  const next = normalizeSettings({
    ...current,
    ...patch,
    topics: patch.topics ? { ...current.topics, ...patch.topics } : current.topics
  });
  await chrome.storage.local.set({ settings: next });
  cachedSettings = next;
  cachedSettingsAt = Date.now();
  return next;
}

async function getPublicState() {
  const [settings, data, alarm, enabledRulesets, currentPage] = await Promise.all([
    getSettings(),
    chrome.storage.local.get(["logs", "hourlyRuns", "recentOpened", "trackerStats", LEARNED_TRACKERS_KEY, PAGE_TRACKERS_KEY, SITE_RULES_KEY, PAUSED_SITES_KEY]),
    chrome.alarms.get(ALARM_TICK),
    getEnabledRulesets(),
    getCurrentPageInfo()
  ]);
  const learnedData = normalizeLearnedTrackerData(data[LEARNED_TRACKERS_KEY]);
  const siteRules = normalizeSiteRules(data[SITE_RULES_KEY]);
  const pausedSites = normalizePausedSites(data[PAUSED_SITES_KEY]);
  return {
    settings,
    logs: data.logs || [],
    hourlyRuns: data.hourlyRuns || [],
    recentOpened: data.recentOpened || [],
    trackerStats: normalizeTrackerStats(data.trackerStats),
    seedTrackerVersion: Number(data[SEED_VERSION_KEY]) || 0,
    learnedTrackers: getLearnedTrackerSummary(learnedData),
    currentPage: buildCurrentPageSummary(currentPage, normalizePageTrackers(data[PAGE_TRACKERS_KEY]), learnedData, siteRules, pausedSites),
    enabledRulesets,
    trackerRuleCount: 1,
    trackerDomainCount: 78,
    seedTrackerCount: SEED_TRACKER_DOMAINS.length,
    breakageAllowCount: BREAKAGE_ALLOW_DOMAINS.length,
    nextRunAt: alarm?.scheduledTime || null
  };
}

async function scheduleNext(settings = null) {
  const s = settings || await getSettings();
  if (!s.enabled) return;
  const delayMinutes = randomInt(s.minDelayMinutes, s.maxDelayMinutes);
  await chrome.alarms.create(ALARM_TICK, { when: Date.now() + delayMinutes * 60 * 1000 });
}

async function stopAll() {
  await chrome.alarms.clear(ALARM_TICK);
  const alarms = await chrome.alarms.getAll();
  await Promise.all(alarms.filter(a => a.name.startsWith(CLOSE_PREFIX)).map(a => chrome.alarms.clear(a.name)));
}

async function runTick(options = {}) {
  const settings = await getSettings();
  if (!settings.enabled && !options.manual) return;

  try {
    if (!options.manual && settings.pauseOnSensitiveTab && await isSensitiveCurrentTab()) {
      await addLog({ type: "paused", label: "Sensitive tab detected", detail: "Activity paused" });
      await scheduleNext(settings);
      return;
    }

    if (!options.manual && !await checkHourlyCap(settings.maxPerHour)) {
      await addLog({ type: "capped", label: "Hourly cap reached", detail: `${settings.maxPerHour} per hour` });
      await scheduleNext(settings);
      return;
    }

    const target = await pickTarget(settings);
    if (!target) {
      await addLog({ type: "paused", label: "Choose a topic pack", detail: "Topic packs power generated visits" });
      await scheduleNext(settings);
      return;
    }

    target.url = cleanGeneratedUrl(target.url);
    const tab = await chrome.tabs.create({ url: target.url, active: Boolean(settings.openActive) });
    await rememberRun();
    await rememberOpened(target);
    await addLog({ type: target.kind, label: target.label, detail: target.url });

    if (settings.closeTabs && tab?.id) {
      await chrome.alarms.create(`${CLOSE_PREFIX}${tab.id}`, { when: Date.now() + settings.dwellSeconds * 1000 });
    }
  } catch (err) {
    await addLog({ type: "error", label: "Error", detail: String(err?.message || err) });
  } finally {
    if (!options.manual) await scheduleNext(settings);
  }
}

async function pickTarget(settings) {
  const enabledTopics = Object.entries(settings.topics || {}).filter(([, enabled]) => enabled).map(([name]) => name);
  if (!enabledTopics.length) return null;

  if (!settings.avoidRecentTargets) {
    return buildTarget(settings, enabledTopics);
  }

  const recent = await getRecentUrlSet();
  let fallback = null;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const target = buildTarget(settings, enabledTopics);
    fallback = target;
    if (target && !recent.has(target.url)) return target;
  }

  return fallback;
}

function buildTarget(settings, enabledTopics) {
  const kind = settings.mode === "mixed" ? (Math.random() < 0.65 ? "search" : "browse") : settings.mode;
  const topic = choice(enabledTopics);

  if (kind === "browse") {
    const urls = ARTICLE_URLS[topic] || [];
    const url = choice(urls);
    return url ? { kind: "browse", topic, label: `Browse: ${topic}`, url } : pickSearch(topic, settings);
  }

  return pickSearch(topic, settings);
}

async function getRecentUrlSet() {
  const data = await chrome.storage.local.get(["recentOpened"]);
  return new Set((data.recentOpened || []).slice(0, MAX_RECENT_OPENED).map(item => item.url).filter(Boolean));
}

function pickSearch(topic, settings) {
  const queries = TOPIC_QUERIES[topic] || [];
  const query = mutateQuery(choice(queries) || "interesting articles");
  const base = SEARCH_ENGINES[settings.searchEngine] || SEARCH_ENGINES.duckduckgo;
  return {
    kind: "search",
    topic,
    label: `Search: ${query}`,
    url: `${base}${encodeURIComponent(query)}`
  };
}

function mutateQuery(query) {
  const suffixes = ["", "", "", " guide", " ideas", " comparison", " tips", " 2026", " for beginners"];
  const prefix = ["", "", "", "best ", "how to choose ", "cheap ", "simple "];
  let q = query;
  if (Math.random() < 0.25) q = choice(prefix) + q;
  if (Math.random() < 0.35) q = q + choice(suffixes);
  return q.replace(/\s+/g, " ").trim();
}

function cleanGeneratedUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    for (const param of TRACKING_PARAMS) {
      url.searchParams.delete(param);
    }
    return url.toString();
  } catch (_) {
    return rawUrl;
  }
}

async function checkHourlyCap(maxPerHour) {
  const data = await chrome.storage.local.get(["hourlyRuns"]);
  const cutoff = Date.now() - 60 * 60 * 1000;
  const recent = (data.hourlyRuns || []).filter(ts => Number(ts) > cutoff);
  await chrome.storage.local.set({ hourlyRuns: recent });
  return recent.length < maxPerHour;
}

async function rememberRun() {
  const data = await chrome.storage.local.get(["hourlyRuns"]);
  const cutoff = Date.now() - 60 * 60 * 1000;
  const recent = (data.hourlyRuns || []).filter(ts => Number(ts) > cutoff);
  recent.push(Date.now());
  await chrome.storage.local.set({ hourlyRuns: recent });
}

async function rememberOpened(target) {
  const data = await chrome.storage.local.get(["recentOpened"]);
  const recentOpened = data.recentOpened || [];
  recentOpened.unshift({ at: Date.now(), kind: target.kind, label: target.label, url: target.url });
  await chrome.storage.local.set({ recentOpened: recentOpened.slice(0, MAX_RECENT_OPENED) });
}

async function addLog(entry) {
  const data = await chrome.storage.local.get(["logs"]);
  const logs = data.logs || [];
  logs.unshift({ at: Date.now(), ...entry });
  await chrome.storage.local.set({ logs: logs.slice(0, MAX_LOGS) });
}

async function closeNoiseTab(tabId) {
  try {
    await chrome.tabs.remove(tabId);
    await addLog({ type: "closed", label: "Visit completed", detail: `Tab ${tabId}` });
  } catch (err) {
    await addLog({ type: "close skipped", label: `Tab ${tabId}`, detail: `Window changed: ${String(err?.message || err)}` });
  }
}

async function isSensitiveCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tabs?.[0]?.url || "";
    if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return false;
    const host = new URL(url).hostname.toLowerCase();
    const full = url.toLowerCase();
    return SENSITIVE_HOST_PARTS.some(part => host.includes(part) || full.includes(part));
  } catch (_) {
    return false;
  }
}

async function applyTrackerControls(settings) {
  if (!chrome.declarativeNetRequest?.updateEnabledRulesets) return;

  const enableRulesetIds = [];
  const disableRulesetIds = [];

  if (settings.trackerBlocker) enableRulesetIds.push(TRACKER_RULESET_ID);
  else disableRulesetIds.push(TRACKER_RULESET_ID);

  if (settings.trackingParameterCleanup) enableRulesetIds.push(CLEANUP_RULESET_ID);
  else disableRulesetIds.push(CLEANUP_RULESET_ID);

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds,
      disableRulesetIds
    });
  } catch (err) {
    await addLog({ type: "tracker", label: "Tracker controls update", detail: String(err?.message || err) });
  }
}

async function getEnabledRulesets() {
  try {
    if (!chrome.declarativeNetRequest?.getEnabledRulesets) return [];
    return await chrome.declarativeNetRequest.getEnabledRulesets();
  } catch (_) {
    return [];
  }
}

async function recordRuleMatch(info) {
  const rulesetId = info?.rule?.rulesetId;
  if (![TRACKER_RULESET_ID, CLEANUP_RULESET_ID].includes(rulesetId)) return;

  const requestUrl = info?.request?.url || "";
  const domain = extractHostname(requestUrl);
  const current = normalizeTrackerStats((await chrome.storage.local.get(["trackerStats"])).trackerStats);
  current.lastUpdated = Date.now();

  if (rulesetId === TRACKER_RULESET_ID) {
    current.totalBlocked += 1;
    current.byDomain[domain] = (current.byDomain[domain] || 0) + 1;
    current.recent.unshift({ at: Date.now(), type: "blocked", domain, url: requestUrl });
  }

  if (rulesetId === CLEANUP_RULESET_ID) {
    current.totalCleaned += 1;
    current.recent.unshift({ at: Date.now(), type: "cleaned", domain, url: requestUrl });
  }

  current.recent = current.recent.slice(0, MAX_TRACKER_RECENT);
  current.byDomain = trimDomainCounts(current.byDomain);
  await chrome.storage.local.set({ trackerStats: current });
}

function emptyTrackerStats() {
  return {
    totalBlocked: 0,
    totalCleaned: 0,
    byDomain: {},
    recent: [],
    lastUpdated: null
  };
}

function normalizeTrackerStats(raw) {
  const stats = { ...emptyTrackerStats(), ...(raw || {}) };
  stats.totalBlocked = Number(stats.totalBlocked) || 0;
  stats.totalCleaned = Number(stats.totalCleaned) || 0;
  stats.byDomain = stats.byDomain && typeof stats.byDomain === "object" ? stats.byDomain : {};
  stats.recent = Array.isArray(stats.recent) ? stats.recent.slice(0, MAX_TRACKER_RECENT) : [];
  return stats;
}

function trimDomainCounts(byDomain) {
  return Object.fromEntries(
    Object.entries(byDomain || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, MAX_TRACKER_DOMAINS)
  );
}

function extractHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch (_) {
    return "unknown";
  }
}



async function observeThirdPartyRequest(details, signals = {}) {
  const settings = await getCachedSettings();
  if (!settings.trackerLearning) return;
  if ((signals.cookieHeader || signals.refererHeader || signals.setCookieHeader) && !settings.headerHeuristics) return;
  if (!details || details.type === "main_frame") return;
  if (!OBSERVED_RESOURCE_TYPES.has(details.type)) return;

  const requestHost = extractHostname(details.url);
  if (!requestHost || requestHost === "unknown") return;
  if (!isLearnableTrackerHost(requestHost)) return;

  const firstPartyHost = getFirstPartyHost(details);
  if (!firstPartyHost || firstPartyHost === "unknown") return;
  if (isSensitiveHost(requestHost) || isSensitiveHost(firstPartyHost)) return;
  if (isSameSite(firstPartyHost, requestHost)) return;

  const firstPartyRoot = getRootDomain(firstPartyHost);
  const requestRoot = getRootDomain(requestHost);
  if (!firstPartyRoot || !requestRoot || firstPartyRoot === requestRoot) return;

  const pausedSites = normalizePausedSites((await chrome.storage.local.get([PAUSED_SITES_KEY]))[PAUSED_SITES_KEY]);
  if (pausedSites[firstPartyRoot]) return;

  const strongSignal = Boolean(signals.cookieHeader || signals.setCookieHeader || signals.refererHeader);
  await recordPageTracker(firstPartyRoot, requestHost, details, signals);
  if (isRecentLearnEvent(requestHost, firstPartyRoot, signals) && !strongSignal) return;

  const siteRules = normalizeSiteRules((await chrome.storage.local.get([SITE_RULES_KEY]))[SITE_RULES_KEY]);
  if (siteRules.allow?.[firstPartyRoot]?.[requestHost]) return;

  const data = await getLearnedTrackerData();
  const domain = requestHost;
  const now = Date.now();
  const item = normalizeLearnedTrackerItem(data.domains[domain], domain);
  const previousState = item.state;

  item.requestCount += 1;
  item.lastSeen = now;
  item.sampleType = details.type;
  item.sampleUrl = details.url || item.sampleUrl || "";
  item.heuristics = normalizeHeuristics(item.heuristics);
  item.heuristics.thirdPartyRequests += 1;
  if (signals.cookieHeader) item.heuristics.thirdPartyCookieRequests += 1;
  if (signals.setCookieHeader) item.heuristics.thirdPartySetCookieResponses += 1;
  if (signals.refererHeader) item.heuristics.thirdPartyRefererRequests += 1;
  item.firstParties[firstPartyRoot] = now;
  item.firstParties = trimFirstParties(item.firstParties);
  item.firstPartyCount = Object.keys(item.firstParties).length;
  item.heuristicScore = calculateHeuristicScore(item.heuristics, item.firstPartyCount, item.requestCount);

  if (!isManualState(item.state)) {
    item.state = chooseLearnedState(item, settings);
  }

  data.domains[domain] = item;
  data.totalObservedRequests += 1;
  data.lastUpdated = now;
  data.domains = trimLearnedDomains(data.domains);
  await chrome.storage.local.set({ [LEARNED_TRACKERS_KEY]: data });

  if (item.state !== previousState && ["blocked", "manual_blocked", "cookie_blocked", "manual_cookie_blocked"].includes(item.state)) {
    await addLog({ type: "tracker", label: "Learned tracker rule updated", detail: `${domain} across ${item.firstPartyCount} sites` });
    await syncLearnedTrackerRules(settings, data);
  }
}

function chooseLearnedState(item, settings) {
  const h = normalizeHeuristics(item.heuristics);
  const score = calculateHeuristicScore(h, item.firstPartyCount, item.requestCount);
  const hasCookieBehavior = h.thirdPartyCookieRequests > 0 || h.thirdPartySetCookieResponses > 0;
  const heuristicReady = item.firstPartyCount >= 3 && score >= 12;
  const heuristicSuspicious = item.firstPartyCount >= 2 && score >= 6;
  const blockReady = (
    item.firstPartyCount >= LEARN_BLOCK_FIRST_PARTIES && item.requestCount >= LEARN_MIN_REQUESTS_TO_BLOCK
  ) || heuristicReady;
  const suspicious = item.firstPartyCount >= LEARN_SUSPICIOUS_FIRST_PARTIES || heuristicSuspicious || hasCookieBehavior;

  if (blockReady && settings.autoBlockLearnedTrackers) {
    return settings.learningReviewMode ? "ready" : "blocked";
  }

  if (suspicious && settings.cookieBlockLearnedTrackers && hasCookieBehavior) return "cookie_blocked";
  if (suspicious && settings.cookieBlockLearnedTrackers && score >= 8) return "cookie_blocked";
  if (suspicious) return "suspicious";
  return "observed";
}

async function recordPageTracker(firstPartyRoot, requestHost, details, signals = {}) {
  const data = normalizePageTrackers((await chrome.storage.local.get([PAGE_TRACKERS_KEY]))[PAGE_TRACKERS_KEY]);
  const now = Date.now();
  const page = data.pages[firstPartyRoot] || { root: firstPartyRoot, domains: {}, lastSeen: now };
  const item = page.domains[requestHost] || { domain: requestHost, count: 0, types: {}, firstSeen: now, lastSeen: now, sampleUrl: "" };
  item.count += 1;
  item.lastSeen = now;
  item.sampleUrl = details.url || item.sampleUrl || "";
  item.types[details.type || "other"] = (item.types[details.type || "other"] || 0) + 1;
  item.signals = item.signals || {};
  if (signals.cookieHeader) item.signals.cookieHeader = (item.signals.cookieHeader || 0) + 1;
  if (signals.setCookieHeader) item.signals.setCookieHeader = (item.signals.setCookieHeader || 0) + 1;
  if (signals.refererHeader) item.signals.refererHeader = (item.signals.refererHeader || 0) + 1;
  page.domains[requestHost] = item;
  page.lastSeen = now;
  data.pages[firstPartyRoot] = trimPageDomains(page);
  data.pages = trimPageTrackerPages(data.pages);
  await chrome.storage.local.set({ [PAGE_TRACKERS_KEY]: data });
}

function isRecentLearnEvent(requestHost, firstPartyRoot, signals = {}) {
  const now = Date.now();
  const key = `${requestHost}|${firstPartyRoot}|${signals.cookieHeader ? "cookie" : ""}|${signals.setCookieHeader ? "setcookie" : ""}|${signals.refererHeader ? "referer" : ""}`;

  for (const [eventKey, at] of recentLearnEvents.entries()) {
    if (now - at > LEARN_EVENT_DEDUPE_MS || recentLearnEvents.size > MAX_RECENT_LEARN_EVENTS) {
      recentLearnEvents.delete(eventKey);
    }
  }

  const lastSeen = recentLearnEvents.get(key);
  if (lastSeen && now - lastSeen < LEARN_EVENT_DEDUPE_MS) return true;
  recentLearnEvents.set(key, now);
  return false;
}

function getFirstPartyHost(details) {
  const candidates = [details.initiator, details.documentUrl, details.originUrl];
  for (const candidate of candidates) {
    const host = extractHostname(candidate || "");
    if (host && host !== "unknown") return host;
  }
  return "";
}

function isLearnableTrackerHost(host) {
  if (!isValidRuleDomain(host)) return false;
  const root = getRootDomain(host);
  if (LEARNER_EXCLUDED_ROOT_DOMAINS.has(root) || LEARNER_EXCLUDED_ROOT_DOMAINS.has(host)) return false;
  if (host.endsWith(".local") || host.endsWith(".lan") || host === "localhost") return false;
  return true;
}

function isSensitiveHost(host) {
  const lower = String(host || "").toLowerCase();
  return SENSITIVE_HOST_PARTS.some(part => lower.includes(part));
}

function isSameSite(a, b) {
  return getRootDomain(a) === getRootDomain(b);
}

function getRootDomain(host) {
  const clean = normalizeHost(host);
  if (!clean) return "";
  const parts = clean.split(".").filter(Boolean);
  if (parts.length <= 1) return clean;

  const exception = findPublicSuffixException(parts);
  if (exception) {
    const suffixParts = exception.split(".");
    return parts.slice(-suffixParts.length).join(".");
  }

  const suffix = findPublicSuffix(parts);
  const suffixLength = suffix ? suffix.split(".").length : 1;
  if (parts.length <= suffixLength) return clean;
  return parts.slice(-(suffixLength + 1)).join(".");
}

function normalizeHost(host) {
  return String(host || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "")
    .split(":")[0];
}

function findPublicSuffixException(parts) {
  for (let i = 0; i < parts.length; i += 1) {
    const candidate = parts.slice(i).join(".");
    if (PUBLIC_SUFFIX_EXCEPTIONS.has(candidate)) return candidate;
  }
  return "";
}

function findPublicSuffix(parts) {
  let match = parts.slice(-1).join(".");
  for (let i = 0; i < parts.length; i += 1) {
    const candidate = parts.slice(i).join(".");
    const wildcard = `*.${parts.slice(i + 1).join(".")}`;
    if (PUBLIC_SUFFIX_RULES.has(candidate)) match = candidate;
    if (i + 1 < parts.length && PUBLIC_SUFFIX_RULES.has(wildcard)) match = candidate;
  }
  return match;
}


function isValidRuleDomain(domain) {
  const clean = String(domain || "").toLowerCase();
  if (!clean || clean.length > 253) return false;
  if (clean.includes("_") || clean.includes("/") || clean.includes(":")) return false;
  return clean.split(".").every(part => part && part.length <= 63 && /^[a-z0-9-]+$/.test(part) && !part.startsWith("-") && !part.endsWith("-"));
}

async function getLearnedTrackerData() {
  const data = await chrome.storage.local.get([LEARNED_TRACKERS_KEY]);
  return normalizeLearnedTrackerData(data[LEARNED_TRACKERS_KEY]);
}

function emptyLearnedTrackerData() {
  return {
    domains: {},
    totalObservedRequests: 0,
    lastUpdated: null
  };
}

function normalizeLearnedTrackerData(raw) {
  const data = { ...emptyLearnedTrackerData(), ...(raw || {}) };
  data.totalObservedRequests = Number(data.totalObservedRequests) || 0;
  data.domains = data.domains && typeof data.domains === "object" ? data.domains : {};

  const cleanDomains = {};
  for (const [domain, item] of Object.entries(data.domains)) {
    if (!isValidRuleDomain(domain)) continue;
    cleanDomains[domain] = normalizeLearnedTrackerItem(item, domain);
  }

  data.domains = cleanDomains;
  return data;
}

function normalizeLearnedTrackerItem(raw, domain) {
  const item = {
    domain,
    state: "observed",
    requestCount: 0,
    firstPartyCount: 0,
    firstParties: {},
    firstSeen: Date.now(),
    lastSeen: null,
    sampleType: "other",
    sampleUrl: "",
    heuristicScore: 0,
    heuristics: emptyHeuristics(),
    seeded: false,
    category: "",
    ...(raw || {})
  };

  if (!["observed", "suspicious", "cookie_blocked", "ready", "blocked", "allowed", "manual_blocked", "manual_cookie_blocked"].includes(item.state)) item.state = "observed";
  item.requestCount = Number(item.requestCount) || 0;
  item.firstParties = item.firstParties && typeof item.firstParties === "object" ? item.firstParties : {};
  item.firstParties = trimFirstParties(item.firstParties);
  item.firstPartyCount = Object.keys(item.firstParties).length;
  item.firstSeen = Number(item.firstSeen) || Date.now();
  item.lastSeen = Number(item.lastSeen) || null;
  item.heuristics = normalizeHeuristics(item.heuristics);
  item.heuristicScore = calculateHeuristicScore(item.heuristics, item.firstPartyCount, item.requestCount);
  item.seeded = Boolean(item.seeded);
  item.category = String(item.category || "");
  return item;
}


function emptyHeuristics() {
  return {
    thirdPartyRequests: 0,
    thirdPartyCookieRequests: 0,
    thirdPartySetCookieResponses: 0,
    thirdPartyRefererRequests: 0,
    seedMatch: 0
  };
}

function normalizeHeuristics(raw) {
  const next = { ...emptyHeuristics(), ...(raw || {}) };
  for (const key of Object.keys(next)) {
    next[key] = Math.max(0, Number(next[key]) || 0);
  }
  return next;
}

function calculateHeuristicScore(heuristics, firstPartyCount, requestCount) {
  const h = normalizeHeuristics(heuristics);
  const spread = Math.min(Number(firstPartyCount) || 0, 8) * 2;
  const volume = Math.min(Number(requestCount) || 0, 30) * 0.2;
  const cookies = Math.min(h.thirdPartyCookieRequests, 10) * 3;
  const setCookies = Math.min(h.thirdPartySetCookieResponses, 10) * 4;
  const referers = Math.min(h.thirdPartyRefererRequests, 10);
  const seed = h.seedMatch ? 10 : 0;
  return Math.round((spread + volume + cookies + setCookies + referers + seed) * 10) / 10;
}

function getRequestHeaderSignals(details) {
  const headers = details?.requestHeaders || [];
  const names = new Set(headers.map(header => String(header.name || "").toLowerCase()));
  return {
    hasSignals: names.has("cookie") || names.has("referer"),
    cookieHeader: names.has("cookie"),
    refererHeader: names.has("referer")
  };
}

function getResponseHeaderSignals(details) {
  const headers = details?.responseHeaders || [];
  const names = new Set(headers.map(header => String(header.name || "").toLowerCase()));
  return {
    hasSignals: names.has("set-cookie"),
    setCookieHeader: names.has("set-cookie")
  };
}


function trimFirstParties(firstParties) {
  return Object.fromEntries(
    Object.entries(firstParties || {})
      .filter(([domain]) => isValidRuleDomain(domain))
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, MAX_FIRST_PARTIES_PER_DOMAIN)
  );
}

function trimLearnedDomains(domains) {
  return Object.fromEntries(
    Object.entries(domains || {})
      .sort((a, b) => learnedStateWeight(b[1].state) - learnedStateWeight(a[1].state) || Number(b[1].lastSeen || 0) - Number(a[1].lastSeen || 0))
      .slice(0, MAX_LEARNED_DOMAINS)
  );
}

function learnedStateWeight(state) {
  if (state === "manual_blocked") return 8;
  if (state === "blocked") return 7;
  if (state === "ready") return 6;
  if (state === "manual_cookie_blocked") return 5;
  if (state === "cookie_blocked") return 4;
  if (state === "suspicious") return 3;
  if (state === "allowed") return 2;
  return 1;
}

function isManualState(state) {
  return state === "allowed" || state === "manual_blocked" || state === "manual_cookie_blocked";
}

function getLearnedTrackerSummary(data) {
  const domains = Object.values(data.domains || {});
  const sorted = domains
    .sort((a, b) => learnedStateWeight(b.state) - learnedStateWeight(a.state) || Number(b.firstPartyCount) - Number(a.firstPartyCount) || Number(b.requestCount) - Number(a.requestCount))
    .slice(0, 12)
    .map(item => ({
      domain: item.domain,
      state: item.state,
      requestCount: item.requestCount,
      firstPartyCount: item.firstPartyCount,
      lastSeen: item.lastSeen,
      sampleType: item.sampleType,
      heuristicScore: item.heuristicScore || 0,
      seeded: Boolean(item.seeded),
      cookieSignals: item.heuristics?.thirdPartyCookieRequests || 0,
      setCookieSignals: item.heuristics?.thirdPartySetCookieResponses || 0
    }));

  return {
    totalObservedRequests: data.totalObservedRequests,
    totalObservedDomains: domains.length,
    suspiciousCount: domains.filter(item => item.state === "suspicious").length,
    blockedCount: domains.filter(item => item.state === "blocked" || item.state === "manual_blocked").length,
    cookieBlockedCount: domains.filter(item => item.state === "cookie_blocked" || item.state === "manual_cookie_blocked").length,
    readyCount: domains.filter(item => item.state === "ready").length,
    allowedCount: domains.filter(item => item.state === "allowed").length,
    recent: sorted,
    thresholds: {
      suspiciousSites: LEARN_SUSPICIOUS_FIRST_PARTIES,
      blockSites: LEARN_BLOCK_FIRST_PARTIES,
      blockRequests: LEARN_MIN_REQUESTS_TO_BLOCK
    },
    lastUpdated: data.lastUpdated
  };
}

async function syncLearnedTrackerRules(settings = null, existingData = null) {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return;
  const s = settings || await getSettings();
  const data = existingData || await getLearnedTrackerData();
  const siteRules = normalizeSiteRules((await chrome.storage.local.get([SITE_RULES_KEY]))[SITE_RULES_KEY]);
  const pausedSites = normalizePausedSites((await chrome.storage.local.get([PAUSED_SITES_KEY]))[PAUSED_SITES_KEY]);

  let currentDynamic = [];
  try {
    currentDynamic = await chrome.declarativeNetRequest.getDynamicRules();
  } catch (_) {
    currentDynamic = [];
  }

  const removeRuleIds = currentDynamic
    .map(rule => Number(rule.id))
    .filter(id => id >= LEARNED_RULE_ID_BASE && id <= LEARNED_RULE_ID_LIMIT);

  const blockingEnabled = s.trackerBlocker && s.trackerLearning;
  const addRules = [];

  if (blockingEnabled) {
    if (s.breakageProtection) addRules.push(...buildBreakageAllowRules());
    addRules.push(...buildPauseRules(pausedSites));
    addRules.push(...buildSiteAllowRules(siteRules));
    addRules.push(...buildCookieRules(data, s));
    addRules.push(...buildBlockRules(data, s));
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  } catch (err) {
    await addLog({ type: "tracker", label: "Learned rules update", detail: String(err?.message || err) });
  }
}


function buildBreakageAllowRules() {
  return BREAKAGE_ALLOW_DOMAINS
    .map(normalizeHost)
    .filter(isValidRuleDomain)
    .slice(0, MAX_BREAKAGE_ALLOW_RULES)
    .map((domain, index) => ({
      id: BREAKAGE_ALLOW_RULE_ID_BASE + index,
      priority: 20,
      action: { type: "allow" },
      condition: {
        requestDomains: [domain],
        domainType: "thirdParty",
        resourceTypes: LEARNED_RESOURCE_TYPES
      }
    }));
}

function buildBlockRules(data, settings) {
  const blockableDomains = Object.values(data.domains || {})
    .filter(item => isValidRuleDomain(item.domain))
    .filter(item => item.state === "manual_blocked" || (!settings.learningReviewMode && settings.autoBlockLearnedTrackers && item.state === "blocked"))
    .sort((a, b) => Number(b.firstPartyCount) - Number(a.firstPartyCount) || Number(b.requestCount) - Number(a.requestCount))
    .slice(0, MAX_LEARNED_DYNAMIC_RULES);

  return blockableDomains.map((item, index) => ({
    id: LEARNED_BLOCK_RULE_ID_BASE + index,
    priority: 4,
    action: { type: "block" },
    condition: {
      requestDomains: [item.domain],
      domainType: "thirdParty",
      resourceTypes: LEARNED_RESOURCE_TYPES
    }
  }));
}

function buildCookieRules(data, settings) {
  if (!settings.cookieBlockLearnedTrackers) return [];
  const cookieDomains = Object.values(data.domains || {})
    .filter(item => isValidRuleDomain(item.domain))
    .filter(item => item.state === "cookie_blocked" || item.state === "manual_cookie_blocked" || (settings.learningReviewMode && item.state === "ready"))
    .sort((a, b) => Number(b.firstPartyCount) - Number(a.firstPartyCount) || Number(b.requestCount) - Number(a.requestCount))
    .slice(0, MAX_COOKIE_DYNAMIC_RULES);

  return cookieDomains.map((item, index) => ({
    id: LEARNED_COOKIE_RULE_ID_BASE + index,
    priority: 3,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "cookie", operation: "remove" },
        { header: "referer", operation: "remove" }
      ],
      responseHeaders: [
        { header: "set-cookie", operation: "remove" }
      ]
    },
    condition: {
      requestDomains: [item.domain],
      domainType: "thirdParty",
      resourceTypes: LEARNED_RESOURCE_TYPES
    }
  }));
}

function buildSiteAllowRules(siteRules) {
  const pairs = [];
  for (const [site, domains] of Object.entries(siteRules.allow || {})) {
    if (!isValidRuleDomain(site)) continue;
    for (const domain of Object.keys(domains || {})) {
      if (isValidRuleDomain(domain)) pairs.push({ site, domain });
    }
  }

  return pairs.slice(0, MAX_SITE_ALLOW_RULES).map((item, index) => ({
    id: SITE_ALLOW_RULE_ID_BASE + index,
    priority: 12,
    action: { type: "allow" },
    condition: {
      requestDomains: [item.domain],
      initiatorDomains: [item.site],
      domainType: "thirdParty",
      resourceTypes: LEARNED_RESOURCE_TYPES
    }
  }));
}

function buildPauseRules(pausedSites) {
  return Object.keys(pausedSites || {})
    .filter(site => isValidRuleDomain(site))
    .slice(0, MAX_PAUSED_SITE_RULES)
    .map((site, index) => ({
      id: SITE_PAUSE_RULE_ID_BASE + index,
      priority: 11,
      action: { type: "allow" },
      condition: {
        initiatorDomains: [site],
        domainType: "thirdParty",
        resourceTypes: LEARNED_RESOURCE_TYPES
      }
    }));
}

async function setLearnedTrackerState(rawDomain, rawState) {
  const domain = normalizeHost(rawDomain);
  if (!isValidRuleDomain(domain)) return;
  const state = String(rawState || "");
  const data = await getLearnedTrackerData();

  if (state === "reset") {
    delete data.domains[domain];
  } else {
    const item = normalizeLearnedTrackerItem(data.domains[domain], domain);
    if (state === "allowed") item.state = "allowed";
    else if (state === "manual_blocked") item.state = "manual_blocked";
    else if (state === "manual_cookie_blocked") item.state = "manual_cookie_blocked";
    else if (state === "observed") item.state = "observed";
    else if (state === "ready") item.state = "ready";
    else return;
    item.lastSeen = Date.now();
    data.domains[domain] = item;
  }

  data.lastUpdated = Date.now();
  await chrome.storage.local.set({ [LEARNED_TRACKERS_KEY]: data });
  await syncLearnedTrackerRules(await getSettings(), data);
}

async function setSiteDomainRule(rawDomain, rawSite, rawState) {
  const domain = normalizeHost(rawDomain);
  const site = normalizeHost(rawSite) || (await getCurrentPageInfo()).root;
  if (!isValidRuleDomain(domain) || !isValidRuleDomain(site)) return;
  const state = String(rawState || "");
  const siteRules = normalizeSiteRules((await chrome.storage.local.get([SITE_RULES_KEY]))[SITE_RULES_KEY]);

  if (state === "site_allowed") {
    siteRules.allow[site] = siteRules.allow[site] || {};
    siteRules.allow[site][domain] = Date.now();
  } else if (state === "reset_site") {
    if (siteRules.allow[site]) delete siteRules.allow[site][domain];
    if (siteRules.allow[site] && !Object.keys(siteRules.allow[site]).length) delete siteRules.allow[site];
  }

  await chrome.storage.local.set({ [SITE_RULES_KEY]: siteRules });
  await syncLearnedTrackerRules(await getSettings());
}

async function togglePauseCurrentSite() {
  const page = await getCurrentPageInfo();
  if (!page.root || !isValidRuleDomain(page.root)) return;
  const pausedSites = normalizePausedSites((await chrome.storage.local.get([PAUSED_SITES_KEY]))[PAUSED_SITES_KEY]);
  if (pausedSites[page.root]) delete pausedSites[page.root];
  else pausedSites[page.root] = Date.now();
  await chrome.storage.local.set({ [PAUSED_SITES_KEY]: pausedSites });
  await syncLearnedTrackerRules(await getSettings());
}

async function clearLearnedTrackers() {
  await chrome.storage.local.set({ [LEARNED_TRACKERS_KEY]: emptyLearnedTrackerData(), SITE_RULES_KEY: emptySiteRules(), PAGE_TRACKERS_KEY: emptyPageTrackers() });
  await syncLearnedTrackerRules(await getSettings(), emptyLearnedTrackerData());
}


async function applySeedTrackerData(settings = null) {
  const s = settings || await getSettings();
  if (!s.seedKnownTrackers) return;

  const stored = await chrome.storage.local.get([SEED_VERSION_KEY, LEARNED_TRACKERS_KEY]);
  if (Number(stored[SEED_VERSION_KEY]) === SEED_TRACKER_VERSION) return;

  const data = normalizeLearnedTrackerData(stored[LEARNED_TRACKERS_KEY]);
  const now = Date.now();

  for (const rawDomain of SEED_TRACKER_DOMAINS) {
    const domain = normalizeHost(rawDomain);
    if (!isValidRuleDomain(domain)) continue;
    const item = normalizeLearnedTrackerItem(data.domains[domain], domain);
    if (item.state === "allowed" || item.state === "manual_blocked" || item.state === "manual_cookie_blocked") continue;

    item.state = item.state === "blocked" ? item.state : "cookie_blocked";
    item.seeded = true;
    item.category = item.category || "seed";
    item.lastSeen = item.lastSeen || now;
    item.heuristics = normalizeHeuristics(item.heuristics);
    item.heuristics.seedMatch = 1;
    item.heuristicScore = calculateHeuristicScore(item.heuristics, item.firstPartyCount, item.requestCount);
    data.domains[domain] = item;
  }

  data.lastUpdated = now;
  data.domains = trimLearnedDomains(data.domains);
  await chrome.storage.local.set({ [LEARNED_TRACKERS_KEY]: data, [SEED_VERSION_KEY]: SEED_TRACKER_VERSION });
}


async function buildExportData() {
  const data = await chrome.storage.local.get(["settings", LEARNED_TRACKERS_KEY, SITE_RULES_KEY, PAUSED_SITES_KEY, "trackerStats", SEED_VERSION_KEY]);
  return {
    name: "NoiseProfile export",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: normalizeSettings(data.settings || {}),
    learnedTrackers: normalizeLearnedTrackerData(data[LEARNED_TRACKERS_KEY]),
    siteRules: normalizeSiteRules(data[SITE_RULES_KEY]),
    pausedSites: normalizePausedSites(data[PAUSED_SITES_KEY]),
    trackerStats: normalizeTrackerStats(data.trackerStats),
    seedTrackerVersion: Number(data[SEED_VERSION_KEY]) || 0
  };
}

async function importExtensionData(payload) {
  const incoming = payload && typeof payload === "object" ? payload : {};
  const next = {};
  if (incoming.settings) next.settings = normalizeSettings(incoming.settings);
  if (incoming.learnedTrackers) next[LEARNED_TRACKERS_KEY] = normalizeLearnedTrackerData(incoming.learnedTrackers);
  if (incoming.siteRules) next[SITE_RULES_KEY] = normalizeSiteRules(incoming.siteRules);
  if (incoming.pausedSites) next[PAUSED_SITES_KEY] = normalizePausedSites(incoming.pausedSites);
  if (incoming.trackerStats) next.trackerStats = normalizeTrackerStats(incoming.trackerStats);
  if (incoming.seedTrackerVersion) next[SEED_VERSION_KEY] = Number(incoming.seedTrackerVersion) || 0;
  await chrome.storage.local.set(next);
  cachedSettings = null;
  cachedSettingsAt = 0;
  await syncLearnedTrackerRules(await getSettings());
}


function emptyPageTrackers() {
  return { pages: {}, lastUpdated: null };
}

function normalizePageTrackers(raw) {
  const data = { ...emptyPageTrackers(), ...(raw || {}) };
  data.pages = data.pages && typeof data.pages === "object" ? data.pages : {};
  for (const [site, page] of Object.entries(data.pages)) {
    if (!isValidRuleDomain(site)) {
      delete data.pages[site];
      continue;
    }
    data.pages[site] = trimPageDomains({ root: site, domains: page.domains || {}, lastSeen: Number(page.lastSeen) || null });
  }
  data.pages = trimPageTrackerPages(data.pages);
  return data;
}

function trimPageDomains(page) {
  const domains = Object.fromEntries(
    Object.entries(page.domains || {})
      .filter(([domain]) => isValidRuleDomain(domain))
      .sort((a, b) => Number(b[1].lastSeen || 0) - Number(a[1].lastSeen || 0))
      .slice(0, MAX_PAGE_TRACKERS_PER_PAGE)
  );
  return { ...page, domains };
}

function trimPageTrackerPages(pages) {
  return Object.fromEntries(
    Object.entries(pages || {})
      .sort((a, b) => Number(b[1].lastSeen || 0) - Number(a[1].lastSeen || 0))
      .slice(0, MAX_PAGE_TRACKER_PAGES)
  );
}

function emptySiteRules() {
  return { allow: {} };
}

function normalizeSiteRules(raw) {
  const rules = { ...emptySiteRules(), ...(raw || {}) };
  rules.allow = rules.allow && typeof rules.allow === "object" ? rules.allow : {};
  for (const [site, domains] of Object.entries(rules.allow)) {
    if (!isValidRuleDomain(site)) {
      delete rules.allow[site];
      continue;
    }
    rules.allow[site] = Object.fromEntries(
      Object.entries(domains || {})
        .filter(([domain]) => isValidRuleDomain(domain))
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, MAX_PAGE_TRACKERS_PER_PAGE)
    );
    if (!Object.keys(rules.allow[site]).length) delete rules.allow[site];
  }
  return rules;
}

function normalizePausedSites(raw) {
  return Object.fromEntries(
    Object.entries(raw && typeof raw === "object" ? raw : {})
      .filter(([site]) => isValidRuleDomain(site))
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, MAX_PAUSED_SITE_RULES)
  );
}

async function getCurrentPageInfo() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    const url = tab?.url || "";
    if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return { url, host: "", root: "", title: tab?.title || "" };
    const host = extractHostname(url);
    return { url, host, root: getRootDomain(host), title: tab?.title || "" };
  } catch (_) {
    return { url: "", host: "", root: "", title: "" };
  }
}

function buildCurrentPageSummary(currentPage, pageTrackers, learnedData, siteRules, pausedSites) {
  const root = currentPage?.root || "";
  const page = root ? pageTrackers.pages[root] : null;
  const trackers = Object.values(page?.domains || {})
    .sort((a, b) => Number(b.lastSeen || 0) - Number(a.lastSeen || 0))
    .slice(0, 18)
    .map(item => {
      const learned = normalizeLearnedTrackerItem(learnedData.domains[item.domain], item.domain);
      const siteAllowed = Boolean(siteRules.allow?.[root]?.[item.domain]);
      return {
        domain: item.domain,
        count: item.count || 0,
        state: siteAllowed ? "site_allowed" : learned.state,
        learnedState: learned.state,
        firstPartyCount: learned.firstPartyCount || 0,
        requestCount: learned.requestCount || 0,
        lastSeen: item.lastSeen || null,
        sampleType: item.sampleType,
      heuristicScore: item.heuristicScore || 0,
      seeded: Boolean(item.seeded),
      cookieSignals: item.heuristics?.thirdPartyCookieRequests || 0,
      setCookieSignals: item.heuristics?.thirdPartySetCookieResponses || 0 || Object.keys(item.types || {})[0] || "other"
      };
    });

  return {
    ...currentPage,
    paused: Boolean(root && pausedSites[root]),
    trackerCount: trackers.length,
    trackers
  };
}


async function applyPrivacyControls(settings) {
  if (!chrome.privacy) return;

  const summaries = [];
  for (const item of PRIVACY_CONTROLS) {
    const control = getPrivacyControl(item.path);
    if (!control) continue;

    const result = settings.privacyHardening
      ? await setPrivacyOverride(control, item.value)
      : await clearPrivacyOverride(control);

    if (result.ok) summaries.push(item.label);
  }

  if (settings.privacyHardening && summaries.length) {
    await addLog({ type: "privacy", label: "Browser privacy controls applied", detail: summaries.join(", ") });
  }
}

function getPrivacyControl(path) {
  let current = chrome.privacy;
  for (const part of path) {
    current = current?.[part];
  }
  return current && typeof current.get === "function" && typeof current.set === "function" ? current : null;
}

function setPrivacyOverride(control, value) {
  return new Promise(resolve => {
    control.get({}, details => {
      const getError = chrome.runtime.lastError;
      if (getError) {
        resolve({ ok: false, error: getError.message });
        return;
      }

      if (details?.value === value && details?.levelOfControl === "controlled_by_this_extension") {
        resolve({ ok: true, changed: false });
        return;
      }

      control.set({ value, scope: "regular" }, () => {
        const setError = chrome.runtime.lastError;
        resolve(setError ? { ok: false, error: setError.message } : { ok: true, changed: true });
      });
    });
  });
}

function clearPrivacyOverride(control) {
  return new Promise(resolve => {
    if (typeof control.clear !== "function") {
      resolve({ ok: true, changed: false });
      return;
    }

    control.get({}, details => {
      const getError = chrome.runtime.lastError;
      if (getError) {
        resolve({ ok: false, error: getError.message });
        return;
      }

      if (details?.levelOfControl !== "controlled_by_this_extension") {
        resolve({ ok: true, changed: false });
        return;
      }

      control.clear({ scope: "regular" }, () => {
        const clearError = chrome.runtime.lastError;
        resolve(clearError ? { ok: false, error: clearError.message } : { ok: true, changed: true });
      });
    });
  });
}

async function setIconState(enabled) {
  const title = enabled ? "NoiseProfile: on" : "NoiseProfile: off";
  await chrome.action.setTitle({ title });
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#6ae28f" });
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
