// ─── errorHandler.js — Centralized error handling and recovery ────────────────
// Provides user-friendly error messages and recovery suggestions.

/**
 * Error types and their user-friendly messages
 */
const ERROR_MESSAGES = {
    NETWORK_ERROR: {
        title: '❌ Network Error',
        message: 'Could not reach the server. Check your internet connection and try again.',
        recoverable: true,
        actions: ['Retry', 'Check connection']
    },
    RATE_LIMIT: {
        title: '⏱️ Rate Limited',
        message: 'Too many requests. Please wait a moment before trying again.',
        recoverable: true,
        retryAfter: 5,
        actions: ['Retry in 5s', 'Wait manually']
    },
    API_TIMEOUT: {
        title: '⏳ Request Timeout',
        message: 'The AI took too long to respond. Please try with shorter notes.',
        recoverable: true,
        actions: ['Retry', 'Shorten notes']
    },
    EMPTY_INPUT: {
        title: '📝 Empty Notes',
        message: 'Please add some notes before submitting.',
        recoverable: false,
        actions: ['Type notes']
    },
    INPUT_TOO_LONG: {
        title: '📏 Notes Too Long',
        message: 'Your notes exceed 2,000 characters. Please shorten them.',
        recoverable: false,
        actions: ['Edit notes']
    },
    API_ERROR: {
        title: '🔌 API Error',
        message: 'The AI provider returned an error. Please try again.',
        recoverable: true,
        actions: ['Retry', 'Check status']
    },
    UNKNOWN_ERROR: {
        title: '⚠️ Something Went Wrong',
        message: 'An unexpected error occurred. Please try again or contact support.',
        recoverable: false,
        actions: ['Retry', 'Contact support']
    }
};

/**
 * Parse an error and return structured error info
 * @param {Error|string} error
 * @returns {object} - { type, title, message, recoverable, actions }
 */
export function parseError(error) {
    const message = typeof error === 'string' ? error : error?.message || '';

    // Identify error type
    if (message.match(/network|fetch|connection/i)) {
        return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (message.match(/429|rate.*limit|too.*request/i)) {
        return ERROR_MESSAGES.RATE_LIMIT;
    }
    if (message.match(/timeout|took.*long/i)) {
        return ERROR_MESSAGES.API_TIMEOUT;
    }
    if (message.match(/empty|no notes/i)) {
        return ERROR_MESSAGES.EMPTY_INPUT;
    }
    if (message.match(/too long|exceed.*character/i)) {
        return ERROR_MESSAGES.INPUT_TOO_LONG;
    }
    if (message.match(/api|ai|provider|model/i)) {
        return ERROR_MESSAGES.API_ERROR;
    }

    return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Show error to user with recovery options
 * @param {HTMLElement} errorBox - Error display element
 * @param {Error|string} error - Error to display
 * @param {function} onRetry - Callback for retry action
 */
export function displayError(errorBox, error, onRetry = null) {
    if (!errorBox) return;

    const errorInfo = parseError(error);

    errorBox.classList.remove('hidden');

    // Build error message
    let content = `
        <div class="error-box-content">
            <span class="error-title">${errorInfo.title}</span>
            <p class="error-message">${errorInfo.message}</p>
    `;

    // Add recovery suggestions if available
    if (errorInfo.actions && errorInfo.actions.length > 0) {
        content += `
            <div class="error-actions">
                <span class="error-hint">Try:</span>
                <ul class="error-suggestions">
        `;
        errorInfo.actions.forEach((action, i) => {
            content += `<li>${i + 1}. ${action}</li>`;
        });
        content += `
                </ul>
            </div>
        `;
    }

    // Add retry button if recoverable
    if (errorInfo.recoverable && onRetry) {
        const retryText = errorInfo.retryAfter
            ? `Retry in ${errorInfo.retryAfter}s`
            : 'Retry';

        content += `
            <button class="error-retry-btn" onclick="arguments[0].onRetry?.()">
                🔄 ${retryText}
            </button>
        `;
    }

    content += '</div>';

    errorBox.innerHTML = content;

    // Attach retry handler
    const retryBtn = errorBox.querySelector('.error-retry-btn');
    if (retryBtn && onRetry) {
        let countdown = errorInfo.retryAfter || 0;

        if (countdown > 0) {
            retryBtn.disabled = true;
            const interval = setInterval(() => {
                countdown--;
                retryBtn.textContent = `⏳ Retry in ${countdown}s`;
                if (countdown <= 0) {
                    clearInterval(interval);
                    retryBtn.disabled = false;
                    retryBtn.textContent = '🔄 Retry';
                }
            }, 1000);
        }

        retryBtn.addEventListener('click', () => {
            errorBox.classList.add('hidden');
            onRetry();
        });
    }
}

/**
 * Clear error display
 * @param {HTMLElement} errorBox - Error display element
 */
export function clearError(errorBox) {
    if (errorBox) {
        errorBox.classList.add('hidden');
        errorBox.innerHTML = '';
    }
}

/**
 * Wrap an async function with error handling
 * @param {function} asyncFn - Async function to execute
 * @param {HTMLElement} errorBox - Error display element
 * @returns {Promise}
 */
export async function withErrorBoundary(asyncFn, errorBox) {
    try {
        clearError(errorBox);
        return await asyncFn();
    } catch (err) {
        displayError(errorBox, err);
        throw err;
    }
}

/**
 * Check if error is recoverable
 * @param {Error|string} error
 * @returns {boolean}
 */
export function isRecoverable(error) {
    return parseError(error).recoverable;
}

export default {
    parseError,
    displayError,
    clearError,
    withErrorBoundary,
    isRecoverable,
    ERROR_MESSAGES
};
