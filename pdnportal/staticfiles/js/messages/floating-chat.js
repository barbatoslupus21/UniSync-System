/**
 * Floating Chat Widget - Zimbra-like Messenger
 * Real-time chat with AJAX Long Polling
 */

const FloatingChat = (() => {
    // State
    let pollController = null; // AbortController for polling
    let isPolling = false;
    let lastMessageTimestamp = null;
    let contacts = [];
    let openChats = new Map();
    let openChatOrder = []; // Track order of opened chats for FIFO
    let currentStatus = 'online';
    let typingTimeouts = new Map();
    let unreadMessages = new Map();
    let heartbeatInterval = null;
    let onlineStatusInterval = null;

    // DOM Elements
    const elements = {
        widgetBtn: null,
        onlineCount: null,
        widgetUnread: null,
        contactPanel: null,
        closePanelBtn: null,
        statusCurrent: null,
        statusDropdown: null,
        contactSearch: null,
        contactList: null,
        windowsContainer: null
    };

    /**
     * Initialize the floating chat widget
     */
    const init = () => {
        if (!FLOATING_CHAT_CONFIG || !FLOATING_CHAT_CONFIG.currentUserId) {
            console.error('Floating chat config not found');
            return;
        }

        cacheElements();
        setupEventListeners();
        startLongPolling();
        startHeartbeat();
        startOnlineStatusPolling();
        loadContacts();
        setupEmojiPickers();
    };

    /**
     * Cache DOM elements
     */
    const cacheElements = () => {
        elements.widgetBtn = document.getElementById('chat-widget-btn');
        elements.onlineCount = document.getElementById('chat-online-count');
        elements.widgetUnread = document.getElementById('chat-widget-unread');
        elements.contactPanel = document.getElementById('chat-contact-panel');
        elements.closePanelBtn = document.getElementById('close-contact-panel');
        elements.contactSearch = document.getElementById('chat-contact-search');
        elements.contactList = document.getElementById('chat-contact-list');
        elements.windowsContainer = document.getElementById('chat-windows-container');
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Widget button hover effects
        if (elements.widgetBtn) {
            elements.widgetBtn.addEventListener('mouseenter', () => {
                if (!elements.contactPanel.classList.contains('show')) {
                    elements.widgetBtn.classList.add('expanded');
                    updateChatWindowsPosition(true);
                }
            });

            elements.widgetBtn.addEventListener('mouseleave', () => {
                if (!elements.contactPanel.classList.contains('show')) {
                    elements.widgetBtn.classList.remove('expanded');
                    updateChatWindowsPosition(false);
                }
            });

            elements.widgetBtn.addEventListener('click', toggleContactPanel);
        }

        // Close panel button
        if (elements.closePanelBtn) {
            elements.closePanelBtn.addEventListener('click', closeContactPanel);
        }

        // Contact search
        if (elements.contactSearch) {
            elements.contactSearch.addEventListener('input', handleContactSearch);
        }

        // Close panel on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeContactPanel();
            }
        });
    };

    /**
     * Start AJAX Short Polling for new messages
     * Using short polling to avoid SQLite database locking issues
     */
    const startLongPolling = () => {
        if (isPolling) return;
        isPolling = true;
        pollForMessages();
    };

    /**
     * Stop polling
     */
    const stopLongPolling = () => {
        isPolling = false;
        if (pollController) {
            pollController.abort();
            pollController = null;
        }
    };

    /**
     * Poll for new messages (short polling - every 2 seconds)
     */
    const pollForMessages = async () => {
        if (!isPolling) return;

        try {
            pollController = new AbortController();
            const timeoutId = setTimeout(() => pollController.abort(), 10000); // 10s timeout

            const url = `/chat/api/poll/messages/${lastMessageTimestamp ? `?since=${encodeURIComponent(lastMessageTimestamp)}` : ''}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': FLOATING_CHAT_CONFIG.csrfToken
                },
                signal: pollController.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                
                // Update timestamp
                if (data.timestamp) {
                    lastMessageTimestamp = data.timestamp;
                }

                // Process new messages
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        handleNewMessage(msg, msg.chat_id);
                    });
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Polling error:', error);
            }
        }

        // Continue polling after 2 seconds (short polling for SQLite compatibility)
        if (isPolling) {
            setTimeout(pollForMessages, 2000);
        }
    };

    /**
     * Start heartbeat to keep user online
     */
    const startHeartbeat = () => {
        // Send initial heartbeat
        sendHeartbeat();
        
        // Send heartbeat every 30 seconds
        heartbeatInterval = setInterval(sendHeartbeat, 30000);
    };

    /**
     * Send heartbeat to server
     */
    const sendHeartbeat = async () => {
        try {
            await fetch('/chat/api/heartbeat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': FLOATING_CHAT_CONFIG.csrfToken
                }
            });
        } catch (error) {
            console.error('Heartbeat error:', error);
        }
    };

    /**
     * Start polling for online status updates
     */
    const startOnlineStatusPolling = () => {
        // Initial check
        pollOnlineStatus();
        
        // Poll every 15 seconds
        onlineStatusInterval = setInterval(pollOnlineStatus, 15000);
    };

    /**
     * Poll for online status of contacts
     */
    const pollOnlineStatus = async () => {
        try {
            const response = await fetch('/chat/api/poll/online/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': FLOATING_CHAT_CONFIG.csrfToken
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.statuses) {
                    Object.entries(data.statuses).forEach(([userId, isOnline]) => {
                        updateUserStatus(parseInt(userId), isOnline ? 'online' : 'offline');
                    });
                }
            }
        } catch (error) {
            console.error('Online status polling error:', error);
        }
    };

    /**
     * Handle incoming messages from polling
     */
    const handlePolledMessage = (data) => {
        const { type, message, chat_id, user_id, status } = data;

        switch (type) {
            case 'new_message':
                handleNewMessage(message, chat_id);
                break;
            case 'typing':
                if (user_id !== FLOATING_CHAT_CONFIG.currentUserId) {
                    showTypingIndicator(chat_id, user_id);
                }
                break;
            case 'stop_typing':
                hideTypingIndicator(chat_id, user_id);
                break;
            case 'user_status':
                updateUserStatus(user_id, status);
                break;
            case 'read_receipt':
                updateReadReceipts(chat_id, message);
                break;
        }
    };

    /**
     * Load contacts from API
     */
    const loadContacts = async () => {
        try {
            const response = await fetch('/chat/api/contacts/');
            if (!response.ok) throw new Error('Failed to load contacts');
            
            contacts = await response.json();
            renderContacts();
            updateOnlineCount();
        } catch (error) {
            console.error('Error loading contacts:', error);
            showEmptyState('Failed to load contacts');
        }
    };

    /**
     * Render contacts list
     */
    const renderContacts = () => {
        if (!elements.contactList) return;

        if (contacts.length === 0) {
            showEmptyState('No contacts available');
            return;
        }

        elements.contactList.innerHTML = '';

        // Sort contacts by last message time (most recent first)
        const sortedContacts = [...contacts].sort((a, b) => {
            const timeA = a.last_message_time ? new Date(a.last_message_time) : new Date(0);
            const timeB = b.last_message_time ? new Date(b.last_message_time) : new Date(0);
            return timeB - timeA; // Most recent first
        });

        sortedContacts.forEach(contact => {
            const contactEl = createContactElement(contact);
            elements.contactList.appendChild(contactEl);
        });
    };    /**
     * Create contact element
     */
    const createContactElement = (contact) => {
        const template = document.getElementById('contact-item-template');
        const contactEl = template.content.cloneNode(true).querySelector('.chat-contact-item');
        
        contactEl.dataset.userId = contact.id;
        contactEl.dataset.status = contact.online ? 'online' : 'offline';
        
        // Avatar
        const avatar = contactEl.querySelector('.contact-avatar');
        if (contact.avatar_url) {
            avatar.innerHTML = `<img src="${contact.avatar_url}" alt="${escapeHtml(contact.name)}">`;
        } else {
            avatar.textContent = contact.name.charAt(0).toUpperCase();
        }
        
        // Name and status
        contactEl.querySelector('.contact-name').textContent = contact.name;
        contactEl.querySelector('.contact-status-text').textContent = contact.online ? 'Online' : 'Offline';
        
        // Unread badge
        const unreadBadge = contactEl.querySelector('.contact-unread-badge');
        const unreadCount = unreadMessages.get(contact.id) || 0;
        if (unreadCount > 0) {
            unreadBadge.textContent = unreadCount;
            unreadBadge.style.display = 'flex';
        }
        
        // Click handler
        contactEl.addEventListener('click', () => openChatWindow(contact));
        
        return contactEl;
    };

    /**
     * Show empty state
     */
    const showEmptyState = (message) => {
        elements.contactList.innerHTML = `
            <div class="chat-empty-state">
                <i class="fas fa-users"></i>
                <h3>No Contacts</h3>
                <p>${message}</p>
            </div>
        `;
    };

    /**
     * Toggle contact panel
     */
    const toggleContactPanel = () => {
        const isShowing = elements.contactPanel.classList.contains('show');

        if (isShowing) {
            closeContactPanel();
        } else {
            openContactPanel();
        }
    };

    /**
     * Open contact panel
     */
    const openContactPanel = () => {
        elements.contactPanel.classList.add('show');
        elements.widgetBtn.classList.add('expanded');
        elements.widgetBtn.classList.add('hidden');
        updateChatWindowsPosition(true);
        loadContacts();
    };

    /**
     * Close contact panel
     */
    const closeContactPanel = () => {
        elements.contactPanel.classList.remove('show');
        elements.widgetBtn.classList.remove('expanded');
        elements.widgetBtn.classList.remove('hidden');
        updateChatWindowsPosition(false);
    };

    /**
     * Update chat windows container position
     */
    const updateChatWindowsPosition = (expanded) => {
        if (elements.windowsContainer) {
            if (expanded) {
                elements.windowsContainer.classList.add('expanded');
            } else {
                elements.windowsContainer.classList.remove('expanded');
            }
        }
    };

    /**
     * Handle contact search
     */
    const handleContactSearch = (e) => {
        const query = e.target.value.toLowerCase();
        
        document.querySelectorAll('.chat-contact-item').forEach(item => {
            const name = item.querySelector('.contact-name').textContent.toLowerCase();
            item.style.display = name.includes(query) ? 'flex' : 'none';
        });
    };

    /**
     * Open chat window
     */
    const openChatWindow = async (contact) => {
        // Check if chat window already exists
        if (openChats.has(contact.id)) {
            const existingWindow = document.querySelector(`[data-chat-id="${contact.id}"]`);
            if (existingWindow?.classList.contains('minimized')) {
                existingWindow.classList.remove('minimized');
            }
            return;
        }

        // Check if we have 2 open chats already (implement FIFO)
        if (openChatOrder.length >= 2) {
            // Close the first opened chat (FIFO)
            const firstOpenedUserId = openChatOrder.shift();
            const firstWindow = document.querySelector(`.chat-window[data-user-id="${firstOpenedUserId}"]`);
            if (firstWindow) {
                closeChatWindow(firstWindow, firstOpenedUserId);
            }
        }

        // Create or get direct chat
        try {
            const response = await fetch(`/chat/api/chats/direct/${contact.id}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': FLOATING_CHAT_CONFIG.csrfToken
                }
            });

            if (!response.ok) throw new Error('Failed to create chat');

            const data = await response.json();
            const chatId = data.chat_id;

            // Load chat messages
            const messagesResponse = await fetch(`/chat/api/chats/${chatId}/`);
            const chatData = await messagesResponse.json();

            // Create chat window
            createChatWindow(contact, chatId, chatData.messages);

            // Mark as opened and track order
            openChats.set(contact.id, chatId);
            openChatOrder.push(contact.id);

            // Clear unread count
            clearUnreadCount(contact.id);

        } catch (error) {
            console.error('Error opening chat:', error);
        }
    };

    /**
     * Create chat window
     */
    const createChatWindow = (contact, chatId, messages = []) => {
        const template = document.getElementById('chat-window-template');
        const windowEl = template.content.cloneNode(true).querySelector('.chat-window');
        
        windowEl.dataset.chatId = chatId;
        windowEl.dataset.userId = contact.id;
        
        // Header
        const avatar = windowEl.querySelector('.chat-window-avatar');
        if (contact.avatar_url) {
            avatar.innerHTML = `<img src="${contact.avatar_url}" alt="${escapeHtml(contact.name)}">`;
        } else {
            avatar.textContent = contact.name.charAt(0).toUpperCase();
        }
        
        windowEl.querySelector('.chat-window-name').textContent = contact.name;
        windowEl.querySelector('.chat-window-status').textContent = contact.online ? 'Online' : 'Offline';
        
        // Messages
        const messagesContainer = windowEl.querySelector('.chat-window-messages');
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="chat-empty-state">
                    <i class="fas fa-comment-dots"></i>
                    <h3>Start Conversation</h3>
                    <p>Send a message to begin</p>
                </div>
            `;
        } else {
            messages.forEach(msg => {
                appendMessageToWindow(messagesContainer, msg);
            });
            scrollToBottom(messagesContainer);
        }
        
        // Event listeners
        setupChatWindowListeners(windowEl, contact, chatId);
        
        // Add to container
        elements.windowsContainer.appendChild(windowEl);
        
        // Close contact panel on mobile
        if (window.innerWidth <= 768) {
            closeContactPanel();
        }
    };

    /**
     * Setup chat window event listeners
     */
    const setupChatWindowListeners = (windowEl, contact, chatId) => {
        const input = windowEl.querySelector('.chat-window-input');
        const sendBtn = windowEl.querySelector('.chat-send-btn');
        const minimizeBtn = windowEl.querySelector('.chat-window-minimize');
        const closeBtn = windowEl.querySelector('.chat-window-close');
        const emojiBtn = windowEl.querySelector('.chat-emoji-btn');
        const emojiPicker = windowEl.querySelector('.chat-emoji-picker');

        // Header click to toggle minimize
        const header = windowEl.querySelector('.chat-window-header');
        header.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-window-actions')) {
                windowEl.classList.toggle('minimized');
            }
        });

        // Minimize button
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            windowEl.classList.toggle('minimized');
        });

        // Close button
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeChatWindow(windowEl, contact.id);
        });

        // Input handling
        input.addEventListener('input', () => {
            autoResizeTextarea(input);
            handleTyping(chatId);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage(windowEl, chatId, contact);
            }
        });

        // Send button
        sendBtn.addEventListener('click', () => {
            sendChatMessage(windowEl, chatId, contact);
        });

        // Emoji button
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
        });

        // Close emoji picker on outside click
        document.addEventListener('click', (e) => {
            if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
                emojiPicker.style.display = 'none';
            }
        });
    };

    /**
     * Send chat message
     */
    const sendChatMessage = async (windowEl, chatId, contact) => {
        const input = windowEl.querySelector('.chat-window-input');
        const content = input.value.trim();
        
        if (!content) return;

        try {
            const response = await fetch(`/chat/api/chats/${chatId}/messages/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': FLOATING_CHAT_CONFIG.csrfToken
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) throw new Error('Failed to send message');

            const data = await response.json();
            
            // Clear input
            input.value = '';
            input.style.height = 'auto';
            
            // Append message
            const messagesContainer = windowEl.querySelector('.chat-window-messages');
            
            // Remove empty state if exists
            const emptyState = messagesContainer.querySelector('.chat-empty-state');
            if (emptyState) emptyState.remove();
            
            appendMessageToWindow(messagesContainer, data.message);
            scrollToBottom(messagesContainer);
            
            // Stop typing indicator
            stopTyping(chatId);

        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    /**
     * Append message to chat window
     */
    const appendMessageToWindow = (container, message) => {
        const isSent = message.sender.id === FLOATING_CHAT_CONFIG.currentUserId;
        const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${isSent ? 'sent' : 'received'}`;
        messageEl.dataset.messageId = message.id;

        const avatar = document.createElement('div');
        avatar.className = 'chat-message-avatar';
        
        if (message.sender.avatar_url) {
            avatar.innerHTML = `<img src="${message.sender.avatar_url}" alt="${escapeHtml(message.sender.name)}">`;
        } else {
            avatar.textContent = message.sender.name.charAt(0).toUpperCase();
        }

        const bubble = document.createElement('div');
        bubble.className = 'chat-message-bubble';
        bubble.innerHTML = `
            ${escapeHtml(message.content)}
            <span class="chat-message-time">${time}</span>
        `;

        if (isSent) {
            messageEl.appendChild(bubble);
            messageEl.appendChild(avatar);
        } else {
            messageEl.appendChild(avatar);
            messageEl.appendChild(bubble);
        }

        container.appendChild(messageEl);
    };

    /**
     * Handle new incoming message
     */
    const handleNewMessage = (message, chatId) => {
        const windowEl = document.querySelector(`[data-chat-id="${chatId}"]`);
        
        if (windowEl && !windowEl.classList.contains('minimized')) {
            // Window is open, append message
            const messagesContainer = windowEl.querySelector('.chat-window-messages');
            const emptyState = messagesContainer.querySelector('.chat-empty-state');
            if (emptyState) emptyState.remove();
            
            appendMessageToWindow(messagesContainer, message);
            scrollToBottom(messagesContainer);
            
            // Mark as read
            markChatAsRead(chatId);
        } else {
            // Window is closed or minimized, increment unread
            const userId = message.sender.id;
            if (userId !== FLOATING_CHAT_CONFIG.currentUserId) {
                incrementUnreadCount(userId);
            }
        }
    };

    /**
     * Handle typing indicator - send to server via AJAX
     */
    const handleTyping = async (chatId) => {
        try {
            await fetch(`/chat/api/typing/${chatId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': FLOATING_CHAT_CONFIG.csrfToken
                },
                body: JSON.stringify({ typing: true })
            });

            // Clear existing timeout
            if (typingTimeouts.has(chatId)) {
                clearTimeout(typingTimeouts.get(chatId));
            }

            // Set new timeout to stop typing
            const timeout = setTimeout(() => {
                stopTyping(chatId);
            }, 3000);

            typingTimeouts.set(chatId, timeout);
        } catch (error) {
            console.error('Error sending typing indicator:', error);
        }
    };

    /**
     * Stop typing indicator - send to server via AJAX
     */
    const stopTyping = async (chatId) => {
        try {
            await fetch(`/chat/api/typing/${chatId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': FLOATING_CHAT_CONFIG.csrfToken
                },
                body: JSON.stringify({ typing: false })
            });
        } catch (error) {
            console.error('Error stopping typing indicator:', error);
        }

        if (typingTimeouts.has(chatId)) {
            clearTimeout(typingTimeouts.get(chatId));
            typingTimeouts.delete(chatId);
        }
    };

    /**
     * Show typing indicator in window
     */
    const showTypingIndicator = (chatId, userId) => {
        const windowEl = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (windowEl) {
            const indicator = windowEl.querySelector('.chat-window-typing');
            if (indicator) indicator.style.display = 'flex';
        }
    };

    /**
     * Hide typing indicator in window
     */
    const hideTypingIndicator = (chatId, userId) => {
        const windowEl = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (windowEl) {
            const indicator = windowEl.querySelector('.chat-window-typing');
            if (indicator) indicator.style.display = 'none';
        }
    };

    /**
     * Update user online status
     */
    const updateUserStatus = (userId, status) => {
        // Update in contacts list
        const contactItem = document.querySelector(`.chat-contact-item[data-user-id="${userId}"]`);
        if (contactItem) {
            contactItem.dataset.status = status;
            const statusText = contactItem.querySelector('.contact-status-text');
            if (statusText) {
                statusText.textContent = status === 'online' ? 'Online' : 'Offline';
            }
        }

        // Update in open chat window
        const windowEl = document.querySelector(`.chat-window[data-user-id="${userId}"]`);
        if (windowEl) {
            const statusEl = windowEl.querySelector('.chat-window-status');
            if (statusEl) {
                statusEl.textContent = status === 'online' ? 'Online' : 'Offline';
            }
        }

        // Update online count
        updateOnlineCount();
    };

    /**
     * Update online count
     */
    const updateOnlineCount = () => {
        const onlineCount = contacts.filter(c => c.online).length;
        if (elements.onlineCount) {
            elements.onlineCount.textContent = onlineCount;
        }
    };

    /**
     * Increment unread count
     */
    const incrementUnreadCount = (userId) => {
        const current = unreadMessages.get(userId) || 0;
        unreadMessages.set(userId, current + 1);
        
        updateUnreadBadges();
    };

    /**
     * Clear unread count
     */
    const clearUnreadCount = (userId) => {
        unreadMessages.delete(userId);
        updateUnreadBadges();
    };

    /**
     * Update unread badges
     */
    const updateUnreadBadges = () => {
        let totalUnread = 0;

        unreadMessages.forEach((count, userId) => {
            totalUnread += count;
            
            // Update contact badge
            const contactItem = document.querySelector(`.chat-contact-item[data-user-id="${userId}"]`);
            if (contactItem) {
                const badge = contactItem.querySelector('.contact-unread-badge');
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = 'flex';
                }
            }
        });

        // Update widget badge
        if (elements.widgetUnread) {
            if (totalUnread > 0) {
                elements.widgetUnread.textContent = totalUnread > 99 ? '99+' : totalUnread;
                elements.widgetUnread.style.display = 'block';
            } else {
                elements.widgetUnread.style.display = 'none';
            }
        }
    };

    /**
     * Mark chat as read
     */
    const markChatAsRead = async (chatId) => {
        try {
            await fetch(`/chat/api/chats/${chatId}/read/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': FLOATING_CHAT_CONFIG.csrfToken
                }
            });
        } catch (error) {
            console.error('Error marking chat as read:', error);
        }
    };

    /**
     * Close chat window
     */
    const closeChatWindow = (windowEl, userId) => {
        windowEl.remove();
        openChats.delete(userId);

        // Remove from order tracking
        const index = openChatOrder.indexOf(userId);
        if (index > -1) {
            openChatOrder.splice(index, 1);
        }
    };

    /**
     * Auto-resize textarea
     */
    const autoResizeTextarea = (textarea) => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
    };

    /**
     * Scroll to bottom of messages
     */
    const scrollToBottom = (container) => {
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    };

    /**
     * Setup emoji pickers
     */
    const setupEmojiPickers = () => {
        const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍', '👎', '👏', '🙌', '👋', '🤝', '🙏', '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'];

        const template = document.getElementById('chat-window-template');
        const emojiGrid = template.content.querySelector('.chat-emoji-grid');
        
        if (emojiGrid) {
            emojiGrid.innerHTML = emojis.map(emoji => 
                `<button type="button" class="emoji-item">${emoji}</button>`
            ).join('');
        }

        // Delegate emoji click events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-item')) {
                const windowEl = e.target.closest('.chat-window');
                if (windowEl) {
                    const input = windowEl.querySelector('.chat-window-input');
                    const emoji = e.target.textContent;
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const text = input.value;
                    
                    input.value = text.substring(0, start) + emoji + text.substring(end);
                    input.focus();
                    input.selectionStart = input.selectionEnd = start + emoji.length;
                    
                    // Hide picker
                    const picker = windowEl.querySelector('.chat-emoji-picker');
                    if (picker) picker.style.display = 'none';
                }
            }
        });
    };

    /**
     * Update online status - now handled by heartbeat
     */
    const updateOnlineStatus = () => {
        currentStatus = 'online'; // Always set to online
        // Heartbeat is now sent via sendHeartbeat() function
    };

    /**
     * Escape HTML to prevent XSS
     */
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    /**
     * Cleanup function for when page unloads
     */
    const cleanup = () => {
        stopLongPolling();
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (onlineStatusInterval) clearInterval(onlineStatusInterval);
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init,
        openChatWindow,
        loadContacts,
        cleanup
    };
})();

// Expose to global scope
window.FloatingChat = FloatingChat;
