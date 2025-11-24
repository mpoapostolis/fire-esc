import { Game } from "./game";
import "@babylonjs/loaders/glTF"; // For loading .glb models
import { i18n } from "./i18n";
import { initUITranslations } from "./ui-i18n";

window.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const modelSelect = document.getElementById("model-select") as HTMLSelectElement;
    const languageSelectionScreen = document.getElementById("language-selection-screen") as HTMLDivElement;
    const loadingScreen = document.getElementById("loading-screen") as HTMLDivElement;
    const progressBar = document.getElementById("loading-progress-bar") as HTMLDivElement;
    const percentage = document.getElementById("loading-percentage") as HTMLParagraphElement;
    const statusText = document.getElementById("loading-status") as HTMLParagraphElement;

    if (canvas) {
        // Always show language selection screen (no localStorage)
        if (languageSelectionScreen) {
            languageSelectionScreen.style.display = "flex";
        }

        // Wait for language selection
        await new Promise<void>((resolve) => {
            const languageButtons = document.querySelectorAll(".language-btn");
            languageButtons.forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    const selectedLang = target.getAttribute("data-lang") || "el";

                    // Hide language selection screen
                    if (languageSelectionScreen) {
                        languageSelectionScreen.style.opacity = "0";
                        languageSelectionScreen.style.transition = "opacity 0.5s ease-out";
                        setTimeout(() => {
                            languageSelectionScreen.style.display = "none";
                        }, 500);
                    }

                    // Show loading screen
                    if (loadingScreen) {
                        loadingScreen.style.display = "flex";
                    }

                    // Load translations with selected language
                    await i18n.loadTranslations(selectedLang);

                    // Initialize UI translations
                    initUITranslations();

                    resolve();
                });
            });
        });

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
