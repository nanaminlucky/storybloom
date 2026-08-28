// 今はテスト用の物語
let story = {
    title: "小さな猫と不思議な夜のぼうけん",
    format: "storybook",

    pages: [
        {
            imagePrompt: "夜の森でまばゆい月あかりの下、こねこのミミがゆっくり歩いている場面。森の木々と星がやさしく見える。",
            text: "ミミはある夜、きらきら光る森に足を踏み入れました。",
            layout: "center"
        },
        {
            imagePrompt: "小さな妖精のような光が木の枝の間から飛び出して、ミミが驚いている場面。",
            text: "森の中で、ちいさな光がミミの目の前にひらひらあらわれました。",
            layout: "left-image"
        },
        {
            imagePrompt: "空を見上げるミミの横に、ふわふわした雲と流れ星が一緒に浮かんでいる場面。",
            text: "ふしぎな光に導かれてミミは空を見上げると、流れ星がやさしく降りてきました。",
            layout: "right-image"
        },
        {
            imagePrompt: "昼間のようなやわらかな小道に戻り、ミミが安心して眠る前の微笑んでいる顔。",
            text: "夜の冒険を終えたミミは、あたたかい気持ちで家へ戻りました。",
            layout: "bottom"
        }
    ]
};

async function loadGeneratedStory() {
    // First, check URL params for a story id or page number.
    const params = new URLSearchParams(window.location.search);
    const urlStoryId = params.get("id");
    const urlPage = params.get("page");

    const libraryPreview = localStorage.getItem("libraryStoryPreview");
    if (libraryPreview) {
        try {
            const parsedStory = JSON.parse(libraryPreview);
            if (parsedStory && parsedStory.pages) {
                story = parsedStory;
                localStorage.removeItem("libraryStoryPreview");
                return;
            }
        } catch (error) {
            console.warn("Could not parse library preview story:", error);
            localStorage.removeItem("libraryStoryPreview");
        }
    }

    // If an id is provided in the URL, fetch that story from the server store.
    const storyId = urlStoryId || localStorage.getItem("generatedStoryId");
    if (!storyId) {
        return;
    }

    try {
        const response = await fetch(`/generated-story?id=${encodeURIComponent(storyId)}`);
        if (!response.ok) {
            console.warn("Failed to load generated story", response.status);
            return;
        }
        const data = await response.json();
        if (data.story) {
            story = data.story;

            // If the URL specifies a page, set it (URL pages are 1-based).
            if (urlPage) {
                const p = parseInt(urlPage, 10);
                if (!Number.isNaN(p) && p >= 1 && p <= story.pages.length) {
                    currentPage = p - 1;
                } else {
                    currentPage = 0;
                }
            }
        }
    } catch (error) {
        console.warn("Could not fetch generated story:", error);
    }
}

// Ensure we try to load a story (from URL or localStorage) and then show the page.
window.addEventListener("DOMContentLoaded", async () => {
    await loadGeneratedStory();
    showPage();
});

// 現在のページ
let currentPage = 0;


// HTMLの要素を取得
const titleElement = document.querySelector("#storyTitle");
const imageElement = document.querySelector("#storyImage");
const textElement = document.querySelector("#storyText");
const pageNumberElement = document.querySelector("#pageNumber");

const prevButton = document.querySelector("#prevPage");
const nextButton = document.querySelector("#nextPage");
const restartButton = document.querySelector("#restartButton");
const regenerateButton = document.querySelector("#regenerateButton");
const saveToLibraryButton = document.querySelector("#saveToLibraryButton");
const storyLibraryList = document.querySelector("#storyLibraryList");

function getStoredArray(key) {
    const raw = localStorage.getItem(key);
    if (!raw) {
        return [];
    }
    try {
        return JSON.parse(raw);
    } catch (error) {
        return [];
    }
}

function getStoredText(key, fallback = "") {
    const value = localStorage.getItem(key);
    if (value === null) {
        return fallback;
    }
    return value;
}

function renderText(text) {
    if (!text) {
        textElement.textContent = "";
        return;
    }

    const normalized = text.replace(/\n/g, "\n");
    if (story.format === "poem") {
        textElement.innerHTML = normalized
            .split(/\n/)
            .map((line) => `<p>${line || "&nbsp;"}</p>`)
            .join("");
        textElement.classList.add("poem-text");
        return;
    }

    textElement.classList.remove("poem-text");
    textElement.textContent = normalized;
}

function getStoryLibrary() {
    try {
        const raw = localStorage.getItem("storyLibrary");
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function saveCurrentStoryToLibrary() {
    const library = getStoryLibrary();
    const storyCopy = JSON.parse(JSON.stringify(story));
    const existingIndex = library.findIndex((item) => item.title === storyCopy.title && item.format === storyCopy.format && item.savedAt === item.savedAt);

    const entry = {
        title: storyCopy.title || "タイトルなし",
        format: storyCopy.format || "storybook",
        savedAt: new Date().toISOString(),
        preview: storyCopy.pages?.[0]?.text || "",
        story: storyCopy
    };

    if (existingIndex >= 0) {
        library.splice(existingIndex, 1, entry);
    } else {
        library.unshift(entry);
    }

    localStorage.setItem("storyLibrary", JSON.stringify(library.slice(0, 20)));
    renderLibrary();
    if (saveToLibraryButton) {
        saveToLibraryButton.textContent = "💾 保存しました";
        saveToLibraryButton.disabled = true;
        setTimeout(() => {
            saveToLibraryButton.textContent = "💾 この物語を保存する";
            saveToLibraryButton.disabled = false;
        }, 1200);
    }
}

function renderLibrary() {
    if (!storyLibraryList) {
        return;
    }

    const library = getStoryLibrary();
    if (library.length === 0) {
        storyLibraryList.innerHTML = '<div style="padding: 12px; background: #fffdf8; border-radius: 12px;">まだ保存した物語はありません。</div>';
        return;
    }

    storyLibraryList.innerHTML = library.map((entry, index) => `
        <div class="library-card" data-story-index="${index}">
            <h3>${entry.title}</h3>
            <p>${entry.format} · ${new Date(entry.savedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            <p>${entry.preview.slice(0, 50) || "プレビューなし"}</p>
            <div class="library-card-actions">
                <button class="library-button library-open" data-story-index="${index}">開く</button>
                <button class="delete-library-button library-delete" data-story-index="${index}">削除</button>
            </div>
        </div>
    `).join("");

    storyLibraryList.querySelectorAll(".library-open").forEach((button) => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.storyIndex);
            const savedStory = library[index];
            if (savedStory && savedStory.story) {
                localStorage.setItem("libraryStoryPreview", JSON.stringify(savedStory.story));
                window.location.href = "story.html";
            }
        });
    });

    storyLibraryList.querySelectorAll(".library-delete").forEach((button) => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.storyIndex);
            library.splice(index, 1);
            localStorage.setItem("storyLibrary", JSON.stringify(library.slice(0, 20)));
            renderLibrary();
        });
    });
}

// タイトルを表示
titleElement.textContent = story.title;


// ページを表示する関数
function showPage() {
    titleElement.textContent = story.title || "";
    const page = story.pages[currentPage];
    const shouldShowImage = story.format === "storybook";

    if (imageElement) {
        imageElement.style.display = shouldShowImage ? "flex" : "none";
        imageElement.innerHTML = "";
    }

    if (shouldShowImage) {
        const imageUrl = page.imageUrl;
        const imagePrompt = page.imagePrompt || page.image;

        if (imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("data:"))) {
            const img = document.createElement("img");
            img.src = imageUrl;
            img.alt = page.imagePrompt || "絵本のイラスト";
            img.loading = "lazy";
            img.style.objectFit = "contain";
            img.style.background = "#f3efe6";
            imageElement.appendChild(img);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "story-image-placeholder";
            placeholder.textContent = "画像が生成されていません。確認画面から物語を生成してください。";
            imageElement.appendChild(placeholder);
        }
    }

    renderText(page.text);

    // ページのレイアウトを変更
    const canvas = document.querySelector("#storyCanvas");

    canvas.className = "story-canvas";
    if (story.format !== "storybook") {
        canvas.classList.add("story-plain-layout");
    }

    if (page.layout === "left-image") {
        canvas.classList.add("layout-left-image");
    }

    if (page.layout === "right-image") {
        canvas.classList.add("layout-right-image");
    }

    if (page.layout === "bottom") {
        canvas.classList.add("layout-bottom");
    }

    pageNumberElement.textContent =
        `${currentPage + 1} / ${story.pages.length}`;


    // 最初のページなら「前へ」を押せなくする
    if (currentPage === 0) {

        prevButton.disabled = true;

    } else {

        prevButton.disabled = false;

    }


    // 最後のページなら「次へ」を押せなくする
    if (currentPage === story.pages.length - 1) {

        nextButton.disabled = true;

    } else {

        nextButton.disabled = false;

    }

}


// 次のページ
nextButton.addEventListener("click", function() {

    if (currentPage < story.pages.length - 1) {

        currentPage++;

        showPage();

    }

});


// 前のページ
prevButton.addEventListener("click", function() {

    if (currentPage > 0) {

        currentPage--;

        showPage();

    }

});


// 最初から読む
restartButton.addEventListener("click", function() {

    currentPage = 0;

    showPage();

});


async function regenerateStory() {
    const styleList = getStoredArray("style");
    const selectedFormat = styleList.includes("詩")
        ? "poem"
        : styleList.includes("小説")
            ? "novel"
            : "storybook";

    const payload = {
        genres: getStoredArray("genres"),
        customIdea: getStoredText("customIdea", getStoredText("idea", "")),
        worlds: getStoredArray("worlds"),
        worldIdea: getStoredText("worldIdea", getStoredText("customWorld", "")),
        characters: getStoredArray("characters"),
        characterIdea: getStoredText("characterIdea", ""),
        elements: getStoredArray("elements"),
        elementIdea: getStoredText("elementIdea", ""),
        moods: getStoredArray("moods"),
        moodIdea: getStoredText("moodIdea", ""),
        styleList,
        styleIdea: getStoredText("styleIdea", ""),
        storyFormat: selectedFormat
    };

    if (regenerateButton) {
        regenerateButton.disabled = true;
        regenerateButton.textContent = "生成中…";
    }

    try {
        const response = await fetch("/generate-story", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json().catch(() => null);

        if (!response.ok) {
            const serverMessage = responseData?.error || responseData?.detail || `再生成に失敗しました (${response.status})`;
            throw new Error(serverMessage);
        }

        const data = responseData;
        if (!data.story || !data.storyId) {
            throw new Error("再生成された物語が取得できませんでした。");
        }

        localStorage.setItem("generatedStoryId", data.storyId);
        story = data.story;
        currentPage = 0;
        showPage();
    } catch (error) {
        console.error(error);
        alert(error?.message || "別バージョンの生成に失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
        if (regenerateButton) {
            regenerateButton.disabled = false;
            regenerateButton.textContent = "🔁 別バージョンをつくる";
        }
    }
}

if (regenerateButton) {
    regenerateButton.addEventListener("click", regenerateStory);
}

if (saveToLibraryButton) {
    saveToLibraryButton.addEventListener("click", saveCurrentStoryToLibrary);
}

renderLibrary();

// 最初のページを表示
async function init() {
    await loadGeneratedStory();
    renderLibrary();
    showPage();
}

init();
