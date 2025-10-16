const mongoose = require('mongoose');

const gastoSchema = new mongoose.Schema({
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  usuarioRegistro: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  categoria: {
    type: String,
    enum: ['alimentacion', 'veterinario', 'mantenimiento', 'transporte', 'otros'],
    default: 'otros'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto
gastoSchema.index({ empresa: 1, fecha: -1 });
gastoSchema.index({ usuarioRegistro: 1 });

module.exports = mongoose.model('Gasto', gastoSchema);