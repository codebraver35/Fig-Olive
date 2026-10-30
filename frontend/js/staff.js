/**
 * Fig & Olive · Staff Operations Console Controller
 * Coordinates Table Floor Plans, Waiter Order Taking, Kitchen KDS, and Cashier Settlement
 */

// ==============================================
// 1. THE STAFF AUTH GUARD
// ==============================================
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Allowed roles for the operational staff console
const ALLOWED_STAFF_ROLES = ['waiter', 'cashier', 'admin'];

if (!token || !ALLOWED_STAFF_ROLES.includes(user.role)) {
  alert('⚠️ Access Denied: Staff credentials (waiter, cashier, or admin) required.');
  window.location.href = '/login.html';
}

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

// 2. Display logged-in staff identity on page load
document.addEventListener('DOMContentLoaded', () => {
  const usernameDisplay = document.getElementById('staffUsername');
  const roleDisplay = document.getElementById('staffRole');

  if (usernameDisplay && user.username) {
    usernameDisplay.textContent = user.username;
  }
  if (roleDisplay && user.role) {
    roleDisplay.textContent = user.role.toUpperCase();
  }

  // If logged-in user is an administrator, reveal the shortcut back to Admin Console
  if (user.role === 'admin') {
    const adminLink = document.getElementById('linkAdminPortal');
    if (adminLink) {
      adminLink.classList.remove('hidden');
      adminLink.classList.add('inline-flex');
    }
  }
});

// 3. Logout helper
window.logout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
};

// ==============================================
// 4. STATION SWITCHER (FLOOR vs KITCHEN vs CASHIER)
// ==============================================
window.switchStation = function(station) {
  // Hide all sections
  const secFloor = document.getElementById('stationFloor');
  const secKitchen = document.getElementById('stationKitchen');
  const secCashier = document.getElementById('stationCashier');

  secFloor.classList.add('hidden');
  secKitchen.classList.add('hidden');
  secCashier.classList.add('hidden');

  // Reset tab button styles
  const tabFloor = document.getElementById('tabFloor');
  const tabKitchen = document.getElementById('tabKitchen');
  const tabCashier = document.getElementById('tabCashier');

  const defaultTabClass = 'flex-1 md:flex-initial px-2.5 sm:px-4 py-1.5 text-xs font-semibold rounded-lg text-ink-muted hover:text-ink transition-all cursor-pointer text-center whitespace-nowrap';
  const activeTabClass = 'flex-1 md:flex-initial px-2.5 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer bg-white text-olive shadow-xs text-center whitespace-nowrap';

  tabFloor.className = defaultTabClass;
  tabKitchen.className = defaultTabClass;
  tabCashier.className = defaultTabClass;

  const badge = document.getElementById('stationBadge');

  if (station === 'floor') {
    secFloor.classList.remove('hidden');
    tabFloor.className = activeTabClass;
    if (badge) badge.textContent = 'Floor Station';
    fetchTables();
  } else if (station === 'kitchen') {
    secKitchen.classList.remove('hidden');
    secKitchen.classList.add('flex');
    tabKitchen.className = activeTabClass;
    if (badge) badge.textContent = 'Kitchen Station';
    fetchKitchenOrders();
  } else if (station === 'cashier') {
    secCashier.classList.remove('hidden');
    secCashier.classList.add('flex');
    tabCashier.className = activeTabClass;
    if (badge) badge.textContent = 'Cashier Station';
    fetchCashierOrders();
  }
};

// ==============================================
// 5. STEP 2: DYNAMIC FLOOR PLAN (GET /api/tables)
// ==============================================
let staffTables = [];
let selectedTable = null;
let selectedTableActiveOrder = null;
let liveOrders = [];

/**
 * Fetches real dining tables and active orders from MySQL
 */
window.fetchTables = async function() {
  const grid = document.getElementById('tablesGrid');
  if (!grid) return;

  try {
    // 1. Fetch tables
    const res = await authFetch('/api/tables');
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    staffTables = await res.json();

    // 2. Also fetch orders so we know active items for occupied tables
    try {
      const ordersRes = await authFetch('/api/orders');
      if (ordersRes.ok) {
        liveOrders = await ordersRes.json();
      }
    } catch (e) {
      console.warn('Could not pre-fetch orders:', e);
    }

    renderTablesGrid(staffTables);

    // If a table was already selected, re-select it; otherwise select the first table
    if (selectedTable) {
      const refreshed = staffTables.find(t => t.id === selectedTable.id);
      if (refreshed) selectTable(refreshed.id);
    } else if (staffTables.length > 0) {
      selectTable(staffTables[0].id);
    }

  } catch (err) {
    console.error('Failed to load tables:', err);
    grid.innerHTML = `
      <div class="col-span-full py-8 text-center text-terracotta text-xs font-semibold">
        Failed to load dining tables. Please verify server connection.
      </div>
    `;
  }
};

/**
 * Renders table tiles into the floor plan grid
 */
function renderTablesGrid(tables) {
  const grid = document.getElementById('tablesGrid');
  if (!grid) return;

  if (tables.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-8 text-center text-ink-muted text-xs">
        No dining tables registered in database.
      </div>
    `;
    return;
  }

  grid.innerHTML = tables.map(table => {
    const isAvail = table.status === 'available';
    const isSelected = selectedTable && selectedTable.id === table.id;

    // Visual styles based on status
    const ringClass = isAvail
      ? 'border-emerald-500 text-emerald-700 bg-emerald-50/80'
      : 'border-amber-500 text-amber-700 bg-amber-50/80';

    const statusBadgeClass = isAvail
      ? 'text-emerald-700'
      : 'text-amber-700';

    const borderSelectClass = isSelected
      ? 'border-olive ring-2 ring-olive/20 shadow-md -translate-y-0.5'
      : 'border-stone-border/80 hover:border-olive/50 hover:-translate-y-0.5';

    const num = table.table_number || '';
    const textSize = num.length > 5
      ? 'text-[10.5px] tracking-tight font-extrabold'
      : num.length > 3
        ? 'text-xs font-bold'
        : 'text-sm font-bold';

    return `
      <div
        onclick="selectTable(${table.id})"
        class="bg-canvas/50 border rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all duration-150 ${borderSelectClass}"
      >
        <!-- Table Number Ring -->
        <div class="w-14 h-14 rounded-full border-2 flex items-center justify-center text-center px-1 overflow-hidden shrink-0 shadow-xs ${textSize} ${ringClass}">
          ${num}
        </div>

        <!-- Status Label -->
        <span class="text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass}">
          ${isAvail ? 'Available' : 'Occupied'}
        </span>

        <!-- Capacity / Subtext -->
        <span class="text-[10px] text-ink-muted">
          ${table.capacity} Seats · ${isAvail ? 'Clean' : 'Seated'}
        </span>
      </div>
    `;
  }).join('');
}

/**
 * Selects an active table and updates the right-side Order Panel
 */
window.selectTable = async function(tableId) {
  const table = staffTables.find(t => t.id === tableId);
  if (!table) return;

  selectedTable = table;

  // Re-render grid to update highlight borders
  renderTablesGrid(staffTables);

  // Update Drawer Titles
  const title = document.getElementById('panelTableTitle');
  const sub = document.getElementById('panelTableSub');
  const badge = document.getElementById('panelTableBadge');
  const btnAddDishes = document.getElementById('btnAddDishes');
  const btnFreeTable = document.getElementById('btnFreeTable');
  const itemsContainer = document.getElementById('panelOrderItems');
  const totalDisplay = document.getElementById('panelOrderTotal');

  if (title) title.textContent = `Table ${table.table_number}`;
  if (sub) sub.textContent = `${table.capacity} Guest Seats`;

  const isAvail = table.status === 'available';

  if (badge) {
    badge.textContent = isAvail ? 'Available' : 'Occupied';
    badge.className = isAvail
      ? 'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200';
  }

  // Buttons state
  if (btnAddDishes) {
    btnAddDishes.disabled = false;
    btnAddDishes.textContent = isAvail ? '+ Place New Order' : '+ Add More Dishes';
  }

  if (btnFreeTable) {
    btnFreeTable.disabled = isAvail; // Can only free an occupied table
  }

  // Check if there is an active (unpaid) order for this table
  const activeOrder = liveOrders.find(o => o.table_id === table.id && o.status !== 'paid' && o.status !== 'cancelled');
  selectedTableActiveOrder = activeOrder || null;

  if (activeOrder) {
    totalDisplay.textContent = `$${parseFloat(activeOrder.total_price).toFixed(2)}`;
    
    // Fetch full order items receipt
    try {
      const detailRes = await authFetch(`/api/orders/${activeOrder.id}`);

      if (detailRes.ok) {
        const orderData = await detailRes.json();
        const items = orderData.items || [];

        if (items.length > 0) {
          itemsContainer.innerHTML = items.map(item => `
            <div class="flex items-center justify-between py-1.5 border-b border-stone-border/40 text-xs">
              <span class="font-medium text-ink">${item.quantity}x ${item.meal_name}</span>
              <span class="font-serif font-bold text-ink">$${(item.quantity * parseFloat(item.unit_price)).toFixed(2)}</span>
            </div>
          `).join('');
        } else {
          itemsContainer.innerHTML = `
            <p class="text-xs text-ink-muted italic py-4 text-center">
              Order #${activeOrder.id} active (${activeOrder.status}).
            </p>
          `;
        }
      }
    } catch (e) {
      itemsContainer.innerHTML = `<p class="text-xs text-ink-muted py-4">Active Order #${activeOrder.id} (${activeOrder.status})</p>`;
    }

  } else {
    totalDisplay.textContent = '$0.00';
    if (isAvail) {
      itemsContainer.innerHTML = `
        <div class="py-6 text-center text-ink-muted flex flex-col items-center gap-1">
          <span class="text-xl">✨</span>
          <p class="text-xs font-medium">Table is clean and available.</p>
          <p class="text-[11px] text-ink-subtle">Click "+ Place New Order" below to seat guests.</p>
        </div>
      `;
    } else {
      itemsContainer.innerHTML = `
        <p class="text-xs text-ink-muted italic py-4 text-center">
          Table marked occupied. No active items found.
        </p>
      `;
    }
  }
};

/**
 * Manually releases an occupied table back to available
 */
window.releaseActiveTable = async function() {
  if (!selectedTable) return;

  const confirmed = confirm(`Are you sure you want to mark Table ${selectedTable.table_number} as Available?`);
  if (!confirmed) return;

  try {
    const res = await authFetch(`/api/tables/${selectedTable.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'available' })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update table status');
    }

    // Refresh floor plan from MySQL
    await fetchTables();

  } catch (err) {
    console.error('Error releasing table:', err);
    alert(`⚠️ Failed to free table: ${err.message}`);
  }
};

// ==============================================
// 6. STEP 3: WAITER ORDER PAD (POST /api/orders)
// ==============================================
let menuCatalog = [];
let orderCart = {}; // { [mealId]: quantity }

/**
 * Opens the Order Modal for the selected table (new order or add dishes)
 */
window.openOrderModal = async function() {
  if (!selectedTable) {
    alert('Please select a table first.');
    return;
  }

  // Refresh active order check for the selected table
  const activeOrder = liveOrders.find(o => o.table_id === selectedTable.id && o.status !== 'paid' && o.status !== 'cancelled');
  selectedTableActiveOrder = activeOrder || null;

  const modal = document.getElementById('orderModal');
  const title = document.getElementById('orderModalTitle');
  const sub = document.getElementById('orderModalSub');
  const subtotalDisplay = document.getElementById('orderModalSubtotal');
  const submitBtn = document.getElementById('btnSubmitOrder');

  if (selectedTableActiveOrder) {
    if (title) title.textContent = `Add Dishes: Table ${selectedTable.table_number} (Order #${selectedTableActiveOrder.id})`;
    if (sub) sub.textContent = `Append additional dishes to active Order #${selectedTableActiveOrder.id}`;
    if (submitBtn) submitBtn.textContent = 'Add Dishes to Ticket ➔';
  } else {
    if (title) title.textContent = `Open Order: Table ${selectedTable.table_number}`;
    if (sub) sub.textContent = 'Select dishes from menu catalog to send to kitchen';
    if (submitBtn) submitBtn.textContent = 'Transmit Ticket to Kitchen ➔';
  }

  orderCart = {}; // Reset cart
  if (subtotalDisplay) subtotalDisplay.textContent = '$0.00';

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Load menu meals if not already cached
  if (menuCatalog.length === 0) {
    try {
      const res = await fetch('/api/meals');
      if (res.ok) {
        menuCatalog = await res.json();
      }
    } catch (e) {
      console.error('Failed to load menu catalog:', e);
    }
  }

  renderMenuPicker();
};

/**
 * Closes the Order Modal
 */
window.closeOrderModal = function() {
  const modal = document.getElementById('orderModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

/**
 * Renders dish list inside the order picker modal with +/- steppers
 */
function renderMenuPicker() {
  const pickerList = document.getElementById('menuPickerList');
  if (!pickerList) return;

  if (menuCatalog.length === 0) {
    pickerList.innerHTML = `
      <p class="text-xs text-ink-muted text-center py-6">No dishes found in menu catalog.</p>
    `;
    return;
  }

  pickerList.innerHTML = menuCatalog.map(dish => {
    const qty = orderCart[dish.id] || 0;
    const priceFormatted = parseFloat(dish.price).toFixed(2);
    const img = dish.image_url || 'assets/hero_feast.jpg';

    return `
      <div class="flex items-center justify-between p-3 bg-canvas/40 hover:bg-canvas rounded-2xl border border-stone-border/60 transition-colors">
        <div class="flex items-center gap-3">
          <img src="${img}" alt="${dish.meal_name}" class="w-12 h-12 rounded-xl object-cover border border-stone-border/60 bg-canvas">
          <div>
            <span class="font-bold text-xs text-ink block">${dish.meal_name}</span>
            <span class="text-[10px] text-olive font-bold uppercase tracking-wider">${dish.category_name || 'Dish'}</span>
            <span class="font-serif font-bold text-xs text-ink block mt-0.5">$${priceFormatted}</span>
          </div>
        </div>

        <!-- Quantity Stepper -->
        <div class="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-stone-border shadow-xs">
          <button
            type="button"
            onclick="updateCartItemQty(${dish.id}, -1)"
            class="w-6 h-6 rounded-lg bg-canvas hover:bg-stone-border/40 text-ink font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
          >
            -
          </button>
          <span id="qty-dish-${dish.id}" class="w-6 text-center text-xs font-bold text-ink">
            ${qty}
          </span>
          <button
            type="button"
            onclick="updateCartItemQty(${dish.id}, 1)"
            class="w-6 h-6 rounded-lg bg-olive text-white font-bold text-xs flex items-center justify-center hover:bg-olive-hover transition-colors cursor-pointer"
          >
            +
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Updates item quantity in cart and recalculates subtotal
 */
window.updateCartItemQty = function(mealId, change) {
  const current = orderCart[mealId] || 0;
  const newQty = Math.max(0, current + change);

  if (newQty === 0) {
    delete orderCart[mealId];
  } else {
    orderCart[mealId] = newQty;
  }

  // Update specific dish quantity display in DOM
  const qtyEl = document.getElementById(`qty-dish-${mealId}`);
  if (qtyEl) qtyEl.textContent = newQty;

  // Recalculate Subtotal
  let subtotal = 0;
  for (const [id, qty] of Object.entries(orderCart)) {
    const dish = menuCatalog.find(d => d.id === parseInt(id, 10));
    if (dish) {
      subtotal += parseFloat(dish.price) * qty;
    }
  }

  const subtotalDisplay = document.getElementById('orderModalSubtotal');
  if (subtotalDisplay) subtotalDisplay.textContent = `$${subtotal.toFixed(2)}`;
};

/**
 * Transmits the order to the backend in an ACID transaction
 */
window.submitNewOrder = async function() {
  if (!selectedTable) return;

  const items = Object.entries(orderCart)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({
      meal_id: parseInt(id, 10),
      quantity: qty
    }));

  if (items.length === 0) {
    alert('⚠️ Please select at least 1 dish.');
    return;
  }

  const submitBtn = document.getElementById('btnSubmitOrder');
  const originalText = submitBtn ? submitBtn.textContent : 'Submit';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = selectedTableActiveOrder ? 'Adding to Ticket...' : 'Transmitting to Kitchen...';
  }

  try {
    const isAddingToExisting = selectedTable.status === 'occupied' && selectedTableActiveOrder;

    let res;
    if (isAddingToExisting) {
      // Append items to active order in ACID transaction
      res = await authFetch(`/api/orders/${selectedTableActiveOrder.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      });
    } else {
      // Create new order in ACID transaction
      const payload = {
        table_id: selectedTable.id,
        items: items
      };

      res = await authFetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to place order');
    }

    // Success! Close modal and refresh floor plan, active ticket, and kitchen Kanban
    closeOrderModal();
    await fetchTables();
    if (typeof window.fetchKitchenOrders === 'function') {
      await window.fetchKitchenOrders();
    }

  } catch (err) {
    console.error('Failed to submit order:', err);
    alert(`⚠️ Order Error: ${err.message}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
};

// ==============================================
// 7. STEP 4A: KITCHEN KDS KANBAN CONTROLLER
// ==============================================

/**
 * Fetches all orders from MySQL and distributes them across the 3 KDS columns
 */
window.fetchKitchenOrders = async function() {
  const colPending = document.getElementById('colPending');
  const colPreparing = document.getElementById('colPreparing');
  const colServed = document.getElementById('colServed');

  const countPending = document.getElementById('countPending');
  const countPreparing = document.getElementById('countPreparing');
  const countServed = document.getElementById('countServed');

  try {
    const res = await authFetch('/api/orders');
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const orders = await res.json();

    // Filter into Kanban stages
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const servedOrders = orders.filter(o => o.status === 'served');

    // Update column counters
    if (countPending) countPending.textContent = pendingOrders.length;
    if (countPreparing) countPreparing.textContent = preparingOrders.length;
    if (countServed) countServed.textContent = servedOrders.length;

    // Render cards into each column
    renderKitchenColumn(colPending, pendingOrders, 'pending');
    renderKitchenColumn(colPreparing, preparingOrders, 'preparing');
    renderKitchenColumn(colServed, servedOrders, 'served');

  } catch (err) {
    console.error('Failed to load kitchen tickets:', err);
    if (colPending) {
      colPending.innerHTML = `<p class="text-xs text-terracotta text-center py-4">Error loading tickets.</p>`;
    }
  }
};

/**
 * Helper to render ticket cards inside a Kanban column
 */
function renderKitchenColumn(container, orders, columnType) {
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-ink-muted text-xs italic">
        No tickets in this stage.
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    // Format timestamp
    const date = new Date(order.created_at);
    const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Split items summary into clean list items
    const itemsList = (order.items_summary || 'Order Items')
      .split(',')
      .map(item => `<div class="text-xs text-ink font-medium">✦ ${item.trim()}</div>`)
      .join('');

    // Bump Action Button
    let actionBtn = '';
    if (columnType === 'pending') {
      actionBtn = `
        <button
          onclick="advanceOrderStatus(${order.id}, 'preparing')"
          class="w-full mt-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer text-center"
        >
          Start Cooking 🔥 ➔
        </button>
      `;
    } else if (columnType === 'preparing') {
      actionBtn = `
        <button
          onclick="advanceOrderStatus(${order.id}, 'served')"
          class="w-full mt-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer text-center"
        >
          Mark Ready to Serve ✓
        </button>
      `;
    } else if (columnType === 'served') {
      actionBtn = `
        <div class="mt-3 py-1.5 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
          Served · Ready for Settlement
        </div>
      `;
    }

    return `
      <div class="bg-canvas/50 border border-stone-border/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:border-olive/40 transition-all">
        <div>
          <div class="flex items-center justify-between border-b border-stone-border/40 pb-2 mb-2.5">
            <div>
              <span class="font-bold text-xs text-ink">Order #${order.id} · Table ${order.table_number}</span>
              <span class="text-[10px] text-ink-subtle block">By: ${order.staff_name || 'Staff'}</span>
            </div>
            <span class="text-[11px] font-mono font-bold text-ink-muted bg-white px-2 py-0.5 rounded-lg border border-stone-border/60">
              ${timeFormatted}
            </span>
          </div>

          <div class="flex flex-col gap-1 py-1">
            ${itemsList}
          </div>
        </div>

        ${actionBtn}
      </div>
    `;
  }).join('');
}

/**
 * Transitions an order to its next lifecycle state via PATCH /api/orders/:id/status
 */
window.advanceOrderStatus = async function(orderId, newStatus) {
  try {
    const res = await authFetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Status transition failed');
    }

    // Refresh Kitchen Kanban
    await fetchKitchenOrders();

  } catch (err) {
    console.error('Failed to advance order status:', err);
    alert(`⚠️ Failed to update order status: ${err.message}`);
  }
};

// ==============================================
// 8. STEP 4B: CASHIER SETTLEMENT CONTROLLER
// ==============================================

/**
 * Fetches active dining sessions ready for cashier checkout
 */
window.fetchCashierOrders = async function() {
  const tableBody = document.getElementById('cashierTableBody');
  if (!tableBody) return;

  try {
    const res = await authFetch('/api/orders');
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const orders = await res.json();

    // Show active orders awaiting payment (exclude already paid or cancelled)
    const activeBills = orders.filter(o => o.status !== 'paid' && o.status !== 'cancelled');

    if (activeBills.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-10 text-center text-ink-muted">
            <span class="text-xl block mb-1">✨</span>
            All dining tables are settled and paid! No pending bills.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = activeBills.map(order => {
      const totalFormatted = parseFloat(order.total_price).toFixed(2);
      const isServed = order.status === 'served';

      const statusBadge = isServed
        ? '<span class="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold uppercase tracking-normal sm:tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"><span class="inline sm:hidden">Served</span><span class="hidden sm:inline">Served (Ready to Bill)</span></span>'
        : `<span class="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold uppercase tracking-normal sm:tracking-wider bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">${order.status}</span>`;

      return `
        <tr class="hover:bg-canvas/40 transition-colors">
          <td class="py-2.5 px-1 sm:py-3 sm:px-4 font-bold text-ink whitespace-nowrap">#${order.id}</td>
          <td class="py-2.5 px-1 sm:py-3 sm:px-4">
            <span class="font-bold text-ink block whitespace-nowrap">Table ${order.table_number}</span>
            <span class="text-[10px] text-ink-muted block sm:hidden truncate max-w-16 sm:max-w-none" title="By ${order.staff_name || 'Waiter'}">By ${order.staff_name || 'Waiter'}</span>
          </td>
          <td class="py-2.5 px-1 sm:py-3 sm:px-4 text-ink-muted whitespace-nowrap hidden sm:table-cell">${order.staff_name || 'Waiter'}</td>
          <td class="py-2.5 px-1 sm:py-3 sm:px-4 whitespace-nowrap">${statusBadge}</td>
          <td class="py-2.5 px-1 sm:py-3 sm:px-4 font-serif font-bold text-sm sm:text-base text-ink whitespace-nowrap">$${totalFormatted}</td>
          <td class="py-2.5 px-1 sm:py-3 sm:px-4 text-right whitespace-nowrap">
            <button
              onclick="settleOrder(${order.id}, '${order.table_number}', '${totalFormatted}')"
              title="Collect $${totalFormatted} & Settle Bill"
              aria-label="Collect $${totalFormatted} & Settle Bill"
              class="px-2 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span class="inline sm:hidden">Collect</span>
              <span class="hidden sm:inline">Collect $${totalFormatted} & Settle Bill 💳</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load cashier bills:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-terracotta font-semibold">
          Failed to load bills from database.
        </td>
      </tr>
    `;
  }
};

/**
 * Settles order payment (marks 'paid') -> triggers MySQL table release!
 */
window.settleOrder = async function(orderId, tableNumber, totalFormatted) {
  const confirmed = confirm(`Collect $${totalFormatted} for Table ${tableNumber} and mark Order #${orderId} as Paid?\n\nThis will automatically set Table ${tableNumber} back to Available.`);
  if (!confirmed) return;

  try {
    const res = await authFetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'paid' })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Payment settlement failed');
    }

    alert(`🎉 Payment settled! Table ${tableNumber} has been freed and marked Available.`);

    // Refresh both cashier bills and floor plan
    await fetchCashierOrders();
    await fetchTables();

  } catch (err) {
    console.error('Error settling payment:', err);
    alert(`⚠️ Failed to settle bill: ${err.message}`);
  }
};

// Initial load: Fetch floor plan tables on startup!
fetchTables();
