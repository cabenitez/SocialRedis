
// definicion de modulos
var express   = require('express')
  , routes    = require('./routes')
  , user      = require('./routes/user')
  , http      = require('http')
  , path      = require('path')
  , redis     = require('redis')
  , crypto    = require('crypto')
  , ssio      = require('session.socket.io');

// inicializacion de variables
var app            = express()
  , server         = http.createServer(app)
  , io             = require('socket.io').listen(server)
  , sessionStore   = new express.session.MemoryStore()
  , cookieParser   = express.cookieParser('!@#$%^&*()1234567890qwerty')
  , sessionIO      = new ssio(io, sessionStore, cookieParser);;

// configuraciones para todos los entornos
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// middlewares de Express
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(cookieParser); 
app.use(express.session({ store: sessionStore }));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// configuraciones para el entorno de desarrollo
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// definicion de variables globales
global.usrEnLinea = [];
global.titulo     = 'Social Redis';
global.autor      = 'Carlos Alberto Benitez [2013]';
global.db         = redis.createClient(6379, 'localhost');
global.io         = io;
global.sessionIO  = sessionIO;
global.crypto     = crypto;

// GET - definicion de las rutas
app.get('/', routes.index);
app.get('/getPosts', user.getPosts);
app.get('/salir', user.logout);

// POST - definicion de las rutas
app.post('/registro', user.registro);
app.post('/login', user.login);
app.post('/setPost', user.setPost);
app.post('/setSolicitud', user.setSolicitud);
app.post('/setRespuestaSolicitud', user.setRespuestaSolicitud);

// listen
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});