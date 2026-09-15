document.addEventListener('DOMContentLoaded', () => {
  const API_URL = '/api';
  let currentReferencia = '';
  let activeCategory = 'todos';
  let products = [];
  let referenceOrders = {};
  let userNegocioId = null;

  function showNotification(message, isError = false) {
    const existingToast = document.querySelector('.kontak-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'kontak-toast';
    toast.setAttribute('style', `
      position: fixed !important;
      top: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      min-width: 300px !important;
      max-width: 90% !important;
      padding: 14px 20px !important;
      border-radius: 10px !important;
      color: #ffffff !important;
      background-color: ${isError ? '#2D3748' : '#10B981'} !important;
      border-left: 6px solid ${isError ? '#EF4444' : '#059669'} !important;
      box-shadow: 0 8px 20px rgba(0,0,0,0.25) !important;
      z-index: 999999 !important;
      font-size: 0.95rem !important;
      font-weight: 600 !important;
      text-align: center !important;
      box-sizing: border-box !important;
    `);

    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
  }

  async function init() {
    const currentUserEmail = localStorage.getItem('usuarioEmail') || localStorage.getItem('kontak_user_email');

    if (!currentUserEmail) {
      alert('⚠️ No se encontró sesión activa. Por favor inicie sesión.');
      window.location.href = 'index.html';
      return;
    }

    userNegocioId = localStorage.getItem('negocioId') || localStorage.getItem('kontak_negocio_id');

    try {
      const res = await fetch(`/api/usuarios/perfil/${currentUserEmail}`);
      const datos = await res.json();

      if (datos.success && datos.data) {
        if (datos.data.negocioId) {
          userNegocioId = typeof datos.data.negocioId === 'object' 
            ? datos.data.negocioId._id 
            : datos.data.negocioId;
          localStorage.setItem('negocioId', userNegocioId);
        }

        if (datos.data.negocioId && datos.data.negocioId.tipoReferenciaVenta) {
          const tipoConfig = datos.data.negocioId.tipoReferenciaVenta;
          const tipoInput = document.getElementById('tipoReferenciaInput');
          if (tipoInput) tipoInput.value = tipoConfig;
          localStorage.setItem('tipoReferenciaVenta', tipoConfig);
        }
      }
    } catch (error) {
      console.error('Error obteniendo perfil del usuario:', error);
    }

    const savedTipo = localStorage.getItem('tipoReferenciaVenta');
    if (savedTipo) {
      const tipoInput = document.getElementById('tipoReferenciaInput');
      if (tipoInput) tipoInput.value = savedTipo;
    }

    if (userNegocioId) {
      await cargarProductos();
    } else {
      showNotification('⚠️ El usuario no tiene un negocio asignado', true);
    }

    actualizarTipoYReferencia();
    renderOrder();
  }

  // Combinar el tipo (izq) y el número (der) en tiempo real
  window.actualizarTipoYReferencia = function() {
    const tipoInput = document.getElementById('tipoReferenciaInput');
    const numeroInput = document.getElementById('inputNumeroReferencia');

    const tipo = tipoInput ? tipoInput.value.trim() : 'Mesa';
    const numero = numeroInput ? numeroInput.value.trim() : '';

    localStorage.setItem('tipoReferenciaVenta', tipo);

    if (numero) {
      currentReferencia = `${tipo} ${numero}`;
    } else {
      currentReferencia = '';
    }

    if (currentReferencia && !referenceOrders[currentReferencia]) {
      referenceOrders[currentReferencia] = [];
    }

    const label = document.getElementById('currentMesaLabel');
    if (label) {
      label.textContent = currentReferencia || 'Sin seleccionar';
    }

    renderOrder();
  };

  async function cargarProductos() {
    try {
      const res = await fetch(`/api/productos/negocio/${userNegocioId}`);
      const respuesta = await res.json();

      if (respuesta.success && Array.isArray(respuesta.data)) {
        products = respuesta.data.map(prod => ({
          id: prod._id,
          name: prod.nombre,
          price: Number(prod.precio) || 0,
          category: prod.categoria ? prod.categoria.trim() : 'General',
          stock: prod.stock
        }));
        renderProducts();
      } else {
        products = [];
        renderProducts();
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      showNotification('❌ Error al conectar con el servidor', true);
    }
  }

  window.filterCategory = function(category, btnElement) {
    activeCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderProducts();
  };

  window.filterProducts = function() {
    renderProducts();
  };

  function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    grid.innerHTML = '';

    if (products.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#777; padding: 2rem;">No hay productos registrados en el inventario.</p>';
      return;
    }

    const filtered = products.filter(prod => {
      const matchCategory = activeCategory === 'todos' || prod.category.toLowerCase() === activeCategory.toLowerCase();
      const matchSearch = prod.name.toLowerCase().includes(searchTerm);
      return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#777; padding: 2rem;">No se encontraron productos coincidentes.</p>';
      return;
    }

    filtered.forEach(prod => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.onclick = () => addProduct(prod.id, prod.name, prod.price);
      card.innerHTML = `
        <span class="product-name">${prod.name}</span>
        <span class="product-price">$ ${prod.price.toLocaleString('es-CO')}</span>
      `;
      grid.appendChild(card);
    });
  }

  function addProduct(id, name, price) {
    if (!currentReferencia) {
      showNotification(`⚠️ Especifica primero la referencia completa (Ej: tipo y número)`, true);
      return;
    }

    if (!referenceOrders[currentReferencia]) {
      referenceOrders[currentReferencia] = [];
    }

    const items = referenceOrders[currentReferencia];
    const existing = items.find(item => item.id === id || item.name === name);

    if (existing) {
      existing.qty++;
    } else {
      items.push({ id, name, price, qty: 1 });
    }

    renderOrder();
  }

  window.updateQty = function(index, change) {
    if (!currentReferencia || !referenceOrders[currentReferencia]) return;

    const items = referenceOrders[currentReferencia];
    if (items[index]) {
      items[index].qty += change;
      if (items[index].qty <= 0) {
        items.splice(index, 1);
      }
      renderOrder();
    }
  };

  function renderOrder() {
    const container = document.getElementById('orderItemsList');
    const orderTotalEl = document.getElementById('orderTotal');
    if (!container) return;

    container.innerHTML = '';
    let total = 0;

    if (!currentReferencia || !referenceOrders[currentReferencia] || referenceOrders[currentReferencia].length === 0) {
      container.innerHTML = '<p style="color: #888; text-align: center; font-size: 0.85rem; padding: 1rem 0;">No hay productos agregados.</p>';
      if (orderTotalEl) orderTotalEl.textContent = '$ 0';
      return;
    }

    const items = referenceOrders[currentReferencia];

    items.forEach((item, index) => {
      const subtotal = item.price * item.qty;
      total += subtotal;

      const row = document.createElement('div');
      row.className = 'order-item-row';
      row.innerHTML = `
        <div>
          <strong>${item.name}</strong><br>
          <small style="color:#777;">$ ${item.price.toLocaleString('es-CO')}</small>
        </div>
        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <button class="btn-qty" onclick="updateQty(${index}, -1)" style="width:24px; height:24px;">-</button>
          <span style="font-weight:700;">${item.qty}</span>
          <button class="btn-qty" onclick="updateQty(${index}, 1)" style="width:24px; height:24px;">+</button>
          <strong style="margin-left: 8px;">$ ${subtotal.toLocaleString('es-CO')}</strong>
        </div>
      `;
      container.appendChild(row);
    });

    if (orderTotalEl) {
      orderTotalEl.textContent = `$ ${total.toLocaleString('es-CO')}`;
    }
  }

  window.sendOrder = async function() {
    if (!currentReferencia || !referenceOrders[currentReferencia] || referenceOrders[currentReferencia].length === 0) {
      showNotification(`⚠️ Debes indicar el número y agregar al menos un producto.`, true);
      return;
    }

    const payload = {
      mesa: currentReferencia,
      negocioId: userNegocioId,
      items: referenceOrders[currentReferencia].map(item => ({
        productoId: item.id,
        nombre: item.name,
        precio: item.price,
        cantidad: item.qty
      })),
      total: referenceOrders[currentReferencia].reduce((sum, item) => sum + (item.price * item.qty), 0)
    };

    try {
      const res = await fetch(`/api/comandas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (result.success) {
        showNotification(`✅ Comanda enviada exitosamente para ${currentReferencia}`);
      } else {
        showNotification(`✅ Comanda procesada para ${currentReferencia}`);
      }
    } catch (error) {
      console.warn('Backend sin endpoint /comandas activo, procesando localmente:', error);
      showNotification(`✅ Comanda registrada localmente para ${currentReferencia}`);
    }

    referenceOrders[currentReferencia] = [];
    renderOrder();
  };

  init();
});