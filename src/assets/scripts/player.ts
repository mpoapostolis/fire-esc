import {
  Scene,
  Vector3,
  AnimationGroup,
  AbstractMesh,
  ArcRotateCamera,
  SceneLoader,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Axis,
  KeyboardEventTypes,
  Ray,
  StandardMaterial,
  Color3,
} from "@babylonjs/core";

interface PlayerConfig {
  readonly modelPath: string;
  readonly modelFile: string;
  readonly scaling: number;
  readonly walkSpeed: number;
  readonly sprintSpeed: number;
  readonly jumpImpulse: number;
  readonly mass: number;
  readonly capsuleHeight: number;
  readonly capsuleRadius: number;
  readonly groundCheckDistance: number;
}

const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  modelPath: "/models/",
  modelFile: "Worker.glb",
  scaling: 0.6,
  walkSpeed: 5,
  sprintSpeed: 20,
  jumpImpulse: 400,
  mass: 80,
  capsuleHeight: 1.7,
  capsuleRadius: 0.4,
  groundCheckDistance: 0.95,
};

type AnimationName =
  | "Idle"
  | "Idle_Neutral"
  | "Run"
  | "Run_Back"
  | "Run_Left"
  | "Run_Right"
  | "Jump"
  | "Jump_Start"
  | "Jumping";

export class Player {
  public readonly camera: ArcRotateCamera;
  public capsule: AbstractMesh;

  private readonly _scene: Scene;
  private readonly _config: PlayerConfig;
  private _heroRoot: AbstractMesh;
  private _physicsAggregate: PhysicsAggregate;
  private readonly _animations = new Map<AnimationName, AnimationGroup>();
  private _currentPlayingAnim: AnimationGroup | null = null;
  private readonly _keyInputMap = new Map<string, boolean>();
  private _isJumping = false;
  private _hasJumpedInAir = false;
  private _marker: AbstractMesh;
  private _controlsEnabled = true;

  // Reusable vectors for performance
  private readonly _cameraForward = new Vector3();
  private readonly _cameraRight = new Vector3();
  private readonly _moveDirection = new Vector3();
  private readonly _targetVelocity = new Vector3();

  constructor(
    scene: Scene,
    camera: ArcRotateCamera,
    config: Partial<PlayerConfig> = {}
  ) {
    this._scene = scene;
    this.camera = camera;
    this._config = { ...DEFAULT_PLAYER_CONFIG, ...config };
    this._setupInput();
  }

  public async load(
    startPosition: Vector3 = new Vector3(0, 5, 0)
  ): Promise<AbstractMesh[]> {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      this._config.modelPath,
      this._config.modelFile,
      this._scene
    );

    this._heroRoot = result.meshes[0];
    this._heroRoot.position = startPosition;
    const scale = this._config.scaling;
    this._heroRoot.scaling.set(scale, scale, scale);

    this._createPhysicsCapsule(startPosition);
    this._setupAnimations(result.animationGroups);

    return result.meshes;
  }

  private _createPhysicsCapsule(startPosition: Vector3): void {
    this.capsule = MeshBuilder.CreateCapsule(
      "characterCapsule",
      {
        height: this._config.capsuleHeight,
        radius: this._config.capsuleRadius,
      },
      this._scene
    );
    this.capsule.position.copyFrom(startPosition);
    this.capsule.isVisible = false;

    this._heroRoot.parent = this.capsule;
    this._heroRoot.position.set(0, -this._config.capsuleHeight / 2, 0);

    // Create red marker above player (plane with billboard mode)
    this._marker = MeshBuilder.CreatePlane(
      "playerMarker",
      { size: 2 },
      this._scene
    );
    this._marker.position.set(0, 10, 0);
    this._marker.parent = this.capsule;
    this._marker.billboardMode = 7; // Full billboard mode - always faces camera
    this._marker.isVisible = false; // Hidden by default

    const markerMaterial = new StandardMaterial("markerMat", this._scene);
    markerMaterial.emissiveColor = new Color3(1, 0, 0);
    markerMaterial.diffuseColor = new Color3(1, 0, 0);
    markerMaterial.disableLighting = true;
    this._marker.material = markerMaterial;

    this._physicsAggregate = new PhysicsAggregate(
      this.capsule,
      PhysicsShapeType.CAPSULE,
      { mass: this._config.mass, restitution: 0, friction: 0.5 },
      this._scene
    );

    const body = this._physicsAggregate.body;
    body.setAngularDamping(1);
    body.setLinearDamping(0.5);
    body.setMassProperties({ inertia: Vector3.ZeroReadOnly });
    body.setGravityFactor(1);
  }

  private _setupAnimations(animationGroups: AnimationGroup[]): void {
    for (const ag of animationGroups) {
      const name = ag.name.split("|")[1] as AnimationName;
      if (name) this._animations.set(name, ag);
      ag.stop();
    }

    const idleAnim =
      this._animations.get("Idle_Neutral") ?? this._animations.get("Idle");
    if (idleAnim) {
      this._currentPlayingAnim = idleAnim;
      idleAnim.play(true);
    }
  }

  private _setupInput(): void {
    this._scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.key.toLowerCase();
      const isDown = kbInfo.type === KeyboardEventTypes.KEYDOWN;
      this._keyInputMap.set(key, isDown);
    });
  }

  public update(): void {
    if (!this._physicsAggregate || !this._controlsEnabled) return;
    this._updateMovement();
  }

  public showMarker(): void {
    if (this._marker) {
      this._marker.isVisible = true;
    }
  }

  public hideMarker(): void {
    if (this._marker) {
      this._marker.isVisible = false;
    }
  }

  public enableControls(): void {
    this._controlsEnabled = true;
  }

  public disableControls(): void {
    this._controlsEnabled = false;
    // Stop movement when controls are disabled
    if (this._physicsAggregate) {
      this._physicsAggregate.body.setLinearVelocity(new Vector3(0, 0, 0));
    }
  }

  private _isKeyPressed(key: string): boolean {
    return this._keyInputMap.get(key) ?? false;
  }

  private _updateMovement(): void {
    const speed = this._isKeyPressed("shift")
      ? this._config.sprintSpeed
      : this._config.walkSpeed;

    this._updateCameraDirections();

    this._calculateMoveDirection();
    this._applyMovement(speed);
  }

  private _updateCameraDirections(): void {
    this.camera.getDirection(Axis.Z).normalizeToRef(this._cameraForward);
    this._cameraForward.y = 0;
    this._cameraForward.normalize();

    this.camera.getDirection(Axis.X).normalizeToRef(this._cameraRight);
    this._cameraRight.y = 0;
    this._cameraRight.normalize();
  }

  private _calculateMoveDirection(): void {
    this._moveDirection.set(0, 0, 0);

    if (this._isKeyPressed("w"))
      this._moveDirection.addInPlace(this._cameraForward);
    if (this._isKeyPressed("s"))
      this._moveDirection.subtractInPlace(this._cameraForward);
    if (this._isKeyPressed("a"))
      this._moveDirection.subtractInPlace(this._cameraRight);
    if (this._isKeyPressed("d"))
      this._moveDirection.addInPlace(this._cameraRight);
  }

  private _applyMovement(speed: number): void {
    const currentYVelocity =
      this._physicsAggregate.body.getLinearVelocity()?.y ?? 0;

    if (this._moveDirection.lengthSquared() > 0.001) {
      this._moveDirection.normalize();
      if (!this._isJumping) this._playRunAnimation();

      this._moveDirection.scaleToRef(speed, this._targetVelocity);
      this._targetVelocity.y = currentYVelocity;
    } else {
      if (!this._isJumping) this._playIdleAnimation();
      this._targetVelocity.set(0, currentYVelocity, 0);
    }

    this._physicsAggregate.body.setLinearVelocity(this._targetVelocity);
  }

  private _playIdleAnimation(): void {
    const idleAnim =
      this._animations.get("Idle_Neutral") ?? this._animations.get("Idle");
    if (idleAnim) this._playAnimation(idleAnim);
  }

  private _playRunAnimation(): void {
    const targetAnim =
      (this._isKeyPressed("s") && this._animations.get("Run_Back")) ||
      (this._isKeyPressed("w") && this._animations.get("Run")) ||
      (this._isKeyPressed("a") && this._animations.get("Run_Left")) ||
      (this._isKeyPressed("d") && this._animations.get("Run_Right")) ||
      this._animations.get("Run");

    if (targetAnim) this._playAnimation(targetAnim);
  }

  private _playAnimation(anim: AnimationGroup, loop = true): void {
    if (this._currentPlayingAnim === anim) return;
    this._currentPlayingAnim?.stop();
    anim.play(loop);
    this._currentPlayingAnim = anim;
  }
}
