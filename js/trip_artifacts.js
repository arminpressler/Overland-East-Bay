/**
 * Trip Artifacts Module
 * Displays list of trip artifacts (GPX, schedules, documents) with icons and links
 * 
 * API Specification Reference:
 * documentation/site-content/RSVP api.openapi.yaml
 * 
 * Gemini: created 2025-12-30 - Fetches and displays trip artifacts from API
 * Gemini: changed 2026-01-05 - Refactored to use EBOApiClient and EBOUtils
 * 
 * Usage:
 * <div class="trip-artifacts" 
 *      data-trip-id="f3d2a79f-5ee8-48b9-b61f-aed07aeb35fa">
 * </div>
 * 
 * Dependencies:
 * - /js/api_interface.js (window.eboApi)
 * - /js/utils.js (window.EBOUtils)
 */
(function () {
    /**
     * Get icon for artifact type
     * @param {string} type - Artifact type (GPX, SCHEDULE, DOCUMENT, OTHER)
     * @returns {string} Icon emoji
     */
    function getArtifactIcon(type) {
        const icons = {
            'GPX': '🗺️',
            'SCHEDULE': '📅',
            'DOCUMENT': '📄',
            'OTHER': '📎'
        };
        return icons[type] || icons['OTHER'];
    }

    /**
     * Format artifact type for display
     * @param {string} type - Artifact type
     * @returns {string} Formatted type
     */
    function formatType(type) {
        if (!type) return 'File';
        return type.charAt(0) + type.slice(1).toLowerCase();
    }

    /**
     * Initialize a trip artifacts widget
     * @param {HTMLElement} root - The .trip-artifacts element
     */
    async function initTripArtifacts(root) {
        if (!root) return;

        const tripId = root.dataset.tripId;

        // Show loading state
        root.innerHTML = '<div class="ta-loading">Loading trip resources...</div>';

        if (!tripId) {
            root.innerHTML = '<div class="ta-error">Error: Missing trip ID. Please set data-trip-id attribute.</div>';
            return;
        }

        try {
            // Fetch trip data using centralized API client
            // Gemini: changed 2026-01-05 - Use eboApi instead of direct fetch
            const trip = await window.eboApi.getTrip(tripId);

            if (!trip) {
                throw new Error('Invalid response format: missing trip data');
            }

            const artifacts = trip.artifacts || [];

            // Build HTML
            let html = '<div class="ta-header">';
            html += '<div class="ta-kicker">Trip Resources</div>';
            html += '<h3 class="ta-title">Downloads & Links</h3>';
            html += '</div>';

            if (artifacts.length === 0) {
                html += '<div class="ta-empty">No resources available yet</div>';
            } else {
                html += '<div class="ta-list">';
                artifacts.forEach(artifact => {
                    const icon = getArtifactIcon(artifact.type);
                    const type = formatType(artifact.type);
                    // Gemini: changed 2026-01-05 - Use EBOUtils.escapeHtml
                    const title = EBOUtils.escapeHtml(artifact.title || 'Untitled');
                    const url = artifact.url || '#';

                    html += `<a href="${EBOUtils.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="ta-item">`;
                    html += `<div class="ta-icon">${icon}</div>`;
                    html += '<div class="ta-content">';
                    html += `<div class="ta-item-title">${title}</div>`;
                    html += `<div class="ta-item-type">${type}</div>`;
                    html += '</div>';
                    html += '<div class="ta-arrow">→</div>';
                    html += '</a>';
                });
                html += '</div>';
            }

            root.innerHTML = html;

        } catch (error) {
            console.error('Trip Artifacts Module Error:', error);
            root.innerHTML = `<div class="ta-error">Unable to load trip resources: ${EBOUtils.escapeHtml(error.message)}</div>`;
        }
    }

    /**
     * Initialize all trip artifacts widgets on the page
     */
    function boot() {
        document.querySelectorAll('.trip-artifacts').forEach(initTripArtifacts);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
