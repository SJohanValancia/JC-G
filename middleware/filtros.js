/**
 * Devuelve un objeto de filtro Mongo para que cada ruta
 * limite los documentos que el usuario puede ver.
 */
exports.filtroVisibilidad = (req) => {
  // Administradores siempre ven todo
  if (req.usuario.rol === 'administrador') return {};

  // Si no tiene el permiso ver_otros => solo sus propios docs
  if (!req.permisos.ver_otros) {
    return { usuario: req.usuario._id };   // para Aporte
           // usuarioRegistro: req.usuario._id  // para Ganado
  }
  // Tiene permiso => puede ver todos los de su empresa
  return { empresa: req.usuario.empresa };
};