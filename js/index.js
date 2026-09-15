// ==========================================
// CONTROLADOR DE AUTENTICACIÓN (KONTAK)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Control del Modal de Recuperación
  const openModalLink = document.getElementById('forgotPasswordLink'); // El enlace de "Olvidé mi contraseña"
  const modal = document.getElementById('forgotPasswordModal');
  const closeBtn = document.getElementById('closeRecoveryBtn');
  const sendBtn = document.getElementById('sendRecoveryBtn');

  if (openModalLink && modal) {
    openModalLink.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'flex';
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const emailInput = document.getElementById('recoveryEmail');
      const email = emailInput ? emailInput.value.trim() : '';

      if (!email) {
        showNotification('⚠️ Por favor ingresa tu correo electrónico', true);
        return;
      }

      try {
        const res = await fetch('/api/auth/recuperar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const result = await res.json();

        if (result.success) {
          // 1. Ocultar el modal de recuperación (el que pide el correo)
          modal.style.display = 'none';
          emailInput.value = '';

          // 2. Mostrar el modal centrado con la contraseña temporal
          const tempModal = document.getElementById('tempPasswordModal');
          const tempPasswordDisplay = document.getElementById('tempPasswordDisplay');

          if (tempModal && tempPasswordDisplay) {
            tempPasswordDisplay.textContent = result.passwordTemporal;
            tempModal.style.display = 'flex'; // Muestra el modal fijo
          }
        } else {
          showNotification(`❌ ${result.message}`, true);
        }
      } catch (error) {
        console.error('Error de red:', error);
        showNotification('⚠️ Error al conectar con el servidor', true);
      }
    });
  }

  // Asegurarnos de que el botón de cerrar del modal temporal funcione
  const closeTempBtn = document.getElementById('closeTempModalBtn');
  const tempModal = document.getElementById('tempPasswordModal');
  if (closeTempBtn && tempModal) {
    closeTempBtn.addEventListener('click', () => {
      tempModal.style.display = 'none';
    });
  }
});

// Alerta Integrada con Estilo Oscuro / Moderno acorde a Kontak
function showNotification(message, isError = false) {
  const existingToast = document.querySelector('.kontak-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'kontak-toast';
  
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.fontWeight = '500';
  toast.style.fontSize = '0.9rem';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  toast.style.transition = 'all 0.3s ease';

  if (isError) {
    toast.style.backgroundColor = '#2a1a1a';
    toast.style.color = '#EF4444';
    toast.style.border = '1px solid #EF4444';
  } else {
    toast.style.backgroundColor = '#1a2a1a';
    toast.style.color = '#10B981';
    toast.style.border = '1px solid #10B981';
  }
  
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Manejo del Envío de Login
async function handleLogin(event) {
  event.preventDefault();

  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');

  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    showNotification('⚠️ Por favor completa todos los campos', true);
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await res.json();

    if (result.success) {
      showNotification('✅ Inicio de sesión exitoso. Redirigiendo...');

      localStorage.clear();

      localStorage.setItem('token', result.data.token || '');
      localStorage.setItem('usuarioId', result.data.id || '');
      localStorage.setItem('usuarioNombre', result.data.nombre || '');
      localStorage.setItem('usuarioEmail', result.data.email || '');
      localStorage.setItem('usuarioRol', result.data.rol || '');
      
      const negocioIdValue = result.data.negocioId 
        ? (typeof result.data.negocioId === 'object' ? result.data.negocioId._id : result.data.negocioId)
        : '';
      
      localStorage.setItem('negocioId', negocioIdValue);
      localStorage.setItem('codigoNegocio', result.data.codigoNegocio || '');

      const rolUsuario = (result.data.rol || '').toLowerCase();

      setTimeout(() => {
        if (rolUsuario.includes('mesero')) {
          window.location.replace('mesero.html');
        } else if (rolUsuario.includes('cajero')) {
          window.location.replace('caja.html');
        } else {
          window.location.replace('inventario.html');
        }
      }, 1200);

    } else {
      showNotification(`❌ ${result.message || 'Error: La cuenta o la contraseña son incorrectas'}`, true);
    }
  } catch (error) {
    console.error('Error de red:', error);
    showNotification('⚠️ No se pudo conectar con el servidor backend', true);
  }
}

window.switchAuthTab = function(index) {
  const swipeWrapper = document.getElementById('swipeWrapper');
  const tabs = document.querySelectorAll('.tab-btn');

  tabs.forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  if (swipeWrapper) {
    swipeWrapper.style.transform = `translateX(-${index * 50}%)`;
  }
};