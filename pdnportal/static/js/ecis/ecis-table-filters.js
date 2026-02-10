/**
 * ECIS Registry - Table Filters JavaScript
 * Server-side search, filter, and AJAX pagination for ECIS tables
 */

// Debounce timer for search
let searchDebounceTimer = null;

document.addEventListener('DOMContentLoaded', function() {
    initTableSearch();
    initServerSideStatusFilter();
    initServerSideCategoryFilter();
    initAjaxPagination();
    syncFiltersFromUrl();
});

/**
 * Sync filter dropdowns with current URL params on page load
 */
function syncFiltersFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);

    const statusFilter = document.getElementById('status-filter');
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.querySelector('.ecis-search-input');

    if (statusFilter) {
        const statusVal = urlParams.get('status') || 'all';
        statusFilter.value = statusVal;
    }

    if (categoryFilter) {
        const categoryVal = urlParams.get('category') || 'all';
        categoryFilter.value = categoryVal;
    }

    if (searchInput) {
        const searchVal = urlParams.get('search') || '';
        if (searchVal) {
            searchInput.value = searchVal;
            searchInput.classList.add('has-text');
        }
    }
}

/**
 * Build the query string from current filter/search/page state
 */
function buildQueryParams(page) {
    const params = new URLSearchParams();

    const searchInput = document.querySelector('.ecis-search-input');
    const statusFilter = document.getElementById('status-filter');
    const categoryFilter = document.getElementById('category-filter');

    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    const categoryVal = categoryFilter ? categoryFilter.value : 'all';

    if (searchTerm) params.set('search', searchTerm);
    if (statusVal && statusVal !== 'all') params.set('status', statusVal);
    if (categoryVal && categoryVal !== 'all') params.set('category', categoryVal);
    if (page && page > 1) params.set('page', page);

    return params;
}

/**
 * Fetch filtered/paginated table content via AJAX and replace #ecis-table-wrapper
 */
function fetchTableContent(page) {
    const wrapper = document.getElementById('ecis-table-wrapper');
    if (!wrapper) return;

    const params = buildQueryParams(page);
    const url = window.location.pathname + (params.toString() ? '?' + params.toString() : '');

    // Update browser URL without reload
    history.replaceState(null, '', url);

    // Show loading state
    wrapper.style.opacity = '0.5';
    wrapper.style.pointerEvents = 'none';

    fetch(url, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.text())
    .then(html => {
        wrapper.innerHTML = html;
        wrapper.style.opacity = '1';
        wrapper.style.pointerEvents = '';

        // Re-bind pagination links inside the new content
        initAjaxPagination();

        // Re-initialize table row event listeners (details/review buttons)
        if (typeof initDetailsButtons === 'function') {
            initDetailsButtons();
        }
        if (typeof initReviewModal === 'function') {
            initReviewModal();
        }
    })
    .catch(error => {
        console.error('Error fetching table:', error);
        wrapper.style.opacity = '1';
        wrapper.style.pointerEvents = '';
    });
}

/**
 * Initialize search functionality – server-side via AJAX
 */
function initTableSearch() {
    const searchInputs = document.querySelectorAll('.ecis-search-input');
    const searchButtons = document.querySelectorAll('.ecis-search-button');

    if (searchInputs.length && searchButtons.length) {
        searchInputs.forEach((searchInput, index) => {
            const searchButton = searchButtons[index];

            // Perform AJAX search (reset to page 1)
            const performSearch = (immediate = false) => {
                if (searchDebounceTimer) {
                    clearTimeout(searchDebounceTimer);
                    searchDebounceTimer = null;
                }

                const doSearch = () => {
                    fetchTableContent(1);
                };

                if (immediate) {
                    doSearch();
                } else {
                    searchDebounceTimer = setTimeout(doSearch, 500);
                }
            };

            // Click search button
            searchButton.addEventListener('click', () => performSearch(true));

            // Enter key
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch(true);
                    e.preventDefault();
                }
            });

            // Real-time search with debounce
            searchInput.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    this.classList.add('has-text');
                } else {
                    this.classList.remove('has-text');
                }
                performSearch(false);
            });
        });
    }
}

/**
 * Initialize status filter – server-side via AJAX
 */
function initServerSideStatusFilter() {
    const statusFilter = document.getElementById('status-filter');
    if (!statusFilter) return;

    statusFilter.addEventListener('change', function() {
        fetchTableContent(1); // Reset to page 1 on filter change
    });
}

/**
 * Initialize category filter – server-side via AJAX
 */
function initServerSideCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;

    categoryFilter.addEventListener('change', function() {
        fetchTableContent(1); // Reset to page 1 on filter change
    });
}

/**
 * Initialize AJAX pagination – binds click handlers on .ecis-page-link elements
 */
function initAjaxPagination() {
    const wrapper = document.getElementById('ecis-table-wrapper');
    if (!wrapper) return;

    const pageLinks = wrapper.querySelectorAll('.ecis-page-link');
    pageLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) {
                fetchTableContent(parseInt(page));
                // Scroll to table top
                const allRequestsCard = document.querySelector('.ecis-all-requests');
                if (allRequestsCard) {
                    allRequestsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}
