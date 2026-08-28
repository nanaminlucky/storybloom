const utils = window.StoryBloomUtils;

const selectedMoods = utils.getStoredArray("moods");
const moodCards = document.querySelectorAll(".card");
const moodNext = document.querySelector("#moodNext");
const moodIdea = document.querySelector("#moodIdea");

function getCardText(card) {
    return card.querySelector("span")?.textContent?.trim();
}

function restoreSelections() {
    if (moodIdea) {
        const savedMoodIdea = utils.getStoredText("moodIdea", "");
        moodIdea.value = savedMoodIdea;
    }

    utils.setSelectedCards(moodCards, selectedMoods);
}

moodCards.forEach((card) => {
    card.addEventListener("click", () => {
        const mood = getCardText(card);

        if (!mood) {
            return;
        }

        const nextSelections = utils.toggleCardSelection(selectedMoods, card, mood);
        selectedMoods.splice(0, selectedMoods.length, ...nextSelections);
    });
});

moodNext.addEventListener("click", () => {
    const ideaValue = moodIdea ? moodIdea.value.trim() : "";

    if (selectedMoods.length === 0 && ideaValue === "") {
        alert("どんな気持ちになるお話にしたいか、1つ選んでね");
        return;
    }

    utils.saveArrayToStorage("moods", selectedMoods);
    utils.saveTextToStorage("moodIdea", ideaValue);

    const returnTarget = localStorage.getItem("storyEditReturn");
    window.location.href = returnTarget || "confirm.html";
    localStorage.removeItem("storyEditReturn");
});

restoreSelections();
