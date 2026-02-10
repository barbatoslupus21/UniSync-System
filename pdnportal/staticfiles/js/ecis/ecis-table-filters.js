/**
 * ECIS Registry - Table Filters JavaScript
 * Functionality for search and filter in ECIS tables
 */

// Debounce timer for search
let searchDebounceTimer = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize search and filter functionality
    initTableSearch();
    initStatusFilter();
    initCategoryFilter();
});

/**
 * Initialize search functionality for ECIS tables
 * Server-side search across all ECIS records
 */
function initTableSearch() {
    const searchInputs = document.querySelectorAll('.ecis-search-input');
    const searchButtons = document.querySelectorAll('.ecis-search-button');

    if (searchInputs.length && searchButtons.length) {
        // Add event listeners to search inputs
        searchInputs.forEach((searchInput, index) => {
            const searchButton = searchButtons[index];

            // Get current search query from URL and populate input
            const urlParams = new URLSearchParams(window.location.search);
            const currentSearch = urlParams.get('search') || '';
            if (currentSearch) {
                searchInput.value = currentSearch;
                searchInput.classList.add('has-text');
            }

            // Function to perform server-side search
            const performSearch = (immediate = false) => {
                // Clear any pending debounce
                if (searchDebounceTimer) {
                    clearTimeout(searchDebounceTimer);
                    searchDebounceTimer = null;
                }

                const doSearch = () => {
                    const searchTerm = searchInput.value.trim();
                    const url = new URL(window.location.href);
                    const currentUrlSearch = url.searchParams.get('search') || '';
                    
                    // Only reload if search term actually changed
                    if (searchTerm === currentUrlSearch) {
                        return;
                    }
                    
                    if (searchTerm) {
                        url.searchParams.set('search', searchTerm);
                    } else {
                        url.searchParams.delete('search');
                    }
                    
                    // Reset to page 1 when searching
                    url.searchParams.delete('page');
                    
                    // Navigate to the new URL
                    window.location.href = url.toString();
                };

                if (immediate) {
                    doSearch();
                } else {
                    // Debounce search for 500ms
                    searchDebounceTimer = setTimeout(doSearch, 500);
                }
            };

            // Add event listener to search button - immediate search
            searchButton.addEventListener('click', () => performSearch(true));

            // Add event listener for Enter key - immediate search
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch(true);
                    e.preventDefault();
                }
            });

            // Real-time search with debounce as user types
            searchInput.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    this.classList.add('has-text');
                    // Debounced search while typing
                    performSearch(false);
                } else {
                    this.classList.remove('has-text');
                    // If there was a previous search, clear it immediately
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('search')) {
                        performSearch(true);
                    }
                }
            });
        });
    }
}

/**
 * Initialize status filter functionality for ECIS tables
 */
function initStatusFilter() {
    const filterSelects = document.querySelectorAll('.ecis-filter-select');

    if (filterSelects.length) {
        filterSelects.forEach(filterSelect => {
            const tableContainer = filterSelect.closest('.ecis-card').querySelector('.ecis-table-container');

            if (!tableContainer) return;

            filterSelect.addEventListener('change', function() {
                const selectedStatus = this.value.toLowerCase();
                const table = tableContainer.querySelector('.ecis-table');

                if (!table) return;

                const rows = table.querySelectorAll('tbody tr');
                let hasVisibleRows = false;

                // Skip the empty row if it exists
                rows.forEach(row => {
                    if (row.querySelector('.ecis-empty-table')) return;

                    const rowStatus = row.getAttribute('data-status');
                    const rowCategory = row.getAttribute('data-category');

                    // Get the current category filter value
                    const categoryFilter = tableContainer.closest('.ecis-card').querySelector('.ecis-category-filter');
                    const selectedCategory = categoryFilter ? categoryFilter.value.toUpperCase() : 'ALL';

                    // Check if the row matches both status and category filters
                    const matchesStatus = selectedStatus === 'all' || rowStatus === selectedStatus;
                    const matchesCategory = selectedCategory === 'ALL' || rowCategory === selectedCategory;

                    if (matchesStatus && matchesCategory) {
                        row.style.display = '';
                        hasVisibleRows = true;
                    } else {
                        row.style.display = 'none';
                    }
                });

                // Get the current search term and category filter if any
                const searchInput = tableContainer.closest('.ecis-card').querySelector('.ecis-search-input');
                const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

                const categoryFilter = tableContainer.closest('.ecis-card').querySelector('.ecis-category-filter');
                const selectedCategory = categoryFilter ? categoryFilter.value.toUpperCase() : 'ALL';

                // Show appropriate empty state message
                showEmptyStateMessage(table, hasVisibleRows, searchTerm, selectedStatus, selectedCategory);

                // Update the pagination info if it exists
                updatePaginationInfo(tableContainer);
            });
        });
    }
}

/**
 * Update pagination info based on visible rows
 */
function updatePaginationInfo(tableContainer) {
    const paginationInfo = tableContainer.closest('.ecis-card').querySelector('.ecis-pagination-info');

    if (paginationInfo) {
        const table = tableContainer.querySelector('.ecis-table');
        const visibleRows = table.querySelectorAll('tbody tr:not([style*="display: none"]):not(.ecis-search-empty-row):not(.ecis-filter-empty-row)');
        const totalRows = table.querySelectorAll('tbody tr:not(.ecis-search-empty-row):not(.ecis-filter-empty-row)').length;

        // Update the pagination info
        const startIndex = visibleRows.length > 0 ? 1 : 0;
        const endIndex = visibleRows.length;

        paginationInfo.innerHTML = `Showing <span>${startIndex}-${endIndex}</span> of <span>${totalRows}</span> entries`;
    }
}

/**
 * Initialize category filter functionality for ECIS tables
 */
function initCategoryFilter() {
    const categoryFilters = document.querySelectorAll('.ecis-category-filter');

    if (categoryFilters.length) {
        categoryFilters.forEach(categoryFilter => {
            const tableContainer = categoryFilter.closest('.ecis-card').querySelector('.ecis-table-container');

            if (!tableContainer) return;

            categoryFilter.addEventListener('change', function() {
                const selectedCategory = this.value.toUpperCase();
                const table = tableContainer.querySelector('.ecis-table');

                if (!table) return;

                const rows = table.querySelectorAll('tbody tr');
                let hasVisibleRows = false;

                // Skip the empty row if it exists
                rows.forEach(row => {
                    if (row.querySelector('.ecis-empty-table')) return;

                    const rowCategory = row.getAttribute('data-category');

                    // We need to reset all rows first when changing category filter
                    // and then apply both status and category filters

                    // Get the current status filter
                    const statusFilter = tableContainer.closest('.ecis-card').querySelector('.ecis-filter-select');
                    const selectedStatus = statusFilter ? statusFilter.value.toLowerCase() : 'all';

                    // Check if the row matches both filters
                    const matchesStatus = selectedStatus === 'all' || row.getAttribute('data-status') === selectedStatus;
                    const matchesCategory = selectedCategory === 'ALL' || rowCategory === selectedCategory;

                    if (matchesStatus && matchesCategory) {
                        row.style.display = '';
                        hasVisibleRows = true;
                    } else {
                        row.style.display = 'none';
                    }
                });

                // Get the current search term and status filter if any
                const searchInput = tableContainer.closest('.ecis-card').querySelector('.ecis-search-input');
                const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

                const statusFilter = tableContainer.closest('.ecis-card').querySelector('.ecis-filter-select');
                const selectedStatus = statusFilter ? statusFilter.value.toLowerCase() : 'all';

                // Show appropriate empty state message
                showEmptyStateMessage(table, hasVisibleRows, searchTerm, selectedStatus, selectedCategory);

                // Update the pagination info if it exists
                updatePaginationInfo(tableContainer);
            });
        });
    }
}

/**
 * Show appropriate empty state message based on current filters and search
 */
function showEmptyStateMessage(table, hasVisibleRows, searchTerm = '', selectedStatus = 'all', selectedCategory = 'all') {
    console.log('showEmptyStateMessage called:', {
        table,
        hasVisibleRows,
        searchTerm,
        selectedStatus,
        selectedCategory,
        tableId: table.closest('.ecis-card').id || table.closest('.ecis-card').className
    });

    // Find the empty row that's part of the original table
    let emptyRow = null;
    const emptyTds = table.querySelectorAll('td.ecis-empty-table');
    for (const td of emptyTds) {
        if (td.parentElement && !td.parentElement.classList.contains('ecis-search-empty-row') &&
            !td.parentElement.classList.contains('ecis-filter-empty-row')) {
            emptyRow = td.parentElement;
            break;
        }
    }

    // Find existing empty rows that we've added
    const existingSearchEmptyRow = table.querySelector('.ecis-search-empty-row');
    const existingFilterEmptyRow = table.querySelector('.ecis-filter-empty-row');

    // Hide all empty state messages first
    if (existingSearchEmptyRow) existingSearchEmptyRow.style.display = 'none';
    if (existingFilterEmptyRow) existingFilterEmptyRow.style.display = 'none';
    if (emptyRow && emptyRow.parentElement) emptyRow.style.display = 'none';

    if (!hasVisibleRows) {
        const colspan = table.querySelector('thead th') ?
            table.querySelectorAll('thead th').length :
            (table.querySelector('tbody td[colspan]') ?
                parseInt(table.querySelector('tbody td[colspan]').getAttribute('colspan')) : 8);

        // Determine which empty state to show based on search and filters
        const hasSearchFilter = searchTerm !== '';
        const hasStatusFilter = selectedStatus !== 'all';
        const hasCategoryFilter = selectedCategory !== 'ALL';

        // Create filter description text
        let filterDescription = '';
        if (hasStatusFilter && hasCategoryFilter) {
            const statusText = `status "${selectedStatus}"`;
            const categoryText = `category "${selectedCategory}"`;
            filterDescription = `${statusText} and ${categoryText}`;
        } else if (hasStatusFilter) {
            filterDescription = `status "${selectedStatus}"`;
        } else if (hasCategoryFilter) {
            filterDescription = `category "${selectedCategory}"`;
        }

        if (hasSearchFilter && (hasStatusFilter || hasCategoryFilter)) {
            // Both search and at least one filter are active
            if (existingSearchEmptyRow) {
                existingSearchEmptyRow.style.display = '';
            } else {
                const newEmptyRow = document.createElement('tr');
                newEmptyRow.className = 'ecis-search-empty-row';
                newEmptyRow.innerHTML = `
                    <td colspan="${colspan}" class="ecis-empty-table">
                        <div class="ecis-no-data-message">
                            <i class="fas fa-search fa-2x"></i>
                            <p>No matching ECIS requests found</p>
                            <span>Try adjusting your search criteria or filter selections</span>
                        </div>
                    </td>
                `;
                const tbody = table.querySelector('tbody');
                console.log('Appending empty row to tbody:', tbody);
                tbody.appendChild(newEmptyRow);
            }
        } else if (hasSearchFilter) {
            // Only search is active
            if (existingSearchEmptyRow) {
                existingSearchEmptyRow.style.display = '';
            } else {
                const newEmptyRow = document.createElement('tr');
                newEmptyRow.className = 'ecis-search-empty-row';
                newEmptyRow.innerHTML = `
                    <td colspan="${colspan}" class="ecis-empty-table">
                        <div class="ecis-no-data-message">
                            <i class="fas fa-search fa-2x"></i>
                            <p>No matching ECIS requests found</p>
                            <span>Try adjusting your search criteria</span>
                        </div>
                    </td>
                `;
                const tbody = table.querySelector('tbody');
                console.log('Appending search empty row to tbody:', tbody);
                tbody.appendChild(newEmptyRow);
            }
        } else if (hasStatusFilter || hasCategoryFilter) {
            // At least one filter is active
            if (existingFilterEmptyRow) {
                existingFilterEmptyRow.style.display = '';
            } else {
                const newEmptyRow = document.createElement('tr');
                newEmptyRow.className = 'ecis-filter-empty-row';
                newEmptyRow.innerHTML = `
                    <td colspan="${colspan}" class="ecis-empty-table">
                        <div class="ecis-no-data-message">
                            <i class="fas fa-filter fa-2x"></i>
                            <p>No ECIS requests with ${filterDescription} found</p>
                            <span>Try selecting different filter options</span>
                        </div>
                    </td>
                `;
                const tbody = table.querySelector('tbody');
                console.log('Appending filter empty row to tbody:', tbody);
                tbody.appendChild(newEmptyRow);
            }
        } else {
            // No search or filter, show original empty row
            if (emptyRow && emptyRow.parentElement) {
                emptyRow.style.display = '';
            }
        }
    }
}
