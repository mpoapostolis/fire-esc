import {
  Scene,
  Vector3,
  HemisphericLight,
  Color3,
  Color4,
  CubeTexture,
  DefaultRenderingPipeline,
  DirectionalLight,
  DynamicTexture,
  GroundMesh,
  Mesh,
  MeshBuilder,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeMesh,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  SceneLoader,
  Ray,
  AbstractMesh,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import type { Quest } from "./quests/quests";

interface WorldConfig {
  readonly skyboxUrl: string;
  readonly lightIntensity: number;
  readonly skyboxSize: number;
}

const DEFAULT_WORLD_CONFIG: WorldConfig = {
  skyboxUrl: "/skybox/",
  lightIntensity: 0.7,
  skyboxSize: 1000,
};

export class World {
  private readonly _scene: Scene;
  private readonly _config: WorldConfig;
  private readonly _teleportButtons = new Map<number, Mesh>();
  private readonly _firePoints = new Map<number, Mesh>();
  private _shadowGenerator?: ShadowGenerator;
  private _pipeline?: DefaultRenderingPipeline;
  private _worldMeshes: AbstractMesh[] = [];
  private _isWorldLoaded = false;

  constructor(scene: Scene, config: Partial<WorldConfig> = {}) {
    this._scene = scene;
    this._config = { ...DEFAULT_WORLD_CONFIG, ...config };
  }

  public async load(): Promise<void> {
    if (this._isWorldLoaded) return;
    this._createLight();
    this._createSkybox();
    await this._loadWorldModel();
    this._isWorldLoaded = true;
  }

  /** Get the terrain height at world coords. Returns 0 if model not ready. */
  public getGroundHeightAt(x: number, z: number): number {
    if (this._worldMeshes.length === 0) return 0;

    // Raycast from sky downwards to find the ground height at (x, z)
    const ray = new Ray(new Vector3(x, 1000, z), new Vector3(0, -1, 0), 2000);
    const pickInfo = this._scene.pickWithRay(ray, (m) =>
      this._worldMeshes.includes(m),
    );

    if (pickInfo?.hit && pickInfo.pickedPoint) {
      return pickInfo.pickedPoint.y;
    }
    return 0;
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
      if (quest.isFake) continue;

      // Parent container - hidden by default
      const parent = new Mesh(`firePoint-${quest.id}`, this._scene);
      parent.position.set(quest.point.x, 0, quest.point.z);
      parent.isPickable = false;
      parent.setEnabled(false);

      // Big glowing cube - the main point of interest marker
      const cube = MeshBuilder.CreateBox(
        `questCube-${quest.id}`,
        { size: 2.5 },
        this._scene,
      );
      cube.position.y = 4;
      cube.parent = parent;
      cube.isPickable = false;

      const cubeMat = new StandardMaterial(
        `questCubeMat-${quest.id}`,
        this._scene,
      );
      cubeMat.emissiveColor = new Color3(0, 0.5, 1);
      cubeMat.diffuseColor = new Color3(0, 0.3, 1);
      cubeMat.specularColor = new Color3(1, 1, 1);
      cubeMat.disableLighting = true;
      cube.material = cubeMat;

      // Vertical beam shooting up from the ground
      const beam = MeshBuilder.CreateCylinder(
        `questBeam-${quest.id}`,
        { height: 30, diameterTop: 0.3, diameterBottom: 1.5, tessellation: 8 },
        this._scene,
      );
      beam.position.y = 15;
      beam.parent = parent;
      beam.isPickable = false;

      const beamMat = new StandardMaterial(
        `questBeamMat-${quest.id}`,
        this._scene,
      );
      beamMat.emissiveColor = new Color3(0.2, 0.6, 1);
      beamMat.alpha = 0.4;
      beamMat.disableLighting = true;
      beamMat.backFaceCulling = false;
      beam.material = beamMat;

      // Ground ring
      const ring = MeshBuilder.CreateTorus(
        `questRing-${quest.id}`,
        { diameter: 6, thickness: 0.4, tessellation: 32 },
        this._scene,
      );
      ring.position.y = 0.2;
      ring.parent = parent;
      ring.isPickable = false;

      const ringMat = new StandardMaterial(
        `questRingMat-${quest.id}`,
        this._scene,
      );
      ringMat.emissiveColor = new Color3(0, 0.5, 1);
      ringMat.alpha = 0.8;
      ringMat.disableLighting = true;
      ring.material = ringMat;

      // Animate
      this._scene.registerBeforeRender(() => {
        if (!parent.isEnabled()) return;
        cube.rotation.y += 0.02;
        cube.rotation.x += 0.01;
        cube.position.y = 4 + Math.sin(Date.now() * 0.002) * 0.8;
        ring.rotation.y += 0.01;
      });

      this._firePoints.set(quest.id, parent);
    }
  }

  public showFirePoint(id: number): void {
    // Hide all first
    for (const fp of this._firePoints.values()) {
      fp.setEnabled(false);
    }
    // Show only the requested one
    const firePoint = this._firePoints.get(id);
    if (firePoint) firePoint.setEnabled(true);
  }

  public hideAllFirePoints(): void {
    for (const fp of this._firePoints.values()) {
      fp.setEnabled(false);
    }
  }

  public getFirePointPosition(id: number): Vector3 | null {
    const firePoint = this._firePoints.get(id);
    if (!firePoint) return null;
    return firePoint.position.clone();
  }

  public createTeleportButtons(quests: Quest[]): void {
    quests.forEach((quest) => {
      // Create invisible parent mesh for positioning
      const button = MeshBuilder.CreateBox(
        `teleportButton-${quest.id}`,
        { size: 0.1 },
        this._scene,
      );
      button.position.set(quest.spawn_point.x, 0.5, quest.spawn_point.z);
      button.isVisible = false;
      button.isPickable = false;

      // Create label plane - this is the actual clickable button
      const numberPlane = MeshBuilder.CreatePlane(
        `numberLabel-${quest.id}`,
        { width: 8, height: 8 },
        this._scene,
      );
      numberPlane.position.y = 10;
      numberPlane.parent = button;
      numberPlane.billboardMode = 7; // Always face camera
      numberPlane.isVisible = false;
      numberPlane.isPickable = true;

      // Create dynamic texture with location name
      const textureSize = 512;
      const dynamicTexture = new DynamicTexture(
        `numberTexture-${quest.id}`,
        textureSize,
        this._scene,
        false,
      );

      const ctx = dynamicTexture.getContext();
      const centerX = textureSize / 2;
      const centerY = textureSize / 2;
      const radius = textureSize / 2 - 20;

      // Shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 10;

      // Main Circle Background
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = quest.isFake ? "#f8fafc" : "#f0f9ff";
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Border ring - blue for flood theme
      ctx.lineWidth = 15;
      ctx.strokeStyle = quest.isFake ? "#64748b" : "#3b82f6";
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 20, 0, Math.PI * 2);
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Location name text - fit within circle
      const title = quest.title;
      ctx.fillStyle = "#1e293b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Auto-size font to fit
      let fontSize = 100;
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      while (ctx.measureText(title).width > radius * 1.4 && fontSize > 30) {
        fontSize -= 5;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      }

      ctx.fillText(title, centerX, centerY + 5);

      dynamicTexture.update();

      const numberMat = new StandardMaterial(
        `numberMat-${quest.id}`,
        this._scene,
      );
      numberMat.diffuseTexture = dynamicTexture;
      numberMat.emissiveColor = new Color3(0.8, 0.8, 0.8);
      numberMat.opacityTexture = dynamicTexture;
      numberMat.disableLighting = true;
      numberMat.backFaceCulling = false;
      numberMat.disableDepthWrite = false;
      numberPlane.material = numberMat;

      // Create vertical line - stop before reaching the circle to avoid overlapping text
      const absolutePlaneY = button.position.y + numberPlane.position.y;
      const lineHeight = absolutePlaneY - 6; // Stop ~6 units below the circle center
      const line = MeshBuilder.CreateCylinder(
        `teleportLine-${quest.id}`,
        {
          height: lineHeight,
          diameter: 0.2,
        },
        this._scene,
      );
      line.parent = button;
      line.position.y = lineHeight / 2 - button.position.y;
      line.isPickable = false;
      line.isVisible = false;

      const lineMat = new StandardMaterial(`lineMat-${quest.id}`, this._scene);
      lineMat.emissiveColor = new Color3(0, 0, 0);
      lineMat.disableLighting = true;
      line.material = lineMat;

      // Store button reference
      this._teleportButtons.set(quest.id, button);
    });
  }

  public setTeleportButtonsVisible(visible: boolean): void {
    for (const button of this._teleportButtons.values()) {
      button.isVisible = visible;
      button.isPickable = visible;
      button.getChildMeshes().forEach((child) => {
        child.isVisible = visible;
      });
    }
  }

  private async _loadWorldModel(): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "/models/",
      "island city 3.glb",
      this._scene,
    );

    this._worldMeshes = result.meshes;

    for (const mesh of this._worldMeshes) {
      mesh.receiveShadows = true;
      mesh.isPickable = true;

      if (mesh.getTotalVertices() > 0) {
        const body = new PhysicsBody(
          mesh,
          PhysicsMotionType.STATIC,
          false,
          this._scene,
        );
        body.shape = new PhysicsShapeMesh(mesh as Mesh, this._scene);

        if (this._shadowGenerator) {
          this._shadowGenerator.addShadowCaster(mesh);
        }
      }
    }
  }

  private _createSkybox(): void {
    const skybox = MeshBuilder.CreateBox(
      "skyBox",
      { size: this._config.skyboxSize },
      this._scene,
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
      this._scene,
    );
    reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    material.reflectionTexture = reflectionTexture;

    skybox.material = material;
  }

  private _createLight(): void {
    const hemispheric = new HemisphericLight(
      "hemisphericLight",
      Vector3.UpReadOnly,
      this._scene,
    );
    hemispheric.intensity = 0.65;
    hemispheric.groundColor = new Color3(0.4, 0.3, 0.2);
    hemispheric.diffuse = new Color3(1, 0.9, 0.8);

    const directional = new DirectionalLight(
      "directionalLight",
      new Vector3(-1, -2, -1),
      this._scene,
    );
    directional.position = new Vector3(50, 100, 50);
    directional.intensity = 0.9;
    directional.diffuse = new Color3(1, 0.95, 0.85);

    this._shadowGenerator = new ShadowGenerator(1024, directional);
    this._shadowGenerator.useBlurExponentialShadowMap = true;
    this._shadowGenerator.blurKernel = 16;
    this._shadowGenerator.darkness = 0.4;
  }

  private _setupPostProcessing(): void {
    const camera = this._scene.activeCamera;
    if (!camera) return;

    this._pipeline = new DefaultRenderingPipeline(
      "pipeline",
      true,
      this._scene,
      [camera],
    );

    this._pipeline.bloomEnabled = true;
    this._pipeline.bloomThreshold = 0.75;
    this._pipeline.bloomWeight = 0.25;
    this._pipeline.bloomKernel = 32;
    this._pipeline.bloomScale = 0.5;

    this._pipeline.imageProcessingEnabled = true;
    if (this._pipeline.imageProcessing) {
      this._pipeline.imageProcessing.colorCurvesEnabled = true;
      this._pipeline.imageProcessing.vignetteEnabled = true;
      this._pipeline.imageProcessing.vignetteWeight = 0.3;
      this._pipeline.imageProcessing.vignetteStretch = 0.5;
    }

    this._pipeline.fxaaEnabled = true;
    this._pipeline.samples = 2;
  }
}
