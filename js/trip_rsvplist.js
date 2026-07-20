/**
 * Trip RSVP List Module
 * Displays participant lists and RSVP actions for a specific trip
 * 
 * API Specification Reference:
 * documentation/site-content/RSVP api.openapi.yaml
 * 
 * Gemini: created 2026-01-05 - Refactored from rsvplist.js to use EBOApiClient
 * 
 * Dependencies:
 * - /js/api_interface.js (window.eboApi)
 * - /js/utils.js (window.EBOUtils)
 */

// Helper to trigger the modal from test_nav.js
window.triggerAuthModal = function () {
    const btn = document.getElementById('nav-auth-btn');
    if (btn) btn.click();
};

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('rsvp-content');

    // 1. Parse Trip ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId') || urlParams.get('id'); // Support both params

    if (!tripId) {
        renderError('No Trip ID specified. Use ?tripId=TRIP_ID');
        return;
    }

    // 2. Fetch Data using centralized API client
    try {
        renderLoading();

        // Gemini: changed 2026-01-05 - Use eboApi instead of direct fetch
        // Fetch Trip Details and RSVPs in parallel
        const [tripData, rsvpsData] = await Promise.all([
            window.eboApi.getTrip(tripId),
            window.eboApi.getRsvpSummary(tripId)
        ]);

        console.log('Trip Data:', tripData);
        console.log('RSVPs Data:', rsvpsData);
        console.log('My RSVP:', tripData.myRsvp);

        // Safe parsing of RSVPs based on actual API response structure
        let rsvpList = [];
        if (rsvpsData.rsvpSummary) {
            // Combine attending and not attending into a single list with status
            const attending = (rsvpsData.rsvpSummary.attendingMembers || []).map(m => ({
                ...m,
                response: 'Going'
            }));
            const notAttending = (rsvpsData.rsvpSummary.notAttendingMembers || []).map(m => ({
                ...m,
                response: 'Not Going'
            }));
            // Add maybe if it exists in future
            const maybe = (rsvpsData.rsvpSummary.maybeMembers || []).map(m => ({
                ...m,
                response: 'Maybe'
            }));

            rsvpList = [...attending, ...notAttending, ...maybe];
        } else if (Array.isArray(rsvpsData)) {
            // Fallback for flat array if API changes
            rsvpList = rsvpsData;
        } else {
            console.warn('Unexpected RSVPs data format:', rsvpsData);
        }

        // Map API data to UI structure
        // Gemini: changed 2026-01-05 - Use EBOUtils.formatDateRange
        const pageData = {
            tripName: tripData.name || `Trip ${tripId}`,
            dates: EBOUtils.formatDateRange(tripData.startDate, tripData.endDate),
            location: tripData.p_locationLabel || tripData.meetingLocation?.label || 'TBD',
            myRsvp: tripData.myRsvp,
            participants: rsvpList.map(r => ({
                name: r.displayName || 'Unknown Member',
                email: r.email || 'unknown@example.com',
                response: r.response || 'Unknown'
            }))
        };

        // Check auth state just before rendering
        const isLoggedIn = localStorage.getItem('ebo_demo_logged_in') === 'true';
        renderTripPage(tripId, pageData, isLoggedIn);

    } catch (error) {
        console.error('RSVP fetch error:', error);
        renderError(error.message);
    }
});

/**
 * Render loading state
 */
function renderLoading() {
    const container = document.getElementById('rsvp-content');
    container.innerHTML = `<div class="loading-state">Loading responses...</div>`;
}

/**
 * Render error state
 * @param {string} msg - Error message to display
 */
function renderError(msg) {
    const container = document.getElementById('rsvp-content');
    container.innerHTML = `
    <div class="error-state" style="color: #d32f2f;">
        <h2>Error</h2>
        <p>${EBOUtils.escapeHtml(msg)}</p>
        <button onclick="location.reload()" style="margin-top:1rem; padding:0.5rem 1rem;">Retry</button>
    </div>
    `;
}

/**
 * Render the main trip page with RSVP list
 * @param {string} tripId - Trip identifier
 * @param {Object} data - Page data object
 * @param {boolean} isLoggedIn - User login state
 */
function renderTripPage(tripId, data, isLoggedIn) {
    const container = document.getElementById('rsvp-content');
    const participants = data.participants;

    const rsvpStats = {
        going: participants.filter(p => p.response === 'Going').length,
        maybe: participants.filter(p => p.response === 'Maybe').length,
        notGoing: participants.filter(p => p.response === 'Not Going').length,
        total: participants.length
    };

    const lockIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

    // Determine Button Text
    let buttonText = 'RSVP to Join';
    if (data.myRsvp && data.myRsvp.response && data.myRsvp.response !== 'UNSET') {
        buttonText = 'Change RSVP';
    }

    const actionButton = isLoggedIn ? `
        <button class="btn btn-primary" onclick="showResponseOptions()">
            ${buttonText}
        </button>
    ` : `
        <div style="display:flex; align-items:center; gap:1rem;">
            <span style="color:var(--text-muted);">Join the trip or update your status:</span>
            <button class="btn-dark-auth" onclick="triggerAuthModal()">
                ${lockIcon}
                <span>Sign In</span>
            </button>
        </div>
    `;

    container.innerHTML = `
        <div class="trip-header">
            <h1>${EBOUtils.escapeHtml(data.tripName)}</h1>
            <p style="color: #666; margin-top: 0.5rem;">
                ${data.dates} • ${EBOUtils.escapeHtml(data.location)}
            </p>
            <p style="margin-top: 0.5rem; font-weight: 500;">
                ${rsvpStats.total} Responses: 
                <span style="color: #2b542c">${rsvpStats.going} Going</span>, 
                <span style="color: #721c24">${rsvpStats.notGoing} Not Going</span>, 
                <span style="color: #856404">${rsvpStats.maybe} Maybe</span>
            </p>
        </div>

        <div class="rsvp-actions">
            ${actionButton}
        </div>

        ${participants.length === 0 ? renderEmptyState() : renderTable(participants)}
    `;

    if (participants.length > 0) {
        setupSorting(participants);
    }
}

/**
 * Render empty state when no RSVPs
 * @returns {string} HTML string
 */
function renderEmptyState() {
    return `
    <div class="empty-state">
        <h3>No responses yet.</h3>
        <p>Be the first to RSVP!</p>
    </div>
    `;
}

/**
 * Render RSVP table
 * @param {Array} participants - Array of participant objects
 * @returns {string} HTML string
 */
function renderTable(participants) {
    // Gemini: changed 2026-01-05 - Use EBOUtils for escaping and status class
    const rows = participants.map(p => `
    <tr>
        <td>${EBOUtils.escapeHtml(p.name)}</td>
        <td>${EBOUtils.maskEmail(p.email)}</td>
        <td><span class="status-badge ${EBOUtils.getStatusClass(p.response)}">${p.response}</span></td>
    </tr>
    `).join('');

    return `
    <div class="rsvp-table-container">
        <table class="rsvp-table" id="rsvpTable">
            <thead>
                <tr>
                    <th data-sort="name">Member Name</th>
                    <th data-sort="email">Email</th>
                    <th data-sort="response">Response</th>
                </tr>
            </thead>
            <tbody id="rsvpTableBody">
                ${rows}
            </tbody>
        </table>
    </div>
    `;
}

// Sorting Logic
let currentSort = { column: 'name', direction: 'asc' }; // default

/**
 * Setup sorting functionality for the table
 * @param {Array} initialData - Initial data array
 */
function setupSorting(initialData) {
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;

            // Toggle direction if same column, else default to asc
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }

            // Update UI classes
            headers.forEach(h => h.classList.remove('asc', 'desc'));
            th.classList.add(currentSort.direction);

            // Sort Data
            const sortedData = [...initialData].sort((a, b) => {
                let valA = a[column];
                let valB = b[column];

                if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });

            // Re-render body
            updateTableBody(sortedData);
        });
    });

    // Initial visual state
    const defaultHeader = document.querySelector(`th[data-sort="name"]`);
    if (defaultHeader) defaultHeader.classList.add('asc');
}

/**
 * Update table body with sorted data
 * @param {Array} data - Sorted data array
 */
function updateTableBody(data) {
    const tbody = document.getElementById('rsvpTableBody');
    tbody.innerHTML = data.map(p => `
    <tr>
        <td>${EBOUtils.escapeHtml(p.name)}</td>
        <td>${EBOUtils.maskEmail(p.email)}</td>
        <td><span class="status-badge ${EBOUtils.getStatusClass(p.response)}">${p.response}</span></td>
    </tr>
    `).join('');
}

// --- RSVP Action Implementation ---

/**
 * Show RSVP response options modal
 */
function showResponseOptions() {
    // Create a simple modal for RSVP selection
    const modalId = 'rsvp-action-modal';
    if (document.getElementById(modalId)) {
        document.getElementById(modalId).remove();
    }

    const modalHtml = `
            <dialog id="${modalId}" style="padding: 0; border: none; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); width: 300px; margin: auto; position: fixed; inset: 0;">
                <div style="background: var(--card-bg); color: var(--text-main); padding: 1.5rem;">
                    <h3 style="margin-top:0;">Update RSVP</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Are you going on this trip?</p>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button onclick="submitRSVP('YES')" class="btn">
                            Going (YES)
                        </button>
                        <button onclick="submitRSVP('NO')" class="btn btn-secondary">
                            Not Going (NO)
                        </button>
                    </div>
                    <button onclick="this.closest('dialog').close()" style="margin-top: 1rem; background: none; border: none; color: var(--text-muted); cursor: pointer; text-decoration: underline; width: 100%;">
                        Cancel
                    </button>
                </div>
            </dialog>
        `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById(modalId).showModal();
}

/**
 * Submit RSVP response to API
 * @param {string} responseStatus - RSVP response ('YES' | 'NO')
 */
async function submitRSVP(responseStatus) {
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId') || urlParams.get('id');

    if (!tripId) return;

    const modal = document.getElementById('rsvp-action-modal');
    if (modal) modal.close();

    // Show loading state overlay
    const oldBody = document.body.style.pointerEvents;
    document.body.style.pointerEvents = 'none';
    document.body.style.opacity = '0.7';

    try {
        // Gemini: changed 2026-01-05 - Use eboApi.setMyRsvp instead of direct fetch
        await window.eboApi.setMyRsvp(tripId, responseStatus);

        // Success
        alert(`RSVP Updated to: ${responseStatus}`);
        location.reload(); // Reload to see changes

    } catch (error) {
        console.error('RSVP Submit Error:', error);
        alert(`Failed to update RSVP: ${error.message}`);
    } finally {
        document.body.style.pointerEvents = oldBody;
        document.body.style.opacity = '1';
    }
}
