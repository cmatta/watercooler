/*
 * GET home page.
 */

exports.index = function(req, res){
  if(req.user){
    res.render('index', { title: 'Watercooler Chat',
                          user: req.user ,
                          chat_host: req.session.chat_host,
                          chat_port: req.session.chat_port });
  } else {
    res.render('login', { title: 'Log in' });
  }
  
};