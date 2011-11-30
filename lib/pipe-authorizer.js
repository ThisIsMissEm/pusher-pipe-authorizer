var crypto = require('crypto');

/**
 * PipeAuthorizer
 *
 *    Attachs the relevant callbacks and such to the Pipe-Client 
 *    to handle doing authorization.
 *
 * @param {pipeClient} client
**/
function PipeAuthorizer(client, authCallback) {
  var self = this;

  this.client = client;
  this.authCallback = authCallback;

  client.subscribe('socket_message');
  client.sockets.on('event:pusher-auth-request', function(socket_id, request) {
    request.socket_id = socket_id;
    self.handleRequest(socket_id, request);
  });
};

PipeAuthorizer.prototype.handleRequest = function(socket_id, request) {
  var channel = request.channel, status, user_data;

  // 2. call the authCallback:
  var auth_data = this.authCallback(request.identity, channel, socket_id);

  // 3. check if authCallback returned false, this means we failed auth:
  if (auth_data === false) {
    this.sendResponse(request, 'failed', {reason: 'Endpoint failed authorization.'});
  } else {
    // 4. Check if auth_data was an object, and if so, that we had the user_id 
    // which is required for presence channels:
    if (typeof auth_data === 'object' && channel.substr(0, 9) === 'presence-' && typeof auth_data.user_id === 'undefined') {
      this.sendResponse(request, 'failed', {
        reason: 'Endpoint returned invalid auth_data object, was missing user_id, which is required for presence channels.'
      });
    } else {
      this.sendResponse(request, 'success', this.createAuthToken(channel, socket_id, auth_data));
    }
  }
};

PipeAuthorizer.prototype.sendResponse = function(request, status, data) {
  this.client.socket(request.socket_id).trigger('pusher-auth-response', {
    request_id: request.request_id,
    status: status,
    data: data
  });
};

PipeAuthorizer.prototype.createAuthToken = function(channel, socket_id, data) {
  var secret_key = this.client.secret,
      public_key = this.client.key,
      sig_data = [socket_id, channel],
      has_channel_data = (typeof data === 'object'),
      channel_data;

  if (has_channel_data) {
    channel_data = JSON.stringify(data);
    sig_data.push(channel_data);
  }

  var signature = crypto.createHmac('SHA256', secret_key)
    .update(sig_data.join(':'))
    .digest('hex');

  var response = {
    auth: public_key + ':' + signature
  };

  if (has_channel_data) {
    response['channel_data'] = channel_data;
  }

  return response;
};

module.exports = PipeAuthorizer;
