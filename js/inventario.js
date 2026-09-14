// Al inicio de js/inventario.js
const rolActual = (localStorage.getItem('usuarioRol') || '').toLowerCase();
if (rolActual.includes('mesero')) {
    alert('No tienes permisos para acceder al inventario.');
    window.location.href = 'mesero.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modalProductOverlay');
  const confirmModal = document.getElementById('confirmDeleteModal');
  const tableBody = document.getElementById('inventoryTableBody');
  const selectCat = document.getElementById('productCategory');
  
  let productIdToDelete = null;
  let userNegocioId = null;
  let productosGlobales = []; 
  let listaCategorias = []; // Se llenará desde la base de datos

  const currentUserEmail = localStorage.getItem('kontak_user_email') || localStorage.getItem('usuarioEmail');

  async function init() {
    if (!currentUserEmail) {
      alert("No se encontró sesión activa. Por favor inicie sesión.");
      window.location.href = 'index.html';
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/usuarios/perfil/${currentUserEmail}`);
      const datos = await res.json();

      if (datos.success && datos.data.negocioId) {
        userNegocioId = typeof datos.data.negocioId === 'object' 
          ? datos.data.negocioId._id 
          : datos.data.negocioId;
console.log("🟢 Negocio actual cargado en inventario:", userNegocioId);
        await cargarCategorias();
        await cargarProductos();
      } else {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">El usuario no tiene un negocio asignado o el correo no coincide.</td></tr>';
      }
    } catch (error) {
      console.error("Error al iniciar el inventario:", error);
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Error al conectar con el servidor backend.</td></tr>';
    }
  }

  // Cargar categorías del negocio desde la BD
  async function cargarCategorias() {
    try {
      const res = await fetch(`http://localhost:3000/api/categorias/negocio/${userNegocioId}`);
      const textoRespuesta = await res.text();
      
      let respuesta;
      try {
        respuesta = JSON.parse(textoRespuesta);
      } catch (e) {
        console.error("Respuesta inesperada del servidor (No es JSON):", textoRespuesta);
        return;
      }
      
      if (respuesta.success) {
        listaCategorias = respuesta.data.map(cat => ({ id: cat._id, nombre: cat.nombre }));
        
        if (listaCategorias.length === 0) {
          await crearCategoriaPorDefecto("General");
        } else {
          actualizarSelectsCategorias();
        }
      }
    } catch (error) {
      console.error("Error cargando categorías:", error);
    }
  }

  async function crearCategoriaPorDefecto(nombre) {
    try {
      const res = await fetch('http://localhost:3000/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, negocioId: userNegocioId })
      });
      const data = await res.json();
      if (data.success) {
        listaCategorias.push({ id: data.data._id, nombre: data.data.nombre });
        actualizarSelectsCategorias();
      }
    } catch (e) {
      console.error("Error al crear categoría por defecto:", e);
    }
  }

  // Cargar productos desde la base de datos
  async function cargarProductos() {
    try {
      const res = await fetch(`http://localhost:3000/api/productos/negocio/${userNegocioId}`);
      const respuesta = await res.json();
      
      productosGlobales = respuesta.data || [];
      renderizarTabla(productosGlobales);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  }

  // Renderizar productos en la tabla
  function renderizarTabla(listaProductos) {
    tableBody.innerHTML = '';

    if (listaProductos.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay productos registrados o que coincidan con el filtro.</td></tr>';
      return;
    }

    listaProductos.forEach(prod => {
      const stockColor = prod.stock > 5 ? '#16A34A' : '#EF4444';
      const stockText = `<strong style="color: ${stockColor};">${prod.stock} unidades</strong>`;
      const badgeHTML = prod.stock > 5 
        ? '<span style="background:#DCFCE7; color:#166534; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem; font-weight:bold;">Disponible</span>' 
        : '<span style="background:#FEE2E2; color:#991B1B; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem; font-weight:bold;">Bajo Stock</span>';

      const codigo = prod.codigo ? (prod.codigo.startsWith('#') ? prod.codigo : '#' + prod.codigo) : '#00';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${codigo}</td>
        <td><strong>${prod.nombre}</strong></td>
        <td><span style="background:#E2E8F0; color:#334155; padding:0.25rem 0.6rem; border-radius:6px; font-size:0.8rem; font-weight:600;">${prod.categoria || 'General'}</span></td>
        <td>$ ${Number(prod.precio).toLocaleString('es-CO')}</td>
        <td>${stockText}</td>
        <td>${badgeHTML}</td>
        <td>
          <button style="background-color: #EF4444; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-weight: bold;" onclick="requestDeleteProduct('${prod._id}')">
            <i class="bi bi-trash-fill"></i> Eliminar
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Modales y Gestión de Categorías
  window.openModal = function() {
    if (modal) modal.classList.add('active');
  };

  window.closeModal = function() {
    if (modal) {
      modal.classList.remove('active');
      const form = document.getElementById('productForm');
      if (form) form.reset();
    }
  };

  window.closeOnOverlayClick = function(event) {
    if (event.target.id === 'modalProductOverlay') closeModal();
  };

  window.openManageCategoriesModal = function() {
    const manageModal = document.getElementById('manageCategoriesModal');
    if (manageModal) {
      manageModal.classList.add('active');
      renderizarListaCategoriasAdmin();
    }
  };

  window.closeManageCategoriesModal = function() {
    const manageModal = document.getElementById('manageCategoriesModal');
    if (manageModal) manageModal.classList.remove('active');
  };

  function renderizarListaCategoriasAdmin() {
    const container = document.getElementById('categoriesListContainer');
    if (!container) return;

    container.innerHTML = '';

    if (listaCategorias.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#64748B; font-size:0.85rem;">No hay categorías creadas.</p>';
      return;
    }

    listaCategorias.forEach((cat) => {
      const item = document.createElement('div');
      item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #E2E8F0;";
      item.innerHTML = `
        <span style="font-size: 0.9rem; color: #1E293B; font-weight: 500;">${cat.nombre}</span>
        <div style="display: flex; gap: 0.4rem;">
          <button type="button" class="btn-category-action" onclick="borrarCategoriaBD('${cat.id}')" style="background: #EF4444; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem;" title="Borrar"><i class="bi bi-trash-fill"></i></button>
        </div>
      `;
      container.appendChild(item);
    });
  }

  window.addNewCategoryToList = async function() {
    const input = document.getElementById('newCategoryInput');
    const val = input.value.trim();

    if (val === '') {
      alert("El nombre de la categoría no puede estar vacío.");
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: val, negocioId: userNegocioId })
      });

      const textoRespuesta = await res.text();
      let data;
      try {
        data = JSON.parse(textoRespuesta);
      } catch (e) {
        console.error("Respuesta inesperada al añadir categoría (No es JSON):", textoRespuesta);
        alert("El servidor no devolvió una respuesta válida. Revisa la consola.");
        return;
      }

      if (data.success) {
        listaCategorias.push({ id: data.data._id, nombre: data.data.nombre });
        input.value = '';
        actualizarSelectsCategorias();
        renderizarListaCategoriasAdmin();
      } else {
        alert(data.message || "No se pudo crear la categoría.");
      }
    } catch (error) {
      console.error("Error al añadir categoría:", error);
    }
  };

  window.borrarCategoriaBD = async function(id) {
    if (listaCategorias.length <= 1) {
      alert("Debe existir al menos una categoría.");
      return;
    }

    if (confirm("¿Estás seguro de eliminar esta categoría?")) {
      try {
        const res = await fetch(`http://localhost:3000/api/categorias/${id}`, {
          method: 'DELETE'
        });
        const data = await res.json();

        if (data.success) {
          listaCategorias = listaCategorias.filter(c => c.id !== id);
          actualizarSelectsCategorias();
          renderizarListaCategoriasAdmin();
        } else {
          alert("No se pudo eliminar la categoría.");
        }
      } catch (error) {
        console.error("Error al borrar categoría:", error);
      }
    }
  };

  function actualizarSelectsCategorias() {
    const selectProd = document.getElementById('productCategory');
    const selectFiltro = document.getElementById('filterCategory');

    if (selectProd) {
      selectProd.innerHTML = '<option value="">Seleccione una categoría</option>';
      listaCategorias.forEach(cat => {
        selectProd.innerHTML += `<option value="${cat.nombre}">${cat.nombre}</option>`;
      });
    }

    if (selectFiltro) {
      selectFiltro.innerHTML = '<option value="">Todas las categorías</option>';
      listaCategorias.forEach(cat => {
        selectFiltro.innerHTML += `<option value="${cat.nombre}">${cat.nombre}</option>`;
      });
    }
  }

  // Guardar Producto en MongoDB
  window.saveProduct = async function(event) {
    event.preventDefault();

    if (!userNegocioId) {
      alert("No se puede guardar el producto sin un negocio asociado.");
      return;
    }

    const nuevoProducto = {
      codigo: document.getElementById('productCode').value.trim(),
      nombre: document.getElementById('productName').value.trim(),
      categoria: selectCat.value,
      precio: parseFloat(document.getElementById('productPrice').value),
      stock: parseInt(document.getElementById('productStock').value),
      negocioId: userNegocioId
    };

    try {
      const res = await fetch('http://localhost:3000/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoProducto)
      });

      const data = await res.json();

      if (data.success) {
        closeModal();
        await cargarProductos();
      } else {
        alert("Error al guardar: " + data.message);
      }
    } catch (error) {
      console.error("Error al guardar producto:", error);
    }
  };

  // Eliminar Producto
  window.requestDeleteProduct = function(id) {
    productIdToDelete = id;
    if (confirmModal) confirmModal.classList.add('active');
  };

  window.confirmDeleteProduct = async function() {
    if (!productIdToDelete) return;

    try {
      const res = await fetch(`http://localhost:3000/api/productos/${productIdToDelete}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        productIdToDelete = null;
        closeConfirmModal();
        await cargarProductos();
      } else {
        alert("No se pudo eliminar el producto.");
      }
    } catch (error) {
      console.error("Error eliminando producto:", error);
    }
  };

  window.closeConfirmModal = function() {
    if (confirmModal) confirmModal.classList.remove('active');
  };

  // Filtros y Ordenamiento
  window.filterAndSortProducts = function() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('filterCategory').value;
    const sortCriteria = document.getElementById('sortBy').value;

    let resultado = productosGlobales.filter(prod => {
      const coincideTexto = prod.nombre.toLowerCase().includes(searchText) || (prod.codigo && prod.codigo.toLowerCase().includes(searchText));
      const coincideCategoria = selectedCategory === "" || prod.categoria === selectedCategory;
      return coincideTexto && coincideCategoria;
    });

    resultado.sort((a, b) => {
      if (sortCriteria === 'nombre') {
        return a.nombre.localeCompare(b.nombre);
      } else if (sortCriteria === 'precio-asc') {
        return Number(a.precio) - Number(b.precio);
      } else if (sortCriteria === 'precio-desc') {
        return Number(b.precio) - Number(a.precio);
      } else if (sortCriteria === 'stock') {
        return Number(b.stock) - Number(a.stock);
      }
      return 0;
    });

    renderizarTabla(resultado);
  };

  init();
});