const pool = require('../config/database');

//Obtener lista de productos
const getProductos = async () => {
  const res = await pool.query('SELECT p.ID, Codigo, p.Nombre, p.Descripcion, FechaEntrada, u.nombre as Ubicacion, Proveedor, Cantidad, CantidadMinima, PrecioUnidadCol, PrecioTotalCol, PrecioUnidadUSD, PrecioTotalUSD, Categoria FROM bodega.Productos p JOIN bodega.ubicaciones u ON p.ubicacion = u.id ORDER BY p.ID DESC;');
  return res.rows;
};

//Agregar un nuevo producto
const addProducto = async (producto, usuarioID, responsable) => {
  const { codigo, nombre, descripcion, ubicacion, proveedor, cantidad, cantidadMinima, precioUnidadCol, precioUnidadUSD, categoria } = producto;
  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Verificar si el producto ya existe
    const result = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [codigo]);
    if (result.rows.length > 0) {
      throw new Error('El codigo del producto ya existe');
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

    // Confirmar la transacción
    await pool.query('COMMIT');
    return res.rows[0];
  } catch (error) {
    // Revertir la transacción en caso de error
    await pool.query('ROLLBACK');
    console.error('Error registrando el producto', error);
    throw error;
  }
};

//agregar una lista de productos
const addProductosBatch = async (productos, usuarioID, responsable) => {
  let count = 0;
  
  try {
    await pool.query('BEGIN');

    for (let producto of productos) {
      const { codigo, nombre, descripcion, ubicacion, proveedor, cantidad, cantidadMinima, precioUnidadCol, precioUnidadUSD, categoria } = producto;

      try {
        // Verificar si el producto ya existe
        const resultProducto = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [codigo]);
        if (resultProducto.rows.length > 0) {
          console.warn(`El código del producto ${codigo} ya existe. Saltando...`);
          continue; // Saltar a la siguiente iteración del bucle si el producto ya existe
        }

        // Verificar si la ubicación existe
        let ubicacionId;
        const resultUbicacion = await pool.query('SELECT id FROM bodega.Ubicaciones WHERE nombre = $1', [ubicacion]);
        if (resultUbicacion.rows.length > 0) {
          // Obtener el ID de la ubicación existente
          ubicacionId = resultUbicacion.rows[0].id;
        } else {
          // Si no existe, agregar una nueva ubicación con la descripción de '.'
          const insertResult = await pool.query('INSERT INTO bodega.Ubicaciones (nombre, descripcion) VALUES ($1, $2) RETURNING id', [ubicacion, '.']);
          ubicacionId = insertResult.rows[0].id;
        }

        const precioTotalCol = precioUnidadCol * cantidad;
        const precioTotalUSD = precioUnidadUSD * cantidad;

        // Insertar el producto con el ID de la ubicación
        await pool.query(
          'INSERT INTO bodega.Productos (Codigo, Nombre, Descripcion, Ubicacion, Proveedor, Cantidad, CantidadMinima, PrecioUnidadCol, PrecioTotalCol, PrecioUnidadUSD, PrecioTotalUSD, Categoria) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [codigo, nombre, descripcion, ubicacionId, proveedor, cantidad, cantidadMinima, precioUnidadCol, precioTotalCol, precioUnidadUSD, precioTotalUSD, categoria]
        );

        count ++;
      } catch (error) {
        console.error(`Error al procesar el producto con código ${codigo}:`, error);
        // No lanzar error aquí para que la operación continúe
      }
    }
    // Entrada en la bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, 0, "Importe de datos", `Se importaron ${count} productos`]
    );

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error registrando productos en lote:', error);
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
      [usuarioID, responsable, res.rows[0].id, "Modificar producto", JSON.stringify( code )]
    );

    return res.rows[0];
  } catch (error) {
    console.error('Error modificando el producto', error);
    throw error;
  }
};

//eliminar producto
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

//mostrar productos con cantidad minima
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
  modifyProduct,
  deleteProduct,
  getProductosCantidadMinima,
  addProductosBatch
};
