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
  // GENERIC DATA-I18N HANDLER
  // This handles all elements with data-i18n attribute, which now covers
  // loading screen, modals, HUD, controls, etc.
  const i18nElements = document.querySelectorAll("[data-i18n]");
  i18nElements.forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (key) {
      const translation = t(key);
      if (translation !== key) {
        element.textContent = translation;
      }
    }
  });

  // Specific handling for elements that might not have data-i18n or need updates
  // mostly legacy or dynamic elements if any remain.
  // Currently, index.astro has been updated to use data-i18n for almost everything.
}
