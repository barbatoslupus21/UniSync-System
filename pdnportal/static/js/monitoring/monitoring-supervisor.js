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
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Target',
                    data: [],
                    borderColor: 'rgba(255, 193, 7, 1)',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    pointBackgroundColor: 'rgba(255, 193, 7, 1)',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: 'Actual',
                    data: [],
                    borderColor: 'rgba(51, 102, 255, 1)',
                    backgroundColor: 'rgba(51, 102, 255, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(51, 102, 255, 1)',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    tension: 0.3,
                    fill: true
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
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: 'Poppins',
                            size: 12
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
                    cornerRadius: 6,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' units';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Poppins',
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Poppins',
                            size: 10
                        },
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    beginAtZero: true
                }
            },
            animation: {
                duration: 800,
                easing: 'easeInOutQuart',
                animateRotate: true,
                animateScale: true
            }
        }
    });

    loadChartData();
}

function loadChartData() {
    const timeRange = document.getElementById('time-range-filter')?.value || 'today';
    const groupId = document.getElementById('group-filter')?.value || 'all';

    const url = new URL('/monitoring/facilitator/chart-data/', window.location.origin);
    url.searchParams.set('timeRange', timeRange);
    url.searchParams.set('groupId', groupId);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Animate out old data
            if (performanceChart) {
                performanceChart.options.animation = {
                    duration: 800,
                    easing: 'easeInOutQuart',
                    animateRotate: true,
                    animateScale: true
                };
                performanceChart.data.labels = data.labels;
                performanceChart.data.datasets[0].data = data.target;
                performanceChart.data.datasets[1].data = data.actual;
                performanceChart.update();
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

    document.querySelectorAll('.edit-group-btn').forEach(btn => {
        btn.addEventListener('click', handleEditGroupClick);
    });

    document.querySelectorAll('.delete-group-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteGroupClick);
    });

    document.querySelectorAll('.view-detail-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const groupId = e.target.dataset.groupId;
            window.location.href = `/monitoring/facilitator/group/${groupId}/`;
        });
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
    const groupId = e.target.closest('.edit-group-btn').dataset.groupId;
    currentGroupToEdit = groupId;
    
    fetch(`/monitoring/get-group/${groupId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'error') {
                throw new Error(data.message);
            }
            
            document.getElementById('edit-title').value = data.title;
            document.getElementById('edit-description').value = data.description;
            document.getElementById('edit-status').value = data.group_status;
            
            document.querySelectorAll('#edit-lines-container input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = data.line_ids.includes(parseInt(checkbox.value));
            });
            
            document.querySelectorAll('#edit-supervisors-container input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = data.supervisor_ids.includes(parseInt(checkbox.value));
            });
            
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
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => {
        if (response.ok) {
            showToast('Monitoring group updated successfully!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error('Failed to update group');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error updating monitoring group', 'error');
    });
}

function handleDeleteGroupClick(e) {
    const groupId = e.target.closest('.delete-group-btn').dataset.groupId;
    const groupCard = e.target.closest('.FD-group-card');
    
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