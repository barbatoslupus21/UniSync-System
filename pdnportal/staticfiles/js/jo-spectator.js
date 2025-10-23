document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let categoryChart = null;
    let statusChart = null;
    let currentPage = 1;
    const itemsPerPage = 10;
    let allJobOrders = [];
    let filteredJobOrders = [];

    // Initialize the page
    initializePage();

    function initializePage() {
        console.log('Initializing spectator page...');
        setupEventListeners();
        loadCharts();
        setupSearch();
        setupPagination();
        loadJobOrders();
        
        console.log('Page initialization complete. Search functionality should be working.');
        console.log('Test: Try typing in the search box or using the filter dropdown.');
    }

    function setupEventListeners() {
        // New request button
        const newRequestBtn = document.getElementById('new-request-btn');
        if (newRequestBtn) {
            newRequestBtn.addEventListener('click', function() {
                openModal('new-job-order-modal');
            });
        }

        // Chart period selector
        const chartPeriodSelector = document.getElementById('chart-period-selector');
        if (chartPeriodSelector) {
            chartPeriodSelector.addEventListener('change', function() {
                loadCategoryChart(this.value);
            });
        }

        // Refresh button
        const refreshBtn = document.querySelector('.JO-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                loadStatusChart();
            });
        }

        // Modal close buttons
        document.querySelectorAll('.JO-modal-close, .close-details-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                closeAllModals();
            });
        });

        // Modal backdrop clicks
        document.querySelectorAll('.JO-modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeAllModals();
                }
            });
        });

        // Form submissions
        const jobOrderForm = document.getElementById('job-order-form');
        if (jobOrderForm) {
            jobOrderForm.addEventListener('submit', handleJobOrderSubmission);
        }

        // Cancel request button
        const cancelRequestBtn = document.getElementById('cancel-request');
        if (cancelRequestBtn) {
            cancelRequestBtn.addEventListener('click', function() {
                closeModal('new-job-order-modal');
            });
        }

        // Category selection for nature of changes
        setupCategorySelection();

        // Status period selector
        const statusPeriodSelector = document.getElementById('status-period-selector');
        if (statusPeriodSelector) {
            statusPeriodSelector.addEventListener('change', function() {
                loadStatusChart(this.value);
            });
        }
    }

    function setupCategorySelection() {
        const categoryInputs = document.querySelectorAll('input[name="jo-category"]');
        const natureOptions = document.querySelectorAll('.JO-nature-options');

        categoryInputs.forEach(input => {
            input.addEventListener('change', function() {
                const selectedCategory = this.value;
                
                // Hide all nature options
                natureOptions.forEach(option => {
                    option.style.display = 'none';
                });

                // Show the selected category's nature options
                const selectedNatureOption = document.querySelector(`.JO-nature-${selectedCategory}`);
                if (selectedNatureOption) {
                    selectedNatureOption.style.display = 'block';
                }

                // Clear all nature radio buttons
                document.querySelectorAll('input[name="nature"]').forEach(radio => {
                    radio.checked = false;
                });
            });
        });

        // Handle orange category complaint field
        const orangeInput = document.querySelector('input[name="jo-category"][value="orange"]');
        const complaintField = document.querySelector('.JO-complaint-field');
        
        if (orangeInput && complaintField) {
            orangeInput.addEventListener('change', function() {
                if (this.checked) {
                    complaintField.style.display = 'block';
                } else {
                    complaintField.style.display = 'none';
                }
            });
        }
    }

    async function loadCharts() {
        await loadCategoryChart('6month');
        const statusPeriodSelector = document.getElementById('status-period-selector');
        const initialStatusPeriod = statusPeriodSelector ? statusPeriodSelector.value : 'quarter';
        await loadStatusChart(initialStatusPeriod);
    }

    async function loadCategoryChart(period) {
        try {
            console.log(`Loading category chart for period: ${period}`);
            const response = await fetch(`/joborder/spectator/chart-data/${period}/`);
            const data = await response.json();

            console.log('Category chart response:', response.status, data);

            if (response.ok) {
                console.log('Category chart data:', data);
                createCategoryChart(data);
            } else {
                console.error('Error loading category chart data:', data.error);
            }
        } catch (error) {
            console.error('Error loading category chart:', error);
        }
    }

    async function loadStatusChart(period = 'month') {
        try {
            const response = await fetch(`/joborder/spectator/status-chart-data/?period=${period}`);
            const data = await response.json();
            if (response.ok) {
                createStatusChart(data);
            } else {
                console.error('Error loading status chart data:', data.error);
            }
        } catch (error) {
            console.error('Error loading status chart:', error);
        }
    }

    function createCategoryChart(data) {
        const ctx = document.getElementById('jo-stats-chart');
        if (!ctx) {
            console.error('Chart canvas not found: jo-stats-chart');
            return;
        }

        console.log('Creating category chart with data:', data);

        // Destroy existing chart if it exists
        if (categoryChart) {
            categoryChart.destroy();
        }

        // Set y-axis max to the highest value in the total array
        const yMax = data.total ? Math.max(...data.total, 1) : undefined;

        categoryChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Green',
                        data: data.green,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        borderWidth: 3,
                        pointBackgroundColor: '#28a745',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Yellow',
                        data: data.yellow,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4,
                        borderWidth: 3,
                        pointBackgroundColor: '#ffc107',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'White',
                        data: data.white,
                        borderColor: '#6c757d',
                        backgroundColor: 'rgba(108, 117, 125, 0.1)',
                        tension: 0.4,
                        borderWidth: 3,
                        pointBackgroundColor: '#6c757d',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Orange',
                        data: data.orange,
                        borderColor: '#fd7e14',
                        backgroundColor: 'rgba(253, 126, 20, 0.1)',
                        tension: 0.4,
                        borderWidth: 3,
                        pointBackgroundColor: '#fd7e14',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 20,
                        right: 20,
                        top: 20,
                        bottom: 20
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3366ff',
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
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return `${label}: ${value}`;
                            },
                            afterBody: function(tooltipItems) {
                                const total = tooltipItems.reduce((sum, item) => sum + (item.parsed.y || 0), 0);
                                return [
                                    '',
                                    `Total JO Requests: ${total}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            color: '#666666'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: yMax,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            color: '#666666',
                            stepSize: 1
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#ffffff',
                        hoverBorderColor: '#3366ff',
                        hoverBorderWidth: 3
                    }
                }
            }
        });
    }

    function createStatusChart(data) {
        const ctx = document.getElementById('jo-status-chart');
        if (!ctx) {
            console.error('Status chart canvas not found: jo-status-chart');
            return;
        }

        console.log('Creating status chart with data:', data);

        // Destroy existing chart if it exists
        if (statusChart) {
            statusChart.destroy();
        }

        const yMax = data.total ? Math.max(data.total, 1) : undefined;
        statusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Job Orders',
                    data: data.data,
                    backgroundColor: [
                        '#ffc107', // Routing - Yellow
                        '#17a2b8', // Completed - Cyan
                        '#28a745', // Checked - Green
                        '#6c757d'  // Closed - Gray
                    ],
                    borderColor: [
                        '#e0a800',
                        '#138496',
                        '#1e7e34',
                        '#545b62'
                    ],
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 20,
                        right: 20,
                        top: 20,
                        bottom: 20
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3366ff',
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
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function(context) {
                                const value = context.parsed.y || 0;
                                const total = data.total || 0;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [
                                    `Count: ${value}`,
                                    `Percentage: ${percentage}%`,
                                    '',
                                    `Total JO Requests: ${total}`
                                ];
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
                            font: {
                                size: 12,
                                weight: '600'
                            },
                            color: '#666666'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: yMax,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            color: '#666666',
                            stepSize: 1
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    function setupSearch() {
        const searchInput = document.querySelector('.JO-search-input');
        const searchButton = document.querySelector('.JO-search-button');
        const filterSelect = document.querySelector('.JO-filter-select');
        
        console.log('Setting up search functionality...');
        console.log('Search input found:', !!searchInput);
        console.log('Search button found:', !!searchButton);
        console.log('Filter select found:', !!filterSelect);
        
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    performSearch(this.value);
                }, 300);
            });
            
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch(this.value);
                }
            });
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', function() {
                const query = document.querySelector('.JO-search-input').value;
                performSearch(query);
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', function() {
                performSearch(document.querySelector('.JO-search-input').value);
            });
        }
        
        console.log('Search functionality setup complete.');
    }

    function performSearch(query) {
        const filterValue = document.querySelector('.JO-filter-select').value;
        const noResultsDiv = document.getElementById('jo-no-results');
        
        console.log('Performing search with query:', query, 'and filter:', filterValue);
        console.log('Total job orders before filtering:', allJobOrders.length);
        
        filteredJobOrders = allJobOrders.filter(order => {
            const matchesQuery = !query || 
                order.jo_number.toLowerCase().includes(query.toLowerCase()) ||
                order.line.toLowerCase().includes(query.toLowerCase()) ||
                order.jo_type.toLowerCase().includes(query.toLowerCase()) ||
                order.jo_tools.toLowerCase().includes(query.toLowerCase()) ||
                order.requestor.toLowerCase().includes(query.toLowerCase());
            
            const matchesFilter = filterValue === 'all' || 
                order.status.toLowerCase() === filterValue.toLowerCase();
            
            return matchesQuery && matchesFilter;
        });

        console.log('Filtered job orders:', filteredJobOrders.length);

        currentPage = 1;
        updateTable();
        updatePagination();
        
        if (filteredJobOrders.length === 0 && (query || filterValue !== 'all')) {
            if (noResultsDiv) {
                noResultsDiv.style.display = 'block';
            }
        } else {
            if (noResultsDiv) {
                noResultsDiv.style.display = 'none';
            }
        }
    }

    function loadJobOrders() {
        const tableRows = document.querySelectorAll('#jo-table-body tr.jo-table-row');
        console.log('Found table rows:', tableRows.length);
        
        allJobOrders = Array.from(tableRows).map(row => {
            const actionButton = row.querySelector('.JO-icon-button[data-id]');
            const jobOrder = {
                id: actionButton?.getAttribute('data-id'),
                jo_number: row.cells[0].textContent.trim(),
                category: row.cells[1].querySelector('.JO-category-pill')?.textContent.trim() || '',
                jo_tools: row.cells[2].textContent.trim(),
                jo_type: row.cells[3].textContent.trim(),
                requestor: row.cells[4].textContent.trim(),
                line: row.cells[5].textContent.trim(),
                status: row.cells[6].querySelector('.JO-status')?.textContent.trim() || '',
                date: row.cells[7].textContent.trim()
            };
            console.log('Extracted job order:', jobOrder);
            return jobOrder;
        });

        console.log('Total job orders loaded:', allJobOrders.length);
        filteredJobOrders = [...allJobOrders];
        updateTable();
        updatePagination();
        
        if (allJobOrders.length > 0) {
            console.log('Sample job order data:', allJobOrders[0]);
            console.log('Search test: Try searching for:', allJobOrders[0].jo_number);
        }
    }

    function updateTable() {
        const tbody = document.getElementById('jo-table-body');
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = filteredJobOrders.slice(startIndex, endIndex);

        tbody.innerHTML = '';

        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="JO-empty-table">No job order requests found.</td></tr>';
            return;
        }

        pageData.forEach(order => {
            const row = document.createElement('tr');
            row.className = 'jo-table-row';
            row.innerHTML = `
                <td data-label="JO Number">${order.jo_number}</td>
                <td data-label="Category"><span class="JO-category-pill JO-category-${order.category.toLowerCase()}">${order.category}</span></td>
                <td data-label="Tool">${order.jo_tools}</td>
                <td data-label="Nature">${order.jo_type}</td>
                <td data-label="Requestor">${order.requestor}</td>
                <td data-label="Line">${order.line}</td>
                <td data-label="Status"><span class="JO-status JO-status-${order.status.toLowerCase()}">${order.status}</span></td>
                <td data-label="Date">${order.date}</td>
                <td data-label="Actions">
                    <button class="JO-icon-button" title="View Details" data-id="${order.id}" data-number="${order.jo_number}">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.status.includes('Completed') ? `
                        <button class="JO-icon-button JO-check-btn" title="Close Transaction" data-id="${order.id}" data-number="${order.jo_number}">
                            <i class="fas fa-check-circle"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });

        // Re-attach event listeners
        attachTableEventListeners();
    }

    function attachTableEventListeners() {
        // View details buttons
        document.querySelectorAll('.JO-icon-button[title="View Details"]').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const number = this.getAttribute('data-number');
                openJobOrderDetails(id, number);
            });
        });

        // Close transaction buttons
        document.querySelectorAll('.JO-check-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const number = this.getAttribute('data-number');
                openCloseTransactionModal(id, number);
            });
        });
    }

    function setupPagination() {
        const prevBtn = document.getElementById('jo-prev-page');
        const nextBtn = document.getElementById('jo-next-page');
        const pagesContainer = document.getElementById('jo-pagination-pages');

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    updateTable();
                    updatePagination();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                const totalPages = Math.ceil(filteredJobOrders.length / itemsPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    updateTable();
                    updatePagination();
                }
            });
        }
    }

    function updatePagination() {
        const totalItems = filteredJobOrders.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);

        // Update info
        document.getElementById('jo-showing-start').textContent = startItem;
        document.getElementById('jo-showing-end').textContent = endItem;
        document.getElementById('jo-total-items').textContent = totalItems;

        // Update buttons
        const prevBtn = document.getElementById('jo-prev-page');
        const nextBtn = document.getElementById('jo-next-page');
        const pagesContainer = document.getElementById('jo-pagination-pages');

        if (prevBtn) {
            prevBtn.classList.toggle('disabled', currentPage === 1);
        }

        if (nextBtn) {
            nextBtn.classList.toggle('disabled', currentPage === totalPages);
        }

        // Update page numbers
        if (pagesContainer) {
            pagesContainer.innerHTML = '';
            
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    const pageBtn = document.createElement('button');
                    pageBtn.className = `JO-pagination-btn ${i === currentPage ? 'active' : ''}`;
                    pageBtn.textContent = i;
                    pageBtn.addEventListener('click', () => {
                        currentPage = i;
                        updateTable();
                        updatePagination();
                    });
                    pagesContainer.appendChild(pageBtn);
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.className = 'JO-pagination-ellipsis';
                    pagesContainer.appendChild(ellipsis);
                }
            }
        }
    }

    async function openJobOrderDetails(id, number) {
        openModal('jo-details-modal');
        
        try {
            const response = await fetch(`/joborder/job-order-details/${id}/`);
            const data = await response.json();

            if (data.status === 'success') {
                displayJobOrderDetails(data);
            } else {
                showToast(data.message || 'Error loading job order details', 'error');
            }
        } catch (error) {
            console.error('Error loading job order details:', error);
            showToast('Error loading job order details', 'error');
        }
    }

    function displayJobOrderDetails(data) {
        const content = document.getElementById('jo-details-content');
        
        content.innerHTML = `
            <div class="JO-details-container">
                <div class="JO-details-header">
                    <h3>Job Order #${data.jo_number}</h3>
                    <span class="JO-status JO-status-${data.jo_status.toLowerCase()}">${data.jo_status}</span>
                </div>
                
                <div class="JO-details-grid">
                    <div class="JO-details-section">
                        <h4>Basic Information</h4>
                        <div class="JO-details-row">
                            <span class="JO-details-label">Category:</span>
                            <span class="JO-details-value">${data.category}</span>
                        </div>
                        <div class="JO-details-row">
                            <span class="JO-details-label">Line:</span>
                            <span class="JO-details-value">${data.line || 'N/A'}</span>
                        </div>
                        <div class="JO-details-row">
                            <span class="JO-details-label">Tool:</span>
                            <span class="JO-details-value">${data.tool}</span>
                        </div>
                        <div class="JO-details-row">
                            <span class="JO-details-label">Nature:</span>
                            <span class="JO-details-value">${data.nature}</span>
                        </div>
                    </div>
                    
                    <div class="JO-details-section">
                        <h4>Request Details</h4>
                        <div class="JO-details-row">
                            <span class="JO-details-label">Requestor:</span>
                            <span class="JO-details-value">${data.requestor}</span>
                        </div>
                        <div class="JO-details-row">
                            <span class="JO-details-label">Prepared By:</span>
                            <span class="JO-details-value">${data.prepared_by || 'N/A'}</span>
                        </div>
                        <div class="JO-details-row">
                            <span class="JO-details-label">Submitted:</span>
                            <span class="JO-details-value">${data.submitted_date}</span>
                        </div>
                    </div>
                </div>
                
                <div class="JO-details-section">
                    <h4>Details</h4>
                    <p class="JO-details-description">${data.details || 'No details provided'}</p>
                </div>
                
                ${data.routing && data.routing.length > 0 ? `
                    <div class="JO-details-section">
                        <h4>Approval History</h4>
                        <div class="JO-routing-history">
                            ${data.routing.map(route => `
                                <div class="JO-routing-item">
                                    <div class="JO-routing-header">
                                        <span class="JO-routing-approver">${route.approver_name}</span>
                                        <span class="JO-routing-status JO-status-${route.status.toLowerCase()}">${route.status}</span>
                                    </div>
                                    ${route.remarks ? `<p class="JO-routing-remarks">${route.remarks}</p>` : ''}
                                    <div class="JO-routing-dates">
                                        <span>Requested: ${route.date}</span>
                                        ${route.approved_at ? `<span>Approved: ${route.approved_at}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function openCloseTransactionModal(id, number) {
        document.getElementById('close-jo-number').textContent = number;
        openModal('confirm-close-modal');
        
        // Store the job order ID for the close action
        document.getElementById('confirm-close-modal').setAttribute('data-jo-id', id);
    }

    async function handleJobOrderSubmission(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('#submit-request');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<div class="loading-spinner"></div> Submitting...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });

            if (response.ok) {
                showToast('Job order request submitted successfully!', 'success');
                closeModal('new-job-order-modal');
                form.reset();
                
                // Reset nature options display
                document.querySelectorAll('.JO-nature-options').forEach(option => {
                    option.style.display = 'none';
                });
                document.querySelector('.JO-nature-green').style.display = 'block';
                
                // Reload the page to show new data
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const data = await response.json();
                showToast(data.message || 'Error submitting job order request', 'error');
            }
        } catch (error) {
            console.error('Error submitting job order:', error);
            showToast('Error submitting job order request', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // Utility functions
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (!document.querySelector('.JO-modal.active')) {
                    document.body.style.overflow = '';
                }
            }, 300);
        }
    }

    function closeAllModals() {
        document.querySelectorAll('.JO-modal.active').forEach(modal => {
            closeModal(modal.id);
        });
    }

    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconHtml = '';
        if (type === 'error') {
            iconHtml = '<span class="toast-icon"><i class="fas fa-exclamation-triangle"></i></span>';
        } else if (type === 'success') {
            iconHtml = '<span class="toast-icon"><i class="fas fa-check-circle"></i></span>';
        } else if (type === 'warning') {
            iconHtml = '<span class="toast-icon"><i class="fas fa-exclamation-circle"></i></span>';
        } else if (type === 'info') {
            iconHtml = '<span class="toast-icon"><i class="fas fa-info-circle"></i></span>';
        }
        
        toast.innerHTML = `<div class="toast-content">${iconHtml}<span>${message}</span></div>`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
});
