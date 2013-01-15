;(function() {
'use strict'

// Wait for the DOM to load before taking action
$(document).ready(function() {
  // Setup
  // -----
  
  // Create the chat connection object, as well as the references to our DOM 
  // handlers for input and recording output
  var chat = io.connect('http://127.0.0.1:8888/chat')
    , $messages = $('#messages>ul')
    , $input = $('#msg')
    , $button = $('#submit')
    , $userlist = $('#userlist')
    , user_name = $('#user_name').text();
  
  //###send
  // Send the input value to the server, recording our own message since `chat.io` 
  // wont re-broadcast the message back to the client who sent it. Clear the input
  // field out when we are finished so it is ready to send another
  function send() {
    var msg = $input.val().trim()
    if (msg) {
      chat.emit('user message', msg);
      parseMessage(msg, function(message){
        $messages.append('<li><span>Me</span> ' + message + '</li>');
      });
      
    }
    $input.val('')
  }

  // chat.io listeners
  // --------------------
  
  //###message
  // A new message has been received, the data comes through as a JSON object with 
  // two attributes, an `id` of the client who sent the message, as well as a `msg` 
  // with the actual text of the message, add it to the DOM message container
  chat.on('connect_failed', function(reason){
    console.error('unable to connect to chat', reason);
  }).on('connected', function(user_name) {
    $messages.append('<li class="status"><span>Connected</span> ' + user_name + '</li>');
    updateUserList();
  })
  .on('user message', function(data) {
    parseMessage(data.msg, function(message){
      $messages.append('<li><span>' + data.id + '</span> ' + message + '</li>')
    });
    
  })
  .on('disconnected', function(user_name) {
    $messages.append('<li class="status"><span>Disconnected</span> ' + user_name + '</li>');
    updateUserList();
  });

  function updateUserList(){
    $.get("/connected_users", function(connected_users){
      if(!connected_users){
        console.log("Failed to get user list");
        return false;
      }
      console.log(connected_users);
      var user_list = "<small>Who's Here</small><ul>";
      _.each(connected_users, function(user){
        user_list += "<li>"+user+"</li>";
      });
      user_list += "</ul>";
    
      $userlist.html(user_list);
      return false;
    });
  }

  // User interaction
  // ----------------
  
  //###keypress listener
  // Create a keystroke listener on the input element, since we are not sending a 
  // traditional form, it would be nice to send the message when we hit `enter`
  $input.keypress(function(event) {
    if (event.which == 13) {
      send()
    }
  })
  
  //###click listener
  // Listen to a `click` event on the submit button to the message through
  $("#msg-send").click(send);

  function parseMessage(message, callback){
    var img_regexp = new RegExp('\.jpg$|\.jpeg$|\.png$|\.gif$', 'i');
    if(img_regexp.test(message)){
      var return_message = '<a class="message-image" href="'+message+'" target="_blank"><img src="'+message+'"></a>';
      callback(return_message);
    } else{
      callback(message);
    }
  }
})

}).call(this);
