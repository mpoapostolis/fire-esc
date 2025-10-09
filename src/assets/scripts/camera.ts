import { Scene, Vector3, ArcRotateCamera } from "@babylonjs/core";

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

export class GameCamera {
  public readonly camera: ArcRotateCamera;
  private _savedAlpha: number = 0;
  private _savedBeta: number = 0;
  private _savedRadius: number = 0;
  private _isMapView: boolean = false;

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

  public switchToTopDownView(): void {
    if (this._isMapView) return;

    // Save current camera position
    this._savedAlpha = this.camera.alpha;
    this._savedBeta = this.camera.beta;
    this._savedRadius = this.camera.radius;

    // Switch to 45-degree angled city view with rotation enabled
    this.camera.alpha = -Math.PI / 2; // Face north
    this.camera.beta = Math.PI / 4; // 45 degrees angle
    this.camera.radius = 80; // Closer to see details
    this.camera.lowerRadiusLimit = 50;
    this.camera.upperRadiusLimit = 120;

    // Set fixed target position at center of city (0, 0, 0)
    this.camera.target = new Vector3(0, 0, 0);

    // Keep controls attached for rotation
    // Camera stays attached so user can rotate and zoom

    this._isMapView = true;
  }

  public switchToNormalView(): void {
    if (!this._isMapView) return;

    // Restore camera position
    this.camera.alpha = this._savedAlpha;
    this.camera.beta = this._savedBeta;
    this.camera.radius = this._savedRadius;
    this.camera.lowerRadiusLimit = DEFAULT_CAMERA_CONFIG.radiusLimits.min;
    this.camera.upperRadiusLimit = DEFAULT_CAMERA_CONFIG.radiusLimits.max;

    // Reattach controls
    const canvas = this._scene.getEngine().getRenderingCanvas();
    if (canvas) this.camera.attachControl(canvas, true);

    this._isMapView = false;
  }

  public get isMapView(): boolean {
    return this._isMapView;
  }
}