/**
 * Chart Fix for Overview Dashboard
 * This script fixes issues with chart loading in the dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Loading it now...');
        loadChartJS().then(() => {
            console.log('Chart.js loaded successfully');
            initializeCharts();
        }).catch(error => {
            console.error('Failed to load Chart.js:', error);
        });
    } else {
        console.log('Chart.js is already loaded');
        initializeCharts();
    }

    // Function to load Chart.js if it's not already loaded
    function loadChartJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Initialize all charts on the page
    function initializeCharts() {
        // Find all chart canvases
        const chartCanvases = document.querySelectorAll('canvas[id$="-chart"]');

        chartCanvases.forEach(canvas => {
            const widgetId = canvas.id.replace('-chart', '');
            const widgetType = document.getElementById(widgetId)?.getAttribute('data-type');

            if (widgetType) {
                refreshChart(widgetId, widgetType);
            }
        });
    }

    // Refresh a specific chart
    function refreshChart(widgetId, widgetType) {
        let url;
        let period = '6month';

        // Determine the API URL based on widget type
        switch (widgetType) {
            case 'jo-requestor-chart':
                url = '/joborder/chart-data/6month/';
                break;
            case 'jo-approver-chart':
                url = '/joborder/job-order-chart-data/6month/';
                break;
            case 'jo-maintenance-trends':
                url = '/joborder/api/get_job_order_trends/';
                break;
            case 'manhours-chart':
                url = '/manhours/chart-data/';
                break;
            case 'monitoring-chart':
                url = '/monitoring/chart-data/month/';
                period = 'month';
                break;
            case 'dcf-requestor-chart':
                url = '/dcf/api/requestor-chart-data/6month/';
                break;
            case 'dcf-approver-chart':
                url = '/dcf/api/approver-chart-data/6month/';
                break;
            default:
                console.warn(`Unknown chart widget type: ${widgetType}`);
                return;
        }

        // Fetch chart data and render
        fetchChartData(widgetId, url, period);
    }

    // Fetch chart data from API
    function fetchChartData(widgetId, url, period) {
        const chartCanvas = document.getElementById(`${widgetId}-chart`);
        if (!chartCanvas) return;

        let chartInstance = Chart.getChart(chartCanvas);

        // Destroy existing chart instance if it exists
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Show loading indicator
        const chartWrapper = chartCanvas.parentElement;
        const loadingHtml = `
            <div class="chart-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading chart data...</p>
            </div>
        `;

        // Keep the canvas but add loading indicator
        chartWrapper.innerHTML = loadingHtml;
        chartWrapper.appendChild(chartCanvas);

        // Build URL with period parameter if not included
        let fetchUrl = url;
        if (period && !url.includes(period)) {
            fetchUrl = url.includes('?')
                ? `${url}&period=${period}`
                : `${url}?period=${period}`;
        }

        // Fetch data from API
        fetch(fetchUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch chart data: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // Clear loading indicator
                Array.from(chartWrapper.querySelectorAll('.chart-loading')).forEach(el => el.remove());

                // For DCF charts, we need to handle multiple charts
                if (widgetId.includes('dcf-requestor') && data.status_distribution && data.monthly_trend) {
                    // Create a container for both charts
                    const chartsContainer = document.createElement('div');
                    chartsContainer.className = 'dcf-charts-container';

                    // Create pie chart container
                    const pieChartContainer = document.createElement('div');
                    pieChartContainer.className = 'dcf-pie-chart';
                    const pieCanvas = document.createElement('canvas');
                    pieCanvas.id = `${widgetId}-pie-chart`;
                    pieChartContainer.appendChild(pieCanvas);

                    // Create trend chart container
                    const trendChartContainer = document.createElement('div');
                    trendChartContainer.className = 'dcf-trend-chart';
                    const trendCanvas = document.createElement('canvas');
                    trendCanvas.id = `${widgetId}-trend-chart`;
                    trendChartContainer.appendChild(trendCanvas);

                    // Add both containers to the main container
                    chartsContainer.appendChild(pieChartContainer);
                    chartsContainer.appendChild(trendChartContainer);

                    // Replace the original canvas with our container
                    chartWrapper.innerHTML = '';
                    chartWrapper.appendChild(chartsContainer);

                    // Create pie chart
                    new Chart(pieCanvas, data.status_distribution);

                    // Create trend chart
                    new Chart(trendCanvas, data.monthly_trend);

                    // Add some styling
                    const style = document.createElement('style');
                    style.textContent = `
                        .dcf-charts-container {
                            display: flex;
                            flex-direction: column;
                            gap: 20px;
                            width: 100%;
                            height: 100%;
                        }
                        .dcf-pie-chart, .dcf-trend-chart {
                            flex: 1;
                            min-height: 200px;
                            position: relative;
                        }
                    `;
                    document.head.appendChild(style);
                }
                else if (widgetId.includes('dcf-approver') && data.approval_distribution && data.monthly_trend) {
                    // Create a container for both charts
                    const chartsContainer = document.createElement('div');
                    chartsContainer.className = 'dcf-charts-container';

                    // Create pie chart container
                    const pieChartContainer = document.createElement('div');
                    pieChartContainer.className = 'dcf-pie-chart';
                    const pieCanvas = document.createElement('canvas');
                    pieCanvas.id = `${widgetId}-pie-chart`;
                    pieChartContainer.appendChild(pieCanvas);

                    // Create trend chart container
                    const trendChartContainer = document.createElement('div');
                    trendChartContainer.className = 'dcf-trend-chart';
                    const trendCanvas = document.createElement('canvas');
                    trendCanvas.id = `${widgetId}-trend-chart`;
                    trendChartContainer.appendChild(trendCanvas);

                    // Add both containers to the main container
                    chartsContainer.appendChild(pieChartContainer);
                    chartsContainer.appendChild(trendChartContainer);

                    // Replace the original canvas with our container
                    chartWrapper.innerHTML = '';
                    chartWrapper.appendChild(chartsContainer);

                    // Create pie chart
                    new Chart(pieCanvas, data.approval_distribution);

                    // Create trend chart
                    new Chart(trendCanvas, data.monthly_trend);
                }
                else {
                    // Standard chart handling
                    // Create chart config based on data structure
                    const chartConfig = createChartConfig(data);

                    // Create chart
                    new Chart(chartCanvas, chartConfig);
                }
            })
            .catch(error => {
                console.error('Error fetching chart data:', error);
                chartWrapper.innerHTML = `
                    <div class="chart-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load chart data</p>
                        <small>${error.message}</small>
                    </div>
                `;
                chartWrapper.appendChild(chartCanvas);
            });
    }

    // Create chart configuration based on data
    function createChartConfig(data) {
        // Check if data already has a complete chart configuration
        if (data.type && data.data && data.options) {
            return data;
        }

        // Default configuration for bar chart
        const config = {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        };

        // Determine data structure and adapt config
        if (data.labels && data.datasets) {
            // Standard Chart.js format
            config.data = data;
        } else if (Array.isArray(data)) {
            // Array of objects
            // Extract labels from first object keys
            if (data.length > 0) {
                const keys = Object.keys(data[0]).filter(key => key !== 'date' && key !== 'label');
                config.data.labels = data.map(item => item.date || item.label);

                // Create datasets for each key
                keys.forEach((key, index) => {
                    config.data.datasets.push({
                        label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
                        data: data.map(item => item[key]),
                        backgroundColor: getChartColor(index),
                        borderColor: getChartColor(index, false),
                        borderWidth: 1
                    });
                });
            }
        } else if (data.status_distribution || data.approval_distribution) {
            // DCF chart data format
            if (data.status_distribution) {
                return data.status_distribution;
            } else if (data.approval_distribution) {
                return data.approval_distribution;
            }
        } else if (data.monthly_trend) {
            // DCF trend data format
            return data.monthly_trend;
        } else {
            // Object with series
            const keys = Object.keys(data).filter(key => key !== 'categories' && key !== 'labels');
            config.data.labels = data.categories || data.labels || [];

            // Create datasets for each key
            keys.forEach((key, index) => {
                config.data.datasets.push({
                    label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
                    data: data[key],
                    backgroundColor: getChartColor(index),
                    borderColor: getChartColor(index, false),
                    borderWidth: 1
                });
            });
        }

        // Determine chart type based on data
        if (config.data.datasets.length === 1) {
            config.type = 'bar';
        } else if (config.data.datasets.length > 3) {
            // Multiple datasets better as line chart
            config.type = 'line';
            config.data.datasets.forEach(dataset => {
                dataset.fill = false;
                dataset.tension = 0.3;
            });
        } else if (config.data.labels.length > 10) {
            // Many data points better as line chart
            config.type = 'line';
            config.data.datasets.forEach(dataset => {
                dataset.fill = false;
                dataset.tension = 0.3;
            });
        }

        return config;
    }

    // Get chart colors
    function getChartColor(index, isBackground = true) {
        const colors = [
            { bg: 'rgba(51, 102, 255, 0.6)', border: 'rgba(51, 102, 255, 1)' },
            { bg: 'rgba(72, 199, 116, 0.6)', border: 'rgba(72, 199, 116, 1)' },
            { bg: 'rgba(255, 193, 7, 0.6)', border: 'rgba(255, 193, 7, 1)' },
            { bg: 'rgba(241, 70, 104, 0.6)', border: 'rgba(241, 70, 104, 1)' },
            { bg: 'rgba(156, 39, 176, 0.6)', border: 'rgba(156, 39, 176, 1)' },
            { bg: 'rgba(0, 188, 212, 0.6)', border: 'rgba(0, 188, 212, 1)' }
        ];

        const colorIndex = index % colors.length;
        return isBackground ? colors[colorIndex].bg : colors[colorIndex].border;
    }
});
