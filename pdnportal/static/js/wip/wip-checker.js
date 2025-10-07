document.addEventListener('DOMContentLoaded', function() {
    // For each table section, set up independent filtering
    document.querySelectorAll('.JO-table-section').forEach(function(section) {
        const searchInput = section.querySelector('.JO-search-input');
        const filterSelect = section.querySelector('.JO-filter-select');
        const tableBody = section.querySelector('.JO-table tbody');

        function filterTable() {
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const filterValue = filterSelect ? filterSelect.value : 'all';
            const tableRows = Array.from(tableBody.querySelectorAll('tr'));
            let anyVisible = false;

            tableRows.forEach(row => {
                // Skip the empty state row for now
                if (row.classList.contains('empty-state-row') || row.classList.contains('JO-empty-table') || row.classList.contains('no-data-row')) return;
                // Support both 'Line Name' and 'Line' columns
                const lineName = row.querySelector('td[data-label="Line Name"], td[data-label="Line"]')?.textContent.toLowerCase() || '';
                const statusText = row.querySelector('td[data-label="Status"] span')?.textContent.toLowerCase() || '';
                let showRow = true;

                // Search filter (by line name or status)
                if (searchTerm && !(lineName.includes(searchTerm) || statusText.includes(searchTerm))) {
                    showRow = false;
                }
                // Status filter
                if (showRow && filterValue !== 'all') {
                    if (filterValue === 'pending' && !statusText.includes('for checking')) {
                        showRow = false;
                    } else if (filterValue === 'checked' && !statusText.includes('checked')) {
                        showRow = false;
                    }
                }

                if (showRow) {
                    row.style.display = '';
                    anyVisible = true;
                } else {
                    row.style.display = 'none';
                }
            });
            updateEmptyState(anyVisible);
        }

        function updateEmptyState(anyVisible) {
            // Only show the no-data-row if there are data rows in the table (not just visible, but total)
            const dataRows = Array.from(tableBody.querySelectorAll('tr')).filter(row =>
                !row.classList.contains('no-session-row') && !row.classList.contains('no-data-row') && !row.classList.contains('JO-empty-table')
            );
            let emptyRow = tableBody.querySelector('.no-data-row');
            if (dataRows.length > 0 && !anyVisible) {
                if (!emptyRow) {
                    emptyRow = document.createElement('tr');
                    emptyRow.className = 'JO-empty-table no-data-row';
                    emptyRow.innerHTML = `
                        <td colspan="8">
                            <div class="no-data-message">
                                <div class="no-data-icon"><i class="fas fa-search"></i></div>
                                <div class="no-data-title">No matching WIP sessions found</div>
                                <div class="no-data-sub">Try adjusting your search criteria</div>
                            </div>
                        </td>
                    `;
                    tableBody.appendChild(emptyRow);
                }
                emptyRow.style.display = '';
            } else {
                if (emptyRow) emptyRow.remove();
            }
        }

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

        // Initial filter on page load
        filterTable();
    });

    document.querySelectorAll('.JO-view-details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const btn = this;
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<div class="loading-spinner"></div> Loading...';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 1000);
        });
    });
    
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

    // --- Claim Session Modal Logic ---
    const claimModal = document.getElementById('claim-session-modal');
    const closeClaimModalBtn = document.getElementById('close-claim-modal');
    const cancelClaimBtn = document.getElementById('cancel-claim-session');
    const confirmClaimBtn = document.getElementById('confirm-claim-session');
    let sessionToClaim = null;

    // Open modal on claim button click
    document.querySelectorAll('.JO-claim-session-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            sessionToClaim = btn.getAttribute('data-session-id');
            claimModal.style.display = 'flex';
            claimModal.classList.add('active');
        });
    });

    // Close modal logic
    function closeClaimModal() {
        claimModal.style.display = 'none';
        claimModal.classList.remove('active');
        sessionToClaim = null;
    }
    closeClaimModalBtn.addEventListener('click', closeClaimModal);
    cancelClaimBtn.addEventListener('click', closeClaimModal);
    // Optionally close on outside click
    claimModal.addEventListener('click', function(e) {
        if (e.target === claimModal) closeClaimModal();
    });

    // Confirm claim logic (AJAX call)
    confirmClaimBtn.addEventListener('click', function() {
        if (!sessionToClaim) return;
        confirmClaimBtn.disabled = true;
        confirmClaimBtn.innerHTML = '<div class="loading-spinner"></div> Claiming...';
        fetch(`session/${sessionToClaim}/claim/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Accept': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(data.message, 'success');
                setTimeout(() => window.location.reload(), 1200);
            } else {
                showToast(data.message, 'error');
            }
        })
        .catch(() => {
            showToast('An error occurred while claiming the session.', 'error');
        })
        .finally(() => {
            confirmClaimBtn.disabled = false;
            confirmClaimBtn.innerHTML = 'Yes, Claim';
            closeClaimModal();
        });
    });

    // Helper to get CSRF token
    function getCSRFToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 10) === 'csrftoken=') {
                    cookieValue = decodeURIComponent(cookie.substring(10));
                    break;
                }
            }
        }
        return cookieValue;
    }
});