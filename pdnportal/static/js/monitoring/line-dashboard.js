/**
 * UniSync Production Monitoring Dashboard JavaScript
 */

// Chart instance
let productionChart;

// Chart auto-refresh timer
let chartRefreshTimer;

// Status indicator related variables
let currentStatus = "Not Met";
let lastOutputValue = 0;

// Target check constants
const TARGET_MET_THRESHOLD = 100; // 100% target achievement
const ALMOST_MET_THRESHOLD = 90; // 90% target achievement

// CSRF token for AJAX requests
const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

// Document ready function
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Chart if it exists
    const chartCanvas = document.getElementById('production-chart');
    if (chartCanvas) {
        initProductionChart();
    }
    
    // Initialize Event Listeners
    initEventListeners();
    
    // Add animation to the table rows
    animateTableRows();
    
    // Highlight prefilled operator field
    highlightPrefilled();
    
    // Set up chart auto-refresh (every 60 seconds)
    startChartAutoRefresh();
    
    // Check if target is met for celebration
    checkTargetMet();
});

/**
 * Initialize and render the production chart with data from Django
 */
function initProductionChart() {
    const ctx = document.getElementById('production-chart').getContext('2d');
    
    // Create gradient for the output line - blue (target met)
    const gradientStrokeBlue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientStrokeBlue.addColorStop(0, 'rgba(51, 102, 255, 0.8)');
    gradientStrokeBlue.addColorStop(1, 'rgba(51, 102, 255, 0.2)');
    
    // Create red gradient for below target
    const gradientStrokeRed = ctx.createLinearGradient(0, 0, 0, 400);
    gradientStrokeRed.addColorStop(0, 'rgba(244, 67, 54, 0.8)');
    gradientStrokeRed.addColorStop(1, 'rgba(244, 67, 54, 0.2)');
    
    // Get shift type
    const shiftSelector = document.getElementById('shift-selector');
    const isAMShift = !shiftSelector || shiftSelector.value === 'am';
    
    // Generate hourly labels based on shift
    let hourlyLabels = [];
    if (isAMShift) {
        // AM shift: 7:00 AM to 6:00 PM
        for (let hour = 7; hour <= 18; hour++) {
            const formattedHour = hour > 12 ? (hour - 12) + ':00 PM' : hour + ':00 AM';
            hourlyLabels.push(formattedHour);
        }
    } else {
        // PM shift: 7:00 PM to 6:00 AM (next day)
        for (let hour = 19; hour <= 24; hour++) {
            hourlyLabels.push((hour - 12) + ':00 PM');
        }
        for (let hour = 1; hour <= 6; hour++) {
            hourlyLabels.push(hour + ':00 AM');
        }
    }
    
    // Get the target line data from chartData
    const targetLineData = chartData.datasets[1].data;
    
    // Compare each output data point with the target and set color
    const outputData = chartData.datasets[0].data;
    
    // Create 30 min interval labels
    let thirtyMinLabels = [];
    
    // Convert hourly labels to 30-min intervals
    hourlyLabels.forEach(hour => {
        const timeParts = hour.split(':');
        const hourNum = parseInt(timeParts[0], 10);
        const ampm = hour.includes('AM') ? 'AM' : 'PM';
        
        // Create 30 min intervals
        thirtyMinLabels.push(`${hourNum}:00 ${ampm}`);
        thirtyMinLabels.push(`${hourNum}:30 ${ampm}`);
    });
    
    // Duplicate the data for 30-min intervals (interpolate)
    let interpolatedOutputData = [];
    let interpolatedTargetData = [];
    
    for (let i = 0; i < outputData.length; i++) {
        // Get current and next data point
        const currentOutput = outputData[i];
        const nextOutput = outputData[i + 1] !== undefined ? outputData[i + 1] : currentOutput;
        
        const currentTarget = targetLineData[i];
        const nextTarget = targetLineData[i + 1] !== undefined ? targetLineData[i + 1] : currentTarget;
        
        // Add original hour data
        interpolatedOutputData.push(currentOutput);
        interpolatedTargetData.push(currentTarget);
        
        // Add interpolated 30-min data (midpoint between this hour and next)
        const midOutputValue = Math.round((currentOutput + nextOutput) / 2);
        const midTargetValue = Math.round((currentTarget + nextTarget) / 2);
        
        interpolatedOutputData.push(midOutputValue);
        interpolatedTargetData.push(midTargetValue);
    }
    
    // Remove extra interpolated point at the end if needed
    if (interpolatedOutputData.length > thirtyMinLabels.length) {
        interpolatedOutputData.pop();
        interpolatedTargetData.pop();
    }
    
    // Initialize chart with 3D-like effect
    productionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: thirtyMinLabels,
            datasets: [
                {
                    label: 'Output',
                    data: interpolatedOutputData,
                    borderWidth: 5,
                    pointBackgroundColor: function(context) {
                        const index = context.dataIndex;
                        const value = interpolatedOutputData[index];
                        const target = interpolatedTargetData[index];
                        return value >= target ? 'rgba(51, 102, 255, 1)' : 'rgba(244, 67, 54, 1)';
                    },
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        
                        if (!chartArea) {
                            return null;
                        }
                        
                        let index = context.dataIndex;
                        
                        if (index === undefined) {
                            index = 0;
                            
                            if (context.p0 && context.p0.parsed) {
                                const x = context.p0.parsed.x;
                                
                                for (let i = 0; i < chart.getDatasetMeta(context.datasetIndex).data.length; i++) {
                                    if (chart.getDatasetMeta(context.datasetIndex).data[i].x >= x) {
                                        index = i;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        const value = interpolatedOutputData[index] || 0;
                        const target = interpolatedTargetData[index] || 0;
                        
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        
                        if (value >= target) {
                            gradient.addColorStop(0, 'rgba(51, 102, 255, 0.1)');
                            gradient.addColorStop(1, 'rgba(51, 102, 255, 0.5)');
                            return gradient;
                        } else {
                            gradient.addColorStop(0, 'rgba(51, 102, 255, 0.1)');
                            gradient.addColorStop(1, 'rgba(51, 102, 255, 0.5)');
                            return gradient;
                        }
                    },
                    borderColor: function(context) {
                        const index = context.dataIndex;
                        if (index === undefined) return 'rgba(51, 102, 255, 1)';
                        
                        const value = interpolatedOutputData[index];
                        const target = interpolatedTargetData[index];
                        return value >= target ? 'rgba(51, 102, 255, 1)' : 'rgba(244, 67, 54, 1)';
                    },
                    segment: {
                        borderColor: function(ctx) {
                            const index = ctx.p0DataIndex;
                            if (
                                (index < interpolatedOutputData.length && interpolatedOutputData[index] < interpolatedTargetData[index]) ||
                                (index + 1 < interpolatedOutputData.length && interpolatedOutputData[index + 1] < interpolatedTargetData[index + 1])
                            ) {
                                return 'rgba(244, 67, 54, 1)'; // Red
                            }
                            return 'rgba(51, 102, 255, 1)'; // Blue
                        },
                        borderWidth: 5
                    }
                },
                {
                    label: 'Target',
                    data: interpolatedTargetData,
                    borderColor: 'rgba(255, 193, 7, 1)',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    pointBackgroundColor: 'rgba(255, 193, 7, 1)',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuad'
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        padding: 15,
                        font: {
                            family: 'Poppins',
                            size: 11
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
                    boxPadding: 4,
                    titleFont: {
                        family: 'Poppins',
                        size: 13,
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Poppins',
                        size: 12
                    },
                    displayColors: true,
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y + ' units';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        display: true,
                        drawBorder: true
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Poppins',
                            size: 10
                        },
                        padding: 8,
                        callback: function(value, index, values) {
                            // Only display labels for full hours (skip 30-min labels)
                            const label = thirtyMinLabels[index];
                            if (label && label.includes(':00')) {
                                return label;
                            }
                            return '';
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        display: true,
                        drawBorder: true
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Poppins',
                            size: 10
                        },
                        padding: 8,
                        callback: function(value) {
                            return value;
                        }
                    },
                    suggestedMin: 0,
                    suggestedMax: 90
                }
            },
            elements: {
                line: {
                    tension: 0.3
                },
                point: {
                    radius: 3,
                    hitRadius: 8,
                    hoverRadius: 5
                }
            }
        }
    });
}

/**
 * Start auto-refresh timer for the chart (60 seconds)
 */
function startChartAutoRefresh() {
    if (chartRefreshTimer) {
        clearInterval(chartRefreshTimer);
    }
    
    chartRefreshTimer = setInterval(function() {
        if (productionChart) {
            fetchLatestData();
        }
    }, 60000);
}

/**
 * Fetch latest production data from the server
 */
function fetchLatestData() {
    fetch(window.location.href, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updateChartData(data.chart_data);
            updateStats(data.total_produced, data.completion_percentage, data.balance);
            createToast('Dashboard data refreshed', 'info');
        }
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
}

/**
 * Update chart with new data
 */
function updateChartData(newChartData) {
    if (productionChart) {
        // Generate date labels for x-axis
        productionChart.data.labels = dateLabels;
        
        // Extract data for color setting
        const outputData = newChartData.datasets[0].data;
        const targetData = newChartData.datasets[1].data;
        
        // Update datasets
        productionChart.data.datasets[0].data = outputData;
        productionChart.data.datasets[1].data = targetData;
        
        // Update y-axis max value
        productionChart.options.scales.y.suggestedMax = 100;
        
        // Re-render the chart with animation
        productionChart.update({
            duration: 800,
            easing: 'easeOutQuad'
        });
    }
}

/**
 * Update stats display with new data
 */
function updateStats(totalProduced, completionPercentage, balance) {
    const currentOutputElement = document.getElementById('current-output');
    if (currentOutputElement) {
        currentOutputElement.textContent = totalProduced.toLocaleString();
        currentOutputElement.classList.add('highlight-animation');
        setTimeout(() => {
            currentOutputElement.classList.remove('highlight-animation');
        }, 1500);
    }
    
    const percentageElement = document.getElementById('output-percentage');
    if (percentageElement) {
        percentageElement.textContent = `${completionPercentage.toFixed(1)}`;
    }
    
    const completionBar = document.getElementById('completion-bar');
    if (completionBar) {
        completionBar.style.width = `${Math.min(completionPercentage, 100)}%`;
    }
    
    const balanceElement = document.getElementById('balance');
    if (balanceElement) {
        balanceElement.textContent = balance.toLocaleString();
        balanceElement.classList.add('highlight-animation');
        setTimeout(() => {
            balanceElement.classList.remove('highlight-animation');
        }, 1500);
    }
    
    checkTargetMet();
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    const addOutputBtn = document.getElementById('add-output-btn');
    const addOutputModal = document.getElementById('add-output-modal');
    const modalClose = document.querySelector('#add-output-modal .JO-modal-close');
    const cancelBtn = document.getElementById('cancel-output');
    const outputForm = document.querySelector('#add-output-modal form');
    const refreshBtn = document.querySelector('.PM-refresh-btn');
    const shiftSelector = document.getElementById('shift-selector');
    
    if (addOutputBtn && addOutputModal) {
        addOutputBtn.addEventListener('click', function() {
            addOutputModal.classList.add('active');
            
            this.classList.add('clicked');
            setTimeout(() => {
                this.classList.remove('clicked');
            }, 300);
        });
    }
    
    if (modalClose && addOutputModal) {
        modalClose.addEventListener('click', function() {
            addOutputModal.classList.remove('active');
        });
    }
    
    if (cancelBtn && addOutputModal) {
        cancelBtn.addEventListener('click', function() {
            addOutputModal.classList.remove('active');
        });
    }
    
    if (outputForm) {
        outputForm.addEventListener('submit', function(e) {
            const quantityField = document.getElementById('output-quantity');
            if (!quantityField) return true;
            
            const quantity = parseInt(quantityField.value, 10);
            if (isNaN(quantity) || quantity <= 0) return true;
            
            localStorage.setItem('last_output_quantity', quantity);
            localStorage.setItem('last_output_timestamp', new Date().getTime());
            localStorage.setItem('show_target_modal', 'true');
            
            const submitBtn = document.getElementById('submit-output');
            if (submitBtn) {
                submitBtn.classList.add('loading');
            }
            
            return true;
        });
    }
    
    document.addEventListener('click', function(e) {
        if (e.target.id === 'submit-output' || e.target.closest('#submit-output')) {
            const btn = e.target.id === 'submit-output' ? e.target : e.target.closest('#submit-output');
            
            btn.classList.add('loading');
            setTimeout(() => {
                btn.classList.remove('loading');
            }, 1000);
        }
    });
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.querySelector('i').style.animation = 'none';
            setTimeout(() => {
                this.querySelector('i').style.animation = 'PM-rotate 1s linear';
            }, 10);
            
            fetchLatestData();
        });
    }
    
    if (shiftSelector) {
        shiftSelector.addEventListener('change', function() {
            if (productionChart) {
                productionChart.destroy();
                initProductionChart();
            }
        });
    }
    
    const statCards = document.querySelectorAll('.PM-stat-card');
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.PM-stat-icon i');
            if (icon) {
                icon.style.animation = 'PM-pulse 0.5s ease';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.PM-stat-icon i');
            if (icon) {
                icon.style.animation = 'none';
            }
        });
    });
    
    const celebrationModal = document.getElementById('target-met-modal');
    if (celebrationModal) {
        const closeButton = celebrationModal.querySelector('.JO-modal-close');
        const continueButton = document.getElementById('celebration-continue');
        
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                celebrationModal.classList.remove('active');
                stopConfetti();
            });
        }
        
        if (continueButton) {
            continueButton.addEventListener('click', function() {
                celebrationModal.classList.remove('active');
                stopConfetti();
            });
        }
    }
    
    const feedbackModal = document.getElementById('target-not-met-modal');
    if (feedbackModal) {
        const closeButton = feedbackModal.querySelector('.JO-modal-close');
        const continueButton = document.getElementById('feedback-continue');
        
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                feedbackModal.classList.remove('active');
            });
        }
        
        if (continueButton) {
            continueButton.addEventListener('click', function() {
                feedbackModal.classList.remove('active');
            });
        }
    }
    
    const tableRows = document.querySelectorAll('#output-log-tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'rgba(51, 102, 255, 0.05)';
            this.style.transform = 'translateX(5px)';
            this.style.boxShadow = '-3px 0 0 var(--jo-primary)';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
            this.style.transform = '';
            this.style.boxShadow = '';
        });
    });
    
    const searchInput = document.querySelector('.JO-search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('#output-log-tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
}

/**
 * Highlight prefilled operator input
 */
function highlightPrefilled() {
    const operatorInput = document.getElementById('output-operator');
    if (operatorInput && operatorInput.value) {
        operatorInput.classList.add('prefilled');
        setTimeout(() => {
            operatorInput.classList.remove('prefilled');
        }, 1500);
    }
}

/**
 * Check if target is met for output and show celebration modal
 */
function checkTargetMetForOutput(quantity) {
    const targetPerHour = typeof window.targetPerHour !== 'undefined' ? window.targetPerHour : 100;
    
    const percentageMet = (quantity / targetPerHour) * 100;
    
    if (percentageMet >= TARGET_MET_THRESHOLD) {
        showTargetMetModal(quantity, targetPerHour);
    } else {
        showTargetNotMetModal(quantity, targetPerHour);
    }
}

/**
 * Check if recent output submission and show appropriate modal
 */
function checkTargetMet() {
    const showTargetModal = localStorage.getItem('show_target_modal');
    
    if (showTargetModal === 'true') {
        const lastOutputQuantity = parseInt(localStorage.getItem('last_output_quantity'), 10);
        const lastOutputTimestamp = parseInt(localStorage.getItem('last_output_timestamp'), 10);
        const currentTime = new Date().getTime();
        
        if (!isNaN(lastOutputQuantity) && !isNaN(lastOutputTimestamp) && 
            (currentTime - lastOutputTimestamp < 5000)) {
            
            localStorage.removeItem('show_target_modal');
            localStorage.removeItem('last_output_quantity');
            localStorage.removeItem('last_output_timestamp');
            
            let targetPerHour = 0;
            
            if (typeof window.targetPerHour !== 'undefined' && !isNaN(window.targetPerHour)) {
                targetPerHour = window.targetPerHour;
            } else {
                const targetElement = document.getElementById('target-per-hour');
                if (targetElement && !isNaN(parseInt(targetElement.textContent, 10))) {
                    targetPerHour = parseInt(targetElement.textContent, 10);
                }
                
                if (targetPerHour === 0) {
                    const targetCell = document.querySelector('#output-log-tbody tr:first-child td[data-label="Target"]');
                    if (targetCell && !isNaN(parseInt(targetCell.textContent, 10))) {
                        targetPerHour = parseInt(targetCell.textContent, 10);
                    }
                }
                
                if (targetPerHour === 0) {
                    targetPerHour = 100;
                }
            }
            
            lastOutputValue = lastOutputQuantity;
            
            updateStatusIndicator(lastOutputQuantity, targetPerHour);
            
            if (lastOutputQuantity >= targetPerHour) {
                showTargetMetModal(lastOutputQuantity, targetPerHour);
                currentStatus = "Met";
            } else {
                showTargetNotMetModal(lastOutputQuantity, targetPerHour);
                currentStatus = "Not Met";
            }
        }
    }
    
    if (typeof currentOutput !== 'undefined' && typeof plannedQty !== 'undefined') {
        if (currentOutput >= plannedQty && plannedQty > 0) {
            const dailyCelebrationShown = localStorage.getItem('dailyCelebrationShown-' + new Date().toDateString());
            if (!dailyCelebrationShown) {
                setTimeout(() => {
                    showTargetMetModal(currentOutput, plannedQty, true);
                    localStorage.setItem('dailyCelebrationShown-' + new Date().toDateString(), 'true');
                }, 2000);
            }
        }
    }
}

/**
 * Update the status indicator in the chart area
 */
function updateStatusIndicator(outputValue, targetValue) {
    const statusIndicator = document.querySelector('.PM-status-indicator');
    const statusIcon = statusIndicator?.querySelector('i');
    const statusText = document.getElementById('status-text');
    
    if (!statusIndicator) return;
    
    statusIcon?.classList.remove('fa-check-circle', 'fa-times-circle', 'fa-exclamation-circle', 'fa-question-circle');
    statusIndicator.classList.remove('met', 'not-met', 'almost');
    
    if (outputValue >= targetValue) {
        statusIcon?.classList.add('fa-check-circle');
        statusIndicator.classList.add('met');
        if (statusText) statusText.textContent = 'Target Met';
    } else if (outputValue >= targetValue * 0.9) {
        statusIcon?.classList.add('fa-exclamation-circle');
        statusIndicator.classList.add('almost');
        if (statusText) statusText.textContent = 'Almost Met';
    } else {
        statusIcon?.classList.add('fa-times-circle');
        statusIndicator.classList.add('not-met');
        if (statusText) statusText.textContent = 'Target Not Met';
    }
    
    statusIndicator.style.animation = 'none';
    setTimeout(() => {
        statusIndicator.style.animation = 'PM-bounce 2s infinite ease-in-out';
    }, 10);
}

/**
 * Show the target met celebration modal
 */
function showTargetMetModal(actual, target, isDaily = false) {
    const targetMetModal = document.getElementById('target-met-modal');
    if (!targetMetModal) return;
    
    const targetElement = document.getElementById('celebration-target');
    const actualElement = document.getElementById('celebration-actual');
    const varianceElement = document.getElementById('celebration-variance');
    
    if (targetElement) targetElement.textContent = target.toLocaleString();
    if (actualElement) actualElement.textContent = actual.toLocaleString();
    
    const variance = actual - target;
    if (varianceElement) {
        varianceElement.textContent = (variance >= 0 ? '+' : '') + variance.toLocaleString();
        varianceElement.className = variance >= 0 ? 'PM-stat-value PM-positive' : 'PM-stat-value PM-negative';
    }
    
    if (isDaily) {
        const title = targetMetModal.querySelector('.JO-modal-header h2');
        const message = targetMetModal.querySelector('.PM-celebration-message');
        
        if (title) title.innerHTML = 'Daily Target Met! 🎉🎉🎉';
        if (message) message.innerHTML = 'Congratulations! You\'ve achieved your daily production target!';
    }
    
    setTimeout(() => {
        targetMetModal.classList.add('active');
        
        const icon = targetMetModal.querySelector('.PM-celebration-icon');
        if (icon) {
            icon.style.animation = 'none';
            setTimeout(() => {
                icon.style.animation = 'PM-float 3s ease-in-out infinite, PM-scale-bounce 2s ease-in-out infinite';
            }, 10);
        }
        
        startConfetti();
        
        createToast('Target met! Great job!', 'success');
    }, 300);
    
    setTimeout(() => {
        if (targetMetModal.classList.contains('active')) {
            targetMetModal.classList.remove('active');
            stopConfetti();
        }
    }, 8000);
}

/**
 * Show the target not met feedback modal
 */
function showTargetNotMetModal(actual, target) {
    const targetNotMetModal = document.getElementById('target-not-met-modal');
    if (!targetNotMetModal) return;
    
    const targetElement = document.getElementById('feedback-target');
    const actualElement = document.getElementById('feedback-actual');
    const varianceElement = document.getElementById('feedback-variance');
    
    if (targetElement) targetElement.textContent = target.toLocaleString();
    if (actualElement) actualElement.textContent = actual.toLocaleString();
    
    const variance = actual - target;
    if (varianceElement) {
        varianceElement.textContent = variance.toLocaleString();
        varianceElement.classList.add('PM-negative');
    }
    
    setTimeout(() => {
        targetNotMetModal.classList.add('active');
        
        const icon = targetNotMetModal.querySelector('.PM-feedback-icon');
        if (icon) {
            icon.style.animation = 'none';
            setTimeout(() => {
                icon.style.animation = 'PM-shake 3s ease-in-out infinite';
            }, 10);
        }
        
        createToast('Target not met. Let\'s focus on improvement!', 'warning');
    }, 300);
    
    setTimeout(() => {
        if (targetNotMetModal.classList.contains('active')) {
            targetNotMetModal.classList.remove('active');
        }
    }, 8000);
}

/**
 * Start confetti animation
 */
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const particles = [];
    const colors = ['#3366ff', '#48c774', '#ffc107', '#f14668', '#209cee'];
    const maxParticles = 150;
    
    for (let i = 0; i < maxParticles; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 2,
            d: Math.random() * maxParticles,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngleIncrement: Math.random() * 0.07 + 0.05,
            tiltAngle: 0
        });
    }
    
    let animationFrame;
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            ctx.beginPath();
            ctx.lineWidth = particle.r / 2;
            ctx.strokeStyle = particle.color;
            ctx.moveTo(particle.x + particle.tilt + (particle.r / 4), particle.y);
            ctx.lineTo(particle.x + particle.tilt, particle.y + particle.tilt + (particle.r / 4));
            ctx.stroke();
            
            particle.tiltAngle += particle.tiltAngleIncrement;
            particle.y += (Math.cos(particle.d) + 1 + particle.r / 2) / 2;
            particle.x += Math.sin(particle.d) * 2;
            particle.tilt = Math.sin(particle.tiltAngle) * 15;
            
            if (particle.y > canvas.height) {
                if (Math.random() < 0.6) {
                    particle.x = Math.random() * canvas.width;
                    particle.y = -10;
                    particle.tilt = Math.floor(Math.random() * 10) - 10;
                } else {
                    particles[particles.indexOf(particle)] = {
                        x: Math.random() * canvas.width,
                        y: -10,
                        r: particle.r,
                        d: particle.d,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        tilt: Math.floor(Math.random() * 10) - 10,
                        tiltAngle: 0,
                        tiltAngleIncrement: particle.tiltAngleIncrement
                    };
                }
            }
        });
        
        animationFrame = requestAnimationFrame(draw);
    }
    
    draw();
    
    window.confettiAnimation = animationFrame;
}

/**
 * Stop confetti animation
 */
function stopConfetti() {
    if (window.confettiAnimation) {
        cancelAnimationFrame(window.confettiAnimation);
        
        const canvas = document.getElementById('confetti-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

/**
 * Reverse the order of logs to show newest first
 */
function reverseTableRows() {
    const logsTable = document.getElementById('output-log-tbody');
    if (!logsTable) return;
    
    const rows = Array.from(logsTable.querySelectorAll('tr'));
    
    if (rows.length <= 1) return;
    
    rows.reverse();
    
    while (logsTable.firstChild) {
        logsTable.removeChild(logsTable.firstChild);
    }
    
    rows.forEach(row => {
        logsTable.appendChild(row);
    });
}

/**
 * Animate table rows on load
 */
function animateTableRows() {
    reverseTableRows();
    
    const rows = document.querySelectorAll('#output-log-tbody tr');
    
    rows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            row.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, 100 + (index * 50));
    });
}

/**
 * Create and display toast notifications
 */
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
    
    toast.style.animation = 'slideInRight 0.3s ease, fadeOut 0.3s ease ' + (duration - 300) + 'ms forwards';
    
    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

/**
 * Remove toast notification
 */
function removeToast(toast) {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// Initialize on window load
window.addEventListener('load', function() {
    const loadingElements = document.querySelectorAll('.JO-loading');
    loadingElements.forEach(el => {
        el.style.display = 'none';
    });
    
    if (typeof targetPerHour !== 'undefined') {
        window.targetPerHour = targetPerHour;
    }
    
    if (typeof window.targetPerHour === 'undefined') {
        try {
            const scriptTags = document.querySelectorAll('script');
            scriptTags.forEach(script => {
                if (script.textContent.includes('targetPerHour')) {
                    const match = script.textContent.match(/targetPerHour\s*=\s*(\d+)/);
                    if (match && match[1]) {
                        window.targetPerHour = parseInt(match[1], 10);
                        
                        const hiddenTarget = document.getElementById('target-per-hour');
                        if (hiddenTarget) {
                            hiddenTarget.textContent = window.targetPerHour;
                        }
                    }
                }
            });
        } catch (e) {
            console.error("Error extracting targetPerHour:", e);
        }
    }
    
    const targetElement = document.getElementById('target-per-hour');
    if (!targetElement) {
        const hiddenTarget = document.createElement('div');
        hiddenTarget.id = 'target-per-hour';
        hiddenTarget.className = 'hidden-info';
        hiddenTarget.textContent = window.targetPerHour || '';
        document.body.appendChild(hiddenTarget);
    }
    
    if (document.referrer && document.referrer.includes(window.location.pathname)) {
        setTimeout(() => {
            checkTargetMet();
        }, 700);
    }
});