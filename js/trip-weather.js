// Trip Weather Module (destination)
// Gemini: created 2025-12-30 - Fetches and displays weather data using Open-Meteo API
// Finds every .trip-weather on the page and hydrates it using Open-Meteo.

/**
 * Convert degrees to compass direction
 * @param {number} deg - Degrees (0-360)
 * @returns {string} Compass direction (N, NE, E, etc.)
 */
(function () {
    function degToCompass(deg) {
        if (deg == null || isNaN(deg)) return '—';
        const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return dirs[Math.round(deg / 22.5) % 16];
    }

    // Weather code to text mapping
    const codeText = {
        0: 'Clear',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Rime fog',
        51: 'Light drizzle',
        53: 'Drizzle',
        55: 'Heavy drizzle',
        61: 'Light rain',
        63: 'Rain',
        65: 'Heavy rain',
        71: 'Light snow',
        73: 'Snow',
        75: 'Heavy snow',
        80: 'Rain showers',
        81: 'Rain showers',
        82: 'Violent rain showers',
        95: 'Thunderstorm'
    };

    // Optional icon mapping (Open-Meteo icons)
    const iconMap = {
        0: 'https://open-meteo.com/images/weather-icons/clear-day.png',
        1: 'https://open-meteo.com/images/weather-icons/partly-cloudy-day.png',
        2: 'https://open-meteo.com/images/weather-icons/partly-cloudy-day.png',
        3: 'https://open-meteo.com/images/weather-icons/overcast.png',
        61: 'https://open-meteo.com/images/weather-icons/rain.png',
        63: 'https://open-meteo.com/images/weather-icons/rain.png',
        65: 'https://open-meteo.com/images/weather-icons/rain.png',
        71: 'https://open-meteo.com/images/weather-icons/snow.png',
        73: 'https://open-meteo.com/images/weather-icons/snow.png',
        75: 'https://open-meteo.com/images/weather-icons/snow.png',
        95: 'https://open-meteo.com/images/weather-icons/thunderstorm.png'
    };

    /**
     * Initialize a trip weather widget
     * @param {HTMLElement} root - The .trip-weather element
     */
    function initTripWeather(root) {
        if (!root) return;

        const lat = parseFloat(root.dataset.lat);
        const lon = parseFloat(root.dataset.lon);

        const $ = (sel) => root.querySelector(sel);

        const tempEl = $('.tw-temp');
        const summaryEl = $('.tw-summary');
        const windEl = $('.tw-wind');
        const humidityEl = $('.tw-humidity');
        const updatedEl = $('.tw-updated');
        const iconEl = $('.tw-icon');
        const errorEl = $('.tw-error');
        const locationEl = $('.tw-location');

        if (Number.isNaN(lat) || Number.isNaN(lon)) {
            if (errorEl) {
                errorEl.textContent = 'Missing or invalid coordinates.';
                errorEl.style.display = 'block';
            }
            return;
        }

        // If you don't manually set .tw-location text, fall back to coordinates.
        if (locationEl && (!locationEl.textContent || locationEl.textContent.trim() === '')) {
            locationEl.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }

        /**
         * Display error message
         * @param {string} msg - Error message to display
         */
        function showError(msg) {
            if (summaryEl) summaryEl.textContent = '—';
            if (tempEl) tempEl.textContent = '—';
            if (errorEl) {
                errorEl.textContent = msg;
                errorEl.style.display = 'block';
            }
        }

        /**
         * Load weather data from Open-Meteo API
         */
        async function load() {
            try {
                if (errorEl) {
                    errorEl.style.display = 'none';
                    errorEl.textContent = '';
                }

                // Open-Meteo: no API key required
                const url =
                    'https://api.open-meteo.com/v1/forecast' +
                    `?latitude=${encodeURIComponent(lat)}` +
                    `&longitude=${encodeURIComponent(lon)}` +
                    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code' +
                    '&temperature_unit=fahrenheit' +
                    '&wind_speed_unit=mph' +
                    '&timezone=auto';

                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) throw new Error('Weather request failed');
                const data = await res.json();

                const c = data.current;
                if (!c) throw new Error('No current weather available');

                const temp = c.temperature_2m;
                const humidity = c.relative_humidity_2m;
                const windSpeed = c.wind_speed_10m;
                const windDir = c.wind_direction_10m;
                const time = c.time;

                if (tempEl) tempEl.textContent = (temp != null ? Math.round(temp) + '°F' : '—');
                if (humidityEl) humidityEl.textContent = (humidity != null ? humidity + '%' : '—');
                if (windEl) windEl.textContent = (windSpeed != null ? `${Math.round(windSpeed)} mph ${degToCompass(windDir)}` : '—');
                if (updatedEl) updatedEl.textContent = time ? ('Updated: ' + new Date(time).toLocaleString()) : '—';

                const code = c.weather_code;
                if (summaryEl) summaryEl.textContent = codeText[code] ?? 'Current conditions';

                const iconUrl = iconMap[code];
                if (iconEl) {
                    if (iconUrl) {
                        iconEl.src = iconUrl;
                        iconEl.style.display = '';
                        iconEl.alt = summaryEl ? summaryEl.textContent : '';
                    } else {
                        iconEl.style.display = 'none';
                    }
                }
            } catch (e) {
                showError('Unable to load weather right now.');
                // eslint-disable-next-line no-console
                console.error(e);
            }
        }

        load();
    }

    /**
     * Initialize all trip weather widgets on the page
     */
    function boot() {
        document.querySelectorAll('.trip-weather').forEach(initTripWeather);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
