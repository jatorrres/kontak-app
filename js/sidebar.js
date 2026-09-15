document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
});

function renderSidebar() {
  const sidebarNav = document.querySelector('.sidebar-nav');
  if (!sidebarNav) return;

  // Obtenemos el rol limpio en minúsculas desde la llave correcta
  const userRole = (localStorage.getItem('usuarioRol') || '').toLowerCase().trim();
  let menuHTML = '';

  // Validamos estrictamente cada rol
  if (userRole.includes('mesero')) {
    // Mesero: Solo Tomar Pedidos y Mi Cuenta
    menuHTML = `
      <a href="mesero.html" class="nav-item"><i class="bi bi-person-badge"></i> Tomar Pedidos</a>
      <a href="cuenta.html" class="nav-item"><i class="bi bi-person-circle"></i> Mi Cuenta</a>
    `;
  } else if (userRole.includes('cajero')) {
    // Cajero: Inventario, Caja y Mi Cuenta (le agrege tomar pedidos por si no existen meseros)
    menuHTML = `
      <a href="inventario.html" class="nav-item"><i class="bi bi-box-seam"></i> Inventario</a>
      <a href="caja.html" class="nav-item"><i class="bi bi-receipt"></i> Caja / Órdenes</a>
      <a href="mesero.html" class="nav-item"><i class="bi bi-person-badge"></i> Tomar Pedidos</a>
      <a href="cuenta.html" class="nav-item"><i class="bi bi-person-circle"></i> Mi Cuenta</a>
    `;
  } else {
    // Propietario / Administrador (Ve todo)
    menuHTML = `
      <a href="inventario.html" class="nav-item"><i class="bi bi-box-seam"></i> Inventario</a>
      <a href="caja.html" class="nav-item"><i class="bi bi-receipt"></i> Caja / Órdenes</a>
      <a href="mesero.html" class="nav-item"><i class="bi bi-person-badge"></i> Tomar Pedidos</a>
      <a href="reportes.html" class="nav-item"><i class="bi bi-bar-chart-line"></i> Reportes</a>
      <a href="cuenta.html" class="nav-item"><i class="bi bi-person-circle"></i> Mi Cuenta</a>
    `;
  }

  sidebarNav.innerHTML = menuHTML;

  // Resaltar la página actual
  const currentPath = window.location.pathname.split('/').pop() || 'cuenta.html';
  const links = sidebarNav.querySelectorAll('.nav-item');
  links.forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Función global inteligente para controlar el sidebar tanto en PC como en Móvil
window.toggleSidebar = function() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Si estamos en vista móvil (< 768px)
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    // Si estamos en escritorio, activa o quita el colapso que ya tienes programado en el CSS
    sidebar.classList.toggle('collapsed');
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.classList.toggle('expanded');
    }
  }
};
// Reiniciar o ajustar el sidebar al cambiar la orientación del dispositivo
window.addEventListener('orientationchange', () => {
  const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay'); // Si usas fondo oscuro al abrirlo

  if (sidebar) {
    sidebar.classList.remove('active', 'open'); // Cierra el menú para evitar estados fantasma
  }
  if (overlay) {
    overlay.classList.remove('active');
  }
});