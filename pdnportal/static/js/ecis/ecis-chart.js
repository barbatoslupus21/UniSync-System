/**
 * ECIS Registry - Chart JavaScript
 * Handles the Monthly ECIS Submissions chart
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the chart
    initEcisChart();

    // Add event listener for period selector
    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', function() {
            updateChartData(this.value);
        });
    }
});

// Chart instance
let ecisChart = null;

// Custom plugin for 3D gradient background
const gradientBackgroundPlugin = {
    id: 'gradientBackground',
    beforeDraw: (chart) => {
        const ctx = chart.canvas.getContext('2d');
        const chartArea = chart.chartArea;

        if (!chartArea) return;

        // Create gradient
        const gradient = ctx.createLinearGradient(
            0, chartArea.bottom, 0, chartArea.top
        );

        gradient.addColorStop(0, 'rgba(51, 102, 255, 0.05)');
        gradient.addColorStop(1, 'rgba(92, 136, 196, 0.1)');

        // Fill background
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(
            chartArea.left,
            chartArea.top,
            chartArea.right - chartArea.left,
            chartArea.bottom - chartArea.top
        );
        ctx.restore();
    }
};

// Initialize the ECIS chart
function initEcisChart() {
    const chartCanvas = document.getElementById('ecis-stats-chart');
    if (!chartCanvas) return;

    // Show loading indicator
    const chartWrapper = document.querySelector('.ecis-chart-wrapper');
    if (chartWrapper) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'ecis-chart-loading';
        loadingIndicator.innerHTML = `
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Loading chart data...</p>
        `;
        chartWrapper.appendChild(loadingIndicator);
    }

    // Get the chart context
    const ctx = chartCanvas.getContext('2d');

    // Register the gradient background plugin
    Chart.register(gradientBackgroundPlugin);

    // Create the chart with initial data
    ecisChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Approved',
                    data: [],
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.5)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#4caf50',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#4caf50',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round',
                    cubicInterpolationMode: 'monotone'
                },
                {
                    label: 'On Hold',
                    data: [],
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.5)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#ff9800',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#ff9800',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round',
                    cubicInterpolationMode: 'monotone'
                },
                {
                    label: 'For Review',
                    data: [],
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.5)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#2196f3',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#2196f3',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round',
                    cubicInterpolationMode: 'monotone'
                },
                {
                    label: 'Needs Revision',
                    data: [],
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.3)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#ff9800',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#ff9800',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round',
                    cubicInterpolationMode: 'monotone'
                },
                {
                    label: 'Canceled',
                    data: [],
                    borderColor: '#f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.5)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#f44336',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#f44336',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round',
                    cubicInterpolationMode: 'monotone'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                gradientBackground: false, // Disable the custom background plugin
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 10,
                        font: {
                            size: 11
                        },
                        boxWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#333',
                    bodyColor: '#333',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    padding: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    },
                    borderRadius: 4
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        padding: 5
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        lineWidth: 1
                    },
                    ticks: {
                        precision: 0,
                        stepSize: 1,
                        font: {
                            size: 11
                        },
                        padding: 5
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            elements: {
                line: {
                    tension: 0.4,
                    borderWidth: 2,
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round',
                    capBezierPoints: true
                },
                point: {
                    radius: 4,
                    hoverRadius: 6,
                    borderWidth: 1,
                    hoverBorderWidth: 2
                }
            },
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            }
        }
    });

    // Apply 3D effect to the chart
    add3DEffect(ecisChart);

    // Load initial data (6 months by default)
    updateChartData('6month');
}

// Update chart data based on selected period
function updateChartData(period) {
    // Show loading indicator
    const chartWrapper = document.querySelector('.ecis-chart-wrapper');
    const existingLoader = document.querySelector('.ecis-chart-loading');

    if (!existingLoader && chartWrapper) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'ecis-chart-loading';
        loadingIndicator.innerHTML = `
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Loading chart data...</p>
        `;
        chartWrapper.appendChild(loadingIndicator);
    }

    // Fetch data from the API
    console.log(`Fetching chart data for period: ${period}`);

    // Check if we're on the requestor page
    const isRequestorPage = window.location.pathname.includes('/ecis/requestor') ||
                           window.location.pathname === '/ecis/' ||
                           window.location.pathname === '/ecis';

    // Use different endpoint for requestor page
    const apiUrl = isRequestorPage
        ? `/ecis/api/requestor-chart-data/?period=${period}`
        : `/ecis/api/chart-data/?period=${period}`;
    console.log(`API URL: ${apiUrl}`);

    fetch(apiUrl)
        .then(response => {
            console.log('API Response status:', response.status);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API Response data:', data);

            // Get the chart context
            const ctx = document.getElementById('ecis-stats-chart').getContext('2d');

            // Update chart data
            console.log('Setting chart labels:', data.labels);
            ecisChart.data.labels = data.labels;

            // Update datasets with the data from the API
            if (data.datasets && data.datasets.length > 0) {
                console.log('Updating datasets with API data');
                // Update each dataset
                data.datasets.forEach((dataset, index) => {
                    console.log(`Dataset ${index}:`, dataset);
                    if (index < ecisChart.data.datasets.length) {
                        ecisChart.data.datasets[index].data = dataset.data;
                    }
                });
            } else {
                console.warn('No datasets found in API response, trying alternative format');

                // Try alternative format (single values array)
                if (data.values && Array.isArray(data.values)) {
                    console.log('Found values array:', data.values);
                    ecisChart.data.datasets[0].data = data.values;
                } else {
                    console.error('Could not find any valid data in the API response');
                }
            }

            // Find the maximum value across all datasets for y-axis scaling
            let maxValue = 1; // Default minimum
            ecisChart.data.datasets.forEach(dataset => {
                if (dataset.data && dataset.data.length > 0) {
                    const datasetMax = Math.max(...dataset.data);
                    if (datasetMax > maxValue) {
                        maxValue = datasetMax;
                    }
                }
            });

            // Update y-axis to ensure it shows whole numbers
            ecisChart.options.scales.y.max = maxValue + 1;

            // Update the chart
            ecisChart.update();

            // Re-apply 3D effect after update
            add3DEffect(ecisChart);

            // Remove loading indicator
            const loader = document.querySelector('.ecis-chart-loading');
            if (loader && loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);
            console.error('Error details:', error.message);

            // Show error message
            const chartCanvas = document.getElementById('ecis-stats-chart');
            if (chartCanvas) {
                const ctx = chartCanvas.getContext('2d');
                ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                ctx.font = '14px Arial';
                ctx.fillStyle = '#f44336';
                ctx.textAlign = 'center';
                ctx.fillText(`Error loading chart data: ${error.message}`, chartCanvas.width / 2, chartCanvas.height / 2);

                // Add more detailed error message
                ctx.font = '12px Arial';
                ctx.fillText('Check browser console for details', chartCanvas.width / 2, chartCanvas.height / 2 + 20);
            }

            // Remove loading indicator
            const loader = document.querySelector('.ecis-chart-loading');
            if (loader && loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }

            // Show toast notification if available
            if (typeof createToast === 'function') {
                createToast(`Failed to load chart data: ${error.message}`, 'error', 5000);
            } else {
                alert(`Failed to load chart data: ${error.message}`);
            }
        });
}

// Add subtle effects to the chart (no shadows or 3D effects)
function add3DEffect(chart) {
    // This function is kept for compatibility but doesn't add 3D effects anymore
    // as per the new design requirements
    return;
}
