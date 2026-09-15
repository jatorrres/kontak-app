const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Negocio = require('../models/Negocio');

// 1. RUTA DE REGISTRO
router.post('/registro', async (req, res) => {
  let negocioCreado = null; 

  try {
    const { nombre, email, password, rol, codigoNegocio, codigoNegocioIngresado, nombreNegocio } = req.body;

    const codigoFinal = codigoNegocio || codigoNegocioIngresado;

    if (!email || !password || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Por favor complete los campos obligatorios (nombre, email, contraseña).'
      });
    }

    const emailLimpio = email.trim().toLowerCase();

    const existeUsuario = await Usuario.findOne({ email: emailLimpio });
    if (existeUsuario) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado.'
      });
    }

    let negocioVinculadoId = null;

    const esPropietario = rol === 'Propietario' || rol === 'Propietario / Administrador' || (rol && rol.toLowerCase().includes('dueño'));

    if (esPropietario) {
      const nuevoCodigo = 'BUS-' + Math.floor(1000 + Math.random() * 9000);
      
      // Usamos 'nombre' y 'codigo' para que coincidan con tu modelo de Mongoose
      const nuevoNegocio = new Negocio({
        nombre: nombreNegocio || `Negocio de ${nombre}`,
        codigoNegocio: nuevoCodigo 
      });

      negocioCreado = await nuevoNegocio.save();
      negocioVinculadoId = negocioCreado._id;
    } else {
      if (!codigoFinal) {
        return res.status(400).json({
          success: false,
          message: 'El código de negocio es requerido para empleados.'
        });
      }
      // Buscamos por 'codigo' porque así se llama en tu modelo
      const negocioExistente = await Negocio.findOne({ codigo: codigoFinal.trim() });
      if (!negocioExistente) {
        return res.status(404).json({
          success: false,
          message: 'El código de negocio no existe.'
        });
      }
      negocioVinculadoId = negocioExistente._id;
    }

    const nuevoUsuario = new Usuario({
      nombre,
      edad: req.body.edad,
  sexo: req.body.sexo,
      email: emailLimpio,
      password,
      rol: rol || 'Empleado',
      negocioId: negocioVinculadoId
    });

    await nuevoUsuario.save();

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      data: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        negocioId: negocioVinculadoId
      }
    });

  } catch (error) {
    if (negocioCreado) {
      await Negocio.findByIdAndDelete(negocioCreado._id);
    }

    console.error('Error en /registro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno en el servidor al registrar el usuario: ' + error.message
    });
  }
});

// 2. RUTA DE LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor ingrese correo y contraseña.'
      });
    }

    const emailLimpio = email.trim().toLowerCase();
    const usuario = await Usuario.findOne({ email: emailLimpio }).populate('negocioId');

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'El correo no se encuentra registrado.'
      });
    }

    if (usuario.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta.'
      });
    }

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        negocioId: usuario.negocioId ? usuario.negocioId._id : null,
        codigoNegocio: usuario.negocioId ? usuario.negocioId.codigo : null
      }
    });

  } catch (error) {
    console.error('Error en /login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno en el servidor al iniciar sesión.'
    });
  }
});

module.exports = router;
// RUTA DE RECUPERACIÓN DE CONTRASEÑA
router.post('/recuperar', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Por favor ingrese el correo electrónico.' });
    }

    const emailLimpio = email.trim().toLowerCase();
    const usuario = await Usuario.findOne({ email: emailLimpio });

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'El correo no se encuentra registrado.' });
    }

    // Generar una contraseña temporal aleatoria
    const passwordTemporal = 'TMP-' + Math.floor(1000 + Math.random() * 9000);
    
    // Guardarla en el usuario (si usas encriptación de hash, recuerda aplicarla aquí)
    usuario.password = passwordTemporal;
    await usuario.save();

    return res.json({ 
      success: true, 
      message: `Contraseña temporal generada con éxito: ${passwordTemporal}` 
    });

  } catch (error) {
    console.error('Error en /recuperar:', error);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
  }
});