//import libraries
//change
var express = require('express'); // Express web server framework
var request = require('request-promise'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const { fdatasync } = require('fs');

//credentials
var client_id = ''; //  client id
var client_secret = ''; // secret
var redirect_uri = 'http://localhost:8888/callback'; // redirect uri
var scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
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
  res.sendFile(__dirname + '/index.html'); //this means by default load index.html
});
app.get('/login', function(req, res) { 
  res.cookie(stateKey, state);

  // your application requests authorization
  // var scope = 'user-read-private user-read-email';
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
      method: 'POST',
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
      request(authOptions)
      .then(data => {
          var options = {
          url: 'https://api.spotify.com/v1/me',
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + data.access_token },
          json: true
        };
        request(options)
        .then (data2 => { 
          console.log(data2);
          res.cookie(`id`,`${data2.id}`)
          res.cookie(`access_token`,`${data.access_token}`)
          res.render(__dirname + '/callback.html',{access_token:data.access_token,refresh_token:data.refresh_token});
        })
        .catch (err => console.log("error getting user details"));
      })
      .catch(err => console.log("error getting access token"));
  }
});
app.post('/create_playlist', function(req, res){
  console.log(req.body.user.name); 
  var playlist_name = req.body.user.name; // name of playlist
  var user_id = req.cookies.id
  console.log(user_id)
  // var dataString = '';

  var ops = {
    url: `https://api.spotify.com/v1/users/${user_id}/playlists`,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + req.cookies.access_token,
      'Content-Type': 'application/json',
    },
    body: {
      'name': `${playlist_name}`,
      'public': false
  },
    json: true
  };
  request(ops)
  .then(data => {
    // console.log(data);
    res.cookie(`playlist_id`,`${data.id}`)
    res.render(__dirname + '/yt.html', {'name' : 'playlist name'});
  })
  .catch (err => {
    console.log(err);
    res.send("failed error git gud!");
  });
});

app.post('/searchyt',(req,res) => {
  var ytname = req.body.playlist.name;
  ytname = ytname.replace(/^https?:\/\//, '')
  var url = `https://728b-38-117-127-218.ngrok.io/playlistsearch/?url=${encodeURIComponent(ytname)}`;
  console.log(url)
  var ops = {
    url: url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    json: true
  };
  request(ops)
  .then(data=>{
    console.log("test:",req.cookies)
    var arr = data.lst;
    for (let i  = 0; i<arr.length; i++) {
      arr[i] = arr[i].replace(/ *\([^)]*\) */g, "");
    }
    // console.log(arr)
    //write the loop here with array arr
    var uris = ""
    for (let i = 0; i < arr.length; i++){
      var songname = arr[i];
      var songops = {
        url: `https://api.spotify.com/v1/search?q=${encodeURIComponent(songname)}&type=track`,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + req.cookies.access_token,
          'Content-Type': 'application/json',
        },
        json: true
      };
      request(songops)
      .then(data => {
        // console.log(data.tracks)
        var uri = data.tracks.items[0].uri
        console.log(uri)
        uris += uri
        if (i < arr.length-1) {
        uris += ','
        }
          var playlistid = req.cookies.playlist_id
          var addops = {
          url: `https://api.spotify.com/v1/playlists/${playlistid}/tracks?uris=${encodeURIComponent(uri)}`,
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + req.cookies.access_token,
            'Content-Type': 'application/json',
          },
          json: true
        };
        request(addops)
        .then(dt => {
          console.log("yay added the songs")
        })
        .catch(er => {
          console.log("failed to add the song to the playlist",er)
    })
      })
      .catch (err => {
        // console.log(songname)
        console.log("ERROR!",err)
      })
    }

    
  })
  .catch(err=>{
    console.log(err)
  })
})

console.log('Listening on 8888');
app.listen(8888);
