document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const addUserBtn = document.getElementById('add-user-btn');
    const addUserModal = document.getElementById('add-user-modal');
    const editUserModal = document.getElementById('edit-user-modal');
    // Support both legacy UM-modal-close and JO-modal-close button class names
    const addModalClose = addUserModal?.querySelector('.UM-modal-close, .JO-modal-close');
    const editModalClose = editUserModal?.querySelector('.UM-modal-close, .JO-modal-close');
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
    const dcfUser = document.getElementById('dcf-user');
    const dcfRoles = document.getElementById('dcf-roles');
    const dcfRoleValidation = document.getElementById('dcf-role-validation');
    const ecisUser = document.getElementById('ecis-user');
    const ecisRoles = document.getElementById('ecis-roles');
    const ecisRoleValidation = document.getElementById('ecis-role-validation');
    const qualityControlUser = document.getElementById('quality-control-user');
    const qualityControlRoles = document.getElementById('quality-control-roles');
    const stockDeclarationUser = document.getElementById('stock-declaration-user');
    const stockDeclarationRoles = document.getElementById('stock-declaration-roles');

    // Permissions checkboxes and submenus - Edit form
    const editJobOrderUser = document.getElementById('edit-job-order-user');
    const editJobOrderRoles = document.getElementById('edit-job-order-roles');
    const editManhoursUser = document.getElementById('edit-manhours-user');
    const editManhoursRoles = document.getElementById('edit-manhours-roles');
    const editMonitoringUser = document.getElementById('edit-monitoring-user');
    const editMonitoringRoles = document.getElementById('edit-monitoring-roles');
    const editDcfUser = document.getElementById('edit-dcf-user');
    const editDcfRoles = document.getElementById('edit-dcf-roles');
    const editDcfRoleValidation = document.getElementById('edit-dcf-role-validation');
    const editEcisUser = document.getElementById('edit-ecis-user');
    const editEcisRoles = document.getElementById('edit-ecis-roles');
    const editEcisRoleValidation = document.getElementById('edit-ecis-role-validation');
    const editQualityControlUser = document.getElementById('edit-quality-control-user');
    const editQualityControlRoles = document.getElementById('edit-quality-control-roles');
    const editStockDeclarationUser = document.getElementById('edit-stock-declaration-user');
    const editStockDeclarationRoles = document.getElementById('edit-stock-declaration-roles');
    const docunotificationUser = document.getElementById('docunotification-user');
    const docunotificationRoles = document.getElementById('docunotification-roles');
    const docunotificationRoleValidation = document.getElementById('docunotification-role-validation');
    const editDocunotificationUser = document.getElementById('edit-docunotification-user');
    const editDocunotificationRoles = document.getElementById('edit-docunotification-roles');
    const editDocunotificationRoleValidation = document.getElementById('edit-docunotification-role-validation');

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
    const deleteModalClose = deleteConfirmModal?.querySelector('.UM-modal-close, .JO-modal-close');
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

    // Edit user button click - using event delegation for dynamically added rows
    document.addEventListener('click', function(e) {
        const editButton = e.target.closest('.UM-edit-user');
        if (editButton) {
            e.preventDefault();
            e.stopPropagation();

            const userId = editButton.getAttribute('data-id');
            if (!userId) {
                console.error('User ID not found on edit button');
                showToast('Error: User ID not found', 'error');
                return;
            }

            // Add visual feedback with a line/border highlight
            const parentRow = editButton.closest('tr');
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

                // Add event listeners to reset highlight (guard in case elements are not present)
                const editCancelEl = document.getElementById('edit-cancel-user');
                if (editCancelEl) {
                    editCancelEl.addEventListener('click', resetHighlight, {once: true});
                }

                const editModalCloseEl = document.querySelector('#edit-user-modal .UM-modal-close, #edit-user-modal .JO-modal-close');
                if (editModalCloseEl) {
                    editModalCloseEl.addEventListener('click', resetHighlight, {once: true});
                }
            }

            // Add micro-animation to button
            editButton.style.transform = 'scale(1.2)';
            setTimeout(() => {
                editButton.style.transform = 'scale(1)';
            }, 200);

            loadUserData(userId);
        }
    });

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

    // NOTE: Add User modal should only close via its close/cancel buttons.
    // Do NOT close the Add User modal when clicking outside (backdrop).
    // This keeps the user from accidentally dismissing the form.
    // (No backdrop click handler for addUserModal)

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

    // DCF user checkbox
    if (dcfUser) {
        // Set initial state
        if (dcfUser.checked && dcfRoles) {
            dcfRoles.style.display = 'block';
        }

        dcfUser.addEventListener('change', function() {
            toggleSubpermissions(this, dcfRoles);

            // Reset radio buttons and validation message when unchecked
            if (!this.checked) {
                const radioButtons = dcfRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
                if (dcfRoleValidation) {
                    dcfRoleValidation.style.display = 'none';
                }
            }
        });

        // Add event listeners to DCF role radio buttons
        const dcfRoleRadios = dcfRoles.querySelectorAll('input[type="radio"]');
        dcfRoleRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (dcfRoleValidation) {
                    dcfRoleValidation.style.display = 'none';
                }
            });
        });
    }

    // ECIS user checkbox
    if (ecisUser) {
        // Set initial state
        if (ecisUser.checked && ecisRoles) {
            ecisRoles.style.display = 'block';
        }

        ecisUser.addEventListener('change', function() {
            toggleSubpermissions(this, ecisRoles);

            // Reset radio buttons and validation message when unchecked
            if (!this.checked) {
                const radioButtons = ecisRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
                if (ecisRoleValidation) {
                    ecisRoleValidation.style.display = 'none';
                }
            }
        });

        // Add event listeners to ECIS role radio buttons
        const ecisRoleRadios = ecisRoles.querySelectorAll('input[type="radio"]');
        ecisRoleRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (ecisRoleValidation) {
                    ecisRoleValidation.style.display = 'none';
                }
            });
        });
    }

    // Quality Control user checkbox
    if (qualityControlUser) {
        qualityControlUser.addEventListener('change', function() {
            toggleSubpermissions(this, qualityControlRoles);

            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = qualityControlRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }

    // Stock Declaration user checkbox
    if (stockDeclarationUser) {
        // Set initial state if checkbox is pre-checked
        if (stockDeclarationUser.checked && stockDeclarationRoles) {
            stockDeclarationRoles.style.display = 'block';
            // Force reflow then add visible class for transition
            // eslint-disable-next-line no-unused-expressions
            void stockDeclarationRoles.offsetHeight;
            stockDeclarationRoles.classList.add('visible');
        }

        stockDeclarationUser.addEventListener('change', function() {
            toggleSubpermissions(this, stockDeclarationRoles);

            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = stockDeclarationRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }

    // Document Notification user checkbox
    if (docunotificationUser) {
        // Set initial state
        if (docunotificationUser.checked && docunotificationRoles) {
            docunotificationRoles.style.display = 'block';
        }

        docunotificationUser.addEventListener('change', function() {
            toggleSubpermissions(this, docunotificationRoles);

            // Reset radio buttons and validation message when unchecked
            if (!this.checked) {
                const radioButtons = docunotificationRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
                if (docunotificationRoleValidation) {
                    docunotificationRoleValidation.style.display = 'none';
                }
            }
        });

        // Add event listeners to Document Notification role radio buttons
        const docunotificationRoleRadios = docunotificationRoles.querySelectorAll('input[type="radio"]');
        docunotificationRoleRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (docunotificationRoleValidation) {
                    docunotificationRoleValidation.style.display = 'none';
                }
            });
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

    // DCF user checkbox for edit form
    if (editDcfUser) {
        // Set initial state
        if (editDcfUser.checked && editDcfRoles) {
            editDcfRoles.style.display = 'block';
        }

        editDcfUser.addEventListener('change', function() {
            toggleSubpermissions(this, editDcfRoles);

            // Reset radio buttons and validation message when unchecked
            if (!this.checked) {
                const radioButtons = editDcfRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
                if (editDcfRoleValidation) {
                    editDcfRoleValidation.style.display = 'none';
                }
            }
        });

        // Add event listeners to DCF role radio buttons
        const editDcfRoleRadios = editDcfRoles.querySelectorAll('input[type="radio"]');
        editDcfRoleRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (editDcfRoleValidation) {
                    editDcfRoleValidation.style.display = 'none';
                }
            });
        });
    }

    // ECIS user checkbox for edit form
    if (editEcisUser) {
        // Set initial state
        if (editEcisUser.checked && editEcisRoles) {
            editEcisRoles.style.display = 'block';
        }

        editEcisUser.addEventListener('change', function() {
            toggleSubpermissions(this, editEcisRoles);

            // Reset radio buttons and validation message when unchecked
            if (!this.checked) {
                const radioButtons = editEcisRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
                if (editEcisRoleValidation) {
                    editEcisRoleValidation.style.display = 'none';
                }
            }
        });

        // Add event listeners to ECIS role radio buttons
        const editEcisRoleRadios = editEcisRoles.querySelectorAll('input[type="radio"]');
        editEcisRoleRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (editEcisRoleValidation) {
                    editEcisRoleValidation.style.display = 'none';
                }
            });
        });
    }

    // Quality Control user checkbox for edit form
    if (editQualityControlUser) {
        editQualityControlUser.addEventListener('change', function() {
            toggleSubpermissions(this, editQualityControlRoles);

            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = editQualityControlRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }

    // Stock Declaration user checkbox for edit form
    if (editStockDeclarationUser) {
        // Set initial state if checkbox is pre-checked
        if (editStockDeclarationUser.checked && editStockDeclarationRoles) {
            editStockDeclarationRoles.style.display = 'block';
            // Force reflow then add visible class for transition
            // eslint-disable-next-line no-unused-expressions
            void editStockDeclarationRoles.offsetHeight;
            editStockDeclarationRoles.classList.add('visible');
        }

        editStockDeclarationUser.addEventListener('change', function() {
            toggleSubpermissions(this, editStockDeclarationRoles);

            // Reset radio buttons when unchecked
            if (!this.checked) {
                const radioButtons = editStockDeclarationRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }

    // Document Notification user checkbox for edit form
    if (editDocunotificationUser) {
        // Set initial state
        if (editDocunotificationUser.checked && editDocunotificationRoles) {
            editDocunotificationRoles.style.display = 'block';
        }

        editDocunotificationUser.addEventListener('change', function() {
            toggleSubpermissions(this, editDocunotificationRoles);

            // Reset radio buttons and validation message when unchecked
            if (!this.checked) {
                const radioButtons = editDocunotificationRoles.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.checked = false;
                });
                if (editDocunotificationRoleValidation) {
                    editDocunotificationRoleValidation.style.display = 'none';
                }
            }
        });

        // Add event listeners to Document Notification role radio buttons
        const editDocunotificationRoleRadios = editDocunotificationRoles.querySelectorAll('input[type="radio"]');
        editDocunotificationRoleRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (editDocunotificationRoleValidation) {
                    editDocunotificationRoleValidation.style.display = 'none';
                }
            });
        });
    }

    // Delete user event listeners - using event delegation for dynamically added rows
    document.addEventListener('click', function(e) {
        const deleteButton = e.target.closest('.UM-delete-user');
        if (deleteButton) {
            e.preventDefault();
            const userId = deleteButton.dataset.id;
            openDeleteModal(userId);

            // Add micro-animation to button
            deleteButton.style.transform = 'scale(1.2)';
            setTimeout(() => {
                deleteButton.style.transform = 'scale(1)';
            }, 200);
        }
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

    // Form submission validation for DCF and ECIS roles
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            let isValid = true;

            // Check if DCF user is checked but no role is selected
            if (dcfUser && dcfUser.checked) {
                const dcfRoleRadios = dcfRoles.querySelectorAll('input[type="radio"]:checked');
                if (dcfRoleRadios.length === 0) {
                    e.preventDefault();
                    if (dcfRoleValidation) {
                        dcfRoleValidation.style.display = 'block';
                    }
                    // Scroll to the validation message
                    dcfRoles.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    isValid = false;
                }
            }

            // Check if ECIS user is checked but no role is selected
            if (ecisUser && ecisUser.checked) {
                const ecisRoleRadios = ecisRoles.querySelectorAll('input[type="radio"]:checked');
                if (ecisRoleRadios.length === 0) {
                    e.preventDefault();
                    if (ecisRoleValidation) {
                        ecisRoleValidation.style.display = 'block';
                    }
                    // Scroll to the validation message if DCF validation didn't fail
                    if (isValid) {
                        ecisRoles.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    isValid = false;
                }
            }

            // Check if Document Notification user is checked but no role is selected
            if (docunotificationUser && docunotificationUser.checked) {
                const docunotificationRoleRadios = docunotificationRoles.querySelectorAll('input[type="radio"]:checked');
                if (docunotificationRoleRadios.length === 0) {
                    e.preventDefault();
                    if (docunotificationRoleValidation) {
                        docunotificationRoleValidation.style.display = 'block';
                    }
                    // Scroll to the validation message if previous validations didn't fail
                    if (isValid) {
                        docunotificationRoles.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    isValid = false;
                }
            }

            return isValid;
        });
    }

    // Form submission validation for Edit form DCF and ECIS roles
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            let isValid = true;

            // Check if DCF user is checked but no role is selected
            if (editDcfUser && editDcfUser.checked) {
                const editDcfRoleRadios = editDcfRoles.querySelectorAll('input[type="radio"]:checked');
                if (editDcfRoleRadios.length === 0) {
                    e.preventDefault();
                    if (editDcfRoleValidation) {
                        editDcfRoleValidation.style.display = 'block';
                    }
                    // Scroll to the validation message
                    editDcfRoles.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    isValid = false;
                }
            }

            // Check if ECIS user is checked but no role is selected
            if (editEcisUser && editEcisUser.checked) {
                const editEcisRoleRadios = editEcisRoles.querySelectorAll('input[type="radio"]:checked');
                if (editEcisRoleRadios.length === 0) {
                    e.preventDefault();
                    if (editEcisRoleValidation) {
                        editEcisRoleValidation.style.display = 'block';
                    }
                    // Scroll to the validation message if DCF validation didn't fail
                    if (isValid) {
                        editEcisRoles.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    isValid = false;
                }
            }

            // Check if Document Notification user is checked but no role is selected
            if (editDocunotificationUser && editDocunotificationUser.checked) {
                const editDocunotificationRoleRadios = editDocunotificationRoles.querySelectorAll('input[type="radio"]:checked');
                if (editDocunotificationRoleRadios.length === 0) {
                    e.preventDefault();
                    if (editDocunotificationRoleValidation) {
                        editDocunotificationRoleValidation.style.display = 'block';
                    }
                    // Scroll to the validation message if previous validations didn't fail
                    if (isValid) {
                        editDocunotificationRoles.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    isValid = false;
                }
            }

            return isValid;
        });
    }

    // Edit Add approver button
    if (editAddApproverBtn) {
        editAddApproverBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addEditApproverRow();
        });
    }

    // Search functionality with debounce
    let searchTimeout;
    if (userSearch) {
        userSearch.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            const filterValue = permissionFilter?.value || 'all';
            
            // Clear previous timeout
            clearTimeout(searchTimeout);
            
            // Debounce search - wait 300ms after user stops typing
            searchTimeout = setTimeout(() => {
                performUserSearch(searchTerm, filterValue, 1);
            }, 300);
        });
    }

    // Permission filter
    if (permissionFilter) {
        permissionFilter.addEventListener('change', function() {
            const filterValue = this.value;
            const searchTerm = userSearch?.value.trim() || '';
            performUserSearch(searchTerm, filterValue, 1);
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
        if (!container) return;

        if (checkbox.checked) {
            // Open with CSS transition by adding visible class
            // Ensure element is displayed so transitions can run
            container.style.display = 'block';
            // Force reflow so the browser registers the initial max-height (0) before we add the class
            // eslint-disable-next-line no-unused-expressions
            void container.offsetHeight;
            container.classList.add('visible');
        } else {
            // Close with CSS transition by removing visible class
            container.classList.remove('visible');

            // After transition ends, ensure the element is hidden from layout if desired
            // (optional) we can set display to none after the transition completes
            container.addEventListener('transitionend', function onTransitionEnd(e) {
                if (e.propertyName === 'max-height') {
                    container.style.display = 'none';
                }
            }, { once: true });
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

            // DCF
            if (userData.dcf_user && editDcfUser) {
                editDcfUser.checked = true;
                toggleSubpermissions(editDcfUser, editDcfRoles);

                // Set DCF role
                const dcfRoleRadios = editDcfRoles.querySelectorAll('input[type="radio"]');
                dcfRoleRadios.forEach(radio => {
                    if (radio.value === 'requestor' && userData.dcf_requestor) {
                        radio.checked = true;
                    } else if (radio.value === 'approver' && userData.dcf_approver) {
                        radio.checked = true;
                    }
                });
            }

            // ECIS
            if (userData.ecis_user && editEcisUser) {
                editEcisUser.checked = true;
                toggleSubpermissions(editEcisUser, editEcisRoles);

                // Set ECIS role
                const ecisRoleRadios = editEcisRoles.querySelectorAll('input[type="radio"]');
                ecisRoleRadios.forEach(radio => {
                    if (radio.value === 'requestor' && userData.ecis_requestor) {
                        radio.checked = true;
                    } else if (radio.value === 'facilitator' && userData.ecis_facilitator) {
                        radio.checked = true;
                    }
                });
            }

            // Quality Control
            if (userData.quality_control_user && editQualityControlUser) {
                editQualityControlUser.checked = true;
                toggleSubpermissions(editQualityControlUser, editQualityControlRoles);

                // Set Quality Control role
                const qualityControlRoleRadios = editQualityControlRoles.querySelectorAll('input[type="radio"]');
                qualityControlRoleRadios.forEach(radio => {
                    if (radio.value === 'warehouse' && userData.quality_control_warehouse) {
                        radio.checked = true;
                    } else if (radio.value === 'engineering' && userData.quality_control_engineering) {
                        radio.checked = true;
                    } else if (radio.value === 'production' && userData.quality_control_production) {
                        radio.checked = true;
                    } else if (radio.value === 'qa' && userData.quality_control_qa) {
                        radio.checked = true;
                    }
                });
            }

            // Stock Declaration
            console.log('Stock Declaration Debug:', {
                stock_declaration_user: userData.stock_declaration_user,
                editStockDeclarationUser: editStockDeclarationUser,
                editStockDeclarationRoles: editStockDeclarationRoles,
                stock_declaration_production: userData.stock_declaration_production,
                stock_declaration_warehouse: userData.stock_declaration_warehouse,
                stock_declaration_purchasing: userData.stock_declaration_purchasing
            });
            
            if (userData.stock_declaration_user && editStockDeclarationUser) {
                console.log('Setting Stock Declaration checkbox to checked');
                editStockDeclarationUser.checked = true;
                
                // Explicitly show the subpermissions
                if (editStockDeclarationRoles) {
                    console.log('Showing Stock Declaration subpermissions');
                    editStockDeclarationRoles.style.display = 'block';
                    // Force reflow
                    void editStockDeclarationRoles.offsetHeight;
                    editStockDeclarationRoles.classList.add('visible');
                }

                // Set Stock Declaration role
                if (editStockDeclarationRoles) {
                    const stockDeclarationRoleRadios = editStockDeclarationRoles.querySelectorAll('input[type="radio"]');
                    console.log('Found radio buttons:', stockDeclarationRoleRadios.length);
                    stockDeclarationRoleRadios.forEach(radio => {
                        if (radio.value === 'production' && userData.stock_declaration_production) {
                            radio.checked = true;
                            console.log('Checked production radio');
                        } else if (radio.value === 'warehouse' && userData.stock_declaration_warehouse) {
                            radio.checked = true;
                            console.log('Checked warehouse radio');
                        } else if (radio.value === 'purchasing' && userData.stock_declaration_purchasing) {
                            radio.checked = true;
                            console.log('Checked purchasing radio');
                        }
                    });
                }
            } else {
                console.log('Stock Declaration NOT set because:', 
                    !userData.stock_declaration_user ? 'userData.stock_declaration_user is false/undefined' : 'editStockDeclarationUser element not found');
            }

            // Document Notification
            if (userData.docunotification_user && editDocunotificationUser) {
                editDocunotificationUser.checked = true;
                toggleSubpermissions(editDocunotificationUser, editDocunotificationRoles);

                // Set Document Notification role
                const docunotificationRoleRadios = editDocunotificationRoles.querySelectorAll('input[type="radio"]');
                docunotificationRoleRadios.forEach(radio => {
                    if (radio.value === 'user' && userData.docunotification_requestor) {
                        radio.checked = true;
                    } else if (radio.value === 'admin' && userData.docunotification_admin) {
                        radio.checked = true;
                    }
                });
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
        if (dcfRoles) {
            dcfRoles.style.display = 'none';
            if (dcfRoleValidation) dcfRoleValidation.style.display = 'none';
        }
        if (ecisRoles) {
            ecisRoles.style.display = 'none';
            if (ecisRoleValidation) ecisRoleValidation.style.display = 'none';
        }
        if (docunotificationRoles) {
            docunotificationRoles.style.display = 'none';
            if (docunotificationRoleValidation) docunotificationRoleValidation.style.display = 'none';
        }
        if (qualityControlRoles) {
            qualityControlRoles.style.display = 'none';
        }
        if (stockDeclarationRoles) {
            stockDeclarationRoles.style.display = 'none';
        }

        // Reset avatar
        currentAvatarIndex = 0;
        selectAvatar(currentAvatarIndex);

        // Reset approvers - allow zero approvers (clear all rows)
        if (approversList) {
            while (approversList.firstChild) {
                approversList.removeChild(approversList.firstChild);
            }
            // Add a default empty approver row so the user sees the dropdown immediately
            addApproverRow(null, 0);
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
        if (editDcfRoles) {
            editDcfRoles.style.display = 'none';
            if (editDcfRoleValidation) editDcfRoleValidation.style.display = 'none';
        }
        if (editEcisRoles) {
            editEcisRoles.style.display = 'none';
            if (editEcisRoleValidation) editEcisRoleValidation.style.display = 'none';
        }
        if (editQualityControlRoles) {
            editQualityControlRoles.style.display = 'none';
        }
        if (editStockDeclarationRoles) {
            editStockDeclarationRoles.style.display = 'none';
        }
        if (editDocunotificationRoles) {
            editDocunotificationRoles.style.display = 'none';
            if (editDocunotificationRoleValidation) editDocunotificationRoleValidation.style.display = 'none';
        }

        // Reset avatar
        editCurrentAvatarIndex = 0;
        selectEditAvatar(editCurrentAvatarIndex);

        // Reset approvers - clear all existing rows (allow zero approvers)
        if (editApproversList) {
            while (editApproversList.firstChild) {
                editApproversList.removeChild(editApproversList.firstChild);
            }
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
                <select name="approver_module[]" id="approver-module-${index}" class="UM-select">
                    <option value="">Select Module</option>
                    <option value="Job Order" ${approverData && approverData.module === 'Job Order' ? 'selected' : ''}>Job Order</option>
                    <option value="Manhours" ${approverData && approverData.module === 'Manhours' ? 'selected' : ''}>Manhours</option>
                    <option value="Monitoring" ${approverData && approverData.module === 'Monitoring' ? 'selected' : ''}>Monitoring</option>
                </select>
            </div>

            <div class="UM-form-group">
                <select name="approver_role[]" id="approver-role-${index}" class="UM-select">
                    <option value="">Select Role</option>
                    <option value="Requestor" ${approverData && approverData.approver_role === 'Requestor' ? 'selected' : ''}>Requestor</option>
                    <option value="Checker" ${approverData && approverData.approver_role === 'Checker' ? 'selected' : ''}>Checker</option>
                    <option value="Approver" ${approverData && approverData.approver_role === 'Approver' ? 'selected' : ''}>Approver</option>
                </select>
            </div>

            <div class="UM-form-group approver-user-group">
                <select name="approver_user[]" id="approver-user-${index}" class="UM-select">
                    <option value="">Select Approver</option>
                </select>
            </div>

            <div class="UM-approver-actions">
                <button type="button" class="btn btn-icon btn-error UM-remove-approver-btn">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        // Add to container
        approversList.appendChild(newRow);

        // Clone select options from the first approver row or from the hidden template
        let firstApproverSelect = document.querySelector('#approver-user-0');
        if (!firstApproverSelect || firstApproverSelect.options.length <= 1) {
            firstApproverSelect = document.getElementById('approver-user-template');
        }
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

        // Enable remove button on all rows
        approversList.querySelectorAll('.UM-remove-approver-btn').forEach(btn => {
            btn.disabled = false;
        });

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
                <select name="approver_module[]" id="edit-approver-module-${index}" class="UM-select">
                    <option value="">Select Module</option>
                    <option value="Job Order" ${approverData && approverData.module === 'Job Order' ? 'selected' : ''}>Job Order</option>
                    <option value="Manhours" ${approverData && approverData.module === 'Manhours' ? 'selected' : ''}>Manhours</option>
                    <option value="Monitoring" ${approverData && approverData.module === 'Monitoring' ? 'selected' : ''}>Monitoring</option>
                </select>
            </div>

            <div class="UM-form-group">
                <label for="edit-approver-role-${index}">Role</label>
                <select name="approver_role[]" id="edit-approver-role-${index}" class="UM-select">
                    <option value="">Select Role</option>
                    <option value="Requestor" ${approverData && approverData.approver_role === 'Requestor' ? 'selected' : ''}>Requestor</option>
                    <option value="Checker" ${approverData && approverData.approver_role === 'Checker' ? 'selected' : ''}>Checker</option>
                    <option value="Approver" ${approverData && approverData.approver_role === 'Approver' ? 'selected' : ''}>Approver</option>
                </select>
            </div>

            <div class="UM-form-group approver-user-group">
                <label for="edit-approver-user-${index}">Approver</label>
                <select name="approver_user[]" id="edit-approver-user-${index}" class="UM-select">
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

        // Clone select options from the first approver row in the add form or from template
        let firstApproverSelect = document.querySelector('#approver-user-0');
        if (!firstApproverSelect || firstApproverSelect.options.length <= 1) {
            firstApproverSelect = document.getElementById('approver-user-template');
        }
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

        // Enable remove button on all rows
        editApproversList.querySelectorAll('.UM-remove-approver-btn').forEach(btn => {
            btn.disabled = false;
        });

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
    // Perform AJAX search across all user records
    function performUserSearch(searchTerm, permissionFilter, page = 1) {
        const tableBody = document.querySelector('#trial-run-tbody');
        const paginationInfo = document.querySelector('.JO-pagination-info');
        const paginationControls = document.querySelector('.JO-pagination-controls');
        
        if (!tableBody) return;
        
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #4CAF50;"></i>
                    <p style="margin-top: 10px; color: #666;">Searching...</p>
                </td>
            </tr>
        `;
        
        // Build query params
        const params = new URLSearchParams({
            q: searchTerm,
            filter: permissionFilter,
            page: page
        });
        
        // Fetch search results
        fetch(`/settings/search-users/?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Clear table
                    tableBody.innerHTML = '';
                    
                    if (data.users.length === 0) {
                        // Show empty state
                        const emptyRow = document.createElement('tr');
                        emptyRow.innerHTML = `
                            <td colspan="8" class="JO-empty-table">
                                <div class="empty-state">
                                    <i class="fa fa-search" aria-hidden="true"></i>
                                    <h4>No Users Found</h4>
                                    <p>${searchTerm ? 'No users match your search criteria' : 'No users found with the selected filter'}</p>
                                </div>
                            </td>
                        `;
                        tableBody.appendChild(emptyRow);
                        
                        // Hide pagination
                        if (paginationControls) paginationControls.style.display = 'none';
                        if (paginationInfo) paginationInfo.textContent = 'Showing 0 to 0 of 0 entries';
                    } else {
                        // Render user rows
                        data.users.forEach(user => {
                            const row = createUserRow(user);
                            tableBody.appendChild(row);
                        });
                        
                        // Update pagination info
                        if (paginationInfo) {
                            paginationInfo.textContent = `Showing ${data.pagination.start_index} to ${data.pagination.end_index} of ${data.pagination.total_count} entries`;
                        }
                        
                        // Update pagination controls
                        if (paginationControls && data.pagination.total_pages > 1) {
                            updatePaginationControls(data.pagination, searchTerm, permissionFilter);
                            paginationControls.style.display = 'block';
                        } else if (paginationControls) {
                            paginationControls.style.display = 'none';
                        }
                    }
                } else {
                    console.error('Search failed:', data.message);
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="8" class="JO-empty-table">
                                <div class="empty-state">
                                    <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
                                    <h4>Error</h4>
                                    <p>Failed to search users. Please try again.</p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="JO-empty-table">
                            <div class="empty-state">
                                <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
                                <h4>Error</h4>
                                <p>An error occurred while searching. Please try again.</p>
                            </div>
                        </td>
                    </tr>
                `;
            });
    }
    
    // Create a user table row from data
    function createUserRow(user) {
        const row = document.createElement('tr');
        
        // Build permissions HTML
        let permissionsHtml = '<div class="UM-permission-pills">';
        user.permissions.forEach(perm => {
            permissionsHtml += `<span class="UM-permission-pill UM-${perm.type}-pill">${perm.label}</span>`;
        });
        permissionsHtml += '</div>';
        
        // Build status HTML
        const statusClass = user.is_active ? 'UM-status-active' : 'UM-status-inactive';
        const statusText = user.is_active ? 'Active' : 'Inactive';
        const toggleIcon = user.is_active ? 'fa-user-slash' : 'fa-user-check';
        const toggleTitle = user.is_active ? 'Deactivate' : 'Activate';
        
        row.innerHTML = `
            <td data-label="Avatar">
                <img src="${user.avatar_url}" alt="${user.name}" class="UM-user-avatar">
            </td>
            <td data-label="ID">${user.id_number}</td>
            <td data-label="Name">${user.name}</td>
            <td data-label="Position">${user.position}</td>
            <td data-label="Line">${user.line_name}</td>
            <td data-label="Permissions">${permissionsHtml}</td>
            <td class="text-center" data-label="Status">
                <span class="UM-status ${statusClass}">${statusText}</span>
            </td>
            <td data-label="Actions">
                <div class="UM-action-buttons">
                    <button class="UM-icon-button UM-edit-user" data-id="${user.id}" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="UM-icon-button UM-delete-user" data-id="${user.id}" title="Delete User">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <form method="post" action="/settings/toggle-status/${user.id}/" class="UM-inline-form">
                        <input type="hidden" name="csrfmiddlewaretoken" value="${getCSRFToken()}">
                        <button type="submit" class="UM-icon-button UM-toggle-status" title="${toggleTitle}">
                            <i class="fas ${toggleIcon}"></i>
                        </button>
                    </form>
                </div>
            </td>
        `;
        
        return row;
    }
    
    // Update pagination controls with search parameters
    function updatePaginationControls(pagination, searchTerm, permissionFilter) {
        const navContainer = document.querySelector('.JO-pagination-nav-container');
        if (!navContainer) return;
        
        let html = '';
        
        // Previous button
        if (pagination.has_previous) {
            html += `<a href="#" class="JO-pagination-btn" data-page="${pagination.previous_page}">
                <i class="fas fa-chevron-left"></i> Previous
            </a>`;
        } else {
            html += `<span class="JO-pagination-btn disabled">
                <i class="fas fa-chevron-left"></i> Previous
            </span>`;
        }
        
        // Page numbers
        html += '<div class="JO-pagination-pages">';
        for (let i = 1; i <= pagination.total_pages; i++) {
            if (i === pagination.current_page) {
                html += `<span class="JO-pagination-page active">${i}</span>`;
            } else if (i > pagination.current_page - 3 && i < pagination.current_page + 3) {
                html += `<a href="#" class="JO-pagination-page" data-page="${i}">${i}</a>`;
            }
        }
        html += '</div>';
        
        // Next button
        if (pagination.has_next) {
            html += `<a href="#" class="JO-pagination-btn" data-page="${pagination.next_page}">
                Next <i class="fas fa-chevron-right"></i>
            </a>`;
        } else {
            html += `<span class="JO-pagination-btn disabled">
                Next <i class="fas fa-chevron-right"></i>
            </span>`;
        }
        
        navContainer.innerHTML = html;
        
        // Add click handlers to pagination links
        navContainer.querySelectorAll('a[data-page]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                performUserSearch(searchTerm, permissionFilter, page);
            });
        });
    }
    
    // Get CSRF token
    function getCSRFToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        return token ? token.value : '';
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

        // Set up navigation buttons
        if (avatarPrev) {
            avatarPrev.addEventListener('click', function(e) {
                e.preventDefault();
                navigateAvatars('prev');
            });
        }

        if (avatarNext) {
            avatarNext.addEventListener('click', function(e) {
                e.preventDefault();
                navigateAvatars('next');
            });
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

    // Navigate through avatar carousel - Add form
    function navigateAvatars(direction) {
        const avatarOptions = document.querySelectorAll('#add-user-modal .UM-avatar-option');
        if (!avatarOptions || avatarOptions.length === 0) return;

        const count = avatarOptions.length;

        if (direction === 'prev') {
            currentAvatarIndex = (currentAvatarIndex - 1 + count) % count;
        } else {
            currentAvatarIndex = (currentAvatarIndex + 1) % count;
        }

        selectAvatar(currentAvatarIndex);

        // Add micro-animation to the button
        const button = direction === 'prev' ? document.getElementById('avatar-prev') : document.getElementById('avatar-next');
        if (button) {
            button.style.transform = 'translateY(-50%) scale(1.2)';
            setTimeout(() => {
                button.style.transform = 'translateY(-50%) scale(1)';
            }, 200);
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