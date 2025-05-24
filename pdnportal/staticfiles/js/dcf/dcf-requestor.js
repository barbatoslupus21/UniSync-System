// DCF Requestor JavaScript

// Custom Chart.js plugin for 3D effect
const chartjs3DPlugin = {
    id: '3d',
    beforeDraw: function(chart, args, options) {
        if (!options.enabled) return;

        const ctx = chart.ctx;
        const canvas = chart.canvas;
        const chartArea = chart.chartArea;

        // Save the current canvas state
        ctx.save();

        // Create 3D effect with shadows and gradients
        // Draw shadow for the chart area
        ctx.shadowOffsetX = options.depth || 10;
        ctx.shadowOffsetY = options.depth || 10;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';

        // Create a subtle gradient background for 3D effect
        const gradient = ctx.createLinearGradient(
            chartArea.left,
            chartArea.top,
            chartArea.right,
            chartArea.bottom
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(200, 200, 200, 0.1)');

        // Apply the gradient
        ctx.fillStyle = gradient;
        ctx.fillRect(
            chartArea.left,
            chartArea.top,
            chartArea.right - chartArea.left,
            chartArea.bottom - chartArea.top
        );

        // Restore the canvas state
        ctx.restore();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Check if Chart.js is loaded
    if (typeof Chart !== 'undefined') {
        // Register the 3D plugin
        Chart.register(chartjs3DPlugin);
    }

    // Set up CSRF token for AJAX requests
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

    // Initialize modals
    initializeModals();

    // Initialize chart
    initializeChart();

    // Set up event listeners
    setupEventListeners();

    // Show success/error messages from Django messages
    initializeToasts();

    // Set up form submission handlers
    setupFormSubmissionHandlers();

    // Check for URL parameters that might indicate form errors
    checkForFormErrors();
});

// ========== Modal Handling ==========
function initializeModals() {
    // Get all modals
    const modals = document.querySelectorAll('.DCF-modal');
    const modalTriggers = {
        'new-dcf-btn': 'new-dcf-modal',
        'cancel-dcf-btn': 'new-dcf-modal',
        'cancel-edit-btn': 'edit-dcf-modal',
        'cancel-delete-btn': 'delete-dcf-modal'
    };

    // Add close button functionality
    document.querySelectorAll('.DCF-modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.DCF-modal');
            closeModal(modal);
        });
    });

    // Setup modal triggers
    Object.keys(modalTriggers).forEach(triggerId => {
        const triggerBtn = document.getElementById(triggerId);
        if (triggerBtn) {
            triggerBtn.addEventListener('click', function() {
                const modalId = modalTriggers[triggerId];
                const modal = document.getElementById(modalId);

                if (modal) {
                    if (modal.classList.contains('active')) {
                        closeModal(modal);
                    } else {
                        openModal(modal);
                    }
                }
            });
        }
    });

    // Add event listener to the close-details-modal button
    const closeDetailsBtn = document.querySelector('.close-details-modal');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', function() {
            const modal = document.getElementById('dcf-details-modal');
            closeModal(modal);
        });
    }

    // Close modal when clicking outside content
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });

    // Close modals with ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.DCF-modal.active');
            if (activeModal) {
                closeModal(activeModal);
            }
        }
    });
}

function openModal(modal) {
    // Add animation classes
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    // If it's the new DCF form, reset it
    if (modal.id === 'new-dcf-modal') {
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ========== Event Listeners ==========
function setupEventListeners() {
    // View DCF Details
    document.querySelectorAll('.DCF-view-details-btn, .DCF-icon-button[title="View Details"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            fetchDcfDetails(dcfId);
        });
    });

    // Edit DCF
    document.querySelectorAll('.DCF-edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            fetchDcfForEdit(dcfId);
        });
    });

    // Delete DCF
    document.querySelectorAll('.DCF-delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            const dcfNumber = this.closest('tr').querySelector('[data-label="DCF Number"]').textContent;
            openDeleteConfirmation(dcfId, dcfNumber);
        });
    });

    // Table filtering
    const searchInput = document.querySelector('.DCF-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterTable(this.value);
        });
    }

    // Status filter
    const statusFilter = document.querySelector('.DCF-filter-select');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterTableByStatus(this.value);
        });
    }

    // Refresh button
    const refreshBtn = document.querySelector('.DCF-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.querySelector('i').classList.add('fa-spin');

            // Simulate refresh delay
            setTimeout(() => {
                this.querySelector('i').classList.remove('fa-spin');
                location.reload();
            }, 1000);
        });
    }

    // Pagination
    document.querySelectorAll('.DCF-pagination-page, .DCF-pagination-prev, .DCF-pagination-next').forEach(btn => {
        if (!btn.classList.contains('disabled') && !btn.classList.contains('active')) {
            btn.addEventListener('click', function() {
                const page = this.getAttribute('data-page');
                if (page) {
                    // Get the current URL and update the page parameter
                    const url = new URL(window.location.href);
                    url.searchParams.set('page', page);
                    window.location.href = url.toString();
                }
            });
        }
    });
}

// ========== DCF Actions ==========
function fetchDcfDetails(dcfId) {
    const modal = document.getElementById('dcf-details-modal');
    const detailsContent = document.getElementById('dcf-details-content');

    // Show loading state
    detailsContent.innerHTML = `
        <div class="DCF-loading">
            <i class="fas fa-spinner"></i>
            <p>Loading DCF details...</p>
        </div>
    `;

    // Open modal
    openModal(modal);

    // Construct URL - use the correct URL pattern from urls.py
    const url = `/dcf/view-dcf/${dcfId}/`;
    console.log('Fetching DCF details from URL:', url); // Debug: Log the URL

    // Fetch DCF details
    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
        }
    })
    .then(response => {
        console.log('Response status:', response.status); // Debug: Log response status

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }

        // Check content type to ensure we're getting HTML
        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType); // Debug: Log content type

        return response.text();
    })
    .then(html => {
        console.log('Received HTML:', html); // Debug: Log the received HTML

        // Check if the HTML is empty or contains error messages
        if (!html || html.trim() === '') {
            detailsContent.innerHTML = `
                <div class="DCF-loading" style="color: var(--dcf-text);">
                    <i class="fas fa-info-circle" style="color: var(--dcf-primary); animation: none;"></i>
                    <p>No details available for this DCF.</p>
                </div>
            `;
            return;
        }

        // Set the HTML content directly
        detailsContent.innerHTML = html;

        // If there's an issue with the content, show a simplified version
        if (!detailsContent.innerHTML || detailsContent.innerHTML.trim() === '') {
            // Create a direct display of the raw HTML
            detailsContent.innerHTML = `
                <div class="DCF-details-grid">
                    <div class="DCF-details-section">
                        <h4>DCF Information</h4>
                        <div class="DCF-details-row">
                            <div class="DCF-details-item">
                                <span class="DCF-details-label">ID:</span>
                                <span class="DCF-details-value">${dcfId}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Debug: Check what was inserted
        console.log('Details content after setting HTML:', detailsContent.innerHTML);

        // Force a reflow to ensure content is displayed properly
        detailsContent.style.display = 'none';
        setTimeout(() => {
            detailsContent.style.display = '';
        }, 10);

        // Clean up the footer first - remove any previously added buttons
        const footer = modal.querySelector('.DCF-modal-footer');

        // Clear all buttons from the footer
        while (footer.firstChild) {
            footer.removeChild(footer.firstChild);
        }

        // Re-add the close button
        const newCloseButton = document.createElement('button');
        newCloseButton.className = 'DCF-button DCF-secondary-button';
        newCloseButton.textContent = 'Close';
        newCloseButton.addEventListener('click', function() {
            closeModal(modal);
        });
        footer.appendChild(newCloseButton);

        // Add edit button if DCF is editable
        const editBtn = detailsContent.querySelector('#dcf-can-edit');
        console.log('Edit button found:', editBtn); // Debug: Check if edit button is found

        if (editBtn && editBtn.value === 'True') {
            const editButton = document.createElement('button');
            editButton.className = 'DCF-button DCF-primary-button detail-edit-btn';
            editButton.setAttribute('data-id', dcfId);
            editButton.innerHTML = '<i class="fas fa-edit"></i> Edit DCF';

            editButton.addEventListener('click', function() {
                closeModal(modal);
                fetchDcfForEdit(dcfId);
            });

            footer.appendChild(editButton);
        }
    })
    .catch(error => {
        detailsContent.innerHTML = `
            <div class="DCF-loading" style="color: var(--dcf-rejected);">
                <i class="fas fa-exclamation-circle" style="color: var(--dcf-rejected); animation: none;"></i>
                <p>Error loading DCF details. Please try again.</p>
            </div>
        `;
        console.error('Error fetching DCF details:', error);
    });
}

function fetchDcfForEdit(dcfId) {
    const modal = document.getElementById('edit-dcf-modal');
    const form = document.getElementById('edit-dcf-form');

    // Set the form action - use the correct URL pattern from urls.py
    form.action = `/dcf/edit-dcf/${dcfId}/`;

    // Set the hidden DCF ID field
    document.getElementById('edit-dcf-id').value = dcfId;

    // Open modal
    openModal(modal);

    // Fetch DCF data - use the correct URL pattern from urls.py
    fetch(`/dcf/view-dcf/${dcfId}/?format=json`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Received data for editing:', data);

        // Populate form fields
        document.getElementById('edit-prepared-by').value = data.prepared_by || data.requisitioner;
        document.getElementById('edit-document-code').value = data.document_code;
        document.getElementById('edit-document-title').value = data.document_title;
        document.getElementById('edit-revision-number').value = data.revision_number;
        document.getElementById('edit-nature-of-changes').value = data.nature;
        document.getElementById('edit-effectivity-date').value = data.effectivity_date;
        document.getElementById('edit-details-input').value = data.details;
    })
    .catch(error => {
        showToast('Error loading DCF data: ' + error.message, 'error');
        console.error('Error fetching DCF data:', error);
    });
}

function openDeleteConfirmation(dcfId, dcfNumber) {
    const modal = document.getElementById('delete-dcf-modal');
    const dcfNumberSpan = document.getElementById('delete-dcf-number');
    const deleteForm = document.getElementById('delete-dcf-form');

    // Set DCF number in message
    dcfNumberSpan.textContent = dcfNumber;

    // Set form action - use the correct URL pattern from urls.py
    deleteForm.action = `/dcf/delete-dcf/${dcfId}/`;

    // Open modal
    openModal(modal);
}

// ========== Table Filtering ==========
function filterTable(query) {
    const table = document.querySelector('.DCF-table');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');

    query = query.toLowerCase();

    rows.forEach(row => {
        const dcfNumber = row.querySelector('td[data-label="DCF Number"]').textContent.toLowerCase();
        const title = row.querySelector('td[data-label="Document Title"]').textContent.toLowerCase();
        const code = row.querySelector('td[data-label="Document Code"]').textContent.toLowerCase();

        if (dcfNumber.includes(query) || title.includes(query) || code.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterTableByStatus(status) {
    const table = document.querySelector('.DCF-table');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const statusCell = row.querySelector('td[data-label="Status"] .DCF-status');
        if (statusCell) {
            const rowStatus = statusCell.classList.contains('DCF-status-on_process') ? 'on_process' :
                             statusCell.classList.contains('DCF-status-approved') ? 'approved' : 'rejected';

            if (status === 'all' || rowStatus === status) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// ========== Chart Initialization ==========
function initializeChart() {
    const ctx = document.getElementById('dcf-status-chart');
    if (!ctx) return;

    // Default period is 'this_week'

    // Initial empty data structure for the chart
    let chartData = {
        labels: [],
        datasets: [
            {
                label: 'On Process',
                data: [],
                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                borderColor: 'rgba(255, 193, 7, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'rgba(255, 193, 7, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            },
            {
                label: 'Approved',
                data: [],
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'rgba(76, 175, 80, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            },
            {
                label: 'Rejected',
                data: [],
                backgroundColor: 'rgba(244, 67, 54, 0.2)',
                borderColor: 'rgba(244, 67, 54, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'rgba(244, 67, 54, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }
        ]
    };

    // 3D Line chart configuration
    const config = {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Poppins',
                            size: 12
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#333',
                    bodyColor: '#333',
                    titleFont: {
                        family: 'Poppins',
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Poppins'
                    },
                    borderColor: '#e6e6e6',
                    borderWidth: 1,
                    caretSize: 8,
                    cornerRadius: 6,
                    boxPadding: 5,
                    displayColors: true
                },
                // Add 3D effect with custom plugin
                '3d': {
                    enabled: true,
                    depth: 40,
                    angle: 30
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Poppins'
                        },
                        padding: 10 // Add padding below the labels
                    },
                    afterFit: function(scale) {
                        // Add extra space below the x-axis
                        scale.height = scale.height + 20;
                    }
                },
                y: {
                    beginAtZero: false,
                    min: 1,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            family: 'Poppins'
                        },
                        precision: 0,
                        stepSize: 1
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            },
            elements: {
                line: {
                    borderWidth: 3,
                    // Create 3D effect with shadow
                    shadowOffsetX: 3,
                    shadowOffsetY: 3,
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.2)'
                }
            }
        }
    };

    // Initialize chart
    let chart;
    try {
        // Check if Chart.js is loaded
        if (typeof Chart !== 'undefined') {
            chart = new Chart(ctx, config);
        } else {
            console.error('Chart.js is not loaded');
            return;
        }
    } catch (error) {
        console.error('Error initializing chart:', error);
        return;
    }

    // Function to fetch chart data from the server
    function fetchChartData(period) {
        // Show loading state
        chart.data.labels = [];
        chart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        chart.update();

        // Fetch data from the server
        fetch(`/dcf/api/stats/chart/?period=${period}&user_only=true`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update chart with real data
            if (data && data.labels && data.datasets) {
                chart.data = data;
            } else {
                // Fallback to sample data if server doesn't return proper format
                generateSampleData(period, chart);
            }
            chart.update();

            // Show a toast notification
            const periodSelector = document.getElementById('chart-period-selector');
            const periodText = periodSelector ? periodSelector.options[periodSelector.selectedIndex].text : period;
            showToast('Chart updated for ' + periodText, 'info');

            // Restore chart wrapper opacity if it was changed for auto-refresh
            const chartWrapper = document.querySelector('.DCF-chart-wrapper');
            if (chartWrapper) {
                chartWrapper.style.opacity = '1';
            }
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);

            // Fallback to sample data on error
            generateSampleData(period, chart);
            chart.update();

            // Restore chart wrapper opacity even on error
            const chartWrapper = document.querySelector('.DCF-chart-wrapper');
            if (chartWrapper) {
                chartWrapper.style.opacity = '1';
            }

            showToast('Error loading chart data. Using sample data instead.', 'warning');
        });
    }

    // Function to generate sample data when server data is unavailable
    function generateSampleData(period, chart) {
        let labels = [];
        let onProcessData = [];
        let approvedData = [];
        let rejectedData = [];

        // Generate appropriate labels and data based on selected period
        if (period === 'this_week') {
            labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            onProcessData = [5, 8, 12, 7, 10, 3, 6];
            approvedData = [3, 5, 8, 13, 8, 5, 7];
            rejectedData = [2, 1, 3, 5, 2, 1, 2];
        } else if (period === 'this_month') {
            // Generate days of the current month
            const daysInMonth = 30; // Simplified for demo
            labels = Array.from({length: daysInMonth}, (_, i) => `${i+1}`);

            // Generate random data for the month
            for (let i = 0; i < daysInMonth; i++) {
                onProcessData.push(Math.floor(Math.random() * 15) + 1);
                approvedData.push(Math.floor(Math.random() * 12) + 1);
                rejectedData.push(Math.floor(Math.random() * 5) + 1);
            }
        } else if (period === 'quarterly') {
            // Generate months for the quarter
            labels = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

            // Generate data for each month
            onProcessData = [25, 30, 35, 40, 38, 42, 45, 48, 50, 47, 43, 40];
            approvedData = [20, 25, 30, 35, 33, 37, 40, 42, 45, 43, 38, 35];
            rejectedData = [5, 8, 10, 12, 15, 13, 11, 9, 7, 10, 12, 14];
        }

        // Update chart data
        chart.data.labels = labels;
        chart.data.datasets[0].data = onProcessData;
        chart.data.datasets[1].data = approvedData;
        chart.data.datasets[2].data = rejectedData;
    }

    // Fetch initial data
    fetchChartData('this_week');

    // Add event listener to period selector
    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', function() {
            const period = this.value;
            fetchChartData(period);
        });
    }

    // Auto-refresh is still enabled, but we're removing the indicator text

    // Set up auto-refresh every 5 minutes (300,000 ms)
    setInterval(() => {
        const currentPeriod = periodSelector ? periodSelector.value : 'this_week';

        // Add a subtle loading indicator to the chart container
        const chartWrapper = document.querySelector('.DCF-chart-wrapper');
        if (chartWrapper) {
            chartWrapper.style.opacity = '0.7';
            chartWrapper.style.transition = 'opacity 0.3s ease';
        }

        // Refresh indicator has been removed

        // Fetch updated data
        fetchChartData(currentPeriod);

        // Restore opacity after data is fetched (handled in fetchChartData's then() block)
    }, 300000); // 5 minutes
}

// ========== Toast Notifications ==========
function initializeToasts() {
    // Look for Django messages
    const djangoMessages = document.querySelectorAll('.django-message');
    djangoMessages.forEach(message => {
        const type = message.dataset.type || 'info';
        showToast(message.textContent, type);
        message.remove(); // Remove from DOM after displaying
    });
}

function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Set icon based on toast type
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

    // Add to container
    container.appendChild(toast);

    // Add animation
    toast.style.animation = `DCF-slide-in-right 0.3s ease, DCF-fade-out 0.3s ease ${duration - 300}ms forwards`;

    // Add close button functionality
    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        removeToast(toast);
    });

    // Add click event to the toast to dismiss it
    toast.addEventListener('click', function(e) {
        if (!e.target.closest('.close-btn')) {
            // Only dismiss if not clicking the close button (to avoid double dismissal)
            removeToast(toast);
        }
    });

    // Auto-remove after duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);

    // Return the toast element in case we need to reference it later
    return toast;
}

function removeToast(toast) {
    toast.style.animation = 'DCF-fade-out 0.3s ease';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// ========== Form Submission Handlers ==========
function setupFormSubmissionHandlers() {
    // Handle new DCF form submission
    const newDcfForm = document.getElementById('dcf-form');
    if (newDcfForm) {
        // Disable default browser validation
        newDcfForm.setAttribute('novalidate', 'novalidate');

        newDcfForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission

            // Validate all required fields
            let isValid = true;

            // Validate prepared_by
            const preparedBy = document.getElementById('prepared-by');
            if (!preparedBy.value.trim()) {
                isValid = false;
                preparedBy.value = document.querySelector('input[name="requisitioner_id"]').value;
                showToast('Prepared By field cannot be empty. Using default value.', 'warning');
            }

            // Validate document code
            const documentCode = document.getElementById('document-code');
            if (!documentCode.value.trim()) {
                isValid = false;
                showToast('Document Code is required', 'error');
                documentCode.focus();
            }

            // Validate document title
            const documentTitle = document.getElementById('document-title');
            if (!documentTitle.value.trim()) {
                isValid = false;
                showToast('Document Title is required', 'error');
                documentTitle.focus();
            }

            // Validate revision number
            const revisionNumber = document.getElementById('revision-number');
            if (!revisionNumber.value.trim()) {
                isValid = false;
                showToast('Revision Number is required', 'error');
                revisionNumber.focus();
            }

            // Validate nature of changes
            const natureOfChanges = document.getElementById('nature-of-changes');
            if (natureOfChanges.value === "" || natureOfChanges.selectedIndex === 0) {
                isValid = false;
                showToast('Nature of Changes is required', 'error');
                natureOfChanges.focus();
            }

            // Validate effectivity date
            const effectivityDate = document.getElementById('effectivity-date');
            if (!effectivityDate.value) {
                isValid = false;
                showToast('Effectivity Date is required', 'error');
                effectivityDate.focus();
            }

            // Validate details
            const details = document.getElementById('details-input');
            if (!details.value.trim()) {
                isValid = false;
                showToast('Details of Changes is required', 'error');
                details.focus();
            }

            // If all validations pass, submit the form
            if (isValid) {
                newDcfForm.submit();
            }
        });
    }

    // Handle edit DCF form submission
    const editDcfForm = document.getElementById('edit-dcf-form');
    if (editDcfForm) {
        // Disable default browser validation
        editDcfForm.setAttribute('novalidate', 'novalidate');

        editDcfForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission

            // Validate all required fields
            let isValid = true;

            // Validate prepared_by
            const preparedBy = document.getElementById('edit-prepared-by');
            if (!preparedBy.value.trim()) {
                isValid = false;
                preparedBy.value = document.querySelector('input[name="requisitioner_id"]').value;
                showToast('Prepared By field cannot be empty. Using default value.', 'warning');
            }

            // Validate document code
            const documentCode = document.getElementById('edit-document-code');
            if (!documentCode.value.trim()) {
                isValid = false;
                showToast('Document Code is required', 'error');
                documentCode.focus();
            }

            // Validate document title
            const documentTitle = document.getElementById('edit-document-title');
            if (!documentTitle.value.trim()) {
                isValid = false;
                showToast('Document Title is required', 'error');
                documentTitle.focus();
            }

            // Validate revision number
            const revisionNumber = document.getElementById('edit-revision-number');
            if (!revisionNumber.value.trim()) {
                isValid = false;
                showToast('Revision Number is required', 'error');
                revisionNumber.focus();
            }

            // Validate nature of changes
            const natureOfChanges = document.getElementById('edit-nature-of-changes');
            if (natureOfChanges.value === "" || natureOfChanges.selectedIndex === 0) {
                isValid = false;
                showToast('Nature of Changes is required', 'error');
                natureOfChanges.focus();
            }

            // Validate effectivity date
            const effectivityDate = document.getElementById('edit-effectivity-date');
            if (!effectivityDate.value) {
                isValid = false;
                showToast('Effectivity Date is required', 'error');
                effectivityDate.focus();
            }

            // Validate details
            const details = document.getElementById('edit-details-input');
            if (!details.value.trim()) {
                isValid = false;
                showToast('Details of Changes is required', 'error');
                details.focus();
            }

            // If all validations pass, submit the form
            if (isValid) {
                editDcfForm.submit();
            }
        });
    }
}

// ========== Check for Form Errors ==========
function checkForFormErrors() {
    // Check if there are any error parameters in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasErrors = urlParams.get('form_errors');

    if (hasErrors) {
        // Show a general error message
        showToast('There were errors in your form submission. Please check the fields and try again.', 'error');

        // Try to parse the error messages
        try {
            const errors = JSON.parse(decodeURIComponent(urlParams.get('errors') || '{}'));

            // Show each error as a toast
            Object.keys(errors).forEach(field => {
                const fieldErrors = errors[field];
                fieldErrors.forEach(error => {
                    showToast(`${field}: ${error}`, 'error');
                });
            });

            // Open the form modal if it exists
            const formType = urlParams.get('form_type');
            if (formType === 'new') {
                openModal(document.getElementById('new-dcf-modal'));
            } else if (formType === 'edit') {
                const dcfId = urlParams.get('dcf_id');
                if (dcfId) {
                    fetchDcfDetails(dcfId);
                }
            }
        } catch (e) {
            console.error('Error parsing form errors:', e);
        }

        // Remove the error parameters from the URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}