const mongoose = require('mongoose');

const ganadoSchema = new mongoose.Schema({
  identificacion: {
    type: String,
    trim: true
  },
  especie: {
    type: String,
    required: true,
    trim: true
  },
  raza: {
    type: String,
    trim: true
  },
  genero: {
    type: String,
    required: true,
    enum: ['Macho', 'Hembra']
  },
  fechaNacimiento: {
    type: Date
  },
  peso: {
    type: Number,
    min: 0
  },
  estado: {
    type: String,
    enum: ['Activo', 'Vendido', 'Muerto', 'En tratamiento'],
    default: 'Activo'
  },
  color: {
    type: String,
    trim: true
  },
  observaciones: {
    type: String,
    trim: true
  },
  fotoAnimal: {
    type: String,  // Guardará la imagen en base64
    default: null
  },
  fotoRegistro: {
    type: String,  // Guardará la imagen en base64
    default: null
  },
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  usuarioRegistro: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  }
});

ganadoSchema.pre('save', function(next) {
  this.ultimaActualizacion = Date.now();
  next();
});

module.exports = mongoose.model('Ganado', ganadoSchema);