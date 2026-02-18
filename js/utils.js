/**
 * EBO Shared Utilities
 * Common utility functions used across trip modules
 * 
 * Gemini: created 2026-01-05 - Extracted shared utilities from trip modules
 */

/**
 * EBO Utilities namespace
 * Provides shared helper functions for the application
 */
const EBOUtils = {
    /**
     * Escape HTML to prevent XSS attacks
     * Converts special characters to HTML entities
     * @param {string} str - String to escape
     * @returns {string} HTML-safe escaped string
     */
    escapeHtml: function (str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Format a date string to a readable format
     * @param {string} dateStr - ISO date string (YYYY-MM-DD)
     * @returns {string} Formatted date (e.g., "Jan 15, 2026")
     */
    formatDate: function (dateStr) {
        if (!dateStr) return '—';
        // Add time component to avoid timezone issues
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    /**
     * Format a date range to a readable string
     * @param {string} start - Start date ISO string
     * @param {string} end - End date ISO string (optional)
     * @returns {string} Formatted date range (e.g., "Jan 15, 2026 - Jan 17, 2026")
     */
    formatDateRange: function (start, end) {
        if (!start) return 'Dates TBD';
        const s = new Date(start);
        const e = end ? new Date(end) : null;
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        if (e) {
            return `${s.toLocaleDateString('en-US', options)} - ${e.toLocaleDateString('en-US', options)}`;
        }
        return s.toLocaleDateString('en-US', options);
    },

    /**
     * Create Google Maps search URL from coordinates
     * @param {Object} latLng - Object with latitude and longitude properties
     * @returns {string|null} Google Maps URL or null if coordinates invalid
     */
    createMapsUrl: function (latLng) {
        if (!latLng || !latLng.latitude || !latLng.longitude) return null;
        return `https://www.google.com/maps/search/?api=1&query=${latLng.latitude},${latLng.longitude}`;
    },

    /**
     * Mask an email address for privacy display
     * Shows first two characters of local part
     * @param {string} email - Email address to mask
     * @returns {string} Masked email (e.g., "jo***@example.com")
     */
    maskEmail: function (email) {
        if (!email) return '';
        const parts = email.split('@');
        if (parts.length !== 2) return email;
        return parts[0].substring(0, 2) + '***@' + parts[1];
    },

    /**
     * Generate a unique identifier using crypto API
     * @returns {string} UUID v4 string
     */
    generateUUID: function () {
        return crypto.randomUUID();
    },

    /**
     * Get status CSS class for RSVP response
     * @param {string} status - RSVP status (Going, Maybe, Not Going)
     * @returns {string} CSS class name
     */
    getStatusClass: function (status) {
        if (!status) return '';
        switch (status.toLowerCase()) {
            case 'going': return 'status-going';
            case 'maybe': return 'status-maybe';
            case 'not going': return 'status-not-going';
            default: return '';
        }
    }
};

// Gemini: changed 2026-01-05 - Export utilities to window for global access
window.EBOUtils = EBOUtils;
