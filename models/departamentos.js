// models/departamentos.js
const pool = require('./config/database');

const getDepartamentos = async () => {
  const res = await pool.query('SELECT * FROM bodega.Departamentos');
  return res.rows;
};

const addDepartamento = async (departamento) => {
  const { nombre, descripcion } = departamento;
  const res = await pool.query(
    'INSERT INTO bodega.Departamentos (Nombre, Descripcion) VALUES ($1, $2) RETURNING *',
    [nombre, descripcion]
  );
  return res.rows[0];
};

module.exports = {
  getDepartamentos,
  addDepartamento,
};
