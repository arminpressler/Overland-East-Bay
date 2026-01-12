/**
 * Calendar Utility Script
 * 
 * Automatically generates "Add to Calendar" buttons (Google + ICS) for
 * elements with the 'calendar-widget' class.
 * 
 * Usage:
 * <div class="calendar-widget"
 *      data-title="Event Name"
 *      data-start="2026-02-12T06:30:00"
 *      data-end="2026-02-16T12:00:00"
 *      data-location="Location Name"
 *      data-description="Description">
 * </div>
 * 
 * Gemini: Created 2026-01-11
 */

document.addEventListener('DOMContentLoaded', () => {
    // Auto-initialize static widgets
    const widgets = document.querySelectorAll('.calendar-widget');
    widgets.forEach(widget => generateCalendarButtons(widget));
});

/**
 * Generates calendar buttons for a given widget element.
 * Exposed globally to support dynamic content loading.
 * @param {HTMLElement} widget 
 */
window.generateCalendarButtons = function (widget) {
    // Prevent double-initialization
    if (widget.querySelector('.calendar-buttons')) return;

    // Check if data is ready
    if (!widget.dataset.title || !widget.dataset.start) return;

    const event = {
        title: widget.dataset.title,
        start: new Date(widget.dataset.start),
        end: new Date(widget.dataset.end),
        location: widget.dataset.location,
        description: widget.dataset.description
    };

    // Validate date objects
    if (isNaN(event.start.getTime()) || isNaN(event.end.getTime())) {
        console.error('Invalid date format for calendar widget:', widget);
        return;
    }

    const container = document.createElement('div');
    container.className = 'calendar-buttons';

    // 1. Google Calendar Button
    const googleBtn = createGoogleButton(event);
    container.appendChild(googleBtn);

    // 2. ICS (Apple/Outlook) Button
    const icsBtn = createICSButton(event);
    container.appendChild(icsBtn);

    widget.appendChild(container);
};

function formatICSDate(date) {
    const pad = (n) => n < 10 ? '0' + n : n;
    return date.getUTCFullYear() +
        pad(date.getUTCMonth() + 1) +
        pad(date.getUTCDate()) + 'T' +
        pad(date.getUTCHours()) +
        pad(date.getUTCMinutes()) +
        pad(date.getUTCSeconds()) + 'Z';
}

function createGoogleButton(event) {
    // Format for Google: YYYYMMDDTHHMMSSZ (UTC)
    const start = formatICSDate(event.start);
    const end = formatICSDate(event.end);

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', event.title);
    url.searchParams.append('dates', `${start}/${end}`);
    url.searchParams.append('details', event.description);
    url.searchParams.append('location', event.location);

    const btn = document.createElement('a');
    btn.href = url.toString();
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.className = 'btn btn-google';
    btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/>
        </svg>
        <span>
            <span class="btn-label-small">Add to</span>
            <span class="btn-label-large">Google Calendar</span>
        </span>
    `;

    return btn;
}

function createICSButton(event) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ics'; // New class for consistent styling
    btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
        </svg>
        <span>
            <span class="btn-label-small">Add to</span>
            <span class="btn-label-large">Calendar (.ics)</span>
        </span>
    `;

    btn.onclick = () => {
        const now = formatICSDate(new Date());
        const start = formatICSDate(event.start);
        const end = formatICSDate(event.end);

        const content = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Overland East Bay//Website//EN',
            'BEGIN:VEVENT',
            `UID:${now}-${Math.floor(Math.random() * 10000)}@overlandeastbay.org`,
            `DTSTAMP:${now}`,
            `DTSTART:${start}`,
            `DTEND:${end}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
            `LOCATION:${event.location}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${event.title.replace(/[^a-z0-9]/yi, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return btn;
}
