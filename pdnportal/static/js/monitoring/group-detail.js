let outputChart;
let currentProductToEdit = null;
let currentScheduleToEdit = null;
let currentItemToDelete = null;
let currentDeleteType = null;
let currentProductPage = 1;
let currentSchedulePage = 1;
let currentSearchQuery = '';
let currentSchedulesSearchQuery = '';
let chartRefreshInterval = null;
let statsRefreshInterval = null;

const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

document.addEventListener('DOMContentLoaded', function() {
    initOutputChart();
    initEventListeners();
    initTabs();
    initFilters();
    loadChartData();
    loadStatisticsCards();
    startAutoRefresh();
});

function initOutputChart() {
    const ctx = document.getElementById('output-chart')?.getContext('2d');
    if (!ctx) return;

    outputChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    type: 'bar',
                    label: 'Target Output',
                    data: [],
                    backgroundColor: '#0046FF',
                    borderColor: '#0046FF',
                    borderWidth: 1,
                    barThickness: 40,
                    borderRadius: 4,
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Current Output',
                    data: [],
                    borderColor: '#78C841',
                    backgroundColor: 'rgba(120, 200, 65, 0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: '#78C841',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true,
                    order: 1
                }
            ]
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
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: 'Poppins',
                            size: 12,
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
                    cornerRadius: 6,
                    padding: 12,
                    bodySpacing: 8,
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
                        display: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Poppins',
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Poppins',
                            size: 11
                        },
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function loadChartData() {
    const date = document.getElementById('date-filter')?.value;
    const line = document.getElementById('line-filter')?.value || 'all';
    const shift = document.getElementById('shift-filter')?.value || 'all';

    const url = new URL(chartDataUrl, window.location.origin);
    if (date) url.searchParams.set('date', date);
    url.searchParams.set('line', line);
    url.searchParams.set('shift', shift);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            outputChart.data.labels = data.labels;
            outputChart.data.datasets[0].data = data.target;
            outputChart.data.datasets[1].data = data.actual;
            // Add animation for chart update
            outputChart.options.animation = {
                duration: 800,
                easing: 'easeInOutQuart'
            };
            outputChart.update();
        })
        .catch(error => {
            console.error('Error loading chart data:', error);
            showToast('Error loading chart data', 'error');
        });
}

function initEventListeners() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = facilitatorDashboardUrl;
        });
    }

    // Use event delegation for edit product buttons on the tab content (parent that doesn't get replaced)
    document.getElementById('products-tab')?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-product-btn');
        if (editBtn) {
            handleEditProductClick(e);
            return;
        }
        const deleteBtn = e.target.closest('.delete-product-btn');
        if (deleteBtn) {
            handleDeleteProductClick(e);
            return;
        }
    });

    const exportDataBtn = document.getElementById('export-data-btn');
    const exportDataModal = document.getElementById('export-data-modal');
    if (exportDataBtn && exportDataModal) {
        exportDataBtn.addEventListener('click', () => {
            exportDataModal.classList.add('active');
        });
    }

    const exportDataForm = document.getElementById('export-data-form');
    if (exportDataForm) {
        exportDataForm.addEventListener('submit', handleExportData);
    }

    const addProductBtn = document.getElementById('add-product-btn');
    const addProductModal = document.getElementById('add-product-modal');
    if (addProductBtn && addProductModal) {
        addProductBtn.addEventListener('click', () => {
            addProductModal.classList.add('active');
        });
    }

    const addScheduleBtn = document.getElementById('add-schedule-btn');
    const addScheduleModal = document.getElementById('add-schedule-modal');
    if (addScheduleBtn && addScheduleModal) {
        addScheduleBtn.addEventListener('click', () => {
            addScheduleModal.classList.add('active');
        });
    }

    document.querySelectorAll('.JO-modal-close, #cancel-export, #cancel-add-product, #cancel-edit-product, #cancel-add-schedule, #cancel-edit-schedule, #cancel-import-products, #cancel-import-schedules, #cancel-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.JO-modal').classList.remove('active');
        });
    });

    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProduct);
    }

    const editProductForm = document.getElementById('edit-product-form');
    if (editProductForm) {
        editProductForm.addEventListener('submit', handleEditProduct);
    }

    const addScheduleForm = document.getElementById('add-schedule-form');
    if (addScheduleForm) {
        addScheduleForm.addEventListener('submit', handleAddSchedule);
    }

    const editScheduleForm = document.getElementById('edit-schedule-form');
    if (editScheduleForm) {
        editScheduleForm.addEventListener('submit', handleEditSchedule);
    }

    // Use event delegation for edit schedule buttons on the tab content (parent that doesn't get replaced)
    document.getElementById('schedules-tab')?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-schedule-btn');
        if (editBtn) {
            handleEditScheduleClick(e);
            return;
        }
        const deleteBtn = e.target.closest('.delete-schedule-btn');
        if (deleteBtn) {
            handleDeleteScheduleClick(e);
            return;
        }
    });

    const confirmDeleteBtn = document.getElementById('confirm-delete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    }

    const importProductsBtn = document.getElementById('import-products-btn');
    const importProductsModal = document.getElementById('import-products-modal');
    if (importProductsBtn && importProductsModal) {
        importProductsBtn.addEventListener('click', () => {
            importProductsModal.classList.add('active');
        });
    }

    const importProductsForm = document.getElementById('import-products-form');
    if (importProductsForm) {
        importProductsForm.addEventListener('submit', handleImportProducts);
    }

    const importSchedulesBtn = document.getElementById('import-schedules-btn');
    const importSchedulesModal = document.getElementById('import-schedules-modal');
    if (importSchedulesBtn && importSchedulesModal) {
        importSchedulesBtn.addEventListener('click', () => {
            importSchedulesModal.classList.add('active');
        });
    }

    const importSchedulesForm = document.getElementById('import-schedules-form');
    if (importSchedulesForm) {
        importSchedulesForm.addEventListener('submit', handleImportSchedules);
    }

    const exportProductsBtn = document.getElementById('export-products-btn');
    if (exportProductsBtn) {
        exportProductsBtn.addEventListener('click', () => {
            window.location.href = `${exportProductTemplateUrl}?monitoring_id=${monitoringId}`;
        });
    }

    const exportSchedulesBtn = document.getElementById('export-schedules-btn');
    if (exportSchedulesBtn) {
        exportSchedulesBtn.addEventListener('click', () => {
            window.location.href = `${exportScheduleTemplateUrl}?monitoring_id=${monitoringId}`;
        });
    }

    const downloadProductTemplateBtn = document.getElementById('download-product-template');
    if (downloadProductTemplateBtn) {
        downloadProductTemplateBtn.addEventListener('click', () => {
            window.location.href = `${exportProductTemplateUrl}?monitoring_id=${monitoringId}`;
        });
    }

    const downloadScheduleTemplateBtn = document.getElementById('download-schedule-template');
    if (downloadScheduleTemplateBtn) {
        downloadScheduleTemplateBtn.addEventListener('click', () => {
            window.location.href = `${exportScheduleTemplateUrl}?monitoring_id=${monitoringId}`;
        });
    }

    const chartFilters = ['date-filter', 'line-filter', 'shift-filter'];
    chartFilters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', loadChartData);
        }
    });
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            const targetElement = document.getElementById(targetTab);

            // Check if target element exists
            if (!targetElement) {
                console.warn(`Tab content with id "${targetTab}" not found`);
                return;
            }

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            targetElement.classList.add('active');
        });
    });
}

function initFilters() {
    const productsSearch = document.getElementById('products-search');
    const productsLineFilter = document.getElementById('products-line-filter');
    
    if (productsSearch) {
        // Use input event with debounce for search
        let searchTimeout;
        productsSearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchQuery = productsSearch.value.trim();
                currentProductPage = 1;
                refreshProductsTable();
            }, 500); // 500ms debounce
        });
    }
    
    if (productsLineFilter) {
        productsLineFilter.addEventListener('change', filterProducts);
    }

    const schedulesSearch = document.getElementById('schedules-search');
    const schedulesDateFilter = document.getElementById('schedules-date-filter');
    const schedulesShiftFilter = document.getElementById('schedules-shift-filter');
    const schedulesStatusFilter = document.getElementById('schedules-status-filter');

    if (schedulesSearch) {
        // Use input event with debounce for search
        let schedulesSearchTimeout;
        schedulesSearch.addEventListener('input', function() {
            clearTimeout(schedulesSearchTimeout);
            schedulesSearchTimeout = setTimeout(() => {
                currentSchedulesSearchQuery = schedulesSearch.value.trim();
                currentSchedulePage = 1;
                refreshSchedulesTable();
            }, 500); // 500ms debounce
        });
    }
    
    if (schedulesDateFilter) {
        schedulesDateFilter.addEventListener('change', () => {
            currentSchedulePage = 1;
            refreshSchedulesTable();
        });
    }

    [schedulesShiftFilter, schedulesStatusFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener(filter.type === 'text' ? 'input' : 'change', () => {
                currentSchedulePage = 1;
                refreshSchedulesTable();
            });
        }
    });
}

function refreshProductsTable() {
    const url = new URL(window.location.href);
    url.searchParams.set('ajax', 'products');
    url.searchParams.set('page', currentProductPage);
    if (currentSearchQuery) {
        url.searchParams.set('search', currentSearchQuery);
    } else {
        url.searchParams.delete('search');
    }

    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.text())
    .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newTableContainer = doc.querySelector('.common-table-container');
        const newPagination = doc.querySelector('.JO-pagination');
        
        if (newTableContainer) {
            document.querySelector('#products-tab .common-table-container').innerHTML = newTableContainer.innerHTML;
        }
        if (newPagination) {
            document.querySelector('#products-tab .JO-pagination').innerHTML = newPagination.innerHTML;
        }
        
        // Reattach pagination click handlers
        attachProductsPaginationHandlers();
    })
    .catch(error => {
        console.error('Error refreshing products table:', error);
        showToast('Error refreshing products table', 'error');
    });
}

function refreshSchedulesTable() {
    const dateFilter = document.getElementById('schedules-date-filter')?.value || '';
    const url = new URL(window.location.href);
    url.searchParams.set('ajax', 'schedules');
    url.searchParams.set('schedules_page', currentSchedulePage);
    if (dateFilter) {
        url.searchParams.set('date_filter', dateFilter);
    }
    if (currentSchedulesSearchQuery) {
        url.searchParams.set('schedules_search', currentSchedulesSearchQuery);
    } else {
        url.searchParams.delete('schedules_search');
    }

    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.text())
    .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newTableContainer = doc.querySelector('.common-table-container');
        const newPagination = doc.querySelector('.JO-pagination');
        
        if (newTableContainer) {
            document.querySelector('#schedules-tab .common-table-container').innerHTML = newTableContainer.innerHTML;
        }
        if (newPagination) {
            document.querySelector('#schedules-tab .JO-pagination').innerHTML = newPagination.innerHTML;
        }
        
        // Reattach pagination click handlers
        attachSchedulesPaginationHandlers();
    })
    .catch(error => {
        console.error('Error refreshing schedules table:', error);
        showToast('Error refreshing schedules table', 'error');
    });
}

function attachProductsPaginationHandlers() {
    document.querySelectorAll('#products-tab .JO-pagination a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = new URL(link.href);
            currentProductPage = url.searchParams.get('page') || 1;
            refreshProductsTable();
        });
    });
}

function attachSchedulesPaginationHandlers() {
    document.querySelectorAll('#schedules-tab .JO-pagination a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = new URL(link.href);
            currentSchedulePage = url.searchParams.get('schedules_page') || 1;
            refreshSchedulesTable();
        });
    });
}

function handleExportData(e) {
    e.preventDefault();
    
    const fromDate = document.getElementById('export-from-date').value;
    const toDate = document.getElementById('export-to-date').value;
    const line = document.getElementById('export-line').value;
    const shift = document.getElementById('export-shift').value;
    const exportType = document.getElementById('export-type')?.value || 'hourly';
    
    const url = new URL(exportDataUrl, window.location.origin);
    url.searchParams.set('from_date', fromDate);
    url.searchParams.set('to_date', toDate);
    url.searchParams.set('line', line);
    url.searchParams.set('shift', shift);
    url.searchParams.set('export_type', exportType);
    
    window.location.href = url.toString();
    
    document.getElementById('export-data-modal').classList.remove('active');
    showToast('Export started', 'success');
}

function handleAddProduct(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    fetch(e.target.action, {
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
            showToast(data.message || 'Product added successfully!', 'success');
            document.getElementById('add-product-modal').classList.remove('active');
            e.target.reset();
            refreshProductsTable();
        } else {
            throw new Error(data.message || 'Failed to add product');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(error.message || 'Error adding product', 'error');
    });
}

function handleEditProductClick(e) {
    const button = e.target.closest('.edit-product-btn');
    if (!button) return;
    const productId = button.dataset.productId;
    if (!productId) {
        showToast('Invalid product selected for editing.', 'error');
        return;
    }
    currentProductToEdit = productId;
    // Use the correct get product URL: /monitoring/product/<id>/
    const url = `${getProductUrl}${productId}/`;
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch product details');
            return response.json();
        })
        .then(data => {
            document.getElementById('edit-product-name').value = data.product_name;
            document.getElementById('edit-product-description').value = data.description;
            document.getElementById('edit-product-line').value = data.line_id;
            document.getElementById('edit-product-qty-box').value = data.qty_per_box;
            document.getElementById('edit-product-qty-hour').value = data.qty_per_hour;
            document.getElementById('edit-product-modal').classList.add('active');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error loading product data', 'error');
        });
}

function handleEditProduct(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!currentProductToEdit) {
        showToast('No product selected for update.', 'error');
        return;
    }
    // Always use the correct edit product URL: /monitoring/product/<id>/edit/
    const url = `${editProductUrl}${currentProductToEdit}/edit/`;
    fetch(url, {
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
            showToast(data.message || 'Product updated successfully!', 'success');
            document.getElementById('edit-product-modal').classList.remove('active');
            currentProductToEdit = null;
            refreshProductsTable();
        } else {
            throw new Error(data.message || 'Failed to update product');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(error.message || 'Error updating product', 'error');
    });
}

function handleDeleteProductClick(e) {
    const productId = e.target.closest('.delete-product-btn').dataset.productId;
    const row = e.target.closest('tr');
    const productName = row.querySelector('td[data-label="Product Name"]').textContent;
    
    currentItemToDelete = productId;
    currentDeleteType = 'product';
    
    document.getElementById('delete-title').textContent = 'Delete Product?';
    document.getElementById('delete-message').textContent = `Are you sure you want to delete "${productName}"? This action cannot be undone.`;
    document.getElementById('delete-confirmation-modal').classList.add('active');
}

function handleAddSchedule(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    fetch(e.target.action, {
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
            showToast(data.message || 'Schedule added successfully!', 'success');
            document.getElementById('add-schedule-modal').classList.remove('active');
            e.target.reset();
            refreshSchedulesTable();
        } else {
            throw new Error(data.message || 'Failed to add schedule');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(error.message || 'Error adding schedule', 'error');
    });
}

function handleEditScheduleClick(e) {
    const scheduleId = e.target.closest('.edit-schedule-btn').dataset.scheduleId;
    currentScheduleToEdit = scheduleId;
    
    fetch(`${getScheduleUrl}${scheduleId}/`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('edit-schedule-product').value = data.product_id;
            document.getElementById('edit-schedule-date').value = data.date_planned;
            document.getElementById('edit-schedule-shift').value = data.shift;
            document.getElementById('edit-schedule-qty').value = data.planned_qty;
            document.getElementById('edit-schedule-status').value = data.status;
            
            document.getElementById('edit-schedule-modal').classList.add('active');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error loading schedule data', 'error');
        });
}

function handleEditSchedule(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Debug: Log form data
    console.log('Submitting edit schedule with data:');
    for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
    }
    console.log('Current schedule ID:', currentScheduleToEdit);
    console.log('Edit URL:', `${editScheduleUrl}${currentScheduleToEdit}/edit/`);
    
    fetch(`${editScheduleUrl}${currentScheduleToEdit}/edit/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        return response.json().then(data => ({data, status: response.status}));
    })
    .then(({data, status}) => {
        console.log('Response data:', data);
        if (data.status === 'success') {
            showToast(data.message || 'Schedule updated successfully!', 'success');
            document.getElementById('edit-schedule-modal').classList.remove('active');
            currentScheduleToEdit = null;
            refreshSchedulesTable();
        } else {
            // Show specific error messages from form validation
            let errorMessage = data.message || 'Failed to update schedule';
            if (data.errors) {
                // Format form errors for display
                const errorDetails = Object.entries(data.errors)
                    .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
                    .join('; ');
                errorMessage += ` - ${errorDetails}`;
                console.error('Form validation errors:', data.errors);
            }
            console.error('Server returned error:', errorMessage);
            showToast(errorMessage, 'error');
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        showToast('Error updating schedule. Please try again.', 'error');
    });
}

function handleDeleteScheduleClick(e) {
    const scheduleId = e.target.closest('.delete-schedule-btn').dataset.scheduleId;
    const row = e.target.closest('tr');
    const product = row.querySelector('td[data-label="Product"]').textContent;
    const date = row.querySelector('td[data-label="Date"]').textContent;
    
    currentItemToDelete = scheduleId;
    currentDeleteType = 'schedule';
    
    document.getElementById('delete-title').textContent = 'Delete Schedule?';
    document.getElementById('delete-message').textContent = `Are you sure you want to delete the schedule for "${product}" on ${date}? This action cannot be undone.`;
    document.getElementById('delete-confirmation-modal').classList.add('active');
}

function handleConfirmDelete() {
    if (!currentItemToDelete || !currentDeleteType) return;
    let url;
    if (currentDeleteType === 'product') {
        url = `${deleteProductUrl}${currentItemToDelete}/delete/`;
    } else if (currentDeleteType === 'schedule') {
        url = `${deleteScheduleUrl}${currentItemToDelete}/delete/`;
    } else {
        showToast('Invalid delete type', 'error');
        return;
    }
    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('delete-confirmation-modal').classList.remove('active');
            showToast(data.message || `${currentDeleteType === 'product' ? 'Product' : 'Schedule'} deleted successfully!`, 'success');
            
            if (currentDeleteType === 'product') {
                refreshProductsTable();
            } else {
                refreshSchedulesTable();
            }
            
            currentItemToDelete = null;
            currentDeleteType = null;
        } else {
            throw new Error(data.message || 'Failed to delete item');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(error.message || `Error deleting ${currentDeleteType}`, 'error');
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

function handleImportProducts(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    fetch(e.target.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success' || data.status === 'warning') {
            showToast(data.message, data.status === 'warning' ? 'warning' : 'success', 5000);
            document.getElementById('import-products-modal').classList.remove('active');
            e.target.reset();
            // Clear file name display
            const fileNameLabel = document.querySelector('#product-file-drop-area .JO-file-input-filename');
            if (fileNameLabel) fileNameLabel.textContent = '';
            refreshProductsTable();
        } else {
            throw new Error(data.message || 'Failed to import products');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(error.message || 'Error importing products', 'error');
    });
}

function handleImportSchedules(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    fetch(e.target.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success' || data.status === 'warning') {
            showToast(data.message, data.status === 'warning' ? 'warning' : 'success', 5000);
            document.getElementById('import-schedules-modal').classList.remove('active');
            e.target.reset();
            // Clear file name display
            const fileNameLabel = document.querySelector('#schedule-file-drop-area .JO-file-input-filename');
            if (fileNameLabel) fileNameLabel.textContent = '';
            refreshSchedulesTable();
        } else {
            throw new Error(data.message || 'Failed to import schedules');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(error.message || 'Error importing schedules', 'error');
    });
}

// Drag & drop for import products file input
(function() {
    var dropArea = document.getElementById('product-file-drop-area');
    var fileInput = document.getElementById('product-file');
    if (!dropArea || !fileInput) return;

    dropArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });
    dropArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropArea.classList.remove('dragover');
    });
    dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            // Optionally trigger change event
            var event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    });
    // Optional: clicking the drop area triggers file input
    dropArea.addEventListener('click', function() {
        fileInput.click();
    });

    var fileNameLabel = document.createElement('div');
    fileNameLabel.className = 'JO-file-input-filename';
    fileNameLabel.style.marginTop = '8px';
    fileNameLabel.style.fontSize = '0.95em';
    fileNameLabel.style.color = 'var(--jo-text-light)';
    dropArea.appendChild(fileNameLabel);

    function updateFileName() {
        if (fileInput.files && fileInput.files.length > 0) {
            fileNameLabel.textContent = fileInput.files[0].name;
        } else {
            fileNameLabel.textContent = '';
        }
    }
    fileInput.addEventListener('change', updateFileName);
    // Also update on drop
    dropArea.addEventListener('drop', updateFileName);
})();

// Drag & drop for import schedules file input
(function() {
    var dropArea = document.getElementById('schedule-file-drop-area');
    var fileInput = document.getElementById('schedule-file');
    if (!dropArea || !fileInput) return;

    dropArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });
    dropArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropArea.classList.remove('dragover');
    });
    dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            var event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    });
    dropArea.addEventListener('click', function() {
        fileInput.click();
    });

    var fileNameLabel = document.createElement('div');
    fileNameLabel.className = 'JO-file-input-filename';
    fileNameLabel.style.marginTop = '8px';
    fileNameLabel.style.fontSize = '0.95em';
    fileNameLabel.style.color = 'var(--jo-text-light)';
    dropArea.appendChild(fileNameLabel);

    function updateFileName() {
        if (fileInput.files && fileInput.files.length > 0) {
            fileNameLabel.textContent = fileInput.files[0].name;
        } else {
            fileNameLabel.textContent = '';
        }
    }
    fileInput.addEventListener('change', updateFileName);
    dropArea.addEventListener('drop', updateFileName);
})();

// Auto-refresh functionality
function startAutoRefresh() {
    // Refresh every 5 minutes (300000 milliseconds)
    const refreshInterval = 5 * 60 * 1000;
    
    // Set up chart refresh
    chartRefreshInterval = setInterval(() => {
        loadChartData();
    }, refreshInterval);
    
    // Set up statistics cards refresh
    statsRefreshInterval = setInterval(() => {
        loadStatisticsCards();
    }, refreshInterval);
}

function stopAutoRefresh() {
    if (chartRefreshInterval) {
        clearInterval(chartRefreshInterval);
        chartRefreshInterval = null;
    }
    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
        statsRefreshInterval = null;
    }
}

function loadStatisticsCards() {
    // Fetch updated statistics from the server
    const url = new URL(window.location.href);
    url.searchParams.set('ajax', 'stats');
    
    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Update the statistics cards with smooth transition
        updateStatCard('total_planned', data.total_planned);
        updateStatCard('total_produced', data.total_produced);
        updateStatCard('efficiency_percentage', data.efficiency_percentage, '%');
        updateStatCard('distinct_products_count', data.distinct_products_count);
    })
    .catch(error => {
        console.error('Error loading statistics:', error);
    });
}

function updateStatCard(statName, value, suffix = '') {
    const statElements = {
        'total_planned': document.querySelector('.FGD-stat-card:nth-child(1) .FGD-stat-number'),
        'total_produced': document.querySelector('.FGD-stat-card:nth-child(2) .FGD-stat-number'),
        'efficiency_percentage': document.querySelector('.FGD-stat-card:nth-child(3) .FGD-stat-number'),
        'distinct_products_count': document.querySelector('.FGD-stat-card:nth-child(4) .FGD-stat-number')
    };
    
    const element = statElements[statName];
    if (element) {
        // Add a subtle animation
        element.style.transition = 'opacity 0.3s ease';
        element.style.opacity = '0.5';
        
        setTimeout(() => {
            if (statName === 'total_planned' || statName === 'total_produced') {
                element.textContent = parseFloat(value).toFixed(0);
            } else {
                element.textContent = value + suffix;
            }
            element.style.opacity = '1';
        }, 300);
    }
}

// Clean up intervals when page is unloaded
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});