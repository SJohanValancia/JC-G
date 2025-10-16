const Permiso = require('../models/Permiso');

  // middleware/permisos.js
  const verificarPermiso = (permisoRequerido) => {
    return async (req, res, next) => {
      try {
        if (req.usuario.rol === 'administrador') {
        req.permisos = {     // ← agrega esto
          ganado: true,
          aportes: true,
          reportes: true,
          editar_propios: true,
          eliminar_propios: true,
          ver_otros: true
        };
          return next();
        }

        const permisosDoc = await Permiso.findOne({ usuario: req.usuario._id });

        if (!permisosDoc) {
          return res.status(403).json({ error: 'Sin permisos asignados' });
        }

      req.permisos = permisosDoc.permisos; // ← guarda el objeto
        if (!req.permisos[permisoRequerido]) {
          return res.status(403).json({ error: `No tienes permiso: ${permisoRequerido}` });
        }

        next();
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al verificar permisos' });
      }
    };
  };

module.exports = { verificarPermiso };