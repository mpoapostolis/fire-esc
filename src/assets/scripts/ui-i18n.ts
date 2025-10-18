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

  // Update control labels - Get all h3 elements in info modal
  const allHeaders = document.querySelectorAll('#info-modal h3');
  // First two are desktop, next two are mobile
  if (allHeaders.length >= 4) {
    // Desktop
    allHeaders[0].textContent = t('ui.controls.movement');
    allHeaders[1].textContent = t('ui.controls.camera');
    // Mobile
    allHeaders[2].textContent = t('ui.controls.movement');
    allHeaders[3].textContent = t('ui.controls.camera');
  }

  // Update control descriptions - Get all span.text-white/50 in info modal
  const allDescriptions = Array.from(document.querySelectorAll('#info-modal span'));
  const whiteDescriptions = allDescriptions.filter(span =>
    span.className.includes('text-white/50') || span.className.includes('text-white\\/50')
  );

  if (whiteDescriptions.length >= 6) {
    // Desktop controls (first 4)
    whiteDescriptions[0].textContent = t('ui.controls.moveKeys');
    whiteDescriptions[1].textContent = t('ui.controls.runKey');
    whiteDescriptions[2].textContent = t('ui.controls.jumpKey');
    whiteDescriptions[3].textContent = t('ui.controls.mouseDrag');
    // Mobile controls (last 2)
    whiteDescriptions[4].textContent = t('ui.controls.joystick');
    whiteDescriptions[5].textContent = t('ui.controls.touchDrag');
  }

  // Update HUD labels - use more specific selectors
  const hudDistanceLabel = document.querySelector('.text-yellow-300.uppercase.font-black.tracking-widest');
  if (hudDistanceLabel) {
    hudDistanceLabel.textContent = t('ui.hud.distance');
  }

  const hudTimeLabel = document.querySelector('.text-pink-300.uppercase.font-black.tracking-widest');
  if (hudTimeLabel) {
    hudTimeLabel.textContent = t('ui.hud.time');
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
