/**
 * Inventory Manager SPA
 * Implements loadItems(), addItem(), updateItem(), deleteItem()
 * using the Fetch API without page reload.
 */

// State
let allItems = [];
let itemToDeleteId = null;
const API_URL = '/api/items';

// DOM Elements
const itemForm = document.getElementById('item-form');
const editIdInput = document.getElementById('edit-id');
const nameInput = document.getElementById('name');
const descInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const inStockSelect = document.getElementById('inStock');
const submitBtn = document.getElementById('submit-btn');
const submitBtnText = document.getElementById('submit-btn-text');
const cancelBtn = document.getElementById('cancel-btn');
const formHeading = document.getElementById('form-heading');
const formSubheading = document.getElementById('form-subheading');
const formModeBadge = document.getElementById('form-mode-badge');

const itemsList = document.getElementById('items-list');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterStockSelect = document.getElementById('filter-stock');
const refreshBtn = document.getElementById('refresh-btn');

// Metric Elements
const metricTotal = document.getElementById('metric-total');
const metricInStock = document.getElementById('metric-instock');
const metricOutStock = document.getElementById('metric-outstock');
const metricValue = document.getElementById('metric-value');

// Modal Elements
const confirmModal = document.getElementById('confirm-modal');
const deleteItemNameSpan = document.getElementById('delete-item-name');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// Toast Element
const toastContainer = document.getElementById('toast-container');

// Error Elements
const nameError = document.getElementById('name-error');
const priceError = document.getElementById('price-error');

// ============================================================================
// Core Required Functions (Step-3 of Procedure)
// ============================================================================

/**
 * Fetch and load all items from GET /api/items
 */
async function loadItems() {
  try {
    setLoading(true);
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch items (${response.status} ${response.statusText})`);
    }

    const data = await response.json();
    allItems = Array.isArray(data) ? data : [];
    renderItems();
    updateMetrics();
  } catch (error) {
    console.error('Error loading items:', error);
    showToast(error.message || 'Error loading items from database', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Add a new item via POST /api/items
 * @param {Object} itemData - { name, description, price, inStock }
 */
async function addItem(itemData) {
  try {
    disableSubmit(true);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create item');
    }

    // Prepend or add new item to state
    allItems.unshift(result);
    renderItems();
    updateMetrics();
    resetForm();
    showToast(`"${result.name}" added successfully!`, 'success');
  } catch (error) {
    console.error('Error adding item:', error);
    showToast(error.message || 'Failed to add item', 'error');
  } finally {
    disableSubmit(false);
  }
}

/**
 * Update an existing item via PUT /api/items/:id
 * @param {string} id - The MongoDB item _id
 * @param {Object} itemData - { name, description, price, inStock }
 */
async function updateItem(id, itemData) {
  try {
    disableSubmit(true);
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update item');
    }

    // Update in state
    const index = allItems.findIndex((item) => item._id === id);
    if (index !== -1) {
      allItems[index] = result;
    }
    renderItems();
    updateMetrics();
    resetForm();
    showToast(`"${result.name}" updated successfully!`, 'success');
  } catch (error) {
    console.error('Error updating item:', error);
    showToast(error.message || 'Failed to update item', 'error');
  } finally {
    disableSubmit(false);
  }
}

/**
 * Delete an item via DELETE /api/items/:id
 * @param {string} id - The MongoDB item _id
 */
async function deleteItem(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete item');
    }

    // Remove from state
    const deletedItemName = allItems.find(item => item._id === id)?.name || 'Item';
    allItems = allItems.filter((item) => item._id !== id);
    renderItems();
    updateMetrics();

    // If currently editing this item, reset form
    if (editIdInput.value === id) {
      resetForm();
    }

    showToast(`"${deletedItemName}" deleted successfully!`, 'success');
  } catch (error) {
    console.error('Error deleting item:', error);
    showToast(error.message || 'Failed to delete item', 'error');
  }
}

// Make functions globally accessible on window for browser console testing
window.loadItems = loadItems;
window.addItem = addItem;
window.updateItem = updateItem;
window.deleteItem = deleteItem;

// ============================================================================
// UI & Rendering Functions
// ============================================================================

/**
 * Render items into the DOM matching the required syllabus format:
 * 1. Laptop - $999.99 (In Stock)
 *    Description: High-performance laptop
 *    [Edit] [Delete]
 */
function renderItems() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const filterStock = filterStockSelect.value;

  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm) ||
      (item.description && item.description.toLowerCase().includes(searchTerm));

    let matchesStock = true;
    if (filterStock === 'inStock') {
      matchesStock = item.inStock === true;
    } else if (filterStock === 'outOfStock') {
      matchesStock = item.inStock === false;
    }

    return matchesSearch && matchesStock;
  });

  itemsList.innerHTML = '';

  if (filteredItems.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filteredItems.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'item-card';
    li.id = `item-${item._id}`;

    const formattedPrice = Number(item.price).toFixed(2);
    const stockClass = item.inStock ? 'in-stock' : 'out-of-stock';
    const stockLabel = item.inStock ? 'In Stock' : 'Out of Stock';
    const isCurrentEditing = editIdInput.value === item._id;

    if (isCurrentEditing) {
      li.classList.add('is-updating');
    }

    li.innerHTML = `
      <div class="item-card-main">
        <div>
          <div class="item-title-row">
            <span class="item-index">${index + 1}.</span>
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="item-dash">-</span>
            <span class="item-price">$${formattedPrice}</span>
            <span class="stock-pill ${stockClass}">(${stockLabel})</span>
          </div>
          <div class="item-desc">
            <span class="item-desc-label">Description:</span>
            <span>${escapeHtml(item.description || 'No description provided')}</span>
          </div>
        </div>
      </div>
      <div class="item-actions">
        <button 
          type="button" 
          class="btn-item-action btn-edit" 
          onclick="handleStartEdit('${item._id}')"
          aria-label="Edit ${escapeHtml(item.name)}"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          [Edit]
        </button>
        <button 
          type="button" 
          class="btn-item-action btn-delete" 
          onclick="openDeleteModal('${item._id}', '${escapeJs(item.name)}')"
          aria-label="Delete ${escapeHtml(item.name)}"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          [Delete]
        </button>
      </div>
    `;

    itemsList.appendChild(li);
  });
}

/**
 * Update metrics bar (Total, In Stock, Out of Stock, Inventory Value)
 */
function updateMetrics() {
  const total = allItems.length;
  const inStock = allItems.filter((i) => i.inStock).length;
  const outStock = total - inStock;
  const totalVal = allItems.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  metricTotal.textContent = total;
  metricInStock.textContent = inStock;
  metricOutStock.textContent = outStock;
  metricValue.textContent = `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Handle form submission (Handles both Add and Update)
 */
itemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Validate form
  let isValid = true;
  nameError.textContent = '';
  priceError.textContent = '';

  const nameVal = nameInput.value.trim();
  const priceVal = parseFloat(priceInput.value);

  if (!nameVal) {
    nameError.textContent = 'Item name is required';
    isValid = false;
  }

  if (isNaN(priceVal) || priceVal < 0) {
    priceError.textContent = 'Please enter a valid price (>= 0)';
    isValid = false;
  }

  if (!isValid) return;

  const itemPayload = {
    name: nameVal,
    description: descInput.value.trim(),
    price: priceVal,
    inStock: inStockSelect.value === 'true'
  };

  const editingId = editIdInput.value;
  if (editingId) {
    updateItem(editingId, itemPayload);
  } else {
    addItem(itemPayload);
  }
});

/**
 * Populate form for editing an item
 */
window.handleStartEdit = function (id) {
  const item = allItems.find((i) => i._id === id);
  if (!item) return;

  editIdInput.value = item._id;
  nameInput.value = item.name;
  descInput.value = item.description || '';
  priceInput.value = item.price;
  inStockSelect.value = item.inStock ? 'true' : 'false';

  formHeading.textContent = 'Edit Item';
  formSubheading.textContent = `Updating item ID: ${item._id} via PUT /api/items/:id`;
  submitBtnText.textContent = 'Update Item';
  formModeBadge.textContent = 'EDIT MODE';
  formModeBadge.classList.add('edit-mode');
  cancelBtn.classList.remove('hidden');

  renderItems();
  nameInput.focus();
};

/**
 * Cancel edit mode and reset form
 */
cancelBtn.addEventListener('click', () => {
  resetForm();
  renderItems();
});

function resetForm() {
  itemForm.reset();
  editIdInput.value = '';
  nameError.textContent = '';
  priceError.textContent = '';

  formHeading.textContent = 'Add New Item';
  formSubheading.textContent = 'Enter item attributes to persist in MongoDB via POST /api/items';
  submitBtnText.textContent = 'Add Item';
  formModeBadge.textContent = 'CREATE MODE';
  formModeBadge.classList.remove('edit-mode');
  cancelBtn.classList.add('hidden');
}

/**
 * Delete confirmation modal helpers
 */
window.openDeleteModal = function (id, name) {
  itemToDeleteId = id;
  deleteItemNameSpan.textContent = `"${name}"`;
  confirmModal.classList.remove('hidden');
};

function closeDeleteModal() {
  itemToDeleteId = null;
  confirmModal.classList.add('hidden');
}

cancelDeleteBtn.addEventListener('click', closeDeleteModal);

confirmDeleteBtn.addEventListener('click', () => {
  if (itemToDeleteId) {
    const id = itemToDeleteId;
    closeDeleteModal();
    deleteItem(id);
  }
});

// Close modal when clicking on backdrop
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) {
    closeDeleteModal();
  }
});

// Search and Filter Listeners
searchInput.addEventListener('input', renderItems);
filterStockSelect.addEventListener('change', renderItems);
refreshBtn.addEventListener('click', () => {
  loadItems();
  showToast('List refreshed from database', 'info');
});

// UI State Helpers
function setLoading(isLoading) {
  if (isLoading) {
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
  } else {
    loadingState.classList.add('hidden');
  }
}

function disableSubmit(disabled) {
  submitBtn.disabled = disabled;
  if (disabled) {
    submitBtn.style.opacity = '0.6';
  } else {
    submitBtn.style.opacity = '1';
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Initial Data Fetch
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
});
