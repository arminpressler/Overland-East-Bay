document.addEventListener('DOMContentLoaded', () => {
    const footerHTML = `
    <div class="footer-content">
        <p>&copy; ${new Date().getFullYear()} Overland East Bay. All rights reserved.</p>
        <div class="footer-links">
            <a href="disclaimer.html">Legal Disclaimer</a>
            <span class="footer-separator">|</span>
            <a href="join.html">Contact Us</a>
        </div>
    </div>
    `;

    const footer = document.querySelector('footer');
    if (footer) {
        footer.innerHTML = footerHTML;
    }
});
