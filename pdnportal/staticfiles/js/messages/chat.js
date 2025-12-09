const ChatApp = (() => {
    let currentChat = null;
    let chats = [];
    let contacts = [];
    let messages = [];
    let replyTo = null;
    let selectedFile = null;
    let typingTimeout = null;
    let ws = null;

    const elements = {
        chatSidebar: document.getElementById('chat-sidebar'),
        chatMain: document.getElementById('chat-main'),
        chatEmptyState: document.getElementById('chat-empty-state'),
        chatActive: document.getElementById('chat-active'),
        conversationsList: document.getElementById('conversations-list'),
        contactsList: document.getElementById('contacts-list'),
        messagesWrapper: document.getElementById('messages-wrapper'),
        messageInput: document.getElementById('message-input'),
        sendBtn: document.getElementById('send-btn'),
        chatSearch: document.getElementById('chat-search'),
        backBtn: document.getElementById('back-btn'),
        newChatBtn: document.getElementById('new-chat-btn'),
        emptyNewChat: document.getElementById('empty-new-chat'),
        attachBtn: document.getElementById('attach-btn'),
        attachMenu: document.getElementById('attach-menu'),
        emojiBtn: document.getElementById('emoji-btn'),
        emojiPicker: document.getElementById('emoji-picker'),
        chatInfoBtn: document.getElementById('chat-info-btn'),
        chatInfoSidebar: document.getElementById('chat-info-sidebar'),
        closeInfoSidebar: document.getElementById('close-info-sidebar'),
        searchMessagesBtn: document.getElementById('search-messages-btn'),
        searchPanel: document.getElementById('search-panel'),
        closeSearchPanel: document.getElementById('close-search-panel'),
        scrollBottomBtn: document.getElementById('scroll-bottom-btn'),
        messagesContainer: document.getElementById('messages-container'),
        replyPreview: document.getElementById('reply-preview'),
        cancelReply: document.getElementById('cancel-reply'),
        filePreview: document.getElementById('file-preview'),
        cancelFile: document.getElementById('cancel-file'),
        imageInput: document.getElementById('image-input'),
        documentInput: document.getElementById('document-input'),
        contextMenu: document.getElementById('context-menu'),
        reactionsMenu: document.getElementById('reactions-menu'),
        newChatModal: document.getElementById('new-chat-modal'),
        forwardModal: document.getElementById('forward-modal'),
        deleteModal: document.getElementById('delete-modal'),
        imageViewer: document.getElementById('image-viewer'),
        addMembersModal: document.getElementById('add-members-modal')
    };

    const init = () => {
        loadChats();
        loadContacts();
        setupEventListeners();
        setupWebSocket();
        autoResizeTextarea();
    };

    const setupEventListeners = () => {
        const chatTabs = document.querySelectorAll('.chat-tab');
        chatTabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        if (elements.messageInput) {
            elements.messageInput.addEventListener('input', handleMessageInput);
            elements.messageInput.addEventListener('keydown', handleMessageKeydown);
        }

        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', sendMessage);
        }

        if (elements.backBtn) {
            elements.backBtn.addEventListener('click', () => {
                elements.chatActive.classList.remove('show');
                elements.chatSidebar.classList.remove('hidden');
                currentChat = null;
            });
        }

        if (elements.newChatBtn) {
            elements.newChatBtn.addEventListener('click', () => openModal(elements.newChatModal));
        }

        if (elements.emptyNewChat) {
            elements.emptyNewChat.addEventListener('click', () => openModal(elements.newChatModal));
        }

        if (elements.attachBtn) {
            elements.attachBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                elements.attachMenu.classList.toggle('show');
            });
        }

        document.addEventListener('click', (e) => {
            if (!elements.attachBtn.contains(e.target) && !elements.attachMenu.contains(e.target)) {
                elements.attachMenu.classList.remove('show');
            }
        });

        document.querySelectorAll('.attach-option').forEach(option => {
            option.addEventListener('click', () => {
                const type = option.dataset.type;
                if (type === 'image') {
                    elements.imageInput.click();
                } else if (type === 'document') {
                    elements.documentInput.click();
                }
                elements.attachMenu.classList.remove('show');
            });
        });

        if (elements.imageInput) {
            elements.imageInput.addEventListener('change', (e) => handleFileSelect(e, 'image'));
        }

        if (elements.documentInput) {
            elements.documentInput.addEventListener('change', (e) => handleFileSelect(e, 'document'));
        }

        if (elements.emojiBtn) {
            elements.emojiBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                elements.emojiPicker.classList.toggle('show');
            });
        }

        if (elements.chatInfoBtn) {
            elements.chatInfoBtn.addEventListener('click', () => {
                elements.chatInfoSidebar.classList.toggle('show');
            });
        }

        if (elements.closeInfoSidebar) {
            elements.closeInfoSidebar.addEventListener('click', () => {
                elements.chatInfoSidebar.classList.remove('show');
            });
        }

        if (elements.searchMessagesBtn) {
            elements.searchMessagesBtn.addEventListener('click', () => {
                elements.searchPanel.classList.toggle('show');
            });
        }

        if (elements.closeSearchPanel) {
            elements.closeSearchPanel.addEventListener('click', () => {
                elements.searchPanel.classList.remove('show');
            });
        }

        if (elements.scrollBottomBtn) {
            elements.scrollBottomBtn.addEventListener('click', () => {
                scrollToBottom();
            });
        }

        if (elements.messagesContainer) {
            elements.messagesContainer.addEventListener('scroll', handleScroll);
        }

        if (elements.cancelReply) {
            elements.cancelReply.addEventListener('click', () => {
                replyTo = null;
                elements.replyPreview.classList.remove('show');
            });
        }

        if (elements.cancelFile) {
            elements.cancelFile.addEventListener('click', () => {
                selectedFile = null;
                elements.filePreview.classList.remove('show');
            });
        }

        if (elements.chatSearch) {
            elements.chatSearch.addEventListener('input', handleChatSearch);
        }

        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) closeModal(modal);
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(modal);
            });
        });

        setupEmojiPicker();
        setupModalTabs();
        setupNewChatModal();
    };

    const setupWebSocket = () => {
        if (!CHAT_CONFIG || !CHAT_CONFIG.currentUserId) return;

        const wsUrl = `${CHAT_CONFIG.wsProtocol}//${window.location.host}/ws/chat/`;
        
        try {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('WebSocket connected');
            };

            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                handleWebSocketMessage(data);
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setTimeout(setupWebSocket, 5000);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Error setting up WebSocket:', error);
        }
    };

    const handleWebSocketMessage = (data) => {
        const { type, message, chat_id, user_id } = data;

        if (type === 'new_message') {
            if (currentChat && currentChat.id === chat_id) {
                appendMessage(message);
                markMessagesAsRead();
                scrollToBottom();
            } else {
                loadChats();
            }
        } else if (type === 'typing') {
            if (currentChat && currentChat.id === chat_id && user_id !== CHAT_CONFIG.currentUserId) {
                showTypingIndicator();
            }
        } else if (type === 'stop_typing') {
            if (currentChat && currentChat.id === chat_id) {
                hideTypingIndicator();
            }
        }
    };

    const loadChats = async () => {
        try {
            const response = await fetch('/chat/api/chats/');
            if (!response.ok) throw new Error('Failed to load chats');
            
            chats = await response.json();
            renderChats();
        } catch (error) {
            console.error('Error loading chats:', error);
            showToast('error', 'Error', 'Failed to load conversations');
        }
    };

    const loadContacts = async () => {
        try {
            const response = await fetch('/chat/api/contacts/');
            if (!response.ok) throw new Error('Failed to load contacts');
            
            contacts = await response.json();
            renderContacts();
        } catch (error) {
            console.error('Error loading contacts:', error);
            showToast('error', 'Error', 'Failed to load contacts');
        }
    };

    const renderChats = () => {
        if (!elements.conversationsList) return;

        if (chats.length === 0) {
            elements.conversationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No conversations yet</h3>
                    <p>Start a new chat to begin messaging</p>
                </div>
            `;
            return;
        }

        elements.conversationsList.innerHTML = chats.map(chat => `
            <div class="conversation-item ${chat.unread ? 'unread' : ''} ${currentChat && currentChat.id === chat.id ? 'active' : ''}" 
                 data-chat-id="${chat.id}" 
                 onclick="ChatApp.openChat(${chat.id})">
                <div class="avatar-wrapper">
                    ${chat.type === 'group' ? `
                        <div class="avatar group-avatar">
                            <i class="fas fa-users"></i>
                        </div>
                    ` : `
                        <div class="avatar">${getAvatarContent(chat.avatar_url, chat.name)}</div>
                        <span class="status-dot ${chat.online ? 'online' : ''}"></span>
                    `}
                </div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h4 class="conversation-name">${escapeHtml(chat.name)}</h4>
                        <span class="conversation-time">${chat.last_message_time || ''}</span>
                    </div>
                    <div class="conversation-preview">
                        <p class="last-message">
                            ${chat.last_message_is_file ? '<i class="fas fa-paperclip"></i>' : ''}
                            ${escapeHtml(chat.last_message || 'No messages yet')}
                        </p>
                        ${chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        updateUnreadCount();
    };

    const renderContacts = () => {
        if (!elements.contactsList) return;

        if (contacts.length === 0) {
            elements.contactsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <h3>No contacts yet</h3>
                    <p>Search and add contacts to start chatting</p>
                </div>
            `;
            return;
        }

        elements.contactsList.innerHTML = contacts.map(contact => `
            <div class="contact-item" data-user-id="${contact.id}">
                <div class="avatar-wrapper">
                    <div class="avatar">${getAvatarContent(contact.avatar_url, contact.name)}</div>
                    <span class="status-dot ${contact.online ? 'online' : ''}"></span>
                </div>
                <div class="contact-info">
                    <h4 class="contact-name">${escapeHtml(contact.name)}</h4>
                    <p class="contact-status">${escapeHtml(contact.title || contact.department || '')}</p>
                </div>
                <button class="btn btn-icon start-chat-btn" onclick="ChatApp.startDirectChat(${contact.id})" title="Start Chat">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        `).join('');
    };

    const openChat = async (chatId) => {
        try {
            const response = await fetch(`/chat/api/chats/${chatId}/`);
            if (!response.ok) throw new Error('Failed to load chat');
            
            const data = await response.json();
            currentChat = data.chat;
            messages = data.messages;

            renderChatHeader();
            renderMessages();
            markMessagesAsRead();
            
            elements.chatEmptyState.style.display = 'none';
            elements.chatActive.classList.add('show');
            
            if (window.innerWidth <= 768) {
                elements.chatSidebar.classList.add('hidden');
            }
            
            renderChats();
            scrollToBottom();
        } catch (error) {
            console.error('Error opening chat:', error);
            showToast('error', 'Error', 'Failed to load chat');
        }
    };

    const renderChatHeader = () => {
        if (!currentChat) return;

        const avatarContent = currentChat.type === 'group' 
            ? '<i class="fas fa-users"></i>'
            : getAvatarContent(currentChat.avatar_url, currentChat.name);

        document.getElementById('header-avatar').innerHTML = avatarContent;
        document.getElementById('header-name').textContent = currentChat.name;
        
        const statusText = document.getElementById('status-text');
        if (currentChat.type === 'group') {
            statusText.textContent = `${currentChat.participants.length} members`;
            document.getElementById('header-status').style.display = 'none';
            document.getElementById('members-section').classList.add('show');
        } else {
            statusText.textContent = currentChat.online ? 'Online' : 'Offline';
            document.getElementById('header-status').className = `status-dot ${currentChat.online ? 'online' : ''}`;
            document.getElementById('members-section').classList.remove('show');
        }
    };

    const renderMessages = () => {
        if (!elements.messagesWrapper) return;

        if (messages.length === 0) {
            elements.messagesWrapper.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-dots"></i>
                    <h3>No messages yet</h3>
                    <p>Start the conversation by sending a message</p>
                </div>
            `;
            return;
        }

        let lastDate = '';
        let html = '';

        messages.forEach(message => {
            const messageDate = new Date(message.timestamp).toDateString();
            
            if (messageDate !== lastDate) {
                html += `
                    <div class="date-separator">
                        <span>${formatDateSeparator(message.timestamp)}</span>
                    </div>
                `;
                lastDate = messageDate;
            }

            html += renderMessage(message);
        });

        elements.messagesWrapper.innerHTML = html;
    };

    const renderMessage = (message) => {
        const isSent = message.sender.id === CHAT_CONFIG.currentUserId;
        const time = new Date(message.timestamp).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });

        let contentHtml = '';
        
        if (message.reply_to) {
            contentHtml += `
                <div class="message-reply" onclick="ChatApp.scrollToMessage(${message.reply_to.id})">
                    <div class="reply-author">${escapeHtml(message.reply_to.sender_name)}</div>
                    <div class="reply-text">${escapeHtml(message.reply_to.content || 'File')}</div>
                </div>
            `;
        }

        if (message.file_url) {
            const isImage = /\.(jpg|jpeg|png|gif)$/i.test(message.file_url);
            
            if (isImage) {
                contentHtml += `
                    <div class="message-image" onclick="ChatApp.viewImage('${message.file_url}')">
                        <img src="${message.file_url}" alt="${escapeHtml(message.file_name || 'Image')}">
                    </div>
                `;
            } else {
                contentHtml += `
                    <div class="message-file" onclick="ChatApp.downloadFile('${message.file_url}', '${message.file_name}')">
                        <div class="message-file-icon">
                            <i class="fas ${getFileIcon(message.file_name)}"></i>
                        </div>
                        <div class="message-file-info">
                            <span class="message-file-name">${escapeHtml(message.file_name || 'File')}</span>
                            <span class="message-file-size">${formatFileSize(message.file_size)}</span>
                        </div>
                    </div>
                `;
            }
        }

        if (message.content) {
            contentHtml += `<p class="message-text">${linkify(escapeHtml(message.content))}</p>`;
        }

        if (message.reactions && message.reactions.length > 0) {
            const reactionGroups = groupReactions(message.reactions);
            contentHtml += `
                <div class="message-reactions">
                    ${reactionGroups.map(group => `
                        <div class="reaction-badge ${group.hasCurrentUser ? 'active' : ''}" 
                             onclick="ChatApp.toggleReaction(${message.id}, '${group.emoji}')">
                            <span>${group.emoji}</span>
                            <span class="reaction-count">${group.count}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="message-row ${isSent ? 'sent' : 'received'}" data-message-id="${message.id}"
                 oncontextmenu="ChatApp.showContextMenu(event, ${message.id}, ${isSent})">
                ${!isSent ? `
                    <div class="message-avatar">${getAvatarContent(message.sender.avatar_url, message.sender.name)}</div>
                ` : ''}
                <div class="message-bubble">
                    ${!isSent && currentChat.type === 'group' ? `
                        <div class="message-sender">${escapeHtml(message.sender.name)}</div>
                    ` : ''}
                    ${contentHtml}
                    <div class="message-meta">
                        <span>${time}</span>
                        ${isSent ? `
                            <span class="message-status ${message.read ? 'read' : ''}">
                                <i class="fas fa-check${message.read ? '-double' : ''}"></i>
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    };

    const appendMessage = (message) => {
        const messageHtml = renderMessage(message);
        elements.messagesWrapper.insertAdjacentHTML('beforeend', messageHtml);
        messages.push(message);
    };

    const handleMessageInput = () => {
        const value = elements.messageInput.value.trim();
        elements.sendBtn.disabled = !value && !selectedFile;

        if (ws && ws.readyState === WebSocket.OPEN && currentChat) {
            clearTimeout(typingTimeout);
            
            if (value) {
                ws.send(JSON.stringify({
                    type: 'typing',
                    chat_id: currentChat.id
                }));

                typingTimeout = setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: 'stop_typing',
                        chat_id: currentChat.id
                    }));
                }, 3000);
            }
        }
    };

    const handleMessageKeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const sendMessage = async () => {
        if (!currentChat) return;

        const content = elements.messageInput.value.trim();
        if (!content && !selectedFile) return;

        const formData = new FormData();
        if (content) formData.append('content', content);
        if (replyTo) formData.append('reply_to', replyTo);
        if (selectedFile) formData.append('file', selectedFile);

        try {
            elements.sendBtn.disabled = true;
            
            const response = await fetch(`/chat/api/chats/${currentChat.id}/messages/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': CHAT_CONFIG.csrfToken
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to send message');

            const data = await response.json();
            
            elements.messageInput.value = '';
            elements.messageInput.style.height = 'auto';
            replyTo = null;
            selectedFile = null;
            elements.replyPreview.classList.remove('show');
            elements.filePreview.classList.remove('show');
            
            appendMessage(data.message);
            scrollToBottom();
            loadChats();

        } catch (error) {
            console.error('Error sending message:', error);
            showToast('error', 'Error', 'Failed to send message');
        } finally {
            elements.sendBtn.disabled = false;
        }
    };

    const markMessagesAsRead = async () => {
        if (!currentChat) return;

        try {
            await fetch(`/chat/api/chats/${currentChat.id}/read/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CHAT_CONFIG.csrfToken
                }
            });

            loadChats();
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const startDirectChat = async (userId) => {
        try {
            const response = await fetch(`/chat/api/chats/direct/${userId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CHAT_CONFIG.csrfToken
                }
            });

            if (!response.ok) throw new Error('Failed to create chat');

            const data = await response.json();
            await loadChats();
            openChat(data.chat_id);
            
            switchTab('chats');
        } catch (error) {
            console.error('Error starting chat:', error);
            showToast('error', 'Error', 'Failed to start chat');
        }
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showToast('error', 'Error', 'File size exceeds 10MB limit');
            return;
        }

        selectedFile = file;
        
        document.getElementById('file-preview-icon').innerHTML = `<i class="fas ${getFileIcon(file.name)}"></i>`;
        document.getElementById('file-preview-name').textContent = file.name;
        document.getElementById('file-preview-size').textContent = formatFileSize(file.size);
        
        elements.filePreview.classList.add('show');
        elements.sendBtn.disabled = false;

        e.target.value = '';
    };

    const autoResizeTextarea = () => {
        if (!elements.messageInput) return;

        elements.messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    };

    const scrollToBottom = (smooth = true) => {
        if (!elements.messagesContainer) return;
        
        elements.messagesContainer.scrollTo({
            top: elements.messagesContainer.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    };

    const handleScroll = () => {
        if (!elements.messagesContainer || !elements.scrollBottomBtn) return;

        const { scrollTop, scrollHeight, clientHeight } = elements.messagesContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (isNearBottom) {
            elements.scrollBottomBtn.classList.remove('show');
        } else {
            elements.scrollBottomBtn.classList.add('show');
        }
    };

    const switchTab = (tab) => {
        const tabs = document.querySelectorAll('.chat-tab');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        document.querySelector(`.chat-tab[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    };

    const handleChatSearch = (e) => {
        const query = e.target.value.toLowerCase();
        
        document.querySelectorAll('.conversation-item').forEach(item => {
            const name = item.querySelector('.conversation-name').textContent.toLowerCase();
            const message = item.querySelector('.last-message').textContent.toLowerCase();
            
            if (name.includes(query) || message.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    };

    const setupEmojiPicker = () => {
        const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'];

        const emojiGrid = document.getElementById('emoji-grid');
        if (emojiGrid) {
            emojiGrid.innerHTML = emojis.map(emoji => 
                `<button class="emoji-item" onclick="ChatApp.insertEmoji('${emoji}')">${emoji}</button>`
            ).join('');
        }

        document.addEventListener('click', (e) => {
            if (!elements.emojiBtn.contains(e.target) && !elements.emojiPicker.contains(e.target)) {
                elements.emojiPicker.classList.remove('show');
            }
        });
    };

    const insertEmoji = (emoji) => {
        const input = elements.messageInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        
        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + emoji.length;
        
        handleMessageInput();
    };

    const setupModalTabs = () => {
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const modal = tab.closest('.modal-container');
                modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
                modal.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                modal.querySelector(`#${tab.dataset.modalTab}-tab`).classList.add('active');
            });
        });
    };

    const setupNewChatModal = () => {
        const contactSearch = document.getElementById('contact-search');
        const contactResults = document.getElementById('contact-results');
        const selectedContact = document.getElementById('selected-contact');
        const clearSelected = document.getElementById('clear-selected');
        const createChatBtn = document.getElementById('create-chat-btn');

        let selectedUser = null;

        if (contactSearch) {
            contactSearch.addEventListener('input', async (e) => {
                const query = e.target.value.trim();
                
                if (query.length < 2) {
                    contactResults.classList.remove('show');
                    return;
                }

                try {
                    const response = await fetch(`/chat/api/contacts/search/?query=${encodeURIComponent(query)}`);
                    const users = await response.json();

                    if (users.length === 0) {
                        contactResults.innerHTML = '<div style="padding: 12px; text-align: center; color: #a3a3a3;">No users found</div>';
                    } else {
                        contactResults.innerHTML = users.map(user => `
                            <div class="search-result-item" data-user-id="${user.id}">
                                <div class="avatar">${getAvatarContent(user.avatar_url, user.name)}</div>
                                <span>${escapeHtml(user.name)}</span>
                            </div>
                        `).join('');

                        contactResults.querySelectorAll('.search-result-item').forEach(item => {
                            item.addEventListener('click', () => {
                                const userId = item.dataset.userId;
                                const userName = item.querySelector('span').textContent;
                                const userAvatar = item.querySelector('.avatar').innerHTML;

                                selectedUser = { id: userId, name: userName };
                                document.getElementById('selected-avatar').innerHTML = userAvatar;
                                document.getElementById('selected-name').textContent = userName;
                                selectedContact.classList.add('show');
                                contactResults.classList.remove('show');
                                contactSearch.value = '';
                                createChatBtn.disabled = false;
                            });
                        });
                    }

                    contactResults.classList.add('show');
                } catch (error) {
                    console.error('Error searching users:', error);
                }
            });
        }

        if (clearSelected) {
            clearSelected.addEventListener('click', () => {
                selectedUser = null;
                selectedContact.classList.remove('show');
                createChatBtn.disabled = true;
            });
        }

        if (createChatBtn) {
            createChatBtn.addEventListener('click', async () => {
                if (!selectedUser) return;

                try {
                    await startDirectChat(selectedUser.id);
                    closeModal(elements.newChatModal);
                    selectedUser = null;
                    selectedContact.classList.remove('show');
                    createChatBtn.disabled = true;
                } catch (error) {
                    console.error('Error creating chat:', error);
                }
            });
        }
    };

    const showContextMenu = (e, messageId, isSent) => {
        e.preventDefault();
        
        const menu = elements.contextMenu;
        menu.style.display = 'block';
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        menu.classList.add('show');

        menu.querySelectorAll('[data-action="delete-all"]').forEach(el => {
            el.style.display = isSent ? 'flex' : 'none';
        });

        document.addEventListener('click', closeContextMenu);
    };

    const closeContextMenu = () => {
        elements.contextMenu.classList.remove('show');
        document.removeEventListener('click', closeContextMenu);
    };

    const showTypingIndicator = () => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.classList.add('show');
    };

    const hideTypingIndicator = () => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.classList.remove('show');
    };

    const updateUnreadCount = () => {
        const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
        const badge = document.getElementById('unread-count');
        
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.classList.add('show');
            } else {
                badge.classList.remove('show');
            }
        }
    };

    const openModal = (modal) => {
        if (modal) modal.classList.add('show');
    };

    const closeModal = (modal) => {
        if (modal) modal.classList.remove('show');
    };

    const showToast = (type, title, message) => {
        const container = elements.toastContainer || document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info'}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        });

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    };

    const getAvatarContent = (avatarUrl, name) => {
        if (avatarUrl) {
            return `<img src="${avatarUrl}" alt="${escapeHtml(name)}">`;
        }
        const initial = name ? name.charAt(0).toUpperCase() : '?';
        return initial;
    };

    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const linkify = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = (filename) => {
        if (!filename) return 'fa-file';
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel',
            'ppt': 'fa-file-powerpoint',
            'pptx': 'fa-file-powerpoint',
            'zip': 'fa-file-archive',
            'rar': 'fa-file-archive',
            'txt': 'fa-file-alt'
        };
        return iconMap[ext] || 'fa-file';
    };

    const formatDateSeparator = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    const groupReactions = (reactions) => {
        const groups = {};
        reactions.forEach(reaction => {
            if (!groups[reaction.emoji]) {
                groups[reaction.emoji] = {
                    emoji: reaction.emoji,
                    count: 0,
                    hasCurrentUser: false
                };
            }
            groups[reaction.emoji].count++;
            if (reaction.user_id === CHAT_CONFIG.currentUserId) {
                groups[reaction.emoji].hasCurrentUser = true;
            }
        });
        return Object.values(groups);
    };

    return {
        init,
        openChat,
        startDirectChat,
        insertEmoji,
        showContextMenu
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ChatApp.init);
} else {
    ChatApp.init();
}
