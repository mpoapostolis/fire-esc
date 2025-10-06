import { Game } from "./game";
import "@babylonjs/loaders/glTF"; // For loading .glb models

window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    if (canvas) {
        const game = new Game(canvas);
        game.run();
    }
});
