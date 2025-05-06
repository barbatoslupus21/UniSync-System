document.addEventListener('DOMContentLoaded', function() {
    const dateFilter = document.getElementById('dateFilter');
    const specificDate = document.getElementById('specificDate');
    const shiftFilter = document.getElementById('shiftFilter');
    const searchInput = document.getElementById('searchSchedules');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const errorOverlay = document.getElementById('errorOverlay');
    const errorMessage = document.getElementById('errorMessage');

    // Store chart instances
    let charts = {
        outputPerDay: null,
        efficiency: null,
        outputByLine: null,
        shiftOutput: null,
        statusDistribution: null
    };

    // Auto refresh interval (5 minutes)
    const REFRESH_INTERVAL = 5 * 60 * 1000;
    let refreshTimer;

    // Show/hide loading overlay
    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorOverlay.style.display = 'flex';
        setTimeout(() => {
            errorOverlay.style.display = 'none';
        }, 3000);
    }

    // Set today's date as default for specific date input
    specificDate.valueAsDate = new Date();
    specificDate.classList.remove('visible'); // Hide by default

    // Fetch data from server
    async function fetchDashboardData() {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const groupId = pathParts[pathParts.length - 1];
        const params = new URLSearchParams({
            dateFilter: dateFilter.value,
            specificDate: specificDate.value,
            shiftFilter: shiftFilter.value
        });
    
        try {
            console.log(`Fetching dashboard data for group ${groupId} with filters:`, {
                dateFilter: dateFilter.value,
                specificDate: specificDate.value || 'none',
                shiftFilter: shiftFilter.value
            });
    
            const response = await fetch(`/monitoring/group-dashboard/${groupId}/data/?${params}`);
            
            if (!response.ok) {
                let errorMsg = `Failed to fetch dashboard data: ${response.status} ${response.statusText}`;
                
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        errorMsg = errorData.error;
                    }
                } catch (jsonError) {
                    // If JSON parsing fails, use default error message
                }
                
                throw new Error(errorMsg);
            }
            
            const data = await response.json();
            console.log("Dashboard data received successfully");
            return data;
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showError(`Error: ${error.message}`);
            return null;
        }
    }

    // Initial load with server data
    async function loadDashboard() {
        console.log("Loading dashboard...");
        showLoading();
        
        try {
            const data = await fetchDashboardData();
            
            if (!data) {
                console.error('No data returned from server');
                hideLoading();
                return;
            }

            if (!data || 
                !data.outputPerDay || data.outputPerDay.length === 0 ||
                !data.efficiencyData || data.efficiencyData.length === 0) {
                console.warn("No data available for the selected period");
                
                // Show a message to the user
                showError("No data available for the selected time period. Try a different filter.");
                hideLoading();
                
                // Clear any existing charts but don't try to create new ones
                Object.values(charts).forEach(chart => {
                    if (chart) {
                        chart.destroy();
                    }
                });
                
                // Reset charts to null
                charts = {
                    outputPerDay: null,
                    efficiency: null,
                    outputByLine: null,
                    shiftOutput: null,
                    statusDistribution: null
                };
                
                // Clear the schedule list
                const scheduleListBody = document.getElementById('scheduleListBody');
                if (scheduleListBody) {
                    scheduleListBody.innerHTML = `
                        <div class="PM-empty-state" style="padding: 30px; text-align: center;">
                            <i class="fas fa-chart-bar" style="font-size: 2rem; color: #ddd; margin-bottom: 15px;"></i>
                            <h3>No Data Available</h3>
                            <p>There is no data for the selected time period. Try selecting a different date range.</p>
                        </div>
                    `;
                }
                
                return;
            }

            try {
                if (data.outputPerDay && data.outputPerDay.length > 0) {
                    charts.outputPerDay = createOutputPerDayChart(data.outputPerDay);
                    console.log("Output per day chart created");
                } else {
                    console.warn("No output per day data available");
                }
            } catch (error) {
                console.error("Error creating output per day chart:", error);
            }
            
            try {
                if (data.efficiencyData && data.efficiencyData.length > 0) {
                    charts.efficiency = createEfficiencyChart(data.efficiencyData);
                    console.log("Efficiency chart created");
                } else {
                    console.warn("No efficiency data available");
                }
            } catch (error) {
                console.error("Error creating efficiency chart:", error);
            }
            
            console.log("Processing dashboard data");
            
            // Update summary statistics
            updateSummaryStats(data);
    
            // Destroy existing charts if they exist
            Object.values(charts).forEach(chart => {
                if (chart) {
                    chart.destroy();
                }
            });
    
            // Create charts with try/catch for each to prevent cascade failures
            try {
                charts.outputPerDay = createOutputPerDayChart(data.outputPerDay);
                console.log("Output per day chart created");
            } catch (error) {
                console.error("Error creating output per day chart:", error);
            }
            
            try {
                charts.efficiency = createEfficiencyChart(data.efficiencyData);
                console.log("Efficiency chart created");
            } catch (error) {
                console.error("Error creating efficiency chart:", error);
            }
            
            try {
                charts.outputByLine = createOutputByLineChart(data.outputByLine);
                console.log("Output by line chart created");
            } catch (error) {
                console.error("Error creating output by line chart:", error);
            }
            
            try {
                charts.shiftOutput = createShiftOutputChart(data.shiftOutput);
                console.log("Shift output chart created");
            } catch (error) {
                console.error("Error creating shift output chart:", error);
            }
            
            try {
                charts.statusDistribution = createStatusDistributionChart(data.statusDistribution);
                console.log("Status distribution chart created");
            } catch (error) {
                console.error("Error creating status distribution chart:", error);
            }
    
            // Populate schedule list
            try {
                populateScheduleList(data.schedules);
                console.log("Schedule list populated with", data.schedules.length, "items");
            } catch (error) {
                console.error("Error populating schedule list:", error);
            }
    
            hideLoading();
            console.log("Dashboard loaded successfully");
            
            // Add a subtle indicator that the dashboard refreshed
            const dashboardContainer = document.querySelector('.PM-dashboard-container');
            if (dashboardContainer) {
                dashboardContainer.classList.add('refreshed');
                setTimeout(() => {
                    dashboardContainer.classList.remove('refreshed');
                }, 1000);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showError(`Failed to load dashboard: ${error.message}`);
            hideLoading();
        }
    }

    function updateSummaryStats(data) {
        document.getElementById('totalSchedules').textContent = data.totalSchedules;
        document.getElementById('totalSchedulesTarget').textContent = data.totalSchedulesTarget;
        document.getElementById('productionProgress').textContent = `${data.productionProgress}%`;
        document.getElementById('productionProgressTarget').textContent = `${data.productionProgressTarget}%`;
        document.getElementById('totalProduction').textContent = `${data.totalProduced} / ${data.totalPlanned}`;
        document.getElementById('totalProductionTarget').textContent = data.totalPlanned;
        document.getElementById('activeLines').textContent = data.activeLines;
        document.getElementById('totalLines').textContent = data.totalLines;
        
        // Update Not Met Target as the complement of production progress
        document.getElementById('notMetTarget').textContent = `${data.notMetTarget}%`;
        
        // Set appropriate color based on not met target percentage
        const notMetElem = document.getElementById('notMetTarget');
        if (data.notMetTarget < 30) {
            notMetElem.style.color = '#48c774'; // Good - low percentage not meeting target
        } else if (data.notMetTarget < 70) {
            notMetElem.style.color = '#ffdd57'; // Warning
        } else {
            notMetElem.style.color = '#ff3860'; // Bad - high percentage not meeting target
        }
    }

    function createOutputPerDayChart(data) {
        if (!data || data.length === 0) {
            console.warn("No data provided for output per day chart");
            return null;
        }
        
        const ctx = document.getElementById('outputPerDayChart').getContext('2d');
        
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Production Output',
                    data: data.map(item => item.quantity),
                    backgroundColor: 'rgba(51, 102, 255, 0.7)',
                    borderColor: 'rgb(51, 102, 255)',
                    borderWidth: 2,
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantity Produced'
                        }
                    }
                },
                elements: {
                    bar: {
                        borderWidth: 2,
                        borderRadius: 5,
                        borderSkipped: false
                    }
                }
            }
        });
    }

    function createEfficiencyChart(data) {
        const ctx = document.getElementById('efficiencyChart').getContext('2d');
        
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Efficiency',
                    data: data.map(item => item.efficiency),
                    borderColor: 'rgb(72, 199, 116)',
                    backgroundColor: 'rgba(72, 199, 116, 0.3)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgb(72, 199, 116)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Efficiency (%)'
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.4
                    },
                    point: {
                        radius: 5,
                        hoverRadius: 8,
                        borderWidth: 2
                    }
                }
            }
        });
    }

    function createOutputByLineChart(data) {
        const ctx = document.getElementById('outputByLineChart').getContext('2d');
        
        // Generate a color palette for the lines
        const colorPalette = [
            'rgba(51, 102, 255, 0.7)',    // Blue
            'rgba(72, 199, 116, 0.7)',    // Green
            'rgba(255, 159, 67, 0.7)',    // Orange
            'rgba(255, 99, 132, 0.7)',    // Red
            'rgba(153, 102, 255, 0.7)',   // Purple
            'rgba(255, 205, 86, 0.7)',    // Yellow
            'rgba(54, 162, 235, 0.7)',    // Light Blue
            'rgba(75, 192, 192, 0.7)',    // Teal
            'rgba(255, 128, 0, 0.7)',     // Dark Orange
            'rgba(201, 203, 207, 0.7)'    // Gray
        ];

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.line),
                datasets: [{
                    label: 'Output by Line',
                    data: data.map(item => item.quantity),
                    backgroundColor: data.map((_, index) => colorPalette[index % colorPalette.length]),
                    borderColor: data.map((_, index) => colorPalette[index % colorPalette.length].replace('0.7', '1')),
                    borderWidth: 2,
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantity Produced'
                        }
                    }
                },
                elements: {
                    bar: {
                        borderWidth: 2,
                        borderRadius: 5,
                        borderSkipped: false
                    }
                }
            }
        });
    }

    function createShiftOutputChart(data) {
        const ctx = document.getElementById('shiftOutputChart').getContext('2d');
        
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.shift),
                datasets: [{
                    data: data.map(item => item.quantity),
                    backgroundColor: [
                        'rgba(51, 102, 255, 0.8)',
                        'rgba(255, 159, 67, 0.8)'
                    ],
                    borderColor: [
                        'rgb(51, 102, 255)',
                        'rgb(255, 159, 67)'
                    ],
                    borderWidth: 2,
                    borderRadius: 5,
                    weight: 0.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '60%',
                radius: '90%',
                elements: {
                    arc: {
                        borderWidth: 2,
                        borderRadius: 5
                    }
                }
            }
        });
    }

    function createStatusDistributionChart(data) {
        const ctx = document.getElementById('statusDistributionChart').getContext('2d');
        
        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.status),
                datasets: [{
                    data: data.map(item => item.count),
                    backgroundColor: [
                        'rgba(51, 102, 255, 0.8)',    // Planned - Blue
                        'rgba(255, 159, 67, 0.8)',    // Change Load - Orange
                        'rgba(255, 99, 132, 0.8)'     // Backlog - Red
                    ],
                    borderColor: [
                        'rgb(51, 102, 255)',
                        'rgb(255, 159, 67)',
                        'rgb(255, 99, 132)'
                    ],
                    borderWidth: 2,
                    borderRadius: 5,
                    weight: 0.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                radius: '90%',
                elements: {
                    arc: {
                        borderWidth: 2,
                        borderRadius: 5
                    }
                }
            }
        });
    }

    function populateScheduleList(schedules) {
        const scheduleListBody = document.getElementById('scheduleListBody');
        scheduleListBody.innerHTML = ''; // Clear existing items

        schedules.forEach(schedule => {
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'PM-schedule-item';
            scheduleItem.dataset.status = schedule.status;
            scheduleItem.dataset.product = schedule.product.toLowerCase();

            // Get status color class
            let statusClass = '';
            switch(schedule.status) {
                case 'Planned':
                    statusClass = 'Planned';
                    break;
                case 'Change Load':
                    statusClass = 'ChangeLoad';
                    break;
                case 'Backlog':
                    statusClass = 'Backlog';
                    break;
            }

            // Get percentage color class
            let percentageClass = '';
            if (schedule.progress < 30) {
                percentageClass = 'low';
            } else if (schedule.progress >= 30 && schedule.progress <= 70) {
                percentageClass = 'medium';
            } else {
                percentageClass = 'high';
            }

            scheduleItem.innerHTML = `
                <div class="PM-schedule-col" data-label="Date">${schedule.date}</div>
                <div class="PM-schedule-col" data-label="Product">${schedule.product}</div>
                <div class="PM-schedule-col" data-label="Line">${schedule.line}</div>
                <div class="PM-schedule-col" data-label="Shift">${schedule.shift}</div>
                <div class="PM-schedule-col" data-label="Planned Qty">${schedule.plannedQty}</div>
                <div class="PM-schedule-col" data-label="Produced Qty">${schedule.producedQty}</div>
                <div class="PM-schedule-col" data-label="Progress">
                    <span class="PM-schedule-progress ${percentageClass}">
                        ${schedule.progress.toFixed(1)}%
                    </span>
                </div>
                <div class="PM-schedule-col" data-label="Status">
                    <span class="PM-schedule-status ${statusClass}">
                        ${schedule.status}
                    </span>
                </div>
            `;

            scheduleListBody.appendChild(scheduleItem);
        });
    }

    function filterSchedules() {
        const searchTerm = document.getElementById('searchSchedules').value.toLowerCase();
        const scheduleItems = document.querySelectorAll('.PM-schedule-item');

        scheduleItems.forEach(item => {
            const product = item.dataset.product;
            const searchMatch = searchTerm === '' || product.includes(searchTerm);
            item.style.display = searchMatch ? '' : 'none';
        });
    }

    // Event Listeners
    dateFilter.addEventListener('change', function() {
        if (dateFilter.value === 'customDate') {
            specificDate.classList.add('visible');
        } else {
            specificDate.classList.remove('visible');
            loadDashboard();
        }
    });

    specificDate.addEventListener('change', loadDashboard);
    shiftFilter.addEventListener('change', loadDashboard);
    searchInput.addEventListener('input', filterSchedules);

    // Start auto-refresh
    function startAutoRefresh() {
        // Clear existing timer if any
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }

        // Set new timer
        refreshTimer = setInterval(() => {
            loadDashboard();
        }, REFRESH_INTERVAL);
    }

    // Initialize dashboard
    loadDashboard();
    startAutoRefresh();

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }
    });
});