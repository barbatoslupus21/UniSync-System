// Global search timeout variable
let searchTimeout;

// Search function (global scope)
function performSearch(query, dateFilter, page) {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (dateFilter) params.append('date', dateFilter);
    if (page) params.append('page', page);

    console.log('Searching with params:', params.toString());

    const tbody = document.getElementById('trial-run-tbody');
    if (tbody) {
        tbody.style.opacity = '0.5';
    }

    fetch(`/wip-inventory/api/search-sessions/?${params.toString()}`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Search results:', data);
            if (tbody) {
                tbody.innerHTML = data.html;
                tbody.style.opacity = '1';
                
                // Reattach event listeners to new edit and delete buttons
                attachRowEventListeners();
                
                // Update pagination
                updatePaginationControls(data, query, dateFilter);
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            if (tbody) {
                tbody.style.opacity = '1';
            }
        });
}

// Update pagination function (global scope)
function updatePaginationControls(data, query, dateFilter) {
    const paginationInfo = document.querySelector('.JO-pagination-info');
    if (paginationInfo) {
        const start = data.total_count > 0 ? (data.page - 1) * 10 + 1 : 0;
        const end = Math.min(data.page * 10, data.total_count);
        paginationInfo.textContent = `Showing ${start} to ${end} of ${data.total_count} entries`;
    }

    const paginationPages = document.querySelector('.JO-pagination-pages');
    if (paginationPages) {
        let paginationHTML = '';
        for (let i = 1; i <= data.total_pages; i++) {
            if (i === parseInt(data.page)) {
                paginationHTML += `<span class="JO-pagination-page active">${i}</span>`;
            } else if (i > parseInt(data.page) - 3 && i < parseInt(data.page) + 3) {
                paginationHTML += `<a href="#" class="JO-pagination-page" onclick="performSearch('${query.replace(/'/g, "\\'")}', '${dateFilter}', ${i}); return false;">${i}</a>`;
            }
        }
        paginationPages.innerHTML = paginationHTML;
    }

    const prevBtn = document.querySelectorAll('.JO-pagination-nav-container .JO-pagination-btn')[0];
    const nextBtn = document.querySelectorAll('.JO-pagination-nav-container .JO-pagination-btn')[1];
    
    if (prevBtn) {
        if (data.has_previous) {
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
            prevBtn.onclick = () => performSearch(query, dateFilter, parseInt(data.page) - 1);
            prevBtn.classList.remove('disabled');
        } else {
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
            prevBtn.onclick = null;
            prevBtn.classList.add('disabled');
        }
    }

    if (nextBtn) {
        if (data.has_next) {
            nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
            nextBtn.onclick = () => performSearch(query, dateFilter, parseInt(data.page) + 1);
            nextBtn.classList.remove('disabled');
        } else {
            nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
            nextBtn.onclick = null;
            nextBtn.classList.add('disabled');
        }
    }
}

// Attach row event listeners function (global scope)
function attachRowEventListeners() {
    const editSessionModal = document.getElementById('edit-session-modal');
    const editSessionForm = document.getElementById('edit-session-form');
    const deleteSessionModal = document.getElementById('delete-session-modal');
    
    // Attach edit button listeners
    document.querySelectorAll('.WIP-edit-btn').forEach(btn => {
        btn.onclick = function() {
            const sessionId = this.getAttribute('data-id');
            const lineId = this.getAttribute('data-line');
            const lineNameAttr = this.getAttribute('data-line-name');
            const personResponsible = this.getAttribute('data-person');
            
            const editLineSelect = document.getElementById('edit_line');
            const editPersonInput = document.getElementById('edit_person_responsible');
            
            // Set person responsible
            if (editPersonInput) {
                editPersonInput.value = personResponsible;
            }
            
            // Handle line selection
            if (editLineSelect) {
                // Check if the line option exists
                const selectedOption = editLineSelect.querySelector(`option[value="${lineId}"]`);
                
                if (!selectedOption) {
                    // Line not found in user's assigned lines, add it temporarily
                    const option = document.createElement('option');
                    option.value = String(lineId);
                    option.textContent = lineNameAttr || `Line ${lineId} (Current)`;
                    option.setAttribute('data-temporary', 'true');
                    editLineSelect.appendChild(option);
                    console.warn(`Line ID ${lineId} not in user's assigned lines. Added temporarily.`);
                }
                
                // Select the session's current line
                editLineSelect.value = String(lineId);
            }
            
            if (editSessionForm) {
                editSessionForm.action = `/wip-inventory/session/${sessionId}/edit/`;
            }
            
            openModal(editSessionModal);
        };
    });

    // Attach delete button listeners
    document.querySelectorAll('.WIP-delete-btn').forEach(btn => {
        btn.onclick = function() {
            const sessionId = this.getAttribute('data-id');
            const sessionNumber = this.getAttribute('data-number');
            
            window.currentSessionIdForDelete = sessionId;
            document.getElementById('delete-session-number').textContent = sessionNumber;
            
            openModal(deleteSessionModal);
        };
    });
}

// Auto-select line if only one is available
function autoSelectSingleLine() {
    const lineSelect = document.getElementById('id_line');
    if (!lineSelect) return;
    
    // Get all options except the "Select Line" placeholder
    const options = Array.from(lineSelect.options).filter(option => option.value !== '');
    
    // If there's only one line, auto-select it
    if (options.length === 1) {
        lineSelect.value = options[0].value;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const newSessionBtn = document.getElementById('new-session-btn');
    const newSessionModal = document.getElementById('new-session-modal');
    const editSessionModal = document.getElementById('edit-session-modal');
    const deleteSessionModal = document.getElementById('delete-session-modal');
    const sessionForm = document.getElementById('session-form');
    const editSessionForm = document.getElementById('edit-session-form');
    
    let currentSessionId = null;

    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', function() {
            openModal(newSessionModal);
            // Auto-select line if only one exists
            autoSelectSingleLine();
        });
    }

    // Date filter dropdown handler
    const dateFilter = document.getElementById('date-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            const selectedDate = this.value;
            const searchQuery = document.getElementById('stock-declaration-search')?.value || '';
            performSearch(searchQuery, selectedDate, 1);
        });
    }

    // Search functionality
    const searchInput = document.getElementById('stock-declaration-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const searchQuery = this.value.trim();
            const selectedDate = document.getElementById('date-filter')?.value || '';
            
            // Debounce search - wait 300ms after user stops typing
            searchTimeout = setTimeout(function() {
                performSearch(searchQuery, selectedDate, 1);
            }, 300);
        });
    }

    // Search button click handler
    const searchButton = document.querySelector('.JO-search-button');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchQuery = document.getElementById('stock-declaration-search').value.trim();
            const selectedDate = document.getElementById('date-filter')?.value || '';
            performSearch(searchQuery, selectedDate, 1);
        });
    }

    // Modal close handlers
    document.querySelectorAll('.JO-modal-close, #cancel-session').forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(newSessionModal);
            closeModal(editSessionModal);
            closeModal(deleteSessionModal);
        });
    });

    document.querySelector('.close-edit-modal').addEventListener('click', function() {
        closeModal(editSessionModal);
    });

    sessionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const line = formData.get('line');
        const personResponsible = formData.get('person_responsible');
        
        if (!line || !personResponsible.trim()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner"></div> Creating...';
        submitBtn.disabled = true;
        
        fetch(this.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'An error occurred');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showToast('Session created successfully!', 'success');
                closeModal(newSessionModal);
                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 1000);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast(error.message || 'An error occurred while creating the session', 'error');
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    });

    document.querySelectorAll('.WIP-edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-id');
            const lineId = this.getAttribute('data-line');
            const personResponsible = this.getAttribute('data-person');
            
            currentSessionId = sessionId;
            
            document.getElementById('edit_line').value = lineId;
            document.getElementById('edit_person_responsible').value = personResponsible;
            
            editSessionForm.action = `/wip-inventory/session/${sessionId}/edit/`;
            
            openModal(editSessionModal);
        });
    });

    editSessionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const line = formData.get('line');
        const personResponsible = formData.get('person_responsible');
        
        if (!line || !personResponsible.trim()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner"></div> Updating...';
        submitBtn.disabled = true;
        
        fetch(this.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                return response.text();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred while updating the session', 'error');
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            closeModal(editSessionModal);
        });
    });

    document.querySelectorAll('.WIP-delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-id');
            const sessionNumber = this.getAttribute('data-number');
            
            currentSessionId = sessionId;
            document.getElementById('delete-session-number').textContent = sessionNumber;
            
            openModal(deleteSessionModal);
        });
    });

    document.getElementById('cancel-delete').addEventListener('click', function() {
        closeModal(deleteSessionModal);
    });

    document.getElementById('confirm-delete').addEventListener('click', function() {
        const deleteSessionId = currentSessionId || window.currentSessionIdForDelete;
        if (!deleteSessionId) return;
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="loading-spinner"></div> Deleting...';
        btn.disabled = true;
        
        fetch(`/wip-inventory/session/${deleteSessionId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(data.message, 'success');
                closeModal(deleteSessionModal);
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred while deleting the session', 'error');
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    });

    // Initialize auto-select for single line
    autoSelectSingleLine();

    // Remove duplicate search handler - the one above with id='stock-declaration-search' handles it
    /*
    const searchInput = document.querySelector('.JO-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('.JO-table tbody tr');
            let anyVisible = false;
            tableRows.forEach(row => {
                if (row.classList.contains('JO-empty-table')) return;
                if (!searchTerm) {
                    row.style.display = '';
                    row.style.animation = '';
                    anyVisible = true;
                } else {
                    const text = row.textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        row.style.display = '';
                        row.style.animation = 'fadeInUp 0.3s ease-out';
                        anyVisible = true;
                    } else {
                        row.style.display = 'none';
                        row.style.animation = '';
                    }
                }
            });
            // Show/hide the no-data-row (search) and no-session-row (empty)
            const noDataRow = document.querySelector('.no-data-row');
            const noSessionRow = document.querySelector('.no-session-row');
            if (!searchTerm) {
                if (noDataRow) noDataRow.style.display = 'none';
                if (noSessionRow) noSessionRow.style.display = (anyVisible ? 'none' : '');
            } else {
                if (noDataRow) noDataRow.style.display = anyVisible ? 'none' : '';
                if (noSessionRow) noSessionRow.style.display = 'none';
            }
        });
    }
    */

    const style = document.createElement('style');
    style.textContent = `
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @keyframes modalSlideOut {
            from {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});

// Global helper functions
function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const modalContent = modal.querySelector('.JO-modal-content');
    if (modalContent) {
        modalContent.style.animation = 'modalSlideIn 0.3s ease-out';
    }
}

function closeModal(modal) {
    if (!modal) return;
    const modalContent = modal.querySelector('.JO-modal-content');
    if (modalContent) {
        modalContent.style.animation = 'modalSlideOut 0.3s ease-out';
    }
    
    setTimeout(() => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }, 300);
}

function getCsrfToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token ? token.value : '';
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${iconClass} toast-icon"></i>
            <span>${message}</span>
        </div>
        <button class="close-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    toast.style.animation = 'slideInRight 0.3s ease';
    
    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        removeToast(toast);
    });
    
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
}

function removeToast(toast) {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        toast.remove();
    }, 300);
}