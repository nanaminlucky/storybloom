const utils = window.StoryBloomUtils;

const selectedCharacters = utils.getStoredArray("characters");
const characterCards = document.querySelectorAll(".card");
const characterNext = document.querySelector("#characterNext");
const characterIdea = document.querySelector("#characterIdea");

function getCardText(card) {
    return card.querySelector("span")?.textContent?.trim();
}

function restoreSelections() {
    if (characterIdea) {
        const savedCharacterIdea = utils.getStoredText("characterIdea", "");
        characterIdea.value = savedCharacterIdea;
    }

    utils.setSelectedCards(characterCards, selectedCharacters);
}

characterCards.forEach((card) => {
    card.addEventListener("click", () => {
        const character = getCardText(card);

        if (!character) {
            return;
        }

        const nextSelections = utils.toggleCardSelection(selectedCharacters, card, character);
        selectedCharacters.splice(0, selectedCharacters.length, ...nextSelections);
    });
});

characterNext.addEventListener("click", () => {
    const ideaValue = characterIdea ? characterIdea.value.trim() : "";

    if (selectedCharacters.length === 0 && ideaValue === "") {
        alert("主人公のヒントを選ぶか、自由に書いてね");
        return;
    }

    utils.saveArrayToStorage("characters", selectedCharacters);
    utils.saveTextToStorage("characterIdea", ideaValue);

    const returnTarget = localStorage.getItem("storyEditReturn");
    window.location.href = returnTarget || "world.html";
    localStorage.removeItem("storyEditReturn");
});

restoreSelections();
