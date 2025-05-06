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
});

// ========================================================================
// Chart Functionality
// ========================================================================

let joStatsChart = null;

function initializeChart() {
    const ctx = document.getElementById('jo-stats-chart').getContext('2d');
    
    joStatsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Green JOs',
                    backgroundColor: 'rgba(75, 192, 75, 0.7)',
                    borderColor: 'rgba(75, 192, 75, 1)',
                    borderWidth: 1,
                    data: []
                },
                {
                    label: 'Yellow JOs',
                    backgroundColor: 'rgba(255, 205, 86, 0.7)',
                    borderColor: 'rgba(255, 205, 86, 1)',
                    borderWidth: 1,
                    data: []
                },
                {
                    label: 'White JOs',
                    backgroundColor: 'rgba(220, 220, 220, 0.7)',
                    borderColor: 'rgba(220, 220, 220, 1)',
                    borderWidth: 1,
                    data: []
                },
                {
                    label: 'Orange JOs',
                    backgroundColor: 'rgba(255, 159, 64, 0.7)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1,
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
    
    joStatsChart.data.datasets[0].data = data.green;
    joStatsChart.data.datasets[1].data = data.yellow;
    joStatsChart.data.datasets[2].data = data.white;
    joStatsChart.data.datasets[3].data = data.orange;
    
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
// Event Listeners
// ========================================================================

function setupEventListeners() {
    const newRequestBtn = document.getElementById('new-request-btn');
    const newJobOrderModal = document.getElementById('new-job-order-modal');
    
    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', function() {
            openModal(newJobOrderModal);
        });
    }
    
    const closeButtons = document.querySelectorAll('.JO-modal-close, #cancel-request, .close-details-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = button.closest('.JO-modal');
            closeModal(modal);
        });
    });
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('JO-modal')) {
            closeModal(e.target);
        }
    });
    
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
    
    // Submit Request
    const submitRequestBtn = document.getElementById('submit-request');
    if (submitRequestBtn) {
        submitRequestBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
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
    
    const searchInput = document.querySelector('.JO-search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const searchText = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('.JO-table tbody tr');
            const tableContainer = document.querySelector('.JO-table-container');
            
            const scrollPosition = tableContainer.scrollTop;
            
            let visibleCount = 0;
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchText)) {
                    row.style.display = '';
                    
                    row.style.animation = 'none';
                    row.offsetHeight;
                    row.style.animation = `JO-row-appear 0.5s ease forwards ${visibleCount * 0.05}s`;
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });
            
            tableContainer.scrollTop = scrollPosition;
        });
    }
    
    // Filter functionality
    const filterSelect = document.querySelector('.JO-filter-select');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            const filterValue = this.value;
            const tableRows = document.querySelectorAll('.JO-table tbody tr');
            const tableContainer = document.querySelector('.JO-table-container');
            
            const scrollPosition = tableContainer.scrollTop;
            
            let visibleCount = 0;
            tableRows.forEach(row => {
                const statusCell = row.querySelector('.JO-status');
                if (filterValue === 'all' || (statusCell && statusCell.classList.contains(`JO-status-${filterValue}`))) {
                    row.style.display = '';
                    row.style.animation = 'none';
                    row.offsetHeight;
                    row.style.animation = `JO-row-appear 0.5s ease forwards ${visibleCount * 0.05}s`;
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });
            
            tableContainer.scrollTop = scrollPosition;
        });
    }
    
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

// ========================================================================
// Helper Functions
// ========================================================================

function openModal(modal) {
    if (!modal) return;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (modal.id === 'new-job-order-modal') {
        const form = document.getElementById('job-order-form');
        if (form) form.reset();
        
        // Default to Green category
        const greenCategory = document.querySelector('input[value="green"]');
        if (greenCategory) {
            greenCategory.checked = true;
            toggleNatureOptions('green');
        }
    }
}

function closeModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function toggleNatureOptions(category) {
    document.querySelectorAll('.JO-nature-options').forEach(el => {
        el.style.display = 'none';
    });
    
    const selectedOptions = document.querySelector(`.JO-nature-${category}`);
    if (selectedOptions) {
        selectedOptions.style.display = 'block';
    }
}

function validateJobOrderForm() {
    const form = document.getElementById('job-order-form');
    
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

function confirmCloseTransaction(joId, joNumber) {
    document.getElementById('close-jo-number').textContent = joNumber;
    document.getElementById('confirm-close-btn').setAttribute('data-id', joId);
    document.getElementById('close-remarks').value = '';
    
    openModal(document.getElementById('confirm-close-modal'));
    
    setTimeout(() => {
        document.getElementById('close-remarks').focus();
    }, 300);
}

function processCloseTransaction(joId, remarks) {
    const confirmBtn = document.getElementById('confirm-close-btn');
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
