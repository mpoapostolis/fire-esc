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
  Animation,
  AnimationGroup,
  DirectionalLight,
  ShadowGenerator,
  DefaultRenderingPipeline,
} from "@babylonjs/core";
import type { IParticleSystem } from "@babylonjs/core/Particles/IParticleSystem";
import type { Quest } from "./quests/quests";

interface ModelConfig {
  readonly scale: Vector3;
  readonly position: Vector3;
  readonly rotation: Vector3;
}

interface WorldConfig {
  readonly modelPath: string;
  readonly cityModel: string;
  readonly cyclistModel: string;
  readonly skyboxUrl: string;
  readonly lightIntensity: number;
  readonly skyboxSize: number;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "city-2.glb": {
    scale: new Vector3(1.2, 1.2, -1.2),
    position: new Vector3(0, -2, 0),
    rotation: new Vector3(0, 0, 0),
  },
  "city.glb": {
    scale: new Vector3(1, 1, 1),
    position: new Vector3(0, 0, 0),
    rotation: new Vector3(0, 0, 0),
  },
  "city-white.glb": {
    scale: new Vector3(1.2, 1.2, -1.2),
    position: new Vector3(0, -2, 0),
    rotation: new Vector3(0, 0, 0),
  },
};

const DEFAULT_WORLD_CONFIG: WorldConfig = {
  modelPath: "/models/",
  cityModel: "city-2.glb",
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
  private _cyclistAnimations: AnimationGroup[] = [];
  private _shadowGenerator?: ShadowGenerator;
  private _pipeline?: DefaultRenderingPipeline;

  constructor(scene: Scene, config: Partial<WorldConfig> = {}) {
    this._scene = scene;
    this._config = { ...DEFAULT_WORLD_CONFIG, ...config };
  }

  public async load(): Promise<void> {
    this._createLight();
    this._createSkybox();
    await this._createEnvironment();
    this._setupAtmosphere();
  }

  public setupPostProcessing(): void {
    if (this._pipeline) {
      this._pipeline.dispose();
      this._pipeline = undefined;
    }
    this._setupPostProcessing();
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
      system.minSize = 2.5;
      system.maxSize = 10;
      system.emitRate = 600;
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
    const hemispheric = new HemisphericLight(
      "hemisphericLight",
      Vector3.UpReadOnly,
      this._scene
    );
    hemispheric.intensity = 0.4;
    hemispheric.groundColor = new Color3(0.2, 0.15, 0.1);
    hemispheric.diffuse = new Color3(0.9, 0.85, 0.8);

    const directional = new DirectionalLight(
      "directionalLight",
      new Vector3(-1, -2, -1),
      this._scene
    );
    directional.position = new Vector3(50, 100, 50);
    directional.intensity = 0.6;
    directional.diffuse = new Color3(1.0, 0.95, 0.85);

    this._shadowGenerator = new ShadowGenerator(1024, directional);
    this._shadowGenerator.useBlurExponentialShadowMap = true;
    this._shadowGenerator.blurKernel = 32;
    this._shadowGenerator.darkness = 0.3;
  }

  private async _createEnvironment(): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      this._config.modelPath,
      this._config.cityModel,
      this._scene
    );

    // Get model-specific configuration
    const modelConfig =
      MODEL_CONFIGS[this._config.cityModel] || MODEL_CONFIGS["city-2.glb"];

    // Apply model configuration to root mesh
    const rootMesh = result.meshes[0];
    rootMesh.scaling.copyFrom(modelConfig.scale);
    rootMesh.position.copyFrom(modelConfig.position);
    rootMesh.rotation.copyFrom(modelConfig.rotation);

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
    mesh.receiveShadows = true;
    mesh.material?.freeze();
    mesh.freezeWorldMatrix();
  }

  private _setupPostProcessing(): void {
    const camera = this._scene.activeCamera;
    if (!camera) return;

    this._pipeline = new DefaultRenderingPipeline(
      "pipeline",
      false,
      this._scene,
      [camera]
    );

    this._pipeline.bloomEnabled = true;
    this._pipeline.bloomThreshold = 0.9;
    this._pipeline.bloomWeight = 0.1;
    this._pipeline.bloomKernel = 32;
    this._pipeline.bloomScale = 0.5;

    this._pipeline.imageProcessingEnabled = true;
    if (this._pipeline.imageProcessing) {
      this._pipeline.imageProcessing.contrast = 1.05;
      this._pipeline.imageProcessing.exposure = 1.1;
    }

    this._pipeline.fxaaEnabled = true;
    this._pipeline.samples = 1;
  }

  private _setupAtmosphere(): void {
    this._scene.fogEnabled = true;
    this._scene.fogMode = Scene.FOGMODE_EXP2;
    this._scene.fogDensity = 0.001;
    this._scene.fogColor = new Color3(0.12, 0.1, 0.08);
    this._scene.clearColor = new Color3(0.08, 0.06, 0.05).toColor4(1);
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
      if (mesh instanceof Mesh) {
        mesh.receiveShadows = true;
        if (this._shadowGenerator) {
          this._shadowGenerator.addShadowCaster(mesh);
        }
      }
    }

    this._cyclist = cyclistRoot;
    this._cyclistAnimations = result.animationGroups;
    this._setupCyclistCamera(cyclistRoot);
  }

  public animateCyclistToPosition(
    targetPosition: Vector3,
    duration: number = 2000
  ): void {
    if (!this._cyclist) return;

    const startPosition = this._cyclist.position.clone();
    const direction = targetPosition.subtract(startPosition);

    this._cyclist.lookAt(targetPosition);

    const moveAnimation = new Animation(
      "cyclistMove",
      "position",
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keys = [
      { frame: 0, value: startPosition },
      { frame: 60 * (duration / 1000), value: targetPosition },
    ];

    moveAnimation.setKeys(keys);
    this._cyclist.animations = [moveAnimation];

    this._scene.beginAnimation(this._cyclist, 0, 60 * (duration / 1000), false);

    for (const animGroup of this._cyclistAnimations) {
      if (animGroup.name.includes("Ride") || animGroup.name.includes("Cycle")) {
        animGroup.play(true);
        break;
      }
    }
  }

  public disposeCyclist(): void {
    if (!this._cyclist) return;

    for (const animGroup of this._cyclistAnimations) {
      animGroup.dispose();
    }
    this._cyclistAnimations = [];

    this._cyclist.dispose();
    this._cyclist = undefined;

    if (this.cyclistCamera) {
      this.cyclistCamera.dispose();
      this.cyclistCamera = undefined;
    }
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
