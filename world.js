const utils = window.StoryBloomUtils;

const selectedWorlds = utils.getStoredArray("worlds");
const worldCards = document.querySelectorAll(".card");
const worldNext = document.querySelector("#worldNext");
const customWorld = document.querySelector("#customWorld");

function getCardText(card) {
    return card.querySelector("span")?.textContent?.trim();
}

function restoreSelections() {
    if (customWorld) {
        const savedWorldIdea = utils.getStoredText(
            "worldIdea",
            utils.getStoredText("customWorld", "")
        );

        customWorld.value = savedWorldIdea;
    }

    utils.setSelectedCards(worldCards, selectedWorlds);
}

worldCards.forEach((card) => {
    card.addEventListener("click", () => {
        const world = getCardText(card);

        if (!world) {
            return;
        }

        const nextSelections = utils.toggleCardSelection(selectedWorlds, card, world);
        selectedWorlds.splice(0, selectedWorlds.length, ...nextSelections);
    });
});

worldNext.addEventListener("click", () => {
    const worldIdeaValue = customWorld ? customWorld.value.trim() : "";

    if (selectedWorlds.length === 0 && worldIdeaValue === "") {
        alert("世界のイメージを選ぶか、自由に書いてね");
        return;
    }

    utils.saveArrayToStorage("worlds", selectedWorlds);
    utils.saveTextToStorage("worldIdea", worldIdeaValue);
    utils.saveTextToStorage("customWorld", worldIdeaValue);

    const returnTarget = localStorage.getItem("storyEditReturn");
    window.location.href = returnTarget || "elements.html";
    localStorage.removeItem("storyEditReturn");
});

restoreSelections();