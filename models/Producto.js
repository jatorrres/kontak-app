const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
  codigo: { 
    type: String, 
    required: true 
  },
  nombre: { 
    type: String, 
    required: true 
  },
  categoria: { 
    type: String, 
    default: 'General' 
  },
  precio: { 
    type: Number, 
    required: true 
  },
  stock: { 
    type: Number, 
    required: true 
  },
  negocioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Negocio', 
    required: true 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Producto', ProductoSchema);