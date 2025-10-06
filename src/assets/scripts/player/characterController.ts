import {
    Scene,
    Vector3,
    SceneLoader,
    AbstractMesh,
    AnimationGroup,
    ArcRotateCamera,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsShapeType,
    KeyboardEventTypes,
    Axis,
    Scalar
} from "@babylonjs/core";
import { setupCameraOcclusion } from "../camera/cameraOcclusion";

export interface CharacterController {
    capsule: AbstractMesh;
    camera: ArcRotateCamera;
    update: () => void;
    dispose: () => void;
}

interface MovementState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    sprint: boolean;
}

export async function createCharacterController(
    scene: Scene,
    startPosition: Vector3 = new Vector3(0, 5, 0)
): Promise<CharacterController> {
    // --- PERFORMANCE OPTIMIZATION ---
    scene.blockMaterialDirtyMechanism = true;

    // --- LOAD THE MODEL ---
    const result = await SceneLoader.ImportMeshAsync("", "/models/", "Worker.glb", scene);
    const heroRoot = result.meshes[0];
    heroRoot.position = startPosition;
    heroRoot.scaling = new Vector3(0.75, 0.75, 0.75);

    result.meshes.forEach((mesh) => {
        mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        if (mesh.material) {
            mesh.material.freeze();
        }
    });

    // --- SETUP ANIMATIONS ---
    const animations = new Map<string, AnimationGroup>();
    result.animationGroups.forEach(ag => {
        const name = ag.name.split('|')[1];
        if (name) animations.set(name, ag);
        ag.stop();
    });

    const idleAnim = animations.get("Idle") || result.animationGroups[0];
    const runAnim = animations.get("Run");
    const runBackAnim = animations.get("Run_Back");
    const runLeftAnim = animations.get("Run_Left");
    const runRightAnim = animations.get("Run_Right");

    idleAnim.play(true);

    // --- CREATE PHYSICS CAPSULE ---
    const capsule = MeshBuilder.CreateCapsule("characterCapsule", { height: 1.7, radius: 0.4 }, scene);
    capsule.position = startPosition;
    capsule.isVisible = false;

    heroRoot.parent = capsule;
    heroRoot.position = new Vector3(0, -0.85, 0);

    const physicsAggregate = new PhysicsAggregate(capsule, PhysicsShapeType.CAPSULE, { mass: 80, restitution: 0, friction: 0.5 }, scene);
    physicsAggregate.body.setAngularDamping(1);
    physicsAggregate.body.setLinearDamping(0.95);
    physicsAggregate.body.setMassProperties({ inertia: new Vector3(0, 0, 0) });
    physicsAggregate.body.setGravityFactor(1);

    // --- SETUP CAMERA ---
    const camera = new ArcRotateCamera("thirdPersonCamera", -Math.PI / 2, Math.PI / 2.5, 15, capsule.position, scene);
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 30;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2.2;
    camera.angularSensibilityX = 2000;
    camera.angularSensibilityY = 2000;
    camera.attachControl(scene.getEngine().getRenderingCanvas(), true);

    const occlusion = setupCameraOcclusion(scene, camera, () => capsule.position, result.meshes);

    // --- INPUT AND MOVEMENT ---
    const movement: MovementState = { forward: false, backward: false, left: false, right: false, sprint: false };
    const WALK_SPEED = 4;
    const SPRINT_SPEED = 8;
    const VELOCITY_SMOOTHING = 0.1;

    scene.onKeyboardObservable.add((kbInfo) => {
        const key = kbInfo.event.key.toLowerCase();
        const isDown = kbInfo.type === KeyboardEventTypes.KEYDOWN;
        if (key === "w") movement.forward = isDown;
        if (key === "s") movement.backward = isDown;
        if (key === "a") movement.left = isDown;
        if (key === "d") movement.right = isDown;
        if (key === "shift") movement.sprint = isDown;
    });

    // --- UPDATE LOOP ---
    const cameraForward = Vector3.Zero();
    const cameraRight = Vector3.Zero();
    const moveDirection = Vector3.Zero();
    const targetVelocity = Vector3.Zero();
    const newVelocity = Vector3.Zero();
    let currentPlayingAnim: AnimationGroup = idleAnim;
    let occlusionFrameCounter = 0;

    const playAnimation = (anim: AnimationGroup | undefined) => {
        if (!anim || currentPlayingAnim === anim) return;
        currentPlayingAnim.stop();
        anim.play(true);
        currentPlayingAnim = anim;
    };

    const update = () => {
        const speed = movement.sprint ? SPRINT_SPEED : WALK_SPEED;

        camera.getForwardRay().direction.normalizeToRef(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();

        Vector3.CrossToRef(Axis.Y, cameraForward, cameraRight);
        cameraRight.normalize();

        moveDirection.setAll(0);
        if (movement.forward) moveDirection.addInPlace(cameraForward);
        if (movement.backward) moveDirection.subtractInPlace(cameraForward);
        if (movement.left) moveDirection.subtractInPlace(cameraRight);
        if (movement.right) moveDirection.addInPlace(cameraRight);

        const isMoving = moveDirection.lengthSquared() > 0;
        if (isMoving) {
            moveDirection.normalize();

            let targetAnim = runAnim;
            if (movement.forward) targetAnim = runAnim;
            if (movement.backward) targetAnim = runBackAnim;
            if (movement.left) targetAnim = runLeftAnim;
            if (movement.right) targetAnim = runRightAnim;
            playAnimation(targetAnim);

            const currentVelocity = physicsAggregate.body.getLinearVelocity();
            moveDirection.scaleToRef(speed, targetVelocity);
            newVelocity.set(
                Scalar.Lerp(currentVelocity.x, targetVelocity.x, VELOCITY_SMOOTHING),
                currentVelocity.y,
                Scalar.Lerp(currentVelocity.z, targetVelocity.z, VELOCITY_SMOOTHING)
            );
            physicsAggregate.body.setLinearVelocity(newVelocity);

            const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
            heroRoot.rotation.y = Scalar.LerpAngle(heroRoot.rotation.y, targetRotation + camera.alpha + Math.PI, 0.1);

        } else {
            playAnimation(idleAnim);
            const currentVelocity = physicsAggregate.body.getLinearVelocity();
            newVelocity.set(currentVelocity.x * 0.9, currentVelocity.y, currentVelocity.z * 0.9);
            physicsAggregate.body.setLinearVelocity(newVelocity);
        }

        camera.target.copyFrom(capsule.position);

        occlusionFrameCounter++;
        if (occlusionFrameCounter % 2 === 0) {
            occlusion.update();
        }
    };

    const dispose = () => {
        occlusion.dispose();
        physicsAggregate.dispose();
        capsule.dispose();
        camera.dispose();
        heroRoot.dispose();
    };

    return {
        capsule,
        camera,
        update,
        dispose,
    };
}
