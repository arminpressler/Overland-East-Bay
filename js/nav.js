/**
 * nav.js
 * Navigation component for the Overland East Bay website.
 * Gemini: changed 2026-01-05 - Added hamburger menu for mobile screens
 */
document.addEventListener('DOMContentLoaded', () => {
    // Determine relative path prefix based on current location
    const isEventPage = window.location.pathname.includes('/events/');
    const isTestPage = window.location.pathname.includes('/test/');
    const isMemberRigsPage = window.location.pathname.includes('/member_rigs/');
    const isAdminPage = window.location.pathname.includes('/admin/');
    const prefix = (isEventPage || isTestPage || isMemberRigsPage || isAdminPage) ? '../' : '';

    const navHTML = `
    <nav>
            <a href="${prefix}index.html" class="logo"><img src="/apple-touch-icon.png" width="45" height="45">OVERLAND EAST-BAY</a>
        
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
        </div>
    </nav>
    `;

    // Insert the nav at the beginning of the header
    const header = document.querySelector('header');
    if (header) {
        header.innerHTML = navHTML + header.innerHTML;
    } else {
        // Fallback if no header exists, though all pages should have one
        const body = document.querySelector('body');
        const newHeader = document.createElement('header');
        newHeader.innerHTML = navHTML;
        body.insertBefore(newHeader, body.firstChild);
    }

    // Gemini: changed 2026-01-05 - Added mobile menu toggle functionality
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});
