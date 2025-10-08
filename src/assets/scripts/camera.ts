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
}