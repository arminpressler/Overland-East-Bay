// Trip Info Module
// Gemini: created 2025-12-30 - Fetches and displays trip information from API or mock data

/**
 * Trip Info Module
 * Displays trip details including name, dates, description, organizers, and requirements
 * 
 * Usage:
 * <div class="trip-info" 
 *      data-trip-id="TRIP_2026_02_12_Death_Valley_Basecamp"
 *      data-api-url="/content/inbox/temp/mock-trip-data.json">
 * </div>
 */
(function () {
    /**
     * Format date string to readable format
     * @param {string} dateStr - ISO date string (YYYY-MM-DD)
     * @returns {string} Formatted date
     */
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Create Google Maps search URL from coordinates
     * @param {object} latLng - Object with latitude and longitude
     * @returns {string} Google Maps URL
     */
    function createMapsUrl(latLng) {
        if (!latLng || !latLng.latitude || !latLng.longitude) return null;
        return `https://www.google.com/maps/search/?api=1&query=${latLng.latitude},${latLng.longitude}`;
    }

    /**
     * Initialize a trip info widget
     * @param {HTMLElement} root - The .trip-info element
     */
    async function initTripInfo(root) {
        if (!root) return;

        const tripId = root.dataset.tripId;
        let apiUrl = root.dataset.apiUrl;

        // Show loading state
        root.innerHTML = '<div class="ti-loading">Loading trip information...</div>';

        if (!tripId) {
            root.innerHTML = '<div class="ti-error">Error: Missing trip ID. Please set data-trip-id attribute.</div>';
            return;
        }

        // If no API URL specified, use config-based API endpoint
        if (!apiUrl) {
            try {
                const configResponse = await fetch('/config.json');
                const config = await configResponse.json();
                apiUrl = `${config.apiHost}/trips/${tripId}`;
            } catch (error) {
                root.innerHTML = '<div class="ti-error">Error: Unable to load API configuration.</div>';
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

            // Build HTML
            let html = '<div class="ti-header">';
            html += '<div class="ti-kicker">Trip Information</div>';
            html += `<h3 class="ti-title">${escapeHtml(trip.name || 'Untitled Trip')}</h3>`;

            if (trip.startDate || trip.endDate) {
                const start = formatDate(trip.startDate);
                const end = formatDate(trip.endDate);
                html += `<div class="ti-dates">${start}${trip.endDate ? ' – ' + end : ''}</div>`;
            }
            html += '</div>';

            // Description
            if (trip.description) {
                html += '<div class="ti-section">';
                html += '<div class="ti-section-title">Description</div>';
                html += `<div class="ti-description">${escapeHtml(trip.description)}</div>`;
                html += '</div>';
            }

            // Trip Details
            html += '<div class="ti-section">';
            html += '<div class="ti-section-title">Trip Details</div>';

            if (trip.status) {
                html += '<div class="ti-detail-row">';
                html += '<span class="ti-detail-label">Status:</span>';
                html += `<span class="ti-detail-value">${escapeHtml(trip.status)}</span>`;
                html += '</div>';
            }

            if (trip.capacityRigs) {
                html += '<div class="ti-detail-row">';
                html += '<span class="ti-detail-label">Capacity:</span>';
                html += `<span class="ti-detail-value">${trip.capacityRigs} rigs</span>`;
                html += '</div>';
            }

            if (trip.difficultyText) {
                html += '<div class="ti-detail-row">';
                html += '<span class="ti-detail-label">Difficulty:</span>';
                html += `<span class="ti-detail-value">${escapeHtml(trip.difficultyText)}</span>`;
                html += '</div>';
            }

            html += '</div>';

            // Meeting Location
            if (trip.meetingLocation) {
                html += '<div class="ti-section">';
                html += '<div class="ti-section-title">Meeting Location</div>';
                html += '<div class="ti-detail-row">';
                html += '<span class="ti-detail-label">Location:</span>';
                html += `<span class="ti-detail-value">${escapeHtml(trip.meetingLocation.label || 'TBD')}</span>`;
                html += '</div>';

                if (trip.meetingLocation.address) {
                    html += '<div class="ti-detail-row">';
                    html += '<span class="ti-detail-label">Address:</span>';
                    html += `<span class="ti-detail-value">${escapeHtml(trip.meetingLocation.address)}</span>`;
                    html += '</div>';
                }

                const mapsUrl = createMapsUrl(trip.meetingLocation.latitudeLongitude);
                if (mapsUrl) {
                    html += `<a href="${mapsUrl}" target="_blank" rel="noopener" class="ti-location-link">📍 View on Google Maps</a>`;
                }
                html += '</div>';
            }

            // Requirements
            if (trip.commsRequirementsText || trip.recommendedRequirementsText) {
                html += '<div class="ti-section">';
                html += '<div class="ti-section-title">Requirements</div>';

                if (trip.commsRequirementsText) {
                    html += '<div class="ti-detail-row">';
                    html += '<span class="ti-detail-label">Communications:</span>';
                    html += `<span class="ti-detail-value">${escapeHtml(trip.commsRequirementsText)}</span>`;
                    html += '</div>';
                }

                if (trip.recommendedRequirementsText) {
                    html += '<div class="ti-detail-row">';
                    html += '<span class="ti-detail-label">Recommended:</span>';
                    html += `<span class="ti-detail-value">${escapeHtml(trip.recommendedRequirementsText)}</span>`;
                    html += '</div>';
                }
                html += '</div>';
            }

            // Organizers
            if (trip.organizers && trip.organizers.length > 0) {
                html += '<div class="ti-section">';
                html += '<div class="ti-section-title">Organizers</div>';
                html += '<div class="ti-organizers">';
                trip.organizers.forEach(org => {
                    html += `<span class="ti-organizer">${escapeHtml(org.displayName)}</span>`;
                });
                html += '</div>';
                html += '</div>';
            }

            root.innerHTML = html;

        } catch (error) {
            console.error('Trip Info Module Error:', error);
            root.innerHTML = `<div class="ti-error">Unable to load trip information: ${escapeHtml(error.message)}</div>`;
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
     * Initialize all trip info widgets on the page
     */
    function boot() {
        document.querySelectorAll('.trip-info').forEach(initTripInfo);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
