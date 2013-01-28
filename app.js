
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , _ = require('underscore')
  , app = express()
  , mongoose = require('mongoose')
  , mongoStore = require('connect-mongo')(express)
  , passport = require('passport')
  , twitterStrategy = require('passport-twitter').Strategy
  , parseSignedCookie = require('connect').utils.parseSignedCookie
  , cookie = require('cookie')
  , server_port = 8888
  , chat_port = server_port
  , mongo_db_string = 'mongodb://127.0.0.1/'
  , mongo_db = 'watercooler'
  , host = '1306fifteen.dyndns.org'
  , users = require('./providers/users')
  , chat_messages = require('./providers/messages');

app.configure('development', function(){
  twitter_consumer_key = 'Q64dysI0Lmm8EFiNudZw';
  twitter_consumer_secret = 'J8fbyPfwIYVqoByZyI0n6Ht9EWts1nlhu53JB2FcY';
  twitter_callback_url = 'http://'+host+':'+server_port+'/auth/twitter/callback';
});

app.configure('production', function(){
  var fs = require('fs');
  var env = JSON.parse(fs.readFileSync('/home/dotcloud/environment.json', 'utf-8'));
  server_port = 8080;
  chat_port = 80;
  mongo_db_string = env['DOTCLOUD_DB_MONGODB_URL']+'/';
  host = env['DOTCLOUD_WWW_HTTP_HOST'];
  twitter_consumer_key = 'ceuQboT48EiYqCdGZ7ZKaw';
  twitter_consumer_secret = '2Ifgixahv8zeGthHV7rzro11msn5VH99ufFcMGpioA';
  twitter_callback_url = 'http://'+host+'/auth/twitter/callback';
});


var http = require('http')
, server = http.createServer(app)
, backboneio = require('backbone.io')
, io = require('socket.io').listen(server);

server.listen(server_port);
mongoose.connect(mongo_db_string + mongo_db);

var session_settings = {
  db: mongo_db,
  mongoose_connection: mongoose.connections[0],
  cookie_secret: 'hippiejohnny'
}

// passport middleware
passport.use(new twitterStrategy({
    consumerKey: twitter_consumer_key,
    consumerSecret: twitter_consumer_secret,
    callbackURL: twitter_callback_url
  },
  function(token, tokenSecret, profile, done){
    // Look for the user in the database
    users.findOrCreate(profile, function(err, user){
      if(user){
        done(null, user);
      } else {
        console.warn("Error finding or creating user: "+user);
        return done(err);
      }
      
    });
  }
));

passport.serializeUser(function(user, done) {
  console.log(user);
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  users.findById(id, function(err, user) {
    done(err, user);
  });
});

var sessionStore = new mongoStore(session_settings);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(session_settings.cookie_secret));
  app.use(express.session({
    cookie: {maxAge: 60000 * 60 * 24}, // 24 hours
    secret: session_settings.cookie_secret,
    key: 'express.sid',
    store: sessionStore
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));

});

// send the server port to the client.js via the index route
function setServerPort(req, res, next){
  if(!req.session.chat_port){
    req.session.chat_port = chat_port;
  }
  if(!req.session.chat_host){
    req.session.chat_host = host;
  }
  next();
}

app.get('/', setServerPort, routes.index);
app.get('/invites', routes.invites);

// Redirect the user to Twitter for authentication.  When complete, Twitter
// will redirect the user back to the application at
//   /auth/twitter/callback
app.get('/auth/twitter', passport.authenticate('twitter'));

// Twitter will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { successRedirect: '/' }));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// Configure socket.io authorization settings for 'chat' namespace
io.configure(function(){
  io.of('/chat').authorization(function(data, accept){
    if(data.headers.cookie){
      data.cookie = cookie.parse(data.headers.cookie);
      data.sessionId = parseSignedCookie(data.cookie['express.sid'], session_settings.cookie_secret);
      sessionStore.get(data.sessionId, function(err, session){
        if(!session){
          console.info("Sorry, couldn't find this session in the session store.");
          accept('No session', false);
        } else if(err){
          console.warn(err);
          accept('Error: '+err, false);
        } else {
          console.info("Session found in session store");
          data.session = session;
          accept(null, true);
        }
      });
    } else {
      return accept('No Cookie transmitted', false);
    }
  });
});
io.set('log level', 1);
var chat = io.of('/chat');
var connected_users = [];

chat.on('connection', function(socket){
  var hs = socket.handshake;
  var user_id = hs.session.passport.user;

  users.findById(user_id, function(err, user){
    if(err){
      console.error("User not found with object id %s", hs.session.passport.user);
      socket.set('user_name', socket.id);
    } else{
      var nickname;
      // Split the name into first name last initial. Seems friendlier.
      if(user.displayName.match('\s')){
        var names = user.displayName.split(' ');
        nickname = names[0]+' '+names[1].split('')[0]+'.';
      } else {
        nickname = user.displayName;
      }

      if(_.isUndefined(user.nickname)){
        user.nickname = nickname;
        user.save(function(err){
          if(!err){
            console.log("Updated nickname for "+ user.displayName);
          } else {
            console.warn(err);
          }

        });
      }

      socket.set('user_info', user, function(){ socket.emit('ready'); });
    }

    connected_users.push(user);
    // Send the username and user list
    socket.broadcast.emit('connected', user);
    chat.emit('update users', connected_users);
    // now get the message history
    chat_messages.getHistory(function(err, history){
      if(!err){
        var reversed_history = history.sort(function(a, b){ return a.datetime - b.datetime});
        socket.emit('load history', reversed_history);
        
      } else {
        callback(err);
      }
    });
  });

  // message sent
  socket.on('user message', function(data){
    socket.get('user_info', function(err, user){
      chat_messages.parser(data, function(message){
        chat_messages.save(user._id, message, null, function(err, saved_message){
          chat.emit('user message', saved_message, user);
        });
         
      });
    });
  });
  // Someone has disconnected
  socket.on('disconnect', function() {
    // get their username and remove it from the connected_users
    socket.get('user_info', function(err, user){
      var user_index = connected_users.indexOf(user);
      if(user_index !== -1){
        connected_users.splice(user_index, 1);
      }
      socket.broadcast.emit('disconnected', user);
      chat.emit('update users', connected_users);
      // socket.broadcast.emit('update users', connected_users);
    });
  });
  // emit reconnect message to any reconnecting client
  socket.on('reconnect', function() {
    chat.emit('reconnect');
  })
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + server.address().port);
});
