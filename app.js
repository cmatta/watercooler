
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
  , URI = require('URIjs')
  , parseSignedCookie = require('connect').utils.parseSignedCookie
  , cookie = require('cookie')
  , server_port = 8888
  , mongo_db_string = 'mongodb://127.0.0.1/'
  , mongo_db = 'watercooler'
  , host = '1306fifteen.dyndns.org';

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
var connected_users = [];

chat.on('connection', function(socket){
  var hs = socket.handshake;

  Users.findById(hs.session.passport.user, function(err, user){
    if(err){
      console.error("User not found with object id %s", hs.session.passport.user);
      socket.set('user_name', socket.id);
    } else{
      // Split the name into first name last initial. Seems friendlier.
      var names = user.displayName.split(' ');
      var nickname = names[0]+' '+names[1].split('')[0]+'.';
      socket.set('user_name', nickname, function(){ socket.emit('ready'); });
    }

    socket.get('user_name', function(err, user_name){
      connected_users.push(user_name);
      // Send the username and user list
      socket.broadcast.emit('connected', user_name);
      // socket.broadcast.emit('update users', connected_users);
    });
    
    
  });
  // message sent
  socket.on('user message', function(data){
    socket.get('user_name', function(err, user_name){
      socket.broadcast.emit('user message', {id: user_name, msg: data});
    });
  });
  // Someone has disconnected
  socket.on('disconnect', function() {
    // get their username and remove it from the connected_users
    socket.get('user_name', function(err, user_name){
      connected_users.splice(connected_users.indexOf(user_name), 1);
      socket.broadcast.emit('disconnected', user_name);
      // socket.broadcast.emit('update users', connected_users);
    });
  });
});

app.get('/', routes.index);
app.get('/connected_users', function(req, res){
  if(req.isAuthenticated){
    console.log("User list requested...");
    res.send(connected_users);
  } else {
    res.send("Error 401");
  }
  
})

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + server.address().port);
});
