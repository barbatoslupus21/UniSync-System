/**
 * ECIS Registry - Requestor JavaScript
 * Specific functionality for the requestor view
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize requestor-specific functionality
    initNewRequestButton();
    initCategoryItems();
    initFormValidation();
    initCancelRequest();
    initDetailsButtons();
    initEditButtons();
    initModalCloseButtons();

    // Set up a MutationObserver to automatically remove any validation error messages
    const modalBody = document.querySelector('.ecis-modal-body');
    if (modalBody) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check for added error messages
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && (
                            node.classList && node.classList.contains('ecis-form-error') ||
                            (node.tagName === 'DIV' && !node.classList.contains('ecis-form-section') &&
                             !node.classList.contains('ecis-form-grid') &&
                             !node.classList.contains('ecis-form-group') &&
                             !node.classList.contains('ecis-confirmation-container'))
                        )) {
                            // Get the error message
                            const errorMessage = node.textContent.trim();

                            // Remove the error element
                            node.parentNode.removeChild(node);

                            // Show toast notification instead
                            if (errorMessage && typeof createToast === 'function') {
                                createToast(errorMessage, 'error', 5000);
                            }
                        }
                    });
                }
            });
        });

        // Start observing the modal body for added nodes
        observer.observe(modalBody, { childList: true });
    }
});

// Initialize New Request button
function initNewRequestButton() {
    const newEcisBtn = document.getElementById('new-ecis-btn');
    const newEcisModal = document.getElementById('new-ecis-modal');

    if (newEcisBtn && newEcisModal) {
        newEcisBtn.addEventListener('click', function() {
            // Reset the form
            const form = document.getElementById('ecis-form');
            if (form) {
                form.reset();

                // Reset form header in case it was changed for editing
                const modalHeader = newEcisModal.querySelector('.ecis-modal-header h2');
                if (modalHeader) {
                    modalHeader.textContent = 'Request New ECIS';
                }

                // Show the category section for new ECIS
                const categorySection = document.querySelector('.ecis-form-section:first-child');
                if (categorySection) {
                    categorySection.style.display = 'block';
                }

                // Reset form action
                form.action = form.getAttribute('data-create-url');
            }

            // Open the modal
            openModal(newEcisModal);

            // Add micro-animation to button
            this.classList.add('ecis-button-pulse');
            setTimeout(() => {
                this.classList.remove('ecis-button-pulse');
            }, 500);
        });
    }
}

// Initialize ECIS details view buttons
function initDetailsButtons() {
    const viewDetailsButtons = document.querySelectorAll('.ecis-icon-button[title="View Details"]');
    const ecisDetailsModal = document.getElementById('ecis-details-modal');

    if (viewDetailsButtons.length && ecisDetailsModal) {
        viewDetailsButtons.forEach(button => {
            button.addEventListener('click', function() {
                const ecisId = this.getAttribute('data-id');

                // Show loading state in modal
                const detailsContent = document.getElementById('ecis-details-content');
                if (detailsContent) {
                    detailsContent.innerHTML = `
                        <div class="ecis-loading-state">
                            <i class="fas fa-spinner fa-spin fa-2x"></i>
                            <p>Loading ECIS details...</p>
                        </div>
                    `;
                }

                // Open the modal
                openModal(ecisDetailsModal);

                // Fetch ECIS details via AJAX
                console.log('Fetching ECIS details for ID:', ecisId);
                // The correct URL should be /ecis/ecis/{id}/ based on the URL configuration
                const url = `/ecis/ecis/${ecisId}/`;
                console.log('Request URL:', url);

                // Add debugging for network request
                console.log('Making fetch request to:', url);

                fetch(url)
                    .then(response => {
                        console.log('Response status:', response.status);
                        console.log('Response headers:', response.headers);
                        if (!response.ok) {
                            throw new Error(`Network response was not ok: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Received data:', data);
                        console.log('Data type:', typeof data);
                        console.log('Data keys:', Object.keys(data));

                        // Populate details in modal
                        console.log('Calling updateDetailsModal with data');
                        updateDetailsModal(data);
                        console.log('updateDetailsModal called');
                    })
                    .catch(error => {
                        console.error('Error fetching ECIS details:', error);
                        const detailsContent = document.getElementById('ecis-details-content');
                        if (detailsContent) {
                            detailsContent.innerHTML = `
                                <div class="ecis-error-state">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Failed to load ECIS details. Please try again.</p>
                                    <small>Error: ${error.message}</small>
                                </div>
                            `;
                        }
                        showToast('Error', 'Failed to load ECIS details. Please try again.', 'error');
                    });

                // Add animation to the row
                const row = this.closest('tr');
                if (row) {
                    row.style.transition = 'background-color 0.3s ease';
                    row.style.backgroundColor = 'rgba(51, 102, 255, 0.1)';
                    setTimeout(() => {
                        row.style.backgroundColor = '';
                    }, 500);
                }
            });
        });
    }
}

// Update the details modal with data from AJAX response
function updateDetailsModal(data) {
    console.log('updateDetailsModal called with data:', data);
    console.log('Data properties:', Object.getOwnPropertyNames(data));

    const detailsContent = document.getElementById('ecis-details-content');
    console.log('detailsContent element:', detailsContent);
    if (!detailsContent) {
        console.error('detailsContent element not found');
        return;
    }

    console.log('detailsContent parent:', detailsContent.parentElement);
    console.log('Modal state:', document.getElementById('ecis-details-modal').classList.contains('active'));

    // Generate HTML for the details view
    const html = `
        <div class="ecis-details-header">
            <div class="ecis-details-id">
                <h3 id="ecis-detail-number">${data.number}</h3>
                <span class="ecis-category-pill ecis-cat-${data.category}">${data.category}</span>
                <span class="ecis-status ecis-status-${data.status.toLowerCase().replace(/\s+/g, '')}">${data.status}</span>
            </div>
            <div class="ecis-details-date">
                <p>Date Prepared: <span id="ecis-detail-date">${data.date_prepared}</span></p>
                <p>Last Updated: <span id="ecis-detail-updated">${data.last_updated}</span></p>
            </div>
        </div>

        <div class="ecis-details-section">
            <h4>Basic Information</h4>
            <div class="ecis-details-grid">
                <div class="ecis-details-item">
                    <span class="ecis-details-label">Department</span>
                    <span class="ecis-details-value" id="ecis-detail-department">${data.department}</span>
                </div>
                <div class="ecis-details-item">
                    <span class="ecis-details-label">Requested By</span>
                    <span class="ecis-details-value" id="ecis-detail-requester">${data.requested_by}</span>
                </div>
                <div class="ecis-details-item">
                    <span class="ecis-details-label">Customer</span>
                    <span class="ecis-details-value" id="ecis-detail-customer">${data.customer || 'N/A'}</span>
                </div>
                <div class="ecis-details-item">
                    <span class="ecis-details-label">Line Supervisor</span>
                    <span class="ecis-details-value" id="ecis-detail-supervisor">${data.line_supervisor || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="ecis-details-section">
            <h4>Change Information</h4>
            <div class="ecis-details-item">
                <span class="ecis-details-label">Affected Parts</span>
                <span class="ecis-details-value" id="ecis-detail-parts">${data.affected_parts}</span>
            </div>
            <div class="ecis-details-item">
                <span class="ecis-details-label">Details of Change</span>
                <p class="ecis-details-text" id="ecis-detail-change">${data.details_change}</p>
            </div>
            <div class="ecis-details-item">
                <span class="ecis-details-label">Implementation Date</span>
                <span class="ecis-details-value" id="ecis-detail-implementation">${data.implementation_date}</span>
            </div>
        </div>

        <div class="ecis-details-section" id="facilitator-section">
            <h4>Facilitator Remarks</h4>
            <div class="ecis-facilitator-remarks" id="ecis-detail-remarks">
                ${data.facilitator_remarks || 'No facilitator remarks available.'}
            </div>
        </div>
    `;

    // Set the content
    console.log('Setting innerHTML with HTML:', html);
    detailsContent.innerHTML = html;
    console.log('innerHTML set, current content:', detailsContent.innerHTML);

    // Add action buttons based on status
    const actionButtonsContainer = document.getElementById('ecis-action-buttons');
    console.log('actionButtonsContainer element:', actionButtonsContainer);
    if (actionButtonsContainer) {
        actionButtonsContainer.innerHTML = '';

        if (data.can_cancel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'ecis-button ecis-danger-button ecis-cancel-request';
            cancelBtn.setAttribute('data-id', data.id);
            cancelBtn.innerHTML = 'Cancel Request';
            actionButtonsContainer.appendChild(cancelBtn);

            cancelBtn.addEventListener('click', function() {
                showCancelConfirmation(data.id, data.number);
            });
        }
    }
}

// Initialize edit functionality
function initEditButtons() {
    const editButtons = document.querySelectorAll('.ecis-edit-btn');

    if (editButtons.length) {
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const ecisId = this.getAttribute('data-id');
                loadEditForm(ecisId);
            });
        });
    }

    // Also handle edit buttons within the details modal
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('ecis-edit-request')) {
            const ecisId = e.target.getAttribute('data-id');
            loadEditForm(ecisId);
        }
    });
}

// Load edit form with ECIS data
function loadEditForm(ecisId) {
    const newEcisModal = document.getElementById('new-ecis-modal');
    if (!newEcisModal) return;

    // Close details modal if open
    const detailsModal = document.getElementById('ecis-details-modal');
    if (detailsModal && detailsModal.classList.contains('active')) {
        closeModal(detailsModal);
    }

    // Change modal title
    const modalHeader = newEcisModal.querySelector('.ecis-modal-header h2');
    if (modalHeader) {
        modalHeader.textContent = 'Edit ECIS Request';
    }

    // Hide the entire category section when editing
    const categorySection = document.querySelector('.ecis-form-section:first-child');
    if (categorySection) {
        categorySection.style.display = 'none';
    }

    // Get modal body without showing loading state
    const modalBody = newEcisModal.querySelector('.ecis-modal-body');
    if (modalBody) {
        // Store original content
        const originalContent = modalBody.innerHTML;

        // Open modal first
        openModal(newEcisModal);

        // Fetch ECIS data
        fetch(`/ecis/ecis/${ecisId}/edit/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Restore form
                modalBody.innerHTML = originalContent;

                // Update form action
                const form = document.getElementById('ecis-form');
                form.action = `/ecis/ecis/${ecisId}/edit/`;

                // Fill form with data
                if (form) {
                    // Set category radio button
                    const categoryRadios = form.querySelectorAll('input[name="category"]');
                    categoryRadios.forEach(radio => {
                        if (radio.value === data.category) {
                            radio.checked = true;
                        }
                    });

                    // Set text inputs
                    form.querySelector('#department').value = data.department;
                    form.querySelector('#requested-by').value = data.requested_by;
                    form.querySelector('#customer').value = data.customer;
                    form.querySelector('#line-supervisor').value = data.line_supervisor;
                    form.querySelector('#affected-parts').value = data.affected_parts;
                    form.querySelector('#details-change').value = data.details_change;
                    form.querySelector('#implementation-date').value = data.implementation_date;
                }
            })
            .catch(error => {
                console.error('Error loading ECIS data:', error);

                // Just restore form without showing error toast
                modalBody.innerHTML = originalContent;

                // Add a small error message inside the form instead of a toast
                const errorMsg = document.createElement('div');
                errorMsg.className = 'alert alert-danger mb-3';
                errorMsg.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>Failed to load ECIS data. Please try again.';

                const form = modalBody.querySelector('#ecis-form');
                if (form) {
                    form.insertBefore(errorMsg, form.firstChild);
                }
            });
    }
}

// Initialize cancel request functionality
function initCancelRequest() {
    // Cancel request from details modal
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('ecis-cancel-request')) {
            const ecisId = e.target.getAttribute('data-id');
            const ecisNumber = document.getElementById('ecis-detail-number').textContent;
            showCancelConfirmation(ecisId, ecisNumber);
        }
    });

    // Handle confirm cancel button
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', function() {
            const ecisId = this.getAttribute('data-id');
            const cancelRemarks = document.getElementById('cancel-remarks').value;

            // Add loading state to button
            this.classList.add('loading');
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            // Submit cancel request via AJAX
            const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

            fetch(`/ecis/ecis/${ecisId}/cancel/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: `remarks=${encodeURIComponent(cancelRemarks)}`
            })
            .then(response => response.json())
            .then(data => {
                // Close modal
                const confirmCancelModal = document.getElementById('confirm-cancel-modal');
                closeModal(confirmCancelModal);

                // Remove loading state
                this.classList.remove('loading');
                this.innerHTML = 'Yes, Cancel Request';

                if (data.status === 'success') {
                    // Show success toast
                    if (typeof createToast === 'function') {
                        createToast('ECIS has been successfully canceled.', 'success', 5000);
                    }

                    // Reset the form
                    document.getElementById('cancel-remarks').value = '';

                    // Update the UI to show the request as canceled
                    updateEcisStatus(ecisId, 'canceled');

                    // Close details modal if open
                    const detailsModal = document.getElementById('ecis-details-modal');
                    if (detailsModal && detailsModal.classList.contains('active')) {
                        closeModal(detailsModal);
                    }
                } else {
                    // Show error toast
                    showValidationError(data.message || 'Failed to cancel ECIS.');
                }
            })
            .catch(error => {
                console.error('Error canceling ECIS:', error);
                showValidationError('Failed to cancel ECIS. Please try again.');

                // Remove loading state
                this.classList.remove('loading');
                this.innerHTML = 'Yes, Cancel Request';
            });
        });
    }
}

// Show cancel confirmation modal
function showCancelConfirmation(ecisId, ecisNumber) {
    const confirmCancelModal = document.getElementById('confirm-cancel-modal');
    if (!confirmCancelModal) return;

    // Close details modal if open
    const detailsModal = document.getElementById('ecis-details-modal');
    if (detailsModal && detailsModal.classList.contains('active')) {
        closeModal(detailsModal);
    }

    // Set ECIS number in modal
    document.getElementById('cancel-ecis-number').textContent = ecisNumber;

    // Set ECIS ID on confirm button
    document.getElementById('confirm-cancel-btn').setAttribute('data-id', ecisId);

    // Reset remarks
    document.getElementById('cancel-remarks').value = '';

    // Open modal
    openModal(confirmCancelModal);
}

// Initialize form validation
function initFormValidation() {
    const ecisForm = document.getElementById('ecis-form');
    const submitBtn = document.getElementById('ecis-submit-btn');

    if (!ecisForm || !submitBtn) return;

    // Disable browser's native validation
    ecisForm.setAttribute('novalidate', '');

    // Add event listeners to required fields to clear any browser validation messages
    const requiredFields = ecisForm.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        field.addEventListener('invalid', function(e) {
            e.preventDefault();
        });
    });

    // Handle submit button click
    submitBtn.addEventListener('click', function() {
        validateAndSubmitForm(ecisForm, this);
    });

    // Also keep the form submit handler for backward compatibility
    ecisForm.addEventListener('submit', function(e) {
        // Always prevent default to handle validation ourselves
        e.preventDefault();
        validateAndSubmitForm(ecisForm, submitBtn);
    });

    // Initialize field animations
    initFieldAnimations(ecisForm);
}

// Function to validate and submit the form
function validateAndSubmitForm(form, submitBtn) {
    // Validate form
    const category = document.querySelector('input[name="category"]:checked');
    const department = document.getElementById('department');
    const requestedBy = document.getElementById('requested-by');
    const affectedParts = document.getElementById('affected-parts');
    const detailsChange = document.getElementById('details-change');
    const implementationDate = document.getElementById('implementation-date');

    // Check for missing fields and show appropriate toast message
    // Only require category for new ECIS, not for edits
    if (!category && !form.action.includes('edit')) {
        showValidationError('Please select a category');
        return;
    }

    if (!department.value.trim()) {
        showValidationError('Department field is required');
        department.focus();
        return;
    }

    if (!requestedBy.value.trim()) {
        showValidationError('Requested By field is required');
        requestedBy.focus();
        return;
    }

    if (!affectedParts.value.trim()) {
        showValidationError('Affected Parts field is required');
        affectedParts.focus();
        return;
    }

    if (!detailsChange.value.trim()) {
        showValidationError('Details of Change field is required');
        detailsChange.focus();
        return;
    }

    if (!implementationDate.value) {
        showValidationError('Implementation Date field is required');
        implementationDate.focus();
        return;
    }

    // Show loading state on submit button
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    // Get form data
    const formData = new FormData(form);

    // Get CSRF token
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

    // Prepare form data for AJAX
    const formParams = new URLSearchParams();
    for (const pair of formData) {
        formParams.append(pair[0], pair[1]);
    }

    // Submit form via AJAX
    fetch(form.action, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formParams
    })
    .then(response => response.json())
    .then(data => {
        // Reset button state
        submitBtn.innerHTML = form.action.includes('edit') ? 'Update Request' : 'Submit Request';
        submitBtn.disabled = false;

        if (data.status === 'success') {
            // Reset form and close modal
            form.reset();

            const newEcisModal = document.getElementById('new-ecis-modal');
            closeModal(newEcisModal);

            if (form.action.includes('edit')) {
                // Show success toast for edit
                if (typeof createToast === 'function') {
                    createToast('ECIS request has been successfully updated.', 'success', 5000);
                }

                // Refresh page to show updated data
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                // Show confirmation modal for new ECIS
                document.getElementById('new-ecis-number').textContent = data.ecis_number;
                const confirmationModal = document.getElementById('ecis-confirmation-modal');
                openModal(confirmationModal);

                // Add new row to table
                // We'll just refresh the page for simplicity
                const confirmOkBtn = document.querySelector('.ecis-confirm-ok');
                if (confirmOkBtn) {
                    confirmOkBtn.addEventListener('click', function() {
                        window.location.reload();
                    });
                }
            }
        } else {
            // Show validation errors
            if (data.errors) {
                // Get the first error message to display
                let firstErrorField = null;
                let firstErrorMessage = null;

                for (const field in data.errors) {
                    if (firstErrorMessage === null) {
                        firstErrorMessage = data.errors[field][0];
                        firstErrorField = field.replace('_', '-');
                    }
                }

                // Show the error message in a toast
                if (firstErrorMessage) {
                    showValidationError(firstErrorMessage);

                    // Focus the field with the error
                    const inputField = document.getElementById(firstErrorField);
                    if (inputField) {
                        inputField.focus();
                    }
                }
            } else {
                showValidationError(data.message || 'An error occurred. Please try again.');
            }
        }
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        submitBtn.innerHTML = form.action.includes('edit') ? 'Update Request' : 'Submit Request';
        submitBtn.disabled = false;
        showValidationError('Failed to submit the form. Please try again.');
    });
}

// Initialize field animations
function initFieldAnimations(ecisForm) {
    // Field animation on focus/blur
    const formFields = ecisForm.querySelectorAll('input, textarea');
    formFields.forEach(field => {
        field.addEventListener('focus', function() {
            this.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 8px rgba(51, 102, 255, 0.15)';
        });

        field.addEventListener('blur', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });
    });

    // Category selection animation
    const categoryInputs = document.querySelectorAll('input[name="category"]');
    categoryInputs.forEach(input => {
        input.addEventListener('change', function() {
            const label = this.nextElementSibling;

            // Animate the selected label
            label.style.transition = 'transform 0.3s ease';
            label.style.transform = 'scale(1.05)';

            setTimeout(() => {
                label.style.transform = '';
            }, 300);
        });
    });

    // Confirmation modal OK button
    const confirmationModal = document.getElementById('ecis-confirmation-modal');
    const confirmOkBtn = document.querySelector('.ecis-confirm-ok');
    if (confirmOkBtn && confirmationModal) {
        confirmOkBtn.addEventListener('click', function() {
            closeModal(confirmationModal);
        });
    }
}

// Helper Functions

// This function is no longer used - we're using toast notifications instead
function highlightField(field) {
    // Focus the first invalid field without changing its appearance
    if (!document.querySelector('.ecis-toast')) {
        field.focus();
    }
}

function showValidationError(message) {
    // Remove any existing inline error messages
    const existingErrors = document.querySelectorAll('.ecis-form-error, .ecis-modal-body > div:not(.ecis-form-section):not(.ecis-form-grid):not(.ecis-form-group):not(.ecis-confirmation-container)');
    existingErrors.forEach(error => {
        if (error.parentNode) {
            error.parentNode.removeChild(error);
        }
    });

    // Remove any browser validation messages
    document.querySelectorAll('input:invalid, textarea:invalid, select:invalid').forEach(field => {
        field.setCustomValidity('');
    });

    // Use the global createToast function from script2.js
    if (typeof createToast === 'function') {
        createToast(message, 'error', 5000);
    } else {
        // Fallback to alert if createToast is not available
        alert(message);
    }

    // Prevent any browser validation popups
    setTimeout(() => {
        document.querySelectorAll('.ecis-form-error, .ecis-modal-body > div:not(.ecis-form-section):not(.ecis-form-grid):not(.ecis-form-group):not(.ecis-confirmation-container)').forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }, 100);
}

function updateEcisStatus(ecisId, status) {
    // Find the row with the matching ECIS ID
    const rows = document.querySelectorAll(`.ecis-table tbody tr`);

    rows.forEach(row => {
        const actionButtons = row.querySelector('[data-label="Actions"]');
        if (actionButtons) {
            const buttons = actionButtons.querySelectorAll('button');
            buttons.forEach(button => {
                if (button.getAttribute('data-id') === ecisId) {
                    // Update status cell
                    const statusCell = row.querySelector('[data-label="Status"] .ecis-status');
                    if (statusCell) {
                        statusCell.className = `ecis-status ecis-status-${status}`;
                        statusCell.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                    }

                    // Update row data-status attribute
                    row.setAttribute('data-status', status);

                    // Remove edit button if canceled
                    if (status === 'canceled') {
                        const editButton = actionButtons.querySelector('.ecis-edit-btn');
                        if (editButton) {
                            editButton.remove();
                        }
                    }

                    // Add highlight animation
                    row.style.animation = 'ecis-row-highlight 1s ease';
                    setTimeout(() => {
                        row.style.animation = '';
                    }, 1000);
                }
            });
        }
    });
}

// Open modal with animation
function openModal(modal) {
    if (!modal) return;

    // Center all modals
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    // Reset any transform on the modal content
    const modalContent = modal.querySelector('.ecis-modal-content');
    if (modalContent) {
        modalContent.style.transform = 'none';
        modalContent.style.margin = 'auto';
    }

    setTimeout(() => {
        modal.style.opacity = '1';
        modal.classList.add('active');
    }, 10);

    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Close modal with animation
function closeModal(modal) {
    if (!modal) return;

    modal.style.opacity = '0';
    modal.classList.remove('active');

    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    document.body.style.overflow = ''; // Restore scrolling
}

// Initialize modal close buttons
function initModalCloseButtons() {
    // Get all modals
    const modals = document.querySelectorAll('.ecis-modal');

    // Add event listeners to close buttons
    const closeButtons = document.querySelectorAll('.ecis-modal-close, .ecis-close-details');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.ecis-modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });

    // Add event listener for form cancel button
    const formCancelBtn = document.querySelector('.ecis-cancel-btn');
    if (formCancelBtn) {
        formCancelBtn.addEventListener('click', function() {
            const modal = this.closest('.ecis-modal');
            if (modal) {
                closeModal(modal);
            }
        });
    }

    // Add event listener for cancel confirmation button
    const cancelConfirmationBtn = document.getElementById('cancel-confirmation');
    if (cancelConfirmationBtn) {
        cancelConfirmationBtn.addEventListener('click', function() {
            const modal = this.closest('.ecis-modal');
            if (modal) {
                closeModal(modal);
            }
        });
    }

    // Close modal when clicking outside content
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });

    // Close modals with ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.ecis-modal.active');
            if (activeModal) {
                closeModal(activeModal);
            }
        }
    });
}

// Initialize category items
function initCategoryItems() {
    // This function would handle any category-specific initialization
    // For now, it's a placeholder for future functionality

    // Refresh button for notifications
    const refreshBtn = document.querySelector('.ecis-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            location.reload();
        });
    }

    // View notification buttons
    const viewNotificationBtns = document.querySelectorAll('.ecis-view-notification');
    if (viewNotificationBtns.length) {
        viewNotificationBtns.forEach(button => {
            button.addEventListener('click', function() {
                const ecisId = this.getAttribute('data-id');

                // Show loading state in modal
                const detailsContent = document.getElementById('ecis-details-content');
                if (detailsContent) {
                    detailsContent.innerHTML = `
                        <div class="ecis-loading-state">
                            <i class="fas fa-spinner fa-spin fa-2x"></i>
                            <p>Loading ECIS details...</p>
                        </div>
                    `;
                }

                // Open the modal
                const ecisDetailsModal = document.getElementById('ecis-details-modal');
                openModal(ecisDetailsModal);

                // Fetch ECIS details via AJAX
                console.log('Fetching ECIS details for ID (notification):', ecisId);
                // The correct URL should be /ecis/ecis/{id}/ based on the URL configuration
                const url = `/ecis/ecis/${ecisId}/`;
                console.log('Request URL (notification):', url);

                fetch(url)
                    .then(response => {
                        console.log('Response status (notification):', response.status);
                        console.log('Response headers (notification):', response.headers);
                        if (!response.ok) {
                            throw new Error(`Network response was not ok: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Received data (notification):', data);
                        // Populate details in modal
                        updateDetailsModal(data);
                    })
                    .catch(error => {
                        console.error('Error fetching ECIS details (notification):', error);
                        const detailsContent = document.getElementById('ecis-details-content');
                        if (detailsContent) {
                            detailsContent.innerHTML = `
                                <div class="ecis-error-state">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Failed to load ECIS details. Please try again.</p>
                                    <small>Error: ${error.message}</small>
                                </div>
                            `;
                        }
                        showToast('Error', 'Failed to load ECIS details. Please try again.', 'error');
                    });
            });
        });
    }
}

// We're using the global createToast function from script2.js