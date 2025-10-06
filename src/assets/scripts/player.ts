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
} from "@babylonjs/core";

export class Player {
  // Public properties
  public camera: ArcRotateCamera;
  public capsule: AbstractMesh;

  // Private properties
  private _scene: Scene;
  private _heroRoot: AbstractMesh;
  private _physicsAggregate: PhysicsAggregate;

  // Animation
  private _animations = new Map<string, AnimationGroup>();
  private _currentPlayingAnim: AnimationGroup;

  // Input
  private _inputMap: { [key: string]: boolean } = {};

  // Movement
  private readonly _walkSpeed = 4;
  private readonly _sprintSpeed = 8;
  private readonly _velocitySmoothing = 0.1;

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
    this._heroRoot.scaling = new Vector3(0.75, 0.75, 0.75);

    result.meshes.forEach((mesh) => {
      mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
      if (mesh.material) mesh.material.freeze();
    });

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
    this._physicsAggregate.body.setLinearDamping(0.95);
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
    const idleAnim = this._animations.get("Idle");
    if (idleAnim) {
      this._currentPlayingAnim = idleAnim;
      idleAnim.play(true);
    }
  }

  private _setupInput(): void {
    this._scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.key.toLowerCase();
      const isDown = kbInfo.type === KeyboardEventTypes.KEYDOWN;
      this._inputMap[key] = isDown;
    });
  }

  public update(): void {
    if (!this._physicsAggregate) return;

    this._updateMovement();
    this.camera.target.copyFrom(this.capsule.position);
  }

  private _updateMovement(): void {
    const speed = this._inputMap["shift"] ? this._sprintSpeed : this._walkSpeed;

    const cameraForward = Vector3.Zero();
    this.camera.getForwardRay().direction.normalizeToRef(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();

    const cameraRight = Vector3.Zero();
    Vector3.CrossToRef(Axis.Y, cameraForward, cameraRight);
    cameraRight.normalize();

    const moveDirection = Vector3.Zero();
    if (this._inputMap["w"]) moveDirection.addInPlace(cameraForward);
    if (this._inputMap["s"]) moveDirection.subtractInPlace(cameraForward);
    if (this._inputMap["a"]) moveDirection.subtractInPlace(cameraRight);
    if (this._inputMap["d"]) moveDirection.addInPlace(cameraRight);

    const isMoving = moveDirection.lengthSquared() > 0;
    if (isMoving) {
      moveDirection.normalize();
      this._playRunAnimation();

      const currentVelocity = this._physicsAggregate.body.getLinearVelocity();
      const targetVelocity = moveDirection.scale(speed);
      const newVelocity = new Vector3(
        Scalar.Lerp(
          currentVelocity.x,
          targetVelocity.x,
          this._velocitySmoothing
        ),
        currentVelocity.y,
        Scalar.Lerp(
          currentVelocity.z,
          targetVelocity.z,
          this._velocitySmoothing
        )
      );
      this._physicsAggregate.body.setLinearVelocity(newVelocity);

      const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
      this._heroRoot.rotation.y = targetRotation + this.camera.alpha + Math.PI;
    } else {
      this._playAnimation(this._animations.get("Idle"));
      const currentVelocity = this._physicsAggregate.body.getLinearVelocity();
      const newVelocity = new Vector3(
        currentVelocity.x * 0.9,
        currentVelocity.y,
        currentVelocity.z * 0.9
      );
      this._physicsAggregate.body.setLinearVelocity(newVelocity);
    }
  }

  private _playRunAnimation(): void {
    let targetAnim = this._animations.get("Run");
    if (this._inputMap["s"]) targetAnim = this._animations.get("Run_Back");
    this._playAnimation(targetAnim);
  }

  private _playAnimation(anim: AnimationGroup | undefined): void {
    if (!anim || this._currentPlayingAnim === anim) return;
    this._currentPlayingAnim.stop();
    anim.play(true);
    this._currentPlayingAnim = anim;
  }
}
