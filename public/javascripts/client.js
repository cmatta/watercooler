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
      statusMessage("Connected: "+user_name);
    })
    .on('user message', function(data) {
      postMessage(data.msg, data.nickname, data.username, data.avatar, data.datetime);
      $("#messages").scrollTop($("#messages")[0].scrollHeight);
    })
    .on('disconnected', function(user_name) {
      statusMessage("Disconnected: "+user_name);
    })
    .on('reconnect', function(){
      var date = new Date();
      console.log("reconnected: "+date);
      $messages.html('');      
    })
    .on('load history', function(data){
      postMessage(data.msg, data.nickname, data.username, data.avatar, data.datetime);
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

    function statusMessage(message){
      var datetime = new Date();
      var date_time = formatDateTime(datetime);
      var status_message = '<li class="status"> \
                              <div class="post"> \
                                <p class="post-body">' + message + ' - ' + date_time+'</p> \
                              </div> \
                            </li>';
      $messages.append(status_message);
      $("#messages").scrollTop($("#messages")[0].scrollHeight);
    }

    function postMessage(msg, nickname, username, avatar, datetime){
        var date_string = formatDateTime(datetime);
        var last_message = $('#messages>ul>li:last');
        var last_message_user = $(last_message).find('.twitter-user').text().replace(/ /g, '').replace(/@/, '');
        
        if (!$(last_message).hasClass('status') && last_message_user === username){
          $('#messages>ul>li:last>div.post').append('<p class="post-body"><small class="post-time">' + date_string + '</small>' + msg + '</p>');
        } else {
          // set alternating backgrounds
          var even_odd = "even";
          var last_li = $('#messages>ul>li:last');
          
          if ($(last_message).hasClass('even')){
            even_odd = "odd";
          }
          

          var message_html = '<li class="message ' + even_odd + '"> \
                              <div class="post"> \
                                <div class="item-header"> \
                                  <a class="account-group" href="/users/' + username +'"> \
                                  <img class="avatar" src="' + avatar + '" alt="' + username + '"> \
                                  <strong class="fullname">' + nickname + '</strong> \
                                  </a> \
                                  <a class="twitter-user" href="http://twitter.com/#!/' + username + '">\
                                  <span class="username" target="_blank">@' + username + '</span> </a> \
                                </div> \
                                <p class="post-body"><small class="post-time">' + date_string + '</small> \
                                ' + msg +'</p> \
                              </div> \
                            </li>';

          $messages.append(message_html);
        }

        var scrollBottom = $('#messages').scrollTop() + $('#messages').height();
        $("#messages").scrollTop(scrollBottom);
    }


    function formatDateTime(datetime){
      var dt = new Date(datetime);
      var hh = dt.getHours();
      var mm = dt.getMinutes();
      var ampm = "am";

      if(hh > 12) { hh = hh - 12; ampm = "pm"; };
      
      if(hh < 10) { hh = "0"+hh};
      if(mm < 10) { mm = "0"+mm};
      return hh + ":" + mm + " " + ampm;
    }

    // Drag and drop code.
    $('body')
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

          if(_.contains(dt.types, "text/plain")){
            chat.emit('user message', dt.getData("text/plain"));
          } else if(_.contains(dt.types, "text/uri-list")){
            chat.emit('user message', dt.getData("text/uri-list"));
          }
          
          return false;
      });

  })
}).call(this);
