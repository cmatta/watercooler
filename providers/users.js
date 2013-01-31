var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

var UsersSchema = new Schema({
        "provider": {type: String, required: true },
        "provider_id": {type: String, required: true},
        "displayName": {type: String, requred: true},
        "username": {type: String, required: true},
        "profile_image_url":  {type: String },
        "nickname": {type: String},
        "location": {type: String},
        "join_date": {type: Date},
        "name" : {
            "familyName": {type: String},
            "givenName": {type: String},
            "middleName": {type: String}
        },
        "emails":[
            {
                "value": {type: String},
                "type": {type: String}
            }
        ]
    },
    {collection: 'Users'}
);

var Users = mongoose.model('Users', UsersSchema);

module.exports = {
  Users: Users,

  findUserByProfile: function(profile, callback){
    Users.findOne({"provider": profile.provider, "provider_id": profile.id}, function(err, foundUser){
      if(foundUser){
        console.log("User %s found.", foundUser.displayName);
        callback(null, foundUser);
      } else {
        callback(new Error("Couldn't find user."));
      }
    });
  },

  createUserWithProfile: function(profile, callback){
    var newUser = new Users();
    newUser.provider = profile.provider;
    newUser.provider_id = profile.id;
    newUser.displayName = profile.displayName;
    newUser.name = profile.name;
    newUser.emails = profile.emails;
    newUser.profile_image_url = profile._json.profile_image_url;
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
    module.exports.findUserByProfile(profile, function(err, foundUser){
      if(foundUser){
        // update the user's avatar
          if(foundUser.profile_image_url == undefined){
            console.log("Updating user Avatar.")
          foundUser.profile_image_url = profile._json.profile_image_url;
          foundUser.save;
        }
        callback(null, foundUser);
      } else {
        module.exports.createUserWithProfile(profile, function(err, createdUser){
          if(!err){
            callback(null, createdUser);
          } else {
            callback(err);
          }
          
        });
      }
    });
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