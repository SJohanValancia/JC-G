const express = require('express');
const router = express.Router();
const Aporte = require('../models/Aporte');
const authMiddleware = require('../middleware/auth');
const { verificarPermiso } = require('../middleware/permisos');


router.use(authMiddleware);

const { filtroVisibilidad } = require('../middleware/filtros');

// Listar aportes
router.get('/empresa/:empresaId', verificarPermiso('aportes'), async (req, res) => {
  try {
    if (req.usuario.empresa.toString() !== req.params.empresaId)
      return res.status(403).json({ error: 'No autorizado' });

    const filter = { empresa: req.params.empresaId, ...filtroVisibilidad(req) };

    const aportes = await Aporte.find(filter)
                                .populate('usuario', 'nombreUsuario')
                                .sort({ fecha: -1 });

    res.json(aportes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los aportes' });
  }
});

// Crear nuevo aporte
router.post('/', verificarPermiso('aportes'), async (req, res) => {
  try {
    const { monto, descripcion, empresa } = req.body;

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

    if (req.usuario.empresa.toString() !== empresa) {
      return res.status(403).json({ 
        error: 'No tienes permiso para registrar aportes en esta empresa' 
      });
    }

    const aporte = await Aporte.create({
      monto,
      descripcion,
      empresa,
      usuario: req.usuario._id
    });

    await aporte.populate('usuario', 'nombreUsuario');

    res.status(201).json(aporte);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el aporte' });
  }
});


// Obtener un aporte específico
router.get('/:id', verificarPermiso('aportes'), async (req, res) => {
  try {
    const aporte = await Aporte.findById(req.params.id)
      .populate('usuario', 'nombreUsuario')
      .populate('empresa', 'nombre');

    if (!aporte) {
      return res.status(404).json({ error: 'Aporte no encontrado' });
    }

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
router.put('/:id', verificarPermiso('editar_propios'), async (req, res) => {
  try {
    const { monto, descripcion } = req.body;
    const aporte = await Aporte.findById(req.params.id);

    if (!aporte) {
      return res.status(404).json({ error: 'Aporte no encontrado' });
    }

    if (aporte.usuario.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({ 
        error: 'Solo puedes editar tus propios aportes' 
      });
    }

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
router.delete('/:id', verificarPermiso('eliminar_propios'), async (req, res) => {
  try {
    const aporte = await Aporte.findById(req.params.id);

    if (!aporte) {
      return res.status(404).json({ error: 'Aporte no encontrado' });
    }

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