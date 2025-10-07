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
  Scalar,
  Axis,
  KeyboardEventTypes,
  Animation,
  Ray,
} from "@babylonjs/core";

export class Player {
  public camera: ArcRotateCamera;
  public capsule: AbstractMesh;
  private _scene: Scene;
  private _heroRoot: AbstractMesh;
  private _physicsAggregate: PhysicsAggregate;
  private _animations = new Map<string, AnimationGroup>();
  private _currentPlayingAnim: AnimationGroup;
  private _keyInputMap: { [key: string]: boolean } = {};
  private _stickInput: { x: number; y: number } = { x: 0, y: 0 };
  private _isJumping = false;
  private _hasJumpedInAir = false;

  private _cameraForward = new Vector3();
  private _cameraRight = new Vector3();
  private _moveDirection = new Vector3();
  private _targetVelocity = new Vector3();

  private readonly _walkSpeed = 20;
  private readonly _sprintSpeed = 5;
  private readonly _jumpImpulse = 400;

  constructor(scene: Scene, camera: ArcRotateCamera) {
    this._scene = scene;
    this.camera = camera;
    this._setupInput();
  }

  public async load(
    startPosition: Vector3 = new Vector3(0, 5, 0)
  ): Promise<AbstractMesh[]> {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "/models/",
      "Worker.glb",
      this._scene
    );
    this._heroRoot = result.meshes[0];
    this._heroRoot.position = startPosition;
    this._heroRoot.scaling = new Vector3(0.6, 0.6, 0.6);

    this._createPhysicsCapsule(startPosition);
    this._setupAnimations(result.animationGroups);

    return result.meshes;
  }

  private _createPhysicsCapsule(startPosition: Vector3): void {
    this.capsule = MeshBuilder.CreateCapsule(
      "characterCapsule",
      { height: 1.7, radius: 0.4 },
      this._scene
    );
    this.capsule.position = startPosition;
    this.capsule.isVisible = false;

    this._heroRoot.parent = this.capsule;
    this._heroRoot.position = new Vector3(0, -0.85, 0);

    this._physicsAggregate = new PhysicsAggregate(
      this.capsule,
      PhysicsShapeType.CAPSULE,
      { mass: 80, restitution: 0, friction: 0.5 },
      this._scene
    );
    this._physicsAggregate.body.setAngularDamping(1);
    this._physicsAggregate.body.setLinearDamping(0.5); // Apply some damping
    this._physicsAggregate.body.setMassProperties({
      inertia: new Vector3(0, 0, 0),
    });
    this._physicsAggregate.body.setGravityFactor(1);
  }

  private _setupAnimations(animationGroups: AnimationGroup[]): void {
    animationGroups.forEach((ag) => {
      const name = ag.name.split("|")[1];
      if (name) this._animations.set(name, ag);
      ag.stop();
    });
    const idleAnim =
      this._animations.get("Idle_Neutral") || this._animations.get("Idle");
    if (idleAnim) {
      this._currentPlayingAnim = idleAnim;
      idleAnim.play(true);
    }
  }

  private _setupInput(): void {
    this._scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.key.toLowerCase();
      const isDown = kbInfo.type === KeyboardEventTypes.KEYDOWN;
      this._keyInputMap[key] = isDown;
    });
  }

  public setInputVector(input: { x: number; y: number }) {
    this._stickInput = input;
  }

  public update(): void {
    if (!this._physicsAggregate) return;

    this._updateMovement();
    this.camera.target.copyFrom(this.capsule.position);
  }

  public teleport(position: Vector3): void {
    this._scene;
    this.capsule.position.copyFrom(position);
  }

  private _isGrounded(): boolean {
    const ray = new Ray(this.capsule.position, Vector3.Down(), 0.95);
    const predicate = (mesh: AbstractMesh) =>
      mesh.isPickable && mesh.isEnabled() && mesh !== this.capsule;
    const hit = this._scene.pickWithRay(ray, predicate);
    return !!hit?.hit;
  }

  private _updateMovement(): void {
    const speed = this?._keyInputMap["shift"]
      ? this._sprintSpeed
      : this._walkSpeed;

    // Get camera directions and flatten them on the XZ plane
    this.camera.getDirection(Axis.Z).normalizeToRef(this._cameraForward);
    this._cameraForward.y = 0;
    this._cameraForward.normalize();

    this.camera.getDirection(Axis.X).normalizeToRef(this._cameraRight);
    this._cameraRight.y = 0;
    this._cameraRight.normalize();

    const isGrounded = this._isGrounded();
    if (isGrounded) {
      this._hasJumpedInAir = false;
    }

    // Jump
    if (isGrounded && !this._hasJumpedInAir && this._keyInputMap[" "]) {
      this._hasJumpedInAir = true;
      this._physicsAggregate.body.applyImpulse(
        new Vector3(0, this._jumpImpulse, 0),
        this.capsule.getAbsolutePosition()
      );
      // Assuming "Jump" animation exists, play it once.
      const jumpAnim =
        this._animations.get("Jump") ||
        this._animations.get("Jump_Start") ||
        this._animations.get("Jumping");
      if (jumpAnim) {
        this._isJumping = true;
        jumpAnim.onAnimationEndObservable.addOnce(() => {
          this._isJumping = false;
        });
        this._playAnimation(jumpAnim, false);
      }
    }

    this._moveDirection.set(0, 0, 0);
    if (this._keyInputMap["w"])
      this._moveDirection.addInPlace(this._cameraForward);
    if (this._keyInputMap["s"])
      this._moveDirection.subtractInPlace(this._cameraForward);
    if (this._keyInputMap["a"])
      this._moveDirection.subtractInPlace(this._cameraRight);
    if (this._keyInputMap["d"])
      this._moveDirection.addInPlace(this._cameraRight);

    const currentYVelocity =
      this._physicsAggregate.body.getLinearVelocity()?.y || 0;

    if (this._moveDirection.lengthSquared() > 0.001) {
      this._moveDirection.normalize();
      if (!this._isJumping) {
        this._playRunAnimation();
      }

      this._moveDirection.scaleToRef(speed, this._targetVelocity);
      this._targetVelocity.y = currentYVelocity;
      this._physicsAggregate.body.setLinearVelocity(this._targetVelocity);
    } else {
      if (!this._isJumping) {
        this._playAnimation(
          this._animations.get("Idle_Neutral") || this._animations.get("Idle")
        );
      }

      this._targetVelocity.set(0, currentYVelocity, 0);
      this._physicsAggregate.body.setLinearVelocity(this._targetVelocity);
    }
  }

  private _playRunAnimation(): void {
    let targetAnim: AnimationGroup | undefined;
    // Prioritize backward/forward, then left/right for animation
    if (this._keyInputMap["s"]) {
      targetAnim = this._animations.get("Run_Back");
    } else if (this._keyInputMap["w"]) {
      targetAnim = this._animations.get("Run");
    } else if (this._keyInputMap["a"]) {
      targetAnim = this._animations.get("Run_Left");
    } else if (this._keyInputMap["d"]) {
      targetAnim = this._animations.get("Run_Right");
    }
    this._playAnimation(targetAnim || this._animations.get("Run")); // Fallback to forward run
  }

  private _playAnimation(anim: AnimationGroup | undefined, loop = true): void {
    if (!anim || this._currentPlayingAnim === anim) return;
    this._currentPlayingAnim?.stop();
    anim.play(loop);
    this._currentPlayingAnim = anim;
  }
}
