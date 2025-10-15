import { Scene, Vector3, ArcRotateCamera, type Vector } from "@babylonjs/core";

interface CameraConfig {
  readonly alpha: number;
  readonly beta: number;
  readonly radius: number;
  readonly radiusLimits: { min: number; max: number };
  readonly betaLimits: { min: number; max: number };
  readonly sensitivity: number;
}

const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  alpha: -Math.PI / 2,
  beta: Math.PI / 2.5,
  radius: 15,
  radiusLimits: { min: 2, max: 5 },
  betaLimits: { min: 0.1, max: Math.PI / 2.2 },
  sensitivity: 2000,
};

export type idsOfObjects = "billboard";
const idToV3: Record<idsOfObjects, Vector3> = {
  billboard: new Vector3(-35.5, 13, 3),
};

export type View = "word_view" | "map_view" | "object_view";
export class GameCamera {
  public readonly camera: ArcRotateCamera;
  private _savedAlpha: number = 0;
  private _savedBeta: number = 0;
  private _savedRadius: number = 0;
  private view: View = "word_view";

  // Animation settings for smooth transitions
  private static readonly TRANSITION_SPEED = 0.1;

  constructor(
    private readonly _scene: Scene,
    config: Partial<CameraConfig> = {}
  ) {
    const finalConfig = { ...DEFAULT_CAMERA_CONFIG, ...config };
    this.camera = this._createCamera(finalConfig);
  }

  private _createCamera(config: CameraConfig): ArcRotateCamera {
    const camera = new ArcRotateCamera(
      "thirdPersonCamera",
      config.alpha,
      config.beta,
      config.radius,
      Vector3.Zero(),
      this._scene
    );

    camera.lowerRadiusLimit = config.radiusLimits.min;
    camera.upperRadiusLimit = config.radiusLimits.max;
    camera.lowerBetaLimit = config.betaLimits.min;
    camera.upperBetaLimit = config.betaLimits.max;
    camera.angularSensibilityX = config.sensitivity;
    camera.angularSensibilityY = config.sensitivity;

    // Performance optimizations
    camera.useAutoRotationBehavior = false;
    camera.useFramingBehavior = false;
    camera.useBouncingBehavior = false;
    camera.panningSensibility = 0; // Disable panning for better performance
    camera.speed = 2; // Optimize camera speed

    const canvas = this._scene.getEngine().getRenderingCanvas();
    if (canvas) camera.attachControl(canvas, true);

    return camera;
  }

  public switchToMapView(): void {
    if (this.view === "map_view") return;

    // Save current camera position
    this._savedAlpha = this.camera.alpha;
    this._savedBeta = this.camera.beta;
    this._savedRadius = this.camera.radius;

    // Calculate responsive camera distance based on device width
    const screenWidth = window.innerWidth;
    let radius: number;
    let lowerLimit: number;
    let upperLimit: number;

    if (screenWidth < 768) {
      // Mobile: Need to zoom out more to see whole city
      radius = 120;
      lowerLimit = 80;
      upperLimit = 200;
    } else if (screenWidth < 1024) {
      // Tablet
      radius = 100;
      lowerLimit = 70;
      upperLimit = 150;
    } else {
      // Desktop: Can be closer
      radius = 80;
      lowerLimit = 10;
      upperLimit = 120;
    }

    this.camera.position.set(-radius, radius, -radius);
    // this.camera.detachControl();

    // Switch to 45-degree angled city view with rotation enabled
    this.camera.alpha = -Math.PI / 2; // Face north
    this.camera.beta = Math.PI / 4; // 45 degrees angle
    this.camera.radius = radius;
    this.camera.lowerRadiusLimit = lowerLimit;
    this.camera.upperRadiusLimit = upperLimit;

    // Set fixed target position at center of city (0, 0, 0)
    this.camera.target = new Vector3(0, 0, 0);

    // Keep controls attached for rotation
    // Camera stays attached so user can rotate and zoom

    this.view = "map_view";
  }

  public switchToObjectView(id: idsOfObjects): void {
    if (this.view === "object_view") return;
    // Save current camera state for smooth return
    this._savedAlpha = this.camera.alpha;
    this._savedBeta = this.camera.beta;
    this._savedRadius = this.camera.radius;

    this.camera.alpha = -Math.PI / 2; // Always view from the 'north'
    this.camera.beta = Math.PI; // 60 degrees from vertical
    this.camera.upperRadiusLimit = 13;
    this.camera.lowerRadiusLimit = 13;

    const v3 = idToV3[id];
    this.camera.target.copyFrom(v3);

    this.view = "object_view";
  }

  public switchToNormalView(): void {
    if (this.view === "word_view") return;

    // Restore camera position
    this.camera.alpha = this._savedAlpha;
    this.camera.beta = this._savedBeta;
    this.camera.radius = this._savedRadius;
    this.camera.lowerRadiusLimit = DEFAULT_CAMERA_CONFIG.radiusLimits.min;
    this.camera.upperRadiusLimit = DEFAULT_CAMERA_CONFIG.radiusLimits.max;

    // Reattach controls
    const canvas = this._scene.getEngine().getRenderingCanvas();
    if (canvas) this.camera.attachControl(canvas, true);

    this.view = "word_view";
  }

  public get getView(): View {
    return this.view;
  }
}
