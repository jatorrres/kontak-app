// ==========================================
// CONTROLADOR DE REGISTRO (KONTAK)
// ==========================================

// 1. Función para mostrar / ocultar contraseña
function togglePasswordVisibility(inputId, buttonElement) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    buttonElement.textContent = '🙈';
  } else {
    input.type = 'password';
    buttonElement.textContent = '👁️';
  }
}

// 2. Función para alternar campos de Dueño vs Empleado
function toggleInvitationField() {
  const roleSelect = document.getElementById('regRole');
  const businessNameGroup = document.getElementById('businessNameGroup');
  const ownerNotice = document.getElementById('ownerNotice');
  const inviteCodeGroup = document.getElementById('inviteCodeGroup');

  if (!roleSelect) return;

  const isOwner = roleSelect.value === 'Propietario / Administrador';

  if (businessNameGroup) businessNameGroup.style.display = isOwner ? 'block' : 'none';
  if (ownerNotice) ownerNotice.style.display = isOwner ? 'block' : 'none';
  if (inviteCodeGroup) inviteCodeGroup.style.display = isOwner ? 'none' : 'block';
}

// 3. Procesar el envío del formulario de registro
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault(); 

      const nombre = document.getElementById('regName')?.value.trim();
      const edad = document.getElementById('regAge')?.value;
const sexo = document.getElementById('regGender')?.value;
      const email = document.getElementById('regEmail')?.value.trim();
      const password = document.getElementById('regPassword')?.value;
      const rol = document.getElementById('regRole')?.value || '';
      const nombreNegocio = document.getElementById('regBusinessName')?.value.trim();
      const codigoNegocioIngresado = document.getElementById('regBusinessCode')?.value.trim();

      const isOwner = (rol === 'Propietario / Administrador');

      // Validaciones con showNotification en lugar de alert
      if (!nombre || !email || !password || !rol) {
        showNotification('⚠️ Por favor completa todos los campos obligatorios.', true);
        return;
      }

      if (isOwner && !nombreNegocio) {
        showNotification('⚠️ Como Dueño, debes indicar el nombre de tu negocio.', true);
        return;
      }

      if (!isOwner && !codigoNegocioIngresado) {
        showNotification('⚠️ Como Empleado, debes ingresar el código de invitación.', true);
        return;
      }

      const payload = {
        nombre,
        edad,
  sexo,
        email,
        password,
        rol,
        nombreNegocio: isOwner ? nombreNegocio : undefined,
        codigoNegocioIngresado: isOwner ? undefined : codigoNegocioIngresado
      };

      try {
        const response = await fetch('/api/auth/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showNotification('✅ ¡Registro exitoso! Ya puedes iniciar sesión.');

          if (result.data) {
            localStorage.setItem('usuarioEmail', result.data.email || '');
            localStorage.setItem('usuarioRol', result.data.rol || '');
            localStorage.setItem('negocioId', result.data.negocioId || '');
          }

          // Cambiar a la pestaña de Iniciar Sesión (0)
          setTimeout(() => {
            if (typeof switchAuthTab === 'function') {
              switchAuthTab(0);
            }
          }, 1500);

        } else {
          showNotification(`❌ ${result.message || 'No se pudo completar el registro.'}`, true);
        }
      } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        showNotification('⚠️ Error de conexión con el servidor', true);
      }
    });
  }
});