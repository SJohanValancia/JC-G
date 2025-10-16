const express = require('express');
const router = express.Router();
const Aporte = require('../models/Aporte');
const authMiddleware = require('../middleware/auth');
const { verificarPermiso } = require('../middleware/permisos');


router.use(authMiddleware);

const { filtroVisibilidad } = require('../middleware/filtros');

// routes/aportes.js
router.get('/empresa/:empresaId', verificarPermiso('aportes'), async (req, res) => {
  try {
    if (req.usuario.empresa.toString() !== req.params.empresaId)
      return res.status(403).json({ error: 'No autorizado' });

    const baseFilter = { empresa: req.params.empresaId };
const visFilter = filtroVisibilidad(req, 'usuario');
    const aportes = await Aporte.find({ ...baseFilter, ...visFilter })
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

// Obtener estadísticas de aportes (ingresos, egresos, gastos)
router.get('/estadisticas/:empresaId', verificarPermiso('reportes'), async (req, res) => {
  try {
    const { empresaId } = req.params;

    if (req.usuario.empresa.toString() !== empresaId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const baseFilter = { empresa: empresaId };
    const visFilter = filtroVisibilidad(req, 'usuario');

    // Total de ingresos (aportes)
    const ingresos = await Aporte.aggregate([
      { 
        $match: { 
          ...baseFilter, 
          ...visFilter,
          tipo: 'ingreso' 
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        }
      }
    ]);

    // Total de egresos (retiros)
    const egresos = await Aporte.aggregate([
      { 
        $match: { 
          ...baseFilter, 
          ...visFilter,
          tipo: 'egreso' 
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        }
      }
    ]);

    // Total de gastos (importar modelo Gasto)
    const Gasto = require('../models/Gasto');
    const gastos = await Gasto.aggregate([
      { 
        $match: { 
          empresa: req.usuario.empresa
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        }
      }
    ]);

    const totalIngresos = ingresos[0]?.total || 0;
    const totalEgresos = egresos[0]?.total || 0;
    const totalGastos = gastos[0]?.total || 0;
    const cajaActual = totalIngresos - totalEgresos - totalGastos;

    res.json({
      ingresos: {
        total: totalIngresos,
        cantidad: ingresos[0]?.cantidad || 0
      },
      egresos: {
        total: totalEgresos,
        cantidad: egresos[0]?.cantidad || 0
      },
      gastos: {
        total: totalGastos,
        cantidad: gastos[0]?.cantidad || 0
      },
      cajaActual: cajaActual
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;