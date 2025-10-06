// game.ts

import { Engine, Scene, Vector3 } from "@babylonjs/core";
import { getHavokPlugin } from "./physics";
import { World } from "./world";
import { Player } from "./player";
import { Minimap } from "./mini-map"; // <-- Import the new Minimap class

export class Game {
  private _scene: Scene;
  private _engine: Engine;

  constructor(canvas: HTMLCanvasElement) {
    this._engine = new Engine(canvas, true);
    this._scene = new Scene(this._engine);
  }

  public async run(): Promise<void> {
    // --- Loading Screen Logic --- (omitted for brevity, same as before)
    const loadingScreen = document.getElementById("loading-screen");
    const loadingText = document.getElementById("loading-text");
    const loadingMessages = [
      "Assembling Crew...",
      "Deploying to City...",
      "Preparing Equipment...",
      "Scanning Emergency Frequencies...",
    ];
    let messageIndex = 0;
    if (loadingText) loadingText.innerHTML = loadingMessages[0];

    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      if (loadingText) loadingText.innerHTML = loadingMessages[messageIndex];
    }, 2000);

    // --- Game Initialization ---
    // Initialize physics
    const havokPlugin = await getHavokPlugin();
    this._scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

    // Create the world
    const world = new World(this._scene);
    await world.load();

    // Create the player
    const player = new Player(this._scene, world.camera);
    const playerMeshes = await player.load();

    // Define main rendering layers
    const WORLD_LAYER = 0x1;
    const PLAYER_LAYER = 0x2;

    // Main camera sees the world and the player model
    world.camera.layerMask = WORLD_LAYER | PLAYER_LAYER;

    // --- Minimap Setup ---
    // Create an instance of the Minimap class
    const minimap = new Minimap(this._scene, player);
    // Initialize it and get the camera it created
    const minimapCamera = minimap.initialize();

    // Add both cameras to the scene's active cameras
    this._scene.activeCameras.push(world.camera);
    this._scene.activeCameras.push(minimapCamera);

    // Setup camera occlusion for the main camera only
    const occlusion = world.setupCameraOcclusion(
      () => player.capsule.position,
      playerMeshes
    );

    // Start the render loop
    this._engine.runRenderLoop(() => {
      player.update();
      occlusion.update();
      minimap.update(); // <-- Call the minimap's update method each frame
      this._scene.render();
    });

    // Handle window resize
    window.addEventListener("resize", () => {
      this._engine.resize();
    });
  }
}
