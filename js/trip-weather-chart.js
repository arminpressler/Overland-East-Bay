// Trip Weather Chart Module
// Gemini: created 2026-01-14 - Fetches and displays weather chart using Open-Meteo API and Chart.js
// Gemini: updated 2026-01-14 - Added support for forecast vs historical data based on trip dates
// Gemini: updated 2026-01-14 - Added precipitation_sum to chart

(function () {
    const chartId = 'tripWeatherChart';



    // Helper to format date YYYY-MM-DD
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    async function initChart() {
        // Support multiple charts on one page? Currently ID based 'tripWeatherChart'
        // Plan assumes one chart per page for "Expected Trip Weather"
        const ctx = document.getElementById(chartId);
        if (!ctx) return;

        const container = ctx.parentElement;
        const startDateStr = container.dataset.start;
        const endDateStr = container.dataset.end;

        // Dynamic coordinates
        const lat = parseFloat(container.dataset.lat);
        const lon = parseFloat(container.dataset.lon);

        if (!startDateStr || !endDateStr) {
            console.error('Trip weather chart: start/end dates missing');
            return;
        }

        if (isNaN(lat) || isNaN(lon)) {
            console.error('Trip weather chart: lat/lon coordinates missing or invalid');
            return;
        }

        const tripStart = new Date(startDateStr);
        const tripEnd = new Date(endDateStr);
        const now = new Date();

        // Determine if we should show FORECAST or HISTORICAL
        // Forecast is available up to 16 days ahead.
        // We add a buffer of 14 days to be safe.
        const forecastLimit = new Date();
        forecastLimit.setDate(now.getDate() + 14);

        let labels = [];
        let maxTemps = [];
        let minTemps = [];
        let precipitation = [];
        let titleText = '';
        let isHistorical = false;

        try {
            if (tripStart < forecastLimit) {
                titleText = 'Weather Forecast';
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${endDateStr}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&models=best_match`;

                const response = await fetch(url);
                if (!response.ok) throw new Error('Weather forecast fetch failed');
                const data = await response.json();
                if (!data.daily) throw new Error('No daily data available');

                labels = data.daily.time;
                maxTemps = data.daily.temperature_2m_max;
                minTemps = data.daily.temperature_2m_min;
                precipitation = data.daily.precipitation_sum;

            } else {
                isHistorical = true;
                titleText = 'Typical Weather (5-Year Average)';
                const yearsBack = 5;
                const promises = [];

                for (let i = 1; i <= yearsBack; i++) {
                    const hYear = tripStart.getFullYear() - i;
                    const hStart = new Date(tripStart); hStart.setFullYear(hYear);
                    const hEnd = new Date(tripEnd); hEnd.setFullYear(hYear);
                    const startStr = formatDate(hStart);
                    const endStr = formatDate(hEnd);

                    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
                    promises.push(fetch(url).then(r => r.json()));
                }

                const results = await Promise.all(promises);
                if (results.length === 0 || !results[0].daily) throw new Error('No historical data available');

                // Aggregate data (Calculate Mean)
                const numDays = results[0].daily.time.length;
                const sumMax = new Array(numDays).fill(0);
                const sumMin = new Array(numDays).fill(0);
                const sumPrecip = new Array(numDays).fill(0);
                let validYears = 0;

                results.forEach(res => {
                    if (!res.daily) return;
                    validYears++;
                    res.daily.temperature_2m_max.forEach((v, idx) => sumMax[idx] += (v || 0));
                    res.daily.temperature_2m_min.forEach((v, idx) => sumMin[idx] += (v || 0));
                    res.daily.precipitation_sum.forEach((v, idx) => sumPrecip[idx] += (v || 0));
                });

                if (validYears === 0) throw new Error('No valid historical data found');

                maxTemps = sumMax.map(v => v / validYears);
                minTemps = sumMin.map(v => v / validYears);
                precipitation = sumPrecip.map(v => v / validYears);

                // Generate Labels (Dates for the Actual Trip)
                labels = [];
                let d = new Date(tripStart);
                // Adjust for timezone offset to ensure correct calculation? 
                // Simple loop is safer given we have start/end string
                // Using UTC handling or simple string manipulation from startStr is often safer to avoid TZ bugs.
                // But here we need valid strings. Let's use the input string and increment.
                // Actually, just looping numDays is robust enough.
                const currDate = new Date(tripStart);
                // Ensuring we just output YYYY-MM-DD
                for (let i = 0; i < numDays; i++) {
                    labels.push(formatDate(currDate));
                    currDate.setDate(currDate.getDate() + 1);
                }
            }

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Max Temp (°F)',
                            data: maxTemps,
                            type: 'line',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Min Temp (°F)',
                            data: minTemps,
                            type: 'line',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Precipitation (in)',
                            data: precipitation,
                            type: 'bar',
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: titleText
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: (context) => {
                                    return new Date(context[0].label).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
                                }
                            }
                        },
                        subtitle: {
                            display: isHistorical,
                            text: 'Showing historical data as a reference for expected conditions.'
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Temperature (°F)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Precipitation (in)'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                            beginAtZero: true
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading weather chart:', error);
            const errorContainer = ctx.parentElement;
            errorContainer.innerHTML = '<p style="text-align:center; color: #666;">Unable to load weather chart at this time.</p>';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChart);
    } else {
        initChart();
    }
})();
