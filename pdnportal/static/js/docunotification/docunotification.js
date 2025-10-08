// Document Notification JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const addDocumentModal = document.getElementById('add-document-modal');
    const addDocumentBtn = document.getElementById('add-document-btn');
    const closeModalBtn = document.getElementById('close-add-modal');
    const cancelBtn = document.getElementById('cancel-add-document');
    const addDocumentForm = document.getElementById('add-document-form');

    console.log('Modal elements found:', {
        addDocumentModal,
        addDocumentBtn,
        closeModalBtn,
        cancelBtn,
        addDocumentForm
    });

    // Show modal
    addDocumentBtn.addEventListener('click', function() {
        addDocumentModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });

    // Hide modal functions
    function hideModal() {
        addDocumentModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        addDocumentForm.reset(); // Reset form
    }

    // Close modal events
    closeModalBtn.addEventListener('click', hideModal);
    cancelBtn.addEventListener('click', hideModal);

    // Close modal when clicking outside
    addDocumentModal.addEventListener('click', function(e) {
        if (e.target === addDocumentModal) {
            hideModal();
        }
    });

    // Handle form submission
    const submitBtn = document.getElementById('submit-add-document');
    console.log('Submit button element:', submitBtn);
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();

            const formData = new FormData(addDocumentForm);

            // Show loading state
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;

            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            // Submit form via AJAX
            fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': csrfToken
                }
            })
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                if (data.success) {
                    // Show success message
                    showToast('Document created successfully!', 'success');
                    hideModal();

                    // Reload page to show new document
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    // Show validation errors
                    showFormErrors(data.errors);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('An error occurred. Please try again.', 'error');
            })
            .finally(() => {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
        });
    } else {
        console.error('Submit button not found!');
    }

    // Show form validation errors
    function showFormErrors(errors) {
        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => el.remove());

        // Show new errors
        for (const [field, messages] of Object.entries(errors)) {
            const fieldElement = document.getElementById(`id_${field}`);
            if (fieldElement) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = messages[0]; // Show first error message
                fieldElement.parentNode.appendChild(errorDiv);
            }
        }
    }

    // Toast notification function
    function showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            console.error('Toast container not found');
            return;
        }

    const toast = document.createElement('div');
    // add a namespaced class to avoid conflicts with other global .toast rules
    toast.className = `toast docu-toast ${type}`;

        const icon = type === 'success' ? 'check-circle' :
                    type === 'error' ? 'exclamation-circle' :
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close close-btn" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Search functionality
    const searchInput = document.getElementById('document-search');
    let searchTimeout;

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            
            // Clear previous timeout
            clearTimeout(searchTimeout);
            
            // Set new timeout for debounced search
            searchTimeout = setTimeout(() => {
                performSearch(searchTerm);
            }, 300); // 300ms delay
        });
    }

    function performSearch(searchTerm) {
        const url = new URL(window.location.href);
        if (searchTerm) {
            url.searchParams.set('search', searchTerm);
        } else {
            url.searchParams.delete('search');
        }
        url.searchParams.delete('page'); // Reset to first page when searching

        fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            updateTableWithSearchResults(data, searchTerm);
        })
        .catch(error => {
            console.error('Search error:', error);
        });
    }

    function updateTableWithSearchResults(data, searchTerm) {
        const tbody = document.getElementById('documents-tbody');
        const paginationContainer = document.querySelector('.JO-pagination');
        
        if (data.results.length === 0) {
            // Show empty state
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="JO-empty-table">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h4>No Documents Found</h4>
                            <p>No documents match your search for "${searchTerm}". Try different keywords.</p>
                        </div>
                    </td>
                </tr>
            `;
            
            // Hide pagination
            if (paginationContainer) {
                paginationContainer.style.display = 'none';
            }
        } else {
            // Update table with search results
            let html = '';
            data.results.forEach(item => {
                html += `
                    <tr data-reference="${item.reference_number.toLowerCase()}" data-title="${item.title.toLowerCase()}" data-category="${item.category.toLowerCase()}" data-status="${item.status_class}" data-doc-id="${item.id}" data-description="${item.description}" data-notes="${item.notes}" data-notification-period="${item.notification_period}" data-created-by="${item.created_by}" data-status-class="${item.status_class}" data-created-at="${item.created_at}">
                        <td data-label="Reference Number">${item.reference_number}</td>
                        <td data-label="Title">${item.title}</td>
                        <td data-label="Category">${item.category}</td>
                        <td data-label="Due Date">${item.due_date}</td>
                        <td data-label="Status" class="text-center">
                            <span class="docu-status docu-status-${item.status_class}">${item.status_text}</span>
                        </td>
                        <td data-label="Actions" class="text-center">
                            <button class="btn btn-icon view-document-btn" data-doc-id="${item.id}" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${item.can_edit ? `
                                <button class="btn btn-icon edit-document-btn" data-doc-id="${item.id}" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-icon btn-error delete-document-btn" data-doc-id="${item.id}" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            
            // Update pagination if needed
            if (paginationContainer) {
                if (data.total_pages > 1) {
                    paginationContainer.style.display = 'block';
                    updatePagination(data);
                } else {
                    paginationContainer.style.display = 'none';
                }
            }
        }
    }

    function updatePagination(data) {
        const paginationInfo = document.querySelector('.JO-pagination-info');
        const paginationControls = document.querySelector('.JO-pagination-controls');
        
        if (paginationInfo) {
            const start = (data.current_page - 1) * 10 + 1;
            const end = Math.min(data.current_page * 10, data.total_count);
            paginationInfo.innerHTML = `Showing ${start} to ${end} of ${data.total_count} entries`;
        }
        
        if (paginationControls) {
            const navContainer = paginationControls.querySelector('.JO-pagination-nav-container');
            if (navContainer) {
                let paginationHtml = '';
                
                // Previous button
                if (data.has_previous) {
                    paginationHtml += `<a href="?page=${data.current_page - 1}" class="JO-pagination-btn">`;
                } else {
                    paginationHtml += `<span class="JO-pagination-btn disabled">`;
                }
                paginationHtml += `<i class="fas fa-chevron-left"></i> Previous`;
                if (data.has_previous) {
                    paginationHtml += `</a>`;
                } else {
                    paginationHtml += `</span>`;
                }
                
                // Page numbers
                paginationHtml += `<div class="JO-pagination-pages">`;
                for (let i = Math.max(1, data.current_page - 2); i <= Math.min(data.total_pages, data.current_page + 2); i++) {
                    if (i === data.current_page) {
                        paginationHtml += `<span class="JO-pagination-page active">${i}</span>`;
                    } else {
                        paginationHtml += `<a href="?page=${i}" class="JO-pagination-page">${i}</a>`;
                    }
                }
                paginationHtml += `</div>`;
                
                // Next button
                if (data.has_next) {
                    paginationHtml += `<a href="?page=${data.current_page + 1}" class="JO-pagination-btn">`;
                } else {
                    paginationHtml += `<span class="JO-pagination-btn disabled">`;
                }
                paginationHtml += `Next <i class="fas fa-chevron-right"></i>`;
                if (data.has_next) {
                    paginationHtml += `</a>`;
                } else {
                    paginationHtml += `</span>`;
                }
                
                navContainer.innerHTML = paginationHtml;
            }
        }
    }

    // Pagination functionality
    const paginationContainer = document.querySelector('.JO-pagination');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', function(e) {
            e.preventDefault();
            const link = e.target.closest('a');
            if (link && link.href) {
                const url = new URL(link.href);
                const page = url.searchParams.get('page');
                const searchTerm = document.getElementById('document-search')?.value.trim() || '';
                
                // Build URL with current search term
                const baseUrl = new URL(window.location.href);
                baseUrl.searchParams.set('page', page);
                if (searchTerm) {
                    baseUrl.searchParams.set('search', searchTerm);
                } else {
                    baseUrl.searchParams.delete('search');
                }

                fetch(baseUrl.toString(), {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                })
                .then(response => response.json())
                .then(data => {
                    updateTableWithSearchResults(data, searchTerm);
                })
                .catch(error => {
                    console.error('Pagination error:', error);
                });
            }
        });
    }

    // View Document Modal functionality
    const viewDocumentModal = document.getElementById('view-document-modal');
    const viewDocumentModalClose = document.getElementById('view-document-modal-close');
    const viewDocumentClose = document.getElementById('view-document-close');

    console.log('View modal elements found:', {
        viewDocumentModal,
        viewDocumentModalClose,
        viewDocumentClose
    })

    document.addEventListener('click', function(event) {
        const viewBtn = event.target.closest('.view-document-btn');
        if (viewBtn) {
            const documentId = viewBtn.getAttribute('data-doc-id');
            viewDocument(documentId);
        }
    });

    if (viewDocumentModalClose) {
        viewDocumentModalClose.addEventListener('click', function() {
            viewDocumentModal.classList.remove('active');
        });
    }

    if (viewDocumentClose) {
        viewDocumentClose.addEventListener('click', function() {
            viewDocumentModal.classList.remove('active');
        });
    }

    // Edit Document Modal functionality
    const editDocumentModal = document.getElementById('edit-document-modal');
    const editDocumentModalClose = document.getElementById('edit-document-modal-close');
    const editDocumentCancel = document.getElementById('edit-document-cancel');

    document.addEventListener('click', function(event) {
        const editBtn = event.target.closest('.edit-document-btn');
        if (editBtn) {
            const documentId = editBtn.getAttribute('data-doc-id');
            editDocument(documentId);
        }
    });

    if (editDocumentModalClose) {
        editDocumentModalClose.addEventListener('click', function() {
            editDocumentModal.classList.remove('active');
        });
    }

    if (editDocumentCancel) {
        editDocumentCancel.addEventListener('click', function() {
            editDocumentModal.classList.remove('active');
        });
    }

    // Delete Document Modal functionality
    const deleteDocumentModal = document.getElementById('delete-document-modal');
    const deleteDocumentModalClose = document.getElementById('delete-document-modal-close');
    const deleteDocumentCancel = document.getElementById('delete-document-cancel');
    const confirmDeleteDocument = document.getElementById('confirm-delete-document');

    document.addEventListener('click', function(event) {
        const deleteBtn = event.target.closest('.delete-document-btn');
        if (deleteBtn) {
            const documentId = deleteBtn.getAttribute('data-doc-id');
            showDeleteConfirmation(documentId);
        }
    });

    if (deleteDocumentModalClose) {
        deleteDocumentModalClose.addEventListener('click', function() {
            deleteDocumentModal.classList.remove('active');
        });
    }

    if (deleteDocumentCancel) {
        deleteDocumentCancel.addEventListener('click', function() {
            deleteDocumentModal.classList.remove('active');
        });
    }

    if (confirmDeleteDocument) {
        confirmDeleteDocument.addEventListener('click', function() {
            const documentId = document.getElementById('delete-document-id').value;
            deleteDocument(documentId);
        });
    }

    // Function to view document details
    function viewDocument(documentId) {
        // Get data from the table row
        const row = document.querySelector(`[data-doc-id="${documentId}"]`);
        if (!row) return;

        document.getElementById('view-reference-number').textContent = row.cells[0].textContent;
        document.getElementById('view-title').textContent = row.cells[1].textContent;
        document.getElementById('view-category').textContent = row.cells[2].textContent;
        document.getElementById('view-due-date').textContent = row.cells[3].textContent;
        document.getElementById('view-description').textContent = row.getAttribute('data-description') || '';
        const notes = row.getAttribute('data-notes') || '';
        document.getElementById('view-notes').textContent = notes;
    // Email & CC for view
    const viewEmail = row.getAttribute('data-email') || '';
    const viewCc = row.getAttribute('data-cc-email') || '';
    document.getElementById('view-email').textContent = viewEmail;
    document.getElementById('view-cc-email').textContent = viewCc;
        document.getElementById('view-notification-period').textContent = row.getAttribute('data-notification-period') || '';
        document.getElementById('view-created-by').textContent = row.getAttribute('data-created-by') || '';
        document.getElementById('view-doc-status').textContent = row.getAttribute('data-status') || '';

        // Hide notes section if no notes
        const notesSection = document.querySelector('#view-document-modal .modal-details-section:last-child');
        if (notesSection) {
            if (notes.trim() === '') {
                notesSection.style.display = 'none';
            } else {
                notesSection.style.display = 'block';
            }
        }

        // Update status display
        const statusElement = document.getElementById('view-status');
        const statusClass = row.getAttribute('data-status-class') || '';
        if (statusClass === 'expired') {
            statusElement.textContent = 'Expired';
            statusElement.className = 'JO-status JO-status-cancelled';
        } else if (statusClass === 'due-soon') {
            statusElement.textContent = 'Due Soon';
            statusElement.className = 'JO-status JO-status-approved';
        } else {
            statusElement.textContent = 'Active';
            statusElement.className = 'JO-status JO-status-approved';
        }

        // Update date display
        const dateLabelElement = document.getElementById('view-date-label');
        const dateValueElement = document.getElementById('view-date-value');
        dateLabelElement.textContent = 'Created:';
        dateValueElement.textContent = row.getAttribute('data-created-at') || '';

        viewDocumentModal.classList.add('active');
    }

    // Function to edit document
    function editDocument(documentId) {
        // Get data from the table row
        const row = document.querySelector(`[data-doc-id="${documentId}"]`);
        if (!row) return;

        document.getElementById('edit-document-id').value = documentId;

        // Set category dropdown
        const categorySelect = document.getElementById('edit-category');
        const categoryName = row.cells[2].textContent.trim();
        for (let i = 0; i < categorySelect.options.length; i++) {
            if (categorySelect.options[i].text === categoryName) {
                categorySelect.selectedIndex = i;
                break;
            }
        }

        document.getElementById('edit-title').value = row.cells[1].textContent.trim();
        document.getElementById('edit-description').value = row.getAttribute('data-description') || '';
        document.getElementById('edit-notes').value = row.getAttribute('data-notes') || '';
        document.getElementById('edit-notification-period').value = row.getAttribute('data-notification-period') || '';
    // populate email fields for edit form
    const editEmailInput = document.getElementById('edit-email');
    const editCcInput = document.getElementById('edit-cc-email');
    if (editEmailInput) editEmailInput.value = row.getAttribute('data-email') || '';
    if (editCcInput) editCcInput.value = row.getAttribute('data-cc-email') || '';
    // populate notify checkboxes
    const notifyEmailChk = document.getElementById('edit-notify-via-email');
    const notifySystemChk = document.getElementById('edit-notify-via-system');
    if (notifyEmailChk) notifyEmailChk.checked = row.getAttribute('data-notify-email') === 'true';
    if (notifySystemChk) notifySystemChk.checked = row.getAttribute('data-notify-system') === 'true';

        // Parse and set the due date
        const dueDateText = row.cells[3].textContent.trim();
        if (dueDateText) {
            const dateParts = dueDateText.split(' ');
            if (dateParts.length === 3) {
                const monthNames = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                };
                const month = monthNames[dateParts[0]];
                const day = dateParts[1].replace(',', '').padStart(2, '0');
                const year = dateParts[2];
                const formattedDate = `${year}-${month}-${day}`;
                document.getElementById('edit-due-date').value = formattedDate;
            }
        }

        editDocumentModal.classList.add('active');
    }

    // Function to show delete confirmation
    function showDeleteConfirmation(documentId) {
        const row = document.querySelector(`[data-doc-id="${documentId}"]`);
        if (!row) return;

        document.getElementById('delete-document-id').value = documentId;
        document.getElementById('delete-reference-number').textContent = row.cells[0].textContent;
        document.getElementById('delete-title').textContent = row.cells[1].textContent;

        deleteDocumentModal.classList.add('active');
    }

    // Function to delete document
    function deleteDocument(documentId) {
        fetch(`/docu-notification/delete-document/${documentId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                deleteDocumentModal.classList.remove('active');
                showToast('Document deleted successfully!', 'success');
                // Reload page to update the list
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showToast('Error: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred while deleting the document.', 'error');
        });
    }

    // Handle edit form submission
    const editDocumentForm = document.getElementById('edit-document-form');
    if (editDocumentForm) {
        editDocumentForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(editDocumentForm);

            // Show loading state
            const submitBtn = editDocumentForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            // Submit form via AJAX
            fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': csrfToken
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Document updated successfully!', 'success');
                    editDocumentModal.classList.remove('active');
                    // Reload page to show updated document
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    // Show validation errors
                    showFormErrors(data.errors);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('An error occurred. Please try again.', 'error');
            })
            .finally(() => {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
        });
    }
});
