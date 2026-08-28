(function (global) {
    function getStorage() {
        return global.localStorage || null;
    }

    function getStoredArray(key, fallback = []) {
        const storage = getStorage();

        if (!storage) {
            return Array.isArray(fallback) ? [...fallback] : [];
        }

        const rawValue = storage.getItem(key);

        if (!rawValue) {
            return Array.isArray(fallback) ? [...fallback] : [];
        }

        try {
            const parsedValue = JSON.parse(rawValue);
            let values = [];

            if (Array.isArray(parsedValue)) {
                values = parsedValue;
            } else if (typeof parsedValue === "string") {
                values = [parsedValue];
            }

            if (key === "style") {
                const normalized = normalizeStyleSelection(values);
                if (JSON.stringify(normalized) !== JSON.stringify(values)) {
                    storage.setItem(key, JSON.stringify(normalized));
                }
                return normalized;
            }

            return values;
        } catch (error) {
            return Array.isArray(fallback) ? [...fallback] : [];
        }
    }

    function getStoredText(key, fallback = "") {
        const storage = getStorage();

        if (!storage) {
            return fallback;
        }

        const rawValue = storage.getItem(key);
        return rawValue == null ? fallback : rawValue;
    }

    function saveArrayToStorage(key, values) {
        const storage = getStorage();

        if (!storage) {
            return;
        }

        storage.setItem(key, JSON.stringify(values));
    }

    function saveTextToStorage(key, value) {
        const storage = getStorage();

        if (!storage) {
            return;
        }

        storage.setItem(key, value);
    }

    function setSelectedCards(cards, selectedValues) {
        cards.forEach((card) => {
            const value = card.querySelector("span")?.textContent?.trim();

            if (value && selectedValues.includes(value)) {
                card.classList.add("selected");
            } else {
                card.classList.remove("selected");
            }
        });
    }

    function normalizeStyleSelection(selectedValues) {
        const formatValues = ["小説", "絵本", "詩"];
        const values = Array.isArray(selectedValues) ? selectedValues : [];
        const formattedValues = values.filter((item) => !formatValues.includes(item));

        const activeFormat = values.filter((item) => formatValues.includes(item)).slice(-1)[0];
        if (activeFormat) {
            formattedValues.unshift(activeFormat);
        }

        return formattedValues;
    }

    function toggleCardSelection(selectedValues, card, value) {
        const values = Array.isArray(selectedValues) ? selectedValues : [];
        const formatValues = ["小説", "絵本", "詩"];

        if (formatValues.includes(value)) {
            const withoutCurrentFormat = values.filter((item) => !formatValues.includes(item));
            const nextValues = values.includes(value)
                ? withoutCurrentFormat
                : [...withoutCurrentFormat, value];

            card.classList.toggle("selected", nextValues.includes(value));
            return normalizeStyleSelection(nextValues);
        }

        const nextValues = values.includes(value)
            ? values.filter((item) => item !== value)
            : [...values, value];

        card.classList.toggle("selected", nextValues.includes(value));
        return nextValues;
    }

    function parseJsonResponse(response, fallbackMessage = "サーバーの応答を確認できませんでした。") {
        return response.text().then((text) => {
            const trimmed = text.trim();
            if (!trimmed) {
                throw new Error(fallbackMessage);
            }

            if (trimmed.startsWith("<") || trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
                throw new Error("バックエンドのAPIサーバーが起動していません。python3 story_generator.py を実行してから、ブラウザで再度お試しください。");
            }

            try {
                return JSON.parse(trimmed);
            } catch (error) {
                throw new Error(`JSON形式で応答を受け取れませんでした。${fallbackMessage}`);
            }
        });
    }

    function createGenerationProgressPlan() {
        return [8, 16, 24, 34, 44, 54, 64, 74, 84, 92, 96];
    }

    function resetStoryWizardState() {
        const keysToReset = [
            "genres", "idea", "customIdea",
            "worlds", "customWorld", "worldIdea",
            "characters", "characterIdea",
            "elements", "elementIdea",
            "moods", "moodIdea",
            "style", "styleIdea",
            "storyLogline", "storyGoal", "storyObstacle", "storyTurn", "storyEnding",
            "storyEditReturn", "generatedStoryId", "libraryStoryPreview"
        ];

        const storage = getStorage();
        if (!storage) {
            return;
        }

        keysToReset.forEach((key) => storage.removeItem(key));
    }

    function injectTopNavigation() {
        if (typeof document === "undefined") {
            return;
        }

        const startLinks = document.querySelectorAll('a[href="index.html"]');
        startLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                resetStoryWizardState();
                window.location.href = "index.html";
            });
        });

        const existing = document.getElementById("storyTopNav");
        if (existing) {
            return;
        }

        const header = document.createElement("header");
        header.id = "storyTopNav";
        header.className = "top-nav";
        header.innerHTML = `
            <nav class="top-nav-inner" aria-label="メインメニュー">
                <a href="index.html" class="nav-link">AIで物語をつくる</a>
                <a href="library.html" class="nav-link">ライブラリ</a>
            </nav>
        `;

        const newStartLink = header.querySelector('a[href="index.html"]');
        if (newStartLink) {
            newStartLink.addEventListener("click", (event) => {
                event.preventDefault();
                resetStoryWizardState();
                window.location.href = "index.html";
            });
        }

        const firstChild = document.body.firstChild;
        if (firstChild) {
            document.body.insertBefore(header, firstChild);
        } else {
            document.body.appendChild(header);
        }
    }

    const utils = {
        getStoredArray,
        getStoredText,
        saveArrayToStorage,
        saveTextToStorage,
        setSelectedCards,
        normalizeStyleSelection,
        toggleCardSelection,
        parseJsonResponse,
        createGenerationProgressPlan,
        resetStoryWizardState,
        injectTopNavigation
    };

    global.StoryBloomUtils = utils;

    if (typeof document !== "undefined" && document.body) {
        utils.injectTopNavigation();
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = utils;
    }
})(typeof window !== "undefined" ? window : globalThis);
