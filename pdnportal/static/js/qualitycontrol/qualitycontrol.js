// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabSlider = document.querySelector('.tab-slider');

    function updateSlider() {
        const activeButton = document.querySelector('.tab-btn.active');
        if (activeButton) {
            tabSlider.style.left = activeButton.offsetLeft + 'px';
            tabSlider.style.width = activeButton.offsetWidth + 'px';
        }
    }

    function switchToTab(tabName) {
        // Find the tab button with matching data-tab attribute
        const targetButton = Array.from(tabButtons).find(btn => 
            btn.getAttribute('data-tab') === tabName
        );
        
        if (targetButton) {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to target button and corresponding content
            targetButton.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            // Update slider position
            updateSlider();
        }
    }

    // Check URL for tab parameter and switch to that tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
        switchToTab(tabParam);
    } else {
        // Initial slider position for default tab
        updateSlider();
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // Update slider position
            updateSlider();
        });
    });

    // Trial Run Modal functionality
    const trialRunModal = document.getElementById('trial-run-modal');
    const addTrialRunBtn = document.getElementById('add-trial-run-btn');
    const trialRunModalClose = document.getElementById('trial-run-modal-close');
    const trialRunCancel = document.getElementById('trial-run-cancel');

    if (addTrialRunBtn) {
        addTrialRunBtn.addEventListener('click', function() {
            trialRunModal.classList.add('active');
        });
    }

    if (trialRunModalClose) {
        trialRunModalClose.addEventListener('click', function() {
            trialRunModal.classList.remove('active');
        });
    }

    if (trialRunCancel) {
        trialRunCancel.addEventListener('click', function() {
            trialRunModal.classList.remove('active');
        });
    }

    // Export Trial Run Report Modal functionality
    const exportTrialRunModal = document.getElementById('export-trial-run-modal');
    const reportTrialRunBtn = document.getElementById('report-trial-run-btn');
    const exportTrialRunModalClose = document.getElementById('export-trial-run-modal-close');
    const exportTrialRunCancel = document.getElementById('export-trial-run-cancel');

    if (reportTrialRunBtn) {
        reportTrialRunBtn.addEventListener('click', function() {
            exportTrialRunModal.classList.add('active');
        });
    }

    if (exportTrialRunModalClose) {
        exportTrialRunModalClose.addEventListener('click', function() {
            exportTrialRunModal.classList.remove('active');
        });
    }

    if (exportTrialRunCancel) {
        exportTrialRunCancel.addEventListener('click', function() {
            exportTrialRunModal.classList.remove('active');
        });
    }

    // Export Lot Out Report Modal functionality
    const exportLotOutModal = document.getElementById('export-lot-out-modal');
    const reportLotOutBtn = document.getElementById('report-lot-out-btn');
    const exportLotOutModalClose = document.getElementById('export-lot-out-modal-close');
    const exportLotOutCancel = document.getElementById('export-lot-out-cancel');

    if (reportLotOutBtn) {
        reportLotOutBtn.addEventListener('click', function() {
            exportLotOutModal.classList.add('active');
        });
    }

    if (exportLotOutModalClose) {
        exportLotOutModalClose.addEventListener('click', function() {
            exportLotOutModal.classList.remove('active');
        });
    }

    if (exportLotOutCancel) {
        exportLotOutCancel.addEventListener('click', function() {
            exportLotOutModal.classList.remove('active');
        });
    }

    // Export Cut-Away Report Modal functionality
    const exportCutAwayModal = document.getElementById('export-cut-away-modal');
    const reportCutAwayBtn = document.getElementById('report-cut-away-btn');
    const exportCutAwayModalClose = document.getElementById('export-cut-away-modal-close');
    const exportCutAwayCancel = document.getElementById('export-cut-away-cancel');

    if (reportCutAwayBtn) {
        reportCutAwayBtn.addEventListener('click', function() {
            exportCutAwayModal.classList.add('active');
        });
    }

    if (exportCutAwayModalClose) {
        exportCutAwayModalClose.addEventListener('click', function() {
            exportCutAwayModal.classList.remove('active');
        });
    }

    if (exportCutAwayCancel) {
        exportCutAwayCancel.addEventListener('click', function() {
            exportCutAwayModal.classList.remove('active');
        });
    }

    // Lot Out Modal functionality
    const lotOutModal = document.getElementById('lot-out-modal');
    const addLotOutBtn = document.getElementById('add-lot-out-btn');
    const lotOutModalClose = document.getElementById('lot-out-modal-close');
    const lotOutCancel = document.getElementById('lot-out-cancel');

    if (addLotOutBtn) {
        addLotOutBtn.addEventListener('click', function() {
            lotOutModal.classList.add('active');
        });
    }

    if (lotOutModalClose) {
        lotOutModalClose.addEventListener('click', function() {
            lotOutModal.classList.remove('active');
        });
    }

    if (lotOutCancel) {
        lotOutCancel.addEventListener('click', function() {
            lotOutModal.classList.remove('active');
        });
    }

    // Cut-Away Modal functionality
    const cutAwayModal = document.getElementById('cut-away-modal');
    const addCutAwayBtn = document.getElementById('add-cut-away-btn');
    const cutAwayModalClose = document.getElementById('cut-away-modal-close');
    const cutAwayCancel = document.getElementById('cut-away-cancel');

    if (addCutAwayBtn) {
        addCutAwayBtn.addEventListener('click', function() {
            cutAwayModal.classList.add('active');
        });
    }

    if (cutAwayModalClose) {
        cutAwayModalClose.addEventListener('click', function() {
            cutAwayModal.classList.remove('active');
        });
    }

    if (cutAwayCancel) {
        cutAwayCancel.addEventListener('click', function() {
            cutAwayModal.classList.remove('active');
        });
    }

    // Purpose dropdown conditional logic for Cut-Away Request Modal
    const cutAwayPurpose = document.getElementById('cut-away-purpose');
    const cutAwayPurposeReasonGroup = document.getElementById('cut-away-purpose-reason-group');
    
    if (cutAwayPurpose && cutAwayPurposeReasonGroup) {
        cutAwayPurpose.addEventListener('change', function() {
            if (this.value === 'change_wire_anvil') {
                cutAwayPurposeReasonGroup.style.display = 'block';
            } else {
                cutAwayPurposeReasonGroup.style.display = 'none';
                document.getElementById('cut-away-purpose-reason').value = '';
            }
        });
    }

    // Purpose dropdown conditional logic for Edit Cut-Away Modal
    const editCutAwayPurpose = document.getElementById('edit-cut-away-purpose');
    const editCutAwayPurposeReasonGroup = document.getElementById('edit-cut-away-purpose-reason-group');
    
    if (editCutAwayPurpose && editCutAwayPurposeReasonGroup) {
        editCutAwayPurpose.addEventListener('change', function() {
            if (this.value === 'change_wire_anvil') {
                editCutAwayPurposeReasonGroup.style.display = 'block';
            } else {
                editCutAwayPurposeReasonGroup.style.display = 'none';
                document.getElementById('edit-cut-away-purpose-reason').value = '';
            }
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === trialRunModal) {
            trialRunModal.classList.remove('active');
        }
        if (event.target === exportTrialRunModal) {
            exportTrialRunModal.classList.remove('active');
        }
        if (event.target === lotOutModal) {
            lotOutModal.classList.remove('active');
        }
        if (event.target === cutAwayModal) {
            cutAwayModal.classList.remove('active');
        }
    });

    // View Trial Run Modal functionality
    const viewTrialRunModal = document.getElementById('view-trial-run-modal');
    const viewTrialRunModalClose = document.getElementById('view-trial-run-modal-close');
    const viewTrialRunClose = document.getElementById('view-trial-run-close');

    document.addEventListener('click', function(event) {
        const viewBtn = event.target.closest('.view-trial-run-btn');
        if (viewBtn) {
            const trialRunId = viewBtn.getAttribute('data-trial-run-id');
            viewTrialRun(trialRunId);
        }
    });

    if (viewTrialRunModalClose) {
        viewTrialRunModalClose.addEventListener('click', function() {
            viewTrialRunModal.classList.remove('active');
        });
    }

    if (viewTrialRunClose) {
        viewTrialRunClose.addEventListener('click', function() {
            viewTrialRunModal.classList.remove('active');
        });
    }

    // Edit Trial Run Modal functionality
    const editTrialRunModal = document.getElementById('edit-trial-run-modal');
    const editTrialRunModalClose = document.getElementById('edit-trial-run-modal-close');
    const editTrialRunCancel = document.getElementById('edit-trial-run-cancel');

    document.addEventListener('click', function(event) {
        const editBtn = event.target.closest('.edit-trial-run-btn');
        if (editBtn) {
            const trialRunId = editBtn.getAttribute('data-trial-run-id');
            editTrialRun(trialRunId);
        }
    });

    if (editTrialRunModalClose) {
        editTrialRunModalClose.addEventListener('click', function() {
            editTrialRunModal.classList.remove('active');
        });
    }

    if (editTrialRunCancel) {
        editTrialRunCancel.addEventListener('click', function() {
            editTrialRunModal.classList.remove('active');
        });
    }

    // Cancel Trial Run Modal functionality
    const cancelTrialRunModal = document.getElementById('cancel-trial-run-modal');
    const cancelTrialRunModalClose = document.getElementById('cancel-trial-run-modal-close');
    const cancelTrialRunCancel = document.getElementById('cancel-trial-run-cancel');
    const confirmCancelTrialRun = document.getElementById('confirm-cancel-trial-run');

    document.addEventListener('click', function(event) {
        const deleteBtn = event.target.closest('.cancel-trial-run-btn');
        if (deleteBtn) {
            const trialRunId = deleteBtn.getAttribute('data-trial-run-id');
            showCancelConfirmation(trialRunId);
        }
    });

    if (cancelTrialRunModalClose) {
        cancelTrialRunModalClose.addEventListener('click', function() {
            cancelTrialRunModal.classList.remove('active');
        });
    }

    if (cancelTrialRunCancel) {
        cancelTrialRunCancel.addEventListener('click', function() {
            cancelTrialRunModal.classList.remove('active');
        });
    }

    if (confirmCancelTrialRun) {
        confirmCancelTrialRun.addEventListener('click', function() {
            const trialRunId = document.getElementById('cancel-trial-run-id').value;
            cancelTrialRun(trialRunId);
        });
    }

    // Cancel Lot Out Modal functionality
    const cancelLotOutModal = document.getElementById('cancel-lot-out-modal');
    const cancelLotOutModalClose = document.getElementById('cancel-lot-out-modal-close');
    const cancelLotOutCancel = document.getElementById('cancel-lot-out-cancel');
    const confirmCancelLotOut = document.getElementById('confirm-cancel-lot-out');

    document.addEventListener('click', function(event) {
        const deleteBtn = event.target.closest('.cancel-lot-out-btn');
        if (deleteBtn) {
            const lotOutId = deleteBtn.getAttribute('data-lot-out-id');
            showCancelLotOutConfirmation(lotOutId);
        }
    });

    if (cancelLotOutModalClose) {
        cancelLotOutModalClose.addEventListener('click', function() {
            cancelLotOutModal.classList.remove('active');
        });
    }

    if (cancelLotOutCancel) {
        cancelLotOutCancel.addEventListener('click', function() {
            cancelLotOutModal.classList.remove('active');
        });
    }

    if (confirmCancelLotOut) {
        confirmCancelLotOut.addEventListener('click', function() {
            const lotOutId = document.getElementById('cancel-lot-out-id').value;
            cancelLotOut(lotOutId);
        });
    }

    // View Lot Out Modal functionality
    const viewLotOutModal = document.getElementById('view-lot-out-modal');
    const viewLotOutModalClose = document.getElementById('view-lot-out-modal-close');
    const viewLotOutClose = document.getElementById('view-lot-out-close');

    document.addEventListener('click', function(event) {
        const viewBtn = event.target.closest('.view-lot-out-btn');
        if (viewBtn) {
            const lotOutId = viewBtn.getAttribute('data-lot-out-id');
            viewLotOut(lotOutId);
        }
    });

    if (viewLotOutModalClose) {
        viewLotOutModalClose.addEventListener('click', function() {
            viewLotOutModal.classList.remove('active');
        });
    }

    if (viewLotOutClose) {
        viewLotOutClose.addEventListener('click', function() {
            viewLotOutModal.classList.remove('active');
        });
    }

    // Edit Lot Out Modal functionality
    const editLotOutModal = document.getElementById('edit-lot-out-modal');
    const editLotOutModalClose = document.getElementById('edit-lot-out-modal-close');
    const editLotOutCancel = document.getElementById('edit-lot-out-cancel');

    document.addEventListener('click', function(event) {
        const editBtn = event.target.closest('.edit-lot-out-btn');
        if (editBtn) {
            const lotOutId = editBtn.getAttribute('data-lot-out-id');
            editLotOut(lotOutId);
        }
    });

    if (editLotOutModalClose) {
        editLotOutModalClose.addEventListener('click', function() {
            editLotOutModal.classList.remove('active');
        });
    }

    if (editLotOutCancel) {
        editLotOutCancel.addEventListener('click', function() {
            editLotOutModal.classList.remove('active');
        });
    }

    // View Cut-Away Modal functionality
    const viewCutAwayModal = document.getElementById('view-cut-away-modal');
    const viewCutAwayModalClose = document.getElementById('view-cut-away-modal-close');
    const viewCutAwayClose = document.getElementById('view-cut-away-close');

    document.addEventListener('click', function(event) {
        const viewBtn = event.target.closest('.view-cut-away-btn');
        if (viewBtn) {
            const cutAwayId = viewBtn.getAttribute('data-cut-away-id');
            viewCutAway(cutAwayId);
        }
    });

    if (viewCutAwayModalClose) {
        viewCutAwayModalClose.addEventListener('click', function() {
            viewCutAwayModal.classList.remove('active');
        });
    }

    if (viewCutAwayClose) {
        viewCutAwayClose.addEventListener('click', function() {
            viewCutAwayModal.classList.remove('active');
        });
    }

    // Edit Cut-Away Modal functionality
    const editCutAwayModal = document.getElementById('edit-cut-away-modal');
    const editCutAwayModalClose = document.getElementById('edit-cut-away-modal-close');
    const editCutAwayCancel = document.getElementById('edit-cut-away-cancel');

    document.addEventListener('click', function(event) {
        const editBtn = event.target.closest('.edit-cut-away-btn');
        if (editBtn) {
            const cutAwayId = editBtn.getAttribute('data-cut-away-id');
            editCutAway(cutAwayId);
        }
    });

    if (editCutAwayModalClose) {
        editCutAwayModalClose.addEventListener('click', function() {
            editCutAwayModal.classList.remove('active');
        });
    }

    if (editCutAwayCancel) {
        editCutAwayCancel.addEventListener('click', function() {
            editCutAwayModal.classList.remove('active');
        });
    }

    // Cancel Cut-Away Modal functionality
    const cancelCutAwayModal = document.getElementById('cancel-cut-away-modal');
    const cancelCutAwayModalClose = document.getElementById('cancel-cut-away-modal-close');
    const cancelCutAwayCancelBtn = document.getElementById('cancel-cut-away-cancel-btn');
    const confirmCancelCutAway = document.getElementById('confirm-cancel-cut-away');

    document.addEventListener('click', function(event) {
        const deleteBtn = event.target.closest('.cancel-cut-away-btn');
        if (deleteBtn) {
            const cutAwayId = deleteBtn.getAttribute('data-cut-away-id');
            showCancelCutAwayConfirmation(cutAwayId);
        }
    });

    if (cancelCutAwayModalClose) {
        cancelCutAwayModalClose.addEventListener('click', function() {
            cancelCutAwayModal.classList.remove('active');
        });
    }

    if (cancelCutAwayCancelBtn) {
        cancelCutAwayCancelBtn.addEventListener('click', function() {
            cancelCutAwayModal.classList.remove('active');
        });
    }

    if (confirmCancelCutAway) {
        confirmCancelCutAway.addEventListener('click', function() {
            const cutAwayId = document.getElementById('cancel-cut-away-id').value;
            cancelCutAway(cutAwayId);
        });
    }

    // QA Cut-Away Modal functionality
    const qaCutAwayModal = document.getElementById('qa-cut-away-modal');
    const qaCutAwayModalClose = document.getElementById('qa-cut-away-modal-close');
    const qaCutAwayCancel = document.getElementById('qa-cut-away-cancel');

    document.addEventListener('click', function(event) {
        const qaBtn = event.target.closest('.qa-cut-away-btn');
        if (qaBtn) {
            const cutAwayId = qaBtn.getAttribute('data-cut-away-id');
            qaCutAway(cutAwayId);
        }
    });

    if (qaCutAwayModalClose) {
        qaCutAwayModalClose.addEventListener('click', function() {
            qaCutAwayModal.classList.remove('active');
        });
    }

    if (qaCutAwayCancel) {
        qaCutAwayCancel.addEventListener('click', function() {
            qaCutAwayModal.classList.remove('active');
        });
    }

    // Handle QA Cut-Away form submission
    const qaCutAwayForm = document.getElementById('qa-cut-away-form');
    if (qaCutAwayForm) {
        qaCutAwayForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const cutAwayId = formData.get('cut_away_id');
            
            fetch(`/quality-control/qa-cut-away/${cutAwayId}/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    qaCutAwayModal.classList.remove('active');
                    location.reload(); // Refresh the page to show updated status
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while processing the cut-away request.');
            });
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === viewTrialRunModal) {
            viewTrialRunModal.classList.remove('active');
        }
        if (event.target === editTrialRunModal) {
            editTrialRunModal.classList.remove('active');
        }
        if (event.target === cancelTrialRunModal) {
            cancelTrialRunModal.classList.remove('active');
        }
        if (event.target === exportTrialRunModal) {
            exportTrialRunModal.classList.remove('active');
        }
        if (event.target === exportLotOutModal) {
            exportLotOutModal.classList.remove('active');
        }
        if (event.target === exportCutAwayModal) {
            exportCutAwayModal.classList.remove('active');
        }
        if (event.target === cancelLotOutModal) {
            cancelLotOutModal.classList.remove('active');
        }
        if (event.target === lotOutModal) {
            lotOutModal.classList.remove('active');
        }
        if (event.target === viewLotOutModal) {
            viewLotOutModal.classList.remove('active');
        }
        if (event.target === editLotOutModal) {
            editLotOutModal.classList.remove('active');
        }
        if (event.target === cutAwayModal) {
            cutAwayModal.classList.remove('active');
        }
        if (event.target === viewCutAwayModal) {
            viewCutAwayModal.classList.remove('active');
        }
        if (event.target === editCutAwayModal) {
            editCutAwayModal.classList.remove('active');
        }
        if (event.target === cancelCutAwayModal) {
            cancelCutAwayModal.classList.remove('active');
        }
        if (event.target === qaCutAwayModal) {
            qaCutAwayModal.classList.remove('active');
        }
    });

    // Function to view trial run details
    function viewTrialRun(trialRunId) {
        // This would typically make an AJAX call to get the data
        // For now, we'll get the data from the table row
        const row = document.querySelector(`[data-trial-run-id="${trialRunId}"]`);
        
        document.getElementById('view-trr-number').textContent = row.cells[0].textContent;
        document.getElementById('view-trial-date').textContent = row.cells[1].textContent;
        document.getElementById('view-line').textContent = row.cells[3].textContent;
        document.getElementById('view-product-name').textContent = row.cells[2].textContent;
        document.getElementById('view-product-number').textContent = row.getAttribute('data-product-number');
        document.getElementById('view-process-name').textContent = row.cells[4].textContent;
        document.getElementById('view-trial-operator').textContent = row.cells[5].textContent;
        document.getElementById('view-change-from').textContent = row.getAttribute('data-change-from');
        document.getElementById('view-change-to').textContent = row.getAttribute('data-change-to');
        document.getElementById('view-requested-by').textContent = row.cells[6].textContent;
        
        // Update date display based on whether record has been updated
        const isUpdated = row.getAttribute('data-is-updated') === 'true';
        const dateLabelElement = document.getElementById('view-date-label');
        const dateValueElement = document.getElementById('view-date-value');
        
        if (isUpdated) {
            dateLabelElement.textContent = 'Updated:';
            dateValueElement.textContent = row.getAttribute('data-updated-at');
        } else {
            dateLabelElement.textContent = 'Submitted:';
            dateValueElement.textContent = row.getAttribute('data-created-at');
        }
        
        // Update status display
        const statusElement = document.getElementById('view-status');
        const status = row.getAttribute('data-status');
        if (status === 'cancelled') {
            statusElement.textContent = 'Cancelled';
            statusElement.className = 'JO-status JO-status-cancelled';
        } else {
            statusElement.textContent = 'Submitted';
            statusElement.className = 'JO-status JO-status-approved';
        }
        
        viewTrialRunModal.classList.add('active');
    }

    // Function to edit trial run
    function editTrialRun(trialRunId) {
        // This would typically make an AJAX call to get the data
        // For now, we'll get the data from the table row
        const row = document.querySelector(`[data-trial-run-id="${trialRunId}"]`);
        
        document.getElementById('edit-trial-run-id').value = trialRunId;
        
        // Parse and set the trial date
        const trialDateText = row.cells[1].textContent.trim();
        if (trialDateText) {
            // Convert "M d, Y" format to "YYYY-MM-DD" format
            const dateParts = trialDateText.split(' ');
            if (dateParts.length === 3) {
                const monthNames = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                };
                const month = monthNames[dateParts[0]];
                const day = dateParts[1].replace(',', '').padStart(2, '0');
                const year = dateParts[2];
                const formattedDate = `${year}-${month}-${day}`;
                document.getElementById('edit-trial-date').value = formattedDate;
            }
        }
        
        // Set line dropdown - we'll need to match by line name
        const lineSelect = document.getElementById('edit-line');
        const lineName = row.cells[3].textContent.trim();
        for (let i = 0; i < lineSelect.options.length; i++) {
            if (lineSelect.options[i].text === lineName) {
                lineSelect.selectedIndex = i;
                break;
            }
        }
        
        document.getElementById('edit-product-name').value = row.cells[2].textContent.trim();
        document.getElementById('edit-product-number').value = row.getAttribute('data-product-number') || '';
        document.getElementById('edit-process-name').value = row.cells[4].textContent.trim();
        document.getElementById('edit-trial-operator').value = row.cells[5].textContent.trim();
        document.getElementById('edit-change-from').value = row.getAttribute('data-change-from') || '';
        document.getElementById('edit-change-to').value = row.getAttribute('data-change-to') || '';
        
        editTrialRunModal.classList.add('active');
    }

    // Function to show cancel confirmation
    function showCancelConfirmation(trialRunId) {
        const row = document.querySelector(`[data-trial-run-id="${trialRunId}"]`);
        
        document.getElementById('cancel-trial-run-id').value = trialRunId;
        document.getElementById('cancel-trr-number').textContent = row.cells[0].textContent;
        document.getElementById('cancel-product-name').textContent = row.cells[2].textContent;
        
        cancelTrialRunModal.classList.add('active');
    }

    // Function to cancel trial run
    function cancelTrialRun(trialRunId) {
        fetch(`/quality-control/cancel-trial-run/${trialRunId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cancelTrialRunModal.classList.remove('active');
                location.reload(); // Refresh the page to show updated status
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while cancelling the trial run.');
        });
    }

    // Function to show cancel lot out confirmation
    function showCancelLotOutConfirmation(lotOutId) {
        const row = document.querySelector(`[data-lot-out-id="${lotOutId}"]`);
        
        document.getElementById('cancel-lot-out-id').value = lotOutId;
        document.getElementById('cancel-rli-number').textContent = row.cells[0].textContent;
        document.getElementById('cancel-lot-out-product-name').textContent = row.cells[2].textContent;
        
        cancelLotOutModal.classList.add('active');
    }

    // Function to cancel lot out
    function cancelLotOut(lotOutId) {
        fetch(`/quality-control/cancel-lot-out/${lotOutId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cancelLotOutModal.classList.remove('active');
                location.reload(); // Refresh the page to show updated status
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while cancelling the lot out inspection.');
        });
    }

    // Function to view lot out details
    function viewLotOut(lotOutId) {
        const row = document.querySelector(`[data-lot-out-id="${lotOutId}"]`);
        
        document.getElementById('view-lot-out-rli-number').textContent = row.cells[0].textContent;
        document.getElementById('view-lot-out-product-number-detail').textContent = row.cells[2].textContent;
        document.getElementById('view-lot-out-product-name-detail').textContent = row.cells[3].textContent;
        document.getElementById('view-lot-out-line-affected').textContent = row.cells[4].textContent;
        document.getElementById('view-lot-out-requested-by').textContent = row.cells[5].textContent;
        document.getElementById('view-lot-out-reason').textContent = row.getAttribute('data-reason');
        
        // Update date display based on whether record has been updated
        const isUpdated = row.getAttribute('data-is-updated') === 'true';
        const dateLabelElement = document.getElementById('view-lot-out-date-label');
        const dateValueElement = document.getElementById('view-lot-out-date-value');
        
        if (isUpdated) {
            dateLabelElement.textContent = 'Updated:';
            dateValueElement.textContent = row.getAttribute('data-updated-at');
        } else {
            dateLabelElement.textContent = 'Submitted:';
            dateValueElement.textContent = row.getAttribute('data-created-at');
        }
        
        // Update status display
        const statusElement = document.getElementById('view-lot-out-status');
        const status = row.getAttribute('data-status');
        if (status === 'cancelled') {
            statusElement.textContent = 'Cancelled';
            statusElement.className = 'JO-status JO-status-cancelled';
        } else {
            statusElement.textContent = 'Submitted';
            statusElement.className = 'JO-status JO-status-approved';
        }
        
        viewLotOutModal.classList.add('active');
    }

    // Function to edit lot out
    function editLotOut(lotOutId) {
        const row = document.querySelector(`[data-lot-out-id="${lotOutId}"]`);
        
        document.getElementById('edit-lot-out-id').value = lotOutId;
        document.getElementById('edit-lot-out-product-number').value = row.getAttribute('data-product-number');
        document.getElementById('edit-lot-out-product-name').value = row.cells[2].textContent.trim();
        document.getElementById('edit-lot-out-line-affected').value = row.getAttribute('data-line-id');
        document.getElementById('edit-lot-out-reason').value = row.getAttribute('data-reason');
        
        editLotOutModal.classList.add('active');
    }

    // Function to view cut-away details
    function viewCutAway(cutAwayId) {
        const row = document.querySelector(`[data-cut-away-id="${cutAwayId}"]`);
        
        document.getElementById('view-cut-away-control-number').textContent = row.cells[0].textContent;
        document.getElementById('view-cut-away-assy-line').textContent = row.cells[2].textContent;
        document.getElementById('view-cut-away-product-number').textContent = row.cells[3].textContent;
        document.getElementById('view-cut-away-schedule').textContent = row.getAttribute('data-schedule-date') || 'Not Set';
        document.getElementById('view-cut-away-requested-by').textContent = row.getAttribute('data-requested-by') || 'N/A';
        document.getElementById('view-cut-away-machine-number').textContent = row.getAttribute('data-machine-number') || 'N/A';
        document.getElementById('view-cut-away-applicator-number').textContent = row.getAttribute('data-applicator-code') || 'N/A';
        document.getElementById('view-cut-away-crimped-quantity').textContent = row.getAttribute('data-crimped-qty') || 'N/A';
        document.getElementById('view-cut-away-terminal-part-number').textContent = row.getAttribute('data-terminal-part') || 'N/A';
        document.getElementById('view-cut-away-date-received').textContent = row.getAttribute('data-received-date') || 'Not Set';
        
        // Display new fields
        const purpose = row.getAttribute('data-purpose') || '';
        const purposeLabels = {
            'new_product': 'New Product',
            'reached_50000': 'Reached 50,000',
            'reached_100000': 'Reached 100,000',
            'new_applicator': 'New Applicator',
            'change_wire_crimper': 'Change Wire Crimper',
            'change_wire_anvil': 'Change Wire Anvil',
            'new_combination': 'New Combination',
            'big_burr': 'Big Burr',
            'change_supplier': 'Change Supplier'
        };
        document.getElementById('view-cut-away-purpose').textContent = purposeLabels[purpose] || 'N/A';
        
        // Show/hide purpose reason based on whether it exists
        const purposeReason = row.getAttribute('data-purpose-reason') || '';
        const purposeReasonItem = document.getElementById('view-cut-away-purpose-reason-item');
        if (purposeReason && purposeReason.trim() !== '' && purposeReason !== 'None' && purposeReason !== 'null') {
            document.getElementById('view-cut-away-purpose-reason').textContent = purposeReason;
            purposeReasonItem.style.display = 'block';
        } else {
            purposeReasonItem.style.display = 'none';
        }
        
        document.getElementById('view-cut-away-leadwire-partnumber').textContent = row.getAttribute('data-leadwire-partnumber') || 'N/A';
        document.getElementById('view-cut-away-rubber-seal-partnumber').textContent = row.getAttribute('data-rubber-seal-partnumber') || 'N/A';
        
        // Handle QA remarks - hide the entire div if no remarks
        const qaRemarks = row.getAttribute('data-qa-remarks') || '';
        const remarksElement = document.getElementById('view-cut-away-qa-remarks');
        const remarksDiv = remarksElement.parentElement; // Get direct parent instead of closest
        
        if (qaRemarks && qaRemarks.trim() !== '' && qaRemarks !== 'None' && qaRemarks !== 'null') {
            remarksElement.textContent = qaRemarks;
            remarksDiv.style.display = 'block';
        } else {
            remarksDiv.style.display = 'none';
        }
        
        // Update date display based on whether record has been updated
        const isUpdated = row.getAttribute('data-is-updated') === 'true';
        const dateLabelElement = document.getElementById('view-cut-away-date-label');
        const dateValueElement = document.getElementById('view-cut-away-date-value');
        
        if (isUpdated) {
            dateLabelElement.textContent = 'Updated:';
            dateValueElement.textContent = row.getAttribute('data-updated-at');
        } else {
            dateLabelElement.textContent = 'Submitted:';
            dateValueElement.textContent = row.getAttribute('data-created-at');
        }
        
        // Update status display
        const statusElement = document.getElementById('view-cut-away-status');
        const status = row.getAttribute('data-status');
        if (status === 'cancelled') {
            statusElement.textContent = 'Cancelled';
            statusElement.className = 'JO-status JO-status-cancelled';
        } else if (status === 'completed') {
            statusElement.textContent = 'Completed';
            statusElement.className = 'JO-status JO-status-completed';
        } else if (status === 'in_progress') {
            statusElement.textContent = 'In Progress';
            statusElement.className = 'JO-status JO-status-approved';
        } else if (status === 'scheduled') {
            statusElement.textContent = 'Scheduled';
            statusElement.className = 'JO-status JO-status-approved';
        } else {
            statusElement.textContent = 'Pending';
            statusElement.className = 'JO-status JO-status-pending';
        }
        
        viewCutAwayModal.classList.add('active');
    }

    // Function to edit cut-away
    function editCutAway(cutAwayId) {
        const row = document.querySelector(`[data-cut-away-id="${cutAwayId}"]`);
        
        document.getElementById('edit-cut-away-id').value = cutAwayId;
        document.getElementById('edit-cut-away-assy-line').value = row.getAttribute('data-line-id');
        document.getElementById('edit-cut-away-machine-number').value = row.getAttribute('data-machine-number') || '';
        document.getElementById('edit-cut-away-applicator-number').value = row.getAttribute('data-applicator-code') || '';
        document.getElementById('edit-cut-away-crimped-quantity').value = row.getAttribute('data-crimped-qty') || '';
        document.getElementById('edit-cut-away-product-number').value = row.cells[3].textContent.trim();
        document.getElementById('edit-cut-away-terminal-part-number').value = row.getAttribute('data-terminal-part') || '';
        
        // Set new fields
        const purpose = row.getAttribute('data-purpose') || '';
        document.getElementById('edit-cut-away-purpose').value = purpose;
        
        const purposeReason = row.getAttribute('data-purpose-reason') || '';
        document.getElementById('edit-cut-away-purpose-reason').value = purposeReason;
        
        // Show/hide purpose reason field based on purpose value
        const editPurposeReasonGroup = document.getElementById('edit-cut-away-purpose-reason-group');
        if (purpose === 'change_wire_anvil') {
            editPurposeReasonGroup.style.display = 'block';
        } else {
            editPurposeReasonGroup.style.display = 'none';
        }
        
        document.getElementById('edit-cut-away-leadwire-partnumber').value = row.getAttribute('data-leadwire-partnumber') || '';
        document.getElementById('edit-cut-away-rubber-seal-partnumber').value = row.getAttribute('data-rubber-seal-partnumber') || '';
        
        editCutAwayModal.classList.add('active');
    }

    // Function to show cancel cut-away confirmation
    function showCancelCutAwayConfirmation(cutAwayId) {
        const row = document.querySelector(`[data-cut-away-id="${cutAwayId}"]`);
        
        document.getElementById('cancel-cut-away-id').value = cutAwayId;
        document.getElementById('cancel-cut-away-control-number').textContent = row.cells[0].textContent;
        document.getElementById('cancel-cut-away-product-number').textContent = row.cells[3].textContent;
        
        cancelCutAwayModal.classList.add('active');
    }

    // Function to cancel cut-away
    function cancelCutAway(cutAwayId) {
        fetch(`/quality-control/cancel-cut-away/${cutAwayId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cancelCutAwayModal.classList.remove('active');
                location.reload(); // Refresh the page to show updated status
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while cancelling the cut-away request.');
        });
    }

    // Function to handle QA Cut-Away processing
    function qaCutAway(cutAwayId) {
        const row = document.querySelector(`[data-cut-away-id="${cutAwayId}"]`);
        
        document.getElementById('qa-cut-away-id').value = cutAwayId;
        document.getElementById('qa-cut-away-control-number').textContent = row.cells[0].textContent;
        document.getElementById('qa-cut-away-assy-line').textContent = row.cells[2].textContent;
        document.getElementById('qa-cut-away-product-number').textContent = row.cells[3].textContent;
        document.getElementById('qa-cut-away-requested-by').textContent = row.cells[5].textContent;
        document.getElementById('qa-cut-away-machine-number').textContent = row.getAttribute('data-machine-number') || 'N/A';
        document.getElementById('qa-cut-away-applicator-number').textContent = row.getAttribute('data-applicator-code') || 'N/A';
        document.getElementById('qa-cut-away-crimped-quantity').textContent = row.getAttribute('data-crimped-qty') || 'N/A';
        document.getElementById('qa-cut-away-terminal-part-number').textContent = row.getAttribute('data-terminal-part') || 'N/A';
        
        // Update date display based on whether record has been updated
        const isUpdated = row.getAttribute('data-is-updated') === 'true';
        const dateLabelElement = document.getElementById('qa-cut-away-date-label');
        const dateValueElement = document.getElementById('qa-cut-away-date-value');
        
        if (isUpdated) {
            dateLabelElement.textContent = 'Updated:';
            dateValueElement.textContent = row.getAttribute('data-updated-at');
        } else {
            dateLabelElement.textContent = 'Submitted:';
            dateValueElement.textContent = row.getAttribute('data-created-at');
        }
        
        // Update status display
        const statusElement = document.getElementById('qa-cut-away-status');
        const status = row.getAttribute('data-status');
        if (status === 'cancelled') {
            statusElement.textContent = 'Cancelled';
            statusElement.className = 'JO-status JO-status-cancelled';
        } else if (status === 'completed') {
            statusElement.textContent = 'Completed';
            statusElement.className = 'JO-status JO-status-completed';
        } else if (status === 'in_progress') {
            statusElement.textContent = 'In Progress';
            statusElement.className = 'JO-status JO-status-approved';
        } else if (status === 'scheduled') {
            statusElement.textContent = 'Scheduled';
            statusElement.className = 'JO-status JO-status-approved';
        } else {
            statusElement.textContent = 'Pending';
            statusElement.className = 'JO-status JO-status-pending';
        }
        
        // Pre-fill schedule if it exists
        const existingSchedule = row.getAttribute('data-schedule-date');
        if (existingSchedule && existingSchedule !== 'Not Set') {
            // Convert from display format (M d, Y) to input format (YYYY-MM-DD)
            const dateParts = existingSchedule.split(' ');
            if (dateParts.length === 3) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = (monthNames.indexOf(dateParts[0]) + 1).toString().padStart(2, '0');
                const day = dateParts[1].replace(',', '').padStart(2, '0');
                const year = dateParts[2];
                document.getElementById('qa-cut-away-schedule').value = `${year}-${month}-${day}`;
            }
        }
        
        // Pre-fill existing QA remarks
        const existingQaRemarks = row.getAttribute('data-qa-remarks');
        if (existingQaRemarks && existingQaRemarks.trim() !== '' && existingQaRemarks !== 'None' && existingQaRemarks !== 'null') {
            document.getElementById('qa-cut-away-remarks').value = existingQaRemarks;
        }
        
        qaCutAwayModal.classList.add('active');
    }

    // Live search functionality for trial runs
    const trialRunSearchInput = document.getElementById('trial-run-search');
    const trialRunTbody = document.getElementById('trial-run-tbody');
    let searchTimeout;

    if (trialRunSearchInput) {
        trialRunSearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performTrialRunSearch(this.value);
            }, 300); // Debounce search by 300ms
        });
    }

    function performTrialRunSearch(query) {
        const url = `/quality-control/search-trial-runs/?q=${encodeURIComponent(query)}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderTrialRunResults(data.results);
                    // Hide pagination when searching
                    const pagination = document.querySelector('.JO-pagination');
                    if (pagination) {
                        pagination.style.display = query.trim() ? 'none' : 'flex';
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    function renderTrialRunResults(results) {
        if (results.length === 0) {
            trialRunTbody.innerHTML = `
                <tr>
                    <td colspan="9" class="JO-empty-table">
                        <div class="empty-state">
                            <i class="fa fa-search" aria-hidden="true"></i>
                            <h4>No Results Found</h4>
                            <p>No trial run requests match your search criteria</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        results.forEach(request => {
            const statusClass = request.status === 'cancelled' ? 'JO-status-cancelled' : 'JO-status-approved';
            const statusText = request.status === 'cancelled' ? 'Cancelled' : 'Submitted';
            
            html += `
                <tr data-trr-number="${request.trr_number.toLowerCase()}" 
                    data-product="${request.product_name.toLowerCase()}" 
                    data-line="${request.line.toLowerCase()}" 
                    data-trial-run-id="${request.id}" 
                    data-product-number="${request.product_number}" 
                    data-change-from="${request.change_from}" 
                    data-change-to="${request.change_to}" 
                    data-created-at="${request.created_at}" 
                    data-updated-at="${request.updated_at}" 
                    data-is-updated="${request.is_updated}" 
                    data-status="${request.status}">
                    <td data-label="TRR Number">${request.trr_number}</td>
                    <td data-label="Trial Date">${request.trial_date}</td>
                    <td data-label="Product Name">${request.product_name}</td>
                    <td data-label="Line">${request.line}</td>
                    <td data-label="Process Name">${request.process_name}</td>
                    <td data-label="Trial Operator">${request.trial_operator}</td>
                    <td data-label="Requested By">${request.requested_by}</td>
                    <td data-label="Status" class="text-center">
                        <span class="JO-status ${statusClass}">${statusText}</span>
                    </td>
                    <td data-label="Actions" class="text-center">
                        <button class="btn btn-icon view-trial-run-btn" data-trial-run-id="${request.id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${request.is_owner && request.status === 'submitted' ? `
                            <button class="btn btn-icon edit-trial-run-btn" data-trial-run-id="${request.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon btn-error cancel-trial-run-btn" data-trial-run-id="${request.id}" title="Cancel">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        trialRunTbody.innerHTML = html;
    }

    // Live search functionality for lot out inspections
    const lotOutSearchInput = document.getElementById('lot-out-search');
    const lotOutTbody = document.getElementById('lot-out-tbody');
    let lotOutSearchTimeout;

    if (lotOutSearchInput) {
        lotOutSearchInput.addEventListener('input', function() {
            clearTimeout(lotOutSearchTimeout);
            lotOutSearchTimeout = setTimeout(() => {
                performLotOutSearch(this.value);
            }, 300); // Debounce search by 300ms
        });
    }

    function performLotOutSearch(query) {
        const url = `/quality-control/search-lot-out/?q=${encodeURIComponent(query)}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderLotOutResults(data.results);
                    // Hide pagination when searching
                    const lotOutTab = document.getElementById('LotOut');
                    const pagination = lotOutTab.querySelector('.JO-pagination');
                    if (pagination) {
                        pagination.style.display = query.trim() ? 'none' : 'flex';
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    function renderLotOutResults(results) {
        if (results.length === 0) {
            lotOutTbody.innerHTML = `
                <tr>
                    <td colspan="8" class="JO-empty-table">
                        <div class="empty-state">
                            <i class="fa fa-search" aria-hidden="true"></i>
                            <h4>No Results Found</h4>
                            <p>No lot out inspection requests match your search criteria</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        results.forEach(inspection => {
            const statusClass = inspection.status === 'cancelled' ? 'JO-status-cancelled' : 'JO-status-approved';
            const statusText = inspection.status === 'cancelled' ? 'Cancelled' : 'Submitted';
            
            html += `
                <tr data-rli-number="${inspection.rli_number.toLowerCase()}" 
                    data-product="${inspection.product_name.toLowerCase()}" 
                    data-line="${inspection.line_affected.toLowerCase()}" 
                    data-lot-out-id="${inspection.id}" 
                    data-product-number="${inspection.product_number}" 
                    data-reason="${inspection.reason_for_lot_out}" 
                    data-line-id="${inspection.line_affected_id}"
                    data-status="${inspection.status}"
                    data-created-at="${inspection.created_at}" 
                    data-updated-at="${inspection.updated_at}" 
                    data-is-updated="${inspection.is_updated}">
                    <td data-label="RLI Number">${inspection.rli_number}</td>
                    <td data-label="Requested Date">${inspection.request_date}</td>
                    <td data-label="Product Name">${inspection.product_name}</td>
                    <td data-label="Product Number">${inspection.product_number}</td>
                    <td data-label="Line Affected">${inspection.line_affected}</td>
                    <td data-label="Requested By">${inspection.requested_by}</td>
                    <td data-label="Status" class="text-center">
                        <span class="JO-status ${statusClass}">${statusText}</span>
                    </td>
                    <td data-label="Actions" class="text-center">
                        <button class="btn btn-icon view-lot-out-btn" data-lot-out-id="${inspection.id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${inspection.is_owner && inspection.status === 'submitted' ? `
                            <button class="btn btn-icon edit-lot-out-btn" data-lot-out-id="${inspection.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon btn-error cancel-lot-out-btn" data-lot-out-id="${inspection.id}" title="Cancel">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        lotOutTbody.innerHTML = html;
    }
});

