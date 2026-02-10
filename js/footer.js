document.addEventListener('DOMContentLoaded', () => {
    // Determine relative path prefix based on current location
    const isEventPage = window.location.pathname.includes('/events/');
    const isAdminPage = window.location.pathname.includes('/admin/');
    const prefix = (isEventPage || isAdminPage) ? '../' : '';

    const footerHTML = `
    <div class="footer-content">
        <p>&copy; ${new Date().getFullYear()} Overland East Bay. All rights reserved.</p>
        <div class="footer-links">
            <a href="${prefix}admin/disclaimer.html">Legal Disclaimer</a>
            <span class="footer-separator">|</span>
            <a href="${prefix}join.cards.html">Contact Us</a>
            <span class="footer-separator">|</span>
            <a href="${prefix}admin/qr.html">QR</a>
        </div>
    </div>
    `;

    const footer = document.querySelector('footer');
    if (footer) {
        footer.innerHTML = footerHTML;
    }
});
