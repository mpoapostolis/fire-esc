import { Scene, Vector3, AbstractMesh, ArcRotateCamera, Animation } from "@babylonjs/core";
import type { World } from "../world";
import type { UIManager } from "./UIManager";
import type { Player } from "../player";

export interface CinematicConfig {
    cameraTarget: string;
    spawnPoint: Vector3;
    targetPosition: Vector3;
    riddle: string;
    onComplete: () => void;
}

export class CinematicManager {
    private _scene: Scene;
    private _world: World;
    private _uiManager: UIManager;
    private _player: Player;

    constructor(scene: Scene, world: World, uiManager: UIManager, player: Player) {
        this._scene = scene;
        this._world = world;
        this._uiManager = uiManager;
        this._player = player;
    }

    public async playCinematic(config: CinematicConfig): Promise<void> {
        // Move player FAR away so they don't overlap with cinematic character
        this._player.capsule.position.set(0, -100, 0);

        // Load character
        await this._world.loadCinematicCharacter(config.cameraTarget, config.spawnPoint);

        const character = this._world.getCinematicCharacter();
        if (!character) {
            console.error("Failed to load cinematic character!");
            config.onComplete();
            return;
        }

        // Get main camera
        const mainCamera = this._scene.activeCamera as ArcRotateCamera;

        // Make camera follow character EVERY frame during cinematic
        const observer = this._scene.onBeforeRenderObservable.add(() => {
            if (mainCamera && character) {
                mainCamera.setTarget(character.position);
            }
        });

        // Animate character
        await this._world.animateCinematicCharacter(config.targetPosition, 4000);

        // Wait a moment, then cleanup
        setTimeout(() => {
            // Stop following character
            this._scene.onBeforeRenderObservable.remove(observer);

            // Cleanup character
            this._world.disposeCinematicCharacter();

            // Camera reset is handled by game.ts onComplete callback
            config.onComplete();

        }, 1000);
    }
}
