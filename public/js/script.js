// nos conectamos al socket
var sockets        = io.connect('http://127.0.0.1:3000');
var ultimaFechaMsg = 0;

$(document).ready(function(){

  // registro de usuario
  $(document).on('submit', '#nuevoFrm', function(e){
    e.preventDefault();
    setUsuario($(this));
  });
  // login
  $(document).on('submit', '#loginFrm', function(e){
      e.preventDefault();
      login($(this));
  });
  // nuevo post
  $(document).on('submit', '#postFrm', function(e){
    e.preventDefault();
    setPost($(this));
  });
  // se envia una solicitud de amistad
  $(document).on('click', '#usuariosNuevos ul li', function(){
      setSolicitud($(this).attr('uid'));
  });
  // contador de solicitudes
  $(document).on('click', '.contador', function(){
    $('#solicitudes').fadeToggle(500);
  });
  // boton de aceptar/cancelar solicitudes
  $(document).on('click', '#solicitudes input[type="button"]', function(){
    setRespuestaSolicitud($(this));
  });
  // abre ventanas de chat
  $(document).on('click', '#usuariosAmigos ul li', function(){
    abrirVentanaChat($(this).attr('uid'));
  });  
  // cuando el usuario presiona enter emite el mensaje
  $(document).on('keypress', '.chat-text', function(e){
    if (e.which == 13)
      enviarMensaje($(this).parent().attr('uid'), $(this).val());       
  });

  // io - cuando se registra un usuario muestro el total
  sockets.on('setTotalUsuarios', mostrarTotalUsuarios);
  // io - mostramos los posts
  sockets.on('setPosts', mostrarPosts);
  // io - mostramos los amigos conectados
  sockets.on('setAmigosConectados', mostrarAmigosConectados);
  // io - mostramos cuando se conecta un amigo
  sockets.on('setAmigoConectado', mostrarAmigoConectado);
  // io - mostramos cuando se desconecta un amigo
  sockets.on('setAmigoDesconectado', mostrarAmigoDesconectado);
  //io - mostramos los usuarios que no son amigos
  sockets.on('setUsuariosNuevos', mostrarUsuariosNuevos);
  // io - cuando se recibe una solicitud
  sockets.on('getSolicitudes', mostrarSolicitudes);
  // io - mostramos el mensaje recibido del chat
  sockets.on('mensajeRecibido', mostrarMensajeRecibido);
});

// funcion para mostrar el mensaje de error en los formularios
function mostrarMensajeFormulario(form, mensaje){
  if (form.find('p').size())
    form.find('p').show().html(mensaje);
  else
    form.prepend('<p class="error">' + mensaje + '</p>');
  form.find('p').fadeOut(7000);
}
// cuando recibe el total de usuarios lo muestra en el contenedor
function mostrarTotalUsuarios(data){
  $('#totalUsuarios').html(data);
}
// metodo POST de registro
function setUsuario(form) {
  $.post("/registro", form.serialize(),
    function(respuesta){
      if (respuesta.codigo === 201)
        window.location = respuesta.mensaje;
      else
        mostrarMensajeFormulario(form, respuesta.mensaje);
    }
  );
}
// metodo POST de login
function login(form) {
  $.post("/login", form.serialize(),
    function(respuesta){
      if (respuesta.codigo === 201)
        window.location = respuesta.mensaje;
      else
        mostrarMensajeFormulario(form, respuesta.mensaje);
    }
  );
}
// metodo POST cuando se escrine un post nuevo
function setPost(form) {
  $.post("/setPost", form.serialize(),
    function(respuesta){
      if (respuesta.codigo === 201){
        var bloque  = '<article class="bloque marco blanco">';
            bloque += '   <div class="header">';
            bloque += '       <img src="/img/icon-profile.png" />';
            bloque += '       <span class="bloque_usuario">yo </span>';
            bloque += '       <span class="bloque_fecha"> hace unos segundos...</span>';
            bloque += '   </div>';
            bloque += '   <div class="value">' + $('#postFrm textarea').val() + '</div>';
            bloque += '</article>';

        $('#posts').prepend(bloque);
        $('#postFrm textarea').val('');
      }else
        mostrarMensajeFormulario(form, respuesta.mensaje);
    }
  );
}
// muestra los posts en el contenedor
function mostrarPosts(data){
  if (data.length) {
    $('#posts').html('');
    data.forEach(function (post) {
      var nombreUsuario = post.nombre + ' ' + post.apellido;
      var bloque  = '<article class="bloque marco blanco">';
          bloque += '   <div class="header">';
          bloque += '       <img src="/img/icon-profile.png" />';
          bloque += '       <span class="bloque_usuario">' + nombreUsuario + '</span>';
          bloque += '       <span class="bloque_fecha">'+ post.fecha + '</span>';
          bloque += '   </div>';
          bloque += '   <div class="value">' + post.mensaje + '</div>';
          bloque += '</article>';

      $('#posts').append(bloque);
    });
  };
}
// muestra los amigos conectados
function mostrarAmigosConectados(data){
  if (data.length) {
    $('#usuariosAmigos').html('<ul></ul>');
    data.forEach(function (usuario) {
      var nombreUsuario = usuario.nombre + ' ' + usuario.apellido;
      $('#usuariosAmigos ul').prepend('<li uid="' + usuario.uid +'">' + nombreUsuario + '</li>');
    });
  };
}
// agrega un usuario a la lista de amigos cuando se conecta
function mostrarAmigoConectado(data){
  if ($('#usuariosAmigos ul li[uid="' + data.uid + '"]').size() === 0){
    // creamos la lista si no existe
    if($('#usuariosAmigos p').size()){
      $('#usuariosAmigos p').remove();
      $('#usuariosAmigos').append('<ul></ul>');
    }

    var nombreUsuario = data.nombre + ' ' + data.apellido;
    $('#usuariosAmigos ul').prepend('<li uid="' + data.uid +'">' + nombreUsuario + '</li>');
  }
}
// elimina un usuario de la lista de amigos cuando se desconecta
function mostrarAmigoDesconectado(data){
  // eliminamos el amigo de la lista
  $('#usuariosAmigos ul li[uid="' + data + '"]').remove();
  // si no hay amigos mostramos el mensaje
  if ($('#usuariosAmigos ul li').size() == 0){
    $('#usuariosAmigos ul').remove();
    $('#usuariosAmigos').prepend('<p>No hay amigos conectados...</p>');
  }

  // eliminamos la ventana de chat si existe
  if ($('#ventana-' + data).size())
    $('#ventana-' + data).remove();
}
// muestra los usuarios nuevos
function mostrarUsuariosNuevos(data){
  if (data.length) {
    $('#usuariosNuevos').html('<ul>');
    data.forEach(function (usuario) {
      var nombreUsuario = usuario.nombre + ' ' + usuario.apellido ;
      $('#usuariosNuevos ul').append('<li uid="' + usuario.uid +'">' + nombreUsuario + '</li>');
    });
    $('#usuariosNuevos').append('</ul>');
  };
}
// se envia una solicitud de amistad
function setSolicitud(uid) {
  $.post("/setSolicitud", 'uid=' + uid,
    function(respuesta){
      if (respuesta.codigo === 201)
        $('#usuariosNuevos ul li[uid="' + uid + '"]').fadeOut(1000);
      else
        $('#usuariosNuevos ul li[uid="' + uid + '"]').html(respuesta.mensaje);
    }
  );
}
// se muestran las solicitudes de amistad
function mostrarSolicitudes(solicitudes) {
  if (solicitudes.length) {
    $('#solicitudes').html('');
    solicitudes.forEach(function (usuario) {
      var contenido = '';
          contenido += '<li uid="' + usuario.uid +'" >';
          contenido += '  <span>' + usuario.nombre + ' ' + usuario.apellido + ' quiere ser tu amigo!' + '</span>';
          contenido += '  <div>';
          contenido += '      <input type="button" value="Aceptar" uid="' + usuario.uid +'" />';
          contenido += '      <input type="button" value="Cancelar" uid="' + usuario.uid +'" />';
          contenido += '  </div>';
          contenido += '</li>';

      $('#solicitudes').prepend(contenido);
    });

    $('#valorContador').fadeOut(500, function() {
      $(this).html(solicitudes.length).fadeIn(500)
    });
  }
}
// se responde una solicitud de amistad
function setRespuestaSolicitud(boton) {
  $.post("/setRespuestaSolicitud", 'uid=' + boton.attr('uid') + '&accion=' + boton.attr('value'),
    function(respuesta){
      if (respuesta.codigo === 201){
        $('#solicitudes li[uid="' + boton.attr('uid') + '"]').fadeOut(1000);

        $('#valorContador').fadeOut(500, function() {
            $(this).html(parseInt($(this).html()) - 1).fadeIn(500)
        });
      }else
        $('#solicitudes li[uid="' + boton.attr('uid') + '"]').html(respuesta.mensaje);
    }
  );
}
// abre una ventana de chat
function abrirVentanaChat(uid) {
  if (!$('#ventana-' + uid).size()){
    var nombre = $('#usuariosAmigos ul li[uid="' + uid + '"]').html();

    var ventana  = '<div class="ventana marco celeste" id="ventana-' + uid + '" uid="' + uid + '">';
        ventana += '    <span>'+ nombre + '</span>';
        ventana += '    <textarea cols="20" rows="7" readonly="true"></textarea>';
        ventana += '    <input type="text" class="chat-text" maxlength="20" />';
        ventana += '</div>';

    $('.chat').append(ventana);
  }
}
// se envia un mensaje en el chat
function enviarMensaje(uid, msg) {
  var data = { para   : uid,
               mensaje: msg,
               fecha  : new Date()
             };

  // emitimos el mensaje
  sockets.emit('enviarMensaje', data);
  // agregamos el mensaje al textarea
  $('#ventana-'+ uid +' textarea').val($('#ventana-'+ uid +' textarea').val() + 'yo: ' + msg + '\r\n');
  // limpiamos la caja de texto
  $('#ventana-'+ uid +' .chat-text').val('');    
}
// se muestra un mensaje recibido del chat
function mostrarMensajeRecibido(data){
  // si se recibe mensajes duplicados
  if (ultimaFechaMsg == data.fecha)
    return;
  else{
    // actualizamos la fecha del ultimo mensahe recibido
    ultimaFechaMsg = data.fecha;
    // si no existe la ventana la creamos
    if ($('#ventana-' + data.de).size() == 0)
        abrirVentanaChat(data.de);
    // agregamos la informacion del mensaje
    $('#ventana-' + data.de + ' span').html(data.nombre);
    $('#ventana-' + data.de + ' textarea').val($('#ventana-' + data.de + ' textarea').val() + data.nombre + ': ' + data.mensaje + '\r\n');
  }
}