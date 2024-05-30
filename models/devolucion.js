// models/devoluciones.js
const pool = require('../config/database');

const getDevolucion = async () => {
  const res = await pool.query('SELECT * FROM bodega.Devoluciones');
  return res.rows;
};

//Hacer una nueva devolucion
const addDevolucion = async (devolucion, usuarioID, nombre) => {
  const { codigoProducto, cantidad, motivo } = devolucion;

  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Consultar la cantidad actual y el precio total en del producto
    const queryResult = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [codigoProducto]);
    if (queryResult.rows.length === 0) {
      return { error: 'Producto no encontrado' };
    }
    
    const cantidadActual = queryResult.rows[0].cantidad;
    const precioCol = queryResult.rows[0].preciounidadcol;
    const precioUSD = queryResult.rows[0].preciounidadusd;

    // Calcular la nueva cantidad y los nuevos precios totales
    const nuevaCantidad = cantidadActual + cantidad;
    const nuevoPrecioTotalCol = nuevaCantidad * precioCol;
    const nuevoPrecioTotalUSD = nuevaCantidad * precioUSD;

    if (queryResult.rows.length === 0) {
      return { error: 'Producto no encontrado' };
    }

    // Actualizar la cantidad y los precios totales del producto
    const updateResult = await pool.query(
      'UPDATE bodega.Productos SET cantidad = $1, precioTotalCol = $2, precioTotalUSD = $3 WHERE codigo = $4 RETURNING *', 
      [nuevaCantidad, nuevoPrecioTotalCol, nuevoPrecioTotalUSD, codigoProducto]
    );

    // Insertar la entrada en el inventario con la fecha actual por defecto
    const res = await pool.query(
      'INSERT INTO bodega.Devoluciones (CodigoProducto, Cantidad, Fecha, Motivo, Responsable) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4) RETURNING *',
      [codigoProducto, cantidad, motivo, nombre]
    );

    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, nombre, res.rows[0].id, "Devolucion", JSON.stringify({ codigoProducto, cantidad})]
    );

    // Confirmar la transacción
    await pool.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    // Revertir la transacción en caso de error
    await pool.query('ROLLBACK');
    console.error('Error aumentando la cantidad del producto', error);
    throw error;
  }
};

module.exports = {
  getDevolucion,
  addDevolucion,
};
