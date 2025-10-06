import {
    Scene,
    Camera,
    Vector3,
    Ray,
    AbstractMesh,
    Mesh,
    Node,
    Material
} from "@babylonjs/core";

export function setupCameraOcclusion(
    scene: Scene,
    camera: Camera,
    getTarget: () => Vector3,
    excludeMeshes: AbstractMesh[] = []
) {
    // Track occluded meshes
    if (!scene.metadata) scene.metadata = {};
    if (!scene.metadata.occludedMeshes) scene.metadata.occludedMeshes = new Map();

    // Reuse objects to avoid allocations
    const direction = Vector3.Zero();
    const ray = new Ray(Vector3.Zero(), Vector3.Zero(), 1);
    const currentlyBlocking = new Set<Mesh>();
    const excludeSet = new Set(excludeMeshes);

    const update = () => {
        const cameraPos = camera.position;
        const target = getTarget();

        target.subtractToRef(cameraPos, direction);
        const distance = direction.length();
        direction.normalizeFromLength(distance);

        ray.origin.copyFrom(cameraPos);
        ray.direction.copyFrom(direction);
        ray.length = distance;

        const hits = scene.multiPickWithRay(ray, (mesh) => {
            return !excludeSet.has(mesh) && mesh.isVisible;
        });

        currentlyBlocking.clear();

        if (hits && hits.length > 0) {
            for (const hit of hits) {
                const pickedMesh = hit.pickedMesh;
                if (pickedMesh) {
                    const processMesh = (mesh: Node) => {
                        if (mesh instanceof Mesh && mesh.material) {
                            currentlyBlocking.add(mesh);

                            if (!scene.metadata.occludedMeshes.has(mesh)) {
                                const mat = mesh.material;
                                scene.metadata.occludedMeshes.set(mesh, {
                                    alpha: mat.alpha,
                                    transparencyMode: mat.transparencyMode,
                                });
                                mat.alpha = 0.3;
                                mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
                            }
                        }
                    };
                    processMesh(pickedMesh);
                }
            }
        }

        const toRestore: Mesh[] = [];
        scene.metadata.occludedMeshes.forEach(
            (originalState: { alpha: number; transparencyMode: number }, mesh: Mesh) => {
                if (!currentlyBlocking.has(mesh)) {
                    const mat = mesh.material;
                    if (mat) {
                        mat.alpha = originalState.alpha;
                        mat.transparencyMode = originalState.transparencyMode;
                    }
                    toRestore.push(mesh);
                }
            }
        );

        for (let i = 0, len = toRestore.length; i < len; i++) {
            scene.metadata.occludedMeshes.delete(toRestore[i]);
        }
    };

    const dispose = () => {
        if (scene.metadata?.occludedMeshes) {
            scene.metadata.occludedMeshes.forEach(
                (originalState: { alpha: number; transparencyMode: number }, mesh: Mesh) => {
                    if (mesh.material) {
                        mesh.material.alpha = originalState.alpha;
                        mesh.material.transparencyMode = originalState.transparencyMode;
                    }
                }
            );
            scene.metadata.occludedMeshes.clear();
        }
    };

    return { update, dispose };
}
