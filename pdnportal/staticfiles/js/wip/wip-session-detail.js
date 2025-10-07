document.addEventListener('DOMContentLoaded', function() {
    // Initialize session detail functionality
    initializeAddInventoryButtons();
    initializeEditableFields();
    initializeDeleteEntryButtons();
    initializeCheckSessionButton();
    initializeEditSessionButton();
    initializeSectionToggles();
});

/**
 * Initialize add inventory buttons
 */
function initializeAddInventoryButtons() {
    const addButtons = document.querySelectorAll('.add-inventory-btn');
    
    addButtons.forEach(button => {
        button.addEventListener('click', function() {
            const type = this.dataset.type;
            const sessionId = this.dataset.sessionId;
            
            loadInventoryModal(type, sessionId);
        });
    });
}

/**
 * Load inventory modal based on type
 */
function loadInventoryModal(type, sessionId) {
    let url;
    
    switch(type) {
        case 'raw':
            url = `/wip-inventory/session/${sessionId}/add-raw-materials/`;
            break;
        case 'finished':
            url = `/wip-inventory/session/${sessionId}/add-finished-products/`;
            break;
        case 'wip':
            url = `/wip-inventory/session/${sessionId}/add-wip-products/`;
            break;
        default:
            showToast('Invalid inventory type', 'error');
            return;
    }
    
    // Show loading toast
    showToast('Loading form...', 'info');
    
    fetch(url, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.text())
    .then(html => {
        // Load the modal HTML into the dynamic container
        const container = document.getElementById('dynamicModalContainer');
        container.innerHTML = html;
        
        // Show the modal
        const modal = container.querySelector('.modal');
        if (modal) {
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
        }
    })
    .catch(error => {
        console.error('Error loading modal:', error);
        showToast('Error loading form', 'error');
    });
}

/**
 * Initialize editable fields for inline editing
 */
function initializeEditableFields() {
    const editableFields = document.querySelectorAll('.editable-field');
    
    editableFields.forEach(field => {
        field.addEventListener('blur', function() {
            const entryId = this.dataset.entryId;
            const fieldName = this.dataset.field;
            const newValue = this.value;
            const originalValue = this.dataset.originalValue || this.defaultValue;
            
            // Only update if value changed
            if (newValue !== originalValue) {
                updateEntryField(entryId, fieldName, newValue, this);
            }
        });
        
        // Store original value
        field.addEventListener('focus', function() {
            this.dataset.originalValue = this.value;
        });
        
        // Handle Enter key
        field.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                this.blur();
            }
        });
    });
}

/**
 * Update entry field via AJAX
 */
function updateEntryField(entryId, fieldName, newValue, fieldElement) {
    const formData = new FormData();
    formData.append('csrfmiddlewaretoken', getCsrfToken());
    formData.append(fieldName, newValue);
    
    // Show loading state
    fieldElement.style.opacity = '0.6';
    fieldElement.disabled = true;
    
    fetch(`/wip-inventory/entry/${entryId}/update/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update original value
            fieldElement.dataset.originalValue = newValue;
            fieldElement.classList.remove('is-invalid');
            fieldElement.classList.add('is-valid');
            
            // Remove validation class after a delay
            setTimeout(() => {
                fieldElement.classList.remove('is-valid');
            }, 2000);
            
            showToast('Entry updated successfully', 'success');
        } else {
            // Revert to original value
            fieldElement.value = fieldElement.dataset.originalValue;
            fieldElement.classList.add('is-invalid');
            
            if (data.errors && data.errors[fieldName]) {
                showToast(data.errors[fieldName][0], 'error');
            } else {
                showToast(data.error || 'Error updating entry', 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Revert to original value
        fieldElement.value = fieldElement.dataset.originalValue;
        fieldElement.classList.add('is-invalid');
        showToast('Error updating entry', 'error');
    })
    .finally(() => {
        // Reset loading state
        fieldElement.style.opacity = '1';
        fieldElement.disabled = false;
    });
}

/**
 * Initialize delete entry buttons
 */
function initializeDeleteEntryButtons() {
    const deleteButtons = document.querySelectorAll('.delete-entry-btn');
    const deleteModal = document.getElementById('deleteEntryModal');
    const confirmButton = document.getElementById('confirmDeleteEntry');
    
    if (!deleteModal || !confirmButton) return;
    
    let entryToDelete = null;
    
    // Handle delete button clicks
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            entryToDelete = this.dataset.entryId;
            
            // Show confirmation modal
            const modal = new bootstrap.Modal(deleteModal);
            modal.show();
        });
    });
    
    // Handle confirmation
    confirmButton.addEventListener('click', function() {
        if (!entryToDelete) return;
        
        const originalText = this.innerHTML;
        
        // Show loading state
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        
        fetch(`/wip-inventory/entry/${entryToDelete}/delete/`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Entry deleted successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(deleteModal);
                modal.hide();
                
                // Remove the table row
                const entryRow = document.querySelector(`[data-entry-id="${entryToDelete}"]`).closest('tr');
                if (entryRow) {
                    entryRow.style.transition = 'opacity 0.3s ease';
                    entryRow.style.opacity = '0';
                    setTimeout(() => {
                        entryRow.remove();
                        updateItemCounts();
                    }, 300);
                }
            } else {
                showToast(data.error || 'Error deleting entry', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error deleting entry', 'error');
        })
        .finally(() => {
            // Reset button state
            this.disabled = false;
            this.innerHTML = originalText;
            entryToDelete = null;
        });
    });
}

/**
 * Initialize check session button
 */
function initializeCheckSessionButton() {
    const checkButton = document.querySelector('.check-session-btn');
    const checkModal = document.getElementById('checkSessionModal');
    const confirmButton = document.getElementById('confirmCheckSession');
    
    if (!checkButton || !checkModal || !confirmButton) return;
    
    let sessionToCheck = null;
    
    // Handle check button click
    checkButton.addEventListener('click', function() {
        sessionToCheck = this.dataset.sessionId;
        
        // Show confirmation modal
        const modal = new bootstrap.Modal(checkModal);
        modal.show();
    });
    
    // Handle confirmation
    confirmButton.addEventListener('click', function() {
        if (!sessionToCheck) return;
        
        const originalText = this.innerHTML;
        
        // Show loading state
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        
        fetch(`/wip-inventory/session/${sessionToCheck}/check/`, {
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
 * Initialize edit session button
 */
function initializeEditSessionButton() {
    const editButton = document.querySelector('.edit-session-btn');
    const editModal = document.getElementById('editSessionModal');
    const editForm = document.getElementById('editSessionForm');
    
    if (!editButton || !editModal || !editForm) return;
    
    // Handle edit button click
    editButton.addEventListener('click', function() {
        const sessionId = this.dataset.sessionId;
        const lineId = this.dataset.lineId;
        const personResponsible = this.dataset.personResponsible;
        
        // Populate form
        document.getElementById('editSessionId').value = sessionId;
        document.getElementById('editSessionLine').value = lineId;
        document.getElementById('editPersonResponsible').value = personResponsible;
        
        // Show modal
        const modal = new bootstrap.Modal(editModal);
        modal.show();
    });
    
    // Handle form submission
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const sessionId = document.getElementById('editSessionId').value;
        const formData = new FormData(this);
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        fetch(`/wip-inventory/session/${sessionId}/edit/`, {
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
                const modal = bootstrap.Modal.getInstance(editModal);
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
 * Initialize section toggle functionality
 */
function initializeSectionToggles() {
    const sectionHeaders = document.querySelectorAll('.section-header[data-bs-toggle="collapse"]');
    
    sectionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const collapseIcon = this.querySelector('.collapse-icon');
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            // Toggle icon rotation
            if (collapseIcon) {
                if (isExpanded) {
                    collapseIcon.style.transform = 'rotate(-90deg)';
                } else {
                    collapseIcon.style.transform = 'rotate(0deg)';
                }
            }
        });
    });
}

/**
 * Update item counts in section headers
 */
function updateItemCounts() {
    const sections = document.querySelectorAll('.inventory-section');
    
    sections.forEach(section => {
        const countElement = section.querySelector('.item-count');
        const tableBody = section.querySelector('tbody');
        
        if (countElement && tableBody) {
            const rowCount = tableBody.querySelectorAll('tr').length;
            countElement.textContent = `(${rowCount} items)`;
        }
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
    
    // Show toast
    const toastInstance = new bootstrap.Toast(toast);
    toastInstance.show();
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toastInstance.hide();
        }
    }, 5000);
}

/**
 * Initialize auto-save functionality
 */
function initializeAutoSave() {
    const editableFields = document.querySelectorAll('.editable-field');
    let saveTimeout;
    
    editableFields.forEach(field => {
        field.addEventListener('input', function() {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.blur();
            }, 2000); // Auto-save after 2 seconds of inactivity
        });
    });
}

/**
 * Initialize bulk operations
 */
function initializeBulkOperations() {
    const selectAllCheckbox = document.querySelector('.select-all-checkbox');
    const entryCheckboxes = document.querySelectorAll('.entry-checkbox');
    const bulkActionButtons = document.querySelectorAll('.bulk-action-btn');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            entryCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateBulkActionButtons();
        });
    }
    
    entryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActionButtons);
    });
    
    bulkActionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.dataset.action;
            const selectedEntries = Array.from(entryCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            
            if (selectedEntries.length === 0) {
                showToast('Please select at least one entry', 'warning');
                return;
            }
            
            // Handle bulk actions
            handleBulkAction(action, selectedEntries);
        });
    });
}

/**
 * Update bulk action buttons state
 */
function updateBulkActionButtons() {
    const selectedCount = document.querySelectorAll('.entry-checkbox:checked').length;
    const bulkActionButtons = document.querySelectorAll('.bulk-action-btn');
    
    bulkActionButtons.forEach(button => {
        button.disabled = selectedCount === 0;
        if (selectedCount > 0) {
            button.textContent = button.textContent.replace(/\d+/, selectedCount);
        }
    });
} 