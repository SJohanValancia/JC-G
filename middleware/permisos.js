// middleware/permisos.js
const Permiso = require('../models/Permiso'); // ajusta la ruta si tu modelo está en otra carpeta

/**
 * verificarPermiso('ganado')
 * - Carga los permisos de la empresa/usuario en req.permisos
 * - Si el permiso está desactivado:
 *    - permite GET (ver datos)
 *    - bloquea POST/PUT/PATCH/DELETE (operaciones de escritura)
 */
function verificarPermiso(permisoRequerido) {
  return async (req, res, next) => {
    try {
      // Asegurarnos de que hay usuario autenticado
      if (!req.usuario) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      // Si es administrador, permitir todo (mantén esto si tu app lo requiere)
      if (req.usuario.role === 'administrador' || req.usuario.rol === 'administrador') {
        // opcional: cargar permisos completos para uso posterior
        req.permisos = { administrador: true };
        return next();
      }

      // Intentamos obtener el documento de permisos de la empresa del usuario.
      // Ajusta el query si tu esquema es distinto (p. ej. { empresaId: req.params.id })
      const empresaId = req.usuario.empresa || req.usuario.empresaId || req.body.empresa || (req.params && req.params.empresaId);

      let permisosDoc = null;
      if (empresaId) {
        permisosDoc = await Permiso.findOne({ empresa: empresaId }).lean();
      } else {
        // Si no se pudo deducir empresa, intentamos cargar permisos por usuario (si existe ese caso)
        permisosDoc = await Permiso.findOne({ usuario: req.usuario._id }).lean();
      }

      // Guardamos los permisos en req.permisos para que otras capas (filtros, vistas) los usen
      req.permisos = permisosDoc && permisosDoc.permisos ? permisosDoc.permisos : {};

      // Si el permiso requerido no existe o está en false
      const permisoActivo = !!req.permisos[permisoRequerido];

      if (!permisoActivo) {
        // Permitir solo operaciones de lectura (GET). Bloquear cualquier operación de escritura.
        if (req.method === 'GET') {
          return next();
        }
        return res.status(403).json({ error: `No tienes permiso para realizar esta acción: ${permisoRequerido}` });
      }

      // Permiso activo => permitir
      return next();
    } catch (err) {
      console.error('Error en verificarPermiso:', err);
      return res.status(500).json({ error: 'Error en verificación de permisos' });
    }
  };
}

module.exports = { verificarPermiso };
