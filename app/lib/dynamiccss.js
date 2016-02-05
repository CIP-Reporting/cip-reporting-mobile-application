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
  CIPAPI.dynamiccss = {};
  
  var log = log4javascript.getLogger("CIPAPI.dynamiccss");

  // When the configuration is loaded apply any dynamic CSS
  $(document).on('cipapi-config-set', function() {
    if ($('head style#dynamic-css').length == 0) {
      log.debug('Creating dynamic CSS tag in head');
      $('head').append('<style id="dynamic-css"></style>');
    }
    
    if (CIPAPI.config.dynamicCSS === false) {
      log.debug('No dynamic CSS - removing any existing dynamic CSS');
      $('head style#dynamic-css').html('');
      return;
    }
    
    log.debug('Updating dynamic CSS');
    $('head style#dynamic-css').html(CIPAPI.config.dynamicCSS);
  });
  
  log.debug('Monitoring for config changes');
  
})(window);
