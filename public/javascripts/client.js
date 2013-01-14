// Client side support
// -------------------

// This file contains all of the relevant client side code to communicate through 
// `chat.io` to the server, and in turn all other connected clients

;(function() {
'use strict'

// Wait for the DOM to load before taking action
$(function() {
  // Setup
  // -----
  
  // Create the chat connection object, as well as the references to our DOM 
  // handlers for input and recording output
  var chat = io.connect('http://127.0.0.1:8888/chat')
    , $messages = $('#messages')
    , $input = $('#msg')
    , $button = $('#submit')
    , user_name = $('#user_name').text();
  
  //###send
  // Send the input value to the server, recording our own message since `chat.io` 
  // wont re-broadcast the message back to the client who sent it. Clear the input
  // field out when we are finished so it is ready to send another
  function send() {
    var msg = $input.val().trim()
    if (msg) {
      chat.emit('user message', msg);
      console.log(chat.socket.handshake.user_name);
      $messages.append('<li><span><b>' + user_name + '</b></span> ' + msg + '</li>')
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
  })
  .on('connected', function(id) {
    $messages.append('<li class="status"><span>Connected</span> ' + id + '</li>')
  })
  .on('user message', function(data) {
    $messages.append('<li><span>' + data.id + '</span> ' + data.msg + '</li>')
  })
  .on('disconnected', function(id) {
    $messages.append('<li class="status"><span>Disconnected</span> ' + id + '</li>')
  });
  
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
  $("#msg-send").click(send)
})

}).call(this);
