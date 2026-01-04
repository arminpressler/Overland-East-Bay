// Trip RSVP Module
// Gemini: created 2025-12-30 - Fetches and displays RSVP status and member lists

/**
 * Trip RSVP Module
 * Displays RSVP summary including capacity, attending members, and not-attending members
 * 
 * Usage:
 * <div class="trip-rsvp" 
 *      data-trip-id="TRIP_2026_02_12_Death_Valley_Basecamp"
 *      data-api-url="/content/inbox/temp/mock-trip-data.json">
 * </div>
 */
(function () {
    /**
     * Initialize a trip RSVP widget
     * @param {HTMLElement} root - The .trip-rsvp element
     */
    async function initTripRsvp(root) {
        if (!root) return;

        const tripId = root.dataset.tripId;
        let apiUrl = root.dataset.apiUrl;

        // Show loading state
        root.innerHTML = '<div class="tr-loading">Loading RSVP information...</div>';

        if (!tripId) {
            root.innerHTML = '<div class="tr-error">Error: Missing trip ID. Please set data-trip-id attribute.</div>';
            return;
        }

        // If no API URL specified, use config-based API endpoint
        if (!apiUrl) {
            try {
                const configResponse = await fetch('/config.json');
                if (!configResponse.ok) {
                    throw new Error(`HTTP ${configResponse.status}: ${configResponse.statusText}`);
                }
                const config = await configResponse.json();
                if (!config.apiHost) {
                    throw new Error('Missing apiHost in config.json');
                }
                apiUrl = `${config.apiHost}/trips/${tripId}`;
            } catch (error) {
                console.error('Trip RSVP Module Error loading config:', error);
                root.innerHTML = `<div class="tr-error">Error: Unable to load API configuration: ${escapeHtml(error.message)}</div>`;
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

            if (!trip || !trip.rsvpSummary) {
                throw new Error('Invalid response format: missing RSVP data');
            }

            const rsvp = trip.rsvpSummary;

            // Build HTML
            let html = '<div class="tr-header">';
            html += '<div class="tr-kicker">RSVP Status</div>';
            html += '<h3 class="tr-title">Who\'s Coming</h3>';
            html += '</div>';

            // Capacity indicator
            if (rsvp.capacityRigs) {
                const percentage = Math.min((rsvp.attendingRigs / rsvp.capacityRigs) * 100, 100);
                const isFull = rsvp.attendingRigs >= rsvp.capacityRigs;

                html += '<div class="tr-capacity">';
                html += '<div class="tr-capacity-bar">';
                html += `<div class="tr-capacity-fill ${isFull ? 'full' : ''}" style="width: ${percentage}%"></div>`;
                html += '</div>';
                html += `<div class="tr-capacity-text">${rsvp.attendingRigs} of ${rsvp.capacityRigs} rigs confirmed</div>`;
                html += '</div>';
            } else {
                html += '<div class="tr-capacity">';
                html += `<div class="tr-capacity-text">${rsvp.attendingRigs} rigs confirmed</div>`;
                html += '</div>';
            }

            // Attending members
            html += '<div class="tr-section">';
            html += '<div class="tr-section-title">';
            html += '✓ Attending';
            html += `<span class="tr-count-badge">${rsvp.attendingMembers.length}</span>`;
            html += '</div>';

            if (rsvp.attendingMembers.length > 0) {
                html += '<div class="tr-member-list">';
                rsvp.attendingMembers.forEach(member => {
                    html += `<div class="tr-member attending">${escapeHtml(member.displayName)}</div>`;
                });
                html += '</div>';
            } else {
                html += '<div class="tr-empty">No RSVPs yet</div>';
            }
            html += '</div>';

            // Not attending members (optional section)
            if (rsvp.notAttendingMembers && rsvp.notAttendingMembers.length > 0) {
                html += '<div class="tr-section">';
                html += '<div class="tr-section-title">';
                html += '✗ Not Attending';
                html += `<span class="tr-count-badge">${rsvp.notAttendingMembers.length}</span>`;
                html += '</div>';
                html += '<div class="tr-member-list">';
                rsvp.notAttendingMembers.forEach(member => {
                    html += `<div class="tr-member not-attending">${escapeHtml(member.displayName)}</div>`;
                });
                html += '</div>';
                html += '</div>';
            }

            root.innerHTML = html;

        } catch (error) {
            console.error('Trip RSVP Module Error:', error);
            root.innerHTML = `<div class="tr-error">Unable to load RSVP information: ${escapeHtml(error.message)}</div>`;
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
     * Initialize all trip RSVP widgets on the page
     */
    function boot() {
        document.querySelectorAll('.trip-rsvp').forEach(initTripRsvp);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
