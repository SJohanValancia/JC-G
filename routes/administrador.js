const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Permiso = require('../models/Permiso');
const Aporte = require('../models/Aporte');
const authMiddleware = require('../middleware/auth');

// Middleware de autenticación
router.use(authMiddleware);

// Middleware para verificar que sea administrador
const verificarAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'administrador') {
    return res.status(403).json({ 
      error: 'No tienes permisos de administrador' 
    });
  }
  next();
};

// Obtener todos los usuarios de la empresa
router.get('/usuarios', verificarAdmin, async (req, res) => {
  try {
    const empresaId = req.usuario.empresa;
    
    const usuarios = await Usuario.find({ empresa: empresaId })
      .select('-password')
      .sort({ fechaRegistro: -1 });
    
    const usuariosConAportes = await Promise.all(
      usuarios.map(async (usuario) => {
        // Obtener permisos
        let permisos = await Permiso.findOne({ usuario: usuario._id });
        
        if (!permisos) {
          permisos = await Permiso.create({
            usuario: usuario._id,
            empresa: empresaId,
            permisos: {
              ganado: true,
              aportes: true,
              gastos: true,
              reportes: true,
              editar_propios: true,
              eliminar_propios: false,
              ver_otros: true
            }
          });
        }
        
        // Calcular deuda restante y cuotas restantes
        let deudaRestante = usuario.deuda || 0;
        let cuotasRestantes = usuario.cuotas || 0;
        let totalAportado = 0;
        let cantidadAportes = 0;
        
        if (usuario.deuda > 0) {
          // Sumar todos los aportes del usuario (solo ingresos)
          const aportes = await Aporte.find({
            usuario: usuario._id,
            empresa: empresaId,
            tipo: 'ingreso'
          });
          
          totalAportado = aportes.reduce((sum, aporte) => sum + aporte.monto, 0);
          cantidadAportes = aportes.length;
          
          // Calcular deuda restante
          deudaRestante = Math.max(0, usuario.deuda - totalAportado);
          
          // Calcular cuotas restantes
          cuotasRestantes = Math.max(0, usuario.cuotas - cantidadAportes);
        }
        
        return {
          ...usuario.toObject(),
          deudaRestante,
          cuotasRestantes,
          totalAportado,
          cantidadAportes,
          permisos: permisos.permisos
        };
      })
    );
    
    res.json(usuariosConAportes);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// NUEVO ENDPOINT: Actualizar deuda de un usuario
router.put('/deuda/:usuarioId', verificarAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { deuda, cuotas } = req.body;
    const empresaId = req.usuario.empresa;
    
    // Verificar que el usuario pertenezca a la empresa
    const usuario = await Usuario.findOne({ 
      _id: usuarioId, 
      empresa: empresaId 
    });
    
    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }
    
    // No permitir modificar deuda de administradores
    if (usuario.rol === 'administrador') {
      return res.status(403).json({ 
        error: 'No se puede asignar deuda a administradores' 
      });
    }
    
    // Actualizar deuda y cuotas
    usuario.deuda = deuda || 0;
    usuario.cuotas = cuotas || 0;
    await usuario.save();
    
    res.json({
      mensaje: 'Deuda actualizada exitosamente',
      usuario: {
        id: usuario._id,
        nombreUsuario: usuario.nombreUsuario,
        deuda: usuario.deuda,
        cuotas: usuario.cuotas
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar deuda' });
  }
});

// Obtener permisos de un usuario
router.get('/permisos/:usuarioId', verificarAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const empresaId = req.usuario.empresa;
    
    const usuario = await Usuario.findOne({ 
      _id: usuarioId, 
      empresa: empresaId 
    }).select('-password');
    
    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }
    
    let permisos = await Permiso.findOne({ usuario: usuarioId });
    
    if (!permisos) {
      permisos = await Permiso.create({
        usuario: usuarioId,
        empresa: empresaId,
        permisos: {
          ganado: true,
          aportes: true,
          gastos: true,
          reportes: true,
          editar_propios: true,
          eliminar_propios: false,
          ver_otros: true
        }
      });
    }
    
    res.json({
      usuario: {
        id: usuario._id,
        nombreUsuario: usuario.nombreUsuario,
        rol: usuario.rol
      },
      permisos: permisos.permisos
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
});

// Actualizar permisos de un usuario
router.put('/permisos/:usuarioId', verificarAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { permisos } = req.body;
    const empresaId = req.usuario.empresa;
    
    const usuario = await Usuario.findOne({ 
      _id: usuarioId, 
      empresa: empresaId 
    });
    
    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }
    
    if (usuario.rol === 'administrador') {
      return res.status(403).json({ 
        error: 'No se pueden modificar permisos de administradores' 
      });
    }
    
    const permisosActualizados = await Permiso.findOneAndUpdate(
      { usuario: usuarioId },
      { 
        permisos,
        fechaActualizacion: Date.now()
      },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    
    res.json({
      mensaje: 'Permisos actualizados exitosamente',
      permisos: permisosActualizados.permisos
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar permisos' });
  }
});

// Obtener mis permisos (para el usuario actual)
router.get('/mis-permisos', async (req, res) => {
  try {
    if (req.usuario.rol === 'administrador') {
      return res.json({
        permisos: {
          ganado: true,
          aportes: true,
          gastos: true,
          reportes: true,
          editar_propios: true,
          eliminar_propios: true,
          ver_otros: true
        }
      });
    }

    let permisos = await Permiso.findOne({ usuario: req.usuario._id });

    if (!permisos) {
      permisos = await Permiso.create({
        usuario: req.usuario._id,
        empresa: req.usuario.empresa,
        permisos: {
          ganado: true,
          aportes: true,
          gastos: true,
          reportes: true,
          editar_propios: true,
          eliminar_propios: false,
          ver_otros: true
        }
      });
    }

    res.json({ permisos: permisos.permisos });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
});

// Obtener mi deuda (para el usuario actual)
router.get('/mi-deuda', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let deudaRestante = usuario.deuda || 0;
    let totalAportado = 0;

    if (usuario.deuda > 0) {
      // Sumar todos los aportes del usuario (solo ingresos)
      const aportes = await Aporte.find({
        usuario: usuario._id,
        empresa: req.usuario.empresa,
        tipo: 'ingreso'
      });
      
      totalAportado = aportes.reduce((sum, aporte) => sum + aporte.monto, 0);
      deudaRestante = Math.max(0, usuario.deuda - totalAportado);
    }

    res.json({
      deudaOriginal: usuario.deuda || 0,
      totalAportado,
      deudaRestante,
      cuotas: usuario.cuotas || 0
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener deuda' });
  }
});

module.exports = router;