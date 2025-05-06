
// Constants and global variables
const STATS_REFRESH_INTERVAL = 5 * 60 * 1000;
const TIMELINE_REFRESH_INTERVAL = 2 * 60 * 1000;
const DEADLINES_REFRESH_INTERVAL = 5 * 60 * 1000;
const ALERTS_REFRESH_INTERVAL = 5 * 60 * 1000;
let statsRefreshInterval = null;
let timelineRefreshInterval = null;
let currentTimelineView = 'timeline-week';
let deadlinesRefreshInterval = null;
let currentDeadlineFilter = 'all';
let alertsRefreshInterval = null;
let alertFilters = {
    overdue: true,
    highPriority: true,
    resource: true
};

document.addEventListener('DOMContentLoaded', function() {
    animateStatsCards();
    refreshStats();
    startStatsRefresh();

    // Statistics Cards
    const weekView = document.getElementById('timeline-week-view');
    const todayView = document.getElementById('timeline-today-view');
    const monthView = document.getElementById('timeline-month-view');
    
    if (weekView) weekView.style.display = 'block';
    if (todayView) todayView.style.display = 'none';
    if (monthView) monthView.style.display = 'none';
    
    const weekBtn = document.getElementById('timeline-week-btn');
    if (weekBtn) weekBtn.classList.add('active');
    
    // Job Order Timeline
    const timelineViewIndicator = document.getElementById('timeline-view-indicator');
    if (timelineViewIndicator) timelineViewIndicator.textContent = 'This Week';
    
    initializeTimelineEvents();
    directUpdateTimeline();
    animateTimelineItems(currentTimelineView + '-view');
    startTimelineRefresh();

    // Upcoming Deadlines
    initializeDeadlines();
    refreshDeadlines();
    startDeadlinesRefresh();

    // Critical Alerts
    initializeAlerts();
    refreshAlerts();
    startAlertsRefresh();
});

function startStatsRefresh() {
    clearStatsRefresh();
    statsRefreshInterval = setInterval(refreshStats, STATS_REFRESH_INTERVAL);
}

function clearStatsRefresh() {
    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
        statsRefreshInterval = null;
    }
}

function refreshStats() {
    fetch('/joborder/api/job-order/stats/', {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            updateStatsCards(data);
        } else {
            console.error('Error in stats data:', data.message);
        }
    })
    .catch(error => {
        console.error('Error refreshing statistics:', error);
    });
}

/**
 * Updates the statistics cards with the new data
 * @param {Object} data - The statistics data from the API
 */
function updateStatsCards(data) {
    // Update active job orders
    updateStatCard('JO-total-jobs', data.active_jo_count, data.active_jo_percentage);
    
    // Update completion rate
    updateStatCard('JO-completion-rate', data.completion_rate + '%', data.completion_rate_change);
    
    // Update resolution time
    updateStatCard('JO-resolution-time', data.avg_resolution_time + 'd', data.resolution_time_change, data.resolution_time_improved);
    
    // Update overdue tasks
    updateStatCard('JO-overdue-tasks', data.overdue_tasks, data.overdue_tasks_change, data.overdue_tasks_reduced);
    
    // Show a subtle pulse animation on all cards
    pulseStatsCards();
    
    // Update last refresh timestamp if the element exists
    const lastUpdatedElement = document.getElementById('stats-last-updated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Last updated: ${data.last_updated}`;
    }
    
    console.log('KPI Stats updated at', new Date().toLocaleTimeString());
}

/**
 * Updates a single statistics card with new values
 * @param {string} cardClass - The class name of the card to update
 * @param {string|number} value - The new value for the statistic
 * @param {number} change - The percentage change
 * @param {boolean} isImproved - Whether the change is an improvement (for determining arrow direction)
 */
function updateStatCard(cardClass, value, change, isImproved = null) {
    const card = document.querySelector(`.${cardClass}`);
    if (!card) return;
    
    // Update the main statistic value
    const numberElement = card.querySelector('.JO-stats-number');
    if (numberElement) {
        // Animate the change if the values are different
        if (numberElement.textContent !== String(value)) {
            animateNumberChange(numberElement, numberElement.textContent, String(value));
        }
    }
    
    // Update the percentage change indicator
    const percentageElement = card.querySelector('.up, .down');
    if (percentageElement && change !== undefined) {
        // Determine if the change is positive or negative
        let direction;
        
        if (isImproved !== null) {
            // For metrics where lower is better (resolution time, overdue tasks)
            direction = isImproved ? 'down' : 'up';
        } else {
            // For metrics where higher is better (active jobs, completion rate)
            direction = change >= 0 ? 'up' : 'down';
        }
        
        // Update the class and HTML
        percentageElement.className = direction;
        percentageElement.innerHTML = `<i class="fas fa-arrow-${direction}"></i> ${Math.abs(change)}%`;
    }
}

/**
 * Animates the change in a number by counting up or down
 * @param {HTMLElement} element - The element to update
 * @param {string} oldValue - The old value
 * @param {string} newValue - The new value
 */
function animateNumberChange(element, oldValue, newValue) {
    // Parse the values to numbers for comparison
    // Remove any non-numeric characters except decimal points
    const parseValue = (val) => {
        return parseFloat(val.replace(/[^\d.-]/g, ''));
    };
    
    const oldNum = parseValue(oldValue);
    const newNum = parseValue(newValue);
    
    // If either value isn't a valid number, just set the new value directly
    if (isNaN(oldNum) || isNaN(newNum)) {
        element.textContent = newValue;
        return;
    }
    
    // Determine if we're counting up or down
    const isIncreasing = newNum > oldNum;
    const difference = Math.abs(newNum - oldNum);
    
    // For very small differences, don't animate
    if (difference < 0.1) {
        element.textContent = newValue;
        return;
    }
    
    // Calculate step size (complete in 20 steps)
    const stepSize = difference / 20;
    let currentValue = oldNum;
    
    // Clear any existing animation
    if (element._animationInterval) {
        clearInterval(element._animationInterval);
    }
    
    // Start animation interval
    element._animationInterval = setInterval(() => {
        if ((isIncreasing && currentValue >= newNum) || 
            (!isIncreasing && currentValue <= newNum)) {
            // Animation complete
            clearInterval(element._animationInterval);
            element._animationInterval = null;
            element.textContent = newValue; // Ensure exact final value
            return;
        }
        
        // Increment or decrement
        currentValue = isIncreasing ? 
            currentValue + stepSize : 
            currentValue - stepSize;
        
        // Format with the same pattern as the new value
        // Preserve suffix (like "%" or "d") if any
        const suffix = newValue.match(/[^\d.-]+$/);
        const formattedValue = suffix ? 
            Math.round(currentValue * 10) / 10 + suffix[0] : 
            Math.round(currentValue * 10) / 10;
        
        element.textContent = formattedValue;
    }, 50); // Update every 50ms (total animation takes ~1 second)
}

/**
 * Applies a subtle pulse animation to all stats cards to indicate refresh
 */
function pulseStatsCards() {
    document.querySelectorAll('.JO-stats-card').forEach(card => {
        // Remove any existing animation class
        card.classList.remove('refreshed');
        
        // Force browser to recognize the change
        void card.offsetWidth;
        
        // Add the animation class
        card.classList.add('refreshed');
        
        // Remove class after animation completes
        setTimeout(() => {
            card.classList.remove('refreshed');
        }, 1000);
    });
}

/**
 * Animates the stats cards on initial page load
 */
function animateStatsCards() {
    const statsCards = document.querySelectorAll('.JO-stats-card');
    statsCards.forEach((card, index) => {
        // Set initial state
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        // Animate with staggered delay
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 150));
    });
}

// Add necessary CSS for animations
(function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .JO-stats-card.refreshed {
            animation: pulse-refresh 1s ease;
        }
        
        @keyframes pulse-refresh {
            0% { box-shadow: 0 0 0 0 rgba(51, 102, 255, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(51, 102, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(51, 102, 255, 0); }
        }
    `;
    document.head.appendChild(style);
})();

// JOB ORDER TIMELINE
function initializeTimelineEvents() {
    // Timeline view switching buttons
    const timelineButtons = document.querySelectorAll('#timeline-today-btn, #timeline-week-btn, #timeline-month-btn');
    
    // Make week button active by default
    timelineButtons.forEach(button => {
        button.classList.remove('active');
        if (button.id === 'timeline-week-btn') {
            button.classList.add('active');
        }
    });
    
    timelineButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            timelineButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get the view name
            const viewType = this.id.replace('-btn', '');
            currentTimelineView = viewType;
            
            // Update the indicator text
            const timelineViewIndicator = document.getElementById('timeline-view-indicator');
            if (timelineViewIndicator) {
                if (viewType === 'timeline-today') {
                    timelineViewIndicator.textContent = 'Today';
                } else if (viewType === 'timeline-week') {
                    timelineViewIndicator.textContent = 'This Week';
                } else {
                    timelineViewIndicator.textContent = 'This Month';
                }
            }
            
            // Hide all views
            const timelineViews = document.querySelectorAll('#timeline-today-view, #timeline-week-view, #timeline-month-view');
            timelineViews.forEach(view => view.style.display = 'none');
            
            // Show the selected view
            const selectedView = document.getElementById(`${viewType}-view`);
            if (selectedView) selectedView.style.display = 'block';
            
            // Update day names and dates for the selected view
            directUpdateTimeline();
            
            // Re-animate timeline items in the selected view
            animateTimelineItems(viewType + '-view');
            
            // Refresh the selected view to get the latest data
            refreshTimeline(viewType);
        });
    });
    
    // Add click handlers to timeline events
    addTimelineEventHandlers();
}

/**
 * Updates day names and dates in the timeline based on the current view
 * @param {string} viewType - The type of timeline view (optional)
 */
function updateTimeline(data, viewType) {
    const timelineView = document.getElementById(`${viewType}-view`);
    if (!timelineView) return;
    
    // Get the events container
    const eventsContainer = timelineView.querySelector('.JO-timeline-events');
    if (!eventsContainer) return;
    
    // Clear existing events
    eventsContainer.innerHTML = '';
    
    // If there are no events, show a message
    if (!data.events || data.events.length === 0) {
        eventsContainer.innerHTML = '<div class="JO-empty-timeline"><p>No events for this period</p></div>';
        return;
    }
    
    // Add new events
    data.events.forEach((event, index) => {
        const eventElement = document.createElement('div');
        eventElement.className = `JO-timeline-event ${event.status?.toLowerCase() || ''}`;
        eventElement.setAttribute('data-jo-id', event.jo_number);
        
        // Set the grid position based on the view type
        if (viewType === 'timeline-today') {
            eventElement.style.gridColumn = '1';
            eventElement.style.gridRow = (index + 1).toString();
        } else if (viewType === 'timeline-week') {
            eventElement.style.gridColumn = event.day_column?.toString() || '1';
            eventElement.style.gridRow = event.row?.toString() || (index + 1).toString();
        } else { // timeline-month
            eventElement.style.gridColumn = event.week_column?.toString() || '1';
            eventElement.style.gridRow = event.row?.toString() || (index + 1).toString();
        }
        
        // Format the time to AM/PM
        // Format the time to AM/PM
        const timeString = event.time?.trim() || '12:00';
        let formattedTime = '12:00 PM'; // Default fallback

        try {
            if (/^\d{1,2}:\d{2}$/.test(timeString)) {
                const [hoursStr, minutesStr] = timeString.split(':');
                const hours = Number(hoursStr);
                const minutes = Number(minutesStr);

                if (!isNaN(hours) && !isNaN(minutes)) {
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const formattedHours = hours % 12 || 12;
                    formattedTime = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                }
            } else {
                console.warn('Invalid time format:', timeString);
            }
        } catch (error) {
            console.error('Error formatting time:', error);
        }

        
        // Add the event content
        let eventHTML = '';
        
        if (viewType === 'timeline-month') {
            // For month view, include date with the time
            const eventDate = event.date || '';
            eventHTML = `
                <div class="JO-event-content">
                    <span class="JO-event-time">${eventDate} ${formattedTime}</span>
                    <span class="JO-event-title">${event.jo_number}</span>
                    <span class="JO-event-description">${event.title || ''}</span>
                </div>
            `;
        } else {
            // For today and week view, just show time
            eventHTML = `
                <div class="JO-event-content">
                    <span class="JO-event-time">${formattedTime}</span>
                    <span class="JO-event-title">${event.jo_number}</span>
                    <span class="JO-event-description">${event.title || ''}</span>
                </div>
            `;
        }
        
        eventElement.innerHTML = eventHTML;
        
        // Add the event to the container
        eventsContainer.appendChild(eventElement);
    });
    
    // Apply new styling to events
    eventsContainer.querySelectorAll('.JO-timeline-event').forEach(element => {
        // Remove border-left as requested
        element.style.borderLeft = 'none';
        
        // Make "Assigned to" text smaller
        const descriptionElem = element.querySelector('.JO-event-description');
        if (descriptionElem && descriptionElem.textContent.includes('Assigned to')) {
            descriptionElem.style.fontSize = '0.75rem';
            descriptionElem.style.color = 'var(--jo-text-light, #666)';
            descriptionElem.style.fontStyle = 'italic';
        }
    });
    
    // Re-add event handlers
    addTimelineEventHandlers();
    
    // Animate the timeline items
    animateTimelineItems(viewType + '-view');
    
    // Log the update
    console.log('Timeline updated at', new Date().toLocaleTimeString());
}

/**
 * Add click event handlers to all timeline events
 */
function addTimelineEventHandlers() {
    const timelineEvents = document.querySelectorAll('.JO-timeline-event');
    timelineEvents.forEach(event => {
        event.addEventListener('click', function() {
            const joId = this.getAttribute('data-jo-id');
            if (joId && typeof fetchJobOrderDetails === 'function') {
                fetchJobOrderDetails(joId);
            } else {
                console.log('Click on timeline event:', joId);
            }
        });
    });
}

/**
 * Starts the timeline refresh interval
 */
function startTimelineRefresh() {
    // Clear any existing interval to prevent duplicates
    clearTimelineRefresh();
    
    // Refresh timeline immediately on start
    refreshTimeline(currentTimelineView);
    
    // Set up new interval
    timelineRefreshInterval = setInterval(() => {
        refreshTimeline(currentTimelineView);
    }, TIMELINE_REFRESH_INTERVAL);
}

/**
 * Clears the timeline refresh interval
 */
function clearTimelineRefresh() {
    if (timelineRefreshInterval) {
        clearInterval(timelineRefreshInterval);
        timelineRefreshInterval = null;
    }
}

/**
 * Refreshes the timeline data by fetching from the API
 * @param {string} viewType - The type of timeline view to refresh
 */
function refreshTimeline(viewType = null) {
    // If no view type is provided, use the current active view
    if (!viewType) {
        viewType = currentTimelineView;
    }
    
    // Update the endpoint URL based on the view type
    fetch(`/joborder/api/job-order/timeline/${viewType}/`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            updateTimeline(data, viewType);
        } else {
            console.error('Error in timeline data:', data.message);
        }
    })
    .catch(error => {
        console.error('Error refreshing timeline:', error);
    });
}

/**
 * Updates the timeline with new data
 * @param {Object} data - The timeline data from the API
 * @param {string} viewType - The type of timeline view to update
 */
function updateTimeline(data, viewType) {
    const timelineView = document.getElementById(`${viewType}-view`);
    if (!timelineView) return;
    
    // Get the events container
    const eventsContainer = timelineView.querySelector('.JO-timeline-events');
    if (!eventsContainer) return;
    
    // Clear existing events
    eventsContainer.innerHTML = '';
    
    // If there are no events, show a message
    if (!data.events || data.events.length === 0) {
        eventsContainer.innerHTML = '<div class="JO-empty-timeline"><p>No events for this period</p></div>';
        return;
    }
    
    // Add new events
    data.events.forEach((event, index) => {
        const eventElement = document.createElement('div');
        eventElement.className = `JO-timeline-event ${event.status?.toLowerCase() || ''}`;
        eventElement.setAttribute('data-jo-id', event.jo_number);
        
        // Set the grid position based on the view type
        if (viewType === 'timeline-today') {
            eventElement.style.gridColumn = '1';
            eventElement.style.gridRow = (index + 1).toString();
        } else if (viewType === 'timeline-week') {
            eventElement.style.gridColumn = event.day_column?.toString() || '1';
            eventElement.style.gridRow = event.row?.toString() || (index + 1).toString();
        } else { // timeline-month
            eventElement.style.gridColumn = event.week_column?.toString() || '1';
            eventElement.style.gridRow = event.row?.toString() || (index + 1).toString();
        }
        
        // Format the time to AM/PM
        const timeString = event.time || '12:00';
        const [hours, minutes] = timeString.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedTime = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        
        // Add the event content
        eventElement.innerHTML = `
            <div class="JO-event-content">
                <span class="JO-event-time">${formattedTime}</span>
                <span class="JO-event-title">${event.jo_number}</span>
                <span class="JO-event-description">${event.title || ''}</span>
            </div>
        `;
        
        // Add the event to the container
        eventsContainer.appendChild(eventElement);
    });
    
    // Add status classes based on status value
    eventsContainer.querySelectorAll('.JO-timeline-event').forEach(element => {
        const statusClass = element.className.match(/\b(completed|delayed|upcoming|processing|approved)\b/);
        if (statusClass) {
            if (statusClass[1] === 'processing') {
                element.classList.add('upcoming'); // Map processing to upcoming for styling
            } else if (statusClass[1] === 'approved') {
                element.classList.add('completed'); // Map approved to completed for styling
            }
        }
    });
    
    // Re-add event handlers
    addTimelineEventHandlers();
    
    // Animate the timeline items
    animateTimelineItems(viewType + '-view');
    
    // Log the update
    console.log('Timeline updated at', new Date().toLocaleTimeString());
}

/**
 * Animates timeline items with a fade-in effect
 * @param {string} containerId - The ID of the container element
 */
function animateTimelineItems(containerId = null) {
    let selector = '.JO-timeline-event';
    if (containerId) {
        selector = `#${containerId} ${selector}`;
    }
    
    const events = document.querySelectorAll(selector);
    events.forEach((event, index) => {
        // Reset animation
        event.style.animation = 'none';
        event.offsetHeight; // Trigger reflow
        
        // Apply new animation with delay based on position
        event.style.animation = `fadeIn 0.5s forwards ${index * 0.1}s`;
    });
}

// Add necessary CSS for animations
(function addStyles() {
    // Only add if these animations don't already exist
    if (!document.getElementById('timeline-animations')) {
        const style = document.createElement('style');
        style.id = 'timeline-animations';
        style.textContent = `
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .JO-timeline-event {
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            .JO-timeline-event:hover {
                transform: translateY(-5px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                z-index: 10;
            }
            
            .JO-timeline-event.approved,
            .JO-timeline-event.completed {
                border-left: 4px solid var(--jo-green, #4caf50);
                background-color: var(--jo-green-light, #e8f5e9);
            }
            
            .JO-timeline-event.processing,
            .JO-timeline-event.upcoming {
                border-left: 4px solid var(--jo-primary, #3366ff);
                background-color: var(--jo-primary-light, #e0e8ff);
            }
            
            .JO-timeline-event.delayed {
                border-left: 4px solid var(--jo-status-pending, #ffc107);
                background-color: var(--jo-yellow-light, #fff8e1);
            }
            
            .JO-empty-timeline {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 150px;
                color: var(--jo-text-light, #666);
                font-style: italic;
                grid-column: 1 / -1;
            }
        `;
        document.head.appendChild(style);
    }
})();

function directUpdateTimeline() {
    // Get current date
    const now = new Date();
    
    // TODAY VIEW
    // Update today view with current day name and date
    const todayView = document.querySelector('#timeline-today-view .JO-timeline-days');
    if (todayView) {
        // Get day name and date
        const dayName = now.toLocaleString('en-US', { weekday: 'long' });
        const month = now.toLocaleString('en-US', { month: 'short' });
        const date = now.getDate();
        
        // Replace HTML directly
        todayView.innerHTML = `
            <div class="JO-timeline-day active" style="width: 100%;">
                <span class="JO-day-name">${dayName}</span>
                <span class="JO-day-date">${month} ${date}</span>
            </div>
        `;
    }
    
    // WEEK VIEW
    // Update week view with the days of the current week
    const weekView = document.querySelector('#timeline-week-view .JO-timeline-days');
    if (weekView) {
        // Find the Monday of the current week
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday
        
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);
        
        // Generate the entire week HTML
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        let weekHTML = '';
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            
            const dayName = dayNames[i];
            const month = day.toLocaleString('en-US', { month: 'short' });
            const date = day.getDate();
            const isToday = day.toDateString() === now.toDateString();
            
            weekHTML += `
                <div class="JO-timeline-day ${isToday ? 'active' : ''}">
                    <span class="JO-day-name">${dayName}</span>
                    <span class="JO-day-date">${month} ${date}</span>
                </div>
            `;
        }
        
        // Replace week view HTML
        weekView.innerHTML = weekHTML;
    }
    
    // MONTH VIEW
    // Update month view with weeks
    const monthView = document.querySelector('#timeline-month-view .JO-timeline-days');
    if (monthView) {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Start with the first day of the month
        const firstDay = new Date(currentYear, currentMonth, 1);
        
        // Find the Monday before or on the first day
        const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const diff = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
        
        const firstMonday = new Date(firstDay);
        firstMonday.setDate(firstDay.getDate() + diff);
        
        // Determine how many weeks to display (usually 4-6)
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const totalDays = lastDay.getDate();
        const totalWeeks = Math.ceil((totalDays + firstDayOfWeek) / 7);
        
        // Generate month weeks HTML
        let monthHTML = '';
        
        for (let i = 0; i < totalWeeks; i++) {
            // Calculate start and end of each week
            const weekStart = new Date(firstMonday);
            weekStart.setDate(firstMonday.getDate() + (i * 7));
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            const startMonth = weekStart.toLocaleString('en-US', { month: 'short' });
            const endMonth = weekEnd.toLocaleString('en-US', { month: 'short' });
            const startDate = weekStart.getDate();
            const endDate = weekEnd.getDate();
            
            // Check if this is the current week
            const isCurrentWeek = now >= weekStart && now <= weekEnd;
            
            // Format like "Apr 1-7"
            let dateRange;
            if (startMonth === endMonth) {
                dateRange = `${startMonth} ${startDate}-${endDate}`;
            } else {
                dateRange = `${startMonth} ${startDate}-${endMonth} ${endDate}`;
            }
            
            monthHTML += `
                <div class="JO-timeline-day ${isCurrentWeek ? 'active' : ''}">
                    <span class="JO-day-name">Week ${i + 1}</span>
                    <span class="JO-day-date">${dateRange}</span>
                </div>
            `;
        }
        
        // Replace month view HTML
        monthView.innerHTML = monthHTML;
    }
    
    console.log('Timeline days/dates updated at', new Date().toLocaleTimeString());
}

// Replace the updateTimelineDayInfo function with this:
function updateTimelineDayInfo(viewType = null) {
    // Just call our direct DOM update function instead
    directUpdateTimeline();
}


// Upcoming Deadlines
function initializeDeadlines() {
    // Setup deadline filter dropdown
    const deadlineFilter = document.getElementById('deadline-filter');
    if (deadlineFilter) {
        console.log('Deadline filter found, setting up event listener');
        deadlineFilter.addEventListener('change', function() {
            currentDeadlineFilter = this.value;
            console.log('Filter changed to:', currentDeadlineFilter);
            refreshDeadlines();
        });
    } else {
        console.warn('Deadline filter element not found in DOM');
    }
    
    // Add click handlers to any initial deadline items
    addDeadlineEventHandlers();
}

/**
 * Start automatic refresh for deadlines
 */
function startDeadlinesRefresh() {
    clearDeadlinesRefresh();
    deadlinesRefreshInterval = setInterval(refreshDeadlines, DEADLINES_REFRESH_INTERVAL);
    console.log('Deadline refresh started, interval:', DEADLINES_REFRESH_INTERVAL, 'ms');
}

/**
 * Clear the deadlines refresh interval
 */
function clearDeadlinesRefresh() {
    if (deadlinesRefreshInterval) {
        clearInterval(deadlinesRefreshInterval);
        deadlinesRefreshInterval = null;
        console.log('Deadline refresh interval cleared');
    }
}

/**
 * Refresh deadlines data from API
 */
function refreshDeadlines() {
    console.log('Refreshing deadlines data from API...');
    
    // Get the CSRF token from cookies if using Django
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    const csrftoken = getCookie('csrftoken');
    
    fetch('/joborder/api/job-order/deadlines/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-CSRFToken': csrftoken
        },
        credentials: 'same-origin'
    })
    .then(response => {
        console.log('API response status:', response.status);
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Deadlines data received:', data);
        if (data.status === 'success') {
            updateDeadlines(data);
        } else {
            console.error('Error in deadlines data:', data.message);
            showEmptyDeadlines('Error loading deadlines. Please try again later.');
        }
    })
    .catch(error => {
        console.error('Error refreshing deadlines:', error);
        showEmptyDeadlines('Could not connect to server. Please check your connection.');
    });
}

/**
 * Show empty state message in deadlines container
 */
function showEmptyDeadlines(message = 'No upcoming deadlines') {
    const deadlinesContainer = document.querySelector('.JO-deadlines-container');
    if (deadlinesContainer) {
        deadlinesContainer.innerHTML = `
            <div class="JO-empty-deadlines">
                <p>${message}</p>
            </div>
        `;
    }
}

/**
 * Update deadlines UI with new data
 * @param {Object} data - The deadlines data from the API
 */
function updateDeadlines(data) {
    const deadlinesContainer = document.querySelector('.JO-deadlines-container');
    if (!deadlinesContainer) {
        console.error('Deadlines container not found in DOM');
        return;
    }
    
    // Filter deadlines based on current filter
    let filteredDeadlines = data.deadlines || [];
    console.log('Total deadlines before filtering:', filteredDeadlines.length);
    
    if (currentDeadlineFilter !== 'all') {
        filteredDeadlines = filteredDeadlines.filter(deadline => {
            const matches = deadline.category && 
                           deadline.category.toLowerCase() === currentDeadlineFilter.toLowerCase();
            return matches;
        });
        console.log('Deadlines after filtering by', currentDeadlineFilter, ':', filteredDeadlines.length);
    }
    
    // Clear existing deadlines
    deadlinesContainer.innerHTML = '';
    
    // If no deadlines after filtering, show empty message
    if (!filteredDeadlines || filteredDeadlines.length === 0) {
        showEmptyDeadlines();
        return;
    }
    
    // Add new deadlines
    filteredDeadlines.forEach((deadline, index) => {
        try {
            const deadlineElement = document.createElement('div');
            deadlineElement.className = `JO-deadline-item ${deadline.is_critical ? 'critical' : ''}`;
            deadlineElement.setAttribute('data-jo-id', deadline.jo_number);
            
            // Create deadline HTML - use safe defaults in case of missing data
            const day = deadline.day || '-';
            const month = deadline.month || '-';
            const joNumber = deadline.jo_number || 'Unknown';
            const category = (deadline.category || 'Unknown').toLowerCase();
            const description = deadline.description || 'No description';
            const countdown = deadline.countdown || 'Unknown';
            
            deadlineElement.innerHTML = `
                <div class="JO-deadline-date">
                    <div class="JO-deadline-day">${day}</div>
                    <div class="JO-deadline-month">${month}</div>
                </div>
                <div class="JO-deadline-info">
                    <h4>${joNumber} <span class="JO-category-pill JO-category-${category}">${deadline.category || 'Unknown'}</span></h4>
                    <p>${description}</p>
                </div>
                <div class="JO-deadline-countdown">
                    <span class="JO-countdown-value">${countdown}</span>
                </div>
            `;
            
            // Add the deadline to the container
            deadlinesContainer.appendChild(deadlineElement);
            
            // Add animation with delay
            setTimeout(() => {
                deadlineElement.style.opacity = '0';
                deadlineElement.style.transform = 'translateY(10px)';
                
                // Trigger animation
                void deadlineElement.offsetWidth; // Force reflow
                deadlineElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                deadlineElement.style.opacity = '1';
                deadlineElement.style.transform = 'translateY(0)';
            }, index * 100);
        } catch (error) {
            console.error('Error creating deadline element:', error, deadline);
        }
    });
    
    // Add click handlers to deadlines
    addDeadlineEventHandlers();
    
    console.log('Deadlines UI updated with', filteredDeadlines.length, 'items');
}

/**
 * Add click event handlers to deadline items
 */
function addDeadlineEventHandlers() {
    const deadlineItems = document.querySelectorAll('.JO-deadline-item');
    console.log('Adding click handlers to', deadlineItems.length, 'deadline items');
    
    deadlineItems.forEach(item => {
        item.addEventListener('click', function() {
            const joId = this.getAttribute('data-jo-id');
            if (joId && typeof fetchJobOrderDetails === 'function') {
                console.log('Fetching job order details for:', joId);
                fetchJobOrderDetails(joId);
            } else {
                console.log('Click on deadline item:', joId);
                // Optional: Show a toast message if fetchJobOrderDetails isn't available
                if (typeof createToast === 'function') {
                    createToast(`Selected Job Order: ${joId}`, 'info', 3000);
                }
            }
        });
    });
}

// If you have a main refresh function, add this to it
function refreshAllData() {
    refreshStats();
    refreshTimeline(currentTimelineView);
    refreshDeadlines();
}

// Critical Alerts
function initializeAlerts() {
    // Setup alert filter checkboxes
    const filterCheckboxes = document.querySelectorAll('.JO-alert-filter-option input[type="checkbox"]');
    
    filterCheckboxes.forEach((checkbox, index) => {
        checkbox.addEventListener('change', function() {
            // Update filter state based on checkbox position
            if (index === 0) alertFilters.overdue = this.checked;
            if (index === 1) alertFilters.highPriority = this.checked;
            if (index === 2) alertFilters.resource = this.checked;
            
            console.log('Alert filters updated:', alertFilters);
            refreshAlerts();
        });
    });
    
    // Add click handlers to any initial alert items
    addAlertEventHandlers();
}

/**
 * Start automatic refresh for alerts
 */
function startAlertsRefresh() {
    clearAlertsRefresh();
    alertsRefreshInterval = setInterval(refreshAlerts, ALERTS_REFRESH_INTERVAL);
    console.log('Alert refresh started, interval:', ALERTS_REFRESH_INTERVAL, 'ms');
}

/**
 * Clear the alerts refresh interval
 */
function clearAlertsRefresh() {
    if (alertsRefreshInterval) {
        clearInterval(alertsRefreshInterval);
        alertsRefreshInterval = null;
        console.log('Alert refresh interval cleared');
    }
}

/**
 * Refresh alerts data from API
 */
function refreshAlerts() {
    console.log('Refreshing alerts data from API...');
    
    // Get the CSRF token from cookies
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    const csrftoken = getCookie('csrftoken');
    
    fetch('/joborder/api/job-order/alerts/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-CSRFToken': csrftoken
        },
        credentials: 'same-origin'
    })
    .then(response => {
        console.log('API response status:', response.status);
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Alerts data received:', data);
        if (data.status === 'success') {
            updateAlerts(data);
        } else {
            console.error('Error in alerts data:', data.message);
            showEmptyAlerts('Error loading alerts. Please try again later.');
        }
    })
    .catch(error => {
        console.error('Error refreshing alerts:', error);
        showEmptyAlerts('Could not connect to server. Please check your connection.');
    });
}

/**
 * Show empty state message in alerts container
 */
function showEmptyAlerts(message = 'No critical alerts at this time') {
    const alertsContainer = document.querySelector('.JO-alerts-container');
    if (alertsContainer) {
        alertsContainer.innerHTML = `
            <div class="JO-empty-alerts">
                <p>${message}</p>
            </div>
        `;
    }
}

/**
 * Update alerts UI with new data
 * @param {Object} data - The alerts data from the API
 */
function updateAlerts(data) {
    const alertsContainer = document.querySelector('.JO-alerts-container');
    if (!alertsContainer) {
        console.error('Alerts container not found in DOM');
        return;
    }
    
    // Filter alerts based on current filters
    let filteredAlerts = data.alerts || [];
    console.log('Total alerts before filtering:', filteredAlerts.length);
    
    filteredAlerts = filteredAlerts.filter(alert => {
        if (alert.type === 'critical' && !alertFilters.overdue) return false;
        if (alert.type === 'high' && !alertFilters.highPriority) return false;
        if (alert.type === 'resource' && !alertFilters.resource) return false;
        return true;
    });
    
    console.log('Alerts after filtering:', filteredAlerts.length);
    
    // Clear existing alerts
    alertsContainer.innerHTML = '';
    
    // If no alerts after filtering, show empty message
    if (!filteredAlerts || filteredAlerts.length === 0) {
        showEmptyAlerts();
        return;
    }
    
    // Add new alerts
    filteredAlerts.forEach((alert, index) => {
        try {
            const alertElement = document.createElement('div');
            alertElement.className = `JO-alert-item ${alert.type || ''}`;
            
            // Save job number if available (for click handler)
            if (alert.actions && alert.actions.length > 0) {
                const viewAction = alert.actions.find(action => action.text.includes('View Details'));
                if (viewAction && viewAction.data_jo) {
                    alertElement.setAttribute('data-jo-id', viewAction.data_jo);
                }
            }
            
            // Create alert HTML - use safe defaults in case of missing data
            const icon = alert.icon || 'exclamation-circle';
            const title = alert.title || 'Alert';
            const time = alert.time || '';
            const message = alert.message || 'No details available';
            
            alertElement.innerHTML = `
                <div class="JO-alert-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="JO-alert-content">
                    <div class="JO-alert-header">
                        <h4>${title}</h4>
                        <span class="JO-alert-time">${time}</span>
                    </div>
                    <p class="JO-alert-message">${message}</p>
                </div>
            `;
            
            // Add the alert to the container
            alertsContainer.appendChild(alertElement);
            
            // Add animation with delay
            setTimeout(() => {
                alertElement.style.opacity = '0';
                alertElement.style.transform = 'translateX(20px)';
                
                // Trigger animation
                void alertElement.offsetWidth; // Force reflow
                alertElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                alertElement.style.opacity = '1';
                alertElement.style.transform = 'translateX(0)';
            }, index * 100);
        } catch (error) {
            console.error('Error creating alert element:', error, alert);
        }
    });
    
    // Add click handlers to alerts
    addAlertEventHandlers();
    
    console.log('Alerts UI updated with', filteredAlerts.length, 'items');
}

/**
 * Add click event handlers to alert items
 */
function addAlertEventHandlers() {
    // Add click handlers to the entire alert item
    const alertItems = document.querySelectorAll('.JO-alert-item');
    alertItems.forEach(item => {
        item.addEventListener('click', function() {
            const joId = this.getAttribute('data-jo-id');
            if (joId && typeof fetchJobOrderDetails === 'function') {
                console.log('Alert item clicked, fetching details for:', joId);
                fetchJobOrderDetails(joId);
            }
        });
    });
}