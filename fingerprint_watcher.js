(() => {
  if (window.__profileFogFingerprintBridge) return;
  window.__profileFogFingerprintBridge = true;

  let injected = false;

  function relay(event) {
    if (event.source !== window) return;
    const data = event.data || {};
    if (data.source !== "profilefog-fingerprint-watch") return;
    chrome.runtime.sendMessage({
      type: "fingerprintSignal",
      api: String(data.api || "unknown"),
      url: String(data.url || location.href)
    }).catch(() => {});
  }

  async function init() {
    try {
      const response = await chrome.runtime.sendMessage({ type: "getFingerprintWatcherSetting" });
      if (!response?.ok || !response.enabled) return;
      window.addEventListener("message", relay, false);
      injectPageWatcher();
    } catch (_) {}
  }

  function injectPageWatcher() {
    if (injected) return;
    injected = true;
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("fingerprint_page.js");
    script.async = false;
    script.onload = () => script.remove();
    (document.documentElement || document.head || document.body).appendChild(script);
  }

  init();
})();
