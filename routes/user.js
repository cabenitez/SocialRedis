// funcion para formatear la fecha
function formatearFecha(fecha) {
  var d       = new Date(fecha || Date.now()),
      dia     = d.getDate(),
      mes     = (d.getMonth() + 1),
      anio    = d.getFullYear(),
      hora    = d.getHours(),
      minuto  = d.getMinutes(),
      segundo = d.getSeconds();

  if (mes.length < 2) mes += '0';
  if (dia.length < 2) dia += '0';

  return [dia, mes, anio].join('-') + ' ' + [hora, minuto, segundo].join(':');
}
// emitimos el total de usuarios
var getTotalUsuarios = function () {
  db.scard('usuarios', function (err, cant) {
    io.sockets.emit("setTotalUsuarios", cant);
  });
}
// registramos el usuario
exports.registro = function(req, res) {

  var nombre   = req.param('nombre'),
      apellido = req.param('apellido'),
      usuario  = req.param('usuario'),
      clave    = req.param('clave'),
      correo   = req.param('correo');

  if (nombre.length < 1 || apellido.length < 1 || usuario.length < 1 || clave.length < 1 || correo.length < 1 ){
    res.send({codigo: 204, mensaje: 'Complete todos los campos' });
    return;
  }else{
    // guardar en DB
    db.get('usuario:' + usuario + ':uid', function (err, reply) {
        if (reply === null){            
          // obtenemos el proximo uid
          db.incr('global:ultimoUid', function (err, uid) {
            // seteamos el uid al usuario
            db.set('usuario:' + usuario + ':uid', uid);
            // encripto las claves
            var hashClave = crypto.createHash('sha256').update(clave).digest('hex');
            // seteamos los campos al usuario
            db.hmset('uid:' + uid, {'nombre'   : nombre, 
                                    'apellido' : apellido, 
                                    'usuario'  : usuario,
                                    'clave'    : hashClave,
                                    'correo'   : correo
                                    }
                    );
            // incremento la cantidad de usuarios (ver si dejar o no)
            db.sadd('usuarios',uid);
            // seteamos las variables de session
            req.session.usr = {'uid'      : uid, 
                                'nombre'   : nombre, 
                                'apellido' : apellido, 
                                'usuario'  : usuario
                                };
            // emitimos el total de usuarios
            getTotalUsuarios();

            res.send({codigo: 201, mensaje: '/' });                
          });
        }else
          res.send({codigo: 204, mensaje: 'Error: El usuario ya existe' });
    });
  }
};
// verificamos el usuario y creamos la variable de sesion
exports.login = function(req, res){
  var usuario = req.param('usuario'),
      clave   = req.param('clave');

  if (usuario.length < 1 || clave.length < 1){
    res.send({codigo: 204, mensaje: 'Complete todos los campos' });
    return;
  }else{
    db.get('usuario:' + usuario + ':uid', function (err, uid) {

      if (uid === null)
        res.send({codigo: 204, mensaje: 'Error: El Usuario no existe' });
      else{
        // obtenemos todos los atributos del usuario
        db.hgetall('uid:' + uid, function (err, usuario) {
            // encriptamos la clave
            var hashClave = crypto.createHash('sha256').update(clave).digest('hex');
            if (hashClave == usuario.clave) {
              // creamos la variable se sesion
              req.session.usr = {'uid'      : uid, 
                                 'nombre'   : usuario.nombre, 
                                 'apellido' : usuario.apellido, 
                                 'usuario'  : usuario.usuario
                                };

              res.send({codigo: 201, mensaje: '/' });
            }else
              res.send({codigo: 204, mensaje: 'Error: Usuario o clave incorrectos' });
        });
      }
    });
  }
}
// logout
exports.logout = function(req, res){
  // informamos a los amigos que se ha desconectado el usuario
  setAmigoDesconectado(req.session.usr.uid);
  // eliminamos el uid del array de usuarios y la session
  delete usrEnLinea[req.session.usr.uid];
  // eliminamos la clave se session
  req.session.usr = '';
  // redireccionamos
  res.redirect('/');
}
// registramos y envia una solicitud de amistad
exports.setSolicitud = function(req, res){
  var uid = req.param('uid');

  if (uid.length < 1){
    res.send({codigo: 204, mensaje: 'Usuario Invalido' });
  }else{
    // agregamos el usuario a la lista de solicitudes
    db.sadd('uid:' + uid + ':solicitudes', req.session.usr.uid);
    // obtenemos la solicitudes y la enviamos al usuario
    getSolicitudes(uid);
    
    res.send({codigo: 201, mensaje: '' });
  }
}
// respondemos la solicitud de amistad
exports.setRespuestaSolicitud = function(req, res){
  var uid    = req.param('uid'),
      accion = req.param('accion');

  db.get('uid:' + uid , function (err, reply) {
      if (reply === null){        
        res.send({codigo: 204, mensaje: 'Usuario Invalido' });
      }else{
        if (accion == 'Aceptar'){
            // agregamos como amigoa a ambos usuarios
            db.sadd('uid:' + uid + ':amigos', req.session.usr.uid);
            db.sadd('uid:' + req.session.usr.uid + ':amigos', uid);
        }
        // eliminamos la solicitud actual
        db.srem('uid:' + req.session.usr.uid + ':solicitudes', uid);

        res.send({codigo: 201, mensaje: '' });
      }
  });    
}
// registramos el post para el usuario actual y los amigos
exports.setPost = function(req, res){ 
  var post = req.param('post');

  if (post.length < 1){
    res.send({codigo: 204, mensaje: 'Mensaje Invalido' });
    return;
  }else{
    db.incr('global:ultimoPid', function (err, pid) {
      var fecha = formatearFecha();
      var uid   = req.session.usr.uid;

      // seteamos el post y la fecha/hora actual
      db.hmset('post:' + pid, {'uid'   : uid, 
                               'fecha' : fecha, 
                               'post'  : post
                              }
              );
      
      // incremento la cantidad de posts para el usuario actual
      db.incr('uid:' + uid + ':nposts');
      
      var postID = pid;
      // obtenemos los seguidores
      db.smembers("uid:" + uid + ":amigos", function (err, amigos) {
        // agrego el usuario actual
        amigos.push(uid);          
        // agrego el id del post a cada amigo
        amigos.forEach(function(sid){
            db.lpush('uid:' + sid + ':posts', postID);              
        });
      });      
      res.send({codigo: 201, mensaje: 'Mensaje publicado'}); 
    });
  }
};
// obtenemos la lista de post
var getPosts = function(uid){
  db.lrange('uid:' + uid + ':posts', 0, 10, function (err, posts) {        
    if (posts) {
      var arrayPosts = [];
      var i = 0;
      // obtenemos los atributos de cada post
      posts.forEach(function(pid) {
        db.hgetall('post:' + pid, function (err, post) {
          var usuarioNombre;
          // obtenemos los atributos del usuario
          db.hgetall('uid:' + post.uid, function (err, usuario) {
            i++;
            arrayPosts.push({'uid'     : post.uid,
                             'nombre'  : usuario.nombre,
                             'apellido': usuario.apellido,
                             'fecha'   : post.fecha,
                             'mensaje' : post.post
                            });
            // al final de la lista de post se emite al usuario
            if (i == posts.length)
              io.sockets.socket(usrEnLinea[uid]).emit('setPosts', arrayPosts);
          });
        });
      });
    }
  });
}
// obtenemos los amigos conectados
var getAmigosConectados = function(uid){
  db.smembers('uid:' + uid + ':amigos', function (err, amigos) {
    if (amigos) {
      var usrConectados = [];
      var i = 0;

      amigos.forEach(function(id){
        i++;
        // verificamos que el usuario se encuentre conectado
        if (usrEnLinea[id]){
          // obtenemos la informacion del usuario
          db.hgetall('uid:' + id, function (err, usuario) {
            usrConectados.push({'uid': id,
                          'nombre' : usuario.nombre,
                          'apellido' : usuario.apellido 
                          });

            // emitimos los amigos
            if (i == amigos.length)
              io.sockets.socket(usrEnLinea[uid]).emit('setAmigosConectados', usrConectados);
          });
        }
      });
    }
  });
}
// obtenemos los usuarios que no son amigos
var getUsuariosNuevos = function(uid){
  db.sdiff('usuarios', 'uid:' + uid + ':amigos', function (err, usuarios) {
    if (usuarios) {
      var usrNuevos = [];

      usuarios.forEach(function(id){
        // verificamos que no sea el usuario actual
        if (uid != id){
          // verificamos que no tenga una solicitud pendiente
          db.sismember('uid:' + id + ':solicitudes', uid, function (err, solicitudEnviada) {
            if(solicitudEnviada == 0){
              // obtenemos la informacion del usuario
              db.hgetall('uid:' + id, function (err, usuario) {
                  usrNuevos.push({'uid': id,
                                'nombre' : usuario.nombre,
                                'apellido' : usuario.apellido 
                                });
                  // emitimos los usuarios
                  if (usrNuevos.length == usuarios.length - 1)
                    io.sockets.socket(usrEnLinea[uid]).emit('setUsuariosNuevos', usrNuevos);
              });
            }
          });
        }
      });
    }
  });
}
// obtenemos la cantidad de solicitudes pendientes
var getSolicitudes = function(uid){
  db.smembers('uid:' + uid + ':solicitudes', function (err, solicitudesRecibidas) {
    if (solicitudesRecibidas) {
      var solicitudes = [];

      // obtenemos los datos de cada uid 
      solicitudesRecibidas.forEach(function(id){
        db.hgetall('uid:' + id, function (err, usuario) {
          solicitudes.push({'uid': id,
                            'nombre' : usuario.nombre,
                            'apellido' : usuario.apellido
                           });

          // emitimos las solicitudes
          if (solicitudes.length == solicitudesRecibidas.length)
            io.sockets.socket(usrEnLinea[uid]).emit('getSolicitudes', solicitudes);
        });
      });
    }
  });
}
// informamos a los amigos que se ha conectado el usuario
var setAmigoConectado = function(usr){
  // obtenemos todos los amigos
  db.smembers('uid:' + usr.uid + ':amigos', function (err, amigos) {
    amigos.forEach(function(id){
      // verificamos que el usuario se encuentre conectado
      if (usrEnLinea[id])
        io.sockets.socket(usrEnLinea[id]).emit('setAmigoConectado', usr);
    });
  });
}
// informamos a los amigos que se ha desconectado el usuario
var setAmigoDesconectado = function(uid){
  // obtenemos todos los amigos
  db.smembers('uid:' + uid + ':amigos', function (err, amigos) {
    amigos.forEach(function(id){
      // verificamos que el usuario se encuentre conectado
      if (usrEnLinea[id])
        io.sockets.socket(usrEnLinea[id]).emit('setAmigoDesconectado', uid);
    });
  });
}
// se envia el mensaje del chat
var enviarMensaje = function (data){
  io.sockets.socket(usrEnLinea[data.para]).emit('mensajeRecibido', data);
}

// exportamos las funciones
exports.getTotalUsuarios     = getTotalUsuarios;
exports.getAmigosConectados  = getAmigosConectados;
exports.getUsuariosNuevos    = getUsuariosNuevos;
exports.getSolicitudes       = getSolicitudes;
exports.setAmigoConectado    = setAmigoConectado;
exports.setAmigoDesconectado = setAmigoDesconectado;
exports.enviarMensaje        = enviarMensaje;
exports.getPosts             = getPosts;