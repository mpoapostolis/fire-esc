import { Engine, Scene, Vector3 } from "@babylonjs/core";
import { getHavokPlugin } from "./physics/physics";
import { createEnvironment } from "./world/environment";
import { createCharacterController, type CharacterController } from "./player/characterController";

export class Game {
    private _scene: Scene;
    private _engine: Engine;

    constructor(canvas: HTMLCanvasElement) {
        this._engine = new Engine(canvas, true);
        this._scene = new Scene(this._engine);
    }

    public async run(): Promise<void> {
        // Initialize physics
        const havokPlugin = await getHavokPlugin();
        this._scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

        // Create the environment (loads the city)
        await createEnvironment(this._scene);

        // Create the character controller from the new module
        const character: CharacterController = await createCharacterController(this._scene);

        // Start the render loop
        this._engine.runRenderLoop(() => {
            // The character controller's update function now drives everything
            character.update();
            this._scene.render();
        });

        // Handle window resize
        window.addEventListener("resize", () => {
            this._engine.resize();
        });
    }
}
