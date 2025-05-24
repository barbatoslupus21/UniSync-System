/**
 * Manhours Management Module - Main JavaScript
 * Handles charts, data management, and user interactions
 */

// Global chart instances
let analysisChart = null;
let machineChart = null;

// Chart refresh interval (5 minutes)
const CHART_REFRESH_INTERVAL = 5 * 60 * 1000;

// When the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations for page elements
    animateOnPage();

    // Initialize all charts
    initializeCharts();

    // Setup event listeners
    setupEventListeners();

    // Set default dates
    setDefaultDates();

    // Setup refresh interval for charts (5 minutes)
    // Pass false for both showAnimation and showToast to make it silent
    setInterval(() => {
        refreshCharts(false, false);
    }, CHART_REFRESH_INTERVAL);

    // Set up the edit buttons with fixed functionality
    setupEditButtons();

    // Set up the edit form submission
    setupEditFormSubmission();

    // Add animation styles
    addAnimationStyles();
});

/**
 * Initialize animations for page elements
 */
function animateOnPage() {
    // Animate stats cards with staggered delay
    const statsCards = document.querySelectorAll('.MH-stats-card');
    statsCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });

    // Animate table rows with staggered delay
    const tableRows = document.querySelectorAll('.MH-table tbody tr');
    tableRows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';

        setTimeout(() => {
            row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, 50 * index);
    });
}

/**
 * Set up all event listeners for the page
 */
function setupEventListeners() {
    // ========== Modal Controls ==========

    // New entry button
    const newEntryBtn = document.getElementById('new-entry-btn');
    if (newEntryBtn) {
        newEntryBtn.addEventListener('click', function() {
            openModal('new-manhours-modal');
        });
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            setDefaultDates();
            openModal('export-options-modal');
        });
    }

    // Close modal buttons
    const closeModalButtons = document.querySelectorAll('.JO-modal-close, #cancel-entry, .close-details-modal, .close-export-modal, #edit-cancel-btn');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.JO-modal');
            if (modal) closeModal(modal.id);
        });
    });

    // Handle clicking outside modals
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('JO-modal')) {
            closeModal(e.target.id);
        }
    });

    // Handle chart period selector for analysis chart
    const chartPeriodSelector = document.getElementById('chart-period-selector');
    if (chartPeriodSelector) {
        chartPeriodSelector.addEventListener('change', function() {
            fetchShiftOutputData(this.value, true);

            // Show toast notification about data period change
            const periodText = this.options[this.selectedIndex].text;
            createToast(`Shift output data updated to ${periodText}`, 'info');
        });
    }

    // Handle machine chart period selector
    const machinePeriodSelector = document.getElementById('machine-period-selector');
    if (machinePeriodSelector) {
        machinePeriodSelector.addEventListener('change', function() {
            fetchMachinePerformance(this.value, true);
            createToast(`Machine output data updated to show ${this.value === 'week' ? 'weekly' : 'monthly'} data`, 'info');
        });
    }

    // Filter by shift
    const shiftFilter = document.getElementById('shift-filter');
    if (shiftFilter) {
        shiftFilter.addEventListener('change', function() {
            const selectedShift = this.value;
            const tableRows = document.querySelectorAll('#manhours-table-body tr');
            const noResultsMessage = document.getElementById('manhours-no-results');
            const table = document.querySelector('.MH-table');
            const paginationContainer = document.querySelector('.MH-pagination');

            let matchCount = 0;
            let hasEmptyRow = false;

            // Check if there's already an empty state row
            tableRows.forEach(row => {
                if (row.querySelector('td[colspan]')) {
                    hasEmptyRow = true;
                }
            });

            // If the table is already empty, don't process further
            if (hasEmptyRow && selectedShift === 'all') {
                return;
            }

            // Process each row
            tableRows.forEach(row => {
                // Skip the empty message row
                if (row.querySelector('td[colspan]')) {
                    return;
                }

                if (selectedShift === 'all') {
                    row.style.display = '';
                    matchCount++;
                } else {
                    const shiftCell = row.querySelector('td[data-label="Shift"]');
                    if (shiftCell && shiftCell.textContent.trim() === selectedShift) {
                        row.style.display = '';
                        matchCount++;
                    } else {
                        row.style.display = 'none';
                    }
                }
            });

            // Show/hide no results message
            if (noResultsMessage) {
                if (matchCount === 0 && selectedShift !== 'all') {
                    // Hide the table and show no results message
                    if (table) table.style.display = 'none';
                    noResultsMessage.style.display = 'flex';

                    // Hide pagination if no results
                    if (paginationContainer) paginationContainer.style.display = 'none';
                } else {
                    // Show the table and hide no results message
                    if (table) table.style.display = '';
                    noResultsMessage.style.display = 'none';

                    // Show pagination if we have results
                    if (paginationContainer) paginationContainer.style.display = '';
                }
            }

            // No toast notification for filter results
        });
    }

    // Search functionality
    const searchInput = document.querySelector('.MH-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            searchTable(searchTerm);
        });
    }

    // View details buttons
    const viewDetailsButtons = document.querySelectorAll('.view-details-btn');
    viewDetailsButtons.forEach(button => {
        button.addEventListener('click', function() {
            const entryId = this.getAttribute('data-id');
            if (!entryId) {
                createToast('Missing entry ID', 'error');
                return;
            }

            // Show loading state in modal first
            const modalContent = document.getElementById('view-details-content');
            if (modalContent) {
                modalContent.innerHTML = `
                    <div class="JO-loading text-center p-5">
                        <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                        <p>Loading entry details...</p>
                    </div>
                `;
            }

            // Open the modal immediately to show loading state
            openModal('view-details-modal');

            // Try the correct URL format based on your URL configuration
            fetch(`/manhours/manhour-details/${entryId}/`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server responded with status ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Entry details response:', data); // Debug log

                    if (data.status === 'success') {
                        displayEntryDetails(data.entry);

                        // Set the entry ID on the edit button
                        const editBtn = document.querySelector('#view-edit-btn');
                        if (editBtn) {
                            editBtn.setAttribute('data-id', entryId);
                        }
                    } else {
                        // Show error in modal
                        if (modalContent) {
                            modalContent.innerHTML = `
                                <div class="JO-error-message text-center p-5">
                                    <i class="fas fa-exclamation-circle fa-2x text-danger mb-3"></i>
                                    <p>${data.message || 'Failed to load details'}</p>
                                </div>
                            `;
                        }
                        createToast(data.message || 'Failed to load details', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error fetching details:', error);

                    if (modalContent) {
                        modalContent.innerHTML = `
                            <div class="JO-error-message text-center p-5">
                                <i class="fas fa-exclamation-circle fa-2x text-danger mb-3"></i>
                                <p>Error loading details: ${error.message}</p>
                            </div>
                        `;
                    }

                    createToast('Failed to load entry details. Please try again.', 'error');
                });
        });
    });

    // View-edit button functionality
    const viewEditBtn = document.getElementById('view-edit-btn');
    if (viewEditBtn) {
        viewEditBtn.addEventListener('click', function() {
            const entryId = this.getAttribute('data-id');
            closeModal('view-details-modal');

            if (entryId) {
                // Show loading state
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

                fetch(`/manhours/manhour-details/${entryId}/`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Server returned status ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Reset button state
                        this.innerHTML = 'Edit Entry';

                        if (data.status === 'success') {
                            configureEditForm(data.entry);
                            openModal('edit-manhours-modal');
                        } else {
                            createToast(data.message || 'Failed to load details for editing', 'error');
                        }
                    })
                    .catch(error => {
                        // Reset button state
                        this.innerHTML = 'Edit Entry';

                        console.error('Error:', error);
                        createToast('An error occurred while loading the details', 'error');
                    });
            }
        });
    }

    // New entry form validation and submission
    const newEntryForm = document.getElementById('manhours-form');
    if (newEntryForm) {
        newEntryForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (validateManhourForm(this)) {
                // Show loading state on button
                const submitBtn = document.getElementById('submit-entry');
                if (submitBtn) {
                    submitBtn.classList.add('loading');
                    submitBtn.innerText = '';
                }

                this.submit();
            }
        });
    }

    // Export form submission
    // const exportForm = document.querySelector('#export-options-modal form');
    // if (exportForm) {
    //     exportForm.addEventListener('submit', function(e) {
    //         e.preventDefault();

    //         // Get form data
    //         const formData = new FormData(this);
    //         const startDate = formData.get('start_date');
    //         const endDate = formData.get('end_date');
    //         const format = formData.get('export_format');

    //         // Validate dates
    //         if (!startDate || !endDate) {
    //             createToast('Please select both start and end dates', 'error');
    //             return;
    //         }

    //         // Show loading state
    //         const submitBtn = document.getElementById('confirm-export-btn');
    //         if (submitBtn) {
    //             submitBtn.classList.add('loading');
    //             submitBtn.innerText = '';
    //         }

    //         // Send export request
    //         fetch('/manhours/export-data/', {
    //             method: 'POST',
    //             body: formData
    //         })
    //         .then(response => {
    //             if (!response.ok) {
    //                 throw new Error('Export request failed');
    //             }
    //             return response.blob();
    //         })
    //         .then(blob => {
    //             // Create download link
    //             const url = window.URL.createObjectURL(blob);
    //             const a = document.createElement('a');
    //             a.style.display = 'none';
    //             a.href = url;
    //             a.download = `manhours_${startDate}_to_${endDate}.${format}`;
    //             document.body.appendChild(a);
    //             a.click();
    //             window.URL.revokeObjectURL(url);

    //             // Reset button and close modal
    //             if (submitBtn) {
    //                 submitBtn.classList.remove('loading');
    //                 submitBtn.innerText = 'Export';
    //             }

    //             closeModal('export-options-modal');
    //             createToast('Data exported successfully', 'success');
    //         })
    //         .catch(error => {
    //             console.error('Export error:', error);

    //             // Reset button
    //             if (submitBtn) {
    //                 submitBtn.classList.remove('loading');
    //                 submitBtn.innerText = 'Export';
    //             }

    //             createToast('Failed to export data. Please try again.', 'error');
    //         });
    //     });
    // }
}

/**
 * Set up the edit buttons with fixed functionality
 */
function setupEditButtons() {
    const editButtons = document.querySelectorAll('.edit-manhours-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const entryId = this.getAttribute('data-id');
            if (!entryId) {
                createToast('Missing entry ID', 'error');
                return;
            }

            // Update loading state in button
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            // Fetch the entry details to populate the form
            fetch(`/manhours/manhour-details/${entryId}/`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server responded with status ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Restore button state
                    this.innerHTML = '<i class="fas fa-edit"></i>';

                    if (data.status === 'success') {
                        // Configure form for the specific entry
                        configureEditForm(data.entry);
                        // Open the modal
                        openModal('edit-manhours-modal');
                    } else {
                        createToast(data.message || 'Failed to load entry details for editing', 'error');
                    }
                })
                .catch(error => {
                    // Restore button state
                    this.innerHTML = '<i class="fas fa-edit"></i>';

                    console.error('Error fetching edit details:', error);
                    createToast('Failed to load entry details. Please try again.', 'error');
                });
        });
    });
}

/**
 * Configure the edit form with the correct entry data and action URL
 * @param {Object} entry - The entry data from the API
 */
function configureEditForm(entry) {
    // Set the hidden entry ID
    document.getElementById('edit-entry-id').value = entry.id;

    // Format date for the input (YYYY-MM-DD)
    const date = new Date(entry.date_completed);
    const formattedDate = date.toISOString().split('T')[0];
    document.getElementById('edit-date-input').value = formattedDate;

    // Set the operator select - note that the value is the operator name
    const operatorSelect = document.getElementById('edit-operator-input');
    if (operatorSelect) {
        for (let i = 0; i < operatorSelect.options.length; i++) {
            if (operatorSelect.options[i].value === entry.operator) {
                operatorSelect.selectedIndex = i;
                break;
            }
        }
    }

    // Set shift select
    const shiftSelect = document.getElementById('edit-shift-input');
    if (shiftSelect) {
        for (let i = 0; i < shiftSelect.options.length; i++) {
            if (shiftSelect.options[i].value === entry.shift) {
                shiftSelect.selectedIndex = i;
                break;
            }
        }
    }

    // Set machine select by machine_id
    const machineSelect = document.getElementById('edit-machine-input');
    if (machineSelect && entry.machine_id) {
        for (let i = 0; i < machineSelect.options.length; i++) {
            if (machineSelect.options[i].value == entry.machine_id) {
                machineSelect.selectedIndex = i;
                break;
            }
        }
    }

    // Set text and numeric inputs
    document.getElementById('edit-line-input').value = entry.line || '';
    document.getElementById('edit-setup-input').value = entry.setup || 0;
    document.getElementById('edit-manhours-input').value = parseFloat(entry.manhours || 0).toFixed(2);
    document.getElementById('edit-output-input').value = parseFloat(entry.output || 0).toFixed(2);

    // Add visual feedback for populated fields
    const formFields = document.querySelectorAll('#edit-manhours-form input, #edit-manhours-form select');
    formFields.forEach(field => {
        field.classList.add('populated');

        // Apply brief highlight animation
        field.style.animation = 'none';
        setTimeout(() => {
            field.style.animation = 'field-highlight 1s ease';
        }, 10);
    });
}

/**
 * Set up the edit form submission handler
 */
function setupEditFormSubmission() {
    const editForm = document.getElementById('edit-manhours-form');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Show loading state on button
            const submitBtn = document.getElementById('edit-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            }

            // Submit the form
            this.submit();
        });
    }
}

/**
 * Initialize all charts
 */
function initializeCharts() {
    try {
        // Initialize the Shift Output Trends Chart
        const analysisChartCtx = document.getElementById('mh-analysis-chart');
        if (analysisChartCtx) {
            try {
                const ctx = analysisChartCtx.getContext('2d');

                // Create gradients for AM and PM in advance
                const amGradient = ctx.createLinearGradient(0, 0, 0, 400);
                amGradient.addColorStop(0, 'rgba(102, 255, 153, 0.8)');
                amGradient.addColorStop(1, 'rgba(102, 255, 153, 0.2)');

                const pmGradient = ctx.createLinearGradient(0, 0, 0, 400);
                pmGradient.addColorStop(0, 'rgba(51, 153, 255, 0.8)');
                pmGradient.addColorStop(1, 'rgba(51, 153, 255, 0.2)');

                // Initialize with empty data
                analysisChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: []
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Total Output (units)'
                                },
                                grid: {
                                    color: 'rgba(32, 178, 170, 0.1)',
                                    lineWidth: 1
                                },
                                border: {
                                    display: true,
                                    color: 'rgb(32, 178, 170)',
                                    width: 1
                                },
                                ticks: {
                                    color: '#666'
                                }
                            },
                            x: {
                                ticks: {
                                    maxRotation: 0,
                                    minRotation: 0,
                                    font: {
                                        size: 11
                                    }
                                },
                                grid: {
                                    display: true,
                                    drawOnChartArea: true,
                                    drawTicks: true,
                                    color: 'rgba(32, 178, 170, 0.2)',
                                    lineWidth: 1,
                                    tickColor: 'rgba(32, 178, 170, 0.8)',
                                    tickWidth: 1,
                                    tickLength: 5,
                                    z: 1
                                },
                                border: {
                                    color: 'rgb(32, 178, 170)',
                                    width: 2,
                                    dash: []
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Shift Output Trends',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                },
                                padding: {
                                    top: 10,
                                    bottom: 20
                                }
                            },
                            legend: {
                                position: 'top',
                                labels: {
                                    boxWidth: 15,
                                    usePointStyle: true,
                                    pointStyle: 'circle'
                                }
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                callbacks: {
                                    label: function (context) {
                                        return `${context.dataset.label}: ${context.parsed.y} units`;
                                    }
                                }
                            }
                        },
                        elements: {
                            line: {
                                tension: 0.3,
                                fill: true
                            },
                            point: {
                                radius: 4,
                                hoverRadius: 6
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        },
                        animation: {
                            duration: 1000,
                            easing: 'easeOutQuart'
                        }
                    },
                    plugins: [{
                        // Plugin to auto-apply gradient colors to "AM" and "PM" datasets
                        id: 'applyAMPMGradients',
                        beforeDatasetsUpdate(chart) {
                            chart.data.datasets.forEach(dataset => {
                                if (dataset.label === 'AM' || dataset.label === 'AM Shift') {
                                    dataset.backgroundColor = amGradient;
                                    dataset.borderColor = 'rgba(0, 153, 76, 1)';
                                    dataset.pointBackgroundColor = 'rgba(0, 153, 76, 1)';
                                } else if (dataset.label === 'PM' || dataset.label === 'PM Shift') {
                                    dataset.backgroundColor = pmGradient;
                                    dataset.borderColor = 'rgba(0, 102, 204, 1)';
                                    dataset.pointBackgroundColor = 'rgba(0, 102, 204, 1)';
                                }
                            });
                        }
                    }]
                });

                // Fetch initial data for shift output trends with a small delay
                // This helps prevent race conditions during page load
                setTimeout(() => {
                    try {
                        fetchShiftOutputData('month');
                    } catch (error) {
                        console.error('Error fetching initial shift output data:', error);
                        const chartWrapper = document.querySelector('.MH-chart-wrapper');
                        if (chartWrapper) {
                            chartWrapper.innerHTML = `
                                <div class="MH-chart-error">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Failed to load shift output data</p>
                                </div>
                            `;
                        }
                    }
                }, 500);
            } catch (error) {
                console.error('Error initializing shift output chart:', error);
                const chartWrapper = document.querySelector('.MH-chart-wrapper');
                if (chartWrapper) {
                    chartWrapper.innerHTML = `
                        <div class="MH-chart-error">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Failed to initialize shift output chart</p>
                        </div>
                    `;
                }
            }
        }

        // Initialize the Machine Output Chart
        const machineChartCtx = document.getElementById('machine-chart');
        if (machineChartCtx) {
            try {
                machineChart = new Chart(machineChartCtx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: []
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Output'
                                },
                                grid: {
                                    color: 'rgba(32, 178, 170, 0.1)'
                                },
                                border: {
                                    color: 'rgb(32, 178, 170)',
                                    width: 1
                                }
                            },
                            y: {
                                grid: {
                                    display: false
                                },
                                border: {
                                    color: 'rgb(32, 178, 170)',
                                    width: 1
                                }
                            }
                        },
                        animation: {
                            duration: 1000,
                            easing: 'easeOutQuart'
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        return `Output: ${context.parsed.x} units`;
                                    }
                                }
                            }
                        }
                    }
                });

                // Fetch initial machine output data with a small delay
                setTimeout(() => {
                    try {
                        fetchMachinePerformance('month');
                    } catch (error) {
                        console.error('Error fetching initial machine performance data:', error);
                        const chartContainer = document.querySelector('.MH-metric-chart');
                        if (chartContainer) {
                            chartContainer.innerHTML = `
                                <div class="MH-chart-error">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Failed to load machine data</p>
                                </div>
                            `;
                        }
                    }
                }, 800);
            } catch (error) {
                console.error('Error initializing machine chart:', error);
                const chartContainer = document.querySelector('.MH-metric-chart');
                if (chartContainer) {
                    chartContainer.innerHTML = `
                        <div class="MH-chart-error">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Failed to initialize machine chart</p>
                        </div>
                    `;
                }
            }
        }
    } catch (error) {
        console.error('Error in chart initialization:', error);
    }
}


/**
 * Add animation styles
 */
function addAnimationStyles() {
    const styles = `
    @keyframes field-highlight {
        0% {
            background-color: rgba(51, 102, 255, 0.1);
        }
        100% {
            background-color: transparent;
        }
    }

    .populated {
        border-color: rgba(51, 102, 255, 0.5);
    }

    @keyframes MH-chart-appear {
        from {
            opacity: 0.6;
            transform: scale(0.98);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    @keyframes MH-row-highlight {
        0% {
            background-color: rgba(51, 102, 255, 0.1);
        }
        100% {
            background-color: transparent;
        }
    }

    .MH-pulse-animation {
        animation: MH-pulse 0.5s ease;
    }

    @keyframes MH-pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(51, 102, 255, 0.4);
        }
        70% {
            box-shadow: 0 0 0 10px rgba(51, 102, 255, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(51, 102, 255, 0);
        }
    }

    /* No results message */
    .MH-no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        width: 100%;
        min-height: 300px;
        position: relative;
        margin: 20px 0;
    }

    .MH-no-results-icon {
        color: #888;
        font-size: 24px;
        margin-bottom: 15px;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: #f5f5f5;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }

    .MH-no-results-message {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
    }

    .MH-no-results-suggestion {
        font-size: 14px;
        color: #666;
        max-width: 80%;
        margin: 0 auto;
    }

    /* Chart error styling */
    .MH-chart-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px;
        text-align: center;
        height: 100%;
        min-height: 200px;
    }

    .MH-chart-error i {
        font-size: 2rem;
        color: #f14668;
        margin-bottom: 15px;
    }

    .MH-chart-error p {
        font-size: 1rem;
        color: #666;
        margin-bottom: 15px;
    }
    `;

    // Add styles to document if not already present
    if (!document.getElementById('manhours-animation-styles')) {
        const styleElem = document.createElement('style');
        styleElem.id = 'manhours-animation-styles';
        styleElem.textContent = styles;
        document.head.appendChild(styleElem);
    }
}

/**
 * Refresh all charts with the latest data
 * @param {boolean} showAnimation - Whether to show animation when refreshing
 * @param {boolean} showToast - Whether to show a toast notification
 */
function refreshCharts(showAnimation = true, showToast = false) {
    try {
        // Refresh shift output chart if it exists
        if (analysisChart) {
            try {
                const periodSelector = document.getElementById('chart-period-selector');
                const period = periodSelector ? periodSelector.value : 'month';
                fetchShiftOutputData(period, false); // Don't show loading animation for auto-refresh
            } catch (error) {
                console.error('Error refreshing shift output chart:', error);
                // Don't show error message for silent refresh
            }
        }

        // Refresh machine performance chart if it exists
        if (machineChart) {
            try {
                // Get the machine chart period
                const machinePeriodSelector = document.getElementById('machine-period-selector');
                const machinePeriod = machinePeriodSelector ? machinePeriodSelector.value : 'month';
                fetchMachinePerformance(machinePeriod, false); // Don't show loading animation for auto-refresh
            } catch (error) {
                console.error('Error refreshing machine performance chart:', error);
                // Don't show error message for silent refresh
            }
        }

        // Add a subtle pulse animation to charts when they refresh (only if requested)
        if (showAnimation) {
            const chartElements = document.querySelectorAll('.MH-chart-wrapper, .MH-metric-chart');
            chartElements.forEach(element => {
                element.classList.add('MH-pulse-animation');
                setTimeout(() => {
                    element.classList.remove('MH-pulse-animation');
                }, 1000);
            });
        }

        // Only show toast if requested (not for auto-refresh)
        if (showToast) {
            createToast('Charts refreshed with latest data', 'info');
        }
    } catch (error) {
        console.error('Error in refreshCharts:', error);
        // Don't show error message for silent refresh
        if (showToast) {
            createToast('Failed to refresh charts', 'error');
        }
    }
}

/**
 * Fetch shift output data for line chart
 * @param {string} period - Time period to display (week/month/quarter)
 * @param {boolean} showLoading - Whether to show loading animation
 */
function fetchShiftOutputData(period, showLoading = true) {
    const chartWrapper = document.querySelector('.MH-chart-wrapper');

    // Only show loading state if requested (not for auto-refresh)
    if (showLoading && chartWrapper) {
        chartWrapper.style.opacity = '0.6';

        // Show loading animation
        const loadingAnimation = document.createElement('div');
        loadingAnimation.className = 'MH-chart-loader';
        loadingAnimation.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        if (!chartWrapper.querySelector('.MH-chart-loader')) {
            chartWrapper.appendChild(loadingAnimation);
        }
    }

    // Build URL with period parameter - we always want shift output data now
    const url = `/manhours/chart-data/?type=shiftOutput&period=${period}`;

    // Fetch data from the API
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateShiftOutputChart(data);
            if (chartWrapper) {
                chartWrapper.style.opacity = '1';
                const loader = chartWrapper.querySelector('.MH-chart-loader');
                if (loader) loader.remove();
            }
        })
        .catch(error => {
            console.error('Error fetching shift output data:', error);
            if (chartWrapper) {
                chartWrapper.style.opacity = '1';
                const loader = chartWrapper.querySelector('.MH-chart-loader');
                if (loader) loader.remove();

                // Show error message in chart container without retry button
                chartWrapper.innerHTML = `
                    <div class="MH-chart-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load shift output data</p>
                    </div>
                `;
            }
            createToast('Failed to load shift output data. Please try again.', 'error');
        });
}

/**
 * Update the shift output trend chart with new data
 * @param {Object} data - Chart data
 */
function updateShiftOutputChart(data) {
    if (!analysisChart) return;

    const ctx = document.getElementById('mh-analysis-chart').getContext('2d');

    // Create gradient for AM (light green)
    const amGradient = ctx.createLinearGradient(0, 0, 0, 400);
    amGradient.addColorStop(0, 'rgba(102, 255, 153, 0.8)');
    amGradient.addColorStop(1, 'rgba(102, 255, 153, 0.2)');

    // Create gradient for PM (light blue)
    const pmGradient = ctx.createLinearGradient(0, 0, 0, 400);
    pmGradient.addColorStop(0, 'rgba(51, 153, 255, 0.8)');
    pmGradient.addColorStop(1, 'rgba(51, 153, 255, 0.2)');

    // Apply gradients based on dataset labels
    data.datasets.forEach(dataset => {
        if (dataset.label === 'AM') {
            dataset.backgroundColor = amGradient;
            dataset.borderColor = 'rgba(0, 153, 76, 1)';
            dataset.pointBackgroundColor = 'rgba(0, 153, 76, 1)';
            dataset.fill = 'origin';
        } else if (dataset.label === 'PM') {
            dataset.backgroundColor = pmGradient;
            dataset.borderColor = 'rgba(0, 102, 204, 1)';
            dataset.pointBackgroundColor = 'rgba(0, 102, 204, 1)';
            dataset.fill = 'origin';
        }
    });

    if (analysisChart.config.type !== 'line') {
        analysisChart.destroy();
        analysisChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Output (units)'
                        },
                        grid: {
                            color: 'rgba(32, 178, 170, 0.1)',
                            lineWidth: 1
                        },
                        border: {
                            display: true,
                            color: 'rgb(32, 178, 170)',
                            width: 1
                        },
                        ticks: {
                            color: '#666'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            font: {
                                size: 11
                            },
                            // Use the day numbers for display
                            callback: function(value, index) {
                                if (data.xAxisLabels && data.xAxisLabels[index]) {
                                    return data.xAxisLabels[index];
                                }
                                return value;
                            }
                        },
                        grid: {
                            display: true,
                            drawOnChartArea: true,
                            drawTicks: true,
                            color: 'rgba(32, 178, 170, 0.2)',
                            lineWidth: 1,
                            tickColor: 'rgba(32, 178, 170, 0.8)',
                            tickWidth: 1,
                            tickLength: 5,
                            z: 1
                        },
                        border: {
                            color: 'rgb(32, 178, 170)',
                            width: 2,
                            dash: []
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: data.title || 'Shift Output Trends',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                // Use the tooltips array if available, otherwise use the default label
                                const dataIndex = context[0].dataIndex;
                                if (data.tooltips && data.tooltips[dataIndex]) {
                                    return data.tooltips[dataIndex];
                                }
                                return context[0].label;
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.3,
                        fill: true
                    },
                    point: {
                        radius: 4,
                        hoverRadius: 6
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    } else {
        // Update data and title
        analysisChart.data = data;

        // Update chart title if provided
        if (data.title && analysisChart.options.plugins.title) {
            analysisChart.options.plugins.title.text = data.title;
        }

        // Update tooltip callback to use the tooltips array
        if (data.tooltips && analysisChart.options.plugins.tooltip && analysisChart.options.plugins.tooltip.callbacks) {
            analysisChart.options.plugins.tooltip.callbacks.title = function(context) {
                const dataIndex = context[0].dataIndex;
                if (data.tooltips && data.tooltips[dataIndex]) {
                    return data.tooltips[dataIndex];
                }
                return context[0].label;
            };
        }

        // Update x-axis tick callback to use the day numbers
        if (data.xAxisLabels && analysisChart.options.scales && analysisChart.options.scales.x) {
            // Update tick callback
            analysisChart.options.scales.x.ticks.callback = function(value, index) {
                if (data.xAxisLabels && data.xAxisLabels[index]) {
                    return data.xAxisLabels[index];
                }
                return value;
            };

            // Update x-axis styling
            analysisChart.options.scales.x.grid = {
                display: true,
                drawOnChartArea: true,
                drawTicks: true,
                color: 'rgba(32, 178, 170, 0.2)',
                lineWidth: 1,
                tickColor: 'rgba(32, 178, 170, 0.8)',
                tickWidth: 1,
                tickLength: 5,
                z: 1
            };

            analysisChart.options.scales.x.border = {
                color: 'rgb(32, 178, 170)',
                width: 2,
                dash: []
            };

            // Update y-axis styling
            if (analysisChart.options.scales.y) {
                analysisChart.options.scales.y.grid = {
                    color: 'rgba(32, 178, 170, 0.1)',
                    lineWidth: 1
                };

                analysisChart.options.scales.y.border = {
                    display: true,
                    color: 'rgb(32, 178, 170)',
                    width: 1
                };

                analysisChart.options.scales.y.ticks = {
                    ...analysisChart.options.scales.y.ticks,
                    color: '#666'
                };
            }
        }

        analysisChart.update();
    }

    const chartCanvas = document.getElementById('mh-analysis-chart');
    if (chartCanvas) {
        chartCanvas.style.animation = 'none';
        setTimeout(() => {
            chartCanvas.style.animation = 'MH-chart-appear 0.8s ease-out forwards';
        }, 10);
    }

    analyzeShiftOutputData(data);
}

/**
 * Analyze shift output data to provide insights
 * @param {Object} data - Chart data
 */
function analyzeShiftOutputData(data) {
    if (!data || !data.datasets || data.datasets.length < 2) return;

    try {
        // Get AM and PM shift data
        const amShiftData = data.datasets.find(ds => ds.label === 'AM Shift')?.data || [];
        const pmShiftData = data.datasets.find(ds => ds.label === 'PM Shift')?.data || [];

        if (amShiftData.length === 0 || pmShiftData.length === 0) return;

        // Calculate totals
        const amTotal = amShiftData.reduce((sum, value) => sum + value, 0);
        const pmTotal = pmShiftData.reduce((sum, value) => sum + value, 0);

        // Find highest performing day
        const amMax = Math.max(...amShiftData);
        const amMaxIndex = amShiftData.indexOf(amMax);
        const pmMax = Math.max(...pmShiftData);
        const pmMaxIndex = pmShiftData.indexOf(pmMax);

        // Use tooltips if available, otherwise use labels
        const labels = data.tooltips || data.labels || [];

        // Determine which shift performed better overall
        let message = '';
        if (amTotal > pmTotal) {
            const percentage = ((amTotal - pmTotal) / pmTotal * 100).toFixed(1);
            message = `AM shift outperformed PM shift by ${percentage}% in total output`;
        } else if (pmTotal > amTotal) {
            const percentage = ((pmTotal - amTotal) / amTotal * 100).toFixed(1);
            message = `PM shift outperformed AM shift by ${percentage}% in total output`;
        } else {
            message = 'Both shifts had equal total output';
        }

    } catch (error) {
        console.error('Error analyzing shift data:', error);
    }
}

/**
 * Fetch machine output data from the server
 * @param {string} period - Time period to display (week/month)
 * @param {boolean} showLoading - Whether to show loading animation
 */
function fetchMachinePerformance(period = 'month', showLoading = true) {
    const chartContainer = document.querySelector('.MH-metric-chart');

    // Only show loading state if requested (not for auto-refresh)
    if (showLoading && chartContainer) {
        chartContainer.style.opacity = '0.6';

        // Show loading animation
        const loadingAnimation = document.createElement('div');
        loadingAnimation.className = 'MH-chart-loader';
        loadingAnimation.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        if (!chartContainer.querySelector('.MH-chart-loader')) {
            chartContainer.appendChild(loadingAnimation);
        }
    }

    // Fetch data from the API with period parameter
    fetch(`/manhours/machine-performance/?period=${period}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateMachineChart(data);
            if (chartContainer) {
                chartContainer.style.opacity = '1';
                const loader = chartContainer.querySelector('.MH-chart-loader');
                if (loader) loader.remove();
            }
        })
        .catch(error => {
            console.error('Error fetching machine output data:', error);
            if (chartContainer) {
                chartContainer.style.opacity = '1';
                const loader = chartContainer.querySelector('.MH-chart-loader');
                if (loader) loader.remove();

                // Show error message in chart container without retry button
                chartContainer.innerHTML = `
                    <div class="MH-chart-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load machine data</p>
                    </div>
                `;
            }
            createToast('Failed to load machine output data.', 'error');
        });
}

/**
 * Update the machine performance chart with new data
 * @param {Object} data - Chart data
 */
function updateMachineChart(data) {
    if (!machineChart) return;

    // Check if data is valid
    if (!data || !data.datasets || !data.labels || data.labels.length === 0) {
        console.error('Invalid machine chart data:', data);
        const chartContainer = document.querySelector('.MH-metric-chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="MH-chart-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No machine performance data available</p>
                </div>
            `;
        }
        return;
    }

    // Update chart with data
    machineChart.data = data;
    machineChart.update();

    // Add a visual feedback animation
    const chartCanvas = document.getElementById('machine-chart');
    if (chartCanvas) {
        chartCanvas.style.animation = 'none';
        setTimeout(() => {
            chartCanvas.style.animation = 'MH-chart-appear 0.8s ease-out forwards';
        }, 10);
    }

    // Add a highlight effect for the highest performing machine
    setTimeout(() => {
        try {
            if (data && data.datasets && data.datasets[0] && data.datasets[0].data && data.datasets[0].data.length > 0) {
                const maxValue = Math.max(...data.datasets[0].data);
                const maxIndex = data.datasets[0].data.indexOf(maxValue);

                if (maxIndex >= 0) {
                    // Get all the bars in the chart
                    const meta = machineChart.getDatasetMeta(0);
                    if (meta && meta.data && meta.data.length > 0) {
                        const barElements = meta.data;

                        if (barElements && barElements[maxIndex]) {
                            // Trigger highlight animation for the top performer
                            const bestPerformerBar = barElements[maxIndex];
                            bestPerformerBar.options.backgroundColor = 'rgba(72, 199, 116, 0.8)';
                            bestPerformerBar.options.borderColor = 'rgba(72, 199, 116, 1)';

                            // Update to show the changes
                            machineChart.update();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error highlighting top performer:', error);
        }
    }, 1000);
}

/**
 * Search the manhours table for matching entries
 * @param {string} searchTerm - The search term
 */
function searchTable(searchTerm) {
    const tableRows = document.querySelectorAll('#manhours-table-body tr');
    const tableContainer = document.querySelector('.MH-table-container');
    const noResultsMessage = document.getElementById('manhours-no-results');
    const table = document.querySelector('.MH-table');
    const paginationContainer = document.querySelector('.MH-pagination');

    let matchCount = 0;
    let hasEmptyRow = false;

    // Check if there's already an empty state row
    tableRows.forEach(row => {
        if (row.querySelector('td[colspan]')) {
            hasEmptyRow = true;
        }
    });

    // If the table is already empty, don't process further
    if (hasEmptyRow && searchTerm.length === 0) {
        return;
    }

    // Process each row
    tableRows.forEach(row => {
        // Skip the empty message row
        if (row.querySelector('td[colspan]')) {
            return;
        }

        let found = false;
        const cells = row.querySelectorAll('td');

        cells.forEach(cell => {
            if (cell.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                found = true;
            }
        });

        if (found) {
            row.style.display = '';
            matchCount++;
            // Add a subtle highlight animation
            row.style.animation = 'none';
            setTimeout(() => {
                row.style.animation = 'MH-row-highlight 1s ease';
            }, 10);
        } else {
            row.style.display = 'none';
        }
    });

    // Show/hide no results message
    if (noResultsMessage) {
        if (matchCount === 0 && searchTerm.length > 0) {
            // Hide the table and show no results message
            if (table) table.style.display = 'none';
            noResultsMessage.style.display = 'flex';

            // Hide pagination if no results
            if (paginationContainer) paginationContainer.style.display = 'none';
        } else {
            // Show the table and hide no results message
            if (table) table.style.display = '';
            noResultsMessage.style.display = 'none';

            // Show pagination if we have results
            if (paginationContainer) paginationContainer.style.display = '';
        }
    }

    // No toast notification for search results
}

/**
 * Set default dates for date inputs
 */
function setDefaultDates() {
    // Set today's date for new entry
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        dateInput.value = formattedDate;
    }

    // Set default dates for export (current month)
    const startDate = document.getElementById('export-start-date');
    const endDate = document.getElementById('export-end-date');

    if (startDate && endDate) {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        startDate.valueAsDate = firstDay;
        endDate.valueAsDate = lastDay;
    }
}

/**
 * Validate manhour form before submission
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateManhourForm(form) {
    // Get form fields
    const operator = form.querySelector('#operator-input').value;
    const shift = form.querySelector('#shift-input').value;
    const line = form.querySelector('#line-input').value;
    const machine = form.querySelector('#machine-input').value;
    const setup = form.querySelector('#setup-input').value;
    const manhours = form.querySelector('#manhours-input').value;
    const output = form.querySelector('#output-input').value;
    const date = form.querySelector('#date-input').value;

    // Check required fields
    if (!operator) {
        createToast('Please select an operator', 'error');
        return false;
    }

    if (!shift) {
        createToast('Please select a shift', 'error');
        return false;
    }

    if (!line) {
        createToast('Please enter a line', 'error');
        return false;
    }

    if (!machine) {
        createToast('Please select a machine', 'error');
        return false;
    }

    if (isNaN(setup) || setup < 0) {
        createToast('Please enter a valid setup time', 'error');
        return false;
    }

    if (isNaN(manhours) || manhours <= 0) {
        createToast('Please enter valid manhours (greater than 0)', 'error');
        return false;
    }

    if (isNaN(output) || output < 0) {
        createToast('Please enter a valid output amount', 'error');
        return false;
    }

    if (!date) {
        createToast('Please select a completion date', 'error');
        return false;
    }

    return true;
}

/**
 * Open a modal with fade-in animation
 * @param {string} modalId - The ID of the modal to open
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Reset form if this is the new entry modal
    if (modalId === 'new-manhours-modal') {
        const form = modal.querySelector('form');
        if (form) {
            form.reset();

            // Set today's date as default
            const dateInput = document.getElementById('date-input');
            if (dateInput) {
                const now = new Date();
                const formattedDate = now.toISOString().split('T')[0];
                dateInput.value = formattedDate;
            }
        }
    }

    // Display the modal
    modal.style.display = 'flex';

    // Trigger fade-in animation
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    // Disable body scrolling
    document.body.style.overflow = 'hidden';
}

/**
 * Close a modal with fade-out animation
 * @param {string} modalId - The ID of the modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Trigger fade-out animation
    modal.classList.remove('active');

    // Hide the modal after animation completes
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);

    // Re-enable body scrolling
    document.body.style.overflow = '';
}

/**
 * Display details of a manhours entry in the modal
 * @param {Object} entry - The entry data
 */
function displayEntryDetails(entry) {
    const modalContent = document.getElementById('view-details-content');
    if (!modalContent) return;

    // Format dates
    const completedDate = new Date(entry.date_completed);
    const submittedDate = new Date(entry.date_submitted);

    const formattedCompletedDate = completedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const formattedSubmittedDate = submittedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Update the modal content
    modalContent.innerHTML = `
        <div class="JO-details-section">
            <h4>Basic Information</h4>
            <div class="JO-details-grid">
                <div class="JO-details-item">
                    <span class="JO-details-label">Date:</span>
                    <span class="JO-details-value">${formattedCompletedDate}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Operator:</span>
                    <span class="JO-details-value">${entry.operator}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Shift:</span>
                    <span class="JO-details-value">${entry.shift}</span>
                </div>

                <div class="JO-details-item">
                    <span class="JO-details-label">Line:</span>
                    <span class="JO-details-value">${entry.line}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Machine:</span>
                    <span class="JO-details-value">${entry.machine_name}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Setup Hours:</span>
                    <span class="JO-details-value">${entry.setup}</span>
                </div>
            </div>
        </div>

        <div class="JO-details-section">
            <h4>Performance Metrics</h4>
            <div class="JO-details-grid">
                <div class="JO-details-item">
                    <span class="JO-details-label">Setup:</span>
                    <span class="JO-details-value">${entry.setup}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Man-hours:</span>
                    <span class="JO-details-value">${entry.manhours}</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Output:</span>
                    <span class="JO-details-value">${entry.output} units</span>
                </div>
                <div class="JO-details-item">
                    <span class="JO-details-label">Output/Hour:</span>
                    <span class="JO-details-value">${entry.total_output}</span>
                </div>
            </div>
        </div>
    `;

    // Add animation to sections
    const sections = modalContent.querySelectorAll('.JO-details-section');
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';

        setTimeout(() => {
            section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 100 * index);
    });
}

/**
 * Display a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast: success, error, warning, info
 * @param {number} duration - How long to display the toast (ms)
 */
function createToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

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

/**
 * Remove a toast notification with animation
 * @param {HTMLElement} toast - The toast element to remove
 */
function removeToast(toast) {
    toast.classList.remove('JO-toast-show');
    toast.classList.add('JO-toast-hide');

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}