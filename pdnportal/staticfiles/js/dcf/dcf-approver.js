// DCF Approver JavaScript
// This script handles the approval-specific functionality

// Custom Chart.js plugin for 3D effect
const threeDimensionalPlugin = {
    id: '3d',
    beforeDraw: function(chart) {
        if (chart.config.options.plugins['3d'] && chart.config.options.plugins['3d'].enabled) {
            const ctx = chart.ctx;
            const depth = chart.config.options.plugins['3d'].depth || 20;

            // We're only adding 3D effect to the lines and points, not the x-axis area
            // This ensures no shading is added to the x-axis

            // For a true 3D effect, we'll add shadows to the chart elements
            // This is handled in the chart configuration via the elements.line and elements.point settings
        }
    }
};

// Register the plugin
if (typeof Chart !== 'undefined') {
    Chart.register(threeDimensionalPlugin);
}

document.addEventListener('DOMContentLoaded', function() {
    // Set up approver-specific event handlers
    setupApproverEventListeners();

    // Initialize approver chart
    initializeApproverChart();

    // Animate activity feed
    animateActivityFeed();
});

// ========== Approver Event Listeners ==========
function setupApproverEventListeners() {
    // Activity feed DCF links
    document.querySelectorAll('.DCF-activity-dcf').forEach(link => {
        link.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            openApprovalModal(dcfId);
        });
    });

    // Close DCF approval modal (JO-modal)
    const dcfApprovalModal = document.getElementById('dcf-approval-modal');
    if (dcfApprovalModal) {
        document.querySelectorAll('#dcf-approval-modal-close-btn, #dcf-approval-modal-close-footer').forEach(btn => {
            btn.addEventListener('click', function() {
                closeModal(dcfApprovalModal);
            });
        });
        
        // Also close when clicking outside the modal
        dcfApprovalModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    }

    // Close confirmation modal buttons (DCF-modal)
    document.querySelectorAll('.close-approval-modal, .DCF-modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.DCF-modal');
            closeModal(modal);
        });
    });

    // Close DCF details modal buttons
    document.querySelectorAll('#dcf-details-modal-close, #view-dcf-details-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = document.getElementById('dcf-details-modal');
            closeModal(modal);
        });
    });

    // Cancel approve button
    document.getElementById('cancel-approve-btn').addEventListener('click', function() {
        const approveModal = document.getElementById('approve-confirmation-modal');
        const approvalModal = document.getElementById('dcf-approval-modal');

        closeModal(approveModal);
        openModal(approvalModal);
    });

    // Cancel reject button
    document.getElementById('cancel-reject-btn').addEventListener('click', function() {
        const rejectModal = document.getElementById('reject-confirmation-modal');
        const approvalModal = document.getElementById('dcf-approval-modal');

        closeModal(rejectModal);
        openModal(approvalModal);
    });

    // Cancel cancel button
    document.getElementById('cancel-cancel-btn').addEventListener('click', function() {
        const cancelModal = document.getElementById('cancel-confirmation-modal');
        closeModal(cancelModal);
    });

    // Confirm approve button
    document.getElementById('confirm-approve-btn').addEventListener('click', function() {
        approveDcf();
    });

    // Confirm reject button
    document.getElementById('confirm-reject-btn').addEventListener('click', function() {
        const remarks = document.getElementById('rejection-remarks').value.trim();

        if (!remarks) {
            showToast('Please provide a reason for rejection', 'error');
            document.getElementById('rejection-remarks').focus();
            return;
        }

        rejectDcf(remarks);
    });

    // Confirm cancel button
    document.getElementById('confirm-cancel-btn').addEventListener('click', function() {
        const remarks = document.getElementById('cancellation-remarks').value.trim();

        if (!remarks) {
            showToast('Please provide a reason for cancellation', 'error');
            document.getElementById('cancellation-remarks').focus();
            return;
        }

        cancelDcf(remarks);
    });

    // Search functionality for Pending Approvals - AJAX-based
    let searchTimeout;
    const pendingSearchInput = document.getElementById('dcf-search-pending');
    if (pendingSearchInput) {
        pendingSearchInput.addEventListener('input', function() {
            // Clear previous timeout
            clearTimeout(searchTimeout);
            
            // Set a new timeout to avoid too many requests
            searchTimeout = setTimeout(() => {
                performSearch();
            }, 300); // Wait 300ms after user stops typing
        });
    }

    // Filter select functionality
    const filterSelect = document.querySelector('.DCF-filter-select');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            performSearch();
        });
    }

    // Search functionality for Recently Processed Requests
    const processedSearchInput = document.querySelector('.DCF-processed-requests .DCF-search-input');
    if (processedSearchInput) {
        processedSearchInput.addEventListener('keyup', function() {
            filterProcessedRequests();
        });
    }

    // Status filter for Recently Processed Requests
    const statusFilter = document.getElementById('processed-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterProcessedRequests();
        });
    }

    // Setup initial event listeners for table buttons
    setupTableEventListeners();
}

// Function to perform AJAX search and filter
function performSearch() {
    const searchQuery = document.getElementById('dcf-search-pending')?.value || '';
    const statusFilter = document.getElementById('dcf-status-filter')?.value || 'all';
    
    const tableWrapper = document.getElementById('dcf-table-wrapper');
    if (!tableWrapper) return;

    // Show loading indicator
    tableWrapper.style.opacity = '0.5';
    tableWrapper.style.pointerEvents = 'none';

    // Build URL with parameters
    const url = new URL(window.location.href);
    url.searchParams.set('search', searchQuery);
    if (statusFilter !== 'all') {
        url.searchParams.set('status', statusFilter);
    } else {
        url.searchParams.delete('status');
    }
    url.searchParams.delete('page'); // Reset to first page on new search

    // Fetch filtered data
    fetch(url.toString(), {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(html => {
        // Update table content
        tableWrapper.innerHTML = html;
        
        // Re-attach event listeners for new buttons
        setupTableEventListeners();
        
        // Restore table
        tableWrapper.style.opacity = '1';
        tableWrapper.style.pointerEvents = '';
        
        // Update URL without reloading page
        window.history.pushState({}, '', url.toString());
    })
    .catch(error => {
        console.error('Error fetching filtered data:', error);
        tableWrapper.style.opacity = '1';
        tableWrapper.style.pointerEvents = '';
        showToast('Error loading data. Please try again.', 'error');
    });
}

// Function to setup event listeners for table buttons
function setupTableEventListeners() {
    // Re-attach event listeners for view details buttons
    document.querySelectorAll('button[title="View Details"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            fetchDcfDetails(dcfId);
        });
    });

    // Re-attach event listeners for view & approve buttons
    document.querySelectorAll('.DCF-view-approval-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            openApprovalModal(dcfId);
        });
    });

    // Re-attach event listeners for cancel buttons
    document.querySelectorAll('.DCF-cancel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            openCancelConfirmation(dcfId);
        });
    });

    // Re-attach pagination link listeners
    document.querySelectorAll('.pagination-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const url = new URL(this.href);
            loadPage(url.search);
        });
    });
}

// Function to load a specific page
function loadPage(queryString) {
    const tableWrapper = document.getElementById('dcf-table-wrapper');
    if (!tableWrapper) return;

    // Show loading indicator
    tableWrapper.style.opacity = '0.5';
    tableWrapper.style.pointerEvents = 'none';

    const baseUrl = window.location.pathname;
    const url = baseUrl + queryString;

    fetch(url, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(html => {
        // Update table content
        tableWrapper.innerHTML = html;
        
        // Re-attach event listeners
        setupTableEventListeners();
        
        // Restore table
        tableWrapper.style.opacity = '1';
        tableWrapper.style.pointerEvents = '';
        
        // Update URL
        window.history.pushState({}, '', url);
        
        // Scroll to top of table
        tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    })
    .catch(error => {
        console.error('Error loading page:', error);
        tableWrapper.style.opacity = '1';
        tableWrapper.style.pointerEvents = '';
        showToast('Error loading data. Please try again.', 'error');
    });
}

// Function to filter processed requests based on search and status filter
function filterProcessedRequests() {
    const searchTerm = document.querySelector('.DCF-processed-requests .DCF-search-input')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('processed-status-filter')?.value || 'all';

    const processedTable = document.querySelector('.DCF-processed-requests .DCF-table tbody');
    const processedRows = processedTable.querySelectorAll('tr');

    processedRows.forEach(row => {
        const dcfNumber = row.querySelector('td[data-label="DCF Number"]')?.textContent.trim().toLowerCase() || '';
        const requisitioner = row.querySelector('td[data-label="Requisitioner"]')?.textContent.trim().toLowerCase() || '';
        const documentTitle = row.querySelector('td[data-label="Document Title"]')?.textContent.trim().toLowerCase() || '';
        const statusElement = row.querySelector('td[data-label="Status"] .DCF-status');
        const status = statusElement ? statusElement.className.includes('approved') ? 'approved' : 'rejected' : '';

        const matchesSearch = dcfNumber.includes(searchTerm) ||
                             requisitioner.includes(searchTerm) ||
                             documentTitle.includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        if (matchesSearch && matchesStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ========== Modal Utilities ==========
function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

function showToast(message, type = 'success') {
    // Use the global createToast function from script2.js
    if (typeof createToast === 'function') {
        createToast(message, type, 5000);
    } else {
        console.error('createToast function not found. Make sure script2.js is loaded.');
        // Fallback to alert if the function is not available
        alert(message);
    }
}

// ========== Approval Modal ==========
function openApprovalModal(dcfId, readOnly = false) {
    const modal = document.getElementById('dcf-approval-modal');
    const detailsContent = document.getElementById('approval-details-content');

    // Show loading state
    detailsContent.innerHTML = `
        <div class="DCF-loading">
            <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
            <p>Loading DCF details...</p>
        </div>
    `;

    // Open modal
    openModal(modal);

    // URL for fetching data - different for read-only vs. approval mode
    const url = readOnly ?
        `/dcf/view-dcf/${dcfId}/` :
        `/dcf/approve-modal/${dcfId}/`;

    // Fetch DCF details
    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(html => {
        detailsContent.innerHTML = html;

        // If not in read-only mode and DCF is still in process, setup approval actions
        if (!readOnly) {
            setupApprovalActions(dcfId);
        }
    })
    .catch(error => {
        detailsContent.innerHTML = `
            <div class="DCF-error text-center p-5">
                <i class="fas fa-exclamation-circle fa-2x mb-3 text-danger"></i>
                <p>Error loading DCF details. Please try again.</p>
            </div>
        `;
        console.error('Error fetching DCF details:', error);
    });
}

function setupApprovalActions(dcfId) {
    // Check if DCF is still in process
    const dcfStatus = document.getElementById('dcf-status-value');
    if (!dcfStatus || dcfStatus.value !== 'on_process') return;

    // Get approve and reject buttons
    const approveBtn = document.getElementById('approve-dcf-btn');
    const rejectBtn = document.getElementById('reject-dcf-btn');

    if (approveBtn) {
        approveBtn.addEventListener('click', function() {
            const remarks = document.getElementById('approval-remarks').value;
            openApproveConfirmation(dcfId, remarks);
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            const remarks = document.getElementById('approval-remarks').value.trim();
            if (!remarks) {
                showToast('Please provide a reason for rejection', 'error');
                document.getElementById('approval-remarks').focus();
                return;
            }
            openRejectConfirmation(dcfId, remarks);
        });
    }
}

function openApproveConfirmation(dcfId, remarks) {
    const approveModal = document.getElementById('approve-confirmation-modal');
    const approvalModal = document.getElementById('dcf-approval-modal');
    const dcfNumber = document.querySelector('#detail-dcf-number').textContent;

    // Set DCF number in confirmation message
    document.getElementById('approve-dcf-confirm').textContent = dcfNumber;

    // Set up form
    const form = document.getElementById('approve-form');
    form.action = `/dcf/approve/${dcfId}/`;
    document.getElementById('approve-remarks-hidden').value = remarks;

    // Close approval modal and open confirmation
    closeModal(approvalModal);
    openModal(approveModal);
}

function openRejectConfirmation(dcfId, remarks) {
    const rejectModal = document.getElementById('reject-confirmation-modal');
    const approvalModal = document.getElementById('dcf-approval-modal');
    const dcfNumber = document.querySelector('#detail-dcf-number').textContent;

    // Set DCF number in confirmation message
    document.getElementById('reject-dcf-confirm').textContent = dcfNumber;

    // Set up form
    const form = document.getElementById('reject-form');
    form.action = `/dcf/reject/${dcfId}/`;
    document.getElementById('rejection-remarks').value = remarks;
    document.getElementById('reject-remarks-hidden').value = remarks;

    // Close approval modal and open confirmation
    closeModal(approvalModal);
    openModal(rejectModal);
}

function openCancelConfirmation(dcfId) {
    const cancelModal = document.getElementById('cancel-confirmation-modal');
    const dcfNumber = document.querySelector(`button[data-id="${dcfId}"]`).closest('tr').querySelector('td[data-label="DCF Number"]').textContent.trim();

    // Set DCF number in confirmation message
    document.getElementById('cancel-dcf-confirm').textContent = dcfNumber;

    // Set up form
    const form = document.getElementById('cancel-form');
    form.action = `/dcf/cancel-approval/${dcfId}/`;

    // Open confirmation modal
    openModal(cancelModal);
}

function approveDcf() {
    // Submit approve form
    const form = document.getElementById('approve-form');
    const approveBtn = document.getElementById('confirm-approve-btn');

    // Show loading state
    approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    approveBtn.disabled = true;

    // Submit form
    form.submit();
}

function rejectDcf(remarks) {
    // Get updated remarks from the textarea
    const rejectRemarksHidden = document.getElementById('reject-remarks-hidden');
    rejectRemarksHidden.value = remarks;

    // Submit reject form
    const form = document.getElementById('reject-form');
    const rejectBtn = document.getElementById('confirm-reject-btn');

    // Show loading state
    rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    rejectBtn.disabled = true;

    // Submit form
    form.submit();
}

function cancelDcf(remarks) {
    // Get updated remarks from the textarea
    const cancelRemarksHidden = document.getElementById('cancel-remarks-hidden');
    cancelRemarksHidden.value = remarks;

    // Submit cancel form
    const form = document.getElementById('cancel-form');
    const cancelBtn = document.getElementById('confirm-cancel-btn');

    // Show loading state
    cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    cancelBtn.disabled = true;

    // Submit form
    form.submit();
}

// ========== UI Enhancements ==========
function animateActivityFeed() {
    const activityItems = document.querySelectorAll('.DCF-activity-item');

    activityItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, 100 * index);
    });
}

// ========== Chart Initialization ==========
function initializeApproverChart() {
    const ctx = document.getElementById('dcf-approval-chart');
    if (!ctx) return;

    // Get initial data from the page
    const pendingCount = parseInt(document.querySelector('.DCF-process .DCF-stats-number').textContent) || 0;
    const approvedCount = parseInt(document.querySelector('.DCF-approved .DCF-stats-number').textContent) || 0;
    const rejectedCount = parseInt(document.querySelector('.DCF-rejected .DCF-stats-number').textContent) || 0;

    // Initial empty data structure for the chart
    const data = {
        labels: [],
        datasets: [
            {
                label: 'On Process',
                data: [],
                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                borderColor: 'rgba(255, 193, 7, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: false,
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
                fill: false,
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
                fill: false,
                pointBackgroundColor: 'rgba(244, 67, 54, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }
        ]
    };

    // Chart configuration for 3D line chart
    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
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
                // 3D effect is handled by our custom plugin
                // Enable our custom 3D plugin
                '3d': {
                    enabled: true,
                    depth: 40,
                    angle: 30
                }
            },
            elements: {
                line: {
                    tension: 0.4, // Curved lines for 3D effect
                    fill: false,  // No fill under the line
                    borderWidth: 3,
                    // Create 3D effect with shadow
                    shadowOffsetX: 3,
                    shadowOffsetY: 3,
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.2)'
                },
                point: {
                    radius: 6,
                    hoverRadius: 8,
                    borderWidth: 2,
                    backgroundColor: 'white',
                    // Add shadow to points for 3D effect
                    shadowOffsetX: 2,
                    shadowOffsetY: 2,
                    shadowBlur: 5,
                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false, // Remove grid lines on x-axis
                        drawBorder: true,
                        drawOnChartArea: false, // Don't draw grid on chart area
                        drawTicks: true,
                        color: 'rgba(0, 0, 0, 0)'
                    },
                    ticks: {
                        font: {
                            family: 'Poppins',
                            size: 12
                        },
                        padding: 10 // Add space below x-axis labels
                    }
                },
                y: {
                    grid: {
                        display: true,
                        drawBorder: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            family: 'Poppins',
                            size: 12
                        },
                        stepSize: 1, // Ensure y-axis uses whole numbers
                        beginAtZero: true
                    },
                    // We'll handle the max value dynamically in the update function
                }
            },
            animation: {
                delay: function(context) {
                    return context.dataIndex * 200;
                },
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    };

    // Initialize chart
    const chart = new Chart(ctx, config);

    // Function to fetch chart data
    function fetchChartData(period) {
        // Add subtle loading effect to chart
        const chartWrapper = document.querySelector('.DCF-chart-wrapper');
        if (chartWrapper) {
            chartWrapper.style.opacity = '0.7';
            chartWrapper.style.transition = 'opacity 0.3s ease';
        }

        // Fetch stats for selected period
        fetch(`/dcf/api/stats/chart/?period=${period}`, {
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
            chart.data = data;

            // Find the maximum value in all datasets
            let maxValue = 0;
            if (data && data.datasets) {
                data.datasets.forEach(dataset => {
                    if (dataset.data && dataset.data.length > 0) {
                        const dataMax = Math.max(...dataset.data);
                        maxValue = Math.max(maxValue, dataMax);
                    }
                });
            }

            // Set the y-axis max to be exactly 1 unit higher than the highest data point
            chart.options.scales.y.max = maxValue + 1;

            // Update the chart with the new data and options
            chart.update();

            // Restore chart opacity
            if (chartWrapper) {
                chartWrapper.style.opacity = '1';
            }
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);

            // Restore chart opacity even on error
            if (chartWrapper) {
                chartWrapper.style.opacity = '1';
            }

            showToast('Error loading chart data. Please try again.', 'error');
        });
    }

    // Period selector event
    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        // Fetch initial data immediately
        setTimeout(() => {
            fetchChartData(periodSelector.value);
        }, 100);

        // Add change event listener
        periodSelector.addEventListener('change', function() {
            const period = this.value;
            fetchChartData(period);
        });
    }

    // Set up auto-refresh every 5 minutes (300,000 ms)
    setInterval(() => {
        const currentPeriod = periodSelector ? periodSelector.value : 'this_month';

        // Add a subtle loading indicator to the chart container
        const chartWrapper = document.querySelector('.DCF-chart-wrapper');
        if (chartWrapper) {
            chartWrapper.style.opacity = '0.7';
            chartWrapper.style.transition = 'opacity 0.3s ease';
        }

        // Fetch updated data
        fetchChartData(currentPeriod);
    }, 300000); // 5 minutes
}

// ========== DCF Details Modal Functions ==========
function fetchDcfDetails(dcfId) {
    console.log('fetchDcfDetails called with DCF ID:', dcfId);
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

    // Fetch DCF details
    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }

        // Check content type to ensure we're getting HTML
        const contentType = response.headers.get('content-type');

        return response.text();
    })
    .then(html => {
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

        // Force a reflow to ensure content is displayed properly
        detailsContent.style.display = 'none';
        setTimeout(() => {
            detailsContent.style.display = '';
        }, 10);

        // Clean up the footer first - remove any previously added buttons
        const footer = modal.querySelector('.JO-modal-footer');

        // Clear all buttons from the footer
        while (footer.firstChild) {
            footer.removeChild(footer.firstChild);
        }

        // Add close button to footer
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn btn-outline';
        closeButton.id = 'view-dcf-details-close';
        closeButton.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i> Close';

        closeButton.addEventListener('click', function() {
            closeModal(modal);
        });

        footer.appendChild(closeButton);

    })
    .catch(error => {
        console.error('Error fetching DCF details:', error);
        detailsContent.innerHTML = `
            <div class="DCF-loading" style="color: var(--dcf-text);">
                <i class="fas fa-exclamation-triangle" style="color: #f44336; animation: none;"></i>
                <p>Error loading DCF details. Please try again.</p>
                <p style="font-size: 0.875rem; color: #666;">${error.message}</p>
            </div>
        `;

        // Add close button even on error
        const footer = modal.querySelector('.JO-modal-footer');
        while (footer.firstChild) {
            footer.removeChild(footer.firstChild);
        }

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn btn-outline';
        closeButton.id = 'view-dcf-details-close';
        closeButton.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i> Close';

        closeButton.addEventListener('click', function() {
            closeModal(modal);
        });

        footer.appendChild(closeButton);
    });
}