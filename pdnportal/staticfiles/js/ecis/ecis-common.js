/**
 * ECIS Registry - Common JavaScript
 * Shared functionality across all ECIS views
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize common functionality
    initModals();
    initToasts();
});

/**
 * Initialize modal functionality
 */
function initModals() {
    // Close buttons for all modals
    const closeButtons = document.querySelectorAll('.ecis-modal-close, .ecis-close-details, .ecis-cancel-btn, .ecis-confirm-ok');

    if (closeButtons.length) {
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.ecis-modal');
                if (modal) {
                    closeModal(modal);
                }
            });
        });
    }

    // Close modal when clicking outside
    const modals = document.querySelectorAll('.ecis-modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.ecis-modal.active');
            if (activeModal) {
                closeModal(activeModal);
            }
        }
    });
}

/**
 * Initialize toast notifications
 */
function initToasts() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

/**
 * Open a modal
 * @param {HTMLElement} modal - The modal element to open
 */
function openModal(modal) {
    if (!modal) return;

    // Add active class to show the modal
    modal.classList.add('active');

    // Add animation class
    modal.querySelector('.ecis-modal-content').style.animation = 'ecis-modal-appear 0.3s ease-out forwards';

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    // Focus the first input or button in the modal
    setTimeout(() => {
        const firstInput = modal.querySelector('input, button:not(.ecis-modal-close)');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}

/**
 * Close a modal
 * @param {HTMLElement} modal - The modal element to close
 */
function closeModal(modal) {
    if (!modal) return;

    // Add closing animation
    const modalContent = modal.querySelector('.ecis-modal-content');
    modalContent.style.animation = 'ecis-fade-out 0.2s ease-out forwards';

    // Remove active class after animation completes
    setTimeout(() => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }, 200);
}

/**
 * Show a toast notification
 * @param {string} title - The title of the toast
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 */
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Set icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    // Create toast content
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Add animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Add close button functionality
    const closeButton = toast.querySelector('.toast-close');
    closeButton.addEventListener('click', () => {
        removeToast(toast);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
}

/**
 * Remove a toast notification with animation
 * @param {HTMLElement} toast - The toast element to remove
 */
function removeToast(toast) {
    toast.classList.add('hiding');

    setTimeout(() => {
        toast.remove();
    }, 300);
}