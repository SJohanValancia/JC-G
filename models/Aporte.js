const mongoose = require('mongoose');

const aporteSchema = new mongoose.Schema({
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  tipo: {
    type: String,
    enum: ['ingreso', 'egreso'],
    default: 'ingreso'
  }
});

// Índice compuesto para búsquedas eficientes
aporteSchema.index({ empresa: 1, fecha: -1 });

module.exports = mongoose.model('Aporte', aporteSchema);