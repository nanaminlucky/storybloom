const utils = window.StoryBloomUtils;

const storyLogline = document.querySelector("#storyLogline");
const storyGoal = document.querySelector("#storyGoal");
const storyObstacle = document.querySelector("#storyObstacle");
const storyTurn = document.querySelector("#storyTurn");
const storyEnding = document.querySelector("#storyEnding");
const plotNext = document.querySelector("#plotNext");
const generateLoglineButton = document.querySelector("#generateLoglineButton");
const choiceButtons = document.querySelectorAll(".prompt-choice");

function setInputValue(field, value) {
    if (!field) {
        return;
    }

    field.value = value;
    field.focus();
}

function bindChoiceButtons() {
    choiceButtons.forEach((button) => {
        const targetId = button.dataset.fillFor;
        const targetField = targetId ? document.querySelector(`#${targetId}`) : null;

        button.addEventListener("click", () => {
            const value = button.textContent.trim();
            setInputValue(targetField, value);
        });
    });
}

function restorePlot() {
    if (storyLogline) {
        storyLogline.value = utils.getStoredText("storyLogline", "");
    }
    if (storyGoal) {
        storyGoal.value = utils.getStoredText("storyGoal", "");
    }
    if (storyObstacle) {
        storyObstacle.value = utils.getStoredText("storyObstacle", "");
    }
    if (storyTurn) {
        storyTurn.value = utils.getStoredText("storyTurn", "");
    }
    if (storyEnding) {
        storyEnding.value = utils.getStoredText("storyEnding", "");
    }
}

async function generateLoglineFromInputs() {
    if (!generateLoglineButton || !storyLogline) {
        return;
    }

    const payload = {
        characters: utils.getStoredArray("characters"),
        characterIdea: utils.getStoredText("characterIdea", ""),
        worlds: utils.getStoredArray("worlds"),
        worldIdea: utils.getStoredText("worldIdea", ""),
        customIdea: utils.getStoredText("customIdea", ""),
        storyGoal: storyGoal ? storyGoal.value.trim() : "",
        storyObstacle: storyObstacle ? storyObstacle.value.trim() : "",
        storyTurn: storyTurn ? storyTurn.value.trim() : "",
        storyEnding: storyEnding ? storyEnding.value.trim() : ""
    };

    const hasContent = Object.values(payload).some((value) => typeof value === "string" ? value.trim() !== "" : Array.isArray(value) ? value.length > 0 : Boolean(value));
    if (!hasContent) {
        alert("目標や障害、転機、結末のどれかを先に入れてね");
        return;
    }

    generateLoglineButton.disabled = true;
    generateLoglineButton.textContent = "生成中...";

    try {
        const response = await fetch("/generate-logline", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await utils.parseJsonResponse(response, "ログラインの生成に失敗しました。");
        if (!response.ok) {
            throw new Error(data?.detail || data?.error || "ログラインの生成に失敗しました");
        }

        if (data.logline) {
            storyLogline.value = data.logline.trim();
            utils.saveTextToStorage("storyLogline", data.logline.trim());
            storyLogline.focus();
        }
    } catch (error) {
        console.error(error);
        alert(error?.message || "ログラインの生成に失敗しました");
    } finally {
        generateLoglineButton.disabled = false;
        generateLoglineButton.textContent = "AIでログラインを作る";
    }
}

if (generateLoglineButton) {
    generateLoglineButton.addEventListener("click", generateLoglineFromInputs);
}

if (plotNext) {
    plotNext.addEventListener("click", () => {
        const loglineValue = storyLogline ? storyLogline.value.trim() : "";
        const goalValue = storyGoal ? storyGoal.value.trim() : "";
        const obstacleValue = storyObstacle ? storyObstacle.value.trim() : "";
        const turnValue = storyTurn ? storyTurn.value.trim() : "";
        const endingValue = storyEnding ? storyEnding.value.trim() : "";

        if (!loglineValue && !goalValue && !obstacleValue && !turnValue && !endingValue) {
            alert("ログラインか、目標・障害・転機・結末のどれかを入れてね");
            return;
        }

        utils.saveTextToStorage("storyLogline", loglineValue);
        utils.saveTextToStorage("storyGoal", goalValue);
        utils.saveTextToStorage("storyObstacle", obstacleValue);
        utils.saveTextToStorage("storyTurn", turnValue);
        utils.saveTextToStorage("storyEnding", endingValue);

        const returnTarget = localStorage.getItem("storyEditReturn");
        window.location.href = returnTarget || "style.html";
        localStorage.removeItem("storyEditReturn");
    });
}

bindChoiceButtons();
restorePlot();
