document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const addUserBtn = document.getElementById('add-user-btn');
    const addUserModal = document.getElementById('add-user-modal');
    const editUserModal = document.getElementById('edit-user-modal');
    const addModalClose = addUserModal?.querySelector('.UM-modal-close');
    const editModalClose = editUserModal?.querySelector('.UM-modal-close');
    const cancelUserBtn = document.getElementById('cancel-user');
    const cancelEditUserBtn = document.getElementById('edit-cancel-user');
    const editButtons = document.querySelectorAll('.UM-edit-user');
    const addUserForm = document.getElementById('user-form');
    const editUserForm = document.getElementById('edit-user-form');
    const toastContainer = document.getElementById('toast-container');
    
    // Permissions checkboxes and submenus - Add form
    const jobOrderUser = document.getElementById('job-order-user');
    const jobOrderRoles = document.getElementById('job-order-roles');
    const manhoursUser = document.getElementById('manhours-user');
    const manhoursRoles = document.getElementById('manhours-roles');
    const monitoringUser = document.getElementById('monitoring-user');
    const monitoringRoles = document.getElementById('monitoring-roles');
    
    // Permissions checkboxes and submenus - Edit form
    const editJobOrderUser = document.getElementById('edit-job-order-user');
    const editJobOrderRoles = document.getElementById('edit-job-order-roles');
    const editManhoursUser = document.getElementById('edit-manhours-user');
    const editManhoursRoles = document.getElementById('edit-manhours-roles');
    const editMonitoringUser = document.getElementById('edit-monitoring-user');
    const editMonitoringRoles = document.getElementById('edit-monitoring-roles');
    
    // Password toggle - Add form
    const passwordField = document.getElementById('password');
    const passwordToggle = document.querySelector('.UM-password-toggle');
    
    // Password toggle - Edit form
    const editPasswordField = document.getElementById('edit-password');
    const editPasswordToggle = document.getElementById('edit-password-toggle');
    
    // Avatar controls - Add form
    const avatarPrev = document.getElementById('avatar-prev');
    const avatarNext = document.getElementById('avatar-next');
    const selectedAvatarInput = document.getElementById('selected-avatar');
    
    // Avatar controls - Edit form
    const editAvatarPrev = document.getElementById('edit-avatar-prev');
    const editAvatarNext = document.getElementById('edit-avatar-next');
    const editSelectedAvatarInput = document.getElementById('edit-selected-avatar');
    
    // Approver buttons
    const addApproverBtn = document.getElementById('add-approver-btn');
    const editAddApproverBtn = document.getElementById('edit-add-approver-btn');
    
    // Delete confirmation
    const deleteButtons = document.querySelectorAll('.UM-delete-user');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const deleteModalClose = deleteConfirmModal?.querySelector('.UM-modal-close');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const deleteUserForm = document.getElementById('delete-user-form');
    
    // Search and filter
    const userSearch = document.getElementById('user-search');
    const permissionFilter = document.getElementById('permission-filter');
    
    // Approvers section
    const approversList = document.getElementById('approvers-list');
    const editApproversList = document.getElementById('edit-approvers-list');
    
    // State variables for avatar carousels
    let currentAvatarIndex = 0;
    let editCurrentAvatarIndex = 0;
    let avatarCount = 9; // Total number of avatars
    let isEditMode = false;

    // ========== Event Listeners ==========
    
    // Open Add User modal when Add User button is clicked
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openUserModal();
            
            // Add micro-animation to button
            this.style.transform = 'scale(1.1)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    }
    
    // Edit user button click
    if (editButtons.length > 0) {
        // Add this to the edit button click event handler
        editButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const userId = this.getAttribute('data-id');
                if (!userId) {
                    console.error('User ID not found on edit button');
                    showToast('Error: User ID not found', 'error');
                    return;
                }

                // Add visual feedback with a line/border highlight
                const parentRow = this.closest('tr');
                if (parentRow) {
                    parentRow.style.boxShadow = '0 0 0 2px var(--jo-primary)';
                    parentRow.style.position = 'relative';
                    parentRow.style.zIndex = '1';
                    
                    // Reset after modal is closed
                    const resetHighlight = () => {
                        parentRow.style.boxShadow = '';
                        parentRow.style.position = '';
                        parentRow.style.zIndex = '';
                    };
                    
                    // Add event listeners to reset highlight
                    document.getElementById('edit-cancel-user').addEventListener('click', resetHighlight, {once: true});
                    document.querySelector('#edit-user-modal .UM-modal-close').addEventListener('click', resetHighlight, {once: true});
                }

                // Add micro-animation to button
                this.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 200);

                loadUserData(userId);
            });
        });
    }
    
    // Close Add modal events
    if (addModalClose) {
        addModalClose.addEventListener('click', function(e) {
            e.preventDefault();
            closeUserModal();
        });
    }
    
    if (cancelUserBtn) {
        cancelUserBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeUserModal();
        });
    }
    
    // Close Edit modal events
    if (editModalClose) {
        editModalClose.addEventListener('click', function(e) {
            e.preventDefault();
            closeEditUserModal();
        });
    }
    
    if (cancelEditUserBtn) {
        cancelEditUserBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeEditUserModal();
        });
    }
    
    // Close modals when clicking outside
    if (addUserModal) {
        addUserModal.addEventListener('click', function(e) {
            if (e.target === addUserModal) {
                closeUserModal();
            }
        });
    }
    
    if (editUserModal) {
        editUserModal.addEventListener('click', function(e) {
            if (e.target === editUserModal) {
                closeEditUserModal();
            }
        });
    }
    
    // Toggle password visibility - Add form
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function(e) {
            e.preventDefault();
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
            
            // Add micro-animation
            this.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    }
    
    // Toggle password visibility - Edit form
    if (editPasswordToggle) {
        editPasswordToggle.addEventListener('click', function(e) {
            e.preventDefault();
            const type = editPasswordField.getAttribute('type') === 'password' ? 'text' : 'password';
            editPasswordField.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
            
            // Add micro-animation
            this.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    }
    
    // Toggle subpermissions when main permission checkbox is clicked - Add form
    if (jobOrderUser) {
        jobOrderUser.addEventListener('change', function() {
            toggleSubpermissions(this, jobOrderRoles);
            
            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = jobOrderRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }
    
    if (manhoursUser) {
        manhoursUser.addEventListener('change', function() {
            toggleSubpermissions(this, manhoursRoles);
            
            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = manhoursRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }
    
    if (monitoringUser) {
        monitoringUser.addEventListener('change', function() {
            toggleSubpermissions(this, monitoringRoles);
            
            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = monitoringRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }
    
    // Toggle subpermissions when main permission checkbox is clicked - Edit form
    if (editJobOrderUser) {
        editJobOrderUser.addEventListener('change', function() {
            toggleSubpermissions(this, editJobOrderRoles);
            
            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = editJobOrderRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }
    
    if (editManhoursUser) {
        editManhoursUser.addEventListener('change', function() {
            toggleSubpermissions(this, editManhoursRoles);
            
            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = editManhoursRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }
    
    if (editMonitoringUser) {
        editMonitoringUser.addEventListener('change', function() {
            toggleSubpermissions(this, editMonitoringRoles);
            
            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = editMonitoringRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }
    
    // Delete user event listeners
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.id;
            openDeleteModal(userId);
            
            // Add micro-animation to button
            this.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    });
    
    // Close delete modal
    if (deleteModalClose) {
        deleteModalClose.addEventListener('click', function(e) {
            e.preventDefault();
            closeDeleteModal();
        });
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeDeleteModal();
        });
    }
    
    // Close delete modal when clicking outside
    if (deleteConfirmModal) {
        deleteConfirmModal.addEventListener('click', function(e) {
            if (e.target === deleteConfirmModal) {
                closeDeleteModal();
            }
        });
    }
    
    // Add approver button
    if (addApproverBtn) {
        addApproverBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addApproverRow();
        });
    }
    
    // Edit Add approver button
    if (editAddApproverBtn) {
        editAddApproverBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addEditApproverRow();
        });
    }
    
    // Search functionality
    if (userSearch) {
        userSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterUsers(searchTerm, permissionFilter?.value || 'all');
        });
    }
    
    // Permission filter
    if (permissionFilter) {
        permissionFilter.addEventListener('change', function() {
            const filterValue = this.value;
            filterUsers(userSearch?.value.toLowerCase() || '', filterValue);
        });
    }
    
    // Initialize avatar carousels
    setupAvatarCarousel();
    setupEditAvatarCarousel();
    
    // Check for flash messages on page load
    checkFlashMessages();
    
    // ========== Helper Functions ==========
    
    // Toggle sub-permissions visibility
    function toggleSubpermissions(checkbox, container) {
        if (checkbox.checked) {
            container.style.display = 'block';
            container.style.animation = 'none';
            setTimeout(() => {
                container.style.animation = 'UM-fade-in 0.3s ease-out';
            }, 10);
        } else {
            container.style.display = 'none';
        }
    }
    
    // Open user modal in create mode
    function openUserModal() {
        resetForm();
        isEditMode = false;
        
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Add New User';
        }
        
        const passwordLabel = document.getElementById('password-label');
        if (passwordLabel) {
            passwordLabel.textContent = 'Password';
        }
        
        if (passwordField) {
            passwordField.required = true;
        }
        
        // Make sure we're properly showing the modal
        if (addUserModal) {
            addUserModal.classList.add('active');
            
            // Apply fade-in animation
            const modalContent = addUserModal.querySelector('.UM-modal-content');
            if (modalContent) {
                modalContent.style.animation = 'none';
                setTimeout(() => {
                    modalContent.style.animation = 'UM-modal-appear 0.3s ease-out';
                }, 10);
            }
            
            // Prevent page scrolling when modal is open
            document.body.style.overflow = 'hidden';
            
            // Update avatar slider position
            setTimeout(() => {
                updateAvatarSlider();
            }, 100);
        } else {
            console.error('User modal element not found!');
            showToast('Error: Unable to open modal', 'error');
        }
    }
    
    // Load user data for editing
    function loadUserData(userId) {
        try {
            openEditUserModal();
            
            // Set the form action URL for editing
            if (editUserForm) {
                editUserForm.action = `/settings/user_edit/${userId}/`;
            }
            
            // Fetch user data from server
            fetch(`/settings/get_user_data/${userId}/`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        populateEditForm(data.user);
                        showToast('User data loaded successfully', 'success');
                    } else {
                        throw new Error(data.message || 'Error fetching user data');
                    }
                })
                .catch(error => {
                    console.error('Error loading user data:', error);
                    showToast('Error loading user data: ' + error.message, 'error');
                });
        } catch (error) {
            console.error('Error initiating user data load:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }
    
    // Populate edit form with user data
    function populateEditForm(userData) {
        try {
            console.log('Received user data:', userData);  // Debug log
            
            // Set user ID
            const userIdInput = document.getElementById('edit-user-id');
            if (userIdInput) {
                userIdInput.value = userData.id;
            }
            
            // Set basic information
            setInputValue('edit-id-number', userData.id_number);
            setInputValue('edit-name', userData.name);
            setInputValue('edit-username', userData.username);
            
            // Clear password field
            setInputValue('edit-password', '');
            
            // Set position
            const positionSelect = document.getElementById('edit-position');
            if (positionSelect) {
                // Find option with matching text
                Array.from(positionSelect.options).forEach(option => {
                    if (option.text.trim().toLowerCase() === userData.position.toLowerCase()) {
                        option.selected = true;
                    }
                });
            }
            
            // Set line - using line_name property from the correct path
            // This is the critical fix: use userData.line.line_name instead of userData.line_name
            const lineSelect = document.getElementById('edit-line');
            if (lineSelect && userData.line && userData.line.line_name) {
                Array.from(lineSelect.options).forEach(option => {
                    if (option.text.trim().toLowerCase() === userData.line.line_name.toLowerCase()) {
                        option.selected = true;
                    }
                });
            }
            
            // Set admin checkbox
            const isAdminCheckbox = document.getElementById('edit-is-admin');
            if (isAdminCheckbox) {
                isAdminCheckbox.checked = userData.is_admin;
            }
            
            // Set avatar
            if (userData.avatar) {
                // Extract avatar number from path
                const matches = userData.avatar.match(/avatar(\d+)\.png/i);
                if (matches && matches[1]) {
                    const avatarNum = parseInt(matches[1]);
                    const avatarIndex = avatarNum - 1; // Convert to 0-based index
                    
                    selectEditAvatar(avatarIndex);
                }
            }
            
            // Set module permissions
            // Job Order
            if (userData.job_order_user && editJobOrderUser) {
                editJobOrderUser.checked = true;
                toggleSubpermissions(editJobOrderUser, editJobOrderRoles);
                
                // Set role radio button
                if (userData.job_order_role) {
                    const roleRadio = document.querySelector(`#edit-job-order-roles input[value="${userData.job_order_role}"]`);
                    if (roleRadio) roleRadio.checked = true;
                }
            }
            
            // Manhours
            if (userData.manhours_user && editManhoursUser) {
                editManhoursUser.checked = true;
                toggleSubpermissions(editManhoursUser, editManhoursRoles);
                
                // Set role radio button
                if (userData.manhours_role) {
                    const roleRadio = document.querySelector(`#edit-manhours-roles input[value="${userData.manhours_role}"]`);
                    if (roleRadio) roleRadio.checked = true;
                }
            }
            
            // Monitoring
            if (userData.monitoring_user && editMonitoringUser) {
                editMonitoringUser.checked = true;
                toggleSubpermissions(editMonitoringUser, editMonitoringRoles);
                
                // Set role radio button
                if (userData.monitoring_role) {
                    const roleRadio = document.querySelector(`#edit-monitoring-roles input[value="${userData.monitoring_role}"]`);
                    if (roleRadio) roleRadio.checked = true;
                }
            }
            
            // Set approvers
            if (editApproversList) {
                // Clear existing approvers
                while (editApproversList.children.length > 0) {
                    editApproversList.removeChild(editApproversList.children[0]);
                }
                
                // Add approvers from data
                if (userData.approvers && userData.approvers.length > 0) {
                    userData.approvers.forEach((approver, index) => {
                        addEditApproverRow(approver, index);
                    });
                } else {
                    // Add default empty row
                    addEditApproverRow(null, 0);
                }
            }
        } catch (error) {
            console.error('Error populating form:', error);
            showToast('Error populating form: ' + error.message, 'error');
        }
    }
    
    // Reset form to default state
    function resetForm() {
        if (!addUserForm) return;
        
        addUserForm.reset();
        
        const userIdInput = document.getElementById('user-id');
        if (userIdInput) {
            userIdInput.value = '';
        }
        
        // Reset sub-permissions
        if (jobOrderRoles) jobOrderRoles.style.display = 'none';
        if (manhoursRoles) manhoursRoles.style.display = 'none';
        if (monitoringRoles) monitoringRoles.style.display = 'none';
        
        // Reset avatar
        currentAvatarIndex = 0;
        selectAvatar(currentAvatarIndex);
        
        // Reset approvers
        if (approversList) {
            // Clear all approver rows except the first one
            while (approversList.children.length > 1) {
                approversList.removeChild(approversList.lastChild);
            }
            
            // Reset first approver row
            if (approversList.children.length === 1) {
                const firstRow = approversList.children[0];
                const moduleSelect = firstRow.querySelector('select[name="approver_module[]"]');
                const roleSelect = firstRow.querySelector('select[name="approver_role[]"]');
                const userSelect = firstRow.querySelector('select[name="approver_user[]"]');
                
                if (moduleSelect) moduleSelect.value = '';
                if (roleSelect) roleSelect.value = '';
                if (userSelect) userSelect.value = '';
                
                // Disable remove button for the first row
                const removeBtn = firstRow.querySelector('.UM-remove-approver-btn');
                if (removeBtn) removeBtn.disabled = true;
            }
        }
    }
    
    // Reset edit form to default state
    function resetEditForm() {
        if (!editUserForm) return;
        
        editUserForm.reset();
        
        const userIdInput = document.getElementById('edit-user-id');
        if (userIdInput) {
            userIdInput.value = '';
        }
        
        // Reset sub-permissions
        if (editJobOrderRoles) editJobOrderRoles.style.display = 'none';
        if (editManhoursRoles) editManhoursRoles.style.display = 'none';
        if (editMonitoringRoles) editMonitoringRoles.style.display = 'none';
        
        // Reset avatar
        editCurrentAvatarIndex = 0;
        selectEditAvatar(editCurrentAvatarIndex);
        
        // Reset approvers
        if (editApproversList) {
            // Clear all approver rows
            while (editApproversList.children.length > 0) {
                editApproversList.removeChild(editApproversList.lastChild);
            }
            
            // Add default empty row
            addEditApproverRow(null, 0);
        }
    }
    
    // Close user modal
    function closeUserModal() {
        if (addUserModal) {
            addUserModal.classList.remove('active');
            
            // Re-enable page scrolling
            document.body.style.overflow = '';
        }
        resetForm();
    }
    
    // Open edit user modal
    function openEditUserModal() {
        if (editUserModal) {
            editUserModal.classList.add('active');
            
            // Apply fade-in animation
            const modalContent = editUserModal.querySelector('.UM-modal-content');
            if (modalContent) {
                modalContent.style.animation = 'none';
                setTimeout(() => {
                    modalContent.style.animation = 'UM-modal-appear 0.3s ease-out';
                }, 10);
            }
            
            // Prevent page scrolling when modal is open
            document.body.style.overflow = 'hidden';
            
            // Update edit avatar slider position
            setTimeout(() => {
                updateEditAvatarSlider();
            }, 100);
        } else {
            console.error('Edit user modal element not found!');
            showToast('Error: Unable to open edit modal', 'error');
        }
    }
    
    // Close edit user modal
    function closeEditUserModal() {
        if (editUserModal) {
            editUserModal.classList.remove('active');
            
            // Re-enable page scrolling
            document.body.style.overflow = '';
        }
        resetEditForm();
    }
    
    // Open delete confirmation modal
    function openDeleteModal(userId) {
        if (deleteUserForm && deleteConfirmModal) {
            deleteUserForm.action = `/settings/delete/${userId}/`;
            deleteConfirmModal.classList.add('active');
            
            // Apply fade-in animation
            const modalContent = deleteConfirmModal.querySelector('.UM-modal-content');
            if (modalContent) {
                modalContent.style.animation = 'none';
                setTimeout(() => {
                    modalContent.style.animation = 'UM-modal-appear 0.3s ease-out';
                }, 10);
            }
            
            // Prevent page scrolling when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            console.error('Delete modal elements not found!');
            showToast('Error: Unable to open delete modal', 'error');
        }
    }
    
    // Close delete confirmation modal
    function closeDeleteModal() {
        if (deleteConfirmModal) {
            deleteConfirmModal.classList.remove('active');
            
            // Re-enable page scrolling
            document.body.style.overflow = '';
        }
    }
    
    // Add approver row
    function addApproverRow(approverData = null, index = null) {
        if (!approversList) return;
        
        // Count existing approver rows to generate a unique index if not provided
        if (index === null) {
            index = approversList.querySelectorAll('.UM-approver-row').length;
        }
        
        // Create new row
        const newRow = document.createElement('div');
        newRow.className = 'UM-approver-row';
        newRow.innerHTML = `
            <div class="UM-form-group">
                <label for="approver-module-${index}">Module</label>
                <select name="approver_module[]" id="approver-module-${index}" class="UM-select" required>
                    <option value="">Select Module</option>
                    <option value="Job Order" ${approverData && approverData.module === 'Job Order' ? 'selected' : ''}>Job Order</option>
                    <option value="Manhours" ${approverData && approverData.module === 'Manhours' ? 'selected' : ''}>Manhours</option>
                    <option value="Monitoring" ${approverData && approverData.module === 'Monitoring' ? 'selected' : ''}>Monitoring</option>
                </select>
            </div>
            
            <div class="UM-form-group">
                <label for="approver-role-${index}">Role</label>
                <select name="approver_role[]" id="approver-role-${index}" class="UM-select" required>
                    <option value="">Select Role</option>
                    <option value="Requestor" ${approverData && approverData.approver_role === 'Requestor' ? 'selected' : ''}>Requestor</option>
                    <option value="Checker" ${approverData && approverData.approver_role === 'Checker' ? 'selected' : ''}>Checker</option>
                    <option value="Approver" ${approverData && approverData.approver_role === 'Approver' ? 'selected' : ''}>Approver</option>
                </select>
            </div>
            
            <div class="UM-form-group approver-user-group">
                <label for="approver-user-${index}">Approver</label>
                <select name="approver_user[]" id="approver-user-${index}" class="UM-select" required>
                    <option value="">Select Approver</option>
                </select>
            </div>
            
            <div class="UM-approver-actions">
                <button type="button" class="UM-icon-button UM-remove-approver-btn">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        // Add to container
        approversList.appendChild(newRow);
        
        // Clone select options from the first approver row
        const firstApproverSelect = document.querySelector('#approver-user-0');
        const newApproverSelect = newRow.querySelector(`#approver-user-${index}`);
        
        if (firstApproverSelect && newApproverSelect) {
            // Clone options
            Array.from(firstApproverSelect.options).forEach(option => {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.textContent = option.textContent;
                newOption.selected = approverData && approverData.approver_id == option.value;
                newApproverSelect.appendChild(newOption);
            });
        }
        
        // Enable remove button on all rows if there are multiple rows
        if (approversList.children.length > 1) {
            approversList.querySelectorAll('.UM-remove-approver-btn').forEach(btn => {
                btn.disabled = false;
            });
        } else {
            // Disable remove button if there's only one row
            newRow.querySelector('.UM-remove-approver-btn').disabled = true;
        }
        
        // Add event listener to remove button
        const removeBtn = newRow.querySelector('.UM-remove-approver-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                removeApproverRow(newRow);
            });
        }
        
        // Add animation
        newRow.style.opacity = '0';
        newRow.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            newRow.style.opacity = '1';
            newRow.style.transform = 'translateY(0)';
            newRow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 10);
    }
    
    // Add edit approver row
    function addEditApproverRow(approverData = null, index = null) {
        if (!editApproversList) return;
        
        // Count existing approver rows to generate a unique index if not provided
        if (index === null) {
            index = editApproversList.querySelectorAll('.UM-approver-row').length;
        }
        
        // Create new row
        const newRow = document.createElement('div');
        newRow.className = 'UM-approver-row';
        newRow.innerHTML = `
            <div class="UM-form-group">
                <label for="edit-approver-module-${index}">Module</label>
                <select name="approver_module[]" id="edit-approver-module-${index}" class="UM-select" required>
                    <option value="">Select Module</option>
                    <option value="Job Order" ${approverData && approverData.module === 'Job Order' ? 'selected' : ''}>Job Order</option>
                    <option value="Manhours" ${approverData && approverData.module === 'Manhours' ? 'selected' : ''}>Manhours</option>
                    <option value="Monitoring" ${approverData && approverData.module === 'Monitoring' ? 'selected' : ''}>Monitoring</option>
                </select>
            </div>
            
            <div class="UM-form-group">
                <label for="edit-approver-role-${index}">Role</label>
                <select name="approver_role[]" id="edit-approver-role-${index}" class="UM-select" required>
                    <option value="">Select Role</option>
                    <option value="Requestor" ${approverData && approverData.approver_role === 'Requestor' ? 'selected' : ''}>Requestor</option>
                    <option value="Checker" ${approverData && approverData.approver_role === 'Checker' ? 'selected' : ''}>Checker</option>
                    <option value="Approver" ${approverData && approverData.approver_role === 'Approver' ? 'selected' : ''}>Approver</option>
                </select>
            </div>
            
            <div class="UM-form-group approver-user-group">
                <label for="edit-approver-user-${index}">Approver</label>
                <select name="approver_user[]" id="edit-approver-user-${index}" class="UM-select" required>
                    <option value="">Select Approver</option>
                </select>
            </div>
            
            <div class="UM-approver-actions">
                <button type="button" class="UM-icon-button UM-remove-approver-btn">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        // Add to container
        editApproversList.appendChild(newRow);
        
        // Clone select options from the first approver row in the add form
        const firstApproverSelect = document.querySelector('#approver-user-0');
        const newApproverSelect = newRow.querySelector(`#edit-approver-user-${index}`);
        
        if (firstApproverSelect && newApproverSelect) {
            // Clone options
            Array.from(firstApproverSelect.options).forEach(option => {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.textContent = option.textContent;
                newOption.selected = approverData && approverData.approver_id == option.value;
                newApproverSelect.appendChild(newOption);
            });
        }
        
        // Enable remove button on all rows if there are multiple rows
        if (editApproversList.children.length > 1) {
            editApproversList.querySelectorAll('.UM-remove-approver-btn').forEach(btn => {
                btn.disabled = false;
            });
        } else {
            // Disable remove button if there's only one row
            newRow.querySelector('.UM-remove-approver-btn').disabled = true;
        }
        
        // Add event listener to remove button
        const removeBtn = newRow.querySelector('.UM-remove-approver-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                removeEditApproverRow(newRow);
            });
        }
        
        // Add animation
        newRow.style.opacity = '0';
        newRow.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            newRow.style.opacity = '1';
            newRow.style.transform = 'translateY(0)';
            newRow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 10);
    }
    
    // Remove approver row
    function removeApproverRow(row) {
        if (!row) return;
        
        // Animate removal
        row.style.opacity = '0';
        row.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            row.remove();
            
            // Disable remove button on first row if it's the only one left
            const rows = approversList.querySelectorAll('.UM-approver-row');
            if (rows.length === 1) {
                const removeBtn = rows[0].querySelector('.UM-remove-approver-btn');
                if (removeBtn) {
                    removeBtn.disabled = true;
                }
            }
        }, 300);
    }
    
    // Remove edit approver row
    function removeEditApproverRow(row) {
        if (!row) return;
        
        // Animate removal
        row.style.opacity = '0';
        row.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            row.remove();
            
            // Disable remove button on first row if it's the only one left
            const rows = editApproversList.querySelectorAll('.UM-approver-row');
            if (rows.length === 1) {
                const removeBtn = rows[0].querySelector('.UM-remove-approver-btn');
                if (removeBtn) {
                    removeBtn.disabled = true;
                }
            }
        }, 300);
    }
    
    // Filter users based on search term and permission filter
    function filterUsers(searchTerm, permissionFilter) {
        const rows = document.querySelectorAll('.UM-table tbody tr');
        
        rows.forEach(row => {
            // Skip empty table message row
            if (row.querySelector('.UM-empty-table')) return;
            
            const name = row.querySelector('[data-label="Name"]')?.textContent.toLowerCase() || '';
            const id = row.querySelector('[data-label="ID"]')?.textContent.toLowerCase() || '';
            const line = row.querySelector('[data-label="Line"]')?.textContent.toLowerCase() || '';
            const position = row.querySelector('[data-label="Position"]')?.textContent.toLowerCase() || '';
            const username = row.querySelector('[data-label="Username"]')?.textContent.toLowerCase() || '';
            
            // Check if matches search term
            const matchesSearch = name.includes(searchTerm) || 
                                id.includes(searchTerm) || 
                                line.includes(searchTerm) ||
                                position.includes(searchTerm) ||
                                username.includes(searchTerm);
            
            // Check if matches permission filter
            let matchesFilter = true;
            if (permissionFilter !== 'all') {
                const permissions = row.querySelector('[data-label="Permissions"]');
                if (permissions) {
                    switch (permissionFilter) {
                        case 'admin':
                            matchesFilter = permissions.querySelector('.UM-admin-pill') !== null;
                            break;
                        case 'job_order':
                            matchesFilter = permissions.querySelector('.UM-job-order-pill') !== null;
                            break;
                        case 'manhours':
                            matchesFilter = permissions.querySelector('.UM-manhours-pill') !== null;
                            break;
                        case 'monitoring':
                            matchesFilter = permissions.querySelector('.UM-monitoring-pill') !== null;
                            break;
                    }
                }
            }
            
            // Show/hide row
            if (matchesSearch && matchesFilter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        
        // Check if no results
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
        const tableBody = document.querySelector('.UM-table tbody');
        if (!tableBody) return;
        
        const hasEmptyMessage = tableBody.querySelector('.UM-empty-filter-table');
        
        if (visibleRows.length === 0 && !hasEmptyMessage) {
            // Add empty message
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'UM-empty-filter-table';
            emptyRow.innerHTML = '<td colspan="9" class="UM-empty-table">No users match your filter criteria.</td>';
            tableBody.appendChild(emptyRow);
        } else if (visibleRows.length > 0 && hasEmptyMessage) {
            // Remove empty message
            hasEmptyMessage.remove();
        }
    }
    
    // Helper function to set input value
    function setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        }
    }
    
    // Check for flash messages
    function checkFlashMessages() {
        const messages = document.querySelectorAll('.message');
        
        messages.forEach(message => {
            const messageType = message.dataset.type || 'info';
            const messageText = message.textContent.trim();
            
            if (messageText) {
                showToast(messageText, messageType);
                message.remove();
            }
        });
    }
    
    // Show toast notification
    function showToast(message, type = 'info', duration = 3000) {
        if (!toastContainer) {
            console.error('Toast container not found!');
            return;
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Set icon based on type
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
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Add close button event
        const closeBtn = toast.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                removeToast(toast);
            });
        }
        
        // Animation
        toast.style.animation = 'slideInRight 0.3s ease, fadeOut 0.3s ease ' + (duration - 300) + 'ms forwards';
        
        // Auto-close after duration
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    // Remove toast with animation
    function removeToast(toast) {
        if (!toast) return;
        
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
    
    // AVATAR CAROUSEL FUNCTIONALITY
    // ===============================
    
    // Setup avatar carousel for Add form
    function setupAvatarCarousel() {
        const avatarPrev = document.getElementById('avatar-prev');
        const avatarNext = document.getElementById('avatar-next');
        const avatarSlider = document.querySelector('#add-user-modal .UM-avatar-slider');
        const selectedAvatarInput = document.getElementById('selected-avatar');
        
        // Clear existing avatars
        if (avatarSlider) {
            avatarSlider.innerHTML = '';
            
            // Add all 9 avatars
            for (let i = 1; i <= 9; i++) {
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'UM-avatar-option';
                avatarDiv.setAttribute('data-avatar', `avatar${i}.png`);
                
                if (i === 1) {
                    avatarDiv.classList.add('active');
                }
                
                avatarDiv.innerHTML = `
                    <img src="/static/images/profile/avatar${i}.png" alt="Avatar ${i}" class="UM-avatar-img">
                `;
                
                avatarSlider.appendChild(avatarDiv);
                
                // Add click event
                avatarDiv.addEventListener('click', function() {
                    selectAvatar(i - 1); // Index is 0-based
                });
            }
            
            // Set initial selected avatar
            if (selectedAvatarInput) {
                selectedAvatarInput.value = 'avatar1.png';
            }
        }
        
        // Initial position
        updateAvatarSlider();
    }
    
    // Setup avatar carousel for Edit form
    function setupEditAvatarCarousel() {
        const editAvatarPrev = document.getElementById('edit-avatar-prev');
        const editAvatarNext = document.getElementById('edit-avatar-next');
        const editAvatarSlider = document.querySelector('#edit-user-modal .UM-avatar-slider');
        const editSelectedAvatarInput = document.getElementById('edit-selected-avatar');
        
        // Clear existing avatars
        if (editAvatarSlider) {
            editAvatarSlider.innerHTML = '';
            
            // Add all 9 avatars
            for (let i = 1; i <= 9; i++) {
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'UM-avatar-option';
                avatarDiv.setAttribute('data-avatar', `avatar${i}.png`);
                
                if (i === 1) {
                    avatarDiv.classList.add('active');
                }
                
                avatarDiv.innerHTML = `
                    <img src="/static/images/profile/avatar${i}.png" alt="Avatar ${i}" class="UM-avatar-img">
                `;
                
                editAvatarSlider.appendChild(avatarDiv);
                
                // Add click event
                avatarDiv.addEventListener('click', function() {
                    selectEditAvatar(i - 1); // Index is 0-based
                });
            }
            
            // Set initial selected avatar
            if (editSelectedAvatarInput) {
                editSelectedAvatarInput.value = 'avatar1.png';
            }
        }
        
        // Set up navigation
        if (editAvatarPrev) {
            editAvatarPrev.addEventListener('click', function(e) {
                e.preventDefault();
                navigateEditAvatars('prev');
            });
        }
        
        if (editAvatarNext) {
            editAvatarNext.addEventListener('click', function(e) {
                e.preventDefault();
                navigateEditAvatars('next');
            });
        }
        
        // Initial position
        updateEditAvatarSlider();
    }
    
    // Select avatar - Add form
    function selectAvatar(index) {
        const avatarOptions = document.querySelectorAll('#add-user-modal .UM-avatar-option');
        if (!avatarOptions || avatarOptions.length === 0) return;
        
        currentAvatarIndex = index;
        
        // Remove active class from all avatars
        avatarOptions.forEach(option => option.classList.remove('active'));
        
        // Add active class to selected avatar
        if (avatarOptions[index]) {
            avatarOptions[index].classList.add('active');
            
            // Update hidden input value
            const selectedAvatarInput = document.getElementById('selected-avatar');
            if (selectedAvatarInput && avatarOptions[index].dataset.avatar) {
                selectedAvatarInput.value = avatarOptions[index].dataset.avatar;
            }
            
            // Update slider position
            updateAvatarSlider();
        }
    }
    
    // Update avatar slider position - Add form
    function updateAvatarSlider() {
        const avatarSlider = document.querySelector('#add-user-modal .UM-avatar-slider');
        const avatarOptions = document.querySelectorAll('#add-user-modal .UM-avatar-option');
        
        if (!avatarSlider || !avatarOptions || avatarOptions.length === 0 || !avatarOptions[currentAvatarIndex]) return;
        
        // Calculate offset to center the active avatar
        const activeOption = avatarOptions[currentAvatarIndex];
        
        if (!activeOption) return;
        
        const containerWidth = avatarSlider.parentElement.offsetWidth;
        const activeOptionLeft = activeOption.offsetLeft;
        const activeOptionWidth = activeOption.offsetWidth;
        
        const offset = containerWidth / 2 - (activeOptionLeft + activeOptionWidth / 2);
        
        avatarSlider.style.transform = `translateX(${offset}px)`;
    }
    
    // Navigate through avatar carousel - Edit form
    function navigateEditAvatars(direction) {
        const editAvatarOptions = document.querySelectorAll('#edit-user-modal .UM-avatar-option');
        if (!editAvatarOptions || editAvatarOptions.length === 0) return;
        
        const count = editAvatarOptions.length;
        
        if (direction === 'prev') {
            editCurrentAvatarIndex = (editCurrentAvatarIndex - 1 + count) % count;
        } else {
            editCurrentAvatarIndex = (editCurrentAvatarIndex + 1) % count;
        }
        
        selectEditAvatar(editCurrentAvatarIndex);
        
        // Add micro-animation to the button
        const button = direction === 'prev' ? document.getElementById('edit-avatar-prev') : document.getElementById('edit-avatar-next');
        if (button) {
            button.style.transform = 'translateY(-50%) scale(1.2)';
            setTimeout(() => {
                button.style.transform = 'translateY(-50%) scale(1)';
            }, 200);
        }
    }
    
    // Select avatar - Edit form
    function selectEditAvatar(index) {
        const editAvatarOptions = document.querySelectorAll('#edit-user-modal .UM-avatar-option');
        if (!editAvatarOptions || editAvatarOptions.length === 0) return;
        
        editCurrentAvatarIndex = index;
        
        // Remove active class from all avatars
        editAvatarOptions.forEach(option => option.classList.remove('active'));
        
        // Add active class to selected avatar
        if (editAvatarOptions[index]) {
            editAvatarOptions[index].classList.add('active');
            
            // Update hidden input value
            const editSelectedAvatarInput = document.getElementById('edit-selected-avatar');
            if (editSelectedAvatarInput && editAvatarOptions[index].dataset.avatar) {
                editSelectedAvatarInput.value = editAvatarOptions[index].dataset.avatar;
            }
            
            // Update slider position
            updateEditAvatarSlider();
        }
    }
    
    // Update avatar slider position - Edit form
    function updateEditAvatarSlider() {
        const editAvatarSlider = document.querySelector('#edit-user-modal .UM-avatar-slider');
        const editAvatarOptions = document.querySelectorAll('#edit-user-modal .UM-avatar-option');
        
        if (!editAvatarSlider || !editAvatarOptions || editAvatarOptions.length === 0 || !editAvatarOptions[editCurrentAvatarIndex]) return;
        
        // Calculate offset to center the active avatar
        const activeOption = editAvatarOptions[editCurrentAvatarIndex];
        
        if (!activeOption) return;
        
        const containerWidth = editAvatarSlider.parentElement.offsetWidth;
        const activeOptionLeft = activeOption.offsetLeft;
        const activeOptionWidth = activeOption.offsetWidth;
        
        const offset = containerWidth / 2 - (activeOptionLeft + activeOptionWidth / 2);
        
        editAvatarSlider.style.transform = `translateX(${offset}px)`;
    }
    
    // Window resize handler for responsive avatar carousels
    window.addEventListener('resize', function() {
        updateAvatarSlider();
        updateEditAvatarSlider();
    });
});

// jQuery for modal close (Bootstrap compatibility)
$(document).ready(function () {
    // Hide modal when cancel or close is clicked
    $('#editCancelBtn, .modal-close').on('click', function () {
        $('#editUserModal').hide(); // or use .modal('hide') if using Bootstrap
    });
});