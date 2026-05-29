// ─── throttle.js — Rate limiting and debouncing utilities ─────────────────────
// Prevents API spam by limiting how often functions can be called.

/**
 * Debounce a function: delay execution until calls stop for N milliseconds
 * Useful for preventing rapid successive API calls.
 *
 * @param {function} fn - Function to debounce
 * @param {number} delayMs - Delay in milliseconds
 * @returns {function} - Debounced version of fn
 */
export function debounce(fn, delayMs = 500) {
    let timeoutId = null;

    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
        }, delayMs);
    };
}

/**
 * Throttle a function: allow execution at most once per N milliseconds
 * Useful for preventing duplicate API calls on rapid button clicks.
 *
 * @param {function} fn - Function to throttle
 * @param {number} intervalMs - Minimum interval between calls
 * @returns {function} - Throttled version of fn
 */
export function throttle(fn, intervalMs = 1000) {
    let lastCallTime = 0;
    let lastArgs = null;
    let timeoutId = null;

    return function (...args) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCallTime;

        if (timeSinceLastCall >= intervalMs) {
            lastCallTime = now;
            fn.apply(this, args);
        } else {
            // Schedule another call at the end of the throttle interval
            clearTimeout(timeoutId);
            lastArgs = args;
            const remainingDelay = intervalMs - timeSinceLastCall;

            timeoutId = setTimeout(() => {
                lastCallTime = Date.now();
                fn.apply(this, lastArgs);
            }, remainingDelay);
        }
    };
}

/**
 * Simple rate limiter: track calls and reject if limit exceeded
 * @param {number} maxCalls - Maximum calls allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} - { canCall(), reset(), getStatus() }
 */
export function createRateLimiter(maxCalls = 5, windowMs = 60000) {
    const calls = [];

    return {
        canCall() {
            const now = Date.now();
            // Remove calls outside the time window
            while (calls.length > 0 && calls[0] < now - windowMs) {
                calls.shift();
            }

            if (calls.length < maxCalls) {
                calls.push(now);
                return true;
            }
            return false;
        },

        reset() {
            calls.length = 0;
        },

        getStatus() {
            const now = Date.now();
            while (calls.length > 0 && calls[0] < now - windowMs) {
                calls.shift();
            }

            const nextAvailableTime = calls.length >= maxCalls
                ? calls[0] + windowMs
                : now;

            return {
                remainingCalls: Math.max(0, maxCalls - calls.length),
                totalCalls: calls.length,
                nextAvailableTime,
                windowMs,
                maxCalls
            };
        }
    };
}

/**
 * Debounce with visual feedback (disable/enable UI element)
 * Useful for preventing accidental double-clicks on submit button
 *
 * @param {function} fn - Function to execute
 * @param {HTMLElement} element - Button/element to disable during delay
 * @param {number} delayMs - Delay in milliseconds
 * @param {string} disabledText - Text to show when disabled (optional)
 * @returns {function} - Wrapped function
 */
export function debounceWithFeedback(fn, element, delayMs = 500, disabledText = null) {
    let timeoutId = null;
    const originalText = element?.textContent;

    return async function (...args) {
        // Disable the button
        if (element) {
            element.disabled = true;
            if (disabledText) element.textContent = disabledText;
        }

        clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {
            try {
                await fn.apply(this, args);
            } finally {
                // Re-enable the button
                if (element) {
                    element.disabled = false;
                    if (originalText) element.textContent = originalText;
                }
            }
        }, delayMs);
    };
}

/**
 * Create a simple cooldown tracker
 * @param {number} cooldownMs - Cooldown duration in milliseconds
 * @returns {object} - { check(), reset(), getRemainingMs() }
 */
export function createCooldown(cooldownMs = 1000) {
    let lastExecutionTime = 0;

    return {
        check() {
            const now = Date.now();
            if (now - lastExecutionTime >= cooldownMs) {
                lastExecutionTime = now;
                return true;
            }
            return false;
        },

        reset() {
            lastExecutionTime = 0;
        },

        getRemainingMs() {
            const now = Date.now();
            const remaining = cooldownMs - (now - lastExecutionTime);
            return Math.max(0, remaining);
        }
    };
}

export default {
    debounce,
    throttle,
    createRateLimiter,
    debounceWithFeedback,
    createCooldown
};
