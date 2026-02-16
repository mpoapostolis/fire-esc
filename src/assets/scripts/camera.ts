import {
  Scene,
  Vector3,
  ArcRotateCamera,
  type Vector,
  type PickingInfo,
  Animation,
  CubicEase,
  EasingFunction,
} from "@babylonjs/core";

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
  private map_center: Vector3 = new Vector3(0, 0, 0);
  private _onMapClickCallback: ((pickInfo: PickingInfo) => void) | null = null;

  // Animation settings for smooth transitions
  private static readonly TRANSITION_SPEED = 0.1;

  public onMapClick(callback: (pickInfo: PickingInfo) => void): void {
    this._onMapClickCallback = callback;
  }

  constructor(
    private readonly _scene: Scene,
    config: Partial<CameraConfig> = {}
  ) {
    const finalConfig = { ...DEFAULT_CAMERA_CONFIG, ...config };
    this.camera = this._createCamera(finalConfig);
  }

  private _createCamera(config: CameraConfig): ArcRotateCamera {
    this._scene.onPointerDown = undefined;
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
    this.map_center = new Vector3(0, 0, 0);

    // Track pointer to distinguish drag (rotate) from click (select)
    let pointerDownPos: { x: number; y: number } | null = null;
    const DRAG_THRESHOLD = 10;

    this._scene.onPointerDown = (evt) => {
      pointerDownPos = { x: evt.clientX, y: evt.clientY };
    };
    this._scene.onPointerUp = (evt, pickInfo) => {
      if (!pointerDownPos) return;
      const dx = evt.clientX - pointerDownPos.x;
      const dy = evt.clientY - pointerDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pointerDownPos = null;

      // If dragged, it's a rotation - don't select
      if (dist > DRAG_THRESHOLD) return;

      // Right click - pan to point
      if (pickInfo && pickInfo.hit && pickInfo.pickedPoint && evt.button === 2) {
        this.setTargetAnimated(pickInfo.pickedPoint);
      }
      // Left click - select point
      if (evt.button === 0 && this.view === "map_view" && this._onMapClickCallback && pickInfo) {
        this._onMapClickCallback(pickInfo);
      }
    };
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
      radius = 75;
      lowerLimit = 30;
      upperLimit = 75;
    }

    this.camera.position.set(-radius, radius, -radius);
    // this.camera.detachControl();

    // Switch to angled view with full rotation enabled
    this.camera.alpha = -Math.PI / 2;
    this.camera.beta = Math.PI / 4;
    this.camera.radius = radius;
    this.camera.lowerRadiusLimit = lowerLimit;
    this.camera.upperRadiusLimit = upperLimit;
    this.camera.lowerBetaLimit = 0.1;
    this.camera.upperBetaLimit = Math.PI / 2.2;

    this.camera.target = this.map_center;

    // Ensure controls are attached for drag-to-rotate
    const canvas = this._scene.getEngine().getRenderingCanvas();
    if (canvas) this.camera.attachControl(canvas, true);

    this.view = "map_view";
  }

  public switchToObjectView(id: idsOfObjects): void {
    if (this.view === "object_view") return;
    this._scene.onPointerDown = undefined;

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
    this._scene.onPointerDown = undefined;
    this._scene.onPointerUp = undefined;

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

  public setTargetAnimated(newTarget: Vector3): void {
    const scene = this._scene;
    const camera = this.camera;
    const frameRate = 30;

    // Stop any previous animations on the camera
    scene.stopAnimation(camera);
    camera.animations = [];

    const animation = new Animation(
      "cameraTargetAnimation",
      "target",
      frameRate,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keys = [
      { frame: 0, value: camera.target.clone() },
      { frame: frameRate, value: newTarget },
    ];

    animation.setKeys(keys);

    const easingFunction = new CubicEase();
    easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    animation.setEasingFunction(easingFunction);

    camera.animations.push(animation);

    scene.beginAnimation(camera, 0, frameRate, false);
  }
}
