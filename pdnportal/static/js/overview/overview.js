/**
 * UniSync - Dashboard Implementation
 * Enhanced with calendar functionality, improved widget behaviors, and responsive design
 */

// Main configuration and global variables
const WIDGET_STORAGE_KEY = 'unisync_dashboard_widgets';
const DEFAULT_WIDGETS = ['quicknotes', 'calendar', 'jo-requestor-chart', 'manhours-chart'];
const API_ENDPOINTS = {
    layout: {
        get: '/overview/api/layout/',
        save: '/overview/api/layout/save/'
    },
    notes: {
        get: '/overview/api/notes/',
        create: '/overview/api/notes/',
        delete: '/overview/api/notes/delete/'
    },
    calendar: {
        get: '/overview/api/calendar/',
        create: '/overview/api/calendar/',
        update: '/overview/api/calendar/update/',
        delete: '/overview/api/calendar/delete/'
    }
};

// URLs for dynamically loaded libraries
const CALENDAR_LIBS = {
    css: 'https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css',
    js: 'https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js'
};

// Track loaded libraries
const loadedLibraries = {
    calendar: false
};

// Global state for widgets and user
let widgets = [];
let currentUser = {
    roles: []
};

// Dashboard edit mode state
let isEditMode = false;
let draggedWidget = null;
let currentDropTarget = null;

document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // Element References
    // ============================================
    const dashboardGrid = document.getElementById('dashboard-grid');
    const addWidgetBtn = document.getElementById('add-widget-btn');
    const closeWidgetModalBtn = document.getElementById('close-widget-modal');
    const widgetSelection = document.getElementById('widget-selection');
    const saveLayoutBtn = document.getElementById('save-layout-btn');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const dashboardSettingsBtn = document.getElementById('dashboard-settings-btn');
    const calendarEventModal = document.getElementById('calendar-event-modal');
    const toastContainer = document.getElementById('toast-container');

    // Error checking for critical elements
    if (!dashboardGrid) {
        console.error('Dashboard grid element not found');
        return;
    }

    // ============================================
    // Initialization Functions
    // ============================================

    // Main initialization function
    function initDashboard() {
        // First, fetch user roles to determine available widgets
        fetchUserRoles()
            .then(() => {
                // Load saved dashboard or initialize with defaults
                loadDashboard();

                // Initialize modal content
                initWidgetSelectionModal();

                // Initialize event listeners
                initEventListeners();

                // Start in locked mode (no dragging/resizing)
                lockDashboard();

                // Initialize dashboard settings
                initDashboardSettings();

                console.log('Dashboard initialized successfully');
            })
            .catch(error => {
                console.error('Dashboard initialization error:', error);
                showToast('Error initializing dashboard', 'error');
            });
    }

    // ============================================
    // User Role & Permission Functions
    // ============================================

    // Fetch user roles to determine available widgets
    function fetchUserRoles() {
        return new Promise((resolve) => {
            // In a real app, you would make an AJAX call to get user roles
            // For now, we'll extract roles from data attributes on widget templates
            const templates = document.querySelectorAll('.widget-template');
            const roles = new Set();

            templates.forEach(template => {
                const roleAttr = template.getAttribute('data-role');
                if (roleAttr) {
                    roleAttr.split(' ').forEach(role => roles.add(role));
                }
            });

            // Simulate user roles - in production this would come from the server
            // Check if any of these classes exist on the body to determine user role
            roles.forEach(role => {
                if (document.body.classList.contains(role)) {
                    currentUser.roles.push(role);
                }
            });

            // For demo purposes - add some default roles if none are found
            if (currentUser.roles.length === 0) {
                currentUser.roles = ['job_order_requestor', 'manhours_staff'];
            }

            resolve();
        });
    }

    // Check if user has a specific role
    function hasRole(roleStr) {
        if (!roleStr) return true;

        const roles = roleStr.split(' ');
        return roles.some(role => currentUser.roles.includes(role));
    }

    // ============================================
    // Dashboard & Widget Loading Functions
    // ============================================

    // Load dashboard from local storage or initialize with defaults
    function loadDashboard() {
        try {
            // Try to load from server first
            fetch(API_ENDPOINTS.layout.get)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to load layout from server');
                    }
                    return response.json();
                })
                .then(data => {
                    // If we got data from server, use it
                    if (data && Array.isArray(data.layout_data) && data.layout_data.length > 0) {
                        widgets = data.layout_data;
                        renderWidgets();
                    } else {
                        // Otherwise try local storage
                        const savedWidgets = localStorage.getItem(WIDGET_STORAGE_KEY);

                        if (savedWidgets) {
                            widgets = JSON.parse(savedWidgets);
                            renderWidgets();
                            // Save this to server for future use
                            saveLayoutToServer().catch(e => console.error('Error saving local layout to server:', e));
                        } else {
                            // Initialize with default widgets
                            initializeDefaultLayout();
                        }
                    }
                })
                .catch(error => {
                    console.error('Error loading from server, trying local storage:', error);
                    // Try local storage as fallback
                    const savedWidgets = localStorage.getItem(WIDGET_STORAGE_KEY);

                    if (savedWidgets) {
                        widgets = JSON.parse(savedWidgets);
                        renderWidgets();
                    } else {
                        // Initialize with default widgets
                        initializeDefaultLayout();
                    }
                });
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showToast('Error loading your dashboard', 'error');

            // Clear dashboard grid and show error
            dashboardGrid.innerHTML = `
                <div class="dashboard-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Dashboard</h3>
                    <p>There was a problem loading your dashboard. Please try refreshing the page.</p>
                </div>
            `;
        }
    }

    // Initialize default layout with widgets
    function initializeDefaultLayout() {
        // Clear any existing widgets
        widgets = [];

        // Initialize with widgets in a 4-column layout
        const notesWidget = {
            id: generateWidgetId(),
            type: 'quicknotes',
            x: 0,  // Start at first column
            y: 0,  // Start at first row
            w: 1,  // Width of 1 grid cell
            h: 1   // Height of 1 grid cell
        };

        const calendarWidget = {
            id: generateWidgetId(),
            type: 'calendar',
            x: 1,  // Start at second column
            y: 0,  // Start at first row
            w: 1,  // Width of 1 grid cell
            h: 1   // Height of 1 grid cell
        };

        const chartWidget = {
            id: generateWidgetId(),
            type: 'jo-requestor-chart',
            x: 2,  // Start at third column
            y: 0,  // Start at first row
            w: 1,  // Width of 1 grid cell
            h: 1   // Height of 1 grid cell
        };

        const monitoringWidget = {
            id: generateWidgetId(),
            type: 'manhours-chart',
            x: 3,  // Start at fourth column
            y: 0,  // Start at first row
            w: 1,  // Width of 1 grid cell
            h: 1   // Height of 1 grid cell
        };

        widgets.push(notesWidget, calendarWidget, chartWidget, monitoringWidget);

        // Add DCF widgets if user has the appropriate roles
        if (hasRole('dcf_requestor')) {
            const dcfRequestorWidget = {
                id: generateWidgetId(),
                type: 'dcf-requestor-chart',
                x: 0,  // Start at first column
                y: 1,  // Start at second row
                w: 2,  // Width of 2 grid cells
                h: 1   // Height of 1 grid cell
            };
            widgets.push(dcfRequestorWidget);
        }

        if (hasRole('dcf_approver')) {
            const dcfApproverWidget = {
                id: generateWidgetId(),
                type: 'dcf-approver-chart',
                x: 2,  // Start at third column
                y: 1,  // Start at second row
                w: 2,  // Width of 2 grid cells
                h: 1   // Height of 1 grid cell
            };
            widgets.push(dcfApproverWidget);
        }

        renderWidgets();

        // Save the default layout
        saveDashboard();
    }

    // Save dashboard layout to local storage and server
    function saveDashboard() {
        try {
            // Save to local storage first
            localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(widgets));

            // Then try to save to server
            saveLayoutToServer()
                .then(() => {
                    showToast('Dashboard layout saved', 'success');
                })
                .catch(error => {
                    console.error('Error saving to server, using local storage instead:', error);
                    showToast('Dashboard layout saved locally', 'info');
                });
        } catch (error) {
            console.error('Error saving dashboard:', error);
            showToast('Error saving dashboard layout', 'error');
        }
    }

    // Save layout to server
    async function saveLayoutToServer() {
        const csrfToken = getCsrfToken();

        const response = await fetch(API_ENDPOINTS.layout.save, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(widgets)
        });

        if (!response.ok) {
            throw new Error('Failed to save layout to server');
        }

        return await response.json();
    }

    // Render all widgets in the dashboard
    function renderWidgets(animate = false) {
        // Clear dashboard before rendering
        dashboardGrid.innerHTML = '';

        // Sort widgets by their position
        widgets.sort((a, b) => {
            if (a.y === b.y) return a.x - b.x;
            return a.y - b.y;
        });

        // Render each widget
        widgets.forEach((widget, index) => {
            const widgetElement = createWidgetElement(widget);
            dashboardGrid.appendChild(widgetElement);

            // If animating, add a slide animation
            if (animate) {
                widgetElement.style.animation = 'none';
                setTimeout(() => {
                    widgetElement.style.animation = `slide-in 0.3s ease ${index * 0.05}s forwards`;
                }, 10);
            }

            // Initialize widget content based on type
            initializeWidgetContent(widget.id, widget.type);
        });
    }

    // Create widget DOM element
    function createWidgetElement(widget) {
        const widgetEl = document.createElement('div');
        widgetEl.id = widget.id;
        widgetEl.className = 'widget';
        widgetEl.setAttribute('data-type', widget.type);
        widgetEl.setAttribute('data-x', widget.x);
        widgetEl.setAttribute('data-y', widget.y);
        widgetEl.setAttribute('data-w', widget.w);
        widgetEl.setAttribute('data-h', widget.h);

        // Set explicit grid position and span
        widgetEl.style.gridColumn = `${widget.x + 1} / span ${widget.w}`;
        widgetEl.style.gridRow = `${widget.y + 1} / span ${widget.h}`;

        // Widget header
        let headerIcon = getWidgetIcon(widget.type);
        let headerTitle = getWidgetTitle(widget.type);

        widgetEl.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">
                    <i class="${headerIcon}"></i>
                    ${headerTitle}
                </h3>
                <div class="widget-actions">
                    <button class="widget-action-btn widget-refresh" title="Refresh">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="widget-action-btn widget-remove" title="Remove Widget">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="widget-content" id="${widget.id}-content">
                <div class="widget-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading widget...</p>
                </div>
            </div>
            <div class="widget-resize-handle"></div>
        `;

        return widgetEl;
    }

    // Get icon class for widget type
    function getWidgetIcon(type) {
        const icons = {
            'quicknotes': 'fas fa-sticky-note',
            'calendar': 'fas fa-calendar-alt',
            'jo-requestor-chart': 'fas fa-chart-bar',
            'jo-approver-chart': 'fas fa-chart-line',
            'jo-maintenance-trends': 'fas fa-chart-area',
            'jo-upcoming-deadlines': 'fas fa-hourglass-half',
            'jo-analytics': 'fas fa-chart-pie',
            'maintenance-workload': 'fas fa-tasks',
            'manhours-chart': 'fas fa-clock',
            'machine-performance': 'fas fa-cogs',
            'monitoring-chart': 'fas fa-chart-line',
            'dcf-requestor-chart': 'fas fa-file-alt',
            'dcf-approver-chart': 'fas fa-clipboard-check'
        };

        return icons[type] || 'fas fa-th-large';
    }

    // Get title for widget type
    function getWidgetTitle(type) {
        const titles = {
            'quicknotes': 'Quick Notes',
            'calendar': 'Calendar',
            'jo-requestor-chart': 'Job Order Trends',
            'jo-approver-chart': 'Approval Analytics',
            'jo-maintenance-trends': 'Job Order Trends',
            'jo-upcoming-deadlines': 'Upcoming Deadlines',
            'jo-analytics': 'Job Order Analytics',
            'maintenance-workload': 'Maintenance Workload',
            'manhours-chart': 'Manhours Data',
            'machine-performance': 'Machine Performance',
            'monitoring-chart': 'Monitoring Dashboard',
            'dcf-requestor-chart': 'DCF Request Status',
            'dcf-approver-chart': 'DCF Approval Analytics'
        };

        return titles[type] || 'Widget';
    }

    // ============================================
    // Widget Content Initialization
    // ============================================

    // Initialize widget content based on type
    function initializeWidgetContent(widgetId, widgetType) {
        const contentContainer = document.getElementById(`${widgetId}-content`);

        if (!contentContainer) return;

        // Log widget type for debugging
        console.log(`Initializing widget: ${widgetId} with type: ${widgetType}`);

        // Clear container
        contentContainer.innerHTML = '';

        // Normalize widget type to handle potential case mismatches
        const normalizedType = widgetType.toLowerCase();

        switch (normalizedType) {
            case 'quicknotes':
                initQuickNotesWidget(widgetId, contentContainer);
                break;
            case 'calendar':
                initCalendarWidget(widgetId, contentContainer);
                break;
            case 'jo-requestor-chart':
            case 'jorequestorchart':
                initJobOrderChart(widgetId, contentContainer, '/joborder/chart-data/6month/');
                break;
            case 'jo-approver-chart':
            case 'joapproverchart':
                initJobOrderChart(widgetId, contentContainer, '/joborder/job-order-chart-data/6month/');
                break;
            case 'jo-maintenance-trends':
            case 'jomaintenancetrends':
                initJobOrderChart(widgetId, contentContainer, '/joborder/api/get_job_order_trends/');
                break;
            case 'jo-upcoming-deadlines':
            case 'joupcomingdeadlines':
                initUpcomingDeadlinesWidget(widgetId, contentContainer);
                break;
            case 'jo-analytics':
            case 'joanalytics':
                initJobOrderChart(widgetId, contentContainer, '/joborder/analytics/');
                break;
            case 'maintenance-workload':
            case 'maintenanceworkload':
                initJobOrderChart(widgetId, contentContainer, '/joborder/workload/');
                break;
            case 'manhours-chart':
            case 'manhourschart':
                initManhourChart(widgetId, contentContainer, '/manhours/chart-data/');
                break;
            case 'machine-performance':
            case 'machineperformance':
                initManhourChart(widgetId, contentContainer, '/manhours/machine-performance/');
                break;
            case 'monitoring-chart':
            case 'monitoringchart':
                initMonitoringChart(widgetId, contentContainer, '/monitoring/chart-data/month/');
                break;
            case 'dcf-requestor-chart':
            case 'dcfrequestorchart':
            case 'dcfrequestor':
            case 'dcf-requestor':
                initDCFRequestorChart(widgetId, contentContainer, '/dcf/api/requestor-chart-data/6month/');
                break;
            case 'dcf-approver-chart':
            case 'dcfapproverchart':
            case 'dcfapprover':
            case 'dcf-approver':
                initDCFApproverChart(widgetId, contentContainer, '/dcf/api/approver-chart-data/6month/');
                break;
            default:
                contentContainer.innerHTML = `
                    <div class="widget-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Unknown widget type</p>
                    </div>
                `;
        }
    }

    // Initialize Quick Notes widget
    function initQuickNotesWidget(widgetId, container) {
        // Create notes UI
        container.innerHTML = `
            <div class="notes-container">
                <div class="notes-list" id="${widgetId}-notes-list">
                    <div class="notes-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading notes...</p>
                    </div>
                </div>
                <div class="note-input">
                    <textarea id="${widgetId}-note-input" placeholder="Write a note..." rows="2"></textarea>
                    <button class="note-add-btn" id="${widgetId}-note-add">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;

        // Load notes from server
        loadNotesFromServer(widgetId);

        // Add event listeners
        const noteInput = document.getElementById(`${widgetId}-note-input`);
        const addNoteBtn = document.getElementById(`${widgetId}-note-add`);

        addNoteBtn.addEventListener('click', () => {
            addNoteToServer(noteInput.value, widgetId);
        });

        noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addNoteToServer(noteInput.value, widgetId);
            }
        });
    }

    // Load notes from server
    async function loadNotesFromServer(widgetId) {
        const notesList = document.getElementById(`${widgetId}-notes-list`);

        try {
            const response = await fetch(`${API_ENDPOINTS.notes.get}${widgetId}/`);

            if (!response.ok) {
                throw new Error('Failed to load notes from server');
            }

            const data = await response.json();

            // Clear notes list
            notesList.innerHTML = '';

            if (data.notes.length === 0) {
                notesList.innerHTML = '<p class="no-notes">No notes yet. Add one below!</p>';
                return;
            }

            // Render notes
            data.notes.forEach(note => {
                const noteElement = createNoteElement(note, widgetId);
                notesList.appendChild(noteElement);
            });
        } catch (error) {
            console.error('Error loading notes:', error);

            // Try to load from local storage as fallback
            loadNotesFromLocalStorage(widgetId);
        }
    }

    // Load notes from local storage as fallback
    function loadNotesFromLocalStorage(widgetId) {
        const notesList = document.getElementById(`${widgetId}-notes-list`);
        const notesKey = `unisync_notes_${widgetId}`;

        try {
            const savedNotes = localStorage.getItem(notesKey);

            // Clear notes list
            notesList.innerHTML = '';

            if (!savedNotes) {
                notesList.innerHTML = '<p class="no-notes">No notes yet. Add one below!</p>';
                return;
            }

            const notes = JSON.parse(savedNotes);

            if (notes.length === 0) {
                notesList.innerHTML = '<p class="no-notes">No notes yet. Add one below!</p>';
                return;
            }

            // Render notes
            notes.forEach(note => {
                const noteElement = createNoteElement(note, widgetId);
                notesList.appendChild(noteElement);
            });
        } catch (error) {
            console.error('Error loading notes from local storage:', error);
            notesList.innerHTML = '<p class="notes-error">Error loading notes. Please try refreshing the page.</p>';
        }
    }

    // Add a note to the server
    async function addNoteToServer(text, widgetId) {
        const noteInput = document.getElementById(`${widgetId}-note-input`);
        const notesList = document.getElementById(`${widgetId}-notes-list`);

        // Validate input
        if (!text.trim()) {
            noteInput.focus();
            return;
        }

        try {
            // Send to server
            const csrfToken = getCsrfToken();
            const response = await fetch(`${API_ENDPOINTS.notes.create}${widgetId}/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ content: text.trim() })
            });

            if (!response.ok) {
                throw new Error('Failed to save note to server');
            }

            const data = await response.json();

            // Remove "no notes" message if it exists
            const noNotesMsg = notesList.querySelector('.no-notes');
            if (noNotesMsg) {
                noNotesMsg.remove();
            }

            // Create note element
            const noteElement = createNoteElement(data.note, widgetId);

            // Add to beginning of list
            notesList.insertBefore(noteElement, notesList.firstChild);

            // Clear input
            noteInput.value = '';
            noteInput.focus();

            // Show animation
            noteElement.style.animation = 'none';
            void noteElement.offsetWidth; // Trigger reflow
            noteElement.style.animation = 'pulse 0.3s ease';

            // Also save to local storage as backup
            saveNotesToLocalStorage(widgetId);

        } catch (error) {
            console.error('Error saving note to server:', error);

            // Fallback to local storage
            addNoteToLocalStorage(text, widgetId);
        }
    }

    // Add a note to local storage as fallback
    function addNoteToLocalStorage(text, widgetId) {
        const noteInput = document.getElementById(`${widgetId}-note-input`);
        const notesList = document.getElementById(`${widgetId}-notes-list`);
        const notesKey = `unisync_notes_${widgetId}`;

        // Validate input
        if (!text.trim()) {
            noteInput.focus();
            return;
        }

        // Create new note object
        const newNote = {
            id: Date.now(),
            content: text.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Add to DOM
        const noteElement = createNoteElement(newNote, widgetId);

        // Remove "no notes" message if it exists
        const noNotesMsg = notesList.querySelector('.no-notes');
        if (noNotesMsg) {
            noNotesMsg.remove();
        }

        // Add to beginning of list
        notesList.insertBefore(noteElement, notesList.firstChild);

        // Clear input
        noteInput.value = '';
        noteInput.focus();

        // Save to local storage
        saveNotesToLocalStorage(widgetId);

        // Show animation
        noteElement.style.animation = 'none';
        void noteElement.offsetWidth; // Trigger reflow
        noteElement.style.animation = 'pulse 0.3s ease';
    }

    // Delete a note
    async function deleteNote(noteId, widgetId) {
        const noteElement = document.querySelector(`#${widgetId}-notes-list .note-item[data-id="${noteId}"]`);

        if (!noteElement) return;

        // Add animation
        noteElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        noteElement.style.transform = 'translateX(50px)';
        noteElement.style.opacity = '0';

        try {
            // Send delete request to server
            const csrfToken = getCsrfToken();
            const response = await fetch(`${API_ENDPOINTS.notes.delete}${noteId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete note from server');
            }

        } catch (error) {
            console.error('Error deleting note from server:', error);
            // We'll still remove from DOM and local storage even if server fails
        }

        // Remove after animation
        setTimeout(() => {
            noteElement.remove();

            // Check if there are no notes left
            const notesList = document.getElementById(`${widgetId}-notes-list`);
            if (notesList.children.length === 0) {
                notesList.innerHTML = '<p class="no-notes">No notes yet. Add one below!</p>';
            }

            // Save changes to local storage as backup
            saveNotesToLocalStorage(widgetId);
        }, 300);
    }

    // Create note element
    function createNoteElement(note, widgetId) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.setAttribute('data-id', note.id);

        noteElement.innerHTML = `
            <div class="note-content">${note.content}</div>
            <div class="note-date">${formatDate(new Date(note.created_at))}</div>
            <button class="note-delete" title="Delete Note">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add delete event listener
        const deleteBtn = noteElement.querySelector('.note-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(note.id, widgetId);
        });

        return noteElement;
    }

    // Save notes to local storage (as backup)
    function saveNotesToLocalStorage(widgetId) {
        const notesList = document.getElementById(`${widgetId}-notes-list`);
        const noteElements = notesList.querySelectorAll('.note-item');
        const notesKey = `unisync_notes_${widgetId}`;
        const notes = [];

        noteElements.forEach(noteEl => {
            const id = parseInt(noteEl.getAttribute('data-id'));
            const content = noteEl.querySelector('.note-content').textContent;

            notes.push({
                id: id,
                content: content,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        });

        try {
            localStorage.setItem(notesKey, JSON.stringify(notes));
        } catch (error) {
            console.error('Error saving notes to local storage:', error);
        }
    }

    // ============================================
    // Calendar Widget Functions
    // ============================================

    // Initialize Calendar widget
    function initCalendarWidget(widgetId, container) {
        // Add fullheight class to container
        container.classList.add('fullheight');

        // Create calendar container
        container.innerHTML = `
            <div class="calendar-container" id="${widgetId}-calendar">
                <div class="widget-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading calendar...</p>
                </div>
            </div>
        `;

        // Try to fetch events from the server first
        fetchCalendarEvents(widgetId)
            .then(events => {
                // Load calendar with fetched events
                loadCalendar(widgetId, events);
            })
            .catch(error => {
                console.error('Error fetching calendar events:', error);

                // Fallback to localStorage
                let events = [];
                try {
                    const eventsKey = `unisync_events_${widgetId}`;
                    const savedEvents = localStorage.getItem(eventsKey);
                    if (savedEvents) {
                        events = JSON.parse(savedEvents);
                    }
                } catch (e) {
                    console.error('Error reading events from localStorage:', e);
                }

                // Load calendar with local events
                loadCalendar(widgetId, events);
            });
    }

    // Fetch calendar events from server
    async function fetchCalendarEvents(widgetId) {
        try {
            const response = await fetch(`${API_ENDPOINTS.calendar.get}${widgetId}/`);

            if (!response.ok) {
                throw new Error('Failed to fetch calendar events');
            }

            const data = await response.json();
            return data.events || [];
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            throw error;
        }
    }

    // Load calendar with events
    function loadCalendar(widgetId, events) {
        // Try to load the calendar library dynamically
        loadCalendarLibrary()
            .then(() => {
                // Initialize FullCalendar
                const calendarEl = document.getElementById(`${widgetId}-calendar`);
                if (!calendarEl) {
                    throw new Error('Calendar container not found');
                }

                // Clear loading indicator
                calendarEl.innerHTML = '';

                const calendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridMonth',
                    headerToolbar: {
                        left: '',
                        center: 'prev title next',
                        right: 'today,dayGridMonth,timeGridWeek,timeGridDay'
                    },
                    events: events,
                    height: '100%',
                    editable: true,
                    selectable: true,
                    selectMirror: true,
                    dayMaxEvents: true,
                    // Date click handler - open event creation modal
                    dateClick: function(info) {
                        openEventModal(widgetId, info.date, null);
                    },
                    // Event click handler - open event modal with existing event data
                    eventClick: function(info) {
                        openEventModal(widgetId, null, info.event);
                    },
                    // Event update handlers
                    eventDrop: function(info) {
                        saveCalendarEvent(calendar, widgetId);

                        // Update event on server
                        const eventData = {
                            id: info.event.id,
                            title: info.event.title,
                            start: info.event.startStr,
                            end: info.event.endStr,
                            allDay: info.event.allDay,
                            // Include extendedProps if available
                            ...info.event.extendedProps
                        };
                        updateEventOnServer(eventData);

                        showToast('Event updated', 'success');
                    },
                    eventResize: function(info) {
                        saveCalendarEvent(calendar, widgetId);

                        // Update event on server
                        const eventData = {
                            id: info.event.id,
                            title: info.event.title,
                            start: info.event.startStr,
                            end: info.event.endStr,
                            allDay: info.event.allDay,
                            // Include extendedProps if available
                            ...info.event.extendedProps
                        };
                        updateEventOnServer(eventData);

                        showToast('Event updated', 'success');
                    },
                    // Apply event classes based on category and priority
                    eventDidMount: function(info) {
                        const event = info.event;
                        const category = event.extendedProps.category || 'other';
                        const priority = event.extendedProps.priority || 'medium';
                        const completed = event.extendedProps.completed || false;

                        info.el.classList.add(`category-${category}`);
                        info.el.classList.add(`priority-${priority}`);

                        if (completed) {
                            info.el.classList.add('event-completed');
                        }
                    }
                });

                // Store calendar in element data for later access
                calendarEl.calendar = calendar;

                // Initialize animation
                setTimeout(() => {
                    calendar.render();
                }, 100);

                // Refresh calendar when widget is resized
                const widgetElement = document.getElementById(widgetId);
                if (widgetElement && 'ResizeObserver' in window) {
                    const resizeObserver = new ResizeObserver(() => {
                        calendar.updateSize();
                    });

                    resizeObserver.observe(widgetElement);
                }
            })
            .catch(error => {
                console.error('Error initializing calendar:', error);

                // Show fallback calendar UI
                const calendarContainer = document.getElementById(`${widgetId}-calendar`);
                if (calendarContainer) {
                    calendarContainer.innerHTML = `
                        <div class="simple-calendar">
                            <div class="simple-calendar-header">
                                <button class="btn btn-icon" id="${widgetId}-prev-month">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <h3 id="${widgetId}-calendar-title">${getCurrentMonthYear()}</h3>
                                <button class="btn btn-icon" id="${widgetId}-next-month">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                            <div class="simple-calendar-grid" id="${widgetId}-calendar-grid"></div>
                            <div class="simple-calendar-events" id="${widgetId}-events-list">
                                <h4>Events</h4>
                                <p class="no-events">No events for selected date</p>
                            </div>
                        </div>
                    `;

                    // Initialize simple calendar
                    initSimpleCalendar(widgetId, events);
                }
            });
    }

    function openEventModal(widgetId, date, event) {
        const modal = document.getElementById('calendar-event-modal');
        const modalTitle = document.getElementById('event-modal-title');
        const form = document.getElementById('event-form');
        const deleteButton = document.getElementById('delete-event-btn');

        if (!modal || !form) return;

        // Reset form
        form.reset();

        // Set widget ID
        document.getElementById('widget-id').value = widgetId;

        // Set selected date if provided
        if (date) {
            document.getElementById('event-selected-date').value = formatDateForInput(date);
            document.getElementById('event-start-date').value = formatDateForInput(date);

            // Set end date same as start date by default
            document.getElementById('event-end-date').value = formatDateForInput(date);
        }

        // If editing existing event
        if (event) {
            // Update modal title
            if (modalTitle) modalTitle.textContent = 'Edit Event';

            // Set form values from event
            document.getElementById('event-id').value = event.id;
            document.getElementById('event-title').value = event.title;

            // Set description if available
            if (event.extendedProps && event.extendedProps.description) {
                document.getElementById('event-description').value = event.extendedProps.description;
            }

            // Set dates
            const startDate = event.start ? formatDateForInput(event.start) : '';
            const endDate = event.end ? formatDateForInput(event.end) : startDate;

            document.getElementById('event-start-date').value = startDate;
            document.getElementById('event-end-date').value = endDate;

            // Set times if not all day
            if (!event.allDay && event.start) {
                document.getElementById('event-start-time').value = formatTimeForInput(event.start);
                if (event.end) {
                    document.getElementById('event-end-time').value = formatTimeForInput(event.end);
                }
            }

            // Set all day checkbox
            document.getElementById('event-all-day').checked = event.allDay;

            // Set other properties if available
            if (event.extendedProps) {
                // Set category
                if (event.extendedProps.category) {
                    document.getElementById('event-category').value = event.extendedProps.category;
                }

                // Set priority
                if (event.extendedProps.priority) {
                    document.getElementById('event-priority').value = event.extendedProps.priority;
                }

                // Set location
                if (event.extendedProps.location) {
                    document.getElementById('event-location').value = event.extendedProps.location;
                }

                // Set attendees
                if (event.extendedProps.attendees) {
                    document.getElementById('event-attendees').value =
                        Array.isArray(event.extendedProps.attendees)
                        ? event.extendedProps.attendees.join(', ')
                        : event.extendedProps.attendees;
                }

                // Set completed
                if (event.extendedProps.completed !== undefined) {
                    document.getElementById('event-completed').checked = event.extendedProps.completed;
                }
            }

            // Show delete button
            if (deleteButton) deleteButton.style.display = 'block';
        } else {
            // Creating new event
            if (modalTitle) modalTitle.textContent = 'Add New Event';

            // Hide delete button
            if (deleteButton) deleteButton.style.display = 'none';
        }

        // Open modal
        openModal(modal);
    }

    function formatTimeForInput(date) {
        if (!date) return '';

        if (typeof date === 'string') {
            date = new Date(date);
        }

        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${hours}:${minutes}`;
    }

    // Initialize a simple calendar as fallback when FullCalendar fails to load
    function initSimpleCalendar(widgetId, events = []) {
        const currentDate = new Date();
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();

        // Get elements
        const calendarTitle = document.getElementById(`${widgetId}-calendar-title`);
        const calendarGrid = document.getElementById(`${widgetId}-calendar-grid`);
        const prevMonthBtn = document.getElementById(`${widgetId}-prev-month`);
        const nextMonthBtn = document.getElementById(`${widgetId}-next-month`);
        const eventsList = document.getElementById(`${widgetId}-events-list`);

        // Add event listeners
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderSimpleCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderSimpleCalendar();
        });

        // Render calendar
        function renderSimpleCalendar() {
            // Update title
            calendarTitle.textContent = `${getMonthName(currentMonth)} ${currentYear}`;

            // Clear grid
            calendarGrid.innerHTML = '';

            // Add day names
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dayNames.forEach(day => {
                const dayNameEl = document.createElement('div');
                dayNameEl.className = 'day-name';
                dayNameEl.textContent = day;
                calendarGrid.appendChild(dayNameEl);
            });

            // Get first day of month
            const firstDay = new Date(currentYear, currentMonth, 1).getDay();

            // Get number of days in month
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

            // Add empty cells for days before first day of month
            for (let i = 0; i < firstDay; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'calendar-day empty';
                calendarGrid.appendChild(emptyDay);
            }

            // Add days
            for (let day = 1; day <= daysInMonth; day++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day';
                dayEl.textContent = day;

                // Check if current day
                const isCurrentDay = day === currentDate.getDate() &&
                                    currentMonth === currentDate.getMonth() &&
                                    currentYear === currentDate.getFullYear();

                if (isCurrentDay) {
                    dayEl.classList.add('current-day');
                }

                // Check if day has events
                const dayEvents = getEventsForDay(day, currentMonth, currentYear);
                if (dayEvents.length > 0) {
                    dayEl.classList.add('has-events');

                    // Add indicator dot
                    const indicator = document.createElement('span');
                    indicator.className = 'event-indicator';
                    dayEl.appendChild(indicator);
                }

                // Add click event
                dayEl.addEventListener('click', () => {
                    // Open event modal for this date
                    const selectedDate = new Date(currentYear, currentMonth, day);
                    openEventModal(widgetId, selectedDate, null);

                    // Remove selected class from all days
                    document.querySelectorAll('.calendar-day').forEach(el => {
                        el.classList.remove('selected');
                    });

                    // Add selected class to clicked day
                    dayEl.classList.add('selected');

                    // Show events for selected day
                    showEventsForDay(day, currentMonth, currentYear);
                });

                calendarGrid.appendChild(dayEl);
            }
        }

        // Get events for a specific day
        function getEventsForDay(day, month, year) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return events.filter(event => {
                const eventDate = new Date(event.start);
                return eventDate.getFullYear() === year &&
                    eventDate.getMonth() === month &&
                    eventDate.getDate() === day;
            });
        }

        // Show events for a specific day
        function showEventsForDay(day, month, year) {
            const dayEvents = getEventsForDay(day, month, year);

            // Clear events list
            eventsList.innerHTML = '<h4>Events</h4>';

            if (dayEvents.length === 0) {
                const noEvents = document.createElement('p');
                noEvents.className = 'no-events';
                noEvents.textContent = 'No events for selected date';
                eventsList.appendChild(noEvents);
                return;
            }

            // Add events
            dayEvents.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.className = 'simple-event';

                // Add priority class
                if (event.priority) {
                    eventEl.classList.add(`priority-${event.priority}`);
                }

                // Add category class
                if (event.category) {
                    eventEl.classList.add(`category-${event.category}`);
                }

                // Add completed class
                if (event.completed) {
                    eventEl.classList.add('event-completed');
                }

                const title = document.createElement('div');
                title.className = 'event-title';
                title.textContent = event.title;

                // Format time
                let timeText = 'All day';
                if (!event.allDay) {
                    const start = new Date(event.start);
                    const end = event.end ? new Date(event.end) : null;
                    timeText = `${formatTime(start)}${end ? ' - ' + formatTime(end) : ''}`;
                }

                const time = document.createElement('div');
                time.className = 'event-time';
                time.textContent = timeText;

                eventEl.appendChild(title);
                eventEl.appendChild(time);

                // Add click event to edit
                eventEl.addEventListener('click', () => {
                    // Find the event in the events array
                    const foundEvent = events.find(e => e.id === event.id);
                    if (foundEvent) {
                        // Create a fake FullCalendar event object
                        const fcEvent = {
                            id: foundEvent.id,
                            title: foundEvent.title,
                            start: new Date(foundEvent.start),
                            end: foundEvent.end ? new Date(foundEvent.end) : null,
                            allDay: foundEvent.allDay,
                            extendedProps: {
                                description: foundEvent.description,
                                category: foundEvent.category,
                                priority: foundEvent.priority,
                                location: foundEvent.location,
                                attendees: foundEvent.attendees,
                                completed: foundEvent.completed
                            }
                        };
                        openEventModal(widgetId, null, fcEvent);
                    }
                });

                eventsList.appendChild(eventEl);
            });
        }

        // Initial render
        renderSimpleCalendar();
    }

    // Helper functions for calendar
    function getCurrentMonthYear() {
        const date = new Date();
        return `${getMonthName(date.getMonth())} ${date.getFullYear()}`;
    }

    function getMonthName(month) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month];
    }

    function formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // Save calendar events to localStorage and server
    function saveCalendarEvent() {
        const eventForm = document.getElementById('event-form');
        if (!eventForm) return;

        // Disable form to prevent multiple submissions
        const submitButton = document.querySelector('#event-form button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        // Basic validation
        const eventTitle = document.getElementById('event-title');
        if (!eventTitle || !eventTitle.value.trim()) {
            showToast('Event title is required', 'error');
            eventTitle.focus();
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Save';
            }
            return;
        }

        const startDate = document.getElementById('event-start-date');
        if (!startDate || !startDate.value) {
            showToast('Start date is required', 'error');
            startDate.focus();
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Save';
            }
            return;
        }

        // Get form values - do this once to avoid multiple DOM lookups
        const widgetId = document.getElementById('widget-id').value;
        const eventId = document.getElementById('event-id').value || 'new-' + Date.now();
        const title = eventTitle.value.trim();
        const description = document.getElementById('event-description').value.trim();
        const startDateValue = startDate.value;
        const startTime = document.getElementById('event-start-time').value;
        const endDate = document.getElementById('event-end-date').value || startDateValue;
        const endTime = document.getElementById('event-end-time').value || startTime;
        const allDay = document.getElementById('event-all-day').checked;
        const category = document.getElementById('event-category').value;
        const priority = document.getElementById('event-priority').value;
        const location = document.getElementById('event-location').value.trim();

        // Process attendees only once
        const attendeesInput = document.getElementById('event-attendees');
        const attendees = attendeesInput && attendeesInput.value.trim()
            ? attendeesInput.value.split(',').map(a => a.trim())
            : [];

        const completed = document.getElementById('event-completed').checked;

        // Build start and end dates - KEEP ORIGINAL FORMAT for FullCalendar
        let start, end;

        if (allDay) {
            // For all-day events, use date-only format
            start = startDateValue;
            end = endDate;
        } else {
            // For timed events, include the time
            start = startTime ? `${startDateValue}T${startTime}` : startDateValue;
            end = endTime ? `${endDate}T${endTime}` : endDate;
        }

        // Create event object for FullCalendar
        const eventData = {
            id: eventId,
            title: title,
            start: start,
            end: end,
            allDay: allDay,
            description: description,
            category: category,
            priority: priority,
            location: location,
            attendees: attendees,
            completed: completed
        };

        // For database - use properly formatted data that matches Django model
        const dbEventData = {
            id: eventId.toString().startsWith('new-') ? undefined : eventId,
            title: title,
            description: description,
            start_date: formatDateTimeForServer(start, allDay),
            end_date: end ? formatDateTimeForServer(end, allDay) : null,
            all_day: allDay,
            event_type: category,
            priority: priority,
            location: location,
            attendees: attendees,
            completed: completed,
            widget_id: widgetId
        };

        // Add to calendar first (UI update only)
        saveEventToCalendar(widgetId, eventData);

        // Then save to database with a small delay to allow UI to update first
        setTimeout(() => {
            if (eventId.toString().startsWith('new-')) {
                // New event - create
                createEventOnServer(widgetId, dbEventData)
                    .then(() => {
                        // Re-enable form button
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.innerHTML = 'Save';
                        }
                    });
            } else {
                // Existing event - update
                updateEventOnServer(dbEventData)
                    .then(() => {
                        // Re-enable form button
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.innerHTML = 'Save';
                        }
                    });
            }
        }, 50);

        // Close modal immediately for better UX
        closeModal(document.getElementById('calendar-event-modal'));
    }

    // Format date for the server in ISO format
    function formatDateTimeForServer(dateStr, isAllDay) {
        if (!dateStr) return null;

        let date;

        // Handle different input formats
        if (dateStr.includes('T')) {
            // ISO string format: "2023-05-01T14:30:00"
            date = new Date(dateStr);
        } else if (dateStr.includes(':')) {
            // Time only format - unlikely but handle just in case
            const today = new Date();
            const [hours, minutes] = dateStr.split(':').map(Number);
            date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
        } else {
            // Date only format: "2023-05-01"
            if (isAllDay) {
                // For all-day events, use noon to avoid timezone issues
                date = new Date(`${dateStr}T12:00:00`);
            } else {
                // Default to start of day
                date = new Date(`${dateStr}T00:00:00`);
            }
        }

        return date.toISOString();
    }

    // Update an event on the server
    async function updateEventOnServer(eventData) {
        try {
            if (!eventData.id) {
                throw new Error('Event ID is required for updates');
            }

            // Convert field names to match what the server expects
            const serverData = {
                id: eventData.id,
                title: eventData.title,
                start: eventData.start_date, // Use start instead of start_date
                end: eventData.end_date,     // Use end instead of end_date
                allDay: eventData.all_day,   // Use allDay instead of all_day
                type: eventData.event_type,  // Use type instead of event_type
                priority: eventData.priority,
                description: eventData.description,
                location: eventData.location,
                attendees: eventData.attendees,
                completed: eventData.completed
            };

            // Reduce console logging in production
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Updating event with data:', serverData);
            }

            const csrfToken = getCsrfToken();
            const response = await fetch(`/overview/api/calendar/update/${eventData.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify(serverData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error on update:', errorText);
                throw new Error(`Failed to update event: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            showToast('Event updated in database', 'success');
            return data.event;
        } catch (error) {
            console.error('Error updating event:', error);
            showToast('Error updating event: ' + error.message, 'error');
            return null;
        }
    }

    // Helper function to dynamically load scripts
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }

    // Helper function to dynamically load CSS
    function loadCSS(url) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load CSS: ${url}`));
            document.head.appendChild(link);
        });
    }

    // Load calendar library
    async function loadCalendarLibrary() {
        if (loadedLibraries.calendar) {
            return Promise.resolve();
        }

        try {
            // Load CSS first
            await loadCSS(CALENDAR_LIBS.css);

            // Then load JS
            await loadScript(CALENDAR_LIBS.js);

            // Mark as loaded
            loadedLibraries.calendar = true;
            return Promise.resolve();
        } catch (error) {
            console.error('Failed to load calendar library:', error);
            return Promise.reject(error);
        }
    }

    // This function is a duplicate and has been removed to avoid conflicts
    // The main saveCalendarEvent function is defined above

    function saveEventToCalendar(widgetId, eventData) {
        // For FullCalendar instances
        const calendarEl = document.getElementById(`${widgetId}-calendar`);
        if (calendarEl && calendarEl.calendar) {
            const calendarInstance = calendarEl.calendar;

            // Check if we're updating an existing event
            const isUpdate = eventData.id && !eventData.id.toString().includes('-');

            // For updates, remove the old event first
            if (isUpdate) {
                const existingEvent = calendarInstance.getEventById(eventData.id);
                if (existingEvent) {
                    existingEvent.remove();
                }
            }

            // Add event to calendar with extendedProps
            const fullCalendarEvent = {
                id: eventData.id,
                title: eventData.title,
                start: eventData.start,
                end: eventData.end,
                allDay: eventData.allDay,
                extendedProps: {
                    description: eventData.description,
                    category: eventData.category,
                    priority: eventData.priority,
                    location: eventData.location,
                    attendees: eventData.attendees,
                    completed: eventData.completed
                }
            };

            // Add to calendar (UI update only)
            calendarInstance.addEvent(fullCalendarEvent);

            // No need to call saveCalendarEvent here - it causes a recursive loop and performance issues
            // The server save is already handled in the main saveCalendarEvent function

            return;
        }

        // Fallback for simple calendar or if FullCalendar is not available
        const eventsKey = `unisync_events_${widgetId}`;
        let events = [];

        try {
            const savedEvents = localStorage.getItem(eventsKey);
            if (savedEvents) {
                events = JSON.parse(savedEvents);
            }

            // Check if we're updating an existing event
            const isUpdate = eventData.id && !eventData.id.toString().includes('-');

            // Find and update existing event, or add new one
            const existingIndex = events.findIndex(e => e.id === eventData.id);
            if (existingIndex !== -1) {
                events[existingIndex] = eventData;
            } else {
                events.push(eventData);
            }

            // Save updated events to localStorage
            localStorage.setItem(eventsKey, JSON.stringify(events));

            // Refresh simple calendar if active - but only if it's currently visible
            const simpleCalendar = document.querySelector(`.simple-calendar`);
            if (simpleCalendar && simpleCalendar.offsetParent !== null) {
                initSimpleCalendar(widgetId, events);
            }
        } catch (error) {
            console.error('Error saving event:', error);
            showToast('Failed to save event', 'error');
        }
    }

    // Create a new event on the server
    async function createEventOnServer(widgetId, eventData) {
        try {
            // Remove id field for new events
            const { id, ...dataWithoutId } = eventData;

            // Convert field names to match what the server expects
            const serverData = {
                title: dataWithoutId.title,
                start: dataWithoutId.start_date, // Use start instead of start_date
                end: dataWithoutId.end_date,     // Use end instead of end_date
                allDay: dataWithoutId.all_day,   // Use allDay instead of all_day
                type: dataWithoutId.event_type,  // Use type instead of event_type
                priority: dataWithoutId.priority,
                description: dataWithoutId.description,
                location: dataWithoutId.location,
                attendees: dataWithoutId.attendees,
                completed: dataWithoutId.completed,
                widget_id: dataWithoutId.widget_id
            };

            // Reduce console logging in production
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Creating new event with data:', serverData);
            }

            const csrfToken = getCsrfToken();
            const response = await fetch(`/overview/api/calendar/${widgetId}/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify(serverData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`Failed to create event: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Reduce console logging in production
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Event created successfully:', data);
            }

            // Show success message
            showToast('Event saved to database', 'success');

            // Update full calendar with the server-generated ID
            if (data.event && data.event.id) {
                // Use requestAnimationFrame for smoother UI updates
                requestAnimationFrame(() => {
                    updateCalendarEventId(widgetId, eventData.id, data.event.id);
                });
            }

            return data.event;
        } catch (error) {
            console.error('Error creating event on server:', error);
            showToast('Error saving event: ' + error.message, 'error');
            return null;
        }
    }

    // Update event ID in calendar after server save
    function updateCalendarEventId(widgetId, oldId, newId) {
        // Find calendar instance
        const calendarEl = document.getElementById(`${widgetId}-calendar`);
        if (calendarEl && calendarEl.calendar) {
            const calendar = calendarEl.calendar;
            const event = calendar.getEventById(oldId);

            if (event) {
                // Store event data
                const eventData = {
                    id: newId,
                    title: event.title,
                    start: event.start,
                    end: event.end,
                    allDay: event.allDay,
                    extendedProps: event.extendedProps
                };

                // Remove old event
                event.remove();

                // Add new event with server ID - direct UI update only
                calendar.addEvent(eventData);

                // No need to call saveCalendarEvent here - it causes a recursive loop and performance issues
            }
        } else {
            // For simple calendar, update the event ID in local storage
            const eventsKey = `unisync_events_${widgetId}`;
            try {
                const savedEvents = localStorage.getItem(eventsKey);
                if (savedEvents) {
                    const events = JSON.parse(savedEvents);
                    const eventIndex = events.findIndex(e => e.id === oldId);

                    if (eventIndex !== -1) {
                        events[eventIndex].id = newId;
                        localStorage.setItem(eventsKey, JSON.stringify(events));
                    }
                }
            } catch (e) {
                console.error('Error updating event ID in local storage:', e);
            }
        }
    }

    // Update local event with server data (including the new ID)
    function updateLocalEventWithServerData(widgetId, localId, serverEvent) {
        // For FullCalendar instances
        const calendarEl = document.getElementById(`${widgetId}-calendar`);
        if (calendarEl && calendarEl.calendar) {
            const calendarInstance = calendarEl.calendar;
            const event = calendarInstance.getEventById(localId);
            if (event) {
                // Remove the old event
                event.remove();

                // Add new event with server ID and data
                const newEvent = {
                    id: serverEvent.id,
                    title: serverEvent.title,
                    start: serverEvent.start,
                    end: serverEvent.end,
                    allDay: serverEvent.allDay,
                    extendedProps: {
                        description: serverEvent.description,
                        category: serverEvent.event_type || serverEvent.category,
                        priority: serverEvent.priority,
                        location: serverEvent.location || '',
                        attendees: serverEvent.attendees || [],
                        completed: serverEvent.completed
                    }
                };

                // Direct UI update only - no recursive call to saveCalendarEvent
                calendarInstance.addEvent(newEvent);
            }
        } else {
            // Update in localStorage for simple calendar
            const eventsKey = `unisync_events_${widgetId}`;
            try {
                const savedEvents = localStorage.getItem(eventsKey);
                if (savedEvents) {
                    let events = JSON.parse(savedEvents);

                    // Find and update event with server data
                    const eventIndex = events.findIndex(e => e.id === localId);
                    if (eventIndex !== -1) {
                        events[eventIndex] = {
                            id: serverEvent.id,
                            title: serverEvent.title,
                            start: serverEvent.start,
                            end: serverEvent.end,
                            allDay: serverEvent.allDay,
                            description: serverEvent.description,
                            category: serverEvent.event_type || serverEvent.category,
                            priority: serverEvent.priority,
                            location: serverEvent.location || '',
                            attendees: serverEvent.attendees || [],
                            completed: serverEvent.completed
                        };

                        localStorage.setItem(eventsKey, JSON.stringify(events));

                        // Refresh simple calendar if active - but only if it's currently visible
                        const simpleCalendar = document.querySelector(`.simple-calendar`);
                        if (simpleCalendar && simpleCalendar.offsetParent !== null) {
                            initSimpleCalendar(widgetId, events);
                        }
                    }
                }
            } catch (e) {
                console.error('Error updating event ID in localStorage:', e);
            }
        }
    }

    function deleteCalendarEvent() {
        const widgetId = document.getElementById('widget-id').value;
        const eventId = document.getElementById('event-id').value;

        if (!widgetId || !eventId) {
            showToast('Invalid event data', 'error');
            return;
        }

        // Find calendar
        const calendarEl = document.getElementById(`${widgetId}-calendar`);

        // Try FullCalendar first
        if (calendarEl && calendarEl.calendar) {
            const calendarInstance = calendarEl.calendar;
            const event = calendarInstance.getEventById(eventId);

            if (event) {
                // Remove from calendar - direct UI update only
                event.remove();

                // Delete from server
                deleteEventFromServer(eventId);

                showToast('Event deleted', 'success');
                closeModal(document.getElementById('calendar-event-modal'));
                return;
            }
        }

        // Fallback to localStorage for simple calendar
        const eventsKey = `unisync_events_${widgetId}`;

        try {
            const savedEvents = localStorage.getItem(eventsKey);
            if (savedEvents) {
                let events = JSON.parse(savedEvents);

                // Filter out the deleted event
                events = events.filter(e => e.id !== eventId);

                // Save updated events
                localStorage.setItem(eventsKey, JSON.stringify(events));

                // Delete from server
                deleteEventFromServer(eventId);

                showToast('Event deleted', 'success');

                // Refresh simple calendar if active
                if (document.querySelector(`.simple-calendar`)) {
                    initSimpleCalendar(widgetId, events);
                }
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            showToast('Failed to delete event', 'error');
        }

        // Close modal
        closeModal(document.getElementById('calendar-event-modal'));
    }

    // Delete event from server
    async function deleteEventFromServer(eventId) {
        try {
            const csrfToken = getCsrfToken();
            const response = await fetch(`${API_ENDPOINTS.calendar.delete}${eventId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete event from server');
            }

            console.log('Event deleted from server');

        } catch (error) {
            console.error('Error deleting event from server:', error);
            // Event was still deleted from local storage, so just log the error
        }
    }

    // ============================================
    // Chart Widget Functions
    // ============================================

    // Initialize Job Order Chart widgets
    function initJobOrderChart(widgetId, container, url) {
        // Create chart container
        container.innerHTML = `
            <div class="chart-container">
                <div class="chart-controls">
                    <select class="chart-select" id="${widgetId}-period">
                        <option value="3month">Last 3 Months</option>
                        <option value="6month" selected>Last 6 Months</option>
                        <option value="1year">Last Year</option>
                    </select>
                </div>
                <div class="chart-wrapper">
                    <canvas id="${widgetId}-chart"></canvas>
                </div>
            </div>
        `;

        // Add event listener for period selector
        const periodSelector = document.getElementById(`${widgetId}-period`);
        if (periodSelector) {
            periodSelector.addEventListener('change', function() {
                const period = this.value;
                const baseUrl = url.includes('?') ? url.split('?')[0] : url;

                try {
                    if (url.includes('chart-data') || url.includes('job-order-chart-data')) {
                        // For endpoints that accept period in URL
                        fetchChartData(widgetId, baseUrl.replace(/\/[^\/]*\/$/, `/${period}/`), period);
                    } else {
                        // For endpoints that accept period as query param
                        fetchChartData(widgetId, `${baseUrl}?period=${period}`, period);
                    }
                } catch (error) {
                    console.error(`Error updating chart for ${widgetId}:`, error);
                    showToast('Error updating chart', 'error');
                }
            });
        }

        // Initial chart load with error handling
        try {
            fetchChartData(widgetId, url, '6month');
        } catch (error) {
            console.error(`Error initializing chart for ${widgetId}:`, error);
            const chartWrapper = container.querySelector('.chart-wrapper');
            if (chartWrapper) {
                chartWrapper.innerHTML = `
                    <div class="chart-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load chart data</p>
                        <button class="btn btn-sm btn-primary retry-btn">Retry</button>
                    </div>
                `;

                // Add retry button functionality
                const retryBtn = chartWrapper.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        chartWrapper.innerHTML = '<canvas id="' + widgetId + '-chart"></canvas>';
                        fetchChartData(widgetId, url, '6month');
                    });
                }
            }
        }
    }

    // Initialize Upcoming Deadlines widget
    function initUpcomingDeadlinesWidget(widgetId, container) {
        container.innerHTML = `
            <div class="deadlines-container">
                <div class="deadlines-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading deadlines...</p>
                </div>
                <div class="deadlines-list" id="${widgetId}-deadlines"></div>
            </div>
        `;

        // Fetch deadlines
        fetch('/joborder/maintenance/get_upcoming_deadlines/')
            .then(response => response.json())
            .then(data => {
                const deadlinesList = document.getElementById(`${widgetId}-deadlines`);

                if (data.length === 0) {
                    deadlinesList.innerHTML = '<p class="no-deadlines">No upcoming deadlines</p>';
                    return;
                }

                deadlinesList.innerHTML = '';
                data.forEach((deadline, index) => {
                    const deadlineEl = document.createElement('div');
                    deadlineEl.className = 'deadline-item';
                    deadlineEl.innerHTML = `
                        <div class="deadline-header">
                            <span class="deadline-id">${deadline.jo_number}</span>
                            <span class="deadline-date">${formatDate(deadline.deadline)}</span>
                        </div>
                        <div class="deadline-details">
                            <p><strong>Tool:</strong> ${deadline.tool}</p>
                            <p><strong>Status:</strong> <span class="deadline-status">${deadline.status}</span></p>
                        </div>
                        <div class="deadline-progress">
                            <div class="progress-bar" style="width: ${deadline.progress}%"></div>
                        </div>
                    `;

                    // Add animation with delay
                    deadlineEl.style.animation = `fade-in 0.3s ease ${index * 0.1}s both`;

                    deadlinesList.appendChild(deadlineEl);
                });
            })
            .catch(error => {
                console.error('Error fetching deadlines:', error);
                container.innerHTML = `
                    <div class="widget-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load deadlines</p>
                    </div>
                `;
            });
    }

    // Initialize Manhour Chart widgets
    function initManhourChart(widgetId, container, url) {
        // Create chart container
        container.innerHTML = `
            <div class="chart-container">
                <div class="chart-wrapper">
                    <canvas id="${widgetId}-chart"></canvas>
                </div>
            </div>
        `;

        // Fetch chart data
        fetchChartData(widgetId, url);
    }

    // Initialize Monitoring Chart widget
    function initMonitoringChart(widgetId, container, url) {
        // Create chart container
        container.innerHTML = `
            <div class="chart-container">
                <div class="chart-controls">
                    <select class="chart-select" id="${widgetId}-period">
                        <option value="week">Weekly</option>
                        <option value="month" selected>Monthly</option>
                        <option value="quarter">Quarterly</option>
                    </select>
                </div>
                <div class="chart-wrapper">
                    <canvas id="${widgetId}-chart"></canvas>
                </div>
            </div>
        `;

        // Fetch initial data
        fetchChartData(widgetId, url);

        // Add event listener for period selector
        const periodSelector = document.getElementById(`${widgetId}-period`);
        if (periodSelector) {
            periodSelector.addEventListener('change', function() {
                const period = this.value;
                const baseUrl = url.split('/');
                baseUrl[baseUrl.length - 2] = period;
                fetchChartData(widgetId, baseUrl.join('/'));
            });
        }
    }

    // Initialize DCF Requestor Chart widget
    function initDCFRequestorChart(widgetId, container, url) {
        // Create chart container
        container.innerHTML = `
            <div class="chart-container">
                <div class="chart-controls">
                    <select class="chart-select" id="${widgetId}-period">
                        <option value="3month">Last 3 Months</option>
                        <option value="6month" selected>Last 6 Months</option>
                        <option value="1year">Last Year</option>
                    </select>
                </div>
                <div class="chart-wrapper">
                    <canvas id="${widgetId}-chart"></canvas>
                </div>
            </div>
        `;

        // Add event listener for period selector
        const periodSelector = document.getElementById(`${widgetId}-period`);
        if (periodSelector) {
            periodSelector.addEventListener('change', function() {
                try {
                    const period = this.value;
                    const baseUrl = url.split('/');
                    baseUrl[baseUrl.length - 2] = period;
                    fetchChartData(widgetId, baseUrl.join('/'));
                } catch (error) {
                    console.error(`Error updating DCF requestor chart for ${widgetId}:`, error);
                    showToast('Error updating chart', 'error');
                }
            });
        }

        // Initial chart load with error handling
        try {
            fetchChartData(widgetId, url);
        } catch (error) {
            console.error(`Error initializing DCF requestor chart for ${widgetId}:`, error);
            const chartWrapper = container.querySelector('.chart-wrapper');
            if (chartWrapper) {
                chartWrapper.innerHTML = `
                    <div class="chart-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load chart data</p>
                        <button class="btn btn-sm btn-primary retry-btn">Retry</button>
                    </div>
                `;

                // Add retry button functionality
                const retryBtn = chartWrapper.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        chartWrapper.innerHTML = '<canvas id="' + widgetId + '-chart"></canvas>';
                        fetchChartData(widgetId, url);
                    });
                }
            }
        }
    }

    // Initialize DCF Approver Chart widget
    function initDCFApproverChart(widgetId, container, url) {
        // Create chart container
        container.innerHTML = `
            <div class="chart-container">
                <div class="chart-controls">
                    <select class="chart-select" id="${widgetId}-period">
                        <option value="3month">Last 3 Months</option>
                        <option value="6month" selected>Last 6 Months</option>
                        <option value="1year">Last Year</option>
                    </select>
                </div>
                <div class="chart-wrapper">
                    <canvas id="${widgetId}-chart"></canvas>
                </div>
            </div>
        `;

        // Add event listener for period selector
        const periodSelector = document.getElementById(`${widgetId}-period`);
        if (periodSelector) {
            periodSelector.addEventListener('change', function() {
                try {
                    const period = this.value;
                    const baseUrl = url.split('/');
                    baseUrl[baseUrl.length - 2] = period;
                    fetchChartData(widgetId, baseUrl.join('/'));
                } catch (error) {
                    console.error(`Error updating DCF approver chart for ${widgetId}:`, error);
                    showToast('Error updating chart', 'error');
                }
            });
        }

        // Initial chart load with error handling
        try {
            fetchChartData(widgetId, url);
        } catch (error) {
            console.error(`Error initializing DCF approver chart for ${widgetId}:`, error);
            const chartWrapper = container.querySelector('.chart-wrapper');
            if (chartWrapper) {
                chartWrapper.innerHTML = `
                    <div class="chart-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load chart data</p>
                        <button class="btn btn-sm btn-primary retry-btn">Retry</button>
                    </div>
                `;

                // Add retry button functionality
                const retryBtn = chartWrapper.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        chartWrapper.innerHTML = '<canvas id="' + widgetId + '-chart"></canvas>';
                        fetchChartData(widgetId, url);
                    });
                }
            }
        }
    }

    // Fetch chart data and render chart
    function fetchChartData(widgetId, url, period) {
        const chartCanvas = document.getElementById(`${widgetId}-chart`);
        if (!chartCanvas) {
            console.error(`Chart canvas not found for widget ${widgetId}`);
            return;
        }

        let chartInstance;
        try {
            chartInstance = Chart.getChart(chartCanvas);

            // Destroy existing chart instance if it exists
            if (chartInstance) {
                chartInstance.destroy();
            }
        } catch (error) {
            console.error(`Error accessing chart instance for ${widgetId}:`, error);
        }

        // Show loading indicator
        const chartWrapper = chartCanvas.parentElement;
        if (!chartWrapper) {
            console.error(`Chart wrapper not found for widget ${widgetId}`);
            return;
        }

        chartWrapper.innerHTML = `
            <div class="chart-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading chart data...</p>
            </div>
        `;
        chartWrapper.appendChild(chartCanvas);

        // Build URL with period parameter if not included
        let fetchUrl = url;
        if (period && !url.includes(period)) {
            fetchUrl = url.includes('?')
                ? `${url}&period=${period}`
                : `${url}?period=${period}`;
        }

        // Fetch data from API with timeout
        const timeoutDuration = 15000; // 15 seconds timeout

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out')), timeoutDuration);
        });

        // Race the fetch against the timeout
        Promise.race([
            fetch(fetchUrl),
            timeoutPromise
        ])
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch chart data: ${response.status} ${response.statusText}`);
                }
                return response.text().then(text => {
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                        console.log('Raw response:', text);
                        throw new Error(`Invalid JSON response: ${e.message}`);
                    }
                });
            })
            .then(data => {
                // For DCF charts, we need to handle multiple charts
                if ((widgetId.includes('dcf-requestor') && data.status_distribution && data.monthly_trend) ||
                    (widgetId.includes('dcf-approver') && data.approval_distribution && data.monthly_trend)) {

                    // Clear loading indicator
                    chartWrapper.innerHTML = '';

                    // Create a container for the chart with padding
                    const chartsContainer = document.createElement('div');
                    chartsContainer.className = 'dcf-charts-container';
                    chartsContainer.style.display = 'flex';
                    chartsContainer.style.flexDirection = 'column';
                    chartsContainer.style.width = '100%';
                    chartsContainer.style.height = '100%';
                    chartsContainer.style.padding = '15px 0'; // Add padding to top and bottom

                    // Create chart container
                    const chartContainer = document.createElement('div');
                    chartContainer.className = 'dcf-chart';
                    chartContainer.style.flex = '1';
                    chartContainer.style.height = '100%';
                    chartContainer.style.position = 'relative';

                    const chartCanvas = document.createElement('canvas');
                    chartCanvas.id = `${widgetId}-chart`;
                    chartContainer.appendChild(chartCanvas);

                    // Add chart container to the main container
                    chartsContainer.appendChild(chartContainer);

                    // Replace the original canvas with our container
                    chartWrapper.appendChild(chartsContainer);

                    // For DCF charts, we'll just use a single 3D line chart
                    if (data.status_distribution) {
                        // Add 3D effect to the chart
                        const chart = new Chart(chartCanvas, data.status_distribution);
                        add3DEffect(chart);
                    } else if (data.approval_distribution) {
                        const chart = new Chart(chartCanvas, data.approval_distribution);
                        add3DEffect(chart);
                    }
                }
                else {
                    // Standard chart handling
                    // Clear loading indicator
                    chartWrapper.innerHTML = '';
                    chartWrapper.appendChild(chartCanvas);

                    // Create chart config based on data structure
                    const chartConfig = createChartConfig(data);

                    // Create chart
                    const chart = new Chart(chartCanvas, chartConfig);

                    // Add 3D effect to Job Order charts
                    if (widgetId.includes('jo-') || widgetId.includes('job-order')) {
                        add3DEffect(chart);
                    }
                }

                // Add animation to chart container
                chartWrapper.style.animation = 'fade-in 0.5s ease';
            })
            .catch(error => {
                console.error('Error fetching chart data:', error);
                chartWrapper.innerHTML = `
                    <div class="chart-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load chart data</p>
                        <small>${error.message}</small>
                    </div>
                `;
            });
    }

    // Create chart configuration based on data
    function createChartConfig(data) {
        // Check if data already has a complete chart configuration
        if (data.type && data.data && data.options) {
            return data;
        }

        // Check for DCF chart data format
        if (data.status_distribution || data.approval_distribution || data.monthly_trend) {
            if (data.status_distribution) {
                return data.status_distribution;
            } else if (data.approval_distribution) {
                return data.approval_distribution;
            } else if (data.monthly_trend) {
                return data.monthly_trend;
            }
        }

        // Default configuration for bar chart
        const config = {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        };

        // Determine data structure and adapt config
        if (data.labels && data.datasets) {
            // Standard Chart.js format
            config.data = data;
        } else if (Array.isArray(data)) {
            // Array of objects
            // Extract labels from first object keys
            if (data.length > 0) {
                const keys = Object.keys(data[0]).filter(key => key !== 'date' && key !== 'label');
                config.data.labels = data.map(item => item.date || item.label);

                // Create datasets for each key
                keys.forEach((key, index) => {
                    config.data.datasets.push({
                        label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
                        data: data.map(item => item[key]),
                        backgroundColor: getChartColor(index),
                        borderColor: getChartColor(index, false),
                        borderWidth: 1
                    });
                });
            }
        } else {
            // Object with series
            const keys = Object.keys(data).filter(key => key !== 'categories' && key !== 'labels');
            config.data.labels = data.categories || data.labels || [];

            // Create datasets for each key
            keys.forEach((key, index) => {
                config.data.datasets.push({
                    label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
                    data: data[key],
                    backgroundColor: getChartColor(index),
                    borderColor: getChartColor(index, false),
                    borderWidth: 1
                });
            });
        }

        // Determine chart type based on data
        if (config.data.datasets.length === 1) {
            config.type = 'bar';
        } else if (config.data.datasets.length > 3) {
            // Multiple datasets better as line chart
            config.type = 'line';
            config.data.datasets.forEach(dataset => {
                dataset.fill = false;
                dataset.tension = 0.3;
            });
        } else if (config.data.labels.length > 10) {
            // Many data points better as line chart
            config.type = 'line';
            config.data.datasets.forEach(dataset => {
                dataset.fill = false;
                dataset.tension = 0.3;
            });
        }

        return config;
    }

    // Get chart colors
    function getChartColor(index, isBackground = true) {
        const colors = [
            { bg: 'rgba(51, 102, 255, 0.6)', border: 'rgba(51, 102, 255, 1)' },
            { bg: 'rgba(72, 199, 116, 0.6)', border: 'rgba(72, 199, 116, 1)' },
            { bg: 'rgba(255, 193, 7, 0.6)', border: 'rgba(255, 193, 7, 1)' },
            { bg: 'rgba(241, 70, 104, 0.6)', border: 'rgba(241, 70, 104, 1)' },
            { bg: 'rgba(156, 39, 176, 0.6)', border: 'rgba(156, 39, 176, 1)' },
            { bg: 'rgba(0, 188, 212, 0.6)', border: 'rgba(0, 188, 212, 1)' }
        ];

        const colorIndex = index % colors.length;
        return isBackground ? colors[colorIndex].bg : colors[colorIndex].border;
    }

    // Apply flat chart style (no 3D effect)
    function add3DEffect(chart) {
        if (!chart || !chart.canvas) return;

        // Remove any shadow from the canvas
        chart.canvas.style.boxShadow = 'none';

        // Add smooth animation to the canvas
        chart.canvas.style.transition = 'all 0.5s ease';

        // Set chart background to white
        if (chart.canvas.parentNode) {
            chart.canvas.parentNode.style.backgroundColor = 'white';
        }

        // Apply flat style to datasets
        if (chart.config && chart.config.data && chart.config.data.datasets) {
            chart.config.data.datasets.forEach(dataset => {
                // Standard line width
                dataset.borderWidth = 2;

                // Ensure fill is disabled unless explicitly set
                if (dataset.fill !== true) {
                    dataset.fill = false;
                }

                // Minimal tension for straighter lines
                dataset.tension = 0.1;

                // Remove any shadows
                if (dataset.shadowOffsetX) delete dataset.shadowOffsetX;
                if (dataset.shadowOffsetY) delete dataset.shadowOffsetY;
                if (dataset.shadowBlur) delete dataset.shadowBlur;
                if (dataset.shadowColor) delete dataset.shadowColor;
                if (dataset.borderShadowColor) delete dataset.borderShadowColor;

                // Simple point style
                dataset.pointRadius = 3;
                dataset.pointHoverRadius = 4;
                dataset.pointBorderWidth = 1;

                // Remove point shadows
                if (dataset.pointShadowOffsetX) delete dataset.pointShadowOffsetX;
                if (dataset.pointShadowOffsetY) delete dataset.pointShadowOffsetY;
                if (dataset.pointShadowBlur) delete dataset.pointShadowBlur;
                if (dataset.pointShadowColor) delete dataset.pointShadowColor;
            });

            // Update chart options for flat style
            if (chart.options) {
                // Set chart background to white
                chart.options.backgroundColor = 'white';

                // Hide grid lines on x-axis
                if (chart.options.scales && chart.options.scales.x) {
                    chart.options.scales.x.grid = chart.options.scales.x.grid || {};
                    chart.options.scales.x.grid.display = false;
                }

                // Reduce border on y-axis and make grid lines very light
                if (chart.options.scales && chart.options.scales.y) {
                    chart.options.scales.y.grid = chart.options.scales.y.grid || {};
                    chart.options.scales.y.grid.drawBorder = false;
                    chart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.03)';
                }
            }

            // Update the chart
            chart.update();
        }
    }

    // ============================================
    // Widget Management Functions
    // ============================================

    // Add a new widget to the dashboard
    function addWidget(type) {
        const widgetId = generateWidgetId();

        // Find available position for this new widget
        const position = findAvailablePosition(type);

        // Create widget config
        const newWidget = {
            id: widgetId,
            type: type,
            x: position.x,
            y: position.y,
            w: position.w,
            h: position.h
        };

        // Add to widgets array
        widgets.push(newWidget);

        // Render widget
        const widgetElement = createWidgetElement(newWidget);
        dashboardGrid.appendChild(widgetElement);

        // Initialize widget content
        initializeWidgetContent(widgetId, type);

        // Show toast notification
        showToast('Widget added', 'success');

        // Save dashboard
        saveDashboard();

        return widgetId;
    }

    // Find an available position for a new widget
    function findAvailablePosition(type) {
        // Default dimensions based on widget type
        let w = 1, h = 1;

        // Check available space for widget placement
        const occupied = [];
        const gridCols = getColumnCount();
        const gridRows = 100; // Virtually unlimited rows

        // Initialize grid
        for (let y = 0; y < gridRows; y++) {
            occupied[y] = [];
            for (let x = 0; x < gridCols; x++) {
                occupied[y][x] = false;
            }
        }

        // Mark occupied cells
        widgets.forEach(widget => {
            for (let y = widget.y; y < widget.y + widget.h; y++) {
                for (let x = widget.x; x < widget.x + widget.w; x++) {
                    if (y < gridRows && x < gridCols) {
                        occupied[y][x] = true;
                    }
                }
            }
        });

        // Find first available position that fits the widget
        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < gridCols; x++) {
                if (x + w <= gridCols) { // Check if widget fits horizontally
                    let fits = true;

                    // Check if all required cells are available
                    for (let dy = 0; dy < h; dy++) {
                        for (let dx = 0; dx < w; dx++) {
                            if (occupied[y + dy] && occupied[y + dy][x + dx]) {
                                fits = false;
                                break;
                            }
                        }
                        if (!fits) break;
                    }

                    if (fits) {
                        return { x, y, w, h };
                    }
                }
            }
        }

        // If no space is found, place at a new row at the bottom
        const maxY = widgets.reduce((max, widget) => Math.max(max, widget.y + widget.h), 0);
        return { x: 0, y: maxY, w, h };
    }

    // Remove widget from dashboard
    function removeWidget(widgetId) {
        const widgetIndex = widgets.findIndex(w => w.id === widgetId);

        if (widgetIndex !== -1) {
            // Get widget element
            const widgetEl = document.getElementById(widgetId);

            // Add removal animation
            widgetEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            widgetEl.style.transform = 'scale(0.8)';
            widgetEl.style.opacity = '0';

            // Remove from DOM after animation
            setTimeout(() => {
                widgetEl.remove();

                // Remove from widgets array
                widgets.splice(widgetIndex, 1);

                // Save dashboard
                saveDashboard();

                // Show toast notification
                showToast('Widget removed', 'info');
            }, 300);
        }
    }

    // Generate a unique ID for widgets
    function generateWidgetId() {
        return 'widget-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }

    // ============================================
    // Edit Mode & Interaction Functions
    // ============================================

    // Toggle edit mode
    function toggleEditMode() {
        isEditMode = !isEditMode;

        if (isEditMode) {
            unlockDashboard();

            // Update settings button state
            if (dashboardSettingsBtn) {
                dashboardSettingsBtn.classList.add('active');
            }

            showToast('Edit mode enabled - drag widgets to move, resize from the bottom-right corner', 'info');
        } else {
            lockDashboard();

            // Update settings button state
            if (dashboardSettingsBtn) {
                dashboardSettingsBtn.classList.remove('active');
            }

            // Auto-save the layout when locking
            saveDashboard();
        }
    }

    // Lock dashboard - prevent dragging/resizing
    function lockDashboard() {
        dashboardGrid.classList.add('locked');
        dashboardGrid.classList.remove('edit-mode');

        // Disable interact.js functionality
        interact('.widget').unset();

        // Enable widget content interactions
        enableWidgetContentInteractions();
    }

    // Unlock dashboard - allow dragging/resizing
    function unlockDashboard() {
        dashboardGrid.classList.remove('locked');
        dashboardGrid.classList.add('edit-mode');

        // Re-initialize interact.js for widgets
        try {
            console.log('Initializing InteractJS for drag and resize...');
            initializeInteractJS();
            showToast('Edit mode enabled - Drag widgets by header, resize from bottom-right corner', 'info');
        } catch (error) {
            console.error('Error initializing InteractJS:', error);
            showToast('Error enabling edit mode', 'error');
        }

        // Disable widget content interactions to avoid dragging issues
        disableWidgetContentInteractions();

        // Show animation for entering edit mode
        animateEditModeTransition();
    }

    // Animate transition to edit mode
    function animateEditModeTransition() {
        const widgets = document.querySelectorAll('.widget');

        widgets.forEach((widget, index) => {
            // Add a slight wobble animation with delay
            widget.style.animation = 'none';
            setTimeout(() => {
                widget.style.animation = `pulse 0.3s ease ${index * 0.05}s`;
            }, 10);
        });
    }

    // Disable interactions with widget content during dragging
    function disableWidgetContentInteractions() {
        const widgetContents = document.querySelectorAll('.widget-content');
        widgetContents.forEach(content => {
            content.style.pointerEvents = 'none';
        });
    }

    // Re-enable interactions with widget content
    function enableWidgetContentInteractions() {
        const widgetContents = document.querySelectorAll('.widget-content');
        widgetContents.forEach(content => {
            content.style.pointerEvents = 'auto';
        });
    }

    // Get the current number of columns based on screen size
    function getColumnCount() {
        const width = window.innerWidth;

        if (width >= 1400) return 4; // Desktop
        if (width >= 1100) return 3; // Large tablet
        if (width >= 768) return 2;  // Small tablet
        return 1;                    // Mobile
    }

    // ============================================
    // Interact.js Integration
    // ============================================

    // Initialize InteractJS for dragging and resizing
    function initializeInteractJS() {
        // Make sure interact.js is available
        if (typeof interact !== 'function') {
            console.error('Interact.js not loaded');
            showToast('Widget dragging not available', 'error');
            return;
        }

        // Get grid dimensions
        const gridRect = dashboardGrid.getBoundingClientRect();
        const colCount = getColumnCount();
        const colWidth = gridRect.width / colCount;
        const rowHeight = 200; // Approximate row height

        // Enable dragging on widget headers only
        interact('.widget')
            .draggable({
                inertia: false,
                modifiers: [
                    // Snap to grid during drag
                    interact.modifiers.snap({
                        targets: [
                            interact.snappers.grid({
                                x: colWidth,
                                y: rowHeight
                            })
                        ],
                        range: Infinity,
                        relativePoints: [{ x: 0, y: 0 }]
                    }),
                    // Keep within the grid container
                    interact.modifiers.restrict({
                        restriction: dashboardGrid,
                        elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                        endOnly: true
                    })
                ],
                autoScroll: true,
                listeners: {
                    start: handleDragStart,
                    move: handleDragMove,
                    end: handleDragEnd
                },
                allowFrom: '.widget-header'  // Only allow dragging from header
            })
            .resizable({
                edges: { left: false, right: true, bottom: true, top: false },
                modifiers: [
                    // Snap to grid during resize
                    interact.modifiers.snap({
                        targets: [
                            interact.snappers.grid({
                                x: colWidth,
                                y: rowHeight
                            })
                        ],
                        range: Infinity
                    }),
                    // Maintain minimum size
                    interact.modifiers.restrictSize({
                        min: { width: colWidth, height: rowHeight }
                    })
                ],
                listeners: {
                    start: handleResizeStart,
                    move: handleResizeMove,
                    end: handleResizeEnd
                }
            });

        console.log('InteractJS initialized with grid snapping');
    }
    // Drag start handler
    function handleDragStart(event) {
        const target = event.target;

        // Set dragging state
        draggedWidget = target;
        draggedWidget.classList.add('dragging');

        // Create a ghost element for smooth animation
        const ghostElement = target.cloneNode(true);
        ghostElement.style.position = 'absolute';
        ghostElement.style.zIndex = '1000';
        ghostElement.style.opacity = '0.6';
        ghostElement.style.pointerEvents = 'none';
        ghostElement.id = 'dragging-ghost';

        // Position ghost element exactly over the original
        const rect = target.getBoundingClientRect();
        ghostElement.style.width = rect.width + 'px';
        ghostElement.style.height = rect.height + 'px';
        ghostElement.style.top = rect.top + 'px';
        ghostElement.style.left = rect.left + 'px';

        // Add to document body
        document.body.appendChild(ghostElement);

        // Store the grid position for calculations
        const gridX = parseInt(target.getAttribute('data-x') || 0);
        const gridY = parseInt(target.getAttribute('data-y') || 0);
        const gridW = parseInt(target.getAttribute('data-w') || 1);
        const gridH = parseInt(target.getAttribute('data-h') || 1);

        // Store initial position data
        target.setAttribute('data-original-x', gridX);
        target.setAttribute('data-original-y', gridY);
        target.setAttribute('data-original-w', gridW);
        target.setAttribute('data-original-h', gridH);

        // Make original semi-transparent
        target.style.opacity = '0.3';

        // Disable text selection
        document.body.style.userSelect = 'none';

        // Show drag help toast
        showToast('Drag to new position - release to place widget', 'info');
    }

    // Drag move handler
    function handleDragMove(event) {
        if (!draggedWidget) return;

        // Move the ghost element with the pointer
        const ghostElement = document.getElementById('dragging-ghost');
        if (ghostElement) {
            ghostElement.style.transform =
                `translate(${event.dx}px, ${event.dy}px) translate(${event.clientX - event.clientX0}px, ${event.clientY - event.clientY0}px)`;
        }

        // Calculate current grid position based on pointer
        const targetRect = dashboardGrid.getBoundingClientRect();
        const colCount = getColumnCount();
        const colWidth = targetRect.width / colCount;
        const rowHeight = 200;

        // Calculate grid position (grid cells, not pixels)
        const x = Math.floor((event.clientX - targetRect.left) / colWidth);
        const y = Math.floor((event.clientY - targetRect.top) / rowHeight);

        // Get widget dimensions
        const w = parseInt(draggedWidget.getAttribute('data-original-w') || 1);
        const h = parseInt(draggedWidget.getAttribute('data-original-h') || 1);

        // Update visual placeholder
        updateGridPlaceholder(x, y, w, h);

        // Animate other widgets to make space (sliding animation)
        animateWidgetsForPlacement(x, y, w, h, draggedWidget.id);
    }

    function animateWidgetsForPlacement(x, y, w, h, currentWidgetId) {
        // Skip if we're already animating for these coordinates
        if (currentDropTarget &&
            currentDropTarget.x === x &&
            currentDropTarget.y === y) {
            return;
        }

        // Update current drop target
        currentDropTarget = { x, y, w, h };

        // Check which widgets need to move
        const widgetsToMove = [];

        // Check for overlapping widgets
        document.querySelectorAll('.widget:not(.dragging)').forEach(widget => {
            if (widget.id === currentWidgetId) return;

            const wx = parseInt(widget.getAttribute('data-x'));
            const wy = parseInt(widget.getAttribute('data-y'));
            const ww = parseInt(widget.getAttribute('data-w'));
            const wh = parseInt(widget.getAttribute('data-h'));

            // Check if this widget overlaps with the placement area
            const overlapsX = !(wx >= x + w || wx + ww <= x);
            const overlapsY = !(wy >= y + h || wy + wh <= y);

            if (overlapsX && overlapsY) {
                widgetsToMove.push({
                    element: widget,
                    x: wx, y: wy, w: ww, h: wh
                });
            }
        });

        // If there are widgets to move, animate them
        if (widgetsToMove.length > 0) {
            // For now, just move them down
            widgetsToMove.forEach(widget => {
                const newY = y + h;

                // Animate the widget to its new position
                widget.element.style.transition = 'all 0.3s ease';
                widget.element.style.gridRow = `${newY + 1} / span ${widget.h}`;

                // Update data attribute for position tracking
                widget.element.setAttribute('data-y', newY);
            });
        }
    }

    function updateGridPlaceholder(x, y, w, h) {
        let placeholder = document.getElementById('grid-placeholder');

        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.id = 'grid-placeholder';
            placeholder.style.position = 'absolute';
            placeholder.style.backgroundColor = 'rgba(51, 102, 255, 0.2)';
            placeholder.style.border = '2px dashed #3366ff';
            placeholder.style.borderRadius = '8px';
            placeholder.style.pointerEvents = 'none';
            placeholder.style.zIndex = '5';
            placeholder.style.transition = 'all 0.2s ease';
            dashboardGrid.appendChild(placeholder);
        }

        // Calculate placeholder position in the grid
        const gridRect = dashboardGrid.getBoundingClientRect();
        const colCount = getColumnCount();
        const colWidth = gridRect.width / colCount;
        const rowHeight = 200;

        // Position the placeholder (add 5px padding for visual spacing)
        placeholder.style.left = (x * colWidth + 5) + 'px';
        placeholder.style.top = (y * rowHeight + 5) + 'px';
        placeholder.style.width = (w * colWidth - 10) + 'px';
        placeholder.style.height = (h * rowHeight - 10) + 'px';
    }

    // Drag end handler
    function handleDragEnd(event) {
        if (!draggedWidget) return;

        // Get final drop position from currentDropTarget
        let finalX = parseInt(draggedWidget.getAttribute('data-original-x'));
        let finalY = parseInt(draggedWidget.getAttribute('data-original-y'));

        if (currentDropTarget) {
            finalX = currentDropTarget.x;
            finalY = currentDropTarget.y;
        }

        // Update widget position in data model
        updateWidgetPositionInGrid(draggedWidget.id, finalX, finalY);

        // Remove ghost element
        const ghostElement = document.getElementById('dragging-ghost');
        if (ghostElement) {
            // Animate ghost to final position before removing
            const targetRect = dashboardGrid.getBoundingClientRect();
            const colCount = getColumnCount();
            const colWidth = targetRect.width / colCount;
            const rowHeight = 200;

            const finalLeft = targetRect.left + (finalX * colWidth);
            const finalTop = targetRect.top + (finalY * rowHeight);

            ghostElement.style.transition = 'all 0.3s ease';
            ghostElement.style.top = finalTop + 'px';
            ghostElement.style.left = finalLeft + 'px';

            setTimeout(() => {
                ghostElement.remove();
            }, 300);
        }

        // Remove placeholder
        const placeholder = document.getElementById('grid-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        // Reset widget appearance
        draggedWidget.style.opacity = '';
        draggedWidget.classList.remove('dragging');

        // Re-enable text selection
        document.body.style.userSelect = '';

        // Clear drag references
        draggedWidget = null;
        currentDropTarget = null;

        // Render widgets to finalize positions
        renderWidgets(false);

        // Show confirmation toast
        showToast('Widget position updated', 'success');
    }

    // Resize start handler
    function handleResizeStart(event) {
        const target = event.target;
        target.classList.add('resizing');

        // Store original size for potential cancellation
        const w = parseInt(target.getAttribute('data-w'));
        const h = parseInt(target.getAttribute('data-h'));
        target.setAttribute('data-original-w', w);
        target.setAttribute('data-original-h', h);

        // Disable text selection
        document.body.style.userSelect = 'none';

        // Show resize help toast
        showToast('Drag to resize widget', 'info');
    }

    // Resize move handler
    function handleResizeMove(event) {
        const target = event.target;

        // Calculate grid dimensions
        const gridRect = dashboardGrid.getBoundingClientRect();
        const colCount = getColumnCount();
        const colWidth = gridRect.width / colCount;
        const rowHeight = 200; // Approximate row height

        // Calculate new size in grid units
        const newWidth = Math.max(1, Math.round(event.rect.width / colWidth));
        const newHeight = Math.max(1, Math.round(event.rect.height / rowHeight));

        // Update visual size
        target.style.gridColumn = `span ${newWidth}`;
        target.style.gridRow = `span ${newHeight}`;

        // Store new values in data attributes
        target.setAttribute('data-w', newWidth);
        target.setAttribute('data-h', newHeight);
    }

    // Resize end handler
    function handleResizeEnd(event) {
        const target = event.target;
        target.classList.remove('resizing');

        // Re-enable text selection
        document.body.style.userSelect = '';

        // Extract final size
        const w = parseInt(target.getAttribute('data-w'));
        const h = parseInt(target.getAttribute('data-h'));

        // Update widget data model
        updateWidgetSizeInGrid(target.id, w, h);

        // Add completion animation
        target.style.animation = 'pulse 0.3s ease';

        // Refresh widget content if needed
        refreshWidgetContent(target.id, target.getAttribute('data-type'));

        // Show confirmation toast
        showToast('Widget size updated', 'success');
    }

    // Calculate grid position from element's position
    function calculateGridPosition(element) {
        const gridRect = dashboardGrid.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Get grid dimensions
        const colCount = getColumnCount();
        const colWidth = gridRect.width / colCount;
        const rowHeight = 200; // Approximate row height

        // Calculate grid coordinates (relative to grid)
        const offsetX = elementRect.left - gridRect.left;
        const offsetY = elementRect.top - gridRect.top;

        const col = Math.round(offsetX / colWidth);
        const row = Math.round(offsetY / rowHeight);

        // Clamp to valid range
        return {
            col: Math.max(0, Math.min(col, colCount - 1)),
            row: Math.max(0, row)
        };
    }

    // Update drop indicator during drag
    function updateDropIndicator(event) {
        // Remove existing indicators
        removeDropIndicators();

        if (!draggedWidget) return;

        // Calculate position based on current drag position
        const gridRect = dashboardGrid.getBoundingClientRect();
        const colCount = getColumnCount();
        const colWidth = gridRect.width / colCount;
        const rowHeight = 200;

        // Get the widget's width and height in grid units
        const widgetWidth = parseInt(draggedWidget.getAttribute('data-w')) || 1;
        const widgetHeight = parseInt(draggedWidget.getAttribute('data-h')) || 1;

        // Calculate grid position of the widget's top-left corner
        const dragX = parseInt(draggedWidget.getAttribute('data-x')) || 0;
        const dragY = parseInt(draggedWidget.getAttribute('data-y')) || 0;

        const widgetRect = draggedWidget.getBoundingClientRect();
        const offsetX = widgetRect.left - gridRect.left;
        const offsetY = widgetRect.top - gridRect.top;

        const col = Math.round(offsetX / colWidth);
        const row = Math.round(offsetY / rowHeight);

        // Create highlight element
        const highlight = document.createElement('div');
        highlight.className = 'drop-preview';

        // Position and size the highlight to match the widget's size
        highlight.style.width = `${colWidth * widgetWidth}px`;
        highlight.style.height = `${rowHeight * widgetHeight}px`;
        highlight.style.left = `${gridRect.left + (col * colWidth)}px`;
        highlight.style.top = `${gridRect.top + (row * rowHeight)}px`;

        // Add to document body (not grid, to avoid layout shifts)
        document.body.appendChild(highlight);
    }

    // Remove drop indicators
    function removeDropIndicators() {
        const indicators = document.querySelectorAll('.drop-preview');
        indicators.forEach(el => el.remove());
    }

    // Update widget position in the data model
    function updateWidgetPositionInGrid(widgetId, x, y) {
        const index = widgets.findIndex(w => w.id === widgetId);

        if (index !== -1) {
            widgets[index].x = x;
            widgets[index].y = y;

            // Re-render widgets to ensure proper grid layout
            renderWidgets(false);
        }
    }

    // Update widget size in the data model
    function updateWidgetSizeInGrid(widgetId, w, h) {
        const index = widgets.findIndex(w => w.id === widgetId);

        if (index !== -1) {
            widgets[index].w = w;
            widgets[index].h = h;

            // Re-render widgets to ensure proper grid layout
            renderWidgets(false);
        }
    }

    // Refresh widget content after resize
    function refreshWidgetContent(widgetId, widgetType) {
        // Special handling for widgets that need it
        if (widgetType === 'calendar') {
            const calendarEl = document.getElementById(`${widgetId}-calendar`);
            if (calendarEl && calendarEl.calendar) {
                calendarEl.calendar.updateSize();
            } else {
                // If FullCalendar instance isn't available, reinitialize
                initializeWidgetContent(widgetId, widgetType);
            }
        } else if (widgetType.includes('chart')) {
            // Charts need to be redrawn after resize
            const chartCanvas = document.getElementById(`${widgetId}-chart`);
            if (chartCanvas && typeof Chart !== 'undefined') {
                const chart = Chart.getChart(chartCanvas);
                if (chart) {
                    chart.resize();
                }
            }
        }
    }

    // ============================================
    // Dashboard Settings
    // ============================================

    function initDashboardSettings() {
        const settingsBtn = document.getElementById('dashboard-settings-btn');
        const settingsModal = document.getElementById('dashboard-settings-modal');
        const closeSettingsBtn = document.getElementById('close-settings-modal');
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        const resetSettingsBtn = document.getElementById('reset-settings-btn');
        const resetDashboardBtn = document.getElementById('reset-dashboard-btn');
        const editLayoutToggle = document.getElementById('edit-layout-toggle');

        if (!settingsBtn || !settingsModal) return;

        // Open settings modal on click
        settingsBtn.addEventListener('click', function() {
            // Update edit layout toggle state
            if (editLayoutToggle) {
                editLayoutToggle.checked = isEditMode;
            }

            openModal(settingsModal);
        });

        // Close modal
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', function() {
                closeModal(settingsModal);
            });
        }

        // Save settings
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', function() {
                saveSettings();
                closeModal(settingsModal);
            });
        }

        // Reset settings
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', function() {
                resetSettings();
            });
        }

        // Reset entire dashboard layout
        if (resetDashboardBtn) {
            resetDashboardBtn.addEventListener('click', function() {
                if (confirm('Are you sure you want to reset your entire dashboard layout? This cannot be undone.')) {
                    resetDashboardLayout();
                    closeModal(settingsModal);
                    location.reload(); // Reload the page to ensure clean state
                }
            });
        }

        // Edit layout toggle
        if (editLayoutToggle) {
            editLayoutToggle.addEventListener('change', function() {
                // Toggle edit mode based on checkbox
                const newEditMode = this.checked;

                if (newEditMode !== isEditMode) {
                    toggleEditMode();
                }
            });
        }
    }

    function saveSettings() {
        const gridGap = document.getElementById('grid-gap');
        const autoRefreshInterval = document.getElementById('auto-refresh-interval');
        const autoSaveToggle = document.getElementById('auto-save-toggle');

        // Save settings to localStorage
        const settings = {
            gridGap: gridGap ? gridGap.value : 'medium',
            autoRefreshInterval: autoRefreshInterval ? parseInt(autoRefreshInterval.value) : 15,
            autoSave: autoSaveToggle ? autoSaveToggle.checked : true
        };

        localStorage.setItem('unisync_dashboard_settings', JSON.stringify(settings));

        // Apply settings immediately
        applySettings(settings);

        showToast('Settings saved', 'success');
    }

    function resetSettings() {
        // Default settings
        const defaultSettings = {
            gridGap: 'medium',
            autoRefreshInterval: 15,
            autoSave: true
        };

        // Update UI elements
        const gridGap = document.getElementById('grid-gap');
        if (gridGap) gridGap.value = defaultSettings.gridGap;

        const autoRefreshInterval = document.getElementById('auto-refresh-interval');
        if (autoRefreshInterval) autoRefreshInterval.value = defaultSettings.autoRefreshInterval;

        const autoSaveToggle = document.getElementById('auto-save-toggle');
        if (autoSaveToggle) autoSaveToggle.checked = defaultSettings.autoSave;

        // Save to localStorage
        localStorage.setItem('unisync_dashboard_settings', JSON.stringify(defaultSettings));

        // Apply settings
        applySettings(defaultSettings);

        showToast('Settings reset to defaults', 'info');
    }

    function applySettings(settings) {
        // Apply grid gap
        if (settings.gridGap) {
            const gapValue = settings.gridGap === 'small' ? '10px' :
                            settings.gridGap === 'large' ? '20px' : '15px';

            dashboardGrid.style.gridGap = gapValue;
        }

        // Apply auto-refresh interval (would need to implement refresh functionality)
        if (settings.autoRefreshInterval) {
            // For future implementation
        }

        // Auto-save setting will be used when making changes
    }

    // ============================================
    // Widget Selection Modal
    // ============================================

    // Initialize widget selection modal
    function initWidgetSelectionModal() {
        const templates = document.querySelectorAll('.widget-template');

        if (!widgetSelection) {
            console.error('Widget selection container not found');
            return;
        }

        // Log user roles for debugging
        console.log('Current user roles:', currentUser.roles);

        // Create clone of each template and add to modal
        templates.forEach(template => {
            const role = template.getAttribute('data-role');
            const type = template.getAttribute('data-widget-type');

            console.log(`Widget template: ${type}, Role: ${role}, Has role: ${!role || hasRole(role)}`);

            // Only add widgets that match user roles or have no role requirement
            if (!role || hasRole(role)) {
                const clone = template.cloneNode(true);
                widgetSelection.appendChild(clone);

                // Add click event listener
                clone.addEventListener('click', () => {
                    const type = clone.getAttribute('data-widget-type');
                    addWidget(type);
                    closeModal(document.getElementById('add-widget-modal'));
                });
            }
        });

        // Add category filter functionality
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active button
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Filter widgets
                const category = btn.getAttribute('data-category');
                const widgets = widgetSelection.querySelectorAll('.widget-template');

                widgets.forEach(widget => {
                    if (category === 'all' || widget.getAttribute('data-category') === category) {
                        widget.style.display = '';
                    } else {
                        widget.style.display = 'none';
                    }
                });
            });
        });
    }

    // ============================================
    // Event Listeners
    // ============================================

    // Initialize all event listeners
    function initEventListeners() {
        // Add widget button
        if (addWidgetBtn) {
            addWidgetBtn.addEventListener('click', () => {
                openModal(document.getElementById('add-widget-modal'));
            });
        }

        // Close widget modal button
        if (closeWidgetModalBtn) {
            closeWidgetModalBtn.addEventListener('click', () => {
                closeModal(document.getElementById('add-widget-modal'));
            });
        }

        // Settings button
        if (dashboardSettingsBtn) {
            dashboardSettingsBtn.addEventListener('click', () => {
                openModal(document.getElementById('dashboard-settings-modal'));
            });
        }

        // Save layout button
        if (saveLayoutBtn) {
            saveLayoutBtn.addEventListener('click', () => {
                saveDashboard();

                // Add button animation
                saveLayoutBtn.classList.add('loading');
                setTimeout(() => {
                    saveLayoutBtn.classList.remove('loading');
                }, 1000);
            });
        }

        // Calendar event modal close button
        const closeEventModalBtn = document.getElementById('close-event-modal');
        if (closeEventModalBtn) {
            closeEventModalBtn.addEventListener('click', () => {
                closeModal(calendarEventModal);
            });
        }

        // Calendar event form submit and cancel
        const cancelEventBtn = document.getElementById('cancel-event-btn');
        const saveEventBtn = document.getElementById('save-event-btn');
        const deleteEventBtn = document.getElementById('delete-event-btn');

        if (cancelEventBtn) {
            cancelEventBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeModal(calendarEventModal);
            });
        }

        if (saveEventBtn) {
            saveEventBtn.addEventListener('click', (e) => {
                e.preventDefault();
                saveCalendarEvent();
            });
        }

        if (deleteEventBtn) {
            deleteEventBtn.addEventListener('click', (e) => {
                e.preventDefault();
                deleteCalendarEvent();
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const addWidgetModal = document.getElementById('add-widget-modal');
            if (e.target === addWidgetModal) {
                closeModal(addWidgetModal);
            }

            if (e.target === calendarEventModal) {
                closeModal(calendarEventModal);
            }

            const dashboardSettingsModal = document.getElementById('dashboard-settings-modal');
            if (e.target === dashboardSettingsModal) {
                closeModal(dashboardSettingsModal);
            }
        });

        // Widget action buttons (refresh, remove)
        dashboardGrid.addEventListener('click', (e) => {
            // Find closest widget
            const widget = e.target.closest('.widget');

            if (!widget) return;

            // Check if refresh button clicked
            if (e.target.closest('.widget-refresh')) {
                const widgetId = widget.id;
                const widgetType = widget.getAttribute('data-type');

                // Add button animation
                const refreshBtn = e.target.closest('.widget-refresh');
                refreshBtn.classList.add('loading');

                // Re-initialize widget content
                setTimeout(() => {
                    initializeWidgetContent(widgetId, widgetType);
                    refreshBtn.classList.remove('loading');
                    showToast('Widget refreshed', 'success');
                }, 500);
            }

            // Check if remove button clicked
            if (e.target.closest('.widget-remove')) {
                const widgetId = widget.id;
                removeWidget(widgetId);
            }
        });

        // Window resize event
        window.addEventListener('resize', debounce(() => {
            // Force re-layout when screen size changes significantly
            if (isEditMode) {
                // Ensure widgets adjust to new column count
                renderWidgets(false);
            }
        }, 250));

        // ESC key to exit edit mode
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isEditMode) {
                toggleEditMode();
            }

            // ESC key to close modals
            if (e.key === 'Escape') {
                const addWidgetModal = document.getElementById('add-widget-modal');
                if (addWidgetModal && addWidgetModal.classList.contains('show')) {
                    closeModal(addWidgetModal);
                }

                if (calendarEventModal && calendarEventModal.classList.contains('show')) {
                    closeModal(calendarEventModal);
                }

                const dashboardSettingsModal = document.getElementById('dashboard-settings-modal');
                if (dashboardSettingsModal && dashboardSettingsModal.classList.contains('show')) {
                    closeModal(dashboardSettingsModal);
                }
            }
        });
    }

    // ============================================
    // Utility Functions
    // ============================================

    // Format date for display
    function formatDate(date) {
        if (!date) return '';

        if (typeof date === 'string') {
            date = new Date(date);
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Format date for input field (YYYY-MM-DD)
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Get CSRF token from cookies
    function getCsrfToken() {
        const name = 'csrftoken';
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

    // Debounce function for resize events
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }

    // Open modal helper
    function openModal(modal) {
        if (!modal) return;
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // Close modal helper
    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';

            // Reset position if it was set
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.position = '';
                modalContent.style.top = '';
                modalContent.style.left = '';
                modalContent.style.transform = '';
            }
        }, 300);
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        if (!toastContainer) {
            console.error('Toast container not found');
            return;
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Set icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';

        // Create toast content
        toast.innerHTML = `
            <i class="fas fa-${icon} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to container
        toastContainer.appendChild(toast);

        // Add animation
        setTimeout(() => {
            toast.style.animation = 'none';
            void toast.offsetWidth; // Trigger reflow
            toast.style.animation = 'toast-in 0.3s forwards, toast-out 0.3s forwards 5s';
        }, 10);

        // Add close button event listener
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'toast-out 0.3s forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toast.remove();
            }
        }, 5300);
    }

    // Make showToast available globally
    window.showToast = showToast;

    // Initialize the dashboard
    initDashboard();

    // Reset dashboard layout function
    function resetDashboardLayout() {
        // Clear localStorage
        localStorage.removeItem(WIDGET_STORAGE_KEY);

        // Initialize with default layout
        initializeDefaultLayout();

        // Show toast notification
        showToast('Dashboard layout has been reset', 'success');
    }

    // Expose some functions to window for external access
    window.addWidget = addWidget;
    window.removeWidget = removeWidget;
    window.renderWidgets = renderWidgets;
    window.saveDashboard = saveDashboard;
    window.toggleEditMode = toggleEditMode;
    window.resetDashboardLayout = resetDashboardLayout;
    window.widgets = widgets;
});