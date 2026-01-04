document.addEventListener('DOMContentLoaded', () => {
    // Determine relative path prefix based on current location
    const isEventPage = window.location.pathname.includes('/events/');
    const isTestPage = window.location.pathname.includes('/test/');
    const prefix = (isEventPage || isTestPage) ? '../' : '';

    const navHTML = `
    <nav>
        <a href="${prefix}index.html" class="logo"><img src="${prefix}apple-touch-icon.png" width="45" height="45">OVERLAND EAST-BAY</a>
        <div class="nav-links">
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
});
