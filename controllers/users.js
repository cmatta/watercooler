var Users = require("../models/Users").Users;

module.exports = {

  findUser: function(profile, callback){
    Users.findOne({"provider": profile.provider, "provider_id": profile.id}, function(err, foundUser){
      if(foundUser){
        console.log("User %s found.", foundUser.displayName);
        callback(null, foundUser);
      } else {
        callback(new Error("Couldn't find user."));
      }
    });
  },

  createUser: function(profile, callback){
    var newUser = new Users();
    newUser.provider = profile.provider;
    newUser.provider_id = profile.id;
    newUser.displayName = profile.displayName;
    newUser.name = profile.name;
    newUser.emails = profile.emails;
    newUser.user_images = profile.photos;
    newUser.username = profile.username;
    newUser.join_date = new Date();
    newUser.location = profile._json.location;

    newUser.save(function(err){
      if(err){ 
        callback(err);
      } else {
        console.log("New user %s created", newUser.displayName);
        callback(null, newUser);
      }
    });

  },

  findOrCreate: function(profile, callback){
    module.exports.findUser(profile, function(err, foundUser){
      if(foundUser){
        callback(null, foundUser);
      } else {
        module.exports.createUser(profile, function(err, createdUser){
          if(!err){
            callback(null, createdUser);
          } else {
            callback(err);
          }
          
        })
      }
    })
  },

  findById: function(id, callback){
    Users.findById(id, function(err, user){
      if(!err){
        callback(null, user);
      } else {
        callback(err);
      }
    })
  }
}