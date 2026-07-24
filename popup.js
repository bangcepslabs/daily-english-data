(function () {
  const STORAGE_KEYS = {
    settings: "dailyEnglish.settings",
    daily: "dailyEnglish.daily",
    review: "dailyEnglish.reviewIds",
    lastSentence: "dailyEnglish.lastSentence",
    view: "dailyEnglish.view",
    dataset: "dailyEnglish.dataset"
  };
  const MESSAGE_TYPES = {
    syncDataset: "dailyEnglish.syncDataset"
  };

  const DEFAULT_SETTINGS = {
    themeMode: "system",
    showTranslation: true,
    selectedCategory: "all",
    selectedLevel: "all"
  };

  const DEFAULT_DAILY = {
    date: "",
    seenIds: [],
    uniqueCount: 0,
    currentSentence: null
  };

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    view: {
      selectedCategory: "all",
      selectedLevel: "all",
      showTranslation: true
    },
    daily: { ...DEFAULT_DAILY },
    reviewIds: [],
    datasetMeta: {
      source: "bundled",
      version: "local",
      updatedAt: ""
    },
    sentences: [],
    filtered: [],
    currentSentence: null,
    lastSentence: null
  };

  const els = {
    heroCard: document.getElementById("hero-card"),
    dailyCount: document.getElementById("daily-count"),
    reviewCount: document.getElementById("review-count"),
    sentenceCategory: document.getElementById("sentence-category"),
    sentenceLevel: document.getElementById("sentence-level"),
    sentenceTitle: document.getElementById("sentence-title"),
    sentenceKorean: document.getElementById("sentence-korean"),
    datasetLine: document.getElementById("dataset-line"),
    categoryFilter: document.getElementById("category-filter"),
    levelFilter: document.getElementById("level-filter"),
    statusLine: document.getElementById("status-line"),
    themeRoot: document.documentElement
  };

  const hasChromeStorage = Boolean(window.chrome && chrome.storage && chrome.storage.local);

  function getTodayKey(date = new Date()) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function setStatus(message, type = "") {
    if (!els.statusLine) {
      return;
    }

    els.statusLine.textContent = message;
    els.statusLine.classList.remove("status-success", "status-warning");
    if (type === "success") {
      els.statusLine.classList.add("status-success");
    } else if (type === "warning") {
      els.statusLine.classList.add("status-warning");
    }
  }

  function setLoading(isLoading) {
    if (!els.heroCard) {
      return;
    }

    els.heroCard.classList.toggle("is-loading", isLoading);
    const sentenceCard = document.querySelector(".sentence-card");
    if (sentenceCard) {
      sentenceCard.setAttribute("aria-busy", isLoading ? "true" : "false");
    }
  }

  function forcePopupWidth() {
    const root = document.documentElement;
    const body = document.body;
    if (!root || !body) {
      return;
    }

    root.style.minWidth = "420px";
    body.style.minWidth = "420px";
    body.style.width = "420px";
    body.style.overflowX = "hidden";

    try {
      window.resizeTo?.(420, Math.max(window.outerHeight || 600, 600));
    } catch {
      // Chrome may ignore resize calls for popups; CSS fallback remains.
    }
  }

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

  function normalizeSentenceSnapshot(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const sentence = normalizeSentence(raw);
    return Number.isFinite(sentence.id) && sentence.id > 0 && sentence.english && sentence.korean ? sentence : null;
  }

  function matchesActiveFilters(sentence) {
    if (!sentence) {
      return false;
    }

    const categoryMatch =
      state.settings.selectedCategory === "all" || sentence.category === state.settings.selectedCategory;
    const levelMatch = state.settings.selectedLevel === "all" || sentence.level === state.settings.selectedLevel;
    return categoryMatch && levelMatch;
  }

  function normalizeSentenceList(data) {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map(normalizeSentence)
      .filter((sentence) => Number.isFinite(sentence.id) && sentence.id > 0 && sentence.english && sentence.korean);
  }

  function normalizeDatasetPayload(payload, fallbackVersion = "local") {
    const rawSentences = Array.isArray(payload) ? payload : payload && Array.isArray(payload.sentences) ? payload.sentences : [];
    const sentences = normalizeSentenceList(rawSentences);
    if (!sentences.length) {
      return null;
    }

    return {
      source: "cached",
      sourceUrl: "",
      version: String((payload && payload.version) || fallbackVersion || "local"),
      updatedAt: String((payload && payload.updatedAt) || new Date().toISOString()),
      sentences
    };
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

  async function loadBootstrapState() {
    const stored = await storageGet([
      STORAGE_KEYS.settings,
      STORAGE_KEYS.daily,
      STORAGE_KEYS.review,
      STORAGE_KEYS.lastSentence,
      STORAGE_KEYS.view
    ]);
    state.settings = { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] || {}) };
    state.daily = { ...DEFAULT_DAILY, ...(stored[STORAGE_KEYS.daily] || {}) };
    state.reviewIds = Array.isArray(stored[STORAGE_KEYS.review]) ? stored[STORAGE_KEYS.review].map(Number).filter(Number.isFinite) : [];
    state.view = {
      ...state.view,
      ...(stored[STORAGE_KEYS.view] || {})
    };
    state.settings.selectedCategory = state.view.selectedCategory || state.settings.selectedCategory || "all";
    state.settings.selectedLevel = state.view.selectedLevel || state.settings.selectedLevel || "all";
    state.settings.showTranslation =
      typeof state.view.showTranslation === "boolean" ? state.view.showTranslation : state.settings.showTranslation;
    state.lastSentence = normalizeSentenceSnapshot(stored[STORAGE_KEYS.view]?.lastSentence || stored[STORAGE_KEYS.lastSentence]);
    state.daily.currentSentence = normalizeSentenceSnapshot(state.daily.currentSentence);

    if (state.daily.date !== getTodayKey()) {
      state.daily = { ...DEFAULT_DAILY, date: getTodayKey() };
      await storageSet({ [STORAGE_KEYS.daily]: state.daily });
    }
  }

  async function loadDatasetState() {
    const stored = await storageGet([STORAGE_KEYS.dataset]);
    const cached = stored[STORAGE_KEYS.dataset];
    if (cached && Array.isArray(cached.sentences) && cached.sentences.length) {
      state.datasetMeta = {
        source: String(cached.source || "cached"),
        version: String(cached.version || "cached"),
        updatedAt: String(cached.updatedAt || "")
      };
      state.sentences = normalizeSentenceList(cached.sentences);
      return;
    }

    const response = await fetch("data/sentences.json", { cache: "no-store" });
    const bundled = await response.json();
    const normalized = normalizeDatasetPayload(bundled, "bundled");
    state.sentences = normalized ? normalized.sentences : [];
    state.datasetMeta = normalized
      ? {
          source: "bundled",
          version: normalized.version,
          updatedAt: normalized.updatedAt
        }
      : { source: "bundled", version: "local", updatedAt: "" };
  }

  function refreshDatasetUi({ keepCurrentSentence = true } = {}) {
    buildFilterOptions();
    buildFilteredSentences();
    updateDatasetLine();

    if (!keepCurrentSentence || !state.currentSentence || !matchesActiveFilters(state.currentSentence)) {
      updateSentenceCard();
      return;
    }

    renderSentence(state.currentSentence);
    updateCounts();
  }

  function applyTheme() {
    const mode = state.settings.themeMode || "system";
    els.themeRoot.setAttribute("data-theme", mode);
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function buildFilterOptions() {
    const categories = unique(state.sentences.map((sentence) => sentence.category));
    const levels = unique(state.sentences.map((sentence) => sentence.level));

    els.categoryFilter.innerHTML = [
      '<option value="all">All categories</option>',
      ...categories.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    ].join("");

    els.levelFilter.innerHTML = [
      '<option value="all">All levels</option>',
      ...levels.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    ].join("");

    els.categoryFilter.value = state.settings.selectedCategory || "all";
    els.levelFilter.value = state.settings.selectedLevel || "all";
  }

  function buildFilteredSentences() {
    state.filtered = state.sentences.filter((sentence) => {
      const categoryMatch =
        state.settings.selectedCategory === "all" || sentence.category === state.settings.selectedCategory;
      const levelMatch = state.settings.selectedLevel === "all" || sentence.level === state.settings.selectedLevel;
      return categoryMatch && levelMatch;
    });
  }

  function chooseSentence() {
    if (!state.filtered.length) {
      return null;
    }

    const recentIds = state.daily.seenIds.slice(-10);
    const pool = state.filtered.filter((sentence) => !recentIds.includes(sentence.id));
    const candidates = pool.length ? pool : state.filtered;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function recordSeen(sentence) {
    if (!state.daily.seenIds.includes(sentence.id)) {
      state.daily.seenIds.push(sentence.id);
      state.daily.uniqueCount += 1;
    }
    state.daily.date = getTodayKey();
  }

  function renderSentence(sentence) {
    if (!sentence) {
      els.sentenceTitle.textContent = "No sentence available";
      els.sentenceKorean.textContent = "No sentence matches the selected filters.";
      els.sentenceKorean.hidden = false;
      els.sentenceCategory.textContent = "Empty";
      els.sentenceLevel.textContent = "N/A";
      return;
    }

    els.sentenceTitle.textContent = sentence.english;
    els.sentenceKorean.textContent = sentence.korean;
    els.sentenceKorean.hidden = !state.settings.showTranslation;
    els.sentenceCategory.textContent = sentence.category;
    els.sentenceLevel.textContent = sentence.level;
  }

  function updateDatasetLine() {
    const sourceLabel =
      state.datasetMeta.source === "remote" ? "Remote" : state.datasetMeta.source === "cached" ? "Cached" : "Local";
    const updatedLabel = state.datasetMeta.updatedAt
      ? new Date(state.datasetMeta.updatedAt).toLocaleDateString()
      : "unknown";
    els.datasetLine.textContent = `${sourceLabel} data · ${state.sentences.length} sentences · updated ${updatedLabel}`;
  }

  function updateCounts() {
    els.dailyCount.textContent = String(state.daily.uniqueCount);
    els.reviewCount.textContent = String(state.reviewIds.length);
  }

  async function persistDaily() {
    await storageSet({ [STORAGE_KEYS.daily]: state.daily });
  }

  async function persistReviewIds() {
    await storageSet({ [STORAGE_KEYS.review]: state.reviewIds });
  }

  async function persistLastSentence() {
    if (!state.currentSentence) {
      return;
    }

    await storageSet({ [STORAGE_KEYS.lastSentence]: state.currentSentence });
  }

  async function persistView() {
    await storageSet({
      [STORAGE_KEYS.view]: {
        selectedCategory: state.settings.selectedCategory || "all",
        selectedLevel: state.settings.selectedLevel || "all",
        showTranslation: Boolean(state.settings.showTranslation),
        lastSentence: state.currentSentence || state.lastSentence || null
      }
    });
  }

  async function persistSettings() {
    await storageSet({ [STORAGE_KEYS.settings]: state.settings });
  }

  function renderCachedSentence() {
    const cachedSentence = state.daily.currentSentence || state.lastSentence;
    if (!cachedSentence || !matchesActiveFilters(cachedSentence)) {
      return false;
    }

    state.currentSentence = cachedSentence;
    renderSentence(cachedSentence);
    setStatus("");
    return true;
  }

  function updateSentenceCard() {
    updateCounts();
    buildFilteredSentences();
    const sentence = chooseSentence();
    state.currentSentence = sentence;
    if (sentence) {
      recordSeen(sentence);
      renderSentence(sentence);
      state.daily.currentSentence = sentence;
      state.lastSentence = sentence;
    } else {
      renderSentence(null);
    }
    void persistDaily();
    void persistLastSentence();
    void persistView();
    if (sentence) {
      setStatus("");
    } else {
      setStatus("No sentence available.", "warning");
    }
  }

  function getCurrentVoice() {
    if (!window.speechSynthesis) {
      return null;
    }
    const voices = window.speechSynthesis.getVoices();
    return voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith("en")) || voices[0] || null;
  }

  function speak() {
    if (!window.speechSynthesis || !state.currentSentence) {
      setStatus("Speech is not available in this browser.", "warning");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(state.currentSentence.english);
    utterance.rate = 0.95;
    utterance.lang = "en-US";
    const voice = getCurrentVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-US";
    }
    window.speechSynthesis.speak(utterance);
    setStatus("Playing pronunciation...", "success");
  }

  async function toggleReview() {
    if (!state.currentSentence) {
      return;
    }

    const index = state.reviewIds.indexOf(state.currentSentence.id);
    if (index >= 0) {
      state.reviewIds.splice(index, 1);
      setStatus("Removed from review queue.", "success");
    } else {
      state.reviewIds.unshift(state.currentSentence.id);
      setStatus("Added to review queue.", "success");
    }

    await persistReviewIds();
    updateCounts();
  }

  async function toggleTranslation() {
    state.settings.showTranslation = !state.settings.showTranslation;
    await persistSettings();
    await persistView();
    renderSentence(state.currentSentence);
    const button = document.querySelector('[data-action="translation"]');
    button.textContent = state.settings.showTranslation ? "Hide translation" : "Show translation";
  }

  async function changeFilter(kind, value) {
    state.settings[kind] = value;
    await persistSettings();
    await persistView();
    buildFilteredSentences();
    updateSentenceCard();
  }

  function attachEvents() {
    document.body.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }

      const action = button.dataset.action;
      if (action === "next") {
        updateSentenceCard();
      } else if (action === "speak") {
        speak();
      } else if (action === "review") {
        await toggleReview();
      } else if (action === "translation") {
        await toggleTranslation();
      }
    });

    els.categoryFilter.addEventListener("change", async (event) => {
      await changeFilter("selectedCategory", event.target.value);
    });

    els.levelFilter.addEventListener("change", async (event) => {
      await changeFilter("selectedLevel", event.target.value);
    });
  }

  async function requestLatestDataset() {
    if (!window.chrome?.runtime?.sendMessage) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.syncDataset });
      if (!response?.updated) {
        return;
      }

      await loadDatasetState();
      refreshDatasetUi();
      setStatus("Loaded the latest sentence pack.", "success");
    } catch (error) {
      console.error("[Daily English Tab Popup] Remote refresh failed:", error);
    }
  }

  async function initialize() {
    try {
      forcePopupWidth();
      const datasetPromise = loadDatasetState();
      updateCounts();
      setLoading(true);
      setStatus("Loading latest sentences...");

      await loadBootstrapState();
      attachEvents();
      applyTheme();

      updateCounts();
      const showedCachedSentence = renderCachedSentence();
      setLoading(!showedCachedSentence);

      void datasetPromise
        .then(() => {
          refreshDatasetUi();
          setStatus("Synced automatically from GitHub.", "success");
          setLoading(false);
          void requestLatestDataset();
        })
        .catch((error) => {
          console.error("[Daily English Tab Popup] Dataset load failed:", error);
          setStatus("Using the cached sentence pack.", "warning");
          setLoading(false);
        });

      if (window.speechSynthesis) {
        window.speechSynthesis.addEventListener?.("voiceschanged", () => {});
      }
    } catch (error) {
      console.error("[Daily English Tab Popup]", error);
      setStatus(error instanceof Error ? error.message : "Could not load the popup.", "warning");
    }
  }

  initialize();
})();

