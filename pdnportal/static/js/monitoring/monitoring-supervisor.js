let performanceChart;
let currentGroupToDelete = null;
let currentGroupToEdit = null;

const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

document.addEventListener('DOMContentLoaded', function() {
    initPerformanceChart();
    initEventListeners();
    initSearch();
});

function initPerformanceChart() {
    const ctx = document.getElementById('performance-chart')?.getContext('2d');
    if (!ctx) return;

    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Target Output',
                    data: [],
                    type: 'bar',
                    backgroundColor: 'rgba(0, 70, 255, 0.8)',
                    borderColor: 'rgba(0, 70, 255, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 40,
                    order: 2,
                    shadowOffsetX: 3,
                    shadowOffsetY: 3,
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.2)'
                },
                {
                    label: 'Current Output',
                    data: [],
                    type: 'line',
                    borderColor: 'rgba(120, 200, 65, 1)',
                    backgroundColor: 'rgba(120, 200, 65, 0.3)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(120, 200, 65, 1)',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.4,
                    fill: true,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 30,
                    left: 0
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: 'Poppins',
                            size: 13,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#333',
                    bodyColor: '#333',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' units';
                        }
                    }
                }
            },
            scales: {
                x: {
                    offset: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false,
                        offset: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Poppins',
                            size: 11
                        },
                        maxRotation: 0,
                        minRotation: 0
                    }
                },
                y: {
                    position: 'left',
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: true,
                        borderColor: '#ddd',
                        borderWidth: 1
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Poppins',
                            size: 11
                        },
                        callback: function(value) {
                            // Show only whole numbers
                            if (Math.floor(value) === value) {
                                return value.toLocaleString();
                            }
                            return '';
                        },
                        stepSize: 1,
                        padding: 5
                    },
                    beginAtZero: true
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    loadChartData();
}

function loadChartData() {
    const timeRange = document.getElementById('time-range-filter')?.value || 'week';
    const groupId = document.getElementById('group-filter')?.value || 'all';

    const url = new URL('/monitoring/facilitator/chart-data/', window.location.origin);
    url.searchParams.set('timeRange', timeRange);
    url.searchParams.set('groupId', groupId);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Animate chart update
            if (performanceChart) {
                performanceChart.data.labels = data.labels;
                performanceChart.data.datasets[0].data = data.target;
                performanceChart.data.datasets[1].data = data.actual;
                performanceChart.update('active');
            }
        })
        .catch(error => {
            console.error('Error loading chart data:', error);
            showToast('Error loading chart data', 'error');
        });
}

function initEventListeners() {
    const createGroupBtn = document.getElementById('create-group-btn');
    const createFirstGroupBtn = document.getElementById('create-first-group-btn');
    const createGroupModal = document.getElementById('create-group-modal');
    const editGroupModal = document.getElementById('edit-group-modal');
    const deleteGroupModal = document.getElementById('delete-group-modal');

    [createGroupBtn, createFirstGroupBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                createGroupModal.classList.add('active');
            });
        }
    });

    document.querySelectorAll('.JO-modal-close, #cancel-create-group, #cancel-edit-group, #cancel-delete-group').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.JO-modal').classList.remove('active');
        });
    });

    const createGroupForm = document.getElementById('create-group-form');
    if (createGroupForm) {
        createGroupForm.addEventListener('submit', handleCreateGroup);
    }

    const editGroupForm = document.getElementById('edit-group-form');
    if (editGroupForm) {
        editGroupForm.addEventListener('submit', handleEditGroup);
    }

    // Use event delegation for dynamically loaded buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-group-btn')) {
            handleEditGroupClick(e);
        }
        if (e.target.closest('.delete-group-btn')) {
            handleDeleteGroupClick(e);
        }
        if (e.target.closest('.view-dashboard-btn')) {
            const groupId = e.target.closest('.view-dashboard-btn').dataset.id;
            window.location.href = `/monitoring/facilitator/group/${groupId}/`;
        }
    });

    const confirmDeleteBtn = document.getElementById('confirm-delete-group');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    }

    const timeRangeFilter = document.getElementById('time-range-filter');
    const groupFilter = document.getElementById('group-filter');

    [timeRangeFilter, groupFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', loadChartData);
        }
    });
}

function handleCreateGroup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    fetch(e.target.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => {
        if (response.ok) {
            showToast('Monitoring group created successfully!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error('Failed to create group');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error creating monitoring group', 'error');
    });
}

function handleEditGroupClick(e) {
    const groupId = e.target.closest('.edit-group-btn').dataset.id;
    currentGroupToEdit = groupId;
    
    // Fetch group data and available lines/supervisors
    Promise.all([
        fetch(`/monitoring/get-group/${groupId}/`).then(r => r.json()),
        fetch(`/monitoring/get-available-options/${groupId}/`).then(r => r.json())
    ])
    .then(([groupData, optionsData]) => {
        if (groupData.status === 'error') {
            throw new Error(groupData.message);
        }
        
        // Populate form fields
        document.getElementById('edit-title').value = groupData.title;
        document.getElementById('edit-description').value = groupData.description || '';
        document.getElementById('edit-status').value = groupData.group_status;
        
        // Populate lines checkboxes
        const linesContainer = document.getElementById('edit-lines-container');
        linesContainer.innerHTML = '';
        
        if (optionsData.available_lines && optionsData.available_lines.length > 0) {
            optionsData.available_lines.forEach(line => {
                const isChecked = groupData.line_ids.includes(line.id);
                const checkboxItem = document.createElement('div');
                checkboxItem.className = 'FD-checkbox-item';
                checkboxItem.innerHTML = `
                    <input type="checkbox" id="edit-line-${line.id}" name="lines" value="${line.id}" ${isChecked ? 'checked' : ''}>
                    <label for="edit-line-${line.id}">${line.line_name}</label>
                `;
                linesContainer.appendChild(checkboxItem);
            });
        } else {
            linesContainer.innerHTML = '<div class="empty-state"><p>No available lines</p></div>';
        }
        
        // Populate supervisors checkboxes
        const supervisorsContainer = document.getElementById('edit-supervisors-container');
        supervisorsContainer.innerHTML = '';
        
        if (optionsData.supervisors && optionsData.supervisors.length > 0) {
            optionsData.supervisors.forEach(supervisor => {
                const isChecked = groupData.supervisor_ids.includes(supervisor.id);
                const checkboxItem = document.createElement('div');
                checkboxItem.className = 'FD-checkbox-item';
                checkboxItem.innerHTML = `
                    <input type="checkbox" id="edit-supervisor-${supervisor.id}" name="supervisors" value="${supervisor.id}" ${isChecked ? 'checked' : ''}>
                    <label for="edit-supervisor-${supervisor.id}">${supervisor.name}</label>
                `;
                supervisorsContainer.appendChild(checkboxItem);
            });
        }
        
        document.getElementById('edit-group-modal').classList.add('active');
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error loading group data', 'error');
    });
}

function handleEditGroup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    fetch(`/monitoring/edit-group/${currentGroupToEdit}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Monitoring group updated successfully!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error(data.message || 'Failed to update group');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(error.message || 'Error updating monitoring group', 'error');
    });
}

function handleDeleteGroupClick(e) {
    const groupId = e.target.closest('.delete-group-btn').dataset.id;
    
    currentGroupToDelete = groupId;
    
    document.getElementById('delete-group-modal').classList.add('active');
}

function handleConfirmDelete() {
    if (!currentGroupToDelete) return;
    
    fetch(`/monitoring/delete-group/${currentGroupToDelete}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Monitoring group deleted successfully!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error(data.message || 'Failed to delete group');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error deleting monitoring group', 'error');
    })
    .finally(() => {
        document.getElementById('delete-group-modal').classList.remove('active');
        currentGroupToDelete = null;
    });
}

function initSearch() {
    const searchInput = document.getElementById('groups-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const groupCards = document.querySelectorAll('.FD-group-card');
        
        groupCards.forEach(card => {
            const title = card.dataset.groupTitle;
            if (title.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

function showToast(message, type = 'info', duration = 3000) {
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
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    toast.classList.add('hiding');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}