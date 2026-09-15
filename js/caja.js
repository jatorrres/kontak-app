document.addEventListener('DOMContentLoaded', () => {
  let currentMethod = 'Efectivo';
  let currentTableOpen = null;
  let tableData = {};
  let comandasIdsMap = {}; 

  const ordersGrid = document.getElementById('ordersGrid');
  const API_URL = '/api';

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
      white-space: pre-line;
    `);

    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4500);
  }

  function getTipoConfig() {
    return localStorage.getItem('tipoReferenciaVenta') || 'Mesa';
  }

  function actualizarTextosDinamicos() {
    const tipo = getTipoConfig();
    const titulo = document.getElementById('tituloVistaGeneral');
    if (titulo) titulo.textContent = `Vista General de ${tipo}s`;
  }

  async function initCaja() {
    actualizarTextosDinamicos();
    let userNegocioId = localStorage.getItem('kontak_negocio_id') || localStorage.getItem('negocioId');

    if (!userNegocioId || userNegocioId === 'undefined' || userNegocioId === 'null') {
      if (ordersGrid) {
        ordersGrid.innerHTML = '<p style="color:#EF4444; text-align:center; grid-column: 1/-1; padding: 2rem;">No se encontró un ID de negocio válido en la sesión.</p>';
      }
      return;
    }

    try {
      const res = await fetch(`/api/comandas/negocio/${userNegocioId}`);
      const textoRespuesta = await res.text();
      
      try {
        const respuesta = JSON.parse(textoRespuesta);
        
        if (respuesta.success && Array.isArray(respuesta.data)) {
          tableData = {}; 
          comandasIdsMap = {};

          respuesta.data.forEach(comanda => {
            const mesaNombre = comanda.mesa;
            if (comanda._id) {
              comandasIdsMap[mesaNombre] = comanda._id;
            }

            if (!tableData[mesaNombre]) {
              tableData[mesaNombre] = [];
            }
            if (Array.isArray(comanda.items)) {
              comanda.items.forEach(item => {
                tableData[mesaNombre].push({
                  name: item.nombre,
                  price: item.precio,
                  qty: item.cantidad
                });
              });
            }
          });

          renderizarGrillaMesas();
        }
      } catch (jsonError) {
        console.error("Error al procesar JSON:", textoRespuesta);
      }
    } catch (error) {
      console.error('Error al sincronizar comandas de caja:', error);
    }
  }

  function renderizarGrillaMesas() {
    if (!ordersGrid) return;
    ordersGrid.innerHTML = '';

    const mesasKeys = Object.keys(tableData);
    const tipo = getTipoConfig();

    if (mesasKeys.length === 0) {
      ordersGrid.innerHTML = `<p style="color:#FFF; text-align:center; grid-column: 1/-1; padding: 2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.6);">No hay ${tipo.toLowerCase()}s con consumos activos en este momento.</p>`;
      return;
    }

    mesasKeys.forEach(mesa => {
      const items = tableData[mesa] || [];
      const total = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const isOcupada = total > 0;

      const card = document.createElement('div');
      card.className = `order-card ${isOcupada ? 'status-pendiente' : 'status-disponible'}`;
      card.setAttribute('data-table', mesa);
      card.onclick = () => openTableDetail(mesa, 'Mesero');

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <h3 class="card-title-text" style="margin: 0; font-size: 1.1rem;">${mesa}</h3>
          <span class="badge-status">${isOcupada ? 'Ocupada' : 'Disponible'}</span>
        </div>
        <div class="card-subtitle-text" style="margin: 10px 0; font-size: 0.9rem;">
          ${items.length} producto(s) en comanda
        </div>
        <div class="order-total-preview" style="font-weight: bold; font-size: 1.1rem;">
          $ ${total.toLocaleString('es-CO')}
        </div>
      `;
      ordersGrid.appendChild(card);
    });
  }

  window.seleccionarMesaMostrador = async function() {
    const nombreMostrador = `Mostrador #${Math.floor(100 + Math.random() * 900)}`;
    let userNegocioId = localStorage.getItem('kontak_negocio_id') || localStorage.getItem('negocioId');
    
    try {
      const response = await fetch(`/api/comandas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId: userNegocioId,
          mesa: nombreMostrador,
          items: []
        })
      });
      const result = await response.json();
      if (result.success) {
        showNotification(`🛍️ Pedido creado para ${nombreMostrador}`);
        await initCaja();
        openTableDetail(nombreMostrador, 'Cajero / Directo');
      } else {
        showNotification('❌ No se pudo crear el pedido de mostrador', true);
      }
    } catch (e) {
      showNotification('❌ Error de conexión al crear mostrador', true);
    }
  };

  window.openTableDetail = function(table, waiter) {
    currentTableOpen = table;
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('selectedTable').textContent = table;
    document.getElementById('selectedWaiter').textContent = `Atendido por: ${waiter || 'Caja'}`;
    renderItems(table);
    calcularCambio();
  };

  window.closeTableDetail = function() {
    document.getElementById('modalOverlay').classList.remove('active');
    currentTableOpen = null;
    const inputEfectivo = document.getElementById('inputEfectivoRecibido');
    if (inputEfectivo) inputEfectivo.value = '';
  };

  window.closeOnOverlayClick = function(event) {
    if (event.target.id === 'modalOverlay') {
      closeTableDetail();
    }
  };

  function renderItems(table) {
    const list = document.getElementById('itemsList');
    if (!list) return;
    list.innerHTML = '';
    let total = 0;

    if (!tableData[table]) tableData[table] = [];
    const items = tableData[table];

    if (items.length === 0) {
      list.innerHTML = '<p style="color:#888; font-size:0.85rem; text-align:center; padding:1rem 0;">Sin consumo registrado. Añade productos arriba.</p>';
    } else {
      items.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;

        const row = document.createElement('div');
        row.className = 'checkout-item';
        row.innerHTML = `
          <div>
            <strong>${item.name}</strong><br>
            <small style="color:#777;">$ ${item.price.toLocaleString('es-CO')} c/u</small>
          </div>
          <div class="item-qty-controls">
            <button class="btn-qty" onclick="updateQty('${table}', ${index}, -1)">-</button>
            <span style="font-weight:700; min-width: 18px; text-align: center;">${item.qty}</span>
            <button class="btn-qty" onclick="updateQty('${table}', ${index}, 1)">+</button>
            <strong style="margin-left:8px; min-width: 70px; text-align: right;">$ ${itemTotal.toLocaleString('es-CO')}</strong>
            <button class="btn-remove-item" onclick="removeItem('${table}', ${index})" title="Eliminar ítem">
              <i class="bi bi-x-circle-fill"></i>
            </button>
          </div>
        `;
        list.appendChild(row);
      });
    }

    const totalAmountElem = document.getElementById('totalAmount');
    if (totalAmountElem) totalAmountElem.textContent = `$ ${total.toLocaleString('es-CO')}`;
    calcularCambio();
  }

  window.updateQty = function(table, index, change) {
    if (tableData[table] && tableData[table][index]) {
      tableData[table][index].qty += change;
      if (tableData[table][index].qty <= 0) {
        tableData[table].splice(index, 1);
      }
      renderItems(table);
      updateCardUI(table);
    }
  };

  window.removeItem = function(table, index) {
    if (tableData[table] && tableData[table][index]) {
      tableData[table].splice(index, 1);
      renderItems(table);
      updateCardUI(table);
    }
  };

  function updateCardUI(table) {
    const card = document.querySelector(`[data-table="${table}"]`);
    if (card) {
      const items = tableData[table] || [];
      const total = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const preview = card.querySelector('.order-total-preview');
      const badge = card.querySelector('.badge-status');

      if (preview) preview.textContent = `$ ${total.toLocaleString('es-CO')}`;

      if (total > 0) {
        card.className = 'order-card status-pendiente';
        if (badge) badge.textContent = 'Ocupada';
      } else {
        card.className = 'order-card status-disponible';
        if (badge) badge.textContent = 'Disponible';
      }
    }
  }

  window.setPaymentMethod = function(method, btnElement) {
    currentMethod = method;
    document.querySelectorAll('.pay-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    const efectivoContainer = document.getElementById('efectivoContainer');
    if (efectivoContainer) {
      efectivoContainer.style.display = (method === 'Efectivo') ? 'block' : 'none';
    }
  };

  window.calcularCambio = function() {
    if (!currentTableOpen) return;
    const items = tableData[currentTableOpen] || [];
    const total = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    
    const inputRecibido = document.getElementById('inputEfectivoRecibido');
    const spanCambio = document.getElementById('cambioCalculado');
    if (!inputRecibido || !spanCambio) return;

    const recibido = parseFloat(inputRecibido.value) || 0;
    const cambio = recibido - total;

    if (cambio >= 0) {
      spanCambio.textContent = `$ ${cambio.toLocaleString('es-CO')}`;
      spanCambio.style.color = '#059669';
    } else {
      spanCambio.textContent = `Faltan $ ${Math.abs(cambio).toLocaleString('es-CO')}`;
      spanCambio.style.color = '#EF4444';
    }
  };

  window.printDetailedPreBill = function() {
    const table = document.getElementById('selectedTable').textContent;
    const items = tableData[table] || [];
    let total = 0;

    let itemsHtml = '';
    items.forEach(item => {
      const subtotal = item.price * item.qty;
      total += subtotal;
      itemsHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.qty}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$ ${item.price.toLocaleString('es-CO')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$ ${subtotal.toLocaleString('es-CO')}</td>
        </tr>
      `;
    });

    const printWindow = window.open('', '_blank', 'width=600,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>Pre-Factura - ${table}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 20px; margin: 0; }
            .ticket-container { max-width: 400px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px; }
            h2 { text-align: center; margin-bottom: 5px; color: #111; }
            p { text-align: center; font-size: 0.9rem; color: #666; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9rem; }
            th { background-color: #f8fafc; border-bottom: 2px solid #ddd; padding: 8px; text-align: left; }
            .total-section { margin-top: 20px; border-top: 2px dashed #333; padding-top: 10px; display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; font-size: 0.85rem; color: #777; }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <h2>KONTAK POS</h2>
            <p>Pre-Factura de Consumo</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;">
            <div style="font-size: 0.9rem; margin-bottom: 10px;">
              <strong>Referencia:</strong> ${table}<br>
              <strong>Fecha:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
            </div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: center;">Cant</th>
                  <th>Producto</th>
                  <th style="text-align: right;">Precio</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="total-section">
              <span>TOTAL A PAGAR:</span>
              <span>$ ${total.toLocaleString('es-CO')}</span>
            </div>
            <div class="footer">
              ¡Gracias por su visita!<br>Generado por Sistema Kontak POS
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  window.processPayment = async function() {
    if (!currentTableOpen) {
      alert('No hay una comanda seleccionada para cobrar.');
      return;
    }

    const comandaId = comandasIdsMap[currentTableOpen];
    if (!comandaId) {
      alert('No se encontró el identificador de la comanda en la base de datos.');
      return;
    }

    try {
      const response = await fetch(`/api/comandas/${comandaId}/pagar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          metodoPago: currentMethod || 'Efectivo' 
        })
      });

      const result = await response.json();

      if (result.success) {
        showNotification('✅ ¡Pago registrado con éxito! Guardado en reportes.');
        closeTableDetail();
        await initCaja();
      } else {
        alert('No se pudo procesar el pago: ' + result.message);
      }
    } catch (error) {
      console.error('Error de red al registrar el pago:', error);
      alert('Error interno al conectar con el servidor.');
    }
  };

  initCaja();
});