(function () {
  const STORAGE_KEYS = {
    dataset: "dailyEnglish.dataset",
    sync: "dailyEnglish.sync"
  };

  const DEFAULT_REMOTE_URL =
    "https://raw.githubusercontent.com/bangcepslabs/daily-english-data/main/examples/github-raw/sentences.json";

  const DEFAULT_SYNC = {
    enabled: true,
    url: DEFAULT_REMOTE_URL,
    intervalHours: 24,
    lastCheckedAt: 0
  };

  const state = {
    sync: { ...DEFAULT_SYNC },
    datasetMeta: {
      source: "local",
      version: "local",
      updatedAt: "",
      sourceUrl: ""
    }
  };

  const els = {
    syncStateLabel: document.getElementById("sync-state-label"),
    syncUrl: document.getElementById("sync-url"),
    syncInterval: document.getElementById("sync-interval"),
    syncEnabled: document.getElementById("sync-enabled"),
    syncNote: document.getElementById("sync-note"),
    datasetMeta: document.getElementById("dataset-meta"),
    statusLine: document.getElementById("status-line")
  };

  const hasChromeStorage = Boolean(window.chrome && chrome.storage && chrome.storage.local);

  function setStatus(message, type = "") {
    els.statusLine.textContent = message;
    els.statusLine.classList.remove("status-success", "status-warning");
    if (type === "success") {
      els.statusLine.classList.add("status-success");
    } else if (type === "warning") {
      els.statusLine.classList.add("status-warning");
    }
  }

  async function storageGet(keys) {
    if (hasChromeStorage) {
      return await new Promise((resolve) => chrome.storage.local.get(keys, resolve));
    }

    const result = {};
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          result[key] = JSON.parse(raw);
        } catch {
          result[key] = raw;
        }
      }
    }
    return result;
  }

  async function storageSet(obj) {
    if (hasChromeStorage) {
      return await new Promise((resolve) => chrome.storage.local.set(obj, resolve));
    }

    for (const [key, value] of Object.entries(obj)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  async function storageRemove(keys) {
    if (hasChromeStorage) {
      return await new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
    }

    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  function updateUI() {
    els.syncEnabled.checked = Boolean(state.sync.enabled);
    els.syncUrl.value = state.sync.url || "";
    els.syncInterval.value = String(state.sync.intervalHours || 24);
    els.syncStateLabel.textContent = state.datasetMeta.source === "remote" ? "Remote" : state.datasetMeta.source === "cached" ? "Cached" : "Local";

    if (state.sync.enabled && state.sync.url) {
      els.syncNote.textContent = `Auto update is on. Last check: ${state.sync.lastCheckedAt ? new Date(state.sync.lastCheckedAt).toLocaleString() : "never"}.`;
    } else if (state.sync.url) {
      els.syncNote.textContent = "A remote URL is set, but auto update is currently off.";
    } else {
      els.syncNote.textContent = "Use a hosted JSON file to keep the sentence set updated automatically.";
    }

    if (state.datasetMeta.sourceUrl) {
      els.datasetMeta.textContent = `Source: ${state.datasetMeta.sourceUrl}`;
    } else if (state.datasetMeta.version) {
      els.datasetMeta.textContent = `Version: ${state.datasetMeta.version}`;
    } else {
      els.datasetMeta.textContent = "No dataset snapshot saved yet.";
    }
  }

  async function loadState() {
    const stored = await storageGet([STORAGE_KEYS.sync, STORAGE_KEYS.dataset]);
    state.sync = { ...DEFAULT_SYNC, ...(stored[STORAGE_KEYS.sync] || {}) };
    if (!state.sync.url) {
      state.sync.url = DEFAULT_REMOTE_URL;
    }

    const dataset = stored[STORAGE_KEYS.dataset];
    if (dataset && Array.isArray(dataset.sentences) && dataset.sentences.length) {
      state.datasetMeta = {
        source: String(dataset.source || "cached"),
        version: String(dataset.version || "cached"),
        updatedAt: String(dataset.updatedAt || ""),
        sourceUrl: String(dataset.sourceUrl || "")
      };
    }
  }

  function normalizeDataset(payload) {
    const rawSentences = Array.isArray(payload) ? payload : payload && Array.isArray(payload.sentences) ? payload.sentences : [];
    const sentences = rawSentences
      .map((item) => ({
        id: Number(item.id),
        english: String(item.english || "").trim(),
        korean: String(item.korean || "").trim(),
        category: String(item.category || "Other").trim(),
        level: String(item.level || "Intermediate").trim(),
        situation: String(item.situation || "").trim()
      }))
      .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.english && item.korean);

    if (!sentences.length) {
      return null;
    }

    return {
      source: "remote",
      sourceUrl: state.sync.url.trim(),
      version: String((payload && payload.version) || "remote"),
      updatedAt: String((payload && payload.updatedAt) || new Date().toISOString()),
      sentences
    };
  }

  async function persistSync() {
    await storageSet({ [STORAGE_KEYS.sync]: state.sync });
  }

  async function persistDataset(snapshot) {
    await storageSet({ [STORAGE_KEYS.dataset]: snapshot });
  }

  async function syncNow({ silent = false } = {}) {
    if (!state.sync.url) {
      setStatus("Enter a remote JSON URL first.", "warning");
      return false;
    }

    state.sync.lastCheckedAt = Date.now();
    await persistSync();

    try {
      const response = await fetch(state.sync.url.trim(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Remote fetch failed: ${response.status}`);
      }

      const payload = await response.json();
      const normalized = normalizeDataset(payload);
      if (!normalized) {
        throw new Error("The remote JSON does not contain valid sentence data.");
      }

      await persistDataset(normalized);
      state.datasetMeta = normalized;
      updateUI();
      if (!silent) {
        setStatus(`Synced ${normalized.sentences.length} sentences from remote data.`, "success");
      }
      return true;
    } catch (error) {
      console.error("[Daily English Tab Options] Sync failed:", error);
      updateUI();
      if (!silent) {
        setStatus("Sync failed. The current local data remains available.", "warning");
      }
      return false;
    }
  }

  async function clearCache() {
    await storageRemove([STORAGE_KEYS.dataset]);
    state.datasetMeta = {
      source: "local",
      version: "local",
      updatedAt: "",
      sourceUrl: ""
    };
    updateUI();
    setStatus("Cached remote dataset cleared.", "success");
  }

  function attachEvents() {
    els.syncEnabled.addEventListener("change", async (event) => {
      state.sync.enabled = event.target.checked;
      await persistSync();
      updateUI();
    });

    els.syncUrl.addEventListener("change", async (event) => {
      state.sync.url = event.target.value.trim();
      state.sync.lastCheckedAt = 0;
      await persistSync();
      updateUI();
    });

    els.syncInterval.addEventListener("change", async (event) => {
      const nextValue = Math.max(1, Math.min(168, Number(event.target.value) || 24));
      state.sync.intervalHours = nextValue;
      event.target.value = String(nextValue);
      await persistSync();
      updateUI();
    });

    document.body.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }

      const action = button.dataset.action;
      if (action === "sync-now") {
        await syncNow();
      } else if (action === "clear-cache") {
        await clearCache();
      } else if (action === "open-preview") {
        const target = chrome.runtime.getURL("popup.html");
        window.open(target, "_blank");
      }
    });
  }

  async function initialize() {
    await loadState();
    attachEvents();
    updateUI();
    setStatus("Ready.");
  }

  initialize().catch((error) => {
    console.error("[Daily English Tab Options]", error);
    setStatus(error instanceof Error ? error.message : "Could not load settings.", "warning");
  });
})();
