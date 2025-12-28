document.addEventListener('DOMContentLoaded', () => {
    const navHTML = `
    <nav>
        <a href="index.html" class="logo"><img src="apple-touch-icon.png" width="45" height="45">OVERLAND EAST-BAY</a>
        <div class="nav-links">
            <a href="index.html">Home</a>
            <a href="calendar.html">Calendar</a>
            <a href="resources.html">Resources</a>
            <a href="join.html">Join</a>
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
