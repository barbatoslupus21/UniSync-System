
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

    // Immediately refresh the timeline to show data
    refreshTimeline('timeline-week');
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

    // Handle responsive layout
    handleResponsiveLayout();

    // Add window resize listener for responsive layout
    window.addEventListener('resize', handleResponsiveLayout);
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
    updateStatCard('JO-resolution-time', data.avg_resolution_time + ' days', data.resolution_time_change, data.resolution_time_improved);

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

/**
 * Handles the responsive layout of the dashboard based on content
 */
function handleResponsiveLayout() {
    const mainContentGrid = document.querySelector('.JO-main-content-grid');
    const leftColumn = document.querySelector('.JO-left-column');
    const rightColumn = document.querySelector('.JO-right-column');
    const deadlinesSection = document.querySelector('.JO-deadlines-section');
    const alertsSection = document.querySelector('.JO-alerts-section');

    if (!mainContentGrid || !leftColumn || !rightColumn) return;

    // Check if deadlines section has content
    const hasDeadlinesContent = deadlinesSection &&
        !deadlinesSection.querySelector('.JO-empty-deadlines') &&
        deadlinesSection.querySelector('.JO-deadline-item');

    // Check if alerts section has content
    const hasAlertsContent = alertsSection &&
        !alertsSection.querySelector('.JO-empty-alerts') &&
        alertsSection.querySelector('.JO-alert-item');

    // Apply layout based on content
    if (!hasDeadlinesContent && !hasAlertsContent) {
        // No content in either section - timeline takes full width
        mainContentGrid.style.gridTemplateColumns = '1fr';
        rightColumn.style.display = 'none';
    } else if (hasDeadlinesContent && !hasAlertsContent) {
        // Only deadlines has content
        mainContentGrid.style.gridTemplateColumns = '70% 30%';
        rightColumn.style.display = 'flex';
        if (deadlinesSection) deadlinesSection.style.flex = '1';
        if (alertsSection) alertsSection.style.display = 'none';
    } else if (!hasDeadlinesContent && hasAlertsContent) {
        // Only alerts has content
        mainContentGrid.style.gridTemplateColumns = '70% 30%';
        rightColumn.style.display = 'flex';
        if (deadlinesSection) deadlinesSection.style.display = 'none';
        if (alertsSection) alertsSection.style.flex = '1';
    } else {
        // Both sections have content
        mainContentGrid.style.gridTemplateColumns = '70% 30%';
        rightColumn.style.display = 'flex';
        if (deadlinesSection) {
            deadlinesSection.style.display = 'flex';
            deadlinesSection.style.flex = '1';
        }
        if (alertsSection) {
            alertsSection.style.display = 'flex';
            alertsSection.style.flex = '1';
        }
    }

    console.log('Responsive layout updated:', {
        hasDeadlinesContent,
        hasAlertsContent
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

    // If there are no events, show a message with the current date
    if (!data.events || data.events.length === 0) {
        // Get the current date or selected date
        let dateDisplay = '';

        // Check if there's a selected date in the view
        const selectedDateAttr = document.querySelector(`#${viewType}-view`).getAttribute('data-selected-date');

        if (selectedDateAttr) {
            // Format the selected date
            const selectedDate = new Date(selectedDateAttr);
            dateDisplay = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        } else {
            // Use the current view's date format
            if (viewType === 'timeline-today') {
                dateDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            } else if (viewType === 'timeline-week') {
                dateDisplay = 'this week';
            } else {
                dateDisplay = 'this month';
            }
        }

        eventsContainer.innerHTML = `
            <div class="JO-empty-timeline">
                <i class="fas fa-calendar-day"></i>
                <p>No events for ${dateDisplay}</p>
                <p class="JO-empty-subtitle">All pending job orders will appear here</p>
            </div>
        `;
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

        // Format the time display
        let formattedTime = '';

        // Check if the time is already in AM/PM format
        if (event.time && (event.time.includes('AM') || event.time.includes('PM'))) {
            formattedTime = event.time;
        } else if (event.time && /^\d{1,2}:\d{2}$/.test(event.time.trim())) {
            // If it's in HH:MM format, convert to AM/PM
            try {
                const timeString = event.time.trim();
                const [hoursStr, minutesStr] = timeString.split(':');
                const hours = Number(hoursStr);
                const minutes = Number(minutesStr);

                if (!isNaN(hours) && !isNaN(minutes)) {
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const formattedHours = hours % 12 || 12;
                    formattedTime = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                } else {
                    formattedTime = '12:00 PM'; // Default fallback
                }
            } catch (error) {
                console.error('Error formatting time:', error);
                formattedTime = '12:00 PM'; // Default fallback
            }
        } else {
            // Default fallback
            formattedTime = '12:00 PM';
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
        eventsContainer.innerHTML = '<div class="JO-empty-timeline"><p>No pending job orders found for maintenance personnel</p><p class="JO-empty-subtitle">Job orders will appear here when they are assigned to maintenance staff</p></div>';
        return;
    }

    // Store the currently selected date for filtering
    const selectedDate = timelineView.getAttribute('data-selected-date') || null;

    // Filter events by selected date if applicable
    let filteredEvents = data.events;
    if (selectedDate) {
        filteredEvents = data.events.filter(event => event.event_date === selectedDate);

        // If no events for the selected date, show a message
        if (filteredEvents.length === 0) {
            eventsContainer.innerHTML = `<div class="JO-empty-timeline">
                <p>No events for ${new Date(selectedDate).toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'})}</p>
                <button class="JO-clear-filter-btn">Show All Events</button>
            </div>`;

            // Add event listener to the clear filter button
            const clearFilterBtn = eventsContainer.querySelector('.JO-clear-filter-btn');
            if (clearFilterBtn) {
                clearFilterBtn.addEventListener('click', function() {
                    timelineView.removeAttribute('data-selected-date');
                    refreshTimeline(viewType);
                });
            }
            return;
        }
    }

    // Add new events
    filteredEvents.forEach((event, index) => {
        const eventElement = document.createElement('div');
        eventElement.className = `JO-timeline-event ${event.status?.toLowerCase() || ''}`;
        eventElement.setAttribute('data-jo-id', event.jo_number);
        eventElement.setAttribute('data-event-date', event.event_date);

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

        // Apply color coding based on target date
        if (!event.has_target_date) {
            // Orange for no target date
            eventElement.classList.add('no-target');
        } else if (event.is_overdue) {
            // Red for overdue
            eventElement.classList.add('overdue');
        } else if (event.is_approaching) {
            // Yellow for approaching due date
            eventElement.classList.add('approaching');
        } else {
            // Green for default (on track)
            eventElement.classList.add('on-track');
        }

        // Format the time display
        let timeDisplay = '';

        // Log the original time for debugging
        console.log(`Event time for ${event.jo_number}:`, event.time);

        // Check if the time is already in AM/PM format
        if (event.time && (event.time.includes('AM') || event.time.includes('PM'))) {
            timeDisplay = event.time;
            console.log(`Using AM/PM format: ${timeDisplay}`);
        } else if (event.time && /^\d{1,2}:\d{2}$/.test(event.time.trim())) {
            // If it's in HH:MM format, convert to AM/PM
            try {
                const timeString = event.time.trim();
                const [hoursStr, minutesStr] = timeString.split(':');
                const hours = Number(hoursStr);
                const minutes = Number(minutesStr);

                if (!isNaN(hours) && !isNaN(minutes)) {
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const formattedHours = hours % 12 || 12;
                    timeDisplay = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                    console.log(`Converted HH:MM to AM/PM: ${timeDisplay}`);
                } else {
                    timeDisplay = '12:00 PM'; // Default fallback
                    console.log('Invalid hours/minutes, using default');
                }
            } catch (error) {
                console.error('Error formatting time:', error);
                timeDisplay = '12:00 PM'; // Default fallback
            }
        } else {
            // Default fallback
            timeDisplay = '12:00 PM';
            console.log('Using default time: 12:00 PM');
        }

        // For month view, include date with time
        if (viewType === 'timeline-month') {
            timeDisplay = `${event.date}, ${timeDisplay}`;
        }

        // Create the target date indicator
        let targetDateIndicator = '';
        if (!event.has_target_date) {
            targetDateIndicator = '<span class="JO-target-date-missing"><i class="fas fa-exclamation-circle"></i> No target date set</span>';
        } else if (event.is_overdue) {
            const daysOverdue = Math.abs(event.days_until_target);
            targetDateIndicator = `<span class="JO-target-date-overdue"><i class="fas fa-exclamation-triangle"></i> Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</span>`;
        } else if (event.is_approaching) {
            targetDateIndicator = `<span class="JO-target-date-approaching"><i class="fas fa-clock"></i> Due in ${event.days_until_target} day${event.days_until_target !== 1 ? 's' : ''}</span>`;
        } else {
            targetDateIndicator = `<span class="JO-target-date-ontrack"><i class="fas fa-check-circle"></i> On track</span>`;
        }

        // Add the event content
        eventElement.innerHTML = `
            <div class="JO-event-content">
                <div class="JO-event-header">
                    <span class="JO-event-time">${timeDisplay}</span>
                </div>
                <div class="JO-event-jo-number">${event.jo_number}</div>
                <div class="JO-event-body">
                    <span class="JO-event-description">${event.title || ''}</span>
                    <span class="JO-event-requestor">Requestor: ${event.requestor || 'Unknown'}</span>
                    <span class="JO-event-department">Department/Line: ${event.requestor_dept || 'N/A'}</span>
                    ${targetDateIndicator}
                </div>
            </div>
        `;

        // Add the event to the container
        eventsContainer.appendChild(eventElement);
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
                padding: 10px 12px;
                border-radius: 6px;
                margin-bottom: 8px;
                height: auto;
                display: flex;
                flex-direction: column;
                align-self: start;
                margin: 5px;
                z-index: 1;
            }

            .JO-timeline-event:hover {
                transform: translateY(-5px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                z-index: 10;
            }

            /* Status-based styling */
            .JO-timeline-event.approved,
            .JO-timeline-event.completed {
                background-color: var(--jo-green-light, #e8f5e9);
            }

            .JO-timeline-event.processing,
            .JO-timeline-event.upcoming {
                background-color: var(--jo-primary-light, #e0e8ff);
            }

            .JO-timeline-event.delayed {
                background-color: var(--jo-yellow-light, #fff8e1);
            }

            /* Target date based styling */
            .JO-timeline-event.on-track {
                background-color: var(--jo-green-light, #e8f5e9);
            }

            .JO-timeline-event.approaching {
                background-color: var(--jo-yellow-light, #fff8e1);
            }

            .JO-timeline-event.overdue {
                background-color: var(--jo-red-light, #ffebee);
            }

            .JO-timeline-event.no-target {
                background-color: var(--jo-orange-light, #fff3e0);
            }

            /* Event content styling */
            .JO-event-content {
                display: flex;
                flex-direction: column;
                gap: 5px;
                width: 100%;
            }

            .JO-event-header {
                display: flex;
                justify-content: flex-start;
                align-items: center;
                margin-bottom: 2px;
            }

            .JO-event-jo-number {
                font-size: 1.2rem;
                font-weight: 700;
                color: var(--jo-primary, #3366ff);
                margin-bottom: 8px;
                padding: 2px 0;
                border-bottom: 1px dashed rgba(51, 102, 255, 0.3);
                letter-spacing: 0.5px;
                text-align: center;
            }

            .JO-event-body {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }

            .JO-event-time {
                font-weight: 500;
                color: var(--jo-text-dark, #333);
                font-size: 0.85rem;
            }

            .JO-event-description {
                font-size: 0.85rem;
                color: var(--jo-text-light, #666);
                font-style: italic;
            }

            .JO-event-requestor {
                font-size: 0.85rem;
                color: var(--jo-text-dark, #333);
                font-weight: 500;
            }

            .JO-event-department {
                font-size: 0.85rem;
                color: var(--jo-text-dark, #333);
                font-style: italic;
                margin-bottom: 4px;
            }

            .JO-target-date-missing {
                font-size: 0.8rem;
                color: #e65100; /* Dark orange */
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .JO-target-date-overdue {
                font-size: 0.8rem;
                color: var(--jo-red, #f44336);
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .JO-target-date-approaching {
                font-size: 0.8rem;
                color: var(--jo-status-pending, #ffc107);
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .JO-target-date-ontrack {
                font-size: 0.8rem;
                color: var(--jo-green, #4caf50);
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            /* Empty timeline styling */
            .JO-empty-timeline {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                min-height: 200px;
                color: var(--jo-text-light, #666);
                grid-column: 1 / -1;
                padding: 20px;
                text-align: center;
            }

            .JO-empty-timeline p {
                margin: 5px 0;
                font-size: 1rem;
            }

            .JO-empty-timeline .JO-empty-subtitle {
                font-size: 0.85rem;
                opacity: 0.7;
                font-style: italic;
            }

            .JO-clear-filter-btn {
                margin-top: 10px;
                padding: 5px 10px;
                background-color: var(--jo-primary-light, #e0e8ff);
                color: var(--jo-primary, #3366ff);
                border: 1px solid var(--jo-primary, #3366ff);
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: all 0.2s ease;
            }

            .JO-clear-filter-btn:hover {
                background-color: var(--jo-primary, #3366ff);
                color: white;
            }

            /* Clickable date styling */
            .JO-timeline-day {
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }

            .JO-timeline-day:hover {
                background-color: var(--jo-primary-light, #e0e8ff);
            }

            .JO-timeline-day.date-selected {
                background-color: var(--jo-primary, #3366ff);
                color: white;
            }

            .JO-timeline-day.date-selected::after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid var(--jo-primary, #3366ff);
            }

            /* Optimize page layout for 100% viewport height */
            .JO-dashboard-container {
                display: flex;
                flex-direction: column;
                min-height: 100vh;
                padding: 20px;
            }

            .JO-main-content {
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            .JO-stats-row {
                margin-bottom: 20px;
            }

            .JO-timeline-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 400px;
            }

            .JO-timeline-card {
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            .JO-timeline-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .JO-timeline-view {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0; /* Allow proper flex behavior */
                overflow: hidden; /* Prevent overflow at this level */
            }

            .JO-timeline-events {
                flex: 1;
                overflow-y: auto;
                min-height: 0; /* Allow proper flex behavior */
                height: 100%; /* Take full height of parent */
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
        const formattedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Replace HTML directly
        todayView.innerHTML = `
            <div class="JO-timeline-day active" style="width: 100%;" data-date="${formattedDate}">
                <span class="JO-day-name">${dayName}</span>
                <span class="JO-day-date">${month} ${date}</span>
            </div>
        `;

        // Add click event listener
        addDateClickHandlers('#timeline-today-view');
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
            const formattedDate = day.toISOString().split('T')[0]; // YYYY-MM-DD format

            weekHTML += `
                <div class="JO-timeline-day ${isToday ? 'active' : ''}" data-date="${formattedDate}">
                    <span class="JO-day-name">${dayName}</span>
                    <span class="JO-day-date">${month} ${date}</span>
                </div>
            `;
        }

        // Replace week view HTML
        weekView.innerHTML = weekHTML;

        // Add click event listeners
        addDateClickHandlers('#timeline-week-view');
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

            // Use the middle of the week as the representative date for the week
            const midWeek = new Date(weekStart);
            midWeek.setDate(weekStart.getDate() + 3); // Wednesday
            const formattedDate = midWeek.toISOString().split('T')[0]; // YYYY-MM-DD format

            // Format like "Apr 1-7"
            let dateRange;
            if (startMonth === endMonth) {
                dateRange = `${startMonth} ${startDate}-${endDate}`;
            } else {
                dateRange = `${startMonth} ${startDate}-${endMonth} ${endDate}`;
            }

            monthHTML += `
                <div class="JO-timeline-day ${isCurrentWeek ? 'active' : ''}" data-date="${formattedDate}">
                    <span class="JO-day-name">Week ${i + 1}</span>
                    <span class="JO-day-date">${dateRange}</span>
                </div>
            `;
        }

        // Replace month view HTML
        monthView.innerHTML = monthHTML;

        // Add click event listeners
        addDateClickHandlers('#timeline-month-view');
    }

    console.log('Timeline days/dates updated at', new Date().toLocaleTimeString());
}

/**
 * Adds click event handlers to timeline day elements
 * @param {string} containerSelector - The selector for the container element
 */
function addDateClickHandlers(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const days = container.querySelectorAll('.JO-timeline-day');
    days.forEach(day => {
        day.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            if (!date) return;

            // Toggle selection - if already selected, clear the filter
            const isAlreadySelected = this.classList.contains('date-selected');

            // Remove selected class from all days
            days.forEach(d => d.classList.remove('date-selected'));

            // Get the timeline view element
            const timelineView = document.querySelector(containerSelector);

            if (isAlreadySelected) {
                // Clear the filter
                timelineView.removeAttribute('data-selected-date');
            } else {
                // Add selected class to clicked day
                this.classList.add('date-selected');

                // Set the selected date on the timeline view
                timelineView.setAttribute('data-selected-date', date);
            }

            // Refresh the timeline with the selected date filter
            const viewType = containerSelector.replace('#', '').replace('-view', '');
            refreshTimeline(viewType);
        });
    });
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

        // Update responsive layout based on content
        handleResponsiveLayout();
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
                    <div class="JO-deadline-requestor-info">
                        <span class="JO-deadline-requestor">Requestor: <strong>${deadline.requestor || 'Unknown'}</strong></span>
                        <span class="JO-deadline-department">Department/Line: <em>${deadline.department || 'N/A'}</em></span>
                    </div>
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

    // Update responsive layout based on content
    handleResponsiveLayout();

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

        // Update responsive layout based on content
        handleResponsiveLayout();
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

            // Get requestor and department info if available
            const requestor = alert.requestor || 'Unknown';
            const department = alert.department || 'N/A';

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
                    <div class="JO-alert-requestor-info">
                        <span class="JO-alert-requestor">Requestor: <strong>${requestor}</strong></span>
                        <span class="JO-alert-department">Department/Line: <em>${department}</em></span>
                    </div>
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

    // Update responsive layout based on content
    handleResponsiveLayout();

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