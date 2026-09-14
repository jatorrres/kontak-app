const mongoose = require('mongoose');

const comandaSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true },
  mesa: { type: String, required: true },
  items: [
    {
      productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
      nombre: { type: String, required: true },
      precio: { type: Number, required: true },
      cantidad: { type: Number, required: true }
    }
  ],
  total: { type: Number, required: true },
  estado: { type: String, default: 'Pendiente' },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comanda', comandaSchema);