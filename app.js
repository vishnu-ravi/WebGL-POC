var express     =   require('express'), path = require('path');
var expressHbs  =   require('express3-handlebars');

var app         =   express();
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.engine('hbs', expressHbs({extname:'hbs'}));
app.set('view engine', 'hbs');

app.route('/').get(function (req, res)
{
    res.render('index');
})

var port    =   process.env.PORT || 3000;
var server = app.listen(port);
console.log('listening on', port, process.env.PORT);
