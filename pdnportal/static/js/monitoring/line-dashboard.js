let productionChart;
let chartRefreshTimer;
let currentStatus = "Not Met";
let lastOutputValue = 0;

const TARGET_MET_THRESHOLD = 100;
const ALMOST_MET_THRESHOLD = 90;

const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

document.addEventListener('DOMContentLoaded', function() {
    addPrefilledStyles();
    
    const chartCanvas = document.getElementById('production-chart');
    if (chartCanvas) {
        initProductionChart();
    }
    
    initEventListeners();
    animateTableRows();
    highlightPrefilled();
    startChartAutoRefresh();
    checkTargetMet();
});

function initProductionChart() {
    const ctx = document.getElementById('production-chart').getContext('2d');
    
    const gradientStrokeBlue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientStrokeBlue.addColorStop(0, 'rgba(51, 102, 255, 0.8)');
    gradientStrokeBlue.addColorStop(1, 'rgba(51, 102, 255, 0.2)');
    
    const gradientStrokeRed = ctx.createLinearGradient(0, 0, 0, 400);
    gradientStrokeRed.addColorStop(0, 'rgba(244, 67, 54, 0.8)');
    gradientStrokeRed.addColorStop(1, 'rgba(244, 67, 54, 0.2)');
    
    const outputData = chartData.datasets[0].data;
    const targetData = chartData.datasets[1].data;
    const labels = chartData.labels;
    
    productionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Output',
                    data: outputData,
                    borderWidth: 4,
                    pointBackgroundColor: function(context) {
                        const index = context.dataIndex;
                        const value = outputData[index];
                        const target = targetData[index];
                        return value >= target ? 'rgba(51, 102, 255, 1)' : 'rgba(244, 67, 54, 1)';
                    },
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.3,
                    fill: true, // Enable fill under the Output line
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return 'rgba(51, 102, 255, 0.1)';
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(51, 102, 255, 0.25)');
                        gradient.addColorStop(1, 'rgba(51, 102, 255, 0.05)');
                        return gradient;
                    },
                    borderColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return 'rgba(51, 102, 255, 1)';
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(51, 102, 255, 1)');
                        gradient.addColorStop(1, 'rgba(51, 102, 255, 0.8)');
                        return gradient;
                    },
                    // Set legend color to blue
                    borderCapStyle: 'butt',
                    borderJoinStyle: 'miter',
                    segment: {
                        borderColor: 'rgba(51, 102, 255, 1)'
                    }
                },
                {
                    label: 'Target',
                    data: targetData,
                    borderColor: 'rgba(255, 193, 7, 1)',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 3,
                    borderDash: [8, 4],
                    pointBackgroundColor: 'rgba(255, 193, 7, 1)',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0,
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
            interaction: {
                intersect: false,
                mode: 'index'
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
                    cornerRadius: 8,
                    padding: 12,
                    boxPadding: 5,
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
                            return `Time: ${tooltipItems[0].label}`;
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
                    type: 'category',
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
                        maxTicksLimit: 12,
                        callback: function(value, index, values) {
                            const label = this.getLabelForValue(value);
                            if (label) {
                                const parts = label.split(':');
                                if (parts.length === 2) {
                                    const minutes = parts[1];
                                    if (minutes === '00' || index % 2 === 0) {
                                        return label;
                                    }
                                }
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
                    beginAtZero: true
                }
            },
            elements: {
                line: {
                    tension: 0.3
                },
                point: {
                    radius: 4,
                    hitRadius: 10,
                    hoverRadius: 6
                }
            }
        }
    });
}

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
        }
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
}

function updateChartData(newChartData) {
    if (productionChart && newChartData) {
        productionChart.data.labels = newChartData.labels;
        productionChart.data.datasets[0].data = newChartData.datasets[0].data;
        productionChart.data.datasets[1].data = newChartData.datasets[1].data;
        
        productionChart.update({
            duration: 600,
            easing: 'easeOutQuart'
        });
    }
}

function addDataPointToChart(quantity, target) {
    if (!productionChart) return;
    
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    
    productionChart.data.labels.push(timeLabel);
    productionChart.data.datasets[0].data.push(quantity);
    productionChart.data.datasets[1].data.push(target);
    
    if (productionChart.data.labels.length > 50) {
        productionChart.data.labels.shift();
        productionChart.data.datasets[0].data.shift();
        productionChart.data.datasets[1].data.shift();
    }
    
    productionChart.update('active');
}

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
            
            setTimeout(() => {
                const savedOperatorName = localStorage.getItem('saved_operator_name');
                const operatorInput = document.getElementById('output-operator');
                if (operatorInput && savedOperatorName && !operatorInput.value) {
                    operatorInput.value = savedOperatorName;
                    highlightPrefilled();
                }
                
                const quantityInput = document.getElementById('output-quantity');
                if (quantityInput) {
                    quantityInput.focus();
                }
            }, 100);
            
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
            e.preventDefault();
            
            const submitBtn = document.getElementById('submit-output');
            if (submitBtn) {
                submitBtn.classList.add('loading');
            }
            
            const formData = new FormData(outputForm);
            
            fetch(outputForm.action, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': csrfToken
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                }
                
                if (data.status === 'success') {
                    addOutputModal.classList.remove('active');
                    
                    const quantity = data.quantity;
                    const target = data.target;
                    const operatorName = data.operator;
                    
                    localStorage.setItem('saved_operator_name', operatorName);
                    
                    addNewTableRow(quantity, target, data.evaluation, data.operator, data.line_name, data.time_recorded);
                    addDataPointToChart(quantity, target, data.time_recorded);
                    updateStatsImmediately(quantity);
                    createToast(data.message, 'success');
                    
                    setTimeout(() => {
                        if (data.evaluation === 'Met') {
                            showTargetMetModal(quantity, target);
                        } else {
                            showTargetNotMetModal(quantity, target);
                        }
                    }, 300);
                    
                    outputForm.reset();
                    const operatorInput = outputForm.querySelector('input[name="operator"]');
                    if (operatorInput) {
                        operatorInput.value = operatorName;
                    }
                } else {
                    createToast(data.message, 'error');
                }
            })
            .catch(error => {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                }
                createToast('Failed to record output. Please try again.', 'error');
                console.error('Error:', error);
            });
        });
    }
    
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

function addPrefilledStyles() {
    if (document.getElementById('prefilled-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'prefilled-styles';
    style.textContent = `
        .JO-input.prefilled {
            animation: prefilled-glow 2s ease-in-out;
            transition: all 0.3s ease;
        }
        
        @keyframes prefilled-glow {
            0% {
                background-color: rgba(51, 102, 255, 0.1);
                border-color: rgba(51, 102, 255, 0.4);
                box-shadow: 0 0 0 3px rgba(51, 102, 255, 0.1);
            }
            50% {
                background-color: rgba(51, 102, 255, 0.05);
                border-color: rgba(51, 102, 255, 0.3);
                box-shadow: 0 0 0 2px rgba(51, 102, 255, 0.05);
            }
            100% {
                background-color: transparent;
                border-color: var(--jo-border);
                box-shadow: none;
            }
        }
        
        .operator-auto-filled::before {
            content: "✓ Auto-filled";
            position: absolute;
            top: -20px;
            left: 0;
            font-size: 0.75rem;
            color: rgba(51, 102, 255, 0.8);
            font-weight: 500;
            opacity: 0;
            animation: fade-in-out 3s ease-in-out;
        }
        
        @keyframes fade-in-out {
            0%, 100% { opacity: 0; transform: translateY(5px); }
            20%, 80% { opacity: 1; transform: translateY(0); }
        }
        
        .prefilled-field-container {
            position: relative;
        }
    `;
    document.head.appendChild(style);
}

function highlightPrefilled() {
    addPrefilledStyles();
    
    const operatorInput = document.getElementById('output-operator');
    const savedOperatorName = localStorage.getItem('saved_operator_name');
    
    if (operatorInput && (operatorInput.value || savedOperatorName)) {
        if (!operatorInput.value && savedOperatorName) {
            operatorInput.value = savedOperatorName;
        }
        
        const container = operatorInput.parentElement;
        if (container) {
            container.classList.add('operator-auto-filled');
            setTimeout(() => {
                container.classList.remove('operator-auto-filled');
            }, 3000);
        }
        
        operatorInput.classList.add('prefilled');
        setTimeout(() => {
            operatorInput.classList.remove('prefilled');
        }, 2000);
    }
}

function checkTargetMetForOutput(quantity) {
    const targetPerHour = typeof window.targetPerHour !== 'undefined' ? window.targetPerHour : 100;
    
    const percentageMet = (quantity / targetPerHour) * 100;
    
    if (percentageMet >= TARGET_MET_THRESHOLD) {
        showTargetMetModal(quantity, targetPerHour);
    } else {
        showTargetNotMetModal(quantity, targetPerHour);
    }
}

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

function showTargetMetModal(actual, target, isDaily = false) {
    const addOutputModal = document.getElementById('add-output-modal');
    if (addOutputModal) addOutputModal.classList.remove('active');
    
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
    }, 3000);
}

function showTargetNotMetModal(actual, target) {
    const addOutputModal = document.getElementById('add-output-modal');
    if (addOutputModal) addOutputModal.classList.remove('active');
    
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
    }, 3000);
}

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

function updateStatsImmediately(newQuantity) {
    const currentOutputElement = document.getElementById('current-output');
    const balanceElement = document.getElementById('balance');
    const completionBarElement = document.getElementById('completion-bar');
    const outputPercentageElements = document.querySelectorAll('#output-percentage');
    
    if (currentOutputElement) {
        const currentOutput = parseInt(currentOutputElement.textContent.replace(/,/g, '')) || 0;
        const newTotal = currentOutput + newQuantity;
        currentOutputElement.textContent = newTotal.toLocaleString();
        currentOutputElement.classList.add('highlight-animation');
        setTimeout(() => {
            currentOutputElement.classList.remove('highlight-animation');
        }, 1500);
    }
    
    if (balanceElement) {
        const currentBalance = parseInt(balanceElement.textContent.replace(/,/g, '')) || 0;
        const newBalance = Math.max(0, currentBalance - newQuantity);
        balanceElement.textContent = newBalance.toLocaleString();
        balanceElement.classList.add('highlight-animation');
        setTimeout(() => {
            balanceElement.classList.remove('highlight-animation');
        }, 1500);
    }
    
    const plannedQtyElement = document.getElementById('planned-qty');
    if (plannedQtyElement && currentOutputElement && completionBarElement) {
        const plannedQty = parseInt(plannedQtyElement.textContent.replace(/,/g, '')) || 1;
        const totalProduced = parseInt(currentOutputElement.textContent.replace(/,/g, '')) || 0;
        const completionPercentage = (totalProduced / plannedQty) * 100;
        
        completionBarElement.style.width = `${Math.min(completionPercentage, 100)}%`;
        
        outputPercentageElements.forEach(el => {
            el.textContent = `${completionPercentage.toFixed(1)}%`;
        });
    }
}

function addNewTableRow(quantity, target, evaluation, operatorName, lineName) {
    const tableBody = document.getElementById('output-log-tbody');
    if (!tableBody) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    const variance = quantity - target;
    const status = evaluation;
    
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td data-label="Time">${timeStr}</td>
        <td data-label="Operator">${operatorName}</td>
        <td data-label="Line">${lineName}</td>
        <td data-label="Output">${quantity}</td>
        <td data-label="Target">${target}</td>
        <td data-label="Variance">
            <span class="${variance >= 0 ? 'PM-positive' : 'PM-negative'}">
                ${variance >= 0 ? '+' : ''}${variance}
            </span>
        </td>
        <td data-label="Status">
            <span class="JO-status ${status === 'Met' ? 'JO-status-approved' : 'JO-status-rejected'}">
                ${status}
            </span>
        </td>
    `;
    
    newRow.style.opacity = '0';
    newRow.style.transform = 'translateY(-10px)';
    newRow.style.backgroundColor = 'rgba(51, 102, 255, 0.1)';
    
    if (tableBody.children.length === 0 || (tableBody.children.length === 1 && tableBody.children[0].querySelector('.JO-empty-table'))) {
        tableBody.innerHTML = '';
    }
    
    tableBody.insertBefore(newRow, tableBody.firstChild);
    
    setTimeout(() => {
        newRow.style.transition = 'all 0.5s ease';
        newRow.style.opacity = '1';
        newRow.style.transform = 'translateY(0)';
    }, 100);
    
    setTimeout(() => {
        newRow.style.backgroundColor = '';
    }, 2000);
    
    newRow.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(51, 102, 255, 0.05)';
        this.style.transform = 'translateX(5px)';
        this.style.boxShadow = '-3px 0 0 var(--jo-primary)';
    });
    
    newRow.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '';
        this.style.transform = '';
        this.style.boxShadow = '';
    });
}

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

function removeToast(toast) {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        toast.remove();
    }, 300);
}

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
    
    const operatorInput = document.getElementById('output-operator');
    const savedOperatorName = localStorage.getItem('saved_operator_name');
    if (operatorInput && savedOperatorName && !operatorInput.value) {
        operatorInput.value = savedOperatorName;
    }
    
    if (document.referrer && document.referrer.includes(window.location.pathname)) {
        setTimeout(() => {
            checkTargetMet();
        }, 700);
    }
});