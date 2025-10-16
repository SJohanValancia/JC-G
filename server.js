require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const aportesRoutes = require('./routes/aportes'); // NUEVO
const ganadoRoutes = require('./routes/ganado');

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
app.use('/api/aportes', aportesRoutes); // NUEVO
app.use('/api/ganado', ganadoRoutes);

// Ruta de salud/prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API JC-G funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Catch-all: Servir index.html para rutas no encontradas (debe ir al final)
app.use((req, res) => {
  // Si es una ruta de API que no existe, enviar JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta de API no encontrada' });
  }
  // Si no, servir el HTML
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Puerto dinámico para Render o 5000 local
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 API disponible en http://localhost:${PORT}/api`);
});
