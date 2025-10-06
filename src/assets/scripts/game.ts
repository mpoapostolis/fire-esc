import {
  Engine,
  Scene,
  Vector3,
  ArcRotateCamera,
  Viewport,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Camera,
} from "@babylonjs/core";
import { getHavokPlugin } from "./physics";
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
    // --- Loading Screen Logic ---
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

    // Create the world and camera
    const world = new World(this._scene);
    await world.load();

    // Create the player
    const player = new Player(this._scene, world.camera);
    const playerMeshes = await player.load();

    // --- Minimap Setup ---
    // Define camera layers
    const MAIN_CAMERA_LAYER = 0x1;
    const MINIMAP_CAMERA_LAYER = 0x2;

    // Set layers for existing cameras and meshes
    world.camera.layerMask = MAIN_CAMERA_LAYER;
    playerMeshes.forEach((m) => (m.layerMask = MAIN_CAMERA_LAYER));

    // Create a static top-down orthographic camera for the minimap
    const mapSize = 100; // Match the ground size
    const minimapCamera = new ArcRotateCamera(
      "minimap",
      0,
      0,
      mapSize,
      new Vector3(0, 0, 0),
      this._scene
    );
    minimapCamera.mode = Camera.PERSPECTIVE_CAMERA;
    minimapCamera.position = new Vector3(0, 100, 0); // Position high above the center
    minimapCamera.setTarget(Vector3.Zero());

    // Create a red dot to represent the player on the minimap
    const redDot = MeshBuilder.CreateSphere(
      "playerDot",
      { diameter: 5 },
      this._scene
    );
    redDot.position = new Vector3(0, 10, 0); // Slightly above ground
    redDot.material = new StandardMaterial("redDotMat", this._scene);
    (redDot.material as StandardMaterial).diffuseColor = new Color3(1, 0, 0);
    (redDot.material as StandardMaterial).emissiveColor = new Color3(1, 0, 0);
    redDot.layerMask = MINIMAP_CAMERA_LAYER; // Only show the dots on the minimap

    // Define viewports
    world.camera.viewport = new Viewport(0, 0, 1, 1);
    minimapCamera.viewport = new Viewport(0.65, 0.65, 0.3, 0.3);
    minimapCamera.layerMask = MINIMAP_CAMERA_LAYER | MAIN_CAMERA_LAYER; // Minimap sees the world AND the red dot

    // Add both cameras to the scene
    this._scene.activeCameras.push(world.camera);
    this._scene.activeCameras.push(minimapCamera);

    // Setup camera occlusion for the main camera only
    const occlusion = world.setupCameraOcclusion(
      () => player.capsule.position,
      playerMeshes
    );

    // Start the render loop
    this._engine.runRenderLoop(() => {
      // Update the red dot's position to match the player, but keep it flat
      redDot.position.x = player.capsule.position.x;
      redDot.position.z = player.capsule.position.z;

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
