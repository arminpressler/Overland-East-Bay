/**
 * nav.js
 * Navigation component for the Overland East Bay website.
 * Gemini: changed 2026-01-05 - Added hamburger menu for mobile screens
 * Gemini: changed 2026-07-27 - Added navbar login/logout button and Google auth modal
 * Gemini: changed 2026-07-27 - Connected Google OAuth GSI backend authentication & Workers KV session check
 * Gemini: changed 2026-07-27 - Cleaned up modal to show single Google button and removed return path footer
 * Gemini: changed 2026-07-27 - Updated BFF worker URL to deployed edge domain with fallback
 */

document.addEventListener('DOMContentLoaded', () => {
    // Determine relative path prefix based on current location
    const isEventPage = window.location.pathname.includes('/events/');
    const isTestPage = window.location.pathname.includes('/test/');
    const isMemberRigsPage = window.location.pathname.includes('/member_rigs/');
    const isAdminPage = window.location.pathname.includes('/admin/');
    const isArchivePage = window.location.pathname.includes('/archive/');
    const prefix = (isEventPage || isTestPage || isMemberRigsPage || isAdminPage || isArchivePage) ? '../' : '';

    // Deployed Cloudflare Worker BFF Endpoint
    const BFF_API_URL = 'https://ebo-signature-bff.armin-pressler.workers.dev';

    const GOOGLE_CLIENT_ID = '312378170445-q55sjubhhuj0s3ipo6v7g0nnvt08vloe.apps.googleusercontent.com';

    // Icons - Door with arrow for login/logout and gear icon for settings
    const loginDoorSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>`;
    const logoutDoorSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>`;
    const settingsSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

    // Auto-inject Google Identity Services script if missing
    if (!document.getElementById('google-gsi-script')) {
        const gsiScript = document.createElement('script');
        gsiScript.id = 'google-gsi-script';
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        gsiScript.defer = true;
        document.head.appendChild(gsiScript);
    }

    // Auto-inject auth dialog modal with official Google GSI button container
    // Gemini: changed 2026-07-27 - Render official Google GSI button container for iOS Safari compatibility
    if (!document.getElementById('ebo-auth-modal')) {
        const modalHTML = `
        <dialog id="ebo-auth-modal">
            <button class="btn-close" type="button" aria-label="Close modal">&times;</button>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Sign in</h2>
                    <p class="muted">Sign in with your Google account to continue.</p>
                </div>
                <div class="modal-body" style="display: flex; justify-content: center; align-items: center; padding: 1.5rem 0; min-height: 50px;">
                    <div id="ebo-gsi-button-container"></div>
                </div>
            </div>
        </dialog>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Auth State - Require active session token for initial logged in state
    // Gemini: changed 2026-07-28 - Require valid session token for logged-in state
    let isLoggedIn = localStorage.getItem('ebo_demo_logged_in') === 'true' && Boolean(localStorage.getItem('ebo_session_token'));
    let currentUser = null;

    /**
     * Generates HTML markup for the Login/Logout button.
     * @returns {string} Auth button HTML markup.
     */
    const getAuthBtnHTML = () => {
        const text = isLoggedIn ? 'Logout' : 'Login';
        const icon = isLoggedIn ? logoutDoorSvg : loginDoorSvg;
        return `
            <button class="ebo-auth-button" id="nav-auth-btn">
                ${icon}
                <span>${text}</span>
            </button>
        `;
    };

    /**
     * Generates HTML markup for the profile settings link when authenticated.
     * @returns {string} Settings link HTML markup or empty string.
     */
    const getSettingsLinkHTML = () => {
        if (!isLoggedIn) return '';
        // Gemini: changed 2026-07-29 - Point settings icon to admin/settings.html
        const settingsPath = `${prefix}admin/settings.html`;
        return `
            <span class="auth-separator">|</span>
            <a href="${settingsPath}" class="nav-icon-link" aria-label="Settings" title="Profile Settings">
               ${settingsSvg}
            </a>
        `;
    };

    const navHTML = `
    <nav>
        <a href="${prefix}index.html" class="logo"><img src="${prefix}apple-touch-icon.png" width="45" height="45">OVERLAND EAST-BAY</a>
        
        <button class="menu-toggle" id="menu-toggle" aria-label="Toggle navigation">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <div class="nav-links" id="nav-links">
            <a href="${prefix}index.html">Home</a>
            <a href="${prefix}calendar.html">Calendar</a>
            <a href="${prefix}trips.cards.html">Trips</a>
            <a href="${prefix}resources.cards.html">Resources</a>
            <a href="${prefix}join.cards.html">Join</a>
            <div class="nav-auth-container">
                ${getAuthBtnHTML()}
                <div id="nav-settings-container">${getSettingsLinkHTML()}</div>
            </div>
        </div>
    </nav>
    `;

    const header = document.querySelector('header');
    if (header) {
        header.innerHTML = navHTML + header.innerHTML;
    } else {
        const body = document.querySelector('body');
        const newHeader = document.createElement('header');
        newHeader.innerHTML = navHTML;
        body.insertBefore(newHeader, body.firstChild);
    }

    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const authBtn = document.getElementById('nav-auth-btn');
    const modal = document.getElementById('ebo-auth-modal');
    const settingsContainer = document.getElementById('nav-settings-container');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Gemini: changed 2026-07-27 - Added iOS Safari backdrop click & explicit close button handlers
    if (modal) {
        modal.addEventListener('click', (e) => {
            const rect = modal.getBoundingClientRect();
            const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
            if (!isInDialog) {
                modal.close();
            }
        });

        const closeBtn = modal.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.close();
            });
        }
    }

    /**
     * Updates authentication UI elements based on state.
     */
    const updateAuthUI = () => {
        const text = isLoggedIn ? 'Logout' : 'Login';
        const icon = isLoggedIn ? logoutDoorSvg : loginDoorSvg;
        if (authBtn) {
            authBtn.innerHTML = `${icon}<span>${text}</span>`;
        }
        if (settingsContainer) {
            settingsContainer.innerHTML = getSettingsLinkHTML();
        }
    };

    /**
     * Checks session status with BFF worker endpoint GET /auth/me.
     * Gemini: changed 2026-07-27 - Pass Bearer token header for iOS Safari cross-site cookie restriction bypass
     */
    const checkBackendSession = async () => {
        try {
            const token = localStorage.getItem('ebo_session_token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const resp = await fetch(`${BFF_API_URL}/auth/me`, {
                headers: headers,
                credentials: 'include'
            });

            if (resp.ok) {
                const data = await resp.json();
                isLoggedIn = true;
                currentUser = data;
                // Gemini: changed 2026-07-28 - Cache ebo_user_profile in localStorage for instant component user state
                localStorage.setItem('ebo_user_profile', JSON.stringify(data));
                localStorage.setItem('ebo_demo_logged_in', 'true');
            } else {
                // Gemini: changed 2026-07-28 - Force logged out state when backend session returns non-200 response
                isLoggedIn = false;
                currentUser = null;
                localStorage.setItem('ebo_demo_logged_in', 'false');
                localStorage.removeItem('ebo_session_token');
                localStorage.removeItem('ebo_user_profile');
            }
        } catch (err) {
            console.warn('BFF session check unavailable, using cached state:', err);
        }
        updateAuthUI();
    };

    checkBackendSession();

    /**
     * Handles Google GSI ID Token response from Google OAuth.
     * @param {Object} response Google credential response.
     */
    const handleGoogleCredentialResponse = async (response) => {
        try {
            const res = await fetch(`${BFF_API_URL}/auth/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ credential: response.credential })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                isLoggedIn = true;
                currentUser = data.user;
                const token = data.token || data.user?.sessionId;
                if (token) {
                    localStorage.setItem('ebo_session_token', token);
                }
                localStorage.setItem('ebo_user_profile', JSON.stringify(data.user));
                localStorage.setItem('ebo_demo_logged_in', 'true');
                updateAuthUI();
                if (modal) modal.close();

                // Gemini: changed 2026-07-28 - Dispatch ebo:auth:success event and reload if pending rsvp trigger is set
                window.dispatchEvent(new CustomEvent('ebo:auth:success', { detail: data.user }));

                if (window.location.pathname.toLowerCase().includes('settings') ||
                    window.location.pathname.toLowerCase().includes('rsvplist') ||
                    window.location.pathname.toLowerCase().includes('trip_participants') ||
                    localStorage.getItem('ebo_pending_rsvp_trigger') ||
                    localStorage.getItem('ebo_pending_agreement_trigger')) {
                    location.reload();
                }
            } else {
                const errorMsg = data.error?.message || data.error || data.message || 'Server returned an invalid session state.';
                console.warn('BFF auth session creation error:', data);
                alert('Authentication Note: ' + errorMsg + '\nPlease click "Continue with Google" to sign in.');
            }
        } catch (err) {
            console.error('Google Auth submission failed:', err);
            const isLoadFailed = err && (err.name === 'TypeError' || String(err.message).toLowerCase().includes('load failed'));
            const userMsg = isLoadFailed
                ? 'Unable to connect to sign-in service. If on mobile, please verify your internet connection or reload the page.'
                : (err.message || 'Could not connect to authentication server. Please check your connection and try again.');
            alert('Authentication Note: ' + userMsg);
        }
    };

    /**
     * Initializes Google GSI and renders the official Google Sign-In button.
     * Gemini: changed 2026-07-28 - Exposed globally with async retry for external trigger buttons
     */
    window.initGoogleGSI = () => {
        let attempts = 0;
        const render = () => {
            if (window.google?.accounts?.id) {
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });

                const btnContainer = document.getElementById('ebo-gsi-button-container');
                if (btnContainer) {
                    btnContainer.innerHTML = '';
                    google.accounts.id.renderButton(btnContainer, {
                        type: 'standard',
                        shape: 'rectangular',
                        theme: 'filled_dark',
                        size: 'large',
                        text: 'continue_with',
                        width: 250
                    });
                }
            } else if (attempts < 30) {
                attempts++;
                setTimeout(render, 150);
            }
        };
        render();
    };

    /**
     * Opens the global Google Authentication modal and renders GSI button.
     * Gemini: created 2026-07-28
     */
    window.openAuthModal = () => {
        const modal = document.getElementById('ebo-auth-modal');
        if (modal) {
            modal.showModal();
            window.initGoogleGSI();
        }
    };

    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            if (isLoggedIn) {
                // Logout logic
                const token = localStorage.getItem('ebo_session_token');
                const headers = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                try {
                    await fetch(`${BFF_API_URL}/auth/logout`, {
                        method: 'POST',
                        headers: headers,
                        credentials: 'include'
                    });
                } catch (e) {
                    console.warn('Logout request failed:', e);
                }

                isLoggedIn = false;
                currentUser = null;
                localStorage.setItem('ebo_demo_logged_in', 'false');
                localStorage.removeItem('ebo_session_token');
                localStorage.removeItem('ebo_user_profile');
                updateAuthUI();

                // Gemini: changed 2026-07-28 - Dispatch ebo:auth:logout event and reload on trip_participants page
                window.dispatchEvent(new CustomEvent('ebo:auth:logout'));

                if (window.google?.accounts?.id) {
                    google.accounts.id.disableAutoSelect();
                }

                if (window.location.pathname.toLowerCase().includes('settings') ||
                    window.location.pathname.toLowerCase().includes('rsvplist') ||
                    window.location.pathname.toLowerCase().includes('trip_participants') ||
                    window.location.pathname.toLowerCase().includes('group-trip-agreement')) {
                    location.reload();
                }
            } else {
                // Show Login Modal & render Google GSI button
                window.openAuthModal();
            }
        });
    }
});
