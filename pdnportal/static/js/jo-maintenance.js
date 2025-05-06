document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    initializeUI();
    
    // Initialize charts with auto-refresh
    initializeCharts();
    
    // Set up event listeners
    setupEventListeners();
});

function initializeUI() {
    // Add necessary styles
    addChartStyles();
    addChartInteractionStyles();
    addToastStyles();
    
    // Initialize animations for stats cards
    animateStatsCards();
    
    // Initialize modals
    const modals = document.querySelectorAll('.JO-modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('active');
    });
    
    // Setup table search functionality
    setupTableSearch();
}

function initializeCharts() {
    // Initialize trends chart
    initMaintenanceTrendsChart();
    
    // Initialize deadlines chart
    initUpcomingDeadlinesChart();
    
    // Auto-refresh charts every 5 minutes
    setInterval(function() {
        fetchTrendsData(document.getElementById('chart-period-selector').value);
        fetchDeadlinesData();
        
        createToast('Charts refreshed', 'info', 2000);
    }, 5 * 60 * 1000); // 5 minutes
}

function setupEventListeners() {
    // View details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            fetchJobOrderDetails(this.dataset.id, this.dataset.number);
        });
    });
    
    // Set target date buttons
    document.querySelectorAll('.set-target-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openSetTargetModal(this.dataset.id, this.dataset.number);
        });
    });
    
    // Complete JO buttons
    document.querySelectorAll('.complete-jo-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openCompleteJOModal(this.dataset.id, this.dataset.number);
        });
    });
    
    // Close modal buttons
    document.querySelectorAll('.JO-modal-close, .close-details-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            closeAllModals();
        });
    });
    
    // Target date input events
    const targetDateInput = document.getElementById('target-date-input');
    if (targetDateInput) {
        targetDateInput.addEventListener('change', validateTargetDate);
    }
    
    // Cancel target date button
    const cancelTargetBtn = document.getElementById('cancel-target-btn');
    if (cancelTargetBtn) {
        cancelTargetBtn.addEventListener('click', function() {
            closeModal(document.getElementById('set-target-modal'));
        });
    }
    
    // Save target date button
    const saveTargetBtn = document.getElementById('save-target-btn');
    if (saveTargetBtn) {
        saveTargetBtn.addEventListener('click', processSetTargetDate);
    }
    
    // Cancel complete button
    const cancelCompleteBtn = document.getElementById('cancel-complete-btn');
    if (cancelCompleteBtn) {
        cancelCompleteBtn.addEventListener('click', function() {
            closeModal(document.getElementById('complete-jo-modal'));
        });
    }
    
    // Complete job order button
    const confirmCompleteBtn = document.getElementById('confirm-complete-btn');
    if (confirmCompleteBtn) {
        confirmCompleteBtn.addEventListener('click', function() {
            const form = document.getElementById('complete-job-form');
            const actionTakenInput = document.getElementById('action-taken-input');
            
            // Validate inputs
            if (!actionTakenInput.value.trim()) {
                createToast('Please describe the action taken', 'error');
                return;
            }
            
            // Show loading state
            this.classList.add('loading');
            this.textContent = '';
            
            // Submit the form using FormData
            const formData = new FormData(form);
            
            // Use a hardcoded URL since the form action isn't resolving correctly
            const submitUrl = '/joborder/complete-request/';
            
            fetch(submitUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken()
                }
            })
            .then(response => {
                console.log('Response status:', response.status);
                
                // Try to parse JSON response even if status is not OK
                return response.json().catch(() => {
                    // If JSON parsing fails, return an error object
                    return {
                        status: 'error',
                        message: `Server responded with status ${response.status}: ${response.statusText}`
                    };
                });
            })
            .then(data => {
                if (data.status === 'success') {
                    // Update the UI
                    const joId = document.getElementById('hidden-job-id').value;
                    const row = document.querySelector(`[data-id="${joId}"].complete-jo-btn`)?.closest('tr');
                    
                    if (row) {
                        // Update status to "Completed"
                        const statusCell = row.querySelector('[data-label="Status"] span');
                        statusCell.textContent = 'Completed';
                        statusCell.className = 'JO-status JO-status-completed';
                        
                        // Remove complete button
                        const btnCell = row.querySelector('[data-label="Actions"]');
                        btnCell.innerHTML = `
                            <button class="JO-icon-button view-details-btn" title="View Details" data-id="${joId}" data-number="${row.querySelector('[data-label="JO Number"]').textContent}">
                                <i class="fas fa-eye"></i>
                            </button>
                        `;
                        
                        // Reattach event listener
                        row.querySelector('.view-details-btn').addEventListener('click', function() {
                            fetchJobOrderDetails(this.dataset.id, this.dataset.number);
                        });
                    }
                    
                    // Close modal and show success message
                    closeModal(document.getElementById('complete-jo-modal'));
                    createToast('Job order successfully marked as complete', 'success');
                    
                    // Update stats
                    updateCompletionStats();
                } else {
                    // Display error message in toast
                    createToast(data.message || 'Failed to complete job order', 'error');
                }
            })
            .catch(error => {
                console.error('Error completing job order:', error);
                // Display the error message in toast
                createToast('Failed to complete job order: ' + error.message, 'error');
            })
            .finally(() => {
                this.classList.remove('loading');
                this.textContent = 'Mark as Complete';
            });
        });
    }
    
    // Close modals when clicking outside or pressing ESC
    setupModalCloseEvents();
}

// Setup modal close events
function setupModalCloseEvents() {
    const modals = document.querySelectorAll('.JO-modal');
    
    // Close modals when clicking outside of modal content
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });
    
    // Make sure ESC key closes modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Setup table search and filters
function setupTableSearch() {
    // Table search functionality
    const searchInput = document.querySelector('.JO-search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const searchValue = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('.JO-table tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchValue)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Category filter
    const categoryFilter = document.querySelector('.JO-priority-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            const filterValue = this.value;
            const tableRows = document.querySelectorAll('.JO-table tbody tr');
            
            tableRows.forEach(row => {
                if (filterValue === 'all') {
                    row.style.display = '';
                } else {
                    const categoryCell = row.querySelector('[data-label="Category"] .JO-category-pill');
                    if (categoryCell && categoryCell.classList.contains(`JO-category-${filterValue}`)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        });
    }
}

// Function to initialize the maintenance trends chart
function initMaintenanceTrendsChart() {
    const trendsCtx = document.getElementById('maintenance-trends-chart');
    
    if (!trendsCtx) {
        console.error('Chart canvas element not found: maintenance-trends-chart');
        return;
    }
    
    console.log('Found chart element:', trendsCtx);
    
    // Fetch initial data with default period (month)
    fetchTrendsData('month');
    
    // Set up the period selector event listener
    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', function() {
            fetchTrendsData(this.value);
        });
    }
    
    // Add small indicator that charts auto-refresh
    addAutoRefreshIndicator(trendsCtx);
}

// Function to initialize the upcoming deadlines chart
function initUpcomingDeadlinesChart() {
    const deadlinesCtx = document.getElementById('upcoming-deadlines-chart');
    
    if (!deadlinesCtx) {
        console.error('Chart canvas element not found: upcoming-deadlines-chart');
        return;
    }
    
    // Fetch deadlines data
    fetchDeadlinesData();
    
    // Add auto-refresh indicator
    addAutoRefreshIndicator(deadlinesCtx);
}

// Add a small indicator that shows charts auto-refresh
function addAutoRefreshIndicator(chartElement) {
    const container = chartElement.parentElement;
    
    // Create indicator if it doesn't exist
    if (!container.querySelector('.chart-refresh-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'chart-refresh-indicator';
        indicator.innerHTML = '<i class="fas fa-sync-alt"></i> Auto-refreshes every 5 minutes';
        indicator.style.position = 'absolute';
        indicator.style.bottom = '5px';
        indicator.style.right = '10px';
        indicator.style.fontSize = '0.7rem';
        indicator.style.color = 'rgba(102, 102, 102, 0.7)';
        indicator.style.padding = '3px 6px';
        
        // Make container position relative if it's not already
        if (window.getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        
        container.appendChild(indicator);
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes indicator-pulse {
                0% { opacity: 0.7; }
                50% { opacity: 0.4; }
                100% { opacity: 0.7; }
            }
            
            .chart-refresh-indicator {
                animation: indicator-pulse 2s infinite;
            }
            
            .chart-refresh-indicator i {
                margin-right: 3px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Function to fetch trends data from the server
function fetchTrendsData(period) {
    // Show loading state on the chart
    const chartContainer = document.querySelector('.JO-chart-container .JO-chart-wrapper');
    if (chartContainer) {
        chartContainer.classList.add('loading');
        
        // Add a spinner if not already present
        if (!chartContainer.querySelector('.chart-loading-spinner')) {
            const loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'chart-loading-spinner';
            loadingSpinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            chartContainer.appendChild(loadingSpinner);
        }
    }
    
    // Fetch data from server
    fetch(`/joborder/api/get_job_order_trends/?period=${period}&timestamp=${Date.now()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            renderTrendsChart(data);
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);
            createToast('Failed to load chart data. Please try again.', 'error');
        })
        .finally(() => {
            // Remove loading state from the specific container
            if (chartContainer) {
                chartContainer.classList.remove('loading');
                const spinner = chartContainer.querySelector('.chart-loading-spinner');
                if (spinner) spinner.remove();
            }
        });
}

// Function to render the trends chart with fetched data
function renderTrendsChart(data) {
    const trendsCtx = document.getElementById('maintenance-trends-chart');
    
    // Destroy existing chart if it exists
    if (window.maintenanceTrendsChart) {
        window.maintenanceTrendsChart.destroy();
    }
    
    // Log the data to debug
    console.log("Chart data:", data);
    
    // Adjust data for the line chart
    const chartData = {
        labels: data.labels,
        datasets: [
            {
                label: 'Completed',
                data: data.datasets[1].data,
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderColor: '#4caf50',
                tension: 0.4,
                fill: true,
                borderDash: [5, 5]
            },
            {
                label: 'Processing',
                data: data.datasets[0].data.map((value, index) => {
                    // Calculate pending orders (new - completed)
                    return Math.max(0, value - data.datasets[1].data[index]);
                }),
                borderColor: '#3366ff',
                backgroundColor: 'rgba(51, 102, 255, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    };
    
    // Create new chart
    window.maintenanceTrendsChart = new Chart(trendsCtx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: "'Poppins', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: '#e6e6e6',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    titleFont: {
                        family: "'Poppins', sans-serif",
                        weight: 600
                    },
                    bodyFont: {
                        family: "'Poppins', sans-serif"
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(230, 230, 230, 0.5)'
                    },
                    ticks: {
                        font: {
                            family: "'Poppins', sans-serif"
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(230, 230, 230, 0.5)'
                    },
                    ticks: {
                        precision: 0,
                        font: {
                            family: "'Poppins', sans-serif"
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Apply a fade-in animation to the specific chart container
    const chartWrapper = document.querySelector('.JO-chart-container .JO-chart-wrapper');
    if (chartWrapper) {
        chartWrapper.style.opacity = 0;
        chartWrapper.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            chartWrapper.style.opacity = 1;
        }, 100);
    }
}

// Function to fetch deadlines data from the server
function fetchDeadlinesData() {
    // Show loading state
    const chartContainer = document.querySelector('.JO-chart-wrapper');
    if (chartContainer) {
        chartContainer.classList.add('loading');
        
        // Add loading spinner if not already present
        if (!chartContainer.querySelector('.chart-loading-spinner')) {
            const loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'chart-loading-spinner';
            loadingSpinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            chartContainer.appendChild(loadingSpinner);
        }
    }
    
    console.log('Fetching upcoming deadlines data');
    
    // Fetch data from server with cache-busting timestamp
    fetch(`/joborder/maintenance/get_upcoming_deadlines/?timestamp=${Date.now()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received deadlines data:', data);
            
            // Check if we have valid data
            if (!data.labels || !data.datasets || data.labels.length === 0) {
                console.warn('Received empty or invalid deadlines data');
                createToast('No deadline data available', 'warning');
                
                // Create empty chart to avoid errors
                renderEmptyDeadlinesChart();
                return;
            }
            
            renderDeadlinesChart(data);
        })
        .catch(error => {
            console.error('Error fetching deadlines chart data:', error);
            createToast('Failed to load deadlines data. Please try again.', 'error');
            
            // Create empty chart to avoid errors
            renderEmptyDeadlinesChart();
        })
        .finally(() => {
            // Remove loading state
            if (chartContainer) {
                chartContainer.classList.remove('loading');
                const spinner = chartContainer.querySelector('.chart-loading-spinner');
                if (spinner) spinner.remove();
            }
        });
}

// Function to render the deadlines chart with fetched data
function renderDeadlinesChart(data) {
    const deadlinesCtx = document.getElementById('upcoming-deadlines-chart');
    
    // Destroy existing chart if it exists
    if (window.deadlinesChart) {
        window.deadlinesChart.destroy();
    }
    
    // Create new chart
    window.deadlinesChart = new Chart(deadlinesCtx, {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y',  // Make it a horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: '#e6e6e6',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: false,
                    titleFont: {
                        family: "'Poppins', sans-serif",
                        weight: 600
                    },
                    bodyFont: {
                        family: "'Poppins', sans-serif"
                    },
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `${value} job order${value !== 1 ? 's' : ''}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        font: {
                            family: "'Poppins', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(230, 230, 230, 0.5)'
                    }
                },
                y: {
                    ticks: {
                        font: {
                            family: "'Poppins', sans-serif"
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                delay: (context) => context.dataIndex * 100,
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Add hover interaction to highlight bars
    addDeadlinesChartInteraction();
}

// Function to render an empty chart when no data is available
function renderEmptyDeadlinesChart() {
    const deadlinesCtx = document.getElementById('upcoming-deadlines-chart');
    
    // Destroy existing chart if it exists
    if (window.deadlinesChart) {
        window.deadlinesChart.destroy();
    }
    
    // Create placeholder chart
    window.deadlinesChart = new Chart(deadlinesCtx, {
        type: 'bar',
        data: {
            labels: ['No Deadlines'],
            datasets: [{
                label: 'No Data',
                data: [0],
                backgroundColor: 'rgba(200, 200, 200, 0.3)',
                borderColor: 'rgba(200, 200, 200, 0.5)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function() {
                            return 'No upcoming deadlines';
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 1
                }
            }
        }
    });
    
    // Add a message in the chart area
    const chartWrapper = document.querySelector('.JO-chart-wrapper');
    if (chartWrapper) {
        const noDataMsg = document.createElement('div');
        noDataMsg.className = 'chart-no-data-message';
        noDataMsg.innerHTML = '<p>No upcoming deadlines</p>';
        noDataMsg.style.position = 'absolute';
        noDataMsg.style.top = '50%';
        noDataMsg.style.left = '50%';
        noDataMsg.style.transform = 'translate(-50%, -50%)';
        noDataMsg.style.textAlign = 'center';
        noDataMsg.style.color = '#999';
        noDataMsg.style.width = '100%';
        
        // Remove any existing message
        const existingMsg = chartWrapper.querySelector('.chart-no-data-message');
        if (existingMsg) existingMsg.remove();
        
        chartWrapper.appendChild(noDataMsg);
    }
}

// Function to add extra interaction to the deadlines chart
function addDeadlinesChartInteraction() {
    const canvas = document.getElementById('upcoming-deadlines-chart');
    if (!canvas) return;
    
    // Add hover class to change cursor
    canvas.classList.add('interactive-chart');
    
    // Add click handler to show toast with more info
    canvas.addEventListener('click', function(evt) {
        const activePoints = window.deadlinesChart.getElementsAtEventForMode(
            evt, 
            'nearest', 
            { intersect: true }, 
            false
        );
        
        if (activePoints.length > 0) {
            const clickedIndex = activePoints[0].index;
            const label = window.deadlinesChart.data.labels[clickedIndex];
            const value = window.deadlinesChart.data.datasets[0].data[clickedIndex];
            
            let message = '';
            switch(label) {
                case 'Overdue':
                    message = `${value} job order${value !== 1 ? 's are' : ' is'} overdue! Urgent attention required.`;
                    break;
                case 'Today':
                    message = `${value} job order${value !== 1 ? 's' : ''} due today.`;
                    break;
                case 'Tomorrow':
                    message = `${value} job order${value !== 1 ? 's' : ''} due tomorrow.`;
                    break;
                case 'This Week':
                    message = `${value} job order${value !== 1 ? 's' : ''} due this week.`;
                    break;
                case 'Next Week':
                    message = `${value} job order${value !== 1 ? 's' : ''} due next week.`;
                    break;
                case 'Later':
                    message = `${value} job order${value !== 1 ? 's' : ''} due later.`;
                    break;
                default:
                    message = `${value} job order${value !== 1 ? 's' : ''}: ${label}`;
            }
            
            createToast(message, 'info');
        }
    });
}

// Function to open the Set Target Date modal
function openSetTargetModal(joId, joNumber) {
    const modal = document.getElementById('set-target-modal');
    if (!modal) {
        console.error('Modal element not found!');
        return;
    }
    
    // Set modal data
    document.getElementById('target-jo-number').textContent = joNumber;
    document.getElementById('target-submission-date').textContent = 'Apr 15, 2025';
    document.getElementById('hidden-target-job-id').value = joId;

    // Find category from table row using standard DOM methods
    let category = 'Green'; // Default fallback
    let categoryClass = 'JO-category-green'; // Default fallback
    
    // Find the row by iterating through all rows and checking the JO Number
    const rows = document.querySelectorAll('.JO-table tbody tr');
    let row = null;
    
    rows.forEach(r => {
        const joNumberCell = r.querySelector('td[data-label="JO Number"]');
        if (joNumberCell && joNumberCell.textContent.trim() === joNumber) {
            row = r;
        }
    });
    
    if (row) {
        const categoryElem = row.querySelector('.JO-category-pill');
        if (categoryElem) {
            category = categoryElem.textContent.trim();
            categoryClass = categoryElem.classList[1];
        }
    } else {
        console.warn(`Row for JO Number ${joNumber} not found, using default values`);
    }
    
    // Update category display
    const categoryDisplay = document.getElementById('target-jo-category');
    if (categoryDisplay) {
        categoryDisplay.textContent = category;
        categoryDisplay.className = 'JO-category-pill ' + categoryClass;
    } else {
        console.error('Category display element not found!');
    }
    
    // Store category data for validation
    modal.dataset.category = category.toLowerCase();
    modal.dataset.joId = joId;
    
    // Set min date to today
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    const targetDateInput = document.getElementById('target-date-input');
    if (targetDateInput) {
        targetDateInput.min = todayFormatted;
        targetDateInput.value = '';
    }
    
    // Reset form
    const delayReasonInput = document.getElementById('delay-reason-input');
    const delayReasonContainer = document.getElementById('delay-reason-container');
    
    if (delayReasonInput) delayReasonInput.value = '';
    if (delayReasonContainer) delayReasonContainer.style.display = 'none';
    
    // Show guidance message based on category
    updateDateGuidance(category.toLowerCase());
    
    // Open modal
    openModal(modal);
    console.log('Set Target Modal opened for', joNumber);
}

// Function to update date guidance based on category
function updateDateGuidance(category) {
    const guidanceElem = document.querySelector('.JO-date-guidance');
    if (!guidanceElem) return;
    
    if (category === 'orange') {
        guidanceElem.textContent = 'For Orange category, target date more than 1 week from creation requires justification.';
        guidanceElem.classList.add('JO-date-warning');
    } else {
        guidanceElem.textContent = 'For Green, Yellow, and White categories, target date more than 1 month from creation requires justification.';
        guidanceElem.classList.remove('JO-date-warning');
    }
}

// Function to validate target date
function validateTargetDate() {
    const targetDateInput = document.getElementById('target-date-input');
    const delayReasonContainer = document.getElementById('delay-reason-container');
    const modal = document.getElementById('set-target-modal');
    const category = modal.dataset.category;
    
    if (!targetDateInput.value) return;
    
    const targetDate = new Date(targetDateInput.value);
    const today = new Date();
    const creationDate = new Date('2025-04-16'); // Example creation date, would come from server
    
    const diffTime = Math.abs(targetDate - creationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (category === 'orange' && diffDays > 7) {
        delayReasonContainer.style.display = 'block';
    } else if (category !== 'orange' && diffDays > 30) {
        delayReasonContainer.style.display = 'block';
    } else {
        delayReasonContainer.style.display = 'none';
    }
}

// Function to process setting target date
function processSetTargetDate() {
    const form = document.getElementById('target-date-form');
    const targetDateInput = document.getElementById('target-date-input');
    const delayReasonInput = document.getElementById('delay-reason-input');
    
    // Validate inputs
    if (!targetDateInput.value) {
        createToast('Please select a target date', 'error');
        return;
    }
    
    // Get job ID and category from hidden field and dataset
    const joId = document.getElementById('hidden-target-job-id').value;
    const modal = document.getElementById('set-target-modal');
    const category = modal.dataset.category;
    
    // Rest of your validation code
    
    // Show loading state
    const saveButton = document.getElementById('save-target-btn');
    saveButton.classList.add('loading');
    saveButton.textContent = '';
    
    // Submit the form using FormData
    const formData = new FormData(form);
    
    // Send AJAX request
    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        
        // Try to parse JSON response even if status is not OK
        return response.json().catch(() => {
            // If JSON parsing fails, return an error object
            return {
                status: 'error',
                message: `Server responded with status ${response.status}: ${response.statusText}`
            };
        });
    })
    .then(data => {
        if (data.status === 'success') {
            // Update the UI
            const row = document.querySelector(`[data-id="${joId}"].set-target-btn`).closest('tr');
            const dateCell = row.querySelector('[data-label="Target Date"] span');
            dateCell.textContent = data.target_date;
            dateCell.className = 'jo-target-date';
            
            // Change the button from "Set Target Date" to "Mark as Complete"
            const btnCell = row.querySelector('[data-label="Actions"]');
            btnCell.innerHTML = `
                <button class="JO-icon-button view-details-btn" title="View Details" data-id="${joId}" data-number="${row.querySelector('[data-label="JO Number"]').textContent}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="JO-icon-button complete-jo-btn" title="Mark as Complete" data-id="${joId}" data-number="${row.querySelector('[data-label="JO Number"]').textContent}">
                    <i class="fas fa-check"></i>
                </button>
            `;
            
            // Update status to "In Progress"
            const statusCell = row.querySelector('[data-label="Status"] span');
            statusCell.textContent = 'In Progress';
            statusCell.className = 'JO-status JO-status-approved';
            
            // Reattach event listeners
            row.querySelector('.view-details-btn').addEventListener('click', function() {
                fetchJobOrderDetails(this.dataset.id, this.dataset.number);
            });
            
            row.querySelector('.complete-jo-btn').addEventListener('click', function() {
                openCompleteJOModal(this.dataset.id, this.dataset.number);
            });
            
            // Close modal and show success message
            closeModal(modal);
            createToast(data.message || 'Target date successfully set', 'success');
        } else {
            // Display error message in toast
            createToast(data.message || 'Failed to set target date', 'error');
        }
    })
    .catch(error => {
        console.error('Error setting target date:', error);
        // Display the error message in toast
        createToast('Failed to set target date: ' + error.message, 'error');
    })
    .finally(() => {
        saveButton.classList.remove('loading');
        saveButton.textContent = 'Save Target Date';
    });
}

// Function to open the Complete JO modal
function openCompleteJOModal(joId, joNumber) {
    const modal = document.getElementById('complete-jo-modal');
    if (!modal) {
        console.error('Complete JO modal element not found!');
        return;
    }
    
    // Set modal data
    document.getElementById('complete-jo-number').textContent = joNumber;
    
    // Set the hidden job id field
    document.getElementById('hidden-job-id').value = joId;
    
    // Find details from table row
    let category = 'Green'; // Default fallback
    let categoryClass = 'JO-category-green'; // Default fallback
    let targetDate = 'Apr 25, 2025'; // Default fallback
    
    // Find the row by iterating through all rows and checking the JO Number
    const rows = document.querySelectorAll('.JO-table tbody tr');
    let row = null;
    
    rows.forEach(r => {
        const joNumberCell = r.querySelector('td[data-label="JO Number"]');
        if (joNumberCell && joNumberCell.textContent.trim() === joNumber) {
            row = r;
        }
    });
    
    if (row) {
        const categoryElem = row.querySelector('.JO-category-pill');
        if (categoryElem) {
            category = categoryElem.textContent.trim();
            categoryClass = categoryElem.classList[1];
        }
        
        const targetDateElem = row.querySelector('[data-label="Target Date"] span');
        if (targetDateElem) {
            targetDate = targetDateElem.textContent.trim();
        }
    } else {
        console.warn(`Row for JO Number ${joNumber} not found, using default values`);
    }
    
    // Update category display
    const categoryDisplay = document.getElementById('complete-jo-category');
    if (categoryDisplay) {
        categoryDisplay.textContent = category;
        categoryDisplay.className = 'JO-category-pill ' + categoryClass;
    } else {
        console.error('Category display element not found!');
    }
    
    // Set submission date and target date
    document.getElementById('complete-submission-date').textContent = 'Apr 15, 2025'; // You can fetch this from server
    document.getElementById('complete-target-date').textContent = targetDate;
    
    // Reset form
    const actionTakenInput = document.getElementById('action-taken-input');
    const completionRemarks = document.getElementById('completion-remarks');
    if (actionTakenInput) actionTakenInput.value = '';
    if (completionRemarks) completionRemarks.value = '';
    
    // Open modal
    openModal(modal);
    console.log('Complete JO Modal opened for', joNumber);
    
    // Focus on action taken
    setTimeout(() => {
        if (actionTakenInput) actionTakenInput.focus();
    }, 300);
}

// Function to set up the complete job order form submission
function setupCompleteJobOrderForm() {
    const form = document.querySelector('#complete-jo-modal form');
    
    // Remove any existing event listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add new event listener
    newForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const actionTakenInput = document.getElementById('action-taken-input');
        
        // Validate inputs
        if (!actionTakenInput.value.trim()) {
            createToast('Please describe the action taken', 'error');
            return;
        }
        
        // Show loading state
        const completeButton = document.getElementById('confirm-complete-btn');
        completeButton.classList.add('loading');
        completeButton.textContent = '';
        
        // Submit the form using fetch API
        const formData = new FormData(this);
        
        fetch(this.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                // Update the UI
                const joId = document.getElementById('hidden-job-id').value;
                const row = document.querySelector(`[data-id="${joId}"].complete-jo-btn`)?.closest('tr');
                
                if (row) {
                    // Update status to "Completed"
                    const statusCell = row.querySelector('[data-label="Status"] span');
                    statusCell.textContent = 'Completed';
                    statusCell.className = 'JO-status JO-status-completed';
                    
                    // Remove complete button
                    const btnCell = row.querySelector('[data-label="Actions"]');
                    btnCell.innerHTML = `
                        <button class="JO-icon-button view-details-btn" title="View Details" data-id="${joId}" data-number="${row.querySelector('[data-label="JO Number"]').textContent}">
                            <i class="fas fa-eye"></i>
                        </button>
                    `;
                    
                    // Reattach event listener
                    row.querySelector('.view-details-btn').addEventListener('click', function() {
                        fetchJobOrderDetails(this.dataset.id, this.dataset.number);
                    });
                }
                
                // Close modal and show success message
                closeModal(document.getElementById('complete-jo-modal'));
                createToast('Job order successfully marked as complete', 'success');
                
                // Update stats
                updateCompletionStats();
            } else {
                createToast(data.message || 'Failed to complete job order', 'error');
            }
        })
        .catch(error => {
            console.error('Error completing job order:', error);
            createToast('Failed to complete job order: ' + error.message, 'error');
        })
        .finally(() => {
            completeButton.classList.remove('loading');
            completeButton.textContent = 'Mark as Complete';
        });
    });
}

// Function to update completion stats
function updateCompletionStats() {
    // Update completed count
    const completedStat = document.querySelector('.JO-approved .JO-stats-number');
    if (completedStat) {
        const currentCount = parseInt(completedStat.textContent);
        completedStat.textContent = currentCount + 1;
        
        // Add animation
        completedStat.classList.add('stats-updating');
        setTimeout(() => {
            completedStat.classList.remove('stats-updating');
        }, 1000);
    }
    
    // Update pending count
    const pendingStat = document.querySelector('.JO-pending .JO-stats-number');
    if (pendingStat) {
        const currentCount = parseInt(pendingStat.textContent);
        if (currentCount > 0) {
            pendingStat.textContent = currentCount - 1;
            
            // Add animation
            pendingStat.classList.add('stats-updating');
            setTimeout(() => {
                pendingStat.classList.remove('stats-updating');
            }, 1000);
        }
    }
}

// Function to animate stats cards on load
function animateStatsCards() {
    const statsCards = document.querySelectorAll('.JO-stats-card');
    
    statsCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });
}

// Helper Functions
function openModal(modal) {
    if (!modal) return;
    
    // Force display flex
    modal.style.display = 'flex';
    
    // Force reflow
    void modal.offsetWidth;
    
    // Add active class
    modal.classList.add('active');
    
    // Prevent scrolling on body
    document.body.style.overflow = 'hidden';
    
    console.log('Modal opened:', modal.id);
}

function closeModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('active');
    
    // Wait for animation to finish before hiding
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
    
    console.log('Modal closed:', modal.id);
}

function closeAllModals() {
    const modals = document.querySelectorAll('.JO-modal');
    modals.forEach(modal => {
        closeModal(modal);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Helper function to get CSRF token
function getCsrfToken() {
    // Try to get from cookie
    let csrfToken = document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
        
    // If not found in cookie, look for the token in a meta tag
    if (!csrfToken) {
        const csrfElement = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfElement) {
            csrfToken = csrfElement.value;
        }
    }
    
    return csrfToken;
}

// Toast notification functionality
function createToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${iconClass} toast-icon"></i>
            <span>${message}</span>
        </div>
        <button class="close-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Add show class after a small delay for animation to work
    setTimeout(() => {
        toast.classList.add('JO-toast-show');
    }, 10);
    
    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        removeToast(toast);
    });
    
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    toast.classList.remove('JO-toast-show');
    toast.classList.add('JO-toast-hide');
    
    setTimeout(() => {
        toast.remove();
    }, 300);
}

function addToastStyles() {
    // Add CSS animations for toasts if not already present
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes JO-slide-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes JO-slide-out {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .toast {
                opacity: 0;
                transform: translateX(100%);
            }
            
            .toast.JO-toast-show {
                animation: JO-slide-in 0.3s ease forwards;
            }
            
            .toast.JO-toast-hide {
                animation: JO-slide-out 0.3s ease forwards;
            }
            
            .stats-updating {
                animation: pulse-update 1s ease;
            }
            
            @keyframes pulse-update {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); color: var(--jo-primary); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Add CSS for loading state
function addChartStyles() {
    if (!document.getElementById('chart-styles')) {
        const style = document.createElement('style');
        style.id = 'chart-styles';
        style.textContent = `
            .JO-chart-wrapper.loading {
                position: relative;
                min-height: 200px;
            }
            
            .chart-loading-spinner {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10;
                font-size: 2rem;
                color: var(--jo-primary);
                animation: spin 1.5s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Add CSS for interactive chart
function addChartInteractionStyles() {
    if (!document.getElementById('chart-interaction-styles')) {
        const style = document.createElement('style');
        style.id = 'chart-interaction-styles';
        style.textContent = `
            .interactive-chart {
                cursor: pointer;
            }
            
            @keyframes barHighlight {
                0% { transform: scaleX(1); }
                50% { transform: scaleX(1.03); }
                100% { transform: scaleX(1); }
            }
        `;
        document.head.appendChild(style);
    }
}

// This function would be implemented to fetch job order details
function fetchJobOrderDetails(joId, joNumber) {
    const detailsModal = document.getElementById('jo-details-modal');
    openModal(detailsModal);
    
    // Show loading spinner
    document.getElementById('jo-details-content').innerHTML = `
        <div class="JO-loading" style="text-align: center; padding: 2rem;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Loading job order details...</p>
        </div>
    `;
    
    fetch(`/joborder/job-order-details/${joId}/`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            renderJobOrderDetails(data);
        } else {
            // Show error in modal
            document.getElementById('jo-details-content').innerHTML = `
                <div class="JO-error-message" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #f14668; margin-bottom: 1rem;"></i>
                    <p>${data.message || 'Failed to load job order details'}</p>
                    <button class="JO-button JO-primary-button retry-fetch-btn" data-id="${joId}" data-number="${joNumber}" style="margin-top: 1rem;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
            
            // Setup retry button
            document.querySelector('.retry-fetch-btn').addEventListener('click', function() {
                const retryId = this.dataset.id;
                const retryNumber = this.dataset.number;
                fetchJobOrderDetails(retryId, retryNumber);
            });
        }
    })
    .catch(error => {
        console.error('Error fetching job order details:', error);
        document.getElementById('jo-details-content').innerHTML = `
            <div class="JO-error-message" style="text-align: center; padding: 2rem;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #f14668; margin-bottom: 1rem;"></i>
                <p>An error occurred while loading the job order details: ${error.message}</p>
                <button class="JO-button JO-primary-button retry-fetch-btn" data-id="${joId}" data-number="${joNumber}" style="margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;

        document.querySelector('.retry-fetch-btn').addEventListener('click', function() {
            fetchJobOrderDetails(joId, joNumber);
        });
    });
}

// Render job order details in the modal
function renderJobOrderDetails(data) {
    const canCancelJO = data.jo_status === 'Routing' && data.is_creator === true;
    const canCloseTransaction = data.jo_status === 'Checked' && data.is_creator === true;
    
    // Create timeline HTML based on the standard sequence
    const timelineHtml = generateTimelineItems(data.routing, data.jo_status);
    
    const modalContent = `
        <div class="JO-details-header">
            <div class="JO-details-id">
                <h3>${data.jo_number || 'N/A'}</h3>
                <span class="JO-category-pill JO-category-${data.category?.toLowerCase()}">${data.category || 'N/A'}</span>
                <span class="JO-status JO-status-${data.jo_status?.toLowerCase()}">${data.jo_status || 'N/A'}</span>
            </div>
            
            <div class="JO-details-date">
                <p>Submitted: ${data.submitted_date || 'N/A'}</p>
            </div>
        </div>

        <div class="JO-details-section">
            <h4>Job Order Information</h4>
            <div class="JO-details-grid">
                <div class="JO-details-item">
                    <span class="JO-details-label">Tool:</span>
                    <span class="JO-details-value">${data.tool || 'N/A'}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Nature:</span>
                    <span class="JO-details-value">${data.nature || 'N/A'}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Prepared By:</span>
                    <span class="JO-details-value">${data.prepared_by || 'N/A'}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Status:</span>
                    <span class="JO-details-value">${data.jo_status || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="JO-details-section">
            <span class="JO-details-label">Details:</span>
            <p class="JO-details-text">${data.details || 'No details provided'}</p>
        </div>

        ${(data.in_charge || data.date_received || data.target_date || data.date_complete) ? `
        <div class="JO-details-section">
            <h4>Assignment Information</h4>
            <div class="JO-details-grid">
                ${data.in_charge ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Person In-charge:</span>
                    <span class="JO-details-value">${data.in_charge || 'Not Yet Assigned'}</span>
                </div>
                ` : ''}

                ${data.date_received ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Date Received:</span>
                    <span class="JO-details-value">${data.date_received || 'Not Yet Received'}</span>
                </div>
                ` : ''}

                ${data.target_date ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Expected Completion:</span>
                    <span class="JO-details-value">${data.target_date || 'Not Yet Assigned Target Date'}</span>
                </div>
                ` : ''}
                
                ${data.date_complete ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Date of Completion:</span>
                    <span class="JO-details-value">${data.date_complete || 'Not Yet Completed'}</span>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}

        ${data.action_taken ? `
        <div class="JO-details-section">
            <span class="JO-details-label">Action Taken:</span>
            <p class="JO-details-text">${data.action_taken || 'No action taken provided yet'}</p>
        </div>
        ` : ''}

        ${data.target_date_reason ? `
        <div class="JO-details-section">
            <span class="JO-details-label">Reason for Delay:</span>
            <p class="JO-details-text">${data.target_date_reason}</p>
        </div>
        ` : ''}

        <div class="JO-details-section">
            <h4>Approval Status</h4>
            <div class="JO-approval-timeline">
                ${timelineHtml}
            </div>
        </div>
    `;
    
    document.getElementById('jo-details-content').innerHTML = modalContent;

    // Update the footer content based on permissions
    const footerContent = `
        <button class="JO-button JO-secondary-button close-details-modal">Close</button>
    `;
    
    document.querySelector('#jo-details-modal .JO-modal-footer').innerHTML = footerContent;

    // Setup event listeners for the footer buttons
    const cancelJoBtn = document.getElementById('cancel-jo-btn');
    if (cancelJoBtn) {
        cancelJoBtn.addEventListener('click', function() {
            const joId = this.dataset.id;
            const joNumber = this.dataset.number || joId;
            confirmCancelJobOrder(joId, joNumber);
        });
    }
    
    const closeTransactionBtn = document.getElementById('close-transaction-btn');
    if (closeTransactionBtn) {
        closeTransactionBtn.addEventListener('click', function() {
            const joId = this.dataset.id;
            const joNumber = this.dataset.number || joId;
            confirmCloseTransaction(joId, joNumber);
        });
    }
    
    // Attach event listeners for the close-details-modal button
    document.querySelectorAll('.close-details-modal').forEach(button => {
        button.addEventListener('click', function() {
            closeModal(document.getElementById('jo-details-modal'));
        });
    });
}

function generateTimelineItems(routingData, joStatus) {
    if (!routingData || routingData.length === 0) {
        return '<p>No approval information available</p>';
    }

    // Define the standard approval sequence
    const approvalSequence = [
        { sequence: 0, role: 'Requestor', title: 'Request Submitted' },
        { sequence: 1, role: 'Supervisor', title: 'Supervisor Approval' },
        { sequence: 2, role: 'Manager', title: 'Manager Approval' },
        { sequence: 3, role: 'QA Manager', title: 'QA Manager Approval' },
        { sequence: 4, role: 'PM Manager', title: 'PM Manager Approval' },
        { sequence: 5, role: 'Assigning', title: 'Assigning Person In-Charge' },
        { sequence: 6, role: 'Maintenance', title: 'Maintenance Implementation' },
        { sequence: 7, role: 'QA', title: 'QA Checking' },
        { sequence: 8, role: 'Requestor', title: 'Transaction Closure' }
    ];

    // Map to store routing entries by sequence number
    const routingMap = {};

    // Process routing data to build the map and find the highest sequence
    let maxSequence = -1;
    routingData.forEach(entry => {
        if (entry.approver_sequence !== undefined && entry.approver_sequence !== null) {
            const sequence = parseInt(entry.approver_sequence);
            routingMap[sequence] = entry;
            maxSequence = Math.max(maxSequence, sequence);
        }
    });

    let timelineHtml = '';

    // Generate timeline items for each step in the sequence
    approvalSequence.forEach((step, index) => {
        const entry = routingMap[step.sequence];
        let timelineClass = '';
        let icon = '<i class="fas fa-clock"></i>';
        let statusText = step.title;
        let dateText = '';
        let remarks = '';
        
        // Step has been reached in the routing process
        if (entry) {
            if (entry.status === 'Submitted' || entry.status === 'Approved') {
                timelineClass = 'JO-timeline-complete';
                icon = '<i class="fas fa-check"></i>';
                
                if (entry.status === 'Submitted') {
                    dateText = `${entry.approver_name || entry.approver} - ${entry.request_at || entry.date}`;
                } else {
                    dateText = `Approved by ${entry.approver_name || entry.approver} on ${entry.approved_at}`;
                }
                
                if (entry.remarks) {
                    remarks = `<p class="JO-timeline-remarks">"${entry.remarks}"</p>`;
                }
            } else if (entry.status === 'Rejected') {
                timelineClass = 'JO-timeline-rejected';
                icon = '<i class="fas fa-times"></i>';
                statusText = `${step.title} - Rejected`;
                dateText = `Rejected by ${entry.approver_name || entry.approver} on ${entry.approved_at}`;
                
                if (entry.remarks) {
                    remarks = `<p class="JO-timeline-remarks">"${entry.remarks}"</p>`;
                }
            } else if (entry.status === 'Pending' || entry.status === 'Processing') {
                timelineClass = 'JO-timeline-active';
                icon = '<i class="fas fa-hourglass-half"></i>';
                dateText = `Waiting for ${entry.approver_name || entry.approver}'s approval`;
            }
        } 
        // Step is a future step that hasn't been reached yet
        else if (step.sequence > maxSequence) {
            // If JO is cancelled or rejected, make future steps inactive
            if (joStatus === 'Cancelled' || joStatus === 'Rejected') {
                timelineClass = 'JO-timeline-inactive';
                dateText = 'Not applicable';
            } else if (step.sequence === maxSequence + 1) {
                // Next step is pending
                timelineClass = 'JO-timeline-active';
                icon = '<i class="fas fa-hourglass-half"></i>';
                dateText = 'Pending';
            } else {
                // Future steps
                timelineClass = 'JO-timeline-inactive';
                dateText = 'Not yet reached';
            }
        }
        
        timelineHtml += `
            <div class="JO-timeline-item ${timelineClass}">
                <div class="JO-timeline-icon">
                    ${icon}
                </div>
                <div class="JO-timeline-content">
                    <h5>${statusText}</h5>
                    <p>${dateText}</p>
                    ${remarks}
                </div>
            </div>
        `;
    });
    
    return timelineHtml;
}