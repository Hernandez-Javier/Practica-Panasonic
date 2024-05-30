// models/notificaciones.js
const pool = require('./config/database');

const getNotificaciones = async () => {
  const res = await pool.query('SELECT * FROM bodega.Notificaciones');
  return res.rows;
};

const addNotificacion = async (notificacion) => {
  const { productoID, cantidadActual, cantidadMinima, fecha, estado, responsable } = notificacion;
  const res = await pool.query(
    'INSERT INTO bodega.Notificaciones (ProductoID, CantidadActual, CantidadMinima, Fecha, Estado, Responsable) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [productoID, cantidadActual, cantidadMinima, fecha, estado, responsable]
  );
  return res.rows[0];
};

module.exports = {
  getNotificaciones,
  addNotificacion,
};
