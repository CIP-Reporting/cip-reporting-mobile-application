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
  CIPAPI.resume = {};

  var log = log4javascript.getLogger("CIPAPI.resume");

  var lastLogin = 0;

  // Store last good login time for optional debounce
  $(document).on('cipapi-credentials-set', function() {
    lastLogin = Math.floor(Date.now() / 1000); // Seconds since epoch
  });

  $(document).on('resume', function() {
    if (CIPAPI.config.logoutOnResume === false) {
      return;
    }
    
    if (CIPAPI.config.logoutOnResume === true) {
      log.debug('Forcing log out on resume');
      CIPAPI.credentials.reset();
      return;
    }
    
    if (!isNaN(CIPAPI.config.logoutOnResume)) {
      var secondsSinceLastUnlock = Math.floor(Date.now() / 1000) - lastLogin;
      
      if (secondsSinceLastUnlock >= CIPAPI.config.logoutOnResume) {
        log.debug('Forcing log out on resume with debounce: ' + secondsSinceLastUnlock + ' since last unlock');
        CIPAPI.credentials.reset();
        return;
      }
      
      log.debug('Not forcing logout on resume: ' + secondsSinceLastUnlock + ' since last unlock');
      return;
    }
    
    log.error('Invalid value for logoutOnResume');
  });
  
  CIPAPI.resume.forceResume = function() {
    $(document).trigger('resume');
  }
  
})(window);
