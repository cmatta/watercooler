
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , _ = require('underscore');

var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , mongoose = require('mongoose')
  , mongoStore = require('connect-mongo')(express)
  , passport = require('passport')
  , twitterStrategy = require('passport-twitter').Strategy
  , Users = require('./models/Users').Users
  , parseSignedCookie = require('connect').utils.parseSignedCookie
  , cookie = require('cookie');

server.listen(8888);
mongoose.connect('127.0.0.1', 'watercooler');

var session_settings = {
  db: 'watercooler',
  mongoose_connection: mongoose.connections[0],
  cookie_secret: 'hippiejohnny'
}

passport.use(new twitterStrategy({
    consumerKey: 'ceuQboT48EiYqCdGZ7ZKaw',
    consumerSecret: '2Ifgixahv8zeGthHV7rzro11msn5VH99ufFcMGpioA',
    callbackURL: "http://127.0.0.1:8888/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done){

    Users.findOne({"provider": profile.provider, "provider_id": profile.id}, function(err, foundUser){
      if(foundUser){
        console.log("User %s found.", foundUser.displayName);
        done(null, foundUser);
      } else {
        console.log("Profile:");
        console.log(profile);
        var newUser = new Users();
        newUser.provider = profile.provider;
        newUser.provider_id = profile.id;
        newUser.displayName = profile.displayName;
        newUser.name = profile.name;
        newUser.emails = profile.emails;

        newUser.save(function(err){
          if(err){ return done(err);}

          console.log("New user %s created", newUser.displayName);
          done(null, newUser);
        });
      }
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  Users.findById(id, function(err, user) {
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
  // io.set('authorization', function(data, accept){
  //   data.cookie = cookie.parse(data.headers.cookie);
  //   data.sessionId = parseSignedCookie(data.cookie['express.sid'].split('.')[0], session_settings.cookie_secret);
  //   sessionStore.get(data.sessionId, function(err, session){
  //     if(err || !session){
  //       accept(err, false);
  //     } else {
  //       data.session = session;
  //       accept(null, true);
  //     }
  //   });
  // });

  io.of('/chat').authorization(function(data, accept){
    data.cookie = cookie.parse(data.headers.cookie);
    data.sessionId = parseSignedCookie(data.cookie['express.sid'], session_settings.cookie_secret);
    sessionStore.get(data.sessionId, function(err, session){
      if(!session){
        accept('No session', false);
      } else if(err){
        accept('Error: '+err, false);
      } else {
        data.session = session;
        accept(null, true);
      }
    });
  });
});

var chat = io.of('/chat');

chat.on('connection', function(socket){
  var hs = socket.handshake;
  Users.findById(hs.session.passport.user, function(err, user){
    if(err){
      console.error("User not found with object id %s", hs.session.passport.user);
      hs.user_name = socket.id;
    } else{
      hs.user_name = user.displayName;
    }
    // someone connected
    socket.broadcast.emit('connected', hs.user_name);
  });

  // message sent
  socket.on('user message', function(data){
    socket.broadcast.emit('user message', {
      id: hs.user_name,
      msg: data
    });
  })
  // Someone has disconnected
  socket.on('disconnect', function() {
    socket.broadcast.emit('disconnected', hs.user_name)
  });
});


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + server.address().port);
});
