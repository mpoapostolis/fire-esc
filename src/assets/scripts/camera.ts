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

    // Detach controls
    this.camera.detachControl();

    // Switch to top-down view
    this.camera.alpha = 0;
    this.camera.beta = 0.01; // Almost straight down
    this.camera.radius = 120;
    this.camera.lowerRadiusLimit = 120;
    this.camera.upperRadiusLimit = 120;

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