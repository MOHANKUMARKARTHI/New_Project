import { 
  CATEGORIES, PRODUCTS 
} from './data.js';

const CART_KEY = 'grocer_cart';
export const Cart = {
  items: () => JSON.parse(localStorage.getItem(CART_KEY) || '[]'),
  save: (items) => localStorage.setItem(CART_KEY, JSON.stringify(items)),
  add: (productId, qty = 1) => {
    const items = Cart.items();
    const found = items.find(i => i.productId === productId);
    if (found) found.qty += qty;
    else items.push({ productId, qty });
    Cart.save(items);
    Cart.updateBadge();
  },
  remove: (productId) => { Cart.save(Cart.items().filter(i => i.productId !== productId)); Cart.updateBadge(); },
  setQty: (productId, qty) => {
    const items = Cart.items().map(i => i.productId===productId?{...i, qty:Math.max(1, qty)}:i);
    Cart.save(items); Cart.updateBadge();
  },
  clear: () => { localStorage.removeItem(CART_KEY); Cart.updateBadge(); },
  count: () => Cart.items().reduce((s,i)=>s+i.qty,0),
  updateBadge: () => {
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = Cart.count());
  }
};

export function initHeader(active='home') {
  Cart.updateBadge();
  document.querySelectorAll('[data-active]').forEach(el => {
    if (el.dataset.active === active) el.classList.add('active');
  });
}

export function renderHome() {
  const container = document.getElementById('categories');
  if (!container) return;
  const searchInput = document.querySelector('#searchInput');
  const cards = CATEGORIES.map(c => CategoryCard(c)).join('');
  container.innerHTML = cards;
  const dots = document.querySelector('.hero-dots');
  if (dots) dots.innerHTML = '<span class="dot active"></span><span class="dot"></span><span class="dot"></span>';
  searchInput?.addEventListener('keyup', (e)=>{
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      window.location.href = `products.html?q=${encodeURIComponent(q)}`;
    }
  });
}

function CategoryCard(c) {
  return `
  <div class="cat-card">
    <img src="${c.image}" alt="${c.name}">
    <div class="cat-content">
      <h3>${c.name}</h3>
      <p>${c.desc}</p>
      <a class="link" href="products.html?category=${c.id}">View More →</a>
    </div>
  </div>`;
}

export function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  const category = params.get('category');
  const q = (params.get('q')||'').toLowerCase();

  const list = PRODUCTS.filter(p => {
    const matchCat = category ? p.category.toLowerCase() === category.toLowerCase() : true;
    const matchQ = q ? p.name.toLowerCase().includes(q) : Gtrue;
    return matchCat && matchQ;
  });

  document.getElementById('resultTitle').textContent =
    category ? (CATEGORIES.find(c=>c.id.toLowerCase()===category.toLowerCase())?.name || 'Products') : (q ? `Results for "${q}"` : 'All Products');

  grid.innerHTML = list.map(ProductCard).join('');

  const sel = document.getElementById('categorySelect');
  if (sel) {
    sel.value = category || 'all';
    sel.addEventListener('change', e => {
      const val = e.target.value;
      const base = 'products.html';
      if (val === 'all') location.href = base;
      else location.href = `${base}?category=${val}`;
    });
  }

  const search = document.getElementById('searchProducts');
  if (search) {
    search.value = q || '';
    search.addEventListener('keyup', (e)=>{
      if (e.key==='Enter') location.href = `products.html?q=${encodeURIComponent(search.value)}`;
    });
  }
}

function ProductCard(p) {
  const price = `₹${p.price.toFixed(2)} <span class="unit">/ ${p.unit}</span>`;
  return `
  <div class="product-card">
    <img src="${p.image}" alt="${p.name}" loading="lazy">
    <div class="pc-body">
      <h4>${p.name}</h4>
      <div class="rating" aria-label="rating">${'★'.repeat(Math.round(p.rating))}<span class="muted">${'★'.repeat(5-Math.round(p.rating))}</span></div>
      <div class="price">${price}</div>
      <button class="btn" data-add-product="${p.id}">Add to Basket</button>
    </div>
  </div>`;
}

document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-add-product]');
  if (btn) {
    const id = Number(btn.dataset.addProduct);
    Cart.add(id, 1);
    btn.textContent = 'Added ✓';
    setTimeout(()=> btn.textContent = 'Add to Basket', 1200);
  }
});

export function renderCart() {
  const container = document.getElementById('cartItems');
  if (!container) return;
  const items = Cart.items().map(it => ({ ...it, product: PRODUCTS.find(p => p.id === it.productId) }));
  if (items.length === 0) {
    container.innerHTML = `<div class="empty">Your basket is empty. <a href="index.html">Continue shopping →</a></div>`;
    document.getElementById('subtotal').textContent = '₹0.00';
    document.getElementById('checkoutBtn').classList.add('disabled');
    return;
  }
  container.innerHTML = items.map(CartRow).join('');
  computeTotals();
  container.addEventListener('input', e=>{
    const input = e.target.closest('input[data-qty]');
    if (input) {
      const id = Number(input.dataset.qty);
      Cart.setQty(id, parseInt(input.value || '1', 10));
      computeTotals();
    }
  });
  container.addEventListener('click', e=>{
    const del = e.target.closest('[data-remove]');
    if (del) {
      Cart.remove(Number(del.dataset.remove));
      renderCart();
    }
  });
}

function CartRow(it) {
  const p = it.product;
  const line = (p.price * it.qty).toFixed(2);
  return `
  <div class="cart-row">
    <img src="${p.image}" alt="${p.name}">
    <div class="info">
      <h4>${p.name}</h4>
      <div class="muted">${p.unit}</div>
      <button class="link danger" data-remove="${p.id}">Remove</button>
    </div>
    <div class="qty">
      <input type="number" min="1" value="${it.qty}" data-qty="${p.id}">
    </div>
    <div class="line">₹${line}</div>
  </div>`;
}

function computeTotals() {
  const items = Cart.items().map(it => ({...it, product: PRODUCTS.find(p => p.id === it.productId)}));
  const subtotal = items.reduce((s,i)=> s + i.product.price * i.qty, 0);
  document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById('total').textContent = `₹${subtotal.toFixed(2)}`;
}

export function renderCheckout() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;
  if (Cart.items().length === 0) {
    location.href = 'cart.html';
    return;
  }
  form.addEventListener('submit', e=>{
    e.preventDefault();
    sessionStorage.setItem('last_order_total', document.getElementById('summaryTotal').textContent);
    Cart.clear();
    location.href = 'success.html?order=' + Math.floor(Math.random()*900000 + 100000);
  });
  const items = Cart.items().map(it => ({...it, product: PRODUCTS.find(p => p.id === it.productId)}));
  const subtotal = items.reduce((s,i)=> s + i.product.price * i.qty, 0);
  const delivery = subtotal > 999 ? 0 : 49;
  document.getElementById('summarySubtotal').textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById('summaryDelivery').textContent = delivery === 0 ? 'Free' : `₹${delivery.toFixed(2)}`;
  document.getElementById('summaryTotal').textContent = `₹${(subtotal+delivery).toFixed(2)}`;
}

export function renderSuccess() {
  const el = document.getElementById('orderId');
  if (!el) return;
  const params = new URLSearchParams(location.search);
  el.textContent = params.get('order') || '—';
  document.getElementById('orderTotal').textContent = sessionStorage.getItem('last_order_total') || '₹0.00';
}

/* Stores List */
document.addEventListener('DOMContentLoaded', () => {
  const storeBtn = document.getElementById('storeBtn');
  const currentStore = document.getElementById('currentStore');
  const storeModal = document.getElementById('storeModal');
  const closeBtn = document.querySelector('.close');
  const storeList = document.getElementById('storeList');

  if (!storeBtn) return; // Safety check

  // Open modal
  storeBtn.addEventListener('click', () => {
      storeModal.style.display = 'block';
  });

  // Close modal
  closeBtn.addEventListener('click', () => {
      storeModal.style.display = 'none';
  });

  // Select store
  storeList.addEventListener('click', (e) => {
      if (e.target.tagName === 'LI') {
          const selectedStore = e.target.getAttribute('data-store');
          currentStore.textContent = `📍 ${selectedStore}`;
          storeModal.style.display = 'none';
          localStorage.setItem('selectedStore', selectedStore);
      }
  });

  // Load saved store on page reload
  const savedStore = localStorage.getItem('selectedStore');
  if (savedStore) {
      currentStore.textContent = `📍 ${savedStore}`;
  }
});
