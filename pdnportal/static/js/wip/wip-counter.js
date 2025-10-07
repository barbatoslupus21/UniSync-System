document.addEventListener('DOMContentLoaded', function() {
    const newSessionBtn = document.getElementById('new-session-btn');
    const newSessionModal = document.getElementById('new-session-modal');
    const editSessionModal = document.getElementById('edit-session-modal');
    const deleteSessionModal = document.getElementById('delete-session-modal');
    const sessionForm = document.getElementById('session-form');
    const editSessionForm = document.getElementById('edit-session-form');
    
    let currentSessionId = null;

    newSessionBtn.addEventListener('click', function() {
        openModal(newSessionModal);
    });

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
            showToast('An error occurred while creating the session', 'error');
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
        if (!currentSessionId) return;
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="loading-spinner"></div> Deleting...';
        btn.disabled = true;
        
        fetch(`/wip-inventory/session/${currentSessionId}/delete/`, {
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
    `;
    document.head.appendChild(style);
});