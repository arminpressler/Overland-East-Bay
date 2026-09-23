/**
 * Calendar Utility Script
 * 
 * Automatically generates "Add to Calendar" buttons (Google + ICS) for
 * elements with the 'calendar-widget' class.
 * Ensures consistent PST/PDT timezone handling for California events.
 * 
 * Usage:
 * <div class="calendar-widget"
 *      data-title="Event Name"
 *      data-start="2026-02-12T06:30:00"  (ISO format)
 *      data-end="2026-02-16T12:00:00"
 *      data-location="Location Name"
 *      data-description="Description">
 * </div>
 * 
 * Gemini: Changed 2026-01-15 - Added explicit PST/PDT handling
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

    const rawStart = widget.dataset.start.trim();
    const rawEnd = widget.dataset.end ? widget.dataset.end.trim() : rawStart;

    // Detect if "All Day" (Date only, no time component)
    // Heuristic: Length of 10 (YYYY-MM-DD) or missing 'T'/' '
    const isAllDay = rawStart.length === 10 && !rawStart.includes('T') && !rawStart.includes(' ');

    let event;

    if (isAllDay) {
        // User Request: "for full day - the last day is off - it should end 1min before midnigth"
        // Also needs to be in PST.
        // Solution: Treat distinct dates as specific times: Start 00:00 -> End 23:59 (PST)

        try {
            const startDate = parsePSTDate(rawStart + 'T00:00:00');
            const endDate = parsePSTDate(rawEnd + 'T23:59:00');

            event = {
                allDay: false, // Treat as specific time to enforce timezone
                title: widget.dataset.title,
                start: startDate,
                end: endDate,
                location: widget.dataset.location,
                description: widget.dataset.description
            };
        } catch (e) {
            console.error("Error parsing all-day dates:", e);
            return;
        }

    } else {
        // Specific Time - Force PST/PDT
        try {
            const startDate = parsePSTDate(rawStart);
            const endDate = parsePSTDate(rawEnd);

            event = {
                allDay: false,
                title: widget.dataset.title,
                start: startDate,
                end: endDate,
                location: widget.dataset.location,
                description: widget.dataset.description
            };
        } catch (e) {
            console.error("Error parsing dates:", e);
            return;
        }
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

/**
 * UTILITY: Check if a date is in Daylight Saving Time (USA)
 * Rule: 2nd Sunday in March to 1st Sunday in November
 */
function isDST(date) {
    const year = date.getFullYear();
    // DST Start: 2nd Sunday in March
    const dstStart = new Date(year, 2, 1); // March 1
    dstStart.setDate(1 + (14 - dstStart.getDay()) % 7 + 7); // Move to 2nd Sunday
    dstStart.setHours(2, 0, 0, 0);

    // DST End: 1st Sunday in November
    const dstEnd = new Date(year, 10, 1); // Nov 1
    dstEnd.setDate(1 + (7 - dstEnd.getDay()) % 7); // Move to 1st Sunday
    dstEnd.setHours(2, 0, 0, 0);

    return date >= dstStart && date < dstEnd;
}

/**
 * UTILITY: Parse a date string as Pacific Time (PST/PDT)
 * Returns a Date object representing the absolute moment in time.
 */
function parsePSTDate(dateStr) {
    // 1. naive parse to get components
    // We treat the input string as "Local Wall Time in California"
    const naive = new Date(dateStr);
    if (isNaN(naive.getTime())) throw new Error("Invalid date");

    // 2. Determine offset
    // Check DST status based on the naive components
    // (Approximation: treat naive as local to check rules. 
    // Since DST rules are date-based, mostly works except 1am-2am overlap window)
    const dst = isDST(naive);
    const offset = dst ? '-07:00' : '-08:00';

    // 3. Re-parse strictly with offset
    // Ensure dateStr is ISO-like (YYYY-MM-DDTHH:mm:ss)
    // If it lacks T, replace space
    let isoStr = dateStr.replace(' ', 'T');

    // Add seconds if missing
    if (isoStr.split(':').length === 2) isoStr += ':00';

    // Append offset
    return new Date(`${isoStr}${offset}`);
}

/**
 * Format Date object to ICS string (UTC)
 * Format: YYYYMMDDTHHMMSSZ
 */
function formatICSDateTime(date) {
    const pad = (n) => n < 10 ? '0' + n : n;
    return date.getUTCFullYear() +
        pad(date.getUTCMonth() + 1) +
        pad(date.getUTCDate()) + 'T' +
        pad(date.getUTCHours()) +
        pad(date.getUTCMinutes()) +
        pad(date.getUTCSeconds()) + 'Z';
}


function createGoogleButton(event) {
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', event.title);

    if (event.allDay) {
        // Format: YYYYMMDD/YYYYMMDD (Floating)
        url.searchParams.append('dates', `${event.start}/${event.end}`);
    } else {
        // Format: YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ (UTC)
        const start = formatICSDateTime(event.start);
        const end = formatICSDateTime(event.end);
        url.searchParams.append('dates', `${start}/${end}`);
    }

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
    btn.className = 'btn btn-ics';
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
        const now = formatICSDateTime(new Date());
        let dtStart, dtEnd;

        // Build data fields
        const fields = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Overland East Bay//Website//EN',
            'BEGIN:VEVENT',
            `UID:${now}-${Math.floor(Math.random() * 10000)}@www.overland-eastbay.com`,
            `DTSTAMP:${now}`
        ];

        if (event.allDay) {
            // All Day: VALUE=DATE, Floating Time
            fields.push(`DTSTART;VALUE=DATE:${event.start}`);
            fields.push(`DTEND;VALUE=DATE:${event.end}`);
        } else {
            // Specific Time: UTC
            fields.push(`DTSTART:${formatICSDateTime(event.start)}`);
            fields.push(`DTEND:${formatICSDateTime(event.end)}`);
        }

        fields.push(`SUMMARY:${event.title}`);
        fields.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
        fields.push(`LOCATION:${event.location}`);
        fields.push('STATUS:CONFIRMED');
        fields.push('END:VEVENT');
        fields.push('END:VCALENDAR');

        const content = fields.join('\r\n');
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
