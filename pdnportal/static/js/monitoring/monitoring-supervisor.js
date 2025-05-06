document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations and components
    initializeAnimations();
    initializeCharts();
    setupEventListeners();
    addToastStyles();

    setupChartFilterEvents();
    
    // Also set up event listeners for when group details are loaded
    document.addEventListener('groupDetailsLoaded', function() {
        // Make sure chart filters are set up properly
        setupChartFilterEvents();
    });
    
    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', function() {
            updateOutputChart(this.value);
        });
        
        updateOutputChart(periodSelector.value);
    }
    

    document.addEventListener('scheduleTabShown', function() {
        console.log('Schedule tab is now active');
        setupScheduleFilterListeners();
        
        // Clear date filter and refresh the list
        const dateFilter = document.getElementById('schedule-date');
        if (dateFilter) {
            dateFilter.value = '';
            const event = new Event('change');
            dateFilter.dispatchEvent(event);
        }
    });
    
    const cancelDeleteBtn = document.getElementById('cancel-delete-product');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeDeleteConfirmation();
        });
    }

    // Set up auto-refresh for charts every 5 minutes
    setupChartAutoRefresh();
    setupChartEventListeners();
    setupProductTabEventListeners();
    setupScheduleTabEventListeners();
    setupProductActions();
    exposeUserPermissions();
    setupAutoUpdate();
});

// ========================================================================
// Animation & UI Initialization
// ========================================================================

function initializeAnimations() {
    // Animate stats cards
    const statsCards = document.querySelectorAll('.PM-stats-card');
    statsCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('animated');
        }, 100 * index);
    });

    // Animate group cards
    const groupCards = document.querySelectorAll('.PM-group-card');
    groupCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        }, 150 * index);
    });
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

function initializeDetailChart() {
  const detailCtx = document.getElementById('detail-performance-chart');
  
  if (!detailCtx) {
      console.error('Detail performance chart canvas not found');
      return null;
  }
  
  // Start with empty data - will be populated via API call
  const labels = [];
  const outputData = [];
  const planData = [];
  
  detailPerformanceChart = new Chart(detailCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Actual Output',
          data: outputData,
          backgroundColor: 'rgba(51, 102, 255, 0.7)',
          borderColor: 'rgba(51, 102, 255, 1)',
          borderWidth: 1,
          borderRadius: 4,
          categoryPercentage: 0.6,
          barPercentage: 0.8
        },
        {
          label: 'Target Output',
          data: planData,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          borderRadius: 4,
          categoryPercentage: 0.6,
          barPercentage: 0.8
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
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat().format(context.parsed.y);
              }
              return label;
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
            callback: function(value) {
              return new Intl.NumberFormat().format(value);
            }
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
  
  return detailPerformanceChart;
}

function initializeOutputChart() {
  const canvas = document.getElementById('output-chart');

  if (!canvas) {
      console.error("Chart canvas element 'output-chart' not found!");
      return;
  }

  const ctx = canvas.getContext('2d');

  console.log("Initializing output chart with context:", ctx);

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const actualData = [3200, 3500, 3100, 3800, 4200, 3600, 3900];
  const targetData = [3500, 3500, 3500, 3500, 3500, 3500, 3500];

  // Gradient for Actual Output
  const gradientActual = ctx.createLinearGradient(0, 0, 0, 400);
  gradientActual.addColorStop(0, 'rgba(51, 102, 255, 0.8)');
  gradientActual.addColorStop(1, 'rgba(51, 102, 255, 0.2)');

  // Gradient for Target Output
  const gradientTarget = ctx.createLinearGradient(0, 0, 0, 400);
  gradientTarget.addColorStop(0, 'rgba(255, 99, 132, 0.8)');
  gradientTarget.addColorStop(1, 'rgba(255, 99, 132, 0.2)');
    
    outputChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Actual Output',
                    data: actualData,
                    borderColor: 'rgba(51, 102, 255, 1)',
                    backgroundColor: gradientActual,
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(51, 102, 255, 1)',
                    pointRadius: 3,
                    tension: 0.3,
                    fill: 'origin'
                },
                {
                    label: 'Target Output',
                    data: targetData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: gradientTarget,
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointRadius: 3,
                    tension: 0.1,
                    fill: 'origin'
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
                    intersect: false
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
                        stepSize: 500
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Load initial chart data
    updateOutputChart('month');
}

function updateOutputChart(period, isAutoRefresh = false) {
  if (!outputChart) return;
  
  // Show loading animation
  const chartWrapper = document.querySelector('.PM-chart-wrapper');
  chartWrapper.classList.add('loading');
  
  // Get chart data from server
  fetch(`/monitoring/chart-data/${period}/`)
      .then(response => {
          if (!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json();
      })
      .then(data => {
          console.log("Chart data received:", data); // Add this line to debug
          
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
              easing: 'easeOutBounce'
          });
          
          // Remove loading animation
          chartWrapper.classList.remove('loading');
          
          // If this is an auto-refresh, show a subtle indicator
          if (isAutoRefresh) {
              // Show refresh indicator logic...
          }
      })
      .catch(error => {
          console.error('Error fetching chart data:', error);
          chartWrapper.classList.remove('loading');
          
          // Show error message
          createToast('Failed to load chart data. Please try again.', 'error');
      });
}

function setupChartFilterEvents() {
  // Get filter elements
  const dateFilter = document.getElementById('chart-date-filter');
  const shiftFilter = document.getElementById('chart-shift-filter');
  const lineSelector = document.getElementById('line-selector');
  
  // Function to update chart based on current filters
  const updateChartWithFilters = () => {
      const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
      if (!groupId) return;
      
      const selectedLine = lineSelector ? lineSelector.value : 'total';
      
      if (!selectedLine || selectedLine === 'total') {
          fetchGroupPerformanceData(groupId);
      } else {
          updateLineChart(groupId, selectedLine);
      }
  };
  
  // Add event listeners to filters
  if (dateFilter) {
      dateFilter.addEventListener('change', updateChartWithFilters);
  }
  
  if (shiftFilter) {
      shiftFilter.addEventListener('change', updateChartWithFilters);
  }
  
  if (lineSelector) {
      lineSelector.addEventListener('change', updateChartWithFilters);
  }
}

// ========================================================================
// Tab Switching in Detail View
// ========================================================================
function switchTab(tabId) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll('.PM-tab-content');
  tabContents.forEach(content => {
      content.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  const tabButtons = document.querySelectorAll('.PM-tab-button');
  tabButtons.forEach(button => {
      button.classList.remove('active');
  });
  
  // Show the selected tab content
  const selectedTab = document.getElementById(`${tabId}-tab`);
  if (selectedTab) {
      selectedTab.classList.add('active');
  }
  
  // Add active class to the clicked tab button
  const activeButton = document.querySelector(`.PM-tab-button[data-tab="${tabId}"]`);
  if (activeButton) {
      activeButton.classList.add('active');
  }
  
  // Special handling for tabs
  if (tabId === 'performance' && detailPerformanceChart) {
      // Update performance chart
      detailPerformanceChart.update();
  }
  else if (tabId === 'schedule') {
      // Fire a custom event for the schedule tab
      document.dispatchEvent(new CustomEvent('scheduleTabShown'));
      console.log('Schedule tab activated, initializing filters');
      
      // Initialize schedule filters
      setupScheduleFilterListeners();
  }
}

// ========================================================================
// Event Listeners & Interactive Functions
// ========================================================================

function setupEventListeners() {
    // Modal toggling
    setupModalListeners();
    
    // Line selection in the modals
    setupLineSelectionHandlers();
    
    // Search functionality for lines
    setupLineSearchFunctionality();
    
    // Search functionality for groups
    setupGroupSearch();
    
    // Filter functionality
    setupFilterListeners();
    
    // Refresh button animation
    setupRefreshButton();
    
    // Schedule filters
    setupScheduleFilterListeners();

    setupImportListeners();

    setupChartEventListeners();

    setupImportButtonHandlers();
    
    // View Details Button
    document.querySelectorAll('.PM-action-button.view-details').forEach(button => {
        button.addEventListener('click', (e) => {
            const groupId = e.currentTarget.getAttribute('data-id');
            loadGroupDetails(groupId);
        });
    });

    // Add Product Modal
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
        console.log('Add Product button clicked');
        const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
        if (groupId) {
            // Set the monitoring group ID in the modal form
            document.getElementById('product-group-id').value = groupId;
            
            // Get the modal and open it
            const modal = document.getElementById('add-product-modal');
            if (modal) {
            // Make sure modal is displayed with higher z-index
            modal.style.display = 'block';
            modal.style.zIndex = '1002'; // Higher than view-details-modal
            modal.classList.add('active');
            } else {
            console.error('Add Product modal not found');
            }
        } else {
            console.error('Group ID not found');
            createToast('Could not determine which group to add product to.', 'error');
        }
        });
    }

    // Add Schedule Modal
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    if (addScheduleBtn) {
        addScheduleBtn.addEventListener('click', function() {
        console.log('Add Product button clicked');
        const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
        if (groupId) {
            // Set the monitoring group ID in the modal form
            document.getElementById('schedule-group-id').value = groupId;
            
            // Get the modal and open it
            const modal = document.getElementById('add-schedule-modal');
            if (modal) {
            // Make sure modal is displayed with higher z-index
            modal.style.display = 'block';
            modal.style.zIndex = '1002';
            modal.classList.add('active');
            } else {
            console.error('Add Product modal not found');
            }
        } else {
            console.error('Group ID not found');
            createToast('Could not determine which group to add product to.', 'error');
        }
        });
    }

    // Line selector in performance tab
    const lineSelector = document.getElementById('line-selector');
    if (lineSelector) {
        lineSelector.addEventListener('change', function() {
            const selectedLine = this.value;
            const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
            
            if (selectedLine && groupId) {
                updateLineChart(groupId, selectedLine);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
  // Fix the Add Schedule button
  const addScheduleBtn = document.getElementById('add-schedule-btn');
  if (addScheduleBtn) {
    // Remove any existing event listeners
    const newAddButton = addScheduleBtn.cloneNode(true);
    addScheduleBtn.parentNode.replaceChild(newAddButton, addScheduleBtn);
    
    // Add fresh event listener
    newAddButton.addEventListener('click', function() {
      const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
      if (groupId) {
        // Set the monitoring group ID in the modal form
        document.getElementById('schedule-group-id').value = groupId;
        
        // Reset form
        const form = document.getElementById('add-schedule-form');
        if (form) {
          form.reset();
          form.action = '/monitoring/add-schedule/';
        }
        
        // Update modal title and button text for add mode
        const modalTitle = document.querySelector('#add-schedule-modal .PM-modal-header h2');
        if (modalTitle) {
          modalTitle.textContent = 'Add Production Schedule';
        }
        
        const saveButton = document.getElementById('save-schedule');
        if (saveButton) {
          saveButton.textContent = 'Add Schedule';
        }
        
        // Show modal
        const modal = document.getElementById('add-schedule-modal');
        if (modal) {
          modal.style.display = 'block';
          modal.classList.add('active');
        }
      } else {
        createToast('Could not determine which group to add schedule to.', 'error');
      }
    });
  }
  
  // Make sure closing the schedule modal works correctly
  const closeButtons = document.querySelectorAll('#add-schedule-modal .PM-modal-close, #cancel-schedule');
  closeButtons.forEach(button => {
    button.addEventListener('click', function() {
      const modal = document.getElementById('add-schedule-modal');
      if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
          modal.style.display = 'none';
        }, 300);
      }
    });
  });
});

function setupModalListeners() {
    // Open modals
    const newGroupBtn = document.getElementById('new-group-btn');
    const emptyCreateBtn = document.getElementById('empty-create-btn');
    const newGroupModal = document.getElementById('new-group-modal');
    
    if (newGroupBtn && newGroupModal) {
        newGroupBtn.addEventListener('click', function() {
            openModal(newGroupModal);
        });
    }
    
    if (emptyCreateBtn && newGroupModal) {
        emptyCreateBtn.addEventListener('click', function() {
            openModal(newGroupModal);
        });
    }
    
    // Open Dashboard button
    const openDashboardBtn = document.getElementById('open-dashboard-btn');
    if (openDashboardBtn) {
        openDashboardBtn.addEventListener('click', function() {
            const groupId = this.getAttribute('data-id');
            if (groupId) {
                window.open(`/monitoring/group-dashboard/${groupId}/`, '_blank');
            }
        });
    }
    
    // Edit group buttons
    const editGroupButtons = document.querySelectorAll('.edit-group');
    const editGroupModal = document.getElementById('edit-group-modal');
    
    if (editGroupButtons.length > 0 && editGroupModal) {
        editGroupButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const groupId = this.getAttribute('data-id');
                loadGroupForEditing(groupId);
            });
        });
    }
    
    // Edit from details
    const editFromDetailsBtn = document.getElementById('edit-from-details');
    if (editFromDetailsBtn && editGroupModal) {
        editFromDetailsBtn.addEventListener('click', function() {
            const groupId = this.getAttribute('data-id');
            if (groupId) {
                closeModal(document.getElementById('view-details-modal'));
                
                // Add delay to allow animation to complete
                setTimeout(() => {
                    loadGroupForEditing(groupId);
                }, 300);
            }
        });
    }
    
    // Close buttons for all modals
    const closeButtons = document.querySelectorAll('.PM-modal-close, #cancel-group, #cancel-edit, .close-details, #cancel-product, #cancel-schedule, #cancel-output');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.PM-modal');
            closeModal(modal);
        });
    });
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('PM-modal')) {
            closeModal(e.target);
        }
    });

    // Add form submission handler for edit group form
    const editGroupForm = document.getElementById('edit-group-form');
    if (editGroupForm) {
        editGroupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get all form data
            const formData = new FormData(this);
            
            // Add CSRF token
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            formData.append('csrfmiddlewaretoken', csrfToken);
            
            // Get the group ID from the hidden input
            const groupId = document.getElementById('edit-group-id').value;
            
            // Send the request
            fetch(`/monitoring/edit-group/${groupId}/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': csrfToken
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    createToast('Group updated successfully!', 'success');
                    closeModal(editGroupModal);
                    // Refresh the page to show updated data
                    window.location.reload();
                } else {
                    throw new Error(data.message || 'Failed to update group');
                }
            })
            .catch(error => {
                console.error('Error updating group:', error);
                createToast(error.message || 'Failed to update group. Please try again.', 'error');
            });
        });
    }

    document.querySelectorAll('#import-schedule-modal .PM-modal-close, #import-product-modal .PM-modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.PM-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        });
    });
    
    // Get all cancel buttons
    document.querySelectorAll('#cancel-schedule-import, #cancel-product-import').forEach(cancelBtn => {
        cancelBtn.addEventListener('click', function() {
            const modal = this.closest('.PM-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        });
    });
}

function setupLineSelectionHandlers() {
    // Add lines to selected list
    const addLinesBtn = document.getElementById('add-lines');
    const editAddLinesBtn = document.getElementById('edit-add-lines');
    
    if (addLinesBtn) {
        addLinesBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('#available-lines input[type="checkbox"]:checked');
            moveSelectedLines(checkboxes, '#available-lines', '#selected-lines');
        });
    }
    
    if (editAddLinesBtn) {
        editAddLinesBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('#edit-available-lines input[type="checkbox"]:checked');
            moveSelectedLines(checkboxes, '#edit-available-lines', '#edit-selected-lines');
        });
    }
}

function setupLineSearchFunctionality() {
    const linesSearch = document.getElementById('lines-search');
    const editLinesSearch = document.getElementById('edit-lines-search');
    
    if (linesSearch) {
        linesSearch.addEventListener('input', function() {
            filterLines(this.value, '#available-lines .PM-line-item');
        });
    }
    
    if (editLinesSearch) {
        editLinesSearch.addEventListener('input', function() {
            filterLines(this.value, '#edit-available-lines .PM-line-item');
        });
    }
}

function setupGroupSearch() {
    const searchInput = document.querySelector('.PM-search-input');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const groupCards = document.querySelectorAll('.PM-group-card');
        
        groupCards.forEach(card => {
            const groupName = card.querySelector('h3').textContent.toLowerCase();
            const lines = Array.from(card.querySelectorAll('.PM-line-tag')).map(tag => tag.textContent.toLowerCase());
            
            // Check if search term matches group name or any line
            const matches = groupName.includes(searchTerm) || lines.some(line => line.includes(searchTerm));
            
            if (matches) {
                card.style.display = '';
                
                // Add highlight animation if it's not already applied
                if (!card.classList.contains('search-highlight')) {
                    card.classList.add('search-highlight');
                    setTimeout(() => {
                        card.classList.remove('search-highlight');
                    }, 1000);
                }
            } else {
                card.style.display = 'none';
            }
        });
    });
}

function setupFilterListeners() {
    const filterSelect = document.querySelector('.PM-filter-select');
    
    if (!filterSelect) return;
    
    filterSelect.addEventListener('change', function() {
        const selectedStatus = this.value;
        const groupCards = document.querySelectorAll('.PM-group-card');
        
        groupCards.forEach(card => {
            if (selectedStatus === 'all') {
                card.style.display = '';
            } else {
                const cardStatus = card.getAttribute('data-status');
                
                if (cardStatus === selectedStatus) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    });
    
    // Shift selector in activity list
    const shiftSelector = document.getElementById('shift-selector');
    if (shiftSelector) {
        shiftSelector.addEventListener('change', function() {
            const selectedShift = this.value;
            const activityItems = document.querySelectorAll('.PM-activity-item');
            
            activityItems.forEach(item => {
                const timeText = item.querySelector('.PM-activity-time').textContent.toLowerCase();
                
                if (selectedShift === 'all' || timeText.includes(selectedShift.toLowerCase())) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

function setupRefreshButton() {
    const refreshBtn = document.querySelector('.PM-refresh-btn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            icon.classList.add('PM-spin');
            
            // Simulate refresh action
            setTimeout(() => {
                icon.classList.remove('PM-spin');
                createToast('Activity list refreshed', 'info');
                
                // Reload the page to get the latest activities
                window.location.reload();
            }, 1000);
        });
    }
}

function createToast(message, type = 'info', duration = 3000) {
  // Check if toast container exists, if not create it
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
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
  
  toastContainer.appendChild(toast);
  
  // Add show class after a small delay for the animation to work
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Set up close button
  const closeBtn = toast.querySelector('.close-btn');
  closeBtn.addEventListener('click', function() {
    removeToast(toast);
  });
  
  // Auto remove after duration
  setTimeout(() => {
    removeToast(toast);
  }, duration);
}

// Fix for schedule table column alignment
function updateScheduleList(data) {
    console.log('Updating schedule list with data:', data);
    
    const scheduleList = document.querySelector('.PM-schedule-list');
    if (!scheduleList) {
      console.error('Schedule list element not found');
      return;
    }
    
    // Clear existing content except the header
    const header = scheduleList.querySelector('.PM-schedule-header');
    scheduleList.innerHTML = '';
    if (header) {
      scheduleList.appendChild(header);
    }
    
    // Check if there are any schedules
    if (!data.schedules || !Array.isArray(data.schedules) || data.schedules.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'PM-empty-state';
      emptyState.innerHTML = `
        <i class="fas fa-calendar-times"></i>
        <h3>No Schedules Found</h3>
        <p>No schedules have been added to this group yet.</p>
      `;
      scheduleList.appendChild(emptyState);
      return;
    }
    
    // Define column flex values for consistent alignment
    const columnFlexValues = {
      date: '1.5',
      product: '1.5',
      line: '1',
      shift: '0.7',
      planned: '1',
      produced: '1',
      balance: '1',
      status: '1',
      actions: '1'
    };
    
    // Add each schedule item
    data.schedules.forEach(schedule => {
      const scheduleItem = document.createElement('div');
      scheduleItem.className = 'PM-schedule-item';
      scheduleItem.setAttribute('data-id', schedule.id);
      
      // CRITICAL: Ensure data-date attribute uses consistent format (YYYY-MM-DD)
      let formattedDate = '';
      if (schedule.date_planned) {
        // Clean up date format - remove any time component
        let dateStr = schedule.date_planned;
        if (dateStr.includes('T')) {
          dateStr = dateStr.split('T')[0];
        }
        
        // Strip whitespace and ensure valid format
        dateStr = dateStr.trim();
        
        // Set data-date attribute
        scheduleItem.setAttribute('data-date', dateStr);
        
        // Parse date for display
        try {
          const dateObj = new Date(dateStr);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
          } else {
            formattedDate = dateStr; // Fallback to original string
          }
        } catch (e) {
          console.error('Error formatting date:', e);
          formattedDate = dateStr; // Fallback to original string
        }
      } else {
        formattedDate = 'N/A';
      }
      
      // Set other data attributes for filtering
      scheduleItem.setAttribute('data-shift', schedule.shift || '');
      scheduleItem.setAttribute('data-status', schedule.status || '');
      
      // Determine status class for visual styling
      let statusClass = 'active';
      if (schedule.status === 'Change Load') {
        statusClass = 'warning';
      } else if (schedule.status === 'Backlog') {
        statusClass = 'inactive';
      }
      
      scheduleItem.innerHTML = `
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.date}">${formattedDate}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.product}">${schedule.product || 'N/A'}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.line}">${schedule.line || 'N/A'}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.shift}">${schedule.shift || 'N/A'}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.planned}">${schedule.planned_qty || 0}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.produced}">${schedule.produced_qty || 0}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.balance}">${schedule.balance || 0}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.status}"><span class="PM-status ${statusClass}">${schedule.status || 'N/A'}</span></div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.actions}; text-align: center;">
          <div class="PM-product-actions">
            <button class="PM-edit-schedule-btn PM-product-action-btn PM-edit-btn" data-id="${schedule.id}" data-current-status="${schedule.status || ''}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="PM-delete-schedule-btn PM-product-action-btn PM-delete-btn" data-id="${schedule.id}" data-name="${schedule.product || 'this schedule'}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
      
      scheduleList.appendChild(scheduleItem);
    });
    
    // Setup action buttons
    setupScheduleActions();
    
    // Initialize filters with the new data
    initializeScheduleFilters();
  }
  
  // Replace the global function
  window.updateScheduleList = updateScheduleList;

// Helper function to format dates for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  // Check if the date is already in a readable format
  if (dateString.includes('/')) return dateString;
  
  // Try to parse the date (assuming YYYY-MM-DD format)
  try {
      const dateObj = new Date(dateString);
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
          return dateString; // Return original string if parsing fails
      }
      return dateObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
      });
  } catch (e) {
      console.error('Error formatting date:', e);
      return dateString; // Return original string if parsing fails
  }
}

// Fix schedule filters to show all dates, not just today
function setupScheduleFilterListeners() {
    const dateFilter = document.getElementById('schedule-date');
    const shiftFilter = document.getElementById('schedule-shift');
    const statusFilter = document.getElementById('schedule-status');
    
    if (!dateFilter || !shiftFilter || !statusFilter) {
      console.error('Schedule filter elements not found');
      return;
    }
    
    // Function to apply filters to schedule items
    const filterSchedule = () => {
      const selectedDate = dateFilter.value;
      const selectedShift = shiftFilter.value;
      const selectedStatus = statusFilter.value;
      
      console.log('Filtering schedules with:', {
        date: selectedDate,
        shift: selectedShift,
        status: selectedStatus
      });
      
      const scheduleList = document.querySelector('.PM-schedule-list');
      if (!scheduleList) return;
      
      // Remove any existing empty state
      const existingEmptyState = scheduleList.querySelector('.PM-empty-state');
      if (existingEmptyState) {
        existingEmptyState.remove();
      }
      
      const scheduleItems = scheduleList.querySelectorAll('.PM-schedule-item');
      let hasVisibleItems = false;
      
      // Create a standardized date string from the input value for comparison
      let standardSelectedDate = '';
      if (selectedDate) {
        // Convert the date to YYYY-MM-DD format for consistent comparison
        try {
          const dateParts = selectedDate.split('-');
          if (dateParts.length === 3) {
            standardSelectedDate = selectedDate; // Already in YYYY-MM-DD format
          }
        } catch (e) {
          console.error('Error parsing selected date:', e);
        }
      }
      
      scheduleItems.forEach(item => {
        // Get the date from the date column text (first column)
        const dateColumn = item.querySelector('.PM-schedule-col:first-child');
        const displayDateText = dateColumn ? dateColumn.textContent.trim() : '';
        
        // Get the raw date value from data attribute for more accurate filtering
        const rawDateValue = item.getAttribute('data-date') || '';
        
        // Get shift and status from the text content of respective columns
        const shiftColumn = item.querySelector('.PM-schedule-col:nth-child(4)');
        const itemShift = shiftColumn ? shiftColumn.textContent.trim() : '';
        
        const statusColumn = item.querySelector('.PM-schedule-col:nth-child(8) .PM-status');
        const itemStatus = statusColumn ? statusColumn.textContent.trim() : '';
        
        // Check for date match - compare with raw date value first (most accurate)
        let dateMatch = !selectedDate; // If no date selected, all dates match
        
        if (selectedDate && rawDateValue) {
          dateMatch = rawDateValue === standardSelectedDate;
          
          // If still no match, try to parse display date text as fallback
          if (!dateMatch && displayDateText) {
            try {
              // Parse the displayed date text (which might be in a different format)
              const displayDate = new Date(displayDateText);
              const selectedDateObj = new Date(selectedDate);
              
              // Check if both dates are valid and compare their components
              if (!isNaN(displayDate.getTime()) && !isNaN(selectedDateObj.getTime())) {
                dateMatch = displayDate.getFullYear() === selectedDateObj.getFullYear() &&
                            displayDate.getMonth() === selectedDateObj.getMonth() &&
                            displayDate.getDate() === selectedDateObj.getDate();
              }
            } catch (e) {
              console.error('Error comparing dates:', e);
            }
          }
        }
        
        // Shift and status matching
        const shiftMatch = selectedShift === 'all' || itemShift === selectedShift;
        const statusMatch = selectedStatus === 'all' || itemStatus === selectedStatus;
        
        // Final decision: item should be shown if all criteria match
        const shouldShow = dateMatch && shiftMatch && statusMatch;
        
        // Update item visibility
        item.style.display = shouldShow ? '' : 'none';
        
        if (shouldShow) {
          hasVisibleItems = true;
        }
      });
      
      // Show empty state if no items are visible
      if (!hasVisibleItems) {
        const emptyState = document.createElement('div');
        emptyState.className = 'PM-empty-state';
        emptyState.innerHTML = `
          <i class="fas fa-calendar-times"></i>
          <h3>No Schedules Match Filters</h3>
          <p>No schedules match the selected filters. Try changing your filter criteria.</p>
        `;
        scheduleList.appendChild(emptyState);
      }
    };
    
    // Re-add event listeners to ensure they're working
    dateFilter.removeEventListener('change', filterSchedule);
    shiftFilter.removeEventListener('change', filterSchedule);
    statusFilter.removeEventListener('change', filterSchedule);
    
    dateFilter.addEventListener('change', filterSchedule);
    shiftFilter.addEventListener('change', filterSchedule);
    statusFilter.addEventListener('change', filterSchedule);
    
    // Add a clear date button for better UX
    const dateFilterContainer = dateFilter.parentElement;
    if (dateFilterContainer) {
      // Remove existing clear button if any
      const existingClearBtn = dateFilterContainer.querySelector('.PM-clear-date-btn');
      if (existingClearBtn) {
        existingClearBtn.remove();
      }
      
      // Create and add a new clear button
      const clearDateBtn = document.createElement('button');
      clearDateBtn.className = 'PM-clear-date-btn';
      clearDateBtn.innerHTML = '<i class="fas fa-times"></i>';
      clearDateBtn.style.position = 'absolute';
      clearDateBtn.style.right = '10px';
      clearDateBtn.style.top = '50%';
      clearDateBtn.style.transform = 'translateY(-50%)';
      clearDateBtn.style.background = 'transparent';
      clearDateBtn.style.border = 'none';
      clearDateBtn.style.color = '#666';
      clearDateBtn.style.cursor = 'pointer';
      clearDateBtn.style.display = dateFilter.value ? 'block' : 'none';
      clearDateBtn.title = 'Clear date filter';
      
      dateFilterContainer.style.position = 'relative';
      dateFilterContainer.appendChild(clearDateBtn);
      
      // Show/hide clear button based on date input value
      dateFilter.addEventListener('input', function() {
        clearDateBtn.style.display = this.value ? 'block' : 'none';
      });
      
      // Handle clear button click
      clearDateBtn.addEventListener('click', function() {
        dateFilter.value = '';
        clearDateBtn.style.display = 'none';
        filterSchedule();
      });
    }
    
    // Run filter immediately to apply any existing filters
    filterSchedule();
}

// ========================================================================
// Helper Functions
// ========================================================================

function openModal(modal) {
    if (!modal) return;
    
    // Close any other product/schedule modals that might be open
    const productScheduleModals = document.querySelectorAll('#add-product-modal, #import-product-modal, #add-schedule-modal, #import-schedule-modal');
    productScheduleModals.forEach(m => {
      if (m !== modal) {
        m.classList.remove('active');
        m.style.display = 'none';
      }
    });
    
    modal.classList.add('active');
    
    if (
      modal.id === 'add-product-modal' || 
      modal.id === 'import-product-modal' ||
      modal.id === 'add-schedule-modal' ||
      modal.id === 'import-schedule-modal'
    ) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'hidden';
    }
}


function closeModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('active');
    
    // For product and schedule modals, we also need to hide them
    if (
      modal.id === 'add-product-modal' || 
      modal.id === 'import-product-modal' ||
      modal.id === 'add-schedule-modal' ||
      modal.id === 'import-schedule-modal'
    ) {
      modal.style.display = 'none';
    } else {
      // For main modals like view-details-modal, restore body scroll
      document.body.style.overflow = '';
    }
    
    // Reset form if present
    const form = modal.querySelector('form');
    if (form && form.id !== 'edit-group-form') {
      form.reset();
      
      // Reset validation styles
      const invalidFields = form.querySelectorAll('.PM-form-group.invalid');
      invalidFields.forEach(field => {
        field.classList.remove('invalid');
        const validationMsg = field.querySelector('.PM-validation-message');
        if (validationMsg) validationMsg.textContent = '';
      });
      
      // Reset file input display if present
      const fileNameDisplay = form.querySelector('.PM-file-name');
      if (fileNameDisplay) {
        fileNameDisplay.textContent = 'No file chosen';
        fileNameDisplay.style.color = 'var(--pm-text-light)';
      }
    }
}

function setupTabEventListeners() {
    // Product Tab
    setupProductTabEventListeners();
    
    // Schedule Tab
    setupScheduleTabEventListeners();
    
    // Modal close buttons (for all modals)
    document.querySelectorAll('.PM-modal-close').forEach(button => {
      button.addEventListener('click', function() {
        const modal = this.closest('.PM-modal');
        closeModal(modal);
      });
    });
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('PM-modal')) {
        closeModal(e.target);
      }
    });
    
    // Setup file input changes
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      input.addEventListener('change', function() {
        const fileNameDisplay = this.closest('.PM-file-upload').querySelector('.PM-file-name');
        if (fileNameDisplay) {
          if (this.files.length > 0) {
            fileNameDisplay.textContent = this.files[0].name;
            fileNameDisplay.style.color = 'var(--pm-primary-color)';
          } else {
            fileNameDisplay.textContent = 'No file chosen';
            fileNameDisplay.style.color = 'var(--pm-text-light)';
          }
        }
      });
    });
}

function setupProductTabEventListeners() {
  // Add Product Button - already handled in existing code
  
  // Fix for Import Product Button
  const importProductBtn = document.getElementById('import-product');
  if (importProductBtn) {
    importProductBtn.addEventListener('click', function() {
      const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
      if (groupId) {
        // Set the monitoring group ID in the modal form
        document.getElementById('import-product-group-id').value = groupId;
        
        // Get the modal and open it
        const modal = document.getElementById('import-product-modal');
        if (modal) {
          // Make sure modal is displayed with higher z-index
          modal.style.display = 'flex';
          modal.style.zIndex = '1002'; // Higher than view-details-modal
          modal.classList.add('active');
        } else {
          console.error('Import Product modal not found');
        }
      } else {
        console.error('Group ID not found');
        createToast('Could not determine which group to import products for.', 'error');
      }
    });
  }

  // Cancel button for import product
  const cancelProductImportBtn = document.getElementById('cancel-product-import');
  if (cancelProductImportBtn) {
    cancelProductImportBtn.addEventListener('click', function() {
      closeModal(document.getElementById('import-product-modal'));
    });
  }
}
  
function setupScheduleTabEventListeners() {
    // Add Schedule Button - already handled in existing code
    
    // Fix for Import Schedule Button
    const importScheduleBtn = document.getElementById('import-schedule');
    if (importScheduleBtn) {
      importScheduleBtn.addEventListener('click', function() {
        const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
        if (groupId) {
          // Set the monitoring group ID in the modal form
          document.getElementById('import-schedule-group-id').value = groupId;
          
          // Get the modal and open it
          const modal = document.getElementById('import-schedule-modal');
          if (modal) {
            // Make sure modal is displayed with higher z-index
            modal.style.display = 'flex';
            modal.style.zIndex = '1002'; // Higher than view-details-modal
            modal.classList.add('active');
          } else {
            console.error('Import Schedule modal not found');
          }
        } else {
          console.error('Group ID not found');
          createToast('Could not determine which group to import schedules for.', 'error');
        }
      });
    }
  
    // Cancel button for import schedule
    const cancelScheduleImportBtn = document.getElementById('cancel-schedule-import');
    if (cancelScheduleImportBtn) {
      cancelScheduleImportBtn.addEventListener('click', function() {
        closeModal(document.getElementById('import-schedule-modal'));
      });
    }
}

function loadGroupForEditing(groupId) {
    // Show loading state
    const editGroupModal = document.getElementById('edit-group-modal');
    if (!editGroupModal) return;
    
    openModal(editGroupModal);
    
    // Update form action URL
    const editForm = document.getElementById('edit-group-form');
    if (editForm) {
        // Handle variable URL patterns by finding base URL and appending ID
        const baseUrl = editForm.action.split('/edit-group/')[0];
        editForm.action = `${baseUrl}/edit-group/${groupId}/`;
        
        // For debugging
        console.log('Form action updated to:', editForm.action);
    }
    
    // Set group ID
    const editGroupIdField = document.getElementById('edit-group-id');
    if (editGroupIdField) {
        editGroupIdField.value = groupId;
    }
    
    // Fetch group details
    fetch(`/monitoring/get-group/${groupId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateGroupDetailsView(data);
            console.log('Group data received:', data); // Debug logging
            
            // Find the title and description fields directly within the form
            const form = document.getElementById('edit-group-form');
            if (form) {
                // Find inputs by name attribute instead of id
                const titleInput = form.querySelector('input[name="title"]');
                const statusSelect = form.querySelector('select[name="status"]');
                const descriptionTextarea = form.querySelector('textarea[name="description"]');
                
                console.log('Found form elements:', {
                    titleInput: !!titleInput,
                    statusSelect: !!statusSelect,
                    descriptionTextarea: !!descriptionTextarea
                });
                
                // Set values if the elements exist
                if (titleInput) titleInput.value = data.title || '';
                if (statusSelect) statusSelect.value = data.status || 'Running';
                if (descriptionTextarea) descriptionTextarea.value = data.description || '';
            } else {
                console.error('Edit form not found');
            }
            
            setupTabEventListeners();
            populateEditLinesSelection(data);
            
            // Select supervisors
            if (data.supervisor_ids && Array.isArray(data.supervisor_ids)) {
                data.supervisor_ids.forEach(id => {
                    const supervisorCheckbox = document.getElementById(`edit-supervisor-${id}`);
                    if (supervisorCheckbox) {
                        supervisorCheckbox.checked = true;
                    } else {
                        // Try to find by name and value instead
                        const supervisorsByValue = document.querySelectorAll(`input[name="edit_supervisors"][value="${id}"]`);
                        if (supervisorsByValue.length > 0) {
                            supervisorsByValue[0].checked = true;
                        }
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error loading group data:', error);
            createToast('Failed to load group data. Please try again.', 'error');
            closeModal(editGroupModal);
        });
}
function populateEditLinesSelection(data) {
    // Get all line elements from available lines
    const availableLines = document.querySelectorAll('#available-lines .PM-line-item');
    
    // Create maps for available and selected lines
    const availableLinesMap = {};
    availableLines.forEach(lineItem => {
        const lineId = lineItem.getAttribute('data-id');
        const checkbox = lineItem.querySelector('input[type="checkbox"]');
        const label = lineItem.querySelector('label');
        
        if (lineId && checkbox && label) {
            availableLinesMap[lineId] = {
                id: lineId,
                name: label.textContent,
                value: checkbox.value
            };
        }
    });
    
    // Clear existing lines in both containers
    const editAvailableLinesList = document.querySelector('#edit-available-lines .PM-lines-list');
    const editSelectedLinesList = document.querySelector('#edit-selected-lines .PM-lines-list');
    
    if (!editAvailableLinesList || !editSelectedLinesList) return;
    
    editAvailableLinesList.innerHTML = '';
    editSelectedLinesList.innerHTML = '';
    
    // Clear hidden inputs container
    const hiddenInputsContainer = document.querySelector('.edit-selected-lines-hidden-inputs');
    if (hiddenInputsContainer) {
        hiddenInputsContainer.innerHTML = '';
    }
    
    // Populate selected lines
    data.line_ids.forEach(lineId => {
        const lineInfo = availableLinesMap[lineId];
        if (lineInfo) {
            const lineItem = document.createElement('div');
            lineItem.className = 'PM-line-item';
            lineItem.setAttribute('data-id', lineInfo.id);
            
            lineItem.innerHTML = `
                <input type="checkbox" id="edit-selected-line-${lineInfo.id}" class="line-checkbox" value="${lineInfo.id}">
                <label for="edit-selected-line-${lineInfo.id}">${lineInfo.name}</label>
            `;
            
            editSelectedLinesList.appendChild(lineItem);
            
            // Add hidden input for form submission
            if (hiddenInputsContainer) {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'lines';
                hiddenInput.value = lineInfo.id;
                hiddenInputsContainer.appendChild(hiddenInput);
            }
            
            // Remove from available lines map
            delete availableLinesMap[lineId];
        }
    });
    
    // Populate available lines with remaining lines
    Object.values(availableLinesMap).forEach(lineInfo => {
        const lineItem = document.createElement('div');
        lineItem.className = 'PM-line-item';
        lineItem.setAttribute('data-id', lineInfo.id);
        
        lineItem.innerHTML = `
            <input type="checkbox" id="edit-available-line-${lineInfo.id}" class="line-checkbox" value="${lineInfo.id}">
            <label for="edit-available-line-${lineInfo.id}">${lineInfo.name}</label>
        `;
        
        editAvailableLinesList.appendChild(lineItem);
    });
}

function loadGroupDetails(groupId) {
  const detailsModal = document.getElementById('view-details-modal');
  if (!detailsModal) return;
  
  openModal(detailsModal);
  
  // Add loading state
  const modalBody = detailsModal.querySelector('.PM-modal-body');
  if (modalBody) {
      modalBody.classList.add('loading');
  }
  
  // Add debug output
  console.log("Loading group details for:", groupId);
  
  // Fetch group details with improved error handling
  fetch(`/monitoring/get-group/${groupId}/`)
      .then(response => {
          if (!response.ok) {
              throw new Error(`Server responded with status: ${response.status}`);
          }
          return response.json();
      })
      .then(data => {
          console.log("Group data received:", data);
          
          // Check all schedules
          if (data.schedules && Array.isArray(data.schedules)) {
              console.log(`Received ${data.schedules.length} schedules`);
              
              // Log a few sample schedules for debugging
              if (data.schedules.length > 0) {
                  console.log("Sample schedules:");
                  data.schedules.slice(0, 3).forEach((schedule, index) => {
                      console.log(`Schedule ${index + 1}:`, schedule);
                  });
              }
          }
          
          // Call the update function to populate the UI
          updateGroupDetailsView(data);
          
          // Initialize chart for performance tab
          fetchGroupPerformanceData(groupId);
          
          // Remove loading state
          if (modalBody) {
              modalBody.classList.remove('loading');
          }
          
          // Signal that group details are loaded (for other components)
          document.dispatchEvent(new CustomEvent('groupDetailsLoaded', { detail: { groupId } }));
          
          // Reset the schedule date filter to show all schedules
          const scheduleDate = document.getElementById('schedule-date');
          if (scheduleDate) {
              scheduleDate.value = ''; // Clear the date filter
              
              // Trigger filter event to update schedule list
              const event = new Event('change');
              scheduleDate.dispatchEvent(event);
          }
      })
      .catch(error => {
          console.error('Error loading group details:', error);
          createToast('Failed to load group details. Please try again.', 'error');
          
          if (modalBody) {
              modalBody.classList.remove('loading');
          }
          
          closeModal(detailsModal);
      });
}

function fetchGroupPerformanceData(groupId) {
  if (!groupId) {
      console.error('Group ID is required to fetch performance data');
      return;
  }
  
  if (!detailPerformanceChart) {
      detailPerformanceChart = initializeDetailChart();
      if (!detailPerformanceChart) return;
  }
  
  const chartCanvas = document.getElementById('detail-performance-chart');
  if (!chartCanvas) return;
  
  // Get filter values
  const dateFilter = document.getElementById('chart-date-filter');
  const shiftFilter = document.getElementById('chart-shift-filter');
  
  // Default to today and all shifts if filters aren't available
  const date = dateFilter ? dateFilter.value : new Date().toISOString().split('T')[0];
  const shift = shiftFilter ? shiftFilter.value : 'all';
  
  // Show loading state
  const chartContainer = chartCanvas.closest('.PM-detail-chart');
  if (chartContainer) {
      chartContainer.classList.add('loading');
  }
  
  // Build URL with filter parameters
  let url = `/monitoring/group-performance/${groupId}/?`;
  if (date) {
      url += `date=${date}&`;
  }
  if (shift) {
      url += `shift=${shift}`;
  }
  
  // Fetch performance data
  fetch(url)
      .then(response => {
          if (!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json();
      })
      .then(data => {
          // Update chart with data
          if (detailPerformanceChart) {
              detailPerformanceChart.data.labels = data.labels;
              detailPerformanceChart.data.datasets[0].data = data.actual;
              detailPerformanceChart.data.datasets[1].data = data.target;
              
              detailPerformanceChart.update({
                  duration: 800,
                  easing: 'easeOutQuart'
              });
              
              // Add refreshed animation
              if (chartContainer) {
                  chartContainer.classList.add('refreshed');
                  setTimeout(() => {
                      chartContainer.classList.remove('refreshed');
                  }, 1500);
              }
          }
          
          // Remove loading state
          if (chartContainer) {
              chartContainer.classList.remove('loading');
          }
      })
      .catch(error => {
          console.error('Error loading group performance data:', error);
          createToast('Failed to load performance data. Please try again.', 'error');
          
          // Remove loading state
          if (chartContainer) {
              chartContainer.classList.remove('loading');
          }
      });
}

function setupChartEventListeners() {

    const periodSelector = document.getElementById('chart-period-selector');
    if (periodSelector) {
        // Remove any existing listeners
        const newSelector = periodSelector.cloneNode(true);
        if (periodSelector.parentNode) {
            periodSelector.parentNode.replaceChild(newSelector, periodSelector);
        }
        
        // Add fresh event listener
        newSelector.addEventListener('change', function() {
            console.log("Period changed to:", this.value);
            updateOutputChart(this.value);
        });
        
        // Trigger initial load
        console.log("Initial chart period:", newSelector.value);
        updateOutputChart(newSelector.value);
    }
    // Line selector in performance tab
    const lineSelector = document.getElementById('line-selector');
    if (lineSelector) {
      lineSelector.addEventListener('change', function() {
        const selectedLine = this.value;
        const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
        
        if (selectedLine && groupId) {
          if (selectedLine === 'total') {
            fetchGroupPerformanceData(groupId);
          } else {
            updateLineChart(groupId, selectedLine);
          }
        }
      });
    }
    
    // View Details Button
    document.querySelectorAll('.PM-action-button.view-details').forEach(button => {
      button.addEventListener('click', (e) => {
        const groupId = e.currentTarget.getAttribute('data-id');
        loadGroupDetails(groupId);
      });
    });
}

function updateGroupDetailsView(data) {
    // Update header information
    const detailGroupName = document.getElementById('detail-group-name');
    const detailStatus = document.getElementById('detail-status');
    
    if (detailGroupName) {
        detailGroupName.textContent = data.title;
        detailGroupName.setAttribute('data-id', data.id);
    }
    
    if (detailStatus) {
        detailStatus.textContent = data.status;
        detailStatus.setAttribute('data-status', data.status);
    }
    
    // Update metrics
    document.getElementById('detail-lines-count').textContent = data.lines_count;
    document.getElementById('detail-percentage').textContent = `${data.efficiency_percentage}%`;
    document.getElementById('detail-today-output').textContent = data.todays_output;
    
    // Set appropriate color class for percentage metrics
    const percentageElement = document.getElementById('detail-percentage');
    percentageElement.className = 'PM-metric-value';
    if (data.efficiency_percentage >= 70) {
        percentageElement.classList.add('PM-percentage-high');
    } else if (data.efficiency_percentage >= 50) {
        percentageElement.classList.add('PM-percentage-medium');
    } else {
        percentageElement.classList.add('PM-percentage-low');
    }
    
    // Update line selector dropdown
    const lineSelector = document.getElementById('line-selector');
    if (lineSelector) {
        lineSelector.innerHTML = '<option value="">Select Production Line</option>';
        
        data.lines.forEach(line => {
            const option = document.createElement('option');
            option.value = line.id;
            option.textContent = line.name;
            lineSelector.appendChild(option);
        });
    }
    
    // Update production lines performance
    const linesGrid = document.getElementById('detail-lines-list');
    if (linesGrid) {
        linesGrid.innerHTML = '';
        
        data.lines.forEach(line => {
            const lineCard = document.createElement('div');
            lineCard.className = 'PM-detail-line-card';
            
            // Set percentage class
            let percentageClass = 'PM-percentage-low';
            if (line.percentage >= 70) {
                percentageClass = 'PM-percentage-high';
            } else if (line.percentage >= 50) {
                percentageClass = 'PM-percentage-medium';
            }
            
            lineCard.innerHTML = `
                <div class="PM-detail-line-header">${line.name}</div>
                <div class="PM-detail-line-stats">
                    <div class="PM-detail-line-stat">
                        <div class="PM-detail-line-stat-label">Percentage</div>
                        <div class="PM-detail-line-stat-value ${percentageClass}">${line.percentage}%</div>
                    </div>
                    <div class="PM-detail-line-stat">
                        <div class="PM-detail-line-stat-label">Planned Qty</div>
                        <div class="PM-detail-line-stat-value">${line.planned_qty}</div>
                    </div>
                    <div class="PM-detail-line-stat">
                        <div class="PM-detail-line-stat-label">Actual Qty</div>
                        <div class="PM-detail-line-stat-value">${line.actual_qty}</div>
                    </div>
                </div>
            `;
            
            linesGrid.appendChild(lineCard);
        });
    }
    
    // Update products list
    updateProductsList(data);

    
    // Update supervisors list
    const supervisorsList = document.getElementById('detail-supervisors-list');
    if (supervisorsList) {
        supervisorsList.innerHTML = '';
        
        data.supervisors.forEach(supervisor => {
            const supervisorItem = document.createElement('div');
            supervisorItem.className = 'PM-supervisor-item';
            
            supervisorItem.innerHTML = `
                <div class="PM-supervisor-info">
                    <div class="PM-supervisor-name">${supervisor.name}</div>
                    <div class="PM-supervisor-department">${supervisor.username}</div>
                </div>
            `;
            
            supervisorsList.appendChild(supervisorItem);
        });
    }
    
    // Update description
    document.getElementById('detail-description').textContent = data.description;
    
    // Set edit button data
    const editFromDetailsBtn = document.getElementById('edit-from-details');
    if (editFromDetailsBtn) {
        editFromDetailsBtn.setAttribute('data-id', data.id);
    }
    
    // Set dashboard button data
    const openDashboardBtn = document.getElementById('open-dashboard-btn');
    if (openDashboardBtn) {
        openDashboardBtn.setAttribute('data-id', data.id);
    }
}

/**
 * Function to update the line-specific performance chart
 * @param {number|string} groupId - ID of the monitoring group
 * @param {number|string} lineId - ID of the production line or 'total' for aggregated data
 */

function updateLineChart(groupId, lineId) {
    const chartCanvas = document.getElementById('detail-performance-chart');
    if (!chartCanvas || !detailPerformanceChart) return;
    
    // Get filter values
    const dateFilter = document.getElementById('chart-date-filter').value;
    const shiftFilter = document.getElementById('chart-shift-filter').value;
    
    // Show loading state
    const chartContainer = chartCanvas.closest('.PM-detail-chart');
    if (chartContainer) {
      chartContainer.classList.add('loading');
    }
    
    // Build URL with filter parameters
    let url = `/monitoring/line-performance/${groupId}/${lineId}/?`;
    if (dateFilter) {
      url += `date=${dateFilter}&`;
    }
    if (shiftFilter) {
      url += `shift=${shiftFilter}`;
    }
    
    // Fetch line performance data
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // Update chart with new data
        if (detailPerformanceChart) {
          detailPerformanceChart.data.labels = data.labels;
          detailPerformanceChart.data.datasets[0].data = data.actual;
          detailPerformanceChart.data.datasets[1].data = data.target;
          
          detailPerformanceChart.update({
            duration: 800,
            easing: 'easeOutQuart'
          });
        }
        
        // Remove loading state
        if (chartContainer) {
          chartContainer.classList.remove('loading');
          
          // Add refreshed animation
          chartContainer.classList.add('refreshed');
          setTimeout(() => {
            chartContainer.classList.remove('refreshed');
          }, 1500);
        }
      })
      .catch(error => {
        console.error('Error loading line performance data:', error);
        createToast('Failed to load line performance data. Please try again.', 'error');
        
        // Remove loading state
        if (chartContainer) {
          chartContainer.classList.remove('loading');
        }
      });
}

function moveSelectedLines(checkboxes, sourceSelector, targetSelector) {
    if (checkboxes.length === 0) return;
    
    const sourceList = document.querySelector(`${sourceSelector} .PM-lines-list`);
    const targetList = document.querySelector(`${targetSelector} .PM-lines-list`);
    
    if (!sourceList || !targetList) return;
    
    // Get hidden inputs container
    const hiddenInputsContainer = document.querySelector(
        targetSelector === '#selected-lines' ? '.selected-lines-hidden-inputs' : '.edit-selected-lines-hidden-inputs'
    );
    
    checkboxes.forEach(checkbox => {
        const lineItem = checkbox.closest('.PM-line-item');
        const lineId = lineItem.getAttribute('data-id');
        const lineName = checkbox.nextElementSibling.textContent;
        
        // Create new line item for target list
        const newLineItem = document.createElement('div');
        newLineItem.className = 'PM-line-item';
        newLineItem.setAttribute('data-id', lineId);
        
        // Generate unique ID for the checkbox
        const newCheckboxId = `${targetSelector.substring(1)}-line-${lineId}`;
        
        newLineItem.innerHTML = `
            <input type="checkbox" id="${newCheckboxId}" class="line-checkbox" value="${lineId}">
            <label for="${newCheckboxId}">${lineName}</label>
        `;
        
        // Add to target and remove from source
        targetList.appendChild(newLineItem);
        lineItem.remove();
        
        // Add slide-in animation to the new item
        newLineItem.style.opacity = '0';
        newLineItem.style.transform = 'translateX(10px)';
        
        setTimeout(() => {
            newLineItem.style.opacity = '1';
            newLineItem.style.transform = 'translateX(0)';
            newLineItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 10);
        
        // Update hidden inputs if moving to selected lines
        if (targetSelector.includes('selected-lines') && hiddenInputsContainer) {
            // Check if hidden input for this line already exists
            const existingInput = hiddenInputsContainer.querySelector(`input[value="${lineId}"]`);
            
            if (!existingInput) {
                // Create hidden input for form submission
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'lines';
                hiddenInput.value = lineId;
                hiddenInputsContainer.appendChild(hiddenInput);
            }
        } else if (sourceSelector.includes('selected-lines') && hiddenInputsContainer) {
            // Remove hidden input if moving from selected lines
            const existingInput = hiddenInputsContainer.querySelector(`input[value="${lineId}"]`);
            if (existingInput) {
                existingInput.remove();
            }
        }
    });
}

function filterLines(searchTerm, selector) {
    const lineItems = document.querySelectorAll(selector);
    const searchTermLower = searchTerm.toLowerCase();
    
    lineItems.forEach(item => {
        const lineName = item.querySelector('label').textContent.toLowerCase();
        
        if (lineName.includes(searchTermLower)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// ========================================================================
// Toast Notifications
// ========================================================================

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
    
    // Wait a moment before showing the toast for the animation to work
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        removeToast(toast);
    });
    
    // Auto remove after duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    toast.classList.remove('show');
    
    // Wait for the animation to finish before removing from DOM
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// ========================================================================
// Chart Auto-Refresh
// ========================================================================

function setupChartAutoRefresh() {
    let refreshInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
    let chartRefreshTimer;
    
    // Function to start the refresh cycle
    function startChartRefresh() {
        // Set timeout for chart refresh
        chartRefreshTimer = setTimeout(() => {
            // Get current period
            const periodSelector = document.getElementById('chart-period-selector');
            const period = periodSelector ? periodSelector.value : 'month';
            
            // Update chart with auto-refresh flag
            updateOutputChart(period, true);
            
            // Add pulse effect to chart wrapper
            const chartWrapper = document.querySelector('.PM-chart-wrapper');
            if (chartWrapper) {
                chartWrapper.classList.add('data-refreshed');
                setTimeout(() => {
                    chartWrapper.classList.remove('data-refreshed');
                }, 2000);
            }
            
            // Add data-refreshed animation style
            if (!document.getElementById('data-refreshed-style')) {
                const style = document.createElement('style');
                style.id = 'data-refreshed-style';
                style.textContent = `
                    @keyframes chart-refresh-pulse {
                        0% { box-shadow: 0 0 0 0 rgba(51, 102, 255, 0.4); }
                        70% { box-shadow: 0 0 0 10px rgba(51, 102, 255, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(51, 102, 255, 0); }
                    }
                    
                    .PM-chart-wrapper.data-refreshed {
                        animation: chart-refresh-pulse 2s ease-out;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Restart the refresh cycle
            startChartRefresh();
        }, refreshInterval);
    }
    
    // Start the initial refresh cycle
    startChartRefresh();
    
    // Add event listener to restart cycle when changing tabs/pages
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            // Clear existing timers
            clearTimeout(chartRefreshTimer);
            
            // Get current period
            const periodSelector = document.getElementById('chart-period-selector');
            const period = periodSelector ? periodSelector.value : 'month';
            
            // Update chart
            updateOutputChart(period);
            
            // Restart auto-refresh
            startChartRefresh();
        }
    });
}

// ========================================================================
// Import Products and Schedules Functions
// ========================================================================

function setupImportListeners() {
    // Import Product Button
    const importProductButtons = document.querySelectorAll('.PM-import-button:nth-child(2)');
    importProductButtons.forEach(button => {
        button.addEventListener('click', function() {
            const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
            if (groupId) {
                document.getElementById('import-product-group-id').value = groupId;
                const importModal = document.getElementById('import-product-modal');
                if (importModal) {
                    importModal.style.display = 'block';
                    importModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            } else {
                createToast('Please select a monitoring group first', 'warning');
            }
        });
    });

    // Import Schedule Button
    const importScheduleButtons = document.querySelectorAll('.PM-import-button:nth-child(2)');
    importScheduleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
            if (groupId) {
                document.getElementById('import-schedule-group-id').value = groupId;
                const importModal = document.getElementById('import-schedule-modal');
                if (importModal) {
                    importModal.style.display = 'block';
                    importModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            } else {
                createToast('Please select a monitoring group first', 'warning');
            }
        });
    });

    // Cancel buttons for import modals
    const cancelImportButtons = document.querySelectorAll('#cancel-product-import, #cancel-schedule-import');
    cancelImportButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.PM-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // File input change handlers to show selected filename
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const fileNameElement = this.parentElement.querySelector('.PM-file-name');
            if (fileNameElement) {
                if (this.files.length > 0) {
                    fileNameElement.textContent = this.files[0].name;
                    fileNameElement.style.color = 'var(--pm-primary-color)';
                } else {
                    fileNameElement.textContent = 'No file chosen';
                    fileNameElement.style.color = 'var(--pm-text-light)';
                }
            }
        });
    });

    // Form submission with progress indication
    const importProductForm = document.getElementById('import-product-form');
    if (importProductForm) {
        importProductForm.addEventListener('submit', function(e) {
            const fileInput = this.querySelector('input[type="file"]');
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                e.preventDefault();
                createToast('Please select a file to import', 'error');
                return false;
            }

            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.classList.add('loading');
            submitButton.textContent = '';
            return true;
        });
    }

    const importScheduleForm = document.getElementById('import-schedule-form');
    if (importScheduleForm) {
        importScheduleForm.addEventListener('submit', function(e) {
            const fileInput = this.querySelector('input[type="file"]');
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                e.preventDefault();
                createToast('Please select a file to import', 'error');
                return false;
            }

            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.classList.add('loading');
            submitButton.textContent = '';
            return true;
        });
    }
}

function setupProductActions() {
  const productList = document.querySelector('.PM-product-list');
  if (!productList) return;

  // Handle edit button clicks
  productList.querySelectorAll('.PM-edit-btn').forEach(button => {
      button.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const productId = this.getAttribute('data-id');
          if (productId) {
              loadProductForEditing(productId);
          }
      });
  });

  // Handle delete button clicks
  productList.querySelectorAll('.PM-delete-btn').forEach(button => {
      button.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const productId = this.getAttribute('data-id');
          const productItem = this.closest('.PM-product-item');
          if (productId && productItem) {
              const productName = productItem.querySelector('.PM-product-col:first-child').textContent.trim();
              showDeleteProductConfirmation(productId, productName);
          }
      });
  });
}

function showDeleteProductConfirmation(productId, productName) {
  const modal = document.getElementById('delete-product-confirmation');
  if (!modal) {
      console.error('Delete product confirmation modal not found');
      return;
  }
  
  // Set product name in confirmation text
  const productNameElement = document.getElementById('confirm-product-name');
  if (productNameElement) {
      productNameElement.textContent = productName;
  }
  
  // Get confirmation and cancel buttons
  const confirmBtn = document.getElementById('confirm-delete-product');
  const cancelBtn = document.getElementById('cancel-delete-product');
  
  // Remove any existing event listeners by cloning and replacing the buttons
  if (confirmBtn) {
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      
      // Store the product ID in the data attribute
      newConfirmBtn.setAttribute('data-product-id', productId);
      
      // Add fresh event listener for delete action
      newConfirmBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const prodId = this.getAttribute('data-product-id');
          if (prodId) {
              deleteProduct(prodId);
              closeDeleteConfirmation();
          }
      });
  }
  
  if (cancelBtn) {
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      
      // Add fresh event listener for cancel action
      newCancelBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          closeDeleteConfirmation();
      });
  }
  
  // Show the modal
  modal.classList.add('active');
}

function deleteProduct(productId) {
  if (!productId) {
      console.error('Product ID is required for deletion');
      return;
  }
  
  // Get CSRF token
  const csrfToken = getCSRFToken();
  if (!csrfToken) {
      console.error('CSRF token not found');
      createToast('Could not authenticate the request. Please refresh the page and try again.', 'error');
      return;
  }

  
  // Send the delete request
  fetch(`/monitoring/delete-product/${productId}/`, {
      method: 'POST',
      headers: {
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest'
      }
  })
  .then(response => {
      if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
      }
      return response.json();
  })
  .then(data => {
      console.log('Delete product response:', data);
      
      if (data.status === 'success') {
          createToast(data.message || 'Product deleted successfully!', 'success');
          
          // Refresh the product list by reloading the group details
          const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
          if (groupId) {
              loadGroupDetails(groupId);
          }
      } else {
          throw new Error(data.message || 'Failed to delete product. Please try again.');
      }
  })
  .catch(error => {
      console.error('Error deleting product:', error);
      createToast(error.message || 'Failed to delete product. Please try again.', 'error');
  });
}

function closeDeleteConfirmation() {
  const modal = document.getElementById('delete-product-confirmation');
  if (modal) {
      modal.classList.remove('active');
  }
}
  
function loadProductForEditing(productId) {
    const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
    if (!groupId) {
      createToast('Could not determine monitoring group', 'error');
      return;
    }
    
    // Get the product data
    fetch(`/monitoring/get-product/${productId}/`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log("Product data for editing:", data); // Debug log
        
        // Open the edit product modal (reuse the add product modal)
        const modal = document.getElementById('add-product-modal');
        if (!modal) {
          createToast('Error: Could not find product modal', 'error');
          return;
        }
        
        // Update modal title
        const modalTitle = modal.querySelector('.PM-modal-header h2');
        if (modalTitle) {
          modalTitle.textContent = 'Edit Product';
        }
        
        // Update form action - use the correct URL
        const form = document.getElementById('add-product-form');
        if (form) {
          form.action = `/monitoring/edit-product/${productId}/`;
        }
        
        // Set monitoring ID
        document.getElementById('product-group-id').value = groupId;
        
        // Fill the form with product data - ensure all fields are set properly
        document.querySelector('#id_product_name').value = data.product_name || '';
        document.querySelector('#id_line').value = data.line_id || '';
        document.querySelector('#id_qty_per_box').value = data.qty_per_box || '';
        document.querySelector('#id_qty_per_hour').value = data.qty_per_hour || '';
        
        // Make sure the description is properly set
        const descriptionField = document.querySelector('#id_description');
        if (descriptionField) {
          // Make sure we handle null/undefined descriptions gracefully
          descriptionField.value = data.description !== undefined ? data.description : '';
          console.log("Setting description to:", descriptionField.value); // Debug log
        }
        
        // Update submit button text
        const saveButton = document.getElementById('save-product');
        if (saveButton) {
          saveButton.textContent = 'Update Product';
        }
        
        // Show the modal with higher z-index
        modal.style.display = 'flex';
        modal.style.zIndex = '1010'; // Higher z-index to ensure it's on top
        modal.classList.add('active');
      })
      .catch(error => {
        console.error('Error loading product data:', error);
        createToast('Error loading product data', 'error');
      });
}

function getCSRFToken() {
    // Try to get from cookie
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('csrftoken=')) {
        return cookie.substring('csrftoken='.length);
      }
    }
    
    // If not found in cookie, try to get from hidden input
    const tokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (tokenInput) {
      return tokenInput.value;
    }
    
    return null;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  // Check if the date is already in a readable format
  if (dateString.includes('/')) return dateString;
  
  // Try to parse the date (assuming YYYY-MM-DD format)
  try {
      const dateObj = new Date(dateString);
      return dateObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
      });
  } catch (e) {
      console.error('Error formatting date:', e);
      return dateString; // Return original string if parsing fails
  }
}

function updateScheduleList(data) {
  console.log('Updating schedule list with data:', data);
  
  const scheduleList = document.querySelector('.PM-schedule-list');
  if (!scheduleList) {
      console.error('Schedule list element not found');
      return;
  }
  
  // Clear existing content except the header
  const header = scheduleList.querySelector('.PM-schedule-header');
  scheduleList.innerHTML = '';
  if (header) {
      scheduleList.appendChild(header);
  }
  
  // Check if there are any schedules
  if (!data.schedules || data.schedules.length === 0) {
      // Only add empty state if it doesn't already exist
      if (!scheduleList.querySelector('.PM-empty-state')) {
          const emptyState = document.createElement('div');
          emptyState.className = 'PM-empty-state';
          emptyState.innerHTML = `
              <i class="fas fa-calendar-times"></i>
              <h3>No Schedules Found</h3>
              <p>No schedules have been added to this group yet.</p>
          `;
          scheduleList.appendChild(emptyState);
      }
      return;
  }
  
  // Debug logging for the schedules
  console.log(`Processing ${data.schedules.length} schedules`);
  data.schedules.forEach((schedule, index) => {
      if (index < 5) { // Log just the first 5 for brevity
          console.log(`Schedule ${index+1}:`, {
              id: schedule.id,
              date: schedule.date_planned,
              product: schedule.product,
              shift: schedule.shift,
              status: schedule.status
          });
      }
  });
  
  // Remove any existing empty state message
  const existingEmptyState = scheduleList.querySelector('.PM-empty-state');
  if (existingEmptyState) {
      existingEmptyState.remove();
  }
  
  // Define column flex values for consistent alignment between header and data rows
  const columnFlexValues = {
      date: '1.5', // Date column
      product: '1.5', // Product column
      line: '1', // Line column
      shift: '0.7', // Shift column
      planned: '1', // Planned Qty column
      produced: '1', // Produced column
      balance: '1', // Balance column
      status: '1', // Status column
      actions: '1' // Actions column
  };
  
  // Update header column flex values if header exists
  if (header) {
      const headerCols = header.querySelectorAll('.PM-schedule-col');
      if (headerCols.length >= 9) {
          headerCols[0].style.flex = columnFlexValues.date;      // Date
          headerCols[1].style.flex = columnFlexValues.product;   // Product
          headerCols[2].style.flex = columnFlexValues.line;      // Line
          headerCols[3].style.flex = columnFlexValues.shift;     // Shift
          headerCols[4].style.flex = columnFlexValues.planned;   // Planned Qty
          headerCols[5].style.flex = columnFlexValues.produced;  // Produced
          headerCols[6].style.flex = columnFlexValues.balance;   // Balance
          headerCols[7].style.flex = columnFlexValues.status;    // Status
          headerCols[8].style.flex = columnFlexValues.actions;   // Actions
      }
  }
  
  // Add each schedule item
  data.schedules.forEach(schedule => {
      const scheduleItem = document.createElement('div');
      scheduleItem.className = 'PM-schedule-item';
      scheduleItem.setAttribute('data-id', schedule.id);
      
      // Make sure we have a valid date_planned value
      let rawDateValue = schedule.date_planned || '';
      
      // Clean up the raw date value if needed (remove any time component, whitespace, etc.)
      if (rawDateValue.includes('T')) {
          rawDateValue = rawDateValue.split('T')[0];
      }
      
      // Store raw date as a data attribute for exact filtering
      scheduleItem.setAttribute('data-date', rawDateValue.trim());
      scheduleItem.setAttribute('data-shift', schedule.shift);
      scheduleItem.setAttribute('data-status', schedule.status);
      
      // Determine status class for visual styling
      let statusClass = 'active';
      if (schedule.status === 'Change Load') {
          statusClass = 'warning';
      } else if (schedule.status === 'Backlog') {
          statusClass = 'inactive';
      }
      
      // Format date for display (assuming it's in YYYY-MM-DD format)
      const formattedDate = formatDate(rawDateValue);
      
      scheduleItem.innerHTML = `
          <div class="PM-schedule-col" style="flex: ${columnFlexValues.date}">${formattedDate}</div>
          <div class="PM-schedule-col" style="flex: ${columnFlexValues.product}">${schedule.product || 'N/A'}</div>
          <div class="PM-schedule-col" style="flex: ${columnFlexValues.line}">${schedule.line || 'N/A'}</div>
          <div class="PM-schedule-col" style="flex: ${columnFlexValues.shift}">${schedule.shift || 'N/A'}</div>
          <div class="PM-schedule-col" style="flex: ${columnFlexValues.planned}">${schedule.planned_qty || 0}</div>
          <div class="PM-schedule-col" style="flex: ${columnFlexValues.produced}">${schedule.produced_qty || 0}</div>
          <div class="PM-schedule-col" style="flex: ${columnFlexValues.balance}">${schedule.balance || 0}</div>
          <div class="PM-schedule-col" style="flex: ${columnFlexValues.status}"><span class="PM-status ${statusClass}">${schedule.status || 'N/A'}</span></div>
          <div class="PM-schedule-col" style="flex: ${columnFlexValues.actions}; text-align: center;">
              <div class="PM-product-actions">
                  <button class="PM-edit-schedule-btn PM-product-action-btn PM-edit-btn" data-id="${schedule.id}" data-current-status="${schedule.status}">
                      <i class="fas fa-edit"></i>
                  </button>
                  <button class="PM-delete-schedule-btn PM-product-action-btn PM-delete-btn" data-id="${schedule.id}" data-name="${schedule.product}">
                      <i class="fas fa-trash-alt"></i>
                  </button>
              </div>
          </div>
      `;
      
      scheduleList.appendChild(scheduleItem);
  });
  
  // Reinitialize schedule actions
  setupScheduleActions();
  
  // Initialize filters after adding items to the list
  setupScheduleFilterListeners();
}

function fixScheduleTab() {
  console.log("Fixing schedule tab...");
  
  // Check if the tab is properly structured
  debugTabStructure();
  
  // Make sure the schedule tab button works
  const scheduleTabButton = document.querySelector('.PM-tab-button[data-tab="schedule"]');
  if (scheduleTabButton) {
    scheduleTabButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("Schedule tab clicked");
      
      // Hide all tab contents
      document.querySelectorAll('.PM-tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Remove active class from all tab buttons
      document.querySelectorAll('.PM-tab-button').forEach(button => {
        button.classList.remove('active');
      });
      
      // Show schedule tab
      const scheduleTab = document.getElementById('schedule-tab');
      if (scheduleTab) {
        scheduleTab.classList.add('active');
        scheduleTabButton.classList.add('active');
      } else {
        console.error("Schedule tab not found");
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
    // Set up event handlers for the schedule tab actions
    const scheduleTabButton = document.querySelector('.PM-tab-button[data-tab="schedule"]');
    if (scheduleTabButton) {
      scheduleTabButton.addEventListener('click', function() {
        console.log('Schedule tab clicked, initializing filters and actions');
        setupScheduleFilterListeners();
        setupScheduleActions();
      });
    }
    
    // Also initialize when group details are loaded
    document.addEventListener('groupDetailsLoaded', function() {
      console.log('Group details loaded, initializing schedule components');
      setTimeout(() => {
        setupScheduleFilterListeners();
        setupScheduleActions();
      }, 200);
    });
    
    // Listen for schedule tab shown event
    document.addEventListener('scheduleTabShown', function() {
      console.log('Schedule tab shown event received');
      setupScheduleFilterListeners();
      setupScheduleActions();
    });
  });
  
  // Add this to fix the schedule filtering issues when the schedule tab content is updated
  function updateProductsList(data) {
    console.log("Updating products list with data:", data);
    // Existing code for updating products list...
    // After updating the product list, reinitialize the schedule actions
    setupScheduleActions();
}

function fixMonitoringDashboardIssues() {
  console.log("Fixing monitoring dashboard issues...");
  
  // Fix tab switching
  fixTabSwitching();
  
  // Fix schedule tab specifically
  fixScheduleTab();
  
  // Fix import modals
  fixImportModals();
  
  // Add a custom event for when group details are loaded
  document.addEventListener('groupDetailsLoaded', function() {
    
    setTimeout(function() {
      setupScheduleFilterListeners();
      fixTabSwitching();
      fixScheduleTab();
      fixImportModals();
    }, 200);
  });
}

// Call when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(fixMonitoringDashboardIssues, 500);
});

function setupScheduleActions() {
    console.log('Setting up schedule actions');
    
    // Initialize schedule edit buttons
    document.querySelectorAll('.PM-edit-schedule-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const scheduleId = this.getAttribute('data-id');
        console.log("Edit button clicked for schedule:", scheduleId);
        
        // Call function to load schedule data for editing
        loadScheduleForEditing(scheduleId);
      });
    });
    
    // Initialize schedule delete buttons
    document.querySelectorAll('.PM-delete-schedule-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const scheduleId = this.getAttribute('data-id');
        const scheduleName = this.getAttribute('data-name');
        
        console.log("Delete button clicked for schedule:", scheduleId, scheduleName);
        
        // Show confirmation dialog
        showDeleteScheduleConfirmation(scheduleId, scheduleName);
      });
    });
}

function loadScheduleForEditing(scheduleId) {
    const form = document.getElementById('add-schedule-form');
    const modal = document.getElementById('add-schedule-modal');
    const statusSelect = document.getElementById('id_status');
    const isSalesUser = statusSelect.dataset.isSales === 'true';
    
    // Update form action for editing
    form.action = `/monitoring/edit-schedule/${scheduleId}/`;
    
    // Fetch schedule details
    fetch(`/monitoring/get-schedule/${scheduleId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'error') {
                createToast(data.message, 'error');
                return;
            }
            
            // Get the group ID from the detail view
            const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
            if (!groupId) {
                createToast('Could not determine monitoring group', 'error');
                return;
            }
            
            // Populate form fields
            document.getElementById('schedule-group-id').value = groupId;
            document.getElementById('id_product_number').value = data.product_id;
            document.getElementById('id_date_planned').value = data.date_planned;
            document.getElementById('id_shift').value = data.shift;
            document.getElementById('id_planned_qty').value = data.planned_qty;
            
            // Handle status selection
            if (data.status === 'Planned' && !isSalesUser) {
                // If current status is Planned but user is not sales, default to Change Load
                statusSelect.value = 'Change Load';
            } else {
                statusSelect.value = data.status;
            }
            
            // Update modal title and submit button
            modal.querySelector('h2').textContent = 'Edit Production Schedule';
            modal.querySelector('#save-schedule').textContent = 'Update Schedule';
            
            // Show modal
            openModal(modal);
        })
        .catch(error => {
            console.error('Error loading schedule:', error);
            createToast('Error loading schedule details', 'error');
        });
}

function validateScheduleForm() {
  const form = document.getElementById('add-schedule-form');
  if (!form) return true;
  
  let isValid = true;
  const productId = form.querySelector('#id_product_number').value;
  const datePlanned = form.querySelector('#id_date_planned').value;
  const shift = form.querySelector('#id_shift').value;
  const plannedQty = form.querySelector('#id_planned_qty').value;
  const status = form.querySelector('#id_status').value;
  
  // Check required fields
  if (!productId) {
      createToast('Product is required', 'error');
      isValid = false;
  }
  
  if (!datePlanned) {
      createToast('Planned date is required', 'error');
      isValid = false;
  }
  
  if (!shift) {
      createToast('Shift is required', 'error');
      isValid = false;
  }
  
  if (!plannedQty) {
      createToast('Planned quantity is required', 'error');
      isValid = false;
  } else if (isNaN(plannedQty) || parseInt(plannedQty) <= 0) {
      createToast('Planned quantity must be a positive number', 'error');
      isValid = false;
  }
  
  if (!status) {
      createToast('Status is required', 'error');
      isValid = false;
  }
  
  return isValid;
}

document.addEventListener('DOMContentLoaded', function() {
  const scheduleForm = document.getElementById('add-schedule-form');
  if (scheduleForm) {
      scheduleForm.addEventListener('submit', function(e) {
          if (!validateScheduleForm()) {
              e.preventDefault();
              return false;
          }
          
          // If valid, add loading state to submit button
          const submitButton = this.querySelector('button[type="submit"]');
          if (submitButton) {
              submitButton.classList.add('loading');
              submitButton.textContent = '';
          }
      });
  }
});

function setupAutoUpdate() {
  // Listen for custom event that might be triggered after form submission
  document.addEventListener('scheduleUpdated', function(e) {
      if (e.detail && e.detail.groupId) {
          // Reload the group details to refresh the schedule list
          setTimeout(() => {
              loadGroupDetails(e.detail.groupId);
          }, 500);
      }
  });
  
  // Also setup file input event for schedule import
  const scheduleFileInput = document.getElementById('schedule-file');
  if (scheduleFileInput) {
      scheduleFileInput.addEventListener('change', function() {
          const fileNameDisplay = this.closest('.PM-file-upload').querySelector('.PM-file-name');
          if (fileNameDisplay) {
              if (this.files.length > 0) {
                  fileNameDisplay.textContent = this.files[0].name;
                  fileNameDisplay.style.color = 'var(--pm-primary-color)';
              } else {
                  fileNameDisplay.textContent = 'No file chosen';
                  fileNameDisplay.style.color = 'var(--pm-text-light)';
              }
          }
      });
  }
}

function exposeUserPermissions() {
  const userType = document.querySelector('meta[name="user-permissions"]')?.getAttribute('content') || '';
  
  // Create a data attribute on the body for easy access
  document.body.setAttribute('data-user-type', userType);
  
  // Also expose as a JavaScript variable
  const script = document.createElement('script');
  script.textContent = `
      window.userType = "${userType}";
  `;
  document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', function() {
  // Set up global listeners for the delete product modal
  const confirmDeleteBtn = document.getElementById('confirm-delete-product');
  const cancelDeleteBtn = document.getElementById('cancel-delete-product');
  
  if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', function(e) {
          e.preventDefault();
          closeDeleteConfirmation();
      });
  }
  
  if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', function(e) {
          e.preventDefault();
          const productId = this.getAttribute('data-product-id');
          if (productId) {
              deleteProduct(productId);
              closeDeleteConfirmation();
          }
      });
  }
  
  // Also handle clicks outside the modal to close it
  const deleteProductModal = document.getElementById('delete-product-confirmation');
  if (deleteProductModal) {
      deleteProductModal.addEventListener('click', function(e) {
          if (e.target === this) {
              closeDeleteConfirmation();
          }
      });
  }
});

function deleteSchedule(scheduleId) {
    // Get CSRF token
    const csrfToken = getCSRFToken();
    
    // Send delete request
    fetch(`/monitoring/delete-schedule/${scheduleId}/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.status === 'success') {
        // Show success message
        createToast(data.message || 'Schedule deleted successfully', 'success');
        
        // Remove deleted schedule from list
        const scheduleItem = document.querySelector(`.PM-schedule-item[data-id="${scheduleId}"]`);
        if (scheduleItem) {
          scheduleItem.style.animation = 'fadeOut 0.3s forwards';
          setTimeout(() => {
            scheduleItem.remove();
          }, 300);
        }
        
        // Add fadeOut animation if it doesn't exist
        if (!document.getElementById('fadeout-animation')) {
          const style = document.createElement('style');
          style.id = 'fadeout-animation';
          style.textContent = `
            @keyframes fadeOut {
              from { opacity: 1; transform: translateY(0); }
              to { opacity: 0; transform: translateY(-10px); }
            }
          `;
          document.head.appendChild(style);
        }
      } else {
        // Show error message
        createToast(data.message || 'Error deleting schedule', 'error');
      }
    })
    .catch(error => {
      console.error('Error deleting schedule:', error);
      createToast('An error occurred while deleting the schedule', 'error');
    });
}

function setupScheduleEdit() {
  // Add event listeners to edit buttons
  document.querySelectorAll('.PM-edit-schedule-btn').forEach(button => {
      button.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const scheduleId = this.getAttribute('data-id');
          const currentStatus = this.getAttribute('data-current-status');
          
          loadScheduleForEditing(scheduleId, currentStatus);
      });
  });
  
  // Setup form submission
  const form = document.getElementById('add-schedule-form');
  if (form) {
      form.addEventListener('submit', function(e) {
          e.preventDefault();
          
          if (validateScheduleForm()) {
              submitScheduleForm(this);
          }
      });
  }
}

/**
 * Validate schedule form
 * @returns {boolean} - Whether the form is valid
 */
function validateScheduleForm() {
  const form = document.getElementById('add-schedule-form');
  let isValid = true;
  
  // Required fields
  const requiredFields = [
      { id: 'id_product_number', name: 'Product' },
      { id: 'id_date_planned', name: 'Planned date' },
      { id: 'id_shift', name: 'Shift' },
      { id: 'id_planned_qty', name: 'Planned quantity' },
      { id: 'id_status', name: 'Status' }
  ];
  
  requiredFields.forEach(field => {
      const input = form.querySelector(`#${field.id}`);
      if (!input.value.trim()) {
          createToast(`${field.name} is required`, 'error');
          input.classList.add('invalid');
          isValid = false;
      } else {
          input.classList.remove('invalid');
      }
  });
  
  // Validate quantity is a positive number
  const qtyInput = form.querySelector('#id_planned_qty');
  if (qtyInput.value && (!parseInt(qtyInput.value) || parseInt(qtyInput.value) <= 0)) {
      createToast('Planned quantity must be a positive number', 'error');
      qtyInput.classList.add('invalid');
      isValid = false;
  }
  
  return isValid;
}

/**
 * Submit schedule form with AJAX
 * @param {HTMLFormElement} form - The form to submit
 */
function submitScheduleForm(form) {
  // Get form data
  const formData = new FormData(form);
  
  // Show loading state
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.classList.add('loading');
  submitButton.textContent = '';
  
  // Send request
  fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: {
          'X-CSRFToken': getCSRFToken(),
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
      // Reset loading state
      submitButton.classList.remove('loading');
      submitButton.textContent = originalText;
      
      if (data.status === 'success') {
          // Show success message
          createToast(data.message || 'Schedule saved successfully', 'success');
          
          // Close modal
          const modal = document.getElementById('add-schedule-modal');
          modal.classList.remove('active');
          setTimeout(() => {
              modal.style.display = 'none';
          }, 300);
          
          // Refresh schedule list
          const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
          if (groupId) {
              setTimeout(() => {
                  loadGroupDetails(groupId);
              }, 500);
          }
      } else {
          throw new Error(data.message || 'Failed to save schedule');
      }
  })
  .catch(error => {
      console.error('Error submitting schedule form:', error);
      createToast(error.message || 'Failed to save schedule', 'error');
      submitButton.classList.remove('loading');
      submitButton.textContent = originalText;
  });
}

function addScheduleStyles() {
  if (!document.getElementById('schedule-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'schedule-animation-styles';
      style.textContent = `
          @keyframes fadeOut {
              from { opacity: 1; transform: translateY(0); }
              to { opacity: 0; transform: translateY(-10px); }
          }
          
          .PM-schedule-item {
              transition: background-color 0.3s;
          }
          
          .PM-schedule-item:hover {
              background-color: rgba(51, 102, 255, 0.05);
          }
          
          .PM-schedule-item .PM-schedule-actions {
              opacity: 0.5;
              transition: opacity 0.3s;
          }
          
          .PM-schedule-item:hover .PM-schedule-actions {
              opacity: 1;
          }
          
          .invalid {
              border-color: #f14668 !important;
              background-color: rgba(241, 70, 104, 0.05) !important;
          }
          
          .PM-field-error {
              color: #f14668;
              font-size: 0.85rem;
              margin-top: 4px;
          }
      `;
      document.head.appendChild(style);
  }
}

function initializeScheduleTab() {
  addScheduleStyles();
  setupScheduleDelete();
  setupScheduleEdit();
  
  // Add event listener to add schedule button
  const addScheduleBtn = document.getElementById('add-schedule-btn');
  if (addScheduleBtn) {
      addScheduleBtn.addEventListener('click', function() {
          // Reset form
          const form = document.getElementById('add-schedule-form');
          if (form) {
              form.reset();
              form.action = '/monitoring/add-schedule/';
              
              // Reset title and button
              const modalTitle = document.querySelector('#add-schedule-modal .PM-modal-header h2');
              if (modalTitle) {
                  modalTitle.textContent = 'Add Production Schedule';
              }
              
              const saveButton = document.getElementById('save-schedule');
              if (saveButton) {
                  saveButton.textContent = 'Add Schedule';
              }
              
              // Set group ID
              const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
              if (groupId) {
                  document.getElementById('schedule-group-id').value = groupId;
              }
              
              // Show modal
              const modal = document.getElementById('add-schedule-modal');
              modal.style.display = 'flex';
              modal.classList.add('active');
          }
      });
  }
}

// Call this function when the schedule tab is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the monitoring page
  if (document.querySelector('.PM-monitoring-groups')) {
      // Initialize when schedule tab is shown
      document.addEventListener('scheduleTabShown', function() {
          initializeScheduleTab();
      });
      
      // Also initialize when group details are loaded
      document.addEventListener('groupDetailsLoaded', function() {
          // Fire event when schedule tab is clicked
          document.querySelectorAll('.PM-tab-button[data-tab="schedule"]').forEach(button => {
              button.addEventListener('click', function() {
                  document.dispatchEvent(new CustomEvent('scheduleTabShown'));
              });
          });
      });
  }
});


// Update the original loadGroupDetails function to add edit and delete buttons
function updateProductsList(data) {
  console.log("Updating products list with data:", data);
  
  const productList = document.querySelector('.PM-product-list');
  if (!productList) {
      console.error("Product list element not found");
      return;
  }
  
  // Keep the header
  const productHeader = productList.querySelector('.PM-product-header');
  productList.innerHTML = '';
  if (productHeader) {
      productList.appendChild(productHeader);
  }
  
  // Check if products exist in the data
  if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
      // Show empty state if no products (only show once)
      if (!productList.querySelector('.PM-empty-state')) {
          const emptyState = document.createElement('div');
          emptyState.className = 'PM-empty-state';
          emptyState.innerHTML = `
              <i class="fas fa-box-open"></i>
              <h3>No Products Found</h3>
              <p>No products have been added to this group yet.</p>
          `;
          productList.appendChild(emptyState);
      }
      return;
  }
  
  // Create product items
  data.products.forEach(product => {
      const productItem = document.createElement('div');
      productItem.className = 'PM-product-item';
      productItem.setAttribute('data-id', product.id);
      
      productItem.innerHTML = `
          <div class="PM-product-col">${product.name || 'N/A'}</div>
          <div class="PM-product-col">${product.description || 'N/A'}</div>
          <div class="PM-product-col">${product.line || 'N/A'}</div>
          <div class="PM-product-col">${product.qty_per_box || 0}</div>
          <div class="PM-product-col">${product.qty_per_hour || 0}</div>
          <div class="PM-product-col" style="text-align: center">
              <div class="PM-product-actions">
                  <button class="PM-product-action-btn PM-edit-btn" data-id="${product.id}" title="Edit Product">
                      <i class="fas fa-edit"></i>
                  </button>
                  <button class="PM-product-action-btn PM-delete-btn" data-id="${product.id}" title="Delete Product">
                      <i class="fas fa-trash-alt"></i>
                  </button>
              </div>
          </div>
      `;
      
      productList.appendChild(productItem);
  });
  
  // Add event listeners to edit and delete buttons
  setupProductActions();
}

document.getElementById('add-product-btn')?.addEventListener('click', function() {
    const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
    if (groupId) {
      // Set the monitoring group ID in the modal form
      document.getElementById('product-group-id').value = groupId;
      
      // Reset form if it was previously used for editing
      const form = document.getElementById('add-product-form');
      if (form) {
        form.reset();
        
        // Set the correct action URL for adding products
        form.action = '/monitoring/add-product/';
      }
      
      // Set modal title to "Add Product"
      const modalTitle = document.querySelector('#add-product-modal .PM-modal-header h2');
      if (modalTitle) {
        modalTitle.textContent = 'Add Product';
      }
      
      // Update submit button text
      const submitButton = document.getElementById('save-product');
      if (submitButton) {
        submitButton.textContent = 'Add Product';
      }
      
      // Show the modal with proper centering and z-index
      const modal = document.getElementById('add-product-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '1010'; // Higher z-index to ensure it's on top
        modal.classList.add('active');
      }
    } else {
      createToast('Could not determine which group to add product to.', 'error');
    }
});

function validateProductForm() {
    const form = document.getElementById('add-product-form');
    if (!form) return true;
    
    let isValid = true;
    const productName = form.querySelector('#id_product_name').value.trim();
    const line = form.querySelector('#id_line').value;
    const qtyPerBox = form.querySelector('#id_qty_per_box').value.trim();
    const qtyPerHour = form.querySelector('#id_qty_per_hour').value.trim();
    const description = form.querySelector('#id_description').value.trim();
    
    // Check required fields
    if (!productName) {
      createToast('Product name is required', 'error');
      isValid = false;
    }
    
    if (!line) {
      createToast('Production line is required', 'error');
      isValid = false;
    }
    
    if (!qtyPerBox) {
      createToast('Quantity per box is required', 'error');
      isValid = false;
    }
    
    if (!qtyPerHour) {
      createToast('Quantity per hour is required', 'error');
      isValid = false;
    }
    
    // Make description required
    if (!description) {
      createToast('Description is required', 'error');
      isValid = false;
    }
    
    return isValid;
  }
  
  const productForm = document.getElementById('add-product-form');
  if (productForm) {
    productForm.addEventListener('submit', function(e) {
      if (!validateProductForm()) {
        e.preventDefault();
        return false;
      }
      
      // If valid, add loading state to submit button
      const submitButton = this.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.classList.add('loading');
        submitButton.textContent = '';
      }
    });
}

function fixTabSwitching() {
  console.log("Fixing tab switching...");
  
  // Get all tab buttons
  const tabButtons = document.querySelectorAll('.PM-tab-button');
  console.log("Found tab buttons:", tabButtons.length);
  
  // Add fresh event listeners to tab buttons
  tabButtons.forEach(button => {
    // Remove existing click events by cloning
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add fresh event listener
    newButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const tabId = this.getAttribute('data-tab');
      console.log("Tab clicked:", tabId);
      
      // Directly call switchTab function
      switchTab(tabId);
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded - initializing dashboard fixes");
  
  // Set a timeout to ensure all elements are loaded
  setTimeout(function() {
    fixTabSwitching();
    fixImportModals();
  }, 500);
});

// Also reinitialize when group details are loaded
document.addEventListener('groupDetailsLoaded', function() {
  console.log("Group details loaded - reinitializing components");
  fixTabSwitching();
  fixImportModals();
});

function fixImportModals() {
  console.log("Fixing import modals...");
  
  // Fix Import Product button
  const importProductBtn = document.getElementById('import-product');
  if (importProductBtn) {
    // Remove existing listeners
    const newImportBtn = importProductBtn.cloneNode(true);
    importProductBtn.parentNode.replaceChild(newImportBtn, importProductBtn);
    
    // Add fresh event listener
    newImportBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("Import product button clicked");
      const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
      if (!groupId) {
        console.error("Group ID not found");
        createToast('Could not determine which group to import products for.', 'error');
        return;
      }
      
      // Set the monitoring group ID in the form
      const groupIdField = document.getElementById('import-product-group-id');
      if (groupIdField) {
        groupIdField.value = groupId;
      }
      
      // Get the modal and display it properly
      const modal = document.getElementById('import-product-modal');
      if (modal) {
        console.log("Showing import product modal");
        modal.style.display = 'flex'; // Use flex for modal-center class
        modal.style.zIndex = '1100';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        console.error("Import product modal not found");
      }
    });
  }
  
  // Fix Import Schedule button
  const importScheduleBtn = document.getElementById('import-schedule');
  if (importScheduleBtn) {
    // Remove existing listeners
    const newImportBtn = importScheduleBtn.cloneNode(true);
    importScheduleBtn.parentNode.replaceChild(newImportBtn, importScheduleBtn);
    
    // Add fresh event listener
    newImportBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("Import schedule button clicked");
      const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
      if (!groupId) {
        console.error("Group ID not found");
        createToast('Could not determine which group to import schedules for.', 'error');
        return;
      }
      
      // Set the monitoring group ID in the form
      const groupIdField = document.getElementById('import-schedule-group-id');
      if (groupIdField) {
        groupIdField.value = groupId;
      }
      
      // Get the modal and display it properly
      const modal = document.getElementById('import-schedule-modal');
      if (modal) {
        console.log("Showing import schedule modal");
        modal.style.display = 'flex'; // Use flex for modal-center class
        modal.style.zIndex = '1100';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        console.error("Import schedule modal not found");
      }
    });
  }
   // Fix close buttons for import modals
   document.querySelectorAll('#import-product-modal .PM-modal-close, #import-schedule-modal .PM-modal-close, #cancel-product-import, #cancel-schedule-import').forEach(button => {
    // Remove existing listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add fresh event listener
    newButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const modal = this.closest('.PM-modal');
      if (modal) {
        console.log("Closing modal:", modal.id);
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  });
}

const originalUpdateGroupDetailsView = window.updateGroupDetailsView;
window.updateGroupDetailsView = function(data) {
  // Call the original function
  if (originalUpdateGroupDetailsView) {
    originalUpdateGroupDetailsView(data);
  }

  // Now specifically handle the schedule list
  const scheduleTab = document.getElementById('schedule-tab');
  if (!scheduleTab) {
    console.error("Schedule tab not found");
    return;
  }
  
  const scheduleList = scheduleTab.querySelector('.PM-schedule-list');
  if (!scheduleList) {
    console.error("Schedule list container not found");
    return;
  }
  
  // Keep the header row
  const scheduleHeader = scheduleList.querySelector('.PM-schedule-header');
  const existingItems = scheduleList.querySelectorAll('.PM-schedule-item');
  
  // Remove existing rows but keep the header
  existingItems.forEach(item => item.remove());
  
  // Check if header has all necessary columns including Actions
  if (scheduleHeader) {
    const headerColumns = scheduleHeader.querySelectorAll('.PM-schedule-col');
    
    // If the header doesn't have enough columns, add the Actions column
    if (headerColumns.length === 7) {  // Missing Actions column
      const actionsCol = document.createElement('div');
      actionsCol.className = 'PM-schedule-col';
      actionsCol.style.textAlign = 'center';
      actionsCol.textContent = 'Actions';
      scheduleHeader.appendChild(actionsCol);
    }
    
    // Ensure flex alignments are correct in header
    const flexValues = ['1.5', '1', '0.7', '1', '1', '1', '1', '1'];
    headerColumns.forEach((col, index) => {
      if (index < flexValues.length) {
        col.style.flex = flexValues[index];
      }
    });
  }
  
  // Get user permissions for action buttons visibility
  const userType = document.body.getAttribute('data-user-type') || '';
  const isSales = userType.includes('monitoring_sales');
  const isSupervisor = userType.includes('monitoring_supervisor');
  const isManager = userType.includes('monitoring_manager');
  
  // For testing, enable all actions
  const canDelete = true; // In production: isSales
  const canEdit = true;   // In production: isSales || isSupervisor || isManager
  
  // Create schedule items
  data.schedules.forEach((schedule, index) => {
    const scheduleItem = document.createElement('div');
    scheduleItem.className = 'PM-schedule-item';
    scheduleItem.setAttribute('data-id', schedule.id || '');
    
    // Determine status class for visual styling
    let statusClass = 'active';
    if (schedule.status === 'Change Load') {
      statusClass = 'warning';
    } else if (schedule.status === 'Backlog') {
      statusClass = 'inactive';
    }
    
    // Create HTML for schedule item with proper column structure
    scheduleItem.innerHTML = `
      <div class="PM-schedule-col" style="flex: 1.5">${formatDate(schedule.date_planned)}</div>
      <div class="PM-schedule-col" style="flex: 1.5">${schedule.product || 'N/A'}</div>
      <div class="PM-schedule-col" style="flex: 1">${schedule.line || 'N/A'}</div>
      <div class="PM-schedule-col" style="flex: 0.7">${schedule.shift || 'N/A'}</div>
      <div class="PM-schedule-col" style="flex: 1">${schedule.planned_qty || 0}</div>
      <div class="PM-schedule-col" style="flex: 1">${schedule.produced_qty || 0}</div>
      <div class="PM-schedule-col" style="flex: 1">${schedule.balance || 0}</div>
      <div class="PM-schedule-col" style="flex: 1"><span class="PM-status ${statusClass}">${schedule.status || 'N/A'}</span></div>
      <div class="PM-schedule-col" style="flex: 1; text-align: center;">
        <div class="PM-product-actions">
          ${canEdit ? `
          <button class="PM-product-action-btn PM-edit-btn PM-edit-schedule-btn" 
                title="Edit Schedule"
                data-id="${schedule.id || ''}" 
                data-name="${schedule.product || ''}"
                data-current-status="${schedule.status || ''}">
            <i class="fas fa-edit"></i>
          </button>
          ` : ''}
          ${canDelete ? `
          <button class="PM-product-action-btn PM-delete-btn PM-delete-schedule-btn" 
                title="Delete Schedule"
                data-id="${schedule.id || ''}" 
                data-name="${schedule.product || ''}">
            <i class="fas fa-trash-alt"></i>
          </button>
          ` : ''}
        </div>
      </div>
    `;
    
    // Add the schedule item to the list
    scheduleList.appendChild(scheduleItem);
  });
  
  // Set up event listeners for action buttons
  setupScheduleActionButtons();
};

function setupScheduleActionButtons() {
  // Handle edit buttons
  document.querySelectorAll('.PM-edit-schedule-btn').forEach(button => {
    // Remove any existing listeners by cloning and replacing
    const newButton = button.cloneNode(true);
    if (button.parentNode) {
      button.parentNode.replaceChild(newButton, button);
    }
    
    // Add fresh event listener
    newButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const scheduleId = this.getAttribute('data-id');
      const scheduleName = this.getAttribute('data-name');
      
      console.log("Edit button clicked for schedule:", scheduleId);
      
      // Load schedule for editing
      loadScheduleForEditing(scheduleId);
    });
  });
  
  // Handle delete buttons
  document.querySelectorAll('.PM-delete-schedule-btn').forEach(button => {
    // Remove any existing listeners by cloning and replacing
    const newButton = button.cloneNode(true);
    if (button.parentNode) {
      button.parentNode.replaceChild(newButton, button);
    }
    
    // Add fresh event listener
    newButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const scheduleId = this.getAttribute('data-id');
      const scheduleName = this.getAttribute('data-name');
      
      console.log("Delete button clicked for schedule:", scheduleId, scheduleName);
      
      // Show delete confirmation
      showDeleteScheduleConfirmation(scheduleId, scheduleName);
    });
  });
}

function showDeleteScheduleConfirmation(scheduleId, scheduleName) {
    const modal = document.getElementById('delete-schedule-confirmation');
    if (!modal) {
      console.error('Delete schedule confirmation modal not found');
      return;
    }
    
    // Set schedule name in confirmation text
    const scheduleNameElement = document.getElementById('confirm-schedule-name');
    if (scheduleNameElement) {
      scheduleNameElement.textContent = scheduleName || 'this schedule';
    }
    
    // Get confirmation and cancel buttons
    const confirmBtn = document.getElementById('confirm-schedule-product');
    const cancelBtn = document.getElementById('cancel-schedule-product');
    
    // Remove any existing event listeners by cloning and replacing the buttons
    if (confirmBtn) {
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      
      // Store the schedule ID in the data attribute
      newConfirmBtn.setAttribute('data-schedule-id', scheduleId);
      
      // Add fresh event listener for delete action
      newConfirmBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const schedId = this.getAttribute('data-schedule-id');
        if (schedId) {
          deleteSchedule(schedId);
          closeDeleteScheduleConfirmation();
        }
      });
    }
    
    if (cancelBtn) {
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      
      // Add fresh event listener for cancel action
      newCancelBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeDeleteScheduleConfirmation();
      });
    }
    
    // Show the modal
    modal.classList.add('active');
}

function closeDeleteScheduleConfirmation() {
    const modal = document.getElementById('delete-schedule-confirmation');
    if (modal) {
      modal.classList.remove('active');
    }
}

function createToast(message, type = 'info', duration = 3000) {
  // Check if toast container exists, if not create it
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create the toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Choose the right icon
  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-check-circle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';
  if (type === 'warning') iconClass = 'fa-exclamation-triangle';
  
  // Fill the toast with content
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
  
  // Add show class after a small delay for the animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Set up close button
  const closeBtn = toast.querySelector('.close-btn');
  closeBtn.addEventListener('click', function() {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  });
  
  // Auto remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

// Run initialization when the page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing schedule tab fixes...');
  
  // Removed automatic view modal trigger
});

function setupImportButtonHandlers() {
  // Import Schedule button
  const importScheduleBtn = document.getElementById('import-schedule');
  if (importScheduleBtn) {
      // Remove any existing event listeners by cloning and replacing
      const newImportScheduleBtn = importScheduleBtn.cloneNode(true);
      if (importScheduleBtn.parentNode) {
          importScheduleBtn.parentNode.replaceChild(newImportScheduleBtn, importScheduleBtn);
      }
      
      newImportScheduleBtn.addEventListener('click', function(e) {
          e.preventDefault();
          
          // Get the current monitoring group ID from the detail view
          const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
          console.log('Schedule Import - Group ID:', groupId);
          
          if (groupId) {
              // Set the monitoring group ID in the form
              const monitoringIdInput = document.getElementById('import-schedule-group-id');
              if (monitoringIdInput) {
                  monitoringIdInput.value = groupId;
              }
              
              // Update the template download link
              const downloadLink = document.querySelector('#import-schedule-modal a[href*="export-schedule-template"]');
              if (downloadLink) {
                  const baseUrl = downloadLink.href.split('?')[0];
                  downloadLink.href = `${baseUrl}?monitoring_id=${groupId}`;
                  console.log('Updated schedule template link:', downloadLink.href);
              }
              
              // Display the modal
              const modal = document.getElementById('import-schedule-modal');
              if (modal) {
                  modal.style.display = 'flex';
                  modal.classList.add('active');
              }
          } else {
              createToast('Could not determine which monitoring group to use.', 'error');
          }
      });
  }
  
  // Import Product button
  const importProductBtn = document.getElementById('import-product');
  if (importProductBtn) {
      // Remove any existing event listeners by cloning and replacing
      const newImportProductBtn = importProductBtn.cloneNode(true);
      if (importProductBtn.parentNode) {
          importProductBtn.parentNode.replaceChild(newImportProductBtn, importProductBtn);
      }
      
      newImportProductBtn.addEventListener('click', function(e) {
          e.preventDefault();
          
          // Get the current monitoring group ID from the detail view
          const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
          console.log('Product Import - Group ID:', groupId);
          
          if (groupId) {
              // Set the monitoring group ID in the form
              const monitoringIdInput = document.getElementById('import-product-group-id');
              if (monitoringIdInput) {
                  monitoringIdInput.value = groupId;
              }
              
              // Update the template download link
              const downloadLink = document.querySelector('#import-product-modal a[href*="export-product-template"]');
              if (downloadLink) {
                  const baseUrl = downloadLink.href.split('?')[0];
                  downloadLink.href = `${baseUrl}?monitoring_id=${groupId}`;
                  console.log('Updated product template link:', downloadLink.href);
              }
              
              // Display the modal
              const modal = document.getElementById('import-product-modal');
              if (modal) {
                  modal.style.display = 'flex';
                  modal.classList.add('active');
              }
          } else {
              createToast('Could not determine which monitoring group to use.', 'error');
          }
      });
  }
}

function setupOpenDashboardButton() {
  // Get the open dashboard button
  const openDashboardBtn = document.getElementById('open-dashboard-btn');
  if (!openDashboardBtn) return;
  
  // Remove any existing event listeners by cloning the element
  const newOpenDashboardBtn = openDashboardBtn.cloneNode(true);
  if (openDashboardBtn.parentNode) {
      openDashboardBtn.parentNode.replaceChild(newOpenDashboardBtn, openDashboardBtn);
  }
  
  // Get the current group ID
  const groupId = document.querySelector('#detail-group-name')?.getAttribute('data-id');
  if (!groupId) {
      console.error('Group ID not found for dashboard button');
      return;
  }
  
  // Add a single new event listener
  newOpenDashboardBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Dashboard button clicked for group:', groupId);
      
      // Open dashboard in a new tab
      window.open(`/monitoring/group-dashboard/${groupId}/`, '_blank');
  });
  
  console.log('Dashboard button set up successfully for group:', groupId);
}

// Call this function when group details are loaded
document.addEventListener('groupDetailsLoaded', function(e) {
  console.log('Group details loaded, setting up dashboard button');
  setupOpenDashboardButton();
});

document.addEventListener('DOMContentLoaded', function() {
  const tabButtons = document.querySelectorAll('.PM-tab-button');
  tabButtons.forEach(button => {
      button.addEventListener('click', function() {
          const tabId = this.getAttribute('data-tab');
          if (tabId === 'schedule') {
              console.log('Schedule tab clicked, initializing filters');
              setupScheduleFilterListeners();
          }
      });
  });
  
  // Also set up filters when group details are loaded
  document.addEventListener('groupDetailsLoaded', function() {
      console.log('Group details loaded, initializing schedule filters');
      
      // Use a small delay to ensure the DOM is fully updated
      setTimeout(() => {
          setupScheduleFilterListeners();
          
          // Also fire a custom event for the schedule tab
          document.dispatchEvent(new CustomEvent('scheduleTabShown'));
      }, 200);
  });
});

function fixScheduleDateFilter() {
    // Get the filter elements
    const dateFilter = document.getElementById('schedule-date');
    const shiftFilter = document.getElementById('schedule-shift');
    const statusFilter = document.getElementById('schedule-status');
    
    if (!dateFilter) {
      console.error('Date filter element not found');
      return;
    }
    
    // Clean up: remove any existing event listeners by cloning
    const newDateFilter = dateFilter.cloneNode(true);
    if (dateFilter.parentNode) {
      dateFilter.parentNode.replaceChild(newDateFilter, dateFilter);
    }
    
    if (shiftFilter) {
      const newShiftFilter = shiftFilter.cloneNode(true);
      shiftFilter.parentNode.replaceChild(newShiftFilter, shiftFilter);
      shiftFilter = newShiftFilter;
    }
    
    if (statusFilter) {
      const newStatusFilter = statusFilter.cloneNode(true);
      statusFilter.parentNode.replaceChild(newStatusFilter, statusFilter);
      statusFilter = newStatusFilter;
    }
    
    // Add a single comprehensive filter function
    const applyFilters = function() {
      console.log('Applying schedule filters');
      
      const selectedDate = newDateFilter.value;
      const selectedShift = shiftFilter ? shiftFilter.value : 'all';
      const selectedStatus = statusFilter ? statusFilter.value : 'all';
      
      console.log('Filter values:', { date: selectedDate, shift: selectedShift, status: selectedStatus });
      
      const scheduleList = document.querySelector('.PM-schedule-list');
      if (!scheduleList) {
        console.error('Schedule list not found');
        return;
      }
      
      // Remove existing empty state if any
      const existingEmptyState = scheduleList.querySelector('.PM-empty-state');
      if (existingEmptyState) {
        existingEmptyState.remove();
      }
      
      // Get all schedule items
      const items = scheduleList.querySelectorAll('.PM-schedule-item');
      console.log(`Found ${items.length} schedule items to filter`);
      
      let visibleCount = 0;
      
      // Apply filters to each item
      items.forEach(item => {
        // Get filter values from data attributes
        const itemDate = item.getAttribute('data-date') || '';
        const itemShift = item.getAttribute('data-shift') || '';
        const itemStatus = item.getAttribute('data-status') || '';
        
        // Check if item passes all selected filters
        const dateMatch = !selectedDate || itemDate === selectedDate;
        const shiftMatch = selectedShift === 'all' || itemShift === selectedShift;
        const statusMatch = selectedStatus === 'all' || itemStatus === selectedStatus;
        
        // Show/hide item based on filters
        const shouldShow = dateMatch && shiftMatch && statusMatch;
        item.style.display = shouldShow ? '' : 'none';
        
        if (shouldShow) {
          visibleCount++;
        }
      });
      
      console.log(`Filters applied: ${visibleCount} items visible out of ${items.length}`);
      
      // Show empty state if needed
      if (items.length > 0 && visibleCount === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'PM-empty-state';
        emptyState.innerHTML = `
          <i class="fas fa-filter"></i>
          <h3>No Matching Schedules</h3>
          <p>No schedules match your current filter criteria. Try changing or clearing your filters.</p>
        `;
        scheduleList.appendChild(emptyState);
      }
    };
    
    // Add clear button for date filter
    const dateFilterContainer = newDateFilter.parentElement;
    if (dateFilterContainer) {
      // Remove any existing clear button
      const existingClearBtn = dateFilterContainer.querySelector('.date-clear-btn');
      if (existingClearBtn) {
        existingClearBtn.remove();
      }
      
      // Position container for the clear button
      dateFilterContainer.style.position = 'relative';
      
      // Create clear button
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'date-clear-btn';
      clearBtn.innerHTML = '<i class="fas fa-times"></i>';
      clearBtn.style.position = 'absolute';
      clearBtn.style.right = '10px';
      clearBtn.style.top = '50%';
      clearBtn.style.transform = 'translateY(-50%)';
      clearBtn.style.background = 'none';
      clearBtn.style.border = 'none';
      clearBtn.style.color = '#666';
      clearBtn.style.cursor = 'pointer';
      clearBtn.style.display = newDateFilter.value ? 'block' : 'none';
      
      // Add clear button to container
      dateFilterContainer.appendChild(clearBtn);
      
      // Clear button event handler
      clearBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        newDateFilter.value = '';
        this.style.display = 'none';
        applyFilters();
      });
      
      // Update clear button visibility on input
      newDateFilter.addEventListener('input', function() {
        clearBtn.style.display = this.value ? 'block' : 'none';
      });
    }
    
    // Add event listeners to filter elements
    newDateFilter.addEventListener('change', applyFilters);
    
    if (shiftFilter) {
      shiftFilter.addEventListener('change', applyFilters);
    }
    
    if (statusFilter) {
      statusFilter.addEventListener('change', applyFilters);
    }
    
    // Apply filters on initialization
    applyFilters();
}

function ensureScheduleDataAttributes() {
    const items = document.querySelectorAll('.PM-schedule-item');
    
    items.forEach(item => {
      // Skip items that already have data-date attribute
      if (item.hasAttribute('data-date')) return;
      
      // Try to extract date from the first column text
      const dateColumn = item.querySelector('.PM-schedule-col:first-child');
      if (!dateColumn) return;
      
      const dateText = dateColumn.textContent.trim();
      try {
        // Parse date text into a Date object
        const dateObj = new Date(dateText);
        if (!isNaN(dateObj.getTime())) {
          // Convert to YYYY-MM-DD format
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          
          // Set data-date attribute
          item.setAttribute('data-date', formattedDate);
          console.log(`Added data-date attribute: ${formattedDate} to item`);
        }
      } catch (e) {
        console.error('Error parsing date:', dateText, e);
      }
      
      // If shift is missing, extract from shift column (4th column)
      if (!item.hasAttribute('data-shift')) {
        const shiftColumn = item.querySelector('.PM-schedule-col:nth-child(4)');
        if (shiftColumn) {
          const shift = shiftColumn.textContent.trim();
          item.setAttribute('data-shift', shift);
        }
      }
      
      // If status is missing, extract from status column (8th column)
      if (!item.hasAttribute('data-status')) {
        const statusSpan = item.querySelector('.PM-status');
        if (statusSpan) {
          const status = statusSpan.textContent.trim();
          item.setAttribute('data-status', status);
        }
      }
    });
}

function initializeScheduleFilters() {
    console.log('Initializing schedule filters');
    
    // First ensure all items have proper data attributes
    ensureScheduleDataAttributes();
    
    // Then set up the filtering functionality
    fixScheduleDateFilter();
}

function populateScheduleItems(container, schedules) {
    // Define column flex values for consistent alignment
    const columnFlexValues = {
      date: '1.5',
      product: '1.5',
      line: '1',
      shift: '0.7',
      planned: '1',
      produced: '1',
      balance: '1',
      status: '1',
      actions: '1'
    };
    
    // Add each schedule item
    schedules.forEach(schedule => {
      const scheduleItem = document.createElement('div');
      scheduleItem.className = 'PM-schedule-item';
      scheduleItem.setAttribute('data-id', schedule.id);
      
      // Store raw date for filtering
      if (schedule.date_planned) {
        const rawDate = schedule.date_planned.split('T')[0].trim();
        scheduleItem.setAttribute('data-date', rawDate);
      }
      
      // Store other attributes
      scheduleItem.setAttribute('data-shift', schedule.shift || '');
      scheduleItem.setAttribute('data-status', schedule.status || '');
      
      // Determine status class
      let statusClass = 'active';
      if (schedule.status === 'Change Load') {
        statusClass = 'warning';
      } else if (schedule.status === 'Backlog') {
        statusClass = 'inactive';
      }
      
      // Format date for display
      const formattedDate = formatDate(schedule.date_planned);
      
      // Build HTML
      scheduleItem.innerHTML = `
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.date}">${formattedDate}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.product}">${schedule.product || 'N/A'}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.line}">${schedule.line || 'N/A'}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.shift}">${schedule.shift || 'N/A'}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.planned}">${schedule.planned_qty || 0}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.produced}">${schedule.produced_qty || 0}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.balance}">${schedule.balance || 0}</div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.status}"><span class="PM-status ${statusClass}">${schedule.status || 'N/A'}</span></div>
        <div class="PM-schedule-col" style="flex: ${columnFlexValues.actions}; text-align: center;">
          <div class="PM-product-actions">
            <button class="PM-edit-schedule-btn PM-product-action-btn PM-edit-btn" data-id="${schedule.id}" data-current-status="${schedule.status || ''}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="PM-delete-schedule-btn PM-product-action-btn PM-delete-btn" data-id="${schedule.id}" data-name="${schedule.product || 'this schedule'}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
      
      // Add to container
      container.appendChild(scheduleItem);
    });
    
    // Setup action buttons
    setupScheduleActions();
}

// Direct fix for schedule date filtering
function fixScheduleDateFilter() {
    // Get the date filter input
    const dateFilter = document.getElementById('schedule-date');
    if (!dateFilter) {
      console.error('Date filter element not found');
      return;
    }
  
    // Clear any existing event listeners by cloning and replacing
    const newDateFilter = dateFilter.cloneNode(true);
    dateFilter.parentNode.replaceChild(newDateFilter, dateFilter);
  
    // Add a direct event listener to handle date filtering
    newDateFilter.addEventListener('change', function() {
      const selectedDate = this.value;
      console.log('Date filter changed to:', selectedDate);
      
      // Get all schedule items
      const scheduleItems = document.querySelectorAll('.PM-schedule-item');
      console.log(`Found ${scheduleItems.length} schedule items to filter`);
  
      // Keep track if any items match the filter
      let hasVisibleItems = false;
      
      if (selectedDate) {
        // Get selected date in a standardized format (yyyy-mm-dd)
        const formattedSelectedDate = selectedDate;
        console.log('Filtering for date:', formattedSelectedDate);
        
        // Loop through each schedule item
        scheduleItems.forEach(item => {
          // First try to get the date from the data-date attribute (most accurate)
          let itemDate = item.getAttribute('data-date');
          
          // If no data-date attribute, get from the first column
          if (!itemDate) {
            const dateColumn = item.querySelector('.PM-schedule-col:first-child');
            if (dateColumn) {
              const displayDate = dateColumn.textContent.trim();
              // Try to convert display date to standard format
              try {
                const dateObj = new Date(displayDate);
                if (!isNaN(dateObj.getTime())) {
                  // Format to yyyy-mm-dd
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  itemDate = `${dateObj.getFullYear()}-${month}-${day}`;
                }
              } catch (e) {
                console.error('Error parsing display date:', displayDate, e);
              }
            }
          }
          
          // Check if dates match
          const dateMatches = !selectedDate || itemDate === formattedSelectedDate;
          
          // Set visibility
          item.style.display = dateMatches ? '' : 'none';
          
          if (dateMatches) {
            hasVisibleItems = true;
          }
        });
        
      } else {
        // If no date selected, show all items
        scheduleItems.forEach(item => {
          item.style.display = '';
        });
        
        // Remove any empty state
        removeEmptyState();
      }
    });
    
    // Add a clear button
    const dateFilterContainer = newDateFilter.parentElement;
    if (dateFilterContainer) {
      // Remove existing clear button if any
      const existingClearBtn = dateFilterContainer.querySelector('.clear-date-btn');
      if (existingClearBtn) {
        existingClearBtn.remove();
      }
      
      // Style the container for the clear button
      dateFilterContainer.style.position = 'relative';
      
      // Create clear button
      const clearBtn = document.createElement('button');
      clearBtn.className = 'clear-date-btn';
      clearBtn.innerHTML = '<i class="fas fa-times"></i>';
      clearBtn.style.position = 'absolute';
      clearBtn.style.right = '10px';
      clearBtn.style.top = '50%';
      clearBtn.style.transform = 'translateY(-50%)';
      clearBtn.style.background = 'transparent';
      clearBtn.style.border = 'none';
      clearBtn.style.color = '#666';
      clearBtn.style.cursor = 'pointer';
      clearBtn.style.display = newDateFilter.value ? 'block' : 'none';
      
      // Add clear button event
      clearBtn.addEventListener('click', function() {
        newDateFilter.value = '';
        this.style.display = 'none';
        
        // Trigger change event to update filter
        const event = new Event('change');
        newDateFilter.dispatchEvent(event);
      });
      
      // Show/hide clear button based on input value
      newDateFilter.addEventListener('input', function() {
        clearBtn.style.display = this.value ? 'block' : 'none';
      });
      
      // Add to container
      dateFilterContainer.appendChild(clearBtn);
    }
}
  
  // Make sure updateScheduleList adds data-date attributes to each item
  function fixUpdateScheduleList() {
    // Save reference to original function
    const originalUpdateScheduleList = window.updateScheduleList;
    
    // Create new function that adds data-date attributes
    window.updateScheduleList = function(data) {
      console.log('Intercepted updateScheduleList with data:', data);
      
      const scheduleList = document.querySelector('.PM-schedule-list');
      if (!scheduleList) {
        console.error('Schedule list element not found');
        return;
      }
      
      // Clear existing content except the header
      const header = scheduleList.querySelector('.PM-schedule-header');
      scheduleList.innerHTML = '';
      if (header) {
        scheduleList.appendChild(header);
      }
      
      // Check if there are any schedules
      if (!data.schedules || data.schedules.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'PM-empty-state';
        emptyState.innerHTML = `
          <i class="fas fa-calendar-times"></i>
          <h3>No Schedules Found</h3>
          <p>No schedules have been added to this group yet.</p>
        `;
        scheduleList.appendChild(emptyState);
        return;
      }
      
      // Add each schedule item
      data.schedules.forEach(schedule => {
        const scheduleItem = document.createElement('div');
        scheduleItem.className = 'PM-schedule-item';
        scheduleItem.setAttribute('data-id', schedule.id);
        
        // IMPORTANT: Store raw date as data-date attribute
        if (schedule.date_planned) {
          // Make sure to handle different date formats
          let dateStr = schedule.date_planned;
          if (dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0];
          }
          scheduleItem.setAttribute('data-date', dateStr.trim());
          console.log(`Setting data-date attribute to: ${dateStr.trim()} for schedule ${schedule.id}`);
        }
        
        // Set other data attributes
        scheduleItem.setAttribute('data-shift', schedule.shift || '');
        scheduleItem.setAttribute('data-status', schedule.status || '');
        
        // Determine status class
        let statusClass = 'active';
        if (schedule.status === 'Change Load') {
          statusClass = 'warning';
        } else if (schedule.status === 'Backlog') {
          statusClass = 'inactive';
        }
        
        // Format date for display
        const formattedDate = formatDate(schedule.date_planned);
        
        scheduleItem.innerHTML = `
          <div class="PM-schedule-col" style="flex: 1.5">${formattedDate}</div>
          <div class="PM-schedule-col" style="flex: 1.5">${schedule.product || 'N/A'}</div>
          <div class="PM-schedule-col" style="flex: 1">${schedule.line || 'N/A'}</div>
          <div class="PM-schedule-col" style="flex: 0.7">${schedule.shift || 'N/A'}</div>
          <div class="PM-schedule-col" style="flex: 1">${schedule.planned_qty || 0}</div>
          <div class="PM-schedule-col" style="flex: 1">${schedule.produced_qty || 0}</div>
          <div class="PM-schedule-col" style="flex: 1">${schedule.balance || 0}</div>
          <div class="PM-schedule-col" style="flex: 1"><span class="PM-status ${statusClass}">${schedule.status || 'N/A'}</span></div>
          <div class="PM-schedule-col" style="flex: 1; text-align: center;">
            <div class="PM-product-actions">
              <button class="PM-edit-schedule-btn PM-product-action-btn PM-edit-btn" data-id="${schedule.id}" data-current-status="${schedule.status || ''}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="PM-delete-schedule-btn PM-product-action-btn PM-delete-btn" data-id="${schedule.id}" data-name="${schedule.product || 'this schedule'}">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        `;
        
        scheduleList.appendChild(scheduleItem);
      });
      
      // Setup action buttons and filters
      setupScheduleActions();
      fixScheduleDateFilter();
    };
}

function fixScheduleDeleteModal() {
    // Add direct event listeners to delete buttons
    document.querySelectorAll('.PM-delete-schedule-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Get schedule info
        const scheduleId = this.getAttribute('data-id');
        const scheduleName = this.getAttribute('data-name');
        
        console.log('Delete button clicked for schedule:', scheduleId, scheduleName);
        
        // Show confirmation modal
        const modal = document.getElementById('delete-schedule-confirmation');
        if (!modal) {
          console.error('Delete schedule confirmation modal not found');
          return;
        }
        
        // Set schedule name in confirmation
        const nameElement = document.getElementById('confirm-schedule-name');
        if (nameElement) {
          nameElement.textContent = scheduleName || 'this schedule';
        }
        
        // Set up confirm button
        const confirmBtn = document.getElementById('confirm-schedule-product');
        if (confirmBtn) {
          // Remove existing listeners
          const newConfirmBtn = confirmBtn.cloneNode(true);
          confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
          
          // Set data attribute and add listener
          newConfirmBtn.setAttribute('data-schedule-id', scheduleId);
          newConfirmBtn.addEventListener('click', function() {
            const id = this.getAttribute('data-schedule-id');
            console.log('Confirming delete for schedule:', id);
            
            // Delete the schedule
            if (id) {
              deleteSchedule(id);
            }
            
            // Hide modal
            modal.classList.remove('active');
          });
        }
        
        // Set up cancel button
        const cancelBtn = document.getElementById('cancel-schedule-product');
        if (cancelBtn) {
          // Remove existing listeners
          const newCancelBtn = cancelBtn.cloneNode(true);
          cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
          
          // Add listener
          newCancelBtn.addEventListener('click', function() {
            modal.classList.remove('active');
          });
        }
        
        // Show modal
        modal.classList.add('active');
      });
    });
  }
  
  function fixScheduleFilter() {
    // Get the date filter and schedule list once
    const dateFilter = document.getElementById('schedule-date');
    const scheduleList = document.querySelector('.PM-schedule-list');
    if (!dateFilter || !scheduleList) return;
    
    // Function to apply filtering
    const applyFilter = function(dateValue) {
        // Get all schedule items once
        const items = scheduleList.querySelectorAll('.PM-schedule-item');
        
        // If no date selected, show all items
        if (!dateValue) {
            items.forEach(item => item.style.display = '');
            return;
        }
        
        // Filter items by date
        items.forEach(item => {
            const itemDate = item.getAttribute('data-date');
            const isVisible = itemDate === dateValue;
            item.style.display = isVisible ? '' : 'none';
        });
    };
    
    // Remove any existing event listeners
    dateFilter.removeEventListener('change', window.originalDateFilterHandler);
    
    // Add the optimized event listener
    dateFilter.addEventListener('change', function() {
        applyFilter(this.value);
    });
    
    // Apply initial filter if a date is selected
    if (dateFilter.value) {
        applyFilter(dateFilter.value);
    }
    
    // Store the handler for future reference
    window.originalDateFilterHandler = applyFilter;
  }

  function fixDateFilter() {
    // Get the date filter element
    const dateFilter = document.getElementById('schedule-date');
    if (!dateFilter) return;
    
    // Add our own handler that will run after the original filter
    dateFilter.addEventListener('change', function() {
      // Run this on a slight delay to let the original filter work first
      setTimeout(function() {
        // Always remove all empty state messages
        const scheduleList = document.querySelector('.PM-schedule-list');
        if (!scheduleList) return;
        
        const emptyStates = scheduleList.querySelectorAll('.PM-empty-state');
        emptyStates.forEach(el => el.remove());
        
        // Count visible items
        const items = scheduleList.querySelectorAll('.PM-schedule-item');
        let visibleItems = 0;
        
        items.forEach(item => {
          if (item.style.display !== 'none') {
            visibleItems++;
          }
        });
        
        // If we have a date filter and no visible items, show empty state
        const selectedDate = dateFilter.value;
        if (selectedDate && visibleItems === 0 && items.length > 0) {
          const emptyState = document.createElement('div');
          emptyState.className = 'PM-empty-state';
          emptyState.innerHTML = `
            <i class="fas fa-calendar-times"></i>
            <h3>No Results Found</h3>
            <p>No schedules match the selected date. Try another date.</p>
          `;
          scheduleList.appendChild(emptyState);
        }
      }, 0);
    });
  }
  
  // Run the fix immediately
  fixDateFilter();
  
  // Also run fix when tab is switched to schedule
  document.addEventListener('scheduleTabShown', fixDateFilter);
  
  // And when group details are loaded
  document.addEventListener('groupDetailsLoaded', function() {
    setTimeout(fixDateFilter, 200);
  });

  // Initialize fixes
  document.addEventListener('DOMContentLoaded', function() {
    // Set up tab button click event
    document.querySelectorAll('.PM-tab-button[data-tab="schedule"]').forEach(button => {
      button.addEventListener('click', function() {
        console.log('Schedule tab clicked');
        setTimeout(initializeScheduleFilters, 100);
      });
    });
    
    // Listen for custom events
    document.addEventListener('scheduleTabShown', function() {
      console.log('scheduleTabShown event received');
      setTimeout(initializeScheduleFilters, 100);
    });
    
    document.addEventListener('groupDetailsLoaded', function() {
      console.log('groupDetailsLoaded event received');
      
      // If the schedule tab is currently active, initialize filters
      const scheduleTab = document.getElementById('schedule-tab');
      if (scheduleTab && scheduleTab.classList.contains('active')) {
        setTimeout(initializeScheduleFilters, 200);
      }
    });
    
    // Add functions to window for global access
    window.initializeScheduleFilters = initializeScheduleFilters;
    window.fixScheduleDateFilter = fixScheduleDateFilter;
    window.ensureScheduleDataAttributes = ensureScheduleDataAttributes;
  });

  // Add toast styles
  function addToastStyles() {
    // Function is kept as a placeholder since styles are already defined
    console.log('Toast styles already defined');
  }

  // Debug tab structure
  function debugTabStructure() {
    const tabButtons = document.querySelectorAll('.PM-tab-button');
    const tabContents = document.querySelectorAll('.PM-tab-content');
    
    console.log('Found tab buttons:', tabButtons.length);
    console.log('Found tab contents:', tabContents.length);
    
    tabButtons.forEach(button => {
        console.log('Tab button:', button.getAttribute('data-tab'));
    });
    
    tabContents.forEach(content => {
        console.log('Tab content:', content.id);
    });
  }

  // Fix delete schedule modal
  function fixDeleteScheduleModal() {
    const deleteButtons = document.querySelectorAll('.PM-delete-schedule-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const scheduleId = this.getAttribute('data-id');
            const scheduleName = this.getAttribute('data-name');
            
            if (scheduleId) {
                showDeleteScheduleConfirmation(scheduleId, scheduleName);
            }
        });
    });
  }
  
  