document.addEventListener('DOMContentLoaded', function() {
    // Check if user is shuttle admin
    const mainContent = document.querySelector('main.main-content');
    const isShuttleAdmin = mainContent?.dataset.shuttleAdmin === 'true';

    const state = {
        shuttleUsers: [],
        vehicles: [],
        providers: [],
        destinations: [],
        destinationGroups: [],
        holidays: [],
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
        searchTerm: '',
        currentVehicleId: null,
        currentProviderId: null,
        currentDestinationId: null,
        currentDestinationGroupId: null,
        currentShuttleUserId: null,
        confirmCallback: null,
        selectedFile: null,
        // Overview state
        overviewData: null,
        overviewChart: null,
        overviewCurrentPage: 1,
        overviewItemsPerPage: 10,
        overviewSearchTerm: '',
        filteredFilings: []
    };

    const elements = {
        tabBtns: document.querySelectorAll('.tab-btn[data-tab]'),
        tabContents: document.querySelectorAll('.tab-content'),
        shuttleAssignmentTbody: document.getElementById('shuttle-assignment-tbody'),
        paginationInfo: document.getElementById('pagination-info'),
        paginationNav: document.getElementById('pagination-nav'),
        vehiclesList: document.getElementById('vehicles-list'),
        providersList: document.getElementById('providers-list'),
        destinationsList: document.getElementById('destinations-list'),
        destinationGroupsList: document.getElementById('destination-groups-list'),
        holidaysList: document.getElementById('holidays-list'),
        vehicleModal: document.getElementById('vehicle-modal-overlay'),
        providerModal: document.getElementById('provider-modal-overlay'),
        destinationModal: document.getElementById('destination-modal-overlay'),
        destinationGroupModal: document.getElementById('destination-group-modal-overlay'),
        holidayModal: document.getElementById('holiday-modal-overlay'),
        shuttleUserModal: document.getElementById('shuttle-user-modal-overlay'),
        importModal: document.getElementById('import-modal-overlay'),
        confirmModal: document.getElementById('admin-confirm-modal-overlay'),
        settingsModal: document.getElementById('settings-modal-overlay'),
        settingsNavItems: document.querySelectorAll('.settings-nav-item'),
        settingsPanels: document.querySelectorAll('.settings-panel'),
        toastContainer: document.getElementById('toast-container'),
        // Overview elements
        overviewFilingType: document.getElementById('overview-filing-type'),
        overviewDate: document.getElementById('overview-date'),
        overviewTbody: document.getElementById('overview-tbody'),
        statusChart: document.getElementById('status-chart'),
        vehicleRequirements: document.getElementById('vehicle-requirements'),
        // Collapsible vehicle requirements
        vehiclesSectionToggle: document.getElementById('vehicles-section-toggle'),
        vehicleRequirementsWrapper: document.getElementById('vehicle-requirements-wrapper'),
        // Shift summary elements
        shiftSummarySection: document.getElementById('shift-summary-section'),
        dayshiftNotOTVehicles: document.getElementById('dayshift-notot-vehicles'),
        dayshiftOTVehicles: document.getElementById('dayshift-ot-vehicles'),
        dayshiftProviderBreakdown: document.getElementById('dayshift-provider-breakdown'),
        nightshiftNotOTVehicles: document.getElementById('nightshift-notot-vehicles'),
        nightshiftOTVehicles: document.getElementById('nightshift-ot-vehicles'),
        nightshiftProviderBreakdown: document.getElementById('nightshift-provider-breakdown'),
        // Export shift modal
        exportShiftModal: document.getElementById('export-shift-modal-overlay')
    };

    // ============================================
    // Toast Notification System
    // ============================================
    function showToast(message, type = 'info') {
        const container = elements.toastContainer;
        if (!container) {
            console.log(`${type}: ${message}`);
            return;
        }

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${icons[type]} toast-icon"></i>
                <span>${message}</span>
            </div>
            <button class="close-btn" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 4000);
    }

    // ============================================
    // Shuttle Users (Main Table Data)
    // ============================================
    async function fetchShuttleUsers() {
        try {
            const response = await fetch(`/overtime/api/shuttle-users/?search=${encodeURIComponent(state.searchTerm)}&page=${state.currentPage}&per_page=${state.itemsPerPage}`);
            const data = await response.json();
            if (data.success) {
                state.shuttleUsers = data.data;
                state.totalItems = data.total;
                state.totalPages = data.total_pages;
                renderShuttleUsers();
                renderPagination();
            } else {
                showToast(data.error || 'Failed to load shuttle users', 'error');
                renderEmptyState('No shuttle users found');
            }
        } catch (error) {
            console.error('Failed to load shuttle users:', error);
            showToast('Failed to load shuttle users', 'error');
            renderEmptyState('Failed to load data');
        }
    }

    function renderShuttleUsers() {
        const tbody = elements.shuttleAssignmentTbody;
        if (!tbody) {
            console.error('Shuttle assignment tbody not found');
            return;
        }
        
        if (state.shuttleUsers.length === 0) {
            renderEmptyState('No shuttle users found. Add users manually or import from Excel.');
            return;
        }

        tbody.innerHTML = state.shuttleUsers.map(user => `
            <tr>
                <td>${user.employee_id}</td>
                <td>
                    ${user.employee_name}
                    ${user.with_vehicle ? '<span class="with-vehicle-badge"><i class="fas fa-car"></i> With Vehicle</span>' : ''}
                </td>
                <td>${user.line_name || '-'}</td>
                <td>${user.department || '-'}</td>
                <td>${user.destination ? user.destination.name : '<span class="text-muted">Not assigned</span>'}</td>
                <td>
                    ${user.groups && user.groups.length > 0 
                        ? `<div class="subordinate-badges">${user.groups.map(g => `<span class="subordinate-badge" title="${g.supervisor}">${g.group_name}</span>`).join('')}</div>`
                        : '<span class="text-muted">-</span>'
                    }
                </td>
                <td style="text-align: center;">
                    <div class="action-buttons">
                        <button class="btn btn-icon edit-shuttle-user-btn" data-id="${user.id}" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-icon btn-error delete-shuttle-user-btn" data-id="${user.id}" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Attach event listeners with permission check
        tbody.querySelectorAll('.edit-shuttle-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!isShuttleAdmin) {
                    showToast('You do not have permission to edit shuttle assignments. Only Shuttle Admins can modify employees.', 'error');
                    return;
                }
                openShuttleUserModal(parseInt(btn.dataset.id));
            });
        });

        tbody.querySelectorAll('.delete-shuttle-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!isShuttleAdmin) {
                    showToast('You do not have permission to delete shuttle assignments. Only Shuttle Admins can modify employees.', 'error');
                    return;
                }
                confirmDelete('shuttle-user', parseInt(btn.dataset.id));
            });
        });
    }

    function renderEmptyState(message) {
        const tbody = elements.shuttleAssignmentTbody;
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fa-solid fa-users"></i>
                        <h5>${message}</h5>
                        <p>Click "Add Shuttle" or "Import" to add shuttle users</p>
                    </div>
                </td>
            </tr>
        `;
    }

    function renderPagination() {
        const info = elements.paginationInfo;
        const nav = elements.paginationNav;
        const paginationContainer = document.getElementById('shuttle-pagination');
        
        const start = state.totalItems === 0 ? 0 : (state.currentPage - 1) * state.itemsPerPage + 1;
        const end = Math.min(state.currentPage * state.itemsPerPage, state.totalItems);
        
        // Hide entire pagination container if only 1 page or less
        if (state.totalPages <= 1) {
            if (nav) nav.innerHTML = '';
            if (paginationContainer) {
                paginationContainer.style.display = 'none';
            }
            return;
        }
        
        // Show pagination container when more than 1 page
        if (paginationContainer) {
            paginationContainer.style.display = 'flex';
        }
        
        if (info) {
            info.textContent = `Showing ${start} to ${end} of ${state.totalItems} entries`;
        }
        
        if (!nav) return;

        let html = '';
        
        // Previous button
        html += `<button class="JO-pagination-btn ${state.currentPage === 1 ? 'disabled' : ''}" 
                    ${state.currentPage === 1 ? 'disabled' : ''} data-page="${state.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i> Previous
                </button>`;
        
        // Page numbers
        html += '<div class="JO-pagination-pages">';
        for (let i = 1; i <= state.totalPages; i++) {
            if (i === 1 || i === state.totalPages || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
                html += `<button class="JO-pagination-page ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
                html += '<span class="JO-pagination-ellipsis">...</span>';
            }
        }
        html += '</div>';
        
        // Next button
        html += `<button class="JO-pagination-btn ${state.currentPage === state.totalPages ? 'disabled' : ''}" 
                    ${state.currentPage === state.totalPages ? 'disabled' : ''} data-page="${state.currentPage + 1}">
                    Next <i class="fas fa-chevron-right"></i>
                </button>`;
        
        nav.innerHTML = html;
        
        // Add click handlers
        nav.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page >= 1 && page <= state.totalPages) {
                    state.currentPage = page;
                    fetchShuttleUsers();
                }
            });
        });
    }

    // ============================================
    // Shuttle User Modal (Add/Edit)
    // ============================================
    async function openShuttleUserModal(userId = null) {
        state.currentShuttleUserId = userId;
        const modal = elements.shuttleUserModal;
        if (!modal) return;
        
        const title = document.getElementById('shuttle-user-modal-title');
        const employeeIdInput = document.getElementById('shuttle-user-employee-id');
        const employeeNameInput = document.getElementById('shuttle-user-employee-name');
        const lineInput = document.getElementById('shuttle-user-line');
        const departmentInput = document.getElementById('shuttle-user-department');
        const destinationSelect = document.getElementById('shuttle-user-destination');
        const withVehicleToggle = document.getElementById('shuttle-user-with-vehicle');
        const withVehicleLabel = document.getElementById('with-vehicle-label');
        
        // Reset form
        if (employeeIdInput) employeeIdInput.value = '';
        if (employeeNameInput) employeeNameInput.value = '';
        if (lineInput) lineInput.value = '';
        if (departmentInput) departmentInput.value = '';
        if (withVehicleToggle) {
            withVehicleToggle.checked = false;
            if (withVehicleLabel) withVehicleLabel.textContent = 'No';
        }
        
        // Set title
        if (title) title.textContent = userId ? 'Edit Shuttle User' : 'Add Shuttle User';
        
        // Load destinations for dropdown
        try {
            const response = await fetch('/overtime/api/destinations/');
            const data = await response.json();
            if (data.success && destinationSelect) {
                destinationSelect.innerHTML = '<option value="">Select Destination</option>';
                data.data.forEach(dest => {
                    const option = document.createElement('option');
                    option.value = dest.id;
                    option.textContent = dest.name;
                    destinationSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load destinations:', error);
        }
        
        // Load user data if editing
        if (userId) {
            const user = state.shuttleUsers.find(u => u.id === userId);
            if (user) {
                if (employeeIdInput) employeeIdInput.value = user.employee_id;
                if (employeeNameInput) employeeNameInput.value = user.employee_name;
                if (lineInput) lineInput.value = user.line_name || '';
                if (departmentInput) departmentInput.value = user.department || '';
                if (destinationSelect && user.destination) {
                    destinationSelect.value = user.destination.id;
                }
                if (withVehicleToggle) {
                    withVehicleToggle.checked = user.with_vehicle || false;
                    if (withVehicleLabel) withVehicleLabel.textContent = user.with_vehicle ? 'Yes' : 'No';
                }
            }
        }
        
        modal.classList.add('active');
    }

    async function saveShuttleUser() {
        const employeeId = document.getElementById('shuttle-user-employee-id')?.value.trim();
        const employeeName = document.getElementById('shuttle-user-employee-name')?.value.trim();
        const lineName = document.getElementById('shuttle-user-line')?.value.trim();
        const department = document.getElementById('shuttle-user-department')?.value.trim();
        const destinationId = document.getElementById('shuttle-user-destination')?.value;
        const withVehicle = document.getElementById('shuttle-user-with-vehicle')?.checked || false;
        
        if (!employeeId || !employeeName) {
            showToast('Employee ID and Name are required', 'error');
            return;
        }
        
        const data = {
            employee_id: employeeId,
            employee_name: employeeName,
            line_name: lineName || null,
            department: department || null,
            destination_id: destinationId || null,
            with_vehicle: withVehicle
        };
        
        try {
            let response;
            if (state.currentShuttleUserId) {
                response = await fetch(`/overtime/api/shuttle-users/${state.currentShuttleUserId}/update/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch('/overtime/api/shuttle-users/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify(data)
                });
            }
            
            const result = await response.json();
            if (result.success) {
                showToast(`Shuttle user ${state.currentShuttleUserId ? 'updated' : 'added'} successfully`, 'success');
                closeModal(elements.shuttleUserModal);
                fetchShuttleUsers();
            } else {
                showToast(result.error || 'Failed to save shuttle user', 'error');
            }
        } catch (error) {
            console.error('Save shuttle user error:', error);
            showToast('Failed to save shuttle user', 'error');
        }
    }

    // ============================================
    // Import Modal Functions
    // ============================================
    function openImportModal() {
        const modal = elements.importModal;
        if (!modal) return;
        
        // Reset state
        state.selectedFile = null;
        const fileInput = document.getElementById('import-file-input');
        const selectedFileDiv = document.getElementById('selected-file');
        const uploadBtn = document.getElementById('upload-import-btn');
        const progressDiv = document.getElementById('import-progress');
        
        if (fileInput) fileInput.value = '';
        if (selectedFileDiv) selectedFileDiv.style.display = 'none';
        if (uploadBtn) uploadBtn.disabled = true;
        if (progressDiv) progressDiv.style.display = 'none';
        
        modal.classList.add('active');
    }

    function handleFileSelect(file) {
        if (!file) return;
        
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            showToast('Please select an Excel file (.xlsx or .xls)', 'error');
            return;
        }
        
        state.selectedFile = file;
        const selectedFileDiv = document.getElementById('selected-file');
        const selectedFileName = document.getElementById('selected-file-name');
        const uploadBtn = document.getElementById('upload-import-btn');
        
        if (selectedFileDiv) selectedFileDiv.style.display = 'flex';
        if (selectedFileName) selectedFileName.textContent = file.name;
        if (uploadBtn) uploadBtn.disabled = false;
    }

    async function uploadAndImport() {
        if (!state.selectedFile) {
            showToast('Please select a file first', 'error');
            return;
        }
        
        const progressDiv = document.getElementById('import-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const uploadBtn = document.getElementById('upload-import-btn');
        
        if (progressDiv) progressDiv.style.display = 'block';
        if (progressFill) progressFill.style.width = '30%';
        if (progressText) progressText.textContent = 'Uploading file...';
        if (uploadBtn) uploadBtn.disabled = true;
        
        const formData = new FormData();
        formData.append('file', state.selectedFile);
        
        try {
            if (progressFill) progressFill.style.width = '60%';
            if (progressText) progressText.textContent = 'Processing data...';
            
            const response = await fetch('/overtime/api/shuttle-users/import/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (progressFill) progressFill.style.width = '100%';
            
            if (result.success) {
                if (progressText) progressText.textContent = 'Import complete!';
                
                let message = `Imported: ${result.imported}, Updated: ${result.updated}`;
                if (result.error_count > 0) {
                    message += `, Errors: ${result.error_count}`;
                    showToast(message, 'warning');
                    
                    // Download error file if there are errors
                    if (result.error_file) {
                        downloadErrorFile(result.error_file);
                    }
                } else {
                    showToast(message, 'success');
                }
                
                setTimeout(() => {
                    closeModal(elements.importModal);
                    fetchShuttleUsers();
                }, 1000);
            } else {
                if (progressText) progressText.textContent = 'Import failed';
                showToast(result.error || 'Failed to import file', 'error');
                if (uploadBtn) uploadBtn.disabled = false;
            }
        } catch (error) {
            console.error('Import error:', error);
            if (progressText) progressText.textContent = 'Import failed';
            showToast('Failed to import file', 'error');
            if (uploadBtn) uploadBtn.disabled = false;
        }
    }

    function downloadErrorFile(base64Data) {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'import_errors.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadTemplate() {
        window.location.href = '/overtime/api/shuttle-users/template/';
    }
    
    function exportShuttleUsers() {
        window.location.href = '/overtime/api/export-shuttle-users/';
    }

    // ============================================
    // Settings Data Fetch Functions
    // ============================================
    async function fetchVehicles() {
        try {
            const response = await fetch('/overtime/api/shuttle-vehicles/');
            const data = await response.json();
            if (data.success) {
                state.vehicles = data.data;
                renderVehicles();
            }
        } catch (error) {
            showToast('Failed to load vehicles', 'error');
        }
    }

    async function fetchProviders() {
        try {
            const response = await fetch('/overtime/api/shuttle-providers/');
            const data = await response.json();
            if (data.success) {
                state.providers = data.data;
                renderProviders();
            }
        } catch (error) {
            showToast('Failed to load providers', 'error');
        }
    }

    async function fetchDestinations() {
        try {
            const response = await fetch('/overtime/api/destinations/');
            const data = await response.json();
            if (data.success) {
                state.destinations = data.data;
                renderDestinations();
            }
        } catch (error) {
            showToast('Failed to load destinations', 'error');
        }
    }

    async function fetchDestinationGroups() {
        try {
            const response = await fetch('/overtime/api/destination-groups/');
            const data = await response.json();
            if (data.success) {
                state.destinationGroups = data.data;
                renderDestinationGroups();
            }
        } catch (error) {
            showToast('Failed to load destination groups', 'error');
        }
    }

    async function fetchHolidays() {
        try {
            const response = await fetch('/overtime/api/holidays/');
            const data = await response.json();
            if (data.success) {
                state.holidays = data.data;
                renderHolidays();
            }
        } catch (error) {
            showToast('Failed to load holidays', 'error');
        }
    }

    async function fetchPasscode() {
        try {
            const response = await fetch('/overtime/api/passcode/');
            const data = await response.json();
            if (data.success && data.data) {
                document.getElementById('current-passcode').textContent = data.data.passcode;
            }
        } catch (error) {
            console.error('Failed to load passcode');
        }
    }

    function renderVehicles() {
        if (state.vehicles.length === 0) {
            elements.vehiclesList.innerHTML = `
                <div class="settings-list-empty">
                    <i class="fa-solid fa-bus"></i>
                    <h5>No vehicles configured</h5>
                    <p>Add shuttle vehicles to manage transportation</p>
                </div>
            `;
            return;
        }

        elements.vehiclesList.innerHTML = state.vehicles.map(vehicle => `
            <div class="settings-list-item" data-id="${vehicle.id}">
                <div class="settings-list-item-info">
                    <div class="settings-list-item-name">${vehicle.name}</div>
                    <div class="settings-list-item-meta">${vehicle.capacity} seats capacity</div>
                </div>
                <div class="settings-list-item-actions">
                    <button class="btn-icon edit-vehicle" data-id="${vehicle.id}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete delete-vehicle" data-id="${vehicle.id}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        elements.vehiclesList.querySelectorAll('.edit-vehicle').forEach(btn => {
            btn.addEventListener('click', () => openVehicleModal(parseInt(btn.dataset.id)));
        });

        elements.vehiclesList.querySelectorAll('.delete-vehicle').forEach(btn => {
            btn.addEventListener('click', () => confirmDelete('vehicle', parseInt(btn.dataset.id)));
        });
    }

    function renderProviders() {
        if (state.providers.length === 0) {
            elements.providersList.innerHTML = `
                <div class="settings-list-empty">
                    <i class="fa-solid fa-building"></i>
                    <h5>No providers configured</h5>
                    <p>Add shuttle service providers</p>
                </div>
            `;
            return;
        }

        elements.providersList.innerHTML = state.providers.map(provider => `
            <div class="settings-list-item" data-id="${provider.id}">
                <div class="settings-list-item-info">
                    <div class="settings-list-item-name">${provider.name}</div>
                    <div class="settings-list-item-meta">
                        ${provider.contact_person ? `<i class="fa-solid fa-user"></i> ${provider.contact_person}` : ''}
                        ${provider.contact_number ? `<i class="fa-solid fa-phone"></i> ${provider.contact_number}` : ''}
                    </div>
                </div>
                <div class="settings-list-item-actions">
                    <button class="btn-icon edit-provider" data-id="${provider.id}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete delete-provider" data-id="${provider.id}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        elements.providersList.querySelectorAll('.edit-provider').forEach(btn => {
            btn.addEventListener('click', () => openProviderModal(parseInt(btn.dataset.id)));
        });

        elements.providersList.querySelectorAll('.delete-provider').forEach(btn => {
            btn.addEventListener('click', () => confirmDelete('provider', parseInt(btn.dataset.id)));
        });
    }

    function renderDestinations() {
        if (state.destinations.length === 0) {
            elements.destinationsList.innerHTML = `
                <div class="settings-list-empty">
                    <i class="fa-solid fa-location-dot"></i>
                    <h5>No destinations configured</h5>
                    <p>Add destination locations for shuttle routes</p>
                </div>
            `;
            return;
        }

        elements.destinationsList.innerHTML = state.destinations.map(dest => `
            <div class="settings-list-item" data-id="${dest.id}">
                <div class="settings-list-item-info">
                    <div class="settings-list-item-name">${dest.name}</div>
                </div>
                <div class="settings-list-item-actions">
                    <button class="btn-icon edit-destination" data-id="${dest.id}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete delete-destination" data-id="${dest.id}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        elements.destinationsList.querySelectorAll('.edit-destination').forEach(btn => {
            btn.addEventListener('click', () => openDestinationModal(parseInt(btn.dataset.id)));
        });

        elements.destinationsList.querySelectorAll('.delete-destination').forEach(btn => {
            btn.addEventListener('click', () => confirmDelete('destination', parseInt(btn.dataset.id)));
        });
    }

    function renderDestinationGroups() {
        if (state.destinationGroups.length === 0) {
            elements.destinationGroupsList.innerHTML = `
                <div class="settings-list-empty">
                    <i class="fa-solid fa-layer-group"></i>
                    <h5>No destination groups configured</h5>
                    <p>Create groups that combine a vehicle with multiple destinations</p>
                </div>
            `;
            return;
        }

        elements.destinationGroupsList.innerHTML = state.destinationGroups.map(group => `
            <div class="settings-list-item" data-id="${group.id}">
                <div class="settings-list-item-info">
                    <div class="settings-list-item-name">${group.name}</div>
                    <div class="settings-list-item-meta">
                        ${group.shuttle_provider ? `<i class="fa-solid fa-building"></i> ${group.shuttle_provider.name}` : ''}
                        ${group.shuttle_vehicle ? `<i class="fa-solid fa-bus"></i> ${group.shuttle_vehicle.name} (${group.shuttle_vehicle.capacity} seats)` : 'No vehicle assigned'}
                    </div>
                    ${group.destinations && group.destinations.length > 0 ? `
                        <div class="destination-tags">
                            ${group.destinations.map(d => `<span class="destination-tag">${d.name}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="settings-list-item-actions">
                    <button class="btn-icon edit-destination-group" data-id="${group.id}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete delete-destination-group" data-id="${group.id}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        elements.destinationGroupsList.querySelectorAll('.edit-destination-group').forEach(btn => {
            btn.addEventListener('click', () => openDestinationGroupModal(parseInt(btn.dataset.id)));
        });

        elements.destinationGroupsList.querySelectorAll('.delete-destination-group').forEach(btn => {
            btn.addEventListener('click', () => confirmDelete('destination-group', parseInt(btn.dataset.id)));
        });
    }

    function renderHolidays() {
        if (state.holidays.length === 0) {
            elements.holidaysList.innerHTML = `
                <div class="settings-list-empty">
                    <i class="fa-solid fa-calendar-xmark"></i>
                    <h5>No holidays configured</h5>
                    <p>Add holidays to manage holiday overtime filing</p>
                </div>
            `;
            return;
        }

        elements.holidaysList.innerHTML = state.holidays.map(holiday => `
            <div class="settings-list-item" data-id="${holiday.id}">
                <div class="settings-list-item-info">
                    <div class="settings-list-item-name">${holiday.name}</div>
                    <div class="settings-list-item-meta">${formatDate(holiday.date)}</div>
                </div>
                <div class="settings-list-item-actions">
                    <button class="btn-icon delete delete-holiday" data-id="${holiday.id}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        elements.holidaysList.querySelectorAll('.delete-holiday').forEach(btn => {
            btn.addEventListener('click', () => confirmDelete('holiday', parseInt(btn.dataset.id)));
        });
    }

    function openVehicleModal(vehicleId = null) {
        state.currentVehicleId = vehicleId;
        const modal = elements.vehicleModal;
        const title = document.getElementById('vehicle-modal-title');
        const nameInput = document.getElementById('vehicle-name');
        const capacityInput = document.getElementById('vehicle-capacity');

        if (vehicleId) {
            const vehicle = state.vehicles.find(v => v.id === vehicleId);
            title.textContent = 'Edit Vehicle';
            nameInput.value = vehicle.name;
            capacityInput.value = vehicle.capacity;
        } else {
            title.textContent = 'Add Vehicle';
            nameInput.value = '';
            capacityInput.value = '13';
        }

        modal.classList.add('active');
    }

    async function saveVehicle() {
        const name = document.getElementById('vehicle-name').value.trim();
        const capacity = parseInt(document.getElementById('vehicle-capacity').value);

        if (!name || !capacity) {
            showToast('Please fill in all fields', 'warning');
            return;
        }

        try {
            const url = state.currentVehicleId
                ? `/overtime/api/shuttle-vehicles/${state.currentVehicleId}/update/`
                : '/overtime/api/shuttle-vehicles/create/';
            const method = state.currentVehicleId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ name, capacity, is_active: true })
            });

            const data = await response.json();
            if (data.success) {
                showToast(`Vehicle ${state.currentVehicleId ? 'updated' : 'created'} successfully`, 'success');
                closeModal(elements.vehicleModal);
                fetchVehicles();
            } else {
                // Extract first error message from form errors
                let errorMsg = 'Failed to save vehicle';
                if (data.errors) {
                    const firstError = Object.values(data.errors)[0];
                    errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
                } else if (data.error) {
                    errorMsg = data.error;
                }
                showToast(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Save vehicle error:', error);
            showToast('Failed to save vehicle', 'error');
        }
    }

    function openProviderModal(providerId = null) {
        state.currentProviderId = providerId;
        const modal = elements.providerModal;
        const title = document.getElementById('provider-modal-title');
        const nameInput = document.getElementById('provider-name');
        const contactPersonInput = document.getElementById('provider-contact-person');
        const contactNumberInput = document.getElementById('provider-contact-number');

        if (providerId) {
            const provider = state.providers.find(p => p.id === providerId);
            title.textContent = 'Edit Shuttle Provider';
            nameInput.value = provider.name;
            contactPersonInput.value = provider.contact_person || '';
            contactNumberInput.value = provider.contact_number || '';
        } else {
            title.textContent = 'Add Shuttle Provider';
            nameInput.value = '';
            contactPersonInput.value = '';
            contactNumberInput.value = '';
        }

        modal.classList.add('active');
    }

    async function saveProvider() {
        const name = document.getElementById('provider-name').value.trim();
        const contactPerson = document.getElementById('provider-contact-person').value.trim();
        const contactNumber = document.getElementById('provider-contact-number').value.trim();

        if (!name) {
            showToast('Please enter provider name', 'warning');
            return;
        }

        try {
            const url = state.currentProviderId
                ? `/overtime/api/shuttle-providers/${state.currentProviderId}/update/`
                : '/overtime/api/shuttle-providers/create/';
            const method = state.currentProviderId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ 
                    name, 
                    contact_person: contactPerson || null,
                    contact_number: contactNumber || null,
                    is_active: true 
                })
            });

            const data = await response.json();
            if (data.success) {
                showToast(`Provider ${state.currentProviderId ? 'updated' : 'created'} successfully`, 'success');
                closeModal(elements.providerModal);
                fetchProviders();
            } else {
                let errorMsg = 'Failed to save provider';
                if (data.errors) {
                    const firstError = Object.values(data.errors)[0];
                    errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
                } else if (data.error) {
                    errorMsg = data.error;
                }
                showToast(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Save provider error:', error);
            showToast('Failed to save provider', 'error');
        }
    }

    function openDestinationModal(destId = null) {
        state.currentDestinationId = destId;
        const modal = elements.destinationModal;
        const title = document.getElementById('destination-modal-title');
        const nameInput = document.getElementById('destination-name');

        if (destId) {
            const dest = state.destinations.find(d => d.id === destId);
            title.textContent = 'Edit Destination';
            nameInput.value = dest.name;
        } else {
            title.textContent = 'Add Destination';
            nameInput.value = '';
        }

        modal.classList.add('active');
    }

    async function saveDestination() {
        const name = document.getElementById('destination-name').value.trim();

        if (!name) {
            showToast('Please enter destination name', 'warning');
            return;
        }

        try {
            const url = state.currentDestinationId
                ? `/overtime/api/destinations/${state.currentDestinationId}/update/`
                : '/overtime/api/destinations/create/';
            const method = state.currentDestinationId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ name, is_active: true })
            });

            const data = await response.json();
            if (data.success) {
                showToast(`Destination ${state.currentDestinationId ? 'updated' : 'created'} successfully`, 'success');
                closeModal(elements.destinationModal);
                fetchDestinations();
            } else {
                let errorMsg = 'Failed to save destination';
                if (data.errors) {
                    const firstError = Object.values(data.errors)[0];
                    errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
                } else if (data.error) {
                    errorMsg = data.error;
                }
                showToast(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Save destination error:', error);
            showToast('Failed to save destination', 'error');
        }
    }

    async function openDestinationGroupModal(groupId = null) {
        state.currentDestinationGroupId = groupId;
        const modal = elements.destinationGroupModal;
        const title = document.getElementById('destination-group-modal-title');
        const nameInput = document.getElementById('destination-group-name');
        const providerSelect = document.getElementById('destination-group-provider');
        const vehicleSelect = document.getElementById('destination-group-vehicle');
        const destinationsContainer = document.getElementById('destination-group-destinations');

        // Show loading state
        destinationsContainer.innerHTML = `
            <div class="settings-list-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Loading destinations...</span>
            </div>
        `;

        // Populate providers dropdown
        providerSelect.innerHTML = '<option value="">Select a provider</option>' +
            state.providers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

        // Populate vehicles dropdown
        vehicleSelect.innerHTML = '<option value="">Select a vehicle</option>' +
            state.vehicles.map(v => `<option value="${v.id}">${v.name} (${v.capacity} seats)</option>`).join('');

        // Fetch available destinations (excludes those assigned to other groups)
        try {
            const url = groupId 
                ? `/overtime/api/destinations/available/?group_id=${groupId}`
                : '/overtime/api/destinations/available/';
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                const availableDestinations = data.data;
                
                if (availableDestinations.length === 0) {
                    destinationsContainer.innerHTML = `
                        <div class="checkbox-list-empty">
                            No destinations available. All destinations are assigned to other groups.
                        </div>
                    `;
                } else {
                    destinationsContainer.innerHTML = availableDestinations.map(d => `
                        <div class="checkbox-item">
                            <input type="checkbox" id="dest-${d.id}" name="destinations" value="${d.id}">
                            <label for="dest-${d.id}">${d.name}</label>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Failed to fetch available destinations:', error);
            destinationsContainer.innerHTML = `
                <div class="checkbox-list-empty">
                    Failed to load destinations. Please try again.
                </div>
            `;
        }

        if (groupId) {
            const group = state.destinationGroups.find(g => g.id === groupId);
            title.textContent = 'Edit Destination Group';
            nameInput.value = group.name;
            providerSelect.value = group.shuttle_provider ? group.shuttle_provider.id : '';
            vehicleSelect.value = group.shuttle_vehicle ? group.shuttle_vehicle.id : '';
            // Check the destinations that belong to this group
            if (group.destinations) {
                group.destinations.forEach(d => {
                    const checkbox = document.getElementById(`dest-${d.id}`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        } else {
            title.textContent = 'Add Destination Group';
            nameInput.value = '';
            providerSelect.value = '';
            vehicleSelect.value = '';
        }

        modal.classList.add('active');
    }

    async function saveDestinationGroup() {
        const name = document.getElementById('destination-group-name').value.trim();
        const providerId = document.getElementById('destination-group-provider').value;
        const vehicleId = document.getElementById('destination-group-vehicle').value;
        const checkedDestinations = document.querySelectorAll('#destination-group-destinations input[name="destinations"]:checked');
        const destinationIds = Array.from(checkedDestinations).map(cb => parseInt(cb.value));

        if (!name) {
            showToast('Please enter group name', 'warning');
            return;
        }

        if (!providerId) {
            showToast('Please select a shuttle provider', 'warning');
            return;
        }

        if (!vehicleId) {
            showToast('Please select a shuttle vehicle', 'warning');
            return;
        }

        if (destinationIds.length === 0) {
            showToast('Please select at least one destination', 'warning');
            return;
        }

        try {
            const url = state.currentDestinationGroupId
                ? `/overtime/api/destination-groups/${state.currentDestinationGroupId}/update/`
                : '/overtime/api/destination-groups/create/';
            const method = state.currentDestinationGroupId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    name,
                    shuttle_provider: providerId,
                    shuttle_vehicle: vehicleId,
                    destination_ids: destinationIds,
                    is_active: true
                })
            });

            const data = await response.json();
            if (data.success) {
                showToast(`Destination group ${state.currentDestinationGroupId ? 'updated' : 'created'} successfully`, 'success');
                closeModal(elements.destinationGroupModal);
                fetchDestinationGroups();
            } else {
                let errorMsg = 'Failed to save destination group';
                if (data.errors) {
                    const firstError = Object.values(data.errors)[0];
                    errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
                } else if (data.error) {
                    errorMsg = data.error;
                }
                showToast(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Save destination group error:', error);
            showToast('Failed to save destination group', 'error');
        }
    }

    function openHolidayModal() {
        const modal = elements.holidayModal;
        document.getElementById('holiday-name').value = '';
        document.getElementById('holiday-date').value = '';
        modal.classList.add('active');
    }

    async function saveHoliday() {
        const name = document.getElementById('holiday-name').value.trim();
        const date = document.getElementById('holiday-date').value;

        if (!name || !date) {
            showToast('Please fill in all fields', 'warning');
            return;
        }

        try {
            const response = await fetch('/overtime/api/holidays/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ name, date, is_active: true })
            });

            const data = await response.json();
            if (data.success) {
                showToast('Holiday added successfully', 'success');
                closeModal(elements.holidayModal);
                fetchHolidays();
            } else {
                showToast(data.errors?.date?.[0] || 'Failed to add holiday', 'error');
            }
        } catch (error) {
            showToast('Failed to add holiday', 'error');
        }
    }

    function confirmDelete(type, id) {
        const modal = elements.confirmModal;
        const titles = {
            'shuttle-user': 'Delete Shuttle User',
            vehicle: 'Delete Vehicle',
            provider: 'Delete Shuttle Provider',
            destination: 'Delete Destination',
            'destination-group': 'Delete Destination Group',
            holiday: 'Delete Holiday'
        };
        const messages = {
            'shuttle-user': 'Are you sure you want to delete this shuttle user?',
            vehicle: 'Are you sure you want to delete this shuttle vehicle?',
            provider: 'Are you sure you want to delete this shuttle provider?',
            destination: 'Are you sure you want to delete this destination?',
            'destination-group': 'Are you sure you want to delete this destination group?',
            holiday: 'Are you sure you want to delete this holiday?'
        };

        document.getElementById('admin-confirm-title').textContent = titles[type];
        document.getElementById('admin-confirm-message').textContent = messages[type];

        state.confirmCallback = async () => {
            try {
                let url;
                if (type === 'shuttle-user') url = `/overtime/api/shuttle-users/${id}/delete/`;
                else if (type === 'vehicle') url = `/overtime/api/shuttle-vehicles/${id}/delete/`;
                else if (type === 'provider') url = `/overtime/api/shuttle-providers/${id}/delete/`;
                else if (type === 'destination') url = `/overtime/api/destinations/${id}/delete/`;
                else if (type === 'destination-group') url = `/overtime/api/destination-groups/${id}/delete/`;
                else if (type === 'holiday') url = `/overtime/api/holidays/${id}/delete/`;

                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': getCSRFToken() }
                });

                const data = await response.json();
                if (data.success) {
                    showToast('Deleted successfully', 'success');
                    closeModal(modal);
                    if (type === 'shuttle-user') fetchShuttleUsers();
                    else if (type === 'vehicle') fetchVehicles();
                    else if (type === 'provider') fetchProviders();
                    else if (type === 'destination') fetchDestinations();
                    else if (type === 'destination-group') fetchDestinationGroups();
                    else if (type === 'holiday') fetchHolidays();
                }
            } catch (error) {
                showToast('Failed to delete', 'error');
            }
        };

        modal.classList.add('active');
    }



    async function loadWeeks() {
        const year = document.getElementById('export-year').value;
        try {
            const response = await fetch(`/overtime/api/weeks/?year=${year}`);
            const data = await response.json();
            if (data.success) {
                const select = document.getElementById('export-week');
                select.innerHTML = data.data.map(w => 
                    `<option value="${w.week_number}">${w.display}</option>`
                ).join('');
            }
        } catch (error) {
            console.error('Failed to load weeks');
        }
    }

    function exportOvertime() {
        const exportType = document.getElementById('export-type').value;
        let url = '/overtime/api/export/?export_type=' + exportType;

        if (exportType === 'shifting') {
            const week = document.getElementById('export-week').value;
            const year = document.getElementById('export-year').value;
            url += `&week=${week}&year=${year}`;
        } else {
            const date = document.getElementById('export-date').value;
            if (!date) {
                showToast('Please select a date', 'warning');
                return;
            }
            url += `&date=${date}`;
        }

        window.location.href = url;
    }

    function closeModal(modal) {
        // Add closing class for zoom out animation
        modal.classList.add('closing');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            modal.classList.remove('active');
            modal.classList.remove('closing');
        }, 250); // Match the CSS transition duration
    }

    function openSettingsModal() {
        elements.settingsModal.classList.add('active');
        // Load vehicles data by default (first tab)
        fetchVehicles();
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    // ============================================
    // Overview Tab Functions
    // ============================================
    
    function initOverview() {
        // Set default date to today (using local timezone)
        const now = new Date();
        const today = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0');
        if (elements.overviewDate) {
            elements.overviewDate.value = today;
        }
        
        // Set default filing type to 'daily' if not already set
        if (elements.overviewFilingType && !elements.overviewFilingType.value) {
            elements.overviewFilingType.value = 'daily';
        }
        
        // Initialize collapsible vehicle requirements (default collapsed)
        initVehicleRequirementsCollapse();
        
        // Initialize export shift modal
        initExportShiftModal();
        
        // Initial load with default filters
        fetchOverviewData();
    }
    
    function initVehicleRequirementsCollapse() {
        const toggle = elements.vehiclesSectionToggle;
        const wrapper = elements.vehicleRequirementsWrapper;
        
        if (toggle && wrapper) {
            toggle.addEventListener('click', () => {
                wrapper.classList.toggle('collapsed');
                const icon = toggle.querySelector('.collapse-toggle-btn i');
                if (icon) {
                    if (wrapper.classList.contains('collapsed')) {
                        icon.style.transform = 'rotate(-90deg)';
                    } else {
                        icon.style.transform = 'rotate(0deg)';
                    }
                }
            });
        }
    }
    
    function initExportShiftModal() {
        const modal = elements.exportShiftModal;
        if (!modal) return;
        
        // Close button
        const closeBtn = document.getElementById('close-export-shift-modal');
        const cancelBtn = document.getElementById('cancel-export-shift-modal');
        const confirmBtn = document.getElementById('confirm-export-shift-btn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal));
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeModal(modal));
        }
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const selectedShift = document.querySelector('input[name="export-shift"]:checked')?.value || 'day';
                const date = elements.overviewDate?.value || new Date().toISOString().split('T')[0];
                const filingType = modal.dataset.filingType || 'daily';
                
                // Export with shift parameter
                window.location.href = `/overtime/api/export-overview/?filing_type=${filingType}&date=${date}&shift=${selectedShift}`;
                closeModal(modal);
            });
        }
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    }
    
    function exportOverviewData() {
        const filingType = elements.overviewFilingType?.value || 'daily';
        const date = elements.overviewDate?.value || new Date().toISOString().split('T')[0];
        
        // For daily and shifting filing types, show shift selection modal
        if (filingType === 'daily' || filingType === 'shifting') {
            const modal = elements.exportShiftModal;
            if (modal) {
                // Store the filing type for use in the confirm handler
                modal.dataset.filingType = filingType;
                
                // Reset to day shift by default
                const dayShiftRadio = document.querySelector('input[name="export-shift"][value="day"]');
                if (dayShiftRadio) dayShiftRadio.checked = true;
                modal.classList.add('active');
                return;
            }
        }
        
        // For other filing types, export directly
        window.location.href = `/overtime/api/export-overview/?filing_type=${filingType}&date=${date}`;
    }
    
    async function fetchOverviewData() {
        const filingType = elements.overviewFilingType?.value || 'daily';
        const date = elements.overviewDate?.value || new Date().toISOString().split('T')[0];
        
        renderOverviewLoading();
        
        try {
            const url = `/overtime/api/overview/?filing_type=${filingType}&date=${date}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                state.overviewData = data.data;
                renderOverviewData();
            } else {
                // Don't show error toast for empty data scenarios
                renderOverviewEmpty();
            }
        } catch (error) {
            console.error('Failed to load overview data:', error);
            // Don't show error toast - just render empty state silently
            renderOverviewEmpty();
        }
    }
    
    function renderOverviewLoading() {
        const tbody = elements.overviewTbody;
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <i class="fa-solid fa-spinner fa-spin"></i>
                            <h5>Loading...</h5>
                            <p>Please wait while we fetch overview data</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    function renderOverviewEmpty() {
        const tbody = elements.overviewTbody;
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h5>No data found</h5>
                            <p>No overtime filings found for the selected filters</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Reset stats
        renderStatusChart({ ot: 0, not_ot: 0, absent: 0, leave: 0 });
        renderVehicleRequirements([]);
        
        // Hide shift summary section
        if (elements.shiftSummarySection) {
            elements.shiftSummarySection.style.display = 'none';
        }
        
        const totalEl = document.getElementById('overview-total-employees');
        if (totalEl) totalEl.textContent = '0';
        
        // Hide pagination
        const pagination = document.getElementById('overview-pagination');
        if (pagination) pagination.style.display = 'none';
    }
    
    function renderOverviewData() {
        const data = state.overviewData;
        if (!data) return;
        
        const filingType = elements.overviewFilingType?.value || 'daily';
        
        // Render vehicle requirements
        renderVehicleRequirements(data.vehicle_requirements);
        
        // Render shift summary cards (for all filing types that have shift data)
        if ((filingType === 'daily' || filingType === 'shifting' || filingType === 'sunday' || filingType === 'saturday_off' || filingType === 'holiday') && data.shift_summary) {
            renderShiftSummary(data.shift_summary, filingType);
            if (elements.shiftSummarySection) {
                elements.shiftSummarySection.style.display = 'block';
            }
        } else {
            if (elements.shiftSummarySection) {
                elements.shiftSummarySection.style.display = 'none';
            }
        }
        
        // Apply search filter and render employee list with pagination
        applyOverviewSearchFilter();
        
        // Update total count
        const totalEl = document.getElementById('overview-total-employees');
        if (totalEl) totalEl.textContent = data.total_employees;
    }
    
    function renderShiftSummary(summaryData, filingType = 'daily') {
        if (!summaryData) return;
        
        // For Shifting, Sunday, Saturday Off, and Holiday: only show OT vehicles (total shuttle)
        // For Daily: show both Not OT and OT vehicles
        const isOTOnlyType = filingType === 'shifting' || filingType === 'sunday' || filingType === 'saturday_off' || filingType === 'holiday';
        
        // Get the totals containers
        const dayshiftTotalsContainer = document.getElementById('dayshift-totals');
        const nightshiftTotalsContainer = document.getElementById('nightshift-totals');
        
        if (isOTOnlyType) {
            // For Shifting/Sunday/Saturday Off/Holiday: Only show total shuttle needed (OT vehicles only)
            if (dayshiftTotalsContainer) {
                dayshiftTotalsContainer.className = 'shift-totals single-total';
                dayshiftTotalsContainer.innerHTML = `
                    <div class="shift-total-item">
                        <span class="total-label">Total Shuttle</span>
                        <span class="total-value">${summaryData.dayshift?.ot_vehicles || 0}</span>
                    </div>
                `;
            }
            if (nightshiftTotalsContainer) {
                nightshiftTotalsContainer.className = 'shift-totals single-total';
                nightshiftTotalsContainer.innerHTML = `
                    <div class="shift-total-item">
                        <span class="total-label">Total Shuttle</span>
                        <span class="total-value">${summaryData.nightshift?.ot_vehicles || 0}</span>
                    </div>
                `;
            }
        } else {
            // For Daily: Show Not OT and OT vehicles
            if (dayshiftTotalsContainer) {
                dayshiftTotalsContainer.className = 'shift-totals';
                dayshiftTotalsContainer.innerHTML = `
                    <div class="shift-total-item">
                        <span class="total-label">Not OT:</span>
                        <span class="total-value">${summaryData.dayshift?.not_ot_vehicles || 0}</span>
                    </div>
                    <div class="shift-total-item">
                        <span class="total-label">OT:</span>
                        <span class="total-value">${summaryData.dayshift?.ot_vehicles || 0}</span>
                    </div>
                `;
            }
            if (nightshiftTotalsContainer) {
                nightshiftTotalsContainer.className = 'shift-totals';
                nightshiftTotalsContainer.innerHTML = `
                    <div class="shift-total-item">
                        <span class="total-label">Not OT:</span>
                        <span class="total-value">${summaryData.nightshift?.not_ot_vehicles || 0}</span>
                    </div>
                    <div class="shift-total-item">
                        <span class="total-label">OT:</span>
                        <span class="total-value">${summaryData.nightshift?.ot_vehicles || 0}</span>
                    </div>
                `;
            }
        }
        
        // Provider breakdowns
        renderProviderBreakdown('dayshift', summaryData.dayshift?.provider_breakdown || [], filingType);
        renderProviderBreakdown('nightshift', summaryData.nightshift?.provider_breakdown || [], filingType);
    }
    
    function renderProviderBreakdown(shift, breakdown, filingType = 'daily') {
        const container = shift === 'dayshift' ? elements.dayshiftProviderBreakdown : elements.nightshiftProviderBreakdown;
        if (!container) return;
        
        if (!breakdown || breakdown.length === 0) {
            container.innerHTML = '<div class="empty-state">No provider data available</div>';
            return;
        }
        
        // For Shifting, Sunday, Saturday Off, and Holiday: only show OT data
        const isOTOnlyType = filingType === 'shifting' || filingType === 'sunday' || filingType === 'saturday_off' || filingType === 'holiday';
        
        if (isOTOnlyType) {
            // For Shifting/Sunday/Saturday Off/Holiday: Show only OT employees count and total vehicles
            container.innerHTML = breakdown.map(provider => {
                const totalOTEmployees = provider.ot_employees || 0;
                return `
                    <div class="provider-breakdown-item">
                        <div class="provider-breakdown-header">
                            <span class="provider-name">${provider.provider_name}</span>
                        </div>
                        <div class="provider-breakdown-stats">
                            <div class="card-stat">
                                <span class="card-stat-value">${totalOTEmployees}</span>
                                <span class="card-stat-label">Total OT</span>
                            </div>
                            <div class="card-stat">
                                <span class="card-stat-value">${provider.ot_vehicles}</span>
                                <span class="card-stat-label">Vehicles</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // For Daily: Show Not OT, OT, and Total Vehicles
            container.innerHTML = breakdown.map(provider => `
                <div class="provider-breakdown-item">
                    <div class="provider-breakdown-header">
                        <span class="provider-name">${provider.provider_name}</span>
                    </div>
                    <div class="provider-breakdown-stats">
                        <div class="card-stat">
                            <span class="card-stat-value">${provider.not_ot_vehicles}</span>
                            <span class="card-stat-label">Not OT</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-value">${provider.ot_vehicles}</span>
                            <span class="card-stat-label">OT</span>
                        </div>
                    </div>
                    <div class="vehicles-needed">
                        <span>Total Vehicles:</span>
                        <span class="vehicles-count">
                            <i class="fas fa-bus"></i>
                            ${provider.total_vehicles}
                        </span>
                    </div>
                </div>
            `).join('');
        }
    }
    
    function applyOverviewSearchFilter() {
        const data = state.overviewData;
        if (!data || !data.filings) {
            state.filteredFilings = [];
            renderOverviewTable();
            return;
        }
        
        const searchTerm = state.overviewSearchTerm.toLowerCase().trim();
        
        if (searchTerm === '') {
            state.filteredFilings = [...data.filings];
        } else {
            state.filteredFilings = data.filings.filter(filing => {
                return (
                    filing.employee_id.toString().includes(searchTerm) ||
                    filing.employee_name.toLowerCase().includes(searchTerm) ||
                    (filing.department && filing.department.toLowerCase().includes(searchTerm)) ||
                    (filing.line_name && filing.line_name.toLowerCase().includes(searchTerm)) ||
                    (filing.destination_name && filing.destination_name.toLowerCase().includes(searchTerm))
                );
            });
        }
        
        // Reset to page 1 when search changes
        state.overviewCurrentPage = 1;
        renderOverviewTable();
    }
    
    function renderStatusChart(counts) {
        const canvas = elements.statusChart;
        if (!canvas) return;
        
        // Destroy existing chart if any
        if (state.overviewChart) {
            state.overviewChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        
        // Create gradient fill for the line area
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(51, 102, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(51, 102, 255, 0.05)');
        
        state.overviewChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['OT', 'Not OT', 'Absent', 'Leave'],
                datasets: [{
                    label: 'Count',
                    data: [counts.ot || 0, counts.not_ot || 0, counts.absent || 0, counts.leave || 0],
                    backgroundColor: gradient,
                    borderColor: 'rgb(51, 102, 255)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: [
                        'rgb(40, 167, 69)',
                        'rgb(108, 117, 125)',
                        'rgb(220, 53, 69)',
                        'rgb(0, 123, 255)'
                    ],
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 12,
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutCubic'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw} employees`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 12, weight: '500' }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 12, weight: '600' }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    function renderVehicleRequirements(requirements) {
        const container = elements.vehicleRequirements;
        if (!container) return;
        
        if (!requirements || requirements.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem;">
                    <i class="fas fa-shuttle-van"></i>
                    <p>No vehicle requirements calculated yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = requirements.map(req => `
            <div class="vehicle-requirement-card">
                <div class="card-header">
                    <div class="vehicle-requirement-header">
                        <span class="group-name">${req.group_name}</span>
                        <span class="vehicle-name">${req.vehicle_name}</span>
                    </div>
                    <div>
                        ${req.destinations && req.destinations.length > 0 ? `<span class="group-destinations">${req.destinations.join('/')}</span>` : ''}
                    </div>
                </div>
                <div class="card-stats">
                    <div class="card-stat">
                        <span class="card-stat-value">${req.employee_count}</span>
                        <span class="card-stat-label">Employees</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-value">${req.vehicle_capacity}</span>
                        <span class="card-stat-label">Capacity</span>
                    </div>
                </div>
                <div class="vehicles-needed">
                    <span>Vehicles Needed:</span>
                    <span class="vehicles-count">
                        <i class="fas fa-bus"></i>
                        ${req.vehicles_needed}
                    </span>
                </div>
            </div>
        `).join('');
    }
    
    function renderOverviewTable() {
        const tbody = elements.overviewTbody;
        if (!tbody) return;
        
        const filings = state.filteredFilings;
        const filingType = elements.overviewFilingType?.value || 'daily';
        const isShifting = filingType === 'shifting';
        
        // Update table header based on filing type
        updateOverviewTableHeader(isShifting);
        
        const colSpan = isShifting ? 7 : 7;
        
        if (!filings || filings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${colSpan}">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h5>No data found</h5>
                            <p>${state.overviewSearchTerm ? 'No employees match your search' : 'No overtime filings found for the selected filters'}</p>
                        </div>
                    </td>
                </tr>
            `;
            
            // Hide pagination
            const pagination = document.getElementById('overview-pagination');
            if (pagination) pagination.style.display = 'none';
            return;
        }
        
        const statusLabels = {
            'ot': 'OT',
            'not_ot': 'Not OT',
            'absent': 'Absent',
            'leave': 'Leave'
        };
        
        // Calculate pagination
        const totalItems = filings.length;
        const totalPages = Math.ceil(totalItems / state.overviewItemsPerPage);
        const startIndex = (state.overviewCurrentPage - 1) * state.overviewItemsPerPage;
        const endIndex = Math.min(startIndex + state.overviewItemsPerPage, totalItems);
        const paginatedFilings = filings.slice(startIndex, endIndex);
        
        if (isShifting) {
            // Shifting layout: Date Filed, Duration, Employee ID, Employee Name, Line, Destination, Shift
            tbody.innerHTML = paginatedFilings.map(filing => {
                const createdAt = new Date(filing.created_at);
                const dateTimeFiled = createdAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }) + ' ' + createdAt.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                
                // Format duration (date_from - date_to)
                const duration = formatShiftingDuration(filing.date_from, filing.date_to);
                
                // Format shift display
                const shiftDisplay = filing.shift === 'day' ? 'Day Shift' : (filing.shift === 'night' ? 'Night Shift' : (filing.shift || '-'));
                
                return `
                    <tr>
                        <td>${dateTimeFiled}</td>
                        <td>${duration}</td>
                        <td>${filing.employee_id}</td>
                        <td>${filing.employee_name}</td>
                        <td>${filing.line_name || '-'}</td>
                        <td>${filing.destination_name || '-'}</td>
                        <td>${shiftDisplay}</td>
                    </tr>
                `;
            }).join('');
        } else {
            // Daily/Saturday Off/Sunday/Holiday layout: Date/Time Filed, Employee ID, Employee Name, Line, Department, Destination, Status
            tbody.innerHTML = paginatedFilings.map(filing => {
                const createdAt = new Date(filing.created_at);
                const dateTimeFiled = createdAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }) + ' ' + createdAt.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                
                return `
                    <tr>
                        <td>${dateTimeFiled}</td>
                        <td>${filing.employee_id}</td>
                        <td>${filing.employee_name}</td>
                        <td>${filing.line_name || '-'}</td>
                        <td>${filing.department || '-'}</td>
                        <td>${filing.destination_name || '-'}</td>
                        <td>
                            <span class="status-badge status-${filing.status.replace('_', '-')}">
                                ${statusLabels[filing.status] || filing.status}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        // Render pagination
        renderOverviewPagination(totalItems, totalPages, startIndex, endIndex);
    }
    
    // Helper function to format shifting duration
    function formatShiftingDuration(dateFrom, dateTo) {
        if (!dateFrom || !dateTo) return '-';
        
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        
        const fromYear = from.getFullYear();
        const toYear = to.getFullYear();
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        if (fromYear === toYear) {
            // Same year: Jan 17 - 21, 2026
            if (from.getMonth() === to.getMonth()) {
                // Same month: Jan 17 - 21, 2026
                return `${monthNames[from.getMonth()]} ${from.getDate()} - ${to.getDate()}, ${fromYear}`;
            } else {
                // Different months but same year: Jan 17 - Feb 21, 2026
                return `${monthNames[from.getMonth()]} ${from.getDate()} - ${monthNames[to.getMonth()]} ${to.getDate()}, ${fromYear}`;
            }
        } else {
            // Different years: Dec 30, 2025 - Jan 01, 2026
            return `${monthNames[from.getMonth()]} ${from.getDate()}, ${fromYear} - ${monthNames[to.getMonth()]} ${to.getDate()}, ${toYear}`;
        }
    }
    
    // Helper function to update table header based on filing type
    function updateOverviewTableHeader(isShifting) {
        const thead = document.querySelector('#overview-table thead tr');
        if (!thead) return;
        
        if (isShifting) {
            thead.innerHTML = `
                <th>Date Filed</th>
                <th>Duration</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Line</th>
                <th>Destination</th>
                <th>Shift</th>
            `;
        } else {
            thead.innerHTML = `
                <th>Date/Time Filed</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Line</th>
                <th>Department</th>
                <th>Destination</th>
                <th>Status</th>
            `;
        }
    }

    function renderOverviewPagination(totalItems, totalPages, startIndex, endIndex) {
        const paginationContainer = document.getElementById('overview-pagination');
        const paginationInfo = document.getElementById('overview-pagination-info');
        const paginationNav = document.getElementById('overview-pagination-nav');
        
        // Show/hide pagination based on total pages
        if (totalPages <= 1) {
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }
        
        if (paginationContainer) paginationContainer.style.display = 'flex';
        
        // Update pagination info
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`;
        }
        
        // Generate pagination buttons
        if (paginationNav) {
            let html = '';
            
            // Previous button
            html += `<button class="pagination-btn" ${state.overviewCurrentPage === 1 ? 'disabled' : ''} data-page="${state.overviewCurrentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>`;
            
            // Page numbers
            const maxVisiblePages = 5;
            let startPage = Math.max(1, state.overviewCurrentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            if (startPage > 1) {
                html += `<button class="pagination-btn" data-page="1">1</button>`;
                if (startPage > 2) {
                    html += `<span class="pagination-ellipsis">...</span>`;
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `<button class="pagination-btn ${i === state.overviewCurrentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    html += `<span class="pagination-ellipsis">...</span>`;
                }
                html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
            }
            
            // Next button
            html += `<button class="pagination-btn" ${state.overviewCurrentPage === totalPages ? 'disabled' : ''} data-page="${state.overviewCurrentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>`;
            
            paginationNav.innerHTML = html;
            
            // Attach event listeners
            paginationNav.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (!btn.disabled) {
                        state.overviewCurrentPage = parseInt(btn.dataset.page);
                        renderOverviewTable();
                    }
                });
            });
        }
    }

    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
               document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    }

    function initEventListeners() {
        // Tab navigation
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.tabBtns.forEach(b => b.classList.remove('active'));
                elements.tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

                if (btn.dataset.tab === 'export') loadWeeks();
                if (btn.dataset.tab === 'overview') {
                    fetchOverviewData();
                }
            });
        });

        // Overview Tab Event Listeners
        document.getElementById('overview-export-btn')?.addEventListener('click', () => {
            exportOverviewData();
        });
        
        elements.overviewFilingType?.addEventListener('change', () => {
            state.overviewSearchTerm = '';
            const searchInput = document.getElementById('overview-search');
            if (searchInput) searchInput.value = '';
            fetchOverviewData();
        });
        
        elements.overviewDate?.addEventListener('change', () => {
            state.overviewSearchTerm = '';
            const searchInput = document.getElementById('overview-search');
            if (searchInput) searchInput.value = '';
            fetchOverviewData();
        });
        
        // Overview Search with debounce
        let overviewSearchTimeout;
        const overviewSearchInput = document.getElementById('overview-search');
        overviewSearchInput?.addEventListener('input', (e) => {
            clearTimeout(overviewSearchTimeout);
            overviewSearchTimeout = setTimeout(() => {
                state.overviewSearchTerm = e.target.value;
                state.overviewCurrentPage = 1;
                applyOverviewSearchFilter();
            }, 300);
        });

        // Search with debounce for Shuttle Users
        let searchTimeout;
        const searchInput = document.getElementById('shuttle-user-search');
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.searchTerm = e.target.value;
                state.currentPage = 1;
                fetchShuttleUsers();
            }, 300);
        });

        // Add/Import/Export Shuttle User buttons
        const addShuttleUserBtn = document.getElementById('add-shuttle-user-btn');
        const importShuttleBtn = document.getElementById('import-shuttle-btn');
        
        // Restrict Add Shuttle and Import buttons for non-shuttle admins
        if (!isShuttleAdmin) {
            if (addShuttleUserBtn) {
                addShuttleUserBtn.disabled = true;
                addShuttleUserBtn.style.opacity = '0.5';
                addShuttleUserBtn.style.cursor = 'not-allowed';
                addShuttleUserBtn.title = 'You do not have Shuttle Admin permission';
            }
            if (importShuttleBtn) {
                importShuttleBtn.disabled = true;
                importShuttleBtn.style.opacity = '0.5';
                importShuttleBtn.style.cursor = 'not-allowed';
                importShuttleBtn.title = 'You do not have Shuttle Admin permission';
            }
        }
        
        addShuttleUserBtn?.addEventListener('click', () => {
            if (!isShuttleAdmin) {
                showToast('You do not have Shuttle Admin permission', 'error');
                return;
            }
            openShuttleUserModal();
        });
        importShuttleBtn?.addEventListener('click', () => {
            if (!isShuttleAdmin) {
                showToast('You do not have Shuttle Admin permission', 'error');
                return;
            }
            openImportModal();
        });
        document.getElementById('export-shuttle-btn')?.addEventListener('click', exportShuttleUsers);

        // Shuttle User Modal
        document.getElementById('close-shuttle-user-modal')?.addEventListener('click', () => closeModal(elements.shuttleUserModal));
        document.getElementById('cancel-shuttle-user-modal')?.addEventListener('click', () => closeModal(elements.shuttleUserModal));
        document.getElementById('save-shuttle-user')?.addEventListener('click', saveShuttleUser);
        
        // With Vehicle toggle label update
        const withVehicleToggle = document.getElementById('shuttle-user-with-vehicle');
        const withVehicleLabel = document.getElementById('with-vehicle-label');
        if (withVehicleToggle && withVehicleLabel) {
            withVehicleToggle.addEventListener('change', () => {
                withVehicleLabel.textContent = withVehicleToggle.checked ? 'Yes' : 'No';
            });
        }

        // Import Modal
        document.getElementById('close-import-modal')?.addEventListener('click', () => closeModal(elements.importModal));
        document.getElementById('cancel-import-modal')?.addEventListener('click', () => closeModal(elements.importModal));
        document.getElementById('download-template-btn')?.addEventListener('click', downloadTemplate);
        document.getElementById('upload-import-btn')?.addEventListener('click', uploadAndImport);
        
        // File input and drop zone
        const fileInput = document.getElementById('import-file-input');
        const dropZone = document.getElementById('drop-zone');
        const browseBtn = document.getElementById('browse-file-btn');
        const removeFileBtn = document.getElementById('remove-file-btn');

        browseBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput?.click();
        });

        fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });

        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone?.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        removeFileBtn?.addEventListener('click', () => {
            state.selectedFile = null;
            document.getElementById('selected-file').style.display = 'none';
            document.getElementById('upload-import-btn').disabled = true;
            fileInput.value = '';
        });

        // Settings Modal
        document.getElementById('open-settings-modal-btn')?.addEventListener('click', () => {
            openSettingsModal();
        });

        document.getElementById('close-settings-modal')?.addEventListener('click', () => {
            closeModal(elements.settingsModal);
        });

        // Settings Sidebar Navigation
        elements.settingsNavItems.forEach(item => {
            item.addEventListener('click', () => {
                elements.settingsNavItems.forEach(i => i.classList.remove('active'));
                elements.settingsPanels.forEach(p => p.classList.remove('active'));
                item.classList.add('active');
                document.getElementById(`settings-${item.dataset.settingsTab}`).classList.add('active');

                // Load data for the selected tab
                if (item.dataset.settingsTab === 'vehicles') fetchVehicles();
                if (item.dataset.settingsTab === 'providers') fetchProviders();
                if (item.dataset.settingsTab === 'destinations') fetchDestinations();
                if (item.dataset.settingsTab === 'destination-groups') {
                    fetchVehicles();
                    fetchProviders();
                    fetchDestinations();
                    fetchDestinationGroups();
                }
                if (item.dataset.settingsTab === 'holidays') fetchHolidays();
                if (item.dataset.settingsTab === 'passcode') fetchPasscode();
            });
        });

        document.getElementById('add-vehicle-btn')?.addEventListener('click', () => openVehicleModal());
        document.getElementById('close-vehicle-modal')?.addEventListener('click', () => closeModal(elements.vehicleModal));
        document.getElementById('cancel-vehicle-modal')?.addEventListener('click', () => closeModal(elements.vehicleModal));
        document.getElementById('save-vehicle')?.addEventListener('click', saveVehicle);

        document.getElementById('add-provider-btn')?.addEventListener('click', () => openProviderModal());
        document.getElementById('close-provider-modal')?.addEventListener('click', () => closeModal(elements.providerModal));
        document.getElementById('cancel-provider-modal')?.addEventListener('click', () => closeModal(elements.providerModal));
        document.getElementById('save-provider')?.addEventListener('click', saveProvider);

        document.getElementById('add-destination-btn')?.addEventListener('click', () => openDestinationModal());
        document.getElementById('close-destination-modal')?.addEventListener('click', () => closeModal(elements.destinationModal));
        document.getElementById('cancel-destination-modal')?.addEventListener('click', () => closeModal(elements.destinationModal));
        document.getElementById('save-destination')?.addEventListener('click', saveDestination);

        document.getElementById('add-destination-group-btn')?.addEventListener('click', () => openDestinationGroupModal());
        document.getElementById('close-destination-group-modal')?.addEventListener('click', () => closeModal(elements.destinationGroupModal));
        document.getElementById('cancel-destination-group-modal')?.addEventListener('click', () => closeModal(elements.destinationGroupModal));
        document.getElementById('save-destination-group')?.addEventListener('click', saveDestinationGroup);

        document.getElementById('add-holiday-btn')?.addEventListener('click', openHolidayModal);
        document.getElementById('close-holiday-modal')?.addEventListener('click', () => closeModal(elements.holidayModal));
        document.getElementById('cancel-holiday-modal')?.addEventListener('click', () => closeModal(elements.holidayModal));
        document.getElementById('save-holiday')?.addEventListener('click', saveHoliday);

        document.getElementById('cancel-admin-confirm-modal')?.addEventListener('click', () => closeModal(elements.confirmModal));
        document.getElementById('admin-confirm-action-btn')?.addEventListener('click', () => {
            if (state.confirmCallback) state.confirmCallback();
        });



        document.getElementById('export-type')?.addEventListener('change', (e) => {
            const weekGroup = document.getElementById('export-week-group');
            const dateGroup = document.getElementById('export-date-group');
            if (e.target.value === 'shifting') {
                weekGroup.style.display = 'block';
                dateGroup.style.display = 'none';
            } else {
                weekGroup.style.display = 'none';
                dateGroup.style.display = 'block';
            }
        });

        document.getElementById('export-year')?.addEventListener('change', loadWeeks);
        document.getElementById('export-btn')?.addEventListener('click', exportOvertime);
    }

    function init() {
        fetchShuttleUsers();
        fetchDestinations();
        fetchVehicles();
        fetchDestinationGroups();
        initEventListeners();
        
        // Initialize Overview tab (it's now the default active tab)
        initOverview();
    }

    init();
});
