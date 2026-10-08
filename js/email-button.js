/**
 * Email Button Logic (Direct Action)
 * Handles creating the mailto link and opening the client directly.
 */

// Use event delegation to handle clicks robustly, even if elements are added dynamically
document.addEventListener('click', function (e) {
    // Check if the clicked element or its parent is the trigger button
    const button = e.target.closest('.email-invite-trigger');

    if (button) {
        e.preventDefault();

        const subject = button.getAttribute('data-subject') || "Join me on an Overland EastBay Trip!";
        const rawMessage = button.getAttribute('data-message') || "Check out this trip: https://overland-eastbay.com";

        // Ensure newlines are encoded correctly for mailto
        // %0D%0A is the standard for mailto line breaks
        const encodedSubject = encodeURIComponent(subject);
        const encodedMessage = encodeURIComponent(rawMessage).replace(/%0A/g, '%0D%0A');

        const mailtoLink = `mailto:?subject=${encodedSubject}&body=${encodedMessage}`;

        window.location.href = mailtoLink;
    }
});
