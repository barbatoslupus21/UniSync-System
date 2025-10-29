document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    setupEventListeners();
    initializeChart();

    fetchChartData('6month');
    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', function() {
            fetchChartData(this.value);
        });
    }

    // Initialize toast styling
    addToastStyles();

    // Ensure the empty state message is properly positioned
    const pendingEmptyState = document.getElementById('pending-empty-state');
    if (pendingEmptyState) {
        pendingEmptyState.style.display = 'flex';
    }

    // Debug logging for modal elements
    console.log('DOM loaded, checking modal elements...');
    const newRequestBtn = document.getElementById('new-request-btn');
    const newJobOrderModal = document.getElementById('new-job-order-modal');
    console.log('New Request Button:', newRequestBtn);
    console.log('New Job Order Modal:', newJobOrderModal);

    // Auto-search functionality for search input
    const searchInput = document.querySelector('.JO-search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                // Submit the form automatically when user stops typing
                const form = searchInput.closest('form');
                if (form) {
                    form.submit();
                }
            }, 500); // Wait 500ms after user stops typing
        });
    }
});

// ========================================================================
// Chart Functionality
// ========================================================================

let joStatsChart = null;

function initializeChart() {
    const ctx = document.getElementById('jo-stats-chart').getContext('2d');

    joStatsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Green JOs',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(76, 175, 80, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    data: []
                },
                {
                    label: 'Yellow JOs',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderColor: 'rgba(255, 193, 7, 1)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(255, 193, 7, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    data: []
                },
                {
                    label: 'White JOs',
                    backgroundColor: 'rgba(144, 164, 174, 0.1)',
                    borderColor: 'rgba(144, 164, 174, 1)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(144, 164, 174, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    data: []
                },
                {
                    label: 'Orange JOs',
                    backgroundColor: 'rgba(255, 87, 34, 0.1)',
                    borderColor: 'rgba(255, 87, 34, 1)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(255, 87, 34, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    data: []
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 15,
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItem) {
                            return tooltipItem[0].label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

function fetchChartData(period) {
    const chartWrapper = document.querySelector('.JO-chart-wrapper');
    chartWrapper.classList.add('loading');

    if (!document.getElementById('chart-loading-styles')) {
        const style = document.createElement('style');
        style.id = 'chart-loading-styles';
        style.textContent = `
            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .JO-chart-wrapper.loading::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(255, 255, 255, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 5;
            }

            .JO-chart-wrapper.loading::after {
                content: '';
                position: absolute;
                top: calc(50% - 20px);
                left: calc(50% - 20px);
                width: 40px;
                height: 40px;
                border: 3px solid rgba(51, 102, 255, 0.3);
                border-radius: 50%;
                border-top-color: #3366ff;
                animation: rotate 1s linear infinite;
                z-index: 6;
            }
        `;
        document.head.appendChild(style);
    }

    fetch(`/joborder/chart-data/${period}/`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        updateChart(data);
        chartWrapper.classList.remove('loading');
    })
    .catch(error => {
        console.error('Error fetching chart data:', error);

        chartWrapper.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>Failed to load chart data. Please try again.</p>
                <button class="JO-button JO-primary-button" onclick="fetchChartData('${period}')">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;

        chartWrapper.classList.remove('loading');
    });
}

function updateChart(data) {
    joStatsChart.data.labels = data.labels;

    // Calculate total JO count for each month
    const totalData = data.labels.map((_, index) => {
        return data.green[index] + data.yellow[index] + data.white[index] + data.orange[index];
    });

    // Find the maximum value for y-axis
    const maxValue = Math.max(...totalData);
    const yAxisMax = maxValue > 0 ? maxValue + 1 : 5; // Add 1 to the highest value or default to 5

    // Update chart data
    joStatsChart.data.datasets[0].data = data.green;
    joStatsChart.data.datasets[1].data = data.yellow;
    joStatsChart.data.datasets[2].data = data.white;
    joStatsChart.data.datasets[3].data = data.orange;

    // Update y-axis max value
    joStatsChart.options.scales.y.max = yAxisMax;
    joStatsChart.options.scales.y.ticks.stepSize = 1;

    // Update tooltip to show percentage of total
    joStatsChart.options.plugins.tooltip.callbacks = {
        title: function(context) {
            const index = context[0].dataIndex;
            const total = totalData[index];
            return `Total JO: ${total}`;
        },
        label: function(context) {
            const index = context.dataIndex;
            const value = context.raw;
            const total = totalData[index];

            if (value === 0) {
                return `${context.dataset.label}: ${value}`;
            } else {
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${context.dataset.label}: ${value} (${percentage}%)`;
            }
        }
    };

    joStatsChart.update({
        duration: 800,
        easing: 'easeOutBounce'
    });
}

// ========================================================================
// Animations
// ========================================================================

function initializeAnimations() {
    const statsCards = document.querySelectorAll('.JO-stats-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    statsCards.forEach(card => {
        observer.observe(card);
    });

    const tableRows = document.querySelectorAll('.JO-table tbody tr');
    tableRows.forEach((row, index) => {
        row.style.opacity = '0';
        setTimeout(() => {
            row.style.opacity = '1';
            row.style.animation = `JO-row-appear 0.5s ease-out forwards ${index * 0.1}s`;
        }, 300);
    });

    const pendingItems = document.querySelectorAll('.JO-pending-item');
    pendingItems.forEach((item, index) => {
        item.style.opacity = '0';
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.animation = `JO-fade-in 0.5s ease-out forwards ${index * 0.1}s`;
        }, 300);
    });
}

// ========================================================================
// Modal Functions - FIXED VERSION
// ========================================================================

function openModal(modal) {
    if (!modal) {
        console.error('Modal element not found');
        return;
    }

    console.log('Opening modal:', modal.id); // Debug log

    // Add the active class to show the modal
    modal.classList.add('active');

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    // Special handling for the job order modal
    if (modal.id === 'new-job-order-modal') {
        const form = document.getElementById('job-order-form');
        if (form) form.reset();

        // Default to Green category
        const greenCategory = document.querySelector('input[value="green"]');
        if (greenCategory) {
            greenCategory.checked = true;
            toggleNatureOptions('green');
        }

        // Set requestor field to current user's name
        const requestorInput = document.getElementById('requestor-input');
        if (requestorInput && requestorInput.value === '') {
            const userName = document.querySelector('.user-name')?.textContent.trim();
            if (userName) {
                requestorInput.value = userName;
            }
        }

        // Hide complaint field initially
        const complaintField = document.querySelector('.JO-complaint-field');
        if (complaintField) {
            complaintField.style.display = 'none';
            document.getElementById('complaint-input').removeAttribute('required');
        }
    }
}

function closeModal(modal) {
    if (!modal) {
        console.error('Modal element not found');
        return;
    }

    console.log('Closing modal:', modal.id); // Debug log

    // Remove the active class to hide the modal
    modal.classList.remove('active');

    // Restore body scrolling
    document.body.style.overflow = '';
}

// ========================================================================
// Event Listeners - ENHANCED VERSION
// ========================================================================

function setupEventListeners() {
    // Set up modal event listeners first
    setupModalEventListeners();

    // View Details buttons
    const viewDetailsButtons = document.querySelectorAll('.JO-view-details-btn, .JO-icon-button[title="View Details"]');
    viewDetailsButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const joId = this.dataset.id;
            const joNumber = this.dataset.number || joId;
            if (joId) {
                fetchJobOrderDetails(joId, joNumber);
            } else {
                createToast('Cannot find job order ID', 'error');
            }
        });
    });

    // Pending item click to view details
    const pendingItems = document.querySelectorAll('.JO-pending-item');
    pendingItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const joId = this.dataset.id;
            const joNumber = this.dataset.number || joId;
            if (joId) {
                fetchJobOrderDetails(joId, joNumber);
            } else {
                createToast('Cannot find job order ID', 'error');
            }
        });
    });

    // Close Transaction buttons in the table
    const closeTransactionButtons = document.querySelectorAll('.JO-icon-button[title="Close Transaction"]');
    closeTransactionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const joId = this.dataset.id;
            const joNumber = this.dataset.number || joId;
            if (joId) {
                confirmCloseTransaction(joId, joNumber);
            } else {
                createToast('Cannot find job order ID', 'error');
            }
        });
    });

    // Review Job Order buttons
    const reviewJobOrderButtons = document.querySelectorAll('.jo-review-btn');
    reviewJobOrderButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const joId = this.dataset.id;
            const joNumber = this.dataset.number || joId;
            if (joId) {
                openReviewModal(joId, joNumber);
            } else {
                createToast('Cannot find job order ID', 'error');
            }
        });
    });

    // Set Date buttons (for maintenance personnel)
    const setDateButtons = document.querySelectorAll('.jo-set-date-btn');
    setDateButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const joId = this.dataset.id;
            const joNumber = this.dataset.number || joId;
            if (joId) {
                openSetDateModal(joId, joNumber);
            } else {
                createToast('Cannot find job order ID', 'error');
            }
        });
    });

    // Cancel confirmation
    const cancelConfirmationBtn = document.getElementById('cancel-confirmation');
    if (cancelConfirmationBtn) {
        cancelConfirmationBtn.addEventListener('click', function() {
            closeModal(document.getElementById('confirm-cancel-modal'));
        });
    }

    // Close transaction cancel button
    const closeConfirmationCancelBtn = document.getElementById('close-confirmation-cancel');
    if (closeConfirmationCancelBtn) {
        closeConfirmationCancelBtn.addEventListener('click', function() {
            closeModal(document.getElementById('confirm-close-modal'));
        });
    }

    // Hold request cancel button
    const holdConfirmationCancelBtn = document.getElementById('hold-confirmation-cancel');
    if (holdConfirmationCancelBtn) {
        holdConfirmationCancelBtn.addEventListener('click', function() {
            closeModal(document.getElementById('confirm-hold-modal'));
        });
    }

    // Confirm hold button
    const confirmHoldBtn = document.getElementById('confirm-hold-btn');
    if (confirmHoldBtn) {
        confirmHoldBtn.addEventListener('click', function() {
            const joId = this.getAttribute('data-id');
            const remarks = document.getElementById('hold-remarks').value.trim();
            processHoldRequest(joId, remarks);
        });
    }

    // Submit Request
    const submitRequestBtn = document.getElementById('submit-request');
    if (submitRequestBtn) {
        submitRequestBtn.addEventListener('click', function(e) {
            e.preventDefault();

            // First check if user has an approver assigned
            fetch('/joborder/check-approver/', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.has_approver) {
                    // User has approver, proceed with form validation and submission
                    if (validateJobOrderForm()) {
                        this.classList.add('loading');
                        this.textContent = '';

                        const form = document.getElementById('job-order-form');
                        const formData = new FormData(form);

                        fetch(form.action, {
                            method: 'POST',
                            body: formData,
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Server responded with an error');
                            }
                            return response.json();
                        })
                        .then(data => {
                            this.classList.remove('loading');
                            this.textContent = 'Submit Request';

                            if (data.status === 'success') {
                                closeModal(document.getElementById('new-job-order-modal'));
                                createToast(data.message || 'Job Order request submitted successfully!', 'success');

                                form.reset();

                                setTimeout(() => {
                                    window.location.reload();
                                }, 1500);
                            } else {
                                createToast(data.message || 'Error submitting job order', 'error');
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);

                            this.classList.remove('loading');
                            this.textContent = 'Submit Request';

                            createToast('An error occurred while submitting the request. Please try again.', 'error');
                        });
                    }
                } else {
                    // User doesn't have approver assigned
                    createToast(data.message || 'Requestor must have an approver assigned before submitting a job order request. Please contact your administrator.', 'error');
                }
            })
            .catch(error => {
                console.error('Error checking approver:', error);
                createToast('Unable to verify approver assignment. Please try again.', 'error');
            });
        });
    }

    const categoryInputs = document.querySelectorAll('.JO-category-input');
    categoryInputs.forEach(input => {
        input.addEventListener('change', function() {
            toggleNatureOptions(this.value);

            const complaintField = document.querySelector('.JO-complaint-field');
            if (this.value === 'orange') {
                complaintField.style.display = 'block';
                document.getElementById('complaint-input').setAttribute('required', 'required');
            } else {
                complaintField.style.display = 'none';
                document.getElementById('complaint-input').removeAttribute('required');
            }
        });
    });

    const refreshBtn = document.querySelector('.JO-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.querySelector('i').classList.add('JO-rotating');

            // Add rotation animation if not exists
            if (!document.getElementById('rotation-style')) {
                const style = document.createElement('style');
                style.id = 'rotation-style';
                style.textContent = `
                    @keyframes JO-rotate {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .JO-rotating {
                        animation: JO-rotate 1s linear infinite;
                    }
                `;
                document.head.appendChild(style);
            }

            setTimeout(() => {
                this.querySelector('i').classList.remove('JO-rotating');
                createToast('Approval requests refreshed', 'info');
            }, 1000);
        });
    }

    // Search is now handled by form submission (server-side)

    // Confirmation modal buttons
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', function() {
            const joId = this.getAttribute('data-id');
            const remarks = document.getElementById('cancel-remarks').value;
            processCancelJobOrder(joId, remarks);
        });
    }

    const confirmCloseBtn = document.getElementById('confirm-close-btn');
    if (confirmCloseBtn) {
        confirmCloseBtn.addEventListener('click', function() {
            const joId = this.getAttribute('data-id');
            const remarks = document.getElementById('close-remarks').value;
            processCloseTransaction(joId, remarks);
        });
    }
}

// Enhanced modal event listener setup with better error handling
function setupModalEventListeners() {
    // New Request button
    const newRequestBtn = document.getElementById('new-request-btn');
    const newJobOrderModal = document.getElementById('new-job-order-modal');

    if (newRequestBtn && newJobOrderModal) {
        newRequestBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('New Request button clicked'); // Debug log
            openModal(newJobOrderModal);
        });
        console.log('New Request button event listener attached');
    } else {
        console.error('New Request button or modal not found:', {
            button: !!newRequestBtn,
            modal: !!newJobOrderModal
        });
    }

    // Close buttons
    const closeButtons = document.querySelectorAll('.JO-modal-close, #cancel-request, .close-details-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = button.closest('.JO-modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });

    // Click outside modal to close
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('JO-modal')) {
            closeModal(e.target);
        }
    });

    // ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.JO-modal.active');
            if (activeModal) {
                closeModal(activeModal);
            }
        }
    });

    // Category change event listeners
    const categoryInputs = document.querySelectorAll('.JO-category-input');
    categoryInputs.forEach(input => {
        input.addEventListener('change', function() {
            toggleNatureOptions(this.value);
        });
    });
}

// ========================================================================
// Helper Functions
// ========================================================================

function toggleNatureOptions(category) {
    // Hide all nature options first
    document.querySelectorAll('.JO-nature-options').forEach(el => {
        el.style.display = 'none';
    });

    // Show the selected category's nature options
    const selectedOptions = document.querySelector(`.JO-nature-options.JO-nature-${category}`);
    if (selectedOptions) {
        selectedOptions.style.display = 'block';
    }

    // Handle complaint field for orange category
    const complaintField = document.querySelector('.JO-complaint-field');
    if (complaintField) {
        if (category === 'orange') {
            complaintField.style.display = 'block';
        } else {
            complaintField.style.display = 'none';
        }
    }
}

function validateJobOrderForm() {
    const form = document.getElementById('job-order-form');

    const requestorInput = form.querySelector('input[name="requestor"]');
    if (!requestorInput || !requestorInput.value.trim()) {
        createToast('Please enter the requestor name', 'error');
        if (requestorInput) requestorInput.focus();
        return false;
    }

    const requestorLineSelect = form.querySelector('select[name="line"]');
    if (!requestorLineSelect || !requestorLineSelect.value) {
        createToast('Please select the requestor line', 'error');
        if (requestorLineSelect) requestorLineSelect.focus();
        return false;
    }

    const categorySelected = form.querySelector('input[name="jo-category"]:checked');
    if (!categorySelected) {
        createToast('Please select a JO category', 'error');
        return false;
    }

    const toolingSelected = form.querySelector('input[name="tooling"]:checked');
    if (!toolingSelected) {
        createToast('Please select a tooling', 'error');
        return false;
    }

    const natureSelected = form.querySelector('input[name="nature"]:checked');
    if (!natureSelected) {
        createToast('Please select a nature of change', 'error');
        return false;
    }

    if (categorySelected.value === 'orange') {
        const complaint = form.querySelector('textarea[name="complaint"]');
        if (!complaint.value.trim()) {
            createToast('Please specify the complaint for Orange category', 'error');
            complaint.focus();
            return false;
        }
    }

    const details = form.querySelector('textarea[name="details"]');
    if (!details.value.trim()) {
        createToast('Please provide details for the job order', 'error');
        details.focus();
        return false;
    }

    return true;
}

// ========================================================================
// Job Order Details Modal Functionality
// ========================================================================

function fetchJobOrderDetails(joId, joNumber) {
    const detailsModal = document.getElementById('jo-details-modal');
    openModal(detailsModal);

    // Show loading spinner
    document.getElementById('jo-details-content').innerHTML = `
        <div class="JO-loading text-center p-5">
            <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
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
                <div class="JO-error-message text-center p-5">
                    <i class="fas fa-exclamation-circle fa-2x text-danger mb-3"></i>
                    <p>${data.message || 'Failed to load job order details'}</p>
                    <button class="JO-button JO-primary-button mt-3 retry-fetch-btn" data-id="${joId}" data-number="${joNumber}">
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
            <div class="JO-error-message text-center p-5">
                <i class="fas fa-exclamation-circle fa-2x text-danger mb-3"></i>
                <p>An error occurred while loading the job order details: ${error.message}</p>
                <button class="JO-button JO-primary-button mt-3 retry-fetch-btn" data-id="${joId}" data-number="${joNumber}">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;

        document.querySelector('.retry-fetch-btn').addEventListener('click', function() {
            fetchJobOrderDetails(joId, joNumber);
        });
    });
}

function renderJobOrderDetails(data) {
    const canCancelJO = data.jo_status === 'Routing' && data.is_creator === true;
    // Close Transaction button visible for Completed, Checked, or On Hold status
    const canCloseTransaction = (data.jo_status === 'Completed' || data.jo_status === 'Checked' || data.jo_status === 'On Hold') && data.is_creator === true;
    // Hold Request button visible only if status is Completed or Checked (not On Hold)
    const canHoldRequest = (data.jo_status === 'Completed' || data.jo_status === 'Checked') && data.is_creator === true;

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
                    <span class="JO-details-value">
                        <span class="JO-status JO-status-${data.jo_status?.toLowerCase()}">${data.jo_status || 'N/A'}</span>
                    </span>
                </div>
                ${data.priority_level ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Priority Level:</span>
                    <span class="JO-details-value">
                        <span class="JO-priority JO-priority-${data.priority_level.toLowerCase()}">${data.priority_level}</span>
                    </span>
                </div>
                ` : ''}
                ${data.priority_level === 'Urgent' && data.date_of_completion ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Date of Completion:</span>
                    <span class="JO-details-value">${data.date_of_completion}</span>
                </div>
                ` : ''}
                <div class="JO-details-item">
                    <span class="JO-details-label">Quality Matter:</span>
                    <span class="JO-details-value">
                        <span class="JO-status ${data.quality_matter ? 'JO-status-approved' : 'JO-status-pending'}">${data.quality_matter ? 'Yes' : 'No'}</span>
                    </span>
                </div>
            </div>
        </div>

        <div class="JO-details-section">
            <span class="JO-details-label">Details:</span>
            <p class="JO-details-text">${data.details || 'No details provided'}</p>
        </div>

        ${(data.in_charge || data.date_received || data.target_date || data.date_complete) ? `
        <div class="JO-details-section">
            <h4>Maintenance Information</h4>
            <div class="JO-details-grid">
                ${data.in_charge ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Person In-charge:</span>
                    <span class="JO-details-value">${data.in_charge || 'Not Yet Assigned'}</span>
                </div>
                ` : ''}

                ${data.date_received ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Date Recieved:</span>
                    <span class="JO-details-value">${data.date_received || 'Not Yet Recieved'}</span>
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
        ${canHoldRequest ? `
        <button class="JO-button" id="hold-request-btn" data-id="${data.id}" data-number="${data.jo_number || data.id}" style="background-color: #ff9800; color: white;">
            <i class="fas fa-pause-circle"></i> Hold Request
        </button>` : ''}
        ${canCloseTransaction ? `
        <button class="JO-button JO-success-button" id="close-transaction-btn" data-id="${data.id}" data-number="${data.jo_number || data.id}" data-status="${data.jo_status}">
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

    const holdRequestBtn = document.getElementById('hold-request-btn');
    if (holdRequestBtn) {
        holdRequestBtn.addEventListener('click', function() {
            const joId = this.dataset.id;
            const joNumber = this.dataset.number || joId;
            confirmHoldRequest(joId, joNumber);
        });
    }

    const closeTransactionBtn = document.getElementById('close-transaction-btn');
    if (closeTransactionBtn) {
        closeTransactionBtn.addEventListener('click', function() {
            const joId = this.dataset.id;
            const joNumber = this.dataset.number || joId;
            const joStatus = this.dataset.status || '';
            confirmCloseTransaction(joId, joNumber, joStatus);
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
        return '<p class="text-muted">No approval information available</p>';
    }

    let timelineHtml = '';

    // Process each routing entry and create timeline items
    routingData.forEach((entry, index) => {
        let timelineClass = '';
        let icon = '<i class="fas fa-clock"></i>';
        let statusLabel = '';
        let dateText = '';
        let remarks = '';

        // Determine the timeline state based on entry status
        if (entry.status === 'Approved' || entry.status === 'Submitted') {
            timelineClass = 'JO-timeline-complete';
            icon = '<i class="fas fa-check"></i>';
            statusLabel = entry.status === 'Approved' ? 'Approved' : 'Submitted';
            dateText = `${entry.status === 'Approved' ? 'Approved' : 'Submitted'} by ${entry.approver_name || entry.approver} on ${entry.approved_at || entry.request_at}`;
        } else if (entry.status === 'Disapproved') {
            timelineClass = 'JO-timeline-rejected';
            icon = '<i class="fas fa-times"></i>';
            statusLabel = 'Disapproved';
            dateText = `Disapproved by ${entry.approver_name || entry.approver} on ${entry.approved_at || entry.request_at}`;
        } else if (entry.status === 'Pending') {
            timelineClass = 'JO-timeline-active';
            icon = '<i class="fas fa-hourglass-half"></i>';
            statusLabel = 'Pending Approval';
            dateText = `Waiting for ${entry.approver_name || entry.approver}'s approval`;
        } else if (entry.status === 'Viewed') {
            timelineClass = 'JO-timeline-active';
            icon = '<i class="fas fa-eye"></i>';
            statusLabel = 'Viewed';
            dateText = `Viewed by ${entry.approver_name || entry.approver} on ${entry.approved_at || entry.request_at}`;
        } else if (entry.status === 'Cancelled') {
            timelineClass = 'JO-timeline-rejected';
            icon = '<i class="fas fa-times"></i>';
            statusLabel = 'Cancelled';
            dateText = `Cancelled by ${entry.approver_name || entry.approver} on ${entry.approved_at || entry.request_at}`;
        } else {
            // Default case for any other status
            timelineClass = 'JO-timeline-pending';
            icon = '<i class="fas fa-circle"></i>';
            statusLabel = entry.status;
            dateText = `${entry.approver_name || entry.approver} - ${entry.request_at || ''}`;
        }

        // Add remarks if available
        if (entry.remarks && entry.remarks.trim() !== '') {
            remarks = `<p class="JO-timeline-remarks"><em>"${entry.remarks}"</em></p>`;
        }

        timelineHtml += `
            <div class="JO-timeline-item ${timelineClass}">
                <div class="JO-timeline-icon">
                    ${icon}
                </div>
                <div class="JO-timeline-content">
                    <h5>${entry.approver_name || entry.approver} - ${statusLabel}</h5>
                    <p class="JO-timeline-date">${dateText}</p>
                    ${remarks}
                </div>
            </div>
        `;
    });

    // If job order is closed, add a final closure item
    if (joStatus === 'Closed') {
        timelineHtml += `
            <div class="JO-timeline-item JO-timeline-complete">
                <div class="JO-timeline-icon">
                    <i class="fas fa-check-double"></i>
                </div>
                <div class="JO-timeline-content">
                    <h5>Job Order Closed</h5>
                    <p class="JO-timeline-date">The job order has been successfully closed</p>
                </div>
            </div>
        `;
    }

    // If job order is cancelled or rejected, add a final cancellation/rejection item
    if (joStatus === 'Cancelled') {
        timelineHtml += `
            <div class="JO-timeline-item JO-timeline-rejected">
                <div class="JO-timeline-icon">
                    <i class="fas fa-ban"></i>
                </div>
                <div class="JO-timeline-content">
                    <h5>Job Order Cancelled</h5>
                    <p class="JO-timeline-date">This job order has been cancelled</p>
                </div>
            </div>
        `;
    }

    return timelineHtml;
}

// ========================================================================
// Job Order Review Functionality (Approve/Disapprove)
// ========================================================================

function openReviewModal(joId, joNumber) {
    const reviewModal = document.getElementById('jo-review-modal');
    openModal(reviewModal);

    // Show loading spinner
    document.getElementById('jo-review-content').innerHTML = `
        <div class="JO-loading text-center p-5">
            <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
            <p>Loading job order details...</p>
        </div>
    `;

    // Clear remarks and error
    document.getElementById('review-remarks').value = '';
    document.getElementById('review-remarks-error').style.display = 'none';

    // Store JO ID and Number for later use
    const approveBtn = document.getElementById('approve-jo-btn');
    const disapproveBtn = document.getElementById('disapprove-jo-btn');
    const completeBtn = document.getElementById('complete-jo-btn');
    
    if (approveBtn) {
        approveBtn.setAttribute('data-id', joId);
        approveBtn.setAttribute('data-number', joNumber);
    }
    if (disapproveBtn) {
        disapproveBtn.setAttribute('data-id', joId);
        disapproveBtn.setAttribute('data-number', joNumber);
    }
    if (completeBtn) {
        completeBtn.setAttribute('data-id', joId);
        completeBtn.setAttribute('data-number', joNumber);
    }

    // Fetch job order details
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
            renderReviewModalContent(data);
        } else {
            document.getElementById('jo-review-content').innerHTML = `
                <div class="JO-error-message text-center p-5">
                    <i class="fas fa-exclamation-circle fa-2x text-danger mb-3"></i>
                    <p>${data.message || 'Failed to load job order details'}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error fetching job order details:', error);
        document.getElementById('jo-review-content').innerHTML = `
            <div class="JO-error-message text-center p-5">
                <i class="fas fa-exclamation-circle fa-2x text-danger mb-3"></i>
                <p>An error occurred while loading the job order details: ${error.message}</p>
            </div>
        `;
    });

    // Set up approve/disapprove button handlers
    setupReviewButtonHandlers();
}

function renderReviewModalContent(data) {
    // Create timeline HTML based on the routing
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
                    <span class="JO-details-label">Prepared By:</span>
                    <span class="JO-details-value">${data.prepared_by || 'N/A'}</span>
                </div>
                ${data.priority_level ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Priority Level:</span>
                    <span class="JO-details-value">
                        <span class="JO-priority JO-priority-${data.priority_level.toLowerCase()}">${data.priority_level}</span>
                    </span>
                </div>
                ` : ''}
                ${data.priority_level === 'Urgent' && data.date_of_completion ? `
                <div class="JO-details-item">
                    <span class="JO-details-label">Date of Completion:</span>
                    <span class="JO-details-value">${data.date_of_completion}</span>
                </div>
                ` : ''}
                <div class="JO-details-item">
                    <span class="JO-details-label">Quality Matter:</span>
                    <span class="JO-details-value">
                        <span class="JO-status ${data.quality_matter ? 'JO-status-approved' : 'JO-status-pending'}">${data.quality_matter ? 'Yes' : 'No'}</span>
                    </span>
                </div>
            </div>
        </div>

        <div class="JO-details-section">
            <span class="JO-details-label">Details:</span>
            <p class="JO-details-text JO-editable-field JO-editable-textarea" data-field="details" data-original="${escapeHtml(data.details || '')}" title="Click to edit">${data.details || 'No details provided'}</p>
        </div>

        ${data.in_charge ? `
        <div class="JO-details-section">
            <h4>Maintenance Information</h4>
            <div class="JO-details-grid">
                <div class="JO-details-item">
                    <span class="JO-details-label">Person In-Charge:</span>
                    <span class="JO-details-value">${data.in_charge || 'N/A'}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Date Received:</span>
                    <span class="JO-details-value">${data.date_received || 'N/A'}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Target Date:</span>
                    <span class="JO-details-value">${data.target_date || 'N/A'}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Date Complete:</span>
                    <span class="JO-details-value">${data.date_complete || 'N/A'}</span>
                </div>
            </div>
            ${data.action_taken ? `
            <div class="JO-details-section">
                <span class="JO-details-label">Action Taken:</span>
                <p class="JO-details-text">${data.action_taken}</p>
            </div>
            ` : ''}
            ${data.target_date_reason ? `
            <div class="JO-details-section">
                <span class="JO-details-label">Target Date Reason:</span>
                <p class="JO-details-text">${data.target_date_reason}</p>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <div class="JO-details-section">
            <h4>Approval Timeline</h4>
            <div class="JO-timeline">
                ${timelineHtml}
            </div>
        </div>
    `;

    document.getElementById('jo-review-content').innerHTML = modalContent;
    
    // Set up editable field functionality
    setupEditableFields();
}

function setupReviewButtonHandlers() {
    // Check if user is maintenance
    const isMaintenanceUser = document.querySelector('.user-maintenance-role')?.textContent.trim() === 'true';
    
    const approveBtn = document.getElementById('approve-jo-btn');
    const disapproveBtn = document.getElementById('disapprove-jo-btn');
    const completeBtn = document.getElementById('complete-jo-btn');

    // Show/hide buttons based on user role
    if (isMaintenanceUser) {
        if (approveBtn) approveBtn.style.display = 'none';
        if (disapproveBtn) disapproveBtn.style.display = 'none';
        if (completeBtn) completeBtn.style.display = 'inline-flex';
    } else {
        if (approveBtn) approveBtn.style.display = 'inline-flex';
        if (disapproveBtn) disapproveBtn.style.display = 'inline-flex';
        if (completeBtn) completeBtn.style.display = 'none';
    }

    // Remove any existing event listeners by cloning
    if (approveBtn) {
        const newApproveBtn = approveBtn.cloneNode(true);
        approveBtn.parentNode.replaceChild(newApproveBtn, approveBtn);
    }
    if (disapproveBtn) {
        const newDisapproveBtn = disapproveBtn.cloneNode(true);
        disapproveBtn.parentNode.replaceChild(newDisapproveBtn, disapproveBtn);
    }
    if (completeBtn) {
        const newCompleteBtn = completeBtn.cloneNode(true);
        completeBtn.parentNode.replaceChild(newCompleteBtn, completeBtn);
    }

    // Set up priority level change listener
    const priorityLevelSelect = document.getElementById('review-priority-level');
    if (priorityLevelSelect) {
        priorityLevelSelect.addEventListener('change', function() {
            const dateCompletionGroup = document.getElementById('review-date-of-completion-group');
            const dateCompletionInput = document.getElementById('review-date-of-completion');
            const dateError = document.getElementById('review-date-error');
            
            if (this.value === 'Urgent') {
                dateCompletionGroup.style.display = 'block';
                dateCompletionInput.setAttribute('required', 'required');
            } else {
                dateCompletionGroup.style.display = 'none';
                dateCompletionInput.removeAttribute('required');
                dateCompletionInput.value = '';
                dateError.style.display = 'none';
            }
        });
        
        // Trigger change event to set initial state
        priorityLevelSelect.dispatchEvent(new Event('change'));
    }

    // Add new event listeners
    if (document.getElementById('approve-jo-btn')) {
        const newApproveBtn = document.getElementById('approve-jo-btn');
        newApproveBtn.addEventListener('click', function() {
            const joId = this.getAttribute('data-id');
            const joNumber = this.getAttribute('data-number');
            const remarks = document.getElementById('review-remarks').value.trim();
            
            // Hide error messages
            document.getElementById('review-remarks-error').style.display = 'none';
            const dateError = document.getElementById('review-date-error');
            if (dateError) dateError.style.display = 'none';
            
            // Validate date of completion if priority is urgent
            const priorityLevel = document.getElementById('review-priority-level');
            const dateCompletion = document.getElementById('review-date-of-completion');
            
            if (priorityLevel && priorityLevel.value === 'Urgent') {
                if (!dateCompletion || !dateCompletion.value) {
                    if (dateError) {
                        dateError.style.display = 'block';
                        dateCompletion.focus();
                    }
                    return;
                }
            }
            
            handleApproveJobOrder(joId, joNumber, remarks);
        });
    }

    if (document.getElementById('disapprove-jo-btn')) {
        const newDisapproveBtn = document.getElementById('disapprove-jo-btn');
        newDisapproveBtn.addEventListener('click', function() {
            const joId = this.getAttribute('data-id');
            const joNumber = this.getAttribute('data-number');
            const remarks = document.getElementById('review-remarks').value.trim();
            
            // Validate remarks are required for disapproval
            if (!remarks) {
                document.getElementById('review-remarks-error').style.display = 'block';
                document.getElementById('review-remarks').focus();
                return;
            }
            
            // Hide error message
            document.getElementById('review-remarks-error').style.display = 'none';
            
            handleDisapproveJobOrder(joId, joNumber, remarks);
        });
    }
    
    // Add complete button event listener for maintenance users
    if (document.getElementById('complete-jo-btn')) {
        const newCompleteBtn = document.getElementById('complete-jo-btn');
        newCompleteBtn.addEventListener('click', function() {
            const joId = this.getAttribute('data-id');
            const joNumber = this.getAttribute('data-number');
            handleCompleteJobOrder(joId, joNumber);
        });
    }
}

function handleApproveJobOrder(joId, joNumber, remarks) {
    const approveBtn = document.getElementById('approve-jo-btn');
    if (!approveBtn) {
        console.error('Approve button not found');
        return;
    }
    
    approveBtn.classList.add('loading');
    approveBtn.disabled = true;

    const formData = new FormData();
    formData.append('action', 'approve');
    if (remarks) {
        formData.append('remarks', remarks);
    }
    
    // Add quality_matter, priority_level, and date_of_completion if they exist
    const qualityMatter = document.getElementById('review-quality-matter');
    if (qualityMatter) {
        formData.append('quality_matter', qualityMatter.checked ? 'true' : 'false');
    }
    
    const priorityLevel = document.getElementById('review-priority-level');
    if (priorityLevel) {
        formData.append('priority_level', priorityLevel.value);
    }
    
    const dateOfCompletion = document.getElementById('review-date-of-completion');
    if (dateOfCompletion && dateOfCompletion.value) {
        formData.append('date_of_completion', dateOfCompletion.value);
    }
    
    // Collect and add modified fields
    const modifiedFields = collectModifiedFields();
    if (Object.keys(modifiedFields).length > 0) {
        formData.append('modified_fields', JSON.stringify(modifiedFields));
    }

    fetch(`/joborder/review-job-order/${joId}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        approveBtn.classList.remove('loading');
        approveBtn.disabled = false;

        if (data.status === 'success') {
            closeModal(document.getElementById('jo-review-modal'));
            createToast(data.message || `Job Order ${joNumber} has been approved successfully!`, 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            createToast(data.message || 'Error approving job order', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        approveBtn.classList.remove('loading');
        approveBtn.disabled = false;
        createToast('An error occurred while approving the job order', 'error');
    });
}

function handleDisapproveJobOrder(joId, joNumber, remarks) {
    const disapproveBtn = document.getElementById('disapprove-jo-btn');
    if (!disapproveBtn) {
        console.error('Disapprove button not found');
        return;
    }
    
    disapproveBtn.classList.add('loading');
    disapproveBtn.disabled = true;

    const formData = new FormData();
    formData.append('action', 'disapprove');
    formData.append('remarks', remarks);
    
    // Collect and add modified fields even for disapproval
    const modifiedFields = collectModifiedFields();
    if (Object.keys(modifiedFields).length > 0) {
        formData.append('modified_fields', JSON.stringify(modifiedFields));
    }

    fetch(`/joborder/review-job-order/${joId}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        disapproveBtn.classList.remove('loading');
        disapproveBtn.disabled = false;

        if (data.status === 'success') {
            closeModal(document.getElementById('jo-review-modal'));
            createToast(data.message || `Job Order ${joNumber} has been disapproved`, 'warning');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            createToast(data.message || 'Error disapproving job order', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        disapproveBtn.classList.remove('loading');
        disapproveBtn.disabled = false;
        createToast('An error occurred while disapproving the job order', 'error');
    });
}

function handleCompleteJobOrder(joId, joNumber) {
    const actionTakenInput = document.getElementById('review-action-taken');
    const actionTakenError = document.getElementById('review-action-taken-error');
    const completeBtn = document.getElementById('complete-jo-btn');
    
    // Clear previous errors
    if (actionTakenError) actionTakenError.style.display = 'none';
    
    // Validate action taken
    if (!actionTakenInput || !actionTakenInput.value.trim()) {
        createToast('Action taken is required', 'error');
        if (actionTakenError) actionTakenError.style.display = 'block';
        if (actionTakenInput) actionTakenInput.focus();
        return;
    }
    
    const actionTaken = actionTakenInput.value.trim();
    
    // Show loading state
    completeBtn.classList.add('loading');
    completeBtn.disabled = true;
    completeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completing...';
    
    // Prepare form data
    const formData = new FormData();
    formData.append('action_taken', actionTaken);
    
    // Submit to server
    fetch(`/joborder/complete-job-order/${joId}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        completeBtn.classList.remove('loading');
        completeBtn.disabled = false;
        completeBtn.innerHTML = '<i class="fas fa-check-double"></i> Complete Request';
        
        if (data.status === 'success') {
            closeModal(document.getElementById('jo-review-modal'));
            createToast(data.message || `Job Order ${joNumber} has been completed successfully!`, 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            createToast(data.message || 'Error completing job order', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        completeBtn.classList.remove('loading');
        completeBtn.disabled = false;
        completeBtn.innerHTML = '<i class="fas fa-check-double"></i> Complete Request';
        createToast('An error occurred while completing the job order', 'error');
    });
}

// ========================================================================
// Job Order Cancel/Close Functionality
// ========================================================================

function confirmCancelJobOrder(joId, joNumber) {
    document.getElementById('cancel-jo-number').textContent = joNumber;
    document.getElementById('confirm-cancel-btn').setAttribute('data-id', joId);
    document.getElementById('cancel-remarks').value = '';

    openModal(document.getElementById('confirm-cancel-modal'));

    setTimeout(() => {
        document.getElementById('cancel-remarks').focus();
    }, 300);
}

function processCancelJobOrder(joId, remarks) {
    const confirmBtn = document.getElementById('confirm-cancel-btn');
    confirmBtn.classList.add('loading');
    confirmBtn.textContent = '';

    const formData = new FormData();
    if (remarks) {
        formData.append('remarks', remarks);
    }

    formData.append('csrfmiddlewaretoken', getCSRFToken());

    fetch(`/joborder/cancel-jo-request/${joId}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        closeModal(document.getElementById('confirm-cancel-modal'));
        closeModal(document.getElementById('jo-details-modal'));

        createToast(data.message || 'Job Order successfully cancelled', 'success');

        setTimeout(() => {
            window.location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('Error:', error);
        confirmBtn.classList.remove('loading');
        confirmBtn.textContent = 'Yes, Cancel Order';

        createToast('An error occurred while cancelling the job order. Please try again.', 'error');
    });
}

function confirmCloseTransaction(joId, joNumber, joStatus) {
    document.getElementById('close-jo-number').textContent = joNumber;
    document.getElementById('confirm-close-btn').setAttribute('data-id', joId);
    document.getElementById('confirm-close-btn').setAttribute('data-status', joStatus);
    document.getElementById('close-remarks').value = '';
    
    // Update label based on status
    const remarksLabel = document.querySelector('#confirm-close-modal label[for="close-remarks"]');
    if (remarksLabel) {
        if (joStatus === 'On Hold') {
            remarksLabel.innerHTML = 'Feedback <span style="color: red;">*</span>';
        } else {
            remarksLabel.innerHTML = 'Closing Remarks (Optional)';
        }
    }

    openModal(document.getElementById('confirm-close-modal'));

    setTimeout(() => {
        document.getElementById('close-remarks').focus();
    }, 300);
}

function processCloseTransaction(joId, remarks) {
    const confirmBtn = document.getElementById('confirm-close-btn');
    const joStatus = confirmBtn.getAttribute('data-status');
    
    // Validate remarks if status is "On Hold"
    if (joStatus === 'On Hold' && (!remarks || remarks.trim() === '')) {
        createToast('Feedback is required when closing a job order that is on hold', 'error');
        document.getElementById('close-remarks').focus();
        return;
    }
    
    confirmBtn.classList.add('loading');
    confirmBtn.textContent = '';

    const formData = new FormData();
    if (remarks) {
        formData.append('remarks', remarks);
    }

    formData.append('csrfmiddlewaretoken', getCSRFToken());

    fetch(`/joborder/close-jo-transaction/${joId}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        closeModal(document.getElementById('confirm-close-modal'));
        closeModal(document.getElementById('jo-details-modal'));

        createToast(data.message || 'Transaction successfully closed', 'success');

        setTimeout(() => {
            window.location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('Error:', error);
        confirmBtn.classList.remove('loading');
        confirmBtn.textContent = 'Yes, Close Transaction';

        createToast('An error occurred while closing the transaction. Please try again.', 'error');
    });
}

// Hold Request Functions
function confirmHoldRequest(joId, joNumber) {
    document.getElementById('hold-jo-number').textContent = joNumber;
    document.getElementById('confirm-hold-btn').setAttribute('data-id', joId);
    document.getElementById('hold-remarks').value = '';
    document.getElementById('hold-remarks-error').style.display = 'none';

    openModal(document.getElementById('confirm-hold-modal'));

    setTimeout(() => {
        document.getElementById('hold-remarks').focus();
    }, 300);
}

function processHoldRequest(joId, remarks) {
    // Validate remarks
    if (!remarks || remarks.trim() === '') {
        document.getElementById('hold-remarks-error').style.display = 'block';
        document.getElementById('hold-remarks').focus();
        return;
    }

    document.getElementById('hold-remarks-error').style.display = 'none';
    const confirmBtn = document.getElementById('confirm-hold-btn');
    confirmBtn.classList.add('loading');
    confirmBtn.textContent = '';

    const formData = new FormData();
    formData.append('remarks', remarks);
    formData.append('csrfmiddlewaretoken', getCSRFToken());

    fetch(`/joborder/hold-request/${joId}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        closeModal(document.getElementById('confirm-hold-modal'));
        closeModal(document.getElementById('jo-details-modal'));

        createToast(data.message || 'Request successfully put on hold', 'success');

        setTimeout(() => {
            window.location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('Error:', error);
        confirmBtn.classList.remove('loading');
        confirmBtn.innerHTML = '<i class="fas fa-pause"></i> Yes, Hold Request';

        createToast('An error occurred while putting the request on hold. Please try again.', 'error');
    });
}

// ========================================================================
// Toast Notifications
// ========================================================================

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
        `;
        document.head.appendChild(style);
    }
}

// ========================================================================
// Pagination & Search now handled server-side via Django Paginator
// ========================================================================
// Client-side search/pagination functions removed - all deprecated code deleted
// Search now uses GET form submission
// Pagination uses Django's built-in Paginator

/**
 * Helper function to get CSRF token from cookies
 * @returns {string} CSRF token
 */
function getCSRFToken() {
    // Try to get from cookie
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 10) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }
    }

    // If not found in cookie, try to get from hidden input
    if (!cookieValue) {
        const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (csrfInput) {
            cookieValue = csrfInput.value;
        }
    }

    return cookieValue;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

/**
 * Set up editable field functionality for job order review modal
 * Only enabled for users with job_order_approver role
 */
function setupEditableFields() {
    // Check if review modal has approver-specific fields (quality_matter, priority_level)
    // This indicates the user is a job_order_approver
    const isApprover = document.getElementById('review-quality-matter') !== null;
    
    if (!isApprover) {
        // Not an approver, don't make fields editable
        return;
    }
    
    const editableFields = document.querySelectorAll('.JO-editable-field');
    
    editableFields.forEach(field => {
        field.style.cursor = 'pointer';
        field.style.transition = 'all 0.2s';
        
        field.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f0f7ff';
        });
        
        field.addEventListener('mouseleave', function() {
            if (!this.classList.contains('JO-editing')) {
                this.style.backgroundColor = '';
            }
        });
        
        field.addEventListener('click', function() {
            makeFieldEditable(this);
        });
    });
}

/**
 * Make a specific field editable
 * @param {HTMLElement} field - The field element to make editable
 */
function makeFieldEditable(field) {
    if (field.classList.contains('JO-editing')) {
        return; // Already editing
    }
    
    const originalValue = field.dataset.original || field.textContent.trim();
    const fieldName = field.dataset.field;
    const isTextarea = field.classList.contains('JO-editable-textarea');
    
    field.classList.add('JO-editing');
    field.style.backgroundColor = '#fffbea';
    
    let inputElement;
    if (isTextarea) {
        inputElement = document.createElement('textarea');
        inputElement.rows = 4;
        inputElement.style.width = '100%';
        inputElement.style.padding = '8px';
        inputElement.style.fontSize = '14px';
        inputElement.style.fontFamily = 'inherit';
        inputElement.style.border = '2px solid #3366ff';
        inputElement.style.borderRadius = '4px';
        inputElement.style.resize = 'vertical';
    } else {
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.style.width = '100%';
        inputElement.style.padding = '6px 8px';
        inputElement.style.fontSize = '14px';
        inputElement.style.fontFamily = 'inherit';
        inputElement.style.border = '2px solid #3366ff';
        inputElement.style.borderRadius = '4px';
    }
    
    inputElement.value = originalValue === 'N/A' || originalValue === 'No details provided' ? '' : originalValue;
    inputElement.dataset.field = fieldName;
    inputElement.dataset.original = originalValue;
    
    // Replace the field content with the input
    field.innerHTML = '';
    field.appendChild(inputElement);
    
    // Focus the input
    inputElement.focus();
    inputElement.select();
    
    // Auto-save on blur (when user clicks outside)
    inputElement.addEventListener('blur', function() {
        saveFieldChanges(field, inputElement, originalValue);
    });
    
    // Save on Enter key (for input fields only)
    if (!isTextarea) {
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                inputElement.blur(); // Trigger blur to save
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelFieldChanges(field, originalValue);
            }
        });
    } else {
        // For textarea, only Escape cancels
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelFieldChanges(field, originalValue);
            }
        });
    }
    
    // Prevent modal from closing when clicking inside the input
    inputElement.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

/**
 * Save field changes
 * @param {HTMLElement} field - The field element
 * @param {HTMLElement} inputElement - The input element
 * @param {string} originalValue - The original value
 */
function saveFieldChanges(field, inputElement, originalValue) {
    const newValue = inputElement.value.trim();
    field.classList.remove('JO-editing');
    field.style.backgroundColor = '';
    
    if (newValue && newValue !== originalValue) {
        field.innerHTML = newValue;
        field.dataset.original = newValue;
        field.classList.add('JO-field-modified');
        field.style.backgroundColor = '#e8f5e9';
        field.title = `Modified: ${originalValue} → ${newValue}`;
        
        // Mark that changes have been made
        field.dataset.modified = 'true';
    } else {
        field.innerHTML = originalValue === '' || originalValue === 'N/A' ? 'N/A' : originalValue;
    }
}

/**
 * Cancel field changes
 * @param {HTMLElement} field - The field element
 * @param {string} originalValue - The original value
 */
function cancelFieldChanges(field, originalValue) {
    field.classList.remove('JO-editing');
    field.style.backgroundColor = '';
    field.innerHTML = originalValue === '' || originalValue === 'N/A' ? 'N/A' : originalValue;
}

// ========================================================================
// Set Target Date Modal Functions
// ========================================================================

let currentSetDateJobOrder = null;

/**
 * Open the Set Date modal and load job order details
 * @param {number} joId - The job order ID
 * @param {string} joNumber - The job order number
 */
function openSetDateModal(joId, joNumber) {
    const modal = document.getElementById('set-target-date-modal');
    if (!modal) {
        console.error('Set Target Date modal not found');
        return;
    }

    // Show loading state
    const loadingDiv = modal.querySelector('.JO-loading');
    const formContainer = document.getElementById('set-date-form-container');
    const confirmBtn = document.getElementById('confirm-set-date');
    
    if (loadingDiv) loadingDiv.style.display = 'flex';
    if (formContainer) formContainer.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';

    // Open the modal
    openModal(modal);

    // Fetch job order details
    fetch(`/joborder/get-job-order-for-date-setting/${joId}/`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
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
            currentSetDateJobOrder = data.job_order;
            displaySetDateForm(data.job_order);
            
            // Hide loading, show form
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (formContainer) formContainer.style.display = 'block';
        } else {
            throw new Error(data.message || 'Failed to load job order details');
        }
    })
    .catch(error => {
        console.error('Error fetching job order details:', error);
        createToast('Failed to load job order details', 'error');
        closeModal(modal);
    });
}

/**
 * Display the Set Date form with job order details
 * @param {Object} jobOrder - The job order data
 */
function displaySetDateForm(jobOrder) {
    // Update job order information
    document.getElementById('set-date-jo-number').textContent = jobOrder.jo_number || 'N/A';
    
    // Display category with color badge
    const categoryElement = document.getElementById('set-date-jo-category');
    const categoryColor = (jobOrder.jo_color || 'unknown').toLowerCase();
    categoryElement.innerHTML = `<span class="JO-category-pill JO-category-${categoryColor}">${jobOrder.jo_color || 'Unknown'}</span>`;
    
    // Display tool
    document.getElementById('set-date-jo-tool').textContent = jobOrder.jo_tools || 'N/A';
    
    // Display nature
    document.getElementById('set-date-jo-nature').textContent = jobOrder.jo_type || 'N/A';
    
    // Display line
    document.getElementById('set-date-jo-line').textContent = jobOrder.line || 'N/A';
    
    // Display requestor
    document.getElementById('set-date-jo-requestor').textContent = jobOrder.requestor || 'N/A';
    
    // Display status with status pill
    const statusElement = document.getElementById('set-date-jo-status');
    const statusValue = jobOrder.status || 'N/A';
    const statusClass = statusValue.toLowerCase();
    statusElement.innerHTML = `<span class="JO-status JO-status-${statusClass}">${statusValue}</span>`;
    
    // Display details
    document.getElementById('set-date-jo-details').textContent = jobOrder.details || 'N/A';
    
    // Display priority level with badge
    const priorityElement = document.getElementById('set-date-priority-level');
    const priorityLevel = (jobOrder.priority_level || 'low').toLowerCase();
    priorityElement.innerHTML = `<span class="JO-priority JO-priority-${priorityLevel}">${jobOrder.priority_level || 'Low'}</span>`;
    
    // Show/hide date of completion based on priority
    const completionDateContainer = document.getElementById('set-date-completion-date-container');
    if (jobOrder.priority_level === 'Urgent' && jobOrder.date_of_completion) {
        completionDateContainer.style.display = 'block';
        document.getElementById('set-date-completion-date').textContent = 
            new Date(jobOrder.date_of_completion).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } else {
        completionDateContainer.style.display = 'none';
    }
    
    // Display quality matter with status pill
    const qualityMatterElement = document.getElementById('set-date-quality-matter');
    const qualityMatterValue = jobOrder.quality_matter ? 'Yes' : 'No';
    const qualityMatterClass = jobOrder.quality_matter ? 'JO-status-approved' : 'JO-status-pending';
    qualityMatterElement.innerHTML = `<span class="JO-status ${qualityMatterClass}">${qualityMatterValue}</span>`;
    
    // Pre-fill target date if exists
    const targetDateInput = document.getElementById('target-date-input');
    
    // Clone the input to remove all old event listeners
    const newTargetDateInput = targetDateInput.cloneNode(true);
    targetDateInput.parentNode.replaceChild(newTargetDateInput, targetDateInput);
    
    // Use the new input reference
    const dateInput = document.getElementById('target-date-input');
    
    if (jobOrder.current_target_date) {
        dateInput.value = jobOrder.current_target_date;
    } else {
        dateInput.value = '';
    }
    
    // Pre-fill reason if exists
    const reasonInput = document.getElementById('target-date-reason-input');
    if (jobOrder.current_target_date_reason) {
        reasonInput.value = jobOrder.current_target_date_reason;
    } else {
        reasonInput.value = '';
    }
    
    // Clear any previous error states
    document.getElementById('target-date-error').style.display = 'none';
    document.getElementById('target-date-reason-error').style.display = 'none';
    document.getElementById('target-date-reason-group').style.display = 'none';
    
    console.log('Setting up event listeners for date input. Job Order:', {
        jo_number: jobOrder.jo_number,
        jo_color: jobOrder.jo_color,
        last_approved_date: jobOrder.last_approved_date,
        priority_level: jobOrder.priority_level
    });
    
    // Set up date input change handler - use 'input' event for immediate feedback
    dateInput.addEventListener('input', function() {
        console.log('Input event triggered, validating...');
        validateTargetDate(jobOrder);
    });
    
    dateInput.addEventListener('change', function() {
        console.log('Change event triggered, validating...');
        validateTargetDate(jobOrder);
    });
    
    // Validate immediately if there's a pre-filled date
    if (jobOrder.current_target_date) {
        console.log('Pre-filled date detected, validating immediately...');
        validateTargetDate(jobOrder);
    }
    
    // Set up confirm button
    const confirmBtn = document.getElementById('confirm-set-date');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', function() {
        submitTargetDate(jobOrder);
    });
    
    // Show the confirm button now that it's set up
    newConfirmBtn.style.display = 'inline-flex';
    
    // Set up cancel button
    const cancelBtn = document.getElementById('cancel-set-date');
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newCancelBtn.addEventListener('click', function() {
        closeModal(document.getElementById('set-target-date-modal'));
    });
}

/**
 * Validate the target date and show/hide reason field
 * @param {Object} jobOrder - The job order data
 */
function validateTargetDate(jobOrder) {
    console.log('=== validateTargetDate called ===');
    
    const targetDateInput = document.getElementById('target-date-input');
    const reasonGroup = document.getElementById('target-date-reason-group');
    const reasonHint = document.getElementById('target-date-reason-hint');
    const targetDateError = document.getElementById('target-date-error');
    
    console.log('Elements found:', {
        targetDateInput: !!targetDateInput,
        reasonGroup: !!reasonGroup,
        reasonHint: !!reasonHint,
        targetDateError: !!targetDateError
    });
    
    if (!targetDateInput || !targetDateInput.value) {
        console.log('No target date value, hiding reason field');
        if (reasonGroup) reasonGroup.style.display = 'none';
        if (targetDateError) targetDateError.style.display = 'none';
        return;
    }
    
    // Parse target date at midnight to avoid time zone issues
    const targetDate = new Date(targetDateInput.value + 'T00:00:00');
    
    let showReasonField = false;
    let reasonMessage = '';
    
    console.log('Validating target date:', {
        targetDateValue: targetDateInput.value,
        targetDateParsed: targetDate,
        joColor: jobOrder.jo_color,
        lastApprovedDate: jobOrder.last_approved_date,
        priorityLevel: jobOrder.priority_level,
        dateOfCompletion: jobOrder.date_of_completion
    });
    
    // Get last approved date
    if (jobOrder.last_approved_date) {
        const lastApprovedDate = new Date(jobOrder.last_approved_date + 'T00:00:00');
        const daysDifference = Math.ceil((targetDate - lastApprovedDate) / (1000 * 60 * 60 * 24));
        
        console.log('Days difference from last approved:', daysDifference, 'Last approved:', lastApprovedDate);
        
        // Check based on JO color
        if (['Green', 'Yellow', 'White'].includes(jobOrder.jo_color)) {
            console.log('Checking Green/Yellow/White: daysDifference > 30?', daysDifference > 30);
            if (daysDifference > 30) {
                showReasonField = true;
                reasonMessage = `Target date is more than 1 month (${daysDifference} days) after the last approved routing date.`;
                console.log('✓ Reason required: More than 30 days for Green/Yellow/White');
            }
        } else if (jobOrder.jo_color === 'Orange') {
            console.log('Checking Orange: daysDifference > 7?', daysDifference > 7);
            if (daysDifference > 7) {
                showReasonField = true;
                reasonMessage = `Target date is more than 1 week (${daysDifference} days) after the last approved routing date.`;
                console.log('✓ Reason required: More than 7 days for Orange');
            }
        }
    } else {
        console.log('No last_approved_date found in jobOrder');
    }
    
    // Check for Urgent priority and date_of_completion
    if (jobOrder.priority_level === 'Urgent' && jobOrder.date_of_completion) {
        const completionDate = new Date(jobOrder.date_of_completion + 'T00:00:00');
        console.log('Checking Urgent priority: targetDate > completionDate?', targetDate > completionDate);
        if (targetDate > completionDate) {
            showReasonField = true;
            const daysDiff = Math.ceil((targetDate - completionDate) / (1000 * 60 * 60 * 24));
            reasonMessage = `Target date is ${daysDiff} day(s) later than the date of completion for an Urgent job order.`;
            console.log('✓ Reason required: Target date after completion date for Urgent priority');
        }
    }
    
    // Show/hide reason field
    console.log('Final decision - showReasonField:', showReasonField);
    if (showReasonField) {
        console.log('>>> SHOWING reason field with message:', reasonMessage);
        reasonGroup.style.display = 'block';
        reasonHint.textContent = reasonMessage;
    } else {
        console.log('>>> HIDING reason field');
        reasonGroup.style.display = 'none';
        reasonHint.textContent = '';
        // Only clear the reason if we're hiding the field
        document.getElementById('target-date-reason-input').value = '';
    }
    
    targetDateError.style.display = 'none';
    console.log('=== validateTargetDate completed ===');
}

/**
 * Submit the target date to the server
 * @param {Object} jobOrder - The job order data
 */
function submitTargetDate(jobOrder) {
    const targetDateInput = document.getElementById('target-date-input');
    const reasonInput = document.getElementById('target-date-reason-input');
    const reasonGroup = document.getElementById('target-date-reason-group');
    const targetDateError = document.getElementById('target-date-error');
    const reasonError = document.getElementById('target-date-reason-error');
    const confirmBtn = document.getElementById('confirm-set-date');
    
    // Clear previous errors
    targetDateError.style.display = 'none';
    reasonError.style.display = 'none';
    
    // Validate target date
    if (!targetDateInput.value) {
        createToast('Please select a target date', 'error');
        targetDateInput.focus();
        return;
    }
    
    // Validate reason if field is visible
    if (reasonGroup.style.display !== 'none' && !reasonInput.value.trim()) {
        createToast('Reason is required when setting an extended target date', 'error');
        reasonInput.focus();
        return;
    }
    
    // Show loading state
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting Date...';
    
    // Prepare form data
    const formData = new FormData();
    formData.append('job_id', jobOrder.id);
    formData.append('target_date', targetDateInput.value);
    formData.append('target_date_reason', reasonInput.value.trim());
    
    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    
    // Submit to server
    fetch('/joborder/set-target-date/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || 'Server error');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            createToast('Target date set successfully', 'success');
            closeModal(document.getElementById('set-target-date-modal'));
            
            // Reload the page to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(data.message || 'Failed to set target date');
        }
    })
    .catch(error => {
        console.error('Error setting target date:', error);
        createToast(error.message || 'Failed to set target date', 'error');
        
        // Reset button
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Set Target Date';
    });
}

/**
 * Collect all modified fields from the review modal
 * @returns {Object} Object containing modified field names and values
 */
function collectModifiedFields() {
    const modifiedFields = {};
    const editableFields = document.querySelectorAll('.JO-editable-field[data-modified="true"]');
    
    editableFields.forEach(field => {
        const fieldName = field.dataset.field;
        const newValue = field.textContent.trim();
        if (fieldName && newValue) {
            modifiedFields[fieldName] = newValue;
        }
    });
    
    return modifiedFields;
}