;(function () {
  'use strict'

  // Wait for the DOM to load before taking action
  $(document).ready(function() {
    // Setup
    // -----
    
    // Create the chat connection object, as well as the references to our DOM 
    // handlers for input and recording output
    var chat = io.connect('http://1306fifteen.dyndns.org:8888/chat')
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
      }
      $input.val('')
    }

    // chat.io listeners
    // --------------------
    
    // 
    chat.on('connect_failed', function(reason){
      console.error('unable to connect to chat', reason);
    })
    .on('connected', function(user_name) {
      $messages.append('<li class="status"><span>Connected</span> ' + user_name + '</li>');
    })
    .on('user message', function(data) {
      postMessage(data.msg, data.id);
    })
    .on('disconnected', function(user_name) {
      $messages.append('<li class="status"><span>Disconnected</span> ' + user_name + '</li>');
    })
    .on('reconnect', function(){
      var date = new Date();
      console.log("reconnected: "+date);
      $messages.html('');      
    })
    .on('load history', function(data){
      postMessage(data.msg, data.id);
    })
    .on('update users', function(connected_users){
      updateUserList(connected_users);
    });

    function updateUserList(connected_users){
      console.log(connected_users);
      var user_list = "<small>Who's Here</small><ul>";
      for(var user_id in connected_users){
        console.log(connected_users[user_id]);
        user_list += "<li>"+connected_users[user_id]+"</li>";
      }
      user_list += "</ul>";
    
      $userlist.html(user_list);
      return false;
    }

    // User interaction
    // ----------------
    
    //###keypress listener
    // Create a keystroke listener on the input element, since we are not sending a 
    // traditional form, it would be nice to send the message when we hit `enter`
    $input.keypress(function(event) {
      if (event.which == 13) {
        send();
      }
    });
    
    //###click listener
    // Listen to a `click` event on the submit button to the message through
    $("#msg-send").click(send);

    function postMessage(msg, user){
        $messages.append('<li class="message"> \
                            <div class="post"> \
                              <div class="user"> \
                              <span class="username">'+user+'</span> \
                              <div class="post-body">'+msg+'</div> \
                              </div> \
                            </div> \
                          </li>');
        $("#messages").scrollTop($("#messages")[0].scrollHeight);
    }


    // Drag and drop code.
    $('#messages, #msg')
      .bind('dragenter', function(ev) {
          return false;
      })
      .bind('dragleave', function(ev) {
          return false;
      })
      .bind('dragover', function(ev) {
          return false;
      })
      // Handle the drop...
      .bind('drop', function(ev) {
          var dt = ev.originalEvent.dataTransfer;
          chat.emit('user message', dt.getData("text/uri-list"));
          return false;
      });

  })
}).call(this);
