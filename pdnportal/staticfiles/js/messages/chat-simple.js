/**
 * UniSync Chat Module - Simplified Version
 * This is a simplified version of the chat.js file to fix the flickering and chat selection issues
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('EMERGENCY FIX: Loading simplified chat.js');

    // Add direct click handlers to all chat list items
    const chatItems = document.querySelectorAll('.Chat-list-item[data-chat-id]');
    console.log(`EMERGENCY FIX: Found ${chatItems.length} chat items`);
    
    chatItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get chat ID
            const chatId = this.getAttribute('data-chat-id');
            console.log(`EMERGENCY FIX: Chat item clicked, ID: ${chatId}`);
            
            // Mark this chat as active
            document.querySelectorAll('.Chat-list-item').forEach(i => {
                i.classList.remove('Chat-active');
            });
            this.classList.add('Chat-active');
            
            // Navigate directly to the chat page
            window.location.href = `/chat/${chatId}/`;
        });
    });
    
    // Select the first chat if none is selected
    if (chatItems.length > 0 && !document.querySelector('.Chat-list-item.Chat-active')) {
        console.log('EMERGENCY FIX: No chat selected, selecting the first one');
        const firstChat = chatItems[0];
        const chatId = firstChat.getAttribute('data-chat-id');
        
        // Mark as active
        firstChat.classList.add('Chat-active');
        
        // Navigate to the chat page
        window.location.href = `/chat/${chatId}/`;
    }
    
    // Add tab switching functionality
    const tabs = document.querySelectorAll('.Chat-tab[data-tab]');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            console.log(`EMERGENCY FIX: Tab clicked: ${tabName}`);
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab content
            document.querySelectorAll('.Chat-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
    
    // Add new chat button functionality
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            console.log('EMERGENCY FIX: New chat button clicked');
            const modal = document.getElementById('new-conversation-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }
    
    // Add modal close functionality
    const closeButtons = document.querySelectorAll('.JO-modal-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('EMERGENCY FIX: Modal close button clicked');
            const modal = this.closest('.JO-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
});
