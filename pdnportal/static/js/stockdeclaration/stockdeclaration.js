// Toast notification function
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Create toast content structure
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';

    // Add icon for error toasts
    if (type === 'error') {
        const icon = document.createElement('i');
        icon.className = 'fa fa-exclamation-circle toast-icon';
        toastContent.appendChild(icon);
    }

    // Add icon for success toasts
    if (type === 'success') {
        const icon = document.createElement('i');
        icon.className = 'fa fa-check-circle toast-icon';
        toastContent.appendChild(icon);
    }

    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toastContent.appendChild(messageSpan);

    toast.appendChild(toastContent);

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });
    toast.appendChild(closeBtn);

    toastContainer.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);

    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.remove();
    });
}

// Global chart variable
let stockChart = null;

// Initialize Stock Declaration Chart
function initializeStockChart() {
    const chartCanvas = document.getElementById('stock-chart');
    if (!chartCanvas) {
        console.error('Stock chart canvas not found');
        return;
    }

    const ctx = chartCanvas.getContext('2d');
    
    // Create initial empty chart
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    title: {
                        display: true,
                        text: 'Number of Declarations',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        }
    });

    // Load initial data with default filters
    updateChartData();
}

// Update chart data based on filters
function updateChartData() {
    const timeRangeFilter = document.getElementById('time-range-filter');
    const typeFilter = document.getElementById('type-filter');
    
    if (!timeRangeFilter || !typeFilter) {
        console.error('Filter elements not found');
        return;
    }

    const timeRange = timeRangeFilter.value;
    const stockType = typeFilter.value;

    // Fetch data from API
    fetch(`/stock-declaration/api/chart-data/?time_range=${timeRange}&stock_type=${stockType}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(chartConfig => {
            // Update chart with new data
            if (stockChart) {
                stockChart.data.labels = chartConfig.data.labels;
                stockChart.data.datasets = chartConfig.data.datasets;
                
                // Apply smooth transition animation
                stockChart.update({
                    duration: 750,
                    easing: 'easeInOutQuart'
                });
            }
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);
            showToast('Failed to load chart data. Please try again.', 'error');
        });
}

// Stock Declaration Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize chart on page load
    initializeStockChart();

    // Setup filter event listeners
    const timeRangeFilter = document.getElementById('time-range-filter');
    const typeFilter = document.getElementById('type-filter');

    if (timeRangeFilter) {
        timeRangeFilter.addEventListener('change', function() {
            updateChartData();
        });
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            updateChartData();
        });
    }

    const modal = document.getElementById('stock-declaration-modal');
    const addBtn = document.getElementById('add-stock-declaration-btn');
    const closeBtn = document.getElementById('close-stock-declaration-modal');
    const cancelBtn = document.getElementById('cancel-stock-declaration-btn');
    const form = document.getElementById('stock-declaration-form');

    // Show modal
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            modal.classList.add('active');
        });
    }

    // Export Stock Declaration Report Modal functionality
    const exportStockDeclarationModal = document.getElementById('export-stock-declaration-modal');
    const reportStockDeclarationBtn = document.getElementById('report-stock-declaration-btn');
    const exportStockDeclarationModalClose = document.getElementById('export-stock-declaration-modal-close');
    const exportStockDeclarationCancel = document.getElementById('export-stock-declaration-cancel');

    if (reportStockDeclarationBtn) {
        reportStockDeclarationBtn.addEventListener('click', function() {
            exportStockDeclarationModal.classList.add('active');
        });
    }

    if (exportStockDeclarationModalClose) {
        exportStockDeclarationModalClose.addEventListener('click', function() {
            exportStockDeclarationModal.classList.remove('active');
        });
    }

    if (exportStockDeclarationCancel) {
        exportStockDeclarationCancel.addEventListener('click', function() {
            exportStockDeclarationModal.classList.remove('active');
        });
    }

    // Hide modal functions
    function hideModal() {
        modal.classList.remove('active');
        form.reset(); // Reset form when closing
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', hideModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideModal);
    }

    // Hide modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideModal();
            }
        });
    }

    // Form validation
    if (form) {
        form.addEventListener('submit', function(e) {
            const productNumber = document.getElementById('id_product_number').value.trim();
            const productName = document.getElementById('id_product_name').value.trim();
            const quantity = document.getElementById('id_quantity').value;
            const stockType = document.getElementById('id_stock_type').value;
            const selectedLines = document.querySelectorAll('input[name="lines"]:checked');
            const linesContainer = document.querySelector('.lines-scrollable-container');

            // Clear previous error styling
            document.querySelectorAll('.form-field-error').forEach(el => el.classList.remove('form-field-error'));

            let hasErrors = false;
            let errorMessages = [];

            if (!productNumber) {
                document.getElementById('id_product_number').classList.add('form-field-error');
                hasErrors = true;
                errorMessages.push('Product Number is required');
            }

            if (!productName) {
                document.getElementById('id_product_name').classList.add('form-field-error');
                hasErrors = true;
                errorMessages.push('Product Name is required');
            }

            if (!quantity) {
                document.getElementById('id_quantity').classList.add('form-field-error');
                hasErrors = true;
                errorMessages.push('Quantity is required');
            } else if (parseInt(quantity) < 0) {
                document.getElementById('id_quantity').classList.add('form-field-error');
                hasErrors = true;
                errorMessages.push('Quantity cannot be negative');
            }

            if (!stockType) {
                document.getElementById('id_stock_type').classList.add('form-field-error');
                hasErrors = true;
                errorMessages.push('Stock Type is required');
            }

            if (selectedLines.length === 0) {
                if (linesContainer) {
                    linesContainer.classList.add('form-field-error');
                }
                hasErrors = true;
                errorMessages.push('Please select at least one production line');
            }

            if (hasErrors) {
                e.preventDefault();
                // Show error messages
                showToast(errorMessages, 'error');
                return;
            }

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating...';
            }
        });
    }

    // Lines search functionality
    const linesSearchInput = document.getElementById('lines-search');
    if (linesSearchInput) {
        linesSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const lineItems = document.querySelectorAll('.line-item');

            lineItems.forEach(item => {
                const lineName = item.getAttribute('data-line-name') || '';
                const checkbox = item.querySelector('input[type="checkbox"]');
                const isChecked = checkbox && checkbox.checked;

                // Show item if it matches search OR if it's checked
                const matchesSearch = lineName.includes(searchTerm);
                const shouldShow = matchesSearch || isChecked;

                if (shouldShow) {
                    item.classList.remove('hidden-by-search');
                } else {
                    item.classList.add('hidden-by-search');
                }
            });
        });
    }

    // Live Search Functionality
    const stockDeclarationSearchInput = document.getElementById('stock-declaration-search');
    let searchTimeout;

    if (stockDeclarationSearchInput) {
        stockDeclarationSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            
            // Clear previous timeout
            clearTimeout(searchTimeout);
            
            // Set new timeout to avoid too many requests
            searchTimeout = setTimeout(() => {
                // Reload page with search parameter
                const currentUrl = new URL(window.location.href);
                
                if (searchTerm) {
                    currentUrl.searchParams.set('search', searchTerm);
                } else {
                    currentUrl.searchParams.delete('search');
                }
                
                // Remove page parameter to reset to first page on new search
                currentUrl.searchParams.delete('page');
                
                // Navigate to the new URL
                window.location.href = currentUrl.toString();
            }, 500); // Wait 500ms after user stops typing
        });
    }

    // View Stock Declaration Modal functionality
    const viewStockDeclarationModal = document.getElementById('view-stock-declaration-modal');
    const viewStockDeclarationModalClose = document.getElementById('view-stock-declaration-modal-close');
    const viewStockDeclarationClose = document.getElementById('view-stock-declaration-close');

    document.addEventListener('click', function(event) {
        const viewBtn = event.target.closest('.view-stock-declaration-btn');
        if (viewBtn) {
            // If this button also triggers receiving, skip here - the receive handler
            // will call viewStockDeclaration after marking as received.
            if (viewBtn.classList.contains('receive-stock-declaration-btn')) {
                return;
            }

            const declarationId = viewBtn.getAttribute('data-declaration-id');
            viewStockDeclaration(declarationId);
        }
    });

    if (viewStockDeclarationModalClose) {
        viewStockDeclarationModalClose.addEventListener('click', function() {
            viewStockDeclarationModal.classList.remove('active');
        });
    }

    if (viewStockDeclarationClose) {
        viewStockDeclarationClose.addEventListener('click', function() {
            viewStockDeclarationModal.classList.remove('active');
        });
    }

    // Edit Stock Declaration Modal functionality
    const editStockDeclarationModal = document.getElementById('edit-stock-declaration-modal');
    const editStockDeclarationModalClose = document.getElementById('edit-stock-declaration-modal-close');
    const editStockDeclarationCancel = document.getElementById('edit-stock-declaration-cancel');

    document.addEventListener('click', function(event) {
        const editBtn = event.target.closest('.edit-stock-declaration-btn');
        if (editBtn) {
            const declarationId = editBtn.getAttribute('data-declaration-id');
            editStockDeclaration(declarationId);
        }
    });

    if (editStockDeclarationModalClose) {
        editStockDeclarationModalClose.addEventListener('click', function() {
            editStockDeclarationModal.classList.remove('active');
        });
    }

    if (editStockDeclarationCancel) {
        editStockDeclarationCancel.addEventListener('click', function() {
            editStockDeclarationModal.classList.remove('active');
        });
    }

    // Edit lines search functionality
    const editLinesSearchInput = document.getElementById('edit-lines-search');
    if (editLinesSearchInput) {
        editLinesSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const lineItems = document.querySelectorAll('#edit-lines-container .line-item');

            lineItems.forEach(item => {
                const lineName = item.getAttribute('data-line-name') || '';
                const checkbox = item.querySelector('input[type="checkbox"]');
                const isChecked = checkbox && checkbox.checked;

                // Show item if it matches search OR if it's checked
                const matchesSearch = lineName.includes(searchTerm);
                const shouldShow = matchesSearch || isChecked;

                if (shouldShow) {
                    item.classList.remove('hidden-by-search');
                } else {
                    item.classList.add('hidden-by-search');
                }
            });
        });
    }

    // Cancel Stock Declaration Modal functionality
    const cancelStockDeclarationModal = document.getElementById('cancel-stock-declaration-modal');
    const cancelStockDeclarationModalClose = document.getElementById('cancel-stock-declaration-modal-close');
    const cancelStockDeclarationCancel = document.getElementById('cancel-stock-declaration-cancel');
    const confirmCancelStockDeclaration = document.getElementById('confirm-cancel-stock-declaration');

    document.addEventListener('click', function(event) {
        const cancelBtn = event.target.closest('.cancel-stock-declaration-btn');
        if (cancelBtn) {
            const declarationId = cancelBtn.getAttribute('data-declaration-id');
            showCancelConfirmation(declarationId);
        }
    });

    if (cancelStockDeclarationModalClose) {
        cancelStockDeclarationModalClose.addEventListener('click', function() {
            cancelStockDeclarationModal.classList.remove('active');
        });
    }

    if (cancelStockDeclarationCancel) {
        cancelStockDeclarationCancel.addEventListener('click', function() {
            cancelStockDeclarationModal.classList.remove('active');
        });
    }

    if (confirmCancelStockDeclaration) {
        confirmCancelStockDeclaration.addEventListener('click', function() {
            const declarationId = document.getElementById('cancel-declaration-id').value;
            cancelStockDeclaration(declarationId);
        });
    }

    // In Transit Stock Declaration Modal functionality
    const intransitStockDeclarationModal = document.getElementById('intransit-stock-declaration-modal');
    const intransitStockDeclarationModalClose = document.getElementById('intransit-stock-declaration-modal-close');
    const intransitStockDeclarationCancel = document.getElementById('intransit-stock-declaration-cancel');

    document.addEventListener('click', function(event) {
        const intransitBtn = event.target.closest('.intransit-stock-declaration-btn');
        if (intransitBtn) {
            const declarationId = intransitBtn.getAttribute('data-declaration-id');
            showInTransitModal(declarationId);
        }
    });

    if (intransitStockDeclarationModalClose) {
        intransitStockDeclarationModalClose.addEventListener('click', function() {
            intransitStockDeclarationModal.classList.remove('active');
        });
    }

    if (intransitStockDeclarationCancel) {
        intransitStockDeclarationCancel.addEventListener('click', function() {
            intransitStockDeclarationModal.classList.remove('active');
        });
    }

    // Update In Transit Notes Modal functionality
    const updateIntransitNotesModal = document.getElementById('update-intransit-notes-modal');
    const updateIntransitNotesModalClose = document.getElementById('update-intransit-notes-modal-close');
    const updateIntransitNotesCancel = document.getElementById('update-intransit-notes-cancel');

    document.addEventListener('click', function(event) {
        const updateIntransitBtn = event.target.closest('.add-intransit-declaration-btn');
        if (updateIntransitBtn) {
            const declarationId = updateIntransitBtn.getAttribute('data-declaration-id');
            showUpdateIntransitNotesModal(declarationId);
        }
    });

    if (updateIntransitNotesModalClose) {
        updateIntransitNotesModalClose.addEventListener('click', function() {
            updateIntransitNotesModal.classList.remove('active');
        });
    }

    if (updateIntransitNotesCancel) {
        updateIntransitNotesCancel.addEventListener('click', function() {
            updateIntransitNotesModal.classList.remove('active');
        });
    }

    // Function to view stock declaration details
    function viewStockDeclaration(declarationId) {
        // Get the data from the table row
        const row = document.querySelector(`button[data-declaration-id="${declarationId}"]`).closest('tr');
        
        document.getElementById('view-control-number').textContent = row.cells[0].textContent;
        document.getElementById('view-product-number').textContent = row.getAttribute('data-product-number');
        document.getElementById('view-product-name').textContent = row.cells[3].textContent;
        document.getElementById('view-quantity').textContent = row.getAttribute('data-quantity') || 'N/A';
        document.getElementById('view-stock-type').textContent = row.cells[4].textContent;
        document.getElementById('view-lines').innerHTML = row.cells[5].innerHTML;
        document.getElementById('view-created-by').textContent = row.getAttribute('data-created-by') || 'N/A';
        
        // Update date display based on whether record has been updated
        const isUpdated = row.getAttribute('data-is-updated') === 'true';
        const dateLabelElement = document.getElementById('view-date-label');
        const dateValueElement = document.getElementById('view-date-value');
        
        if (isUpdated) {
            dateLabelElement.textContent = 'Updated:';
            dateValueElement.textContent = row.getAttribute('data-updated-at');
        } else {
            dateLabelElement.textContent = 'Declared:';
            dateValueElement.textContent = row.getAttribute('data-created-at');
        }
        
        // Update status display
        const statusElement = document.getElementById('view-status');
        const status = row.getAttribute('data-status');
        if (status === 'arrived') {
            statusElement.textContent = 'Arrived';
            statusElement.className = 'JO-status JO-status-approved';
        } else if (status === 'cancelled') {
            statusElement.textContent = 'Cancelled';
            statusElement.className = 'JO-status JO-status-cancelled';
        } else if (status === 'filed') {
            statusElement.textContent = 'Filed';
            statusElement.className = 'JO-status JO-status-filed';
        } else {
            statusElement.textContent = 'In Transit';
            statusElement.className = 'JO-status JO-status-pending';
        }
        
        // Handle In Transit Information section
        const inTransitRaw = row.getAttribute('data-in-transit');
        const inTransitSection = document.getElementById('in-transit-info-section');
        const inTransitNotes = document.getElementById('view-in-transit-notes');

        // Normalize various representations of 'empty' coming from the template/db
        const normalizeEmpty = (v) => {
            if (v === null || v === undefined) return '';
            // Trim and convert common null-like strings
            const s = String(v).trim();
            if (s === '' || s.toLowerCase() === 'none' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
            return s;
        };

        const inTransitInfo = normalizeEmpty(inTransitRaw);

        if (inTransitInfo !== '') {
            inTransitSection.style.display = 'block';
            inTransitNotes.textContent = inTransitInfo;
        } else {
            inTransitSection.style.display = 'none';
            inTransitNotes.textContent = '';
        }

        // Handle Received by Production Information section
        const receivedByProduction = row.getAttribute('data-received-by-production');
        const dateReceivedByProduction = row.getAttribute('data-date-received-by-production');
        const receivedSection = document.getElementById('received-info-section');
        const receivedStatus = document.getElementById('view-received-status');
        const receivedDate = document.getElementById('view-received-date');

        if (receivedByProduction === 'True' || receivedByProduction === 'true') {
            receivedSection.style.display = 'block';
            receivedStatus.innerHTML = '<span class="JO-status JO-status-approved"><i class="fas fa-check-circle"></i> Yes</span>';
            receivedDate.textContent = dateReceivedByProduction || 'N/A';
        } else {
            receivedSection.style.display = 'none';
            receivedStatus.textContent = '';
            receivedDate.textContent = '';
        }
        
        viewStockDeclarationModal.classList.add('active');
    }

    // Function to edit stock declaration
    function editStockDeclaration(declarationId) {
        // Get the data from the table row
        const row = document.querySelector(`button[data-declaration-id="${declarationId}"]`).closest('tr');
        
        document.getElementById('edit-declaration-id').value = declarationId;
        document.getElementById('edit-product-number').value = row.getAttribute('data-product-number') || '';
        document.getElementById('edit-product-name').value = row.cells[3].textContent.trim();
        document.getElementById('edit-quantity').value = row.getAttribute('data-quantity') || '';
        
        // Set stock type
        const stockType = row.getAttribute('data-stock-type') || '';
        const stockTypeSelect = document.getElementById('edit-stock-type');
        for (let i = 0; i < stockTypeSelect.options.length; i++) {
            if (stockTypeSelect.options[i].value === stockType) {
                stockTypeSelect.selectedIndex = i;
                break;
            }
        }
        
        // Get selected lines from data attribute
        const selectedLines = row.getAttribute('data-lines') || '';
        const lineIds = selectedLines.split(',').map(id => id.trim());
        
        // Clear all checkboxes first
        const checkboxes = document.querySelectorAll('#edit-lines-container input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = lineIds.includes(checkbox.value);
        });
        
        editStockDeclarationModal.classList.add('active');
    }

    // Function to show cancel confirmation
    function showCancelConfirmation(declarationId) {
        const row = document.querySelector(`button[data-declaration-id="${declarationId}"]`).closest('tr');
        
        document.getElementById('cancel-declaration-id').value = declarationId;
        document.getElementById('cancel-control-number').textContent = row.cells[0].textContent;
        document.getElementById('cancel-product-name').textContent = row.cells[3].textContent;
        
        cancelStockDeclarationModal.classList.add('active');
    }

    // Function to cancel stock declaration
    function cancelStockDeclaration(declarationId) {
        // Make AJAX call to cancel the declaration
        fetch(`/stock-declaration/cancel/${declarationId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(data.message, 'success');
                cancelStockDeclarationModal.classList.remove('active');
                // Reload the page to reflect changes
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred while cancelling the declaration', 'error');
        });
    }

    // Function to show in transit modal
    function showInTransitModal(declarationId) {
        // Get the data from the table row
        const row = document.querySelector(`button[data-declaration-id="${declarationId}"]`).closest('tr');
        
        document.getElementById('intransit-declaration-id').value = declarationId;
        document.getElementById('intransit-control-number').textContent = row.cells[0].textContent;
        document.getElementById('intransit-product-number').textContent = row.getAttribute('data-product-number');
        document.getElementById('intransit-product-name').textContent = row.cells[3].textContent;
        document.getElementById('intransit-quantity').textContent = row.getAttribute('data-quantity') || 'N/A';
        document.getElementById('intransit-stock-type').textContent = row.cells[4].textContent;
        document.getElementById('intransit-lines').innerHTML = row.cells[5].innerHTML;
        document.getElementById('intransit-created-by').textContent = row.getAttribute('data-created-by') || 'N/A';
        
        // Update date display based on whether record has been updated
        const isUpdated = row.getAttribute('data-is-updated') === 'true';
        const dateLabelElement = document.getElementById('intransit-date-label');
        const dateValueElement = document.getElementById('intransit-date-value');
        
        if (isUpdated) {
            dateLabelElement.textContent = 'Updated:';
            dateValueElement.textContent = row.getAttribute('data-updated-at');
        } else {
            dateLabelElement.textContent = 'Declared:';
            dateValueElement.textContent = row.getAttribute('data-created-at');
        }
        
        // Update status display
        const statusElement = document.getElementById('intransit-status');
        const status = row.getAttribute('data-status');
        if (status === 'arrived') {
            statusElement.textContent = 'Arrived';
            statusElement.className = 'JO-status JO-status-approved';
        } else if (status === 'cancelled') {
            statusElement.textContent = 'Cancelled';
            statusElement.className = 'JO-status JO-status-cancelled';
        } else if (status === 'filed') {
            statusElement.textContent = 'Filed';
            statusElement.className = 'JO-status JO-status-filed';
        } else {
            statusElement.textContent = 'In Transit';
            statusElement.className = 'JO-status JO-status-pending';
        }
        
        // Clear the notes field
        document.getElementById('intransit-notes').value = '';
        
        intransitStockDeclarationModal.classList.add('active');
    }

    // Function to show update in transit notes modal
    function showUpdateIntransitNotesModal(declarationId) {
        // Get the data from the table row
        const row = document.querySelector(`button[data-declaration-id="${declarationId}"]`).closest('tr');

        document.getElementById('update-intransit-notes-declaration-id').value = declarationId;
        document.getElementById('update-intransit-notes-control-number').textContent = row.cells[0].textContent;
        document.getElementById('update-intransit-notes-product-number').textContent = row.getAttribute('data-product-number');
        document.getElementById('update-intransit-notes-product-name').textContent = row.cells[3].textContent;
        document.getElementById('update-intransit-notes-quantity').textContent = row.getAttribute('data-quantity') || 'N/A';
        document.getElementById('update-intransit-notes-stock-type').textContent = row.cells[4].textContent;
        document.getElementById('update-intransit-notes-lines').innerHTML = row.cells[5].innerHTML;
        document.getElementById('update-intransit-notes-created-by').textContent = row.getAttribute('data-created-by') || 'N/A';

        // Update date display based on whether record has been updated
        const isUpdated = row.getAttribute('data-is-updated') === 'true';
        const dateLabelElement = document.getElementById('update-intransit-notes-date-label');
        const dateValueElement = document.getElementById('update-intransit-notes-date-value');

        if (isUpdated) {
            dateLabelElement.textContent = 'Updated:';
            dateValueElement.textContent = row.getAttribute('data-updated-at');
        } else {
            dateLabelElement.textContent = 'Declared:';
            dateValueElement.textContent = row.getAttribute('data-created-at');
        }

        // Update status display
        const statusElement = document.getElementById('update-intransit-notes-status');
        const status = row.getAttribute('data-status');
        if (status === 'arrived') {
            statusElement.textContent = 'Arrived';
            statusElement.className = 'JO-status JO-status-approved';
        } else if (status === 'cancelled') {
            statusElement.textContent = 'Cancelled';
            statusElement.className = 'JO-status JO-status-cancelled';
        } else if (status === 'filed') {
            statusElement.textContent = 'Filed';
            statusElement.className = 'JO-status JO-status-filed';
        } else {
            statusElement.textContent = 'In Transit';
            statusElement.className = 'JO-status JO-status-pending';
        }

        // Pre-populate the notes field with existing in-transit details
        const existingNotes = row.getAttribute('data-in-transit') || '';
        document.getElementById('update-intransit-notes').value = existingNotes;

        updateIntransitNotesModal.classList.add('active');
    }

    // Edit form submission
    const editForm = document.getElementById('edit-stock-declaration-form');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const declarationId = document.getElementById('edit-declaration-id').value;
            const formData = new FormData(editForm);
            
            // Validate lines selection
            const selectedLines = document.querySelectorAll('#edit-lines-container input[name="lines"]:checked');
            if (selectedLines.length === 0) {
                showToast('Please select at least one production line', 'error');
                document.getElementById('edit-lines-container-wrapper').classList.add('form-field-error');
                return;
            }
            
            // Make AJAX call to update the declaration
            fetch(`/stock-declaration/edit/${declarationId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    editStockDeclarationModal.classList.remove('active');
                    // Reload the page to reflect changes
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    showToast(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('An error occurred while updating the declaration', 'error');
            });
        });
    }

    // In Transit form submission
    const intransitForm = document.getElementById('intransit-stock-declaration-form');
    if (intransitForm) {
        intransitForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const declarationId = document.getElementById('intransit-declaration-id').value;
            const formData = new FormData(intransitForm);
            
            // Validate notes
            const notes = document.getElementById('intransit-notes').value.trim();
            if (!notes) {
                showToast('Please enter in transit notes', 'error');
                document.getElementById('intransit-notes').focus();
                return;
            }
            
            // Make AJAX call to mark as in transit
            fetch(`/stock-declaration/intransit/${declarationId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    intransitStockDeclarationModal.classList.remove('active');
                    // Reload the page to reflect changes
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    showToast(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('An error occurred while updating the declaration', 'error');
            });
        });
    }

    // Update In Transit Notes form submission
    const updateIntransitNotesForm = document.getElementById('update-intransit-notes-form');
    if (updateIntransitNotesForm) {
        updateIntransitNotesForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const declarationId = document.getElementById('update-intransit-notes-declaration-id').value;
            const formData = new FormData(updateIntransitNotesForm);

            // Validate notes
            const notes = document.getElementById('update-intransit-notes').value.trim();
            if (!notes) {
                showToast('Please enter in transit notes', 'error');
                document.getElementById('update-intransit-notes').focus();
                return;
            }

            // Make AJAX call to update in transit notes
            fetch(`/stock-declaration/update-intransit-notes/${declarationId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    updateIntransitNotesModal.classList.remove('active');
                    // Reload the page to reflect changes
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    showToast(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('An error occurred while updating the in transit notes', 'error');
            });
        });
    }

    // Receive Stock Declaration functionality
    document.addEventListener('click', function(event) {
        const receiveBtn = event.target.closest('.receive-stock-declaration-btn');
        if (receiveBtn) {
            const declarationId = receiveBtn.getAttribute('data-declaration-id');
            // Automatically receive without confirmation
            receiveStockDeclaration(declarationId);
        }
    });

    // Function to receive stock declaration
    function receiveStockDeclaration(declarationId) {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        fetch(`/stock-declaration/receive/${declarationId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(data.message, 'success');

                // Update the row attributes so the UI reflects the received state
                const row = document.querySelector(`button[data-declaration-id="${declarationId}"]`).closest('tr');
                if (row) {
                    row.setAttribute('data-received-by-production', 'True');
                    row.setAttribute('data-date-received-by-production', data.date_received_by_production_display || '');
                    // Update status cell if desired (keep existing status)
                }

                // Open the view modal for this declaration and refresh its content
                viewStockDeclaration(declarationId);
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred while receiving the stock declaration', 'error');
        });
    }
});