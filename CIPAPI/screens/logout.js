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

  var log = log4javascript.getLogger("CIPAPI.logout");

  $(document).on('cipapi-handle-logout', function(event, info) {
    log.debug("Firing pre-credential reset event on logout");
    $(document).trigger('cipapi-pre-logout');
    
    log.debug("Removing credentials and heading to login");
    CIPAPI.credentials.reset();
  });
  
})(jQuery, window);
