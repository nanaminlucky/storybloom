const utils = window.StoryBloomUtils;

const selectedElements = utils.getStoredArray("elements");
const elementCards = document.querySelectorAll(".card");
const elementNext = document.querySelector("#elementNext");
const elementIdea = document.querySelector("#elementIdea");

function getCardText(card) {
    return card.querySelector("span")?.textContent?.trim();
}

function restoreSelections() {
    if (elementIdea) {
        const savedElementIdea = utils.getStoredText("elementIdea", "");
        elementIdea.value = savedElementIdea;
    }

    utils.setSelectedCards(elementCards, selectedElements);
}

elementCards.forEach((card) => {
    card.addEventListener("click", () => {
        const element = getCardText(card);

        if (!element) {
            return;
        }

        const nextSelections = utils.toggleCardSelection(selectedElements, card, element);
        selectedElements.splice(0, selectedElements.length, ...nextSelections);
    });
});

elementNext.addEventListener("click", () => {
    const ideaValue = elementIdea ? elementIdea.value.trim() : "";

    if (selectedElements.length === 0 && ideaValue === "") {
        alert("お話に入れたいものを1つ選ぶか、自由に書いてね");
        return;
    }

    utils.saveArrayToStorage("elements", selectedElements);
    utils.saveTextToStorage("elementIdea", ideaValue);

    const returnTarget = localStorage.getItem("storyEditReturn");
    window.location.href = returnTarget || "plot.html";
    localStorage.removeItem("storyEditReturn");
});

restoreSelections();