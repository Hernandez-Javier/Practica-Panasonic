const pool = require('../config/database');

//Obtener lista de productos
const getProductos = async () => {
  const res = await pool.query('SELECT * FROM bodega.Productos');
  return res.rows;
};

//Agregar un nuevo producto
const addProducto = async (producto, usuarioID, responsable) => {
  const { codigo, nombre, descripcion, ubicacion, proveedor, cantidad, cantidadMinima, precioUnidadCol, precioUnidadUSD, categoria } = producto;
  try {
    // Verificar si el producto ya existe
    const result = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [codigo]);
    if (result.rows.length > 0) {
      return { error: 'El codigo del producto ya existe' };
    }
    // Calcular el precio total
    const precioTotalCol = precioUnidadCol * cantidad;
    const precioTotalUSD = precioUnidadUSD * cantidad;

    const res = await pool.query(
      'INSERT INTO bodega.Productos (Codigo, Nombre, Descripcion, Ubicacion, Proveedor, Cantidad, CantidadMinima, PrecioUnidadCol, PrecioTotalCol, PrecioUnidadUSD, PrecioTotalUSD, Categoria) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [codigo, nombre, descripcion, ubicacion, proveedor, cantidad, cantidadMinima, precioUnidadCol, precioTotalCol, precioUnidadUSD, precioTotalUSD, categoria]
    );

    //entrada en la bitacora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, res.rows[0].id, "Registro nuevo producto", JSON.stringify({ codigo })]
    );

    return res.rows[0];
  } catch (error) {
    console.error('Error registrando el producto', error);
    throw error;
  }
};

//Buscar producto por codigo
const searchProductByCode = async (codigo) => {
  try {
    const res = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [codigo]);
    return res.rows;
  } catch (error) {
    console.error('Error buscando producto por código', error);
    throw error;
  }
};

//Buscar producto por nombre
const searchProductByName = async (nombre) => {
  try {
    const res = await pool.query('SELECT * FROM bodega.Productos WHERE nombre LIKE $1', ['%' + nombre + '%']);
    return res.rows;
  } catch (error) {
    console.error('Error buscando producto por nombre', error);
    throw error;
  }
};

//Buscar producto por descripción
const searchProductByDesc = async (descripcion) => {
  try {
    const res = await pool.query('SELECT * FROM bodega.Productos WHERE descripcion LIKE $1', ['%' + descripcion + '%']);
    return res.rows;
  } catch (error) {
    console.error('Error buscando producto por descripción', error);
    throw error;
  }
};

//modificar producto
const modifyProduct = async (code, newData, usuarioID, responsable) => {
  const { nombre, descripcion, ubicacion, proveedor, cantidad, cantidadMinima, precioUnidadCol, precioUnidadUSD, categoria } = newData;
  try {
    // Verificar si el producto existe
    const result = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [code]);
    if (result.rows.length === 0) {
      return { error: 'El producto no existe' };
    }

    // Calcular el precio total
    const precioTotalCol = precioUnidadCol * cantidad;
    const precioTotalUSD = precioUnidadUSD * cantidad;

    // Actualizar los datos del producto
    const res = await pool.query(
      'UPDATE bodega.Productos SET Nombre = $1, Descripcion = $2, Ubicacion = $3, Proveedor = $4, Cantidad = $5, CantidadMinima = $6, PrecioUnidadCol = $7, PrecioTotalCol = $8, PrecioUnidadUSD = $9, PrecioTotalUSD = $10, Categoria = $11 WHERE Codigo = $12 RETURNING *',
      [nombre, descripcion, ubicacion, proveedor, cantidad, cantidadMinima, precioUnidadCol, precioTotalCol, precioUnidadUSD, precioTotalUSD, categoria, code]
    );

    //entrada en la bitacora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, res.rows[0].id, "Modificar producto", JSON.stringify({ code })]
    );

    return res.rows[0];
  } catch (error) {
    console.error('Error modificando el producto', error);
    throw error;
  }
};

const deleteProduct = async (codigoProducto, usuarioID, nombre) => {
  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Verificar si el producto existe
    const queryResult = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [codigoProducto]);
    if (queryResult.rows.length === 0) {
      throw new Error('Producto no encontrado');
    }

    // Eliminar el producto
    const deleteResult = await pool.query('DELETE FROM bodega.Productos WHERE codigo = $1 RETURNING *', [codigoProducto]);

    // Registrar la actividad en la bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, FechaHora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, nombre, deleteResult.rows[0].id, "Eliminación de producto", `Producto con código ${codigoProducto} eliminado`]
    );

    // Confirmar la transacción
    await pool.query('COMMIT');
    return deleteResult.rows[0];
  } catch (error) {
    // Revertir la transacción en caso de error
    await pool.query('ROLLBACK');
    console.error('Error eliminando el producto', error);
    throw error;
  }
};

const getProductosCantidadMinima = async () => {
  try {
    const res = await pool.query('SELECT * FROM bodega.Productos WHERE cantidad <= cantidadMinima');
    return res.rows;
  } catch (error) {
    console.error('Error fetching productos with cantidad minima', error);
    throw error;
  }
};

module.exports = {
  getProductos,
  addProducto,
  searchProductByCode,
  searchProductByName,
  searchProductByDesc,
  modifyProduct,
  deleteProduct,
  getProductosCantidadMinima
};
