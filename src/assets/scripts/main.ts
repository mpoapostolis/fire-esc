import { Game } from "./game";
import "@babylonjs/loaders/glTF"; // For loading .glb models
import { i18n } from "./i18n";
import { initUITranslations } from "./ui-i18n";
import { audioManager } from "./managers/AudioManager";

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const modelSelect = document.getElementById(
    "model-select",
  ) as HTMLSelectElement;

  // UI Screens
  const languageSelectionScreen = document.getElementById(
    "language-selection-screen",
  ) as HTMLDivElement;
  const startScreen = document.getElementById("start-screen") as HTMLDivElement;
  const loadingScreen = document.getElementById(
    "loading-screen",
  ) as HTMLDivElement;

  // Loading elements
  const progressBar = document.getElementById(
    "loading-progress-bar",
  ) as HTMLDivElement;
  const percentage = document.getElementById(
    "loading-percentage",
  ) as HTMLParagraphElement;
  const statusText = document.getElementById(
    "loading-status",
  ) as HTMLParagraphElement;

  if (canvas) {
    // --- 1. LANGUAGE SELECTION ---
    if (languageSelectionScreen) {
      languageSelectionScreen.style.display = "flex";
    }

    // Wait for language selection
    await new Promise<void>((resolve) => {
      const languageButtons = document.querySelectorAll(".language-btn");
      languageButtons.forEach((btn) => {
        // Add hover sound for fun
        btn.addEventListener("mouseenter", () => audioManager.playHover());

        btn.addEventListener("click", async (e) => {
          audioManager.playButtonClick();
          const target = e.currentTarget as HTMLButtonElement;
          const selectedLang = target.getAttribute("data-lang") || "el";

          // Load translations
          await i18n.loadTranslations(selectedLang);
          initUITranslations();

          // Transition to Start Screen
          if (languageSelectionScreen) {
            languageSelectionScreen.style.opacity = "0";
            setTimeout(() => {
              languageSelectionScreen.style.display = "none";
              resolve(); // Language chosen
            }, 500);
          }
        });
      });
    });

    // --- 2. START SCREEN (Audio Init) ---
    if (startScreen) {
      startScreen.style.display = "flex";
      startScreen.style.opacity = "0";
      requestAnimationFrame(() => (startScreen.style.opacity = "1")); // Fade in
    }

    // Wait for user to "Press Start" (Initializes Audio Context)
    await new Promise<void>((resolve) => {
      const startBtn = document.getElementById("start-game-btn");
      if (startBtn) {
        startBtn.addEventListener("mouseenter", () => audioManager.playHover());
        startBtn.addEventListener("click", async () => {
          // initializing audio context requires user gesture
          audioManager.initializeAudio();
          await audioManager.playBootSequence();

          // Transition to Loading
          if (startScreen) {
            startScreen.style.opacity = "0";
            setTimeout(() => {
              startScreen.style.display = "none";
              resolve();
            }, 500);
          }
        });
      } else {
        // Fallback if no start button found (legacy mode)
        resolve();
      }
    });

    // --- 3. LOADING SCREEN ---
    if (loadingScreen) {
      loadingScreen.style.display = "flex";
      loadingScreen.style.opacity = "0";
      requestAnimationFrame(() => (loadingScreen.style.opacity = "1"));
    }

    // Get model from URL query params or default
    const urlParams = new URLSearchParams(window.location.search);
    const modelFromUrl = urlParams.get("model") || "city-white.glb";

    if (modelSelect) {
      modelSelect.value = modelFromUrl;
    }

    // Progress callback
    const onProgress = (progress: number, status: string) => {
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (percentage) percentage.textContent = `${progress}%`;
      if (statusText) statusText.textContent = status;
    };

    // Load game
    const game = await Game.CreateAsync(canvas, {
      cityModel: modelFromUrl,
      onProgress,
    });

    await game.run();

    // --- 4. GAME START ---
    // Hide loading screen
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
      }, 500);
    }

    // --- GLOBAL SOUND EFFECTS ---
    // Attach click/hover sounds to all interactive elements
    document.body.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest(".interactive")) {
        audioManager.playButtonClick();
      }
    });

    document.body.addEventListener("mouseover", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest(".interactive")) {
        audioManager.playHover();
      }
    });

    // Handle model changes
    modelSelect?.addEventListener("change", () => {
      const newModel = modelSelect.value;
      window.location.href = `?model=${newModel}`;
    });
  }
});
