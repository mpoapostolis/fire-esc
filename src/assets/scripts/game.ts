import { Engine, Scene, Vector3 } from "@babylonjs/core";
import { getHavokPlugin } from "./physics/physics";
import { World } from "./world";
import { Player } from "./player";

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

        // Create the world and camera
        const world = new World(this._scene);
        await world.load();

        // Create the player
        const player = new Player(this._scene, world.camera);
        const playerMeshes = await player.load();

        // Setup camera occlusion
        const occlusion = world.setupCameraOcclusion(() => player.capsule.position, playerMeshes);

        // Start the render loop
        this._engine.runRenderLoop(() => {
            player.update();
            occlusion.update();
            this._scene.render();
        });

        // Handle window resize
        window.addEventListener("resize", () => {
            this._engine.resize();
        });
    }
}