document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard functionality
    initializeCreateSessionForm();
    initializeEditSessionForm();
    initializeDeleteSessionButtons();
    initializeCheckSessionButtons();
    
    // Auto-refresh functionality (optional)
    // setInterval(refreshSessionStatus, 30000); // Refresh every 30 seconds
});

/**
 * Initialize create session form
 */
function initializeCreateSessionForm() {
    const createSessionForm = document.getElementById('createSessionForm');
    if (!createSessionForm) return;
    
    createSessionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        fetch('/wip/session/create/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Session created successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createSessionModal'));
                modal.hide();
                
                // Redirect to session detail page
                if (data.redirect_url) {
                    setTimeout(() => {
                        window.location.href = data.redirect_url;
                    }, 1000);
                } else {
                    // Reload page to show new session
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            } else {
                // Handle form errors
                if (data.errors) {
                    Object.keys(data.errors).forEach(field => {
                        const fieldElement = document.querySelector(`[name="${field}"]`);
                        if (fieldElement) {
                            fieldElement.classList.add('is-invalid');
                        }
                        
                        data.errors[field].forEach(error => {
                            showToast(error, 'error');
                        });
                    });
                } else {
                    showToast(data.error || 'Error creating session', 'error');
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error creating session', 'error');
        })
        .finally(() => {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        });
    });
    
    // Clear validation on input
    const formInputs = createSessionForm.querySelectorAll('input, select');
    formInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('is-invalid');
        });
    });
}

/**
 * Initialize edit session form
 */
function initializeEditSessionForm() {
    const editSessionButtons = document.querySelectorAll('.edit-session-btn');
    const editSessionModal = document.getElementById('editSessionModal');
    const editSessionForm = document.getElementById('editSessionForm');
    
    if (!editSessionModal || !editSessionForm) return;
    
    // Handle edit button clicks
    editSessionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sessionId = this.dataset.sessionId;
            const lineId = this.dataset.lineId;
            const personResponsible = this.dataset.personResponsible;
            
            // Populate form
            document.getElementById('editSessionId').value = sessionId;
            document.getElementById('editSessionLine').value = lineId;
            document.getElementById('editPersonResponsible').value = personResponsible;
            
            // Show modal
            const modal = new bootstrap.Modal(editSessionModal);
            modal.show();
        });
    });
    
    // Handle form submission
    editSessionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const sessionId = document.getElementById('editSessionId').value;
        const formData = new FormData(this);
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        fetch(`/wip/session/${sessionId}/edit/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Session updated successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(editSessionModal);
                modal.hide();
                
                // Reload page to show updated data
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                if (data.errors) {
                    Object.keys(data.errors).forEach(field => {
                        data.errors[field].forEach(error => {
                            showToast(error, 'error');
                        });
                    });
                } else {
                    showToast(data.error || 'Error updating session', 'error');
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error updating session', 'error');
        })
        .finally(() => {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        });
    });
}

/**
 * Initialize delete session buttons
 */
function initializeDeleteSessionButtons() {
    const deleteButtons = document.querySelectorAll('.delete-session-btn');
    const deleteModal = document.getElementById('deleteSessionModal');
    const confirmButton = document.getElementById('confirmDeleteSession');
    
    if (!deleteModal || !confirmButton) return;
    
    let sessionToDelete = null;
    
    // Handle delete button clicks
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            sessionToDelete = this.dataset.sessionId;
            
            // Show confirmation modal
            const modal = new bootstrap.Modal(deleteModal);
            modal.show();
        });
    });
    
    // Handle confirmation
    confirmButton.addEventListener('click', function() {
        if (!sessionToDelete) return;
        
        const originalText = this.innerHTML;
        
        // Show loading state
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        
        fetch(`/wip/session/${sessionToDelete}/delete/`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Session deleted successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(deleteModal);
                modal.hide();
                
                // Reload page to show updated list
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(data.error || 'Error deleting session', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error deleting session', 'error');
        })
        .finally(() => {
            // Reset button state
            this.disabled = false;
            this.innerHTML = originalText;
            sessionToDelete = null;
        });
    });
}

/**
 * Initialize check session buttons
 */
function initializeCheckSessionButtons() {
    const checkButtons = document.querySelectorAll('.check-session-btn');
    const checkModal = document.getElementById('checkSessionModal');
    const confirmButton = document.getElementById('confirmCheckSession');
    
    if (!checkModal || !confirmButton) return;
    
    let sessionToCheck = null;
    
    // Handle check button clicks
    checkButtons.forEach(button => {
        button.addEventListener('click', function() {
            sessionToCheck = this.dataset.sessionId;
            
            // Show confirmation modal
            const modal = new bootstrap.Modal(checkModal);
            modal.show();
        });
    });
    
    // Handle confirmation
    confirmButton.addEventListener('click', function() {
        if (!sessionToCheck) return;
        
        const originalText = this.innerHTML;
        
        // Show loading state
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        
        fetch(`/wip/session/${sessionToCheck}/check/`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Session marked as checked!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(checkModal);
                modal.hide();
                
                // Reload page to show updated status
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(data.error || 'Error checking session', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error checking session', 'error');
        })
        .finally(() => {
            // Reset button state
            this.disabled = false;
            this.innerHTML = originalText;
            sessionToCheck = null;
        });
    });
}

/**
 * Get CSRF token from DOM
 */
function getCsrfToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token ? token.value : '';
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    // Add to toast container or body
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: type === 'error' ? 8000 : 5000
    });
    
    bsToast.show();
    
    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

/**
 * Refresh session status (optional functionality)
 */
function refreshSessionStatus() {
    // This function can be called periodically to update session statuses
    // Implementation depends on whether you want real-time updates
    const statusBadges = document.querySelectorAll('.status-badge');
    
    // You could fetch updated status data and update the badges
    // For now, this is a placeholder function
}

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N for new session
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const createButton = document.querySelector('[data-bs-target="#createSessionModal"]');
        if (createButton) {
            createButton.click();
        }
    }
    
    // ESC to close modals
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }
});

/**
 * Search functionality for sessions table
 */
function initializeTableSearch() {
    const searchInput = document.getElementById('sessionSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const tableRows = document.querySelectorAll('tbody tr');
        
        tableRows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

/**
 * Initialize table sorting
 */
function initializeTableSorting() {
    const sortableHeaders = document.querySelectorAll('th[data-sortable]');
    
    sortableHeaders.forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', function() {
            const column = this.dataset.sortable;
            const table = this.closest('table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            
            // Determine sort direction
            const currentOrder = this.dataset.sortOrder || 'asc';
            const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
            this.dataset.sortOrder = newOrder;
            
            // Sort rows
            rows.sort((a, b) => {
                const aValue = a.querySelector(`td:nth-child(${this.cellIndex + 1})`).textContent.trim();
                const bValue = b.querySelector(`td:nth-child(${this.cellIndex + 1})`).textContent.trim();
                
                if (newOrder === 'asc') {
                    return aValue.localeCompare(bValue);
                } else {
                    return bValue.localeCompare(aValue);
                }
            });
            
            // Rebuild tbody
            rows.forEach(row => tbody.appendChild(row));
            
            // Update header indicators
            sortableHeaders.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
            this.classList.add(`sorted-${newOrder}`);
        });
    });
}