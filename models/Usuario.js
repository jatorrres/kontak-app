const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, required: true },
  edad: { type: Number },
  sexo: { type: String },
  imagen: { type: String },
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', default: null }
}, { timestamps: true });

// Forma segura para evitar OverwriteModelError
module.exports = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema, 'usuarios');