// middleware/filtros.js
exports.filtroVisibilidad = (req, campoDueño = 'usuarioRegistro') => {
  if (req.usuario.rol === 'administrador') return {};

  // Si no puede ver datos de otros → solo sus propios docs
  if (req.permisos?.ver_otros === false) {
    return { [campoDueño]: req.usuario._id }; // ← clave dinámica
  }
  return {}; // sin restricciones extra
};