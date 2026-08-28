const utils = window.StoryBloomUtils;

function getStoryLibrary() {
    try {
        const raw = localStorage.getItem("storyLibrary");
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Could not read story library:", error);
        return [];
    }
}

function openSavedStory(entry) {
    if (!entry || !entry.story) {
        return;
    }

    localStorage.setItem("libraryStoryPreview", JSON.stringify(entry.story));
    window.location.href = "story.html";
}

function deleteSavedStory(index) {
    const library = getStoryLibrary();
    library.splice(index, 1);
    localStorage.setItem("storyLibrary", JSON.stringify(library.slice(0, 20)));
    renderLibrary();
}

function renderLibrary() {
    const container = document.querySelector("#libraryList");
    if (!container) {
        return;
    }

    const library = getStoryLibrary();

    if (library.length === 0) {
        container.innerHTML = '<div class="library-empty">まだ保存した物語はありません。<br>AIで物語を作って、ここに残してね。</div>';
        return;
    }

    container.innerHTML = library.map((entry, index) => `
        <article class="library-card">
            <h3>${entry.title || "タイトルなし"}</h3>
            <p>${entry.format || "storybook"} · ${entry.savedAt ? new Date(entry.savedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "保存済み"}</p>
            <p>${(entry.preview || "プレビューなし").slice(0, 120)}</p>
            <div class="library-card-actions">
                <button class="library-button" data-library-open="${index}">開く</button>
                <button class="delete-library-button" data-library-delete="${index}">削除</button>
            </div>
        </article>
    `).join("");

    container.querySelectorAll("[data-library-open]").forEach((button) => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.libraryOpen);
            const entry = library[index];
            openSavedStory(entry);
        });
    });

    container.querySelectorAll("[data-library-delete]").forEach((button) => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.libraryDelete);
            deleteSavedStory(index);
        });
    });
}

renderLibrary();
