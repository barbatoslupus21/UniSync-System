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
    // View & Approve buttons
    document.querySelectorAll('.DCF-view-approval-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            openApprovalModal(dcfId);
        });
    });

    // Standard view details buttons
    document.querySelectorAll('.DCF-icon-button[title="View Details"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            openApprovalModal(dcfId, true); // read-only mode
        });
    });

    // Activity feed DCF links
    document.querySelectorAll('.DCF-activity-dcf').forEach(link => {
        link.addEventListener('click', function() {
            const dcfId = this.getAttribute('data-id');
            openApprovalModal(dcfId);
        });
    });

    // Close approval modal buttons
    document.querySelectorAll('.close-approval-modal, .DCF-modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.DCF-modal');
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

    // Search functionality for Pending Approvals
    const pendingSearchInput = document.querySelector('.DCF-approval-requests .DCF-search-input');
    if (pendingSearchInput) {
        pendingSearchInput.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            const pendingTable = document.querySelector('.DCF-approval-requests .DCF-table tbody');
            const pendingRows = pendingTable.querySelectorAll('tr');

            pendingRows.forEach(row => {
                const dcfNumber = row.querySelector('td[data-label="DCF Number"]')?.textContent.trim().toLowerCase() || '';
                const requisitioner = row.querySelector('td[data-label="Requisitioner"]')?.textContent.trim().toLowerCase() || '';
                const documentTitle = row.querySelector('td[data-label="Document Title"]')?.textContent.trim().toLowerCase() || '';
                const documentCode = row.querySelector('td[data-label="Document Code"]')?.textContent.trim().toLowerCase() || '';
                const nature = row.querySelector('td[data-label="Nature"]')?.textContent.trim().toLowerCase() || '';

                if (dcfNumber.includes(searchTerm) ||
                    requisitioner.includes(searchTerm) ||
                    documentTitle.includes(searchTerm) ||
                    documentCode.includes(searchTerm) ||
                    nature.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
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
                fill: false, // Remove shading below the chart
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
                fill: false, // Remove shading below the chart
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
                fill: false, // Remove shading below the chart
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

            // Show a toast notification
            const periodSelector = document.getElementById('chart-period-selector');
            const periodText = periodSelector ? periodSelector.options[periodSelector.selectedIndex].text : period;
            showToast('Chart updated for ' + periodText, 'info');
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