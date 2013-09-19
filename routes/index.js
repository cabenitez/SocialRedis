var user = require('./user.js');

exports.index = function(req, res){    

  // inicializamos la variable se sesion de usuario
  req.session.usr = req.session.usr || '';
  // definimos la plantilla a renderizar
  plantilla = req.session.usr  === '' ? 'index' : 'home';
  // renderizamos la palntilla
  res.render(plantilla, 
             { titulo: titulo,  
               autor: autor,
               usuario: req.session.usr
             }
  );

  sessionIO.on('connection', function (err, socket, session) {
    //usuarios logueados
    if(session.usr != ''){
      // guardamos el socket.id del usuario actual
      usrEnLinea[session.usr.uid] = socket.id; 

      // informamos a los amigos que se ha conectado el usuario
      user.setAmigoConectado(session.usr);

      // obtenemos los posts
      user.getPosts(session.usr.uid);

      // obtenemos los usuarios conectados
      user.getAmigosConectados(session.usr.uid);

      // obtenemos los usuarios que no son amigos
      user.getUsuariosNuevos(session.usr.uid);

      // obtenemos las solicitudes pendientes
      user.getSolicitudes(session.usr.uid);

      // Emitimos el mensaje al usuario
      socket.on('enviarMensaje', function (data){
          data.de     = session.usr.uid;
          data.nombre = session.usr.nombre + ' ' + session.usr.apellido;        
          user.enviarMensaje(data);
      });
    }else{
      // obtenemos la cantidad de usuarios
      user.getTotalUsuarios();
    }
  });
};