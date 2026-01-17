// Add medicine form handler
document.getElementById('add-medicine-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const medicineData = {
        name: document.getElementById('medicine-name').value.trim(),
        quantity: parseInt(document.getElementById('medicine-quantity').value),
        available: document.getElementById('medicine-available').checked,
        details: document.getElementById('medicine-details').value.trim()
    };
    
    fetch('/api/medicines', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(medicineData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            alert('Medicine added successfully!');
            location.reload();
        }
    })
    .catch(error => {
        console.error('Error adding medicine:', error);
        alert('Error adding medicine');
    });
});

// Update availability toggle
document.querySelectorAll('.availability-toggle').forEach(toggle => {
    toggle.addEventListener('change', function() {
        const medicineId = this.dataset.id;
        const available = this.checked;
        
        fetch(`/api/medicines/${medicineId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ available: available })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error updating availability');
                this.checked = !available; // Revert toggle
            } else {
                const statusText = this.parentElement.querySelector('.status-text');
                statusText.textContent = available ? 'Available' : 'Not Available';
            }
        })
        .catch(error => {
            console.error('Error updating availability:', error);
            alert('Error updating availability');
            this.checked = !available; // Revert toggle
        });
    });
});

// Update quantity
function updateQuantity(medicineId) {
    const quantityInput = document.querySelector(`.quantity-input[data-id="${medicineId}"]`);
    const newQuantity = parseInt(quantityInput.value);
    
    if (isNaN(newQuantity) || newQuantity < 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    fetch(`/api/medicines/${medicineId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQuantity })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error updating quantity');
        } else {
            const quantityDisplay = document.querySelector(`.quantity-display[data-id="${medicineId}"]`);
            quantityDisplay.textContent = newQuantity;
            
            // Update low stock warning
            const medicineCard = document.querySelector(`.medicine-card[data-id="${medicineId}"]`);
            const quantityLine = quantityDisplay.parentElement;
            if (newQuantity < 18) {
                if (!medicineCard.classList.contains('low-stock')) {
                    medicineCard.classList.add('low-stock');
                }
                // Add or update low stock warning
                if (!quantityLine.querySelector('.low-stock-warning')) {
                    const warning = document.createElement('span');
                    warning.className = 'low-stock-warning';
                    warning.textContent = ' ⚠️ Low Stock!';
                    quantityLine.appendChild(warning);
                }
            } else {
                medicineCard.classList.remove('low-stock');
                const warning = quantityLine.querySelector('.low-stock-warning');
                if (warning) {
                    warning.remove();
                }
            }
            
            alert('Quantity updated successfully!');
        }
    })
    .catch(error => {
        console.error('Error updating quantity:', error);
        alert('Error updating quantity');
    });
}

// Delete medicine
function deleteMedicine(medicineId, medicineName) {
    if (!confirm(`Are you sure you want to delete "${medicineName}"?`)) {
        return;
    }
    
    fetch(`/api/medicines/${medicineId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            alert('Medicine deleted successfully!');
            location.reload();
        }
    })
    .catch(error => {
        console.error('Error deleting medicine:', error);
        alert('Error deleting medicine');
    });
}

// Edit medicine details
function editMedicine(medicineId) {
    fetch(`/api/medicines/${medicineId}`)
        .then(response => response.json())
        .then(medicine => {
            document.getElementById('edit-medicine-id').value = medicine.id;
            document.getElementById('edit-medicine-name').value = medicine.name;
            document.getElementById('edit-medicine-details').value = medicine.details;
            openEditModal();
        })
        .catch(error => {
            console.error('Error fetching medicine:', error);
            alert('Error loading medicine details');
        });
}

// Edit medicine form handler
document.getElementById('edit-medicine-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const medicineId = document.getElementById('edit-medicine-id').value;
    const medicineData = {
        name: document.getElementById('edit-medicine-name').value.trim(),
        details: document.getElementById('edit-medicine-details').value.trim()
    };
    
    fetch(`/api/medicines/${medicineId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(medicineData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            alert('Medicine updated successfully!');
            location.reload();
        }
    })
    .catch(error => {
        console.error('Error updating medicine:', error);
        alert('Error updating medicine');
    });
});

// Open edit modal
function openEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'block';
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const editModal = document.getElementById('edit-modal');
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
}

// Medicine search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('medicine-search');
    const medicinesGrid = document.getElementById('medicines-grid');
    const searchResultsInfo = document.getElementById('search-results-info');
    
    function initializeSearch() {
        const allMedicineCards = Array.from(medicinesGrid.querySelectorAll('.medicine-card'));
        
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchQuery = this.value.toLowerCase().trim();
                let visibleCount = 0;
                
                allMedicineCards.forEach(card => {
                    const medicineId = card.getAttribute('data-id');
                    const medicineName = card.getAttribute('data-name') || card.querySelector('h4').textContent.toLowerCase();
                    const medicineDetails = card.getAttribute('data-details') || '';
                    
                    // Search by name, ID, or details
                    const matchesId = medicineId && medicineId.includes(searchQuery);
                    const matchesName = medicineName.includes(searchQuery);
                    const matchesDetails = medicineDetails.includes(searchQuery);
                    
                    if (searchQuery === '' || matchesId || matchesName || matchesDetails) {
                        card.style.display = 'block';
                        visibleCount++;
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                // Update search results info
                if (searchQuery !== '') {
                    searchResultsInfo.style.display = 'block';
                    searchResultsInfo.textContent = `Found ${visibleCount} medicine${visibleCount !== 1 ? 's' : ''} matching "${searchQuery}"`;
                } else {
                    searchResultsInfo.style.display = 'none';
                }
            });
            
            // Clear search on Escape key
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    this.value = '';
                    this.dispatchEvent(new Event('input'));
                }
            });
        }
    }
    
    // Initialize search on page load
    initializeSearch();
});

