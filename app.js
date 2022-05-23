
//import libraries
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//credentials
var client_id = '7438696c99124ed09dad18d320af4408'; // Your client id
var client_secret = '97131d69252f41fbb077b277bb5d375d'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var scope = 'user-read-private user-read-email';
var username = ""

//cookie state
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';
var state = generateRandomString(16);

var app = express();
app.use(bodyParser.urlencoded({extend:true}));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(express.json());
var url = 'https://accounts.spotify.com/authorize';
url += '?response_type=token';
url += '&client_id=' + encodeURIComponent(client_id);
url += '&scope=' + encodeURIComponent(scope);
url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
url += '&state=' + encodeURIComponent(state);
console.log(url); //this url is for get authentication

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());
//parameter name: route,function

app.get('/',function(req,res) {
  res.sendFile('/Users/irenechoi/Desktop/spotify_new/index.html'); //this means by default load index.html
});
app.get('/login', function(req, res) { 
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) { //this means if our website.com/callback is called then execute the code below

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        // res.redirect('/callback.html#' +
        //   querystring.stringify({
        //     access_token: access_token,
        //     refresh_token: refresh_token
        //   }));
        res.render('/Users/irenechoi/Desktop/spotify_new/callback.html',{access_token:access_token,refresh_token:refresh_token});
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

// app.get('/refresh_token', function(req, res) {

//   // requesting access token from refresh token
//   var refresh_token = req.query.refresh_token;
//   var authOptions = {
//     url: 'https://accounts.spotify.com/api/token',
//     headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
//     form: {
//       grant_type: 'refresh_token',
//       refresh_token: refresh_token
//     },
//     json: true
//   };

//   request.post(authOptions, function(error, response, body) {
//     if (!error && response.statusCode === 200) {
//       var access_token = body.access_token;
//       res.send({
//         'access_token': access_token
//       });
//     }
//   });
// });
app.post('/create_playlist', function(request, response){
  console.log(request.body.user.name); 
  var playlist_name = request.body.user.name; // name of playlist

});

console.log('Listening on 8888');
app.listen(8888);
