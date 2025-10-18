/**
 * Internationalization (i18n) system for fire-esc game
 *
 * This module provides access to all game text strings from JSON files.
 * Currently supports Greek (el) language.
 */

interface Translations {
  ui: {
    buttons: {
      continue: string;
    };
    controls: {
      movement: string;
      camera: string;
      moveKeys: string;
      runKey: string;
      jumpKey: string;
      mouseDrag: string;
      joystick: string;
      touchDrag: string;
    };
    hud: {
      distance: string;
      time: string;
    };
    compass: {
      north: string;
      south: string;
      east: string;
      west: string;
    };
    status: {
      noObjective: string;
      completed: string;
      distanceFormat: string;
    };
  };
  game: {
    modals: {
      message: string;
      sign: string;
      nextMission: string;
      gameEnd: string;
      success: string;
      timeUp: string;
      tryAgain: string;
      gameOver: string;
      congratulations: string;
      falseAlarm: string;
    };
    messages: {
      welcome: string;
      falseAlarmMessage: string;
    };
  };
  quests: {
    [key: string]: {
      title: string;
      riddle: string;
      successMessage: string;
      caller: string;
    };
  };
}

class I18n {
  private translations: Translations | null = null;
  private currentLocale = 'el'; // Default to Greek

  /**
   * Load translations from JSON file
   */
  async loadTranslations(locale: string = 'el'): Promise<void> {
    try {
      const response = await fetch(`/locales/${locale}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translations for locale: ${locale}`);
      }
      this.translations = await response.json();
      this.currentLocale = locale;
    } catch (error) {
      console.error('Error loading translations:', error);
      throw error;
    }
  }

  /**
   * Get a translation by key path
   * Example: t('ui.buttons.continue') returns "Συνεχισε"
   */
  t(keyPath: string, replacements?: Record<string, string | number>): string {
    if (!this.translations) {
      console.warn('Translations not loaded yet');
      return keyPath;
    }

    const keys = keyPath.split('.');
    let value: any = this.translations;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.warn(`Translation key not found: ${keyPath}`);
        return keyPath;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${keyPath}`);
      return keyPath;
    }

    // Handle replacements like {distance}
    if (replacements) {
      return value.replace(/\{(\w+)\}/g, (match, key) => {
        return key in replacements ? String(replacements[key]) : match;
      });
    }

    return value;
  }

  /**
   * Get quest data by quest number (1-5)
   */
  getQuestData(questNumber: number): {
    title: string;
    riddle: string;
    successMessage: string;
    caller: string;
  } {
    const questKey = `quest${questNumber}`;
    return {
      title: this.t(`quests.${questKey}.title`),
      riddle: this.t(`quests.${questKey}.riddle`),
      successMessage: this.t(`quests.${questKey}.successMessage`),
      caller: this.t(`quests.${questKey}.caller`),
    };
  }

  /**
   * Get current locale
   */
  getLocale(): string {
    return this.currentLocale;
  }

  /**
   * Check if translations are loaded
   */
  isLoaded(): boolean {
    return this.translations !== null;
  }
}

// Export singleton instance
export const i18n = new I18n();

// Helper function for shorter syntax
export const t = (keyPath: string, replacements?: Record<string, string | number>) =>
  i18n.t(keyPath, replacements);

// Export type for use in other files
export type { Translations };
