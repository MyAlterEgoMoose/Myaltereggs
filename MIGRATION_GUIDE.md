# Tailwind CSS Migration Guide

This project has been migrated from custom CSS to Tailwind CSS v4. Here's what was done and how to continue the migration.

## What Was Done

### 1. Installation
- Installed Tailwind CSS v4, PostCSS, and Autoprefixer
- Installed `@tailwindcss/cli` for building styles

### 2. Configuration Files Created
- **`tailwind.config.js`**: Configures custom colors matching your original design
- **`postcss.config.js`**: PostCSS configuration for Tailwind
- **`src/styles.css`**: New main stylesheet with Tailwind imports and custom components

### 3. Build System
- **`dist/output.css`**: Generated CSS file (do not edit manually)
- Added npm scripts:
  - `npm run build` - Build CSS once
  - `npm run watch` - Watch for changes and rebuild automatically

### 4. Updated HTML
- Changed `index.html` to reference `dist/output.css` instead of `styles.css`

## Current Status

The migration is **partially complete**. The following component classes have been migrated to `src/styles.css`:

- `.mode-toggle-btn` (including `.active` and `:hover` states)
- `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.btn-upload`
- `.section-title`
- `.input-group` and labels
- `.question-card`
- `.slide-option` (including `.selected` and `:hover` states)
- `.tab-btn` (including `.active` state)

## Remaining Work

The following CSS from `styles.css` still needs to be migrated:

1. **Layout classes**: `.app-container`, `.builder-panel`, `.main-content`, etc.
2. **Quiz-specific styles**: `.slide-question-text`, `.options-grid`, slider styles
3. **Grading section**: `.grading-section`, `.participant-circle-item`, etc.
4. **Scoreboard**: All scoreboard-related styles
5. **Modal styles**: All modal-related classes
6. **Hide Image feature**: Grid and hide-image specific styles
7. **Animations and keyframes**
8. **Responsive media queries**

## How to Continue Migration

### Option 1: Gradual Migration (Recommended)

1. Keep both `styles.css` and `dist/output.css` temporarily
2. Update `index.html` to include both:
   ```html
   <link rel="stylesheet" href="dist/output.css">
   <link rel="stylesheet" href="styles.css">
   ```
3. Move CSS rules one section at a time from `styles.css` to `src/styles.css`
4. Test after each section
5. Remove `styles.css` reference when done

### Option 2: Full Migration at Once

Copy remaining CSS from `styles.css` to `src/styles.css` in the format:

```css
/* Add to src/styles.css */
.your-class {
  /* your properties */
}
```

Then rebuild: `npm run build`

## Using Tailwind Utility Classes

Instead of writing custom CSS, you can use Tailwind utilities directly in HTML:

### Before:
```html
<button class="btn-primary">Save</button>
```

### After (with utilities):
```html
<button class="bg-primary text-white px-4 py-2 rounded font-semibold hover:opacity-90">Save</button>
```

## Development Workflow

1. **Start development server:**
   ```bash
   npm start
   ```

2. **Watch for CSS changes (in another terminal):**
   ```bash
   npm run watch
   ```

3. **Edit `src/styles.css`** - changes will auto-rebuild

4. **Or add utility classes directly to HTML**

## Custom Theme Colors

Your custom colors are configured in `src/styles.css`:

- `--color-primary`: #2c7da0 (blue)
- `--color-secondary`: #5e6b7c (gray)
- `--color-danger`: #b91c1c (red)
- `--color-accent`: #667eea (purple)
- `--color-accent-dark`: #764ba2 (dark purple)

Use them in CSS with `var(--color-primary)` or in utilities where supported.

## Next Steps

1. Decide on migration approach (gradual vs full)
2. Migrate remaining CSS sections
3. Optionally refactor HTML to use more Tailwind utilities
4. Remove old `styles.css` when complete
5. Consider adding watch mode to your development workflow

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind v4 Migration Guide](https://tailwindcss.com/docs/upgrade-guide)
