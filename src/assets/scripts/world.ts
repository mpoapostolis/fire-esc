import {
  Scene,
  Vector3,
  HemisphericLight,
  SceneLoader,
  AbstractMesh,
  Animation,
  AnimationGroup,
  ArcRotateCamera,
  Color3,
  Color4,
  CubeTexture,
  DefaultRenderingPipeline,
  DirectionalLight,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeMesh,
  Scalar,
  ShadowGenerator,
  SpotLight,
  StandardMaterial,
  Texture,
  PointLight, // Added PointLight
  type ISceneLoaderAsyncResult,
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
    position: new Vector3(0, -6, 0),
    rotation: new Vector3(0, 0, 0),
  },
};

const DEFAULT_WORLD_CONFIG: WorldConfig = {
  modelPath: "/models/",
  cityModel: "xx.glb",
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
  private _shadowGenerator?: ShadowGenerator;
  private _pipeline?: DefaultRenderingPipeline;

  // Generic character system
  private readonly _questCharacters = new Map<number, AbstractMesh>();
  private readonly _characterAnimations = new Map<number, AnimationGroup[]>();

  // Cache for optimized lookups

  // Cache for optimized lookups
  private readonly _meshCache = new Map<string, AbstractMesh>();
  private _isWorldLoaded = false;

  constructor(scene: Scene, config: Partial<WorldConfig> = {}) {
    this._scene = scene;
    this._config = { ...DEFAULT_WORLD_CONFIG, ...config };
  }

  public async load(): Promise<void> {
    if (this._isWorldLoaded) return;
    // this._scene.onPointerDown = (evt, pickInfo) => {
    //   console.log(pickInfo);
    // };

    this._createLight();
    this._createSkybox();
    await this._createEnvironment();
    // this._setupAtmosphere();
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
      // Just store position reference or whatever logic is needed for tracking
      // We no longer create sphere meshes for fire points as they are replaced by characters
      // If logic relies on _firePoints existing, we might need to keep empty meshes or update logic.
      // For now, let's keep invisible markers just in case collision/logic depends on it
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
    // Previously showed fire/aid kit. Now we load the character.
    // We need access to the quest data to know which character to load.
    // However, this method only takes an ID.
    // We'll rely on the caller to handle specific character loading if needed,
    // OR we need to pass the character model name here.
    // Wait, the quests array is available in quests.ts but World doesn't import 'quests' value directly to avoid circular deps maybe?
    // But World imports 'Quest' type.

    // Instead of re-fetching quest data here which might be complex without the QuestManager,
    // let's assume this method is changing purpose. 
    // The implementation plan said: "Implement loadQuestCharacter(quest: Quest)".
    // So distinct from showFireAtPoint.

    // However, the Game class probably calls `showFireAtPoint`. 
    // Ideally we update Game class too, but let's see if we can adapt this method or add a new one.
    // For now, I will implement `loadQuestCharacter` and leave `showFireAtPoint` as a deprecated/empty shell or proxy if possible.
    // But since I don't have the Quest object here, I cannot know which GLB to load.

    // Let's implement `loadQuestCharacter` and I will update the Game class/QuestManager to call THAT instead of showFireAtPoint.
    // Or simpler: The user task said "each quest now instead of fire should load the character glb".

    console.warn("showFireAtPoint is deprecated. Use loadQuestCharacter instead.");
  }

  public async loadQuestCharacter(quest: Quest): Promise<void> {
    if (this._questCharacters.has(quest.id)) {
      const char = this._questCharacters.get(quest.id);
      if (char) {
        char.setEnabled(true);
        return;
      }
    }

    if (!quest.character) {
      console.warn(`Quest ${quest.id} has no character model defined.`);
      // Fallback or just return? Let's fallback to aid kit if strictly needed, but goal is character.
      // Let's return to avoid breaking if no model.
      return;
    }

    try {
      console.log(`Loading character for Quest ${quest.id}: ${quest.character}`);
      const result = await SceneLoader.ImportMeshAsync(
        "",
        this._config.modelPath,
        quest.character,
        this._scene
      );

      const root = new Mesh(`questCharacter-${quest.id}`, this._scene);
      const kit = await SceneLoader.ImportMeshAsync(
        "",
        this._config.modelPath,
        "aid_kit.glb",
        this._scene
      );
      kit.meshes[0].parent = root;
      kit.meshes[0].position.set(2, 0, 2);
      kit.meshes[0].scaling.set(0.7, 0.7, 0.7);
      root.scaling.set(0.7, 0.7, 0.7);
      root.position.set(quest.point.x, 2.2, quest.point.z);
      // root.scaling.set(1.5, 1.5, 1.5); // Ensure they are visible size

      // If it's Nikos or generic, maybe rotation needs adjustment?
      // Default to facing somewhat towards camera or origin?
      // root.lookAt(new Vector3(0, 2, 0));      

      // --- SELECTION DECAL (Requested by User) ---
      // Ground mesh with dynamic texture for a clean selection ring
      const decalSize = 2.5;
      const decal = MeshBuilder.CreateGround(`questDecal_${quest.id}`, { width: decalSize, height: decalSize }, this._scene);
      decal.parent = root;
      decal.position.y = -0.3; // Slightly above ground to prevent Z-fighting

      const decalTexture = new DynamicTexture(`decalTex_${quest.id}`, { width: 512, height: 512 }, this._scene);
      const ctx = decalTexture.getContext();
      const cx = 256;
      const cy = 256;
      const r = 240;

      // Draw Cyan Glow Ring
      ctx.clearRect(0, 0, 512, 512);

      // Outer glow
      const gradient = ctx.createRadialGradient(cx, cy, r - 40, cx, cy, r);
      gradient.addColorStop(0, "rgba(0, 255, 255, 0)");
      gradient.addColorStop(0.5, "rgba(0, 255, 255, 0.8)"); // Cyan
      gradient.addColorStop(1, "rgba(0, 255, 255, 0)");

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Sharp inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, r - 20, 0, Math.PI * 2);
      ctx.lineWidth = 15;
      ctx.strokeStyle = "rgba(0, 255, 255, 0.9)";
      ctx.stroke();

      decalTexture.update();
      decalTexture.hasAlpha = true;

      const decalMat = new StandardMaterial(`decalMat_${quest.id}`, this._scene);
      decalMat.diffuseTexture = decalTexture;
      decalMat.opacityTexture = decalTexture;
      decalMat.emissiveColor = new Color3(0, 1, 1); // Glow self-lit
      decalMat.disableLighting = true;
      decalMat.useAlphaFromDiffuseTexture = true;
      decal.material = decalMat;

      // Slow breathing animation
      const decalAnim = new Animation("decalPulse", "scaling", 30, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
      decalAnim.setKeys([
        { frame: 0, value: new Vector3(1, 1, 1) },
        { frame: 60, value: new Vector3(1.1, 1.1, 1.1) },
        { frame: 120, value: new Vector3(1, 1, 1) }
      ]);
      decal.animations.push(decalAnim);
      this._scene.beginAnimation(decal, 0, 120, true);

      // Removed Bubbles as per user request.

      for (const mesh of result.meshes) {
        if (mesh.parent === null) mesh.parent = root;
        mesh.isVisible = true;
        if (mesh instanceof Mesh) {
          mesh.receiveShadows = true;
          if (this._shadowGenerator) {
            this._shadowGenerator.addShadowCaster(mesh);
          }
        }
      }

      this._questCharacters.set(quest.id, root);
      this._characterAnimations.set(quest.id, result.animationGroups);

      // Play idle animation if exists
      if (result.animationGroups.length > 0) {
        // Check for "Idle" or similar, or just play first
        const idle = result.animationGroups.find(a => a.name.toLowerCase().includes("idle")) || result.animationGroups[0];
        idle.play(true);
      }

      // ADD QUEST MARKER (!) ABOVE CHARACTER HEAD
      this._addQuestMarker(root, quest.id);

    } catch (e) {
      console.error(`Failed to load character ${quest.character} for quest ${quest.id}`, e);
    }
  }

  private _addQuestMarker(characterRoot: AbstractMesh, questId: number): void {
    // Create exclamation mark above character
    const marker = MeshBuilder.CreatePlane(`questMarker_${questId}`, {
      size: 1.2,
      sideOrientation: Mesh.DOUBLESIDE
    }, this._scene);

    marker.position.y = 2.2; // Lower position
    marker.parent = characterRoot;
    marker.billboardMode = Mesh.BILLBOARDMODE_ALL; // Always face camera

    // Create material (NO glow/sparkles)
    const material = new StandardMaterial(`questMarkerMat_${questId}`, this._scene);
    material.diffuseColor = new Color3(1, 1, 1);
    material.emissiveColor = new Color3(0, 0, 0); // No glow
    material.disableLighting = false;

    // Create texture with "!"
    const dynamicTexture = new DynamicTexture(`questMarkerTexture_${questId}`, 256, this._scene);
    const ctx = dynamicTexture.getContext();
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, 256, 256);
    ctx.font = "bold 200px Arial";
    ctx.fillStyle = "yellow";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 10;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("!", 128, 128);
    ctx.fillText("!", 128, 128);
    dynamicTexture.update();

    material.diffuseTexture = dynamicTexture;
    material.opacityTexture = dynamicTexture;
    marker.material = material;

    // Animate bobbing up and down
    const anim = new Animation(
      `questMarkerAnim_${questId}`,
      "position.y",
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );
    anim.setKeys([
      { frame: 0, value: 2.2 },
      { frame: 15, value: 2.6 },
      { frame: 30, value: 2.2 }
    ]);
    marker.animations.push(anim);
    this._scene.beginAnimation(marker, 0, 30, true);

    // Spotlight removed as per user request (focus on particles)
  }


  public hideAllFires(): void {
    // Hide all characters
    for (const char of this._questCharacters.values()) {
      char.setEnabled(false);
    }

    // Also clean up old fire systems if any exist (safety)
    for (let i = this._fireParticleSystems.length - 1; i >= 0; i--) {
      const system = this._fireParticleSystems[i];
      if ('stop' in system && typeof system.stop === 'function') system.stop();
      if ('dispose' in system && typeof system.dispose === 'function') system.dispose();
    }
    this._fireParticleSystems.length = 0;
  }

  public removeQuestCharacter(questId: number): void {
    const character = this._questCharacters.get(questId);
    if (character) {
      console.log(`Removing character for Quest ${questId}`);
      character.dispose();
      this._questCharacters.delete(questId);
    }

    const animations = this._characterAnimations.get(questId);
    if (animations) {
      animations.forEach(anim => anim.dispose());
      this._characterAnimations.delete(questId);
    }
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
      button.position.set(quest.spawn_point.x, 2, quest.spawn_point.z);
      button.isVisible = false; // Always invisible
      button.isPickable = false; // Not pickable itself

      // Create number label plane with text texture - this is the actual button
      const numberPlane = MeshBuilder.CreatePlane(
        `numberLabel-${quest.id}`,
        { width: 6, height: 6 },
        this._scene
      );
      numberPlane.position.y = 10;
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

      // Draw premium map marker
      const centerX = textureSize / 2;
      const centerY = textureSize / 2;
      const radius = textureSize / 2 - 20;

      // Shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 10;

      // Main Circle Background (White)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Reset shadow for inner elements
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Red Border/Ring (First Aid Theme)
      ctx.lineWidth = 15;
      ctx.strokeStyle = "#ef4444"; // Red-500
      ctx.stroke();

      // Inner thin ring for detail
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 20, 0, Math.PI * 2);
      ctx.strokeStyle = "#e5e7eb"; // Gray-200
      ctx.lineWidth = 2;
      ctx.stroke();

      // Number Text
      ctx.fillStyle = "#1e293b"; // Slate-800
      // Use a slightly smaller font to fit inside the rings comfortably
      ctx.font = "bold 280px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Slight offset y to visually center due to font metrics
      ctx.fillText(`${quest.mapq}`, centerX, centerY + 25);

      dynamicTexture.update();

      const numberMat = new StandardMaterial(
        `numberMat-${quest.id}`,
        this._scene
      );
      numberMat.diffuseTexture = dynamicTexture;
      numberMat.emissiveColor = new Color3(0.8, 0.8, 0.8); // Much less glow
      numberMat.opacityTexture = dynamicTexture;
      numberMat.disableLighting = true;
      numberMat.backFaceCulling = false;
      numberMat.disableDepthWrite = false;
      numberPlane.material = numberMat;

      // Render on top of everything
      // numberPlane.renderingGroupId = 1; // Higher rendering group = renders last (on top)

      // Create vertical line for the button
      const absolutePlaneY = button.position.y + numberPlane.position.y;
      const line = MeshBuilder.CreateCylinder(
        `teleportLine-${quest.id}`,
        {
          height: absolutePlaneY,
          diameter: 0.2,
        },
        this._scene
      );
      line.parent = button;
      line.position.y = absolutePlaneY / 2 - button.position.y;
      line.isPickable = false;
      line.isVisible = false;

      const lineMat = new StandardMaterial(`lineMat-${quest.id}`, this._scene);
      lineMat.emissiveColor = new Color3(0, 0, 0);
      lineMat.disableLighting = true;
      line.material = lineMat;
      // line.renderingGroupId = 1;

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
    skybox.isPickable = false;
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
    // Ambient light
    const hemispheric = new HemisphericLight(
      "hemisphericLight",
      Vector3.UpReadOnly,
      this._scene
    );
    hemispheric.intensity = 0.65;
    hemispheric.groundColor = new Color3(0.4, 0.3, 0.2);
    hemispheric.diffuse = new Color3(1, 0.9, 0.8);

    // Sun
    const directional = new DirectionalLight(
      "directionalLight",
      new Vector3(-1, -2, -1),
      this._scene
    );
    directional.position = new Vector3(50, 100, 50);
    directional.intensity = 0.9;
    directional.diffuse = new Color3(1, 0.95, 0.85)

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
    // mesh.isPickable = false;
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
      // this._pipeline.imageProcessing.contrast = 1.15;
      // this._pipeline.imageProcessing.exposure = 1.25;
      // this._pipeline.imageProcessing.toneMappingEnabled = true;
      // this._pipeline.imageProcessing.toneMappingType = 1; // ACES

      // Warm colors
      this._pipeline.imageProcessing.colorCurvesEnabled = true;
      if (this._pipeline.imageProcessing.colorCurves) {
        // this._pipeline.imageProcessing.colorCurves.globalHue = 10;
        // this._pipeline.imageProcessing.colorCurves.globalSaturation = 25;
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


  // --- GENERIC CINEMATIC SYSTEM ---

  // Active cinematic character tracking
  public cinematicCharacter?: AbstractMesh; public cinematicCamera?: ArcRotateCamera;
  private _cinematicAnimations: AnimationGroup[] = [];
  private _cinematicParticleSystem?: IParticleSystem;

  public getCinematicCharacter(): AbstractMesh | undefined {
    return this.cinematicCharacter;
  }

  public getCinematicCamera(): ArcRotateCamera | undefined {
    return this.cinematicCamera;
  }

  public async loadCinematicCharacter(
    modelName: string,
    spawnPosition: Vector3,
    scale: number = 1
  ): Promise<void> {
    // Cleanup any existing
    this.disposeCinematicCharacter();

    try {
      const result = await SceneLoader.ImportMeshAsync(
        "",
        this._config.modelPath,
        modelName + ".glb", // Assuming modelName is filename without extension or we handle it
        this._scene
      );

      const root = new Mesh("cinematicRoot", this._scene);
      root.scaling.set(scale, scale, scale);
      root.position.copyFrom(spawnPosition);
      root.rotation.y = Math.PI / 2; // 45 degrees clockwise

      for (const mesh of result.meshes) {
        if (mesh.parent === null) mesh.parent = root;
        mesh.isVisible = true;
        if (mesh instanceof Mesh) {
          mesh.receiveShadows = true;
          if (this._shadowGenerator) {
            this._shadowGenerator.addShadowCaster(mesh);
          }
        }
      }

      this.cinematicCharacter = root;
      this._cinematicAnimations = result.animationGroups;

      // Play idle if available
      if (this._cinematicAnimations.length > 0) {
        this._cinematicAnimations[0].play(true);
      }

      // Particles removed as per user request

      // Spotlight removed as per user request

      this._setupCinematicCamera(root);

    } catch (e) {
      console.error(`Failed to load cinematic character ${modelName}`, e);
    }
  }

  public async animateCinematicCharacter(
    targetPosition: Vector3,
    duration: number = 3000
  ): Promise<void> {
    if (!this.cinematicCharacter) return;

    const startPosition = this.cinematicCharacter.position.clone();


    const moveAnimation = new Animation(
      "cinematicMove",
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
    this.cinematicCharacter.animations.push(moveAnimation);

    return new Promise((resolve) => {
      const anim = this._scene.beginAnimation(
        this.cinematicCharacter,
        0,
        60 * (duration / 1000),
        false,
        1.0,
        () => resolve()
      );
    });
  }

  public disposeCinematicCharacter(): void {
    if (this.cinematicCharacter) {
      this.cinematicCharacter.dispose();
      this.cinematicCharacter = undefined;
    }

    for (const animGroup of this._cinematicAnimations) {
      animGroup.dispose();
    }
    this._cinematicAnimations = [];

    if (this._cinematicParticleSystem) {
      this._cinematicParticleSystem.stop();
      this._cinematicParticleSystem.dispose();
      this._cinematicParticleSystem = undefined;
    }

    if (this.cinematicCamera) {
      this.cinematicCamera.dispose();
      this.cinematicCamera = undefined;
    }
  }

  private _setupCinematicCamera(target: AbstractMesh): void {
    this.cinematicCamera = new ArcRotateCamera(
      "cinematicCamera",
      -Math.PI / 2,
      Math.PI / 2.5,
      10,
      target.position,
      this._scene
    );
    this.cinematicCamera.lockedTarget = target;
    this.cinematicCamera.setEnabled(false);
  }

}
