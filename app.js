var express = require('express');
var app = express();
// The required modules
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var mysql = require('mysql');

// the passport require stuff
var passport = require('passport');
var passportLocal = require('passport-local');

var port = process.env.PORT || 3000;
// use the required modules
// I guess we need to define if the cookie is in the url or in the header
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// The secret is to digitally sign the cookie
app.use(expressSession({
    secret: process.env.PROCESS_SECRET || 'bobzuidema',
    resave: false,
    saveUninitialized: false
}));

// Let express know we want to use passport
app.use(passport.initialize());
app.use(passport.session());

// must tell passport to use the local strategy
passport.use(new passportLocal.Strategy(function (username, password, done) {
    // Here is where we handle the actual login
    // Might have to get the pwd from the database
    var usrName = '';
    var pwd = '';

    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'admin'
    });

    connection.connect();

    connection.query('SELECT customerid, encryptedPassword FROM myetrade.customer where customerid=' + '\'' + username + '\'', function (err, rows) {
        if (err) throw err;
        try {
            console.log('The result is: ', rows);
            usrName = rows[0].customerid;
            pwd = rows[0].encryptedPassword;
            console.log('The result is: ', usrName, ' ', pwd);
            if (password === pwd) {
                done(null, { id: username });
            } else {
                done(null, false, { message: 'Unable to login' });
            }
        } catch (error) {
            done(null, false, { message: 'Unable to login' });
        }
    });
    // returns ... [ RowDataPacket { person_id: 1, firstname: 'Bob', lastname: 'Zuidema' }, RowDataPacket { person_id: 2, firstname: 'Eric', lastname: 'Zuidema' } ]
    connection.end();

}));

// Must tell the session how to serialize the object in session
passport.serializeUser(function (user, done) {
    done(null, user.id);
});
passport.deserializeUser(function (id, done) {
    //  Query the database and build an object back
    done(null, { id: id });
});

app.set('views', './views'); // sets the location to look for files in the views folder

app.set('view engine', 'ejs'); // 'ejs' is the file extension 

app.use('/assets', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    console.log('Request URL: ', req.url);
    res.render('index', {
        isAuthenticated: req.isAuthenticated(),
        user: req.user
    });
});

app.get('/register', function (req, res) {

    res.render('register');

});

app.get('/login', function (req, res) {
    res.render('login', { message: 'Please login' });
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});


// app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),
//     function (req, res) {
//         console.log('In login post method');
//         res.redirect('/');
//     });

app.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            // *** Display message without using flash option
            // re-render the login form with a message
            return res.render('login', { message: info.message })
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }
            return res.redirect('/');
        });
    })(req, res, next);
});

app.listen(port, function () {
    console.log('Listening for localhost port: ', port);
});