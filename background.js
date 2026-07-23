(function () {
  const STORAGE_KEYS = {
    dataset: "dailyEnglish.dataset",
    sync: "dailyEnglish.sync"
  };

  const DEFAULT_REMOTE_URL =
    "https://raw.githubusercontent.com/jeongbyeongho/daily-english-data/main/examples/github-raw/sentences.json";

  const DEFAULT_SYNC = {
    enabled: true,
    url: DEFAULT_REMOTE_URL,
    intervalHours: 24,
    lastCheckedAt: 0
  };

  const ALARM_NAME = "dailyEnglish.remoteSync";
  let suppressSyncChangeHandler = false;

  function normalizeSentence(raw) {
    return {
      id: Number(raw.id),
      english: String(raw.english || "").trim(),
      korean: String(raw.korean || "").trim(),
      category: String(raw.category || "Other").trim(),
      level: String(raw.level || "Intermediate").trim(),
      situation: String(raw.situation || "").trim()
    };
  }

  function normalizeDatasetPayload(payload, sourceUrl) {
    const rawSentences = Array.isArray(payload) ? payload : payload && Array.isArray(payload.sentences) ? payload.sentences : [];
    const sentences = rawSentences
      .map(normalizeSentence)
      .filter((sentence) => Number.isFinite(sentence.id) && sentence.id > 0 && sentence.english && sentence.korean);

    if (!sentences.length) {
      return null;
    }

    return {
      source: "remote",
      sourceUrl: String(sourceUrl || ""),
      version: String((payload && payload.version) || "remote"),
      updatedAt: String((payload && payload.updatedAt) || new Date().toISOString()),
      sentences
    };
  }

  async function storageGet(keys) {
    return await new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  async function storageSet(obj) {
    return await new Promise((resolve) => chrome.storage.local.set(obj, resolve));
  }

  async function storageRemove(keys) {
    return await new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
  }

  function getAlarmPeriodMinutes(sync) {
    const hours = Math.max(1, Number(sync.intervalHours) || 24);
    return Math.max(1, hours * 60);
  }

  async function scheduleSyncAlarm(sync) {
    if (sync.enabled && sync.url) {
      chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: getAlarmPeriodMinutes(sync)
      });
      return;
    }

    await chrome.alarms.clear(ALARM_NAME);
  }

  async function loadSyncState() {
    const stored = await storageGet([STORAGE_KEYS.sync]);
    const sync = {
      ...DEFAULT_SYNC,
      ...(stored[STORAGE_KEYS.sync] || {})
    };

    if (!sync.url) {
      sync.url = DEFAULT_REMOTE_URL;
    }

    return sync;
  }

  async function syncRemoteDataset({ force = false } = {}) {
    const stored = await storageGet([STORAGE_KEYS.sync]);
    const sync = {
      ...DEFAULT_SYNC,
      ...(stored[STORAGE_KEYS.sync] || {})
    };

    if (!sync.enabled || !sync.url) {
      return false;
    }

    const intervalMs = getAlarmPeriodMinutes(sync) * 60 * 1000;
    if (!force && sync.lastCheckedAt && Date.now() - sync.lastCheckedAt < intervalMs) {
      return false;
    }

    sync.lastCheckedAt = Date.now();
    await storageSet({ [STORAGE_KEYS.sync]: sync });

    try {
      const response = await fetch(sync.url.trim(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Remote fetch failed: ${response.status}`);
      }

      const payload = await response.json();
      const normalized = normalizeDatasetPayload(payload, sync.url.trim());
      if (!normalized) {
        throw new Error("The remote JSON does not contain valid sentence data.");
      }

      const snapshot = {
        ...normalized,
        source: "remote",
        sourceUrl: sync.url.trim()
      };

      await storageSet({
        [STORAGE_KEYS.dataset]: snapshot,
        [STORAGE_KEYS.sync]: sync
      });
      return true;
    } catch (error) {
      console.error("[Daily English Tab Background] Sync failed:", error);
      await storageSet({ [STORAGE_KEYS.sync]: sync });
      return false;
    }
  }

  async function refreshScheduleAndMaybeSync({ force = false } = {}) {
    const sync = await loadSyncState();
    suppressSyncChangeHandler = true;
    try {
      await storageSet({ [STORAGE_KEYS.sync]: sync });
      await scheduleSyncAlarm(sync);
    } finally {
      suppressSyncChangeHandler = false;
    }

    if (sync.enabled && sync.url) {
      await syncRemoteDataset({ force });
    }
  }

  chrome.runtime.onInstalled.addListener(() => {
    void refreshScheduleAndMaybeSync({ force: true });
  });

  chrome.runtime.onStartup.addListener(() => {
    void refreshScheduleAndMaybeSync();
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      void syncRemoteDataset();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || suppressSyncChangeHandler || !changes[STORAGE_KEYS.sync]) {
      return;
    }

    const previousSync = {
      ...DEFAULT_SYNC,
      ...(changes[STORAGE_KEYS.sync].oldValue || {})
    };
    const nextSync = {
      ...DEFAULT_SYNC,
      ...(changes[STORAGE_KEYS.sync].newValue || {})
    };
    const settingsChanged =
      previousSync.enabled !== nextSync.enabled ||
      previousSync.url !== nextSync.url ||
      previousSync.intervalHours !== nextSync.intervalHours;

    void (async () => {
      await scheduleSyncAlarm(nextSync);
      if (settingsChanged && nextSync.enabled && nextSync.url) {
        await syncRemoteDataset({ force: true });
      }
    })();
  });
})();
