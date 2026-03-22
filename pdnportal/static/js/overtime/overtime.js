document.addEventListener('DOMContentLoaded', function() {
    const state = {
        subordinates: [],
        allShuttleUsers: [],
        groups: [],
        selectedSubordinates: { shifting: new Set(), daily: new Set() },
        selectedGroupSubordinates: new Set(),
        addedEmployees: { shifting: [], daily: [] },
        currentGroupId: null,
        pendingFilingData: null,
        isPastCutoff: false,
        duplicateEmployees: [],
        historyData: [],
        historyCurrentPage: 1,
        historyPerPage: 10,
        pendingAddData: null, // For status selection modal when adding multiple employees
        employeesWithoutShifting: [] // Employees missing shifting records
    };

    const elements = {
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        shiftingSearch: document.getElementById('subordinate-search-shifting'),
        dailySearch: document.getElementById('subordinate-search-daily'),
        shiftingList: document.getElementById('subordinate-list-shifting'),
        dailyList: document.getElementById('subordinate-list-daily'),
        shiftingTbody: document.getElementById('shifting-employee-tbody'),
        dailyTbody: document.getElementById('daily-employee-tbody'),
        addSelectedShifting: document.getElementById('add-selected-shifting'),
        addSelectedDaily: document.getElementById('add-selected-daily'),
        clearAllShifting: document.getElementById('clear-all-shifting'),
        clearAllDaily: document.getElementById('clear-all-daily'),
        submitShifting: document.getElementById('submit-shifting'),
        submitDaily: document.getElementById('submit-daily'),
        groupsContainer: document.getElementById('groups-container'),
        historyTbody: document.getElementById('history-tbody'),
        groupModal: document.getElementById('group-modal-overlay'),
        loadGroupModal: document.getElementById('load-group-modal-overlay'),
        passcodeModal: document.getElementById('passcode-modal-overlay'),
        confirmModal: document.getElementById('confirm-modal-overlay'),
        successModal: document.getElementById('success-modal-overlay'),
        duplicateModal: document.getElementById('duplicate-modal-overlay'),
        statusSelectModal: document.getElementById('status-select-modal-overlay'),
        missingShiftingModal: document.getElementById('missing-shifting-modal-overlay')
    };

    async function fetchSubordinates() {
        try {
            const response = await fetch('/overtime/api/subordinates/');
            const data = await response.json();
            if (data.success) {
                state.subordinates = data.data;
                renderSubordinateList('shifting');
                renderSubordinateList('daily');
            }
        } catch (error) {
            showToast('Failed to load subordinates', 'error');
        }
    }

    async function fetchAllShuttleUsers() {
        try {
            const response = await fetch('/overtime/api/all-shuttle-users/');
            const data = await response.json();
            if (data.success) {
                state.allShuttleUsers = data.data;
            }
        } catch (error) {
            console.error('Failed to load all shuttle users', error);
        }
    }

    async function fetchGroups() {
        try {
            const response = await fetch('/overtime/api/subordinate-groups/');
            const data = await response.json();
            if (data.success) {
                state.groups = data.data;
                renderGroups();
            }
        } catch (error) {
            showToast('Failed to load groups', 'error');
        }
    }

    async function fetchHistory() {
        try {
            const filterType = document.getElementById('history-filter-type').value;
            const filterDate = document.getElementById('history-filter-date').value;
            let url = '/overtime/api/overtime-filings/';
            const params = new URLSearchParams();
            if (filterType) params.append('filing_type', filterType);
            if (filterDate) params.append('date', filterDate);
            if (params.toString()) url += '?' + params.toString();

            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                state.historyData = data.data;
                state.historyCurrentPage = 1;
                renderHistory();
            } else {
                // Handle error response without showing toast - just render empty state
                state.historyData = [];
                state.historyCurrentPage = 1;
                renderHistory();
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            // Don't show toast for errors - just render empty state
            state.historyData = [];
            state.historyCurrentPage = 1;
            renderHistory();
        }
    }

    function getFilteredHistory() {
        const searchTerm = document.getElementById('history-search')?.value.toLowerCase() || '';
        
        if (!searchTerm) return state.historyData;
        
        return state.historyData.filter(filing =>
            filing.employee_name.toLowerCase().includes(searchTerm) ||
            String(filing.employee_id).includes(searchTerm)
        );
    }

    function renderHistory() {
        const filteredData = getFilteredHistory();
        const totalPages = Math.ceil(filteredData.length / state.historyPerPage);
        const startIndex = (state.historyCurrentPage - 1) * state.historyPerPage;
        const endIndex = startIndex + state.historyPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);

        if (filteredData.length === 0) {
            elements.historyTbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <i class="fa-solid fa-folder-open"></i>
                            <h5>No filing history</h5>
                            <p>Your overtime filings will appear here</p>
                        </div>
                    </td>
                </tr>
            `;
            renderHistoryPagination(0, 0);
            return;
        }

        elements.historyTbody.innerHTML = pageData.map(filing => {
            // Format overtime date based on filing type
            let overtimeDate;
            if (filing.filing_type === 'shifting') {
                // For shifting: show date range
                overtimeDate = filing.date_to 
                    ? `${formatDate(filing.date_from)} - ${formatDate(filing.date_to)}`
                    : formatDate(filing.date_from);
            } else {
                // For daily types: show the actual overtime date
                overtimeDate = formatDate(filing.date_from);
            }
            
            return `
                <tr>
                    <td>${formatDate(filing.created_at)}</td>
                    <td><span class="status-pill status-blue">${formatFilingType(filing.filing_type)}</span></td>
                    <td>${overtimeDate}</td>
                    <td>${filing.employee_name}</td>
                    <td>${filing.line_name || '-'}</td>
                    <td>${formatShift(filing.shift)}</td>
                    <td>${filing.time_in} - ${filing.time_out}</td>
                    <td><span class="status-pill ${getStatusClass(filing.status)}">${formatStatus(filing.status)}</span></td>
                    <td>${filing.is_late_filing ? '<span class="status-pill status-orange">Yes</span>' : '-'}</td>
                </tr>
            `;
        }).join('');

        renderHistoryPagination(totalPages, filteredData.length);
    }

    function renderHistoryPagination(totalPages, totalItems) {
        const container = document.getElementById('history-pagination');
        
        // Only show pagination if more than 1 page
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const currentPage = state.historyCurrentPage;
        let paginationHTML = `
            <div class="pagination-info">
                Showing ${((currentPage - 1) * state.historyPerPage) + 1} - ${Math.min(currentPage * state.historyPerPage, totalItems)} of ${totalItems}
            </div>
            <div class="pagination-controls">
        `;

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;

        // Add event listeners
        container.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                state.historyCurrentPage = parseInt(btn.dataset.page);
                renderHistory();
            });
        });
    }

    function renderSubordinateList(type) {
        const container = type === 'shifting' ? elements.shiftingList : elements.dailyList;
        const search = type === 'shifting' ? elements.shiftingSearch : elements.dailySearch;
        const searchTerm = search ? search.value.toLowerCase() : '';

        const filtered = state.subordinates.filter(sub => 
            sub.full_name.toLowerCase().includes(searchTerm) ||
            (sub.department && sub.department.toLowerCase().includes(searchTerm)) ||
            (sub.line_name && sub.line_name.toLowerCase().includes(searchTerm))
        );

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-search"></i>
                    <h5>No subordinates found</h5>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(sub => {
            // Use string comparison for IDs
            const subId = String(sub.id);
            const isSelected = state.selectedSubordinates[type].has(subId) || 
                               state.selectedSubordinates[type].has(sub.id) ||
                               Array.from(state.selectedSubordinates[type]).some(id => String(id) === subId);
            return `
                <div class="ot-subordinate-item ${isSelected ? 'selected' : ''}" 
                     data-id="${sub.id}">
                    <input type="checkbox" class="ot-subordinate-checkbox" 
                           ${isSelected ? 'checked' : ''}>
                    <div class="ot-subordinate-info">
                        <div class="ot-subordinate-name">${sub.full_name}</div>
                        <div class="ot-subordinate-dept">${sub.id}${sub.department ? ' - ' + sub.department : ''}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.ot-subordinate-item').forEach(item => {
            // Keep ID as string
            item.addEventListener('click', () => toggleSubordinate(type, item.dataset.id));
        });

        updateSelectedCount(type);
    }

    function toggleSubordinate(type, id) {
        // Use string ID for consistency
        const strId = String(id);
        if (state.selectedSubordinates[type].has(strId)) {
            state.selectedSubordinates[type].delete(strId);
        } else {
            state.selectedSubordinates[type].add(strId);
        }
        renderSubordinateList(type);
    }

    function updateSelectedCount(type) {
        const count = state.selectedSubordinates[type].size;
        const summary = document.getElementById(`selected-summary-${type}`);
        const countSpan = summary.querySelector('.selected-count');
        const addBtn = document.getElementById(`add-selected-${type}`);
        
        countSpan.textContent = `${count} selected`;
        addBtn.disabled = count === 0;
    }

    function addSelectedEmployees(type) {
        const selected = Array.from(state.selectedSubordinates[type]);
        const existing = new Set(state.addedEmployees[type].map(e => String(e.id)));
        
        // Filter out already existing employees
        const newEmployees = selected.filter(id => !existing.has(String(id)));
        
        if (newEmployees.length === 0) {
            showToast('All selected employees are already added', 'info');
            return;
        }

        // For shifting tab, always auto-set status to 'ot' without showing modal
        if (type === 'shifting') {
            newEmployees.forEach(id => {
                const strId = String(id);
                const sub = state.subordinates.find(s => String(s.id) === strId);
                if (sub) {
                    state.addedEmployees[type].unshift({ ...sub, status: 'ot' });
                }
            });
            state.selectedSubordinates[type].clear();
            renderSubordinateList(type);
            renderEmployeeTable(type);
            return;
        }

        // If 2 or more new employees, show status selection modal (daily tab only)
        if (newEmployees.length >= 2) {
            state.pendingAddData = {
                type: type,
                employeeIds: newEmployees,
                source: 'selection'
            };
            openStatusSelectModal(newEmployees.length);
            return;
        }

        // Single employee - add directly with default 'ot' status
        newEmployees.forEach(id => {
            const strId = String(id);
            const sub = state.subordinates.find(s => String(s.id) === strId);
            if (sub) {
                state.addedEmployees[type].unshift({ ...sub, status: 'ot' });
            }
        });

        state.selectedSubordinates[type].clear();
        renderSubordinateList(type);
        renderEmployeeTable(type);
    }

    function renderEmployeeTable(type) {
        const tbody = type === 'shifting' ? elements.shiftingTbody : elements.dailyTbody;
        const employees = state.addedEmployees[type];
        const colSpan = type === 'shifting' ? 4 : 5;

        if (employees.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="${colSpan}">
                        <div class="empty-state">
                            <i class="fa-solid fa-user-plus"></i>
                            <h5>No employees added</h5>
                            <p>Select subordinates from the list and click "Add Selected"</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = employees.map((emp, index) => {
            // For shifting tab, don't show status column (status is always 'ot')
            if (type === 'shifting') {
                return `
                    <tr data-index="${index}" data-employee-id="${emp.id}">
                        <td>
                            <div class="employee-info">
                                <span class="employee-name">${emp.full_name}</span>
                            </div>
                        </td>
                        <td>${emp.department || '-'}</td>
                        <td>${emp.destination || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-icon btn-error remove-employee" data-index="${index}">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            // For daily tab, show status column
            return `
                <tr data-index="${index}" data-employee-id="${emp.id}">
                    <td>
                        <div class="employee-info">
                            <span class="employee-name">${emp.full_name}</span>
                        </div>
                    </td>
                    <td>${emp.department || '-'}</td>
                    <td>${emp.destination || '-'}</td>
                    <td>
                        <select class="ot-status-select" data-index="${index}">
                            <option value="not_ot" ${emp.status === 'not_ot' ? 'selected' : ''}>Not OT</option>
                            <option value="ot" ${emp.status === 'ot' ? 'selected' : ''}>OT</option>
                            <option value="absent" ${emp.status === 'absent' ? 'selected' : ''}>Absent</option>
                            <option value="leave" ${emp.status === 'leave' ? 'selected' : ''}>Leave</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-icon btn-error remove-employee" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.ot-status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                state.addedEmployees[type][idx].status = e.target.value;
            });
        });

        tbody.querySelectorAll('.remove-employee').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.closest('button').dataset.index);
                state.addedEmployees[type].splice(idx, 1);
                renderEmployeeTable(type);
            });
        });

        // For daily tab, check shifting status and highlight rows without shifting
        if (type === 'daily') {
            checkAndHighlightMissingShifting();
        }
    }

    async function checkAndHighlightMissingShifting() {
        const dailyDate = document.getElementById('daily-date').value;
        if (!dailyDate) return;

        const employees = state.addedEmployees['daily'];
        if (employees.length === 0) return;

        const employeeIds = employees.map(emp => emp.id);

        try {
            const response = await fetch('/overtime/api/check-shifting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    employee_ids: employeeIds,
                    date: dailyDate
                })
            });
            const data = await response.json();

            if (data.success && !data.all_have_shifting) {
                highlightMissingShiftingRows(data.employees_without_shifting);
            } else {
                // Clear any existing highlights
                clearMissingShiftingHighlights();
            }
        } catch (error) {
            console.error('Failed to check shifting status:', error);
        }
    }

    function clearAllEmployees(type) {
        state.addedEmployees[type] = [];
        renderEmployeeTable(type);
    }

    async function submitFiling(type) {
        const employees = state.addedEmployees[type];
        if (employees.length === 0) {
            showToast('Please add at least one employee', 'warning');
            return;
        }

        let filingType, dateFrom, dateTo, shift, timeIn, timeOut;

        if (type === 'shifting') {
            dateFrom = document.getElementById('shifting-date-from').value;
            dateTo = document.getElementById('shifting-date-to').value;
            shift = document.getElementById('shifting-shift').value;
            timeIn = document.getElementById('shifting-time-in').value;
            timeOut = document.getElementById('shifting-time-out').value;
            filingType = 'shifting';

            // Detailed validation for shifting
            if (!dateFrom) {
                showToast('Please select a start date', 'error');
                return;
            }
            if (!dateTo) {
                showToast('Please select an end date', 'error');
                return;
            }
            if (!shift) {
                showToast('Please select a shift', 'error');
                return;
            }
            if (!timeIn) {
                showToast('Please enter time in', 'error');
                return;
            }
            if (!timeOut) {
                showToast('Please enter time out', 'error');
                return;
            }
        } else {
            filingType = document.getElementById('daily-filing-type').value;
            dateFrom = document.getElementById('daily-date').value;
            shift = document.getElementById('daily-shift').value;
            timeIn = document.getElementById('daily-time-in').value;
            timeOut = document.getElementById('daily-time-out').value;

            // Detailed validation for daily
            if (!dateFrom) {
                showToast('Please select a date', 'error');
                return;
            }
            if (!shift) {
                showToast('Please select a shift', 'error');
                return;
            }
            if (!timeIn) {
                showToast('Please enter time in', 'error');
                return;
            }
            if (!timeOut) {
                showToast('Please enter time out', 'error');
                return;
            }
        }

        try {
            const employeeIds = employees.map(emp => emp.id);

            // For daily filing types, check if employees have shifting records first
            if (type === 'daily') {
                const shiftingCheckResponse = await fetch('/overtime/api/check-shifting/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({
                        employee_ids: employeeIds,
                        date: dateFrom
                    })
                });
                const shiftingCheckData = await shiftingCheckResponse.json();

                if (!shiftingCheckData.all_have_shifting) {
                    // Store the employees without shifting and show modal
                    state.employeesWithoutShifting = shiftingCheckData.employees_without_shifting;
                    openMissingShiftingModal(shiftingCheckData.employees_without_shifting);
                    // Mark rows in table with red pulsing border
                    highlightMissingShiftingRows(shiftingCheckData.employees_without_shifting);
                    return;
                }
            }

            // Check for duplicates
            const duplicateResponse = await fetch('/overtime/api/check-duplicates/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    filing_type: filingType,
                    employee_ids: employeeIds,
                    shift,
                    time_in: timeIn,
                    time_out: timeOut,
                    date_from: dateFrom,
                    date_to: dateTo || null
                })
            });
            const duplicateData = await duplicateResponse.json();

            const filingData = {
                filing_type: filingType,
                employee_data: employees,
                shift,
                time_in: timeIn,
                time_out: timeOut,
                date_from: dateFrom,
                date_to: dateTo || null
            };

            // Check cutoff status
            const cutoffResponse = await fetch('/overtime/api/check-cutoff/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ filing_type: filingType, date: dateFrom })
            });
            const cutoffData = await cutoffResponse.json();

            // Store pending data and cutoff status
            state.pendingFilingData = filingData;
            state.isPastCutoff = cutoffData.is_past_cutoff;

            // If duplicates found, show duplicate modal first
            if (duplicateData.has_duplicates) {
                state.duplicateEmployees = duplicateData.duplicates;
                openDuplicateModal(duplicateData.duplicates);
            } else if (cutoffData.is_past_cutoff) {
                // No duplicates but past cutoff - show passcode modal
                openPasscodeModal();
            } else {
                // No duplicates and not past cutoff - submit directly
                await submitFilingRequest(filingData);
            }
        } catch (error) {
            showToast('Failed to submit filing', 'error');
        }
    }

    async function submitFilingRequest(data) {
        try {
            const response = await fetch('/overtime/api/submit-overtime/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                const type = data.filing_type === 'shifting' ? 'shifting' : 'daily';
                state.addedEmployees[type] = [];
                renderEmployeeTable(type);
                
                fetchHistory();
                
                // Show success modal
                showSuccessModal(result.message || 'Overtime filing submitted successfully!');
            } else {
                showToast(result.error || 'Failed to submit filing', 'error');
            }
        } catch (error) {
            showToast('Failed to submit filing', 'error');
        }
    }

    function renderGroups() {
        if (state.groups.length === 0) {
            elements.groupsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    <h5>No groups created</h5>
                    <p>Create a group to quickly select multiple subordinates</p>
                </div>
            `;
            return;
        }

        // Get search term from the groups search input
        const searchTerm = document.getElementById('groups-search')?.value.toLowerCase() || '';
        
        // Filter groups based on search term
        let filteredGroups = state.groups;
        if (searchTerm) {
            filteredGroups = state.groups.filter(group => {
                // Check if any member's name contains the search term
                const memberNames = (group.employee_ids || []).map(id => {
                    const sub = state.allShuttleUsers.find(s => String(s.employee_id) === String(id) || String(s.id) === String(id));
                    return sub ? sub.full_name.toLowerCase() : '';
                });
                return memberNames.some(name => name.includes(searchTerm));
            });
        }

        // Show empty state if no groups match the search
        if (filteredGroups.length === 0 && searchTerm) {
            elements.groupsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-search"></i>
                    <h5>No groups found</h5>
                    <p>No groups contain an employee matching "${searchTerm}"</p>
                </div>
            `;
            return;
        }

        elements.groupsContainer.innerHTML = filteredGroups.map(group => {
            const memberCount = group.employee_ids ? group.employee_ids.length : 0;
            
            return `
                <div class="ot-group-card" data-id="${group.id}">
                    <div class="ot-group-header">
                        <div>
                            <div class="ot-group-name">${group.name}</div>
                            <div class="ot-group-count">${memberCount} members</div>
                        </div>
                        <div class="ot-group-actions">
                            <button class="btn btn-sm btn-icon edit-group" data-id="${group.id}">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-sm btn-icon btn-error delete-group" data-id="${group.id}">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="ot-group-members">
                        ${(group.employee_ids || []).slice(0, 5).map(id => {
                            const sub = state.allShuttleUsers.find(s => String(s.employee_id) === String(id) || String(s.id) === String(id));
                            return sub ? `<span class="ot-member-badge">${sub.full_name}</span>` : '';
                        }).filter(badge => badge !== '').join('')}
                        ${memberCount > 5 ? `<span class="ot-member-badge">+${memberCount - 5} more</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        elements.groupsContainer.querySelectorAll('.edit-group').forEach(btn => {
            btn.addEventListener('click', () => openEditGroupModal(parseInt(btn.dataset.id)));
        });

        elements.groupsContainer.querySelectorAll('.delete-group').forEach(btn => {
            btn.addEventListener('click', () => confirmDeleteGroup(parseInt(btn.dataset.id)));
        });

        elements.groupsContainer.querySelectorAll('.edit-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditGroupModal(parseInt(btn.dataset.id));
            });
        });

        elements.groupsContainer.querySelectorAll('.delete-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                confirmDeleteGroup(parseInt(btn.dataset.id));
            });
        });

        // Add click listener to open group details modal
        elements.groupsContainer.querySelectorAll('.ot-group-card').forEach(card => {
            card.addEventListener('click', () => {
                const groupId = parseInt(card.dataset.id);
                openGroupDetailsModal(groupId);
            });
        });
    }

    function openGroupDetailsModal(groupId) {
        const group = state.groups.find(g => g.id === groupId);
        if (!group) return;

        const modal = document.getElementById('group-details-modal');
        const membersList = document.getElementById('group-details-members-list');
        const title = document.getElementById('group-details-title');
        const memberCount = document.getElementById('group-details-count');

        title.textContent = group.name;
        memberCount.textContent = `${group.employee_ids ? group.employee_ids.length : 0} members`;

        // Generate member list
        const membersHTML = (group.employee_ids || []).map(id => {
            const sub = state.allShuttleUsers.find(s => String(s.employee_id) === String(id) || String(s.id) === String(id));
            return sub ? `
                <div class="ot-details-member-item">
                    <div class="ot-member-info">
                        <span class="ot-member-name">${sub.full_name}</span>
                        <span class="ot-member-id">ID: ${sub.employee_id}</span>
                    </div>
                </div>
            ` : '';
        }).filter(item => item !== '').join('');

        membersList.innerHTML = membersHTML || '<p class="text-muted">No members in this group</p>';

        // Show modal
        modal.classList.add('active');
    }

    function closeGroupDetailsModal() {
        const modal = document.getElementById('group-details-modal');
        modal.classList.remove('active');
    }

    function openGroupModal(groupId = null) {
        state.currentGroupId = groupId;
        const modal = elements.groupModal;
        const title = document.getElementById('group-modal-title');
        const nameInput = document.getElementById('group-name');
        const searchInput = document.getElementById('group-subordinate-search');

        if (groupId) {
            const group = state.groups.find(g => g.id === groupId);
            title.textContent = 'Edit Group';
            nameInput.value = group.name;
            // Convert all employee_ids to strings for consistent comparison
            state.selectedGroupSubordinates = new Set((group.employee_ids || []).map(id => String(id)));
        } else {
            title.textContent = 'Create Group';
            nameInput.value = '';
            state.selectedGroupSubordinates = new Set();
        }

        searchInput.value = '';
        renderGroupSubordinateList();
        modal.classList.add('active');
    }

    function renderGroupSubordinateList() {
        const container = document.getElementById('group-subordinate-list');
        const search = document.getElementById('group-subordinate-search');
        const searchTerm = search ? search.value.toLowerCase() : '';

        // Use allShuttleUsers for group modal (all employees, not just those in user's groups)
        const filtered = state.allShuttleUsers.filter(sub =>
            sub.full_name.toLowerCase().includes(searchTerm) ||
            String(sub.employee_id).includes(searchTerm) ||
            (sub.department && sub.department.toLowerCase().includes(searchTerm)) ||
            (sub.line_name && sub.line_name.toLowerCase().includes(searchTerm))
        );

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state-inline">
                    <i class="fa-solid fa-search"></i>
                    <span>No employees found</span>
                </div>
            `;
            updateGroupPreview();
            return;
        }

        container.innerHTML = filtered.map(sub => {
            // Check if selected using string comparison
            const subId = String(sub.id);
            const isSelected = state.selectedGroupSubordinates.has(subId) || 
                               state.selectedGroupSubordinates.has(sub.id) ||
                               Array.from(state.selectedGroupSubordinates).some(id => String(id) === subId);
            
            return `
                <div class="ot-subordinate-item ${isSelected ? 'selected' : ''}" data-id="${sub.id}">
                    <input type="checkbox" class="ot-subordinate-checkbox" 
                           id="group-sub-${sub.id}" value="${sub.id}"
                           ${isSelected ? 'checked' : ''}>
                    <div class="ot-subordinate-info">
                        <div class="ot-subordinate-name">${sub.full_name}</div>
                        <div class="ot-subordinate-dept">${sub.employee_id}${sub.department ? ' - ' + sub.department : ''}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.ot-subordinate-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Keep as string to match the employee_id format
                const id = item.dataset.id;
                const checkbox = item.querySelector('input[type="checkbox"]');
                const isNowChecked = !checkbox.checked;
                checkbox.checked = isNowChecked;
                item.classList.toggle('selected', isNowChecked);
                
                // Update the persistent state - store as string
                if (isNowChecked) {
                    state.selectedGroupSubordinates.add(id);
                } else {
                    state.selectedGroupSubordinates.delete(id);
                }
                updateGroupPreview();
            });
        });

        updateGroupPreview();
    }

    function updateGroupPreview() {
        const preview = document.getElementById('selected-subordinates-preview');
        preview.querySelector('.preview-count').textContent = `${state.selectedGroupSubordinates.size} subordinates selected`;
    }

    async function saveGroup() {
        const name = document.getElementById('group-name').value.trim();
        const employeeIds = Array.from(state.selectedGroupSubordinates);

        if (!name) {
            showToast('Please enter a group name', 'warning');
            return;
        }

        if (employeeIds.length === 0) {
            showToast('Please select at least one subordinate', 'warning');
            return;
        }

        try {
            const url = state.currentGroupId
                ? `/overtime/api/subordinate-groups/${state.currentGroupId}/update/`
                : '/overtime/api/subordinate-groups/create/';
            const method = state.currentGroupId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ name, employee_ids: employeeIds })
            });

            const data = await response.json();
            if (data.success) {
                showToast(`Group ${state.currentGroupId ? 'updated' : 'created'} successfully`, 'success');
                closeModal(elements.groupModal);
                // Refresh both groups and subordinates lists
                await fetchGroups();
                await fetchSubordinates();
            } else {
                showToast(data.errors?.name?.[0] || 'Failed to save group', 'error');
            }
        } catch (error) {
            showToast('Failed to save group', 'error');
        }
    }

    function openEditGroupModal(groupId) {
        openGroupModal(groupId);
    }

    function confirmDeleteGroup(groupId) {
        const modal = elements.confirmModal;
        document.getElementById('confirm-title').textContent = 'Delete Group';
        document.getElementById('confirm-message').textContent = 'Are you sure you want to delete this group?';
        
        const confirmBtn = document.getElementById('confirm-action-btn');
        confirmBtn.onclick = async () => {
            try {
                const response = await fetch(`/overtime/api/subordinate-groups/${groupId}/delete/`, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': getCSRFToken() }
                });
                const data = await response.json();
                if (data.success) {
                    showToast('Group deleted successfully', 'success');
                    closeModal(modal);
                    // Refresh both groups and subordinates lists
                    await fetchGroups();
                    await fetchSubordinates();
                }
            } catch (error) {
                showToast('Failed to delete group', 'error');
            }
        };

        modal.classList.add('active');
    }

    function openLoadGroupModal(type) {
        const modal = elements.loadGroupModal;
        const list = document.getElementById('load-group-list');

        if (state.groups.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    <h5>No groups available</h5>
                    <p>Create a group first to use this feature</p>
                </div>
            `;
        } else {
            list.innerHTML = state.groups.map(group => `
                <div class="ot-group-select-item" data-id="${group.id}">
                    <span class="ot-group-select-name">${group.name}</span>
                    <span class="ot-group-select-count">${(group.employee_ids || []).length} members</span>
                </div>
            `).join('');

            list.querySelectorAll('.ot-group-select-item').forEach(item => {
                item.addEventListener('click', () => {
                    const groupId = parseInt(item.dataset.id);
                    loadGroupToFiling(groupId, type);
                    closeModal(modal);
                });
            });
        }

        modal.classList.add('active');
    }

    function loadGroupToFiling(groupId, type) {
        const group = state.groups.find(g => g.id === groupId);
        if (!group) return;

        const existing = new Set(state.addedEmployees[type].map(e => String(e.id)));
        
        // Filter out already existing employees
        const newEmployeeIds = (group.employee_ids || []).filter(id => !existing.has(String(id)));
        
        if (newEmployeeIds.length === 0) {
            showToast('All group members are already added', 'info');
            return;
        }

        // For shifting tab, always auto-set status to 'ot' without showing modal
        if (type === 'shifting') {
            newEmployeeIds.forEach(id => {
                const strId = String(id);
                const sub = state.subordinates.find(s => String(s.id) === strId);
                if (sub) {
                    state.addedEmployees[type].unshift({ ...sub, status: 'ot' });
                }
            });
            renderEmployeeTable(type);
            showToast(`Loaded ${group.name}`, 'success');
            return;
        }

        // If 2 or more new employees from group, show status selection modal (daily tab only)
        if (newEmployeeIds.length >= 2) {
            state.pendingAddData = {
                type: type,
                employeeIds: newEmployeeIds,
                source: 'group',
                groupName: group.name
            };
            openStatusSelectModal(newEmployeeIds.length);
            return;
        }

        // Single employee from group - add directly with default 'ot' status
        newEmployeeIds.forEach(id => {
            const strId = String(id);
            const sub = state.subordinates.find(s => String(s.id) === strId);
            if (sub) {
                state.addedEmployees[type].unshift({ ...sub, status: 'ot' });
            }
        });

        renderEmployeeTable(type);
        showToast(`Loaded ${group.name}`, 'success');
    }

    function openStatusSelectModal(count) {
        const modal = elements.statusSelectModal;
        if (!modal) return;
        
        // Update the count in the info text
        const infoText = modal.querySelector('.status-select-info');
        if (infoText) {
            infoText.innerHTML = `You are about to add <strong>${count} subordinate${count > 1 ? 's' : ''}</strong>. Please select a status to apply to all of them:`;
        }
        
        // Reset to default selection (OT)
        const otRadio = document.querySelector('input[name="bulk-status"][value="ot"]');
        if (otRadio) otRadio.checked = true;
        
        modal.classList.add('active');
    }

    function closeStatusSelectModal() {
        const modal = elements.statusSelectModal;
        if (modal) {
            modal.classList.remove('active');
        }
        state.pendingAddData = null;
    }

    function confirmStatusSelection() {
        if (!state.pendingAddData) return;
        
        const { type, employeeIds, source, groupName } = state.pendingAddData;
        
        // Get selected status
        const selectedStatus = document.querySelector('input[name="bulk-status"]:checked');
        const status = selectedStatus ? selectedStatus.value : 'ot';
        
        // Add employees with selected status at the TOP of the list
        const addedCount = employeeIds.reduce((count, id) => {
            const strId = String(id);
            const sub = state.subordinates.find(s => String(s.id) === strId);
            if (sub) {
                state.addedEmployees[type].unshift({ ...sub, status: status });
                return count + 1;
            }
            return count;
        }, 0);
        
        // Clear selection if from selection source
        if (source === 'selection') {
            state.selectedSubordinates[type].clear();
            renderSubordinateList(type);
        }
        
        renderEmployeeTable(type);
        
        // Show appropriate toast
        const statusLabel = {
            'not_ot': 'Not OT',
            'ot': 'OT',
            'absent': 'Absent',
            'leave': 'Leave'
        }[status] || status;
        
        if (source === 'group' && groupName) {
            showToast(`Loaded ${groupName} (${addedCount} employees as ${statusLabel})`, 'success');
        } else {
            showToast(`Added ${addedCount} employees as ${statusLabel}`, 'success');
        }
        
        closeStatusSelectModal();
    }

    function openPasscodeModal() {
        const modal = elements.passcodeModal;
        const passcodeInput = document.getElementById('late-filing-passcode');
        passcodeInput.value = '';
        passcodeInput.type = 'password';
        const icon = document.getElementById('toggle-passcode-icon');
        if (icon) {
            icon.className = 'fa-solid fa-eye';
        }
        document.getElementById('passcode-error').textContent = '';
        modal.classList.add('active');
    }

    document.getElementById('toggle-passcode-visibility').addEventListener('click', function () {
        const input = document.getElementById('late-filing-passcode');
        const icon = document.getElementById('toggle-passcode-icon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-solid fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fa-solid fa-eye';
        }
    });

    function openDuplicateModal(duplicates) {
        const modal = elements.duplicateModal;
        const tbody = document.getElementById('duplicate-tbody');
        
        const statusLabels = {
            'ot': 'OT',
            'not_ot': 'Not OT',
            'absent': 'Absent',
            'leave': 'Leave'
        };
        
        const shiftLabels = {
            'day': 'Day',
            'night': 'Night',
            'mid': 'Mid'
        };
        
        // All filing types now return existing_shift info for schedule display
        const hasScheduleInfo = duplicates.length > 0 && duplicates[0].existing_shift !== undefined;
        
        // Determine if this is a shifting filing based on date range (has date_to)
        const isShifting = duplicates.length > 0 && duplicates[0].existing_date_to !== null;
        
        tbody.innerHTML = duplicates.map(dup => {
            const dateRange = dup.existing_date_to 
                ? `${formatDate(dup.existing_date_from)} - ${formatDate(dup.existing_date_to)}`
                : formatDate(dup.existing_date_from);
            
            // Show existing shift and time for all filing types (both shifting and daily)
            if (hasScheduleInfo) {
                const existingShift = shiftLabels[dup.existing_shift] || dup.existing_shift || '-';
                const existingTime = dup.existing_time_in && dup.existing_time_out 
                    ? `${dup.existing_time_in} - ${dup.existing_time_out}` 
                    : '-';
                const existingStatus = statusLabels[dup.existing_status] || dup.existing_status || '-';
                
                return `
                    <tr>
                        <td>
                            <div class="employee-info">
                                <span class="employee-name">${dup.employee_name}</span>
                                <span class="employee-id">${dup.employee_id}</span>
                            </div>
                        </td>
                        <td>${dup.department || '-'}</td>
                        <td>${dateRange}</td>
                        <td>
                            <div class="existing-schedule-info">
                                <span class="schedule-shift">${existingShift} Shift</span>
                                <span class="schedule-time">${existingTime}</span>
                                ${!isShifting ? `<span class="schedule-status">${existingStatus}</span>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            // Fallback for legacy data without schedule info
            return `
                <tr>
                    <td>
                        <div class="employee-info">
                            <span class="employee-name">${dup.employee_name}</span>
                            <span class="employee-id">${dup.employee_id}</span>
                        </div>
                    </td>
                    <td>${dup.department || '-'}</td>
                    <td>${dateRange}</td>
                    <td><span class="status-badge status-${dup.existing_status}">${statusLabels[dup.existing_status] || dup.existing_status}</span></td>
                </tr>
            `;
        }).join('');
        
        // Update modal header/description based on filing type
        const modalHeader = modal.querySelector('.modal-header h3');
        const warningText = modal.querySelector('.duplicate-warning p');
        const lastColHeader = document.getElementById('duplicate-table-last-col');
        
        if (isShifting) {
            if (modalHeader) modalHeader.innerHTML = '<i class="fa-solid fa-copy"></i> Existing Shifting Schedule Found';
            if (warningText) warningText.textContent = 'The following subordinates already have shifting schedules for the same date range. Do you want to update their shift and time?';
            if (lastColHeader) lastColHeader.textContent = 'Current Schedule';
        } else {
            if (modalHeader) modalHeader.innerHTML = '<i class="fa-solid fa-copy"></i> Existing Daily Filing Found';
            if (warningText) warningText.textContent = 'The following subordinates already have overtime filings for the same date. Do you want to update their shift, time, and status?';
            if (lastColHeader) lastColHeader.textContent = 'Current Schedule';
        }
        
        modal.classList.add('active');
    }

    function openMissingShiftingModal(employees) {
        const modal = elements.missingShiftingModal;
        if (!modal) return;
        
        const tbody = document.getElementById('missing-shifting-tbody');
        
        tbody.innerHTML = employees.map(emp => `
            <tr>
                <td>${emp.employee_id}</td>
                <td>${emp.employee_name}</td>
                <td>${emp.department || '-'}</td>
            </tr>
        `).join('');
        
        modal.classList.add('active');
    }

    function highlightMissingShiftingRows(employees) {
        const missingIds = new Set(employees.map(e => String(e.employee_id)));
        const tbody = elements.dailyTbody;
        if (!tbody) return;
        
        // Remove existing highlights
        tbody.querySelectorAll('tr.missing-shifting').forEach(row => {
            row.classList.remove('missing-shifting');
        });
        
        // Add highlight to rows with missing shifting
        tbody.querySelectorAll('tr').forEach(row => {
            const empIdCell = row.querySelector('td:first-child .employee-id');
            if (empIdCell) {
                const empId = empIdCell.textContent.trim();
                if (missingIds.has(empId)) {
                    row.classList.add('missing-shifting');
                }
            }
        });
    }

    function clearMissingShiftingHighlights() {
        const tbody = elements.dailyTbody;
        if (!tbody) return;
        
        tbody.querySelectorAll('tr.missing-shifting').forEach(row => {
            row.classList.remove('missing-shifting');
        });
    }

    async function handleDuplicateUpdate() {
        closeModal(elements.duplicateModal);
        
        // Set update flag
        state.pendingFilingData.update_duplicates = true;
        
        // If past cutoff, show passcode modal
        if (state.isPastCutoff) {
            openPasscodeModal();
        } else {
            // Submit directly with update flag
            await submitFilingRequest(state.pendingFilingData);
        }
    }

    async function verifyAndSubmit() {
        const passcode = document.getElementById('late-filing-passcode').value;
        
        if (!passcode) {
            document.getElementById('passcode-error').textContent = 'Please enter passcode';
            return;
        }

        try {
            const response = await fetch('/overtime/api/verify-passcode/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ passcode })
            });
            const data = await response.json();

            if (data.valid) {
                closeModal(elements.passcodeModal);
                state.pendingFilingData.passcode = passcode;
                await submitFilingRequest(state.pendingFilingData);
                state.pendingFilingData = null;
            } else {
                document.getElementById('passcode-error').textContent = 'Invalid passcode';
            }
        } catch (error) {
            document.getElementById('passcode-error').textContent = 'Verification failed';
        }
    }

    let successModalTimeout = null;

    function showSuccessModal(message) {
        const modal = elements.successModal;
        const messageEl = document.getElementById('success-message');
        const countdownEl = document.getElementById('success-countdown');
        
        if (messageEl) messageEl.textContent = message;
        
        // Clear any existing timeout
        if (successModalTimeout) {
            clearTimeout(successModalTimeout);
        }
        
        modal.classList.add('active');
        
        // Start countdown
        let countdown = 10;
        if (countdownEl) countdownEl.textContent = countdown;
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdownEl) countdownEl.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                closeModal(modal);
            }
        }, 1000);
        
        // Store interval for cleanup
        modal.countdownInterval = countdownInterval;
        
        // Also set backup timeout
        successModalTimeout = setTimeout(() => {
            clearInterval(countdownInterval);
            closeModal(modal);
        }, 10000);
    }

    function closeSuccessModal() {
        const modal = elements.successModal;
        
        // Clear countdown interval
        if (modal.countdownInterval) {
            clearInterval(modal.countdownInterval);
        }
        
        // Clear timeout
        if (successModalTimeout) {
            clearTimeout(successModalTimeout);
            successModalTimeout = null;
        }
        
        closeModal(modal);
    }

    function closeModal(modal) {
        // Add closing class for zoom out animation
        modal.classList.add('closing');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            modal.classList.remove('active');
            modal.classList.remove('closing');
        }, 250);
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatFilingType(type) {
        const types = {
            shifting: 'Shifting',
            daily: 'Daily',
            saturday_off: 'Saturday Off',
            sunday: 'Sunday',
            holiday: 'Holiday'
        };
        return types[type] || type;
    }

    function formatShift(shift) {
        const shifts = { day: 'Day', night: 'Night', mid: 'Mid' };
        return shifts[shift] || shift;
    }

    function formatStatus(status) {
        const statuses = { not_ot: 'Not OT', ot: 'OT', absent: 'Absent', leave: 'Leave' };
        return statuses[status] || status;
    }

    function getStatusClass(status) {
        const classes = {
            not_ot: 'status-gray',
            ot: 'status-green',
            absent: 'status-red',
            leave: 'status-yellow'
        };
        return classes[status] || 'status-gray';
    }

    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
               document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.log(`${type}: ${message}`);
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
        
        toast.style.animation = 'slideInRight 0.3s ease';
        
        const closeBtn = toast.querySelector('.close-btn');
        closeBtn.addEventListener('click', function() {
            removeToast(toast);
        });
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            removeToast(toast);
        }, 3000);
    }

    function removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }

    function initEventListeners() {
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.tabBtns.forEach(b => b.classList.remove('active'));
                elements.tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

                if (btn.dataset.tab === 'groups') fetchGroups();
                if (btn.dataset.tab === 'history') fetchHistory();
            });
        });

        elements.shiftingSearch?.addEventListener('input', () => renderSubordinateList('shifting'));
        elements.dailySearch?.addEventListener('input', () => renderSubordinateList('daily'));

        elements.addSelectedShifting?.addEventListener('click', () => addSelectedEmployees('shifting'));
        elements.addSelectedDaily?.addEventListener('click', () => addSelectedEmployees('daily'));

        elements.clearAllShifting?.addEventListener('click', () => clearAllEmployees('shifting'));
        elements.clearAllDaily?.addEventListener('click', () => clearAllEmployees('daily'));

        elements.submitShifting?.addEventListener('click', () => submitFiling('shifting'));
        elements.submitDaily?.addEventListener('click', () => submitFiling('daily'));

        document.getElementById('create-group-btn')?.addEventListener('click', () => openGroupModal());
        document.getElementById('close-group-modal')?.addEventListener('click', () => closeModal(elements.groupModal));
        document.getElementById('cancel-group-modal')?.addEventListener('click', () => closeModal(elements.groupModal));
        document.getElementById('save-group')?.addEventListener('click', saveGroup);

        // Groups search event listener
        document.getElementById('groups-search')?.addEventListener('input', () => renderGroups());

        // Group details modal close button
        document.getElementById('group-details-modal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                closeGroupDetailsModal();
            }
        });
        document.querySelector('.JO-modal-close')?.addEventListener('click', closeGroupDetailsModal);

        document.getElementById('group-subordinate-search')?.addEventListener('input', () => {
            renderGroupSubordinateList();
        });

        document.getElementById('load-from-group-btn-shifting')?.addEventListener('click', () => openLoadGroupModal('shifting'));
        document.getElementById('load-from-group-btn-daily')?.addEventListener('click', () => openLoadGroupModal('daily'));

        document.getElementById('close-load-group-modal')?.addEventListener('click', () => closeModal(elements.loadGroupModal));
        document.getElementById('cancel-load-group-modal')?.addEventListener('click', () => closeModal(elements.loadGroupModal));

        document.getElementById('close-passcode-modal')?.addEventListener('click', () => closeModal(elements.passcodeModal));
        document.getElementById('cancel-passcode-modal')?.addEventListener('click', () => closeModal(elements.passcodeModal));
        document.getElementById('verify-passcode-btn')?.addEventListener('click', verifyAndSubmit);

        // Duplicate modal event listeners
        document.getElementById('close-duplicate-modal')?.addEventListener('click', () => closeModal(elements.duplicateModal));
        document.getElementById('cancel-duplicate-modal')?.addEventListener('click', () => closeModal(elements.duplicateModal));
        document.getElementById('update-duplicates-btn')?.addEventListener('click', handleDuplicateUpdate);

        // Missing shifting modal event listeners
        document.getElementById('close-missing-shifting-modal')?.addEventListener('click', () => closeModal(elements.missingShiftingModal));
        document.getElementById('close-missing-shifting-btn')?.addEventListener('click', () => closeModal(elements.missingShiftingModal));

        // Status select modal event listeners
        document.getElementById('close-status-select-modal')?.addEventListener('click', closeStatusSelectModal);
        document.getElementById('cancel-status-select-modal')?.addEventListener('click', closeStatusSelectModal);
        document.getElementById('confirm-status-select-btn')?.addEventListener('click', confirmStatusSelection);

        document.getElementById('cancel-confirm-modal')?.addEventListener('click', () => closeModal(elements.confirmModal));

        // Success modal close handlers
        document.getElementById('close-success-modal')?.addEventListener('click', () => closeSuccessModal());
        document.getElementById('close-success-btn')?.addEventListener('click', () => closeSuccessModal());

        document.getElementById('history-filter-type')?.addEventListener('change', fetchHistory);
        document.getElementById('history-filter-date')?.addEventListener('change', fetchHistory);
        document.getElementById('history-search')?.addEventListener('input', () => {
            state.historyCurrentPage = 1;
            renderHistory();
        });

        document.getElementById('daily-filing-type')?.addEventListener('change', (e) => {
            const type = e.target.value;
            const cutoffInfo = document.getElementById('daily-cutoff-info');
            const cutoffs = {
                daily: 'Cutoff: 11:00 AM',
                saturday_off: 'Cutoff: Every Friday',
                sunday: 'Cutoff: Every Friday',
                holiday: 'Cutoff: Day before holiday'
            };
            cutoffInfo.querySelector('span').textContent = cutoffs[type] || '';
        });

        // Re-check shifting status when daily date changes
        document.getElementById('daily-date')?.addEventListener('change', () => {
            if (state.addedEmployees['daily'].length > 0) {
                checkAndHighlightMissingShifting();
            }
        });
    }

    function initDefaultValues() {
        // Set default date to today (using local timezone)
        const now = new Date();
        const today = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0');
        
        // Daily tab defaults
        const dailyDate = document.getElementById('daily-date');
        const dailyTimeIn = document.getElementById('daily-time-in');
        const dailyTimeOut = document.getElementById('daily-time-out');
        
        if (dailyDate) dailyDate.value = today;
        if (dailyTimeIn) dailyTimeIn.value = '16:00'; // 4:00 PM
        if (dailyTimeOut) dailyTimeOut.value = '18:00'; // 6:00 PM
        
        // Shifting tab defaults
        const shiftingTimeIn = document.getElementById('shifting-time-in');
        const shiftingTimeOut = document.getElementById('shifting-time-out');
        
        if (shiftingTimeIn) shiftingTimeIn.value = '07:00'; // 7:00 AM
        if (shiftingTimeOut) shiftingTimeOut.value = '16:00'; // 4:00 PM
    }

    function init() {
        initDefaultValues();
        fetchSubordinates();
        fetchAllShuttleUsers();
        fetchGroups();
        fetchHistory();
        initEventListeners();
    }

    init();
});