/**
 * rsvp_module.js
 * Comprehensive reusable RSVP Module for Overland EastBay trip pages.
 * 
 * Features:
 * - Checks user session state (signed in / signed out)
 * - Renders "Sign-in to RSVP" (signed out) or "RSVP Here" (signed in)
 * - Opens Group Trip Agreement confirmation modal
 * - Saves RSVP JSON to RSVPs/<trip_id>/<cleanEmail>.json
 * - Routes to trip participant page displaying picture & name (NO EMAIL)
 * 
 * Gemini: created 2026-07-28 - Initial implementation of new RSVP Module
 */

class EBORsvpModule {
    /**
     * Constructs the EBORsvpModule instance.
     * Gemini: changed 2026-08-18 - Added dataset capacity detection and default limit for Frazer Flats
     * @param {HTMLElement|string} container - Container element or CSS selector.
     * @param {string} [tripId] - Unique trip identifier.
     */
    constructor(container, tripId) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.tripId = tripId || this.extractTripId();
        const datasetCap = this.container ? this.container.dataset.capacity : null;
        // Gemini: changed 2026-08-22 - Updated trip ID for Frazer Flats Camp and Hang
        this.capacity = datasetCap ? parseInt(datasetCap, 10) : ((this.tripId === 'TRIP_2026_09_11_Frazer_Flats_Camp_and_Hang' || this.tripId === 'TRIP_2026_09_11_Frazer_Flats_Basecamp') ? 13 : null);
        this.bffUrl = 'https://ebo-signature-bff.armin-pressler.workers.dev';
        // Gemini: changed 2026-07-28 - Listen for ebo:auth:success and ebo:auth:logout events to refresh RSVP button state
        window.addEventListener('ebo:auth:success', () => {
            this.currentUser = null;
            this.myRsvpStatus = null;
            this.init();
        });
        window.addEventListener('ebo:auth:logout', () => {
            this.currentUser = null;
            this.myRsvpStatus = null;
            this.init();
        });
        this.init();
    }

    /**
     * Extracts trip identifier from data attributes or URL filename.
     * @returns {string} Trip identifier string.
     */
    extractTripId() {
        if (this.container && this.container.dataset.tripId) {
            return this.container.dataset.tripId;
        }
        const path = window.location.pathname;
        const pageName = path.substring(path.lastIndexOf('/') + 1).replace('.html', '');
        return pageName || 'TRIP_UNKNOWN';
    }

    /**
     * Resolves the relative path to the Group Trip Agreement page.
     * Gemini: changed 2026-08-23 - Include tripId and capacity query params to maintain trip context
     * @returns {string} Relative URL to group trip agreement page.
     */
    getAgreementPageUrl() {
        const isEventPage = window.location.pathname.includes('/events/');
        const prefix = isEventPage ? '../' : '';
        const params = new URLSearchParams();
        if (this.tripId && this.tripId !== 'TRIP_UNKNOWN') {
            params.set('tripId', this.tripId);
            if (this.capacity) {
                params.set('capacity', this.capacity);
            }
        }
        const queryStr = params.toString() ? `?${params.toString()}` : '';
        return `${prefix}admin/group-trip-agreement.html${queryStr}`;
    }

    /**
     * Initializes the module, checks session state, fetches user RSVP status, and renders UI.
     */
    async init() {
        if (!this.container) return;
        this.renderLoading();
        const isLoggedIn = await this.checkAuthState();
        await this.fetchUserRsvpStatus();
        this.renderModule(isLoggedIn);

        // Handle pending RSVP after post-login redirect/reload if flag set
        // Gemini: changed 2026-07-29 - Clear pending RSVP trigger when signed out to prevent modal on page load
        if (isLoggedIn && localStorage.getItem('ebo_pending_rsvp_trigger') === this.tripId) {
            localStorage.removeItem('ebo_pending_rsvp_trigger');
            if (!this.myRsvpStatus) {
                setTimeout(() => {
                    this.showAgreementModal();
                }, 300);
            }
        } else if (!isLoggedIn) {
            localStorage.removeItem('ebo_pending_rsvp_trigger');
        }
    }

    /**
     * Fetches current user's RSVP status and trip response counts (Going / Waitlist / Not Going).
     * Gemini: changed 2026-07-28 - Fetch trip response counts and render inside RSVP module box
     * Gemini: changed 2026-08-18 - Added waitlist count parsing and capacity capacity calculation
     */
    async fetchUserRsvpStatus() {
        this.myRsvpStatus = null;
        this.goingCount = 0;
        this.waitlistCount = 0;
        this.notGoingCount = 0;
        this.totalCount = 0;
        this.isFull = false;

        const user = this.currentUser?.user || this.currentUser || {};
        const email = user.email || user.profile?.email || '';
        const userSub = user.sub || '';
        const userName = user.name || user.profile?.name || '';

        try {
            const resp = await fetch(`${this.bffUrl}/rsvp?tripId=${encodeURIComponent(this.tripId)}`);
            if (resp.ok) {
                const data = await resp.json();
                const list = Array.isArray(data) ? data : (data.rsvps || []);
                this.totalCount = list.length;
                this.goingCount = list.filter(p => !p.status || p.status === 'Going').length;
                this.waitlistCount = list.filter(p => p.status === 'Waitlist').length;
                this.notGoingCount = list.filter(p => p.status === 'Not Going' || p.status === 'No Longer Going').length;
                this.isFull = this.capacity ? (this.goingCount >= this.capacity) : false;

                if (this.currentUser) {
                    const myItem = list.find(item =>
                        (userSub && item.sub && item.sub === userSub) ||
                        (email && item.email && item.email.toLowerCase() === email.toLowerCase()) ||
                        (userName && item.name && item.name.toLowerCase().trim() === userName.toLowerCase().trim())
                    );

                    if (myItem && myItem.status) {
                        this.myRsvpStatus = myItem.status;
                    }
                }
            }
        } catch (err) {
            console.warn('Could not fetch user RSVP status from BFF:', err);
        }

        if (this.currentUser && !this.myRsvpStatus && email) {
            const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
            const localKey = `ebo_rsvp_${this.tripId}_${cleanEmail}`;
            const localRecord = localStorage.getItem(localKey);
            if (localRecord) {
                try {
                    const parsed = JSON.parse(localRecord);
                    if (parsed && parsed.status) {
                        this.myRsvpStatus = parsed.status;
                    }
                } catch (e) { }
            }
        }
    }

    /**
     * Renders loading state in container.
     */
    renderLoading() {
        this.container.innerHTML = `
            <div class="ebo-rsvp-module-container">
                <div class="ebo-rsvp-header">
                    <h3 class="ebo-rsvp-title">⛺ Trip RSVP</h3>
                    <p style="color: #94a3b8; margin: 0;">Loading RSVP status...</p>
                </div>
            </div>
        `;
    }

    /**
     * Checks user authentication state against local storage and BFF API.
     * Gemini: changed 2026-07-28 - Fallback to cached ebo_user_profile in checkAuthState to trigger pending agreement modal after login
     * @returns {Promise<boolean>} True if user is authenticated.
     */
    async checkAuthState() {
        const token = localStorage.getItem('ebo_session_token');
        const demoLoggedIn = localStorage.getItem('ebo_demo_logged_in');
        const cachedProfileStr = localStorage.getItem('ebo_user_profile');

        if (demoLoggedIn === 'false' && !token) {
            this.currentUser = null;
            return false;
        }

        if (cachedProfileStr) {
            try {
                this.currentUser = JSON.parse(cachedProfileStr);
            } catch (e) {}
        }

        try {
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const resp = await fetch(`${this.bffUrl}/auth/me`, {
                headers: headers,
                credentials: 'include'
            });
            if (resp.ok) {
                const data = await resp.json();
                this.currentUser = data;
                localStorage.setItem('ebo_demo_logged_in', 'true');
                if (data.token || data.sessionId) {
                    localStorage.setItem('ebo_session_token', data.token || data.sessionId);
                }
                return true;
            }
        } catch (err) {
            console.warn('RSVP Module: BFF session check error:', err);
        }

        if (this.currentUser && demoLoggedIn !== 'false') {
            return true;
        }

        this.currentUser = null;
        return false;
    }

    /**
     * Renders main module container with appropriate action button and Going/Waitlist/Not Going counters.
     * Gemini: changed 2026-08-18 - Added capacity notice banner, waitlist counters, and waitlist button states
     * @param {boolean} isLoggedIn - User authentication state.
     */
    renderModule(isLoggedIn) {
        const rsvpPath = this.getParticipantsPageUrl();
        let buttonHtml = '';

        if (!isLoggedIn) {
            buttonHtml = `
                <button class="ebo-rsvp-btn ebo-rsvp-btn-auth" id="ebo-rsvp-main-btn">
                    <span>🔐 Sign-in to RSVP</span>
                </button>
            `;
        } else if (this.myRsvpStatus === 'Going') {
            buttonHtml = `
                <button class="ebo-rsvp-btn ebo-rsvp-btn-action" id="ebo-rsvp-main-btn" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #4ade80;">
                    <span>✓ Going (Change RSVP)</span>
                </button>
            `;
        } else if (this.myRsvpStatus === 'Waitlist') {
            buttonHtml = `
                <button class="ebo-rsvp-btn ebo-rsvp-btn-action" id="ebo-rsvp-main-btn" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #f59e0b;">
                    <span>⏳ On Waitlist (Change RSVP)</span>
                </button>
            `;
        } else if (this.myRsvpStatus === 'Not Going') {
            buttonHtml = `
                <button class="ebo-rsvp-btn ebo-rsvp-btn-action" id="ebo-rsvp-main-btn" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #f87171;">
                    <span>❌ Not Going (Change RSVP)</span>
                </button>
            `;
        } else if (this.isFull) {
            buttonHtml = `
                <button class="ebo-rsvp-btn ebo-rsvp-btn-action" id="ebo-rsvp-main-btn" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); border: 1px solid #f59e0b;">
                    <span>⏳ Join Waitlist</span>
                </button>
            `;
        } else {
            buttonHtml = `
                <button class="ebo-rsvp-btn ebo-rsvp-btn-action" id="ebo-rsvp-main-btn">
                    <span>✍️ RSVP Here</span>
                </button>
            `;
        }

        const capacityStr = this.capacity ? `/${this.capacity}` : '';
        const countPillsHtml = `
            <div style="display: inline-flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem; flex-wrap: wrap;">
                <span style="background: rgba(43, 147, 72, 0.15); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); padding: 0.2rem 0.65rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                    ✓ ${this.goingCount}${capacityStr} Going
                </span>
                ${this.waitlistCount > 0 ? `
                    <span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.2rem 0.65rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                        ⏳ ${this.waitlistCount} Waitlisted
                    </span>
                ` : ''}
                ${this.notGoingCount > 0 ? `
                    <span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); padding: 0.2rem 0.65rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                        ❌ ${this.notGoingCount} Not Going
                    </span>
                ` : ''}
            </div>
        `;

        const capacityCalloutHtml = this.capacity ? `
            <div style="margin-top: 0.85rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.88rem; color: #93c5fd;">
                <strong>📌 Trip Limit:</strong> ${this.capacity} Rigs/Participants${this.isFull ? ' <span style="color: #fbbf24; font-weight: 600;">(Trip Full — New signups will be placed on the Waitlist)</span>' : ''}
            </div>
        ` : '';

        const agreementPath = this.getAgreementPageUrl();

        this.container.innerHTML = `
            <div class="ebo-rsvp-module-container">
                <div class="ebo-rsvp-header">
                    <div>
                        <h3 class="ebo-rsvp-title">⛺ Trip RSVP & Roster</h3>
                        <p style="color: #94a3b8; margin: 0.3rem 0 0 0; font-size: 0.95rem;">
                            Join the team for this upcoming adventure! View participant list or update your status.
                        </p>
                        ${countPillsHtml}
                    </div>
                    <div>
                        ${buttonHtml}
                    </div>
                </div>

                ${capacityCalloutHtml}

                <!-- Gemini: changed 2026-07-28 - Integrated Group Trip Agreement warning callout box into RSVP module container -->
                <div style="margin-top: 1.15rem; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 8px; padding: 1rem; font-size: 0.9rem;">
                    <div style="font-weight: 700; color: #fbbf24; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
                        ⚠️ Group Trip Agreement & Waiver
                    </div>
                    <div style="color: #cbd5e1; line-height: 1.5; font-size: 0.88rem;">
                        Before signing up, please review the <a href="${agreementPath}" target="_blank" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">Voluntary Acknowledgment of Risk and Group Trip Agreement</a>. By RSVPing and participating in this trip, you certify that you have read, understood, and voluntarily agreed to these terms.
                    </div>
                </div>

                <!-- Gemini: changed 2026-07-28 - Removed redundant agreement text from bottom bar since callout box is embedded -->
                <div style="margin-top: 1rem; border-top: 1px solid #334155; padding-top: 0.85rem; display: flex; justify-content: flex-end; align-items: center; font-size: 0.9rem;">
                    <a href="${rsvpPath}" style="color: #60a5fa; text-decoration: none; font-weight: 500;">
                        📋 View Participant List →
                    </a>
                </div>
            </div>
        `;

        const mainBtn = this.container.querySelector('#ebo-rsvp-main-btn');
        if (mainBtn) {
            mainBtn.addEventListener('click', () => {
                if (!isLoggedIn) {
                    this.handleSignInRedirect();
                } else if (this.myRsvpStatus) {
                    this.showStatusChangeModal();
                } else {
                    this.showAgreementModal();
                }
            });
        }
    }

    /**
     * Displays modal to change RSVP status between Going and Not Going.
     * Gemini: created 2026-07-28
     */
    showStatusChangeModal() {
        const existing = document.getElementById('ebo-rsvp-status-modal');
        if (existing) existing.remove();

        const isCurrentlyGoing = this.myRsvpStatus === 'Going';

        const modalHtml = `
            <div class="ebo-modal-backdrop" id="ebo-rsvp-status-modal">
                <div class="ebo-modal-card" style="max-width: 480px;">
                    <div class="ebo-modal-header">
                        <h3>🔄 Update Your RSVP Status</h3>
                        <button class="ebo-modal-close" id="ebo-status-close-btn">&times;</button>
                    </div>
                    <div class="ebo-modal-body">
                        <p style="font-weight: 600; color: #f8fafc; margin-top: 0;">
                            Current Status: ${isCurrentlyGoing ? '✓ Going' : '❌ Not Going'}
                        </p>
                        <p style="color: #94a3b8; font-size: 0.95rem;">
                            You will remain on the participant roster page with your updated status displayed.
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.25rem;">
                            <button id="btn-set-going" class="btn" style="background: linear-gradient(135deg, #2b9348 0%, #15803d 100%); color: #ffffff; padding: 0.75rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; text-align: center;">
                                ✓ Going
                            </button>
                            <button id="btn-set-notgoing" class="btn" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; padding: 0.75rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; text-align: center;">
                                ❌ No Longer Going
                            </button>
                        </div>
                    </div>
                    <div class="ebo-modal-footer">
                        <button id="ebo-status-cancel-btn" style="background: #334155; color: #ffffff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalEl = document.getElementById('ebo-rsvp-status-modal');
        const closeBtn = document.getElementById('ebo-status-close-btn');
        const cancelBtn = document.getElementById('ebo-status-cancel-btn');
        const goingBtn = document.getElementById('btn-set-going');
        const notGoingBtn = document.getElementById('btn-set-notgoing');

        const closeModal = () => modalEl.remove();

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) closeModal();
        });

        goingBtn.addEventListener('click', async () => {
            goingBtn.disabled = true;
            goingBtn.textContent = 'Updating...';
            await this.submitRSVP('Going');
            if (goingBtn) {
                goingBtn.disabled = false;
                goingBtn.textContent = '✓ Going';
            }
        });

        notGoingBtn.addEventListener('click', async () => {
            notGoingBtn.disabled = true;
            notGoingBtn.textContent = 'Updating...';
            await this.submitRSVP('Not Going');
            if (notGoingBtn) {
                notGoingBtn.disabled = false;
                notGoingBtn.textContent = 'Not Going';
            }
        });
    }

    /**
     * Calculates relative URL to trip participants page.
     * @returns {string} Path to participant page.
     */
    getParticipantsPageUrl() {
        const isEventPage = window.location.pathname.includes('/events/');
        const prefix = isEventPage ? '' : 'events/';
        return `${prefix}trip_participants.html?tripId=${encodeURIComponent(this.tripId)}`;
    }

    /**
     * Handles sign-in redirect / modal invocation when user is signed out.
     * Gemini: changed 2026-07-28 - Call window.openAuthModal() for reliable Google button rendering
     */
    handleSignInRedirect() {
        localStorage.setItem('ebo_pending_rsvp_trigger', this.tripId);

        if (typeof window.openAuthModal === 'function') {
            window.openAuthModal();
        } else {
            const navAuthBtn = document.getElementById('nav-auth-btn');
            if (navAuthBtn) {
                navAuthBtn.click();
            } else {
                alert('Please click the Login button in the top navigation bar to sign in.');
            }
        }
    }

    /**
     * Displays the Group Trip Agreement & RSVP Confirmation Modal.
     * Gemini: changed 2026-07-28 - Uses external getRsvpAgreementModalHtml template generator from rsvp_modal_template.js
     */
    showAgreementModal() {
        // Remove existing modal if any
        const existing = document.getElementById('ebo-rsvp-agreement-modal');
        if (existing) existing.remove();

        const user = this.currentUser?.user || this.currentUser || {};
        const name = user.name || user.profile?.name || '';
        const email = user.email || user.profile?.email || '';
        const agreementPath = this.getAgreementPageUrl();

        const modalHtml = typeof window.getRsvpAgreementModalHtml === 'function'
            ? window.getRsvpAgreementModalHtml({
                tripId: this.tripId,
                name: name,
                email: email,
                agreementPath: agreementPath
            })
            : `
            <div class="ebo-modal-backdrop" id="ebo-rsvp-agreement-modal">
                <div class="ebo-modal-card">
                    <div class="ebo-modal-header">
                        <h3>📋 Accept Group Trip Agreement & Confirm RSVP</h3>
                        <button class="ebo-modal-close" id="ebo-modal-close-btn">&times;</button>
                    </div>
                    <div class="ebo-modal-body">
                        <p style="font-weight: 600; color: #f8fafc; margin-top: 0;">
                            Trip: ${this.tripId.replace(/^TRIP_\d{4}_\d{2}_\d{2}_/, '').replace(/_/g, ' ')}
                        </p>
                        <p>
                            By clicking <strong>"I Accept & Confirm RSVP"</strong> below, you certify that:
                        </p>
                        <ul style="padding-left: 1.25rem; margin-bottom: 1.25rem;">
                            <li>You have read and voluntarily agree to the <a href="${agreementPath}" target="_blank" style="color: #60a5fa;">Voluntary Acknowledgment of Risk and Group Trip Agreement</a>.</li>
                            <li>Your RSVP details (Name and Profile Picture) will be added to the official participant roster for this trip.</li>
                        </ul>
                    </div>
                    <div class="ebo-modal-footer">
                        <button class="btn btn-secondary" id="ebo-modal-cancel-btn" style="background: #334155; color: #ffffff; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; cursor: pointer;">
                            Cancel
                        </button>
                        <button class="btn btn-primary" id="ebo-modal-confirm-btn" style="background: linear-gradient(135deg, #2b9348 0%, #15803d 100%); color: #ffffff; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            I Accept & Confirm RSVP
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalEl = document.getElementById('ebo-rsvp-agreement-modal');
        const closeBtn = document.getElementById('ebo-modal-close-btn');
        const cancelBtn = document.getElementById('ebo-modal-cancel-btn');
        const confirmBtn = document.getElementById('ebo-modal-confirm-btn');

        const closeModal = () => modalEl.remove();

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) closeModal();
        });

        const form = document.getElementById('agreement-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const consent = document.getElementById('sig-consent')?.checked;
                if (!consent) {
                    alert('You must consent to the Group Trip Agreement & Waiver to submit your RSVP.');
                    return;
                }
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = 'Saving RSVP...';
                }
                await this.submitRSVP('Going');
            });
        }
    }

    /**
     * Submits the user's RSVP confirmation, writes JSON, and routes to participant page.
     * @param {string} [selectedStatus="Going"] - RSVP status ('Going' | 'Not Going')
     */
    async submitRSVP(selectedStatus = 'Going') {
        const confirmBtn = document.getElementById('ebo-modal-confirm-btn');
        const user = this.currentUser?.user || this.currentUser || {};
        const name = document.getElementById('sig-name')?.value || user.name || user.profile?.name || 'Member';
        const picture = user.picture || user.profile?.picture || '';
        const email = document.getElementById('sig-email')?.value || user.email || user.profile?.email || 'member@overland-eastbay.com';
        const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
        const cell = document.getElementById('sig-cell')?.value || '';
        const emergencyContact = document.getElementById('sig-emergency')?.value || '';

        let documentHash = 'sha256:6ceaaa18b34dd836ff94021c280d98b8a7ee2537f919e96390602377ffc932d4';
        if (typeof window.computeAgreementHash === 'function') {
            try {
                documentHash = await window.computeAgreementHash();
            } catch (hErr) {}
        }

        // Gemini: changed 2026-08-22 - Store server-confirmed status (e.g. Waitlist) in localStorage
        let rsvpPayload = {
            schema_version: '1.0.0',
            trip_id: this.tripId,
            capacity: this.capacity,
            sub: user.sub || '',
            name: name,
            email: email,
            picture: picture,
            cell: cell,
            emergency_contact: emergencyContact,
            document_hash: documentHash,
            hash_algorithm: 'SHA-256',
            status: selectedStatus,
            agreement_accepted: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            // Submit to Cloudflare Worker BFF (sending both Bearer token header and credentials cookie)
            const token = localStorage.getItem('ebo_session_token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const resp = await fetch(`${this.bffUrl}/rsvp`, {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                signal: controller.signal,
                body: JSON.stringify(rsvpPayload)
            });
            clearTimeout(timeoutId);

            if (resp.ok) {
                const respData = await resp.json().catch(() => ({}));
                if (respData && respData.rsvp) {
                    rsvpPayload = { ...rsvpPayload, ...respData.rsvp };
                }
                console.log('RSVP and Signature successfully committed to GitHub database!');
            } else if (resp.status === 401) {
                console.warn('BFF RSVP Submission 401: Unauthorized session.');
                localStorage.removeItem('ebo_session_token');
                localStorage.setItem('ebo_demo_logged_in', 'false');
                alert('Your sign-in session has expired or is invalid. Please sign in with Google to complete your RSVP.');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'I Accept & Confirm RSVP';
                }
                this.handleSignInRedirect();
                return;
            } else {
                const errData = await resp.json().catch(() => ({}));
                console.warn('BFF RSVP response status:', resp.status, errData);
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn('RSVP Module: BFF submit network error/timeout:', err);
        }

        try {
            // Save local backup copy in localStorage for instant local render
            const localKey = `ebo_rsvp_${this.tripId}_${cleanEmail}`;
            localStorage.setItem(localKey, JSON.stringify(rsvpPayload));

            // Route user to trip participant page
            const participantsUrl = this.getParticipantsPageUrl();
            window.location.href = participantsUrl;
        } catch (err) {
            console.error('Error completing RSVP redirect:', err);
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'I Accept & Confirm RSVP';
            }
        }
    }
}

// Auto-initialize RSVP module elements on DOMContentLoaded or immediately if already loaded
// Gemini: changed 2026-08-22 - Support immediate execution if DOMContentLoaded has already fired
const initAllEboRsvpModules = () => {
    const modules = document.querySelectorAll('#ebo-rsvp-module, [data-ebo-rsvp-module]');
    modules.forEach(el => {
        if (!el._ebo_rsvp_instance) {
            el._ebo_rsvp_instance = new EBORsvpModule(el);
        }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllEboRsvpModules);
} else {
    initAllEboRsvpModules();
}
