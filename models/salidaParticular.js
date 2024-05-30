// models/salidasParticulares.js
const pool = require('../config/database');

const getSalidaParticular = async () => {
  const res = await pool.query('SELECT * FROM bodega.SalidasParticulares');
  return res.rows;
};

const addSalidaParticular = async (salida, usuarioID, nombre) => {
  const { codigoProducto, cantidad, motivo} = salida;

  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Consultar la cantidad actual y el precio total del producto
    const queryResult = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [codigoProducto]);
    if (queryResult.rows.length === 0) {
      return { error: 'Producto no encontrado' };
    }

    const cantidadActual = queryResult.rows[0].cantidad;
    const precioCol = queryResult.rows[0].preciounidadcol;
    const precioUSD = queryResult.rows[0].preciounidadusd;

    //verifica que la cantidad actual sea mayor a la cantidad por reducir
    if (cantidadActual < cantidad) {
      return { error: 'La cantidad en inventario es muy baja' };
    }

    // Calcular la nueva cantidad y los nuevos precios totales
    const nuevaCantidad = cantidadActual - cantidad;
    const nuevoPrecioTotalCol = nuevaCantidad * precioCol;
    const nuevoPrecioTotalUSD = nuevaCantidad * precioUSD;

    // Actualizar la cantidad y los precios totales del producto
    const updateResult = await pool.query(
      'UPDATE bodega.Productos SET cantidad = $1, precioTotalCol = $2, precioTotalUSD = $3 WHERE codigo = $4 RETURNING *', 
      [nuevaCantidad, nuevoPrecioTotalCol, nuevoPrecioTotalUSD, codigoProducto]
    );

    //agrega nuevo registro de salida particular
    const res = await pool.query(
      'INSERT INTO bodega.SalidasParticulares (CodigoProducto, Cantidad, Fecha, Motivo, Responsable) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4) RETURNING *',
      [codigoProducto, cantidad, motivo, nombre]
    );

    //nuevo registro en bitacora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, nombre, res.rows[0].id, "Salida particular", JSON.stringify({ codigoProducto, cantidad})]
    );

    // Confirmar la transacción
    await pool.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    // Revertir la transacción en caso de error
    await pool.query('ROLLBACK');
    console.error('Error disminuyendo la cantidad del producto', error);
    throw error;
  }
};

module.exports = {
  getSalidaParticular,
  addSalidaParticular,
};
