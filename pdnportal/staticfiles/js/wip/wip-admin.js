document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentImportTarget = null;
    let currentEditItem = null;
    let currentDeleteItem = null;
    let allMaterials = [];
    let allProducts = [];
    
    // Initialize the admin page
    initializeAdminPage();
    
    function initializeAdminPage() {
        console.log('Initializing admin page...');
        setupEventListeners();
        loadInitialData();
        setupSearch();
        setupPagination();
        setupTabs();
        setupScrollTracking();
        restoreTabAndScrollPosition();
    }
    
    // Tab and Scroll Position Management
    function saveTabAndScrollPosition() {
        const activeTab = document.querySelector('.WIP-tab-btn.active')?.getAttribute('data-tab');
        const scrollPosition = window.scrollY;
        
        console.log('Saving state - Active tab:', activeTab, 'Scroll position:', scrollPosition);
        
        if (activeTab) {
            sessionStorage.setItem('wip_admin_active_tab', activeTab);
        }
        sessionStorage.setItem('wip_admin_scroll_position', scrollPosition.toString());
    }
    
    function setupScrollTracking() {
        let scrollTimeout;
        
        // Disable browser's default scroll restoration to prevent conflicts
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        
        // Save scroll position continuously as user scrolls
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollPosition = window.scrollY;
                const pageHeight = document.documentElement.scrollHeight;
                const viewportHeight = window.innerHeight;
                
                sessionStorage.setItem('wip_admin_scroll_position', scrollPosition.toString());
                console.log('Scroll position updated:', scrollPosition, 'Page height:', pageHeight, 'Viewport:', viewportHeight);
            }, 100); // Debounce scroll events
        });
        
        // Also save on page unload to capture final position
        window.addEventListener('beforeunload', function() {
            const finalScrollPosition = window.scrollY;
            sessionStorage.setItem('wip_admin_scroll_position', finalScrollPosition.toString());
            console.log('Final scroll position saved on unload:', finalScrollPosition);
        });
    }
    
    function restoreTabAndScrollPosition() {
        const savedTab = sessionStorage.getItem('wip_admin_active_tab');
        const savedScrollPosition = sessionStorage.getItem('wip_admin_scroll_position');
        console.log('Restoring state - Saved tab:', savedTab, 'Saved scroll position:', savedScrollPosition);
        // Remove .active from all tabs and contents, and reset aria-selected
        document.querySelectorAll('.WIP-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.WIP-tab-content').forEach(content => content.classList.remove('active'));
        // Restore active tab
        if (savedTab) {
            const tabButton = document.querySelector(`.WIP-tab-btn[data-tab="${savedTab}"]`);
            if (tabButton) {
                tabButton.classList.add('active');
                tabButton.setAttribute('aria-selected', 'true');
                const targetContent = document.getElementById(`${savedTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    console.log('Successfully restored tab:', savedTab);
                }
            }
        } else {
            // If no saved tab, activate the first tab by default
            const firstTab = document.querySelector('.WIP-tab-btn');
            const firstContent = document.querySelector('.WIP-tab-content');
            if (firstTab) {
                firstTab.classList.add('active');
                firstTab.setAttribute('aria-selected', 'true');
            }
            if (firstContent) firstContent.classList.add('active');
        }
        // Restore scroll position with better timing and checks
        if (savedScrollPosition && parseInt(savedScrollPosition) > 10) {
            console.log('Attempting to restore scroll position:', savedScrollPosition);
            const attemptScrollRestoration = () => {
                const currentScroll = window.scrollY;
                console.log('Current scroll position:', currentScroll, 'Target:', savedScrollPosition);
                window.scrollTo(0, parseInt(savedScrollPosition));
                setTimeout(() => {
                    const newScroll = window.scrollY;
                    console.log('Scroll restoration result - Expected:', savedScrollPosition, 'Actual:', newScroll);
                    if (Math.abs(newScroll - parseInt(savedScrollPosition)) > 50) {
                        console.log('Scroll restoration may have failed, trying alternative method...');
                        const tempElement = document.createElement('div');
                        tempElement.style.position = 'absolute';
                        tempElement.style.top = savedScrollPosition + 'px';
                        tempElement.style.height = '1px';
                        tempElement.style.visibility = 'hidden';
                        document.body.appendChild(tempElement);
                        tempElement.scrollIntoView({ behavior: 'instant', block: 'start' });
                        setTimeout(() => {
                            document.body.removeChild(tempElement);
                        }, 100);
                    }
                }, 100);
            };
            if (document.readyState === 'complete') {
                setTimeout(attemptScrollRestoration, 100);
            } else {
                window.addEventListener('load', () => {
                    setTimeout(attemptScrollRestoration, 100);
                });
            }
            setTimeout(attemptScrollRestoration, 500);
            setTimeout(attemptScrollRestoration, 1000);
            setTimeout(attemptScrollRestoration, 2000);
        } else if (savedScrollPosition) {
            console.log('Skipping scroll restoration - position is at or near top:', savedScrollPosition);
        }
        // Clear saved state after restoration (increase timeout to 5 seconds)
        setTimeout(() => {
            sessionStorage.removeItem('wip_admin_active_tab');
            sessionStorage.removeItem('wip_admin_scroll_position');
            console.log('Cleared saved state from session storage');
        }, 5000); // Wait 5 seconds to ensure scroll restoration is complete
    }
    
    function reloadWithStatePreservation() {
        console.log('Reloading with state preservation...');
        // Save current scroll position immediately before reload
        const currentScrollPosition = window.scrollY;
        sessionStorage.setItem('wip_admin_scroll_position', currentScrollPosition.toString());
        console.log('Saving current scroll position before reload:', currentScrollPosition);
        
        // Save active tab
        const activeTab = document.querySelector('.WIP-tab-btn.active')?.getAttribute('data-tab');
        if (activeTab) {
            sessionStorage.setItem('wip_admin_active_tab', activeTab);
        }
        window.location.reload();
    }
    
    function setupTabs() {
        const tabBtns = document.querySelectorAll('.WIP-tab-btn');
        const tabContents = document.querySelectorAll('.WIP-tab-content');
    
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
    
                // Deactivate all tabs and hide all content
                tabBtns.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tabContents.forEach(c => c.classList.remove('active'));
    
                // Activate the clicked tab and show its content
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');

                const contentToShow = document.getElementById(`${tabId}-tab`);
                if (contentToShow) {
                    contentToShow.classList.add('active');
                }
            });
        });
    }
    
    function setupEventListeners() {
        console.log('setupEventListeners: Setting up all event listeners.');
        
        // Export inventory data button
        const exportBtn = document.getElementById('export-inventory-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                openUnifiedModal('export');
            });
        }
        
        // Import/Export buttons
        document.querySelectorAll('.WIP-import-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const target = this.getAttribute('data-target');
                openUnifiedModal('import', target);
            });
        });
        
        // Add item buttons
        const addMaterialBtn = document.getElementById('add-material-btn');
        if (addMaterialBtn) {
            addMaterialBtn.addEventListener('click', function() {
                openModal('add-material-modal');
            });
        }
        
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', function() {
                openModal('add-product-modal');
                setupMaterialInputsForProductModal();
            });
        }
        
        const addProcessBtn = document.getElementById('add-process-btn');
        if (addProcessBtn) {
            addProcessBtn.addEventListener('click', function() {
                openModal('add-process-modal');
            });
        }
        
        // Form submissions
        const addMaterialForm = document.getElementById('add-material-form');
        if (addMaterialForm) {
            addMaterialForm.addEventListener('submit', handleAddMaterial);
        }
        
        const addProductForm = document.getElementById('add-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', handleAddProduct);
        }
        
        const addProcessForm = document.getElementById('add-process-form');
        if (addProcessForm) {
            addProcessForm.addEventListener('submit', handleAddProcess);
        }
        
        // Edit and delete buttons
        document.querySelectorAll('.WIP-edit-item-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                const id = this.getAttribute('data-id');
                openEditModal(type, id);
            });
        });
        
        document.querySelectorAll('.WIP-delete-item-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                const id = this.getAttribute('data-id');
                const name = this.getAttribute('data-name');
                openDeleteModal(type, id, name);
            });
        });
        
        // Search functionality
        setupSearch();
        
        // Pagination
        setupPagination();
        
        // Modal close buttons
        document.querySelectorAll('.JO-modal-close, .close-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                closeAllModals();
            });
        });
        
        // Modal backdrop clicks
        document.querySelectorAll('.JO-modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeAllModals();
                }
            });
        });
        
        // Export confirmation button
        const confirmExportBtn = document.getElementById('confirm-export-btn');
        if (confirmExportBtn) {
            confirmExportBtn.addEventListener('click', function() {
                checkUnverifiedSessionsBeforeExport();
            });
        }
        
        // Proceed export button (in unverified sessions modal)
        const proceedExportBtn = document.getElementById('proceed-export-btn');
        if (proceedExportBtn) {
            proceedExportBtn.addEventListener('click', function() {
                exportInventoryData();
            });
        }
        
        // Download template button
        const downloadTemplateBtn = document.getElementById('download-import-template-btn');
        if (downloadTemplateBtn) {
            downloadTemplateBtn.addEventListener('click', function() {
                const target = currentImportTarget;
                if (target === 'masterlist') {
                    exportMasterlistTemplate();
                } else if (target === 'products') {
                    exportProductsTemplate();
                }
            });
        }
        
        // Import confirmation button
        const importConfirmBtn = document.getElementById('import-products-confirm-btn');
        if (importConfirmBtn) {
            importConfirmBtn.addEventListener('click', function() {
                handleFileUpload();
            });
        }
        
        // Delete confirmation button
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', function() {
                handleDeleteItem();
            });
        }
        
        // Edit form submission
        const editItemForm = document.getElementById('edit-item-form');
        if (editItemForm) {
            editItemForm.addEventListener('submit', handleEditItem);
        }
        
        // Setup date input validation clearing
        setupDateInputValidation();
    }
    
    function setupDateInputValidation() {
        const startDateInput = document.getElementById('export-start-date');
        const endDateInput = document.getElementById('export-end-date');
        
        if (startDateInput) {
            startDateInput.addEventListener('input', hideDateValidationError);
            startDateInput.addEventListener('change', hideDateValidationError);
        }
        
        if (endDateInput) {
            endDateInput.addEventListener('input', hideDateValidationError);
            endDateInput.addEventListener('change', hideDateValidationError);
        }
    }
    
    async function loadInitialData() {
        console.log('loadInitialData: Loading all initial table data.');
        loadMaterials();
        loadProducts();
        loadProcesses();
    }
    
    async function loadMaterials(page = 1) {
        console.log(`loadMaterials: Loading materials for page ${page}.`);
        try {
            const response = await fetch(`/wip-inventory/admin/api/materials/?page=${page}`);
            const data = await response.json();
            
            if (data.success) {
                updateTableContent('materials', data.materials);
                updatePagination('materials', data);
            } else {
                console.error('Failed to load materials:', data.message);
            }
        } catch (error) {
            console.error('Error loading materials:', error);
        }
    }
    
    async function loadProducts(page = 1) {
        console.log(`loadProducts: Loading products for page ${page}.`);
        try {
            const response = await fetch(`/wip-inventory/admin/api/products/?page=${page}`);
            const data = await response.json();
            
            if (data.success) {
                updateTableContent('products', data.products);
                updatePagination('products', data);
            } else {
                console.error('Failed to load products:', data.message);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }
    
    async function loadProcesses(page = 1) {
        console.log(`loadProcesses: Loading processes for page ${page}.`);
        try {
            const response = await fetch(`/wip-inventory/admin/api/processes/?page=${page}`);
            const data = await response.json();
            
            if (data.success) {
                updateTableContent('processes', data.processes);
                updatePagination('processes', data);
            } else {
                console.error('Failed to load processes:', data.message);
            }
        } catch (error) {
            console.error('Error loading processes:', error);
        }
    }
    
    // Export Functions
    async function exportMasterlistTemplate() {
        console.log('Export Masterlist Template clicked.');
        showLoadingOverlay('Generating template...');
        try {
            const response = await fetch('/wip-inventory/admin/export/masterlist-template/');
            if (response.ok) {
                const blob = await response.blob();
                downloadFile(blob, 'masterlist_template.xlsx');
                showToast('Template downloaded successfully!', 'success');
                console.log('Masterlist template downloaded.');
            } else {
                showToast('Error generating template', 'error');
                console.error('Failed to generate masterlist template:', response.statusText);
            }
        } catch (error) {
            showToast('Error downloading template', 'error');
            console.error('Error in exportMasterlistTemplate:', error);
        } finally {
            hideLoadingOverlay();
        }
    }
    
    async function exportProductsTemplate() {
        console.log('Export Products Template clicked.');
        showLoadingOverlay('Generating template...');
        try {
            const response = await fetch('/wip-inventory/admin/export/products-template/');
            if (response.ok) {
                const blob = await response.blob();
                downloadFile(blob, 'products_template.xlsx');
                showToast('Template downloaded successfully!', 'success');
                console.log('Products template downloaded.');
            } else {
                showToast('Error generating template', 'error');
                console.error('Failed to generate products template:', response.statusText);
            }
        } catch (error) {
            showToast('Error downloading template', 'error');
            console.error('Error in exportProductsTemplate:', error);
        } finally {
            hideLoadingOverlay();
        }
    }
    
    async function checkUnverifiedSessionsBeforeExport() {
        console.log('Checking for unverified sessions before export...');
        
        // Validate date inputs
        const startDate = document.getElementById('export-start-date').value;
        const endDate = document.getElementById('export-end-date').value;
        
        if (!startDate || !endDate) {
            showDateValidationError('Start and end date are required.');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showDateValidationError('Start date cannot be after end date.');
            return;
        }
        
        // Clear any previous validation errors
        hideDateValidationError();
        
        showLoadingOverlay('Checking sessions...');
        
        try {
            const response = await fetch(`/wip-inventory/admin/api/check-unverified-sessions/?start_date=${startDate}&end_date=${endDate}`);
            const data = await response.json();
            
            if (data.success) {
                if (data.has_unverified_sessions) {
                    // Show confirmation modal with unverified sessions
                    showUnverifiedSessionsModal(data.unverified_sessions);
                } else {
                    // No unverified sessions, proceed directly with export
                    if (data.message) {
                        showToast(data.message, 'info');
                    }
                    exportInventoryData();
                }
            } else {
                showToast(data.message || 'Error checking sessions', 'error');
            }
        } catch (error) {
            console.error('Error checking unverified sessions:', error);
            showToast('Error checking sessions. Please try again.', 'error');
        } finally {
            hideLoadingOverlay();
        }
    }

    function showDateValidationError(message) {
        const validationDiv = document.getElementById('date-validation-message');
        const validationText = document.getElementById('validation-text');
        
        if (validationDiv && validationText) {
            validationText.textContent = message;
            validationDiv.style.display = 'block';
            
            // Show toast message as well
            showToast(message, 'error');
        }
    }
    
    function hideDateValidationError() {
        const validationDiv = document.getElementById('date-validation-message');
        if (validationDiv) {
            validationDiv.style.display = 'none';
        }
    }

    function showUnverifiedSessionsModal(sessions) {
        console.log('Showing unverified sessions modal with', sessions.length, 'sessions');
        
        const sessionsList = document.getElementById('unverified-sessions-list');
        sessionsList.innerHTML = '';
        
        sessions.forEach(session => {
            const sessionItem = document.createElement('div');
            sessionItem.className = 'WIP-unverified-session-item';
            sessionItem.innerHTML = `
                <div class="WIP-session-info">
                    <div class="WIP-session-line">${session.line_name} - ${session.person_responsible}</div>
                    <div class="WIP-session-details">Created by: ${session.created_by} • ${session.entry_count} entries</div>
                    <div class="WIP-session-date">Created: ${session.created_at}</div>
                </div>
                <div class="WIP-session-status">For Checking</div>
            `;
            sessionsList.appendChild(sessionItem);
        });
        
        openModal('unverified-sessions-modal');
    }

    async function exportInventoryData() {
        console.log('Export Inventory Data clicked.');
        
        // Get date values
        const startDate = document.getElementById('export-start-date').value;
        const endDate = document.getElementById('export-end-date').value;
        
        // Validate dates again (in case called directly)
        if (!startDate || !endDate) {
            showDateValidationError('Start and end date are required.');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showDateValidationError('Start date cannot be after end date.');
            return;
        }
        
        showLoadingOverlay('Exporting inventory data...');
        try {
            const response = await fetch(`/wip-inventory/admin/export/inventory-data/?start_date=${startDate}&end_date=${endDate}`);
            if (response.ok) {
                const blob = await response.blob();
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                downloadFile(blob, `wip_inventory_data_${timestamp}.xlsx`);
                showToast('Inventory data exported successfully!', 'success');
                closeAllModals();
                console.log('Inventory data exported.');
            } else {
                // Handle specific error responses
                if (response.status === 404) {
                    const errorData = await response.json();
                    showToast(errorData.message || 'No sessions found in the selected date range.', 'warning');
                } else {
                    showToast('Error exporting data', 'error');
                }
                console.error('Failed to export inventory data:', response.statusText);
            }
        } catch (error) {
            showToast('Error exporting data', 'error');
            console.error('Error in exportInventoryData:', error);
        } finally {
            hideLoadingOverlay();
        }
    }
    
    function downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log(`File downloaded: ${filename}`);
    }
    
    // Import/Export Modal Functions
    function openUnifiedModal(type, target = null) {
        console.log(`openUnifiedModal: type=${type}, target=${target}`);
        const modal = document.getElementById('import-modal');
        const importContent = document.getElementById('import-content-section');
        const exportContent = document.getElementById('export-content-section');
        const modalTitle = document.getElementById('import-modal-title');
        const importConfirmBtn = document.getElementById('import-products-confirm-btn');
        const exportConfirmBtn = document.getElementById('confirm-export-btn');
        const downloadTemplateBtn = document.getElementById('download-import-template-btn');

        if (!modal || !importContent || !exportContent || !modalTitle || !importConfirmBtn || !exportConfirmBtn || !downloadTemplateBtn) {
            console.error('One or more unified modal elements not found!', {modal, importContent, exportContent, modalTitle, importConfirmBtn, exportConfirmBtn, downloadTemplateBtn});
            return;
        }

        if (type === 'import') {
            importContent.style.display = 'block';
            exportContent.style.display = 'none';
            importConfirmBtn.style.display = 'block'; // Show import button
            exportConfirmBtn.style.display = 'none'; // Hide export button
            modalTitle.textContent = `Import ${target.charAt(0).toUpperCase() + target.slice(1)}`;
            currentImportTarget = target; // Set the global target for handleFileUpload and template download

            // Specific logic for Download Template button visibility/action based on target
            if (target === 'masterlist') {
                downloadTemplateBtn.style.display = 'block';
            } else if (target === 'products') {
                downloadTemplateBtn.style.display = 'block';
            } else {
                downloadTemplateBtn.style.display = 'none';
            }
            clearFileSelection(); // Clear previous file selection on import view
            setupDragAndDrop(); // <-- Attach drag-and-drop listeners now, when modal is open
        } else if (type === 'export') {
            importContent.style.display = 'none';
            exportContent.style.display = 'block';
            importConfirmBtn.style.display = 'none'; // Hide import button for export view
            exportConfirmBtn.style.display = 'block'; // Show export button
            modalTitle.textContent = 'Export Inventory Data';
            downloadTemplateBtn.style.display = 'none'; // Hide this specific button in general export view
            
            // Clear date inputs and validation errors for export modal
            const startDateInput = document.getElementById('export-start-date');
            const endDateInput = document.getElementById('export-end-date');
            if (startDateInput) startDateInput.value = '';
            if (endDateInput) endDateInput.value = '';
            hideDateValidationError();
        }

        openModal('import-modal'); // Use the generic openModal function
    }
    
    function setupDragAndDrop() {
        console.log('setupDragAndDrop: Initializing drag and drop for import modal.');
        const dropzone = document.getElementById('product-file-drop-area');
        const fileInput = document.getElementById('file-input');
        
        if (dropzone) {
            console.log('setupDragAndDrop: Dropzone element (product-file-drop-area) found.', dropzone);

            dropzone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('dragover');
                console.log('Dragover event on dropzone fired.');
            });
            
            dropzone.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                console.log('Dragleave event on dropzone fired.');
            });
            
            dropzone.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    console.log('Drop event on dropzone fired. Files detected:', files[0].name);
                    handleFileSelection(files[0]);
                } else {
                    console.log('Drop event on dropzone fired, but no files detected.');
                }
            });
            
            dropzone.addEventListener('click', () => {
                if (fileInput) {
                    fileInput.click();
                    console.log('Click event on dropzone fired. Attempting to click file input.');
                } else {
                    console.error('Click event on dropzone fired, but file input element (file-input) not found.');
                }
            });
        } else {
            console.error('Error: Dropzone element with ID \'product-file-drop-area\' not found. Drag and drop will not work.');
        }

        if (fileInput) {
            console.log('setupDragAndDrop: File input element (file-input) found.', fileInput);
            fileInput.addEventListener('change', function() {
                if (this.files.length > 0) {
                    console.log('Change event on file input fired. File selected via input:', this.files[0].name);
                    handleFileSelection(this.files[0]);
                } else {
                    console.log('Change event on file input fired, but no file selected.');
                }
            });
        } else {
            console.error('Error: File input element with ID \'file-input\' not found.');
        }
    }
    
    function handleFileSelection(file) {
        console.log('handleFileSelection: Processing file:', file.name);
        const fileNameSpan = document.getElementById('file-name');
        const fileSizeSpan = document.getElementById('file-size');
        const fileInfoDiv = document.getElementById('file-info');
        const importConfirmBtn = document.getElementById('import-products-confirm-btn');

        if (file) {
            fileNameSpan.textContent = file.name;
            fileSizeSpan.textContent = `(${formatFileSize(file.size)})`;
            fileInfoDiv.style.display = 'flex';
            importConfirmBtn.disabled = false;
            console.log('File info displayed.');
        } else {
            clearFileSelection();
            console.log('No file selected, clearing selection.');
        }
    }
    
    function removeSelectedFile() {
        console.log('removeSelectedFile: Removing selected file.');
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        clearFileSelection();
    }
    
    function clearFileSelection() {
        console.log('clearFileSelection: Clearing file selection.');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        const fileInfo = document.getElementById('file-info');
        const confirmBtn = document.getElementById('import-products-confirm-btn');
        const fileInput = document.getElementById('file-input');
        if (fileName) fileName.textContent = '';
        if (fileSize) fileSize.textContent = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = true;
        if (fileInput) fileInput.value = '';
    }
    
    async function handleFileUpload() {
        console.log('handleFileUpload: Initiating file upload.');
        const fileInput = document.getElementById('file-input');
        const target = currentImportTarget;
        
        if (!fileInput.files.length || !target) {
            showToast('Please select a file to upload.', 'warning');
            console.warn('No file selected or import target not set.');
            return;
        }
        
        const file = fileInput.files[0];
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            showToast('Please select an Excel file (.xlsx or .xls)', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('target', target);

        showLoadingOverlay('Importing data...');
        
        try {
            // Use the correct endpoint for the selected import target
            const importUrl = `/wip-inventory/admin/import/${target}/`;
            const response = await fetch(importUrl, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                },
                body: formData,
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                const text = await response.text();
                console.error('File upload response not JSON:', text);
                showToast('Unexpected server response. Please contact support.', 'error');
                hideLoadingOverlay();
                clearFileSelection();
                return;
            }

            if (response.ok && data.success) {
                // Handle the new response format for products import
                if (target === 'products') {
                    let message = data.message;
                    
                    // Show specific toast for existing products
                    if (data.existing_products && data.existing_products.length > 0) {
                        const existingProductsList = data.existing_products.join(', ');
                        showToast(`Skipped existing products: ${existingProductsList}`, 'warning');
                    }
                    
                    // Show validation errors if any
                    if (data.validation_errors && data.validation_errors.length > 0) {
                        console.error('Validation errors:', data.validation_errors);
                        showToast(`Import completed with ${data.validation_errors.length} validation errors. Check console for details.`, 'warning');
                    }
                    
                    // Show processing errors if any
                    if (data.processing_errors && data.processing_errors.length > 0) {
                        console.error('Processing errors:', data.processing_errors);
                        showToast(`Import completed with ${data.processing_errors.length} processing errors. Check console for details.`, 'warning');
                    }
                    
                    // Show success message
                    if (data.products_imported > 0 || data.wip_materials_imported > 0) {
                        showToast(message, 'success');
                    } else if (data.existing_products && data.existing_products.length > 0) {
                        showToast('No new items imported. All entries were duplicates.', 'warning');
                    } else {
                        showToast(message, 'info');
                    }
                    
                    console.log('File upload successful:', data.message);
                    
                    // Show duplicates modal if there are existing products
                    if (data.existing_products && data.existing_products.length > 0) {
                        try {
                            showDuplicatesModal(data.existing_products, data.products_imported + data.wip_materials_imported, target);
                        } catch (dupModalError) {
                            console.error('Error showing duplicates modal:', dupModalError);
                            showToast('Error displaying duplicate information.', 'error');
                        }
                    } else {
                        try {
                            closeAllModals();
                            // Reload with state preservation after successful import
                            saveTabAndScrollPosition();
                            setTimeout(() => {
                                reloadWithStatePreservation();
                            }, 1000);
                        } catch (closeModalError) {
                            console.error('Error closing modals after successful upload:', closeModalError);
                        }
                    }
                } else {
                    // Handle other import types (masterlist, processes) with old format
                    if (data.imported_count === 0 && data.duplicates && data.duplicates.length > 0) {
                        showToast('No new items imported. All entries were duplicates.', 'warning');
                    } else {
                        showToast(data.message, 'success');
                    }
                    console.log('File upload successful:', data.message);
                    if (data.duplicates && data.duplicates.length > 0) {
                        try {
                            showDuplicatesModal(data.duplicates, data.imported_count, target || currentImportTarget);
                        } catch (dupModalError) {
                            console.error('Error showing duplicates modal:', dupModalError);
                            showToast('Error displaying duplicate information.', 'error');
                        }
                    } else {
                        try {
                            closeAllModals();
                            // Reload with state preservation after successful import
                            saveTabAndScrollPosition();
                            setTimeout(() => {
                                reloadWithStatePreservation();
                            }, 1000);
                        } catch (closeModalError) {
                            console.error('Error closing modals after successful upload:', closeModalError);
                        }
                    }
                }
            } else {
                showToast(data.message || 'File upload failed.', 'error');
                console.error('File upload failed:', data.message);
                
                // Handle duplicates in error case for products
                if (target === 'products' && data.existing_products && data.existing_products.length > 0) {
                    try {
                        showDuplicatesModal(data.existing_products, (data.products_imported || 0) + (data.wip_materials_imported || 0), target);
                    } catch (dupModalError) {
                        console.error('Error showing duplicates modal on failed upload:', dupModalError);
                        showToast('Error displaying duplicate information.', 'error');
                    }
                } else if (data.duplicates && data.duplicates.length > 0) {
                    try {
                        showDuplicatesModal(data.duplicates, data.imported_count, target || currentImportTarget);
                    } catch (dupModalError) {
                        console.error('Error showing duplicates modal on failed upload:', dupModalError);
                        showToast('Error displaying duplicate information.', 'error');
                    }
                } else {
                    try {
                        closeAllModals();
                    } catch (closeModalError) {
                        console.error('Error closing modals on failed upload:', closeModalError);
                    }
                }
            }
        } catch (error) {
            console.error('Error during file upload:', error);
            showToast('An error occurred during file upload.', 'error');
        } finally {
            hideLoadingOverlay();
            clearFileSelection();
        }
    }
    
    function showDuplicatesModal(duplicates, importedCount, target) {
        const modal = document.getElementById('duplicates-modal');
        const list = document.getElementById('duplicates-list');
        const summary = document.getElementById('import-summary');
        list.innerHTML = '';
        if (duplicates.length > 0) {
            duplicates.forEach(item => {
                const div = document.createElement('div');
                div.className = 'WIP-duplicate-item';
                if (target === 'masterlist') {
                    div.textContent = `Material: ${item.material_name} | Description: ${item.description} | Cutting Length: ${item.uom || ''}`;
                } else if (target === 'products') {
                    // Handle new format where existing_products is an array of strings
                    if (typeof item === 'string') {
                        div.textContent = `Product Number: ${item}`;
                    } else {
                        div.textContent = `Product Number: ${item.product_number} | Description: ${item.description}`;
                    }
                } else {
                    div.textContent = JSON.stringify(item);
                }
                list.appendChild(div);
            });
        }
        summary.textContent = `Imported: ${importedCount}. Duplicates skipped: ${duplicates.length}.`;
        openModal('duplicates-modal');
    }
    
    // Add Functions
    async function handleAddMaterial(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            material_name: formData.get('material_name'),
            description: formData.get('description'),
            uom: formData.get('uom') || null
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner"></div> Adding...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/wip-inventory/admin/create/material/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(result.message, 'success');
                closeModal('add-material-modal');
                e.target.reset();
                saveTabAndScrollPosition();
                setTimeout(() => {
                    reloadWithStatePreservation();
                }, 1000);
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('Error adding material', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    // Enable/disable Cutting Length and UOM fields based on checkbox
    function setupMaterialInputsForProductModal() {
        const tableBody = document.getElementById('materials-table-body');
        if (!tableBody) return;
        tableBody.querySelectorAll('tr').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"][name="material_ids"]');
            const cuttingInput = row.querySelector('input.cutting-length-input');
            const uomInput = row.querySelector('input.uom-input');
            if (checkbox && cuttingInput && uomInput) {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        cuttingInput.disabled = false;
                        uomInput.disabled = false;
                        cuttingInput.style.backgroundColor = '#fff';
                        uomInput.style.backgroundColor = '#fff';
                    } else {
                        cuttingInput.disabled = true;
                        uomInput.disabled = true;
                        cuttingInput.value = '';
                        uomInput.value = '';
                        cuttingInput.classList.remove('input-error');
                        uomInput.classList.remove('input-error');
                        cuttingInput.style.backgroundColor = '#f0f0f0';
                        uomInput.style.backgroundColor = '#f0f0f0';
                    }
                });
                // Set initial background color based on checked state
                if (checkbox.checked) {
                    cuttingInput.style.backgroundColor = '#fff';
                    uomInput.style.backgroundColor = '#fff';
                } else {
                    cuttingInput.style.backgroundColor = '#f0f0f0';
                    uomInput.style.backgroundColor = '#f0f0f0';
                }
                // Prevent input clicks from toggling the checkbox
                ['click', 'mousedown'].forEach(evt => {
                    cuttingInput.addEventListener(evt, function(e) { e.stopPropagation(); });
                    uomInput.addEventListener(evt, function(e) { e.stopPropagation(); });
                });
            }
        });
    }

    async function handleAddProduct(e) {
        e.preventDefault();
        let valid = true;
        const formData = new FormData(e.target);
        const selectedRows = Array.from(document.querySelectorAll('#materials-table-body input[type="checkbox"]:checked'));
        const materials = [];
        let errorMessages = [];
        selectedRows.forEach(cb => {
            const row = cb.closest('tr');
            const materialId = parseInt(cb.value);
            const cuttingInput = row.querySelector('input.cutting-length-input');
            const uomInput = row.querySelector('input.uom-input');
            // Remove previous error highlight if now valid
            if (cuttingInput.value) {
                cuttingInput.classList.remove('input-error');
                cuttingInput.style.border = '';
            }
            if (uomInput.value) {
                uomInput.classList.remove('input-error');
                uomInput.style.border = '';
            }
            // Validate
            let rowValid = true;
            let missingFields = [];
            if (!cuttingInput.value) {
                valid = false;
                rowValid = false;
                forceInputErrorStyle(cuttingInput);
                missingFields.push('Cutting Length');
            }
            if (!uomInput.value) {
                valid = false;
                rowValid = false;
                forceInputErrorStyle(uomInput);
                missingFields.push('UOM');
            }
            if (missingFields.length > 0) {
                errorMessages.push(`${missingFields.join(' and ')} ${missingFields.length === 1 ? 'is' : 'are'} required for material: "${row.cells[1].textContent.trim()}"`);
            }
            if (rowValid) {
                materials.push({
                    material_id: materialId,
                    cutting_length: cuttingInput.value,
                    uom: uomInput.value
                });
            }
        });
        if (!valid) {
            // Only show unique error messages
            const uniqueErrors = [...new Set(errorMessages)];
            showToast(uniqueErrors.join('\n'), 'error');
            return;
        }
        const data = {
            product_number: formData.get('product_number'),
            description: formData.get('description'),
            materials: materials
        };
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner"></div> Adding...';
        submitBtn.disabled = true;
        try {
            const response = await fetch('/wip-inventory/admin/create/product/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
                closeModal('add-product-modal');
                e.target.reset();
                setTimeout(() => {
                    reloadWithStatePreservation();
                }, 1000);
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('Error adding product', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    async function handleAddProcess(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            process_name: formData.get('process_name')
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner"></div> Adding...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/wip-inventory/admin/create/process/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(result.message, 'success');
                closeModal('add-process-modal');
                e.target.reset();
                setTimeout(() => {
                    reloadWithStatePreservation();
                }, 1000);
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('Error adding process', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    // Edit Functions
    async function openEditModal(type, id) {
        currentEditItem = { type, id };
        const modal = document.getElementById('edit-item-modal');
        const title = modal.querySelector('#edit-modal-title');
        const body = modal.querySelector('#edit-modal-body');
        title.textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        body.innerHTML = '<div class="loading-spinner"></div> Loading...';
        openModal('edit-item-modal');
        try {
            if (type === 'material') {
                await loadEditMaterialForm(id);
            } else if (type === 'product') {
                await fetchAllMaterials(); // Ensure allMaterials is populated
                await loadEditProductForm(id);
            } else if (type === 'process') {
                await loadEditProcessForm(id);
            }
        } catch (error) {
            body.innerHTML = '<p class="error">Error loading form. Please try again.</p>';
        }
    }
    
    async function loadEditMaterialForm(id) {
        const row = document.querySelector(`#materials-table tr[data-id="${id}"]`);
        const cells = row.querySelectorAll('td');
        
        const body = document.getElementById('edit-modal-body');
        body.innerHTML = `
            <div class="WIP-edit-material-form">
                <div class="JO-form-group">
                    <label for="edit-material-name">Material Name <span class="required">*</span></label>
                    <input type="text" id="edit-material-name" name="material_name" class="WIP-input" value="${cells[0].textContent}" required>
                </div>
                <div class="JO-form-group">
                    <label for="edit-material-description">Description</label>
                    <textarea id="edit-material-description" name="description" class="WIP-input" rows="3">${cells[1].textContent}</textarea>
                </div>
                <div class="JO-form-group">
                    <label for="edit-material-uom">Unit of Measure</label>
                    <input type="text" id="edit-material-uom" name="uom" class="WIP-input" value="${cells[2].textContent === '-' ? '' : cells[2].textContent}">
                </div>
            </div>
        `;
    }
    
    async function loadEditProductForm(id) {
        // Fetch product details and all materials from the server
        let productData = null;
        try {
            const response = await fetch(`/wip-inventory/admin/api/product-detail/${id}/`);
            productData = await response.json();
        } catch (error) {
            console.error('Error fetching product details:', error);
            const body = document.getElementById('edit-modal-body');
            body.innerHTML = '<p class="error">Error loading product details. Please try again.</p>';
            return;
        }
        const { product_number, description, materials: productMaterials } = productData;
        // Map for quick lookup
        const productMaterialsMap = {};
        (productMaterials || []).forEach(m => {
            productMaterialsMap[m.material_id] = m;
        });
        // Sort allMaterials: checked (in productMaterialsMap) first
        const sortedMaterials = [...allMaterials].sort((a, b) => {
            const aChecked = !!productMaterialsMap[a.id];
            const bChecked = !!productMaterialsMap[b.id];
            if (aChecked === bChecked) return 0;
            return aChecked ? -1 : 1;
        });
        const body = document.getElementById('edit-modal-body');
        body.innerHTML = `
            <div class="WIP-edit-product-form">
                <div class="JO-form-group">
                    <label for="edit-product-number">Product Number <span class="required">*</span></label>
                    <input type="text" id="edit-product-number" name="product_number" class="WIP-input" value="${product_number}" required>
                </div>
                <div class="JO-form-group">
                    <label for="edit-product-description">Description</label>
                    <textarea id="edit-product-description" name="description" class="WIP-input" rows="3">${description || ''}</textarea>
                </div>
                <div class="JO-form-group">
                    <label>Materials</label>
                    <div class="WIP-search-container">
                        <input type="text" id="edit-material-search" class="WIP-search-input" placeholder="Search materials...">
                    </div>
                    <div class="WIP-materials-table-wrapper">
                        <table class="JO-table" id="edit-materials-table">
                            <thead>
                                <tr>
                                    <th style="width: 40px;"></th>
                                    <th>Material Name</th>
                                    <th>Description</th>
                                    <th>Cutting Length</th>
                                    <th>UOM</th>
                                </tr>
                            </thead>
                            <tbody id="edit-materials-table-body">
                                ${sortedMaterials.map(material => {
                                    const checked = productMaterialsMap[material.id] ? 'checked' : '';
                                    const cuttingLength = productMaterialsMap[material.id] ? productMaterialsMap[material.id].cutting_length : '';
                                    const uom = productMaterialsMap[material.id] ? productMaterialsMap[material.id].uom : '';
                                    return `
                                    <tr>
                                        <td>
                                            <input type="checkbox" name="material_ids" value="${material.id}" ${checked}>
                                        </td>
                                        <td>${material.material_name}</td>
                                        <td>${material.description || ''}</td>
                                        <td>
                                            <input type="number" step="0.01" min="0" class="WIP-input cutting-length-input" name="cutting_length_${material.id}" style="width: 100px;" value="${cuttingLength}" ${checked ? '' : 'disabled'}>
                                        </td>
                                        <td>
                                            <input type="text" class="WIP-input uom-input" name="uom_${material.id}" style="width: 80px;" value="${uom}" ${checked ? '' : 'disabled'}>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        // Setup enable/disable for inputs and search
        setupMaterialInputsForEditProductModal();
        document.getElementById('edit-material-search').addEventListener('input', function() {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('#edit-materials-table-body tr');
            rows.forEach(row => {
                const name = row.cells[1].textContent.toLowerCase();
                const desc = row.cells[2].textContent.toLowerCase();
                if (name.includes(filter) || desc.includes(filter)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Enable/disable Cutting Length and UOM fields based on checkbox for Edit Product
    function setupMaterialInputsForEditProductModal() {
        const tableBody = document.getElementById('edit-materials-table-body');
        if (!tableBody) return;
        tableBody.querySelectorAll('tr').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"][name="material_ids"]');
            const cuttingInput = row.querySelector('input.cutting-length-input');
            const uomInput = row.querySelector('input.uom-input');
            if (checkbox && cuttingInput && uomInput) {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        cuttingInput.disabled = false;
                        uomInput.disabled = false;
                        cuttingInput.style.backgroundColor = '#fff';
                        uomInput.style.backgroundColor = '#fff';
                    } else {
                        cuttingInput.disabled = true;
                        uomInput.disabled = true;
                        cuttingInput.value = '';
                        uomInput.value = '';
                        cuttingInput.classList.remove('input-error');
                        uomInput.classList.remove('input-error');
                        cuttingInput.style.backgroundColor = '#f0f0f0';
                        uomInput.style.backgroundColor = '#f0f0f0';
                    }
                });
                // Set initial background color based on checked state
                if (checkbox.checked) {
                    cuttingInput.style.backgroundColor = '#fff';
                    uomInput.style.backgroundColor = '#fff';
                } else {
                    cuttingInput.style.backgroundColor = '#f0f0f0';
                    uomInput.style.backgroundColor = '#f0f0f0';
                }
                // Prevent input clicks from toggling the checkbox
                ['click', 'mousedown'].forEach(evt => {
                    cuttingInput.addEventListener(evt, function(e) { e.stopPropagation(); });
                    uomInput.addEventListener(evt, function(e) { e.stopPropagation(); });
                });
            }
        });
    }

    async function loadEditProcessForm(id) {
        const row = document.querySelector(`#processes-table tr[data-id="${id}"]`);
        const cells = row.querySelectorAll('td');
        const isActive = cells[1].textContent.includes('Active');
        
        const body = document.getElementById('edit-modal-body');
        body.innerHTML = `
            <div class="WIP-edit-process-form">
                <div class="JO-form-group">
                    <label for="edit-process-name">Process Name <span class="required">*</span></label>
                    <input type="text" id="edit-process-name" name="process_name" class="WIP-input" value="${cells[0].textContent}" required>
                </div>
                <div class="JO-form-group">
                    <label>Status</label>
                    <div class="WIP-status-toggle">
                        <div class="WIP-toggle-switch ${isActive ? 'active' : ''}" id="process-status-toggle">
                            <div class="WIP-toggle-slider"></div>
                        </div>
                        <span>Active</span>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('process-status-toggle').addEventListener('click', function() {
            this.classList.toggle('active');
        });
    }
    
    async function handleEditItem(e) {
        e.preventDefault();
        if (!currentEditItem) return;
        const { type, id } = currentEditItem;
        let data = {};
        if (type === 'material') {
            data = {
                material_name: document.getElementById('edit-material-name').value,
                description: document.getElementById('edit-material-description').value,
                uom: document.getElementById('edit-material-uom').value || null
            };
        } else if (type === 'product') {
            // Validation like add product
            let valid = true;
            const selectedRows = Array.from(document.querySelectorAll('#edit-materials-table-body input[type="checkbox"]:checked'));
            const materials = [];
            let errorMessages = [];
            selectedRows.forEach(cb => {
                const row = cb.closest('tr');
                const materialId = parseInt(cb.value);
                const cuttingInput = row.querySelector('input.cutting-length-input');
                const uomInput = row.querySelector('input.uom-input');
                if (cuttingInput.value) {
                    cuttingInput.classList.remove('input-error');
                    cuttingInput.style.border = '';
                }
                if (uomInput.value) {
                    uomInput.classList.remove('input-error');
                    uomInput.style.border = '';
                }
                let rowValid = true;
                let missingFields = [];
                if (!cuttingInput.value) {
                    valid = false;
                    rowValid = false;
                    forceInputErrorStyle(cuttingInput);
                    missingFields.push('Cutting Length');
                }
                if (!uomInput.value) {
                    valid = false;
                    rowValid = false;
                    forceInputErrorStyle(uomInput);
                    missingFields.push('UOM');
                }
                if (missingFields.length > 0) {
                    errorMessages.push(`${missingFields.join(' and ')} ${missingFields.length === 1 ? 'is' : 'are'} required for material: "${row.cells[1].textContent.trim()}"`);
                }
                if (rowValid) {
                    materials.push({
                        material_id: materialId,
                        cutting_length: cuttingInput.value,
                        uom: uomInput.value
                    });
                }
            });
            if (!valid) {
                const uniqueErrors = [...new Set(errorMessages)];
                showToast(uniqueErrors.join('\n'), 'error');
                return;
            }
            data = {
                product_number: document.getElementById('edit-product-number').value,
                description: document.getElementById('edit-product-description').value,
                materials: materials
            };
        } else if (type === 'process') {
            const isActive = document.getElementById('process-status-toggle').classList.contains('active');
            data = {
                process_name: document.getElementById('edit-process-name').value,
                is_active: isActive
            };
        }
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner"></div> Updating...';
        submitBtn.disabled = true;
        try {
            const response = await fetch(`/wip-inventory/admin/update/${type}/${id}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
                closeModal('edit-item-modal');
                saveTabAndScrollPosition();
                setTimeout(() => {
                    reloadWithStatePreservation();
                }, 1000);
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('Error updating item', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    // Delete Functions
    function openDeleteModal(type, id, name) {
        currentDeleteItem = { type, id };
        
        const modal = document.getElementById('delete-confirmation-modal');
        const itemName = document.getElementById('delete-item-name');
        
        itemName.textContent = name;
        openModal('delete-confirmation-modal');
    }
    
    async function handleDeleteItem() {
        if (!currentDeleteItem) return;
        
        const { type, id } = currentDeleteItem;
        
        const btn = document.getElementById('confirm-delete-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="loading-spinner"></div> Deleting...';
        btn.disabled = true;
        
        try {
            const response = await fetch(`/wip-inventory/admin/delete/${type}/${id}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(result.message, 'success');
                closeModal('delete-confirmation-modal');
                saveTabAndScrollPosition();
                setTimeout(() => {
                    reloadWithStatePreservation();
                }, 1000);
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('Error deleting item', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
    
    // Search Functions
    function setupSearch() {
        const searchInputs = ['materials-search', 'products-search', 'processes-search'];
        
        searchInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                let debounceTimer;
                input.addEventListener('input', function() {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        const type = id.split('-')[0];
                        performSearch(type, this.value);
                    }, 300);
                });
            }
        });
    }
    
    async function performSearch(type, query) {
        try {
            const response = await fetch(`/wip-inventory/admin/search/?type=${type}&q=${encodeURIComponent(query)}&page=1`);
            const data = await response.json();
            
            if (data.success) {
                updateTableContent(type, data.results);
                updatePagination(type, data);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    function updateTableContent(type, results) {
        const tbody = document.getElementById(`${type}-tbody`);
        tbody.innerHTML = '';
        
        if (results.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="JO-empty-table">No ${type} found.</td></tr>`;
            return;
        }
        
        results.forEach(item => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', item.id);
            
            if (type === 'materials') {
                row.innerHTML = `
                    <td>${item.material_name}</td>
                    <td>${item.description || ''}</td>
                    <td>${item.uom || '-'}</td>
                    <td>${item.created_at || '-'}</td>
                    <td>
                        <button class="JO-icon-button WIP-edit-item-btn" data-type="material" data-id="${item.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="JO-icon-button WIP-delete-item-btn" data-type="material" data-id="${item.id}" data-name="${item.material_name}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            } else if (type === 'products') {
                const materials = (item.wip_materials || []).slice(0, 3).map(m => `<span class="WIP-material-tag">${m}</span>`).join('');
                const moreCount = (item.wip_materials && item.wip_materials.length > 3) ? `<span class="WIP-material-tag WIP-more">+${item.wip_materials.length - 3} more</span>` : '';
                
                row.innerHTML = `
                    <td>${item.product_number}</td>
                    <td>${item.description || ''}</td>
                    <td><div class="WIP-materials-tags">${materials}${moreCount}</div></td>
                    <td>${item.created_at || '-'}</td>
                    <td>
                        <button class="JO-icon-button WIP-edit-item-btn" data-type="product" data-id="${item.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="JO-icon-button WIP-delete-item-btn" data-type="product" data-id="${item.id}" data-name="${item.product_number}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            } else if (type === 'processes') {
                const status = item.is_active ? 
                    '<span class="JO-status JO-status-approved">Active</span>' : 
                    '<span class="JO-status JO-status-rejected">Inactive</span>';
                
                row.innerHTML = `
                    <td>${item.process_name}</td>
                    <td>${status}</td>
                    <td>${item.created_at || '-'}</td>
                    <td>
                        <button class="JO-icon-button WIP-edit-item-btn" data-type="process" data-id="${item.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="JO-icon-button WIP-delete-item-btn" data-type="process" data-id="${item.id}" data-name="${item.process_name}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            }
            
            tbody.appendChild(row);
        });
        
        // Re-attach event listeners
        attachTableEventListeners();
    }
    
    function attachTableEventListeners() {
        document.querySelectorAll('.WIP-edit-item-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                const id = this.getAttribute('data-id');
                openEditModal(type, id);
            });
        });
        
        document.querySelectorAll('.WIP-delete-item-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                const id = this.getAttribute('data-id');
                const name = this.getAttribute('data-name');
                openDeleteModal(type, id, name);
            });
        });
    }
    
    // Pagination Functions
    function setupPagination() {
        // Pagination will be handled by search/filter results
    }
    
    function updatePagination(type, data) {
        const container = document.getElementById(`${type}-pagination`);
        container.innerHTML = '';
        
        if (data.total_pages <= 1) return;
        
        const controls = document.createElement('div');
        controls.className = 'WIP-pagination-controls';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = `WIP-pagination-btn ${data.has_previous ? '' : 'disabled'}`;
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
        prevBtn.addEventListener('click', () => {
            if (data.has_previous) {
                loadPage(type, data.current_page - 1);
            }
        });
        controls.appendChild(prevBtn);
        
        // Page numbers
        for (let i = 1; i <= data.total_pages; i++) {
            if (i === data.current_page || 
                i <= 2 || 
                i >= data.total_pages - 1 || 
                (i >= data.current_page - 1 && i <= data.current_page + 1)) {
                
                const pageBtn = document.createElement('button');
                pageBtn.className = `WIP-pagination-btn ${i === data.current_page ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => loadPage(type, i));
                controls.appendChild(pageBtn);
            } else if (i === 3 && data.current_page > 4) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'WIP-pagination-ellipsis';
                controls.appendChild(ellipsis);
            } else if (i === data.total_pages - 2 && data.current_page < data.total_pages - 3) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'WIP-pagination-ellipsis';
                controls.appendChild(ellipsis);
            }
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = `WIP-pagination-btn ${data.has_next ? '' : 'disabled'}`;
        nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', () => {
            if (data.has_next) {
                loadPage(type, data.current_page + 1);
            }
        });
        controls.appendChild(nextBtn);
        
        const info = document.createElement('div');
        info.className = 'WIP-pagination-info';
        info.textContent = `Page ${data.current_page} of ${data.total_pages}`;
        
        container.appendChild(controls);
        container.appendChild(info);
    }
    
    async function loadPage(type, page) {
        const searchInput = document.getElementById(`${type}-search`);
        const query = searchInput ? searchInput.value : '';
        
        try {
            const response = await fetch(`/wip-inventory/admin/search/?type=${type}&q=${encodeURIComponent(query)}&page=${page}`);
            const data = await response.json();
            
            if (data.success) {
                updateTableContent(type, data.results);
                updatePagination(type, data);
            }
        } catch (error) {
            console.error('Pagination error:', error);
        }
    }
    
    // Utility Functions
    function openModal(modalId) {
        console.log('DEBUG: openModal called for', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            console.error('Modal with ID ' + modalId + ' not found.');
        }
    }
    
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (!document.querySelector('.JO-modal.active')) {
                    document.body.style.overflow = '';
                }
            }, 300);
        } else {
            console.error('Modal with ID ' + modalId + ' not found.');
        }
    }
    
    function closeAllModals() {
        document.querySelectorAll('.JO-modal.active').forEach(modal => {
            closeModal(modal.id);
        });
    }
    
    function showLoadingOverlay(message = 'Loading...') {
        let overlay = document.querySelector('.WIP-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'WIP-loading-overlay';
            overlay.innerHTML = `
                <div class="WIP-loading-content">
                    <div class="WIP-loading-spinner"></div>
                    <p class="WIP-loading-message">${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.querySelector('.WIP-loading-message').textContent = message;
        overlay.classList.add('active');
    }
    
    function hideLoadingOverlay() {
        const overlay = document.querySelector('.WIP-loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
    
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        // Add icon markup for error, warning, info, success
        let iconHtml = '';
        if (type === 'error') {
            iconHtml = '<span class="toast-icon"><i class="fas fa-exclamation-triangle"></i></span>';
        } else if (type === 'success') {
            iconHtml = '<span class="toast-icon"><i class="fas fa-check-circle"></i></span>';
        } else if (type === 'warning') {
            iconHtml = '<span class="toast-icon"><i class="fas fa-exclamation-circle"></i></span>';
        } else if (type === 'info') {
            iconHtml = '<span class="toast-icon"><i class="fas fa-info-circle"></i></span>';
        }
        toast.innerHTML = `<div class="toast-content">${iconHtml}<span>${message}</span></div>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // Ensure the CSS for .input-error is always present
    (function() {
        if (!document.getElementById('input-error-style')) {
            const style = document.createElement('style');
            style.id = 'input-error-style';
            style.innerHTML = `.input-error { border: 2px solid red !important; box-shadow: none !important; outline: none !important; }`;
            document.head.appendChild(style);
        }
    })();

    // Patch: Also apply inline style for .input-error to guarantee red border
    function forceInputErrorStyle(input) {
        input.classList.add('input-error');
        input.style.border = '2px solid red';
        input.style.boxShadow = 'none';
        input.style.outline = 'none';
    }

    // Fetch all materials for use in modals
    async function fetchAllMaterials() {
        try {
            const response = await fetch('/wip-inventory/admin/api/materials/');
            const data = await response.json();
            if (data.success && Array.isArray(data.materials)) {
                allMaterials = data.materials;
            } else {
                allMaterials = [];
            }
        } catch (error) {
            allMaterials = [];
        }
    }
});