require('dotenv').config();
const express = require('express');
const Comanda = require('./models/Comanda');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 1. Inicializar app PRIMERO
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Usar middlewares DESPUÉS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

// Asegurar que la carpeta uploads exista directamente en la raíz
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Servir la carpeta uploads estáticamente desde la raíz
app.use('/uploads', express.static(uploadDir));

// Importar Modelos de la base de datos
const Usuario = require('./models/Usuario');
const Negocio = require('./models/Negocio');
const Producto = require('./models/Producto'); 
const Categoria = require('./models/Categoria');

// 3. Importar y usar las rutas modulares desde routes/auth.js
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 4. Conexión a MongoDB Compass (Local)
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kontak_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB Compass (kontak_db)'))
  .catch((err) => console.error('❌ Error al conectar a MongoDB:', err));

// =============================================================
// RUTAS PRINCIPALES DE NAVEGACIÓN Y PÁGINA DE INICIO
// =============================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =============================================================
// RUTAS PARA EL INVENTARIO Y USUARIOS (API REST)
// =============================================================

app.get('/api/usuarios/perfil/:email', async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ email: req.params.email }).populate('negocioId');

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.json({
      success: true,
      data: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        edad: usuario.edad,
        sexo: usuario.sexo,
        imagen: usuario.imagen,
        negocioId: usuario.negocioId 
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

app.put('/api/usuarios/perfil', async (req, res) => {
  try {
    const { email, nuevoEmail, nombre, edad, sexo, nombreNegocio, imagen } = req.body;
    const emailLimpio = email.trim().toLowerCase();

    const usuario = await Usuario.findOne({ email: emailLimpio });
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    usuario.nombre = nombre || usuario.nombre;
    usuario.edad = edad !== undefined ? edad : usuario.edad;
    usuario.sexo = sexo || usuario.sexo;
    
    if (imagen) {
      usuario.imagen = imagen;
    }

    if (nuevoEmail && nuevoEmail !== emailLimpio) {
      const existe = await Usuario.findOne({ email: nuevoEmail.trim().toLowerCase() });
      if (existe) {
        return res.status(400).json({ success: false, message: 'El nuevo correo ya está en uso.' });
      }
      usuario.email = nuevoEmail.trim().toLowerCase();
    }

    if (nombreNegocio && usuario.negocioId) {
      await Negocio.findByIdAndUpdate(usuario.negocioId, { nombre: nombreNegocio });
    }

    await usuario.save();

    return res.json({
      success: true,
      message: 'Perfil actualizado correctamente.',
      data: usuario
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el perfil.' });
  }
});

app.put('/api/usuarios/cambiar-password', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
    }

    const emailLimpio = email.trim().toLowerCase();
    const usuario = await Usuario.findOne({ email: emailLimpio });

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    usuario.password = password;
    await usuario.save();

    return res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({ success: false, message: 'Error interno al cambiar la contraseña.' });
  }
});
// =============================================================
// RUTAS DE CATEGORÍAS (ESPECÍFICAS POR NEGOCIO)
// =============================================================

app.get('/api/categorias/negocio/:negocioId', async (req, res) => {
  try {
    const { negocioId } = req.params;
    const categorias = await Categoria.find({ negocioId }).sort({ nombre: 1 });
    return res.json({ success: true, data: categorias });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener categorías.' });
  }
});

app.post('/api/categorias', async (req, res) => {
  try {
    const { nombre, negocioId } = req.body;
    
    if (!nombre || !negocioId) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
    }

    const nuevaCategoria = new Categoria({ nombre, negocioId });
    await nuevaCategoria.save();

    return res.json({ success: true, data: nuevaCategoria });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la categoría.' });
  }
});

app.delete('/api/categorias/:id', async (req, res) => {
  try {
    await Categoria.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Categoría eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar la categoría.' });
  }
});

// =============================================================
// RUTAS DE PRODUCTOS E INVENTARIO
// =============================================================

app.get('/api/productos/negocio/:negocioId', async (req, res) => {
  try {
    const { negocioId } = req.params;
    const productos = await Producto.find({ negocioId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: productos });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener productos.' });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const { codigo, nombre, categoria, precio, stock, negocioId } = req.body;

    if (!nombre || !precio || !negocioId) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
    }

    const nuevoProducto = new Producto({
      codigo,
      nombre,
      categoria,
      precio,
      stock,
      negocioId
    });

    await nuevoProducto.save();
    return res.json({ success: true, data: nuevoProducto });
  } catch (error) {
    console.error('Error al guardar producto:', error);
    return res.status(500).json({ success: false, message: 'Error al guardar el producto.' });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    await Producto.findByIdAndDelete(req.params.id);
    return res.json({
      success: true,
      message: 'Producto eliminado correctamente.'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar el producto.' });
  }
});

// =============================================================
// RUTAS PARA COMANDAS Y PEDIDOS (MESERO / CAJA)
// =============================================================

app.post('/api/comandas', async (req, res) => {
  try {
    const { negocioId, mesa, items, total } = req.body;

    if (!negocioId || !mesa || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios para la comanda.' });
    }

    const nuevaComanda = new Comanda({ negocioId, mesa, items, total });
    await nuevaComanda.save();

    return res.status(201).json({
      success: true,
      message: 'Comanda creada y enviada a caja correctamente.',
      data: nuevaComanda
    });
  } catch (error) {
    console.error('Error al guardar comanda:', error);
    return res.status(500).json({ success: false, message: 'Error interno al procesar la comanda.' });
  }
});

app.get('/api/comandas/negocio/:negocioId', async (req, res) => {
  try {
    const { negocioId } = req.params;
    const comandas = await Comanda.find({ 
      negocioId, 
      estado: { $nin: ['Pagada', 'Completada'] } 
    }).sort({ fecha: -1 });

    return res.json({ success: true, data: comandas });
  } catch (error) {
    console.error('Error al obtener comandas:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener las comandas.' });
  }
});

app.put('/api/comandas/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    const { metodoPago } = req.body;

    const comandaActualizada = await Comanda.findByIdAndUpdate(
      id,
      { 
        estado: 'Pagada', 
        metodoPago: metodoPago || 'Efectivo'
      },
      { returnDocument: 'after' }
    );

    if (!comandaActualizada) {
      return res.status(404).json({ success: false, message: 'Comanda no encontrada.' });
    }

    return res.json({ success: true, message: 'Pago registrado con éxito.', data: comandaActualizada });
  } catch (error) {
    console.error('Error al registrar el pago:', error);
    return res.status(500).json({ success: false, message: 'Error interno al procesar el pago.' });
  }
});

app.delete('/api/comandas/:id', async (req, res) => {
  try {
    await Comanda.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Comanda eliminada correctamente de la base de datos.' });
  } catch (error) {
    console.error('Error al eliminar comanda por ID:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar la comanda.' });
  }
});

app.delete('/api/comandas/negocio/:negocioId/:mesa', async (req, res) => {
  try {
    const { negocioId, mesa } = req.params;
    const mesaDecodificada = decodeURIComponent(mesa);
    
    await Comanda.deleteMany({ negocioId, mesa: mesaDecodificada });
    
    return res.json({ success: true, message: 'Comandas de la mesa eliminadas permanentemente.' });
  } catch (error) {
    console.error('Error al eliminar comandas por mesa:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar las comandas de la mesa.' });
  }
});

// =============================================================
// RUTAS DE REPORTES Y ESTADÍSTICAS POR NEGOCIO (Día, Semana, Mes)
// =============================================================
app.get('/api/reportes/negocio/:negocioId', async (req, res) => {
  try {
    const { negocioId } = req.params;
    
    const comandas = await Comanda.find({ 
      negocioId, 
      estado: { $in: ['Pagada', 'Completada'] } 
    }).sort({ fecha: -1 });

    let ventasTotalesDia = 0;
    let ordenesSaldadasCount = 0;
    const productosCount = {};
    const metodosPagoCount = { Efectivo: 0, Tarjeta: 0, 'Nequi/Davi': 0, Transferencia: 0 };

    const ahora = new Date();
    const hoyStr = ahora.toISOString().slice(0, 10);
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    let ventasTotalesMes = 0;

    comandas.forEach(comanda => {
      const fechaComandaObj = new Date(comanda.fecha);
      const fechaComandaStr = fechaComandaObj.toISOString().slice(0, 10);
      
      const esDelMes = fechaComandaObj.getMonth() === mesActual && fechaComandaObj.getFullYear() === anioActual;
      
      if (esDelMes) {
        ventasTotalesMes += comanda.total || 0;
      }

      if (comanda.metodoPago && metodosPagoCount[comanda.metodoPago] !== undefined) {
        metodosPagoCount[comanda.metodoPago]++;
      }

      if (fechaComandaStr === hoyStr) {
        ventasTotalesDia += comanda.total || 0;
        ordenesSaldadasCount++;

        if (comanda.items && Array.isArray(comanda.items)) {
          comanda.items.forEach(item => {
            const nombreProd = item.nombre || 'Producto';
            productosCount[nombreProd] = (productosCount[nombreProd] || 0) + (item.cantidad || 1);
          });
        }
      }
    });

    let productoEstrella = 'N/A';
    let maxCant = 0;
    for (const [prod, cant] of Object.entries(productosCount)) {
      if (cant > maxCant) {
        maxCant = cant;
        productoEstrella = prod;
      }
    }

    return res.json({
      success: true,
      data: {
        ventasTotalesDia,
        ventasTotalesMes,
        ordenesSaldadasCount,
        productoEstrella,
        productosRanking: productosCount,
        metodosPago: metodosPagoCount,
        transacciones: comandas
      }
    });
  } catch (error) {
    console.error('Error al generar reportes:', error);
    return res.status(500).json({ success: false, message: 'Error al generar los reportes.' });
  }
});

app.delete('/api/reportes/comanda/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eliminada = await Comanda.findByIdAndDelete(id);
    
    if (!eliminada) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada.' });
    }

    return res.json({ success: true, message: 'Factura eliminada del historial correctamente.' });
  } catch (error) {
    console.error('Error al eliminar factura del historial:', error);
    return res.status(500).json({ success: false, message: 'Error interno al eliminar la factura.' });
  }
});

// =============================================================
// CONFIGURACIÓN DE MULTER Y RUTA DE AVATAR (RAÍZ /uploads)
// =============================================================
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.post('/api/usuarios/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { email } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });
    }

    const fotoUrl = `/uploads/${req.file.filename}`;
    
    const usuario = await Usuario.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { imagen: fotoUrl }, 
      { returnDocument: 'after' }
    );

    if (!usuario) {
      return res.status(400).json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.json({ success: true, foto_url: fotoUrl });
  } catch (error) {
    console.error('❌ ERROR DETALLADO AL SUBIR AVATAR:', error); 
    return res.status(500).json({ success: false, message: error.message || 'Error al subir la imagen.' });
  }
});

// 5. Arrancar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});