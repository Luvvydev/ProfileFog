(() => {
  if (window.__profileFogFingerprintPageWatcher) return;
  window.__profileFogFingerprintPageWatcher = true;

  const emit = (api) => {
    try {
      window.postMessage({
        source: "profilefog-fingerprint-watch",
        api,
        url: String(location.href || "")
      }, "*");
    } catch (_) {}
  };

  const wrapMethod = (target, method, api, filter = null) => {
    try {
      if (!target || typeof target[method] !== "function") return;
      const original = target[method];
      if (original.__profileFogWrapped) return;
      const wrapped = function(...args) {
        const result = original.apply(this, args);
        try {
          if (!filter || filter(args, result)) emit(api);
        } catch (_) {}
        return result;
      };
      Object.defineProperty(wrapped, "__profileFogWrapped", { value: true });
      Object.defineProperty(target, method, { value: wrapped, configurable: true, writable: true });
    } catch (_) {}
  };

  const wrapGetter = (target, prop, api) => {
    try {
      if (!target) return;
      const descriptor = Object.getOwnPropertyDescriptor(target, prop);
      if (!descriptor || typeof descriptor.get !== "function" || descriptor.get.__profileFogWrapped) return;
      const originalGet = descriptor.get;
      const wrappedGet = function() {
        try { emit(api); } catch (_) {}
        return originalGet.call(this);
      };
      Object.defineProperty(wrappedGet, "__profileFogWrapped", { value: true });
      Object.defineProperty(target, prop, { ...descriptor, get: wrappedGet });
    } catch (_) {}
  };

  const webglParamFilter = (args) => {
    const value = Number(args?.[0]);
    return [
      0x1F00, // VENDOR
      0x1F01, // RENDERER
      0x1F02, // VERSION
      0x8B8C, // SHADING_LANGUAGE_VERSION
      0x9245, // UNMASKED_VENDOR_WEBGL
      0x9246  // UNMASKED_RENDERER_WEBGL
    ].includes(value);
  };

  wrapMethod(window.HTMLCanvasElement && HTMLCanvasElement.prototype, "toDataURL", "canvas.toDataURL");
  wrapMethod(window.HTMLCanvasElement && HTMLCanvasElement.prototype, "toBlob", "canvas.toBlob");
  wrapMethod(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, "getImageData", "canvas.getImageData");
  wrapMethod(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, "measureText", "canvas.measureText");
  wrapMethod(window.OffscreenCanvas && OffscreenCanvas.prototype, "convertToBlob", "canvas.convertToBlob");

  wrapMethod(window.WebGLRenderingContext && WebGLRenderingContext.prototype, "getParameter", "webgl.getParameter", webglParamFilter);
  wrapMethod(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, "getParameter", "webgl2.getParameter", webglParamFilter);

  wrapMethod(window.AudioBuffer && AudioBuffer.prototype, "getChannelData", "audio.getChannelData");
  wrapMethod(window.AnalyserNode && AnalyserNode.prototype, "getFloatFrequencyData", "audio.getFloatFrequencyData");
  wrapMethod(window.AnalyserNode && AnalyserNode.prototype, "getByteFrequencyData", "audio.getByteFrequencyData");

  wrapMethod(window.navigator && navigator.mediaDevices, "enumerateDevices", "media.enumerateDevices");
  wrapMethod(window.Intl && Intl.DateTimeFormat && Intl.DateTimeFormat.prototype, "resolvedOptions", "intl.resolvedOptions");
  wrapMethod(window.Date && Date.prototype, "getTimezoneOffset", "date.getTimezoneOffset");

  const screenProto = window.Screen && Screen.prototype;
  ["width", "height", "availWidth", "availHeight", "colorDepth", "pixelDepth"].forEach(prop => {
    wrapGetter(screenProto, prop, `screen.${prop}`);
  });

  const navigatorProto = window.Navigator && Navigator.prototype;
  ["hardwareConcurrency", "deviceMemory", "platform", "language", "languages", "userAgent", "webdriver"].forEach(prop => {
    wrapGetter(navigatorProto, prop, `navigator.${prop}`);
  });
})();
