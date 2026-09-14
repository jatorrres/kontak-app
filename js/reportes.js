let transaccionesGlobales = [];

document.addEventListener('DOMContentLoaded', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const dateInput = document.getElementById('pdfSpecificDate');
  if (dateInput) dateInput.value = today;

  try {
    let negocioId = localStorage.getItem('kontak_negocio_id') || localStorage.getItem('negocioId');

    if (!negocioId) {
      const userEmail = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');
      if (userEmail) {
        const resUser = await fetch(`/api/usuarios/perfil/${encodeURIComponent(userEmail)}`);
        const dataUser = await resUser.json();
        if (dataUser.success && dataUser.data.negocioId) {
          negocioId = dataUser.data.negocioId._id || dataUser.data.negocioId;
        }
      }
    }

    if (!negocioId) {
      console.warn('No se encontró un ID de negocio activo.');
      return;
    }

    const resRep = await fetch(`/api/reportes/negocio/${negocioId}`);
    const repData = await resRep.json();

    if (repData.success) {
      const { ventasTotalesDia, ordenesSaldadasCount, productoEstrella, productosRanking, transacciones } = repData.data;
      transaccionesGlobales = transacciones || [];

      const kpiVentas = document.getElementById('kpiVentasDia');
      const kpiOrdenes = document.getElementById('kpiOrdenesSaldadas');
      const kpiEstrella = document.getElementById('kpiProductoEstrella');

      if (kpiVentas) kpiVentas.textContent = `$ ${(ventasTotalesDia || 0).toLocaleString('es-CO')}`;
      if (kpiOrdenes) kpiOrdenes.textContent = ordenesSaldadasCount || 0;
      if (kpiEstrella) kpiEstrella.textContent = productoEstrella || 'Ninguno';

      const topContainer = document.getElementById('topProductsContainer');
      if (topContainer) {
        topContainer.innerHTML = '';
        const sortedProducts = Object.entries(productosRanking || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);

        if (sortedProducts.length === 0) {
          topContainer.innerHTML = '<p style="text-align: center; color: #64748B; padding: 1rem;">Sin ventas registradas hoy.</p>';
        } else {
          const maxVal = sortedProducts[0][1] || 1;
          sortedProducts.forEach(([nombre, cant]) => {
            const porcentaje = Math.round((cant / maxVal) * 100);
            topContainer.innerHTML += `
              <div class="ranking-item">
                <div class="ranking-info">
                  <span>${nombre}</span>
                  <span>${cant} unidades</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${porcentaje}%;"></div>
                </div>
              </div>
            `;
          });
        }
      }

      const tbody = document.querySelector('.report-table tbody');
      if (tbody) {
        tbody.innerHTML = '';
        if (!transacciones || transacciones.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #64748B;">No hay transacciones registradas.</td></tr>';
        } else {
          transacciones.forEach((item) => {
            const fechaFormateada = new Date(item.fecha).toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            tbody.innerHTML += `
              <tr>
                <td>${fechaFormateada}</td>
                <td>${item.mesa}</td>
                <td>${item.estado || 'Completado'}</td>
                <td>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>$ ${(item.total || 0).toLocaleString('es-CO')}</strong>
                    <button onclick="eliminarFacturaHistorica('${item._id}')" style="background: transparent; color: #EF4444; border: none; cursor: pointer; font-size: 1rem; padding: 2px 6px;" title="Eliminar factura">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          });
        }
      }
    }
  } catch (error) {
    console.error('Error cargando reportes:', error);
  }
});

window.eliminarFacturaHistorica = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta factura del historial?')) return;
  try {
    const response = await fetch(`/api/reportes/comanda/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      alert('Factura eliminada correctamente.');
      location.reload();
    } else {
      alert('No se pudo eliminar: ' + result.message);
    }
  } catch (error) {
    console.error('Error de red:', error);
    alert('Error al conectar con el servidor.');
  }
};

window.handlePeriodChange = function() {
  const type = document.getElementById('pdfTypeSelect')?.value;
  const groupDate = document.getElementById('groupDate');
  const groupWeek = document.getElementById('groupWeek');
  const groupMonth = document.getElementById('groupMonth');

  if (groupDate) groupDate.style.display = type === 'dia' ? 'flex' : 'none';
  if (groupWeek) groupWeek.style.display = type === 'semana' ? 'flex' : 'none';
  if (groupMonth) groupMonth.style.display = type === 'mes' ? 'flex' : 'none';
};

window.downloadPDFReport = function() {
  if (!window.jspdf) {
    alert('La librería jsPDF no está cargada.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const type = document.getElementById('pdfTypeSelect')?.value || 'general';

  doc.setFillColor(45, 27, 24);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('KONTAK - REPORTE DE VENTAS', 14, 18);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.text(`Tipo de Reporte: ${type.toUpperCase()}`, 14, 40);
  doc.text(`Fecha de Generación: ${new Date().toLocaleString('es-CO')}`, 14, 47);

  const sampleRows = transaccionesGlobales.map((item, index) => [
    `FAC-0${index + 1}`,
    new Date(item.fecha).toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    item.mesa,
    item.estado || 'Completado',
    `$ ${(item.total || 0).toLocaleString('es-CO')}`
  ]);

  if (typeof doc.autoTable === 'function') {
    doc.autoTable({
      startY: 55,
      head: [['Nº Factura', 'Fecha y Hora', 'Ubicación', 'Estado', 'Total']],
      body: sampleRows,
      headStyles: { fillColor: [255, 152, 0], textColor: [255, 255, 255], fontStyle: 'bold' }
    });
  } else {
    // Respaldo por si autoTable falla al cargar: imprime texto plano simple
    let y = 55;
    sampleRows.forEach(row => {
      doc.text(row.join(' - '), 14, y);
      y += 10;
    });
  }

  doc.save(`Reporte_Kontak_${type}.pdf`);
};