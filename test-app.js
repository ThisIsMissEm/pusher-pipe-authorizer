var pipe = require('pusher-pipe');
var Authorizer = require('./lib/pipe-authorizer');

var Config = require('./config');

var client = pipe.createClient({
  app_id: Config.app_id,
  key: Config.key,
  secret: Config.secret,
  debug: true
});

new Authorizer(client, function(identity, channel, socket_id) {
  if (identity === 'john' && channel === 'private-channel') {
    return true;
  }
  
  return false;
});

client.connect();