/**
 * UI Internationalization loader
 * This module loads translations and updates UI elements on the page
 */

import { i18n, t } from "./i18n";

/**
 * Initialize UI translations
 * Must be called after translations are loaded
 */
export function initUITranslations() {
  // Update button text
  const continueButton = document.querySelector('#dialogue_modal button span');
  if (continueButton) {
    continueButton.textContent = t('ui.buttons.continue');
  }

  // Update control labels (desktop)
  const controlHeaders = document.querySelectorAll('#info-modal h3');
  if (controlHeaders.length >= 2) {
    controlHeaders[0].textContent = t('ui.controls.movement');
    controlHeaders[1].textContent = t('ui.controls.camera');
  }

  // Update control descriptions (desktop)
  const controlDescriptions = document.querySelectorAll('#info-modal .hidden.md\\:block span.text-white\\/50');
  if (controlDescriptions.length >= 4) {
    (controlDescriptions[0] as HTMLElement).textContent = t('ui.controls.moveKeys');
    (controlDescriptions[1] as HTMLElement).textContent = t('ui.controls.runKey');
    (controlDescriptions[2] as HTMLElement).textContent = t('ui.controls.jumpKey');
    (controlDescriptions[3] as HTMLElement).textContent = t('ui.controls.mouseDrag');
  }

  // Update mobile controls
  const mobileHeaders = document.querySelectorAll('#info-modal .md\\:hidden h3');
  if (mobileHeaders.length >= 2) {
    (mobileHeaders[0] as HTMLElement).textContent = t('ui.controls.movement');
    (mobileHeaders[1] as HTMLElement).textContent = t('ui.controls.camera');
  }

  const mobileDescriptions = document.querySelectorAll('#info-modal .md\\:hidden span.text-white\\/50');
  if (mobileDescriptions.length >= 2) {
    (mobileDescriptions[0] as HTMLElement).textContent = t('ui.controls.joystick');
    (mobileDescriptions[1] as HTMLElement).textContent = t('ui.controls.touchDrag');
  }

  // Update HUD labels
  const hudLabels = document.querySelectorAll('.text-xs.uppercase.font-black.tracking-widest');
  if (hudLabels.length >= 2) {
    (hudLabels[0] as HTMLElement).textContent = t('ui.hud.distance');
    (hudLabels[1] as HTMLElement).textContent = t('ui.hud.time');
  }

  // Update compass directions
  const compassDirections = document.querySelectorAll('#compass-needle > div');
  if (compassDirections.length >= 4) {
    // North (top)
    (compassDirections[0] as HTMLElement).textContent = t('ui.compass.north');
    // South (bottom)
    (compassDirections[1] as HTMLElement).textContent = t('ui.compass.south');
    // East (right)
    (compassDirections[2] as HTMLElement).textContent = t('ui.compass.east');
    // West (left)
    (compassDirections[3] as HTMLElement).textContent = t('ui.compass.west');
  }
}
