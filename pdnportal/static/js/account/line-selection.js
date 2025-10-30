// Line selection and Default Line functionality
// This script keeps the Default Line selects in sync with the checkbox selections
document.addEventListener('DOMContentLoaded', function() {
    // Add User Modal
    const linesContainer = document.getElementById('lines-container');
    const defaultLineSelect = document.getElementById('user_default_line');

    // Edit User Modal
    const editLinesContainer = document.getElementById('edit-lines-container');
    const editDefaultLineSelect = document.getElementById('default_line');

    // Function to handle line selection changes for Add User modal
    function setupAddUserLineSelection() {
        if (!linesContainer || !defaultLineSelect) return;

        // Initially disable the Default Line dropdown
        defaultLineSelect.disabled = true;

        // Update Default Line options based on selected lines
        function updateDefaultLineOptions() {
            // Clear existing options
            defaultLineSelect.innerHTML = '<option value="">Select a default line</option>';

            // Get all selected lines
            const selectedLines = linesContainer.querySelectorAll('input[type="checkbox"]:checked');

            // Enable/disable the select based on whether there are any selected lines
            defaultLineSelect.disabled = selectedLines.length === 0;

            // Add options for each selected line
            selectedLines.forEach(checkbox => {
                const lineId = checkbox.value;
                const label = checkbox.nextElementSibling;
                const lineName = label ? label.textContent.trim() : checkbox.value;
                const option = new Option(lineName, lineId);
                defaultLineSelect.add(option);
            });

            // If only one line is selected, automatically select it as default
            if (selectedLines.length === 1) {
                defaultLineSelect.value = selectedLines[0].value;
            }
        }

        // Expose so other scripts can trigger an update after programmatic changes
        window.updateAddDefaultLineOptions = updateDefaultLineOptions;

        // Add change event listeners to all checkboxes
        linesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', updateDefaultLineOptions);
        });

        // Initial sync in case some checkboxes are pre-checked
        updateDefaultLineOptions();
    }

    // Function to handle line selection changes for Edit User modal
    function setupEditUserLineSelection() {
        if (!editLinesContainer || !editDefaultLineSelect) return;

        // Initially disable the Default Line dropdown
        editDefaultLineSelect.disabled = true;

        // Update Default Line options based on selected lines
        function updateDefaultLineOptions() {
            // Clear existing options
            editDefaultLineSelect.innerHTML = '<option value="">Select a default line</option>';

            // Get all selected lines
            const selectedLines = editLinesContainer.querySelectorAll('input[type="checkbox"]:checked');

            // Enable/disable the select based on whether there are any selected lines
            editDefaultLineSelect.disabled = selectedLines.length === 0;

            // Add options for each selected line
            selectedLines.forEach(checkbox => {
                const lineId = checkbox.value;
                const label = checkbox.nextElementSibling;
                const lineName = label ? label.textContent.trim() : checkbox.value;
                const option = new Option(lineName, lineId);
                editDefaultLineSelect.add(option);
            });

            // If only one line is selected, automatically select it as default
            if (selectedLines.length === 1) {
                editDefaultLineSelect.value = selectedLines[0].value;
            }
        }

        // Expose so other scripts can trigger an update after programmatic changes
        window.updateEditDefaultLineOptions = updateDefaultLineOptions;

        // Add change event listeners to all checkboxes
        editLinesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', updateDefaultLineOptions);
        });

        // Initial sync in case some checkboxes are pre-checked
        updateDefaultLineOptions();
    }

    // Set up line selection for both modals
    setupAddUserLineSelection();
    setupEditUserLineSelection();
});