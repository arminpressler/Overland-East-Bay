/**
 * test_nav.js
 * agent change 2026-01-04 - Initial implementation for Login Button Phase 1
 * agent change 2026-01-05 - Added Settings Gear Icon for authenticatd users
 * agent change 2026-01-05 - UI Refine: Moved gear to right, added separator, resized.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Determine relative path prefix based on current location
    const isEventPage = window.location.pathname.includes('/events/');
    const isTestPage = window.location.pathname.includes('/test/');
    const prefix = (isEventPage || isTestPage) ? '../' : '';

    // Icons - Door with arrow for login/logout
    // Gemini: changed 2026-01-05 - Updated icons to door-with-arrow style per user request
    // Login icon: Arrow on left pointing RIGHT toward door
    const loginDoorSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>`;
    // Logout icon: Door on left, arrow pointing OUT to right
    const logoutDoorSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>`;
    // Simple Gear Icon
    const settingsSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

    // agent change 2026-01-04 - Auto-inject modal if missing
    if (!document.getElementById('ebo-auth-modal')) {
        const modalHTML = `
        <dialog id="ebo-auth-modal">
            <button class="btn-close" onclick="this.closest('dialog').close()">&times;</button>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Sign in</h2>
                    <p class="muted">Choose your preferred method to continue.</p>
                </div>
                <div class="modal-body">
                    <a href="#" id="ebo-auth-google-link" class="auth-btn auth-btn-google">
                        <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 8.29c.13.47.21.97.21 1.49 0 4.22-2.83 7.22-6.85 7.22-3.92 0-7.1-3.18-7.1-7.1C3.9 5.92 7.08 2.74 11 2.74c1.84 0 3.39.67 4.59 1.77L13.5 6.55c-1.22-1.12-2.92-1.64-4.5-1.64-2.8 0-5.1 2.3-5.1 5.1s2.3 5.1 5.1 5.1c3.1 0 4.4-2.1 4.6-3.2h-4.6V8.29h6.14z" fill="#4285F4"/></svg>
                        Continue with Google
                    </a>
                    <a href="#" id="ebo-auth-apple-link" class="auth-btn auth-btn-apple">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12.182 4.147c-.201.241-.444.478-.727.712-.284.234-.596.467-.936.699-.34.232-.701.465-1.083.699-.382.234-.783.468-1.203.702-.42.234-.858.468-1.314.702-.456.234-.928.468-1.416.702-.488.234-.991.468-1.509.702-.518.234-1.05.468-1.596.702-.546.234-1.106.468-1.68.702-.574.234-1.162.468-1.764.702L.148 10.42a.375.375 0 0 1-.375-.375V6.375c0-.207.168-.375.375-.375h1.242c.602-.234 1.19-.468 1.764-.702.574-.234 1.134-.468 1.68-.702.546-.234 1.078-.468 1.596-.702.518-.234 1.021-.468 1.509-.702a110 110 0 0 1 1.416-.702c.456-.234.894-.468 1.314-.702.42-.234.821-.468 1.203-.702.382-.234.743-.467 1.083-.699.34-.232.652-.465.936-.699.283-.234.526-.471.727-.712a.375.375 0 0 1 .586.468zM8 0a.375.375 0 0 1 .375.375c0 .241-.243.478-.526.712-.284.234-.596.467-.936.699-.34.232-.701.465-1.083.699-.382.234-.783.468-1.203.702-.42.234-.858.468-1.314.702-.456.234-.991.468-1.509.702-.518.234-1.05.468-1.596.702-.546.234-1.106.468-1.68.702-.574.234-1.162.468-1.764.702L.148 10.42a.375.375 0 0 1-.375-.375V6.375c0-.207.168-.375.375-.375h1.242c.602-.234 1.19-.468 1.764-.702.574-.234 1.134-.468 1.68-.702.546-.234 1.078-.468 1.596-.702.518-.234 1.021-.468 1.509-.702a110 110 0 0 1 1.416-.702c.456-.234.894-.468 1.314-.702.42-.234.821-.468 1.203-.702.382-.234.743-.467 1.083-.699.34-.232.652-.465.936-.699.283-.234.526-.471.727-.712a.375.375 0 0 1 .586.468L8 0z" /></svg>
                        Continue with Apple
                    </a>
                </div>
                <div class="modal-footer muted">
                    You’ll be returned to: <br><code id="ebo-auth-return-to-path"></code>
                </div>
            </div>
        </dialog>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Agent change 2026-01-05 - Styles moved to style.css

    // Mock Auth State (using localStorage for demo)
    let isLoggedIn = localStorage.getItem('ebo_demo_logged_in') === 'true';

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

    const getSettingsLinkHTML = () => {
        if (!isLoggedIn) return '';

        const isTestPage = window.location.pathname.includes('/test/');
        let settingsPath = '';
        if (isTestPage) {
            settingsPath = 'settings.html'; // relative to /test/
        } else {
            settingsPath = 'test/settings.html'; // relative to /
        }

        return `
            <span class="auth-separator">|</span>
            <a href="${settingsPath}" class="nav-icon-link" aria-label="Settings" title="Profile Settings">
               ${settingsSvg}
            </a>
        `;
    };

    // Modified nav structure: Settings is AFTER Auth Button now
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

    // Insert the nav
    const header = document.querySelector('header');
    if (header) {
        header.innerHTML = navHTML + header.innerHTML;
    }

    // Event Listeners
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const authBtn = document.getElementById('nav-auth-btn');
    const modal = document.getElementById('ebo-auth-modal');
    const settingsContainer = document.getElementById('nav-settings-container');

    // Mobile Menu Toggle
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Auth Button Local Logic
    const updateAuthUI = () => {
        const text = isLoggedIn ? 'Logout' : 'Login';
        const icon = isLoggedIn ? logoutDoorSvg : loginDoorSvg;
        authBtn.innerHTML = `${icon}<span>${text}</span>`;
        if (settingsContainer) {
            settingsContainer.innerHTML = getSettingsLinkHTML();
        }
    };

    if (authBtn) {
        authBtn.addEventListener('click', () => {
            if (isLoggedIn) {
                // Logout logic
                isLoggedIn = false;
                localStorage.setItem('ebo_demo_logged_in', 'false');
                updateAuthUI();

                // If on settings page or RSVP list, reload to refresh UI state
                if (window.location.pathname.toLowerCase().includes('settings') ||
                    window.location.pathname.toLowerCase().includes('rsvplist')) {
                    location.reload();
                } else {
                    alert('Logged out (Demo)');
                }

            } else {
                // Show Login Modal
                if (modal) {
                    // Update returnTo path in modal for demo
                    const returnToPath = document.getElementById('ebo-auth-return-to-path');
                    if (returnToPath) returnToPath.textContent = window.location.pathname;

                    modal.showModal();
                } else {
                    alert('Login modal not found in this test page.');
                }
            }
        });
    }

    // Modal Links Simulation
    const googleLink = document.getElementById('ebo-auth-google-link');
    const appleLink = document.getElementById('ebo-auth-apple-link');

    const handleLoginSimulation = (e) => {
        e.preventDefault();
        isLoggedIn = true;
        localStorage.setItem('ebo_demo_logged_in', 'true');
        updateAuthUI();
        if (modal) modal.close();

        // If returned to settings page or RSVP list, reload to show content/update state
        if (window.location.pathname.toLowerCase().includes('settings') ||
            window.location.pathname.toLowerCase().includes('rsvplist')) {
            location.reload();
        }
        // Otherwise stay on page
    };

    if (googleLink) googleLink.addEventListener('click', handleLoginSimulation);
    if (appleLink) appleLink.addEventListener('click', handleLoginSimulation);
});
