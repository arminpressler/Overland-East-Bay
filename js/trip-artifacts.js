// Trip Artifacts Module
// Gemini: created 2025-12-30 - Fetches and displays trip artifacts (GPX, schedules, documents)

/**
 * Trip Artifacts Module
 * Displays list of trip artifacts with icons and links
 * 
 * Usage:
 * <div class="trip-artifacts" 
 *      data-trip-id="TRIP_2026_02_12_Death_Valley_Basecamp"
 *      data-api-url="/content/inbox/temp/mock-trip-data.json">
 * </div>
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
        let apiUrl = root.dataset.apiUrl;

        // Show loading state
        root.innerHTML = '<div class="ta-loading">Loading trip resources...</div>';

        if (!tripId) {
            root.innerHTML = '<div class="ta-error">Error: Missing trip ID. Please set data-trip-id attribute.</div>';
            return;
        }

        // If no API URL specified, use config-based API endpoint
        if (!apiUrl) {
            try {
                const configResponse = await fetch('/config.json');
                const config = await configResponse.json();
                apiUrl = `${config.apiHost}/trips/${tripId}`;
            } catch (error) {
                root.innerHTML = '<div class="ta-error">Error: Unable to load API configuration.</div>';
                return;
            }
        }

        try {
            // Load config for authentication
            let headers = {};
            try {
                const configResponse = await fetch('/config.json');
                const config = await configResponse.json();
                headers['X-Debug-Subject'] = config.headers?.debugSubject || 'dev|armin';
            } catch (configError) {
                console.warn('Could not load config for auth header:', configError);
            }

            // Fetch trip data
            const response = await fetch(apiUrl, { headers });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const trip = data.trip;

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
                    const title = escapeHtml(artifact.title || 'Untitled');
                    const url = artifact.url || '#';

                    html += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="ta-item">`;
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
            root.innerHTML = `<div class="ta-error">Unable to load trip resources: ${escapeHtml(error.message)}</div>`;
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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
