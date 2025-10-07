import {
  Scene,
  Vector3,
  HemisphericLight,
  SceneLoader,
  CreateGround,
  PhysicsBody,
  PhysicsShapeBox,
  PhysicsMotionType,
  Quaternion,
  ArcRotateCamera,
  Ray,
  AbstractMesh,
  Mesh,
  Material,
  MultiMaterial,
  PhysicsShapeMesh,
  StandardMaterial,
  Color3,
} from "@babylonjs/core";

export class World {
  private _scene: Scene;
  public camera: ArcRotateCamera;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public async load(): Promise<void> {
    this._createLight();
    await this._createEnvironment();
    this._createCamera();
  }

  private _createLight(): void {
    const light = new HemisphericLight(
      "light",
      new Vector3(0, 1, 0),
      this._scene
    );
    light.intensity = 0.7;
  }

  private async _createEnvironment(): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "/models/",
      "city.glb",
      this._scene
    );
    result.meshes.forEach((mesh) => {
      mesh.layerMask = 1; // Assign to layer 1 (World)
      if (mesh.name !== "__root__" && mesh instanceof Mesh) {
        const body = new PhysicsBody(
          mesh,
          PhysicsMotionType.STATIC,
          false,
          this._scene
        );
        body.shape = new PhysicsShapeMesh(mesh, this._scene);
      }
    });

    const ground = CreateGround(
      "ground",
      { width: 250, height: 250 },
      this._scene
    );
    ground.isVisible = true;
    ground.layerMask = 0x4; // Assign to layer 1 (World)
    ground.position.y = -1;
    const groundMaterial = new StandardMaterial("groundMat", this._scene);
    groundMaterial.diffuseColor = new Color3(0, 0, 0); // Βασικό χρώμα: Μαύρο
    groundMaterial.specularColor = new Color3(0, 0, 0); // Χρώμα αντανάκλασης: Μαύρο (για να μην γυαλίζει)
    ground.material = groundMaterial;
  }

  private _createCamera(): void {
    this.camera = new ArcRotateCamera(
      "thirdPersonCamera",
      -Math.PI / 2,
      Math.PI / 2.5,
      15,
      Vector3.Zero(),
      this._scene
    );
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 5;
    this.camera.lowerBetaLimit = 0.1;
    this.camera.upperBetaLimit = Math.PI / 2.2;
    this.camera.angularSensibilityX = 2000;
    this.camera.angularSensibilityY = 2000;
    this.camera.attachControl(
      this._scene.getEngine().getRenderingCanvas(),
      true
    );
  }

  public setupCameraOcclusion(
    getTarget: () => Vector3,
    excludeMeshes: AbstractMesh[]
  ): { update: () => void; dispose: () => void } {
    // This map will store the original material state using the Material object itself as the key
    const occludedMaterials = new Map<
      Material,
      { alpha: number; transparencyMode: number }
    >();
    const ray = new Ray(Vector3.Zero(), Vector3.Zero(), 1);
    const excludeSet = new Set(excludeMeshes);

    const update = () => {
      // 1. Restore all previously occluded materials
      occludedMaterials.forEach((originalState, material) => {
        material.alpha = originalState.alpha;
        material.transparencyMode = originalState.transparencyMode;
      });
      occludedMaterials.clear();

      // 2. Calculate new occlusions for this frame
      const cameraPos = this.camera.position;
      const target = getTarget();
      const direction = target.subtract(cameraPos);
      const distance = direction.length();
      direction.normalize();

      ray.origin.copyFrom(cameraPos);
      ray.direction.copyFrom(direction);
      ray.length = distance;

      const hits = this._scene.multiPickWithRay(
        ray,
        (mesh) => !excludeSet.has(mesh) && mesh.isVisible
      );

      // 3. Process all hits for the current frame
      if (hits) {
        for (const hit of hits) {
          const mesh = hit.pickedMesh;
          if (mesh && mesh.material) {
            const processMaterial = (mat: Material) => {
              if (!occludedMaterials.has(mat)) {
                occludedMaterials.set(mat, {
                  alpha: mat.alpha,
                  transparencyMode:
                    mat.transparencyMode ?? Material.MATERIAL_OPAQUE,
                });
                mat.alpha = 0.2;
                mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
              }
            };

            if (mesh.material instanceof MultiMaterial) {
              mesh.material.subMaterials.forEach((subMat) => {
                if (subMat) processMaterial(subMat);
              });
            } else {
              processMaterial(mesh.material);
            }
          }
        }
      }
    };

    const dispose = () => {
      occludedMaterials.forEach((originalState, material) => {
        material.alpha = originalState.alpha;
        material.transparencyMode = originalState.transparencyMode;
      });
      occludedMaterials.clear();
    };

    return { update, dispose };
  }
}
