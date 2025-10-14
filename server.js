require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(path.join(__dirname)));

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ Conectado a MongoDB'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// Rutas API
app.use('/api/auth', authRoutes);

// Catch-all: Usar middleware en lugar de ruta
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Puerto dinámico para Render o 5000 local
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});