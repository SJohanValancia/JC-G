const express = require('express');
const router = express.Router();
const Gasto = require('../models/Gasto');
const authMiddleware = require('../middleware/auth');
const { verificarPermiso } = require('../middleware/permisos');
const { filtroVisibilidad } = require('../middleware/filtros');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// Obtener todos los gastos de la empresa
router.get('/', verificarPermiso('gastos'), async (req, res) => {
  try {
    const empresaId = req.usuario.empresa;
    const filtro = filtroVisibilidad(req, 'usuarioRegistro');

    const gastos = await Gasto.find({ 
      empresa: empresaId,
      ...filtro
    })
      .populate('usuarioRegistro', 'nombreUsuario')
      .sort({ fecha: -1 });

    res.json(gastos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

// Crear múltiples gastos
router.post('/multiple', verificarPermiso('gastos'), async (req, res) => {
  try {
    const { gastos } = req.body;
    const empresaId = req.usuario.empresa;
    const usuarioId = req.usuario._id;

    if (!gastos || !Array.isArray(gastos) || gastos.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un gasto' });
    }

    // Preparar gastos para inserción
    const gastosParaInsertar = gastos.map(gasto => ({
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      fecha: gasto.fecha || Date.now(),
      categoria: gasto.categoria || 'otros',
      usuarioRegistro: usuarioId,
      empresa: empresaId
    }));

    const gastosCreados = await Gasto.insertMany(gastosParaInsertar);

    res.status(201).json({
      mensaje: `${gastosCreados.length} gasto(s) registrado(s) exitosamente`,
      gastos: gastosCreados
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear gastos' });
  }
});

// Crear un gasto individual
router.post('/', verificarPermiso('gastos'), async (req, res) => {
  try {
    const { descripcion, monto, fecha, categoria } = req.body;
    const empresaId = req.usuario.empresa;
    const usuarioId = req.usuario._id;

    const gasto = await Gasto.create({
      descripcion,
      monto,
      fecha: fecha || Date.now(),
      categoria: categoria || 'otros',
      usuarioRegistro: usuarioId,
      empresa: empresaId
    });

    const gastoPopulado = await Gasto.findById(gasto._id)
      .populate('usuarioRegistro', 'nombreUsuario');

    res.status(201).json(gastoPopulado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear gasto' });
  }
});

// Actualizar un gasto
router.put('/:id', verificarPermiso('gastos'), async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, monto, fecha, categoria } = req.body;
    const empresaId = req.usuario.empresa;

    // Buscar el gasto
    const gasto = await Gasto.findOne({ _id: id, empresa: empresaId });

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    // Verificar permisos: solo el creador o administrador puede editar
    if (req.usuario.rol !== 'administrador' && 
        gasto.usuarioRegistro.toString() !== req.usuario._id.toString()) {
      // Verificar si tiene permiso para editar propios
      if (!req.permisos?.editar_propios) {
        return res.status(403).json({ 
          error: 'No tienes permiso para editar este gasto' 
        });
      }
      return res.status(403).json({ 
        error: 'Solo puedes editar tus propios gastos' 
      });
    }

    // Actualizar
    gasto.descripcion = descripcion || gasto.descripcion;
    gasto.monto = monto !== undefined ? monto : gasto.monto;
    gasto.fecha = fecha || gasto.fecha;
    gasto.categoria = categoria || gasto.categoria;
    gasto.fechaActualizacion = Date.now();

    await gasto.save();

    const gastoActualizado = await Gasto.findById(id)
      .populate('usuarioRegistro', 'nombreUsuario');

    res.json(gastoActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar gasto' });
  }
});

// Eliminar un gasto
router.delete('/:id', verificarPermiso('gastos'), async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresa;

    const gasto = await Gasto.findOne({ _id: id, empresa: empresaId });

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    // Verificar permisos: solo el creador o administrador puede eliminar
    if (req.usuario.rol !== 'administrador' && 
        gasto.usuarioRegistro.toString() !== req.usuario._id.toString()) {
      if (!req.permisos?.eliminar_propios) {
        return res.status(403).json({ 
          error: 'No tienes permiso para eliminar este gasto' 
        });
      }
      return res.status(403).json({ 
        error: 'Solo puedes eliminar tus propios gastos' 
      });
    }

    await Gasto.findByIdAndDelete(id);

    res.json({ mensaje: 'Gasto eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
});

// Obtener estadísticas de gastos
router.get('/estadisticas/resumen', verificarPermiso('gastos'), async (req, res) => {
  try {
    const empresaId = req.usuario.empresa;
    const filtro = filtroVisibilidad(req, 'usuarioRegistro');

    const totalGastos = await Gasto.aggregate([
      { 
        $match: { 
          empresa: empresaId,
          ...filtro
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

    const gastosPorCategoria = await Gasto.aggregate([
      { 
        $match: { 
          empresa: empresaId,
          ...filtro
        } 
      },
      {
        $group: {
          _id: '$categoria',
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        }
      }
    ]);

    res.json({
      total: totalGastos[0]?.total || 0,
      cantidad: totalGastos[0]?.cantidad || 0,
      porCategoria: gastosPorCategoria
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
