// models/bitacora.js
const pool = require('../config/database');

const getBitacora = async () => {
  const res = await pool.query('SELECT * FROM bodega.Bitacora ORDER BY id DESC');
  return res.rows;
};

const addBitacora = async (bitacora) => {
  const { usuarioID, actividadID, tipoActividad, detalles } = bitacora;
  const res = await pool.query(
    'INSERT INTO bodega.Bitacora (UsuarioID, ActividadID, TipoActividad, Detalles) VALUES ($1, $2, $3, $4) RETURNING *',
    [usuarioID, actividadID, tipoActividad, detalles]
  );
  return res.rows[0];
};

module.exports = {
  getBitacora,
  addBitacora,
};
