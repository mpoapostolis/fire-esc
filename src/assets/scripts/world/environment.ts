import {
    Scene,
    Vector3,
    HemisphericLight,
    SceneLoader,
    CreateGround,
    PhysicsBody,
    PhysicsShapeBox,
    PhysicsMotionType,
    Quaternion
} from "@babylonjs/core";

export async function createEnvironment(scene: Scene): Promise<void> {
    // Create a light
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Load the city model for visuals only (no physics)
    await SceneLoader.ImportMeshAsync("", "/models/", "city.glb", scene);

    // Create a large, invisible ground plane for physics
    const ground = CreateGround("ground", { width: 100, height: 100 }, scene);
    ground.isVisible = false; // The ground itself is not visible

    // Create a static physics body for the invisible ground
    const groundShape = new PhysicsShapeBox(
        Vector3.Zero(),
        Quaternion.Identity(),
        new Vector3(100, 0.1, 100),
        scene
    );
    const groundBody = new PhysicsBody(ground, PhysicsMotionType.STATIC, false, scene);
    groundBody.shape = groundShape;

    console.log("Stable environment created with invisible physics ground.");
}
