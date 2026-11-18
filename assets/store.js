(() => {
  const basePath = window.APP_BASE_PATH || '';
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const cartKey = 'alhos_cart';
  let checkoutOrderToken = window.CHECKOUT_ORDER_TOKEN;
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
  let checkoutOpenedAt = 0;
  document.getElementById('checkout-open').addEventListener('click', () => {
    cartOverlay.hidden = true;
    checkoutOverlay.hidden = false;
    checkoutOpenedAt = Date.now();
  });
  document.getElementById('checkout-close').addEventListener('click', () => { checkoutOverlay.hidden = true; });
  checkoutOverlay.addEventListener('click', (event) => {
    if (event.target === checkoutOverlay) checkoutOverlay.hidden = true;
  });

  const checkoutForm = document.getElementById('checkout-form');
  const paymentMethod = document.getElementById('payment-method');
  const pixPayment = document.getElementById('pix-payment');
  const pixQr = document.getElementById('pix-qr');
  const pixCopyCode = document.getElementById('pix-copy-code');
  const orderStatus = document.getElementById('order-status');
  const submitOrderButton = checkoutForm.querySelector('[type="submit"]');
  const finishPixOrderButton = document.getElementById('finish-pix-order');

  [checkoutForm.elements.namedItem('nome'), checkoutForm.elements.namedItem('telefone'), checkoutForm.elements.namedItem('endereco')]
    .forEach((input) => input.addEventListener('input', () => input.setCustomValidity('')));
  paymentMethod.addEventListener('change', () => paymentMethod.setCustomValidity(''));

  function pixField(id, value) {
    const text = String(value);
    return `${id}${String(text.length).padStart(2, '0')}${text}`;
  }

  function crc16Ccitt(value) {
    let crc = 0xffff;
    for (let index = 0; index < value.length; index += 1) {
      crc ^= value.charCodeAt(index) << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function createPixPayload(total) {
    const config = window.PIX_CONFIG;
    if (!config?.key || !config.merchantName || !config.merchantCity) {
      throw new Error('A configuração do Pix está incompleta.');
    }

    const merchantName = config.merchantName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const merchantCity = config.merchantCity.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const merchantAccount = pixField('00', 'BR.GOV.BCB.PIX') + pixField('01', config.key);
    const additionalData = pixField('05', '***');
    let payload = pixField('00', '01')
      + pixField('01', '11')
      + pixField('26', merchantAccount)
      + pixField('52', '0000')
      + pixField('53', '986')
      + pixField('54', total.toFixed(2))
      + pixField('58', 'BR')
      + pixField('59', merchantName.slice(0, 25))
      + pixField('60', merchantCity.slice(0, 15))
      + pixField('62', additionalData)
      + '6304';

    payload += crc16Ccitt(payload);
    return payload;
  }

  function updatePixPreview() {
    const isPix = paymentMethod.value === 'Pix';
    pixPayment.hidden = !isPix;
    if (!isPix) return;

    const total = cart.reduce((sum, item) => sum + Number(item.product.preco) * Number(item.quantity), 0);
    document.getElementById('pix-total').textContent = currency.format(total);
    try {
      const payload = createPixPayload(total);
      pixCopyCode.value = payload;
      document.getElementById('pix-qr-error').hidden = true;
      pixQr.hidden = true;
      pixQr.src = `https://api.qrserver.com/v1/create-qr-code/?format=svg&size=220x220&margin=8&data=${encodeURIComponent(payload)}`;
    } catch (error) {
      pixCopyCode.value = '';
      document.getElementById('pix-qr-error').textContent = error.message;
      document.getElementById('pix-qr-error').hidden = false;
    }
  }

  pixQr.addEventListener('load', () => {
    pixQr.hidden = false;
    document.getElementById('pix-qr-error').hidden = true;
  });
  pixQr.addEventListener('error', () => {
    pixQr.hidden = true;
    document.getElementById('pix-qr-error').textContent = 'Não foi possível carregar a imagem do QR Code. Você ainda pode copiar o código Pix abaixo.';
    document.getElementById('pix-qr-error').hidden = false;
  });
  paymentMethod.addEventListener('change', updatePixPreview);
  document.getElementById('copy-pix-code').addEventListener('click', async () => {
    if (!pixCopyCode.value) return;
    try {
      await navigator.clipboard.writeText(pixCopyCode.value);
      showToast('Código Pix copiado.');
    } catch {
      pixCopyCode.focus();
      pixCopyCode.select();
      orderStatus.textContent = 'Não foi possível copiar automaticamente. Selecione o código Pix e copie manualmente.';
      orderStatus.hidden = false;
    }
  });

  checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (cart.length === 0) {
      orderStatus.textContent = 'Seu pedido está vazio. Adicione sabores antes de finalizar.';
      orderStatus.hidden = false;
      return;
    }

    const nameInput = checkoutForm.elements.namedItem('nome');
    const phoneInput = checkoutForm.elements.namedItem('telefone');
    const addressInput = checkoutForm.elements.namedItem('endereco');
    const websiteInput = checkoutForm.elements.namedItem('website');
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    const nationalPhone = phoneDigits.startsWith('55') && [12, 13].includes(phoneDigits.length)
      ? phoneDigits.slice(2)
      : phoneDigits;

    if (websiteInput.value.trim() || !checkoutOpenedAt || Date.now() - checkoutOpenedAt < 1000) {
      orderStatus.textContent = 'Não foi possível validar o envio. Confira os dados e tente novamente.';
      orderStatus.hidden = false;
      return;
    }

    nameInput.setCustomValidity(/^[\p{L}\p{M}][\p{L}\p{M} .’'\-]{1,79}$/u.test(name)
      ? ''
      : 'Informe um nome válido com pelo menos 3 caracteres.');
    phoneInput.setCustomValidity(/^\+?[\d\s().-]+$/.test(phone) && /^[1-9]\d[2-9]\d{7,8}$/.test(nationalPhone)
      ? ''
      : 'Informe um telefone válido com DDD.');
    addressInput.setCustomValidity(address.length >= 8 && address.length <= 240 && /[\p{L}\p{N}]/u.test(address)
      ? ''
      : 'Informe um endereço completo com pelo menos 8 caracteres.');
    paymentMethod.setCustomValidity(['Pix', 'Dinheiro'].includes(paymentMethod.value)
      ? ''
      : 'Selecione uma forma de pagamento válida.');

    if (!checkoutForm.reportValidity()) return;

    nameInput.value = name;
    phoneInput.value = phone;
    addressInput.value = address;
    const form = new FormData(checkoutForm);
    const items = cart.map(({ product, quantity }) => ({ id: String(product.id), quantity }));
    const payment = String(form.get('pagamento'));
    const paymentDetails = payment === 'Pix'
      ? `Pagamento: Pix\nChave Pix: ${window.PIX_CONFIG.key}`
      : 'Pagamento: Dinheiro na entrega';
    const whatsappWindow = window.open('about:blank', '_blank');
    if (!whatsappWindow) {
      orderStatus.textContent = 'Permita a abertura de janelas para continuar para o WhatsApp.';
      orderStatus.hidden = false;
      return;
    }

    whatsappWindow.opener = null;
    submitOrderButton.disabled = true;
    orderStatus.textContent = 'Registrando o pedido...';
    orderStatus.hidden = false;
    let whatsappUrl;
    try {
      const response = await fetch(`${basePath}/api.php?action=record-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutToken: checkoutOrderToken,
          website: websiteInput.value,
          name,
          phone,
          address,
          payment,
          items,
        }),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error('O servidor retornou uma resposta inválida. Tente novamente.');
      }
      if (!result || typeof result !== 'object') {
        throw new Error('O servidor retornou uma resposta inválida. Tente novamente.');
      }
      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível registrar o pedido.');
      }
      if (
        result.success !== true ||
        typeof result.checkoutToken !== 'string' ||
        !result.order ||
        !Array.isArray(result.order.items) ||
        result.order.items.length === 0 ||
        !Number.isFinite(Number(result.order.total))
      ) {
        throw new Error('O servidor não confirmou o registro do pedido. Tente novamente.');
      }
      const products = result.order.items.map((item) => {
        if (typeof item.nome !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1) {
          throw new Error('O servidor retornou os itens do pedido em formato inválido.');
        }
        return `Produto: ${item.nome}\nQuantidade: ${item.quantity}`;
      }).join('\n\n');
      const deliveryImageUrl = new URL(`${basePath}/uploads/img/Entrega/Entrega_Gratis.jpeg`, window.location.origin).href;
      const message = `Olá, gostaria de fazer o seguinte pedido:\n\n${products}\n\nEntrega grátis!\nImagem: ${deliveryImageUrl}\n\nTotal: ${currency.format(Number(result.order.total))}\n${paymentDetails}\n\nNome: ${form.get('nome')}\nTelefone: ${form.get('telefone')}\nEndereço: ${form.get('endereco')}`;
      whatsappUrl = `https://wa.me/5521988832361?text=${encodeURIComponent(message)}`;
      checkoutOrderToken = result.checkoutToken;
      window.CHECKOUT_ORDER_TOKEN = result.checkoutToken;
    } catch (error) {
      whatsappWindow.close();
      orderStatus.textContent = error instanceof Error
        ? error.message
        : 'Não foi possível registrar o pedido. Tente novamente.';
      orderStatus.hidden = false;
      submitOrderButton.disabled = false;
      return;
    }

    whatsappWindow.location.href = whatsappUrl;

    if (payment === 'Pix') {
      orderStatus.textContent = 'Pedido registrado e preparado no WhatsApp. Envie a mensagem e depois pague pelo QR Code Pix acima.';
      orderStatus.hidden = false;
      submitOrderButton.hidden = true;
      finishPixOrderButton.hidden = false;
      return;
    }

    cart = [];
    saveCart();
    checkoutForm.reset();
    submitOrderButton.disabled = false;
    pixPayment.hidden = true;
    orderStatus.hidden = true;
    checkoutOverlay.hidden = true;
  });
  finishPixOrderButton.addEventListener('click', () => {
    cart = [];
    saveCart();
    checkoutForm.reset();
    pixPayment.hidden = true;
    orderStatus.hidden = true;
    submitOrderButton.disabled = false;
    submitOrderButton.hidden = false;
    finishPixOrderButton.hidden = true;
    checkoutOverlay.hidden = true;
  });

  renderCart();
  filterProducts();
})();
