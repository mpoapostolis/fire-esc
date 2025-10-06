import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

// Initialize Havok physics engine once and export the promise
const havokInstancePromise = HavokPhysics();

/**
 * Gets the initialized Havok physics plugin.
 * This function ensures that Havok is only initialized once.
 * @returns A promise that resolves to the HavokPlugin.
 */
export async function getHavokPlugin() {
    const havokInstance = await havokInstancePromise;
    return new HavokPlugin(true, havokInstance);
}
