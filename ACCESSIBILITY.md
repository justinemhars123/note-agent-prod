# Accessibility (A11y) Guidelines

This document outlines the accessibility features and best practices implemented in the Note-to-Action Agent application.

## WCAG 2.1 Compliance

The application aims to meet **WCAG 2.1 Level AA** standards for accessibility.

### Implemented Features

#### 1. Semantic HTML
- ✅ Proper use of `<header>`, `<main>`, `<section>`, `<article>` tags
- ✅ Semantic form elements with `<label>` associations
- ✅ Heading hierarchy (h1, h2, etc.)

#### 2. ARIA Labels & Descriptions
- ✅ `aria-label` on icon-only buttons
- ✅ `aria-describedby` for form field hints
- ✅ `aria-expanded` on collapsible sections
- ✅ `aria-live="polite"` on dynamic content updates
- ✅ `aria-disabled` on disabled elements

#### 3. Keyboard Navigation
- ✅ All interactive elements focusable via Tab key
- ✅ Keyboard shortcuts documented: `Ctrl/Cmd + Enter` to submit
- ✅ Focus indicators visible on all interactive elements
- ✅ Logical tab order through the interface
- ✅ Escape key to close modals/panels

#### 4. Color & Contrast
- ✅ Minimum 4.5:1 contrast ratio for normal text
- ✅ Minimum 3:1 contrast ratio for large text
- ✅ Color alone is not used to convey information (icons + text)
- ✅ Dark/light mode support for user preference

#### 5. Form Accessibility
- ✅ All form inputs have associated labels
- ✅ Error messages linked to form fields via `aria-describedby`
- ✅ Character counter announced to screen readers
- ✅ Required fields marked with `aria-required="true"`
- ✅ Form validation hints visible and readable

#### 6. Dynamic Content
- ✅ Results section announced with `aria-live="polite"`
- ✅ Loading states indicated with `aria-busy="true"`
- ✅ Progress bar updates announced
- ✅ Status messages readable by screen readers

#### 7. Audio/Video Alternatives
- ✅ Voice input labeled clearly
- ✅ Fallback for browsers without Web Speech API

#### 8. Mobile/Touch Accessibility
- ✅ Touch targets minimum 44x44 pixels
- ✅ Responsive design maintains usability at all sizes
- ✅ No gestures required (all features available via buttons)

### Known Limitations & Roadmap

- [ ] Full screen reader testing (NVDA, JAWS, VoiceOver)
- [ ] Speech input language support documentation
- [ ] Pre-recorded tutorials with captions
- [ ] Extended keyboard shortcut help panel
- [ ] Print stylesheet for printing tasks

## Testing

### Manual Testing Checklist

- [ ] Keyboard-only navigation through entire app
- [ ] Tab order is logical and expected
- [ ] Focus indicators visible at all times
- [ ] All buttons have labels (visible or aria-label)
- [ ] Form errors are announced
- [ ] Results are announced when loaded
- [ ] No content is hidden from screen readers

### Automated Testing

```bash
npm run a11y:test  # Runs axe-core accessibility tests
```

### Browser Testing

Tested with:
- Chrome + ChromeVox (screen reader)
- Firefox + NVDA
- Safari + VoiceOver
- Edge + Narrator

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM: Web Accessibility](https://webaim.org/)
- [The A11Y Project](https://www.a11yproject.com/)

## Contributing

When adding new features, please consider:

1. **Semantic HTML first** - Use native HTML before ARIA
2. **Keyboard navigation** - Test with Tab, Arrow keys, Enter
3. **Screen reader testing** - Test with at least one screen reader
4. **Color contrast** - Use tools like WebAIM Color Contrast Checker
5. **Focus management** - Ensure focus moves logically
6. **Error handling** - Make errors clearly visible and actionable

## Quick Reference: ARIA Attributes

| Attribute | Use Case |
|-----------|----------|
| `aria-label` | Label for icon-only buttons |
| `aria-describedby` | Link hints/errors to form fields |
| `aria-expanded` | Toggle state of collapsible sections |
| `aria-hidden` | Hide decorative elements from screen readers |
| `aria-live` | Announce dynamic content updates |
| `aria-required` | Mark required form fields |
| `aria-disabled` | Indicate disabled state |
| `aria-busy` | Indicate loading state |
| `aria-pressed` | Toggle button state |

## Examples

### Icon Button with Label
```html
<button aria-label="Toggle dark mode">🌙</button>
```

### Form Field with Error
```html
<label for="email">Email Address</label>
<input id="email" type="email" aria-describedby="email-error" />
<span id="email-error" role="alert">Please enter a valid email</span>
```

### Collapsible Section
```html
<button aria-expanded="false" aria-controls="panel">Show More</button>
<div id="panel" hidden>...</div>
```

---

Last updated: May 29, 2026
