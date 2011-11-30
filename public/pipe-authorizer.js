;(function(global) {
  var Pusher = global.Pusher;
  
  
  /*-----------------------------------------------
    UUID function:
    - Taken from: http://www.broofa.com/Tools/Math.uuid.js
  -----------------------------------------------*/

  var CHARS = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
    'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
    'y', 'z'
  ];
  
  function UUID() {
    var chars = CHARS, uuid = new Array(36), rnd=0, r;
    for (var i = 0; i < 36; i++) {
      if (i == 8 || i == 13 || i == 18 || i == 23) {
        uuid[i] = '-';
      } else if (i == 14) {
        uuid[i] = '4';
      } else {
        if (rnd <= 0x02) {
          rnd = 0x2000000 + (Math.random()*0x1000000) | 0;
        }
        
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
    return uuid.join('');
  }

  /*-----------------------------------------------
    END UUID function
  -----------------------------------------------*/


  /*
    This method is called in the context of the channel object.
    It should not be called before we get to Pusher.Connection state of Connected.
  */
  function PipeAuthorizer(pusher, callback) {
    var identity = PipeAuthorizer.identity;
    var channel = this;
    var request_id = UUID();

    // 1. Store the callback:
    PipeAuthorizer.callbacks[request_id] = callback;

    // 2. Register the response handler if not already registered:
    if (pusher.back_channel.callbacks['pusher-auth-response'] === undefined || pusher.back_channel.callbacks['pusher-auth-response'].length === 0) {
      pusher.back_channel.bind('pusher-auth-response', PipeAuthorizer.responseHandler);
    }

    // 3. send the subscription request:
    pusher.back_channel.trigger('pusher-auth-request', {
      request_id: request_id,
      channel: channel.name,
      identity: identity
      // We shouldn't need to send this:
      //    socket_id: pusher.connection.socket_id,
    });
  }
  
  PipeAuthorizer.identity = undefined;
  PipeAuthorizer.callbacks = {};
  PipeAuthorizer.responseHandler = function(response) {
    console.log(response);
    if (response.request_id && typeof PipeAuthorizer.callbacks[response.request_id] === 'function') {
      var callback = PipeAuthorizer.callbacks[response.request_id];
      
      if (response.status === 'success') {
        callback(false, response.data);
      } else {
        Pusher.debug("Couldn't get auth info from your webapp", response.reason);
        callback(true, response);
      }
      
      delete PipeAuthorizer.callbacks[response.request_id];
    }
  };
  
  PipeAuthorizer.setIdentity = function(identity) {
    PipeAuthorizer.identity = identity;
  };

  // Export:
  Pusher.authorizers['pipe'] = PipeAuthorizer;
})(this)