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
(function(window, undefined) {

  if (typeof CIPAPI == 'undefined') CIPAPI = {};
  CIPAPI.online = {};

  var log = CIPAPI.logger.getLogger("CIPAPI.online");

  var online = true;

  function fireEvents() {
    log.debug('Online Status Change: ' + (online ? 'ONLINE' : 'OFFLINE'));
    
    $(document).trigger('cipapi-online-change', online);
    $(document).trigger(online ? 'cipapi-online' : 'cipapi-offline', online);
  }
  
  CIPAPI.online.isOnline  = function() { return  online; }
  CIPAPI.online.isOffline = function() { return !online; }
  
  CIPAPI.online.goOnline  = function() { online = true;  fireEvents(); }
  CIPAPI.online.goOffline = function() { online = false; fireEvents(); }
  
  // Hook onto network events (Cordova only)
  $(document).on('online',  CIPAPI.online.goOnline);
  $(document).on('offline', CIPAPI.online.goOffline);
})(window);
