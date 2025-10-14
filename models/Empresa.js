const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  configuracion: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model('Empresa', empresaSchema);