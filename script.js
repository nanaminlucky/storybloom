const utils = window.StoryBloomUtils;

const selectedGenres = utils.getStoredArray("genres");
const cards = document.querySelectorAll(".card");
const nextButton = document.querySelector("#nextButton");
const customIdea = document.querySelector("#customIdea");
const storyLogline = document.querySelector("#storyLogline");
const storyGoal = document.querySelector("#storyGoal");
const storyObstacle = document.querySelector("#storyObstacle");
const storyTurn = document.querySelector("#storyTurn");
const storyEnding = document.querySelector("#storyEnding");

function getCardText(card) {
    return card.querySelector("span")?.textContent?.trim();
}

function restoreSelections() {
    if (customIdea) {
        const savedIdea = utils.getStoredText(
            "customIdea",
            utils.getStoredText("idea", "")
        );

        customIdea.value = savedIdea;
    }

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

    utils.setSelectedCards(cards, selectedGenres);
}

cards.forEach((card) => {
    card.addEventListener("click", () => {
        const genre = getCardText(card);

        if (!genre) {
            return;
        }

        const nextSelections = utils.toggleCardSelection(selectedGenres, card, genre);
        selectedGenres.splice(0, selectedGenres.length, ...nextSelections);
    });
});

nextButton.addEventListener("click", () => {
    const ideaValue = customIdea ? customIdea.value.trim() : "";

    if (selectedGenres.length === 0 && ideaValue === "") {
        alert("お話のジャンルを1つ以上選ぶか、自由なアイデアを書いてね");
        return;
    }

    utils.saveArrayToStorage("genres", selectedGenres);
    utils.saveTextToStorage("customIdea", ideaValue);
    utils.saveTextToStorage("idea", ideaValue);

    const returnTarget = localStorage.getItem("storyEditReturn");
    window.location.href = returnTarget || "character.html";
    localStorage.removeItem("storyEditReturn");
});

restoreSelections();