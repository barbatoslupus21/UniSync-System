/**
 * ECIS Registry - Server-Side Search and Filters
 * Handles search bar and filter dropdowns with server-side queries
 */

document.addEventListener('DOMContentLoaded', function() {
    initServerSideSearch();
    initServerSideFilters();
});

/**
 * Initialize server-side search functionality
 */
function initServerSideSearch() {
    const searchInput = document.querySelector('#dcf-search');
    const searchButton = document.querySelector('.JO-search-button');
    
    if (!searchInput || !searchButton) return;

    let searchDebounceTimer = null;

    // Perform search
    const performSearch = (immediate = false) => {
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = null;
        }

        const doSearch = () => {
            const searchTerm = searchInput.value.trim();
            const url = new URL(window.location.href);
            const currentSearch = url.searchParams.get('search') || '';
            
            // Only reload if search term changed
            if (searchTerm === currentSearch) {
                return;
            }
            
            if (searchTerm) {
                url.searchParams.set('search', searchTerm);
            } else {
                url.searchParams.delete('search');
            }
            
            // Reset to page 1 when searching
            url.searchParams.delete('page');
            
            window.location.href = url.toString();
        };

        if (immediate) {
            doSearch();
        } else {
            // Debounce search for 500ms
            searchDebounceTimer = setTimeout(doSearch, 500);
        }
    };

    // Click search button - immediate search
    searchButton.addEventListener('click', () => performSearch(true));

    // Enter key - immediate search
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(true);
            e.preventDefault();
        }
    });

    // Real-time search with debounce as user types
    searchInput.addEventListener('input', function() {
        if (this.value.trim() !== '') {
            // Debounced search while typing
            performSearch(false);
        } else {
            // If there was a previous search, clear it immediately
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('search')) {
                performSearch(true);
            }
        }
    });
}

/**
 * Initialize server-side filters (status and category)
 */
function initServerSideFilters() {
    const statusFilter = document.querySelector('#status-filter');
    const categoryFilter = document.querySelector('#category-filter');

    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            const url = new URL(window.location.href);
            const selectedStatus = this.value;
            
            if (selectedStatus && selectedStatus !== 'all') {
                url.searchParams.set('status', selectedStatus);
            } else {
                url.searchParams.delete('status');
            }
            
            // Reset to page 1 when filtering
            url.searchParams.delete('page');
            
            window.location.href = url.toString();
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            const url = new URL(window.location.href);
            const selectedCategory = this.value;
            
            if (selectedCategory && selectedCategory !== 'all') {
                url.searchParams.set('category', selectedCategory);
            } else {
                url.searchParams.delete('category');
            }
            
            // Reset to page 1 when filtering
            url.searchParams.delete('page');
            
            window.location.href = url.toString();
        });
    }
}
