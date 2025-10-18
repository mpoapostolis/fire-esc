# Fire-ESC Internationalization System

## Overview

All text strings in the Fire-ESC game have been extracted to a JSON file for easy translation and management. This allows you to:
- Update all game text in one central location
- Add new languages easily
- Maintain consistent terminology across the game

## File Structure

```
fire-esc/
├── public/
│   └── locales/
│       └── el.json          # Greek language file (currently active)
└── src/
    └── assets/
        └── scripts/
            ├── i18n.ts           # Translation system core
            └── ui-i18n.ts        # UI element updater
```

## Language File Format

The language file (`public/locales/el.json`) is organized into logical sections:

### 1. UI Section
- **buttons**: Button text (e.g., "Continue")
- **controls**: Control instructions for keyboard/mouse/mobile
- **hud**: Heads-up display labels (distance, time)
- **compass**: Cardinal directions (North, South, East, West)
- **status**: Status messages (no objective, completed, distance)

### 2. Game Section
- **modals**: Modal dialog titles and headers
- **messages**: Longer game messages (welcome text, warnings)

### 3. Quests Section
- **quest1-quest5**: Each quest has:
  - `title`: Quest name
  - `riddle`: The puzzle/clue text
  - `successMessage`: Message shown when quest is completed
  - `caller`: Phone caller name

## How to Use

### Reading Translations in Code

```typescript
import { t } from "./i18n";

// Simple translation
const buttonText = t("ui.buttons.continue"); // Returns: "Συνεχισε"

// Translation with variable replacement
const distance = t("ui.status.distanceFormat", { distance: "50" }); // Returns: "50m"
```

### Quest Data

Quest data is automatically loaded from the JSON file:

```typescript
import { i18n } from "./i18n";

const questData = i18n.getQuestData(1);
// Returns: { title, riddle, successMessage, caller }
```

## Adding a New Language

1. **Create a new language file:**
   ```bash
   cp public/locales/el.json public/locales/en.json
   ```

2. **Translate all strings in the new file:**
   Edit `public/locales/en.json` and replace Greek text with English

3. **Load the new language:**
   In `src/assets/scripts/main.ts`, change:
   ```typescript
   await i18n.loadTranslations("el"); // Greek
   ```
   to:
   ```typescript
   await i18n.loadTranslations("en"); // English
   ```

## Current String Inventory

**Total**: ~60 distinct strings organized across:
- 20+ UI labels and controls
- 12+ game state messages and modals
- 5 quests × 4 fields = 20 quest-related strings
- 4 compass directions
- 3 status messages

## File References

All text strings have been removed from the following files and replaced with JSON lookups:

- `src/assets/scripts/quests/quests.ts` - Quest data (riddles, success messages)
- `src/assets/scripts/game.ts` - Modal titles, game messages
- `src/pages/index.astro` - UI labels (updated via ui-i18n.ts)
- `src/assets/scripts/managers/UIManager.ts` - Status display messages

## Example: Editing Text

To change the welcome message:

1. Open `public/locales/el.json`
2. Find the `game.messages.welcome` key
3. Edit the text
4. Save the file
5. Rebuild the game: `npm run build`

No code changes required!

## TypeScript Type Safety

The translation system is fully typed. If you try to access a non-existent translation key, TypeScript will warn you during development.

## Future Enhancements

Possible additions to the i18n system:
- Language selector UI in-game
- Browser language detection
- Fallback to default language if translation missing
- Right-to-left (RTL) language support
- Pluralization support
- Date/time formatting per locale

---

**Note**: All original Greek text is preserved in `public/locales/el.json` - nothing has been lost!
