document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations and components
    initializeAnimations();
    initializeCharts();
    setupEventListeners();
    setupEmptyStates();

    // Set up event listeners for when group details are loaded
    document.addEventListener('groupDetailsLoaded', function() {
        setupChartFilterEvents();
        setupProductsEmptyState();
        setupScheduleEmptyState();
    });

    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', function() {
            updateOutputChart(this.value);
        });

        updateOutputChart(periodSelector.value);
    }

    // Set up shift filter for recent activities
    const shiftSelector = document.getElementById('shift-selector');
    if (shiftSelector) {
        shiftSelector.addEventListener('change', function() {
            filterActivitiesByShift(this.value);
        });
    }

    // Set up search and filter for monitoring groups
    setupGroupsSearch();
});

// ========================================================================
// Empty States Management
// ========================================================================

function setupEmptyStates() {
    setupActivitiesEmptyState();
    setupGroupsEmptyState();
}

function setupActivitiesEmptyState() {
    const activityList = document.getElementById('activity-list');
    const shiftSelector = document.getElementById('shift-selector');

    if (!activityList || !shiftSelector) return;

    // Initial check for empty state
    const activityItems = activityList.querySelectorAll('.PM-activity-item:not(.PM-empty-state)');

    // If there are no activities, the Django template will handle the empty state
    if (activityItems.length === 0) return;

    // Set up shift filter functionality
    shiftSelector.addEventListener('change', function() {
        filterActivitiesByShift(this.value);
    });
}

function filterActivitiesByShift(shift) {
    const activityList = document.getElementById('activity-list');
    const filteredEmptyState = document.getElementById('filtered-activities-empty-state');

    if (!activityList || !filteredEmptyState) return;

    const activityItems = activityList.querySelectorAll('.PM-activity-item:not(.PM-empty-state)');
    let visibleCount = 0;

    activityItems.forEach(item => {
        if (shift === 'all' || item.getAttribute('data-shift') === shift) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    // Show/hide filtered empty state
    if (visibleCount === 0 && activityItems.length > 0) {
        filteredEmptyState.style.display = 'flex';
    } else {
        filteredEmptyState.style.display = 'none';
    }
}

function setupGroupsEmptyState() {
    const groupsContainer = document.getElementById('PM-groups-container');
    const searchInput = document.querySelector('.PM-search-input');
    const filterSelect = document.querySelector('.PM-filter-select');

    if (!groupsContainer || !searchInput || !filterSelect) return;

    // Set up search and filter functionality
    searchInput.addEventListener('input', function() {
        filterGroups();
    });

    filterSelect.addEventListener('change', function() {
        filterGroups();
    });
}

function filterGroups() {
    const groupsContainer = document.getElementById('PM-groups-container');
    const searchInput = document.querySelector('.PM-search-input');
    const filterSelect = document.querySelector('.PM-filter-select');
    const filteredEmptyState = document.getElementById('filtered-groups-empty-state');

    if (!groupsContainer || !searchInput || !filterSelect || !filteredEmptyState) return;

    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;

    const groupCards = groupsContainer.querySelectorAll('.PM-group-card');
    let visibleCount = 0;

    groupCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const status = card.getAttribute('data-status');
        const lineTags = Array.from(card.querySelectorAll('.PM-line-tag')).map(tag => tag.textContent.toLowerCase());

        const matchesSearch = searchTerm === '' ||
                             title.includes(searchTerm) ||
                             lineTags.some(tag => tag.includes(searchTerm));

        const matchesFilter = filterValue === 'all' || status === filterValue;

        if (matchesSearch && matchesFilter) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Show/hide filtered empty state
    if (visibleCount === 0 && groupCards.length > 0) {
        filteredEmptyState.style.display = 'flex';
    } else {
        filteredEmptyState.style.display = 'none';
    }
}

function setupProductsEmptyState() {
    const productsTab = document.getElementById('products-tab');
    const emptyRow = document.getElementById('products-empty-row');
    const searchEmptyRow = document.getElementById('products-search-empty-row');

    if (!productsTab || !searchEmptyRow) return;

    // The empty row is now handled by Django template with {% empty %}
    // We only need to set up the search functionality

    const productRows = productsTab.querySelectorAll('#products-table-body tr:not(#products-empty-row):not(#products-search-empty-row)');

    // Set up search functionality
    const searchInput = document.getElementById('product-search');
    if (searchInput && productRows.length > 0) {
        searchInput.addEventListener('input', function() {
            filterProducts(this.value);
        });
    }
}

function filterProducts(searchTerm) {
    const productsTableBody = document.getElementById('products-table-body');
    const searchEmptyRow = document.getElementById('products-search-empty-row');
    const emptyRow = document.getElementById('products-empty-row');

    if (!productsTableBody || !searchEmptyRow) return;

    searchTerm = searchTerm.toLowerCase().trim();

    const productRows = productsTableBody.querySelectorAll('tr:not(#products-empty-row):not(#products-search-empty-row)');
    let visibleCount = 0;

    // If there are no product rows, don't do anything
    if (productRows.length === 0) return;

    productRows.forEach(row => {
        const productName = row.querySelector('td:nth-child(1)')?.textContent.toLowerCase() || '';
        const description = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        const line = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';

        if (productName.includes(searchTerm) || description.includes(searchTerm) || line.includes(searchTerm) || searchTerm === '') {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Show/hide search empty state
    if (visibleCount === 0 && productRows.length > 0) {
        if (emptyRow) emptyRow.style.display = 'none';
        searchEmptyRow.style.display = '';
    } else {
        searchEmptyRow.style.display = 'none';
    }
}

function setupScheduleEmptyState() {
    const scheduleTab = document.getElementById('schedule-tab');
    const emptyRow = document.getElementById('schedule-empty-row');
    const filteredEmptyRow = document.getElementById('schedule-filtered-empty-row');

    if (!scheduleTab || !filteredEmptyRow) return;

    // The empty row is now handled by Django template with {% empty %}
    // We only need to set up the filter and search functionality

    const scheduleRows = scheduleTab.querySelectorAll('#schedule-table-body tr:not(#schedule-empty-row):not(#schedule-filtered-empty-row)');

    // Set up filter functionality
    const dateFilter = document.getElementById('schedule-date');
    const shiftFilter = document.getElementById('schedule-shift');
    const statusFilter = document.getElementById('schedule-status');
    const searchInput = document.getElementById('schedule-search');

    if (scheduleRows.length > 0) {
        if (dateFilter && shiftFilter && statusFilter) {
            const filterHandler = function() {
                filterScheduleItems();
            };

            dateFilter.addEventListener('change', filterHandler);
            shiftFilter.addEventListener('change', filterHandler);
            statusFilter.addEventListener('change', filterHandler);
        }

        if (searchInput) {
            searchInput.addEventListener('input', function() {
                filterScheduleItems();
            });
        }
    }
}

function filterScheduleItems() {
    const scheduleTableBody = document.getElementById('schedule-table-body');
    const filteredEmptyRow = document.getElementById('schedule-filtered-empty-row');
    const emptyRow = document.getElementById('schedule-empty-row');

    if (!scheduleTableBody || !filteredEmptyRow) return;

    const dateFilter = document.getElementById('schedule-date');
    const shiftFilter = document.getElementById('schedule-shift');
    const statusFilter = document.getElementById('schedule-status');
    const searchInput = document.getElementById('schedule-search');

    if (!dateFilter || !shiftFilter || !statusFilter) return;

    const dateValue = dateFilter.value;
    const shiftValue = shiftFilter.value;
    const statusValue = statusFilter.value;
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const scheduleRows = scheduleTableBody.querySelectorAll('tr:not(#schedule-empty-row):not(#schedule-filtered-empty-row)');
    let visibleCount = 0;

    // If there are no schedule rows, don't do anything
    if (scheduleRows.length === 0) return;

    scheduleRows.forEach(row => {
        const itemDate = row.getAttribute('data-date');
        const itemShift = row.getAttribute('data-shift');
        const itemStatus = row.getAttribute('data-status');

        const product = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        const line = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';

        const matchesDate = !dateValue || itemDate === dateValue;
        const matchesShift = shiftValue === 'all' || itemShift === shiftValue;
        const matchesStatus = statusValue === 'all' || itemStatus === statusValue;
        const matchesSearch = searchTerm === '' ||
                             product.includes(searchTerm) ||
                             line.includes(searchTerm);

        if (matchesDate && matchesShift && matchesStatus && matchesSearch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Show/hide filtered empty state
    if (visibleCount === 0 && scheduleRows.length > 0) {
        if (emptyRow) emptyRow.style.display = 'none';
        filteredEmptyRow.style.display = '';
    } else {
        filteredEmptyRow.style.display = 'none';
    }
}

// ========================================================================
// Chart Initialization and Updates
// ========================================================================

let outputChart = null;
let detailPerformanceChart = null;

function initializeCharts() {
    initializeOutputChart();

    // If we're in the detail view and the detail chart exists, initialize it
    const detailChartElement = document.getElementById('detail-performance-chart');
    if (detailChartElement) {
        initializeDetailChart();
    }
}

function initializeOutputChart() {
    const ctx = document.getElementById('output-chart');

    if (!ctx) {
        console.error('Output chart canvas not found');
        return null;
    }

    outputChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Actual Output',
                    data: [],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Target Output',
                    data: [],
                    borderColor: '#2196F3',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'start',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
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
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString();
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
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });

    return outputChart;
}

function updateOutputChart(period) {
    // Show loading state
    const chartContainer = document.querySelector('.PM-chart-container');
    if (chartContainer) {
        chartContainer.classList.add('loading');
    }

    // Fetch chart data
    fetch(`/monitoring/chart-data/${period}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Make sure data has the expected structure
            if (!data.labels || !Array.isArray(data.labels) ||
                !data.actual || !Array.isArray(data.actual) ||
                !data.target || !Array.isArray(data.target)) {
                console.error("Invalid chart data format:", data);
                throw new Error('Invalid chart data format');
            }

            // Update chart with new data
            outputChart.data.labels = data.labels;
            outputChart.data.datasets[0].data = data.actual;
            outputChart.data.datasets[1].data = data.target;

            outputChart.update({
                duration: 800,
                easing: 'easeOutQuart'
            });

            // Remove loading state
            if (chartContainer) {
                chartContainer.classList.remove('loading');
            }
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);

            // Remove loading state
            if (chartContainer) {
                chartContainer.classList.remove('loading');
            }

            // Show error message
            const chartWrapper = document.querySelector('.PM-chart-wrapper');
            if (chartWrapper) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'PM-chart-error';
                errorMessage.innerHTML = `
                    <div class="PM-empty-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Error Loading Data</h3>
                    <p>There was a problem loading the chart data. Please try again.</p>
                `;
                chartWrapper.appendChild(errorMessage);
            }
        });
}

// ========================================================================
// Event Listeners and Animations
// ========================================================================

function setupEventListeners() {
    // Set up view details buttons
    const viewDetailsButtons = document.querySelectorAll('.view-details');
    viewDetailsButtons.forEach(button => {
        button.addEventListener('click', function() {
            const groupId = this.getAttribute('data-id');
            if (groupId) {
                loadGroupDetails(groupId);
            }
        });
    });
}

function initializeAnimations() {
    // Add your animations here
}

function setupChartFilterEvents() {
    // Add your chart filter events here
}

// Function to load group details with improved error handling
function loadGroupDetails(groupId) {
    const detailsModal = document.getElementById('view-details-modal');
    if (!detailsModal) return;

    openModal(detailsModal);

    // Add loading state
    const modalBody = detailsModal.querySelector('.PM-modal-body');
    if (modalBody) {
        modalBody.classList.add('loading');
    }

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Fetch group details with improved error handling
    fetch(`/monitoring/get-group/${groupId}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrfToken
        },
        credentials: 'same-origin'
    })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Error response text:', text);
                    throw new Error(`Server responded with status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (modalBody) {
                modalBody.classList.remove('loading');

                // Log the data to see what we're getting
                console.log('Group details data:', data);

                // Update the group name and status
                const groupNameElement = document.getElementById('detail-group-name');
                const statusElement = document.getElementById('detail-status');
                const linesCountElement = document.getElementById('detail-lines-count');
                const percentageElement = document.getElementById('detail-percentage');
                const todayOutputElement = document.getElementById('detail-today-output');
                const descriptionElement = document.getElementById('detail-description');

                if (groupNameElement) {
                    groupNameElement.textContent = data.title;
                    groupNameElement.setAttribute('data-id', data.id);
                }

                if (statusElement) {
                    statusElement.textContent = data.status;
                    statusElement.setAttribute('data-status', data.status.toLowerCase());
                }

                if (linesCountElement) {
                    linesCountElement.textContent = data.lines_count;
                }

                if (percentageElement) {
                    percentageElement.textContent = `${data.efficiency_percentage}%`;

                    // Add appropriate class based on percentage
                    percentageElement.className = 'PM-metric-value';
                    if (data.efficiency_percentage >= 90) {
                        percentageElement.classList.add('PM-percentage-high');
                    } else if (data.efficiency_percentage >= 70) {
                        percentageElement.classList.add('PM-percentage-medium');
                    } else {
                        percentageElement.classList.add('PM-percentage-low');
                    }
                }

                if (todayOutputElement) {
                    todayOutputElement.textContent = data.todays_output;
                }

                if (descriptionElement) {
                    descriptionElement.textContent = data.description || 'No description provided.';
                }

                // Update supervisors list
                const supervisorsList = document.getElementById('detail-supervisors-list');
                if (supervisorsList && data.supervisors) {
                    supervisorsList.innerHTML = '';

                    if (data.supervisors.length === 0) {
                        supervisorsList.innerHTML = '<p class="PM-empty-text">No supervisors assigned</p>';
                    } else {
                        data.supervisors.forEach(supervisor => {
                            const supervisorItem = document.createElement('div');
                            supervisorItem.className = 'PM-supervisor-item';
                            supervisorItem.innerHTML = `
                                <div class="PM-supervisor-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="PM-supervisor-info">
                                    <div class="PM-supervisor-name">${supervisor.name}</div>
                                    <div class="PM-supervisor-username">@${supervisor.username}</div>
                                </div>
                            `;
                            supervisorsList.appendChild(supervisorItem);
                        });
                    }
                }

                // Update product and schedule forms with the group ID
                const productGroupIdInput = document.getElementById('product-group-id');
                const importProductGroupIdInput = document.getElementById('import-product-group-id');
                const scheduleGroupIdInput = document.getElementById('schedule-group-id');
                const importScheduleGroupIdInput = document.getElementById('import-schedule-group-id');

                if (productGroupIdInput) productGroupIdInput.value = data.id;
                if (importProductGroupIdInput) importProductGroupIdInput.value = data.id;
                if (scheduleGroupIdInput) scheduleGroupIdInput.value = data.id;
                if (importScheduleGroupIdInput) importScheduleGroupIdInput.value = data.id;

                // Update dashboard button URL
                const openDashboardBtn = document.getElementById('open-dashboard-btn');
                if (openDashboardBtn) {
                    openDashboardBtn.onclick = function() {
                        window.location.href = `/monitoring/group-dashboard/${data.id}/`;
                    };
                }

                // Update edit button
                const editFromDetailsBtn = document.getElementById('edit-from-details');
                if (editFromDetailsBtn) {
                    editFromDetailsBtn.onclick = function() {
                        // Close the details modal
                        closeModal(detailsModal);

                        // Open the edit modal
                        const editModal = document.getElementById('edit-group-modal');
                        if (editModal) {
                            // Set the form values
                            const editForm = editModal.querySelector('form');
                            if (editForm) {
                                const groupIdInput = editForm.querySelector('input[name="group_id"]');
                                if (groupIdInput) groupIdInput.value = data.id;
                            }

                            openModal(editModal);
                        }
                    };
                }

                // Update products table
                updateProductsTable(data.products);

                // Update schedules table
                updateSchedulesTable(data.schedules);

                // Dispatch event that group details are loaded
                document.dispatchEvent(new CustomEvent('groupDetailsLoaded', { detail: data }));
            }
        })
        .catch(error => {
            console.error('Error loading group details:', error);

            // Don't show toast error - it's annoying to users
            // Instead, show a more user-friendly error in the modal
            if (modalBody) {
                modalBody.classList.remove('loading');
                modalBody.innerHTML = `
                    <div class="PM-empty-state">
                        <div class="PM-empty-icon">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <h3>Unable to Load Details</h3>
                        <p>There was a problem loading the group details. Please try again.</p>
                        <button class="PM-button PM-primary-button" onclick="loadGroupDetails('${groupId}')">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                `;
            }
        });
}

// Helper function to open modals
function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Helper function to close modals
function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');

    setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 300);
}

// Function to update the group details modal with fetched data
// This function is now handled directly in loadGroupDetails
function updateGroupDetailsModal(data) {
    console.log('Group details data in updateGroupDetailsModal:', data);
    // This function is kept for backward compatibility
}

// Function to update the products table
function updateProductsTable(products) {
    const productsTableBody = document.getElementById('products-table-body');
    const emptyRow = document.getElementById('products-empty-row');

    if (!productsTableBody) return;

    // Clear existing rows except empty state rows
    const existingRows = productsTableBody.querySelectorAll('tr:not(#products-empty-row):not(#products-search-empty-row)');
    existingRows.forEach(row => row.remove());

    if (products.length === 0) {
        // Show empty state
        if (emptyRow) emptyRow.style.display = '';
        return;
    }

    // Hide empty state
    if (emptyRow) emptyRow.style.display = 'none';

    // Add product rows
    products.forEach(product => {
        const row = document.createElement('tr');
        row.setAttribute('data-product-id', product.id);

        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.description}</td>
            <td>${product.line}</td>
            <td>${product.qty_per_box}</td>
            <td>${product.qty_per_hour}</td>
            <td style="text-align: center">
                <button class="PM-action-button edit-product" data-id="${product.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="PM-action-button delete-product" data-id="${product.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        productsTableBody.insertBefore(row, productsTableBody.querySelector('#products-search-empty-row'));
    });

    // Set up search functionality
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.value = ''; // Clear any existing search
        searchInput.addEventListener('input', function() {
            filterProducts(this.value);
        });
    }
}

// Function to update the schedules table
function updateSchedulesTable(schedules) {
    const scheduleTableBody = document.getElementById('schedule-table-body');
    const emptyRow = document.getElementById('schedule-empty-row');

    if (!scheduleTableBody) return;

    // Clear existing rows except empty state rows
    const existingRows = scheduleTableBody.querySelectorAll('tr:not(#schedule-empty-row):not(#schedule-filtered-empty-row)');
    existingRows.forEach(row => row.remove());

    if (schedules.length === 0) {
        // Show empty state
        if (emptyRow) emptyRow.style.display = '';
        return;
    }

    // Hide empty state
    if (emptyRow) emptyRow.style.display = 'none';

    // Add schedule rows
    schedules.forEach(schedule => {
        const row = document.createElement('tr');
        row.setAttribute('data-schedule-id', schedule.id);
        row.setAttribute('data-date', schedule.date_planned);
        row.setAttribute('data-shift', schedule.shift);
        row.setAttribute('data-status', schedule.status);

        const date = new Date(schedule.date_planned);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${schedule.product}</td>
            <td>${schedule.line}</td>
            <td>${schedule.shift}</td>
            <td>${schedule.planned_qty}</td>
            <td>${schedule.produced_qty}</td>
            <td>${schedule.balance}</td>
            <td>
                <span class="PM-status-pill ${schedule.status.toLowerCase().replace(' ', '-')}">${schedule.status}</span>
            </td>
            <td>
                <button class="PM-action-button edit-schedule" data-id="${schedule.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="PM-action-button delete-schedule" data-id="${schedule.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        // Apply status pill styles to this row
        const statusPill = row.querySelector('.PM-status-pill');
        if (statusPill) {
            const status = schedule.status.toLowerCase().replace(' ', '-');

            // Set default styles
            statusPill.style.display = 'inline-block';
            statusPill.style.padding = '0.25rem 0.75rem';
            statusPill.style.borderRadius = '50px';
            statusPill.style.fontSize = '0.85rem';
            statusPill.style.fontWeight = '500';
            statusPill.style.textAlign = 'center';

            // Apply status-specific styles
            if (status === 'planned') {
                statusPill.style.backgroundColor = '#E3F2FD';
                statusPill.style.color = '#1976D2';
            } else if (status === 'change-load') {
                statusPill.style.backgroundColor = '#FFF8E1';
                statusPill.style.color = '#FFA000';
            } else if (status === 'backlog') {
                statusPill.style.backgroundColor = '#FFEBEE';
                statusPill.style.color = '#D32F2F';
            }
        }

        scheduleTableBody.insertBefore(row, scheduleTableBody.querySelector('#schedule-filtered-empty-row'));
    });

    // Set up search and filter functionality
    const searchInput = document.getElementById('schedule-search');
    if (searchInput) {
        searchInput.value = ''; // Clear any existing search
    }

    // Reset filters
    const dateFilter = document.getElementById('schedule-date');
    const shiftFilter = document.getElementById('schedule-shift');
    const statusFilter = document.getElementById('schedule-status');

    if (dateFilter) dateFilter.value = '';
    if (shiftFilter) shiftFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';

    // Set up event listeners
    setupScheduleEmptyState();
}

// Function to apply status pill styling
function applyStatusPillStyles() {
    // Apply styles to status pills
    document.querySelectorAll('.PM-status-pill').forEach(pill => {
        const status = pill.textContent.trim().toLowerCase().replace(' ', '-');

        // Set default styles
        pill.style.display = 'inline-block';
        pill.style.padding = '0.25rem 0.75rem';
        pill.style.borderRadius = '50px';
        pill.style.fontSize = '0.85rem';
        pill.style.fontWeight = '500';
        pill.style.textAlign = 'center';

        // Apply status-specific styles
        if (status === 'planned') {
            pill.style.backgroundColor = '#E3F2FD';
            pill.style.color = '#1976D2';
        } else if (status === 'change-load') {
            pill.style.backgroundColor = '#FFF8E1';
            pill.style.color = '#FFA000';
        } else if (status === 'backlog') {
            pill.style.backgroundColor = '#FFEBEE';
            pill.style.color = '#D32F2F';
        }
    });
}

// Initialize everything when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupGroupFilters();
    setupProductsEmptyState();
    setupScheduleEmptyState();
    setupEventListeners();
    initializeAnimations();
    initializeCharts();

    // Apply status pill styles
    applyStatusPillStyles();

    // Also apply status pill styles when group details are loaded
    document.addEventListener('groupDetailsLoaded', function() {
        applyStatusPillStyles();
    });
});
