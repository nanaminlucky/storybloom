const utils = window.StoryBloomUtils;

const genres = utils.getStoredArray("genres");
const customIdea = utils.getStoredText("customIdea", utils.getStoredText("idea", ""));

const worlds = utils.getStoredArray("worlds");
const worldIdea = utils.getStoredText("worldIdea", utils.getStoredText("customWorld", ""));

const characters = utils.getStoredArray("characters");
const characterIdea = utils.getStoredText("characterIdea", "");

const elements = utils.getStoredArray("elements");
const elementIdea = utils.getStoredText("elementIdea", "");

const moods = utils.getStoredArray("moods");
const moodIdea = utils.getStoredText("moodIdea", "");

const styleList = utils.getStoredArray("style");
const styleIdea = utils.getStoredText("styleIdea", "").trim();

function makeText(list, customText) {
    const chips = [];

    list.forEach((item) => {
        if (item && item.trim() !== "") {
            chips.push(`<span class="summary-chip">${item.trim()}</span>`);
        }
    });

    if (customText.trim() !== "") {
        chips.push(`<span class="summary-chip">${customText.trim()}</span>`);
    }

    if (chips.length === 0) {
        return '<span class="summary-empty">まだ決まっていません</span>';
    }

    return chips.join("");
}

function setSummaryText(elementId, value) {
    const element = document.querySelector(elementId);
    element.innerHTML = value;
    element.className = "summary-value";
}

setSummaryText("#summaryGenre", makeText(genres, customIdea));

const storyLogline = utils.getStoredText("storyLogline", "");
const storyGoal = utils.getStoredText("storyGoal", "");
const storyObstacle = utils.getStoredText("storyObstacle", "");
const storyTurn = utils.getStoredText("storyTurn", "");
const storyEnding = utils.getStoredText("storyEnding", "");

const summaryStoryLoglineElement = document.querySelector("#summaryStoryLogline");
const summaryStoryPlotElement = document.querySelector("#summaryStoryPlot");

const storyPlotParts = [
    storyGoal ? `目標: ${storyGoal}` : "",
    storyObstacle ? `障害: ${storyObstacle}` : "",
    storyTurn ? `転機: ${storyTurn}` : "",
    storyEnding ? `結末: ${storyEnding}` : ""
].filter(Boolean);

if (summaryStoryLoglineElement) {
    summaryStoryLoglineElement.innerHTML = storyLogline
        ? `<span class="summary-chip">${storyLogline}</span>`
        : '<span class="summary-empty">まだ決まっていません</span>';
    summaryStoryLoglineElement.className = "summary-value";
}

if (summaryStoryPlotElement) {
    summaryStoryPlotElement.innerHTML = storyPlotParts.length > 0
        ? storyPlotParts.map((part) => `<span class="summary-chip">${part}</span>`).join("")
        : "";
    summaryStoryPlotElement.className = "summary-value";
    summaryStoryPlotElement.style.display = storyPlotParts.length > 0 ? "flex" : "none";
}

setSummaryText("#summaryWorld", makeText(worlds, worldIdea));
setSummaryText("#summaryCharacter", makeText(characters, characterIdea));
setSummaryText("#summaryElements", makeText(elements, elementIdea));
setSummaryText("#summaryMood", makeText(moods, moodIdea));

const summaryStyleElement = document.querySelector("#summaryStyle");
const summaryStyleIdeaElement = document.querySelector("#summaryStyleIdea");

summaryStyleElement.innerHTML =
    styleList.length > 0
        ? styleList.map((item) => `<span class="summary-chip">${item}</span>`).join("")
        : '<span class="summary-empty">まだ決まっていません</span>';
summaryStyleElement.className = "summary-value";

summaryStyleIdeaElement.innerHTML = styleIdea
    ? `<span class="summary-chip">${styleIdea}</span>`
    : "";
summaryStyleIdeaElement.className = "summary-value";
summaryStyleIdeaElement.style.display = styleIdea ? "flex" : "none";

const createButton = document.querySelector("#createButton");
const progressBar = document.querySelector("#generationProgressBar");
const progressLabel = document.querySelector("#generationProgressLabel");
const editButtons = document.querySelectorAll(".edit-button");

function setGenerationProgress(percent, label) {
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
    if (progressLabel) {
        progressLabel.textContent = label;
    }
    if (createButton) {
        createButton.textContent = `生成中… ${Math.round(percent)}%`;
    }
}

createButton.addEventListener("click", async () => {
    const storyFormat = styleList.includes("詩")
        ? "poem"
        : styleList.includes("小説")
            ? "novel"
            : "storybook";

    const payload = {
        genres,
        customIdea,
        worlds,
        worldIdea,
        characters,
        characterIdea,
        elements,
        elementIdea,
        moods,
        moodIdea,
        styleList,
        styleIdea,
        storyFormat
    };

    createButton.disabled = true;
    let generationSucceeded = false;
    const progressPlan = utils.createGenerationProgressPlan();
    const stages = [
        "設定を整理中",
        "物語の構成を考えているよ",
        "登場人物の気持ちを整えているよ",
        "文章を整えているよ",
        "ひとつにまとめているよ",
        "最後の仕上げをしているよ"
    ];

    let progressIndex = 0;
    setGenerationProgress(progressPlan[0], "準備中");
    const progressTimer = setInterval(() => {
        progressIndex += 1;
        if (progressIndex >= progressPlan.length) {
            progressIndex = progressPlan.length - 1;
        }

        const progress = progressPlan[progressIndex];
        const stageIndex = Math.min(progressIndex, stages.length - 1);
        setGenerationProgress(progress, stages[stageIndex]);
    }, 260);

    try {
        const response = await fetch("/generate-story", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json().catch(() => null);

        if (!response.ok) {
            const serverMessage = responseData?.error || responseData?.detail || `生成に失敗しました (${response.status})`;
            throw new Error(serverMessage);
        }

        const data = responseData;

        if (!data.story || !data.storyId) {
            const serverMessage = data.error || data.detail || "生成されたストーリーが取得できませんでした。";
            throw new Error(serverMessage);
        }

        localStorage.setItem("generatedStoryId", data.storyId);
        generationSucceeded = true;
        clearInterval(progressTimer);
        setGenerationProgress(100, "完了");
        setTimeout(() => {
            window.location.href = "story.html";
        }, 180);
    } catch (error) {
        console.error(error);
        alert(error?.message || "物語の生成中に問題が発生しました。サーバーを起動しているか確認してください。");
        clearInterval(progressTimer);
        setGenerationProgress(0, "待機中");
        createButton.disabled = false;
        createButton.textContent = "✨ 物語をつくる";
    } finally {
        if (!generationSucceeded) {
            clearInterval(progressTimer);
        }
    }
});

editButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const page = button.dataset.page;

        if (page) {
            localStorage.setItem("storyEditReturn", "confirm.html");
            window.location.href = page;
        }
    });
});