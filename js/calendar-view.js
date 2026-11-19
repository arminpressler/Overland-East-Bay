// Gemini: created 2026-11-16 - Visual Calendar Grid (Yearly 12x4 & Monthly) + List Toggle (GH Issue #16) agent change
(function () {
    'use strict';

    const STORAGE_VIEW_KEY = 'ebo_calendar_view';
    const STORAGE_SCALE_KEY = 'ebo_calendar_scale';
    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function parseYMD(ymd) {
        const [y, m, d] = ymd.split('-').map(Number);
        return { y, m, d };
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function daysInMonth(year, month1Based) {
        return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
    }

    function firstWeekday(year, month1Based) {
        return new Date(Date.UTC(year, month1Based - 1, 1)).getUTCDay();
    }

    function formatShortRange(ev) {
        const s = parseYMD(ev.startDate);
        const e = parseYMD(ev.endDate);
        if (ev.startDate === ev.endDate) {
            return `${MONTH_SHORT[s.m - 1]} ${s.d}, ${s.y}`;
        }
        if (s.y === e.y && s.m === e.m) {
            return `${MONTH_SHORT[s.m - 1]} ${s.d}–${e.d}, ${s.y}`;
        }
        return `${MONTH_SHORT[s.m - 1]} ${s.d} – ${MONTH_SHORT[e.m - 1]} ${e.d}, ${e.y}`;
    }

    function getWeekIndex(day) {
        if (day <= 7) return 0;
        if (day <= 14) return 1;
        if (day <= 21) return 2;
        return 3; // Days 22..31 fold into W4
    }

    function addMonths(year, month1Based, offset) {
        const total = (year * 12 + (month1Based - 1)) + offset;
        return {
            y: Math.floor(total / 12),
            m: (total % 12) + 1
        };
    }

    function initCalendarView() {
        const dataEl = document.getElementById('calendar-events-data');
        const toolbar = document.getElementById('calendar-toolbar');
        const scaleGroup = document.getElementById('calendar-scale-group');
        const gridContainer = document.getElementById('calendar-grid-container');
        const listContainer = document.getElementById('calendar-list-container');
        if (!dataEl || !toolbar || !gridContainer || !listContainer) return;

        let events = [];
        try {
            events = JSON.parse(dataEl.textContent || '[]');
        } catch (e) {
            return;
        }
        if (!Array.isArray(events) || events.length === 0) return;

        // Rolling 12-month window starting at the earliest upcoming event's month
        const sorted = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
        const first = parseYMD(sorted[0].startDate);
        const monthsWindow = [];
        for (let i = 0; i < 12; i++) {
            monthsWindow.push(addMonths(first.y, first.m, i));
        }

        let currentView = localStorage.getItem(STORAGE_VIEW_KEY) || 'grid';
        let currentScale = localStorage.getItem(STORAGE_SCALE_KEY) || 'yearly';
        let activeMonthIndex = 0;
        let selectedEvent = null;

        toolbar.hidden = false;

        function renderDetailBar(ev) {
            if (!ev) {
                return '<div class="cal-detail-bar is-empty">Tap or click any event for dates and details. Click a month name in Yearly view to zoom in.</div>';
            }
            const range = formatShortRange(ev);
            const action = ev.href
                ? `<a href="${escapeHtml(ev.href)}" class="cal-detail-link">View Details &rarr;</a>`
                : '<span class="cal-detail-nolink">Details not yet posted</span>';
            return `
                <div class="cal-detail-bar cat-${escapeHtml(ev.category)}">
                    <div class="cal-detail-info">
                        <span class="cal-detail-date">${escapeHtml(range)}</span>
                        <strong class="cal-detail-title">${escapeHtml(ev.title)}</strong>
                    </div>
                    ${action}
                </div>
            `;
        }

        function renderEventChip(ev, extraClass) {
            const label = escapeHtml(ev.title);
            const range = escapeHtml(formatShortRange(ev));
            const cls = `cal-event-bar cat-${escapeHtml(ev.category)} ${extraClass || ''}`.trim();
            const idx = events.indexOf(ev);
            if (ev.href) {
                return `<a href="${escapeHtml(ev.href)}" class="${cls}" data-ev-idx="${idx}" title="${range}: ${label}">${label}</a>`;
            }
            return `<button type="button" class="${cls}" data-ev-idx="${idx}" title="${range}: ${label}">${label}</button>`;
        }

        function renderYearlyGrid() {
            let rowsHtml = '';
            monthsWindow.forEach((ym, mIdx) => {
                const mStart = `${ym.y}-${String(ym.m).padStart(2, '0')}-01`;
                const lastDay = daysInMonth(ym.y, ym.m);
                const mEnd = `${ym.y}-${String(ym.m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

                // Events overlapping this month
                const monthEvents = events.filter(ev => ev.endDate >= mStart && ev.startDate <= mEnd);

                // Build 4 week cells (W1..W4)
                const weekBuckets = [[], [], [], []];
                const spanningBars = [];

                monthEvents.forEach(ev => {
                    const clippedStart = ev.startDate < mStart ? mStart : ev.startDate;
                    const clippedEnd = ev.endDate > mEnd ? mEnd : ev.endDate;
                    const sDay = parseYMD(clippedStart).d;
                    const eDay = parseYMD(clippedEnd).d;
                    const wStart = getWeekIndex(sDay);
                    const wEnd = getWeekIndex(eDay);

                    if (ev.startDate !== ev.endDate || wEnd > wStart) {
                        spanningBars.push({ ev, wStart, wEnd });
                    } else {
                        weekBuckets[wStart].push(ev);
                    }
                });

                const weekCellsHtml = [0, 1, 2, 3].map(w => {
                    const itemsHtml = weekBuckets[w].map(ev => renderEventChip(ev, 'is-pill')).join('');
                    return `<div class="cal-week-cell" data-week="W${w + 1}">${itemsHtml}</div>`;
                }).join('');

                const barsHtml = spanningBars.map(({ ev, wStart, wEnd }) => {
                    const colStart = wStart + 1;
                    const colSpan = (wEnd - wStart) + 1;
                    const style = `grid-column: ${colStart} / span ${colSpan};`;
                    const label = escapeHtml(ev.title);
                    const range = escapeHtml(formatShortRange(ev));
                    const idx = events.indexOf(ev);
                    const cls = `cal-event-bar is-span cat-${escapeHtml(ev.category)}`;
                    return ev.href
                        ? `<a href="${escapeHtml(ev.href)}" class="${cls}" style="${style}" data-ev-idx="${idx}" title="${range}: ${label}">${label}</a>`
                        : `<button type="button" class="${cls}" style="${style}" data-ev-idx="${idx}" title="${range}: ${label}">${label}</button>`;
                }).join('');

                rowsHtml += `
                    <div class="cal-year-row">
                        <button type="button" class="cal-year-month-btn" data-month-idx="${mIdx}" title="Zoom to ${MONTH_NAMES[ym.m - 1]} ${ym.y}">
                            <span class="cal-ym-short">${MONTH_SHORT[ym.m - 1]}</span>
                            <span class="cal-ym-year">${ym.y}</span>
                        </button>
                        <div class="cal-year-weeks">
                            <div class="cal-year-cells">${weekCellsHtml}</div>
                            ${barsHtml ? `<div class="cal-year-bars">${barsHtml}</div>` : ''}
                        </div>
                    </div>
                `;
            });

            gridContainer.innerHTML = `
                <div class="cal-yearly-grid" role="region" aria-label="Yearly 12 by 4 Calendar Overview">
                    <div class="cal-year-header">
                        <div class="cal-year-header-month">Month</div>
                        <div class="cal-year-header-weeks">
                            <span>W1 <small>(1–7)</small></span>
                            <span>W2 <small>(8–14)</small></span>
                            <span>W3 <small>(15–21)</small></span>
                            <span>W4 <small>(22+)</small></span>
                        </div>
                    </div>
                    ${rowsHtml}
                </div>
                ${renderDetailBar(selectedEvent)}
            `;
        }

        function renderMonthlyGrid() {
            const ym = monthsWindow[activeMonthIndex];
            const totalDays = daysInMonth(ym.y, ym.m);
            const startDow = firstWeekday(ym.y, ym.m);
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const headers = WEEKDAYS.map(d => `<div class="cal-month-dow">${d}</div>`).join('');
            const cells = [];

            for (let i = 0; i < startDow; i++) {
                cells.push('<div class="cal-day-cell is-pad"></div>');
            }

            for (let d = 1; d <= totalDays; d++) {
                const dateStr = `${ym.y}-${String(ym.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayEvents = events.filter(ev => ev.startDate <= dateStr && ev.endDate >= dateStr);
                const isToday = dateStr === todayStr ? ' is-today' : '';
                const chips = dayEvents.map(ev => {
                    const isStart = ev.startDate === dateStr;
                    const isEnd = ev.endDate === dateStr;
                    const spanCls = ev.startDate === ev.endDate
                        ? 'is-single'
                        : `${isStart ? 'is-start' : 'is-cont'}${isEnd ? ' is-end' : ''}`;
                    return renderEventChip(ev, spanCls);
                }).join('');

                cells.push(`
                    <div class="cal-day-cell${isToday}">
                        <div class="cal-day-num">${d}</div>
                        <div class="cal-day-events">${chips}</div>
                    </div>
                `);
            }

            const prevDisabled = activeMonthIndex <= 0 ? 'disabled' : '';
            const nextDisabled = activeMonthIndex >= monthsWindow.length - 1 ? 'disabled' : '';

            gridContainer.innerHTML = `
                <div class="cal-monthly-wrapper" role="region" aria-label="Monthly Calendar Grid">
                    <div class="cal-monthly-nav">
                        <button type="button" class="cal-nav-btn" data-month-nav="-1" ${prevDisabled}>&larr; Prev</button>
                        <h2 class="cal-monthly-title">${MONTH_NAMES[ym.m - 1]} ${ym.y}</h2>
                        <button type="button" class="cal-nav-btn" data-month-nav="1" ${nextDisabled}>Next &rarr;</button>
                    </div>
                    <div class="cal-monthly-grid">
                        ${headers}
                        ${cells.join('')}
                    </div>
                </div>
                ${renderDetailBar(selectedEvent)}
            `;
        }

        function updateUI() {
            toolbar.querySelectorAll('[data-cal-view]').forEach(btn => {
                const active = btn.dataset.calView === currentView;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', String(active));
            });
            toolbar.querySelectorAll('[data-cal-scale]').forEach(btn => {
                const active = btn.dataset.calScale === currentScale;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', String(active));
            });

            if (currentView === 'grid') {
                gridContainer.hidden = false;
                listContainer.hidden = true;
                scaleGroup.hidden = false;
                if (currentScale === 'yearly') {
                    renderYearlyGrid();
                } else {
                    renderMonthlyGrid();
                }
            } else {
                gridContainer.hidden = true;
                listContainer.hidden = false;
                scaleGroup.hidden = true;
            }
        }

        toolbar.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('[data-cal-view]');
            if (viewBtn) {
                currentView = viewBtn.dataset.calView;
                localStorage.setItem(STORAGE_VIEW_KEY, currentView);
                updateUI();
                return;
            }
            const scaleBtn = e.target.closest('[data-cal-scale]');
            if (scaleBtn) {
                currentScale = scaleBtn.dataset.calScale;
                localStorage.setItem(STORAGE_SCALE_KEY, currentScale);
                updateUI();
            }
        });

        gridContainer.addEventListener('click', (e) => {
            const monthBtn = e.target.closest('[data-month-idx]');
            if (monthBtn) {
                activeMonthIndex = Number(monthBtn.dataset.monthIdx);
                currentScale = 'monthly';
                localStorage.setItem(STORAGE_SCALE_KEY, currentScale);
                updateUI();
                return;
            }
            const navBtn = e.target.closest('[data-month-nav]');
            if (navBtn) {
                const delta = Number(navBtn.dataset.monthNav);
                activeMonthIndex = Math.max(0, Math.min(monthsWindow.length - 1, activeMonthIndex + delta));
                updateUI();
                return;
            }
            const evBtn = e.target.closest('button[data-ev-idx]');
            if (evBtn) {
                selectedEvent = events[Number(evBtn.dataset.evIdx)] || null;
                updateUI();
            }
        });

        updateUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCalendarView);
    } else {
        initCalendarView();
    }
})();

