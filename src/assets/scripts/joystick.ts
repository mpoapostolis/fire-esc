export interface JoystickController {
  dispose: () => void;
  getMovement: () => { x: number; y: number };
  isPressed: () => boolean;
}

export function createJoystick(
  containerId: string = "joystick-container"
): JoystickController {
  // Create container
  const container = document.createElement("div");
  container.id = containerId;
  container.style.cssText = `
    position: fixed;
    bottom: 70px;
    left: 20px;
    width: 110px;
    height: 110px;
    pointer-events: auto;
    z-index: 40;
    display: none;
  `;

  // Create outer circle
  const outer = document.createElement("div");
  outer.style.cssText = `
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    backdrop-filter: blur(10px);
  `;

  // Create inner stick
  const stick = document.createElement("div");
  stick.style.cssText = `
    position: absolute;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transition: background 0.1s;
  `;

  container.appendChild(outer);
  container.appendChild(stick);
  document.body.appendChild(container);

  // Show on mobile
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    container.style.display = "block";
  }

  let movement = { x: 0, y: 0 };
  let pressed = false;
  const maxDistance = 40;

  const updateStick = (touch: Touch) => {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }

    stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    stick.style.background = "rgba(255, 255, 255, 1)";

    movement.x = deltaX / maxDistance;
    movement.y = deltaY / maxDistance;
  };

  const resetStick = () => {
    stick.style.transform = "translate(-50%, -50%)";
    stick.style.background = "rgba(255, 255, 255, 0.8)";
    movement = { x: 0, y: 0 };
    pressed = false;
  };

  container.addEventListener("touchstart", (e) => {
    e.preventDefault();
    pressed = true;
    updateStick(e.touches[0]);
  });

  container.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (pressed) {
      updateStick(e.touches[0]);
    }
  });

  container.addEventListener("touchend", (e) => {
    e.preventDefault();
    resetStick();
  });

  container.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    resetStick();
  });

  return {
    dispose: () => {
      container.remove();
    },
    getMovement: () => movement,
    isPressed: () => pressed,
  };
}

export function createCameraJoystick(
  containerId: string = "camera-joystick-container"
): JoystickController {
  // Create container
  const container = document.createElement("div");
  container.id = containerId;
  container.style.cssText = `
    position: fixed;
    bottom: 120px;
    right: 40px;
    width: 150px;
    height: 150px;
    pointer-events: auto;
    z-index: 1000;
    display: none;
  `;

  // Create outer circle
  const outer = document.createElement("div");
  outer.style.cssText = `
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    backdrop-filter: blur(10px);
  `;

  // Create inner stick
  const stick = document.createElement("div");
  stick.style.cssText = `
    position: absolute;
    width: 50px;
    height: 50px;
    background: rgba(255, 255, 255, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transition: background 0.1s;
  `;

  container.appendChild(outer);
  container.appendChild(stick);
  document.body.appendChild(container);

  // Show on mobile
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    container.style.display = "block";
  }

  let movement = { x: 0, y: 0 };
  let pressed = false;
  const maxDistance = 50;

  const updateStick = (touch: Touch) => {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }

    stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    stick.style.background = "rgba(255, 255, 255, 1)";

    movement.x = deltaX / maxDistance;
    movement.y = deltaY / maxDistance;
  };

  const resetStick = () => {
    stick.style.transform = "translate(-50%, -50%)";
    stick.style.background = "rgba(255, 255, 255, 0.8)";
    movement = { x: 0, y: 0 };
    pressed = false;
  };

  container.addEventListener("touchstart", (e) => {
    e.preventDefault();
    pressed = true;
    updateStick(e.touches[0]);
  });

  container.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (pressed) {
      updateStick(e.touches[0]);
    }
  });

  container.addEventListener("touchend", (e) => {
    e.preventDefault();
    resetStick();
  });

  container.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    resetStick();
  });

  return {
    dispose: () => {
      container.remove();
    },
    getMovement: () => movement,
    isPressed: () => pressed,
  };
}
