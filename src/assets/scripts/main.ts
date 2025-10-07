import { Game } from "./game";
import "@babylonjs/loaders/glTF"; // For loading .glb models

window.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    if (canvas) {
        const game = await Game.CreateAsync(canvas);
        game.run();
    }
});
