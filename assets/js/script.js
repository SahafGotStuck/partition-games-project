/**
 * Partition Games - Main JavaScript File
 * Handles interactive functionality across the application
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAboutPopover();
    initializeThemeToggle();
    initPartitionShapeHints();
    // Space for future functionality initialization
});

/**
 * About Popover Functionality
 * Handles showing/hiding the about section in a popover
 */
function initializeAboutPopover() {
    const aboutBtn = document.getElementById('about-btn');
    const aboutPopover = document.getElementById('about-popover');
    const closeBtn = document.getElementById('close-about');

    if (!aboutBtn || !aboutPopover || !closeBtn) {
        console.warn('About popover elements not found');
        return;
    }

    // Show popover when about button is clicked
    aboutBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePopover(true);
    });

    // Hide popover when close button is clicked
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePopover(false);
    });

    // Hide popover when clicking outside
    document.addEventListener('click', function(e) {
        if (!aboutPopover.contains(e.target) && e.target !== aboutBtn) {
            togglePopover(false);
        }
    });

    // Prevent popover from closing when clicking inside it
    aboutPopover.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Hide popover on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            togglePopover(false);
        }
    });

    /**
     * Toggle popover visibility
     * @param {boolean} show - Whether to show or hide the popover
     */
    function togglePopover(show) {
        if (show) {
            aboutPopover.classList.remove('hidden');
            aboutBtn.setAttribute('aria-expanded', 'true');
            // Focus on close button for accessibility
            closeBtn.focus();
        } else {
            aboutPopover.classList.add('hidden');
            aboutBtn.setAttribute('aria-expanded', 'false');
        }
    }
}

/**
 * Theme Toggle Functionality
 * Handles switching between light and dark modes
 */
function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (!themeToggle) {
        console.warn('Theme toggle button not found');
        return;
    }

    // Get saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Add click event listener
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });

    /**
     * Set the theme and update UI
     * @param {string} theme - Theme to set ('light' or 'dark')
     */
    function setTheme(theme) {
        // Define SVG icons
        const sunIcon = `
            <svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        `;
        
        const moonIcon = `
            <svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `;

        // Update document attribute and button content
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = sunIcon + '[light]';
            themeToggle.setAttribute('aria-label', 'Switch to light mode');
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.innerHTML = moonIcon + '[dark]';
            themeToggle.setAttribute('aria-label', 'Switch to dark mode');
        }

        // Save preference
        localStorage.setItem('theme', theme);

        // Emit theme change event for other components
        window.gameEvents.emit('themeChanged', { theme });
    }
}

/**
 * Utility Functions
 * Collection of helper functions for future use
 */

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Simple event emitter for component communication
 */
class SimpleEventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

// Global event emitter instance for cross-component communication
window.gameEvents = new SimpleEventEmitter();

/**
 * Future functionality placeholders
 */

// Placeholder for game statistics tracking
function initializeGameStats() {
    // TODO: Implement game statistics tracking
}

// Placeholder for user preferences
function initializeUserPreferences() {
    // TODO: Implement user preferences (theme, difficulty, etc.)
}

// Placeholder for multiplayer functionality
function initializeMultiplayer() {
    // TODO: Implement multiplayer initialization
}

// Placeholder for offline functionality
function initializeOfflineSupport() {
    // TODO: Implement service worker and offline capabilities
}

/**
 * Partition-shape number hints
 * The setup modal on every game has a "Shape" dropdown (random / staircase /
 * square / hook / ...) paired with a plain number input whose meaning isn't
 * obvious on its own. This finds every such pair on the page (by id pattern,
 * so it works for the main setup form AND any "multiplayer-" prefixed one)
 * and keeps a small inline hint + placeholder in sync with the chosen shape,
 * e.g. "staircase" -> "rows", "square" -> "side length (n x n)".
 */
function initPartitionShapeHints() {
    var HINTS = {
        random:    { label: 'sum of parts', example: 'e.g., 25' },
        staircase: { label: 'rows',         example: 'e.g., 6' },
        square:    { label: 'side length (n \u00D7 n)', example: 'e.g., 5' },
        hook:      { label: 'size',         example: 'e.g., 10' },
        rectangle: { label: 'rows \u00D7 columns', example: 'e.g., 5' },
        triangle:  { label: 'rows',         example: 'e.g., 6' }
    };
    var selects = document.querySelectorAll('select[id$="partition-type-select"]');
    selects.forEach(function (select) {
        var prefix = select.id.slice(0, select.id.length - 'partition-type-select'.length);
        var numberInput = document.getElementById(prefix + 'partition-number-input');
        if (!numberInput) return;

        var hint = numberInput.parentElement.querySelector('.partition-number-hint');
        if (!hint) {
            hint = document.createElement('span');
            hint.className = 'partition-number-hint';
            numberInput.insertAdjacentElement('afterend', hint);
        }

        function update() {
            var info = HINTS[select.value] || { label: 'size', example: 'e.g., 25' };
            hint.textContent = info.label;
            numberInput.placeholder = info.example;
            numberInput.title = 'Enter the ' + info.label + ' for the ' + select.value + ' shape.';
        }
        select.addEventListener('change', update);
        update();
    });
}