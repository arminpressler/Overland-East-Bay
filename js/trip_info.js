/**
 * Trip Info Module
 * Displays trip details including name, dates, description, organizers, and requirements
 * 
 * API Specification Reference:
 * documentation/site-content/RSVP api.openapi.yaml
 * 
 * Gemini: created 2025-12-30 - Fetches and displays trip information from API
 * Gemini: changed 2026-01-05 - Refactored to use EBOApiClient and EBOUtils
 * 
 * Usage:
 * <div class="trip-info" 
 *      data-trip-id="f3d2a79f-5ee8-48b9-b61f-aed07aeb35fa">
 * </div>
 * 
 * Dependencies:
 * - /js/api_interface.js (window.eboApi)
 * - /js/utils.js (window.EBOUtils)
 */
(function () {
    /**
     * Initialize a trip info widget
     * @param {HTMLElement} root - The .trip-info element
     */
    async function initTripInfo(root) {
        if (!root) return;

        const tripId = root.dataset.tripId;

        // Show loading state
        root.innerHTML = '<div class="ti-loading">Loading trip information...</div>';

        if (!tripId) {
            root.innerHTML = '<div class="ti-error">Error: Missing trip ID. Please set data-trip-id attribute.</div>';
            return;
        }

        try {
            // Fetch trip data using centralized API client
            // Gemini: changed 2026-01-05 - Use eboApi instead of direct fetch
            const trip = await window.eboApi.getTrip(tripId);

            if (!trip) {
                throw new Error('Invalid response format: missing trip data');
            }

            // Build HTML
            let html = '<div class="ti-header">';
            html += '<div class="ti-kicker">Trip Information</div>';
            html += `<h3 class="ti-title">${EBOUtils.escapeHtml(trip.name || 'Untitled Trip')}</h3>`;

            if (trip.startDate || trip.endDate) {
                const start = EBOUtils.formatDate(trip.startDate);
                const end = EBOUtils.formatDate(trip.endDate);
                html += `<div class="ti-dates">${start}${trip.endDate ? ' – ' + end : ''}</div>`;
            }
            html += '</div>';

            // Description
            if (trip.description) {
                html += '<div class="ti-section">';
                html += '<div class="ti-section-title">Description</div>';
                html += `<div class="ti-description">${EBOUtils.escapeHtml(trip.description)}</div>`;
                html += '</div>';
            }

            // Trip Details
            html += '<div class="ti-section">';
            html += '<div class="ti-section-title">Trip Details</div>';

            if (trip.status) {
                html += '<div class="ti-detail-row">';
                html += '<span class="ti-detail-label">Status:</span>';
                html += `<span class="ti-detail-value">${EBOUtils.escapeHtml(trip.status)}</span>`;
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
                html += `<span class="ti-detail-value">${EBOUtils.escapeHtml(trip.difficultyText)}</span>`;
                html += '</div>';
            }

            html += '</div>';

            // Meeting Location
            if (trip.meetingLocation) {
                html += '<div class="ti-section">';
                html += '<div class="ti-section-title">Meeting Location</div>';
                html += '<div class="ti-detail-row">';
                html += '<span class="ti-detail-label">Location:</span>';
                html += `<span class="ti-detail-value">${EBOUtils.escapeHtml(trip.meetingLocation.label || 'TBD')}</span>`;
                html += '</div>';

                if (trip.meetingLocation.address) {
                    html += '<div class="ti-detail-row">';
                    html += '<span class="ti-detail-label">Address:</span>';
                    html += `<span class="ti-detail-value">${EBOUtils.escapeHtml(trip.meetingLocation.address)}</span>`;
                    html += '</div>';
                }

                // Gemini: changed 2026-01-05 - Use EBOUtils.createMapsUrl
                const mapsUrl = EBOUtils.createMapsUrl(trip.meetingLocation.latitudeLongitude);
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
                    html += `<span class="ti-detail-value">${EBOUtils.escapeHtml(trip.commsRequirementsText)}</span>`;
                    html += '</div>';
                }

                if (trip.recommendedRequirementsText) {
                    html += '<div class="ti-detail-row">';
                    html += '<span class="ti-detail-label">Recommended:</span>';
                    html += `<span class="ti-detail-value">${EBOUtils.escapeHtml(trip.recommendedRequirementsText)}</span>`;
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
                    html += `<span class="ti-organizer">${EBOUtils.escapeHtml(org.displayName)}</span>`;
                });
                html += '</div>';
                html += '</div>';
            }

            root.innerHTML = html;

        } catch (error) {
            console.error('Trip Info Module Error:', error);
            root.innerHTML = `<div class="ti-error">Unable to load trip information: ${EBOUtils.escapeHtml(error.message)}</div>`;
        }
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
