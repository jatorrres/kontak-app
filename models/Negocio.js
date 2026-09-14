const mongoose = require('mongoose');

const negocioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  codigoNegocio: { type: String, required: true, unique: true },
  // Propiedad para personalizar el tipo de atención
  tipoReferenciaVenta: { type: String, default: 'Mesa' } // Puede ser 'Mesa', 'Cliente', 'Pedido', 'Mostrador'
});

module.exports = mongoose.model('Negocio', negocioSchema);