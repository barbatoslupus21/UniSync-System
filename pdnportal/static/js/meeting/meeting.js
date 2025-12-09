/**
 * Meeting Scheduler JavaScript
 * Handles calendar navigation, meeting list, and CRUD operations
 */

document.addEventListener('DOMContentLoaded', function() {
    // State management
    const state = {
        currentDate: new Date(),
        selectedDate: new Date(TODAY),
        currentView: 'month',
        selectedRoom: null,
        events: {},
        editingMeetingId: null,
        deletingMeetingId: null
    };

    // DOM Elements
    const elements = {
        // Calendar
        calendarDays: document.getElementById('calendar-days'),
        calendarMonthYear: document.getElementById('calendar-month-year'),
        prevMonthBtn: document.getElementById('prev-month'),
        nextMonthBtn: document.getElementById('next-month'),
        calendarViewSelect: document.getElementById('calendar-view'),
        weekView: document.getElementById('week-view'),
        weekHeader: document.getElementById('week-header'),
        weekGrid: document.getElementById('week-grid'),
        
        // Meeting List
        meetingList: document.getElementById('meeting-list'),
        selectedDateLabel: document.getElementById('selected-date-label'),
        roomFilter: document.getElementById('room-filter'),
        
        // Create Meeting Modal
        createMeetingBtn: document.getElementById('create-meeting-btn'),
        createMeetingModal: document.getElementById('create-meeting-modal'),
        closeMeetingModal: document.getElementById('close-meeting-modal'),
        cancelMeetingBtn: document.getElementById('cancel-meeting-btn'),
        saveMeetingBtn: document.getElementById('save-meeting-btn'),
        meetingForm: document.getElementById('meeting-form'),
        meetingModalTitle: document.getElementById('meeting-modal-title'),
        
        // Form Fields
        meetingTitle: document.getElementById('meeting-title'),
        meetingRoom: document.getElementById('meeting-room'),
        meetingDate: document.getElementById('meeting-date'),
        meetingStartTime: document.getElementById('meeting-start-time'),
        meetingEndTime: document.getElementById('meeting-end-time'),
        meetingDescription: document.getElementById('meeting-description'),
        meetingAttendees: document.getElementById('meeting-attendees'),
        attendeeSearch: document.getElementById('attendee-search'),
        selectedAttendees: document.getElementById('selected-attendees'),
        availabilityIndicator: document.getElementById('availability-indicator'),
        meetingRepetition: document.getElementById('meeting-repetition'),
        repetitionEndGroup: document.getElementById('repetition-end-group'),
        repetitionEndDate: document.getElementById('repetition-end-date'),
        
        // Detail Modal
        meetingDetailModal: document.getElementById('meeting-detail-modal'),
        closeDetailModal: document.getElementById('close-detail-modal'),
        detailModalTitle: document.getElementById('detail-modal-title'),
        meetingDetailContent: document.getElementById('meeting-detail-content'),
        meetingDetailActions: document.getElementById('meeting-detail-actions'),
        
        // Delete Modal
        deleteMeetingModal: document.getElementById('delete-meeting-modal'),
        cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
        confirmDeleteBtn: document.getElementById('confirm-delete-btn')
    };

    // Utility functions
    const formatDate = (date) => {
        // Use local date components to avoid timezone shifting
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateDisplay = (date) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    const formatMonthYear = (date) => {
        const options = { month: 'long', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const isSameDate = (date1, date2) => {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    };

    // API calls
    const api = {
        async getMeetings(date, room = null) {
            let url = `${MEETING_URLS.getMeetings}?date=${date}`;
            if (room) url += `&room=${room}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch meetings');
            return response.json();
        },

        async getCalendarEvents(year, month, room = null) {
            let url = `${MEETING_URLS.getCalendarEvents}?year=${year}&month=${month}`;
            if (room) url += `&room=${room}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch calendar events');
            return response.json();
        },

        async createMeeting(data) {
            const response = await fetch(MEETING_URLS.createMeeting, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async getMeetingDetail(id) {
            const url = MEETING_URLS.getMeetingDetail.replace('/0/', `/${id}/`);
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch meeting details');
            return response.json();
        },

        async updateMeeting(id, data) {
            const url = MEETING_URLS.updateMeeting.replace('/0/', `/${id}/`);
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN
                },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async deleteMeeting(id) {
            const url = MEETING_URLS.deleteMeeting.replace('/0/', `/${id}/`);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': CSRF_TOKEN
                }
            });
            return response.json();
        },

        async checkAvailability(room, date, startTime, endTime, excludeId = null) {
            let url = `${MEETING_URLS.checkAvailability}?room=${room}&date=${date}&start_time=${startTime}&end_time=${endTime}`;
            if (excludeId) url += `&exclude=${excludeId}`;
            
            const response = await fetch(url);
            return response.json();
        }
    };

    // Calendar rendering
    function renderCalendar() {
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();
        
        elements.calendarMonthYear.textContent = formatMonthYear(state.currentDate);
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        
        let html = '';
        
        // Previous month days
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const date = new Date(year, month - 1, day);
            html += createDayCell(date, true);
        }
        
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            html += createDayCell(date, false);
        }
        
        // Next month days
        const totalCells = startDay + daysInMonth;
        const remainingCells = 42 - totalCells; // 6 rows * 7 days
        for (let day = 1; day <= remainingCells && totalCells + day <= 42; day++) {
            const date = new Date(year, month + 1, day);
            html += createDayCell(date, true);
        }
        
        elements.calendarDays.innerHTML = html;
        
        // Add click listeners to days
        document.querySelectorAll('.calendar-day').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const dateStr = dayEl.dataset.date;
                selectDate(new Date(dateStr));
            });
        });
        
        // Load events for current month
        loadCalendarEvents();
    }

    function createDayCell(date, isOtherMonth) {
        const dateStr = formatDate(date);
        const isTodayClass = isToday(date) ? 'today' : '';
        const isSelectedClass = isSameDate(date, state.selectedDate) ? 'selected' : '';
        const otherMonthClass = isOtherMonth ? 'other-month' : '';
        
        return `
            <div class="calendar-day ${isTodayClass} ${isSelectedClass} ${otherMonthClass}" data-date="${dateStr}">
                <span class="day-number">${date.getDate()}</span>
                <div class="day-events"></div>
            </div>
        `;
    }

    // Get occupancy class based on percentage
    function getOccupancyClass(percentage) {
        if (percentage === 0) return '';
        if (percentage >= 1 && percentage <= 40) return 'occupancy-low';
        if (percentage >= 41 && percentage <= 70) return 'occupancy-medium';
        if (percentage >= 71 && percentage <= 99) return 'occupancy-high';
        if (percentage >= 100) return 'occupancy-full';
        return '';
    }

    async function loadCalendarEvents() {
        try {
            const year = state.currentDate.getFullYear();
            const month = state.currentDate.getMonth() + 1;
            
            const data = await api.getCalendarEvents(year, month, state.selectedRoom);
            state.events = data.events || {};
            
            // Add event pills to calendar days
            document.querySelectorAll('.calendar-day').forEach(dayEl => {
                const dateStr = dayEl.dataset.date;
                const dayEvents = state.events[dateStr] || [];
                const eventsContainer = dayEl.querySelector('.day-events');
                
                if (eventsContainer && dayEvents.length > 0) {
                    const maxDisplay = 2; // Show max 2 events, then "more"
                    let eventsHtml = '';
                    
                    dayEvents.slice(0, maxDisplay).forEach(event => {
                        const bgColor = event.color || event.room_color || '#8b5cf6';
                        const textColor = getContrastColor(bgColor);
                        eventsHtml += `
                            <div class="calendar-event-pill" 
                                 style="background-color: ${bgColor}20; color: ${bgColor};"
                                 data-id="${event.id}"
                                 title="${event.title}">
                                ${event.title}
                                <span class="event-time">${formatTime(event.start_time)}</span>
                            </div>
                        `;
                    });
                    
                    if (dayEvents.length > maxDisplay) {
                        eventsHtml += `<span class="more-events">+${dayEvents.length - maxDisplay} more</span>`;
                    }
                    
                    eventsContainer.innerHTML = eventsHtml;
                }
            });
        } catch (error) {
            console.error('Failed to load calendar events:', error);
        }
    }
    
    // Helper function to determine text color based on background
    function getContrastColor(hexColor) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    function selectDate(date) {
        state.selectedDate = date;
        
        // Update selected class
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
            if (day.dataset.date === formatDate(date)) {
                day.classList.add('selected');
            }
        });
        
        // Update label
        const today = new Date();
        if (isSameDate(date, today)) {
            elements.selectedDateLabel.textContent = `Today, ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
        } else {
            elements.selectedDateLabel.textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        }
        
        // Load meetings for selected date
        loadMeetingsForDate(date);
    }

    async function loadMeetingsForDate(date) {
        try {
            elements.meetingList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';
            
            const data = await api.getMeetings(formatDate(date), state.selectedRoom);
            
            if (data.meetings && data.meetings.length > 0) {
                elements.meetingList.innerHTML = data.meetings.map(meeting => createMeetingItem(meeting)).join('');
                
                // Add click listeners for expand/collapse
                document.querySelectorAll('.meeting-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        // Don't expand if clicking on action buttons
                        if (e.target.closest('.meeting-action-btn') || e.target.closest('.meeting-actions')) {
                            return;
                        }
                        toggleMeetingExpand(item);
                    });
                });
                
                // Add event listeners for edit/delete buttons
                initMeetingActionButtons();
            } else {
                elements.meetingList.innerHTML = `
                    <div class="empty-state">
                        <i class="far fa-calendar-check"></i>
                        <h4>No meetings scheduled</h4>
                        <p>Click the + button to schedule a new meeting</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load meetings:', error);
            elements.meetingList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h4>Error loading meetings</h4>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    function createMeetingItem(meeting) {
        const meetingColor = meeting.meeting_type?.color || meeting.room?.color || '#8b5cf6';
        const isOwner = meeting.organizer?.id === CURRENT_USER_ID;
        const isMeetingAdmin = typeof IS_MEETING_ADMIN !== 'undefined' && IS_MEETING_ADMIN;
        
        // Attendees pills for expanded view
        const attendeesPills = meeting.attendees.map(attendee => {
            return `<span class="attendee-pill">${attendee.name || 'Unknown'}</span>`;
        }).join('');
        
        // Action buttons (only show if user is the owner)
        const actionButtons = isOwner ? `
            <div class="meeting-actions">
                <button class="btn btn-sm btn-outline edit-meeting-btn" data-id="${meeting.id}" title="Edit">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline btn-danger delete-meeting-btn" data-id="${meeting.id}" title="Delete">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        ` : '';
        
        // Cancel button (only show for meeting admin)
        const cancelButton = isMeetingAdmin && !isOwner ? `
            <div class="meeting-actions">
                <button class="btn btn-sm btn-outline btn-danger cancel-meeting-btn" data-id="${meeting.id}" title="Cancel Meeting">
                    <i class="fas fa-ban"></i> Cancel
                </button>
            </div>
        ` : '';
        
        return `
            <div class="meeting-item" data-id="${meeting.id}" data-organizer-id="${meeting.organizer?.id}" style="--meeting-color: ${meetingColor};">
                <!-- Minimized View (Default) -->
                <div class="meeting-minimized">
                    <div class="meeting-color-dot" style="background-color: ${meetingColor};"></div>
                    <div class="meeting-minimized-content">
                        <div class="meeting-minimized-header">
                            <span class="meeting-time-badge">${formatTime(meeting.start_time)}–${formatTime(meeting.end_time)}</span>
                            <i class="fas fa-chevron-down meeting-expand-icon"></i>
                        </div>
                        <h4 class="meeting-title">${meeting.title}</h4>
                        <p class="meeting-subtitle"></i> ${meeting.room?.name || 'No Room'}</p>
                    </div>
                </div>
                
                <!-- Expanded View (Hidden by default) -->
                <div class="meeting-expanded">
                    <div class="meeting-expanded-content">
                        <div class="meeting-detail-row">
                            <i class="far fa-clock"></i>
                            <span>${formatTime(meeting.start_time)} – ${formatTime(meeting.end_time)}</span>
                        </div>
                        <div class="meeting-detail-row">
                            <i class="fas fa-door-open"></i>
                            <span>${meeting.room?.name || 'No Room'}</span>
                        </div>
                        ${meeting.meeting_type ? `
                        <div class="meeting-detail-row">
                            <i class="fas fa-tag"></i>
                            <span class="meeting-type-pill" style="background-color: ${meetingColor}20; color: ${meetingColor};">
                                ${meeting.meeting_type.name}
                            </span>
                        </div>
                        ` : ''}
                        ${meeting.description ? `
                        <div class="meeting-detail-row">
                            <i class="fas fa-align-left"></i>
                            <span>${meeting.description}</span>
                        </div>
                        ` : ''}
                        ${meeting.attendees.length > 0 ? `
                        <div class="meeting-detail-row">
                            <i class="fas fa-users"></i>
                            <div class="attendees-pills">
                                ${attendeesPills}
                            </div>
                        </div>
                        ` : ''}
                        ${actionButtons}
                        ${cancelButton}
                    </div>
                </div>
            </div>
        `;
    }
    
    function toggleMeetingExpand(item) {
        const minimized = item.querySelector('.meeting-minimized');
        const expanded = item.querySelector('.meeting-expanded');
        const isExpanded = item.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse
            expanded.classList.remove('visible');
            item.classList.remove('expanded');
            minimized.classList.remove('hidden');
        } else {
            // Expand
            item.classList.add('expanded');
            expanded.classList.add('visible');
        }
    }
    
    function initMeetingActionButtons() {
        // Edit buttons
        document.querySelectorAll('.edit-meeting-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const meetingId = btn.dataset.id;
                try {
                    const meeting = await api.getMeetingDetail(meetingId);
                    openEditModal(meeting);
                } catch (error) {
                    console.error('Failed to load meeting for edit:', error);
                    showToast('Failed to load meeting details', 'error');
                }
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-meeting-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const meetingId = btn.dataset.id;
                state.deletingMeetingId = meetingId;
                showModal(elements.deleteMeetingModal);
            });
        });
        
        // Cancel buttons (for meeting admin)
        document.querySelectorAll('.cancel-meeting-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const meetingId = btn.dataset.id;
                state.deletingMeetingId = meetingId;
                showModal(elements.deleteMeetingModal);
            });
        });
    }

    function formatTime(timeStr) {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    // Modal functions
    function openCreateModal(date = null) {
        state.editingMeetingId = null;
        elements.meetingModalTitle.textContent = 'Create Meeting';
        elements.saveMeetingBtn.innerHTML = '<i class="fas fa-check"></i> Create meeting';
        
        // Reset form
        elements.meetingForm.reset();
        elements.selectedAttendees.innerHTML = '';
        elements.availabilityIndicator.style.display = 'none';
        
        // Reset repetition fields
        if (elements.meetingRepetition) {
            elements.meetingRepetition.value = 'once';
            elements.meetingRepetition.closest('.form-group').style.display = 'block';
            elements.repetitionEndGroup.style.display = 'none';
            elements.repetitionEndDate.value = '';
        }
        
        // Reset attendee search
        if (elements.attendeeSearch) {
            elements.attendeeSearch.value = '';
            filterAttendees('');
        }
        
        // Hide capacity indicator
        const capacityIndicator = document.getElementById('capacity-indicator');
        if (capacityIndicator) {
            capacityIndicator.style.display = 'none';
        }
        
        // Set default date
        if (date) {
            elements.meetingDate.value = formatDate(date);
        } else {
            elements.meetingDate.value = formatDate(state.selectedDate);
        }
        
        // Set minimum date to today
        elements.meetingDate.min = TODAY;
        
        showModal(elements.createMeetingModal);
    }

    function openEditModal(meeting) {
        state.editingMeetingId = meeting.id;
        elements.meetingModalTitle.textContent = 'Edit Meeting';
        elements.saveMeetingBtn.innerHTML = '<i class="fas fa-check"></i> Save changes';
        
        // Populate form
        elements.meetingTitle.value = meeting.title;
        elements.meetingRoom.value = meeting.room.id;
        elements.meetingDate.value = meeting.date;
        elements.meetingStartTime.value = meeting.start_time;
        elements.meetingEndTime.value = meeting.end_time;
        elements.meetingDescription.value = meeting.description || '';
        
        // Hide repetition fields when editing (repetition only applies to new meetings)
        if (elements.meetingRepetition) {
            elements.meetingRepetition.value = 'once';
            elements.meetingRepetition.closest('.form-group').style.display = 'none';
            elements.repetitionEndGroup.style.display = 'none';
        }
        
        // Reset attendee search
        if (elements.attendeeSearch) {
            elements.attendeeSearch.value = '';
            filterAttendees('');
        }
        
        // Set meeting type
        if (meeting.meeting_type) {
            const typeRadio = document.querySelector(`input[name="meeting_type"][value="${meeting.meeting_type.id}"]`);
            if (typeRadio) typeRadio.checked = true;
        }
        
        // Set attendees
        elements.selectedAttendees.innerHTML = '';
        if (meeting.attendees) {
            meeting.attendees.forEach(attendee => {
                addSelectedAttendee(attendee.id, attendee.name);
            });
        }
        
        showModal(elements.createMeetingModal);
    }

    async function openMeetingDetail(meetingId) {
        try {
            const meeting = await api.getMeetingDetail(meetingId);
            
            const attendeesHtml = meeting.attendees.map(attendee => `
                <div class="detail-attendee">
                    <div class="detail-attendee-avatar">
                        ${attendee.avatar 
                            ? `<img src="${attendee.avatar}" alt="${attendee.name}">` 
                            : `<span>${(attendee.name || 'U')[0].toUpperCase()}</span>`
                        }
                    </div>
                    <span class="detail-attendee-name">${attendee.name}</span>
                </div>
            `).join('');
            
            elements.meetingDetailContent.innerHTML = `
                <h3 class="detail-meeting-title">${meeting.title}</h3>
                
                <div class="detail-section">
                    <div class="detail-row">
                        <i class="far fa-calendar"></i>
                        <div class="detail-content">
                            <div class="detail-label">Date & Time</div>
                            <div class="detail-value">
                                ${new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                <br>${formatTime(meeting.start_time)} – ${formatTime(meeting.end_time)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <i class="fas fa-door-open"></i>
                        <div class="detail-content">
                            <div class="detail-label">Meeting Room</div>
                            <div class="detail-value">${meeting.room.name}</div>
                        </div>
                    </div>
                    
                    ${meeting.location ? `
                    <div class="detail-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <div class="detail-content">
                            <div class="detail-label">Location</div>
                            <div class="detail-value">${meeting.location}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${meeting.description ? `
                    <div class="detail-row">
                        <i class="fas fa-align-left"></i>
                        <div class="detail-content">
                            <div class="detail-label">Description</div>
                            <div class="detail-value">${meeting.description}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="detail-row">
                        <i class="fas fa-user"></i>
                        <div class="detail-content">
                            <div class="detail-label">Organizer</div>
                            <div class="detail-value">${meeting.organizer.name}</div>
                        </div>
                    </div>
                    
                    ${meeting.attendees.length > 0 ? `
                    <div class="detail-row">
                        <i class="fas fa-users"></i>
                        <div class="detail-content">
                            <div class="detail-label">Attendees (${meeting.attendees.length})</div>
                            <div class="detail-attendees-list">
                                ${attendeesHtml}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
            
            // Add actions based on permissions
            if (meeting.can_edit) {
                elements.meetingDetailActions.innerHTML = `
                    <button class="btn btn-secondary" id="edit-meeting-btn">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-error" id="delete-meeting-btn">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                `;
                
                document.getElementById('edit-meeting-btn').addEventListener('click', () => {
                    hideModal(elements.meetingDetailModal);
                    openEditModal(meeting);
                });
                
                document.getElementById('delete-meeting-btn').addEventListener('click', () => {
                    state.editingMeetingId = meeting.id;
                    showModal(elements.deleteMeetingModal);
                });
            } else {
                elements.meetingDetailActions.innerHTML = `
                    <button class="btn btn-secondary" id="close-detail-btn">Close</button>
                `;
                document.getElementById('close-detail-btn').addEventListener('click', () => {
                    hideModal(elements.meetingDetailModal);
                });
            }
            
            showModal(elements.meetingDetailModal);
        } catch (error) {
            console.error('Failed to load meeting details:', error);
            showToast('Failed to load meeting details', 'error');
        }
    }

    function showModal(modal) {
        // First set display to flex, then trigger animation on next frame
        modal.style.display = 'flex';
        // Force reflow to ensure the display change is applied before adding active class
        modal.offsetHeight;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideModal(modal) {
        // Add closing animation class
        modal.classList.add('closing');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            modal.classList.remove('active', 'closing');
            modal.style.display = '';
            document.body.style.overflow = '';
        }, 200); // Match the CSS transition duration
    }

    // Form handling
    async function saveMeeting() {
        // Validate form
        if (!elements.meetingTitle.value.trim()) {
            showToast('Please enter a meeting title', 'error');
            return;
        }
        
        if (!elements.meetingRoom.value) {
            showToast('Please select a meeting room', 'error');
            return;
        }
        
        if (!elements.meetingDate.value) {
            showToast('Please select a date', 'error');
            return;
        }
        
        if (!elements.meetingStartTime.value || !elements.meetingEndTime.value) {
            showToast('Please select start and end times', 'error');
            return;
        }
        
        if (elements.meetingStartTime.value >= elements.meetingEndTime.value) {
            showToast('End time must be after start time', 'error');
            return;
        }
        
        // Get selected meeting type
        const selectedType = document.querySelector('input[name="meeting_type"]:checked');
        
        // Get selected attendees
        const attendeeIds = Array.from(elements.selectedAttendees.querySelectorAll('.selected-attendee'))
            .map(el => parseInt(el.dataset.id));
        
        // Get repetition settings
        const repetition = elements.meetingRepetition?.value || 'once';
        const repetitionEndDate = elements.repetitionEndDate?.value || null;
        
        // Validate repetition end date if repetition is not 'once'
        if (repetition !== 'once' && !state.editingMeetingId) {
            if (!repetitionEndDate) {
                showToast('Please select an end date for the repeating meeting', 'error');
                return;
            }
            if (repetitionEndDate <= elements.meetingDate.value) {
                showToast('Repeat end date must be after the meeting date', 'error');
                return;
            }
        }
        
        const data = {
            title: elements.meetingTitle.value.trim(),
            room: parseInt(elements.meetingRoom.value),
            meeting_type: selectedType?.value ? parseInt(selectedType.value) : null,
            date: elements.meetingDate.value,
            start_time: elements.meetingStartTime.value,
            end_time: elements.meetingEndTime.value,
            description: elements.meetingDescription.value.trim(),
            attendees: attendeeIds,
            repetition: repetition,
            repetition_end_date: repetitionEndDate
        };
        
        try {
            elements.saveMeetingBtn.disabled = true;
            elements.saveMeetingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            let result;
            if (state.editingMeetingId) {
                result = await api.updateMeeting(state.editingMeetingId, data);
            } else {
                result = await api.createMeeting(data);
            }
            
            if (result.success) {
                hideModal(elements.createMeetingModal);
                showToast(result.message, 'success');
                
                // Refresh calendar and meeting list
                loadCalendarEvents();
                loadMeetingsForDate(state.selectedDate);
            } else {
                showToast(result.error || 'Failed to save meeting', 'error');
            }
        } catch (error) {
            console.error('Failed to save meeting:', error);
            showToast('Failed to save meeting', 'error');
        } finally {
            elements.saveMeetingBtn.disabled = false;
            elements.saveMeetingBtn.innerHTML = state.editingMeetingId 
                ? '<i class="fas fa-check"></i> Save changes'
                : '<i class="fas fa-check"></i> Create meeting';
        }
    }

    async function deleteMeeting() {
        const meetingIdToDelete = state.deletingMeetingId || state.editingMeetingId;
        if (!meetingIdToDelete) return;
        
        try {
            elements.confirmDeleteBtn.disabled = true;
            elements.confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            
            const result = await api.deleteMeeting(meetingIdToDelete);
            
            if (result.success) {
                hideModal(elements.deleteMeetingModal);
                hideModal(elements.meetingDetailModal);
                showToast('Meeting deleted successfully', 'success');
                
                // Refresh calendar and meeting list
                loadCalendarEvents();
                loadMeetingsForDate(state.selectedDate);
            } else {
                showToast(result.error || 'Failed to delete meeting', 'error');
            }
        } catch (error) {
            console.error('Failed to delete meeting:', error);
            showToast('Failed to delete meeting', 'error');
        } finally {
            elements.confirmDeleteBtn.disabled = false;
            elements.confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            state.editingMeetingId = null;
            state.deletingMeetingId = null;
        }
    }

    // Attendee selection
    function addSelectedAttendee(id, name) {
        // Check if already selected
        if (elements.selectedAttendees.querySelector(`[data-id="${id}"]`)) return;
        
        const attendeeEl = document.createElement('div');
        attendeeEl.className = 'selected-attendee';
        attendeeEl.dataset.id = id;
        attendeeEl.innerHTML = `
            <span>${name}</span>
            <i class="fas fa-times remove-attendee"></i>
        `;
        
        attendeeEl.querySelector('.remove-attendee').addEventListener('click', () => {
            attendeeEl.remove();
            checkCapacity();
        });
        
        elements.selectedAttendees.appendChild(attendeeEl);
        checkCapacity();
    }

    // Check capacity when attendees are added
    function checkCapacity() {
        const capacityIndicator = document.getElementById('capacity-indicator');
        if (!capacityIndicator) return;
        
        const selectedRoom = elements.meetingRoom;
        const selectedOption = selectedRoom.options[selectedRoom.selectedIndex];
        
        if (!selectedOption || !selectedOption.value) {
            capacityIndicator.style.display = 'none';
            return;
        }
        
        const capacity = parseInt(selectedOption.dataset.capacity) || 0;
        const attendeeCount = elements.selectedAttendees.querySelectorAll('.selected-attendee').length;
        
        if (attendeeCount > capacity && capacity > 0) {
            capacityIndicator.style.display = 'flex';
            capacityIndicator.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>Attendees (${attendeeCount}) exceed room capacity (${capacity})</span>
            `;
        } else {
            capacityIndicator.style.display = 'none';
        }
    }

    // Filter attendees based on search query
    function filterAttendees(query) {
        const options = elements.meetingAttendees.options;
        const lowerQuery = query.toLowerCase();
        
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const text = option.text.toLowerCase();
            if (text.includes(lowerQuery) || query === '') {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        }
    }

    // Availability check
    async function checkAvailability() {
        const room = elements.meetingRoom.value;
        const date = elements.meetingDate.value;
        const startTime = elements.meetingStartTime.value;
        const endTime = elements.meetingEndTime.value;
        
        if (!room || !date || !startTime || !endTime) {
            elements.availabilityIndicator.style.display = 'none';
            return;
        }
        
        if (startTime >= endTime) {
            elements.availabilityIndicator.style.display = 'none';
            return;
        }
        
        try {
            const result = await api.checkAvailability(room, date, startTime, endTime, state.editingMeetingId);
            
            elements.availabilityIndicator.style.display = 'flex';
            
            if (result.available) {
                elements.availabilityIndicator.className = 'availability-indicator available';
                elements.availabilityIndicator.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span>Time slot is available</span>
                `;
            } else {
                elements.availabilityIndicator.className = 'availability-indicator unavailable';
                elements.availabilityIndicator.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Conflicts with "${result.conflict.title}" (${formatTime(result.conflict.start_time)} - ${formatTime(result.conflict.end_time)})</span>
                `;
            }
        } catch (error) {
            elements.availabilityIndicator.style.display = 'none';
        }
    }

    // Toast notification
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Create toast content structure
        const toastContent = document.createElement('div');
        toastContent.className = 'toast-content';

        // Add icon based on type
        const icon = document.createElement('i');
        if (type === 'error') {
            icon.className = 'fa fa-exclamation-circle toast-icon';
        } else if (type === 'success') {
            icon.className = 'fa fa-check-circle toast-icon';
        } else if (type === 'warning') {
            icon.className = 'fa fa-exclamation-triangle toast-icon';
        } else {
            icon.className = 'fa fa-info-circle toast-icon';
        }
        toastContent.appendChild(icon);

        // Add message
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        toastContent.appendChild(messageSpan);

        toast.appendChild(toastContent);

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toast.remove();
        });
        toast.appendChild(closeBtn);

        toastContainer.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    // Event listeners
    function initEventListeners() {
        // Calendar navigation
        elements.prevMonthBtn.addEventListener('click', () => {
            state.currentDate.setMonth(state.currentDate.getMonth() - 1);
            renderCalendar();
        });

        elements.nextMonthBtn.addEventListener('click', () => {
            state.currentDate.setMonth(state.currentDate.getMonth() + 1);
            renderCalendar();
        });

        // Room filter
        elements.roomFilter.addEventListener('change', (e) => {
            state.selectedRoom = e.target.value || null;
            loadCalendarEvents();
            loadMeetingsForDate(state.selectedDate);
        });

        // View toggle
        elements.calendarViewSelect.addEventListener('change', (e) => {
            state.currentView = e.target.value;
            if (state.currentView === 'week') {
                elements.calendarDays.parentElement.style.display = 'none';
                elements.weekView.style.display = 'block';
                renderWeekView();
            } else {
                elements.calendarDays.parentElement.style.display = 'block';
                elements.weekView.style.display = 'none';
            }
        });

        // Create meeting button
        elements.createMeetingBtn.addEventListener('click', () => openCreateModal());

        // Modal close buttons
        elements.closeMeetingModal.addEventListener('click', () => hideModal(elements.createMeetingModal));
        elements.cancelMeetingBtn.addEventListener('click', () => hideModal(elements.createMeetingModal));
        elements.closeDetailModal.addEventListener('click', () => hideModal(elements.meetingDetailModal));
        elements.cancelDeleteBtn.addEventListener('click', () => hideModal(elements.deleteMeetingModal));

        // Save meeting
        elements.saveMeetingBtn.addEventListener('click', saveMeeting);

        // Delete meeting
        elements.confirmDeleteBtn.addEventListener('click', deleteMeeting);

        // Attendee search - filter as user types
        if (elements.attendeeSearch) {
            elements.attendeeSearch.addEventListener('input', (e) => {
                filterAttendees(e.target.value);
            });
        }

        // Attendee selection
        elements.meetingAttendees.addEventListener('change', () => {
            const selectedOptions = Array.from(elements.meetingAttendees.selectedOptions);
            selectedOptions.forEach(option => {
                addSelectedAttendee(option.value, option.text);
                option.selected = false;
            });
        });

        // Availability check
        [elements.meetingRoom, elements.meetingDate, elements.meetingStartTime, elements.meetingEndTime]
            .forEach(el => {
                el.addEventListener('change', checkAvailability);
            });
        
        // Room change - also check capacity
        elements.meetingRoom.addEventListener('change', checkCapacity);

        // Repetition change - show/hide end date field
        if (elements.meetingRepetition) {
            elements.meetingRepetition.addEventListener('change', (e) => {
                const repetition = e.target.value;
                if (repetition === 'once') {
                    elements.repetitionEndGroup.style.display = 'none';
                    elements.repetitionEndDate.value = '';
                } else {
                    elements.repetitionEndGroup.style.display = 'block';
                    // Set default end date based on repetition type
                    const startDate = new Date(elements.meetingDate.value || new Date());
                    let endDate = new Date(startDate);
                    switch(repetition) {
                        case 'daily':
                            endDate.setDate(endDate.getDate() + 7); // 1 week by default
                            break;
                        case 'weekly':
                            endDate.setMonth(endDate.getMonth() + 1); // 1 month by default
                            break;
                        case 'monthly':
                            endDate.setFullYear(endDate.getFullYear() + 1); // 1 year by default
                            break;
                        case 'yearly':
                            endDate.setFullYear(endDate.getFullYear() + 3); // 3 years by default
                            break;
                    }
                    elements.repetitionEndDate.value = formatDate(endDate);
                    elements.repetitionEndDate.min = elements.meetingDate.value;
                }
            });
        }

        // Update repetition end date min when meeting date changes
        elements.meetingDate.addEventListener('change', () => {
            if (elements.repetitionEndDate) {
                elements.repetitionEndDate.min = elements.meetingDate.value;
                // If end date is before start date, clear it
                if (elements.repetitionEndDate.value && elements.repetitionEndDate.value <= elements.meetingDate.value) {
                    elements.repetitionEndDate.value = '';
                }
            }
        });

        // Close modals on overlay click
        [elements.createMeetingModal, elements.meetingDetailModal, elements.deleteMeetingModal]
            .forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) hideModal(modal);
                });
            });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (elements.deleteMeetingModal.classList.contains('active')) {
                    hideModal(elements.deleteMeetingModal);
                } else if (elements.meetingDetailModal.classList.contains('active')) {
                    hideModal(elements.meetingDetailModal);
                } else if (elements.createMeetingModal.classList.contains('active')) {
                    hideModal(elements.createMeetingModal);
                }
            }
        });
    }

    // Week view rendering (simplified)
    function renderWeekView() {
        const startOfWeek = new Date(state.selectedDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        
        // Render week header
        let headerHtml = '<div class="time-column"></div>';
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            const isTodayClass = isToday(day) ? 'today' : '';
            headerHtml += `
                <div class="week-header-day ${isTodayClass}">
                    <div class="day-name">${day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</div>
                    <div class="day-number">${day.getDate()}</div>
                </div>
            `;
        }
        elements.weekHeader.innerHTML = headerHtml;
        
        // Render time grid
        let gridHtml = '';
        for (let hour = 8; hour <= 18; hour++) {
            gridHtml += `<div class="time-label">${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}</div>`;
            for (let day = 0; day < 7; day++) {
                gridHtml += `<div class="week-cell" data-hour="${hour}" data-day="${day}"></div>`;
            }
        }
        elements.weekGrid.innerHTML = gridHtml;
    }

    // ==========================================================================
    // Settings Module (Admin Only)
    // ==========================================================================
    
    if (typeof IS_MEETING_ADMIN !== 'undefined' && IS_MEETING_ADMIN) {
        const settingsElements = {
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettingsModal: document.getElementById('close-settings-modal'),
            roomsSection: document.getElementById('settings-rooms'),
            typesSection: document.getElementById('settings-types'),
            roomsList: document.getElementById('rooms-list'),
            typesList: document.getElementById('types-list'),
            addRoomBtn: document.getElementById('add-room-btn'),
            addTypeBtn: document.getElementById('add-type-btn'),
            roomFormModal: document.getElementById('room-form-modal'),
            typeFormModal: document.getElementById('type-form-modal'),
            deleteSettingsModal: document.getElementById('delete-settings-modal'),
        };
        
        let settingsState = {
            editingRoomId: null,
            editingTypeId: null,
            deletingItem: null, // {type: 'room'|'type', id: number}
        };
        
        // Settings API
        const settingsApi = {
            async getRooms() {
                const response = await fetch(MEETING_URLS.getAllRooms, {
                    headers: { 'X-CSRFToken': CSRF_TOKEN }
                });
                return response.json();
            },
            async createRoom(data) {
                const response = await fetch(MEETING_URLS.createRoom, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': CSRF_TOKEN
                    },
                    body: JSON.stringify(data)
                });
                return response.json();
            },
            async updateRoom(id, data) {
                const url = MEETING_URLS.updateRoom.replace('/0/', `/${id}/`);
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': CSRF_TOKEN
                    },
                    body: JSON.stringify(data)
                });
                return response.json();
            },
            async deleteRoom(id) {
                const url = MEETING_URLS.deleteRoom.replace('/0/', `/${id}/`);
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': CSRF_TOKEN }
                });
                return response.json();
            },
            async getTypes() {
                const response = await fetch(MEETING_URLS.getAllTypes, {
                    headers: { 'X-CSRFToken': CSRF_TOKEN }
                });
                return response.json();
            },
            async createType(data) {
                const response = await fetch(MEETING_URLS.createType, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': CSRF_TOKEN
                    },
                    body: JSON.stringify(data)
                });
                return response.json();
            },
            async updateType(id, data) {
                const url = MEETING_URLS.updateType.replace('/0/', `/${id}/`);
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': CSRF_TOKEN
                    },
                    body: JSON.stringify(data)
                });
                return response.json();
            },
            async deleteType(id) {
                const url = MEETING_URLS.deleteType.replace('/0/', `/${id}/`);
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': CSRF_TOKEN }
                });
                return response.json();
            },
            exportMeetings(month, year) {
                // Trigger file download
                window.location.href = `${MEETING_URLS.exportMeetings}?month=${month}&year=${year}`;
            }
        };
        
        // Initialize Export Section
        function initExportSection() {
            const exportMonthSelect = document.getElementById('export-month');
            const exportYearSelect = document.getElementById('export-year');
            const exportBtn = document.getElementById('export-meetings-btn');
            
            // Set current month
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            
            if (exportMonthSelect) {
                exportMonthSelect.value = currentMonth;
            }
            
            // Populate year dropdown (current year - 2 to current year + 2)
            if (exportYearSelect) {
                for (let year = currentYear - 2; year <= currentYear + 2; year++) {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    if (year === currentYear) {
                        option.selected = true;
                    }
                    exportYearSelect.appendChild(option);
                }
            }
            
            // Export button click
            exportBtn?.addEventListener('click', () => {
                const month = exportMonthSelect.value;
                const year = exportYearSelect.value;
                settingsApi.exportMeetings(month, year);
                showToast('Exporting meetings...', 'success');
            });
        }
        
        // Initialize export section when DOM is ready
        initExportSection();
        
        // Load rooms list
        async function loadRoomsList() {
            try {
                const data = await settingsApi.getRooms();
                if (data.rooms && data.rooms.length > 0) {
                    settingsElements.roomsList.innerHTML = data.rooms.map(room => `
                        <div class="settings-list-item ${room.is_active ? '' : 'inactive'}" data-id="${room.id}">
                            <div class="settings-item-info">
                                <div class="settings-item-color" style="background-color: ${room.color};"></div>
                                <div class="settings-item-details">
                                    <h5 class="settings-item-name">${room.name}</h5>
                                    <span class="settings-item-meta">
                                        <i class="fas fa-users"></i> ${room.capacity} 
                                        ${room.location ? `• <i class="fas fa-map-marker-alt"></i> ${room.location}` : ''}
                                        ${!room.is_active ? '• <span class="text-warning">Inactive</span>' : ''}
                                    </span>
                                </div>
                            </div>
                            <div class="settings-item-actions">
                                <button class="btn btn-icon edit-room-btn" data-id="${room.id}" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-icon btn-error delete-room-btn" data-id="${room.id}" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                    
                    // Add event listeners
                    settingsElements.roomsList.querySelectorAll('.edit-room-btn').forEach(btn => {
                        btn.addEventListener('click', () => openEditRoom(btn.dataset.id, data.rooms));
                    });
                    settingsElements.roomsList.querySelectorAll('.delete-room-btn').forEach(btn => {
                        btn.addEventListener('click', () => confirmDeleteRoom(btn.dataset.id));
                    });
                } else {
                    settingsElements.roomsList.innerHTML = `
                        <div class="settings-empty">
                            <i class="fas fa-door-open"></i>
                            <p>No meeting rooms yet. Click "Add Room" to create one.</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Failed to load rooms:', error);
            }
        }
        
        // Load types list
        async function loadTypesList() {
            try {
                const data = await settingsApi.getTypes();
                if (data.types && data.types.length > 0) {
                    settingsElements.typesList.innerHTML = data.types.map(type => `
                        <div class="settings-list-item ${type.is_active ? '' : 'inactive'}" data-id="${type.id}">
                            <div class="settings-item-info">
                                <div class="settings-item-icon" style="background-color: ${type.color}20; color: ${type.color};">
                                    <i class="fas ${type.icon}"></i>
                                </div>
                                <div class="settings-item-details">
                                    <h5 class="settings-item-name">${type.name}</h5>
                                    <span class="settings-item-meta">
                                        ${!type.is_active ? '<span class="text-warning">Inactive</span>' : ''}
                                    </span>
                                </div>
                            </div>
                            <div class="settings-item-actions">
                                <button class="btn btn-icon edit-type-btn" data-id="${type.id}" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-icon btn-error delete-type-btn" data-id="${type.id}" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('');
                    
                    // Add event listeners
                    settingsElements.typesList.querySelectorAll('.edit-type-btn').forEach(btn => {
                        btn.addEventListener('click', () => openEditType(btn.dataset.id, data.types));
                    });
                    settingsElements.typesList.querySelectorAll('.delete-type-btn').forEach(btn => {
                        btn.addEventListener('click', () => confirmDeleteType(btn.dataset.id));
                    });
                } else {
                    settingsElements.typesList.innerHTML = `
                        <div class="settings-empty">
                            <i class="fas fa-tags"></i>
                            <p>No meeting types yet. Click "Add Type" to create one.</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Failed to load types:', error);
            }
        }
        
        // Open add room modal
        function openAddRoom() {
            settingsState.editingRoomId = null;
            document.getElementById('room-form-title').textContent = 'Add Meeting Room';
            document.getElementById('room-id').value = '';
            document.getElementById('room-name').value = '';
            document.getElementById('room-description').value = '';
            document.getElementById('room-capacity').value = '10';
            document.getElementById('room-location').value = '';
            document.getElementById('room-active').checked = true;
            // Reset color palette to first option
            const firstColorOption = document.querySelector('input[name="room-color"]');
            if (firstColorOption) firstColorOption.checked = true;
            showModal(settingsElements.roomFormModal);
        }
        
        // Open edit room modal
        function openEditRoom(id, rooms) {
            const room = rooms.find(r => r.id == id);
            if (!room) return;
            
            settingsState.editingRoomId = id;
            document.getElementById('room-form-title').textContent = 'Edit Meeting Room';
            document.getElementById('room-id').value = room.id;
            document.getElementById('room-name').value = room.name;
            document.getElementById('room-description').value = room.description || '';
            document.getElementById('room-capacity').value = room.capacity;
            document.getElementById('room-location').value = room.location || '';
            document.getElementById('room-active').checked = room.is_active;
            // Set color palette selection
            const colorRadio = document.querySelector(`input[name="room-color"][value="${room.color}"]`);
            if (colorRadio) {
                colorRadio.checked = true;
            } else {
                // Default to first if color not found
                const firstColorOption = document.querySelector('input[name="room-color"]');
                if (firstColorOption) firstColorOption.checked = true;
            }
            showModal(settingsElements.roomFormModal);
        }
        
        // Save room
        async function saveRoom() {
            const selectedColor = document.querySelector('input[name="room-color"]:checked');
            const data = {
                name: document.getElementById('room-name').value,
                description: document.getElementById('room-description').value,
                capacity: parseInt(document.getElementById('room-capacity').value) || 10,
                color: selectedColor ? selectedColor.value : '#6366f1',
                location: document.getElementById('room-location').value,
                is_active: document.getElementById('room-active').checked
            };
            
            try {
                let result;
                if (settingsState.editingRoomId) {
                    result = await settingsApi.updateRoom(settingsState.editingRoomId, data);
                } else {
                    result = await settingsApi.createRoom(data);
                }
                
                if (result.success) {
                    showToast(settingsState.editingRoomId ? 'Room updated successfully' : 'Room created successfully', 'success');
                    hideModal(settingsElements.roomFormModal);
                    loadRoomsList();
                } else {
                    showToast(result.error || 'Failed to save room', 'error');
                }
            } catch (error) {
                showToast('Failed to save room', 'error');
            }
        }
        
        // Confirm delete room
        function confirmDeleteRoom(id) {
            settingsState.deletingItem = { type: 'room', id: id };
            document.getElementById('delete-settings-title').textContent = 'Delete Meeting Room?';
            document.getElementById('delete-settings-message').textContent = 'Are you sure you want to delete this room? If it has meetings, it will be deactivated instead.';
            showModal(settingsElements.deleteSettingsModal);
        }
        
        // Open add type modal
        function openAddType() {
            settingsState.editingTypeId = null;
            document.getElementById('type-form-title').textContent = 'Add Meeting Type';
            document.getElementById('type-id').value = '';
            document.getElementById('type-name').value = '';
            document.querySelector('input[name="type-icon"][value="fa-users"]').checked = true;
            // Reset color palette to first option
            const firstColorOption = document.querySelector('input[name="type-color"]');
            if (firstColorOption) firstColorOption.checked = true;
            document.getElementById('type-active').checked = true;
            showModal(settingsElements.typeFormModal);
        }
        
        // Open edit type modal
        function openEditType(id, types) {
            const type = types.find(t => t.id == id);
            if (!type) return;
            
            settingsState.editingTypeId = id;
            document.getElementById('type-form-title').textContent = 'Edit Meeting Type';
            document.getElementById('type-id').value = type.id;
            document.getElementById('type-name').value = type.name;
            const iconRadio = document.querySelector(`input[name="type-icon"][value="${type.icon}"]`);
            if (iconRadio) iconRadio.checked = true;
            // Set color palette selection
            const colorRadio = document.querySelector(`input[name="type-color"][value="${type.color}"]`);
            if (colorRadio) {
                colorRadio.checked = true;
            } else {
                // Default to first if color not found
                const firstColorOption = document.querySelector('input[name="type-color"]');
                if (firstColorOption) firstColorOption.checked = true;
            }
            document.getElementById('type-active').checked = type.is_active;
            showModal(settingsElements.typeFormModal);
        }
        
        // Save type
        async function saveType() {
            const selectedColor = document.querySelector('input[name="type-color"]:checked');
            const data = {
                name: document.getElementById('type-name').value,
                icon: document.querySelector('input[name="type-icon"]:checked').value,
                color: selectedColor ? selectedColor.value : '#6366f1',
                is_active: document.getElementById('type-active').checked
            };
            
            try {
                let result;
                if (settingsState.editingTypeId) {
                    result = await settingsApi.updateType(settingsState.editingTypeId, data);
                } else {
                    result = await settingsApi.createType(data);
                }
                
                if (result.success) {
                    showToast(settingsState.editingTypeId ? 'Type updated successfully' : 'Type created successfully', 'success');
                    hideModal(settingsElements.typeFormModal);
                    loadTypesList();
                } else {
                    showToast(result.error || 'Failed to save type', 'error');
                }
            } catch (error) {
                showToast('Failed to save type', 'error');
            }
        }
        
        // Confirm delete type
        function confirmDeleteType(id) {
            settingsState.deletingItem = { type: 'type', id: id };
            document.getElementById('delete-settings-title').textContent = 'Delete Meeting Type?';
            document.getElementById('delete-settings-message').textContent = 'Are you sure you want to delete this type? If it has meetings, it will be deactivated instead.';
            showModal(settingsElements.deleteSettingsModal);
        }
        
        // Perform delete
        async function performDelete() {
            if (!settingsState.deletingItem) return;
            
            try {
                let result;
                if (settingsState.deletingItem.type === 'room') {
                    result = await settingsApi.deleteRoom(settingsState.deletingItem.id);
                    if (result.success) {
                        showToast(result.soft_deleted ? 'Room deactivated' : 'Room deleted', 'success');
                        loadRoomsList();
                    }
                } else {
                    result = await settingsApi.deleteType(settingsState.deletingItem.id);
                    if (result.success) {
                        showToast(result.soft_deleted ? 'Type deactivated' : 'Type deleted', 'success');
                        loadTypesList();
                    }
                }
                
                if (!result.success) {
                    showToast(result.error || 'Failed to delete', 'error');
                }
            } catch (error) {
                showToast('Failed to delete', 'error');
            }
            
            hideModal(settingsElements.deleteSettingsModal);
            settingsState.deletingItem = null;
        }
        
        // Initialize settings event listeners
        function initSettingsEventListeners() {
            // Open settings modal
            settingsElements.settingsBtn?.addEventListener('click', () => {
                showModal(settingsElements.settingsModal);
                loadRoomsList();
                loadTypesList();
            });
            
            // Close settings modal
            settingsElements.closeSettingsModal?.addEventListener('click', () => {
                hideModal(settingsElements.settingsModal);
            });
            
            // Menu navigation
            document.querySelectorAll('.settings-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.querySelectorAll('.settings-menu-item').forEach(i => i.classList.remove('active'));
                    document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
                    
                    item.classList.add('active');
                    const section = item.dataset.section;
                    document.getElementById(`settings-${section}`).classList.add('active');
                });
            });
            
            // Add room button
            settingsElements.addRoomBtn?.addEventListener('click', openAddRoom);
            
            // Add type button
            settingsElements.addTypeBtn?.addEventListener('click', openAddType);
            
            // Close room form modal
            document.getElementById('close-room-form-modal')?.addEventListener('click', () => {
                hideModal(settingsElements.roomFormModal);
            });
            document.getElementById('cancel-room-btn')?.addEventListener('click', () => {
                hideModal(settingsElements.roomFormModal);
            });
            
            // Save room
            document.getElementById('save-room-btn')?.addEventListener('click', saveRoom);
            
            // Close type form modal
            document.getElementById('close-type-form-modal')?.addEventListener('click', () => {
                hideModal(settingsElements.typeFormModal);
            });
            document.getElementById('cancel-type-btn')?.addEventListener('click', () => {
                hideModal(settingsElements.typeFormModal);
            });
            
            // Save type
            document.getElementById('save-type-btn')?.addEventListener('click', saveType);
            
            // Delete confirmation
            document.getElementById('cancel-delete-settings-btn')?.addEventListener('click', () => {
                hideModal(settingsElements.deleteSettingsModal);
                settingsState.deletingItem = null;
            });
            document.getElementById('confirm-delete-settings-btn')?.addEventListener('click', performDelete);
        }
        
        initSettingsEventListeners();
    }

    // Initialize
    function init() {
        renderCalendar();
        initEventListeners();
        
        // Select today by default
        selectDate(state.selectedDate);
    }

    init();
});
