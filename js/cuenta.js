let isEditing = false;
const API_URL = 'http://localhost:3000/api';

// Buscamos el correo unificando las llaves para que nunca falle
let CURRENT_USER_EMAIL = localStorage.getItem('usuarioEmail') || localStorage.getItem('kontak_user_email');

document.addEventListener('DOMContentLoaded', () => {
  // Asegurarnos de sincronizar ambas por si acaso
  if (CURRENT_USER_EMAIL) {
    localStorage.setItem('kontak_user_email', CURRENT_USER_EMAIL);
  }

  if (!CURRENT_USER_EMAIL) {
    showNotification('⚠️ No hay sesión activa. Por favor inicie sesión.', true);
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    return;
  }
  getProfile();
});

function showNotification(message, isError = false) {
  const existingToast = document.querySelector('.kontak-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'kontak-toast';
  if (isError) toast.style.borderLeftColor = '#EF4444';
  toast.innerText = message;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Cargar perfil desde la API
async function getProfile() {
  try {
    
    const res = await fetch(`${API_URL}/usuarios/perfil/${CURRENT_USER_EMAIL}`);
    const result = await res.json();

    if (result.success && result.data) {
      document.getElementById('fullName').value = result.data.nombre || '';
      document.getElementById('userEmail').value = result.data.email || '';
      document.getElementById('userAge').value = result.data.edad || '';
      document.getElementById('userGender').value = result.data.sexo || 'Masculino';
      
      const roleInput = document.getElementById('userRoleDisplay');
      if (roleInput) roleInput.value = result.data.rol || '';

      if (result.data.negocioId) {
        localStorage.setItem('kontak_negocio_id', result.data.negocioId._id || result.data.negocioId);

        const busNameInput = document.getElementById('businessName');
        const busCodeInput = document.getElementById('businessCode');
        
        // CORRECCIÓN: Usar 'nombre' y 'codigo' que son los campos reales del modelo Negocio
        if (busNameInput) busNameInput.value = result.data.negocioId.nombre || '';
        if (busCodeInput) busCodeInput.value = result.data.negocioId.codigo || '';
      }

      // En tu función getProfile() del frontend
if (result.data.imagen) {
  const cleanPath = result.data.imagen.startsWith('/') ? result.data.imagen : `/${result.data.imagen}`;
  document.getElementById('avatarImg').src = `http://localhost:3000${cleanPath}`;
}
    }
  } catch (err) {
    showNotification('⚠️ No se pudo conectar con el servidor', true);
  }
}

window.copyBusinessCode = function() {
  const codeInput = document.getElementById('businessCode');
  if (codeInput && codeInput.value && codeInput.value !== 'Cargando...') {
    navigator.clipboard.writeText(codeInput.value);
    showNotification('📋 ¡Código de negocio copiado al portapapeles!');
  }
};

window.previewAvatar = async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showNotification('⚠️ La imagen supera el máximo permitido (2MB)', true);
    return;
  }

  const formData = new FormData();
  formData.append('avatar', file);
  formData.append('email', CURRENT_USER_EMAIL);

  try {
    const res = await fetch(`${API_URL}/usuarios/avatar`, {
      method: 'POST',
      body: formData
    });
    const result = await res.json();

    if (result.success) {
      // Tomamos con seguridad la propiedad que devuelva el servidor
      const rutaFoto = result.foto_url || result.imagen;
      if (rutaFoto) {
        const cleanPath = rutaFoto.startsWith('/') ? rutaFoto : `/${rutaFoto}`;
        // Forzamos la recarga de la imagen añadiendo un timestamp (?t=) para evitar que el navegador use caché vieja
        document.getElementById('avatarImg').src = `http://localhost:3000${cleanPath}?t=${Date.now()}`;
      }
      showNotification('📷 Foto guardada en la base de datos');
    } else {
      showNotification(`❌ ${result.message || 'Error al subir'}`, true);
    }
  } catch (error) {
    showNotification('❌ Error al subir la imagen', true);
  }
};

window.saveProfile = async function(event) {
  event.preventDefault();

  const nuevoEmail = document.getElementById('userEmail').value.trim().toLowerCase();

  const profileData = {
    email: CURRENT_USER_EMAIL,
    nuevoEmail: nuevoEmail,
    nombre: document.getElementById('fullName').value.trim(),
    edad: document.getElementById('userAge').value,
    sexo: document.getElementById('userGender').value,
    nombreNegocio: document.getElementById('businessName') ? document.getElementById('businessName').value.trim() : ''
  };

  try {
    const res = await fetch(`${API_URL}/usuarios/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });

    const result = await res.json();

    if (result.success) {
      CURRENT_USER_EMAIL = nuevoEmail;
      localStorage.setItem('kontak_user_email', nuevoEmail);

      showNotification('✅ Guardado correctamente en la base de datos');
      toggleEditProfile(false);
      getProfile();
    } else {
      showNotification(`❌ ${result.message || 'Error al guardar'}`, true);
    }
  } catch (error) {
    showNotification('❌ Error al conectar con el servidor', true);
  }
};

window.toggleEditProfile = function(forceState = null) {
  isEditing = forceState !== null ? forceState : !isEditing;

  const inputs = document.querySelectorAll('#profileForm input:not([value*="Propietario"]):not(#businessCode), #profileForm select');
  const btnEdit = document.getElementById('btnEditProfile');
  const profileActions = document.getElementById('profileActions');
  const labelUpload = document.getElementById('labelUploadAvatar');
  const avatarInput = document.getElementById('avatarInput');

  inputs.forEach(input => {
    input.disabled = !isEditing;
    input.classList.toggle('input-disabled-style', !isEditing);
  });

  if (avatarInput) avatarInput.disabled = !isEditing;
  if (labelUpload) {
    labelUpload.style.pointerEvents = isEditing ? 'auto' : 'none';
    labelUpload.style.opacity = isEditing ? '1' : '0.6';
  }

  if (btnEdit) btnEdit.style.display = isEditing ? 'none' : 'inline-flex';
  if (profileActions) profileActions.style.display = isEditing ? 'flex' : 'none';
};

// CORRECCIÓN CRÍTICA: Envío real al backend para cambiar la contraseña
window.changePassword = async function(event) {
  event.preventDefault();
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;

  if (!newPass || !confirmPass) {
    showNotification('⚠️ Por favor ingresa la nueva contraseña', true);
    return;
  }

  if (newPass !== confirmPass) {
    showNotification('❌ Las contraseñas no coinciden', true);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/usuarios/cambiar-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: CURRENT_USER_EMAIL,
        password: newPass
      })
    });

    const result = await res.json();

    if (result.success) {
      showNotification('🔒 Contraseña actualizada en la base de datos');
      togglePasswordSection(false);
    } else {
      showNotification(`❌ ${result.message || 'Error al cambiar contraseña'}`, true);
    }
  } catch (error) {
    showNotification('❌ Error al conectar con el servidor', true);
  }
};

window.togglePasswordSection = function(forceState = null) {
  const accordion = document.querySelector('.password-accordion');
  if (!accordion) return;
  
  const isCurrentlyOpen = accordion.classList.contains('open');
  const shouldOpen = forceState !== null ? forceState : !isCurrentlyOpen;

  if (shouldOpen) {
    accordion.classList.add('open');
  } else {
    accordion.classList.remove('open');
    document.getElementById('passwordForm').reset();
  }
};