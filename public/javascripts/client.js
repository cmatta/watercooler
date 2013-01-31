;(function () {
  'use strict'

  // Wait for the DOM to load before taking action
  $(document).ready(function() {
    // Setup
    // -----
    //
    //
    // Variable to hold weather or not the window has focus.
    var window_focus;

    $(window).focus(function() {
      window_focus = true;
    })
    .blur(function() {
      window_focus = false;
    });

    // Create the chat connection object, as well as the references to our DOM 
    // handlers for input and recording output
    var chat = io.connect(chat_host + ':' + chat_port + '/chat')
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

    var User = Backbone.Model.extend({
      idAttribute: "_id"
    });

    var UserList = Backbone.Collection.extend({
      model: User
    });

    var UsersView = Backbone.View.extend({
      el: $('#users'),
      render: function(){
        var users = this.collection.toJSON();
        var template_html = $('#users-list-template').html();
        var template = Handlebars.compile(template_html);
        this.$el.html(template({users: users}));
        return this;
      }
    });
    // where do I initialize each message and append it to the 
    // #message-list element? 
    var ChatView = Backbone.View.extend({
      el: $('#message-list'),
      initialize : function() {
        var messages = this.collection.toJSON();
        _.each(messages, function(message){
          var message_view = new MessageView(message);
          this.render(message_view);
        });
      },
      render: function(message_view){
        console.log(message_view);
        this.$el.append(message_view.render);
        return this;
      }
    });

    var MessageView = Backbone.View.extend({
      render: function(){
        var message = this.message.toJSON();
        var template = Handlebars.compile($('#message-template').html()),
        return template({message: message});
      }
    });

    var Message = Backbone.Model.extend({
      initialize: function(){
        console.log(this);
        this.set('date_string', formatDateTime(this.get('datetime')));  
      }
    });

    var Chat = Backbone.Collection.extend({
      model: Message
    });

    var chats = new Chat;

    chats.comparator = function(message){
      return message.get("datetime");
    };

    // debug
    chats.on("add", function(message){
      console.log(message);
      console.log("Message: " + message.get('message'));
    });


    var user_list = new UserList;
    var user_view = new UsersView({collection: user_list});

    chat_view = new ChatView({collection: chats});
    
    // Event listeners
    chat_view.listenTo(chats, 'add', chat_view.render);
    chat_view.listenTo(chats, 'remove', chat_view.render);

    user_view.listenTo(user_list, 'add', user_view.render);
    user_view.listenTo(user_list, 'remove', user_view.render);

    // chat.io listeners
    // --------------------
    // 
    chat.on('connect_failed', function(reason){
      console.error('unable to connect to chat', reason);
    })
    .on('connected', function(user) {
      var this_user = new User(user);
      user_list.add(this_user);
      statusMessage("Connected: "+user.nickname);
    })
    .on('user message', function(message, user) {
      message.user = user
      chats.add(message);
    })
    .on('disconnected', function(user) {
      user_list.remove(user);
      statusMessage("Disconnected: "+user.nickname);
    })
    .on('reconnect', function(){
      var date = new Date();
      console.log("reconnected: "+date);
    })
    .on('load history', function(data){
      if(chats.length < data){
        chats.reset(data);
      }
    })
    .on('update users', function(connected_users){
      user_list.update(connected_users);
    });

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

      // check for HTML 5 notifications support
      if (webkitNotifications) {
        console.log("Notifications are supported!");
        if (webkitNotifications.checkPermission() == 1){
          $('#top-row>div:first').append('<button id="enable-notifications" class="btn btn-mini pull-right">Enable Notifications</button>')
        }
      } else {
        console.log("Notifications are not supported for this Browser/OS version yet.");
      }

      // Add listener to permission button
      $('#enable-notifications').click(function () {
          webkitNotifications.requestPermission(function(){
            console.log("...requesting permission for notifications.");
            if (webkitNotifications.checkPermission() == 0){
              $('#enable-notifications').remove();
            }
          });
      });

      function notify(){
        // Scroll to the bottom
        var scrollBottom = $('#messages').scrollTop() + $('#messages>ul').height();
        $("#messages>ul").waitForImages(function(){
          $("#messages").scrollTop(scrollBottom);
        });

        var user = this.message.get('user');
        $.titleAlert("New message...", {
              requireBlur:true,
              stopOnFocus:true,
              duration:10000,
              interval:800
          });

        if(window_focus === false){
          sendNotification(avatar, "New Message from "+nickname, msg);
        }
      }

      function sendNotification(image, title, message) {
        if (webkitNotifications.checkPermission() === 0){
          var notification = webkitNotifications.createNotification(image, title, message);
          notification.show();
        }
      }

  })
}).call(this);
