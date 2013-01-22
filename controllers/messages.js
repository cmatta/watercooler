var Message = require("../models/Message").Message,
  Users = require("../models/Users").Users,
  check = require("validator").check,
  URI = require("URIjs"),
  https = require('https');

// return the video's real URL and high quality thumb
var getYoutubeInfo = function (url, callback) {
  var url_object = new URI(url);
  var yt = url_object.search(true);
  var video_id = yt.v;
  var yt_url = 'https://gdata.youtube.com/feeds/api/videos/' + video_id + '?v=2&alt=jsonc';
  var return_url;

  // connect to the YouTube api and get the information
  https.get(yt_url, function (res) {
    var body = '';

    res.on('data', function (chunk) {
      body += chunk;
    });

    res.on('end', function () {
      var yt_response = JSON.parse(body);
      return_url = '<img class="youtube-thumb" src="' + yt_response.data.thumbnail.hqDefault + '"><a class="yt-video" href="' + yt_response.data.player.default + '" target="_blank"></a>';
      callback(null, return_url);
    });
  }).on('error', function (e) {
    console.warn("Couldn't get youtube video information: " + e.message);
    callback(e);
  });
};

var isImage = function (message) {
  var img_regexp = new RegExp('jpg$|jpeg$|png$|gif$', 'i');
  var result;
  if (img_regexp.test(message)) {
    console.log("message contains a picture");
    result = true;
  } else {
    result = false;
  }

  return result;
};

var getVideoMessage = function (url, callback) {
  var url_object = new URI(url);
  var youtube = new RegExp('youtube', 'i');
  var vimeo = new RegExp('vimeo', 'i');

  if (youtube.test(url_object.domain())) {
    getYoutubeInfo(url_object.toString(), function (err, yt_url) {
      if (!err) {
        callback(null, yt_url);
      } else {
        callback(err);
      }
    });
  }
};

var isVideo = function (message) {
  var url = new URI(message);
  var youtube = new RegExp('youtube', 'i');
  var vimeo = new RegExp('vimeo', 'i');
  var result = false;

  if (youtube.test(url.domain())) {
    result = true;
  }

  return result;
};


var parseMessage = function (message, callback) {
  try {
    check(message).isUrl();
    var return_message = '';
    if (isImage(message)) {
      return_message = '<a class="message-image" href="' + message + '" target="_blank"><img src="' + message + '"></a>';
      callback(return_message);
    } else if (isVideo(message)) {
      getVideoMessage(message, function (err, video_url) {
        callback(video_url);
      });
    } else {
      return_message = '<a href="' + message + '" target="_blank">' + message + '</a>';
      callback(return_message);
    }
  } catch (e) {
    callback(message);
  }
};

// Message parsing code
module.exports = {

  save: function (user_id, message, room, callback) {
    Users.findById(user_id, function (err, user) {
      if (!err) {
        var new_message = new Message();
        new_message.user = user._id;
        new_message.message = message;
        new_message.datetime = new Date();
        new_message.save(function (err, saved_message) {
          if (err) {
            callback(err);
          } else {
            callback(null, saved_message);
          }
        });
      } else {
        console.warn("Couldn't find user with id: "+user_id);
        callback(err);
      }
    });
  },

  getHistory: function (callback) {
    // get the last 50 messages from today
    var messages_back = 50;
    // var time = new Date();
    // time.setUTCHours(0);
    // time.setUTCMinutes(0);
    // time.setUTCSeconds(0);
    Message.find().limit(messages_back).sort('-datetime').populate('user').exec(function (err, messages) {
      if (!err) {
        callback(null, messages);
      } else {
        callback(err);
      }
    });
  },

  parser: function (msg, callback) {
    parseMessage(msg, function (message) {
      callback(message);
    });
  }
};
