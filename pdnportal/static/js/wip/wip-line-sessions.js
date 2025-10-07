document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.JO-search-input');
    const filterSelect = document.querySelector('.JO-filter-select');
    const checkSessionModal = document.getElementById('check-session-modal');
    
    let currentSessionId = null;
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterTable();
        });
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            filterTable();
        });
    }
    
    document.querySelectorAll('.WIP-check-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-id');
            const sessionNumber = this.getAttribute('data-number');
            
            currentSessionId = sessionId;
            document.getElementById('check-session-number').textContent = sessionNumber;
            
            openModal(checkSessionModal);
        });
    });
    
    document.querySelectorAll('.JO-modal-close, #cancel-check').forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(checkSessionModal);
        });
    });
    
    document.getElementById('confirm-check').addEventListener('click', function() {
        if (!currentSessionId) return;
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="loading-spinner"></div> Checking...';
        btn.disabled = true;
        
        fetch(`/wip/session/${currentSessionId}/check/`, {
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
                closeModal(checkSessionModal);
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred while checking the session', 'error');
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    });
    
    function filterTable() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filterValue = filterSelect ? filterSelect.value : 'all';
        const tableRows = document.querySelectorAll('.JO-table tbody tr');
        
        tableRows.forEach(row => {
            if (row.classList.contains('empty-state-row')) return;
            
            const sessionId = row.cells[0]?.textContent.toLowerCase() || '';
            const createdBy = row.cells[1]?.textContent.toLowerCase() || '';
            const personResponsible = row.cells[2]?.textContent.toLowerCase() || '';
            const status = row.cells[3]?.textContent.toLowerCase().trim() || '';
            
            let showRow = true;
            
            if (searchTerm && !sessionId.includes(searchTerm) && 
                !createdBy.includes(searchTerm) && !personResponsible.includes(searchTerm)) {
                showRow = false;
            }
            
            if (filterValue !== 'all') {
                if (filterValue === 'for_checking' && !status.includes('pending')) {
                    showRow = false;
                } else if (filterValue === 'checked' && !status.includes('checked')) {
                    showRow = false;
                }
            }
            
            if (showRow) {
                row.style.display = '';
                row.style.animation = 'fadeInUp 0.3s ease-out';
            } else {
                row.style.display = 'none';
            }
        });
        
        updateEmptyState();
    }
    
    function updateEmptyState() {
        const tableBody = document.querySelector('.JO-table tbody');
        const visibleRows = document.querySelectorAll('.JO-table tbody tr:not([style*="display: none"]):not(.empty-state-row)');
        
        let emptyRow = document.querySelector('.empty-state-row');
        
        if (visibleRows.length === 0) {
            if (!emptyRow) {
                emptyRow = document.createElement('tr');
                emptyRow.className = 'empty-state-row';
                emptyRow.innerHTML = '<td colspan="9" class="JO-empty-table">No sessions match your current filters.</td>';
                tableBody.appendChild(emptyRow);
            }
        } else {
            if (emptyRow) {
                emptyRow.remove();
            }
        }
    }
    
    function openModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        const modalContent = modal.querySelector('.JO-modal-content');
        modalContent.style.animation = 'modalSlideIn 0.3s ease-out';
    }
    
    function closeModal(modal) {
        const modalContent = modal.querySelector('.JO-modal-content');
        modalContent.style.animation = 'modalSlideOut 0.3s ease-out';
        
        setTimeout(() => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }, 300);
    }
    
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }
    
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
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
        
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
    `;
    document.head.appendChild(style);
});