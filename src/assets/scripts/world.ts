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
  DynamicTexture,
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
  cityModel: "city-white.glb",
  cyclistModel: "cyclist.glb",
  skyboxUrl: "/skybox/",
  lightIntensity: 0.7,
  skyboxSize: 1000,
};

export class World {
  public cyclistCamera?: ArcRotateCamera;

  private readonly _scene: Scene;
  private readonly _config: WorldConfig;
  private readonly _firePoints = new Map<number, Mesh>();
  private readonly _fireParticleSystems: IParticleSystem[] = [];
  private readonly _teleportButtons = new Map<number, Mesh>();
  private _cyclist?: AbstractMesh;
  private _cyclistAnimations: AnimationGroup[] = [];
  private _shadowGenerator?: ShadowGenerator;
  private _pipeline?: DefaultRenderingPipeline;

  // Cache for optimized lookups
  private readonly _meshCache = new Map<string, AbstractMesh>();
  private _isWorldLoaded = false;

  constructor(scene: Scene, config: Partial<WorldConfig> = {}) {
    this._scene = scene;
    this._config = { ...DEFAULT_WORLD_CONFIG, ...config };
  }

  public async load(): Promise<void> {
    if (this._isWorldLoaded) return;

    this._createLight();
    this._createSkybox();
    await this._createEnvironment();
    this._setupAtmosphere();
    this._isWorldLoaded = true;
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
    // Dispose in reverse order for better performance
    for (let i = this._fireParticleSystems.length - 1; i >= 0; i--) {
      this._fireParticleSystems[i].dispose();
    }
    this._fireParticleSystems.length = 0;
  }

  public setFiresVisible(visible: boolean): void {
    for (const system of this._fireParticleSystems) {
      if (visible) {
        system.start();
      } else {
        system.stop();
      }
    }
  }

  public createTeleportButtons(quests: Quest[]): void {
    quests.forEach((quest, index) => {
      const number = index + 1;

      // Create invisible parent mesh for positioning
      const button = MeshBuilder.CreateBox(
        `teleportButton-${quest.id}`,
        { size: 0.1 },
        this._scene
      );
      button.position.set(quest.point.x, 5, quest.point.z);
      button.isVisible = true; // Always invisible
      button.isPickable = false; // Not pickable itself

      // Create number label plane with text texture - this is the actual button
      const numberPlane = MeshBuilder.CreatePlane(
        `numberLabel-${quest.id}`,
        { width: 6, height: 6 },
        this._scene
      );
      numberPlane.position.y = 0;
      numberPlane.parent = button;
      numberPlane.billboardMode = 7; // Always face camera
      numberPlane.isVisible = false; // Hidden by default
      numberPlane.isPickable = true; // This is the clickable button

      // Create dynamic texture with cartoon number
      const textureSize = 512;
      const dynamicTexture = new DynamicTexture(
        `numberTexture-${quest.id}`,
        textureSize,
        this._scene,
        false
      );

      const ctx = dynamicTexture.getContext();

      // Clear with transparent background
      ctx.clearRect(0, 0, textureSize, textureSize);

      // Draw cartoon circle background
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(
        textureSize / 2,
        textureSize / 2,
        textureSize / 2 - 20,
        0,
        2 * Math.PI
      );
      ctx.fill();

      // Draw black outline
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 16;
      ctx.stroke();

      // Draw number with cartoon style
      ctx.fillStyle = "#000000";
      ctx.font = "bold 320px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(number.toString(), textureSize / 2, textureSize / 2);

      dynamicTexture.update();

      const numberMat = new StandardMaterial(
        `numberMat-${quest.id}`,
        this._scene
      );
      numberMat.diffuseTexture = dynamicTexture;
      numberMat.emissiveTexture = dynamicTexture;
      numberMat.opacityTexture = dynamicTexture;
      numberMat.disableLighting = true;
      numberMat.backFaceCulling = false;
      numberPlane.material = numberMat;

      // Store button reference
      this._teleportButtons.set(quest.id, button);
    });
  }

  public setTeleportButtonsVisible(visible: boolean): void {
    for (const button of this._teleportButtons.values()) {
      button.isVisible = visible;
      button.isPickable = visible;
      // Also hide/show all children (number labels)
      button.getChildMeshes().forEach((child) => {
        child.isVisible = visible;
      });
    }
  }

  public getTeleportButtonMesh(questId: number): Mesh | null {
    return this._teleportButtons.get(questId) ?? null;
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
    // Indie game warm lighting
    const hemispheric = new HemisphericLight(
      "hemisphericLight",
      Vector3.UpReadOnly,
      this._scene
    );
    hemispheric.intensity = 0.65;
    hemispheric.groundColor = new Color3(0.4, 0.3, 0.2);
    hemispheric.diffuse = new Color3(1.0, 0.8, 0.6);

    // Warm sun
    const directional = new DirectionalLight(
      "directionalLight",
      new Vector3(-1, -2, -1),
      this._scene
    );
    directional.position = new Vector3(50, 100, 50);
    directional.intensity = 0.9;
    directional.diffuse = new Color3(1.0, 0.75, 0.5);

    // Optimized shadows - 1024 is enough
    this._shadowGenerator = new ShadowGenerator(1024, directional);
    this._shadowGenerator.useBlurExponentialShadowMap = true;
    this._shadowGenerator.blurKernel = 16; // Optimized blur
    this._shadowGenerator.darkness = 0.4;
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

    // Batch mesh processing for better performance
    const meshesToProcess: Mesh[] = [];
    for (const mesh of result.meshes) {
      mesh.layerMask = 1;

      if (mesh.name !== "__root__" && mesh instanceof Mesh) {
        meshesToProcess.push(mesh);
        this._meshCache.set(mesh.name, mesh);
      }
    }

    // Process meshes in batch
    for (const mesh of meshesToProcess) {
      this._setupStaticMeshPhysics(mesh);
      this._optimizeMesh(mesh);
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
    mesh.doNotSyncBoundingInfo = true;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
  }

  private _setupPostProcessing(): void {
    const camera = this._scene.activeCamera;
    if (!camera) return;

    this._pipeline = new DefaultRenderingPipeline(
      "pipeline",
      true, // HDR for indie colors
      this._scene,
      [camera]
    );

    // Optimized bloom - still looks good
    this._pipeline.bloomEnabled = true;
    this._pipeline.bloomThreshold = 0.75;
    this._pipeline.bloomWeight = 0.25;
    this._pipeline.bloomKernel = 32; // Reduced from 64 for performance
    this._pipeline.bloomScale = 0.5;

    // Indie game color grading - optimized
    this._pipeline.imageProcessingEnabled = true;
    if (this._pipeline.imageProcessing) {
      this._pipeline.imageProcessing.contrast = 1.15;
      this._pipeline.imageProcessing.exposure = 1.25;
      this._pipeline.imageProcessing.toneMappingEnabled = true;
      this._pipeline.imageProcessing.toneMappingType = 1; // ACES

      // Warm colors
      this._pipeline.imageProcessing.colorCurvesEnabled = true;
      if (this._pipeline.imageProcessing.colorCurves) {
        this._pipeline.imageProcessing.colorCurves.globalHue = 10;
        this._pipeline.imageProcessing.colorCurves.globalSaturation = 25;
      }

      // Light vignette
      this._pipeline.imageProcessing.vignetteEnabled = true;
      this._pipeline.imageProcessing.vignetteWeight = 0.3;
      this._pipeline.imageProcessing.vignetteStretch = 0.5;
    }

    // Efficient antialiasing
    this._pipeline.fxaaEnabled = true;
    this._pipeline.samples = 2; // Reduced from 4, still looks clean
  }

  private _setupAtmosphere(): void {
    // No fog - clean view
    this._scene.fogEnabled = false;
    this._scene.clearColor = new Color3(0.7, 0.8, 0.95).toColor4(1); // Light blue sky
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
