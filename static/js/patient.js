// Autocomplete search functionality
const searchInput = document.getElementById('medicine-search');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
let searchTimeout;

// Search as user types
searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (query.length === 0) {
        autocompleteDropdown.style.display = 'none';
        return;
    }
    
    // Debounce search requests
    searchTimeout = setTimeout(() => {
        searchMedicines(query);
    }, 200);
});

// Search medicines via API
function searchMedicines(query) {
    fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(medicines => {
            displayAutocomplete(medicines);
        })
        .catch(error => {
            console.error('Error searching medicines:', error);
        });
}

// Display autocomplete suggestions
function displayAutocomplete(medicines) {
    autocompleteDropdown.innerHTML = '';
    
    if (medicines.length === 0) {
        autocompleteDropdown.style.display = 'none';
        return;
    }
    
    medicines.forEach(medicine => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = medicine.name;
        item.onclick = function() {
            showMedicineDetails(medicine.id);
            searchInput.value = medicine.name;
            autocompleteDropdown.style.display = 'none';
        };
        autocompleteDropdown.appendChild(item);
    });
    
    autocompleteDropdown.style.display = 'block';
}

// Close autocomplete when clicking outside
document.addEventListener('click', function(event) {
    if (!searchInput.contains(event.target) && !autocompleteDropdown.contains(event.target)) {
        autocompleteDropdown.style.display = 'none';
    }
});

// Show medicine details
function showMedicineDetails(medicineId) {
    fetch(`/api/medicines/${medicineId}`)
        .then(response => response.json())
        .then(medicine => {
            displayMedicineDetails(medicine);
            openMedicineModal();
        })
        .catch(error => {
            console.error('Error fetching medicine details:', error);
            alert('Error loading medicine details');
        });
}

// Display medicine details
function displayMedicineDetails(medicine) {
    const detailsContainer = document.getElementById('modal-medicine-details');
    const lowStockClass = medicine.quantity < 18 ? 'low-stock' : '';
    
    detailsContainer.innerHTML = `
        <h2>${medicine.name}</h2>
        <div class="medicine-info">
            <p><strong>Quantity:</strong> <span class="${lowStockClass}">${medicine.quantity} strips</span></p>
            <p><strong>Status:</strong> 
                ${medicine.available 
                    ? '<span class="status-available">Available</span>' 
                    : '<span class="status-unavailable">Not Available</span>'}
            </p>
            ${medicine.quantity < 18 
                ? '<p class="low-stock-warning">⚠️ Warning: Low Stock! Less than 18 strips remaining.</p>' 
                : ''}
            <div class="medicine-details">
                <h3>Details:</h3>
                <p>${medicine.details || 'No additional details available.'}</p>
            </div>
        </div>
    `;
}

// Open medicine modal
function openMedicineModal() {
    const modal = document.getElementById('medicine-modal');
    modal.style.display = 'block';
}

// Close medicine modal
function closeMedicineModal() {
    const modal = document.getElementById('medicine-modal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('medicine-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

