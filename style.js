const utils = window.StoryBloomUtils;

const selectedStyles = utils.getStoredArray("style");
const styleCards = document.querySelectorAll(".card");
const styleNext = document.querySelector("#styleNext");
const styleIdea = document.querySelector("#styleIdea");

function getCardText(card) {
    return card.querySelector("span")?.textContent?.trim();
}

function restoreSelections() {
    if (styleIdea) {
        const savedIdea = utils.getStoredText("styleIdea", "");
        styleIdea.value = savedIdea;
    }

    const normalized = utils.normalizeStyleSelection(selectedStyles);
    selectedStyles.splice(0, selectedStyles.length, ...normalized);
    utils.setSelectedCards(styleCards, selectedStyles);
}

styleCards.forEach((card) => {
    card.addEventListener("click", () => {
        const style = getCardText(card);

        if (!style) {
            return;
        }

        const nextSelections = utils.toggleCardSelection(selectedStyles, card, style);
        selectedStyles.splice(0, selectedStyles.length, ...nextSelections);
    });
});

styleNext.addEventListener("click", () => {
    const idea = styleIdea ? styleIdea.value.trim() : "";

    utils.saveArrayToStorage("style", selectedStyles);
    utils.saveTextToStorage("styleIdea", idea);

    const returnTarget = localStorage.getItem("storyEditReturn");
    window.location.href = returnTarget || "mood.html";
    localStorage.removeItem("storyEditReturn");
});

restoreSelections();