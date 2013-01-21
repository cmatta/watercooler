
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , _ = require('underscore')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , mongoose = require('mongoose')
  , mongoStore = require('connect-mongo')(express)
  , passport = require('passport')
  , twitterStrategy = require('passport-twitter').Strategy
  , parseSignedCookie = require('connect').utils.parseSignedCookie
  , cookie = require('cookie')
  , server_port = 8888
  , mongo_db_string = 'mongodb://127.0.0.1/'
  , mongo_db = 'watercooler'
  , host = '1306fifteen.dyndns.org'
  , users = require('./controllers/users')
  , chat_messages = require('./controllers/messages');

app.configure('production', function(){
  server_port = 80
  , host = 'watercooler-chat.herokuapp.com'
  , mongo_db_string = 'mongodb://watercooler:sh4rp13@ds047447.mongolab.com:47447/'
  , mongo_db = 'heroku_app10937405'
});

server.listen(server_port);
mongoose.connect(mongo_db_string+mongo_db);

var session_settings = {
  db: 'watercooler',
  mongoose_connection: mongoose.connections[0],
  cookie_secret: 'hippiejohnny'
}

// passport middleware
passport.use(new twitterStrategy({
    consumerKey: 'ceuQboT48EiYqCdGZ7ZKaw',
    consumerSecret: '2Ifgixahv8zeGthHV7rzro11msn5VH99ufFcMGpioA',
    callbackURL: "http://"+host+":"+server_port+"/auth/twitter/callback"
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


app.configure('development', function(){
  app.use(express.errorHandler());
});
app.get('/', routes.index);
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
  });
});
io.set('log level', 1);
var chat = io.of('/chat');
var connected_users = {};

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

    connected_users[user_id] = user.nickname;
    // Send the username and user list
    socket.broadcast.emit('connected', user.nickname);
    chat.emit('update users', connected_users);
    // now get the message history
    chat_messages.getHistory(function(err, history){
      if(!err){
        _.each(history, function(message){
          socket.emit('load history', {nickname: message.user.nickname, 
                                      username: message.user.username,
                                      msg: message.message, 
                                      datetime: message.datetime,
                                      avatar: message.user.user_images[0].value });
        });
      } else {
        callback(err);
      }
    });
  });

  // message sent
  socket.on('user message', function(data){
    socket.get('user_info', function(err, user){
      chat_messages.parser(data, function(message){
        chat_messages.save(user_id, message, null, function(err, saved_message){
          chat.emit('user message', {nickname: user.nickname,
                                    username: user.username, 
                                    msg: saved_message.message,
                                    datetime: saved_message.datetime,
                                    avatar: user.user_images[0].value
                                    });
        });
         
      });
    });
  });
  // Someone has disconnected
  socket.on('disconnect', function() {
    // get their username and remove it from the connected_users
    socket.get('user_info', function(err, user){
      delete connected_users[user.nickname];
      socket.broadcast.emit('disconnected', user.nickname);
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
