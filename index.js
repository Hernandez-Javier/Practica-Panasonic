const express = require('express');
const pool = require('./config/database');
const jwt = require('jsonwebtoken');
const app = express();
const cors = require("cors");

const { getUsuario, addUsuario, login, deleteUsuario, modifyUsuario } = require('./models/usuario');
const { getProductos, getProductosCantidadMinima, addProducto, modifyProduct, deleteProduct, addProductosBatch } = require('./models/producto');
const { getEntradasInventario, addEntradaInventario } = require('./models/entradaInventario');
const { getSalidasInventario, addSalidaInventario } = require('./models/salidaInventario');
const { getSalidaParticular, addSalidaParticular } = require('./models/salidaParticular');
const { getDevolucion, addDevolucion } = require('./models/devolucion');
const { getDepartamento, addDepartamento, deleteDepartamento, modifyDepartamento } = require('./models/departamento');
const { getUbicacion, addUbicacion, deleteUbicacion, modifyUbicacion } = require('./models/ubicacion');
const { getBitacora } = require('./models/bitacora');
const { enviarNotificacion } = require('./models/notificacion');

app.use(express.json());

app.use(cors({
  domains: '*',
  methods: "*"
}));

const JWT_SECRET = "Qwertyuiopasdfghjkl()ñzxcvbnm[]qwsasdñlkmsdlsñldfkl";

// Verificar la conexión
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error adquiriendo cliente', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Error ejecutando query', err.stack);
    }
    console.log('Conexión exitosa:', result.rows);
  });
});


//enviar notificaciones por correo
app.get('/notif', async (req, res) => {
  try {
    const notificacion = await enviarNotificacion(req.body);
    res.json(notificacion);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

//Mostrar la lista de usuarios de la DB
app.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await getUsuario();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

//Registrar un nuevo usuario
app.post('/usuarios', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    const nuevoUsuario = await addUsuario(req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    if (error.message === 'El correo ya existe' || error.message === 'La identificación ya existe') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

//Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await login(email, password);
    if (!usuario) {
      return res.status(400).json({ message: 'Email o contraseña incorrectos' });
    }

    // Crear token
    const token = jwt.sign({ id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol }, JWT_SECRET, { expiresIn: '240h' });

    res.json({ token });
  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

//Agregar un nuevo producto
app.post('/productos', async (req, res) => {
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;

    const nuevoProducto = await addProducto(req.body, usuarioID, nombre);

    res.status(201).json(nuevoProducto);
  } catch (error) {
    if (error.message === 'El codigo del producto ya existe') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Endpoint para agregar múltiples productos
app.post('/productos/upload', async (req, res) => {
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la lista de productos del cuerpo de la solicitud
    const productos = req.body;

    // Agregar los productos a la base de datos
    await addProductosBatch(productos);

    res.status(201).json({ message: 'Productos registrados exitosamente' });
  } catch (error) {
    if (error.message.startsWith('El código del producto')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

//Mostrar la lista de productos de la DB
app.get('/productos/all', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    const productos = await getProductos();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

//Mostrar lista de salidas de inventario
app.get('/salidas/all', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    const productos = await getSalidasInventario();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

//Mostrar lista de salidas particulares
app.get('/salidas-particulares/all', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    const productos = await getSalidaParticular();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

//lista de entradas
app.get('/entradas/all', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    const productos = await getEntradasInventario();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

//lista de devoluciones
app.get('/devoluciones/all', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    const productos = await getDevolucion();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

//lista de departamentos
app.get('/departamentos/all', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    const productos = await getDepartamento();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

//lista de ubicaciones
app.get('/ubicaciones/all', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    const productos = await getUbicacion();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

//modificar productos
app.put('/productos/modify/:code', async (req, res) => {
  const code = req.params.code;
  const newData = req.body;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;

    const productoModificado = await modifyProduct(code, newData, usuarioID, nombre);
    res.json(productoModificado);
  } catch (error) {
    console.error('Error modificando el producto', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

//modificar usuarios
app.put('/usuarios/modify/:code', async (req, res) => {
  const code = req.params.code;
  const newData = req.body;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;

    const usuarioModificado = await modifyUsuario(code, newData, usuarioID, nombre);
    res.json(usuarioModificado);
  } catch (error) {
    console.error('Error modificando el producto', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

//Aumentar la cantidad de un producto
app.post('/productos/entrada', async (req, res) => {
  const entrada = req.body;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;
    const result = await addEntradaInventario(entrada, usuarioID, nombre);
    res.status(201).json(result);

  } catch (error) {
    console.error('Error en la verificación del token', error);
    res.status(401).json({ error: 'Token de autorización inválido' });
  }
});

//Dismnuir la cantidad de un producto
app.post('/productos/salida', async (req, res) => {
  const salida = req.body;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;
    const email = decodedToken.email;

    const result = await addSalidaInventario(salida, usuarioID, nombre, email);
    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'Producto no encontrado') {
      res.status(404).json({ error: error.message });
    }
    if(error.message === 'La cantidad en inventario es muy baja'){
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

//eliminar producto
app.delete('/productos/eliminar/:codigo', async (req, res) => {
  const { codigo } = req.params;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];
  console.log(tokenn)

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;

    const result = await deleteProduct(codigo, usuarioID, nombre);
    res.status(200).json({ message: 'Producto eliminado exitosamente', data: result });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

//agregar salida particular
app.post('/productos/salida-particular', async (req, res) => {
  const salida = req.body;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;
    const email = decodedToken.email;

    const result = await addSalidaParticular(salida, usuarioID, nombre, email);
    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'Producto no encontrado') {
      res.status(404).json({ error: error.message });
    }
    if(error.message === 'La cantidad en inventario es muy baja'){
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

//agregar devolucion
app.post('/productos/devolucion', async (req, res) => {
  const devolucion = req.body;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;
    const result = await addDevolucion(devolucion, usuarioID, nombre);
    res.status(201).json(result);

  } catch (error) {
    if (error.message === 'Producto no encontrado') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

//productos en cantidad minima
app.get('/productos/cantidad-minima', async (req, res) => {
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  
  try {
    const productos = await getProductosCantidadMinima();
    res.status(200).json(productos);
  } catch (error) {
    console.error('Error en /productos/cantidadMinima:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

//agregar nuevo departamento
app.post('/departamentos', async (req, res) => {
  const departamento = req.body;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;
    const result = await addDepartamento(departamento, usuarioID, nombre);
    res.status(201).json(result);

  } catch (error) {
    console.error('Error en la verificación del token', error);
    res.status(401).json({ error: 'Ha ocurrido un error en la base de datos' });
  }
});

//eliminar departamento
app.delete('/departamentos/eliminar/:nombre', async (req, res) => {
  const { nombre } = req.params;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const responsable = decodedToken.nombre;

    const result = await deleteDepartamento(nombre, usuarioID, responsable);
    res.status(200).json({ message: 'Producto eliminado exitosamente', data: result });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

//agregar nueva ubicacion
app.post('/ubicaciones', async (req, res) => {
  const ubicacion = req.body;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const nombre = decodedToken.nombre;
    const result = await addUbicacion(ubicacion, usuarioID, nombre);
    res.status(201).json(result);

  } catch (error) {
    console.error('Error en la verificación del token', error);
    res.status(401).json({ error: 'Ha ocurrido un error' });
  }
});

//eliminar ubicacion
app.delete('/ubicaciones/eliminar/:nombre', async (req, res) => {
  const { nombre } = req.params;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const responsable = decodedToken.nombre;

    const result = await deleteUbicacion(nombre, usuarioID, responsable);
    res.status(200).json({ message: 'Producto eliminado exitosamente', data: result });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar ubicacion' });
  }
});

//modificar ubicacion
app.put('/ubicaciones/modificar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const tokenn = token.split(' ')[1];
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const responsable = decodedToken.nombre;

    // Llamar a la función para modificar la ubicación
    const result = await modifyUbicacion(id, { nombre, descripcion }, usuarioID, responsable);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.status(200).json({ message: 'Ubicación modificada exitosamente', data: result });
  } catch (error) {
    console.error('Error al modificar la ubicación', error);
    res.status(500).json({ error: 'Error al modificar la ubicación' });
  }
});

//modificar departamento
app.put('/departamentos/modify/:id', async (req, res) => {
  const { id } = req.params;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const responsable = decodedToken.nombre;

    const { nombre, descripcion } = req.body;
    const newData = { nombre, descripcion };

    const result = await modifyDepartamento(id, newData, usuarioID, responsable);
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }
    res.status(200).json({ message: 'Departamento modificado exitosamente', data: result });
  } catch (error) {
    console.error('Error al modificar el departamento:', error);
    res.status(500).json({ error: 'Error al modificar el departamento' });
  }
});

//eliminar usuario
app.delete('/usuarios/eliminar/:id', async (req, res) => {
  const { id } = req.params;
  const token = req.headers.authorization;
  const tokenn = token.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }

  try {
    // Verificar y decodificar el token
    const decodedToken = jwt.verify(tokenn, JWT_SECRET);

    // Obtener la información del usuario del token decodificado
    const usuarioID = decodedToken.id;
    const responsable = decodedToken.nombre;

    const result = await deleteUsuario(id, usuarioID, responsable);
    res.status(200).json({ message: 'Usuario eliminado exitosamente', data: result });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el objeto' });
  }
});

//mostrar la bitacora
app.get('/bitacora/all', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token de autorización no proporcionado' });
  }
  try {
    const bitacora = await getBitacora();
    res.json(bitacora);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});