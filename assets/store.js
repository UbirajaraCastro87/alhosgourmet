(() => {
  const basePath = window.APP_BASE_PATH || '';
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const cartKey = 'alhos_cart';
  const productGrid = document.getElementById('product-grid');
  const searchInput = document.getElementById('product-search');
  const emptyResults = document.getElementById('empty-results');
  let activeFilter = 'todos';
  let cart = loadCart();
  let toastTimeout;

  function loadCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(cartKey) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => item?.product?.id && Number(item.quantity) > 0) : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    renderCart();
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => { toast.hidden = true; }, 3000);
  }

  function filterProducts() {
    if (!productGrid) return;
    const query = (searchInput?.value || '').trim().toLocaleLowerCase('pt-BR');
    let visibleCount = 0;
    productGrid.querySelectorAll('.product-card').forEach((card) => {
      const nameMatches = (card.dataset.name || '').includes(query);
      const price = Number(card.dataset.price);
      const priceMatches = activeFilter === 'todos'
        || (activeFilter === 'ate25' && price <= 25)
        || (activeFilter === 'acima25' && price > 25);
      card.hidden = !(nameMatches && priceMatches);
      if (!card.hidden) visibleCount += 1;
    });
    if (emptyResults) emptyResults.hidden = visibleCount > 0;
  }

  function renderCart() {
    const count = cart.reduce((sum, item) => sum + Number(item.quantity), 0);
    const countElement = document.getElementById('cart-count');
    countElement.textContent = String(count);
    countElement.hidden = count === 0;

    const itemsElement = document.getElementById('cart-items');
    const summaryElement = document.getElementById('cart-summary');
    if (cart.length === 0) {
      itemsElement.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>';
      summaryElement.hidden = true;
      return;
    }

    const total = cart.reduce((sum, item) => sum + Number(item.product.preco) * Number(item.quantity), 0);
    itemsElement.innerHTML = cart.map(({ product, quantity }) => `
      <article class="cart-item" data-cart-id="${escapeHtml(String(product.id))}">
        <div>
          <h3>${escapeHtml(product.nome)}</h3>
          <span class="cart-item-price">${currency.format(Number(product.preco))} cada</span>
          <div class="cart-item-controls">
            <button type="button" data-cart-action="decrease" aria-label="Diminuir quantidade">−</button>
            <span>${Number(quantity)}</span>
            <button type="button" data-cart-action="increase" aria-label="Aumentar quantidade">+</button>
          </div>
        </div>
        <div class="cart-item-total">
          ${currency.format(Number(product.preco) * Number(quantity))}
          <button class="cart-remove" type="button" data-cart-action="remove">Remover</button>
        </div>
      </article>`).join('');

    document.getElementById('cart-total').textContent = currency.format(total);
    summaryElement.hidden = false;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  document.querySelectorAll('[data-price-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.priceFilter;
      document.querySelectorAll('[data-price-filter]').forEach((item) => item.classList.toggle('active', item === button));
      filterProducts();
    });
  });
  searchInput?.addEventListener('input', filterProducts);

  productGrid?.addEventListener('click', (event) => {
    const quantityButton = event.target.closest('[data-quantity-change]');
    if (quantityButton) {
      const control = quantityButton.closest('.quantity-control');
      const quantityElement = control.querySelector('[data-quantity]');
      const nextQuantity = Math.max(1, Number(quantityElement.textContent) + Number(quantityButton.dataset.quantityChange));
      quantityElement.textContent = String(nextQuantity);
      return;
    }

    const addButton = event.target.closest('.add-to-cart');
    if (!addButton) return;
    try {
      const product = JSON.parse(addButton.dataset.product);
      const quantity = Number(addButton.closest('.product-card').querySelector('[data-quantity]').textContent);
      const existing = cart.find((item) => String(item.product.id) === String(product.id));
      if (existing) existing.quantity += quantity;
      else cart.push({ product, quantity });
      saveCart();
      showToast(`Adicionado: ${quantity}x ${product.nome}`);
      addButton.closest('.product-card').querySelector('[data-quantity]').textContent = '1';
    } catch {
      showToast('Não foi possível adicionar este sabor ao pedido.');
    }
  });

  const cartOverlay = document.getElementById('cart-overlay');
  document.getElementById('cart-open').addEventListener('click', () => { cartOverlay.hidden = false; });
  document.getElementById('cart-close').addEventListener('click', () => { cartOverlay.hidden = true; });
  cartOverlay.addEventListener('click', (event) => {
    if (event.target === cartOverlay) cartOverlay.hidden = true;
  });
  document.getElementById('cart-items').addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;
    const cartItem = button.closest('[data-cart-id]');
    const item = cart.find((entry) => String(entry.product.id) === cartItem.dataset.cartId);
    if (!item) return;

    if (button.dataset.cartAction === 'remove') cart = cart.filter((entry) => entry !== item);
    if (button.dataset.cartAction === 'increase') item.quantity += 1;
    if (button.dataset.cartAction === 'decrease') {
      item.quantity -= 1;
      if (item.quantity <= 0) cart = cart.filter((entry) => entry !== item);
    }
    saveCart();
  });

  const checkoutOverlay = document.getElementById('checkout-overlay');
  document.getElementById('checkout-open').addEventListener('click', () => {
    cartOverlay.hidden = true;
    checkoutOverlay.hidden = false;
  });
  document.getElementById('checkout-close').addEventListener('click', () => { checkoutOverlay.hidden = true; });
  checkoutOverlay.addEventListener('click', (event) => {
    if (event.target === checkoutOverlay) checkoutOverlay.hidden = true;
  });
  document.getElementById('checkout-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const products = cart.map(({ product, quantity }) => `Produto: ${product.nome}\nQuantidade: ${quantity}`).join('\n\n');
    const total = cart.reduce((sum, item) => sum + Number(item.product.preco) * Number(item.quantity), 0);
    const message = `Olá, gostaria de fazer o seguinte pedido:\n\n${products}\n\nTotal: ${currency.format(total)}\n\nNome: ${form.get('nome')}\nTelefone: ${form.get('telefone')}\nEndereço: ${form.get('endereco')}`;
    window.open(`https://wa.me/5521988832361?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    cart = [];
    saveCart();
    checkoutOverlay.hidden = true;
  });

  renderCart();
  filterProducts();
})();
