/*
 * CIP Reporting API Client Application
 *
 * Copyright (c) 2013 CIP Reporting
 * All rights reserved.
 *  
 * Redistribution and use in source and binary forms are permitted
 * provided that the above copyright notice and this paragraph are
 * duplicated in all such forms and that any documentation,
 * advertising materials, and other materials related to such
 * distribution and use acknowledge that the software was developed
 * by CIP Reporting.  The name of CIP Reporting may not be used to 
 * endorse or promote products derived from this software without 
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND WITHOUT ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 *
 */
(function($, window, undefined) {

  if (typeof CIPAPI == 'undefined') CIPAPI = {};
  CIPAPI.yabblebox = {};

  var log = CIPAPI.logger.getLogger("CIPAPI.yabblebox");

  // Helper to generate GUIDs
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
  }

  // Helper function used for TX override when not connected
  function notConnected() { 
    log.error('Cannot transmit - not connected'); 
    return false; 
  }
  
  // Create a log view control
  CIPAPI.yabblebox.connect = function(config) {
    // Default the config options
    var creds = CIPAPI.credentials.get();
    if (typeof config == 'undefined') config = {};
    if (typeof config.connect  == 'undefined') config.connect  = CIPAPI.settings.YABBLEBOX;
    if (typeof config.host     == 'undefined') config.host     = creds.host;
    if (typeof config.user     == 'undefined') config.user     = creds.user;
    if (typeof config.pass     == 'undefined') config.pass     = creds.pass;
    if (typeof config.token    == 'undefined') config.token    = creds.token;
    if (typeof config.channel  == 'undefined') config.channel  = generateUUID();
    if (typeof config.source   == 'undefined') config.source   = generateUUID();
    if (typeof config.receive  == 'undefined') config.receive  = function() {};
    if (typeof config.transmit == 'undefined') config.transmit = notConnected;

    log.debug("Connecting to " + config.connect);
    log.debug("Channel: " + config.channel);
    
    var socket = io(config.connect);

    // Handle authentication
    socket.on('connect',      function()    { socket.emit('authentication', config); });
    socket.on('unauthorized', function(err) { log.debug("Authentication failure:", err.message); });

    // Handle disconnects
    socket.on('disconnect', function() { 
      config.transmit = notConnected;
      log.debug("Disconnected - transmitter disabled"); 
      $(document).trigger('yabblebox-disconnected', config.channel);
    });

    // Every time we authenticate re-enable our transmitter
    socket.on('authenticated', function(result) {
      config.transmit = function(payload) { socket.emit(result.channelName, { id: generateUUID(), source: config.source, payload: payload }); };
      log.debug('Ready for transmit on yabblebox channel ' + result.channelName);
      $(document).trigger('yabblebox-connected', config.channel);
    });
    
    // Only attach receive once on the first connection
    socket.once('authenticated', function(result) {
      socket.on(result.channelName, function(message) { config.receive(config, message); });
    });

    return config;
  }

})(jQuery, window);
