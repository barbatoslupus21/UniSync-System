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
        statusDistribution: null
    };

    let currentData = null;
    const REFRESH_INTERVAL = 5 * 60 * 1000;
    let refreshTimer;
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
    });

    specificDate.addEventListener('change', function() {
        if (dateFilter.value === 'customDate') {
            loadDashboard();
        }
    });

    shiftFilter.addEventListener('change', loadDashboard);

    refreshBtn.addEventListener('click', function() {
        this.style.animation = 'none';
        setTimeout(() => {
            this.style.animation = '';
        }, 10);
        loadDashboard();
        showToast('Dashboard refreshed successfully', 'success');
    });

    exportBtn.addEventListener('click', exportSchedules);

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('.gd-table-body .gd-table-row');
        
        rows.forEach((row, index) => {
            const text = row.textContent.toLowerCase();
            const shouldShow = text.includes(searchTerm);
            
            if (shouldShow) {
                row.style.display = '';
                row.style.animationDelay = `${index * 0.05}s`;
                row.classList.add('fade-in');
            } else {
                row.style.display = 'none';
                row.classList.remove('fade-in');
            }
        });
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

    async function loadDashboard() {
        showLoading();

        try {
            const data = await fetchDashboardData();
            currentData = data;

            if (!data || Object.keys(data).length === 0) {
                showEmptyState();
                hideLoading();
                return;
            }

            updateMetrics(data);
            updateCharts(data);
            updateScheduleList(data.schedules || []);
            hideLoading();
        } catch (error) {
            hideLoading();
            showToast('Error loading dashboard', 'error');
        }
    }

    function updateMetrics(data) {
        animateMetricValue(document.getElementById('totalSchedules'), data.totalSchedules || 0);
        document.getElementById('totalSchedulesTarget').textContent = data.totalSchedulesTarget || 0;
        
        const schedulesProgress = document.getElementById('schedulesProgress');
        const schedulesPercent = data.totalSchedulesTarget > 0 
            ? (data.totalSchedules / data.totalSchedulesTarget) * 100 
            : 0;
        
        setTimeout(() => {
            schedulesProgress.style.width = `${Math.min(schedulesPercent, 100)}%`;
        }, 200);

        animateMetricValue(document.getElementById('productionProgress'), data.productionProgress || 0);
        
        const productionIndicator = document.getElementById('productionIndicator');
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

        animateMetricValue(document.getElementById('notMetTarget'), data.notMetTarget || 0);
        
        document.getElementById('totalProduction').textContent = (data.totalProduced || 0).toLocaleString();
        document.getElementById('totalPlanned').textContent = (data.totalPlanned || 0).toLocaleString();

        animateMetricValue(document.getElementById('activeLines'), data.activeLines || 0);
        document.getElementById('totalLines').textContent = data.totalLines || 0;
        
        const linesBadge = document.getElementById('linesBadge');
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

    function updateCharts(data) {
        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });

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
            const ctx = document.getElementById('outputPerDayChart').getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 350);
            gradient.addColorStop(0, 'rgba(14, 165, 233, 0.8)');
            gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.6)');
            gradient.addColorStop(1, 'rgba(125, 211, 252, 0.4)');
            
            const borderGradient = ctx.createLinearGradient(0, 0, 0, 350);
            borderGradient.addColorStop(0, '#0ea5e9');
            borderGradient.addColorStop(1, '#0369a1');
            
            charts.outputPerDay = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.xLabels || data.outputPerDay.map(item => item.date),
                    datasets: [{
                        data: data.outputPerDay.map(item => item.quantity),
                        backgroundColor: gradient,
                        borderColor: borderGradient,
                        borderWidth: 2,
                        borderRadius: 12,
                        borderSkipped: false,
                        maxBarThickness: 60
                    }]
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
                                padding: 10
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
                    }
                }
            });
        }

        if (data.efficiencyData && data.efficiencyData.length > 0) {
            const avgEfficiency = data.efficiencyData.reduce((sum, item) => sum + item.efficiency, 0) / data.efficiencyData.length;
            document.getElementById('avgEfficiency').textContent = `${Math.round(avgEfficiency)}%`;

            const ctx = document.getElementById('efficiencyChart').getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 350);
            gradient.addColorStop(0, 'rgba(14, 165, 233, 0.6)');
            gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
            gradient.addColorStop(1, 'rgba(125, 211, 252, 0.2)');

            const borderGradient = ctx.createLinearGradient(0, 0, 0, 350);
            borderGradient.addColorStop(0, '#0ea5e9');
            borderGradient.addColorStop(1, '#0369a1');

            charts.efficiency = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.xLabels || data.efficiencyData.map(item => item.date),
                    datasets: [{
                        data: data.efficiencyData.map(item => item.efficiency),
                        borderColor: borderGradient,
                        backgroundColor: gradient,
                        borderWidth: 4,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 6,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#0ea5e9',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3,
                        pointHoverBorderWidth: 4
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
                    }
                }
            });
        }

        if (data.outputByLine && data.outputByLine.length > 0) {
            const ctx = document.getElementById('outputByLineChart').getContext('2d');
            const colors = [
                'rgba(14, 165, 233, 0.8)', 'rgba(56, 189, 248, 0.8)', 'rgba(125, 211, 252, 0.8)',
                'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)',
                'rgba(6, 182, 212, 0.8)', 'rgba(249, 115, 22, 0.8)', 'rgba(236, 72, 153, 0.8)',
                'rgba(132, 204, 22, 0.8)'
            ];

            const borderColors = [
                '#0ea5e9', '#38bdf8', '#7dd3fc', '#10b981', '#f59e0b',
                '#ef4444', '#06b6d4', '#f97316', '#ec4899', '#84cc16'
            ];

            charts.outputByLine = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.outputByLine.map(item => item.line),
                    datasets: [{
                        data: data.outputByLine.map(item => item.quantity),
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
                            grid: {
                                color: 'rgba(15, 23, 42, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                font: { size: 11, weight: '500' },
                                color: '#64748b',
                                padding: 10
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
                    }
                }
            });
        }

        if (data.shiftOutput && data.shiftOutput.length > 0) {
            const total = data.shiftOutput.reduce((sum, item) => sum + item.quantity, 0);
            document.getElementById('shiftTotal').textContent = total.toLocaleString();

            const ctx = document.getElementById('shiftOutputChart').getContext('2d');
            
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

        if (data.statusDistribution && data.statusDistribution.length > 0) {
            const ctx = document.getElementById('statusDistributionChart').getContext('2d');
            
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

    function updateScheduleList(schedules) {
        const scheduleListBody = document.getElementById('scheduleListBody');
        scheduleListBody.innerHTML = '';

        if (!schedules || schedules.length === 0) {
            scheduleListBody.innerHTML = `
                <div class="gd-empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No Schedules Found</h3>
                    <p>There are no schedules for the selected period.</p>
                </div>
            `;
            return;
        }

        schedules.forEach((schedule, index) => {
            const row = document.createElement('div');
            row.className = 'gd-table-row';
            row.style.animationDelay = `${index * 0.05}s`;

            let progressClass = 'low';
            if (schedule.progress >= 80) progressClass = 'high';
            else if (schedule.progress >= 50) progressClass = 'medium';

            let statusClass = 'planned';
            if (schedule.status === 'Change Load') statusClass = 'change-load';
            else if (schedule.status === 'Backlog') statusClass = 'backlog';

            row.innerHTML = `
                <div class="gd-table-cell" data-label="Date">${schedule.date}</div>
                <div class="gd-table-cell" data-label="Product">${schedule.product}</div>
                <div class="gd-table-cell" data-label="Line">${schedule.line}</div>
                <div class="gd-table-cell" data-label="Shift">${schedule.shift}</div>
                <div class="gd-table-cell" data-label="Planned">${schedule.plannedQty.toLocaleString()}</div>
                <div class="gd-table-cell" data-label="Produced">${schedule.producedQty.toLocaleString()}</div>
                <div class="gd-table-cell" data-label="Progress">
                    <div class="gd-progress-cell">
                        <div class="gd-progress-mini">
                            <div class="gd-progress-mini-fill ${progressClass}" style="width: ${Math.min(schedule.progress, 100)}%"></div>
                        </div>
                        <span class="gd-progress-text">${schedule.progress.toFixed(0)}%</span>
                    </div>
                </div>
                <div class="gd-table-cell" data-label="Status">
                    <span class="gd-status-badge ${statusClass}">${schedule.status}</span>
                </div>
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
            <div class="gd-empty-state">
                <i class="fas fa-chart-bar"></i>
                <h3>No Data Available</h3>
                <p>There is no data for the selected time period. Try selecting a different date range.</p>
            </div>
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
            loadDashboard();
        }, REFRESH_INTERVAL);
    }

    function cleanupAnimations() {
        animationFrames.forEach(frame => cancelAnimationFrame(frame));
        animationFrames = [];
    }

    loadDashboard();
    startAutoRefresh();

    window.addEventListener('beforeunload', () => {
        if (refreshTimer) clearInterval(refreshTimer);
        cleanupAnimations();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cleanupAnimations();
        } else {
            loadDashboard();
        }
    });
});