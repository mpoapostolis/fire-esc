// minimap.ts

import {
  Scene,
  Vector3,
  ArcRotateCamera,
  Viewport,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Camera,
  Mesh,
} from "@babylonjs/core";
import { Player } from "./player";

export class Minimap {
  private _scene: Scene;
  private _player: Player;
  private _camera: ArcRotateCamera;
  private _playerArrow: Mesh;

  // Layer masks
  private static readonly WORLD_LAYER = 0x1;
  private static readonly MINIMAP_UI_LAYER = 0x4;
  // --- ΠΡΟΣΘΗΚΗ: Layer mask αποκλειστικά για το background του minimap ---

  constructor(scene: Scene, player: Player) {
    this._scene = scene;
    this._player = player;
  }

  /**
   * Creates the minimap camera, player indicator, and sets up viewports.
   * @returns The created minimap camera to be added to the scene's active cameras.
   */
  public initialize(): Camera {
    // Create a new ArcRotateCamera for the minimap, looking straight down
    this._camera = new ArcRotateCamera(
      "minimap",
      -Math.PI / 2, // Angle looking straight down
      0, // No rotation around the up-axis initially
      40, // Distance (zoom level) from the target
      this._player.capsule.position,
      this._scene
    );
    this._camera.detachControl(); // User cannot move this camera

    // --- ΚΩΔΙΚΑΣ ΓΙΑ ΜΑΥΡΟ BACKGROUND ---
    const backgroundPlane = MeshBuilder.CreatePlane(
      "minimapBackground",
      { size: 1000 },
      this._scene
    );

    const blackMat = new StandardMaterial("minimapBlackMat", this._scene);
    // Επαναφέρουμε το χρώμα σε μαύρο
    blackMat.emissiveColor = new Color3(0, 0, 0);
    blackMat.disableLighting = true;
    backgroundPlane.material = blackMat;

    backgroundPlane.parent = this._camera;
    backgroundPlane.position.z = this._camera.maxZ - 0.1;

    // Το background ανήκει ΜΟΝΟ στο δικό του layer
    // ------------------------------------------

    // Create a red arrow to represent the player on the minimap
    this._playerArrow = MeshBuilder.CreateCylinder(
      "playerArrow",
      { height: 1, diameterTop: 0, diameterBottom: 4 },
      this._scene
    );
    const redArrowMat = new StandardMaterial("redArrowMat", this._scene);
    redArrowMat.diffuseColor = new Color3(1, 0, 0);
    redArrowMat.emissiveColor = new Color3(1, 0, 0);
    this._playerArrow.material = redArrowMat;

    this._playerArrow.position.y = 5;
    // Το βελάκι ανήκει ΜΟΝΟ στο δικό του layer
    this._playerArrow.layerMask = Minimap.MINIMAP_UI_LAYER;

    // Define the minimap's viewport
    this._camera.viewport = new Viewport(0.775, 0.75, 0.22, 0.24); // Το έβαλα πάνω δεξιά, μπορείς να το αλλάξεις

    // Η κάμερα του minimap βλέπει τον κόσμο, το UI της και το background της
    this._camera.layerMask = Minimap.WORLD_LAYER | Minimap.MINIMAP_UI_LAYER;

    return this._camera;
  }

  /**
   * Updates the position and rotation of the minimap elements.
   * This should be called in the main render loop.
   */
  public update(): void {
    if (!this._camera || !this._playerArrow) {
      return;
    }

    // The camera's target always follows the player
    this._camera.target.copyFrom(this._player.capsule.position);

    // The arrow's X and Z position matches the player's
    this._playerArrow.position.x = this._player.capsule.position.x;
    this._playerArrow.position.z = this._player.capsule.position.z;

    // Uncomment and implement this if your Player class has a way to get rotation
    // This will make the arrow point in the direction the player is facing.
    // this._playerArrow.rotation.y = this._player.getHeroRotation();
  }
}
