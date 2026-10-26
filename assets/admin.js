(() => {
  const basePath = window.APP_BASE_PATH || '';
  const apiUrl = `${basePath}/api.php`;
  const loginPanel = document.getElementById('login-panel');
  const workspace = document.getElementById('admin-workspace');
  const errorBox = document.getElementById('admin-error');
  const formError = document.getElementById('form-error');
  const form = document.getElementById('product-form');
  const photoInput = document.getElementById('product-photo');
  const photoValue = document.getElementById('product-image');
  const photoUrl = document.getElementById('product-image-url');
  const preview = document.getElementById('image-preview');
  const previewImage = document.getElementById('image-preview-img');
  const saveButton = document.getElementById('save-product');
  let products = [];
  let toastTimeout;

  async function request(url, options = {}) {
    let response;
    try {
      response = await fetch(url, { cache: 'no-store', ...options });
    } catch {
      throw new Error('Não foi possível conectar ao servidor local. Verifique se o Apache está ativo.');
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('O servidor retornou uma resposta inválida. Confira a configuração do PHP no XAMPP.');
    }
    if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
    return result;
  }

  function showError(message, target = errorBox) {
    target.textContent = message;
    target.hidden = false;
  }

  function hideError(target = errorBox) {
    target.textContent = '';
    target.hidden = true;
  }

  function notify(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => { toast.hidden = true; }, 3000);
  }

  async function loadProducts() {
    const result = await request(`${apiUrl}?action=products`);
    products = result.products;
    renderProducts();
    return result;
  }

  function renderProducts() {
    const list = document.getElementById('admin-product-list');
    document.getElementById('product-count').textContent = String(products.length);
    if (products.length === 0) {
      list.innerHTML = '<p class="cart-empty">Nenhum sabor cadastrado.</p>';
      return;
    }

    list.innerHTML = products.map((product) => `
      <article class="admin-product" data-product-id="${escapeHtml(product.id)}">
        <div class="admin-product-main">
          <img src="${escapeHtml(product.imagem)}" alt="" loading="lazy">
          <div>
            <h3>${escapeHtml(product.nome)}</h3>
            <p>${formatPrice(product.preco)}</p>
          </div>
        </div>
        <div class="admin-product-actions">
          <button class="text-button edit" type="button" data-action="edit">Editar</button>
          <button class="text-button delete" type="button" data-action="delete">Excluir</button>
        </div>
      </article>`).join('');
  }

  function formatPrice(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  function setAuthenticated(authenticated) {
    loginPanel.hidden = authenticated;
    workspace.hidden = !authenticated;
    document.getElementById('logout-button').hidden = !authenticated;
  }

  function setImage(image) {
    photoValue.value = image;
    photoUrl.value = image.startsWith('data:') || image.startsWith(`${basePath}/uploads/`) ? '' : image;
    previewImage.src = image;
    preview.hidden = !image;
  }

  function clearForm() {
    form.reset();
    document.getElementById('product-id').value = '';
    photoValue.value = '';
    photoUrl.value = '';
    previewImage.removeAttribute('src');
    preview.hidden = true;
    document.getElementById('form-title').textContent = 'Adicionar Sabor';
    saveButton.textContent = 'Cadastrar';
    document.getElementById('cancel-edit').hidden = true;
    hideError(formError);
  }

  async function migrateLegacyProducts(state, password) {
    if (!state.legacyImportPending) return;
    let legacyProducts = [];
    try {
      const saved = JSON.parse(localStorage.getItem('alhos_products_v1') || '[]');
      if (Array.isArray(saved)) {
        legacyProducts = saved.filter((product) =>
          product && typeof product.id === 'string' &&
          typeof product.nome === 'string' &&
          typeof product.descricao === 'string' &&
          Number.isFinite(Number(product.preco)) &&
          typeof product.imagem === 'string'
        ).slice(0, 100);
      }
    } catch {
      legacyProducts = [];
    }

    await request(`${apiUrl}?action=import-legacy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: legacyProducts }),
    });
    await loadProducts();
    localStorage.removeItem('alhos_products_v1');
  }

  async function compressImage(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const maxSize = 1200;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível processar a imagem.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
      if (!blob) throw new Error('Não foi possível processar a imagem.');
      return new File([blob], `product-${Date.now()}.jpg`, { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError();
    const password = new FormData(event.currentTarget).get('password');
    try {
      await request(`${apiUrl}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const state = await loadProducts();
      await migrateLegacyProducts(state, password);
      setAuthenticated(true);
    } catch (error) {
      showError(error.message);
    }
  });

  document.getElementById('logout-button').addEventListener('click', async () => {
    try {
      await request(`${apiUrl}?action=logout`, { method: 'POST' });
      setAuthenticated(false);
      document.getElementById('login-form').reset();
      notify('Você saiu do painel.');
    } catch (error) {
      showError(error.message);
    }
  });

  photoUrl.addEventListener('input', () => {
    const value = photoUrl.value.trim();
    photoValue.value = value;
    previewImage.src = value;
    preview.hidden = !value;
  });

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    hideError(formError);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('Use uma foto JPEG, PNG ou WebP.', formError);
      photoInput.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showError('A foto deve ter no máximo 8 MB.', formError);
      photoInput.value = '';
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Enviando foto...';
    try {
      const optimizedFile = await compressImage(file);
      const body = new FormData();
      body.append('photo', optimizedFile);
      const result = await request(`${basePath}/upload.php`, { method: 'POST', body });
      setImage(result.image);
      notify('Foto enviada ao servidor local.');
    } catch (error) {
      showError(error.message, formError);
      photoInput.value = '';
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = document.getElementById('product-id').value ? 'Salvar alterações' : 'Cadastrar';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError(formError);
    if (!photoValue.value.trim()) {
      showError('Envie uma foto ou informe uma URL de imagem.', formError);
      return;
    }

    const body = {
      id: document.getElementById('product-id').value,
      nome: document.getElementById('product-name').value,
      preco: Number(document.getElementById('product-price').value),
      imagem: photoValue.value.trim(),
      descricao: document.getElementById('product-description').value,
    };
    saveButton.disabled = true;
    saveButton.textContent = 'Salvando...';
    try {
      const result = await request(`${apiUrl}?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      products = result.products;
      renderProducts();
      clearForm();
      notify('Sabor salvo com sucesso.');
    } catch (error) {
      showError(error.message, formError);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = document.getElementById('product-id').value ? 'Salvar alterações' : 'Cadastrar';
    }
  });

  document.getElementById('cancel-edit').addEventListener('click', clearForm);

  document.getElementById('admin-product-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const card = button.closest('[data-product-id]');
    const product = products.find((item) => String(item.id) === card.dataset.productId);
    if (!product) return;

    if (button.dataset.action === 'edit') {
      document.getElementById('product-id').value = product.id;
      document.getElementById('product-name').value = product.nome;
      document.getElementById('product-price').value = Number(product.preco).toFixed(2);
      document.getElementById('product-description').value = product.descricao;
      setImage(product.imagem);
      document.getElementById('form-title').textContent = 'Editar Sabor';
      saveButton.textContent = 'Salvar alterações';
      document.getElementById('cancel-edit').hidden = false;
      document.getElementById('product-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!window.confirm(`Deseja excluir "${product.nome}"?`)) return;
    button.disabled = true;
    try {
      const result = await request(`${apiUrl}?action=delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id }),
      });
      products = result.products;
      renderProducts();
      if (document.getElementById('product-id').value === product.id) clearForm();
      notify('Sabor excluído.');
    } catch (error) {
      showError(error.message);
      button.disabled = false;
    }
  });

  document.getElementById('restore-defaults').addEventListener('click', async () => {
    if (!window.confirm('Restaurar os sabores padrão? Os sabores atuais serão removidos.')) return;
    try {
      const result = await request(`${apiUrl}?action=reset`, { method: 'POST' });
      products = result.products;
      renderProducts();
      clearForm();
      notify('Sabores padrão restaurados.');
    } catch (error) {
      showError(error.message);
    }
  });

  (async () => {
    try {
      await loadProducts();
      const status = await request(`${apiUrl}?action=status`);
      if (status.authenticated) setAuthenticated(true);
    } catch (error) {
      showError(error.message);
      document.querySelector('#login-form button').disabled = true;
    }
  })();
})();
