document.addEventListener('DOMContentLoaded', function() {
    console.log('Approver Dashboard initialized');

    initializeApprovalChart();
    setupModalFunctionality();
    setupSearch();
    setTimeout(() => {
        const pendingJOCount = document.querySelector('.JO-stats-card:nth-child(4) .JO-stats-number')?.textContent || '0';
        createToast(`You have ${pendingJOCount} requests awaiting your approval.`, 'info');
    }, 1000);
});

// Initialize the Approval Chart
function initializeApprovalChart() {
    const ctx = document.getElementById('approval-stage-chart');

    if (!ctx) {
        console.error('Chart canvas not found');
        return;
    }

    let chartInstance = null;

    // Function to load chart data from server based on period
    const loadChartData = (period) => {
        // Show loading indicator
        ctx.style.opacity = 0.5;

        fetch(`/joborder/job-order-chart-data/${period}/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // If chart already exists, destroy it
                if (chartInstance) {
                    chartInstance.destroy();
                }

                // Calculate total JO count for each month
                const totalData = data.labels.map((_, index) => {
                    return data.green[index] + data.yellow[index] + data.white[index] + data.orange[index];
                });

                // Find the maximum value for y-axis
                const maxValue = Math.max(...totalData);
                const yAxisMax = maxValue > 0 ? maxValue + 1 : 5; // Add 1 to the highest value or default to 5

                // Create new chart with the data
                chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: [
                            {
                                label: 'Green',
                                data: data.green,
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                borderColor: 'rgba(76, 175, 80, 1)',
                                borderWidth: 3,
                                pointBackgroundColor: 'rgba(76, 175, 80, 1)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                tension: 0.4
                            },
                            {
                                label: 'Yellow',
                                data: data.yellow,
                                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                borderColor: 'rgba(255, 193, 7, 1)',
                                borderWidth: 3,
                                pointBackgroundColor: 'rgba(255, 193, 7, 1)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                tension: 0.4
                            },
                            {
                                label: 'White',
                                data: data.white,
                                backgroundColor: 'rgba(144, 164, 174, 0.1)',
                                borderColor: 'rgba(144, 164, 174, 1)',
                                borderWidth: 3,
                                pointBackgroundColor: 'rgba(144, 164, 174, 1)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                tension: 0.4
                            },
                            {
                                label: 'Orange',
                                data: data.orange,
                                backgroundColor: 'rgba(255, 87, 34, 0.1)',
                                borderColor: 'rgba(255, 87, 34, 1)',
                                borderWidth: 3,
                                pointBackgroundColor: 'rgba(255, 87, 34, 1)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                tension: 0.4
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
                                    boxWidth: 12,
                                    padding: 15
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                padding: 10,
                                cornerRadius: 6,
                                displayColors: true,
                                callbacks: {
                                    label: function(context) {
                                        const index = context.dataIndex;
                                        const value = context.raw;
                                        const total = totalData[index];

                                        if (value === 0) {
                                            return `${context.dataset.label}: ${value}`;
                                        } else {
                                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                            return `${context.dataset.label}: ${value} (${percentage}% of total)`;
                                        }
                                    },
                                    afterLabel: function(context) {
                                        const index = context.dataIndex;
                                        const total = totalData[index];
                                        return `Total JO: ${total}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: yAxisMax,
                                grid: {
                                    drawBorder: false,
                                    color: 'rgba(0, 0, 0, 0.05)'
                                },
                                ticks: {
                                    stepSize: 1,
                                    precision: 0, // Only show whole numbers
                                    font: {
                                        size: 11
                                    }
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    font: {
                                        size: 11
                                    }
                                }
                            }
                        },
                        animation: {
                            duration: 2000,
                            easing: 'easeOutQuart'
                        }
                    }
                });

                // Reset opacity after loading
                ctx.style.opacity = 1;
                console.log('Chart initialized successfully');
            })
            .catch(error => {
                console.error('Error loading chart data:', error);
                ctx.style.opacity = 1;
            });
    };

    // Set up period selector to change chart data
    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        // Load initial chart data
        loadChartData(periodSelector.value || '6month');

        // Update chart when period selection changes
        periodSelector.addEventListener('change', function() {
            loadChartData(this.value);
        });
    } else {
        // Default to 6 months if selector not found
        loadChartData('6month');
    }
}

// Setup all modal functionality
function setupModalFunctionality() {
    // === MODAL TRIGGER BUTTONS ===

    // View Details buttons
    const viewDetailsButtons = document.querySelectorAll('.JO-view-details-btn, .JO-icon-button[title="View Details"]');
    viewDetailsButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const joId = this.getAttribute('data-id');
            const joNumber = this.getAttribute('data-number') || this.closest('[data-jo-id]')?.getAttribute('data-jo-id');
            console.log(`View details clicked for ${joNumber}`);
            fetchJobOrderDetails(joId, joNumber);
        });
    });

    // Approve buttons
    const approveButtons = document.querySelectorAll('.AD-approve-btn');
    approveButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const joId = this.getAttribute('data-id');
            const joNumber = this.getAttribute('data-number') || this.closest('[data-jo-id]')?.getAttribute('data-jo-id');
            console.log(`Approve button clicked for ${joNumber}`);
            openApproveConfirmModal(joId, joNumber);
        });
    });

    // Reject buttons
    const rejectButtons = document.querySelectorAll('.AD-reject-btn');
    rejectButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const joId = this.getAttribute('data-id');
            const joNumber = this.getAttribute('data-number') || this.closest('[data-jo-id]')?.getAttribute('data-jo-id');
            console.log(`Reject button clicked for ${joNumber}`);
            openRejectConfirmModal(joId, joNumber);
        });
    });

    // === MODAL CLOSE BUTTONS ===

    // Modal close buttons (X buttons)
    const closeButtons = document.querySelectorAll('.JO-modal-close, .close-details-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            closeAllModals();
        });
    });

    // Click outside modal to close
    const modals = document.querySelectorAll('.JO-modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAllModals();
            }
        });
    });

    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // === CONFIRMATION MODAL BUTTONS ===

    // Approve confirmation modal - Cancel button
    const cancelApprovalBtn = document.getElementById('cancel-approval');
    if (cancelApprovalBtn) {
        cancelApprovalBtn.addEventListener('click', function() {
            closeAllModals();
        });
    }

    // Approve confirmation modal - Confirm button
    const confirmApproveBtn = document.getElementById('confirm-approve-btn');
    if (confirmApproveBtn) {
        confirmApproveBtn.addEventListener('click', function() {
            this.classList.add('loading');

            // Get the form
            const approveForm = document.getElementById('approve-form');

            // Set form action
            if (approveForm && !approveForm.action) {
                approveForm.action = '/joborder/approve-job-order/';
            }

            if (approveForm) {
                approveForm.submit();
            } else {
                // Fallback if form not found
                console.error('Approve form not found');
                this.classList.remove('loading');
                createToast('Error: Form not found', 'error');
            }
        });
    }

    // Reject confirmation modal - Cancel button
    const cancelRejectionBtn = document.getElementById('cancel-rejection');
    if (cancelRejectionBtn) {
        cancelRejectionBtn.addEventListener('click', function() {
            closeAllModals();
        });
    }

    // Reject confirmation modal - Confirm button
    const confirmRejectBtn = document.getElementById('confirm-reject-btn');
    if (confirmRejectBtn) {
        confirmRejectBtn.addEventListener('click', function() {
            const reasonInput = document.getElementById('rejection-remarks');
            const errorMsg = document.getElementById('rejection-error');

            if (!reasonInput || !reasonInput.value.trim()) {
                if (errorMsg) errorMsg.style.display = 'block';
                if (reasonInput) reasonInput.focus();
                return;
            }

            if (errorMsg) errorMsg.style.display = 'none';
            this.classList.add('loading');

            // Get the form
            const rejectForm = document.getElementById('reject-form');

            // Set form action
            if (rejectForm && !rejectForm.action) {
                rejectForm.action = '/joborder/reject-job-order/';
            }

            if (rejectForm) {
                rejectForm.submit();
            } else {
                // Fallback if form not found
                console.error('Reject form not found');
                this.classList.remove('loading');
                createToast('Error: Form not found', 'error');
            }
        });
    }
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.querySelector('.JO-search-input');
    const searchButton = document.querySelector('.JO-search-button');
    const filterSelect = document.querySelector('.JO-filter-select');

    if (searchInput) {
        // Add input event listener to search as you type
        let typingTimer;
        const doneTypingInterval = 300; // Wait for 300ms after user stops typing
        let previousValue = searchInput.value;

        searchInput.addEventListener('input', function() {
            clearTimeout(typingTimer);

            // If the search field was cleared (previous value had content but now it's empty)
            // immediately filter the table to show all results
            if (previousValue && this.value === '') {
                filterTable();
                previousValue = '';
                return;
            }

            // Otherwise, use the typing timer for normal search behavior
            previousValue = this.value;
            typingTimer = setTimeout(filterTable, doneTypingInterval);
        });

        // Clear the timer if user continues typing
        searchInput.addEventListener('keydown', function() {
            clearTimeout(typingTimer);
        });

        // Also handle Enter key for immediate search
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default form submission
                clearTimeout(typingTimer);
                filterTable();
            }
        });

        // Search button click
        if (searchButton) {
            searchButton.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default form submission
                filterTable();
            });
        }
    }

    if (filterSelect) {
        // Immediate search on dropdown change
        filterSelect.addEventListener('change', function() {
            filterTable();
        });
    }

    // Initialize pagination
    initializePagination();

    // Check if there are URL parameters and update the UI
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const filterValue = urlParams.get('filter');

    if (searchInput && searchQuery) {
        searchInput.value = searchQuery;
        previousValue = searchQuery;
        // Apply the search filter
        setTimeout(filterTable, 100);
    }

    if (filterSelect && filterValue) {
        filterSelect.value = filterValue;
        // Apply the filter
        if (!searchQuery) {
            setTimeout(filterTable, 100);
        }
    }
}

// Pagination variables
let currentPage = 1;
let rowsPerPage = 10;
let filteredRows = [];
let filteredPendingItems = [];

/**
 * Initialize pagination functionality
 */
function initializePagination() {
    // Get all table rows
    const tableRows = document.querySelectorAll('.JO-table tbody tr:not(.JO-empty-row)');
    filteredRows = Array.from(tableRows);

    // Get all pending items
    const pendingItems = document.querySelectorAll('.AD-priority-item');
    filteredPendingItems = Array.from(pendingItems);

    // Update pagination display
    updatePagination();

    // Add event listeners to pagination buttons
    const prevPageBtn = document.querySelector('.JO-pagination-btn:first-child');
    const nextPageBtn = document.querySelector('.JO-pagination-btn:last-child');

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (!this.classList.contains('disabled') && currentPage > 1) {
                currentPage--;
                updatePagination();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
            if (!this.classList.contains('disabled') && currentPage < totalPages) {
                currentPage++;
                updatePagination();
            }
        });
    }
}

/**
 * Update pagination display and show appropriate rows
 */
function updatePagination() {
    const totalRows = filteredRows.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    // Get pagination container
    const paginationContainer = document.querySelector('.JO-pagination');

    // Show/hide pagination container based on whether we have results
    if (paginationContainer) {
        paginationContainer.style.display = totalRows > 0 ? '' : 'none';
    }

    // Update showing info
    const paginationInfo = document.querySelector('.JO-pagination-info');
    if (paginationInfo) {
        const start = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
        const end = Math.min(currentPage * rowsPerPage, totalRows);
        paginationInfo.innerHTML = `Showing ${start} to ${end} of ${totalRows} entries`;
    }

    // Update pagination buttons state
    const prevBtn = document.querySelector('.JO-pagination-btn:first-child');
    const nextBtn = document.querySelector('.JO-pagination-btn:last-child');

    if (prevBtn) {
        prevBtn.classList.toggle('disabled', currentPage === 1);
    }

    if (nextBtn) {
        nextBtn.classList.toggle('disabled', currentPage === totalPages || totalPages === 0);
    }

    // Generate page numbers
    const paginationPages = document.querySelector('.JO-pagination-pages');
    if (paginationPages) {
        paginationPages.innerHTML = '';

        if (totalPages > 0) {
            // First page
            if (currentPage > 1) {
                const firstPageBtn = document.createElement('a');
                firstPageBtn.href = 'javascript:void(0);';
                firstPageBtn.className = 'JO-pagination-page';
                firstPageBtn.textContent = '1';
                firstPageBtn.addEventListener('click', function() {
                    currentPage = 1;
                    updatePagination();
                });
                paginationPages.appendChild(firstPageBtn);

                // Ellipsis if needed
                if (currentPage > 3) {
                    const ellipsis = document.createElement('span');
                    ellipsis.className = 'JO-pagination-ellipsis';
                    ellipsis.textContent = '...';
                    paginationPages.appendChild(ellipsis);
                }
            }

            // Previous page
            if (currentPage > 1) {
                const prevPageBtn = document.createElement('a');
                prevPageBtn.href = 'javascript:void(0);';
                prevPageBtn.className = 'JO-pagination-page';
                prevPageBtn.textContent = currentPage - 1;
                prevPageBtn.addEventListener('click', function() {
                    currentPage--;
                    updatePagination();
                });
                paginationPages.appendChild(prevPageBtn);
            }

            // Current page
            const currentPageBtn = document.createElement('a');
            currentPageBtn.href = 'javascript:void(0);';
            currentPageBtn.className = 'JO-pagination-page active';
            currentPageBtn.textContent = currentPage;
            paginationPages.appendChild(currentPageBtn);

            // Next page
            if (currentPage < totalPages) {
                const nextPageBtn = document.createElement('a');
                nextPageBtn.href = 'javascript:void(0);';
                nextPageBtn.className = 'JO-pagination-page';
                nextPageBtn.textContent = currentPage + 1;
                nextPageBtn.addEventListener('click', function() {
                    currentPage++;
                    updatePagination();
                });
                paginationPages.appendChild(nextPageBtn);
            }

            // Ellipsis if needed
            if (currentPage < totalPages - 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'JO-pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationPages.appendChild(ellipsis);
            }

            // Last page
            if (currentPage < totalPages) {
                const lastPageBtn = document.createElement('a');
                lastPageBtn.href = 'javascript:void(0);';
                lastPageBtn.className = 'JO-pagination-page';
                lastPageBtn.textContent = totalPages;
                lastPageBtn.addEventListener('click', function() {
                    currentPage = totalPages;
                    updatePagination();
                });
                paginationPages.appendChild(lastPageBtn);
            }
        }
    }

    // Show/hide rows based on current page
    showPageRows();
}

/**
 * Show rows for the current page
 */
function showPageRows() {
    // Hide all rows first
    const allRows = document.querySelectorAll('.JO-table tbody tr');
    allRows.forEach(row => {
        row.style.display = 'none';
    });

    // Remove any existing no results row
    const existingNoResultsRow = document.querySelector('.JO-empty-row');
    if (existingNoResultsRow) {
        existingNoResultsRow.remove();
    }

    // Get the table container
    const tableContainer = document.querySelector('.JO-table-container');

    // Show no results message if no filtered rows
    if (filteredRows.length === 0) {
        // Remove overflow-y when showing no results message
        if (tableContainer) {
            tableContainer.style.overflowY = 'visible';
        }

        // Create no results message
        const tbody = document.querySelector('.JO-table tbody');
        if (tbody) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.className = 'JO-empty-row';
            noResultsRow.innerHTML = `
                <td colspan="8">
                    <div class="JO-no-results">
                        <div class="JO-no-results-icon">
                            <i class="fas fa-search"></i>
                        </div>
                        <p class="JO-no-results-message">No matching Job Order requests found</p>
                        <p class="JO-no-results-hint">Try adjusting your search criteria</p>
                    </div>
                </td>
            `;
            tbody.appendChild(noResultsRow);
        }
        return;
    }

    // Restore overflow-y when showing results
    if (tableContainer) {
        tableContainer.style.overflowY = 'auto';
    }

    // Calculate start and end indices for current page
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredRows.length);

    // Show rows for current page
    for (let i = startIndex; i < endIndex; i++) {
        const row = filteredRows[i];
        row.style.display = '';
    }
}

/**
 * Filter table based on search text and filter value
 */
function filterTable() {
    const searchInput = document.querySelector('.JO-search-input');
    const filterSelect = document.querySelector('.JO-filter-select');

    const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filterValue = filterSelect ? filterSelect.value : 'all';

    // Filter table rows (only affects the "All Job Order Requests" table)
    const allRows = document.querySelectorAll('.JO-table tbody tr:not(.JO-empty-row)');
    filteredRows = Array.from(allRows).filter(row => {
        const text = row.textContent.toLowerCase();
        const matchesSearch = searchText === '' || text.includes(searchText);

        const categoryCell = row.querySelector('.JO-category-pill');
        const matchesFilter = filterValue === 'all' ||
                             (categoryCell && categoryCell.classList.contains(`JO-category-${filterValue.toLowerCase()}`));

        return matchesSearch && matchesFilter;
    });

    // Do NOT filter the "Action Required" section
    // Make sure all pending items are visible regardless of search/filter
    const allPendingItems = document.querySelectorAll('.AD-priority-item');
    filteredPendingItems = Array.from(allPendingItems);

    // Make sure all pending items are visible
    allPendingItems.forEach(item => {
        item.style.display = '';
    });

    // Show the "All caught up!" message if there are no pending items
    const pendingList = document.getElementById('priority-list');
    const noPendingRequests = document.querySelector('.AD-no-requests');

    if (pendingList) {
        // Remove any existing no results message that might have been added previously
        const existingNoResults = pendingList.querySelector('.AD-no-requests.search-no-results');
        if (existingNoResults) {
            existingNoResults.remove();
        }

        // Show original "All caught up!" message if there are no pending items at all
        if (allPendingItems.length === 0 && noPendingRequests) {
            noPendingRequests.style.display = '';
        }
    }

    // Reset to first page for the table pagination
    currentPage = 1;

    // Update pagination for the table
    updatePagination();
}

// Perform search with the current search and filter values (for backward compatibility)
function performSearch() {
    filterTable();
}

// Navigate to a specific page (for backward compatibility)
function navigateToPage(pageNumber) {
    currentPage = pageNumber;
    updatePagination();
}

// Open Job Order Details Modal
function fetchJobOrderDetails(joId, joNumber) {
    const detailsModal = document.getElementById('jo-details-modal');

    if (!detailsModal) {
        console.error('Details modal not found');
        return;
    }

    // Make the modal visible
    detailsModal.style.display = 'flex';

    // Add active class for animation
    setTimeout(() => {
        detailsModal.classList.add('active');
    }, 10);

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
    const canCloseTransaction = data.jo_status === 'Completed' && data.is_creator === true;

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
            closeAllModals();
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
    approvalSequence.forEach(step => {
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

// Open approve confirmation modal
function openApproveConfirmModal(joId, joNumber) {
    console.log(`Opening approve confirmation modal for JO: ${joNumber}`);
    const modal = document.getElementById('approve-confirm-modal');

    if (!modal) {
        console.error('Approve confirmation modal not found');
        return;
    }

    // Update JO ID and number in the modal
    const joIdInput = document.getElementById('approve-jo-id');
    const joNumberElement = document.getElementById('approve-jo-number');

    if (joIdInput) {
        joIdInput.value = joId;
    }

    if (joNumberElement) {
        joNumberElement.textContent = joNumber;
    }

    // Clear previous remarks if any
    const remarksInput = document.getElementById('approval-remarks');
    if (remarksInput) {
        remarksInput.value = '';
    }

    // Make sure the modal is visible
    modal.style.display = 'flex';

    // Add active class to show the modal with animation
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// Open reject confirmation modal
function openRejectConfirmModal(joId, joNumber) {
    console.log(`Opening reject confirmation modal for JO: ${joNumber}`);
    const modal = document.getElementById('reject-confirm-modal');

    if (!modal) {
        console.error('Reject confirmation modal not found');
        return;
    }

    // Update JO ID and number in the modal
    const joIdInput = document.getElementById('reject-jo-id');
    const joNumberElement = document.getElementById('reject-jo-number');

    if (joIdInput) {
        joIdInput.value = joId;
    }

    if (joNumberElement) {
        joNumberElement.textContent = joNumber;
    }

    // Clear previous input and hide error message
    const reasonInput = document.getElementById('rejection-remarks');
    const errorMsg = document.getElementById('rejection-error');

    if (reasonInput) {
        reasonInput.value = '';
    }

    if (errorMsg) {
        errorMsg.style.display = 'none';
    }

    // Make sure the modal is visible
    modal.style.display = 'flex';

    // Add active class to show the modal with animation
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// Close all modals
function closeAllModals() {
    const modals = document.querySelectorAll('.JO-modal');
    modals.forEach(modal => {
        modal.classList.remove('active');

        // Wait for animation to complete before hiding the modal
        setTimeout(() => {
            if (!modal.classList.contains('active')) {
                modal.style.display = 'none';
            }
        }, 300);
    });
}

// Placeholder for cancel job order confirmation
function confirmCancelJobOrder(joId, joNumber) {
    console.log(`Cancel job order: ${joNumber} (ID: ${joId})`);
    // This function would normally show a confirmation modal
    // and handle the cancellation process
    createToast(`Cancel job order functionality is not implemented yet.`, 'info');
}

// Placeholder for close transaction confirmation
function confirmCloseTransaction(joId, joNumber) {
    console.log(`Close transaction: ${joNumber} (ID: ${joId})`);
    // This function would normally show a confirmation modal
    // and handle the transaction closure process
    createToast(`Close transaction functionality is not implemented yet.`, 'info');
}

// Toast notification functionality
function createToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error('Toast container not found');
        return;
    }

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

    // Add entry animation
    toast.style.animation = 'slideInRight 0.3s ease, fadeOut 0.3s ease ' + (duration - 300) + 'ms forwards';

    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        removeToast(toast);
    });

    // Auto dismiss after duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// Add animation keyframes
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes rotate360 {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .rotate-animation {
        animation: rotate360 1s ease;
    }

    @keyframes bounce {
        0% { transform: translateY(0); }
        100% { transform: translateY(-10px); }
    }

    .bounce-animation {
        animation: bounce 2s infinite alternate ease-in-out;
    }

    @keyframes pulse {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 0.8; }
    }

    .pulse-animation {
        animation: pulse 1.5s infinite;
    }
`;
document.head.appendChild(animationStyles);