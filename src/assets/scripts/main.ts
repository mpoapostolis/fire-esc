import { Game } from "./game";
import "@babylonjs/loaders/glTF"; // For loading .glb models
import { i18n } from "./i18n";
import { initUITranslations } from "./ui-i18n";

window.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const modelSelect = document.getElementById("model-select") as HTMLSelectElement;
    const loadingScreen = document.getElementById("loading-screen") as HTMLDivElement;
    const progressBar = document.getElementById("loading-progress-bar") as HTMLDivElement;
    const percentage = document.getElementById("loading-percentage") as HTMLParagraphElement;
    const statusText = document.getElementById("loading-status") as HTMLParagraphElement;

    if (canvas) {
        // Load translations first
        await i18n.loadTranslations("el");

        // Initialize UI translations
        initUITranslations();

        // Get model from URL query params or default
        const urlParams = new URLSearchParams(window.location.search);
        const modelFromUrl = urlParams.get("model") || "city-white.glb";

        // Set select value to match URL
        if (modelSelect) {
            modelSelect.value = modelFromUrl;
        }

        // Progress callback for updating loading screen
        const onProgress = (progress: number, status: string) => {
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            if (percentage) {
                percentage.textContent = `${progress}%`;
            }
            if (statusText) {
                statusText.textContent = status;
            }
        };

        // Load game with model from URL and progress callback
        const game = await Game.CreateAsync(canvas, {
            cityModel: modelFromUrl,
            onProgress
        });

        // Wait for all assets to load before hiding loading screen
        await game.run();

        // Hide loading screen with fade out effect after all assets are ready
        if (loadingScreen) {
            loadingScreen.style.opacity = "0";
            loadingScreen.style.transition = "opacity 0.5s ease-out";
            setTimeout(() => {
                loadingScreen.style.display = "none";
            }, 500);
        }

        // Handle model changes - just reload with new query param
        modelSelect?.addEventListener("change", () => {
            const newModel = modelSelect.value;
            window.location.href = `?model=${newModel}`;
        });
    }
});
