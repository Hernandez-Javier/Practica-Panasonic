// models/ubicaciones.js
const pool = require('./config/database');

const getUbicaciones = async () => {
  const res = await pool.query('SELECT * FROM bodega.Ubicaciones');
  return res.rows;
};

const addUbicacion = async (ubicacion) => {
  const { nombre, descripcion } = ubicacion;
  const res = await pool.query(
    'INSERT INTO bodega.Ubicaciones (Nombre, Descripcion) VALUES ($1, $2) RETURNING *',
    [nombre, descripcion]
  );
  return res.rows[0];
};

module.exports = {
  getUbicaciones,
  addUbicacion,
};
