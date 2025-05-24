// DCF No Results Handler

document.addEventListener('DOMContentLoaded', function() {
    // Initialize search and filter functionality for requestor page
    initializeRequestorSearch();

    // Initialize search and filter functionality for approver page
    initializeApproverSearch();
});

// Requestor page search and filter
function initializeRequestorSearch() {
    const searchInput = document.querySelector('.DCF-all-dcfs .DCF-search-input');
    const filterSelect = document.querySelector('.DCF-all-dcfs .DCF-filter-select');
    const tableBody = document.getElementById('dcf-table-body');
    const noResultsRow = document.getElementById('no-results-row');
    const pagination = document.getElementById('dcf-pagination');

    if (!searchInput || !filterSelect || !tableBody || !noResultsRow || !pagination) {
        return; // Not on the requestor page or elements not found
    }

    // Search functionality
    searchInput.addEventListener('input', function() {
        filterRequestorTable();
    });

    // Filter functionality
    filterSelect.addEventListener('change', function() {
        filterRequestorTable();
    });

    function filterRequestorTable() {
        const searchQuery = searchInput.value.toLowerCase();
        const statusFilter = filterSelect.value;
        const rows = Array.from(tableBody.querySelectorAll('tr')).filter(row =>
            !row.id || (row.id !== 'no-results-row' && !row.querySelector('.DCF-empty-table'))
        );

        let visibleRows = 0;

        rows.forEach(row => {
            // Skip the "No document change forms found" row and the no-results-row
            if (row.querySelector('.DCF-empty-table') || row.id === 'no-results-row') {
                return;
            }

            const dcfNumber = row.querySelector('td[data-label="DCF Number"]')?.textContent.toLowerCase() || '';
            const title = row.querySelector('td[data-label="Document Title"]')?.textContent.toLowerCase() || '';
            const code = row.querySelector('td[data-label="Document Code"]')?.textContent.toLowerCase() || '';
            const nature = row.querySelector('td[data-label="Nature"]')?.textContent.toLowerCase() || '';

            // Get status from the span element
            const statusElement = row.querySelector('td[data-label="Status"] .DCF-status');
            let rowStatus = '';

            if (statusElement) {
                if (statusElement.classList.contains('DCF-status-on_process')) rowStatus = 'on_process';
                else if (statusElement.classList.contains('DCF-status-approved')) rowStatus = 'approved';
                else if (statusElement.classList.contains('DCF-status-rejected')) rowStatus = 'rejected';
            }

            // Check if row matches both search query and status filter
            const matchesSearch = dcfNumber.includes(searchQuery) ||
                                 title.includes(searchQuery) ||
                                 code.includes(searchQuery) ||
                                 nature.includes(searchQuery);

            const matchesStatus = statusFilter === 'all' || rowStatus === statusFilter;

            if (matchesSearch && matchesStatus) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });

        // Show/hide no results message and pagination
        const tableContainer = tableBody.closest('.DCF-table-container');

        if (visibleRows === 0) {
            // Hide any empty state message
            const emptyStateRow = tableBody.querySelector('tr:has(.DCF-empty-table)');
            if (emptyStateRow && !emptyStateRow.id) {
                emptyStateRow.style.display = 'none';
            }

            // Show no results message
            noResultsRow.style.display = '';
            pagination.style.display = 'none';

            // Add class to table container and set overflow-y to hidden
            if (tableContainer) {
                tableContainer.classList.add('no-results-visible');
            }
        } else {
            noResultsRow.style.display = 'none';
            pagination.style.display = 'flex';

            // Remove class from table container and restore overflow-y
            if (tableContainer) {
                tableContainer.classList.remove('no-results-visible');
            }
        }
    }
}

// Approver page search and filter
function initializeApproverSearch() {
    // Pending approvals section
    initializePendingApprovalSearch();

    // Processed requests section
    initializeProcessedRequestsSearch();
}

function initializePendingApprovalSearch() {
    const searchInput = document.querySelector('.DCF-approval-requests .DCF-search-input');
    const filterSelect = document.querySelector('.DCF-approval-requests .DCF-filter-select');
    const tableBody = document.getElementById('pending-approvals-body');
    const noResultsRow = document.getElementById('pending-no-results-row');
    const pagination = document.getElementById('pending-pagination');

    if (!searchInput || !filterSelect || !tableBody || !noResultsRow || !pagination) {
        return; // Elements not found
    }

    // Search functionality
    searchInput.addEventListener('input', function() {
        filterPendingTable();
    });

    // Filter functionality
    filterSelect.addEventListener('change', function() {
        filterPendingTable();
    });

    function filterPendingTable() {
        const searchQuery = searchInput.value.toLowerCase();
        const filterValue = filterSelect.value;
        const rows = Array.from(tableBody.querySelectorAll('tr')).filter(row =>
            !row.id || (row.id !== 'pending-no-results-row' && !row.querySelector('.DCF-empty-table'))
        );

        let visibleRows = 0;

        rows.forEach(row => {
            // Skip the "No pending approval requests found" row and the no-results-row
            if (row.querySelector('.DCF-empty-table') || row.id === 'pending-no-results-row') {
                return;
            }

            const dcfNumber = row.querySelector('td[data-label="DCF Number"]')?.textContent.toLowerCase() || '';
            const requisitioner = row.querySelector('td[data-label="Requisitioner"]')?.textContent.toLowerCase() || '';
            const title = row.querySelector('td[data-label="Document Title"]')?.textContent.toLowerCase() || '';
            const code = row.querySelector('td[data-label="Document Code"]')?.textContent.toLowerCase() || '';

            // Check if row is urgent
            const isUrgent = row.classList.contains('DCF-urgent-row');

            // Apply filters based on the selected filter value
            let matchesFilter = true;
            if (filterValue === 'urgent' && !isUrgent) {
                matchesFilter = false;
            } else if (filterValue === 'my-department') {
                // This would need backend implementation to filter by department
                // For now, we'll just keep it true
                matchesFilter = true;
            } else if (filterValue === 'recent') {
                // This would need backend implementation to filter by recent date
                // For now, we'll just keep it true
                matchesFilter = true;
            }

            // Check if row matches search query
            const matchesSearch = dcfNumber.includes(searchQuery) ||
                                 requisitioner.includes(searchQuery) ||
                                 title.includes(searchQuery) ||
                                 code.includes(searchQuery);

            if (matchesSearch && matchesFilter) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });

        // Show/hide no results message and pagination
        const tableContainer = tableBody.closest('.DCF-table-container');

        if (visibleRows === 0) {
            // Hide any empty state message
            const emptyStateRow = tableBody.querySelector('tr:has(.DCF-empty-table)');
            if (emptyStateRow && !emptyStateRow.id) {
                emptyStateRow.style.display = 'none';
            }

            // Show no results message
            noResultsRow.style.display = '';
            pagination.style.display = 'none';

            // Add class to table container and set overflow-y to hidden
            if (tableContainer) {
                tableContainer.classList.add('no-results-visible');
            }
        } else {
            noResultsRow.style.display = 'none';
            pagination.style.display = 'flex';

            // Remove class from table container and restore overflow-y
            if (tableContainer) {
                tableContainer.classList.remove('no-results-visible');
            }
        }
    }
}

function initializeProcessedRequestsSearch() {
    const searchInput = document.querySelector('.DCF-processed-requests .DCF-search-input');
    const statusFilter = document.getElementById('processed-status-filter');
    const tableBody = document.getElementById('processed-approvals-body');
    const noResultsRow = document.getElementById('processed-no-results-row');

    if (!searchInput || !statusFilter || !tableBody || !noResultsRow) {
        return; // Elements not found
    }

    // Search functionality
    searchInput.addEventListener('input', function() {
        filterProcessedTable();
    });

    // Filter functionality
    statusFilter.addEventListener('change', function() {
        filterProcessedTable();
    });

    function filterProcessedTable() {
        const searchQuery = searchInput.value.toLowerCase();
        const filterValue = statusFilter.value;
        const rows = Array.from(tableBody.querySelectorAll('tr')).filter(row =>
            !row.id || (row.id !== 'processed-no-results-row' && !row.querySelector('.DCF-empty-table'))
        );

        let visibleRows = 0;

        rows.forEach(row => {
            // Skip the "No processed requests found" row and the no-results-row
            if (row.querySelector('.DCF-empty-table') || row.id === 'processed-no-results-row') {
                return;
            }

            const dcfNumber = row.querySelector('td[data-label="DCF Number"]')?.textContent.toLowerCase() || '';
            const requisitioner = row.querySelector('td[data-label="Requisitioner"]')?.textContent.toLowerCase() || '';
            const title = row.querySelector('td[data-label="Document Title"]')?.textContent.toLowerCase() || '';

            // Get status from the span element
            const statusElement = row.querySelector('td[data-label="Status"] .DCF-status');
            let rowStatus = '';

            if (statusElement) {
                if (statusElement.classList.contains('DCF-status-approved')) rowStatus = 'approved';
                else if (statusElement.classList.contains('DCF-status-rejected')) rowStatus = 'rejected';
            }

            // Check if row matches both search query and status filter
            const matchesSearch = dcfNumber.includes(searchQuery) ||
                                 requisitioner.includes(searchQuery) ||
                                 title.includes(searchQuery);

            const matchesStatus = filterValue === 'all' || rowStatus === filterValue;

            if (matchesSearch && matchesStatus) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });

        // Show/hide no results message
        const tableContainer = tableBody.closest('.DCF-table-container');

        if (visibleRows === 0) {
            // Hide any empty state message
            const emptyStateRow = tableBody.querySelector('tr:has(.DCF-empty-table)');
            if (emptyStateRow && !emptyStateRow.id) {
                emptyStateRow.style.display = 'none';
            }

            // Show no results message
            noResultsRow.style.display = '';

            // Add class to table container and set overflow-y to hidden
            if (tableContainer) {
                tableContainer.classList.add('no-results-visible');
            }
        } else {
            noResultsRow.style.display = 'none';

            // Remove class from table container and restore overflow-y
            if (tableContainer) {
                tableContainer.classList.remove('no-results-visible');
            }
        }
    }
}
