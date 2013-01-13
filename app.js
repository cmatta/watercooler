
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , mongoose = require('mongoose')
  , mongoStore = require('connect-mongo')(express);

server.listen(8888);
mongoose.connect('localhost', 'watercooler');

var session_settings = {
  db: 'watercooler',
  mongoose_connection: mongoose.connections[0],
  cookie_secret: 'hippiejohnny'
}

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('hippiejohnny'));
  app.use(express.session({
    cookie: {maxAge: 60000 * 20}, // 20 minutes
    secret: session_settings.secret,
    key: 'express.sid',
    store: new mongoStore(session_settings)
  }));
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

io.of('/chat').on('connection', function(socket){
  // someone connected
  socket.broadcast.emit('connected', socket.id);

  // message sent
  socket.on('message', function(data){
    socket.broadcast.emit('message', {
      id: socket.id,
      msg: data
    });
  });

  // Someone has disconnected
  socket.on('disconnect', function() {
    io.sockets.emit('disconnected', socket.id)
  })
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + server.address().port);
});
