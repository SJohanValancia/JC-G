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
    
    // Obtener todos los usuarios de la empresa
    const usuarios = await Usuario.find({ empresa: empresaId })
      .select('-password')
      .sort({ fechaRegistro: -1 });
    
    // Para cada usuario, obtener su último aporte
    const usuariosConAportes = await Promise.all(
      usuarios.map(async (usuario) => {
        const ultimoAporte = await Aporte.findOne({ 
          usuario: usuario._id,
          empresa: empresaId
        })
          .sort({ fecha: -1 })
          .limit(1);
        
        // Obtener permisos
        let permisos = await Permiso.findOne({ usuario: usuario._id });
        
        // Si no tiene permisos, crear permisos por defecto
        if (!permisos) {
          permisos = await Permiso.create({
            usuario: usuario._id,
            empresa: empresaId,
            permisos: {
              ganado: true,
              aportes: true,
              reportes: true,
              editar_propios: true,
              eliminar_propios: false,
              ver_otros: true
            }
          });
        }
        
        return {
          ...usuario.toObject(),
          ultimoAporte: ultimoAporte || null,
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

// Obtener permisos de un usuario
router.get('/permisos/:usuarioId', verificarAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const empresaId = req.usuario.empresa;
    
    // Verificar que el usuario pertenezca a la empresa
    const usuario = await Usuario.findOne({ 
      _id: usuarioId, 
      empresa: empresaId 
    }).select('-password');
    
    if (!usuario) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }
    
    // Obtener permisos
    let permisos = await Permiso.findOne({ usuario: usuarioId });
    
    // Si no tiene permisos, crear permisos por defecto
    if (!permisos) {
      permisos = await Permiso.create({
        usuario: usuarioId,
        empresa: empresaId,
        permisos: {
          ganado: true,
          aportes: true,
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
    
    // No permitir modificar permisos de administradores
    if (usuario.rol === 'administrador') {
      return res.status(403).json({ 
        error: 'No se pueden modificar permisos de administradores' 
      });
    }
    
    // Actualizar o crear permisos
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

module.exports = router;