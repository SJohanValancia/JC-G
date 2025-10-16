const express = require('express');
const router = express.Router();
const Ganado = require('../models/Ganado');
const auth = require('../middleware/auth');

// Obtener todo el ganado de una empresa
router.get('/empresa/:empresaId', auth, async (req, res) => {
  try {
    const ganado = await Ganado.find({ 
      empresa: req.params.empresaId 
    })
    .populate('usuarioRegistro', 'nombreUsuario')
    .sort({ fechaRegistro: -1 });

    res.json(ganado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el ganado' });
  }
});

// Obtener un animal específico
router.get('/:id', auth, async (req, res) => {
  try {
    const animal = await Ganado.findById(req.params.id)
      .populate('usuarioRegistro', 'nombreUsuario')
      .populate('empresa', 'nombre');

    if (!animal) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    res.json(animal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el animal' });
  }
});

// Registrar nuevo animal
router.post('/', auth, async (req, res) => {
  try {
    const ganado = await Ganado.create({
      ...req.body,
      usuarioRegistro: req.usuario.id
    });

    const ganadoCompleto = await Ganado.findById(ganado._id)
      .populate('usuarioRegistro', 'nombreUsuario');

    res.status(201).json(ganadoCompleto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el animal' });
  }
});

// Actualizar animal
router.put('/:id', auth, async (req, res) => {
  try {
    const ganado = await Ganado.findById(req.params.id);

    if (!ganado) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    // Verificar que pertenece a la misma empresa
    if (ganado.empresa.toString() !== req.usuario.empresa.toString()) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    Object.assign(ganado, req.body);
    ganado.ultimaActualizacion = Date.now();
    await ganado.save();

    const ganadoActualizado = await Ganado.findById(ganado._id)
      .populate('usuarioRegistro', 'nombreUsuario');

    res.json(ganadoActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el animal' });
  }
});

// Eliminar animal
router.delete('/:id', auth, async (req, res) => {
  try {
    const ganado = await Ganado.findById(req.params.id);

    if (!ganado) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    // Verificar que pertenece a la misma empresa
    if (ganado.empresa.toString() !== req.usuario.empresa.toString()) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await Ganado.findByIdAndDelete(req.params.id);

    res.json({ mensaje: 'Animal eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el animal' });
  }
});

// Obtener estadísticas
router.get('/estadisticas/empresa/:empresaId', auth, async (req, res) => {
  try {
    const ganado = await Ganado.find({ empresa: req.params.empresaId });

    const estadisticas = {
      total: ganado.length,
      porEspecie: {},
      porGenero: {},
      porEstado: {},
      pesoPromedio: 0
    };

    let pesoTotal = 0;
    let contadorPeso = 0;

    ganado.forEach(animal => {
      // Por especie
      estadisticas.porEspecie[animal.especie] = 
        (estadisticas.porEspecie[animal.especie] || 0) + 1;

      // Por género
      estadisticas.porGenero[animal.genero] = 
        (estadisticas.porGenero[animal.genero] || 0) + 1;

      // Por estado
      estadisticas.porEstado[animal.estado] = 
        (estadisticas.porEstado[animal.estado] || 0) + 1;

      // Peso promedio
      if (animal.peso) {
        pesoTotal += animal.peso;
        contadorPeso++;
      }
    });

    if (contadorPeso > 0) {
      estadisticas.pesoPromedio = Math.round(pesoTotal / contadorPeso);
    }

    res.json(estadisticas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;