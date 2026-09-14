const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true }
}, { timestamps: true });

// Evitar duplicar el mismo nombre de categoría dentro del mismo negocio
categoriaSchema.index({ negocioId: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('Categoria', categoriaSchema);