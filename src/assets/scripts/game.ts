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

    // --- Minimap Setup with ArcRotateCamera ---
    const WORLD_LAYER = 0x1;
    const PLAYER_LAYER = 0x2;
    const MINIMAP_UI_LAYER = 0x4;

    world.camera.layerMask = WORLD_LAYER | PLAYER_LAYER;

    // Create a new ArcRotateCamera for the minimap, looking straight down
    const minimapCamera = new ArcRotateCamera(
      "minimap",
      -Math.PI / 2,
      0,
      30,
      player.capsule.position,
      this._scene
    );
    minimapCamera.detachControl(); // User cannot move this camera

    // Create a red arrow to represent the player on the minimap
    const redArrow = MeshBuilder.CreateCylinder(
      "playerArrow",
      { height: 1, diameterTop: 0, diameterBottom: 4 },
      this._scene
    );
    const redArrowMat = new StandardMaterial("redArrowMat", this._scene);
    redArrowMat.diffuseColor = new Color3(1, 0, 0);
    redArrowMat.emissiveColor = new Color3(1, 0, 0);
    redArrow.material = redArrowMat;
    redArrow.layerMask = MINIMAP_UI_LAYER;
    redArrow.position.y = 5;

    // Define viewports
    world.camera.viewport = new Viewport(0, 0, 1, 1);
    minimapCamera.viewport = new Viewport(0.75, 0.75, 0.25, 0.25);

    // Minimap camera sees world and its own UI layer
    minimapCamera.layerMask = WORLD_LAYER | MINIMAP_UI_LAYER;

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
      // Make the minimap camera and the arrow follow the player
      minimapCamera.target.copyFrom(player.capsule.position);
      redArrow.position.x = player.capsule.position.x;
      redArrow.position.z = player.capsule.position.z;
      // redArrow.rotation.y = player.getHeroRotation();
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
