const Permiso = require('../models/Permiso');

const verificarPermiso = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      // Los administradores siempre tienen todos los permisos
      if (req.usuario.rol === 'administrador') {
        return next();
      }

      // Buscar permisos del usuario
      const permisos = await Permiso.findOne({ usuario: req.usuario._id });

      if (!permisos) {
        return res.status(403).json({ 
          error: 'No tienes permisos para realizar esta acción' 
        });
      }

      // Verificar permiso específico
      if (!permisos.permisos[permisoRequerido]) {
        return res.status(403).json({ 
          error: `No tienes permiso para: ${permisoRequerido}` 
        });
      }

      next();
    } catch (error) {
      console.error('Error verificando permisos:', error);
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
};

module.exports = { verificarPermiso };