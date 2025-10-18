import { Game } from "./game";
import "@babylonjs/loaders/glTF"; // For loading .glb models
import { i18n } from "./i18n";
import { initUITranslations } from "./ui-i18n";

window.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const modelSelect = document.getElementById("model-select") as HTMLSelectElement;

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

        // Load game with model from URL
        const game = await Game.CreateAsync(canvas, { cityModel: modelFromUrl });
        game.run();

        // Handle model changes - just reload with new query param
        modelSelect?.addEventListener("change", () => {
            const newModel = modelSelect.value;
            window.location.href = `?model=${newModel}`;
        });
    }
});
