let analyticsChartInstance = null;
let workloadChartInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    initializeEventListeners();
    animateStatsCards();
    initializeAssignmentSystem();
    setEqualCardHeights();
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            setEqualCardHeights();
        } else {
            resetCardHeights();
        }
    });
});

function setEqualCardHeights() {
    // Only apply if viewport is larger than 1024px
    if (window.innerWidth <= 1024) return;

    const firstRowCards = document.querySelectorAll('.JO-main-content-grid:first-of-type .JO-card');
    const secondRowCards = document.querySelectorAll('.JO-main-content-grid:last-of-type .JO-card');

    // Reset heights first
    resetCardHeights([...firstRowCards, ...secondRowCards]);

    // Set equal heights for first row
    if (firstRowCards.length > 1) {
        const maxHeight1 = Math.max(...Array.from(firstRowCards).map(card => card.scrollHeight));
        firstRowCards.forEach(card => {
            card.style.height = `${maxHeight1}px`;
        });
    }

    // Set equal heights for second row
    if (secondRowCards.length > 1) {
        const maxHeight2 = Math.max(...Array.from(secondRowCards).map(card => card.scrollHeight));
        secondRowCards.forEach(card => {
            card.style.height = `${maxHeight2}px`;
        });
    }
}

// Reset card heights to auto
function resetCardHeights(cards = null) {
    if (!cards) {
        cards = document.querySelectorAll('.JO-card');
    }
    cards.forEach(card => {
        card.style.height = '';
    });
}

// Initialize all charts
function initializeCharts() {
    fetchAnalyticsData('6month');
    fetchWorkloadData();

    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', function() {
            const chartWrapper = document.querySelector('.JO-chart-wrapper');
            if (chartWrapper) {
                chartWrapper.style.opacity = '0.5';
            }
            fetchAnalyticsData(this.value);
        });
    }
    setInterval(() => {
        const selectedPeriod = document.getElementById('chart-period-selector')?.value || '6month';
        fetchAnalyticsData(selectedPeriod);
        fetchWorkloadData();
    }, 60000);
}

// Fetch analytics data from the server with retry capability
function fetchAnalyticsData(period, retryCount = 0) {
    // Show loading state
    const chartWrapper = document.querySelector('.JO-chart-wrapper');
    if (chartWrapper) {
        chartWrapper.style.opacity = '0.5';

        // Add loading indicator if it doesn't exist
        if (!chartWrapper.querySelector('.chart-loading')) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chart-loading';
            loadingDiv.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem; color: #3366ff;"></i>
                    <p>Loading chart data...</p>
                </div>
            `;
            chartWrapper.appendChild(loadingDiv);
        }
    }

    // Maximum number of retries
    const MAX_RETRIES = 3;

    fetch(`/joborder/analytics/?period=${period}`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        // Add cache control to prevent caching issues
        cache: 'no-store'
    })
    .then(response => {
        // Remove loading indicator
        const loadingIndicator = chartWrapper?.querySelector('.chart-loading');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Check if we have valid data
            if (data.labels && data.total_by_month && data.completed_by_month &&
                data.labels.length > 0 && data.labels.length === data.total_by_month.length) {

                // Create or update the analytics chart
                createAnalyticsChart(
                    document.getElementById('jo-analytics-chart'),
                    data.labels,
                    data.total_by_month,
                    data.completed_by_month
                );

                // Reset chart opacity
                if (chartWrapper) {
                    setTimeout(() => {
                        chartWrapper.style.opacity = '1';
                    }, 300);
                }

                // If there was an error logged on the server but we still got fallback data
                if (data.error_logged) {
                    console.warn('Server encountered an error but provided fallback data');
                    // Show a less severe warning to the user
                    createToast('Using cached chart data', 'warning');
                }
            } else {
                console.error('Invalid data structure received:', data);
                createToast('Invalid chart data received', 'error');

                // Use fallback data
                createFallbackChart();
            }
        } else {
            console.error('Server returned error status:', data);
            createToast('Failed to load analytics data', 'error');

            // Use fallback data
            createFallbackChart();
        }
    })
    .catch(error => {
        console.error('Error fetching analytics data:', error);

        // Remove loading indicator
        const loadingIndicator = chartWrapper?.querySelector('.chart-loading');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        // Retry logic
        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying analytics data fetch (${retryCount + 1}/${MAX_RETRIES})...`);
            setTimeout(() => {
                fetchAnalyticsData(period, retryCount + 1);
            }, 1000 * (retryCount + 1)); // Exponential backoff

        } else {
            createToast('Error loading analytics data: ' + error.message, 'error');

            // Use fallback data after all retries fail
            createFallbackChart();

            // Reset chart opacity
            if (chartWrapper) {
                chartWrapper.style.opacity = '1';
            }
        }
    });
}

// Create a fallback chart with sample data when the API fails
function createFallbackChart() {
    const canvas = document.getElementById('jo-analytics-chart');
    if (!canvas) return;

    // Sample fallback data
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const totalData = [4, 6, 8, 5, 7, 9];
    const completedData = [3, 4, 6, 3, 5, 7];

    // Create chart with fallback data
    createAnalyticsChart(canvas, labels, totalData, completedData);

    console.log('Using fallback chart data');
}

// Fetch workload data from the server with retry capability
function fetchWorkloadData(retryCount = 0) {
    // Show loading state for workload section
    const workloadContainer = document.querySelector('.JO-workload-chart-container');
    const workloadList = document.getElementById('workload-list');

    if (workloadList) {
        // Show loading indicator if not already present
        if (!workloadList.querySelector('.JO-loading')) {
            workloadList.innerHTML = `
                <div class="JO-loading" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Loading workload data...</p>
                </div>
            `;
        }
    }

    // Maximum number of retries
    const MAX_RETRIES = 3;

    fetch('/joborder/workload/', {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        // Add cache control to prevent caching issues
        cache: 'no-store'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Check if we have valid workload data
            if (data.workload_data && Array.isArray(data.workload_data)) {
                // Create the workload chart
                createWorkloadChart(
                    document.getElementById('workload-chart'),
                    data.workload_data
                );

                // Update the workload list
                updateWorkloadList(data.workload_data);

                // If there was an error logged on the server but we still got fallback data
                if (data.error_logged) {
                    console.warn('Server encountered an error but provided fallback workload data');
                }
            } else {
                console.error('Invalid workload data structure received:', data);
                createToast('Invalid workload data received', 'error');

                // Use fallback data
                createFallbackWorkloadData();
            }
        } else {
            console.error('Server returned error status for workload:', data);
            createToast('Failed to load workload data', 'error');

            // Use fallback data
            createFallbackWorkloadData();
        }
    })
    .catch(error => {
        console.error('Error fetching workload data:', error);

        // Retry logic
        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying workload data fetch (${retryCount + 1}/${MAX_RETRIES})...`);
            setTimeout(() => {
                fetchWorkloadData(retryCount + 1);
            }, 1000 * (retryCount + 1)); // Exponential backoff
        } else {
            createToast('Error loading workload data: ' + error.message, 'error');

            // Use fallback data after all retries fail
            createFallbackWorkloadData();
        }
    });
}

// Create fallback workload data when the API fails
function createFallbackWorkloadData() {
    const canvas = document.getElementById('workload-chart');

    // Sample fallback workload data
    const fallbackData = [
        { name: 'Maintenance Staff 1', active_tasks: 5, workload_percentage: 50 },
        { name: 'Maintenance Staff 2', active_tasks: 8, workload_percentage: 80 },
        { name: 'Maintenance Staff 3', active_tasks: 3, workload_percentage: 30 }
    ];

    // Create chart with fallback data
    if (canvas) {
        createWorkloadChart(canvas, fallbackData);
    }

    // Update list with fallback data
    updateWorkloadList(fallbackData);

    console.log('Using fallback workload data');
}

// Create Analytics Chart
function createAnalyticsChart(canvas, labels, totalData, completedData) {
    if (!canvas) return;

    // Clear any existing chart
    if (analyticsChartInstance) {
        analyticsChartInstance.destroy();
    }

    // Monthly trends - Line chart
    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Requests',
                    data: totalData,
                    borderColor: '#3366ff',
                    backgroundColor: 'rgba(51, 102, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Completed',
                    data: completedData,
                    borderColor: '#4caf50',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 15,
                        padding: 15,
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 12
                        }
                    }
                },
                title: {
                    display: false,
                    text: 'Monthly Job Order Trends',
                    font: {
                        size: 16
                    },
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        }
    };

    // Create the chart with animation
    analyticsChartInstance = new Chart(canvas, chartConfig);

    // Add animation for chart appearance
    canvas.style.opacity = 0;
    setTimeout(() => {
        canvas.style.transition = 'opacity 1s ease-in-out';
        canvas.style.opacity = 1;
    }, 100);
}

// Create Workload Chart
function createWorkloadChart(canvas, workloadData) {
    if (!canvas) return;

    // Clear any existing chart
    if (workloadChartInstance) {
        workloadChartInstance.destroy();
    }

    // Extract data
    const names = workloadData.map(item => item.name);
    const percentages = workloadData.map(item => item.workload_percentage);
    const colors = workloadData.map(item => {
        const percentage = item.workload_percentage;
        if (percentage < 50) return 'rgba(76, 175, 80, 0.7)';  // Green for low
        if (percentage < 80) return 'rgba(255, 193, 7, 0.7)';  // Yellow for medium
        return 'rgba(244, 67, 54, 0.7)';                       // Red for high
    });

    const borderColors = workloadData.map(item => {
        const percentage = item.workload_percentage;
        if (percentage < 50) return 'rgb(76, 175, 80)';  // Green for low
        if (percentage < 80) return 'rgb(255, 193, 7)';  // Yellow for medium
        return 'rgb(244, 67, 54)';                       // Red for high
    });

    const chartConfig = {
        type: 'bar',
        data: {
            labels: names,
            datasets: [{
                label: 'Workload %',
                data: percentages,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Maintenance Team Workload',
                    font: {
                        size: 14
                    },
                    padding: {
                        top: 0,
                        bottom: 10
                    }
                }
            }
        }
    };

    // Create the chart
    workloadChartInstance = new Chart(canvas, chartConfig);
}

// Update workload list with data
function updateWorkloadList(workloadData) {
    const workloadList = document.getElementById('workload-list');
    if (!workloadList) return;

    // Clear current content
    workloadList.innerHTML = '';

    // Add each workload item
    workloadData.forEach((item, index) => {
        const workloadClass = item.workload_percentage >= 80 ? 'JO-workload-high' : '';

        const itemElement = document.createElement('div');
        itemElement.className = 'JO-workload-item';
        itemElement.innerHTML = `
            <div class="JO-workload-header">
                <span class="JO-workload-name">${item.name}</span>
                <span class="JO-workload-tasks">${item.active_tasks} active tasks</span>
            </div>
            <div class="JO-workload-bar-container">
                <div class="JO-workload-bar ${workloadClass}" style="width: ${item.workload_percentage}%;">
                    <span class="JO-workload-value">${item.workload_percentage}%</span>
                </div>
            </div>
        `;

        workloadList.appendChild(itemElement);
    });

    // If there are no items, show empty message
    if (workloadData.length === 0) {
        workloadList.innerHTML = `
            <div class="JO-empty-workload">
                <p>No maintenance personnel data available</p>
            </div>
        `;
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    // Open Dashboard Button
    const openDashboardBtn = document.getElementById('open-dashboard-btn');
    if (openDashboardBtn) {
        openDashboardBtn.addEventListener('click', function() {
            // Open in new tab
            window.open('/joborder/job-order-request-overview/', '_blank');
            // Show toast notification
            createToast('Maintenance Dashboard opened in new tab', 'info');
        });
    }

    // Modal Close Buttons
    const closeButtons = document.querySelectorAll('.JO-modal-close, .close-details-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.JO-modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });

    // View Details buttons
    const viewDetailsButtons = document.querySelectorAll('.view-details-btn');
    viewDetailsButtons.forEach(button => {
        button.addEventListener('click', function() {
            const joId = this.dataset.id;
            const joNumber = this.dataset.number;
            if (joId) {
                fetchJobOrderDetails(joId, joNumber);
            }
        });
    });

    // Assign buttons in list
    const assignButtons = document.querySelectorAll('.JO-assign-btn');
    assignButtons.forEach(button => {
        button.addEventListener('click', function() {
            const item = this.closest('.JO-assignment-item');
            const joId = item.dataset.id;
            const joNumber = item.dataset.number;
            const select = item.querySelector('.JO-assignee-select');
            const assigneeId = select.value;

            if (!assigneeId) {
                createToast('Please select an assignee first', 'warning');
                select.focus();
                return;
            }

            const assigneeName = select.options[select.selectedIndex].text;
            showAssignmentConfirmation(joId, joNumber, assigneeId, assigneeName);
        });
    });

    // Confirm assignment button
    const confirmAssignBtn = document.getElementById('confirm-assignment-btn');
    if (confirmAssignBtn) {
        // Remove any existing event listeners to prevent duplication
        const newConfirmBtn = confirmAssignBtn.cloneNode(true);
        confirmAssignBtn.parentNode.replaceChild(newConfirmBtn, confirmAssignBtn);

        // Add the event listener
        newConfirmBtn.addEventListener('click', function() {
            console.log("Assignment confirmation button clicked");

            // Get the form and submit it
            const form = document.getElementById('assignment-form');
            if (form) {
                console.log("Form found, submitting...");
                form.submit();
            } else {
                console.error("Assignment form not found!");
                createToast('Error: Form not found', 'error');
            }
        });
    } else {
        console.error("Confirm assignment button not found!");
    }

    // Cancel assignment button
    const cancelAssignmentBtn = document.getElementById('cancel-assignment');
    if (cancelAssignmentBtn) {
        cancelAssignmentBtn.addEventListener('click', function() {
            closeModal(document.getElementById('confirm-assignment-modal'));
        });
    }

    // Initialize search functionality
    initializeSearch();
}

// Animate stats cards
function animateStatsCards() {
    const statsCards = document.querySelectorAll('.JO-stats-card');

    statsCards.forEach((card, index) => {
        // Set initial state
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        // Animate in with delay based on index
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 150));
    });
}

// Initialize assignment system
function initializeAssignmentSystem() {
    // Initialize assignee select change events
    const assigneeSelects = document.querySelectorAll('.JO-assignee-select');
    assigneeSelects.forEach(select => {
        select.addEventListener('change', function() {
            const assignButton = this.closest('.JO-assignment-form').querySelector('.JO-assign-btn');

            if (this.value) {
                assignButton.classList.add('pulse');
                setTimeout(() => assignButton.classList.remove('pulse'), 1000);
            }
        });
    });
}

// Fetch job order details (implements the required function from task)
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
                    <span class="JO-details-label">Line:</span>
                    <span class="JO-details-value">${data.line || 'N/A'}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Requestor:</span>
                    <span class="JO-details-value">${data.requestor || 'N/A'}</span>
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
        ${canCancelJO ? `
        <button class="JO-button JO-danger-button" id="cancel-jo-btn" data-id="${data.id}" data-number="${data.jo_number || data.id}">
            <i class="fas fa-times-circle"></i> Cancel Request
        </button>` : ''}
        ${canCloseTransaction ? `
        <button class="JO-button JO-success-button" id="close-transaction-btn" data-id="${data.id}" data-number="${data.jo_number || data.id}">
            <i class="fas fa-check-circle"></i> Close Transaction
        </button>` : ''}
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

/**
 * Generates timeline items based on JORouting model data
 * @param {Array} routingData - Routing data from the server
 * @param {String} joStatus - Current job order status
 * @returns {String} HTML for timeline items
 */
function generateTimelineItems(routingData, joStatus) {
    if (!routingData || routingData.length === 0) {
        return '<p>No approval information available</p>';
    }

    // Define the standard approval sequence based on approver_sequence field in JORouting model
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

function showAssignmentConfirmation(joId, joNumber, assigneeId, assigneeName) {
    console.log("Opening assignment modal with data:", {joId, joNumber, assigneeId, assigneeName});

    // Set text content for display fields
    const joNumberEl = document.getElementById('assign-jo-number');
    const assigneeNameEl = document.getElementById('assignee-name');

    // Set values for form fields
    const joIdField = document.getElementById('assign-jo-id');
    const assigneeIdField = document.getElementById('assign-assignee-id');

    if (joNumberEl) joNumberEl.textContent = joNumber;
    if (assigneeNameEl) assigneeNameEl.textContent = assigneeName;

    if (joIdField) joIdField.value = joId;
    if (assigneeIdField) assigneeIdField.value = assigneeId;

    // Log the form values for debugging
    console.log("Form values set:", {
        joId: joIdField ? joIdField.value : 'field not found',
        assigneeId: assigneeIdField ? assigneeIdField.value : 'field not found'
    });

    // Show the modal
    const modal = document.getElementById('confirm-assignment-modal');
    if (modal) {
        openModal(modal);
    } else {
        console.error("Assignment confirmation modal not found");
    }
}

// Remove an assignment item with animation
function removeAssignmentItem(item) {
    item.style.transition = 'all 0.5s ease';
    item.style.opacity = '0';
    item.style.height = '0';
    item.style.overflow = 'hidden';

    setTimeout(() => {
        item.remove();

        // Check if there are no more assignments
        const assignmentList = document.getElementById('assignment-list');
        if (assignmentList && assignmentList.children.length === 0) {
            // Add empty message
            const emptyElement = document.createElement('div');
            emptyElement.className = 'JO-empty-assignments';
            emptyElement.innerHTML = `
                <div class="JO-empty-icon">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <p>No pending requests for assigning personnel</p>
                <p class="JO-empty-subtitle">All job orders have been assigned to maintenance personnel</p>
            `;

            // Add to assignment list
            assignmentList.appendChild(emptyElement);

            // Add animation
            setTimeout(() => {
                emptyElement.style.opacity = '1';
                emptyElement.style.transform = 'translateY(0)';
            }, 100);
        }
    }, 500);
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.querySelector('.JO-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim().toLowerCase();
        const tableRows = document.querySelectorAll('.JO-table tbody tr');
        let visibleCount = 0;

        tableRows.forEach(row => {
            let shouldShow = false;
            const cells = row.querySelectorAll('td');

            cells.forEach(cell => {
                if (cell.textContent.toLowerCase().includes(searchTerm)) {
                    shouldShow = true;
                }
            });

            if (shouldShow) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Show/hide empty state row
        let emptyRow = document.querySelector('.JO-table tbody .JO-empty-row');
        if (!emptyRow) {
            emptyRow = document.createElement('tr');
            emptyRow.className = 'JO-empty-row';
            emptyRow.innerHTML = `<td colspan="7" style="padding: 0; border-bottom: none;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 220px; min-height: 180px; width: 100%;">
                    <div class="JO-no-results-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;">No matching Job Order requests found</div>
                    <div style="color: #888; font-size: 0.95rem;">Try adjusting your search criteria</div>
                </div>
            </td>`;
            document.querySelector('.JO-table tbody').appendChild(emptyRow);
        }
        emptyRow.style.display = (visibleCount === 0) ? '' : 'none';
    });
}

// Open modal with animation
function openModal(modal) {
    if (!modal) return;

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.classList.add('active');
    }, 10);
}

// Close modal with animation
function closeModal(modal) {
    if (!modal) return;

    modal.style.opacity = '0';
    modal.classList.remove('active');

    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Create toast notification
function createToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Determine icon based on type
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';

    // Set toast content
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${iconClass} toast-icon"></i>
            <span>${message}</span>
        </div>
        <button class="close-btn">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Append to container
    toastContainer.appendChild(toast);

    // Apply entrance animation
    toast.style.animation = 'slideInRight 0.3s ease, fadeOut 0.3s ease ' + (duration - 300) + 'ms forwards';

    // Add close button event listener
    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        removeToast(toast);
    });

    // Auto remove after duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

// Remove toast with animation
function removeToast(toast) {
    toast.style.opacity = '0';
    setTimeout(() => {
        toast.remove();
    }, 300);
}

function getCsrfToken() {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('csrftoken=')) {
            return cookie.substring('csrftoken='.length);
        }
    }
    return '';
}

// EXPORT FUNCTION
// Function to initialize all export modal functionality
function initializeExportModal() {
    const exportBtn = document.querySelector('.JO-export-btn');
    const exportModal = document.getElementById('export-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');

    if (!exportBtn || !exportModal) return;

    // Set default dates
    setDefaultDates();

    // Initialize checkbox logic for both status and category filters
    setupFilterCheckboxes('status');
    setupFilterCheckboxes('category');

    // Open modal when clicking export button
    exportBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openExportModal();
    });

    // Close modal when clicking the close button
    const closeBtn = document.querySelector('.JO-export-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeExportModal();
        });
    }

    // Close modal when clicking outside the modal content
    modalBackdrop.addEventListener('click', function() {
        closeExportModal();
    });

    // Prevent modal close when clicking inside the modal content
    exportModal.querySelector('.JO-export-modal-content').addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Handle ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && exportModal.classList.contains('active')) {
            closeExportModal();
        }
    });

    // Add animation to export button
    exportBtn.addEventListener('mouseenter', function() {
        if (this.querySelector('i')) {
            this.querySelector('i').style.transform = 'translateY(-2px)';
        }
    });

    exportBtn.addEventListener('mouseleave', function() {
        if (!this.classList.contains('active') && this.querySelector('i')) {
            this.querySelector('i').style.transform = '';
        }
    });

    // Handle form submission
    const exportForm = document.querySelector('#export-form');
    if (exportForm) {
        // Remove any existing event listeners (to prevent duplicates)
        const newForm = exportForm.cloneNode(true);
        exportForm.parentNode.replaceChild(newForm, exportForm);

        // Re-initialize checkbox logic for the new form
        setupFilterCheckboxes('status');
        setupFilterCheckboxes('category');

        // Add the event listener to the new form
        newForm.addEventListener('submit', function(e) {
            handleExportSubmit(e, this);
        });
    }
}

// Function to set up checkbox behavior for filter groups
function setupFilterCheckboxes(groupName) {
    const allCheckbox = document.querySelector(`input[name="${groupName}"][value="all"]`);
    const individualCheckboxes = document.querySelectorAll(`input[name="${groupName}"]:not([value="all"])`);

    if (!allCheckbox || individualCheckboxes.length === 0) return;

    // Initial setup - if "All" is checked, disable individual checkboxes
    updateIndividualCheckboxes();

    // When "All" checkbox changes
    allCheckbox.addEventListener('change', function() {
        updateIndividualCheckboxes();
    });

    // When individual checkboxes change
    individualCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateAllCheckbox();
        });
    });

    // Update state of individual checkboxes based on "All" checkbox
    function updateIndividualCheckboxes() {
        if (allCheckbox.checked) {
            // If "All" is checked, check and disable all individual checkboxes
            individualCheckboxes.forEach(cb => {
                cb.checked = true;
                cb.disabled = true;
            });
        } else {
            // If "All" is unchecked, enable all individual checkboxes
            individualCheckboxes.forEach(cb => {
                cb.disabled = false;
            });
        }
    }

    // Update state of "All" checkbox based on individual checkboxes
    function updateAllCheckbox() {
        // Count how many individual checkboxes are checked
        const checkedCount = Array.from(individualCheckboxes).filter(cb => cb.checked).length;

        // If all individual checkboxes are checked, check the "All" checkbox
        if (checkedCount === individualCheckboxes.length) {
            allCheckbox.checked = true;
            // Enable "All" and disable individuals to maintain clean state
            updateIndividualCheckboxes();
        } else {
            // Otherwise, uncheck the "All" checkbox
            allCheckbox.checked = false;
        }
    }
}

// Reset export form with proper checkbox handling
function resetExportForm() {
    const exportForm = document.getElementById('export-form');

    if (exportForm) {
        exportForm.reset();

        // Reset status checkbox group
        resetFilterCheckboxes('status');

        // Reset category checkbox group
        resetFilterCheckboxes('category');

        // Set default dates
        setDefaultDates();
    }
}

// Function to reset a checkbox filter group
function resetFilterCheckboxes(groupName) {
    const allCheckbox = document.querySelector(`input[name="${groupName}"][value="all"]`);
    const individualCheckboxes = document.querySelectorAll(`input[name="${groupName}"]:not([value="all"])`);

    if (!allCheckbox || individualCheckboxes.length === 0) return;

    // Default state: "All" checked, individuals checked and disabled
    allCheckbox.checked = true;

    individualCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.disabled = true;
    });
}

// Function to open the export modal
function openExportModal() {
    const exportBtn = document.querySelector('.JO-export-btn');
    const exportModal = document.getElementById('export-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');

    if (!exportModal || !modalBackdrop) {
        console.error('Export modal or backdrop not found');
        return;
    }

    // Reset form before opening
    resetExportForm();

    // Show backdrop
    modalBackdrop.classList.add('active');

    // Show modal with animation
    exportModal.style.display = 'flex';
    setTimeout(() => {
        exportModal.classList.add('active');
        if (exportBtn) exportBtn.classList.add('active');
    }, 10);
}

// Function to set default dates
function setDefaultDates() {
    // Set today as default for "To" date
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    const toDateInput = document.getElementById('export-date-to');
    if (toDateInput) toDateInput.value = todayFormatted;

    // Set one month ago as default for "From" date
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoFormatted = oneMonthAgo.toISOString().split('T')[0];
    const fromDateInput = document.getElementById('export-date-from');
    if (fromDateInput) fromDateInput.value = oneMonthAgoFormatted;
}

// Function to close the export modal
function closeExportModal() {
    const exportBtn = document.querySelector('.JO-export-btn');
    const exportModal = document.getElementById('export-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');

    if (!exportModal || !modalBackdrop) return;

    // Hide modal with animation
    exportModal.classList.remove('active');
    if (exportBtn) exportBtn.classList.remove('active');

    // Hide backdrop after animation completes
    setTimeout(() => {
        modalBackdrop.classList.remove('active');
        exportModal.style.display = 'none';
    }, 300);
}

// Handle export form submission with proper error handling
function handleExportSubmit(e, form) {
    e.preventDefault(); // Prevent default form submission

    // Validate form before submission
    if (!validateExportForm()) {
        createToast('Please select at least one filter option', 'warning');
        return;
    }

    console.log("Export submission started");

    const exportBtn = document.querySelector('.JO-export-submit');

    // Show loading state
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    // Show processing message
    createToast('Processing export request...', 'info');

    // Submit the form programmatically - this allows us to handle the post-export redirect
    const formData = new FormData(form);
    const csrfToken = getCsrfToken();

    console.log("CSRF Token:", csrfToken ? "Token found" : "Token missing");

    fetch(form.action, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    })
    .then(response => {
        console.log("Response status:", response.status);
        console.log("Response headers:",
            Array.from(response.headers.entries())
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')
        );

        if (!response.ok) {
            throw new Error(`Export failed with status: ${response.status}`);
        }

        // Check if response is JSON (error) or blob (file)
        const contentType = response.headers.get('content-type');
        console.log("Content type:", contentType);

        if (contentType && contentType.includes('application/json')) {
            return response.json().then(data => {
                console.log("JSON response:", data);
                if (data.error) {
                    throw new Error(data.error);
                }
                return null;
            });
        }

        // For successful export - get the file
        return response.blob().then(blob => {
            console.log("Blob received, size:", blob.size);
            // Download the file
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            // Get filename from Content-Disposition header if available
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'job_orders_export.xlsx';

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            } else {
                // Fallback to generated filename with current date
                const dateStr = new Date().toISOString().slice(0, 10);
                filename = `job_orders_export_${dateStr}.xlsx`;
            }

            console.log("Downloading file:", filename);
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Set flag for redirect
            sessionStorage.setItem('exportSuccess', 'true');

            // Show success message and redirect
            createToast('Export successful!', 'success');

            // Close modal
            closeExportModal();

            // Reset the export button
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-download"></i> Export to Excel';
            }

            return true;
        });
    })
    .catch(error => {
        console.error('Export error:', error);

        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-download"></i> Export to Excel';
        }

        createToast('Export failed: ' + error.message, 'error');
    });
}

// Validate export form before submission
function validateExportForm() {
    // Check if at least one status is selected
    const statusCheckboxes = document.querySelectorAll('input[name="status"]:checked');
    if (statusCheckboxes.length === 0) {
        return false;
    }

    // Check if at least one category is selected
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked');
    if (categoryCheckboxes.length === 0) {
        return false;
    }

    return true;
}

// Helper function to get CSRF token
function getCsrfToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    return cookieValue || '';
}

// Initialize export functionality when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeExportModal();

    // Check if we need to show success message after export
    const exportSuccess = sessionStorage.getItem('exportSuccess');
    if (exportSuccess === 'true') {
        // Clear the flag
        sessionStorage.removeItem('exportSuccess');

        // Show success toast
        createToast('Export completed successfully!', 'success');
    }
});

// Show empty state if no assignment items
const assignmentList = document.getElementById('assignment-list');
if (assignmentList) {
    const items = assignmentList.querySelectorAll('.JO-assignment-item');
    let emptyDiv = assignmentList.querySelector('.JO-empty-assignments');
    if (!emptyDiv) {
        emptyDiv = document.createElement('div');
        emptyDiv.className = 'JO-empty-assignments';
        emptyDiv.innerHTML = `
            <div class="JO-empty-icon">
                <i class="fas fa-check-circle" style="font-size: 2.5rem; color: #4caf50; margin-bottom: 10px;"></i>
            </div>
            <div style="font-weight: 600; font-size: 1.2rem; margin-bottom: 4px;">All caught up!</div>
            <div style="color: #888; font-size: 1rem;">There are no pending requests that require your approval at this time.</div>
        `;
        assignmentList.appendChild(emptyDiv);
    }
    emptyDiv.style.display = (items.length === 0) ? '' : 'none';
}

