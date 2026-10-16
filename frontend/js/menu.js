let allMeals = [];       // Holds the complete list of meals from MySQL
let activeCategory = 'all'; // Currently selected category filter
let searchQuery = '';    // Current text typed in the search box

// Fetch dishes from our Express backend
async function fetchMeals() {
  try {
    const res = await fetch('/api/meals');

    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }

    allMeals = await res.json();
    renderCards(allMeals);
    setupFilterListeners();
    console.log("✅ Meals loaded from MySQL:", allMeals);

  } catch (err) {
    console.error("❌ Failed to fetch meals:", err);
  }
}

// Call it immediately on page load
fetchMeals();
initNavSession();
setupMobileNav();

// Responsive Mobile Menu Controller
function setupMobileNav() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const drawer = document.getElementById('mobileNavDrawer');
  const hamburgerIcon = document.getElementById('hamburgerIcon');
  const closeIcon = document.getElementById('closeIcon');

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClosed = drawer.classList.contains('hidden');
    if (isClosed) {
      drawer.classList.remove('hidden');
      hamburgerIcon?.classList.add('hidden');
      closeIcon?.classList.remove('hidden');
    } else {
      drawer.classList.add('hidden');
      hamburgerIcon?.classList.remove('hidden');
      closeIcon?.classList.add('hidden');
    }
  });

  // Automatically close drawer when a navigation link is clicked
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.add('hidden');
      hamburgerIcon?.classList.remove('hidden');
      closeIcon?.classList.add('hidden');
    });
  });

  // Close drawer if user clicks anywhere outside
  document.addEventListener('click', (e) => {
    if (!drawer.contains(e.target) && !toggleBtn.contains(e.target) && !drawer.classList.contains('hidden')) {
      drawer.classList.add('hidden');
      hamburgerIcon?.classList.remove('hidden');
      closeIcon?.classList.add('hidden');
    }
  });
}

// Check and enhance navbar for both desktop and mobile if user has an active session
function initNavSession() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navAuthZone = document.getElementById('navAuthZone');
  const mobileAuthZone = document.getElementById('mobileAuthZone');

  if (token && user && user.role) {
    let portalLink = '';
    let portalLabel = '';
    let portalBadgeClass = '';

    if (user.role === 'admin') {
      portalLink = '/admin.html';
      portalLabel = '<span>⚙️</span> Admin Console ➔';
      portalBadgeClass = 'bg-wine-tint text-wine border-wine/20 hover:bg-wine/20 shadow-xs';
    } else if (user.role === 'waiter' || user.role === 'cashier') {
      portalLink = '/staff.html';
      portalLabel = '<span>🍽️</span> Staff Console ➔';
      portalBadgeClass = 'bg-olive/10 text-olive border-olive/20 hover:bg-olive/20 shadow-xs';
    } else {
      portalLink = '#';
      portalLabel = `<span>👤</span> ${user.username || 'Account'}`;
      portalBadgeClass = 'bg-canvas text-ink border-stone-border';
    }

    // 1. Desktop Nav Update
    if (navAuthZone) {
      navAuthZone.innerHTML = `
        <a
          href="${portalLink}"
          class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${portalBadgeClass}"
        >
          ${portalLabel}
        </a>

        <div class="flex items-center gap-3 pl-3 border-l border-stone-border">
          <div class="text-right hidden sm:block">
            <span class="text-xs font-bold text-ink block leading-tight">${user.username || 'User'}</span>
            <span class="text-[10px] font-bold uppercase tracking-wider text-ink-muted">${(user.role || '').toUpperCase()}</span>
          </div>
          <button
            onclick="window.customerLogout()"
            class="px-3 py-1.5 text-xs font-semibold text-terracotta hover:bg-terracotta/10 border border-terracotta/20 rounded-xl transition-all cursor-pointer"
            title="Sign Out of Session"
          >
            Sign Out
          </button>
        </div>
      `;
    }

    // 2. Mobile Drawer Update
    if (mobileAuthZone) {
      mobileAuthZone.innerHTML = `
        <a
          href="${portalLink}"
          class="w-full px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${portalBadgeClass}"
        >
          <span>${portalLabel}</span>
          <span>➔</span>
        </a>
        <div class="flex items-center justify-between pt-1 text-xs">
          <span class="font-bold text-ink">${user.username || 'User'} (${(user.role || '').toUpperCase()})</span>
          <button
            onclick="window.customerLogout()"
            class="px-3 py-1 text-xs font-semibold text-terracotta hover:bg-terracotta/10 border border-terracotta/20 rounded-lg cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      `;
    }
  } else {
    if (mobileAuthZone) {
      mobileAuthZone.innerHTML = `
        <a
          href="/login.html"
          class="w-full py-2.5 rounded-xl text-xs font-semibold bg-olive text-white text-center flex items-center justify-center gap-1.5 shadow-xs"
        >
          <span>Sign In</span>
          <span class="text-[10px]">➔</span>
        </a>
      `;
    }
  }
}

window.customerLogout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
};

// Map categories to high-res photography
function getDishImage(categoryName) {
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('pasta')) return 'https://ik.imagekit.io/z5fkmijzk/meals/tagliatelle.jpg?tr=w-800,q-80,f-auto';
  if (cat.includes('pizza')) return 'https://ik.imagekit.io/z5fkmijzk/meals/margherita.jpg?tr=w-800,q-80,f-auto';
  if (cat.includes('salad')) return 'https://ik.imagekit.io/z5fkmijzk/meals/fattoush.jpg?tr=w-800,q-80,f-auto';
  if (cat.includes('grill') || cat.includes('burger')) return 'https://ik.imagekit.io/z5fkmijzk/meals/shish_tawook.jpg?tr=w-800,q-80,f-auto';
  if (cat.includes('dessert') || cat.includes('dolce')) return 'https://ik.imagekit.io/z5fkmijzk/meals/knefeh.jpg?tr=w-800,q-80,f-auto';
  return 'assets/hero_feast.jpg';
}


function renderCards(meals) {
  const grid = document.getElementById('dishGrid');
  if (!grid) return;

  // Edge case: what if no dishes match the search?
  if (meals.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white border border-stone-border rounded-2xl p-6">
        <p class="font-serif text-lg font-bold text-ink">No culinary creations found</p>
        <p class="text-xs text-ink-muted mt-1">Try adjusting your search or category filter.</p>
      </div>`;
    return;
  }

  // Map each MySQL dish into a card
  grid.innerHTML = meals.map(dish => {
    const imageUrl = dish.image_url || getDishImage(dish.category_name);
    const priceFormatted = parseFloat(dish.price).toFixed(2);

    return `
      <div class="group bg-white border border-stone-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
        
        <!-- Image & Category Badge -->
        <div>
          <div class="relative h-48 w-full overflow-hidden bg-canvas">
            <img src="${imageUrl}" alt="${dish.meal_name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            <span class="absolute top-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm border border-stone-border text-[10px] font-bold uppercase tracking-wider text-olive rounded-full">
              ${dish.category_name}
            </span>
          </div>

          <!-- Title & Description -->
          <div class="p-5">
            <h3 class="font-serif text-lg font-bold text-ink">${dish.meal_name}</h3>
            <p class="text-xs text-ink-muted mt-1 leading-relaxed line-clamp-2">
              ${dish.description || 'Prepared fresh daily with authentic Mediterranean ingredients.'}
            </p>
          </div>
        </div>

        <!-- Price & Action Button -->
        <div class="p-5 pt-0 flex items-center justify-between border-t border-stone-border/40 mt-4">
          <div>
            <span class="text-[10px] uppercase font-bold text-ink-subtle block">Price</span>
            <span class="font-serif text-lg font-bold text-ink">$${priceFormatted}</span>
          </div>
          <button onclick="openDishModal(${dish.id})" class="px-3.5 py-1.5 bg-olive hover:bg-olive-hover text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5">
            <span>View Details</span>
            <span class="text-[10px]">➔</span>
          </button>
        </div>

      </div>
    `;
  }).join('');
}

function filterAndRender() {
  const filtered = allMeals.filter(dish => {
    const category = (dish.category_name || '').toLowerCase();
    const name = (dish.meal_name || '').toLowerCase();

    // 1. Category check
    const matchesCategory = (activeCategory === 'all') || category.includes(activeCategory);

    // 2. Search text check
    const matchesSearch = searchQuery === '' || name.includes(searchQuery) || category.includes(searchQuery);

    // Both must be true
    return matchesCategory && matchesSearch;
  });

  renderCards(filtered);
}



function setupFilterListeners() {
  // A. Search Bar Listener
  const searchInput = document.getElementById('menuSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      filterAndRender();
    });
  }

  // B. Category Buttons Listener
  const tiles = document.querySelectorAll('.cat-tile');
  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      // Step 1: Reset styles on all tiles
      tiles.forEach(t => {
        t.classList.remove('border-olive', 'active');
        t.classList.add('border-stone-border');
      });

      // Step 2: Highlight the clicked tile
      tile.classList.remove('border-stone-border');
      tile.classList.add('border-olive', 'active');

      // Step 3: Read data attribute
      activeCategory = tile.getAttribute('data-category');

      // Step 4: Re-filter
      filterAndRender();
    });
  });
}

// ==============================================
// DISH DETAIL & ORDERING MODAL CONTROLLER
// Purely dynamic - driven by MySQL data!
// ==============================================
let currentSelectedMeal = null;

// Pairing & provenance suggestions based on Mediterranean culinary profiles (100% Halal)
const CULINARY_NOTES = {
  pasta: {
    provenance: 'Hand-extruded semolina & artisanal olive oils',
    pairing: 'Sparkling San Pellegrino Aranciata or Blood Orange Infusion'
  },
  salad: {
    provenance: 'Crisp organic greens, wild sumac & cold-pressed virgin olive oil',
    pairing: 'Traditional Lebanese Mint Limonada with Orange Blossom'
  },
  pizza: {
    provenance: 'Hearth-baked fermented crust with San Marzano tomatoes',
    pairing: 'Sparkling Citrus Mineral Water with Basil & Fresh Lemon'
  },
  grill: {
    provenance: 'Flame-seared over embers with garlic toum & mountain zaatar',
    pairing: 'Chilled Artisanal Ayran or Fresh Pomegranate-Sumac Sparkler'
  },
  dessert: {
    provenance: 'Golden semolina, Aleppo pistachios & orange blossom water',
    pairing: 'Cardamom Spiced Arabic Coffee or Fresh Nana Spearmint Tea'
  },
  default: {
    provenance: 'Cold-pressed extra virgin olive oil & fresh sea salt',
    pairing: 'House Lemon-Rosemary Infusion or Sparkling Mineral Water'
  }
};

window.openDishModal = function(mealId) {
  const meal = allMeals.find(m => m.id === mealId);
  if (!meal) return;

  currentSelectedMeal = meal;

  const imageUrl = meal.image_url || getDishImage(meal.category_name);
  const basePrice = parseFloat(meal.price);
  const catKey = (meal.category_name || '').toLowerCase();
  const notes = CULINARY_NOTES[catKey] || CULINARY_NOTES.default;

  // Dynamic data binding
  document.getElementById('modalImage').src = imageUrl;
  document.getElementById('modalCategory').textContent = meal.category_name;
  document.getElementById('modalTitle').textContent = meal.meal_name;
  document.getElementById('modalDesc').textContent = meal.description || 'Prepared fresh daily with authentic Mediterranean ingredients.';
  document.getElementById('modalPrice').textContent = `$${basePrice.toFixed(2)}`;

  const provEl = document.getElementById('modalProvenance');
  const pairEl = document.getElementById('modalPairing');
  const availEl = document.getElementById('modalAvailability');

  if (provEl) provEl.textContent = notes.provenance;
  if (pairEl) pairEl.textContent = notes.pairing;
  if (availEl) {
    if (meal.is_available) {
      availEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Fresh in Dining Room';
      availEl.className = 'flex items-center gap-1.5 text-emerald-700 font-semibold';
    } else {
      availEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-terracotta inline-block"></span> Currently Out of Season';
      availEl.className = 'flex items-center gap-1.5 text-terracotta font-semibold';
    }
  }

  // Show the modal
  const modal = document.getElementById('dishModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.closeDishModal = function() {
  const modal = document.getElementById('dishModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  currentSelectedMeal = null;
};
