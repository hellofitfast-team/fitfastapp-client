# RTL (Right-to-Left) Support

FitFast PWA supports both English (LTR) and Arabic (RTL) languages. This document explains the implementation patterns.

## How RTL Works

### HTML Direction Attribute

The `dir` attribute is set on the `<html>` element in `/src/app/[locale]/layout.tsx`:

```tsx
const dir = locale === "ar" ? "rtl" : "ltr";
return <html lang={locale} dir={dir}>...</html>;
```

### Tailwind CSS Logical Properties

Instead of using fixed directional classes like `left`, `right`, `ml-*`, `mr-*`, we use **logical property utilities** that automatically flip in RTL:

| LTR Fixed | RTL-Compatible | Description |
|-----------|----------------|-------------|
| `left-0` | `start-0` | Positioning from start edge |
| `right-0` | `end-0` | Positioning from end edge |
| `ml-4` | `ms-4` | Margin at start |
| `mr-4` | `me-4` | Margin at end |
| `pl-4` | `ps-4` | Padding at start |
| `pr-4` | `pe-4` | Padding at end |
| `border-l-4` | `border-s-4` | Border at start |
| `border-r-4` | `border-e-4` | Border at end |
| `text-left` | `text-start` | Text alignment start |
| `text-right` | `text-end` | Text alignment end |

### Examples

**Bad (doesn't flip in RTL):**
```tsx
<div className="ml-4 border-r-4 text-left">
```

**Good (flips automatically in RTL):**
```tsx
<div className="ms-4 border-e-4 text-start">
```

## Files with RTL Support

The following files have been updated to use RTL-compatible classes:

### Layout Components
- `/src/components/layouts/sidebar.tsx` - Uses `start-0` and `border-e-4`
- `/src/components/layouts/header.tsx` - Uses `end` positioning

### Dashboard Pages
- `/src/app/[locale]/(dashboard)/page.tsx`
- `/src/app/[locale]/(dashboard)/meal-plan/page.tsx`
- `/src/app/[locale]/(dashboard)/workout-plan/page.tsx`
- `/src/app/[locale]/(dashboard)/check-in/page.tsx`
- `/src/app/[locale]/(dashboard)/tracking/page.tsx`
- `/src/app/[locale]/(dashboard)/progress/page.tsx`
- `/src/app/[locale]/(dashboard)/tickets/page.tsx`
- `/src/app/[locale]/(dashboard)/faq/page.tsx`
- `/src/app/[locale]/(dashboard)/settings/page.tsx`

### UI Components
- `/src/components/ui/dropdown-menu.tsx`
- All form inputs and buttons

## Translations

All user-facing text is translated using `next-intl`. Translation files are located at:

- `/src/messages/en.json` - English
- `/src/messages/ar.json` - Arabic

### Adding New Translations

1. Add the English key to `en.json`
2. Add the Arabic translation to `ar.json`
3. Use the translation in components:

```tsx
const t = useTranslations("namespace");
return <h1>{t("key")}</h1>;
```

### FAQ Translations

FAQ questions and answers are fully translated. The FAQ page uses translation keys instead of hardcoded content:

```tsx
const faqs = faqKeys.map((key) => ({
  question: t(`questions.${key}.q`),
  answer: t(`questions.${key}.a`),
}));
```

## Testing RTL

1. Switch language to Arabic using the language switcher in the header
2. The entire UI should flip to right-to-left
3. Sidebar should appear on the right
4. Text should be right-aligned
5. Icons and navigation should flow correctly

## Known Considerations

- Some icons (like arrows/chevrons) may need manual flipping using `rtl:rotate-180` if they indicate direction
- Charts may need special handling for RTL (Recharts handles this automatically)
- Input fields with icons may need adjustment

## Resources

- [Tailwind CSS RTL Support](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)
- [MDN: CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
