import {
  Scene,
  Vector3,
  HemisphericLight,
  SceneLoader,
  AbstractMesh,
  Mesh,
  PhysicsBody,
  PhysicsShapeMesh,
  PhysicsMotionType,
  StandardMaterial,
  Color3,
  CubeTexture,
  MeshBuilder,
  Texture,
  ParticleHelper,
  ArcRotateCamera,
} from "@babylonjs/core";
import type { IParticleSystem } from "@babylonjs/core/Particles/IParticleSystem";
import type { Quest } from "./quests/quests";

interface WorldConfig {
  readonly modelPath: string;
  readonly cityModel: string;
  readonly cyclistModel: string;
  readonly skyboxUrl: string;
  readonly lightIntensity: number;
  readonly skyboxSize: number;
}

const DEFAULT_WORLD_CONFIG: WorldConfig = {
  modelPath: "/models/",
  cityModel: "city.glb",
  cyclistModel: "cyclist.glb",
  skyboxUrl: "https://www.babylonjs-playground.com/textures/skybox",
  lightIntensity: 0.7,
  skyboxSize: 1000,
};

export class World {
  public cyclistCamera?: ArcRotateCamera;

  private readonly _scene: Scene;
  private readonly _config: WorldConfig;
  private readonly _firePoints = new Map<number, Mesh>();
  private readonly _fireParticleSystems: IParticleSystem[] = [];
  private _cyclist?: AbstractMesh;

  constructor(scene: Scene, config: Partial<WorldConfig> = {}) {
    this._scene = scene;
    this._config = { ...DEFAULT_WORLD_CONFIG, ...config };
  }

  public async load(): Promise<void> {
    this._createLight();
    this._createSkybox();
    await this._createEnvironment();
  }

  public createQuestFirePoints(quests: Quest[]): void {
    for (const quest of quests) {
      const firePoint = MeshBuilder.CreateSphere(
        `firePoint-${quest.id}`,
        { diameter: 5 },
        this._scene
      );
      firePoint.position.set(quest.point.x, 2, quest.point.z);
      firePoint.isVisible = false;
      this._firePoints.set(quest.id, firePoint);
    }
  }

  public async showFireAtPoint(id: number): Promise<void> {
    const firePoint = this._firePoints.get(id);
    if (!firePoint) return;

    const set = await ParticleHelper.CreateAsync("fire", this._scene);
    for (const system of set.systems) {
      system.emitter = firePoint;
      system.minSize = 2;
      system.maxSize = 10;
      system.emitRate = 500;
      this._fireParticleSystems.push(system);
    }
    set.start();
  }

  public hideAllFires(): void {
    for (const system of this._fireParticleSystems) {
      system.dispose();
    }
    this._fireParticleSystems.length = 0;
  }

  public getFirePointPosition(id: number): Vector3 | null {
    const firePoint = this._firePoints.get(id);
    return firePoint?.getAbsolutePosition() ?? null;
  }

  private _createSkybox(): void {
    const skybox = MeshBuilder.CreateBox(
      "skyBox",
      { size: this._config.skyboxSize },
      this._scene
    );
    skybox.infiniteDistance = true;

    const material = new StandardMaterial("skyBoxMaterial", this._scene);
    material.backFaceCulling = false;
    material.disableLighting = true;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();

    const reflectionTexture = new CubeTexture(
      this._config.skyboxUrl,
      this._scene
    );
    reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    material.reflectionTexture = reflectionTexture;

    skybox.material = material;
  }

  private _createLight(): void {
    const light = new HemisphericLight(
      "hemisphericLight",
      Vector3.UpReadOnly,
      this._scene
    );
    light.intensity = this._config.lightIntensity;
  }

  private async _createEnvironment(): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      this._config.modelPath,
      this._config.cityModel,
      this._scene
    );

    for (const mesh of result.meshes) {
      mesh.layerMask = 1;

      if (mesh.name !== "__root__" && mesh instanceof Mesh) {
        this._setupStaticMeshPhysics(mesh);
        this._optimizeMesh(mesh);
      }
    }
  }

  private _setupStaticMeshPhysics(mesh: Mesh): void {
    const body = new PhysicsBody(
      mesh,
      PhysicsMotionType.STATIC,
      false,
      this._scene
    );
    body.shape = new PhysicsShapeMesh(mesh, this._scene);
  }

  private _optimizeMesh(mesh: Mesh): void {
    mesh.material?.freeze();
    mesh.freezeWorldMatrix();
  }

  public async loadCyclist(): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      this._config.modelPath,
      this._config.cyclistModel,
      this._scene
    );

    const cyclistRoot = new Mesh("cyclistRoot", this._scene);
    cyclistRoot.position.set(5, 0.5, 7);

    for (const mesh of result.meshes) {
      if (mesh.parent === null) mesh.parent = cyclistRoot;
      mesh.isVisible = true;
    }

    this._cyclist = cyclistRoot;
    this._setupCyclistCamera(cyclistRoot);
  }

  private _setupCyclistCamera(target: AbstractMesh): void {
    this.cyclistCamera = new ArcRotateCamera(
      "cyclistCamera",
      -Math.PI / 2,
      Math.PI / 2.5,
      10,
      target.position,
      this._scene
    );
    this.cyclistCamera.lockedTarget = target;
    this.cyclistCamera.setEnabled(false);
  }
}