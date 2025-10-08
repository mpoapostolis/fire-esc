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
  CubeTexture,
  MeshBuilder,
  Texture,
  ParticleHelper,
} from "@babylonjs/core";
import type { IParticleSystem } from "@babylonjs/core/Particles/IParticleSystem";
import type { Quest } from "./quests/quests";
import { AdvancedDynamicTexture, TextBlock, Control } from "@babylonjs/gui";

export class World {
  private _scene: Scene;
  public camera: ArcRotateCamera;
  private _firePoints: Mesh[] = [];
  private _fireParticleSystems: IParticleSystem[] = [];

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public async load(): Promise<void> {
    this._createLight();
    this._createSkybox();
    await this._createEnvironment();
    this._createCamera();
  }

  public createQuestFirePoints(quests: Quest[]): void {
    quests.forEach(quest => {
      const firePoint = MeshBuilder.CreateSphere(
        `firePoint-${quest.id}`,
        { diameter: 5 },
        this._scene
      );
      firePoint.position = new Vector3(quest.point.x, 2, quest.point.z);
      firePoint.isVisible = false;
      this._firePoints.push(firePoint);
    });
  }

  public async showFireAtPoint(id: number): Promise<void> {
    const firePoint = this._firePoints.find(
      (fp) => fp.name === `firePoint-${id}`
    );
    if (firePoint) {
      const set = await ParticleHelper.CreateAsync("fire", this._scene);
      set.systems.forEach((s) => {
        s.emitter = firePoint;
        s.minSize = 2;
        s.maxSize = 10;
        s.emitRate = 500;
        s.minEmitBox = new Vector3(-2, 0, -2);
        s.maxEmitBox = new Vector3(2, 0, 2);
        this._fireParticleSystems.push(s);
      });
      set.start();
    }
  }

  public hideAllFires(): void {
    this._fireParticleSystems.forEach((s) => s.dispose());
    this._fireParticleSystems = [];
  }

  public getFirePointPosition(id: number): Vector3 | null {
    const firePoint = this._firePoints.find(
      (fp) => fp.name === `firePoint-${id}`
    );
    return firePoint ? firePoint.getAbsolutePosition() : null;
  }

  private _createSkybox(): void {
    const skybox = MeshBuilder.CreateBox(
      "skyBox",
      { size: 1000.0 },
      this._scene
    );
    const skyboxMaterial = new StandardMaterial("skyBox", this._scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    skyboxMaterial.reflectionTexture = new CubeTexture(
      "https://www.babylonjs-playground.com/textures/skybox",
      this._scene
    );
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxMaterial.specularColor = new Color3(0, 0, 0);
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;
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
        if (mesh.material) {
          mesh.material.freeze();
        }
        mesh.freezeWorldMatrix();
      }
    });
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
