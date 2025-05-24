/**
 * Overtime Management Module JavaScript
 * Handles all overtime-related functionality including filing, reviewing, and managing overtime requests
 */

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    initializeTabs();

    // Initialize form events
    initializeFormEvents();

    // Initialize modals
    initializeModals();

    // Cancel password button
    const cancelPasswordButton = document.getElementById('cancel-password');
    if (cancelPasswordButton) {
        cancelPasswordButton.addEventListener('click', function() {
            const passwordModal = document.getElementById('password-modal');
            const parentModalId = passwordModal.getAttribute('data-parent-modal');

            closeModal('password-modal');

            // If there's a parent modal, make sure it stays open
            if (parentModalId) {
                const parentModal = document.getElementById(parentModalId);
                if (parentModal && !parentModal.classList.contains('active')) {
                    openModal(parentModalId);
                }
            }
        });
    }

    // Initialize charts if they exist
    initializeCharts();

    // Initialize search functionality
    initializeSearch();

    // Set default values for Daily OT time inputs
    const dailyStartTimeInput = document.getElementById('daily-start-time-modal');
    const dailyEndTimeInput = document.getElementById('daily-end-time-modal');

    if (dailyStartTimeInput) {
        dailyStartTimeInput.value = '16:00'; // 4:00 PM
    }

    if (dailyEndTimeInput) {
        dailyEndTimeInput.value = '18:00'; // 6:00 PM
    }
});

/**
 * Initialize tab navigation
 * Tab buttons have been removed, so we'll just show the appropriate content based on user role
 */
function initializeTabs() {
    // Since tab buttons are removed, we need to determine which tab content to show based on user role
    // We'll show the first tab content that exists
    const tabContents = document.querySelectorAll('.OT-tab-content');

    // First, hide all tab contents
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Then show the first one (if any exist)
    if (tabContents.length > 0) {
        tabContents[0].classList.add('active');
    }
}

/**
 * Initialize form events
 */
function initializeFormEvents() {
    // New OT request button
    const newOTButton = document.getElementById('new-ot-request-btn');
    if (newOTButton) {
        newOTButton.addEventListener('click', function() {
            openModal('ot-selection-modal');
        });
    }

    // Create Group button
    const createGroupButton = document.getElementById('create-group-btn');
    if (createGroupButton) {
        createGroupButton.addEventListener('click', function() {
            // Reset the form
            resetGroupModal();

            // No need to check for groups here as setGroupModalMode will handle it

            // Set mode to create (always default to create mode when opening)
            setGroupModalMode('create');

            // Open the modal
            openModal('group-modal');
        });
    }

    // OT selection options
    const selectionOptions = document.querySelectorAll('.OT-selection-option');
    selectionOptions.forEach(option => {
        option.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            closeModal('ot-selection-modal');

            // Open the corresponding OT filing modal
            if (type === 'shifting') {
                openModal('shifting-ot-modal');
            } else if (type === 'daily') {
                openModal('daily-ot-modal');
            }
        });
    });

    // Group modal mode toggle buttons
    const modeButtons = document.querySelectorAll('.OT-mode-button');
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.getAttribute('data-mode');
            setGroupModalMode(mode);
        });
    });

    // Existing group selection change
    const existingGroupSelect = document.getElementById('existing-group');
    if (existingGroupSelect) {
        existingGroupSelect.addEventListener('change', function() {
            if (this.value) {
                // Immediately load the group data when a group is selected
                loadGroupData(this.value);
            } else {
                // Reset selected employees if no group is selected
                resetSelectedEmployees();
                reloadAvailableEmployees();
            }
        });
    }

    // Employee search input
    const employeeSearch = document.getElementById('employee-search');
    if (employeeSearch) {
        employeeSearch.addEventListener('input', function() {
            filterAvailableEmployees(this.value);
        });

        // Prevent form submission when pressing Enter in the search field
        employeeSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                return false;
            }
        });
    }

    // Add employee buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.OT-add-employee')) {
            const button = e.target.closest('.OT-add-employee');
            const employeeItem = button.closest('.OT-employee-item');
            if (employeeItem) {
                addEmployeeToSelection(employeeItem);
            }
        }
    });

    // Cancel group button
    const cancelGroupButton = document.getElementById('cancel-group');
    if (cancelGroupButton) {
        cancelGroupButton.addEventListener('click', function() {
            closeModal('group-modal');
        });
    }

    // Save group button
    const saveGroupButton = document.getElementById('save-group');
    if (saveGroupButton) {
        saveGroupButton.addEventListener('click', function() {
            saveEmployeeGroup();
        });
    }

    // Handle close buttons for OT filing modals
    const shiftingModalClose = document.getElementById('shifting-modal-close');
    if (shiftingModalClose) {
        shiftingModalClose.addEventListener('click', function() {
            closeModal('shifting-ot-modal');
            openModal('ot-selection-modal');
        });
    }

    // Set Default Status button in Shifting OT modal
    const shiftingSetStatusButton = document.getElementById('shifting-set-status-modal');
    if (shiftingSetStatusButton) {
        shiftingSetStatusButton.addEventListener('click', function() {
            // Check if there are employees selected
            const employeeCount = parseInt(document.getElementById('shifting-employee-count-modal').textContent);
            if (employeeCount === 0) {
                showToast('No employees selected. Please select a group first.', 'warning');
                return;
            }

            // Open the default status modal
            openModal('default-status-modal');

            // Store the current type in a data attribute for later use
            document.getElementById('default-status-modal').setAttribute('data-type', 'shifting');
        });
    }

    // Set Default Status button in Daily OT modal
    const dailySetStatusButton = document.getElementById('daily-set-status-modal');
    if (dailySetStatusButton) {
        dailySetStatusButton.addEventListener('click', function() {
            // Check if there are employees selected
            const employeeCount = parseInt(document.getElementById('daily-employee-count-modal').textContent);
            if (employeeCount === 0) {
                showToast('No employees selected. Please select a group first.', 'warning');
                return;
            }

            // Open the default status modal
            openModal('default-status-modal');

            // Store the current type in a data attribute for later use
            document.getElementById('default-status-modal').setAttribute('data-type', 'daily');
        });
    }

    const dailyModalClose = document.getElementById('daily-modal-close');
    if (dailyModalClose) {
        dailyModalClose.addEventListener('click', function() {
            closeModal('daily-ot-modal');
            openModal('ot-selection-modal');
        });
    }

    // OT Selection Panel has been removed from the requestor tab content

    // Group selection change events for modals
    const shiftingGroupModal = document.getElementById('shifting-group-modal');
    if (shiftingGroupModal) {
        shiftingGroupModal.addEventListener('change', function() {
            loadEmployeeGroupModal('shifting', this.value);
        });
    }

    const dailyGroupModal = document.getElementById('daily-group-modal');
    if (dailyGroupModal) {
        dailyGroupModal.addEventListener('change', function() {
            loadEmployeeGroupModal('daily', this.value);
        });
    }

    // Edit group buttons
    const shiftingEditGroupButton = document.getElementById('shifting-edit-group-modal');
    if (shiftingEditGroupButton) {
        shiftingEditGroupButton.addEventListener('click', function() {
            // Get the currently selected group
            const groupSelect = document.getElementById('shifting-group-modal');
            const groupId = groupSelect.value;
            const groupName = groupSelect.options[groupSelect.selectedIndex].text;

            // Check if a group is selected
            if (!groupId || groupId === 'new-group') {
                showToast('Please select a group to edit', 'warning');
                return;
            }

            // Store the current OT type for later use
            sessionStorage.setItem('last-ot-type', 'shifting');

            // Close the Shifting OT Filing Modal
            closeModal('shifting-ot-modal');

            // Close the Select Overtime Type Modal if it's open
            closeModal('ot-selection-modal');

            // Open the group modal
            openModal('group-modal');

            // Set the modal to modify mode
            setGroupModalMode('modify');

            // Select the group in the dropdown
            const existingGroupSelect = document.getElementById('existing-group');
            if (existingGroupSelect) {
                existingGroupSelect.value = groupId;

                // Trigger the change event to load the group data
                const event = new Event('change');
                existingGroupSelect.dispatchEvent(event);
            }
        });
    }

    const dailyEditGroupButton = document.getElementById('daily-edit-group-modal');
    if (dailyEditGroupButton) {
        dailyEditGroupButton.addEventListener('click', function() {
            // Get the currently selected group
            const groupSelect = document.getElementById('daily-group-modal');
            const groupId = groupSelect.value;
            const groupName = groupSelect.options[groupSelect.selectedIndex].text;

            // Check if a group is selected
            if (!groupId || groupId === 'new-group') {
                showToast('Please select a group to edit', 'warning');
                return;
            }

            // Store the current OT type for later use
            sessionStorage.setItem('last-ot-type', 'daily');

            // Close the Daily OT Filing Modal
            closeModal('daily-ot-modal');

            // Close the Select Overtime Type Modal if it's open
            closeModal('ot-selection-modal');

            // Open the group modal
            openModal('group-modal');

            // Set the modal to modify mode
            setGroupModalMode('modify');

            // Select the group in the dropdown
            const existingGroupSelect = document.getElementById('existing-group');
            if (existingGroupSelect) {
                existingGroupSelect.value = groupId;

                // Trigger the change event to load the group data
                const event = new Event('change');
                existingGroupSelect.dispatchEvent(event);
            }
        });
    }

    // Form submission handlers for modals
    const shiftingSubmitButton = document.getElementById('shifting-submit-modal');
    if (shiftingSubmitButton) {
        shiftingSubmitButton.addEventListener('click', function() {
            console.log('Shifting submit button clicked');

            if (validateShiftingFormModal()) {
                console.log('Shifting form validation passed');
                // Prepare data for direct submission
                const data = prepareShiftingReviewDataModal();
                console.log('Prepared data:', data);

                // Check if late filing requires password
                const isLateShifting = isLateShiftingFiling(data.startDate);

                if (isLateShifting) {
                    // Show password modal and set the parent modal ID
                    const passwordModal = document.getElementById('password-modal');
                    if (passwordModal) {
                        passwordModal.setAttribute('data-parent-modal', 'shifting-ot-modal');
                    }
                    openModal('password-modal');

                    // Set up submit button
                    const submitPasswordButton = document.getElementById('submit-password');
                    if (submitPasswordButton) {
                        // Remove any existing event listeners
                        submitPasswordButton.onclick = null;

                        // Add new event listener
                        submitPasswordButton.onclick = function() {
                            const password = document.getElementById('authorization-password').value;
                            if (!password) {
                                showToast('Please enter the authorization password', 'warning');
                                return;
                            }

                            // Add password to data
                            data.lateFilingPassword = password;

                            // Submit with password
                            submitOTRequestToServer(data);
                        };
                    }
                } else {
                    // Submit directly
                    submitOTRequestToServer(data);
                }
            }
        });
    }

    // Daily OT submit button
    const dailySubmitButton = document.getElementById('daily-submit-modal');
    if (dailySubmitButton) {
        dailySubmitButton.addEventListener('click', function() {
            console.log('Daily form submit button clicked');

            if (validateDailyFormModal()) {
                console.log('Daily form validation passed');
                // Prepare data for direct submission
                const data = prepareDailyReviewDataModal();
                console.log('Prepared data:', data);

                // Check if late filing requires password
                const isLateDaily = isLateDailyFiling(data.date, data.scheduleValue);
                console.log('Is late daily filing:', isLateDaily, 'Schedule type:', data.scheduleValue);

                if (isLateDaily) {
                    console.log('Late filing detected - showing password modal');
                    // Show password modal and set the parent modal ID
                    const passwordModal = document.getElementById('password-modal');
                    if (passwordModal) {
                        passwordModal.setAttribute('data-parent-modal', 'daily-ot-modal');
                    }
                    openModal('password-modal');

                    // Set up submit button
                    const submitPasswordButton = document.getElementById('submit-password');
                    if (submitPasswordButton) {
                        // Remove any existing event listeners
                        submitPasswordButton.onclick = null;

                        // Add new event listener
                        submitPasswordButton.onclick = function() {
                            const password = document.getElementById('authorization-password').value;
                            if (!password) {
                                showToast('Please enter the authorization password', 'warning');
                                return;
                            }

                            // Add password to data
                            data.lateFilingPassword = password;

                            // Submit with password
                            submitOTRequestToServer(data);
                        };
                    }
                } else {
                    // Submit directly
                    submitOTRequestToServer(data);
                }
            }
        });
    }

    // Employee item click handler for checkbox toggle
    document.addEventListener('click', function(e) {
        const employeeItem = e.target.closest('.OT-employee-item');
        if (employeeItem) {
            // Don't toggle if clicking on the status select
            if (e.target.closest('.OT-employee-status') || e.target.closest('.OT-status-select-input')) {
                return;
            }

            // Find the checkbox
            const checkbox = employeeItem.querySelector('.OT-employee-checkbox input[type="checkbox"]');
            if (checkbox) {
                // Toggle the checkbox
                checkbox.checked = !checkbox.checked;

                // Toggle the selected class
                if (checkbox.checked) {
                    employeeItem.classList.add('selected');
                } else {
                    employeeItem.classList.remove('selected');
                }
            }
        }
    });

    // Default Status Modal buttons
    const applyToAllButton = document.getElementById('apply-to-all');
    if (applyToAllButton) {
        applyToAllButton.addEventListener('click', function() {
            // Get the selected status
            const selectedStatus = document.querySelector('input[name="default-status"]:checked').value;

            // Get the type from the modal's data attribute
            const type = document.getElementById('default-status-modal').getAttribute('data-type');

            // Apply the status to all employees
            applyDefaultStatus(type, selectedStatus, 'all');

            // Close the modal
            closeModal('default-status-modal');

            // Show success message
            showToast(`Default status set to ${selectedStatus} for all employees`, 'success');
        });
    }

    const applyToSelectedButton = document.getElementById('apply-to-selected');
    if (applyToSelectedButton) {
        applyToSelectedButton.addEventListener('click', function() {
            // Get the selected status
            const selectedStatus = document.querySelector('input[name="default-status"]:checked').value;

            // Get the type from the modal's data attribute
            const type = document.getElementById('default-status-modal').getAttribute('data-type');

            // Apply the status to selected employees
            applyDefaultStatus(type, selectedStatus, 'selected');

            // Close the modal
            closeModal('default-status-modal');

            // Show success message
            showToast(`Default status set to ${selectedStatus} for selected employees`, 'success');
        });
    }

    const defaultStatusModalClose = document.getElementById('default-status-modal-close');
    if (defaultStatusModalClose) {
        defaultStatusModalClose.addEventListener('click', function() {
            closeModal('default-status-modal');
        });
    }

    // Confirm OT submission button
    const confirmOTButton = document.getElementById('confirm-ot-submission');
    if (confirmOTButton) {
        confirmOTButton.addEventListener('click', submitOTRequest);
    }

    // Cancel review button
    const cancelReviewButton = document.getElementById('cancel-review');
    if (cancelReviewButton) {
        cancelReviewButton.addEventListener('click', function() {
            closeModal('ot-review-modal');
        });
    }

    // Reason suggestions dropdowns
    const dailyReasonSuggestions = document.getElementById('daily-reason-suggestions');
    if (dailyReasonSuggestions) {
        dailyReasonSuggestions.addEventListener('change', function() {
            const reasonText = document.getElementById('daily-reason-modal');
            if (this.value) {
                // Add visual feedback
                reasonText.value = this.value;
                reasonText.style.backgroundColor = '#f0f8ff'; // Light blue background

                // Reset the dropdown
                this.selectedIndex = 0;

                // Reset the background color after a short delay
                setTimeout(() => {
                    reasonText.style.backgroundColor = '';
                }, 1000);

                // Focus on the textarea for additional edits
                reasonText.focus();
            }
        });
    }

    const shiftingReasonSuggestions = document.getElementById('shifting-reason-suggestions');
    if (shiftingReasonSuggestions) {
        shiftingReasonSuggestions.addEventListener('change', function() {
            const reasonText = document.getElementById('shifting-reason-modal');
            if (this.value) {
                // Add visual feedback
                reasonText.value = this.value;
                reasonText.style.backgroundColor = '#f0f8ff'; // Light blue background

                // Reset the dropdown
                this.selectedIndex = 0;

                // Reset the background color after a short delay
                setTimeout(() => {
                    reasonText.style.backgroundColor = '';
                }, 1000);

                // Focus on the textarea for additional edits
                reasonText.focus();
            }
        });
    }

    // Export configuration button
    const exportConfigButton = document.getElementById('export-config');
    if (exportConfigButton) {
        exportConfigButton.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            showExportConfig(type);
        });
    }

    // Confirm export button
    const confirmExportButton = document.getElementById('confirm-export');
    if (confirmExportButton) {
        confirmExportButton.addEventListener('click', processExport);
    }

    // Password change buttons
    const passwordButtons = document.querySelectorAll('.OT-change-password');
    passwordButtons.forEach(button => {
        button.addEventListener('click', function() {
            const passwordType = this.getAttribute('data-type');
            preparePasswordChange(passwordType);
            openModal('change-password-modal');
        });
    });

    // Save password button
    const savePasswordButton = document.getElementById('save-password');
    if (savePasswordButton) {
        savePasswordButton.addEventListener('click', savePassword);
    }

    // Reset passwords button
    const resetPasswordsButton = document.getElementById('reset-passwords');
    if (resetPasswordsButton) {
        resetPasswordsButton.addEventListener('click', function() {
            openModal('reset-confirm-modal');
        });
    }

    // Confirm reset button
    const confirmResetButton = document.getElementById('confirm-reset');
    if (confirmResetButton) {
        confirmResetButton.addEventListener('click', resetAllPasswords);
    }

    // View history buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.OT-view-history')) {
            const button = e.target.closest('.OT-view-history');
            const filingId = button.getAttribute('data-id');
            openModal('ot-details-modal');
            loadOTDetails(filingId);
        }
    });

    // View details buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.OT-view-details-btn')) {
            const button = e.target.closest('.OT-view-details-btn');
            const filingId = button.getAttribute('data-id');
            openModal('ot-details-modal');
            loadOTDetails(filingId);
        }
    });
}

/**
 * Initialize modals
 */
function initializeModals() {
    // Close modal buttons
    const closeButtons = document.querySelectorAll('.OT-modal-close, .OT-modal-cancel');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.OT-modal');

            // Special handling for OT filing modals
            if (modal.id === 'shifting-ot-modal' || modal.id === 'daily-ot-modal') {
                // If it's a specific close button for these modals, handle it specially
                if (this.id === 'shifting-modal-close' || this.id === 'daily-modal-close') {
                    closeModal(modal.id);
                    openModal('ot-selection-modal');
                    return;
                }
            }

            // Special handling for password modal
            if (modal.id === 'password-modal') {
                // Store the parent modal ID in a data attribute
                const parentModalId = modal.getAttribute('data-parent-modal');
                closeModal(modal.id);

                // If there's a parent modal, make sure it stays open
                if (parentModalId) {
                    const parentModal = document.getElementById(parentModalId);
                    if (parentModal && !parentModal.classList.contains('active')) {
                        openModal(parentModalId);
                    }
                }
                return;
            }

            closeModal(modal.id);
        });
    });

    // Close when clicking outside modal content
    const modals = document.querySelectorAll('.OT-modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                // Special handling for OT filing modals
                if (this.id === 'shifting-ot-modal' || this.id === 'daily-ot-modal') {
                    closeModal(this.id);
                    openModal('ot-selection-modal');
                    return;
                }

                // Special handling for password modal
                if (this.id === 'password-modal') {
                    // Store the parent modal ID in a data attribute
                    const parentModalId = this.getAttribute('data-parent-modal');
                    closeModal(this.id);

                    // If there's a parent modal, make sure it stays open
                    if (parentModalId) {
                        const parentModal = document.getElementById(parentModalId);
                        if (parentModal && !parentModal.classList.contains('active')) {
                            openModal(parentModalId);
                        }
                    }
                    return;
                }

                closeModal(this.id);
            }
        });
    });

    // Close details modal button
    const closeDetailsButton = document.getElementById('close-details');
    if (closeDetailsButton) {
        closeDetailsButton.addEventListener('click', function() {
            closeModal('ot-details-modal');
        });
    }
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
    const searchInputs = document.querySelectorAll('.OT-search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', handleSearch);
    });
}

/**
 * Initialize charts if they exist
 */
function initializeCharts() {
    // Initialize charts if Chart.js is loaded and canvas elements exist
    if (typeof Chart !== 'undefined') {
        // Employee Status Distribution chart
        const overtimeStatsChart = document.getElementById('overtime-stats-chart');
        if (overtimeStatsChart) {
            // Create the chart with initial empty data
            const chartInstance = new Chart(overtimeStatsChart, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            titleColor: '#333',
                            bodyColor: '#666',
                            borderColor: '#ddd',
                            borderWidth: 1,
                            padding: 10,
                            boxPadding: 5,
                            usePointStyle: true,
                            callbacks: {
                                labelPointStyle: function(context) {
                                    return {
                                        pointStyle: 'circle',
                                        rotation: 0
                                    };
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0,
                                stepSize: 1
                            },
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        }
                    },
                    elements: {
                        point: {
                            radius: 3,
                            hoverRadius: 5
                        },
                        line: {
                            tension: 0.4
                        }
                    }
                }
            });

            // Function to fetch chart data from API
            function fetchChartData(period) {
                // Show loading state
                overtimeStatsChart.parentElement.classList.add('OT-loading');

                // Fetch data from API
                fetch(`/overtime/api/employee-status-chart/?period=${period}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Update chart with new data
                        chartInstance.data.labels = data.labels;
                        chartInstance.data.datasets = data.datasets;
                        chartInstance.update();

                        // Remove loading state
                        overtimeStatsChart.parentElement.classList.remove('OT-loading');
                    })
                    .catch(error => {
                        console.error('Error fetching chart data:', error);
                        showToast('Failed to load chart data. Please try again.', 'error');

                        // Remove loading state
                        overtimeStatsChart.parentElement.classList.remove('OT-loading');
                    });
            }

            // Period filter functionality
            const chartPeriodFilter = document.getElementById('chart-period-filter');
            if (chartPeriodFilter) {
                chartPeriodFilter.addEventListener('change', function() {
                    const period = this.value;
                    fetchChartData(period);
                });

                // Initial data load
                fetchChartData(chartPeriodFilter.value);
            }
        }

        // Initialize employee groups table functionality
        initializeGroupsTable();

        // Initialize pagination
        initializePagination();

        // Initialize activity refresh button
        initializeActivityRefresh();
    }
}

/**
 * Initialize pagination for the employee groups table
 */
function initializePagination() {
    const table = document.getElementById('employee-groups-table');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    const rowsPerPage = 10;
    const totalPages = Math.ceil(rows.length / rowsPerPage);

    // Update pagination info
    document.getElementById('showing-start').textContent = rows.length > 0 ? '1' : '0';
    document.getElementById('showing-end').textContent = Math.min(rowsPerPage, rows.length);
    document.getElementById('total-entries').textContent = rows.length;

    // Create pagination buttons
    const paginationPages = document.querySelector('.OT-pagination-pages');
    if (paginationPages) {
        paginationPages.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = 'OT-pagination-page' + (i === 1 ? ' active' : '');
            pageButton.textContent = i;
            pageButton.addEventListener('click', function() {
                goToPage(i);
            });
            paginationPages.appendChild(pageButton);
        }
    }

    // Initialize prev/next buttons
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');

    if (prevButton) {
        prevButton.disabled = true;
        prevButton.addEventListener('click', function() {
            const activePage = document.querySelector('.OT-pagination-page.active');
            if (activePage && activePage.textContent > 1) {
                goToPage(parseInt(activePage.textContent) - 1);
            }
        });
    }

    if (nextButton) {
        nextButton.disabled = totalPages <= 1;
        nextButton.addEventListener('click', function() {
            const activePage = document.querySelector('.OT-pagination-page.active');
            if (activePage && parseInt(activePage.textContent) < totalPages) {
                goToPage(parseInt(activePage.textContent) + 1);
            }
        });
    }

    // Function to go to a specific page
    function goToPage(page) {
        // Update active page button
        const pageButtons = document.querySelectorAll('.OT-pagination-page');
        pageButtons.forEach(button => {
            button.classList.remove('active');
            if (parseInt(button.textContent) === page) {
                button.classList.add('active');
            }
        });

        // Update prev/next button states
        if (prevButton) prevButton.disabled = page === 1;
        if (nextButton) nextButton.disabled = page === totalPages;

        // Show/hide rows based on current page
        const startIndex = (page - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;

        rows.forEach((row, index) => {
            if (index >= startIndex && index < endIndex) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // Update showing info
        document.getElementById('showing-start').textContent = rows.length > 0 ? startIndex + 1 : '0';
        document.getElementById('showing-end').textContent = Math.min(endIndex, rows.length);
    }

    // Initialize with page 1
    goToPage(1);
}

/**
 * Initialize activity refresh button
 */
function initializeActivityRefresh() {
    const refreshButton = document.getElementById('refresh-activity');
    const activityList = document.querySelector('.OT-activity-list');

    if (refreshButton && activityList) {
        // Function to fetch and update activity data
        function fetchActivityData() {
            // Add spinning animation to the refresh icon
            const icon = refreshButton.querySelector('i');
            icon.classList.add('fa-spin');

            // Fetch data from API
            fetch('/overtime/api/recent-activity/')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    // Update activity list with new data
                    updateActivityList(data.activities);

                    // Remove spinning animation
                    icon.classList.remove('fa-spin');
                })
                .catch(error => {
                    console.error('Error fetching activity data:', error);
                    showToast('Failed to refresh activity feed. Please try again.', 'error');

                    // Remove spinning animation
                    icon.classList.remove('fa-spin');
                });
        }

        // Function to update the activity list with new data
        function updateActivityList(activities) {
            // Clear current list
            activityList.innerHTML = '';

            if (activities && activities.length > 0) {
                // Add new activities
                activities.forEach(activity => {
                    const statusClass = activity.status === 'APPROVED' ? 'OT-icon-approved' :
                                       activity.status === 'REJECTED' ? 'OT-icon-rejected' : 'OT-icon-pending';

                    const statusIcon = activity.status === 'APPROVED' ? 'fa-check' :
                                      activity.status === 'REJECTED' ? 'fa-times' : 'fa-clock';

                    const statusText = activity.status === 'APPROVED' ? 'approved' :
                                      activity.status === 'REJECTED' ? 'rejected' : 'submitted';

                    const activityItem = document.createElement('div');
                    activityItem.className = 'OT-activity-item';
                    activityItem.innerHTML = `
                        <div class="OT-activity-icon ${statusClass}">
                            <i class="fas ${statusIcon}"></i>
                        </div>
                        <div class="OT-activity-content">
                            <div class="OT-activity-header">
                                <span class="OT-activity-user">${activity.requestor || 'You'}</span>
                                <span class="OT-activity-action">${statusText}</span>
                                <a href="#" class="OT-activity-link OT-view-history" data-id="${activity.id}">${activity.id}</a>
                            </div>
                            <div class="OT-activity-description">
                                ${activity.type} - ${activity.group}
                            </div>
                            <div class="OT-activity-footer">
                                <div class="OT-activity-time">
                                    <i class="far fa-clock"></i> ${activity.date}
                                </div>
                                <button class="OT-button OT-view-details-btn" data-id="${activity.id}">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                            </div>
                        </div>
                    `;

                    activityList.appendChild(activityItem);
                });

                // Add event listeners to view history links
                const viewLinks = activityList.querySelectorAll('.OT-view-history');
                viewLinks.forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const filingId = this.getAttribute('data-id');
                        viewOTDetails(filingId);
                    });
                });

                // Add event listeners to view details buttons
                const viewDetailsButtons = activityList.querySelectorAll('.OT-view-details-btn');
                viewDetailsButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const filingId = this.getAttribute('data-id');
                        openModal('ot-details-modal');
                        loadOTDetails(filingId);
                    });
                });
            } else {
                // Show empty state
                const emptyState = document.createElement('div');
                emptyState.className = 'OT-empty-activity';
                emptyState.innerHTML = `
                    <i class="fas fa-history"></i>
                    <p>No recent activity found.</p>
                `;
                activityList.appendChild(emptyState);
            }
        }

        // Add click event listener to refresh button
        refreshButton.addEventListener('click', fetchActivityData);

        // Initial data load
        fetchActivityData();
    }
}

/**
 * Initialize employee groups table functionality
 */
function initializeGroupsTable() {
    // Group filter functionality
    const groupFilter = document.getElementById('group-filter');
    if (groupFilter) {
        groupFilter.addEventListener('change', function() {
            const selectedGroup = this.value;
            const tableRows = document.querySelectorAll('#employee-groups-table tbody tr');

            tableRows.forEach(row => {
                // Since we no longer have the group select in the table, we need to handle this differently
                // We'll need to get the group information from an API call in a real implementation
                // For now, we'll just show/hide all rows when "all" is selected
                if (selectedGroup === 'all') {
                    row.style.display = '';
                } else {
                    // In a real implementation, we would check if the employee belongs to the selected group
                    // For now, we'll just hide all rows when a specific group is selected
                    // This would be replaced with actual group membership check
                    row.style.display = 'none';
                }
            });
        });
    }

    // Search functionality
    const searchInput = document.getElementById('group-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('#employee-groups-table tbody tr');

            tableRows.forEach(row => {
                const employeeId = row.querySelector('td[data-label="Employee ID"]').textContent.toLowerCase();
                const employeeName = row.querySelector('td[data-label="Name"]').textContent.toLowerCase();
                const department = row.querySelector('td[data-label="Department"]').textContent.toLowerCase();
                const line = row.querySelector('td[data-label="Line"]').textContent.toLowerCase();
                const shuttle = row.querySelector('td[data-label="Shuttle Service"]').textContent.toLowerCase();

                if (employeeId.includes(searchTerm) ||
                    employeeName.includes(searchTerm) ||
                    department.includes(searchTerm) ||
                    line.includes(searchTerm) ||
                    shuttle.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // Edit Group button functionality
    const editGroupButtons = document.querySelectorAll('.OT-edit-group-btn');
    editGroupButtons.forEach(button => {
        button.addEventListener('click', function() {
            const employeeId = this.getAttribute('data-employee-id');

            // Open the group modal
            openModal('group-modal');

            // Set the modal to modify mode
            setGroupModalMode('modify');

            // In a real implementation, we would load the employee's group data
            // For now, just show a toast notification
            console.log(`Editing group for employee ${employeeId}`);
            showToast(`Opening group editor for employee`, 'info');

            // This would be replaced with actual API call to get the employee's group
            // and then populate the modal with that data
        });
    });

    // Delete button functionality
    const deleteButtons = document.querySelectorAll('.OT-delete-employee-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const employeeId = this.getAttribute('data-employee-id');
            const row = document.querySelector(`tr[data-employee-id="${employeeId}"]`);

            if (row) {
                // Show a confirmation dialog
                if (confirm('Are you sure you want to remove this employee from their group?')) {
                    // In a real implementation, this would be an API call
                    console.log(`Removed employee ${employeeId} from group`);
                    showToast(`Employee removed from group successfully`, 'success');

                    // For demonstration purposes, we'll just hide the row
                    // In a real implementation, this would be handled by the server response
                    // row.style.display = 'none';
                }
            }
        });
    });
}

/**
 * Open a modal
 * @param {string} modalId - The ID of the modal to open
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

/**
 * Close a modal
 * @param {string} modalId - The ID of the modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

/**
 * Load employee group data for modals
 * @param {string} type - The type of OT (shifting or daily)
 * @param {string} groupId - The ID of the employee group
 */
function loadEmployeeGroupModal(type, groupId) {
    if (!groupId) {
        // Clear employee container if no group selected
        document.getElementById(`${type}-employees-container-modal`).innerHTML = `
            <div class="OT-empty-selection">
                <i class="fas fa-users"></i>
                <p>No employees selected. Please choose a group or create a new one.</p>
            </div>
        `;
        document.getElementById(`${type}-employee-count-modal`).textContent = '0';
        return;
    }

    // Special handling for "new-group" option
    if (groupId === 'new-group') {
        // Store the current type for later use when the group is created
        sessionStorage.setItem('last-ot-type', type);

        // Close the Shifting OT Filing Modal
        closeModal(`${type}-ot-modal`);

        // Close the Select Overtime Type Modal
        closeModal('ot-selection-modal');

        // Open the group creation modal
        openModal('group-modal');

        // Reset the group dropdown
        document.getElementById(`${type}-group-modal`).value = '';

        // Clear employee container
        document.getElementById(`${type}-employees-container-modal`).innerHTML = `
            <div class="OT-empty-selection">
                <i class="fas fa-users"></i>
                <p>No employees selected. Please choose a group or create a new one.</p>
            </div>
        `;
        document.getElementById(`${type}-employee-count-modal`).textContent = '0';
        return;
    }

    // Show loading state
    document.getElementById(`${type}-employees-container-modal`).innerHTML = `
        <div class="OT-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading employees...</p>
        </div>
    `;

    // Fetch group data from the server
    const csrfToken = getCSRFToken();

    fetch(`/overtime/api/employee-groups/${groupId}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load group data');
        }
        return response.json();
    })
    .then(groupData => {
        console.log('Group data loaded for modal:', groupData);

        // Get the employees from the group data
        let employees = [];
        if (Array.isArray(groupData.employees)) {
            employees = groupData.employees;
        } else if (groupData.employees && typeof groupData.employees === 'object') {
            employees = Object.values(groupData.employees);
        } else if (Array.isArray(groupData.members)) {
            employees = groupData.members;
        } else if (groupData.members && typeof groupData.members === 'object') {
            employees = Object.values(groupData.members);
        } else {
            // Fallback to empty array if no employees found
            employees = [];
        }

        // Update employee count
        document.getElementById(`${type}-employee-count-modal`).textContent = employees.length.toString();

        // Generate employee items HTML
        let html = '';

        if (employees.length === 0) {
            html = `
                <div class="OT-empty-selection">
                    <i class="fas fa-users"></i>
                    <p>No employees in this group. Please select another group or create a new one.</p>
                </div>
            `;
        } else {
            employees.forEach(employee => {
                html += `
                    <div class="OT-employee-item" data-id="${employee.id}">
                        <div class="OT-employee-checkbox">
                            <input type="checkbox" id="emp-${employee.id}" name="employee-${employee.id}">
                        </div>
                        <div class="OT-employee-info">
                            <p class="OT-employee-id">${employee.id_number}</p>
                            <p class="OT-employee-name">${employee.name}</p>
                        </div>
                        <div class="OT-employee-status">
                            <select class="OT-status-select-input">
                                <option value="OT">OT</option>
                                <option value="NOT-OT">Not OT</option>
                                <option value="ABSENT">Absent</option>
                                <option value="LEAVE">Leave</option>
                            </select>
                        </div>
                    </div>
                `;
            });
        }

        // Update container
        document.getElementById(`${type}-employees-container-modal`).innerHTML = html;
    })
    .catch(error => {
        console.error('Error loading group data for modal:', error);

        // Show error message
        showToast('Using sample data for demonstration', 'info');

        // Use sample data as fallback
        const sampleEmployees = getSampleEmployees();

        // Update employee count
        document.getElementById(`${type}-employee-count-modal`).textContent = sampleEmployees.length.toString();

        // Generate employee items HTML
        let html = '';

        if (sampleEmployees.length === 0) {
            html = `
                <div class="OT-empty-selection">
                    <i class="fas fa-users"></i>
                    <p>No employees in this group. Please select another group or create a new one.</p>
                </div>
            `;
        } else {
            sampleEmployees.forEach(employee => {
                html += `
                    <div class="OT-employee-item" data-id="${employee.id}">
                        <div class="OT-employee-checkbox">
                            <input type="checkbox" id="emp-${employee.id}" name="employee-${employee.id}">
                        </div>
                        <div class="OT-employee-info">
                            <p class="OT-employee-id">${employee.id_number}</p>
                            <p class="OT-employee-name">${employee.name}</p>
                        </div>
                        <div class="OT-employee-status">
                            <select class="OT-status-select-input">
                                <option value="OT">OT</option>
                                <option value="NOT-OT">Not OT</option>
                                <option value="ABSENT">Absent</option>
                                <option value="LEAVE">Leave</option>
                            </select>
                        </div>
                    </div>
                `;
            });
        }

        // Update container
        document.getElementById(`${type}-employees-container-modal`).innerHTML = html;
    });
}

/**
 * Load employee group data - Function removed as OT Selection Panel has been removed
 * @param {string} type - The type of OT (shifting or daily)
 * @param {string} groupId - The ID of the employee group
 */
function loadEmployeeGroup(type, groupId) {
    // This function is no longer used as the OT Selection Panel has been removed
    console.log('loadEmployeeGroup function is no longer used');
}

/**
 * Get sample employees (would be replaced with API call)
 */
function getSampleEmployees() {
    return [
        { id: '1', id_number: 'EMP001', name: 'John Smith', department: 'Production', line: 'Line A' },
        { id: '2', id_number: 'EMP002', name: 'Jane Doe', department: 'Production', line: 'Line B' },
        { id: '3', id_number: 'EMP003', name: 'Robert Johnson', department: 'Production', line: 'Line A' },
        { id: '4', id_number: 'EMP004', name: 'Emily Davis', department: 'Production', line: 'Line C' },
        { id: '5', id_number: 'EMP005', name: 'Michael Wilson', department: 'Production', line: 'Line B' }
    ];
}

/**
 * Reset the group modal to its default state
 */
function resetGroupModal() {
    // Reset form fields
    document.getElementById('group-name').value = '';
    document.getElementById('employee-search').value = '';

    // Reset selected employees
    const selectedEmployeesContainer = document.getElementById('selected-employees');
    if (selectedEmployeesContainer) {
        selectedEmployeesContainer.innerHTML = `
            <div class="OT-empty-selection" id="selected-empty-message">
                <i class="fas fa-user-plus"></i>
                <p>No employees selected yet</p>
            </div>
        `;
    }

    // Reset selected count
    document.getElementById('selected-count').textContent = '0';

    // Reset existing group dropdown
    const existingGroupSelect = document.getElementById('existing-group');
    if (existingGroupSelect) {
        existingGroupSelect.value = '';
    }

    // Hide existing group container
    document.getElementById('existing-group-container').style.display = 'none';

    // Reload available employees from the server
    // This ensures all employees are back in the available list
    reloadAvailableEmployees();
}

/**
 * Reload available employees from the server
 */
function reloadAvailableEmployees() {
    const availableEmployeesList = document.getElementById('available-employees');
    if (!availableEmployeesList) return;

    // Show loading state
    availableEmployeesList.innerHTML = `
        <div class="OT-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading employees...</p>
        </div>
    `;

    // In a real implementation, this would be an API call to get all employees
    // For now, we'll use the template's employees
    setTimeout(() => {
        // Get all employee elements from the template
        const employeeElements = document.querySelectorAll('#available-employees-template .OT-employee-item');

        if (employeeElements.length > 0) {
            // Clear the loading message
            availableEmployeesList.innerHTML = '';

            // Clone and add each employee to the available list
            employeeElements.forEach(employee => {
                const clone = employee.cloneNode(true);
                availableEmployeesList.appendChild(clone);
            });
        } else {
            // If no template exists, use the sample employees
            const employees = getSampleEmployees();
            let html = '';

            employees.forEach(employee => {
                html += `
                    <div class="OT-employee-item" data-id="${employee.id}">
                        <div class="OT-employee-info">
                            <p class="OT-employee-id">${employee.id_number}</p>
                            <p class="OT-employee-name">${employee.name}</p>
                        </div>
                        <button type="button" class="OT-button OT-icon-button OT-add-employee">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                `;
            });

            availableEmployeesList.innerHTML = html;
        }
    }, 300);
}

/**
 * Set the group modal mode (create or modify)
 * @param {string} mode - The mode to set ('create' or 'modify')
 */
function setGroupModalMode(mode) {
    // Check if modify mode is available (if there are any groups)
    const modifyButton = document.querySelector('.OT-mode-button[data-mode="modify"]');
    const hasGroups = modifyButton !== null;

    // If trying to set modify mode but there are no groups, default to create mode
    if (mode === 'modify' && !hasGroups) {
        mode = 'create';
    }

    // Update modal title
    const modalTitle = document.getElementById('group-modal-title');
    if (modalTitle) {
        modalTitle.textContent = mode === 'create' ? 'Create New Employee Group' : 'Modify Existing Group';
    }

    // Update active mode button
    const modeButtons = document.querySelectorAll('.OT-mode-button');
    modeButtons.forEach(button => {
        if (button.getAttribute('data-mode') === mode) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // Show/hide existing group dropdown
    const existingGroupContainer = document.getElementById('existing-group-container');
    if (existingGroupContainer) {
        existingGroupContainer.style.display = mode === 'modify' ? 'block' : 'none';
    }

    // If switching to create mode, reset the form
    if (mode === 'create') {
        // Clear group name
        document.getElementById('group-name').value = '';

        // Reset the employee lists
        resetSelectedEmployees();
        reloadAvailableEmployees();
    } else {
        // If switching to modify mode, reset the existing group dropdown
        const existingGroupSelect = document.getElementById('existing-group');
        if (existingGroupSelect) {
            existingGroupSelect.value = '';
        }

        // Reset the employee lists
        resetSelectedEmployees();
        reloadAvailableEmployees();
    }
}

/**
 * Load group data for editing
 * @param {string} groupId - The ID of the group to load
 */
function loadGroupData(groupId) {
    // Show loading state for both containers
    const selectedEmployeesContainer = document.getElementById('selected-employees');
    const availableEmployeesContainer = document.getElementById('available-employees');

    if (selectedEmployeesContainer) {
        selectedEmployeesContainer.innerHTML = `
            <div class="OT-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading group data...</p>
            </div>
        `;
    }

    if (availableEmployeesContainer) {
        availableEmployeesContainer.innerHTML = `
            <div class="OT-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading available employees...</p>
            </div>
        `;
    }

    // Make an API call to get the group data
    const csrfToken = getCSRFToken();

    // Fetch group data from the server
    fetch(`/overtime/api/employee-groups/${groupId}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load group data');
        }
        return response.json();
    })
    .then(groupData => {
        console.log('Group data loaded:', groupData);

        // Update group name
        document.getElementById('group-name').value = groupData.name;

        // Get all available employees from the template
        const allEmployees = [];
        const templateEmployees = document.querySelectorAll('#available-employees-template .OT-employee-item');

        templateEmployees.forEach(empElement => {
            const id = empElement.getAttribute('data-id');
            const idNumber = empElement.querySelector('.OT-employee-id').textContent;
            const name = empElement.querySelector('.OT-employee-name').textContent;

            allEmployees.push({
                id: id,
                id_number: idNumber,
                name: name
            });
        });

        // If no template employees, use sample data
        if (allEmployees.length === 0) {
            Array.prototype.push.apply(allEmployees, getSampleEmployees());
        }

        // Create a map of group employee IDs for quick lookup
        const groupEmployeeIds = new Set(groupData.employees.map(emp => emp.id.toString()));

        // Get the group members
        const groupMembers = allEmployees.filter(emp => groupEmployeeIds.has(emp.id.toString()));

        // Filter out employees that are already in the group
        const availableEmployees = allEmployees.filter(emp => !groupEmployeeIds.has(emp.id.toString()));

        // Update available employees list
        let availableHtml = '';
        if (availableEmployees.length === 0) {
            availableHtml = `
                <div class="OT-empty-selection">
                    <i class="fas fa-users"></i>
                    <p>All employees are already in this group</p>
                </div>
            `;
        } else {
            availableEmployees.forEach(employee => {
                availableHtml += `
                    <div class="OT-employee-item" data-id="${employee.id}">
                        <div class="OT-employee-info">
                            <p class="OT-employee-id">${employee.id_number}</p>
                            <p class="OT-employee-name">${employee.name}</p>
                        </div>
                        <button type="button" class="OT-button OT-icon-button OT-add-employee">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                `;
            });
        }

        // Update the available employees container
        if (availableEmployeesContainer) {
            availableEmployeesContainer.innerHTML = availableHtml;
        }

        // Update selected employees
        updateSelectedEmployees(groupMembers);
    })
    .catch(error => {
        console.error('Error loading group data:', error);

        // Show error message
        showToast('Failed to load group data. Please try again.', 'error');

        // Reset the form
        resetGroupModal();
    });
}

/**
 * Get sample group data - Function removed as OT Selection Panel has been removed
 * @param {string} groupId - The ID of the group to get data for
 */
function getSampleGroupData(groupId) {
    // This function is no longer used as the OT Selection Panel has been removed
    console.log('getSampleGroupData function is no longer used');
    return { id: '', name: '', employees: [] };
}

/**
 * Update the selected employees display
 * @param {Array} employees - Array of employee objects
 */
function updateSelectedEmployees(employees) {
    const selectedEmployeesContainer = document.getElementById('selected-employees');
    if (!selectedEmployeesContainer) return;

    // Update count
    document.getElementById('selected-count').textContent = employees.length.toString();

    // If no employees, show empty message
    if (employees.length === 0) {
        selectedEmployeesContainer.innerHTML = `
            <div class="OT-empty-selection" id="selected-empty-message">
                <i class="fas fa-user-plus"></i>
                <p>No employees selected yet</p>
            </div>
        `;
        return;
    }

    // Generate HTML for selected employees
    let html = '';
    employees.forEach(employee => {
        html += `
            <div class="OT-employee-item" data-id="${employee.id}">
                <div class="OT-employee-info">
                    <p class="OT-employee-id">${employee.id_number}</p>
                    <p class="OT-employee-name">${employee.name}</p>
                </div>
                <button type="button" class="OT-button OT-icon-button OT-remove-employee">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
        `;
    });

    // Update container
    selectedEmployeesContainer.innerHTML = html;

    // Add event listeners to remove buttons
    const removeButtons = selectedEmployeesContainer.querySelectorAll('.OT-remove-employee');
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const employeeItem = this.closest('.OT-employee-item');
            if (employeeItem) {
                employeeItem.remove();

                // Update count
                const remainingEmployees = selectedEmployeesContainer.querySelectorAll('.OT-employee-item');
                document.getElementById('selected-count').textContent = remainingEmployees.length.toString();

                // If no employees left, show empty message
                if (remainingEmployees.length === 0) {
                    selectedEmployeesContainer.innerHTML = `
                        <div class="OT-empty-selection" id="selected-empty-message">
                            <i class="fas fa-user-plus"></i>
                            <p>No employees selected yet</p>
                        </div>
                    `;
                }
            }
        });
    });
}

/**
 * Reset selected employees
 */
function resetSelectedEmployees() {
    updateSelectedEmployees([]);
}

/**
 * Filter available employees based on search query
 * @param {string} query - The search query
 */
function filterAvailableEmployees(query) {
    const availableEmployees = document.querySelectorAll('#available-employees .OT-employee-item');

    if (!query) {
        // If no query, show all employees
        availableEmployees.forEach(employee => {
            employee.style.display = 'flex';
        });
        return;
    }

    // Convert query to lowercase for case-insensitive search
    query = query.toLowerCase();

    // Filter employees
    availableEmployees.forEach(employee => {
        const id = employee.querySelector('.OT-employee-id').textContent.toLowerCase();
        const name = employee.querySelector('.OT-employee-name').textContent.toLowerCase();

        // Show employee if any field contains the query
        if (id.includes(query) || name.includes(query)) {
            employee.style.display = 'flex';
        } else {
            employee.style.display = 'none';
        }
    });
}

/**
 * Add an employee to the selection
 * @param {Element} employeeItem - The employee item element to add
 */
function addEmployeeToSelection(employeeItem) {
    const employeeId = employeeItem.getAttribute('data-id');
    const employeeInfo = employeeItem.querySelector('.OT-employee-info');

    // Check if employee is already selected
    const selectedEmployees = document.querySelectorAll('#selected-employees .OT-employee-item');
    for (let i = 0; i < selectedEmployees.length; i++) {
        if (selectedEmployees[i].getAttribute('data-id') === employeeId) {
            // Employee already selected, show a message
            showToast('Employee already added to selection', 'warning');
            return;
        }
    }

    // Create employee data object
    const employee = {
        id: employeeId,
        id_number: employeeInfo.querySelector('.OT-employee-id').textContent,
        name: employeeInfo.querySelector('.OT-employee-name').textContent
    };

    // Get current selected employees
    const selectedEmployeesContainer = document.getElementById('selected-employees');
    const emptyMessage = document.getElementById('selected-empty-message');

    // Remove empty message if it exists
    if (emptyMessage) {
        emptyMessage.remove();
    }

    // Create new employee item
    const newEmployeeItem = document.createElement('div');
    newEmployeeItem.className = 'OT-employee-item';
    newEmployeeItem.setAttribute('data-id', employee.id);
    newEmployeeItem.innerHTML = `
        <div class="OT-employee-info">
            <p class="OT-employee-id">${employee.id_number}</p>
            <p class="OT-employee-name">${employee.name}</p>
        </div>
        <button type="button" class="OT-button OT-icon-button OT-remove-employee">
            <i class="fas fa-minus"></i>
        </button>
    `;

    // Add event listener to remove button
    const removeButton = newEmployeeItem.querySelector('.OT-remove-employee');
    removeButton.addEventListener('click', function() {
        // Get the employee data before removing
        const removedId = newEmployeeItem.getAttribute('data-id');
        const removedIdNumber = newEmployeeItem.querySelector('.OT-employee-id').textContent;
        const removedName = newEmployeeItem.querySelector('.OT-employee-name').textContent;

        // Remove from selected list
        newEmployeeItem.remove();

        // Update count
        const remainingEmployees = selectedEmployeesContainer.querySelectorAll('.OT-employee-item');
        document.getElementById('selected-count').textContent = remainingEmployees.length.toString();

        // If no employees left, show empty message
        if (remainingEmployees.length === 0) {
            selectedEmployeesContainer.innerHTML = `
                <div class="OT-empty-selection" id="selected-empty-message">
                    <i class="fas fa-user-plus"></i>
                    <p>No employees selected yet</p>
                </div>
            `;
        }

        // Add back to available employees list
        const availableEmployeesList = document.getElementById('available-employees');
        if (availableEmployeesList) {
            const newAvailableItem = document.createElement('div');
            newAvailableItem.className = 'OT-employee-item';
            newAvailableItem.setAttribute('data-id', removedId);
            newAvailableItem.innerHTML = `
                <div class="OT-employee-info">
                    <p class="OT-employee-id">${removedIdNumber}</p>
                    <p class="OT-employee-name">${removedName}</p>
                </div>
                <button type="button" class="OT-button OT-icon-button OT-add-employee">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            availableEmployeesList.appendChild(newAvailableItem);
        }
    });

    // Add to container
    selectedEmployeesContainer.appendChild(newEmployeeItem);

    // Update count
    const count = selectedEmployeesContainer.querySelectorAll('.OT-employee-item').length;
    document.getElementById('selected-count').textContent = count.toString();

    // Remove from available employees list
    employeeItem.remove();

    // Show success message
    showToast('Employee added to selection', 'success');
}

/**
 * Save employee group
 */
function saveEmployeeGroup() {
    // Get group name
    const groupName = document.getElementById('group-name').value.trim();
    if (!groupName) {
        showToast('Please enter a group name', 'warning');
        return;
    }

    // Get selected employees
    const selectedEmployees = [];
    const employeeItems = document.querySelectorAll('#selected-employees .OT-employee-item');

    if (employeeItems.length === 0) {
        showToast('Please select at least one employee', 'warning');
        return;
    }

    // Collect employee data
    employeeItems.forEach(item => {
        const employeeInfo = item.querySelector('.OT-employee-info');
        selectedEmployees.push({
            id: item.getAttribute('data-id'),
            id_number: employeeInfo.querySelector('.OT-employee-id').textContent,
            name: employeeInfo.querySelector('.OT-employee-name').textContent
        });
    });

    // Get current mode
    const isCreateMode = document.querySelector('.OT-mode-button[data-mode="create"]').classList.contains('active');
    const groupId = isCreateMode ? null : document.getElementById('existing-group').value;

    // Show loading state
    const saveButton = document.getElementById('save-group');
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveButton.disabled = true;

    // Get CSRF token
    const csrfToken = getCSRFToken();

    // Prepare API endpoint
    const endpoint = isCreateMode
        ? '/overtime/api/employee-groups/'
        : `/overtime/api/employee-groups/${groupId}/update/`;

    // Make API call to save the group
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            name: groupName,
            employees: selectedEmployees.map(emp => emp.id)
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save group');
        }
        return response.json();
    })
    .then(result => {
        console.log('Group saved:', result);

        // Show success message
        showToast(`Group "${groupName}" ${isCreateMode ? 'created' : 'updated'} successfully`, 'success');

        // Reset button
        saveButton.innerHTML = 'Save Group';
        saveButton.disabled = false;

        // Close modal
        closeModal('group-modal');

        // Check if we came from an OT filing modal
        const lastOTType = sessionStorage.getItem('last-ot-type');
        if (lastOTType) {
            // Clear the stored type
            sessionStorage.removeItem('last-ot-type');

            // First open the OT selection modal
            openModal('ot-selection-modal');

            // Then open the appropriate OT filing modal
            setTimeout(() => {
                openModal(`${lastOTType}-ot-modal`);

                // Update the group dropdown to show the newly created or updated group
                const groupDropdown = document.getElementById(`${lastOTType}-group-modal`);
                if (groupDropdown) {
                    // For a new group or updated group
                    const groupId = isCreateMode ? result.id : groupId;

                    // Add the new group to the dropdown if it doesn't exist
                    let groupExists = false;
                    for (let i = 0; i < groupDropdown.options.length; i++) {
                        if (isCreateMode && groupDropdown.options[i].text === groupName) {
                            // For a new group, match by name
                            groupDropdown.options[i].value = result.id;
                            groupDropdown.value = result.id;
                            groupExists = true;
                            break;
                        } else if (!isCreateMode && groupDropdown.options[i].value === groupId) {
                            // For an existing group, match by ID and update the name if needed
                            groupDropdown.options[i].text = groupName;
                            groupDropdown.value = groupId;
                            groupExists = true;
                            break;
                        }
                    }

                    if (!groupExists && isCreateMode) {
                        // Create a new option for a newly created group
                        const newOption = document.createElement('option');
                        newOption.value = result.id;
                        newOption.text = groupName;

                        // Insert it before the "Create New Group" option
                        const createNewOption = Array.from(groupDropdown.options).find(opt => opt.value === 'new-group');
                        if (createNewOption) {
                            groupDropdown.insertBefore(newOption, createNewOption);
                        } else {
                            groupDropdown.add(newOption);
                        }

                        // Select the new group
                        groupDropdown.value = result.id;
                    } else if (!isCreateMode) {
                        // For an existing group, select it
                        groupDropdown.value = groupId;
                    }

                    // Trigger the change event to load the employees
                    const event = new Event('change');
                    groupDropdown.dispatchEvent(event);
                }
            }, 100);
        } else {
            // If not coming from an OT filing modal, refresh the page
            window.location.reload();
        }
    })
    .catch(error => {
        console.error('Error saving group:', error);

        // Show error message
        showToast('Failed to save group. Please try again.', 'error');

        // Reset button
        saveButton.innerHTML = 'Save Group';
        saveButton.disabled = false;
    });
}

/**
 * Show export configuration
 * @param {string} type - The type of export (shifting, daily, masterlist)
 */
function showExportConfig(type) {
    // Hide all configuration sections
    const configSections = document.querySelectorAll('.OT-export-config');
    configSections.forEach(config => {
        config.style.display = 'none';
    });

    // Set modal title
    const modalTitle = document.getElementById('export-config-title');
    if (modalTitle) {
        if (type === 'shifting') {
            modalTitle.textContent = 'Configure Shifting OT Export';
        } else if (type === 'daily') {
            modalTitle.textContent = 'Configure Daily OT Export';
        } else {
            modalTitle.textContent = 'Configure Masterlist Export';
        }
    }

    // Show appropriate configuration section
    const configSection = document.getElementById(`${type}-export-config`);
    if (configSection) {
        configSection.style.display = 'block';
    }

    // Set today's date as default for date inputs
    const dateInputs = document.querySelectorAll('#export-config-modal input[type="date"]');
    dateInputs.forEach(input => {
        input.value = formatDateForInput(new Date());
    });

    // Set data attribute on confirmation button
    const confirmButton = document.getElementById('confirm-export');
    if (confirmButton) {
        confirmButton.setAttribute('data-type', type);
    }
}

/**
 * Process export request
 */
function processExport() {
    const exportType = document.getElementById('confirm-export').getAttribute('data-type');

    // Show loading state
    const confirmButton = document.getElementById('confirm-export');
    confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    confirmButton.disabled = true;

    let endpoint;
    let queryParams = [];

    // Prepare request parameters based on export type
    if (exportType === 'shifting') {
        endpoint = '/api/export-shifting/';

        const startDate = document.getElementById('shifting-start-date-export').value;
        const endDate = document.getElementById('shifting-end-date-export').value;
        const highlightEmpty = document.getElementById('highlight-empty-shuttle').checked;

        queryParams.push(`start_date=${startDate}`);
        queryParams.push(`end_date=${endDate}`);
        queryParams.push(`highlight_empty=${highlightEmpty}`);
    } else if (exportType === 'daily') {
        endpoint = '/api/export-daily/';

        const scheduleType = document.getElementById('schedule-type').value;
        const exportStatus = document.getElementById('daily-export-status').value;
        const startDate = document.getElementById('daily-start-date-export').value;
        const endDate = document.getElementById('daily-end-date-export').value;

        queryParams.push(`schedule_type=${scheduleType}`);
        queryParams.push(`status=${exportStatus}`);
        queryParams.push(`start_date=${startDate}`);
        queryParams.push(`end_date=${endDate}`);
    } else if (exportType === 'masterlist') {
        endpoint = '/api/export-masterlist/';

        const highlightMissing = document.getElementById('highlight-missing-shuttle').checked;
        const includeInactive = document.getElementById('include-inactive').checked;
        const department = document.getElementById('department-filter-export').value;

        queryParams.push(`highlight_missing=${highlightMissing}`);
        queryParams.push(`include_inactive=${includeInactive}`);
        queryParams.push(`department=${department}`);
    }

    // Build URL with query parameters
    const url = `${endpoint}?${queryParams.join('&')}`;

    // Initiate file download
    window.location.href = url;

    // Log activity (would be sent to server in production)
    console.log(`Exported ${exportType} data with params: ${queryParams.join(', ')}`);

    // Show success message
    showToast(`${capitalizeFirstLetter(exportType)} data export started`, 'success');

    // Reset button and close modal after short delay
    setTimeout(() => {
        confirmButton.innerHTML = 'Export';
        confirmButton.disabled = false;
        closeModal('export-config-modal');
    }, 1000);
}

/**
 * Prepare password change
 */
function preparePasswordChange(passwordType) {
    // Set password type in hidden input
    document.getElementById('password-type').value = passwordType;

    // Set title and description based on type
    const typeLabel = document.getElementById('password-type-label');
    const typeDescription = document.getElementById('password-type-description');

    if (passwordType === 'shifting') {
        typeLabel.textContent = 'Shifting OT Password';
        typeDescription.textContent = 'Required for overtime filing after Thursday.';
    } else if (passwordType === 'daily') {
        typeLabel.textContent = 'Daily OT Password';
        typeDescription.textContent = 'Required for overtime filing after 10:00 AM.';
    } else if (passwordType === 'weekend') {
        typeLabel.textContent = 'Weekend/Holiday Password';
        typeDescription.textContent = 'Required for overtime filing after Friday.';
    } else if (passwordType === 'holiday') {
        typeLabel.textContent = 'Holiday Filing Password';
        typeDescription.textContent = 'Required for overtime filing 1 day late.';
    }

    // Clear password fields
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
}

/**
 * Save password
 */
function savePassword() {
    const passwordType = document.getElementById('password-type').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    // Validate passwords
    if (!newPassword) {
        showToast('Please enter a new password', 'warning');
        return;
    }

    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }

    // Simple check for at least one letter and one number
    if (!(/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword))) {
        showToast('Password must contain at least one letter and one number', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'warning');
        return;
    }

    // Show save button loading state
    const saveButton = document.getElementById('save-password');
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveButton.disabled = true;

    // Prepare data
    const data = {
        password_type: passwordType,
        new_password: newPassword
    };

    // Send request
    fetch('/api/update-password/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(() => {
            // Close modal
            closeModal('change-password-modal');

            // Show success message
            showToast('Password updated successfully', 'success');

            // Update displayed password if it's on the page
            const passwordInput = document.getElementById(`${passwordType}-password`);
            if (passwordInput) {
                passwordInput.value = newPassword;
            }

            // Reset save button
            saveButton.innerHTML = 'Save Password';
            saveButton.disabled = false;
        })
        .catch(error => {
            console.error('Error updating password:', error);
            showToast('Failed to update password', 'error');

            // Reset save button
            saveButton.innerHTML = 'Save Password';
            saveButton.disabled = false;
        });
}

/**
 * Reset all passwords
 */
function resetAllPasswords() {
    // Show reset button loading state
    const resetButton = document.getElementById('confirm-reset');
    resetButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
    resetButton.disabled = true;

    // Send request
    fetch('/api/reset-passwords/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Close modal
            closeModal('reset-confirm-modal');

            // Show success message
            showToast('All passwords have been reset to defaults', 'success');

            // Update displayed passwords
            Object.keys(data.passwords).forEach(type => {
                const passwordInput = document.getElementById(`${type}-password`);
                if (passwordInput) {
                    passwordInput.value = data.passwords[type];
                }
            });

            // Reset button
            resetButton.innerHTML = 'Reset All Passwords';
            resetButton.disabled = false;
        })
        .catch(error => {
            console.error('Error resetting passwords:', error);
            showToast('Failed to reset passwords', 'error');

            // Reset button
            resetButton.innerHTML = 'Reset All Passwords';
            resetButton.disabled = false;
        });
}

/**
 * Load OT details
 */
function loadOTDetails(filingId) {
    // Show loading state
    const detailsContent = document.getElementById('details-content');
    if (detailsContent) {
        detailsContent.innerHTML = `
            <div class="OT-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading overtime details...</p>
            </div>
        `;
    }

    // Fetch details from server
    fetch(`/overtime/api/ot-details/${filingId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Format details HTML
            let html = `
                <div class="OT-details-header">
                    <div class="OT-details-id">
                        <span class="OT-type-badge OT-type-${data.type.toLowerCase()}">${data.type}</span>
                        <h3>${data.id}</h3>
                    </div>
                    <span class="OT-details-date">${data.date}</span>
                </div>

                <div class="OT-details-section">
                    <h4>Request Information</h4>
                    <div class="OT-details-grid">
                        <div class="OT-details-item">
                            <span class="OT-details-label">Requestor</span>
                            <span class="OT-details-value">${data.requestor}</span>
                        </div>
                        <div class="OT-details-item">
                            <span class="OT-details-label">Group</span>
                            <span class="OT-details-value">${data.group}</span>
                        </div>
                        <div class="OT-details-item">
                            <span class="OT-details-label">Filing Date</span>
                            <span class="OT-details-value">${data.filing_date}</span>
                        </div>
                        <div class="OT-details-item">
                            <span class="OT-details-label">Status</span>
                            <span class="OT-details-value">${data.status}</span>
                        </div>
            `;

            // Add type-specific fields
            if (data.type === 'Shifting') {
                html += `
                        <div class="OT-details-item">
                            <span class="OT-details-label">Date Range</span>
                            <span class="OT-details-value">${data.start_date || ''} to ${data.end_date || ''}</span>
                        </div>
                        <div class="OT-details-item">
                            <span class="OT-details-label">Shift Type</span>
                            <span class="OT-details-value">${data.shift_type || ''}</span>
                        </div>
                `;
            } else {
                html += `
                        <div class="OT-details-item">
                            <span class="OT-details-label">Schedule Type</span>
                            <span class="OT-details-value">${data.schedule_type || ''}</span>
                        </div>
                        <div class="OT-details-item">
                            <span class="OT-details-label">Time</span>
                            <span class="OT-details-value">${data.start_time || ''} to ${data.end_time || ''}</span>
                        </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;

            // Add reason if available (for Daily OT)
            if (data.reason) {
                html += `
                    <div class="OT-details-section">
                        <h4>Reason</h4>
                        <p class="OT-details-text">${data.reason}</p>
                    </div>
                `;
            }

            // Add employees table with checkboxes for selection
            html += `
                <div class="OT-details-section">
                    <div class="OT-details-header-with-actions">
                        <h4>Team Members (${data.employees.length})</h4>
                        <button id="change-status-btn" class="OT-button OT-primary-button">
                            <i class="fas fa-exchange-alt"></i> Change Status
                        </button>
                    </div>
                    <div class="OT-table-container">
                        <table class="OT-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input type="checkbox" id="select-all-employees" class="OT-checkbox">
                                    </th>
                                    <th>ID Number</th>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Line</th>
                                    <th>Status</th>
                                    <th>Shuttle</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            data.employees.forEach(employee => {
                html += `
                    <tr data-employee-id="${employee.id}">
                        <td>
                            <input type="checkbox" class="OT-employee-checkbox" value="${employee.id}">
                        </td>
                        <td data-label="ID Number">${employee.id_number}</td>
                        <td data-label="Name">${employee.name}</td>
                        <td data-label="Department">${employee.department || '-'}</td>
                        <td data-label="Line">${employee.line || '-'}</td>
                        <td data-label="Status">
                            <span class="OT-status OT-status-${employee.status.toLowerCase()}">${employee.status}</span>
                        </td>
                        <td data-label="Shuttle">${employee.shuttle_service || 'Not Assigned'}</td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Determine if status changes are allowed based on OT type and current date
            let canChangeStatus = false;
            let statusChangeMessage = '';

            const now = new Date();
            const currentHour = now.getHours();
            const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
            const isFriday = currentDay === 5;
            const isWeekend = currentDay === 0 || currentDay === 6;

            // Store the filing ID for later use
            document.getElementById('details-content').setAttribute('data-filing-id', data.id);

            // Add event listener for the select all checkbox
            setTimeout(() => {
                const selectAllCheckbox = document.getElementById('select-all-employees');
                if (selectAllCheckbox) {
                    selectAllCheckbox.addEventListener('change', function() {
                        const checkboxes = document.querySelectorAll('.OT-employee-checkbox');
                        checkboxes.forEach(checkbox => {
                            checkbox.checked = this.checked;
                        });
                    });
                }

                // Add event listener for the change status button
                const changeStatusBtn = document.getElementById('change-status-btn');
                if (changeStatusBtn) {
                    changeStatusBtn.addEventListener('click', function() {
                        // Get selected employees
                        const selectedEmployees = [];
                        const checkboxes = document.querySelectorAll('.OT-employee-checkbox:checked');

                        checkboxes.forEach(checkbox => {
                            selectedEmployees.push(checkbox.value);
                        });

                        if (selectedEmployees.length === 0) {
                            showToast('Please select at least one employee', 'warning');
                            return;
                        }

                        // Get the filing ID
                        const filingId = document.getElementById('details-content').getAttribute('data-filing-id');

                        // Open the status change modal
                        openStatusChangeModal(filingId, selectedEmployees);
                    });
                }
            }, 100);

            if (data.type.includes('Daily')) {
                // For Daily OT
                if (data.schedule_type) {
                    if (data.schedule_type === 'WEEKDAY') {
                        // For Weekday overtime, check if it's before 1:00 PM
                        if (data.date) {
                            const otDate = new Date(data.date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            if (otDate.getTime() === today.getTime()) {
                                // It's the day of the scheduled overtime
                                canChangeStatus = currentHour < 13; // Before 1:00 PM
                                if (!canChangeStatus) {
                                    statusChangeMessage = "Status changes are not permitted after 1:00 PM on the day of the scheduled overtime.";
                                }
                            } else if (otDate.getTime() > today.getTime()) {
                                // It's before the scheduled overtime day
                                canChangeStatus = true;
                            } else {
                                // It's after the scheduled overtime day
                                canChangeStatus = false;
                                statusChangeMessage = "Status changes are not permitted after the scheduled overtime date.";
                            }
                        }
                    } else if (['SATURDAY', 'SUNDAY', 'HOLIDAY'].includes(data.schedule_type)) {
                        // For Weekend and Holiday overtime
                        canChangeStatus = false;
                        statusChangeMessage = "Status changes are not permitted for overtime scheduled on Saturdays, Sundays, or Holidays. Please visit the Lobby and consult with HRGAD personnel for any necessary changes.";
                    }
                }
            } else if (data.type.includes('Shifting')) {
                // For Shifting OT
                canChangeStatus = !isFriday && !isWeekend;
                if (!canChangeStatus) {
                    statusChangeMessage = "Status changes for Shifting overtime are only permitted before Friday of each week.";
                }
            }

            // Add status change section
            html += `
                <div class="OT-details-section OT-status-change-section">
                    <div class="OT-status-change-header">
                        <h4>Change Status</h4>
            `;

            if (canChangeStatus) {
                html += `
                        <button id="change-status-section-btn" class="OT-button OT-primary-button" data-filing-id="${data.id}">
                            <i class="fas fa-edit"></i> Change Status
                        </button>
                `;
            } else {
                html += `
                        <button class="OT-button OT-primary-button" disabled>
                            <i class="fas fa-lock"></i> Change Status
                        </button>
                        <div class="OT-status-change-message">
                            <i class="fas fa-info-circle"></i>
                            <span>${statusChangeMessage || "Status changes are no longer permitted for this overtime request. Please visit the Lobby and consult with HRGAD personnel who manage overtime requests for any necessary changes."}</span>
                        </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;

            // Store filing data for later use
            html += `<input type="hidden" id="filing-data" value='${JSON.stringify(data)}'>`;

            // Set content
            detailsContent.innerHTML = html;

            // Add event listeners for the new elements
            if (data.employees && data.employees.length > 0) {
                // Select all checkbox
                const selectAllCheckbox = document.getElementById('select-all-employees');
                if (selectAllCheckbox) {
                    selectAllCheckbox.addEventListener('change', function() {
                        const checkboxes = document.querySelectorAll('.OT-employee-checkbox');
                        checkboxes.forEach(checkbox => {
                            checkbox.checked = this.checked;
                        });
                    });
                }

                // Change status button in the header
                const changeStatusBtn = document.getElementById('change-status-btn');
                if (changeStatusBtn) {
                    changeStatusBtn.addEventListener('click', function() {
                        const selectedEmployees = Array.from(document.querySelectorAll('.OT-employee-checkbox:checked'))
                            .map(checkbox => checkbox.value);

                        if (selectedEmployees.length === 0) {
                            showToast('Please select at least one employee to change status.', 'warning');
                            return;
                        }

                        // Open status change modal
                        openStatusChangeModal(data.id, selectedEmployees);
                    });
                }

                // Change status button in the status change section
                const changeSectionBtn = document.getElementById('change-status-section-btn');
                if (changeSectionBtn) {
                    changeSectionBtn.addEventListener('click', function() {
                        const selectedEmployees = Array.from(document.querySelectorAll('.OT-employee-checkbox:checked'))
                            .map(checkbox => checkbox.value);

                        if (selectedEmployees.length === 0) {
                            showToast('Please select at least one employee to change status.', 'warning');
                            return;
                        }

                        // Open status change modal
                        openStatusChangeModal(data.id, selectedEmployees);
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error loading OT details:', error);

            // Show error message
            detailsContent.innerHTML = `
                <div class="OT-error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load overtime details. Please try again later.</p>
                </div>
            `;
        });
}

/**
 * Open status change modal
 * @param {string} filingId - The ID of the filing
 * @param {Array} selectedEmployees - Array of selected employee IDs
 */
function openStatusChangeModal(filingId, selectedEmployees) {
    // Store the filing ID and selected employees in hidden fields
    document.getElementById('filing-id-for-status-change').value = filingId;
    document.getElementById('selected-employees-for-status-change').value = JSON.stringify(selectedEmployees);

    // Open the modal
    openModal('status-change-modal');

    // Set up event listener for the submit button
    const submitButton = document.getElementById('submit-status-change');
    if (submitButton) {
        // Remove any existing event listeners
        submitButton.onclick = null;

        // Add new event listener
        submitButton.onclick = function() {
            submitStatusChange();
        };
    }

    // Set up event listener for the cancel button
    const cancelButton = document.getElementById('cancel-status-change');
    if (cancelButton) {
        // Remove any existing event listeners
        cancelButton.onclick = null;

        // Add new event listener
        cancelButton.onclick = function() {
            closeModal('status-change-modal');
        };
    }
}

/**
 * Submit status change
 */
function submitStatusChange() {
    // Get the filing ID and selected employees
    const filingId = document.getElementById('filing-id-for-status-change').value;
    const selectedEmployees = JSON.parse(document.getElementById('selected-employees-for-status-change').value);
    const newStatus = document.getElementById('new-status').value;

    if (!filingId || !selectedEmployees || selectedEmployees.length === 0 || !newStatus) {
        showToast('Missing required information for status change.', 'error');
        return;
    }

    // Show loading state
    const submitButton = document.getElementById('submit-status-change');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    // Prepare data for API call
    const data = {
        filing_id: filingId,
        employee_ids: selectedEmployees,
        new_status: newStatus
    };

    // Send request to server
    fetch('/overtime/api/change-employee-status/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(responseData => {
        // Close the modal
        closeModal('status-change-modal');

        // Show success message
        showToast('Employee status updated successfully.', 'success');

        // Reload the OT details to show the updated status
        loadOTDetails(filingId);
    })
    .catch(error => {
        console.error('Error changing employee status:', error);

        // Show error message
        showToast('Failed to update employee status. Please try again.', 'error');

        // Reset button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Save Changes';
        }
    });
}

/**
 * Validate shifting form
 */
function validateShiftingForm() {
    // Check group selection
    const groupSelect = document.getElementById('shifting-group');
    if (!groupSelect.value) {
        showToast('Please select an employee group', 'warning');
        groupSelect.focus();
        return false;
    }

    // Check date range
    const startDate = document.getElementById('shifting-start-date');
    const endDate = document.getElementById('shifting-end-date');

    if (!startDate.value) {
        showToast('Please select a start date', 'warning');
        startDate.focus();
        return false;
    }

    if (!endDate.value) {
        showToast('Please select an end date', 'warning');
        endDate.focus();
        return false;
    }

    // Check if start date is before end date
    if (new Date(startDate.value) > new Date(endDate.value)) {
        showToast('Start date must be before end date', 'warning');
        startDate.focus();
        return false;
    }

    // Check if employees are selected
    const employeeCount = document.getElementById('shifting-employee-count').textContent;
    if (employeeCount === '0') {
        showToast('No employees in the selected group', 'warning');
        return false;
    }

    return true;
}

/**
 * Validate shifting form modal
 */
function validateShiftingFormModal() {
    // Check group selection
    const groupSelect = document.getElementById('shifting-group-modal');
    if (!groupSelect.value) {
        showToast('Please select an employee group', 'warning');
        groupSelect.focus();
        return false;
    }

    // Check date range
    const startDate = document.getElementById('shifting-start-date-modal');
    const endDate = document.getElementById('shifting-end-date-modal');

    if (!startDate.value) {
        showToast('Please select a start date', 'warning');
        startDate.focus();
        return false;
    }

    if (!endDate.value) {
        showToast('Please select an end date', 'warning');
        endDate.focus();
        return false;
    }

    // Check if start date is before end date
    if (new Date(startDate.value) > new Date(endDate.value)) {
        showToast('Start date must be before end date', 'warning');
        startDate.focus();
        return false;
    }

    // Reason check removed as per requirements

    // Check if employees are selected
    const employeeCount = document.getElementById('shifting-employee-count-modal').textContent;
    if (employeeCount === '0') {
        showToast('No employees in the selected group', 'warning');
        return false;
    }

    return true;
}

/**
 * Validate daily form
 */
function validateDailyForm() {
    // Check group selection
    const groupSelect = document.getElementById('daily-group');
    if (!groupSelect.value) {
        showToast('Please select an employee group', 'warning');
        groupSelect.focus();
        return false;
    }

    // Check date
    const dateInput = document.getElementById('daily-date');
    if (!dateInput.value) {
        showToast('Please select a date', 'warning');
        dateInput.focus();
        return false;
    }

    // Check time inputs
    const startTime = document.getElementById('daily-start-time');
    const endTime = document.getElementById('daily-end-time');

    if (!startTime.value) {
        showToast('Please select a start time', 'warning');
        startTime.focus();
        return false;
    }

    if (!endTime.value) {
        showToast('Please select an end time', 'warning');
        endTime.focus();
        return false;
    }

    // Check if start time is before end time
    if (startTime.value >= endTime.value) {
        showToast('Start time must be before end time', 'warning');
        startTime.focus();
        return false;
    }

    // Check reason
    const reason = document.getElementById('daily-reason');
    if (!reason.value.trim()) {
        showToast('Please provide a reason for overtime', 'warning');
        reason.focus();
        return false;
    }

    // Check if employees are selected
    const employeeCount = document.getElementById('daily-employee-count').textContent;
    if (employeeCount === '0') {
        showToast('No employees in the selected group', 'warning');
        return false;
    }

    return true;
}

/**
 * Validate daily form modal
 */
function validateDailyFormModal() {
    // Check group selection
    const groupSelect = document.getElementById('daily-group-modal');
    if (!groupSelect.value) {
        showToast('Please select an employee group', 'warning');
        return false;
    }

    // Check date
    const dateInput = document.getElementById('daily-date-modal');
    if (!dateInput.value) {
        showToast('Please select a date', 'warning');
        return false;
    }

    // Check time inputs
    const startTime = document.getElementById('daily-start-time-modal');
    const endTime = document.getElementById('daily-end-time-modal');

    if (!startTime.value) {
        showToast('Please select a start time', 'warning');
        return false;
    }

    if (!endTime.value) {
        showToast('Please select an end time', 'warning');
        return false;
    }

    // Check if start time is before end time
    if (startTime.value >= endTime.value) {
        showToast('Start time must be before end time', 'warning');
        return false;
    }

    // Check reason
    const reason = document.getElementById('daily-reason-modal');
    if (!reason.value.trim()) {
        showToast('Please provide a reason for overtime', 'warning');
        return false;
    }

    // Check if employees are selected
    const employeeCount = document.getElementById('daily-employee-count-modal').textContent;
    if (employeeCount === '0') {
        showToast('No employees in the selected group', 'warning');
        return false;
    }

    return true;
}

/**
 * Prepare shifting review data
 */
function prepareShiftingReviewData() {
    const groupSelect = document.getElementById('shifting-group');
    const groupName = groupSelect.options[groupSelect.selectedIndex].text;
    const startDate = document.getElementById('shifting-start-date').value;
    const endDate = document.getElementById('shifting-end-date').value;
    const shiftType = document.querySelector('input[name="shift-type"]:checked').value;

    // Get employee data
    const employees = [];
    const employeeRows = document.querySelectorAll('#shifting-employees-container .OT-employee-item');

    employeeRows.forEach(row => {
        const employeeInfo = row.querySelector('.OT-employee-info');
        const statusSelect = row.querySelector('.OT-status-select-input');

        employees.push({
            id: row.getAttribute('data-id'),
            id_number: employeeInfo.querySelector('.OT-employee-id').textContent,
            name: employeeInfo.querySelector('.OT-employee-name').textContent,
            department: employeeInfo.querySelector('.OT-employee-detail').textContent.split(' - ')[0],
            line: employeeInfo.querySelector('.OT-employee-detail').textContent.split(' - ')[1],
            status: statusSelect ? statusSelect.value : 'OT'
        });
    });

    // Summary counts
    const statusCounts = {
        OT: employees.filter(emp => emp.status === 'OT').length,
        'NOT-OT': employees.filter(emp => emp.status === 'NOT-OT').length,
        ABSENT: employees.filter(emp => emp.status === 'ABSENT').length,
        LEAVE: employees.filter(emp => emp.status === 'LEAVE').length
    };

    return {
        type: 'shifting',
        group: groupName,
        groupId: groupSelect.value,
        startDate: startDate,
        endDate: endDate,
        shiftType: shiftType,
        employees: employees,
        statusCounts: statusCounts,
        source: 'regular' // Add source information
    };
}

/**
 * Prepare shifting review data for modal
 */
function prepareShiftingReviewDataModal() {
    const groupSelect = document.getElementById('shifting-group-modal');
    const groupName = groupSelect.options[groupSelect.selectedIndex].text;
    const startDate = document.getElementById('shifting-start-date-modal').value;
    const endDate = document.getElementById('shifting-end-date-modal').value;
    const shiftType = document.querySelector('input[name="shift-type-modal"]:checked').value;
    // Reason field removed as per requirements

    // Get employee data
    const employees = [];
    const employeeRows = document.querySelectorAll('#shifting-employees-container-modal .OT-employee-item');

    employeeRows.forEach(row => {
        const employeeInfo = row.querySelector('.OT-employee-info');
        const statusSelect = row.querySelector('.OT-status-select-input');

        // Create employee object with available data
        const employee = {
            id: row.getAttribute('data-id'),
            id_number: employeeInfo.querySelector('.OT-employee-id').textContent,
            name: employeeInfo.querySelector('.OT-employee-name').textContent,
            department: '-', // Default value if not available
            line: '-', // Default value if not available
            status: statusSelect ? statusSelect.value : 'OT'
        };

        // Add to employees array
        employees.push(employee);
    });

    // Summary counts
    const statusCounts = {
        OT: employees.filter(emp => emp.status === 'OT').length,
        'NOT-OT': employees.filter(emp => emp.status === 'NOT-OT').length,
        ABSENT: employees.filter(emp => emp.status === 'ABSENT').length,
        LEAVE: employees.filter(emp => emp.status === 'LEAVE').length
    };

    return {
        type: 'shifting',
        group: groupName,
        groupId: groupSelect.value,
        startDate: startDate,
        endDate: endDate,
        shiftType: shiftType,
        reason: "As Per Schedule", // Default reason for shifting OT
        employees: employees,
        statusCounts: statusCounts,
        source: 'modal' // Add source information
    };
}

/**
 * Prepare daily review data
 */
function prepareDailyReviewData() {
    const groupSelect = document.getElementById('daily-group');
    const groupName = groupSelect.options[groupSelect.selectedIndex].text;
    const date = document.getElementById('daily-date').value;
    const scheduleSelect = document.getElementById('daily-schedule');
    const scheduleType = scheduleSelect.options[scheduleSelect.selectedIndex].text;
    const startTime = document.getElementById('daily-start-time').value;
    const endTime = document.getElementById('daily-end-time').value;
    const reason = document.getElementById('daily-reason').value;

    // Get employee data
    const employees = [];
    const employeeRows = document.querySelectorAll('#daily-employees-container .OT-employee-item');

    employeeRows.forEach(row => {
        const employeeInfo = row.querySelector('.OT-employee-info');
        const statusSelect = row.querySelector('.OT-status-select-input');

        employees.push({
            id: row.getAttribute('data-id'),
            id_number: employeeInfo.querySelector('.OT-employee-id').textContent,
            name: employeeInfo.querySelector('.OT-employee-name').textContent,
            department: employeeInfo.querySelector('.OT-employee-detail').textContent.split(' - ')[0],
            line: employeeInfo.querySelector('.OT-employee-detail').textContent.split(' - ')[1],
            status: statusSelect ? statusSelect.value : 'OT'
        });
    });

    // Summary counts
    const statusCounts = {
        OT: employees.filter(emp => emp.status === 'OT').length,
        'NOT-OT': employees.filter(emp => emp.status === 'NOT-OT').length,
        ABSENT: employees.filter(emp => emp.status === 'ABSENT').length,
        LEAVE: employees.filter(emp => emp.status === 'LEAVE').length
    };

    return {
        type: 'daily',
        group: groupName,
        groupId: groupSelect.value,
        date: date,
        scheduleType: scheduleType,
        scheduleValue: scheduleSelect.value,
        startTime: startTime,
        endTime: endTime,
        reason: reason,
        employees: employees,
        statusCounts: statusCounts,
        source: 'regular' // Add source information
    };
}

/**
 * Prepare daily review data for modal
 */
function prepareDailyReviewDataModal() {
    const groupSelect = document.getElementById('daily-group-modal');
    const groupName = groupSelect.options[groupSelect.selectedIndex].text;
    const date = document.getElementById('daily-date-modal').value;
    const scheduleSelect = document.getElementById('daily-schedule-modal');
    const scheduleType = scheduleSelect.options[scheduleSelect.selectedIndex].text;
    const startTime = document.getElementById('daily-start-time-modal').value;
    const endTime = document.getElementById('daily-end-time-modal').value;
    const reason = document.getElementById('daily-reason-modal').value;

    // Get employee data
    const employees = [];
    const employeeRows = document.querySelectorAll('#daily-employees-container-modal .OT-employee-item');

    employeeRows.forEach(row => {
        const employeeInfo = row.querySelector('.OT-employee-info');
        const statusSelect = row.querySelector('.OT-status-select-input');

        // Create employee object with available data
        const employee = {
            id: row.getAttribute('data-id'),
            id_number: employeeInfo.querySelector('.OT-employee-id').textContent,
            name: employeeInfo.querySelector('.OT-employee-name').textContent,
            department: '-', // Default value if not available
            line: '-', // Default value if not available
            status: statusSelect ? statusSelect.value : 'OT'
        };

        // Add to employees array
        employees.push(employee);
    });

    // Summary counts
    const statusCounts = {
        OT: employees.filter(emp => emp.status === 'OT').length,
        'NOT-OT': employees.filter(emp => emp.status === 'NOT-OT').length,
        ABSENT: employees.filter(emp => emp.status === 'ABSENT').length,
        LEAVE: employees.filter(emp => emp.status === 'LEAVE').length
    };

    return {
        type: 'daily',
        group: groupName,
        groupId: groupSelect.value,
        date: date,
        scheduleType: scheduleType,
        scheduleValue: scheduleSelect.value,
        startTime: startTime,
        endTime: endTime,
        reason: reason,
        employees: employees,
        statusCounts: statusCounts,
        source: 'modal' // Add source information
    };
}

/**
 * Show OT review
 */
function showOTReview(data, type) {
    const reviewContent = document.getElementById('review-content');
    if (!reviewContent) return;

    // Store the source of the data (modal or regular form)
    const isFromModal = data.source === 'modal';

    // Remove the source property as it's not needed for submission
    if (isFromModal) {
        delete data.source;
    }

    let html = '';

    // Common header section with improved styling
    html += `
        <div class="OT-review-header">
            <div class="OT-review-type">
                <span class="OT-type-badge OT-type-${type}">${type === 'shifting' ? 'Shifting OT' : 'Daily OT'}</span>
                <h3>${data.group}</h3>
            </div>
            <div class="OT-review-date">
                <span>${formatDate(new Date())}</span>
            </div>
        </div>

        <div class="OT-review-section">
            <h4>Employee List (${data.employees.length})</h4>
            <div class="OT-review-table-container">
                <table class="OT-table">
                    <thead>
                        <tr>
                            <th>ID Number</th>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Line</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Add employee rows with status display (no icons)
    data.employees.forEach(employee => {
        let statusClass = '';

        switch (employee.status) {
            case 'OT':
                statusClass = 'OT-status-ot';
                break;
            case 'NOT-OT':
                statusClass = 'OT-status-not-ot';
                break;
            case 'ABSENT':
                statusClass = 'OT-status-absent';
                break;
            case 'LEAVE':
                statusClass = 'OT-status-leave';
                break;
        }

        html += `
            <tr>
                <td data-label="ID Number">${employee.id_number}</td>
                <td data-label="Name">${employee.name}</td>
                <td data-label="Department">${employee.department || '-'}</td>
                <td data-label="Line">${employee.line || '-'}</td>
                <td data-label="Status"><span class="OT-status ${statusClass}">${employee.status}</span></td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Only show reason section for daily OT or if reason is provided
    if (type === 'daily' || data.reason) {
        html += `
        <div class="OT-review-section">
            <h4>Reason for Overtime</h4>
            <div class="OT-details-reason">
                <div class="OT-details-value">${data.reason || 'No reason provided'}</div>
            </div>
        </div>
        `;
    }

    html += `
        <input type="hidden" id="review-data" value="${encodeURIComponent(JSON.stringify(data))}">
        <input type="hidden" id="review-source" value="${isFromModal ? 'modal' : 'regular'}">
    `;

    // Set content
    reviewContent.innerHTML = html;

    // Set modal title
    const modalTitle = document.getElementById('review-modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Review ${type === 'shifting' ? 'Shifting' : 'Daily'} OT Request`;
    }

    // Close any existing modals first
    if (type === 'shifting') {
        closeModal('shifting-ot-modal');
    } else {
        closeModal('daily-ot-modal');
    }

    // Open review modal
    openModal('ot-review-modal');
}

/**
 * Calculate days between two dates
 */
function calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    return diffDays;
}

/**
 * Submit OT request
 */
function submitOTRequest() {
    // Get review data
    const reviewDataElem = document.getElementById('review-data');
    if (!reviewDataElem) return;

    try {
        // Parse the data and ensure it's valid JSON
        const reviewData = JSON.parse(decodeURIComponent(reviewDataElem.value));

        console.log('Review data before submission:', reviewData);

        // Check if late filing requires password
        const isLateShifting = reviewData.type === 'shifting' && isLateShiftingFiling(reviewData.startDate);
        const isLateDaily = reviewData.type === 'daily' && isLateDailyFiling(reviewData.date, reviewData.scheduleValue);

        if (isLateShifting || isLateDaily) {
            // Show password modal
            closeModal('ot-review-modal');
            openModal('password-modal');

            // Set up submit button
            const submitPasswordButton = document.getElementById('submit-password');
            if (submitPasswordButton) {
                // Remove any existing event listeners
                submitPasswordButton.onclick = null;

                // Add new event listener
                submitPasswordButton.onclick = function() {
                    const password = document.getElementById('authorization-password').value;
                    if (!password) {
                        showToast('Please enter the authorization password', 'warning');
                        return;
                    }

                    // Add password to data
                    reviewData.lateFilingPassword = password;

                    // Submit with password
                    submitOTRequestToServer(reviewData);
                };
            }
        } else {
            // Submit directly
            submitOTRequestToServer(reviewData);
        }
    } catch (error) {
        console.error('Error parsing review data:', error);
        showToast('Error preparing data for submission. Please try again.', 'error');
    }
}

/**
 * Check if shifting filing is late
 * @param {string} startDate - The start date of the shifting OT
 * @returns {boolean} - Whether the filing is late
 */
function isLateShiftingFiling(startDate) { // eslint-disable-line no-unused-vars
    // Note: startDate parameter is not used in the current implementation
    // In a real implementation, we would compare the filing date with the startDate
    // For now, we'll just check if it's after Thursday
    const filingDate = new Date();
    const dayOfWeek = filingDate.getDay(); // 0 = Sunday, 4 = Thursday

    // Filing is late if it's after Thursday
    return dayOfWeek > 4;
}

/**
 * Check if daily filing is late
 * @param {string} date - The date of the daily OT
 * @param {string} scheduleType - The schedule type (WEEKDAY, SATURDAY, SUNDAY, HOLIDAY)
 * @returns {boolean} - Whether the filing is late
 */
function isLateDailyFiling(date, scheduleType) { // eslint-disable-line no-unused-vars
    console.log('Checking if daily filing is late:', { date, scheduleType });

    // For weekend days and holidays, always require password
    if (scheduleType === 'SATURDAY' || scheduleType === 'SUNDAY' || scheduleType === 'HOLIDAY') {
        console.log('Weekend or holiday schedule detected - requires password');
        return true;
    }

    // For weekdays, check time
    if (scheduleType === 'WEEKDAY') {
        const filingDate = new Date();
        const filingTime = filingDate.getHours() * 60 + filingDate.getMinutes();

        // Late if after 10:00 AM (600 minutes)
        const isLate = filingTime > 600;
        console.log('Weekday schedule - late if after 10:00 AM:', { filingTime, isLate });
        return isLate;
    }

    return false;
}

/**
 * Submit OT request to server
 */
function submitOTRequestToServer(data) {
    // Show submit button loading state - use the appropriate button based on OT type
    let submitButton;

    if (data.type === 'shifting') {
        submitButton = document.getElementById('shifting-submit-modal');
    } else {
        submitButton = document.getElementById('daily-submit-modal');
    }

    if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitButton.disabled = true;
    }

    // Close password modal if open
    if (document.getElementById('password-modal').classList.contains('active')) {
        closeModal('password-modal');
    }

    // Clean up data before sending to server
    try {
        // Create a clean copy of the data to avoid modifying the original
        const cleanData = { ...data };

        // Remove properties not needed by the server
        if (cleanData.source) {
            delete cleanData.source;
        }

        // Remove statusCounts as it's not needed by the server
        if (cleanData.statusCounts) {
            delete cleanData.statusCounts;
        }

        // Ensure employee data is properly formatted
        if (cleanData.employees && Array.isArray(cleanData.employees)) {
            // Make sure each employee object has only the required fields
            cleanData.employees = cleanData.employees.map(emp => ({
                id: emp.id,
                status: emp.status
            }));
        }

        // Replace the original data with the cleaned version
        data = cleanData;

        console.log('Cleaned data for submission:', data);
    } catch (error) {
        console.error('Error cleaning data:', error);
        showToast('Error preparing data for submission. Please try again.', 'error');

        // Reset submit button
        if (submitButton) {
            submitButton.innerHTML = 'Confirm Submission';
            submitButton.disabled = false;
        }
        return;
    }

    // Prepare API endpoint
    const endpoint = data.type === 'shifting' ? '/overtime/api/submit-shifting-ot/' : '/overtime/api/submit-daily-ot/';
    console.log('Using endpoint:', endpoint);

    // Log the data being sent for debugging
    console.log('Submitting OT request to:', endpoint);
    console.log('Request data:', data);

    // Validate data before sending
    if (!validateDataBeforeSubmission(data)) {
        // Reset submit button
        if (submitButton) {
            submitButton.innerHTML = '<i class="fas fa-check"></i> Submit';
            submitButton.disabled = false;
        }
        return;
    }

    // Log the complete request details for debugging
    console.log('Complete request details:');
    console.log('- Endpoint:', endpoint);
    console.log('- Method: POST');
    console.log('- Headers:', {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
    });

    // Ensure data is properly formatted for the server
    // The server expects specific field names that match the Django form
    const formattedData = {
        groupId: data.groupId,
        employees: data.employees // Send the employees array directly
    };

    // Add type-specific fields
    if (data.type === 'shifting') {
        // Make sure we have valid date values
        if (!data.startDate) {
            showToast('Start date is required', 'error');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-check"></i> Submit';
                submitButton.disabled = false;
            }
            return;
        }

        if (!data.endDate) {
            showToast('End date is required', 'error');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-check"></i> Submit';
                submitButton.disabled = false;
            }
            return;
        }

        // Use the field names expected by the server
        formattedData.startDate = data.startDate;
        formattedData.endDate = data.endDate;
        formattedData.shiftType = data.shiftType;
        formattedData.reason = data.reason;
    } else {
        // Make sure we have valid values
        if (!data.date) {
            showToast('Date is required', 'error');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-check"></i> Submit';
                submitButton.disabled = false;
            }
            return;
        }

        // Use the field names expected by the server
        formattedData.date = data.date;
        formattedData.scheduleValue = data.scheduleValue;
        formattedData.startTime = data.startTime;
        formattedData.endTime = data.endTime;
        formattedData.reason = data.reason;
    }

    // Add late filing password if present
    if (data.lateFilingPassword) {
        formattedData.late_filing_password = data.lateFilingPassword;
    }

    console.log('- Formatted data:', formattedData);
    console.log('- Body:', JSON.stringify(formattedData, null, 2));

    // Send request
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(formattedData)
    })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            // Clone the response so we can read it twice
            const responseClone = response.clone();

            // Try to read the response body as text for debugging
            responseClone.text().then(text => {
                try {
                    const jsonResponse = JSON.parse(text);
                    console.log('Response body:', jsonResponse);

                    // Check for validation errors
                    if (jsonResponse.errors) {
                        console.error('Validation errors:', jsonResponse.errors);

                        // Check if this is a late filing password error
                        if (jsonResponse.errors.late_filing_password &&
                            jsonResponse.errors.late_filing_password.includes('Password is required for late filing')) {
                            console.log('Late filing password required - showing password modal');

                            // Show password modal with the correct parent modal
                            const passwordModal = document.getElementById('password-modal');
                            if (passwordModal) {
                                const parentModalId = data.type === 'shifting' ? 'shifting-ot-modal' : 'daily-ot-modal';
                                passwordModal.setAttribute('data-parent-modal', parentModalId);
                                openModal('password-modal');

                                // Set up submit button
                                const submitPasswordButton = document.getElementById('submit-password');
                                if (submitPasswordButton) {
                                    // Remove any existing event listeners
                                    submitPasswordButton.onclick = null;

                                    // Add new event listener
                                    submitPasswordButton.onclick = function() {
                                        const password = document.getElementById('authorization-password').value;
                                        if (!password) {
                                            showToast('Please enter the authorization password', 'warning');
                                            return;
                                        }

                                        // Add password to data and resubmit
                                        data.lateFilingPassword = password;
                                        formattedData.late_filing_password = password;

                                        // Close password modal
                                        closeModal('password-modal');

                                        // Resubmit with password
                                        submitOTRequestToServer(data);
                                    };
                                }
                            }
                        } else {
                            // Display other validation errors
                            const errorMessages = [];
                            for (const field in jsonResponse.errors) {
                                errorMessages.push(`${field}: ${jsonResponse.errors[field].join(', ')}`);
                            }
                            showToast(`Validation error: ${errorMessages.join('; ')}`, 'error');
                        }
                    } else if (jsonResponse.error) {
                        console.error('Server error:', jsonResponse.error);
                        showToast(`Server error: ${jsonResponse.error}`, 'error');
                    }
                } catch (e) {
                    console.log('Response text (not JSON):', text);
                    console.error('Error parsing response:', e);
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Password error
                    throw new Error('Invalid authorization password');
                } else if (response.status === 400) {
                    // Validation error - already handled in the text parsing above
                    throw new Error('Validation error');
                } else if (response.status === 404) {
                    // Endpoint not found
                    throw new Error(`API endpoint not found: ${response.url}`);
                } else if (response.status === 500) {
                    // Server error
                    throw new Error(`Server error: ${response.status}`);
                } else {
                    // Other error
                    throw new Error(`HTTP error: ${response.status}`);
                }
            }

            // Try to parse the response as JSON
            try {
                return response.json();
            } catch (error) {
                console.error('Error parsing response as JSON:', error);
                throw new Error('Invalid response format from server');
            }
        })
        .then(responseData => {
            // Close the appropriate modal
            if (data.type === 'shifting') {
                closeModal('shifting-ot-modal');
            } else {
                closeModal('daily-ot-modal');
            }

            // Show success message
            showToast(`${data.type === 'shifting' ? 'Shifting' : 'Daily'} OT request submitted successfully`, 'success');

            // Reset form
            if (data.type === 'shifting') {
                document.getElementById('shifting-ot-form-modal').reset();
                document.getElementById('shifting-group-modal').value = '';
                document.getElementById('shifting-employees-container-modal').innerHTML = `
                    <div class="OT-empty-selection">
                        <i class="fas fa-users"></i>
                        <p>No employees selected. Please choose a group or create a new one.</p>
                    </div>
                `;
                document.getElementById('shifting-employee-count-modal').textContent = '0';
            } else {
                document.getElementById('daily-ot-form-modal').reset();
                document.getElementById('daily-group-modal').value = '';
                document.getElementById('daily-employees-container-modal').innerHTML = `
                    <div class="OT-empty-selection">
                        <i class="fas fa-users"></i>
                        <p>No employees selected. Please choose a group or create a new one.</p>
                    </div>
                `;
                document.getElementById('daily-employee-count-modal').textContent = '0';
            }

            // Add to history list if we're on the right page
            if (document.querySelector('.OT-history-list')) {
                addHistoryItem(responseData.filing);
            }
        })
        .catch(error => {
            console.error('Error submitting OT request:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            if (error.message === 'Invalid authorization password') {
                showToast('Invalid authorization password. Please try again.', 'error');

                // Show password modal again
                openModal('password-modal');

                // Clear password field
                document.getElementById('authorization-password').value = '';
                document.getElementById('authorization-password').focus();
            } else if (error.message === 'Validation error') {
                // Validation errors are already handled in the response parsing
            } else {
                // Show more detailed error message
                const errorMessage = error.message || 'Unknown error';
                showToast(`Failed to submit OT request: ${errorMessage}. Please try again.`, 'error');
                console.error('Detailed error information:', error);

                // Log the data that was sent for debugging
                console.error('Data sent to server:', formattedData);
                console.error('JSON string sent:', JSON.stringify(formattedData));
            }

            // Reset submit button
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-check"></i> Submit';
                submitButton.disabled = false;
            }
        });
}

/**
 * Add history item to list
 */
function addHistoryItem(filing) {
    const historyList = document.querySelector('.OT-history-list');
    if (!historyList) return;

    // Remove empty history message if it exists
    const emptyHistory = historyList.querySelector('.OT-empty-history');
    if (emptyHistory) {
        emptyHistory.remove();
    }

    // Create new history item
    const historyItem = document.createElement('div');
    historyItem.className = 'OT-history-item';
    historyItem.setAttribute('data-type', filing.type);

    historyItem.innerHTML = `
        <div class="OT-history-header">
            <div class="OT-history-title">
                <span class="OT-type-badge OT-type-${filing.type.toLowerCase()}">${filing.type}</span>
                <span class="OT-history-id">${filing.id}</span>
            </div>
            <span class="OT-history-date">${filing.date}</span>
        </div>
        <div class="OT-history-details">
            <p><strong>Group:</strong> ${filing.group}</p>
            <p><strong>Employees:</strong> ${filing.employee_count}</p>
            ${filing.type === 'Shifting' ?
                `<p><strong>Shift:</strong> ${filing.shift_type}</p>` :
                `<p><strong>Schedule:</strong> ${filing.schedule_type}</p>`
            }
        </div>
        <div class="OT-history-actions">
            <button class="OT-button OT-text-button OT-view-history" data-id="${filing.id}">
                <i class="fas fa-eye"></i> View Details
            </button>
        </div>
    `;

    // Add to history list
    historyList.insertBefore(historyItem, historyList.firstChild);

    // Add animation class
    historyItem.classList.add('OT-new-item');
    setTimeout(() => {
        historyItem.classList.remove('OT-new-item');
    }, 1000);
}

/**
 * Handle search
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();

    // Determine which search to perform based on the search input
    if (event.target.id === 'employee-search-input') {
        filterEmployeeTable(searchTerm);
    } else if (event.target.id === 'shuttle-search') {
        filterShuttleTable(searchTerm);
    } else if (event.target.closest('.OT-history-panel')) {
        filterHistoryList(searchTerm);
    }
}

/**
 * Filter employee table based on search term
 * @param {string} searchTerm - The search term to filter by
 */
function filterEmployeeTable(searchTerm) {
    const rows = document.querySelectorAll('#employee-table tbody tr');

    rows.forEach(row => {
        const idNumber = row.querySelector('td[data-label="ID Number"]').textContent.toLowerCase();
        const name = row.querySelector('td[data-label="Employee Name"]').textContent.toLowerCase();
        const department = row.querySelector('td[data-label="Department"]').textContent.toLowerCase();
        const line = row.querySelector('td[data-label="Line"]').textContent.toLowerCase();

        if (idNumber.includes(searchTerm) ||
            name.includes(searchTerm) ||
            department.includes(searchTerm) ||
            line.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Filter shuttle table based on search term
 * @param {string} searchTerm - The search term to filter by
 */
function filterShuttleTable(searchTerm) {
    const rows = document.querySelectorAll('#shuttle-table tbody tr');

    rows.forEach(row => {
        const route = row.querySelector('td[data-label="Route"]').textContent.toLowerCase();
        const capacity = row.querySelector('td[data-label="Capacity"]').textContent.toLowerCase();
        const assigned = row.querySelector('td[data-label="Assigned"]').textContent.toLowerCase();

        if (route.includes(searchTerm) ||
            capacity.includes(searchTerm) ||
            assigned.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Filter history list based on search term
 * @param {string} searchTerm - The search term to filter by
 */
function filterHistoryList(searchTerm) {
    const items = document.querySelectorAll('.OT-history-item');

    items.forEach(item => {
        const id = item.querySelector('.OT-history-id').textContent.toLowerCase();
        const date = item.querySelector('.OT-history-date').textContent.toLowerCase();
        const group = item.querySelector('.OT-history-details p:first-child').textContent.toLowerCase();
        const type = item.getAttribute('data-type').toLowerCase();

        if (id.includes(searchTerm) ||
            date.includes(searchTerm) ||
            group.includes(searchTerm) ||
            type.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Show toast notification
 * This function uses the global toast container from main.html
 */
function showToast(message, type = 'info') {
    // Get the global toast container from main.html
    // First try to get the toast container from the document
    let toastContainer = document.querySelector('.toast-container');

    // If not found, create a new one
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Set icon based on type
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
    toastContainer.appendChild(toast);

    // Add click event for close button
    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        removeToast(toast);
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
        removeToast(toast);
    }, 3000);
}

/**
 * Remove toast notification
 */
function removeToast(toast) {
    // Use the fadeOut animation from style-ver2.css
    setTimeout(() => {
        toast.remove();
    }, 300);
}

/**
 * Apply default status to employees
 * @param {string} type - The type of OT (shifting or daily)
 * @param {string} status - The status to apply (OT, NOT-OT, ABSENT, LEAVE)
 * @param {string} target - Whether to apply to 'all' or 'selected' employees
 */
function applyDefaultStatus(type, status, target) {
    // Get all employee items in the container
    const employeeItems = document.querySelectorAll(`#${type}-employees-container-modal .OT-employee-item`);

    // If no employees, do nothing
    if (employeeItems.length === 0) {
        return;
    }

    // Apply the status to each employee based on target
    employeeItems.forEach(item => {
        // If target is 'selected', only apply to checked items
        if (target === 'selected') {
            const checkbox = item.querySelector('.OT-employee-checkbox input');
            if (!checkbox || !checkbox.checked) {
                return;
            }
        }

        // Check if the item already has a status select
        let statusSelect = item.querySelector('.OT-employee-status');

        // If no status select exists, create one
        if (!statusSelect) {
            statusSelect = document.createElement('div');
            statusSelect.className = 'OT-employee-status';
            statusSelect.innerHTML = `
                <select class="OT-status-select-input">
                    <option value="OT">OT</option>
                    <option value="NOT-OT">Not OT</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LEAVE">Leave</option>
                </select>
            `;
            item.appendChild(statusSelect);
        }

        // Set the selected value
        const select = statusSelect.querySelector('select');
        select.value = status;
    });
}

/**
 * Get CSRF token from cookies or hidden input field
 */
function getCSRFToken() {
    // Try to get from cookie
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('csrftoken=')) {
            const token = cookie.substring('csrftoken='.length, cookie.length);
            console.log('Found CSRF token in cookie:', token);
            return token;
        }
    }

    // If not found in cookie, try to get from hidden input
    const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (csrfInput) {
        console.log('Found CSRF token in hidden input:', csrfInput.value);
        return csrfInput.value;
    }

    console.warn('CSRF token not found!');
    return '';
}

/**
 * Format date as MM/DD/YYYY
 */
function formatDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/**
 * Format time (12-hour format)
 */
function formatTime(time) {
    // Handle empty time
    if (!time) return '';

    // Parse hours and minutes
    const [hours, minutes] = time.split(':').map(Number);

    // Determine AM/PM
    const period = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    const hours12 = hours % 12 || 12;

    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Validate data before submission to server
 */
function validateDataBeforeSubmission(data) {
    try {
        // Check if data is valid
        if (!data || typeof data !== 'object') {
            showToast('Invalid data format', 'error');
            console.error('Invalid data format:', data);
            return false;
        }

        // Check if data has the required fields
        if (!data.type) {
            showToast('Missing required field: type', 'error');
            console.error('Missing required field: type');
            return false;
        }

        if (!data.groupId) {
            showToast('Missing required field: groupId', 'error');
            console.error('Missing required field: groupId');
            return false;
        }

        if (!data.employees || !Array.isArray(data.employees) || data.employees.length === 0) {
            showToast('No employees selected', 'error');
            console.error('No employees selected or employees not in array format');
            return false;
        }

        // Check type-specific fields
        if (data.type === 'shifting') {
            if (!data.startDate) {
                showToast('Missing required field: startDate', 'error');
                console.error('Missing required field: startDate');
                return false;
            }

            if (!data.endDate) {
                showToast('Missing required field: endDate', 'error');
                console.error('Missing required field: endDate');
                return false;
            }

            if (!data.shiftType) {
                showToast('Missing required field: shiftType', 'error');
                console.error('Missing required field: shiftType');
                return false;
            }

            // Validate date format
            try {
                new Date(data.startDate);
                new Date(data.endDate);
            } catch (e) {
                showToast('Invalid date format', 'error');
                console.error('Invalid date format:', e);
                return false;
            }

        } else if (data.type === 'daily') {
            if (!data.date) {
                showToast('Missing required field: date', 'error');
                console.error('Missing required field: date');
                return false;
            }

            if (!data.scheduleType || !data.scheduleValue) {
                showToast('Missing required field: schedule type', 'error');
                console.error('Missing required field: scheduleType or scheduleValue');
                return false;
            }

            if (!data.startTime) {
                showToast('Missing required field: startTime', 'error');
                console.error('Missing required field: startTime');
                return false;
            }

            if (!data.endTime) {
                showToast('Missing required field: endTime', 'error');
                console.error('Missing required field: endTime');
                return false;
            }

            if (!data.reason) {
                showToast('Missing required field: reason', 'error');
                console.error('Missing required field: reason');
                return false;
            }

            // Validate date format
            try {
                new Date(data.date);
            } catch (e) {
                showToast('Invalid date format', 'error');
                console.error('Invalid date format:', e);
                return false;
            }

        } else {
            showToast('Invalid OT type: ' + data.type, 'error');
            console.error('Invalid OT type:', data.type);
            return false;
        }

        // Check employee data
        for (let i = 0; i < data.employees.length; i++) {
            const emp = data.employees[i];
            if (!emp.id) {
                showToast(`Missing employee ID for employee at index ${i}`, 'error');
                console.error(`Missing employee ID for employee at index ${i}:`, emp);
                return false;
            }

            if (!emp.status) {
                showToast(`Missing status for employee ID ${emp.id}`, 'error');
                console.error(`Missing status for employee ID ${emp.id}:`, emp);
                return false;
            }

            // Validate status value
            const validStatuses = ['OT', 'NOT-OT', 'ABSENT', 'LEAVE'];
            if (!validStatuses.includes(emp.status)) {
                showToast(`Invalid status value for employee ID ${emp.id}: ${emp.status}`, 'error');
                console.error(`Invalid status value for employee ID ${emp.id}:`, emp.status);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Error validating data:', error);
        showToast('Error validating data. Please try again.', 'error');
        return false;
    }
}

/**
 * Get CSRF token from cookies
 */
function getCSRFToken() {
    // First try to get it from the cookie
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }

    // If not found in cookie, try to get it from the meta tag
    if (!cookieValue) {
        const csrfElement = document.querySelector('meta[name="csrf-token"]');
        if (csrfElement) {
            cookieValue = csrfElement.getAttribute('content');
        }
    }

    // If still not found, try to get it from the hidden input field
    if (!cookieValue) {
        const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (csrfInput) {
            cookieValue = csrfInput.value;
        }
    }

    console.log('CSRF Token:', cookieValue);
    return cookieValue;
}