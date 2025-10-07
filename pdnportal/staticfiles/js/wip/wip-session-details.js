document.addEventListener('DOMContentLoaded', function() {
    const rawMaterialsModal = document.getElementById('raw-materials-modal');
    const finishedProductsModal = document.getElementById('finished-products-modal');
    const wipProductsModal = document.getElementById('wip-products-modal');
    const checkSessionModal = document.getElementById('check-session-modal');
    const checkingCompleteModal = document.getElementById('checking-complete');
    
    let selectedProducts = [];
    let allProducts = [];
    
    // Global flag to prevent multiple simultaneous mark as checked requests
    let isMarkingAsChecked = false;
    
    initializePage();
    setupCollapsibleSections();
    setupModalHandlers();
    setupAddEntryButtons();
    setupEditableFields();
    setupCheckSessionButton();
    setupMarkAsCheckedButtons();
    setupCheckingCompleteModal();
    setupTabs();
    
    function initializePage() {
        restoreState();
        
        console.log('=== DEBUG: initializePage called ===');
        console.log('window.sessionId:', window.sessionId);
        console.log('typeof window.sessionId:', typeof window.sessionId);
        console.log('window.canEdit:', window.canEdit);
        console.log('window.userType:', window.userType);
        console.log('Current URL:', window.location.href);
        
        setupCollapsibleSections();
        setupModalHandlers();
        setupAddEntryButtons();
        setupEditableFields();
        setupMarkAsCheckedButtons();
        setupCheckSessionButton();
        loadProducts();
    }
    
    function setupCollapsibleSections() {
        console.log('Setting up collapsible sections...');
        
        // Find all sections and their content
        const sections = Array.from(document.querySelectorAll('.WIP-section'));
        console.log('Found sections:', sections.length);
        
        // All sections start collapsed by default
        sections.forEach(section => {
            section.classList.remove('expanded');
            section.classList.add('collapsed');
        });
        
        // Setup event listeners for each section
        sections.forEach(section => {
            const header = section.querySelector('.WIP-section-header');
            const content = section.querySelector('.WIP-section-content');
            const collapseBtn = header.querySelector('.WIP-collapse-btn');
            const collapseIcon = collapseBtn.querySelector('i');
            
            if (!header || !content || !collapseBtn) {
                console.warn('Missing elements for collapsible section:', section);
                return;
            }
            
            console.log('Setting up section:', header.getAttribute('data-section'));
            
            // Set initial collapsed state
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            content.style.overflow = 'hidden';
            collapseIcon.style.transform = 'rotate(-90deg)';

            // Function to toggle section
            const toggleSection = (e) => {
                // Don't toggle if clicking on the add button
                if (e.target.closest('.WIP-add-entry-btn')) {
                    return;
                }
                
                console.log('Toggling section:', header.getAttribute('data-section'));
                
                const isExpanded = section.classList.contains('expanded');
                
                if (isExpanded) {
                    // Collapsing
                    section.classList.remove('expanded');
                    section.classList.add('collapsed');
                    content.style.transition = 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                    content.style.maxHeight = '0';
                    content.style.opacity = '0';
                    content.style.overflow = 'hidden';
                    collapseIcon.style.transform = 'rotate(-90deg)';
                } else {
                    // Expanding
                    section.classList.remove('collapsed');
                    section.classList.add('expanded');
                    content.style.transition = 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                    content.style.maxHeight = content.scrollHeight + 'px';
                    content.style.opacity = '1';
                    content.style.overflow = 'hidden';
                    collapseIcon.style.transform = 'rotate(0deg)';
                    
                    // After animation, allow content to expand naturally and animate table rows
                    setTimeout(() => {
                        if (section.classList.contains('expanded')) {
                            content.style.maxHeight = 'none';
                            content.style.overflow = 'visible';
                            // Animate table rows
                            animateTableRows(section);
                        }
                    }, 400);
                }
            };

            // Toggle on header click for mobile/tablet
            header.addEventListener('click', toggleSection);

            // Toggle on collapse button click for desktop
            collapseBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleSection(e);
            });
        });
        
        console.log('Collapsible sections setup complete');
    }
    
    function animateTableRows(section) {
        // Only animate if section is expanded
        if (!section.classList.contains('expanded')) {
            return;
        }
        
        const tableRows = section.querySelectorAll('.WIP-table tbody tr');
        if (tableRows.length === 0) {
            return;
        }
        
        tableRows.forEach((row, index) => {
            // Reset animation
            row.style.opacity = '0';
            row.style.transform = 'translateY(10px)';
            row.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            row.style.transitionDelay = `${index * 0.08}s`;
            
            // Trigger animation
            setTimeout(() => {
                if (section.classList.contains('expanded')) {
                    row.style.opacity = '1';
                    row.style.transform = 'translateY(0)';
                }
            }, 100 + (index * 80));
        });
    }
    
    function setupModalHandlers() {
        document.querySelectorAll('.JO-modal-close, .close-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                closeAllModals();
            });
        });
        
        document.querySelectorAll('.JO-modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeAllModals();
                }
            });
        });
    }
    
    function setupAddEntryButtons() {
        document.querySelectorAll('.WIP-add-entry-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                
                if (type === 'raw') {
                    openRawMaterialsModal();
                } else if (type === 'finished' ) {
                    openFinishedProductsModal();
                } else if (type === 'wip') {
                    openWIPProductsModal();
                }
            });
        });
    }
    
    function setupEditableFields() {
        if (!window.canEdit) return;

        let entryIdToDelete = null;
        const deleteEntryModal = document.getElementById('delete-entry-modal');
        const confirmDeleteBtn = document.getElementById('confirm-delete-entry');
        const cancelDeleteBtn = document.getElementById('cancel-delete-entry');

        document.querySelectorAll('.WIP-edit-entry-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const entryId = this.getAttribute('data-id');
                const row = this.closest('tr');
                // Patch: get entry status from row for checker/counter logic
                let entryStatus = '';
                // Find the correct status cell by data-label (robust for all tables)
                const statusCell = row.querySelector('td[data-label="Status"] span, td[data-label="Status"]');
                if (statusCell) {
                    entryStatus = statusCell.textContent.trim().toUpperCase();
                }
                if (typeof window.canEditEntry === 'function' && !window.canEditEntry(entryStatus)) {
                    showToast('You do not have permission to edit this entry.', 'error');
                    return;
                }
                makeRowEditable(row, entryId);
            });
        });

        document.querySelectorAll('.WIP-delete-entry-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                entryIdToDelete = this.getAttribute('data-id');
                openModal(deleteEntryModal);
            });
        });

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', function() {
                if (entryIdToDelete) {
                    saveState();
                    deleteEntry(entryIdToDelete);
                    entryIdToDelete = null;
                    closeModal(deleteEntryModal);
                }
            });
        }
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', function() {
                entryIdToDelete = null;
                closeModal(deleteEntryModal);
            });
        }
    }
    
    function setupMarkAsCheckedButtons() {
        const buttons = document.querySelectorAll('.WIP-mark-checked-btn');
        console.log('Found mark as checked buttons:', buttons.length);
        
        buttons.forEach(btn => {
            btn.addEventListener('click', async function() {
                // Prevent multiple simultaneous requests
                if (isMarkingAsChecked) {
                    console.log('DEBUG: Already marking an entry as checked, ignoring click');
                    return;
                }
                
                const entryId = this.getAttribute('data-id');
                console.log('DEBUG: Mark as checked button clicked');
                console.log('DEBUG: Entry ID from button:', entryId);
                console.log('DEBUG: Button element:', this);
                console.log('DEBUG: Button data-id attribute:', this.getAttribute('data-id'));
                
                saveState();
                console.log('Mark as checked clicked for entry ID:', entryId);
                
                const row = this.closest('tr');
                if (!row) {
                    console.error('WIP-mark-checked-btn: Could not find parent <tr> for button', this);
                    showToast('Internal error: Could not find table row for this entry.', 'error');
                    return;
                }
                
                // Find the parent tab content div
                const tabContent = row.closest('.WIP-tab-content');
                if (!tabContent) {
                    console.error('WIP-mark-checked-btn: Could not find parent .WIP-tab-content for row', row);
                    showToast('Internal error: Could not find section for this entry.', 'error');
                    return;
                }
                
                // Get section type from tab ID (e.g., 'tab-raw' -> 'raw')
                const sectionType = tabContent.id.replace('tab-', '');
                
                const originalText = this.innerHTML;
                this.innerHTML = '<div class="loading-spinner"></div>';
                this.disabled = true;
                
                // Set flag to prevent multiple requests
                isMarkingAsChecked = true;
                
                try {
                    console.log('Making request to mark entry as checked...');
                    const csrfToken = getCsrfToken();
                    console.log('CSRF Token:', csrfToken ? 'Present' : 'Missing');
                    
                    const url = `/wip-inventory/entry/${entryId}/mark_checked/`;
                    console.log('Request URL:', url);
                    console.log('Request method: POST');
                    console.log('Request headers:', {
                        'X-CSRFToken': csrfToken ? 'Present' : 'Missing',
                        'Content-Type': 'application/json'
                    });
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': csrfToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ section: sectionType })
                    });
                    
                    console.log('Response status:', response.status);
                    console.log('Response status text:', response.statusText);
                    console.log('Response URL:', response.url);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Response error text:', errorText);
                        throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
                    }
                    
                    const data = await response.json();
                    console.log('Mark as checked response:', data);
                    
                    if (data.success) {
                        showToast('Entry marked as Checked.', 'success');
                        // Update the status cell in the table
                        const statusCell = row.querySelector('td:nth-last-child(2)');
                        if (statusCell) {
                            statusCell.innerHTML = '<span class="WIP-status WIP-status-approved">Checked</span>';
                        }
                        // Remove the mark as checked button
                        this.remove();
                        
                        // Check if all entries are now checked
                        checkForCompletion();
                        
                    } else {
                        showToast(data.message || 'Failed to mark as checked.', 'error');
                        this.innerHTML = originalText;
                        this.disabled = false;
                    }
                } catch (error) {
                    console.error('Error marking as checked:', error);
                    console.error('Error details:', {
                        message: error.message,
                        stack: error.stack
                    });
                    showToast('An error occurred while marking as checked.', 'error');
                    this.innerHTML = originalText;
                    this.disabled = false;
                } finally {
                    // Reset flag
                    isMarkingAsChecked = false;
                }
            });
        });
    }
    
    function setupCheckSessionButton() {
        const checkBtn = document.getElementById('check-session-btn');
        if (checkBtn) {
            checkBtn.addEventListener('click', function() {
                openModal(checkSessionModal);
            });
        }
        
        const confirmCheckBtn = document.getElementById('confirm-check');
        if (confirmCheckBtn) {
            confirmCheckBtn.addEventListener('click', function() {
                getSession();
            });
        }
        
        const cancelCheckBtn = document.getElementById('cancel-check');
        if (cancelCheckBtn) {
            cancelCheckBtn.addEventListener('click', function() {
                closeModal(checkSessionModal);
            });
        }
    }
    
    async function loadProducts() {
        try {
            const response = await fetch('/wip-inventory/api/products/');
            const data = await response.json();
            allProducts = data.products;
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }
    
    function openRawMaterialsModal() {
        selectedProducts = [];
        // Only setup the modal once, not every time it opens
        if (!rawMaterialsModal.dataset.initialized) {
            setupRawMaterialsModal();
            rawMaterialsModal.dataset.initialized = 'true';
        }
        // Make the modal larger for better data entry
        rawMaterialsModal.classList.add('large-modal');
        openModal(rawMaterialsModal);
    }
    
    function setupRawMaterialsModal() {
        const productList = document.getElementById('raw-product-list');
        const searchInput = document.getElementById('raw-product-search');
        const nextBtn = document.getElementById('raw-next-btn');
        const backBtn = document.getElementById('raw-back-btn');
        const submitBtn = document.getElementById('raw-submit-btn');
        
        renderProductList(productList, 'raw');
        
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredProducts = allProducts.filter(product =>
                product.product_number.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
            renderProductList(productList, 'raw', filteredProducts);
        });
        
        nextBtn.addEventListener('click', function() {
            if (selectedProducts.length === 0) {
                showToast('Please select at least one product', 'warning');
                return;
            }
            
            showRawMaterialsStep2();
        });
        
        backBtn.addEventListener('click', function() {
            showRawMaterialsStep1();
        });
        
        submitBtn.addEventListener('click', function() {
            submitRawMaterials();
        });
    }
    
    function renderProductList(container, type, products = allProducts) {
        container.innerHTML = '';

        if (!products || products.length === 0) {
            const noDataDiv = document.createElement('div');
            noDataDiv.className = 'no-data-message';
            noDataDiv.innerHTML = `
                <div class="no-data-icon"><i class="fas fa-box-open"></i></div>
                <div class="no-data-title">No products found</div>
                <div class="no-data-sub">There are no products to show for your search.</div>
            `;
            container.appendChild(noDataDiv);
            // Ensure min-height is respected
            container.style.minHeight = '180px';
            return;
        }

        // Ensure min-height is respected even with data
        container.style.minHeight = '180px';

        // Create table structure
        const tableHTML = `
            <table class="WIP-product-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">
                            <input type="checkbox" id="${type}-select-all" class="WIP-select-all-checkbox">
                        </th>
                        <th>Product Name</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody id="${type}-product-tbody">
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
        const tbody = document.getElementById(`${type}-product-tbody`);
        const selectAllCheckbox = document.getElementById(`${type}-select-all`);

        // Add products to table
        products.forEach(product => {
            const row = document.createElement('tr');
            row.className = 'WIP-product-row';
            row.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" id="${type}-product-${product.id}" value="${product.id}" class="WIP-product-checkbox">
                </td>
                <td>${product.product_number}</td>
                <td>${product.description}</td>
            `;
            
            const checkbox = row.querySelector('.WIP-product-checkbox');
            
            // Handle individual checkbox change
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    if (!selectedProducts.some(p => p.id === product.id)) {
                        selectedProducts.push(product);
                    }
                } else {
                    selectedProducts = selectedProducts.filter(p => p.id !== product.id);
                }
                updateSelectAllCheckbox();
            });
            
            // Toggle checkbox on row click
            row.addEventListener('click', function(e) {
                if (e.target !== checkbox && e.target !== selectAllCheckbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
            
            tbody.appendChild(row);
        });

        // Handle select all checkbox
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const checkboxes = tbody.querySelectorAll('.WIP-product-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = this.checked;
                    cb.dispatchEvent(new Event('change'));
                });
            });
        }

        function updateSelectAllCheckbox() {
            const checkboxes = tbody.querySelectorAll('.WIP-product-checkbox');
            const checkedBoxes = tbody.querySelectorAll('.WIP-product-checkbox:checked');
            
            if (checkboxes.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedBoxes.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedBoxes.length === checkboxes.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        }
    }
    
    function showRawMaterialsStep2() {
        document.getElementById('raw-step-1').style.display = 'none';
        document.getElementById('raw-step-2').style.display = 'block';
        document.getElementById('raw-next-btn').style.display = 'none';
        document.getElementById('raw-back-btn').style.display = 'inline-flex';
        document.getElementById('raw-submit-btn').style.display = 'inline-flex';
        
        generateRawMaterialsForm();
    }
    
    function showRawMaterialsStep1() {
        document.getElementById('raw-step-1').style.display = 'block';
        document.getElementById('raw-step-2').style.display = 'none';
        document.getElementById('raw-next-btn').style.display = 'inline-flex';
        document.getElementById('raw-back-btn').style.display = 'none';
        document.getElementById('raw-submit-btn').style.display = 'none';
    }
    
    async function generateRawMaterialsForm() {
        const formContainer = document.getElementById('raw-entry-form');
        formContainer.innerHTML = '<div class="loading-spinner"></div> Loading materials...';

        try {
            console.log('DEBUG: generateRawMaterialsForm called');
            console.log('DEBUG: selectedProducts:', selectedProducts);
            
            const tableHTML = `
                <table class="WIP-entry-table large-table">
                    <colgroup>
                        <col style="width: 14%"> <!-- Product Number -->
                        <col style="width: 14%"> <!-- Count Tag -->
                        <col style="width: 18%"> <!-- Material Name -->
                        <col style="width: 24%"> <!-- Description -->
                        <col style="width: 14%"> <!-- WIP Qty -->
                        <col style="width: 8%"> <!-- UOM -->
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Product Number</th>
                            <th>Count Tag</th>
                            <th>Material Name</th>
                            <th>Description</th>
                            <th>WIP Qty</th>
                            <th>UOM</th>
                        </tr>
                    </thead>
                    <tbody id="raw-entries-tbody" style="min-height: 320px;"></tbody>
                </table>
            `;

            formContainer.innerHTML = tableHTML;
            const tbody = document.getElementById('raw-entries-tbody');

            for (const product of selectedProducts) {
                console.log(`DEBUG: Fetching materials for product ${product.id} (${product.product_number})`);
                
                try {
                    const response = await fetch(`/wip-inventory/api/materials/?product_id=${product.id}&type=raw`);
                    console.log(`DEBUG: Response status for product ${product.id}:`, response.status);
                    
                    if (!response.ok) {
                        console.error(`DEBUG: HTTP error for product ${product.id}:`, response.status, response.statusText);
                        const errorText = await response.text();
                        console.error(`DEBUG: Error response body:`, errorText);
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    console.log(`DEBUG: Materials data for product ${product.id}:`, data);
                    
                    const materials = data.materials;
                    if (!materials || materials.length === 0) {
                        console.warn(`DEBUG: No materials found for product ${product.id}`);
                        continue;
                    }

                    materials.forEach(material => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${product.product_number}</td>
                            <td><input type="number" name="count_tag_${product.id}_${material.id}" data-product-id="${product.id}" data-material-id="${material.id}" placeholder="Count tag" min="0" required></td>
                            <td class="material-name-cell">${material.material_name}</td>
                            <td class="material-desc-cell">${material.description}</td>
                            <td><input type="number" name="quantity_${product.id}_${material.id}" data-product-id="${product.id}" data-material-id="${material.id}" placeholder="0" min="0" required></td>
                            <td>${material.uom || '-'}</td>
                        `;
                        tbody.appendChild(row);
                    });
                } catch (productError) {
                    console.error(`DEBUG: Error fetching materials for product ${product.id}:`, productError);
                    // Continue with other products instead of failing completely
                    continue;
                }
            }
            
            // Check if any rows were added
            const rows = tbody.querySelectorAll('tr');
            console.log(`DEBUG: Total rows added: ${rows.length}`);
            
            if (rows.length === 0) {
                formContainer.innerHTML = '<p class="error">No materials found for the selected products. Please try selecting different products.</p>';
            }
            
        } catch (error) {
            console.error('DEBUG: Error generating form:', error);
            formContainer.innerHTML = `<p class="error">Error loading materials: ${error.message}. Please try again.</p>`;
        }
    }
    
    async function checkExistingCountTags(countTags) {
        try {
            // Get existing count tags from the current page
            const existingCountTags = [];
            const existingRows = document.querySelectorAll('.WIP-table tbody tr');
            
            existingRows.forEach(row => {
                const countTagCell = row.querySelector('[data-field="count_tag"]');
                if (countTagCell && countTagCell.textContent.trim()) {
                    existingCountTags.push(countTagCell.textContent.trim());
                }
            });
            
            // Check for duplicates
            const duplicates = countTags.filter(tag => existingCountTags.includes(tag));
            return duplicates;
        } catch (error) {
            console.error('Error checking existing count tags:', error);
            return [];
        }
    }

    async function submitRawMaterials() {
        const form = document.getElementById('raw-entry-form');
        clearValidationErrors();

        const entryRows = form.querySelectorAll('.WIP-entry-table tbody tr');
        let entries = [];
        let hasValidationErrors = false;

        entryRows.forEach(row => {
            const countTagInput = row.querySelector('input[name^="count_tag"]');
            const quantityInput = row.querySelector('input[name^="quantity"]');
            
            const countTag = countTagInput.value.trim();
            const quantity = quantityInput.value.trim();

            // Check if row is completely empty (ignore these)
            if (!countTag && !quantity) {
                return; // Skip this row entirely
            }

            // Check if row is partially filled (validate these)
            if ((countTag && !quantity) || (!countTag && quantity)) {
                hasValidationErrors = true;
                if (!countTag) {
                    addValidationError(countTagInput, 'Count tag is required when WIP Qty is filled.');
                }
                if (!quantity) {
                    addValidationError(quantityInput, 'WIP Qty is required when Count Tag is filled.');
                }
                return; // Skip this row for submission
            }

            // Row is completely filled (valid entry)
            if (countTag && quantity) {
                entries.push({
                    product_id: row.querySelector('input[name^="count_tag"]').dataset.productId,
                    material_id: row.querySelector('input[name^="count_tag"]').dataset.materialId,
                    count_tag: countTag,
                    quantity: quantity
                });
            }
        });

        // Only show validation error if there are partially filled rows
        if (hasValidationErrors) {
            showToast('Please complete all fields in the highlighted rows or leave them completely empty.', 'error');
            return;
        }

        // Check if we have any valid entries to submit
        if (entries.length === 0) {
            showToast('Please add at least one complete entry (both Count Tag and WIP Quantity).', 'error');
            return;
        }
        
        saveState();

        try {
            const response = await fetch(`/wip-inventory/session/${window.sessionId}/add-raw-materials/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ entries })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Raw materials added successfully.', 'success');
                closeAllModals();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(data.message || 'An error occurred.', 'error');
            }
        } catch (error) {
            console.error('Error submitting raw materials:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                sessionId: window.sessionId,
                url: `/wip-inventory/session/${window.sessionId}/add-raw-materials/`
            });
            
            // Provide more specific error messages
            if (error.message.includes('404')) {
                showToast('Server endpoint not found. Please try refreshing the page or contact support.', 'error');
            } else if (error.message.includes('403')) {
                showToast('Access denied. You may not have permission to perform this action.', 'error');
            } else if (error.message.includes('500')) {
                showToast('Server error occurred. Please try again later.', 'error');
            } else {
                showToast('An error occurred while adding raw materials: ' + error.message, 'error');
            }
        }
    }
    
    function addValidationError(input, message) {
        if (!input) {
            console.warn('addValidationError called with null input. Message:', message);
            return;
        }
        input.classList.add('validation-error');
        input.style.borderColor = '#f14668';
        input.style.boxShadow = '0 0 0 2px rgba(241, 70, 104, 0.2)';
        input.title = message;
        input.addEventListener('input', function() {
            clearValidationError(this);
        });
        input.addEventListener('focus', function() {
            clearValidationError(this);
        });
    }
    
    function clearValidationError(input) {
        input.classList.remove('validation-error');
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.title = '';
    }
    
    function clearValidationErrors() {
        console.log('DEBUG: clearValidationErrors called');
        const form = document.getElementById('raw-entry-form');
        const inputs = form.querySelectorAll('input');
        console.log('DEBUG: Found inputs to clear:', inputs.length);
        inputs.forEach((input, index) => {
            console.log(`DEBUG: Clearing validation for input ${index}:`, input.name, input.value);
            clearValidationError(input);
        });
    }
    
    function openFinishedProductsModal() {
        selectedProducts = [];
        // Only setup the modal once, not every time it opens
        if (!finishedProductsModal.dataset.initialized) {
            setupFinishedProductsModal();
            finishedProductsModal.dataset.initialized = 'true';
        }
        openModal(finishedProductsModal);
    }
    
    function setupFinishedProductsModal() {
        const productList = document.getElementById('finished-product-list');
        const searchInput = document.getElementById('finished-product-search');
        const nextBtn = document.getElementById('finished-next-btn');
        const backBtn = document.getElementById('finished-back-btn');
        const submitBtn = document.getElementById('finished-submit-btn');
        
        renderProductList(productList, 'finished');
        
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredProducts = allProducts.filter(product =>
                product.product_number.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
            renderProductList(productList, 'finished', filteredProducts);
        });
        
        nextBtn.addEventListener('click', function() {
            if (selectedProducts.length === 0) {
                showToast('Please select at least one product', 'warning');
                return;
            }
            
            showFinishedProductsStep2();
        });
        
        backBtn.addEventListener('click', function() {
            showFinishedProductsStep1();
        });
        
        submitBtn.addEventListener('click', function() {
            submitFinishedProducts();
        });
    }
    
    function showFinishedProductsStep2() {
        document.getElementById('finished-step-1').style.display = 'none';
        document.getElementById('finished-step-2').style.display = 'block';
        document.getElementById('finished-next-btn').style.display = 'none';
        document.getElementById('finished-back-btn').style.display = 'inline-flex';
        document.getElementById('finished-submit-btn').style.display = 'inline-flex';
        
        generateFinishedProductsForm();
    }
    
    function showFinishedProductsStep1() {
        document.getElementById('finished-step-1').style.display = 'block';
        document.getElementById('finished-step-2').style.display = 'none';
        document.getElementById('finished-next-btn').style.display = 'inline-flex';
        document.getElementById('finished-back-btn').style.display = 'none';
        document.getElementById('finished-submit-btn').style.display = 'none';
    }
    
    function generateFinishedProductsForm() {
        const formContainer = document.getElementById('finished-entry-form');
        
        const tableHTML = `
            <table class="WIP-entry-table">
                <thead>
                    <tr>
                        <th>Count Tag</th>
                        <th>Product Number</th>
                        <th>Description</th>
                        <th>WIP Qty</th>
                    </tr>
                </thead>
                <tbody id="finished-entries-tbody">
                </tbody>
            </table>
        `;
        
        formContainer.innerHTML = tableHTML;
        const tbody = document.getElementById('finished-entries-tbody');
        
        selectedProducts.forEach(product => {
            const row = document.createElement('tr');
            row.dataset.productId = product.id;
            row.innerHTML = `
                <td>
                    <input type="number" name="count_tag_${product.id}" class="WIP-input" placeholder="Enter count tag" min="0">
                </td>
                <td>${product.product_number}</td>
                <td>${product.description}</td>
                <td>
                    <input type="number" name="quantity_${product.id}" class="WIP-input" placeholder="0" min="0">
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async function submitFinishedProducts() {
        const form = document.getElementById('finished-entry-form');
        clearFinishedValidationErrors();

        const entryRows = form.querySelectorAll('.WIP-entry-table tbody tr');
        let entries = [];
        let hasValidationErrors = false;
        
        entryRows.forEach(row => {
            const countTagInput = row.querySelector('input[name^="count_tag"]');
            const quantityInput = row.querySelector('input[name^="quantity"]');
            
            const countTag = countTagInput.value.trim();
            const quantity = quantityInput.value.trim();

            // Check if row is completely empty (ignore these)
            if (!countTag && !quantity) {
                return; // Skip this row entirely
            }

            // Check if row is partially filled (validate these)
            if ((countTag && !quantity) || (!countTag && quantity)) {
                hasValidationErrors = true;
                if (!countTag) {
                    addValidationError(countTagInput, 'Count tag is required when WIP Qty is filled.');
                }
                if (!quantity) {
                    addValidationError(quantityInput, 'WIP Qty is required when Count Tag is filled.');
                }
                return; // Skip this row for submission
            }

            // Row is completely filled (valid entry)
            if (countTag && quantity) {
                entries.push({
                    product_id: row.dataset.productId,
                    count_tag: countTag,
                    quantity: quantity
                });
            }
        });

        // Only show validation error if there are partially filled rows
        if (hasValidationErrors) {
            showToast('Please complete all fields in the highlighted rows or leave them completely empty.', 'error');
            return;
        }

        // Check if we have any valid entries to submit
        if (entries.length === 0) {
            showToast('Please add at least one complete entry (both Count Tag and WIP Quantity).', 'error');
            return;
        }

        saveState();

        try {
            const response = await fetch(`/wip-inventory/session/${window.sessionId}/add-finished-products/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ entries })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Finished products added successfully.', 'success');
                closeAllModals();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(data.message || 'An error occurred.', 'error');
            }
        } catch (error) {
            console.error('Error submitting finished products:', error);
            showToast('An error occurred while adding finished products', 'error');
        }
    }
    
    function clearFinishedValidationErrors() {
        const form = document.getElementById('finished-entry-form');
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            clearValidationError(input);
        });
    }
    
    function openWIPProductsModal() {
        // Only setup the modal once, not every time it opens
        if (!wipProductsModal.dataset.initialized) {
            setupWIPProductsModal();
            wipProductsModal.dataset.initialized = 'true';
        }
        openModal(wipProductsModal);
    }
    
    function setupWIPProductsModal() {
        const productSelect = document.getElementById('wip-product-select');
        const processSelect = document.getElementById('wip-process-select');
        const materialsList = document.getElementById('wip-materials-list');
        const submitBtn = document.getElementById('wip-submit-btn');
        
        productSelect.innerHTML = '<option value="">Select Product</option>';
        allProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.product_number;
            productSelect.appendChild(option);
        });
        
        // Fetch and populate all processes on modal open
        fetch('/wip-inventory/api/processes/')
            .then(response => response.json())
            .then(data => {
                processSelect.innerHTML = '<option value="">Select Process</option>';
                data.processes.forEach(process => {
                    const option = document.createElement('option');
                    option.value = process.id;
                    option.textContent = process.process_name;
                    processSelect.appendChild(option);
                });
            });

        productSelect.addEventListener('change', async function() {
            const productId = this.value;
            materialsList.innerHTML = '';

            if (!productId) {
                // Show empty state message if no product selected
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'WIP-materials-list-empty';
                emptyMsg.textContent = 'No product selected. Please select a product to view materials.';
                materialsList.appendChild(emptyMsg);
                return;
            }

            try {
                const materialsResponse = await fetch(`/wip-inventory/api/materials/?product_id=${productId}&type=wip`);
                const materialsData = await materialsResponse.json();

                if (!materialsData.materials || materialsData.materials.length === 0) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.className = 'WIP-materials-list-empty';
                    emptyMsg.textContent = 'No materials found for this product.';
                    materialsList.appendChild(emptyMsg);
                    return;
                }

                // Render as table
                const table = document.createElement('table');
                table.className = 'JO-table';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="select-all-materials"></th>
                            <th>Material Name</th>
                            <th>Description</th>
                            <th>Cutting Length</th>
                            <th>UOM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materialsData.materials.map(material => `
                            <tr>
                                <td><input type="checkbox" class="material-checkbox" value="${material.id}"></td>
                                <td>${material.material_name}</td>
                                <td>${material.description || ''}</td>
                                <td>${material.cutting_length != null ? material.cutting_length : ''}</td>
                                <td>${material.uom || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;
                materialsList.appendChild(table);

                // Select all checkbox logic
                const selectAll = table.querySelector('#select-all-materials');
                if (selectAll) {
                    selectAll.addEventListener('change', function() {
                        table.querySelectorAll('.material-checkbox').forEach(cb => {
                            cb.checked = selectAll.checked;
                        });
                    });
                }
            } catch (error) {
                console.error('Error loading materials:', error);
            }
        });
        
        // Show empty state on modal open if no product is selected
        if (!productSelect.value) {
            materialsList.innerHTML = '';
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'WIP-materials-list-empty';
            emptyMsg.textContent = 'No product selected. Please select a product to view materials.';
            materialsList.appendChild(emptyMsg);
        }
        
        submitBtn.addEventListener('click', function() {
            submitWIPProducts();
        });
    }
    
    async function submitWIPProducts() {
        const productId = document.getElementById('wip-product-select').value;
        const processId = document.getElementById('wip-process-select').value;
        const countTag = document.getElementById('wip-count-tag').value;
        const quantity = document.getElementById('wip-quantity').value;
        const selectedMaterials = Array.from(document.querySelectorAll('#wip-materials-list input[type="checkbox"]:checked')).map(cb => cb.value);

        // Simple validation
        if (!productId || !processId || !countTag || !quantity || selectedMaterials.length === 0) {
            showToast('Please fill out all fields and select at least one material.', 'error');
            return;
        }

        const data = {
            product_id: productId,
            process_id: processId,
            material_ids: selectedMaterials,
            count_tag: countTag,
            quantity: quantity,
        };

        saveState();

        try {
            const response = await fetch(`/wip-inventory/session/${window.sessionId}/add-wip-products/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            
            const dataResponse = await response.json();
            
            if (dataResponse.success) {
                showToast(dataResponse.message, 'success');
                closeAllModals();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(dataResponse.message, 'error');
            }
        } catch (error) {
            console.error('Error submitting WIP products:', error);
            showToast('An error occurred while adding WIP products', 'error');
        }
    }
    
    function makeRowEditable(row, entryId) {
        const editableCells = row.querySelectorAll('.WIP-editable-cell');
        const actionsCell = row.querySelector('td:last-child');
        // Patch: Only allow edit if canEditEntry returns true for this row's status
        const statusCell = row.querySelector('td[data-label="Status"] span, td[data-label="Status"]');
        let entryStatus = '';
        if (statusCell) {
            entryStatus = statusCell.textContent.trim().toUpperCase();
        }
        if (typeof window.canEditEntry === 'function' && !window.canEditEntry(entryStatus)) {
            showToast('You do not have permission to edit this entry.', 'error');
            return;
        }
        editableCells.forEach(cell => {
            const field = cell.getAttribute('data-field');
            const currentValue = cell.textContent.trim();
            if (field === 'count_tag') {
                cell.innerHTML = `<input type="text" value="${currentValue}" class="WIP-inline-input">`;
            } else if (field === 'quantity') {
                cell.innerHTML = `<input type="number" value="${currentValue}" min="0" class="WIP-inline-input">`;
            }
        });
        actionsCell.innerHTML = `
            <button class="JO-icon-button WIP-save-btn" data-id="${entryId}">
                <i class="fas fa-check"></i>
            </button>
            <button class="JO-icon-button WIP-cancel-btn">
                <i class="fas fa-times"></i>
            </button>
        `;
        const saveBtn = actionsCell.querySelector('.WIP-save-btn');
        const cancelBtn = actionsCell.querySelector('.WIP-cancel-btn');
        saveBtn.addEventListener('click', function() {
            saveEntry(entryId, row);
        });
        cancelBtn.addEventListener('click', function() {
            window.location.reload();
        });
    }
    
    async function saveEntry(entryId, row) {
        const originalContent = row.innerHTML;
        const countTagEl = row.querySelector('[data-field="count_tag"] input');
        const quantityEl = row.querySelector('[data-field="quantity"] input');

        const data = {
            count_tag: countTagEl.value,
            quantity: quantityEl.value
        };

        saveState();

        try {
            const response = await fetch(`/wip-inventory/entry/${entryId}/update/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            
            const dataResponse = await response.json();
            
            if (dataResponse.success) {
                showToast(dataResponse.message, 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(dataResponse.message, 'error');
                // Revert UI changes on failure
                row.innerHTML = originalContent;
                // Re-attach event listener to the edit button
                row.querySelector('.WIP-edit-entry-btn').addEventListener('click', function() {
                    makeRowEditable(row, entryId);
                });
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            showToast('An error occurred while saving the entry', 'error');
        }
    }
    
    async function deleteEntry(entryId) {
        try {
            const response = await fetch(`/wip-inventory/entry/${entryId}/delete/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast(data.message, 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
            showToast('An error occurred while deleting the entry', 'error');
        }
    }
    
    async function getSession() {
        const confirmBtn = document.getElementById('confirm-check');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<div class="loading-spinner"></div> Getting...';
        confirmBtn.disabled = true;
        
        try {
            const response = await fetch(`/wip-inventory/check-session/${window.sessionId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast(data.message, 'success');
                closeModal(checkSessionModal);
                setTimeout(() => {
                    window.location.href = '/wip-inventory/';
                }, 1000);
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error getting session:', error);
            showToast('An error occurred while getting the session', 'error');
        } finally {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
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
            modal.classList.remove('large-modal');
            document.body.style.overflow = '';
        }, 300);
    }
    
    function closeAllModals() {
        document.querySelectorAll('.JO-modal.active').forEach(modal => {
            closeModal(modal);
        });
    }
    
    function getCsrfToken() {
        const tokenInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (!tokenInput) {
            showToast('CSRF token not found. Please refresh the page or contact admin.', 'error');
            throw new Error('CSRF token not found');
        }
        return tokenInput.value;
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
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            removeToast(toast);
        }, 3000);
    }
    
    function removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }
    
    // Add CSS for larger modal and table
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
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .WIP-inline-input {
            width: 100%;
            padding: 4px 8px;
            border: 1px solid var(--wip-primary);
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .WIP-inline-input:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(51, 102, 255, 0.2);
        }
        
        .WIP-save-btn {
            color: var(--wip-success);
        }
        
        .WIP-save-btn:hover {
            background-color: var(--wip-success-light);
        }
        
        .WIP-cancel-btn {
            color: var(--wip-danger);
        }
        
        .WIP-cancel-btn:hover {
            background-color: var(--wip-danger-light);
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

        .JO-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(30, 30, 30, 0.32);
            z-index: 1100;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
            padding: 20px;
            box-sizing: border-box;
        }

        .JO-modal.active {
            display: flex !important;
        }

        .JO-modal-content {
            background: var(--wip-card-bg);
            border-radius: 18px;
            box-shadow: var(--wip-shadow-hover);
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            margin: auto;
            animation: modalSlideIn 0.3s ease-out;
        }

        .JO-modal-header {
            padding: 20px;
            border-bottom: 1px solid var(--wip-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: var(--wip-card-bg);
            z-index: 1;
            border-radius: 18px 18px 0 0;
        }

        .JO-modal-header h2 {
            font-size: 1.2rem;
            font-weight: 600;
            margin: 0;
            color: var(--wip-text);
        }

        .JO-modal-close {
            background: none;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--wip-text-light);
            transition: var(--wip-transition);
        }

        .JO-modal-close:hover {
            background-color: var(--wip-primary-light);
            color: var(--wip-primary);
        }

        .JO-modal-body {
            padding: 20px;
            overflow-y: auto;
        }

        .JO-modal-footer {
            padding: 20px;
            border-top: 1px solid var(--wip-border);
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            position: sticky;
            bottom: 0;
            background: var(--wip-card-bg);
            z-index: 1;
            border-radius: 0 0 18px 18px;
        }

        .JO-modal-content.normal-modal {
            max-width: 350px;
            width: 100%;
        }

        .JO-modal-content.large-modal {
            max-width: 900px;
            width: 90vw;
            min-width: 700px;
            min-height: 480px;
        }

        @media (max-width: 1000px) {
            .JO-modal-content.large-modal {
                width: 95vw !important;
                min-width: unset;
                min-height: 60vh;
            }
        }

        .WIP-entry-table.large-table {
            min-height: 320px;
            font-size: 1.08rem;
        }

        .WIP-status {
            display: inline-flex;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .WIP-status-pending {
            background-color: var(--jo-yellow-light);
            color: var(--jo-status-pending);
        }

        .WIP-status-approved {
            background-color: var(--jo-green-light);
            color: var(--jo-status-approved);
        }

        .WIP-status-rejected {
            background-color: var(--jo-orange-light);
            color: var(--jo-status-rejected);
        }

        .WIP-status-completed {
            background-color: var(--jo-primary-light);
            color: var(--jo-status-completed);
        }

        #raw-entry-form {
            min-height: 340px;
        }

        .material-name-cell, .material-desc-cell {
            font-weight: normal !important;
            font-size: 1rem !important;
            word-break: break-word;
        }

        .validation-error {
            border-color: #f14668 !important;
            box-shadow: 0 0 0 2px rgba(241, 70, 104, 0.2) !important;
            animation: shake 0.2s linear 1;
        }
        @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-3px); }
            50% { transform: translateX(3px); }
            75% { transform: translateX(-3px); }
            100% { transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);

    // Add new functions for scroll position management
    function saveState() {
        const activeTab = document.querySelector('.WIP-tab-btn.active');
        if (activeTab) {
            sessionStorage.setItem('wipDetailActiveTab', activeTab.dataset.tab);
        }
        sessionStorage.setItem('wipDetailScrollPosition', window.scrollY);
    }

    function restoreState() {
        const activeTabId = sessionStorage.getItem('wipDetailActiveTab');
        if (activeTabId) {
            const tabToActivate = document.querySelector(`.WIP-tab-btn[data-tab="${activeTabId}"]`);
            if (tabToActivate) {
                document.querySelectorAll('.WIP-tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                document.querySelectorAll('.WIP-tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                tabToActivate.classList.add('active');
                tabToActivate.setAttribute('aria-selected', 'true');
                const contentToShow = document.getElementById(`tab-${activeTabId}`);
                if (contentToShow) {
                    contentToShow.style.display = 'block';
                }
            }
            sessionStorage.removeItem('wipDetailActiveTab');
        }
        const scrollPosition = sessionStorage.getItem('wipDetailScrollPosition');
        if (scrollPosition) {
            setTimeout(() => {
                window.scrollTo(0, parseInt(scrollPosition, 10));
                sessionStorage.removeItem('wipDetailScrollPosition');
            }, 100);
        }
    }

    function debounce(func, wait) {
        let timeout;

        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };

            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function setupCheckingCompleteModal() {
        // Prevent multiple setups
        if (document.getElementById('checking-complete-modal-setup')) {
            return;
        }
        
        const checkingCompleteBtn = document.getElementById('checking-complete-btn');
        const checkingCompleteModal = document.getElementById('checking-complete');
        const cancelBtn = document.getElementById('cancel-checking-complete');
        const closeBtn = checkingCompleteModal ? checkingCompleteModal.querySelector('.JO-modal-close') : null;
        const confirmBtn = document.getElementById('confirm-checking-complete');

        console.log('Setup checking complete modal:');
        console.log('Button found:', checkingCompleteBtn);
        console.log('Modal found:', checkingCompleteModal);
        console.log('Cancel btn found:', cancelBtn);
        console.log('Close btn found:', closeBtn);
        console.log('Confirm btn found:', confirmBtn);

        // Only use the button found by ID, don't fallback to class selector
        if (checkingCompleteBtn && checkingCompleteModal) {
            // Remove any existing event listeners
            const newBtn = checkingCompleteBtn.cloneNode(true);
            checkingCompleteBtn.parentNode.replaceChild(newBtn, checkingCompleteBtn);
            
            newBtn.addEventListener('click', function(e) {
                console.log('Checking complete button clicked');
                e.preventDefault();
                e.stopPropagation();
                
                // Check if modal is already open
                if (checkingCompleteModal.style.display === 'flex' || checkingCompleteModal.classList.contains('active')) {
                    console.log('DEBUG: Modal is already open, not opening again');
                    return;
                }
                
                checkingCompleteModal.style.display = 'flex';
                checkingCompleteModal.classList.add('active');
                console.log('Modal display set to flex, active class added');
            });
        } else {
            console.error('Button or modal not found:', { button: checkingCompleteBtn, modal: checkingCompleteModal });
        }
        
        if (cancelBtn && checkingCompleteModal) {
            cancelBtn.addEventListener('click', function() {
                checkingCompleteModal.style.display = 'none';
                checkingCompleteModal.classList.remove('active');
            });
        }
        if (closeBtn && checkingCompleteModal) {
            closeBtn.addEventListener('click', function() {
                checkingCompleteModal.style.display = 'none';
                checkingCompleteModal.classList.remove('active');
            });
        }
        if (confirmBtn && checkingCompleteModal) {
            confirmBtn.addEventListener('click', async function() {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<div class="loading-spinner"></div> Marking...';
                try {
                    const response = await fetch(`/wip-inventory/session/${window.sessionId}/checking-complete/`, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCsrfToken(),
                            'Content-Type': 'application/json'
                        }
                    });
                    const data = await response.json();
                    if (data.success && data.redirect_url) {
                        showToast('Session marked as checked!', 'success');
                        setTimeout(() => {
                            window.location.href = data.redirect_url;
                        }, 800);
                    } else {
                        showToast(data.message || 'Failed to mark as checked.', 'error');
                    }
                } catch (error) {
                    showToast('An error occurred.', 'error');
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = 'Mark as Checked';
                }
            });
        }
        
        // Mark as setup to prevent multiple setups
        const setupMarker = document.createElement('div');
        setupMarker.id = 'checking-complete-modal-setup';
        setupMarker.style.display = 'none';
        document.body.appendChild(setupMarker);
    }

    function checkForCompletion() {
        console.log('DEBUG: checkForCompletion called');
        
        // Check if all entries are checked
        const uncheckedButtons = document.querySelectorAll('.WIP-mark-checked-btn');
        const checkingCompleteBtn = document.getElementById('checking-complete-btn');
        
        console.log('DEBUG: Found unchecked buttons:', uncheckedButtons.length);
        console.log('DEBUG: Checking complete button:', checkingCompleteBtn);
        
        if (uncheckedButtons.length === 0 && checkingCompleteBtn) {
            // All entries are checked, enable the complete button
            console.log('DEBUG: All entries checked, enabling complete button');
            checkingCompleteBtn.disabled = false;
            checkingCompleteBtn.classList.remove('disabled');
        } else if (checkingCompleteBtn) {
            // Some entries are still unchecked, disable the complete button
            console.log('DEBUG: Some entries still unchecked, disabling complete button');
            checkingCompleteBtn.disabled = true;
            checkingCompleteBtn.classList.add('disabled');
        }
    }

    function setupTabs() {
        const tabBtns = document.querySelectorAll('.WIP-tab-btn');
        const tabContents = document.querySelectorAll('.WIP-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;

                // Deactivate all
                tabBtns.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tabContents.forEach(c => c.style.display = 'none');

                // Activate clicked
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                document.getElementById(`tab-${tabId}`).style.display = 'block';
            });
        });
    }
});