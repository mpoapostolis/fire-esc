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
  public camera: ArcRotateCamera;
  public capsule: AbstractMesh;
  private _scene: Scene;
  private _heroRoot: AbstractMesh;
  private _physicsAggregate: PhysicsAggregate;
  private _animations = new Map<string, AnimationGroup>();
  private _currentPlayingAnim: AnimationGroup;
  private _inputMap: { [key: string]: boolean } = {};

  private readonly _walkSpeed = 4;
  private readonly _sprintSpeed = 8;

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
    this._heroRoot.scaling = new Vector3(1.5, 1.5, 1.5);

            result.meshes.forEach((mesh) => {
                mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
                mesh.layerMask = 2; // Assign to layer 2 (Player)
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
    this._physicsAggregate.body.setLinearDamping(0.5); // Apply some damping
    this._physicsAggregate.body.setMassProperties({
      inertia: new Vector3(0, 0, 0),
    });
    this._physicsAggregate.body.setGravityFactor(1);
  }

  private _setupAnimations(animationGroups: AnimationGroup[]): void {
    console.log(
      "Available animations:",
      animationGroups.map((ag) => ag.name)
    );
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

    const cameraForward = this.camera
      .getForwardRay()
      .direction.normalizeToRef(Vector3.Zero());
    cameraForward.y = 0;
    cameraForward.normalize();

    const cameraRight = Vector3.Cross(Axis.Y, cameraForward).normalize();

    const moveDirection = Vector3.Zero();
    if (this._inputMap["w"]) moveDirection.addInPlace(cameraForward);
    if (this._inputMap["s"]) moveDirection.subtractInPlace(cameraForward);
    if (this._inputMap["a"]) moveDirection.subtractInPlace(cameraRight);
    if (this._inputMap["d"]) moveDirection.addInPlace(cameraRight);

    const isMoving = moveDirection.lengthSquared() > 0;
    if (isMoving) {
      moveDirection.normalize();
      this._playRunAnimation();

      const targetVelocity = moveDirection.scale(speed);
      const currentVelocity = this._physicsAggregate.body.getLinearVelocity();
      // Set velocity directly for immediate movement - NO TRANSITION
      this._physicsAggregate.body.setLinearVelocity(
        new Vector3(targetVelocity.x, currentVelocity.y, targetVelocity.z)
      );
    } else {
      this._playAnimation(
        this._animations.get("Idle_Neutral") || this._animations.get("Idle")
      );
      const currentVelocity = this._physicsAggregate.body.getLinearVelocity();
      // Set velocity to zero for immediate stop
      this._physicsAggregate.body.setLinearVelocity(
        new Vector3(0, currentVelocity.y, 0)
      );
    }
  }

  private _playRunAnimation(): void {
    let targetAnim: AnimationGroup | undefined;
    // Prioritize backward/forward, then left/right for animation
    if (this._inputMap["s"]) {
      targetAnim = this._animations.get("Run_Back");
    } else if (this._inputMap["w"]) {
      targetAnim = this._animations.get("Run");
    } else if (this._inputMap["a"]) {
      targetAnim = this._animations.get("Run_Left");
    } else if (this._inputMap["d"]) {
      targetAnim = this._animations.get("Run_Right");
    }
    this._playAnimation(targetAnim || this._animations.get("Run")); // Fallback to forward run
  }

  private _playAnimation(anim: AnimationGroup | undefined): void {
    if (!anim || this._currentPlayingAnim === anim) return;
    this._currentPlayingAnim.stop();
    anim.play(true);
    this._currentPlayingAnim = anim;
  }
}
