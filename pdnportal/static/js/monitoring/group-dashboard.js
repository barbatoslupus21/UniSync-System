document.addEventListener('DOMContentLoaded', function() {
    const dateFilter = document.getElementById('dateFilter');
    const specificDate = document.getElementById('specificDate');
    const shiftFilter = document.getElementById('shiftFilter');
    const searchInput = document.getElementById('searchSchedules');
    const refreshBtn = document.getElementById('refreshDashboard');
    const exportBtn = document.getElementById('exportSchedules');
    const loadingOverlay = document.getElementById('loadingOverlay');

    let charts = {
        outputPerDay: null,
        efficiency: null,
        outputByLine: null,
        shiftOutput: null,
        statusDistribution: null,
        scheduleSummary: null,
        outputRate: null,
        shiftDistribution: null,
        scheduleStatus: null
    };

    let currentData = null;
    const REFRESH_INTERVAL = 5 * 60 * 1000;
    const PIE_CHART_REFRESH_INTERVAL = 60 * 1000; // 1 minute
    let refreshTimer;
    let pieChartRefreshTimer;
    let animationFrames = [];

    function showLoading() {
        loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
        }, 300);
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.warn('Toast container not found:', message);
            return;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${icons[type]} toast-icon"></i>
                <span>${message}</span>
            </div>
            <button class="close-btn" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function create3DGradient(ctx, color1, color2, direction = 'vertical') {
        const gradient = direction === 'vertical' 
            ? ctx.createLinearGradient(0, 0, 0, 400)
            : ctx.createLinearGradient(0, 0, 400, 0);
        
        gradient.addColorStop(0, color1);
        gradient.addColorStop(0.5, color2);
        gradient.addColorStop(1, color1);
        return gradient;
    }

    function createGlowEffect(ctx, color, blur = 20) {
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    function animateMetricValue(element, targetValue, duration = 1000) {
        const startValue = parseInt(element.textContent) || 0;
        const valueChange = targetValue - startValue;
        const startTime = performance.now();

        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.round(startValue + (valueChange * easeOutQuart));
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                animationFrames.push(requestAnimationFrame(updateValue));
            }
        }
        
        animationFrames.push(requestAnimationFrame(updateValue));
    }

    dateFilter.addEventListener('change', function() {
        if (this.value === 'customDate') {
            specificDate.classList.add('visible');
        } else {
            specificDate.classList.remove('visible');
        }
        loadDashboard();
        loadPieCharts();
    });

    specificDate.addEventListener('change', function() {
        if (dateFilter.value === 'customDate') {
            loadDashboard();
            loadPieCharts();
        }
    });

    shiftFilter.addEventListener('change', function() {
        loadDashboard();
        loadPieCharts();
    });

    refreshBtn.addEventListener('click', function() {
        this.style.animation = 'none';
        setTimeout(() => {
            this.style.animation = '';
        }, 10);
        loadDashboard(false); // Show loading overlay for manual refresh
        showToast('Dashboard refreshed successfully', 'success');
    });

    exportBtn.addEventListener('click', exportSchedules);

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const tbody = document.getElementById('scheduleListBody');
        const rows = tbody.querySelectorAll('tr');
        
        let visibleCount = 0;
        
        rows.forEach((row) => {
            // Skip empty state rows
            if (row.querySelector('.empty-state') || row.querySelector('.JO-empty-table')) {
                return;
            }
            
            const text = row.textContent.toLowerCase();
            const shouldShow = text.includes(searchTerm);
            
            if (shouldShow) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Show empty state if no results found
        if (visibleCount === 0 && searchTerm !== '') {
            const existingEmptyState = tbody.querySelector('.empty-state');
            if (!existingEmptyState) {
                const emptyRow = document.createElement('tr');
                emptyRow.className = 'search-empty-state';
                emptyRow.innerHTML = `
                    <td colspan="8" class="JO-empty-table">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h4>No Results Found</h4>
                            <p>No schedules match your search for "${this.value}"</p>
                        </div>
                    </td>
                `;
                tbody.appendChild(emptyRow);
            }
        } else {
            // Remove search empty state when there are results or search is cleared
            const searchEmptyState = tbody.querySelector('.search-empty-state');
            if (searchEmptyState) {
                searchEmptyState.remove();
            }
        }
    });

    async function fetchDashboardData() {
        const params = new URLSearchParams({
            dateFilter: dateFilter.value,
            specificDate: specificDate.value,
            shiftFilter: shiftFilter.value
        });

        try {
            const response = await fetch(`/monitoring/group-dashboard/${groupId}/data/?${params}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': csrfToken
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showToast('Failed to load dashboard data', 'error');
            throw error;
        }
    }

    async function loadDashboard(silentRefresh = false) {
        if (!silentRefresh) {
            showLoading();
        }

        try {
            const data = await fetchDashboardData();
            currentData = data;
            
            console.log('Dashboard data loaded:', data);

            if (!data || Object.keys(data).length === 0) {
                console.warn('No dashboard data received');
                showEmptyState();
                if (!silentRefresh) hideLoading();
                return;
            }

            console.log('Updating metrics...');
            updateMetrics(data);
            
            console.log('Updating charts...');
            updateCharts(data);
            
            console.log('Updating schedule list...');
            updateScheduleList(data.schedules || []);
            
            if (!silentRefresh) {
                hideLoading();
            }
            
            // Load pie charts AFTER main dashboard is loaded
            console.log('Loading pie charts after dashboard...');
            await loadPieCharts();
        
            
        } catch (error) {
            console.error('Error in loadDashboard:', error);
            if (!silentRefresh) hideLoading();
            showToast('Error loading dashboard', 'error');
        }
    }

    function updateMetrics(data) {
        // Check if elements exist before updating (for backwards compatibility)
        const totalSchedules = document.getElementById('totalSchedules');
        if (totalSchedules) animateMetricValue(totalSchedules, data.totalSchedules || 0);
        
        const totalSchedulesTarget = document.getElementById('totalSchedulesTarget');
        if (totalSchedulesTarget) totalSchedulesTarget.textContent = data.totalSchedulesTarget || 0;
        
        const schedulesProgress = document.getElementById('schedulesProgress');
        if (schedulesProgress) {
            const schedulesPercent = data.totalSchedulesTarget > 0 
                ? (data.totalSchedules / data.totalSchedulesTarget) * 100 
                : 0;
            
            setTimeout(() => {
                schedulesProgress.style.width = `${Math.min(schedulesPercent, 100)}%`;
            }, 200);
        }

        const productionProgress = document.getElementById('productionProgress');
        if (productionProgress) animateMetricValue(productionProgress, data.productionProgress || 0);
        
        const productionIndicator = document.getElementById('productionIndicator');
        if (productionIndicator) {
            if (data.productionProgress >= 90) {
                productionIndicator.className = 'gd-metric-indicator positive';
                productionIndicator.innerHTML = '<i class="fas fa-arrow-up"></i><span>Excellent</span>';
            } else if (data.productionProgress >= 70) {
                productionIndicator.className = 'gd-metric-indicator';
                productionIndicator.innerHTML = '<i class="fas fa-minus"></i><span>Good</span>';
            } else {
                productionIndicator.className = 'gd-metric-indicator negative';
                productionIndicator.innerHTML = '<i class="fas fa-arrow-down"></i><span>Needs Attention</span>';
            }
        }

        const notMetTarget = document.getElementById('notMetTarget');
        if (notMetTarget) animateMetricValue(notMetTarget, data.notMetTarget || 0);
        
        const totalProduction = document.getElementById('totalProduction');
        if (totalProduction) totalProduction.textContent = (data.totalProduced || 0).toLocaleString();
        
        const totalPlanned = document.getElementById('totalPlanned');
        if (totalPlanned) totalPlanned.textContent = (data.totalPlanned || 0).toLocaleString();

        const activeLines = document.getElementById('activeLines');
        if (activeLines) animateMetricValue(activeLines, data.activeLines || 0);
        
        const totalLines = document.getElementById('totalLines');
        if (totalLines) totalLines.textContent = data.totalLines || 0;
        
        const linesBadge = document.getElementById('linesBadge');
        if (linesBadge) {
            const linesPercent = data.totalLines > 0 
                ? Math.round((data.activeLines / data.totalLines) * 100) 
                : 0;
            linesBadge.innerHTML = `<span>${linesPercent}% Active</span>`;
            
            if (linesPercent === 100) {
                linesBadge.style.background = 'linear-gradient(135deg, var(--gd-success) 0%, #059669 100%)';
            } else if (linesPercent >= 80) {
                linesBadge.style.background = 'linear-gradient(135deg, var(--gd-warning) 0%, #d97706 100%)';
            } else {
                linesBadge.style.background = 'linear-gradient(135deg, var(--gd-danger) 0%, #dc2626 100%)';
            }
        }
    }

    function updateCharts(data) {
        // Destroy existing charts
        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });

        // Debug logging
        console.log('=== CHART DATA DEBUG ===');
        console.log('outputPerDay:', data.outputPerDay);
        console.log('efficiencyData:', data.efficiencyData);
        console.log('outputByLine:', data.outputByLine);
        console.log('xLabels:', data.xLabels);
        console.log('========================');

        const chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
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
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#374151',
                    bodyColor: '#6b7280',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 12,
                    padding: 16,
                    boxPadding: 8,
                    titleFont: {
                        size: 14,
                        weight: '700'
                    },
                    bodyFont: {
                        size: 13,
                        weight: '500'
                    },
                    displayColors: true,
                    usePointStyle: true
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        };

        if (data.outputPerDay && data.outputPerDay.length > 0) {
            console.log('Creating outputPerDayChart...');
            const canvas = document.getElementById('outputPerDayChart');
            if (!canvas) {
                console.error('outputPerDayChart canvas not found');
                return;
            }
            console.log('Canvas found:', canvas);
            const ctx = canvas.getContext('2d');
            
            // Create gradients for 3D effect
            const targetGradient = ctx.createLinearGradient(0, 0, 0, 350);
            targetGradient.addColorStop(0, 'rgba(0, 70, 255, 0.9)');
            targetGradient.addColorStop(0.5, 'rgba(0, 70, 255, 0.7)');
            targetGradient.addColorStop(1, 'rgba(0, 70, 255, 0.5)');
            
            const targetBorderGradient = ctx.createLinearGradient(0, 0, 0, 350);
            targetBorderGradient.addColorStop(0, '#0046FF');
            targetBorderGradient.addColorStop(1, '#002A99');
            
            const actualGradient = ctx.createLinearGradient(0, 0, 0, 350);
            actualGradient.addColorStop(0, 'rgba(120, 200, 65, 0.8)');
            actualGradient.addColorStop(0.5, 'rgba(120, 200, 65, 0.4)');
            actualGradient.addColorStop(1, 'rgba(120, 200, 65, 0.1)');
            
            charts.outputPerDay = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.xLabels || data.outputPerDay.map(item => item.label || item.date),
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Target Output',
                            data: data.outputPerDay.map(item => item.target),
                            backgroundColor: targetGradient,
                            borderColor: targetBorderGradient,
                            borderWidth: 0,
                            borderRadius: 12,
                            borderSkipped: false,
                            maxBarThickness: 50,
                            order: 2
                        },
                        {
                            type: 'line',
                            label: 'Current Output',
                            data: data.outputPerDay.map(item => item.quantity),
                            borderColor: '#78C841',
                            backgroundColor: actualGradient,
                            borderWidth: 4,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 6,
                            pointHoverRadius: 10,
                            pointBackgroundColor: '#78C841',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 0,
                            pointHoverBorderWidth: 0,
                            order: 1
                        }
                    ]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(15, 23, 42, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                font: { size: 11, weight: '500' },
                                color: '#64748b',
                                padding: 10,
                                callback: function(value) {
                                    return value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { size: 11, weight: '500' },
                                color: '#64748b',
                                padding: 10
                            }
                        }
                    },
                    plugins: {
                        ...chartDefaults.plugins,
                        legend: {
                            display: true,
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
                            ...chartDefaults.plugins.tooltip,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' units';
                                }
                            }
                        }
                    }
                }
            });
            console.log('outputPerDayChart created successfully');
        } else {
            console.warn('No outputPerDay data or empty array');
        }

        if (data.efficiencyData && data.efficiencyData.length > 0) {
            console.log('Creating efficiencyChart...');
            const avgEfficiency = data.efficiencyData.reduce((sum, item) => sum + item.efficiency, 0) / data.efficiencyData.length;
            const avgEffElement = document.getElementById('avgEfficiency');
            if (avgEffElement) {
                avgEffElement.textContent = `${Math.round(avgEfficiency)}%`;
            }

            const canvas = document.getElementById('efficiencyChart');
            if (!canvas) {
                console.error('efficiencyChart canvas not found');
            } else {
                const ctx = canvas.getContext('2d');
            
                // Function to get gradient color based on efficiency percentage
                const getEfficiencyGradient = (efficiency) => {
                    const gradient = ctx.createLinearGradient(0, 0, 0, 450);
                    
                    if (efficiency >= 90) {
                        // Green gradient (100%-90%)
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
                        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.7)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.5)');
                    } else if (efficiency >= 70) {
                        // Blue gradient (80%-70%)
                        gradient.addColorStop(0, 'rgba(14, 165, 233, 0.9)');
                        gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.7)');
                        gradient.addColorStop(1, 'rgba(125, 211, 252, 0.5)');
                    } else if (efficiency >= 50) {
                        // Yellow gradient (60%-50%)
                        gradient.addColorStop(0, 'rgba(234, 179, 8, 0.9)');
                        gradient.addColorStop(0.5, 'rgba(234, 179, 8, 0.7)');
                        gradient.addColorStop(1, 'rgba(234, 179, 8, 0.5)');
                    } else if (efficiency >= 30) {
                        // Orange gradient (40%-30%)
                        gradient.addColorStop(0, 'rgba(249, 115, 22, 0.9)');
                        gradient.addColorStop(0.5, 'rgba(249, 115, 22, 0.7)');
                        gradient.addColorStop(1, 'rgba(249, 115, 22, 0.5)');
                    } else {
                        // Red gradient (20%-0%)
                        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
                        gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.7)');
                        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.5)');
                    }
                    
                    return gradient;
                };

                // Cap efficiency at 100% and get gradients for each bar
                const cappedEfficiencies = data.efficiencyData.map(item => Math.min(item.efficiency, 100));
                const barGradients = data.efficiencyData.map(item => getEfficiencyGradient(Math.min(item.efficiency, 100)));

                charts.efficiency = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.xLabels || data.efficiencyData.map(item => item.label || item.date),
                        datasets: [{
                            label: 'Efficiency %',
                            data: cappedEfficiencies,
                            backgroundColor: barGradients,
                            borderWidth: 0,
                            borderRadius: 12,
                            borderSkipped: false,
                            maxBarThickness: 50
                        }]
                    },
                    options: {
                        ...chartDefaults,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                grid: {
                                    color: 'rgba(15, 23, 42, 0.05)',
                                    drawBorder: false
                                },
                                ticks: {
                                    font: { size: 11, weight: '500' },
                                    color: '#64748b',
                                    padding: 10,
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: {
                                    font: { size: 11, weight: '500' },
                                    color: '#64748b',
                                    padding: 10
                                }
                            }
                        },
                        plugins: {
                            ...chartDefaults.plugins,
                            legend: {
                                display: false
                            },
                            tooltip: {
                                ...chartDefaults.plugins.tooltip,
                                callbacks: {
                                    label: function(context) {
                                        return 'Efficiency: ' + context.parsed.y + '%';
                                    }
                                }
                            }
                        }
                    }
                });
                console.log('efficiencyChart created successfully');
            }
        } else {
            console.warn('No efficiencyData or empty array');
        }

        if (data.outputByLine && data.outputByLine.length > 0) {
            console.log('Creating outputByLineChart...');
            const canvas = document.getElementById('outputByLineChart');
            if (!canvas) {
                console.error('outputByLineChart canvas not found');
            } else {
                const ctx = canvas.getContext('2d');
            
            // Cap efficiency at 100%
            const cappedData = data.outputByLine.map(item => ({
                ...item,
                efficiency: Math.min(item.efficiency || 0, 100)
            }));

            // Create gradient colors for efficiency bars
            const colors = cappedData.map(item => {
                const efficiency = item.efficiency;
                if (efficiency >= 90) return 'rgba(16, 185, 129, 0.8)'; // Green
                if (efficiency >= 70) return 'rgba(14, 165, 233, 0.8)'; // Blue
                if (efficiency >= 50) return 'rgba(245, 158, 11, 0.8)'; // Orange
                return 'rgba(239, 68, 68, 0.8)'; // Red
            });

            const borderColors = cappedData.map(item => {
                const efficiency = item.efficiency;
                if (efficiency >= 90) return '#10b981';
                if (efficiency >= 70) return '#0ea5e9';
                if (efficiency >= 50) return '#f59e0b';
                return '#ef4444';
            });

            charts.outputByLine = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: cappedData.map(item => item.line),
                    datasets: [{
                        label: 'Efficiency %',
                        data: cappedData.map(item => item.efficiency),
                        backgroundColor: colors,
                        borderColor: borderColors,
                        borderWidth: 2,
                        borderRadius: 10,
                        borderSkipped: false
                    }]
                },
                options: {
                    ...chartDefaults,
                    indexAxis: 'y',
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                                color: 'rgba(15, 23, 42, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                font: { size: 11, weight: '500' },
                                color: '#64748b',
                                padding: 10,
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        y: {
                            grid: { display: false },
                            ticks: {
                                font: { size: 11, weight: '500' },
                                color: '#64748b',
                                padding: 10
                            }
                        }
                    },
                    plugins: {
                        ...chartDefaults.plugins,
                        legend: {
                            display: false
                        },
                        tooltip: {
                            ...chartDefaults.plugins.tooltip,
                            callbacks: {
                                label: function(context) {
                                    const lineData = data.outputByLine[context.dataIndex];
                                    return [
                                        'Efficiency: ' + lineData.efficiency + '%',
                                        'Actual: ' + lineData.quantity.toLocaleString() + ' units',
                                        'Target: ' + lineData.target.toLocaleString() + ' units'
                                    ];
                                }
                            }
                        }
                    }
                }
            });
            console.log('outputByLineChart created successfully');
            }
        } else {
            console.warn('No outputByLine data or empty array');
        }

        if (data.shiftOutput && data.shiftOutput.length > 0) {
            const shiftTotal = document.getElementById('shiftTotal');
            if (shiftTotal) {
                const total = data.shiftOutput.reduce((sum, item) => sum + item.quantity, 0);
                shiftTotal.textContent = total.toLocaleString();
            }

            const canvas = document.getElementById('shiftOutputChart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                
                charts.shiftOutput = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: data.shiftOutput.map(item => item.shift),
                        datasets: [{
                            data: data.shiftOutput.map(item => item.quantity),
                            backgroundColor: [
                                'rgba(14, 165, 233, 0.8)',
                                'rgba(245, 158, 11, 0.8)'
                            ],
                            borderColor: ['#0ea5e9', '#f59e0b'],
                            borderWidth: 3,
                            spacing: 4
                        }]
                    },
                    options: {
                        ...chartDefaults,
                        cutout: '70%',
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    font: { size: 12, weight: '600' },
                                    usePointStyle: true,
                                    pointStyle: 'circle'
                                }
                            },
                            tooltip: chartDefaults.plugins.tooltip
                        }
                    }
                });
            }
        }

        if (data.statusDistribution && data.statusDistribution.length > 0) {
            const canvas = document.getElementById('statusDistributionChart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                
                charts.statusDistribution = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: data.statusDistribution.map(item => item.status),
                        datasets: [{
                            data: data.statusDistribution.map(item => item.count),
                            backgroundColor: [
                                'rgba(14, 165, 233, 0.8)',
                                'rgba(245, 158, 11, 0.8)',
                                'rgba(239, 68, 68, 0.8)'
                            ],
                            borderColor: ['#0ea5e9', '#f59e0b', '#ef4444'],
                            borderWidth: 3,
                            spacing: 4
                        }]
                    },
                    options: {
                        ...chartDefaults,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    font: { size: 12, weight: '600' },
                                    usePointStyle: true,
                                    pointStyle: 'circle'
                                }
                            },
                            tooltip: chartDefaults.plugins.tooltip
                        }
                    }
                });
            }
        }
    }

    function updateScheduleList(schedules) {
        const scheduleListBody = document.getElementById('scheduleListBody');
        scheduleListBody.innerHTML = '';

        if (!schedules || schedules.length === 0) {
            scheduleListBody.innerHTML = `
                <tr>
                    <td colspan="8" class="JO-empty-table">
                        <div class="empty-state">
                            <i class="fas fa-clipboard-list"></i>
                            <h4>No Schedules Found</h4>
                            <p>There are no schedules for the selected period.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        schedules.forEach((schedule, index) => {
            const row = document.createElement('tr');
            row.style.animationDelay = `${index * 0.05}s`;

            let progressClass = 'low';
            if (schedule.progress >= 80) progressClass = 'high';
            else if (schedule.progress >= 50) progressClass = 'medium';

            let statusClass = 'planned';
            if (schedule.status === 'Change Load') statusClass = 'change-load';
            else if (schedule.status === 'Backlog') statusClass = 'backlog';

            row.innerHTML = `
                <td>${schedule.date}</td>
                <td>${schedule.product}</td>
                <td>${schedule.line}</td>
                <td>${schedule.shift}</td>
                <td>${schedule.plannedQty.toLocaleString()}</td>
                <td>${schedule.producedQty.toLocaleString()}</td>
                <td>
                    <div class="gd-progress-cell">
                        <div class="gd-progress-mini">
                            <div class="gd-progress-mini-fill ${progressClass}" style="width: ${Math.min(schedule.progress, 100)}%"></div>
                        </div>
                        <span class="gd-progress-text">${schedule.progress.toFixed(0)}%</span>
                    </div>
                </td>
                <td>
                    <span class="gd-status-badge ${statusClass}">${schedule.status}</span>
                </td>
            `;

            scheduleListBody.appendChild(row);
            
            setTimeout(() => {
                row.classList.add('fade-in');
            }, index * 50);
        });
    }

    function showEmptyState() {
        const scheduleListBody = document.getElementById('scheduleListBody');
        scheduleListBody.innerHTML = `
            <tr>
                <td colspan="8" class="JO-empty-table">
                    <div class="empty-state">
                        <i class="fas fa-chart-bar"></i>
                        <h4>No Data Available</h4>
                        <p>There is no data for the selected time period. Try selecting a different date range.</p>
                    </div>
                </td>
            </tr>
        `;

        document.querySelectorAll('.gd-metric-value span').forEach(el => {
            if (el.id !== 'totalSchedulesTarget' && el.id !== 'totalLines') {
                el.textContent = '0';
            }
        });

        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }

    function exportSchedules() {
        if (!currentData || !currentData.schedules || currentData.schedules.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }

        const csvContent = [
            ['Date', 'Product', 'Line', 'Shift', 'Planned Qty', 'Produced Qty', 'Progress %', 'Status'],
            ...currentData.schedules.map(s => [
                s.date,
                s.product,
                s.line,
                s.shift,
                s.plannedQty,
                s.producedQty,
                s.progress.toFixed(2),
                s.status
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `production-schedules-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast('Schedule data exported successfully', 'success');
    }

    function startAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => {
            console.log('Auto-refreshing dashboard data (5 min interval)...');
            loadDashboard(true); // Silent refresh - no loading overlay
        }, REFRESH_INTERVAL);
        console.log('Main dashboard auto-refresh started (5 minutes interval)');
    }

    function cleanupAnimations() {
        animationFrames.forEach(frame => cancelAnimationFrame(frame));
        animationFrames = [];
    }

    // ========== PIE CHART FUNCTIONS ==========
    
    async function fetchPieChartData() {
        console.log('Fetching pie chart data...');
        const params = new URLSearchParams({
            dateFilter: dateFilter.value,
            specificDate: specificDate.value,
            shiftFilter: shiftFilter.value
        });
        
        console.log('Pie chart params:', {
            dateFilter: dateFilter.value,
            specificDate: specificDate.value,
            shiftFilter: shiftFilter.value
        });

        try {
            const url = `/monitoring/group-dashboard/${groupId}/pie-charts/?${params}`;
            console.log('Fetching from:', url);
            
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': csrfToken
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Pie chart data fetched successfully:', data);
            return data;
        } catch (error) {
            console.error('Error fetching pie chart data:', error);
            return null;
        }
    }

    function createPieChart(canvasId, data, centerLabel = null) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }
        
        const ctx = canvas.getContext('2d');

        const config = {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '65%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#374151',
                        bodyColor: '#6b7280',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 12,
                        padding: 12,
                        titleFont: {
                            size: 13,
                            weight: '700'
                        },
                        bodyFont: {
                            size: 12,
                            weight: '500'
                        },
                        displayColors: true,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                onHover: (event, activeElements) => {
                    event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                },
                elements: {
                    arc: {
                        borderWidth: 0,
                        hoverBorderWidth: 0,
                        hoverOffset: 0
                    }
                }
            }
        };

        return new Chart(ctx, config);
    }

    function updatePieLegend(legendId, labels, colors, values) {
        const legendContainer = document.getElementById(legendId);
        if (!legendContainer) return;

        const total = values.reduce((a, b) => a + b, 0);
        
        legendContainer.innerHTML = labels.map((label, index) => {
            const value = values[index];
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            
            return `
                <div class="gd-pie-legend-item">
                    <div class="gd-pie-legend-left">
                        <div class="gd-pie-legend-color" style="background-color: ${colors[index]};"></div>
                        <span class="gd-pie-legend-label">${label}</span>
                    </div>
                    <div class="gd-pie-legend-right">
                        <span class="gd-pie-legend-count">${value}</span>
                        <span class="gd-pie-legend-percentage">${percentage}%</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function loadPieCharts() {
        console.log('=== LOADING PIE CHARTS ===');
        
        // Add small delay to ensure DOM is fully rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            const data = await fetchPieChartData();
            console.log('Pie chart data received:', data);
            
            if (!data) {
                console.error('No pie chart data received');
                return;
            }

            // 1. Schedule Summary Chart
            console.log('Creating Schedule Summary pie chart...');
            if (charts.scheduleSummary) charts.scheduleSummary.destroy();
            
            const completedPercentage = data.scheduleSummary.total > 0 
                ? Math.round((data.scheduleSummary.completed / data.scheduleSummary.total) * 100)
                : 0;
            
            charts.scheduleSummary = createPieChart('scheduleSummaryChart', {
                labels: ['Completed', 'Ongoing'],
                datasets: [{
                    data: [data.scheduleSummary.completed, data.scheduleSummary.ongoing],
                    backgroundColor: ['#10b981', '#f59e0b']
                }]
            }, true);
            
            console.log('Schedule Summary chart created:', charts.scheduleSummary);
            
            if (!charts.scheduleSummary) {
                console.error('Failed to create Schedule Summary chart!');
            }
            
            // Update center label for Schedule Summary
            const scheduleSummaryValue = document.getElementById('scheduleSummaryValue');
            if (scheduleSummaryValue) {
                scheduleSummaryValue.textContent = `${completedPercentage}%`;
            }
            
            updatePieLegend('scheduleSummaryLegend', 
                ['Completed', 'Ongoing'],
                ['#10b981', '#f59e0b'],
                [data.scheduleSummary.completed, data.scheduleSummary.ongoing]
            );

            // 2. Output Rate Chart (with center label)
            if (charts.outputRate) charts.outputRate.destroy();
            charts.outputRate = createPieChart('outputRateChart', {
                labels: ['Actual Output', 'Remaining'],
                datasets: [{
                    data: [data.outputRate.actual, data.outputRate.remaining],
                    backgroundColor: ['#0ea5e9', '#e2e8f0']
                }]
            }, true);
            
            // Update center label for Output Rate
            const outputRateValue = document.getElementById('outputRateValue');
            if (outputRateValue) {
                outputRateValue.textContent = `${data.outputRate.progress}%`;
            }
            
            updatePieLegend('outputRateLegend',
                ['Actual Output', 'Remaining'],
                ['#0ea5e9', '#e2e8f0'],
                [data.outputRate.actual, data.outputRate.remaining]
            );

            // 3. Shift Distribution Chart
            if (charts.shiftDistribution) charts.shiftDistribution.destroy();
            
            const amPercentage = data.shiftDistribution.total > 0
                ? Math.round((data.shiftDistribution.am / data.shiftDistribution.total) * 100)
                : 0;
            
            charts.shiftDistribution = createPieChart('shiftDistributionChart', {
                labels: ['AM Shift', 'PM Shift'],
                datasets: [{
                    data: [data.shiftDistribution.am, data.shiftDistribution.pm],
                    backgroundColor: ['#38bdf8', '#7dd3fc']
                }]
            }, true);
            
            // Update center label for Shift Distribution
            const shiftDistributionValue = document.getElementById('shiftDistributionValue');
            if (shiftDistributionValue) {
                shiftDistributionValue.textContent = `${amPercentage}%`;
            }
            
            updatePieLegend('shiftDistributionLegend',
                ['AM Shift', 'PM Shift'],
                ['#38bdf8', '#7dd3fc'],
                [data.shiftDistribution.am, data.shiftDistribution.pm]
            );

            // 4. Schedule Status Chart
            if (charts.scheduleStatus) charts.scheduleStatus.destroy();
            
            const plannedPercentage = data.scheduleStatus.total > 0
                ? Math.round((data.scheduleStatus.planned / data.scheduleStatus.total) * 100)
                : 0;
            
            charts.scheduleStatus = createPieChart('scheduleStatusChart', {
                labels: ['Planned', 'Change Load', 'Backlog'],
                datasets: [{
                    data: [data.scheduleStatus.planned, data.scheduleStatus.changeLoad, data.scheduleStatus.backlog],
                    backgroundColor: ['#0ea5e9', '#f59e0b', '#ef4444']
                }]
            }, true);
            
            // Update center label for Schedule Status (Planned vs others)
            const scheduleStatusValue = document.getElementById('scheduleStatusValue');
            if (scheduleStatusValue) {
                scheduleStatusValue.textContent = `${plannedPercentage}%`;
            }
            
            updatePieLegend('scheduleStatusLegend',
                ['Planned', 'Change Load', 'Backlog'],
                ['#0ea5e9', '#f59e0b', '#ef4444'],
                [data.scheduleStatus.planned, data.scheduleStatus.changeLoad, data.scheduleStatus.backlog]
            );
            
            console.log('=== PIE CHARTS LOADED SUCCESSFULLY ===');

        } catch (error) {
            console.error('Error loading pie charts:', error);
        }
    }

    function startPieChartAutoRefresh() {
        if (pieChartRefreshTimer) {
            clearInterval(pieChartRefreshTimer);
        }
        
        pieChartRefreshTimer = setInterval(() => {
            console.log('Auto-refreshing pie charts (1 min interval)...');
            loadPieCharts();
        }, PIE_CHART_REFRESH_INTERVAL);
        console.log('Pie charts auto-refresh started (1 minute interval)');
    }

    // Initialize dashboard - pie charts will be loaded after main dashboard loads
    loadDashboard();
    startAutoRefresh();
    startPieChartAutoRefresh(); // Start pie chart auto-refresh

    window.addEventListener('beforeunload', () => {
        if (refreshTimer) clearInterval(refreshTimer);
        if (pieChartRefreshTimer) clearInterval(pieChartRefreshTimer);
        cleanupAnimations();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cleanupAnimations();
        } else {
            // Silent refresh when user comes back to the tab
            loadDashboard(true);
        }
    });
});