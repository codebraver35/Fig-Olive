/**
 * Fig & Olive · Admin Meal Management Controller
 * Handles authentication guarding, CRUD operations, and MySQL synchronization
 */

// 1. THE AUTH GUARD (Runs immediately on page load)
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'admin') {
  alert('⚠️ Access Denied: Administrator credentials required.');
  window.location.href = '/login.html';
}

// 2. Display logged-in admin's identity in the header
document.addEventListener('DOMContentLoaded', () => {
  const usernameDisplay = document.getElementById('adminUsername');
  const roleDisplay = document.getElementById('adminRole');
  if (usernameDisplay && user.username) {
    usernameDisplay.textContent = user.username;
  }
  if (roleDisplay && user.role) {
    roleDisplay.textContent = user.role.toUpperCase();
  }
});

// 3. Logout Helper
window.logout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
};

// Centralized authenticated fetch helper with automatic 401 session expiry handling
async function authFetch(url, options = {}) {
  const currentToken = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${currentToken}`
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert('⚠️ Your login session has expired. Please sign in again.');
    window.location.href = '/login.html';
    throw new Error('Session expired (401)');
  }
  return res;
}

// ==============================================
// 3B. SALES & REVENUE ANALYTICS (GET /api/reports/sales)
// ==============================================
let currentAnalyticsPeriod = 'all';

window.fetchAdminAnalytics = async function(period = null) {
  if (period) currentAnalyticsPeriod = period;

  // Sync selector in DOM if called programmatically
  const periodSelector = document.getElementById('analyticsPeriod');
  if (periodSelector && periodSelector.value !== currentAnalyticsPeriod) {
    periodSelector.value = currentAnalyticsPeriod;
  }

  const revenueEl = document.getElementById('kpiRevenue');
  const countEl = document.getElementById('kpiOrdersCount');
  const topDishEl = document.getElementById('kpiTopDish');
  const topDishMetaEl = document.getElementById('kpiTopDishMeta');
  const revenueSubEl = document.getElementById('kpiRevenueSub');
  const countSubEl = document.getElementById('kpiCountSub');

  const periodLabels = {
    '24h': 'Last 24 hours',
    'week': 'Last 7 days',
    'month': 'Last 30 days',
    'all': 'All-time'
  };
  const label = periodLabels[currentAnalyticsPeriod] || 'All-time';

  try {
    const res = await authFetch(`/api/reports/sales?period=${currentAnalyticsPeriod}`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();

    if (revenueSubEl) revenueSubEl.textContent = `${label} paid dining tickets`;
    if (countSubEl) countSubEl.textContent = `${label} completed guest orders`;

    if (data.summary) {
      if (revenueEl) revenueEl.textContent = `$${parseFloat(data.summary.total_revenue || 0).toFixed(2)}`;
      if (countEl) countEl.textContent = `${data.summary.paid_orders || 0} Paid`;
    }

    if (data.top_selling_meals && data.top_selling_meals.length > 0) {
      const top = data.top_selling_meals[0];
      if (topDishEl) topDishEl.textContent = top.meal_name;
      if (topDishMetaEl) topDishMetaEl.textContent = `${top.total_quantity_sold} sold · $${parseFloat(top.total_earned).toFixed(2)}`;
    } else {
      if (topDishEl) topDishEl.textContent = 'None yet';
      if (topDishMetaEl) topDishMetaEl.textContent = `No sales in ${label.toLowerCase()}`;
    }

  } catch (err) {
    console.error('Failed to load sales analytics:', err);
  }
};

// ==============================================
// 4. MEAL FETCHING & TABLE RENDERING
// ==============================================
let adminMeals = [];

async function fetchAdminMeals() {
  const tableBody = document.getElementById('mealsTableBody');
  const countBadge = document.getElementById('dishCount');

  try {
    const res = await fetch('/api/meals');
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

    adminMeals = await res.json();

    // Update count badge
    if (countBadge) {
      countBadge.textContent = `${adminMeals.length} Dishes in Catalog`;
    }

    renderAdminTable(adminMeals);

  } catch (err) {
    console.error('Failed to load admin meals:', err);
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-terracotta font-semibold">
            Failed to load meals from database. Please make sure the server is running.
          </td>
        </tr>
      `;
    }
  }
}

// 5. Render rows into the table
function renderAdminTable(meals) {
  const tableBody = document.getElementById('mealsTableBody');
  if (!tableBody) return;

  if (meals.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-ink-muted">
          No culinary dishes found. Click "+ Add New Dish" above to create one.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = meals.map(dish => {
    const priceFormatted = parseFloat(dish.price).toFixed(2);
    const categoryName = dish.category_name || 'Uncategorized';
    
    // Choose genuine uploaded photo from ImageKit, or fallback based on category
    let img = dish.image_url;
    if (!img) {
      const cat = categoryName.toLowerCase();
      img = 'assets/hero_feast.jpg';
      if (cat.includes('pasta')) img = 'https://ik.imagekit.io/z5fkmijzk/meals/tagliatelle.jpg?tr=w-100,h-100,fo-auto,q-80';
      else if (cat.includes('pizza')) img = 'https://ik.imagekit.io/z5fkmijzk/meals/margherita.jpg?tr=w-100,h-100,fo-auto,q-80';
      else if (cat.includes('salad')) img = 'https://ik.imagekit.io/z5fkmijzk/meals/fattoush.jpg?tr=w-100,h-100,fo-auto,q-80';
      else if (cat.includes('grill')) img = 'https://ik.imagekit.io/z5fkmijzk/meals/shish_tawook.jpg?tr=w-100,h-100,fo-auto,q-80';
      else if (cat.includes('dessert')) img = 'https://ik.imagekit.io/z5fkmijzk/meals/knefeh.jpg?tr=w-100,h-100,fo-auto,q-80';
    }

    return `
      <tr class="hover:bg-canvas/50 transition-colors">
        
        <!-- Dish Name & Thumbnail -->
        <td class="py-3 px-4 flex items-center gap-3">
          <img src="${img}" alt="${dish.meal_name}" class="w-10 h-10 rounded-xl object-cover border border-stone-border/60 bg-canvas">
          <div>
            <span class="font-bold text-ink block">${dish.meal_name}</span>
            <span class="text-[10px] text-ink-subtle">ID: #${dish.id}</span>
          </div>
        </td>

        <!-- Category Badge -->
        <td class="py-3 px-4">
          <span class="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-canvas border border-stone-border text-olive">
            ${categoryName}
          </span>
        </td>

        <!-- Price -->
        <td class="py-3 px-4 font-serif font-bold text-ink">
          $${priceFormatted}
        </td>

        <!-- Description (Truncated for clean table view) -->
        <td class="py-3 px-4 max-w-xs truncate text-ink-muted">
          ${dish.description || 'No description provided.'}
        </td>

        <!-- Action Buttons (Edit & Delete) -->
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-2">
            <button
              onclick="openMealModal(${dish.id})"
              class="px-2.5 py-1 text-xs font-semibold text-olive hover:bg-olive/10 rounded-lg transition-colors cursor-pointer"
            >
              Edit
            </button>
            <button
              onclick="deleteMeal(${dish.id}, '${dish.meal_name.replace(/'/g, "\\'")}')"
              class="px-2.5 py-1 text-xs font-semibold text-terracotta hover:bg-terracotta/10 rounded-lg transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </td>

      </tr>
    `;
  }).join('');
}

// 6. Search Bar Filter for the Table
window.filterAdminMeals = function() {
  const query = document.getElementById('adminSearch').value.toLowerCase().trim();
  const filtered = adminMeals.filter(m => 
    (m.meal_name || '').toLowerCase().includes(query) ||
    (m.category_name || '').toLowerCase().includes(query)
  );
  renderAdminTable(filtered);
};

// Fetch meals and sales analytics on initial load
fetchAdminMeals();
fetchAdminAnalytics();

// ==============================================
// 7. MODAL CONTROLLER (CREATE & EDIT)
// ==============================================

// Open modal in either Create or Edit mode
window.openMealModal = function(mealId = null) {
  const modal = document.getElementById('mealFormModal');
  const title = document.getElementById('modalFormTitle');
  const submitBtn = document.getElementById('submitMealBtn');
  const editIdInput = document.getElementById('editMealId');

  const nameInput = document.getElementById('formName');
  const catInput = document.getElementById('formCategory');
  const priceInput = document.getElementById('formPrice');
  const descInput = document.getElementById('formDescription');

  const existingImgInput = document.getElementById('formExistingImageUrl');
  const previewImg = document.getElementById('formImagePreview');
  const placeholder = document.getElementById('previewPlaceholder');
  const fileInput = document.getElementById('formImage');
  if (fileInput) fileInput.value = '';

  if (mealId) {
    // --- EDIT MODE ---
    const meal = adminMeals.find(m => m.id === mealId);
    if (!meal) return;

    title.textContent = `Edit Dish: ${meal.meal_name}`;
    submitBtn.textContent = 'Update Dish';
    editIdInput.value = meal.id;

    nameInput.value = meal.meal_name;
    catInput.value = meal.category_id;
    priceInput.value = parseFloat(meal.price).toFixed(2);
    descInput.value = meal.description || '';

    // Handle existing image in edit mode
    if (meal.image_url) {
      if (existingImgInput) existingImgInput.value = meal.image_url;
      if (previewImg) {
        previewImg.src = meal.image_url;
        previewImg.classList.remove('hidden');
      }
      if (placeholder) placeholder.classList.add('hidden');
    } else {
      if (existingImgInput) existingImgInput.value = '';
      if (previewImg) previewImg.classList.add('hidden');
      if (placeholder) placeholder.classList.remove('hidden');
    }

  } else {
    // --- CREATE MODE ---
    title.textContent = 'Add New Dish';
    submitBtn.textContent = 'Save Dish to Menu';
    editIdInput.value = '';

    nameInput.value = '';
    catInput.value = '1'; // Default: Pasta
    priceInput.value = '';
    descInput.value = '';

    // Reset image fields in create mode
    if (existingImgInput) existingImgInput.value = '';
    if (previewImg) previewImg.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
  }

  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

// Live Image Preview when admin selects a file
window.handleImagePreview = function(event) {
  const file = event.target.files[0];
  const previewImg = document.getElementById('formImagePreview');
  const placeholder = document.getElementById('previewPlaceholder');

  if (file) {
    previewImg.src = URL.createObjectURL(file);
    previewImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
  }
};

// Close modal
window.closeMealModal = function() {
  const modal = document.getElementById('mealFormModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

// ==============================================
// 8. IMAGEKIT DIRECT CLOUD UPLOAD HELPER
// ==============================================

/**
 * Direct Client-Side Upload to ImageKit CDN
 * 1. Requests a signed 1-time authorization token from our Express backend
 * 2. Transmits the binary image directly to ImageKit CDN API via multipart/form-data
 * 3. Returns the public permanent CDN URL
 */
async function uploadImageToImageKit(file) {
  const authRes = await fetch('/api/uploads/auth', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!authRes.ok) {
    const err = await authRes.json();
    throw new Error(err.message || 'Failed to authorize image upload');
  }

  const auth = await authRes.json();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name.replace(/\s+/g, '_'));
  formData.append('publicKey', auth.publicKey);
  formData.append('signature', auth.signature);
  formData.append('expire', auth.expire);
  formData.append('token', auth.token);
  formData.append('folder', '/meals');

  const ikRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: formData
  });

  const ikData = await ikRes.json();
  if (!ikRes.ok) {
    throw new Error(ikData.message || 'ImageKit upload failed');
  }

  return ikData.url;
}

// ==============================================
// 9. CRUD MUTATIONS (POST, PUT, DELETE)
// ==============================================

/**
 * Handles both Dish Creation (POST) and Updates (PUT)
 * Decides whether to POST or PUT based on editMealId
 */
window.handleMealSubmit = async function(event) {
  event.preventDefault();

  const editId = document.getElementById('editMealId').value;
  const name = document.getElementById('formName').value.trim();
  const category_id = parseInt(document.getElementById('formCategory').value, 10);
  const price = parseFloat(document.getElementById('formPrice').value);
  const description = document.getElementById('formDescription').value.trim();

  // Validate numbers locally before sending
  if (!name || isNaN(price) || price <= 0 || isNaN(category_id)) {
    alert('Please enter valid dish details with a positive price.');
    return;
  }

  // Determine endpoint & HTTP verb:
  // If editId exists -> PUT /api/meals/:id
  // Otherwise       -> POST /api/meals
  const isEditing = Boolean(editId);
  const endpoint = isEditing ? `/api/meals/${editId}` : '/api/meals';
  const method = isEditing ? 'PUT' : 'POST';

  const submitBtn = document.getElementById('submitMealBtn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;

  try {
    // 1. Direct Cloud Upload: If a new photo file was picked, upload directly to ImageKit
    const fileInput = document.getElementById('formImage');
    const existingImageUrl = document.getElementById('formExistingImageUrl').value;
    let finalImageUrl = existingImageUrl || null;

    if (fileInput && fileInput.files && fileInput.files[0]) {
      submitBtn.textContent = 'Uploading Photo to Cloud...';
      finalImageUrl = await uploadImageToImageKit(fileInput.files[0]);
    }

    submitBtn.textContent = isEditing ? 'Saving Changes...' : 'Creating Dish...';

    const payload = {
      name,
      category_id,
      price,
      description,
      image_url: finalImageUrl
    };

    const res = await authFetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error || `Failed with status ${res.status}`);
    }

    // Success! Close modal and refresh the table from MySQL
    closeMealModal();
    await fetchAdminMeals();

  } catch (err) {
    console.error('Error saving meal:', err);
    alert(`⚠️ Failed to save dish: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
};

/**
 * Handles Dish Deletion (DELETE /api/meals/:id)
 * Requires admin JWT token and user confirmation
 */
window.deleteMeal = async function(mealId, mealName) {
  const confirmed = confirm(`Are you sure you want to permanently delete "${mealName}" from the menu?`);
  if (!confirmed) return;

  try {
    const res = await authFetch(`/api/meals/${mealId}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }

    // Refresh table immediately
    await fetchAdminMeals();

  } catch (err) {
    console.error('Failed to delete meal:', err);
    alert(`⚠️ Could not delete "${mealName}": ${err.message}`);
  }
};
