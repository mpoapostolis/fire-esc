# Gemini Project Context: Fire Escape Game

## Project Overview

This project is a 3D web-based game named "Fire Escape". The player takes on the role of a CP Ranger tasked with saving a city from a series of mysterious fires. The gameplay is riddle-based, where the player must decipher clues to find and extinguish fires on a 3D city map.

**Key Technologies:**

-   **Framework:** Astro
-   **3D Engine:** Babylon.js
-   **Physics:** Havok Physics via `@babylonjs/havok`
-   **Audio:** Tone.js
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS

**Architecture:**

The application is built with Astro, which serves the main web page (`src/pages/index.astro`). This page contains a `<canvas>` element where the Babylon.js scene is rendered. 

The core game logic is initiated in `src/assets/scripts/main.ts`, which creates an instance of the `Game` class (`src/assets/scripts/game.ts`). 

The `Game` class is the central orchestrator, managing the game loop, player, world, and a series of managers for handling quests (`QuestManager`), UI (`UIManager`), and audio (`AudioManager`). The game state, including the current quest and player progress, is managed within these classes.

## Building and Running

Standard Astro commands are used to run and build the project. These are defined in the `scripts` section of `package.json`.

-   **To run the development server:**
    ```bash
    npm run dev
    ```

-   **To create a production build:**
    ```bash
    npm run build
    ```

-   **To preview the production build:**
    ```bash
    npm run preview
    ```

## Development Conventions

-   **Modularity:** The codebase is organized into distinct classes and modules, each with a clear responsibility (e.g., `Player`, `World`, `UIManager`). This promotes separation of concerns.
-   **TypeScript:** The entire game logic is written in TypeScript, providing type safety.
-   **DOM-based UI:** The UI is composed of HTML elements defined in `index.astro`. The `UIManager` class interacts with these elements via their IDs to display information and handle user input.
-   **State Management:** Game state is managed within the `Game` class and the respective managers. For example, `QuestManager` tracks quest progress, and the `Game` class holds state like `_gameState` and `_pendingQuest`.
-   **Event-Driven:** User interactions (button clicks, modal closes) are handled through an event-driven approach, with callbacks defined in the `Game` class and passed to the `UIManager`.
