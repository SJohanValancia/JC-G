const mongoose = require('mongoose');

const permisoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    unique: true
  },
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  permisos: {
    ganado: {
      type: Boolean,
      default: true
    },
    aportes: {
      type: Boolean,
      default: true
    },
    gastos: {
      type: Boolean,
      default: true
    },
    reportes: {
      type: Boolean,
      default: true
    },
    editar_propios: {
      type: Boolean,
      default: true
    },
    eliminar_propios: {
      type: Boolean,
      default: false
    },
    ver_otros: {
      type: Boolean,
      default: true
    }
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto
permisoSchema.index({ empresa: 1, usuario: 1 });

module.exports = mongoose.model('Permiso', permisoSchema);