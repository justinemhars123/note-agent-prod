// ─── a11y.js — Accessibility utilities and enhancements ───────────────────────
// Helps ensure WCAG 2.1 Level AA compliance with screen reader support,
// keyboard navigation, and focus management.

/**
 * Announce a message to screen readers using aria-live regions
 * @param {string} message - The message to announce
 * @param {string} priority - 'polite' (default) or 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only'; // Hidden visually but available to screen readers
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
        announcement.remove();
    }, 1000);
}

/**
 * Set focus to an element with optional announcement
 * @param {HTMLElement} element - Element to focus
 * @param {string} announce - Optional message to announce
 */
export function setFocus(element, announce = null) {
    if (!element) return;

    if (announce) {
        announceToScreenReader(announce, 'polite');
    }

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        element.focus();

        // Scroll into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
}

/**
 * Make an icon-only button accessible by adding aria-label if not present
 * @param {HTMLElement} button - Button element
 * @param {string} label - Accessible label text
 */
export function makeIconButtonAccessible(button, label) {
    if (button && !button.getAttribute('aria-label')) {
        button.setAttribute('aria-label', label);
    }
}

/**
 * Link a form field with its error message
 * @param {HTMLElement} field - Form input element
 * @param {HTMLElement} errorElement - Error message element
 */
export function linkErrorToField(field, errorElement) {
    if (!field || !errorElement) return;

    const errorId = errorElement.id || `error-${Math.random().toString(36).substr(2, 9)}`;
    errorElement.id = errorId;
    errorElement.setAttribute('role', 'alert');

    const currentDescribedBy = field.getAttribute('aria-describedby') || '';
    const updatedDescribedBy = currentDescribedBy
        ? `${currentDescribedBy} ${errorId}`
        : errorId;

    field.setAttribute('aria-describedby', updatedDescribedBy);
}

/**
 * Update the aria-expanded state of a collapsible element
 * @param {HTMLElement} button - Toggle button
 * @param {HTMLElement} panel - Collapsible panel
 * @param {boolean} isExpanded - Whether the panel is expanded
 */
export function updateCollapsibleState(button, panel, isExpanded) {
    if (!button || !panel) return;

    button.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    panel.hidden = !isExpanded;
}

/**
 * Setup keyboard shortcuts with screen reader announcements
 * @param {string} key - Key to listen for (e.g., 'Enter', 'Escape')
 * @param {function} callback - Function to call when key is pressed
 * @param {HTMLElement} element - Element to attach listener (default: document)
 */
export function setupKeyboardShortcut(key, callback, element = document) {
    element.addEventListener('keydown', (e) => {
        if (e.key === key) {
            e.preventDefault();
            callback(e);
        }
    });
}

/**
 * Create a skip-to-main link for keyboard navigation
 * Should be the first interactive element in the page
 * @returns {HTMLElement} - The skip link element
 */
export function createSkipToMainLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main';
    skipLink.className = 'skip-to-main';
    skipLink.textContent = 'Skip to main content';
    return skipLink;
}

/**
 * Set aria-required and aria-invalid on form fields
 * @param {HTMLElement} field - Form input element
 * @param {boolean} isRequired - Whether field is required
 * @param {boolean} isInvalid - Whether field has validation error
 */
export function updateFieldAccessibility(field, isRequired = false, isInvalid = false) {
    if (!field) return;

    if (isRequired) {
        field.setAttribute('aria-required', 'true');
    }

    if (isInvalid) {
        field.setAttribute('aria-invalid', 'true');
    } else {
        field.setAttribute('aria-invalid', 'false');
    }
}

/**
 * Make progress bar accessible to screen readers
 * @param {HTMLElement} bar - Progress bar element
 * @param {number} current - Current progress value
 * @param {number} total - Total/maximum value
 */
export function updateProgressBarAccessibility(bar, current, total) {
    if (!bar) return;

    const percentage = Math.round((current / total) * 100);

    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuenow', current);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', total);
    bar.setAttribute('aria-label', `Progress: ${percentage}% complete`);
}

/**
 * Handle focus trap for modals (keep focus within modal)
 * @param {HTMLElement} modal - Modal element
 */
export function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    modal.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}

/**
 * Check if element is visible to screen readers
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isAccessible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);

    return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        !element.hasAttribute('aria-hidden')
    );
}

/**
 * Create a visually hidden element (for screen readers only)
 * @param {string} text - Text content
 * @returns {HTMLElement}
 */
export function createScreenReaderOnly(text) {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
}

/**
 * Add CSS for screen reader only elements
 * Should be called once on page load
 */
export function injectScreenReaderStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
        }

        .skip-to-main {
            position: absolute;
            top: -40px;
            left: 0;
            background: #000;
            color: white;
            padding: 8px;
            text-decoration: none;
            z-index: 100;
        }

        .skip-to-main:focus {
            top: 0;
        }

        /* Focus visible for keyboard navigation */
        *:focus-visible {
            outline: 3px solid #6c63ff;
            outline-offset: 2px;
        }
    `;
    document.head.appendChild(style);
}

export default {
    announceToScreenReader,
    setFocus,
    makeIconButtonAccessible,
    linkErrorToField,
    updateCollapsibleState,
    setupKeyboardShortcut,
    createSkipToMainLink,
    updateFieldAccessibility,
    updateProgressBarAccessibility,
    trapFocus,
    isAccessible,
    createScreenReaderOnly,
    injectScreenReaderStyles,
};
