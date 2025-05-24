/**
 * ECIS Registry - Facilitator JavaScript
 * Specific functionality for the facilitator view
 */

// Custom toast notification function that uses the existing toast styles from style-ver2.css
function showToast(title, message, type = 'info') {
    // Get the toast container
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('data-auto-dismiss', 'true');

    // Create toast content
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';

    // Add appropriate icon based on type
    const icon = document.createElement('i');
    if (type === 'success') {
        icon.className = 'fas fa-check-circle toast-icon';
    } else if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle toast-icon';
    } else if (type === 'warning') {
        icon.className = 'fas fa-exclamation-triangle toast-icon';
    } else {
        icon.className = 'fas fa-info-circle toast-icon';
    }

    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';

    // Add event listener to close button
    closeBtn.addEventListener('click', function() {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    });

    // Assemble toast
    toastContent.appendChild(icon);
    toastContent.appendChild(messageSpan);
    toast.appendChild(toastContent);
    toast.appendChild(closeBtn);

    // Add to container
    container.appendChild(toast);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Define modal functions in case they're not available from common.js
function openModalFacilitator(modal) {
    if (!modal) return;

    // Add active class to show the modal
    modal.classList.add('active');

    // Add animation class
    const modalContent = modal.querySelector('.ecis-modal-content');
    if (modalContent) {
        modalContent.style.animation = 'ecis-modal-appear 0.3s ease-out forwards';
    }

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
}

function closeModalFacilitator(modal) {
    if (!modal) return;

    // Add closing animation
    const modalContent = modal.querySelector('.ecis-modal-content');
    if (modalContent) {
        modalContent.style.animation = 'ecis-fade-out 0.2s ease-out forwards';
    }

    // Remove active class after animation completes
    setTimeout(() => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }, 200);
}

// Initialize modal buttons
function initModalButtons() {
    // Close buttons for all modals
    const closeButtons = document.querySelectorAll('.ecis-modal-close, .ecis-close-details, .ecis-cancel-btn, .ecis-confirm-ok');

    if (closeButtons.length) {
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.ecis-modal');
                if (modal) {
                    closeModalFacilitator(modal);
                }
            });
        });
    }

    // Close modal when clicking outside
    const modals = document.querySelectorAll('.ecis-modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModalFacilitator(this);
            }
        });
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.ecis-modal.active');
            if (activeModal) {
                closeModalFacilitator(activeModal);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize facilitator-specific functionality
    initModalButtons();
    initReviewModal();
    initPendingItems();
    initDetailsButtons();
});

// Initialize Review Modal
function initReviewModal() {
    // Decision radio toggle for review modal
    const decisionRadios = document.querySelectorAll('input[name="decision"]');
    const remarksSection = document.getElementById('remarks-section');
    const facilitatorRemarks = document.getElementById('facilitator-remarks');
    const remarksHelpText = document.getElementById('remarks-help-text');

    if (decisionRadios.length && remarksSection && facilitatorRemarks) {
        decisionRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'hold' || this.value === 'revise') {
                    remarksSection.style.display = 'block';
                    facilitatorRemarks.setAttribute('required', 'required');

                    // Set appropriate help text and placeholder based on decision
                    if (this.value === 'hold') {
                        remarksHelpText.textContent = 'Explain why this request is being placed on hold.';
                        facilitatorRemarks.placeholder = 'Please provide detailed feedback for the requestor...';
                    } else if (this.value === 'revise') {
                        remarksHelpText.textContent = 'Explain what changes are needed before approval.';
                        facilitatorRemarks.placeholder = 'Please specify what needs to be revised...';
                    }

                    // Animate section appearance
                    remarksSection.style.animation = 'ecis-fade-in 0.3s ease-out';
                } else {
                    remarksSection.style.display = 'none';
                    facilitatorRemarks.removeAttribute('required');
                }
            });
        });
    }

    // Review Request buttons
    const reviewButtons = document.querySelectorAll('.ecis-review-btn');
    const reviewModal = document.getElementById('review-request-modal');

    if (reviewButtons.length && reviewModal) {
        reviewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const ecisId = this.getAttribute('data-id');
                const ecisNumber = this.getAttribute('data-number');

                // Set ECIS number in the modal
                document.getElementById('review-ecis-number').textContent = ecisNumber;

                // Get category from table row
                const row = this.closest('tr');
                if (row) {
                    const categoryPill = row.querySelector('.ecis-category-pill');
                    if (categoryPill) {
                        const category = categoryPill.textContent;
                        const categoryClass = categoryPill.className.split(' ').find(cls => cls.startsWith('ecis-cat-'));

                        const reviewCategoryPill = document.getElementById('review-category-pill');
                        reviewCategoryPill.textContent = category;
                        reviewCategoryPill.className = `ecis-category-pill ${categoryClass}`;
                    }
                }

                // Set form action
                const reviewForm = document.getElementById('review-form');
                reviewForm.setAttribute('data-id', ecisId);

                // Open modal
                openModalFacilitator(reviewModal);

                // Add animation to button
                this.style.animation = 'ecis-pulse 0.8s ease';
                setTimeout(() => {
                    this.style.animation = '';
                }, 800);
            });
        });

        // Form submission for review
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', function(e) {
                e.preventDefault();

                // Get ECIS ID
                const ecisId = this.getAttribute('data-id');
                if (!ecisId) {
                    showToast('Error', 'ECIS ID not found. Please try again.', 'error');
                    return;
                }

                // Check if the ECIS item exists in the pending review list
                const pendingItem = document.querySelector(`.ecis-pending-item[data-id="${ecisId}"]`);
                if (!pendingItem) {
                    // Try to find the item in the table
                    const tableRow = document.querySelector(`tr[data-id="${ecisId}"]`);
                    if (!tableRow || (tableRow.getAttribute('data-status') !== 'forreview' && tableRow.getAttribute('data-status') !== 'approved')) {
                        showToast('Error', 'This ECIS request cannot be reviewed. It may have been already processed or its status has changed.', 'error');
                        closeModalFacilitator(reviewModal);
                        return;
                    }
                }

                // Validate form if hold or revise decision is selected
                const selectedDecision = document.querySelector('input[name="decision"]:checked').value;
                if (selectedDecision === 'hold' || selectedDecision === 'revise') {
                    const remarksField = document.getElementById('facilitator-remarks');
                    const remarks = remarksField.value.trim();

                    if (!remarks) {
                        // Show validation error
                        remarksField.style.borderColor = '#f44336';
                        remarksField.focus();

                        // Add shake animation
                        remarksField.style.animation = 'ecis-shake 0.5s ease-in-out';
                        setTimeout(() => {
                            remarksField.style.animation = '';
                        }, 500);

                        // Show toast notification
                        showToast('Validation Error', 'Remarks are required when placing a request on hold or requesting revisions.', 'error');

                        return;
                    }

                    // Make sure the remarks field is visible
                    document.getElementById('remarks-section').style.display = 'block';

                    // Ensure the remarks field has the required attribute
                    remarksField.setAttribute('required', 'required');
                } else {
                    // Remove required attribute for approve decision
                    const remarksField = document.getElementById('facilitator-remarks');
                    remarksField.removeAttribute('required');
                }

                // Show loading state on submit button
                const submitButton = this.querySelector('button[type="submit"]');
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
                submitButton.disabled = true;

                // Get ECIS number for notifications
                const ecisNumber = document.getElementById('review-ecis-number').textContent;

                // Get form data
                const formData = new FormData(this);

                // Get CSRF token
                const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

                // Prepare form data for AJAX
                const formParams = new URLSearchParams();
                for (const pair of formData) {
                    formParams.append(pair[0], pair[1]);
                }

                // Log the request details for debugging
                console.log(`Submitting review for ECIS ID: ${ecisId}`);
                console.log(`Form data: ${formParams.toString()}`);
                console.log(`CSRF Token: ${csrfToken}`);

                // Log all form elements for debugging
                const formElements = this.elements;
                console.log('Form elements:');
                for (let i = 0; i < formElements.length; i++) {
                    const element = formElements[i];
                    if (element.name) {
                        console.log(`${element.name}: ${element.value}`);
                    }
                }

                // Submit form via AJAX
                const url = `/ecis/facilitator/${ecisId}/review/`;
                console.log('Sending AJAX request to:', url);
                console.log('Request headers:', {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                });
                console.log('Request body:', formParams.toString());

                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: formParams
                })
                .then(response => {
                    console.log('Response status:', response.status);
                    console.log('Response headers:', Array.from(response.headers.entries()));

                    if (!response.ok) {
                        // Try to get the error message from the response
                        return response.text().then(text => {
                            console.error('Error response text:', text);
                            try {
                                const errorData = JSON.parse(text);
                                console.error('Error data:', errorData);

                                // Log more details about the error
                                if (errorData.errors) {
                                    console.error('Validation errors:', errorData.errors);
                                    for (const field in errorData.errors) {
                                        console.error(`Field ${field}:`, errorData.errors[field]);
                                    }
                                }

                                throw new Error(errorData.message || errorData.errors?.remarks || `HTTP error! Status: ${response.status}`);
                            } catch (e) {
                                console.error('Error parsing JSON:', e);
                                throw new Error(`HTTP error! Status: ${response.status}. Response: ${text}`);
                            }
                        }).catch(e => {
                            console.error('Error reading response:', e);
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Response data:', data);
                    // Close modal
                    closeModalFacilitator(reviewModal);

                    // Get decision value
                    const decision = document.querySelector('input[name="decision"]:checked').value;

                    if (data.status === 'success') {
                        // Show success toast
                        if (decision === 'approve') {
                            showToast('ECIS Approved', `ECIS ${ecisNumber} has been approved successfully.`, 'success');
                            updateEcisStatus(ecisId, 'approved');
                        } else if (decision === 'hold') {
                            showToast('ECIS On Hold', `ECIS ${ecisNumber} has been placed on hold. The requestor will be notified.`, 'warning');
                            updateEcisStatus(ecisId, 'onhold');
                        } else if (decision === 'revise') {
                            showToast('Revision Requested', `ECIS ${ecisNumber} has been sent back for revision. The requestor will be notified.`, 'warning');
                            updateEcisStatus(ecisId, 'needsrevision');
                        }

                        // Reset form
                        this.reset();
                        document.getElementById('facilitator-remarks').value = '';
                        remarksSection.style.display = 'none';

                        // Reset button
                        submitButton.innerHTML = 'Submit Review';
                        submitButton.disabled = false;

                        // Update pending items count
                        updatePendingCount();

                        // Remove from pending items list
                        removePendingItem(ecisId);
                    } else {
                        // Show error toast
                        showToast('Error', data.message || 'An error occurred during review.', 'error');

                        // Reset button
                        submitButton.innerHTML = 'Submit Review';
                        submitButton.disabled = false;
                    }
                })
                .catch(error => {
                    console.error('Error submitting review:', error);

                    // Show detailed error message
                    const errorMessage = `Failed to submit review: ${error.message}. Please check the console for more details and try again.`;
                    showToast('Error', errorMessage, 'error');

                    // Reset button
                    submitButton.innerHTML = 'Submit Review';
                    submitButton.disabled = false;
                });
            });
        }
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

                // Show loading state in modal without toast notification
                const detailsContent = document.getElementById('ecis-details-content');
                if (detailsContent) {
                    detailsContent.innerHTML = `
                        <div class="ecis-loading-state" style="display: flex; flex-direction: column; align-items: center; padding: 30px;">
                            <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--ecis-primary); margin-bottom: 15px;"></i>
                            <p>Loading ECIS details...</p>
                        </div>
                    `;
                }

                // Open the modal
                openModalFacilitator(ecisDetailsModal);

                // Fetch ECIS details via AJAX
                console.log(`Fetching ECIS details from: /ecis/facilitator/${ecisId}/`);
                fetch(`/ecis/facilitator/${ecisId}/`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Populate details in modal
                        updateDetailsModal(data);
                    })
                    .catch(error => {
                        console.error('Error fetching ECIS details:', error);
                        // Show error in the modal instead of a toast
                        const detailsContent = document.getElementById('ecis-details-content');
                        if (detailsContent) {
                            detailsContent.innerHTML = `
                                <div class="ecis-error-state" style="display: flex; flex-direction: column; align-items: center; padding: 30px;">
                                    <i class="fas fa-exclamation-circle fa-2x" style="color: #f44336; margin-bottom: 15px;"></i>
                                    <p>Failed to load ECIS details. Please try again.</p>
                                </div>
                            `;
                        }
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
    const detailsContent = document.getElementById('ecis-details-content');
    if (!detailsContent) return;

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
    detailsContent.innerHTML = html;

    // Add action buttons based on status
    const actionButtonsContainer = document.getElementById('ecis-action-buttons');
    if (actionButtonsContainer) {
        actionButtonsContainer.innerHTML = '';

        if (data.can_review) {
            const reviewBtn = document.createElement('button');
            reviewBtn.className = 'ecis-button ecis-primary-button ecis-review-request';
            reviewBtn.setAttribute('data-id', data.id);
            reviewBtn.setAttribute('data-number', data.number);
            reviewBtn.innerHTML = 'Review Request';
            actionButtonsContainer.appendChild(reviewBtn);

            reviewBtn.addEventListener('click', function() {
                showReviewModal(data.id, data.number, data.category);
            });
        }
    }

    // Make sure all sections are visible
    const detailsSections = detailsContent.querySelectorAll('.ecis-details-section');
    detailsSections.forEach(section => {
        section.style.display = 'block';
    });

    // Ensure the header is properly displayed
    const detailsHeader = detailsContent.querySelector('.ecis-details-header');
    if (detailsHeader) {
        detailsHeader.style.display = 'flex';
    }
}

// Initialize pending review items
function initPendingItems() {
    const pendingItems = document.querySelectorAll('.ecis-pending-item');

    pendingItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        });

        item.addEventListener('mouseleave', function() {
            this.style.boxShadow = '';
        });
    });

    // Refresh button animation
    const refreshBtn = document.querySelector('.ecis-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.animation = 'ecis-spin 1s ease-in-out';

                setTimeout(() => {
                    icon.style.animation = '';

                    // Show refreshed toast
                    showToast('Pending Items Refreshed', 'The pending review items have been updated.', 'success');
                }, 1000);
            }
        });
    }
}

// Show review modal
function showReviewModal(ecisId, ecisNumber, category) {
    const reviewModal = document.getElementById('review-request-modal');
    if (!reviewModal) return;

    // Close details modal if open
    const detailsModal = document.getElementById('ecis-details-modal');
    if (detailsModal && detailsModal.classList.contains('active')) {
        closeModalFacilitator(detailsModal);
    }

    // Set ECIS number in the modal
    document.getElementById('review-ecis-number').textContent = ecisNumber;

    // Fetch ECIS details to get the correct category code
    fetch(`/ecis/facilitator/${ecisId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Set category pill with the correct category code from the database
            const reviewCategoryPill = document.getElementById('review-category-pill');
            reviewCategoryPill.textContent = data.category;
            reviewCategoryPill.className = `ecis-category-pill ecis-cat-${data.category}`;

            console.log('Category from API:', data.category);
        })
        .catch(error => {
            console.error('Error fetching ECIS details for category:', error);

            // Fallback to using the provided category
            const reviewCategoryPill = document.getElementById('review-category-pill');
            reviewCategoryPill.textContent = category;
            reviewCategoryPill.className = `ecis-category-pill ecis-cat-${category}`;

            console.log('Using fallback category:', category);
        });

    // Set form data-id
    const reviewForm = document.getElementById('review-form');
    reviewForm.setAttribute('data-id', ecisId);

    // Reset form
    reviewForm.reset();
    document.getElementById('facilitator-remarks').value = '';
    document.getElementById('remarks-section').style.display = 'none';

    // Open modal
    openModalFacilitator(reviewModal);
}

// Update ECIS status in UI
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

                        // Format status text with proper spacing and capitalization
                        let displayStatus = status;
                        if (status === 'needsrevision') {
                            displayStatus = 'Needs Revision';
                        } else if (status === 'forreview') {
                            displayStatus = 'For Review';
                        } else {
                            displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
                        }

                        statusCell.textContent = displayStatus;
                    }

                    // Update row data-status attribute
                    row.setAttribute('data-status', status);

                    // Remove review button if status is not 'approved' or 'forreview'
                    if (status !== 'approved' && status !== 'forreview') {
                        const reviewButton = actionButtons.querySelector('.ecis-review-btn');
                        if (reviewButton) {
                            reviewButton.remove();
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

// Remove item from pending review list
function removePendingItem(ecisId) {
    const pendingItems = document.querySelectorAll('.ecis-pending-item');
    pendingItems.forEach(item => {
        if (item.getAttribute('data-id') === ecisId) {
            // Add fade out animation
            item.style.animation = 'ecis-fade-out 0.5s ease forwards';

            // Remove after animation completes
            setTimeout(() => {
                if (item.parentNode) {
                    item.parentNode.removeChild(item);

                    // Show empty message if no more items
                    const reviewList = document.querySelector('.ecis-review-list');
                    if (reviewList && reviewList.querySelectorAll('.ecis-pending-item').length === 0) {
                        reviewList.innerHTML = `
                            <div class="ecis-empty-pending">
                                <i class="fas fa-check-circle fa-3x" style="color: var(--ecis-status-approved); margin-bottom: 15px;"></i>
                                <p>No pending requests to review at this time.</p>
                            </div>
                        `;
                    }
                }
            }, 500);
        }
    });
}

// Fetch ECIS details for the details modal
function fetchEcisDetails(ecisId) {
    const ecisDetailsModal = document.getElementById('ecis-details-modal');
    if (!ecisDetailsModal) return;

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
    openModalFacilitator(ecisDetailsModal);

    // Fetch ECIS details via AJAX
    fetch(`/ecis/facilitator/${ecisId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Populate details in modal
            updateDetailsModal(data);
        })
        .catch(error => {
            console.error('Error fetching ECIS details:', error);
            // Show error in the modal
            if (detailsContent) {
                detailsContent.innerHTML = `
                    <div class="ecis-error-state">
                        <i class="fas fa-exclamation-circle fa-3x"></i>
                        <p>Failed to load ECIS details. Please try again.</p>
                    </div>
                `;
            }
        });
}

// Update pending count
function updatePendingCount() {
    // Update review count
    const reviewCount = document.querySelector('.ecis-review .ecis-stats-number');

    if (reviewCount) {
        let count = parseInt(reviewCount.textContent);
        if (count > 0) {
            reviewCount.textContent = count - 1;

            // Add animation
            reviewCount.style.animation = 'ecis-number-decrement 1s ease';

            setTimeout(() => {
                reviewCount.style.animation = '';
            }, 1000);
        }
    }

    // Update approved or on hold count based on the decision
    const decision = document.querySelector('input[name="decision"]:checked');
    if (decision) {
        let countSelector;

        if (decision.value === 'approve') {
            countSelector = '.ecis-approved .ecis-stats-number';
        } else if (decision.value === 'hold') {
            countSelector = '.ecis-pending .ecis-stats-number';
        }
        // We don't update any count for 'revise' since we removed the stats card

        if (countSelector) {
            const countElement = document.querySelector(countSelector);
            if (countElement) {
                let count = parseInt(countElement.textContent);
                countElement.textContent = count + 1;

                // Add animation
                countElement.style.animation = 'ecis-number-increment 1s ease';

                setTimeout(() => {
                    countElement.style.animation = '';
                }, 1000);
            }
        }
    }
}