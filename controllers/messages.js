var Message = require("../models/Message").Message
  , Users = require("../models/Users").Users;

// Message parsing code
module.exports = {

  save: function(user_id, message, room, callback){
    Users.findById(user_id, function(err, user){
      if(!err){
        new_message = new Message();
        new_message.user = user._id;
        new_message.message = message;
        new_message.datetime = new Date();
        new_message.save(function(err){
          if(err){
            callback(err);
          } else {
            callback(null, message);
          }
        });
      } else {
        callback(err);
      }
    })
    
  },

  getHistory: function(callback){
    var time = new Date();
    time.setTime(time.getTime()-(1000*60*60*3)) // look back 3 hours
    Message.find().where('datetime').gt(time).sort('datetime').populate('user').exec(function(err, messages){
      if(!err){
        
        callback(null, messages);
      } else {
        callback(err);
      }
    });
  },

  parser: function(msg, callback){
    parseMessage(msg, function(message){
      callback(message);
    });
  }
}

var parseMessage = function(message, callback){
  if(isImage(message)){
    var return_message = '<a class="message-image" href="'+message+'" target="_blank"><img src="'+message+'"></a>';
    callback(return_message);
  } else {
    callback(message);
  }
}

var isImage = function(message) {
  var img_regexp = new RegExp('\.jpg$|\.jpeg$|\.png$|\.gif$', 'i');
    if(img_regexp.test(message)){
      console.log("message contains a picture");
      return true;
    } else {
      return false;
    }
}