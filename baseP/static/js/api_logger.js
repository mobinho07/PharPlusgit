(() => {
  const LOG_ENDPOINT = "http://127.0.0.1:5000/api/logs";
  const originalFetch = window.fetch.bind(window);
  const FLUSH_INTERVAL_MS = 15000; // envoi groupé toutes les 15s

  let logQueue = [];
  let flushTimer = null;
  let flushing = false;

  function nowIso() {
    return new Date().toISOString();
  }

  function isLogCall(urlLike) {
    try {
      const href = new URL(urlLike, window.location.origin).href;
      return href.includes("/api/logs");
    } catch {
      return String(urlLike).includes("/api/logs");
    }
  }

  function enqueueLog(line) {
    logQueue.push(line);
    if (!flushTimer) {
      flushTimer = setTimeout(flushLogs, FLUSH_INTERVAL_MS); // envoi groupé toutes les 15s
    }
  }

  async function flushLogs() {
    flushTimer = null;
    if (flushing || logQueue.length === 0) return;

    flushing = true;
    const lines = logQueue.splice(0, logQueue.length);

    try {
      await originalFetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
    } catch (e) {
      // si ça échoue, on remet dans la queue
      logQueue.unshift(...lines);
    } finally {
      flushing = false;
    }
  }

  window.fetch = async function (input, init = {}) {
    const method = (init.method || "GET").toUpperCase();
    const urlStr = typeof input === "string" ? input : (input?.url || "");

    // Ne jamais logger l'endpoint logs
    if (isLogCall(urlStr)) {
      return originalFetch(input, init);
    }

    const fullUrl = new URL(urlStr, window.location.origin).href;
    const start = performance.now();

    enqueueLog(`${nowIso()} | REQUEST  | ${method} | ${fullUrl}`);

    try {
      const resp = await originalFetch(input, init);

      const durationMs = Math.round(performance.now() - start);
      const ok = resp.ok;

      let bodyText = "";
      try {
        bodyText = await resp.clone().text();
      } catch {
        bodyText = "[unreadable body]";
      }

      enqueueLog(
        `${nowIso()} | RESPONSE | ${method} | ${fullUrl} | ${resp.status} | ok=${ok} | duration_ms=${durationMs} | ${String(bodyText).slice(0, 2000)}`
      );

      return resp;
    } catch (e) {
      const durationMs = Math.round(performance.now() - start);
      enqueueLog(
        `${nowIso()} | ERROR    | ${method} | ${fullUrl} | duration_ms=${durationMs} | ${e.message}`
      );
      throw e;
    }
  };
})();