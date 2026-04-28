/* Behavioral Finance Modular Deck Controller
   ------------------------------------------------------------
   Funktionen:
   - Lädt Topics aus topics/manifest.js
   - Baut Kapitel-Navigation automatisch aus data-chapter-start
   - Baut Slide-Dropdown automatisch aus allen <section>-Slides
   - Pfeiltasten, Buttons, Hash-Links, Suche
   - Klick auf linkes Slide-Drittel = zurück, rechtes Slide-Drittel = weiter
*/

(function () {
    "use strict";

    const TOPIC_MANIFEST = window.BEHAVIORAL_FINANCE_TOPICS || [];

    const state = {
        slides: [],
        current: 0,
        searchIndex: 0,
        initialized: false
    };

    const els = {};

    document.addEventListener("DOMContentLoaded", boot);

    async function boot() {
        cacheElements();

        if (!els.stage) return;

        await loadTopicsFromManifest();

        state.slides = Array.from(els.stage.querySelectorAll("section"));
        normalizeSlides();

        bindEvents();
        buildSelect();
        buildTabs();
        setScale();

        const hashId = decodeURIComponent(location.hash.replace(/^#/, ""));
        const startIndex = hashId ? state.slides.findIndex(slide => slide.id === hashId) : 0;
        goTo(startIndex >= 0 ? startIndex : 0, true);

        state.initialized = true;
    }

    function cacheElements() {
        els.stage = document.querySelector("deck-stage");
        els.tabs = document.querySelector(".deck-tabs");
        els.select = document.querySelector("#deck-slide-select");
        els.prevBtn = document.querySelector("[data-deck-prev]");
        els.nextBtn = document.querySelector("[data-deck-next]");
        els.counter = document.querySelector(".deck-counter");
        els.progress = document.querySelector(".deck-progress span");
        els.search = document.querySelector(".deck-search");
        els.searchInput = document.querySelector("#deck-search-input");
        els.searchList = document.querySelector(".deck-search-list");
    }

    async function loadTopicsFromManifest() {
        if (!Array.isArray(TOPIC_MANIFEST) || TOPIC_MANIFEST.length === 0) return;

        for (const topic of TOPIC_MANIFEST) {
            try {
                const response = await fetch(topic.file, { cache: "no-cache" });
                if (!response.ok) {
                    throw new Error(`${response.status} ${response.statusText}`);
                }
                const source = await response.text();
                appendTopicSections(source, topic);
            } catch (error) {
                appendLoadErrorSlide(topic, error);
            }
        }
    }

    function appendTopicSections(source, topic) {
        const doc = new DOMParser().parseFromString(source, "text/html");
        let sections = Array.from(doc.querySelectorAll("deck-stage > section"));

        if (sections.length === 0) {
            sections = Array.from(doc.body.querySelectorAll(":scope > section"));
        }

        if (sections.length === 0) {
            sections = Array.from(doc.querySelectorAll("section"));
        }

        sections.forEach((sourceSection, index) => {
            const section = document.importNode(sourceSection, true);
            const slideNumber = String(index + 1).padStart(2, "0");

            section.classList.add("module-slide");
            section.dataset.module = section.dataset.module || "behavioral-finance";
            section.dataset.chapterKey = section.dataset.chapterKey || topic.id;
            section.dataset.chapterTitle = section.dataset.chapterTitle || topic.title || topic.id;
            section.dataset.chapterShort = section.dataset.chapterShort || topic.short || topic.id;
            section.dataset.slideIndex = section.dataset.slideIndex || String(index + 1);
            section.dataset.slideTotal = section.dataset.slideTotal || String(sections.length);

            if (index === 0) {
                section.dataset.chapterStart = "true";
            }

            if (!section.id) {
                section.id = `${topic.id}-slide-${slideNumber}`;
            }

            els.stage.appendChild(section);
        });
    }

    function appendLoadErrorSlide(topic, error) {
        const section = document.createElement("section");
        section.className = "module-slide";
        section.id = `${topic.id || "topic"}-load-error`;
        section.dataset.module = "behavioral-finance";
        section.dataset.chapterKey = topic.id || "load-error";
        section.dataset.chapterTitle = topic.title || "Topic konnte nicht geladen werden";
        section.dataset.chapterShort = topic.short || "Fehler";
        section.dataset.chapterStart = "true";

        section.innerHTML = `
            <div class="chrome-top"><span>Behavioral Finance</span><span>Load Error</span></div>
            <div class="content-head">
                <div class="eyebrow">Topic konnte nicht geladen werden</div>
                <h2 class="title-md" style="margin-top:18px;">${escapeHtml(topic.title || topic.file || "Unbekanntes Topic")}</h2>
            </div>
            <div class="content-body">
                <div class="deck-load-error">
                    <h2>Datei nicht erreichbar</h2>
                    <p><strong>Pfad:</strong> ${escapeHtml(topic.file || "")}</p>
                    <p><strong>Fehler:</strong> ${escapeHtml(error.message || String(error))}</p>
                    <p>Hinweis: Die modulare Version funktioniert zuverlässig über GitHub Pages oder einen lokalen Server. Beim direkten Öffnen per <code>file://</code> blockieren manche Browser das Nachladen von Dateien.</p>
                </div>
            </div>
            <div class="chrome-bot"><span>Modularer Loader</span><span>Bitte Pfad prüfen</span></div>
        `;
        els.stage.appendChild(section);
    }

    function normalizeSlides() {
        const usedIds = new Set();

        state.slides.forEach((slide, index) => {
            slide.classList.add("module-slide");

            if (!slide.id) {
                slide.id = `slide-${String(index + 1).padStart(2, "0")}`;
            }

            let baseId = slide.id;
            let uniqueId = baseId;
            let n = 2;

            while (usedIds.has(uniqueId)) {
                uniqueId = `${baseId}-${n}`;
                n += 1;
            }

            slide.id = uniqueId;
            usedIds.add(uniqueId);

            if (!slide.dataset.chapterKey) {
                slide.dataset.chapterKey = index === 0 ? "module-overview" : "unassigned";
            }

            if (!slide.dataset.chapterTitle) {
                slide.dataset.chapterTitle = index === 0 ? "Übersicht" : slide.dataset.chapterKey;
            }

            if (!slide.dataset.chapterShort) {
                slide.dataset.chapterShort = index === 0 ? "Übersicht" : slide.dataset.chapterTitle;
            }

            if (index === 0 && !slide.dataset.chapterStart) {
                slide.dataset.chapterStart = "true";
            }
        });
    }

    function bindEvents() {
        els.select?.addEventListener("change", () => goTo(Number(els.select.value)));
        els.prevBtn?.addEventListener("click", () => goTo(state.current - 1));
        els.nextBtn?.addEventListener("click", () => goTo(state.current + 1));
        document.querySelector("[data-search-open]")?.addEventListener("click", openSearch);

        document.addEventListener("click", event => {
            const target = event.target.closest("[data-goto]");
            if (!target) return;

            const id = target.dataset.goto;
            const idx = state.slides.findIndex(slide => slide.id === id);
            if (idx >= 0) goTo(idx);
        });

        // Slide-click navigation:
        // left third = previous slide, right third = next slide.
        // The center stays neutral so accidental taps do not always navigate.
        els.stage.addEventListener("click", event => {
            if (!state.initialized) return;
            if (isInteractiveTarget(event.target)) return;
            if (els.search?.classList.contains("is-open")) return;

            const active = state.slides[state.current];
            if (!active || !active.contains(event.target)) return;

            const rect = active.getBoundingClientRect();
            const x = event.clientX - rect.left;

            if (x < rect.width * 0.34) {
                goTo(state.current - 1);
            } else if (x > rect.width * 0.66) {
                goTo(state.current + 1);
            }
        });

        document.addEventListener("keydown", event => {
            const tag = (event.target.tagName || "").toLowerCase();
            const isTyping = tag === "input" || tag === "textarea" || tag === "select";

            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                openSearch();
                return;
            }

            if (event.key === "Escape") {
                closeSearch();
                return;
            }

            if (els.search?.classList.contains("is-open")) {
                handleSearchKeys(event);
                return;
            }

            if (isTyping) return;

            if (["ArrowRight", "PageDown", " "].includes(event.key)) {
                event.preventDefault();
                goTo(state.current + 1);
            }

            if (["ArrowLeft", "PageUp", "Backspace"].includes(event.key)) {
                event.preventDefault();
                goTo(state.current - 1);
            }

            if (event.key === "Home") goTo(0);
            if (event.key === "End") goTo(state.slides.length - 1);
        });

        els.searchInput?.addEventListener("input", () => renderSearch(els.searchInput.value));

        els.search?.addEventListener("click", event => {
            if (event.target === els.search) closeSearch();
        });

        window.addEventListener("resize", setScale);

        window.addEventListener("hashchange", () => {
            const id = decodeURIComponent(location.hash.replace(/^#/, ""));
            if (id) goById(id);
        });
    }

    function isInteractiveTarget(target) {
        return Boolean(target.closest([
            ".deck-ui",
            ".deck-search",
            "button",
            "a",
            "input",
            "select",
            "textarea",
            "label",
            "[role='button']",
            "[data-goto]",
            "[data-no-slide-click]"
        ].join(",")));
    }

    function slideTitle(slide, index) {
        const label = slide.dataset.slideLabel || slide.dataset.screenLabel;
        const h = slide.querySelector("h1, h2, .card-title, .big-title");
        const chapter = slide.dataset.chapterShort || "";
        const base = label || (h ? h.textContent.trim().replace(/\s+/g, " ") : `Slide ${index + 1}`);
        return `${String(index + 1).padStart(2, "0")} · ${chapter} · ${base}`;
    }

    function buildSelect() {
        if (!els.select) return;

        els.select.innerHTML = "";
        state.slides.forEach((slide, i) => {
            const opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = slideTitle(slide, i);
            els.select.appendChild(opt);
        });
    }

    function buildTabs() {
        if (!els.tabs) return;

        const chapterStarts = state.slides
            .map((slide, i) => ({ slide, i }))
            .filter(x => x.slide.dataset.chapterStart === "true");

        els.tabs.innerHTML = "";

        chapterStarts.forEach(({ slide, i }) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.dataset.index = String(i);
            btn.textContent = slide.dataset.chapterShort || slide.dataset.chapterTitle || `Kapitel ${i + 1}`;
            btn.addEventListener("click", () => goTo(i));
            els.tabs.appendChild(btn);
        });
    }

    function setScale() {
        const availableW = window.innerWidth;
        const availableH = window.innerHeight - 88;
        const scale = Math.min(availableW / 1920, availableH / 1080, 1);
        document.documentElement.style.setProperty("--stage-scale", String(scale));
    }

    function activeChapterKey() {
        return state.slides[state.current]?.dataset.chapterKey || "";
    }

    function updateTabs() {
        const key = activeChapterKey();

        document.querySelectorAll(".deck-tabs button").forEach(btn => {
            const slide = state.slides[Number(btn.dataset.index)];
            btn.classList.toggle("is-active", slide && slide.dataset.chapterKey === key);
        });
    }

    function goTo(index, replaceHash = false) {
        if (Number.isNaN(index)) return;

        state.current = Math.max(0, Math.min(index, state.slides.length - 1));

        state.slides.forEach((slide, i) => slide.classList.toggle("is-active", i === state.current));

        if (els.select) els.select.value = String(state.current);
        if (els.counter) els.counter.textContent = `${state.current + 1} / ${state.slides.length}`;
        if (els.progress) els.progress.style.width = `${((state.current + 1) / state.slides.length) * 100}%`;

        updateTabs();

        const id = state.slides[state.current]?.id;

        if (id) {
            const url = `${location.pathname}${location.search}#${id}`;
            if (replaceHash) history.replaceState(null, "", url);
            else history.pushState(null, "", url);
        }
    }

    function goById(id) {
        const idx = state.slides.findIndex(slide => slide.id === id);
        if (idx >= 0) goTo(idx, true);
    }

    function openSearch() {
        if (!els.search || !els.searchInput) return;

        renderSearch("");
        els.search.classList.add("is-open");
        els.search.setAttribute("aria-hidden", "false");
        els.searchInput.value = "";
        els.searchInput.focus();
    }

    function closeSearch() {
        if (!els.search) return;

        els.search.classList.remove("is-open");
        els.search.setAttribute("aria-hidden", "true");
    }

    function searchData() {
        return state.slides.map((slide, i) => ({
            i,
            title: slideTitle(slide, i),
            chapter: slide.dataset.chapterTitle || "",
            label: slide.dataset.slideLabel || "",
            text: (slide.textContent || "").replace(/\s+/g, " ").trim()
        }));
    }

    function renderSearch(query) {
        if (!els.searchList) return;

        const q = query.trim().toLowerCase();
        const data = searchData();
        const results = data
            .filter(item => !q || `${item.title} ${item.chapter} ${item.text}`.toLowerCase().includes(q))
            .slice(0, 40);

        state.searchIndex = 0;
        els.searchList.innerHTML = "";

        results.forEach((item, pos) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `deck-search-item${pos === state.searchIndex ? " is-selected" : ""}`;
            btn.innerHTML = `
                <span class="num">${String(item.i + 1).padStart(2, "0")}</span>
                <span>
                    <span class="title">${escapeHtml(item.title)}</span>
                    <span class="chapter">${escapeHtml(item.chapter)}</span>
                </span>`;

            btn.addEventListener("click", () => {
                closeSearch();
                goTo(item.i);
            });

            els.searchList.appendChild(btn);
        });
    }

    function handleSearchKeys(event) {
        const items = Array.from(els.searchList?.querySelectorAll(".deck-search-item") || []);

        if (event.key === "ArrowDown") {
            event.preventDefault();
            state.searchIndex = Math.min(state.searchIndex + 1, items.length - 1);
            updateSearchSelection(items);
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            state.searchIndex = Math.max(state.searchIndex - 1, 0);
            updateSearchSelection(items);
        }

        if (event.key === "Enter") {
            event.preventDefault();
            items[state.searchIndex]?.click();
        }
    }

    function updateSearchSelection(items) {
        items.forEach((x, i) => x.classList.toggle("is-selected", i === state.searchIndex));
        items[state.searchIndex]?.scrollIntoView({ block: "nearest" });
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#039;"
        }[c]));
    }
})();
