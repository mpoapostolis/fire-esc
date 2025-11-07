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
  Scalar,
  StandardMaterial,
  Color3,
} from "@babylonjs/core";
import type { JoystickController } from "./joystick";
import type { GameState } from "./game";

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
  scaling: 0.9,
  walkSpeed: 5,
  sprintSpeed: 12,
  jumpImpulse: 7,
  mass: 80,
  capsuleHeight: 1.7,
  capsuleRadius: 0.4,
  groundCheckDistance: 0.95,
};

type AnimationName =
  | "CharacterArmature|Death"
  | "CharacterArmature|Gun_Shoot"
  | "CharacterArmature|HitRecieve"
  | "CharacterArmature|HitRecieve_2"
  | "CharacterArmature|Idle"
  | "CharacterArmature|Idle_Gun"
  | "CharacterArmature|Idle_Gun_Pointing"
  | "CharacterArmature|Idle_Gun_Shoot"
  | "CharacterArmature|Idle_Neutral"
  | "CharacterArmature|Idle_Sword"
  | "CharacterArmature|Interact"
  | "CharacterArmature|Kick_Left"
  | "CharacterArmature|Kick_Right"
  | "CharacterArmature|Punch_Left"
  | "CharacterArmature|Punch_Right"
  | "CharacterArmature|Roll"
  | "CharacterArmature|Run"
  | "CharacterArmature|Run_Back"
  | "CharacterArmature|Run_Left"
  | "CharacterArmature|Run_Right"
  | "CharacterArmature|Run_Shoot"
  | "CharacterArmature|Sword_Slash"
  | "CharacterArmature|Walk"
  | "CharacterArmature|Wave";

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
  private _spawnPosition: Vector3;
  private readonly _deathPlaneY = -10; // Fall death threshold
  private _movementJoystick: JoystickController | null = null;
  private _cameraJoystick: JoystickController | null = null;

  // Reusable vectors for performance (pre-allocated to avoid GC)
  private readonly _cameraForward = Vector3.Zero();
  private readonly _cameraRight = Vector3.Zero();
  private readonly _moveDirection = Vector3.Zero();
  private readonly _targetVelocity = Vector3.Zero();
  private readonly _newVelocity = Vector3.Zero();
  private readonly _tempVec = Vector3.Zero();
  private readonly _tempVec2 = Vector3.Zero();

  // Movement constants
  private static readonly VELOCITY_SMOOTHING = 0.2;
  private static readonly DECELERATION = 0.85;
  private static readonly GROUND_CHECK_EPSILON = 0.1;

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
    startPosition: Vector3 = new Vector3(
      -44.742218017578125,
      1.8362194299697876,
      -28.74200439453125
    )
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

    // Save spawn position for respawn
    this._spawnPosition = startPosition.clone();

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

    this._physicsAggregate = new PhysicsAggregate(
      this.capsule,
      PhysicsShapeType.CAPSULE,
      { mass: this._config.mass, restitution: 0, friction: 0.5 },
      this._scene
    );

    const body = this._physicsAggregate.body;
    body.setAngularDamping(1);
    body.setLinearDamping(0.95);
    body.setMassProperties({ inertia: Vector3.ZeroReadOnly });
    body.setGravityFactor(1);
    body.disablePreStep = false;
  }

  private _setupAnimations(animationGroups: AnimationGroup[]): void {
    for (const ag of animationGroups) {
      const name = ag.name as AnimationName;
      this._animations.set(name, ag);
      ag.stop();
    }

    const idleAnim =
      this._animations.get("CharacterArmature|Idle_Neutral") ??
      this._animations.get("CharacterArmature|Idle");
    if (idleAnim) {
      this._currentPlayingAnim = idleAnim;
      idleAnim.play(true);
    }
  }

  private _setupInput(): void {
    this._scene.onKeyboardObservable.add((kbInfo) => {
      // Use event.code for physical key position (works with all keyboard layouts)
      const code = kbInfo.event.code;

      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          this._keyInputMap.set(code, true);
          if (code === "Space" && !this._isJumping) {
            this._jump();
          }
          if (code === "KeyP") {
            console.log({
              x: this.capsule.position._x,
              z: this.capsule.position._z,
            });
          }
          break;

        case KeyboardEventTypes.KEYUP:
          this._keyInputMap.set(code, false);
          break;
      }
    });
  }

  public update(gameState: GameState): void {
    if (!this._physicsAggregate || !this._controlsEnabled) return;
    if (gameState !== "AWAITING_QUEST" && gameState !== "PLAYING") {
      this.disableControls();
    }

    // Check if player fell below death plane
    this._checkDeathPlane();

    this._updateMovement();
    if (this._isJumping) {
      this._checkGrounded();
    }
  }

  private _checkDeathPlane(): void {
    if (this.capsule.position.y < this._deathPlaneY) {
      this._respawn();
    }
  }

  private _respawn(): void {
    // Reset position to spawn
    this.capsule.position.copyFrom(this._spawnPosition);

    // Reset velocity
    this._physicsAggregate.body.setLinearVelocity(Vector3.Zero());
    this._physicsAggregate.body.setAngularVelocity(Vector3.Zero());

    // Reset jumping state
    this._isJumping = false;

    // Play idle animation
    this._playIdleAnimation();
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
    this._keyInputMap.clear();
    this._isJumping = false;
    this._playIdleAnimation();
    // Stop movement when controls are disabled (reuse temp vector)
    if (this._physicsAggregate) {
      this._tempVec.set(0, 0, 0);
      this._physicsAggregate.body.setLinearVelocity(this._tempVec);
    }
  }

  public setJoysticks(
    movementJoystick: JoystickController | null,
    cameraJoystick: JoystickController | null
  ): void {
    this._movementJoystick = movementJoystick;
    this._cameraJoystick = cameraJoystick;
  }

  private _isKeyPressed(key: string): boolean {
    return this._keyInputMap.get(key) ?? false;
  }

  private _updateMovement(): void {
    const speed =
      this._isKeyPressed("ShiftLeft") || this._isKeyPressed("ShiftRight")
        ? this._config.sprintSpeed
        : this._config.walkSpeed;

    this._updateCameraDirections();

    this._calculateMoveDirection();
    this._applyMovement(speed);
  }

  private _updateCameraDirections(): void {
    this.camera.getForwardRay().direction.normalizeToRef(this._cameraForward);
    this._cameraForward.y = 0;
    this._cameraForward.normalize();

    Vector3.CrossToRef(Axis.Y, this._cameraForward, this._cameraRight);
    this._cameraRight.normalize();
  }

  private _calculateMoveDirection(): void {
    this._moveDirection.set(0, 0, 0);

    // Keyboard input (using physical key codes - works with all keyboard layouts)
    if (this._isKeyPressed("KeyW"))
      this._moveDirection.addInPlace(this._cameraForward);
    if (this._isKeyPressed("KeyS"))
      this._moveDirection.subtractInPlace(this._cameraForward);
    if (this._isKeyPressed("KeyA"))
      this._moveDirection.subtractInPlace(this._cameraRight);
    if (this._isKeyPressed("KeyD"))
      this._moveDirection.addInPlace(this._cameraRight);

    // Joystick input (mobile)
    if (this._movementJoystick?.isPressed()) {
      const movement = this._movementJoystick.getMovement();
      // x: left/right, y: forward/back (inverted because touch Y is inverted)
      this._cameraForward.scaleToRef(-movement.y, this._tempVec);
      this._cameraRight.scaleToRef(movement.x, this._tempVec2);
      this._tempVec.addInPlace(this._tempVec2);
      this._moveDirection.addInPlace(this._tempVec);
    }
  }

  private _applyMovement(speed: number): void {
    const currentVelocity = this._physicsAggregate.body.getLinearVelocity();
    const isMoving = this._moveDirection.lengthSquared() > 0.001;

    if (isMoving) {
      this._moveDirection.normalize();
      if (!this._isJumping) this._playRunAnimation();

      this._moveDirection.scaleToRef(speed, this._targetVelocity);

      // Smooth velocity lerp for butter-smooth movement
      this._newVelocity.set(
        Scalar.Lerp(
          currentVelocity.x,
          this._targetVelocity.x,
          Player.VELOCITY_SMOOTHING
        ),
        currentVelocity.y,
        Scalar.Lerp(
          currentVelocity.z,
          this._targetVelocity.z,
          Player.VELOCITY_SMOOTHING
        )
      );

      this._physicsAggregate.body.setLinearVelocity(this._newVelocity);

      // Rotate hero to face movement direction
      this._heroRoot.setDirection(Axis.X, Math.PI - this.camera.alpha);
    } else {
      if (!this._isJumping) this._playIdleAnimation();

      // Smooth deceleration
      this._newVelocity.set(
        currentVelocity.x * Player.DECELERATION,
        currentVelocity.y,
        currentVelocity.z * Player.DECELERATION
      );

      this._physicsAggregate.body.setLinearVelocity(this._newVelocity);

      // Face camera direction when idle
      this._heroRoot.rotation.y = this.camera.alpha;
    }
  }

  private _playIdleAnimation(): void {
    const idleAnim =
      this._animations.get("CharacterArmature|Idle_Neutral") ??
      this._animations.get("CharacterArmature|Idle");
    if (idleAnim) this._playAnimation(idleAnim);
  }

  private _playRunAnimation(): void {
    // Determine speed (sprint vs walk) - for joystick, check magnitude
    let isSprinting =
      this._isKeyPressed("ShiftLeft") || this._isKeyPressed("ShiftRight");

    // For joystick users: if joystick is pushed far, consider it sprinting
    if (this._movementJoystick?.isPressed()) {
      const movement = this._movementJoystick.getMovement();
      const magnitude = Math.sqrt(
        movement.x * movement.x + movement.y * movement.y
      );
      isSprinting = magnitude > 0.7;
    }

    const baseAnim = isSprinting
      ? "CharacterArmature|Run"
      : "CharacterArmature|Walk";

    // Determine direction based on movement vector relative to camera
    // Normalize the movement direction (already done in applyMovement but let's be safe)
    const moveLen = this._moveDirection.length();
    if (moveLen < 0.001) {
      this._playAnimation(this._animations.get(baseAnim)!);
      return;
    }

    // Calculate dot products to determine direction
    const forwardDot =
      Vector3.Dot(this._moveDirection, this._cameraForward) / moveLen;
    const rightDot =
      Vector3.Dot(this._moveDirection, this._cameraRight) / moveLen;

    // Determine which animation to play based on direction
    let targetAnim: AnimationGroup | undefined;

    // Backward
    if (forwardDot < -0.5) {
      targetAnim = this._animations.get("CharacterArmature|Run_Back");
    }
    // Forward
    else if (forwardDot > 0.5) {
      targetAnim = this._animations.get(baseAnim);
    }
    // Strafe right
    else if (rightDot > 0.5) {
      targetAnim = this._animations.get("CharacterArmature|Run_Left");
    }
    // Strafe left
    else if (rightDot < -0.5) {
      targetAnim = this._animations.get("CharacterArmature|Run_Right");
    }

    // Fallback to base animation
    if (!targetAnim) {
      targetAnim = this._animations.get(baseAnim);
    }

    if (targetAnim) this._playAnimation(targetAnim);
  }

  private _playAnimation(anim: AnimationGroup, loop = true): void {
    if (this._currentPlayingAnim === anim) return;
    this._currentPlayingAnim?.stop();
    anim.play(loop);
    this._currentPlayingAnim = anim;
  }

  private _jump(): void {
    if (!this._isGrounded()) return;

    this._isJumping = true;
    const currentVelocity = this._physicsAggregate.body.getLinearVelocity();
    // Reuse temp vector to avoid allocation
    this._tempVec.set(
      currentVelocity.x,
      this._config.jumpImpulse,
      currentVelocity.z
    );
    this._physicsAggregate.body.setLinearVelocity(this._tempVec);

    const rollAnim = this._animations.get("CharacterArmature|Roll");
    if (rollAnim) {
      rollAnim.stop();
      rollAnim.play(false);
      rollAnim.onAnimationGroupEndObservable.addOnce(() => {
        if (this._isJumping) {
          this._playIdleAnimation();
        }
      });
    }
  }

  private _isGrounded(): boolean {
    const velocity = this._physicsAggregate.body.getLinearVelocity();
    return Math.abs(velocity.y) < Player.GROUND_CHECK_EPSILON;
  }

  private _checkGrounded(): void {
    if (this._isJumping && this._isGrounded()) {
      this._isJumping = false;
    }
  }
}
