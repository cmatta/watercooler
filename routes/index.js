/*
 * GET home page.
 */

exports.index = function(req, res){
  if(req.user){
    res.render('index', { title: 'Watercooler Chat',
                          user: req.user });
  } else {
    res.render('login', { title: 'Log in' });
  }
  
};