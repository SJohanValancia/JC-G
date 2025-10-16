const express = require('express');
const router = express.Router();
const Aporte = require('../models/Aporte');
const authMiddleware = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// Crear nuevo aporte
router.post('/', async (req, res) => {
  try {
    const { monto, descripcion, empresa } = req.body;

    // Validaciones
    if (!monto || monto <= 0) {
      return res.status(400).json({ 
        error: 'El monto debe ser mayor a 0' 
      });
    }

    if (!descripcion || descripcion.trim() === '') {
      return res.status(400).json({ 
        error: 'La descripción es requerida' 
      });
    }

    // Verificar que el usuario pertenezca a la empresa
    if (req.usuario.empresa.toString() !== empresa) {
      return res.status(403).json({ 
        error: 'No tienes permiso para registrar aportes en esta empresa' 
      });
    }

    // Crear aporte
    const aporte = await Aporte.create({
      monto,
      descripcion,
      empresa,
      usuario: req.usuario._id
    });

    // Poblar datos del usuario
    await aporte.populate('usuario', 'nombreUsuario');

    res.status(201).json(aporte);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el aporte' });
  }
});

// Obtener todos los aportes de una empresa
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;

    // Verificar que el usuario pertenezca a la empresa
    if (req.usuario.empresa.toString() !== empresaId) {
      return res.status(403).json({ 
        error: 'No tienes permiso para ver los aportes de esta empresa' 
      });
    }

    const aportes = await Aporte.find({ empresa: empresaId })
      .populate('usuario', 'nombreUsuario')
      .sort({ fecha: -1 }); // Más recientes primero

    res.json(aportes);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los aportes' });
  }
});

// Obtener un aporte específico
router.get('/:id', async (req, res) => {
  try {
    const aporte = await Aporte.findById(req.params.id)
      .populate('usuario', 'nombreUsuario')
      .populate('empresa', 'nombre');

    if (!aporte) {
      return res.status(404).json({ error: 'Aporte no encontrado' });
    }

    // Verificar que el usuario pertenezca a la empresa del aporte
    if (req.usuario.empresa.toString() !== aporte.empresa._id.toString()) {
      return res.status(403).json({ 
        error: 'No tienes permiso para ver este aporte' 
      });
    }

    res.json(aporte);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el aporte' });
  }
});

// Actualizar un aporte
router.put('/:id', async (req, res) => {
  try {
    const { monto, descripcion } = req.body;
    const aporte = await Aporte.findById(req.params.id);

    if (!aporte) {
      return res.status(404).json({ error: 'Aporte no encontrado' });
    }

    // Solo el creador puede editar
    if (aporte.usuario.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({ 
        error: 'Solo puedes editar tus propios aportes' 
      });
    }

    // Verificar empresa
    if (req.usuario.empresa.toString() !== aporte.empresa.toString()) {
      return res.status(403).json({ 
        error: 'No tienes permiso para editar este aporte' 
      });
    }

    if (monto) aporte.monto = monto;
    if (descripcion) aporte.descripcion = descripcion;

    await aporte.save();
    await aporte.populate('usuario', 'nombreUsuario');

    res.json(aporte);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el aporte' });
  }
});

// Eliminar un aporte
router.delete('/:id', async (req, res) => {
  try {
    const aporte = await Aporte.findById(req.params.id);

    if (!aporte) {
      return res.status(404).json({ error: 'Aporte no encontrado' });
    }

    // Solo el creador o administrador puede eliminar
    if (aporte.usuario.toString() !== req.usuario._id.toString() && 
        req.usuario.rol !== 'administrador') {
      return res.status(403).json({ 
        error: 'No tienes permiso para eliminar este aporte' 
      });
    }

    await aporte.deleteOne();
    res.json({ mensaje: 'Aporte eliminado exitosamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el aporte' });
  }
});

module.exports = router;