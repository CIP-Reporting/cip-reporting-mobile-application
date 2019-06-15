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

  var log = CIPAPI.logger.getLogger("CIPAPI.olbutton");

  function renderOlButton(event, info) {
    if (CIPAPI.online.isOffline()) {
      log.info('Not Online - Navigating to Main');
      CIPAPI.router.goTo('main');
      return;
    }
    
    $('div#olbutton-content-area').html('<iframe id="cipapi-olbutton-iframe" name="cipapi-olbutton-iframe"></iframe>');
    
    function postToIframe(data, url, target) {
      $('body').append('<form action="'+url+'" method="post" target="'+target+'" id="postToIframe"></form>');
      $.each(data,function(n,v){
        $('#postToIframe').append('<input type="hidden" name="'+n+'" value="'+v+'" />');
      });
      $('#postToIframe').submit().remove();
    }

    var creds = CIPAPI.credentials.get();
    
    var postVars = false;
    var dbName = '';

    var action = info.params.action;
    if (info.params.context) {
      if (info.params.action.match(/\?/)) {
        action += '&context=' + encodeURIComponent(info.params.context);
      } else {
        action += '?context=' + encodeURIComponent(info.params.context);
      }
    }
    
    if (!creds.token) {
      var parts = creds.user.split(/[@\/]/);
      
      postVars = {
        forceLogin: 1,
        username: parts[0],
        password: creds.pass,
        requestedProfile: parts[2],
        navTo: action
      }
      
      dbName = '?_d=' + parts[1];
    } else {
      postVars = {
        forceLogin: 1,
        authToken: creds.token,
        navTo: action
      }
    }
    
    postToIframe(postVars, creds.host + '/login.php' + dbName, 'cipapi-olbutton-iframe');
  }
  
  $(document).on('cipapi-update-olbutton', renderOlButton);
  
  $(document).on('cipapi-handle-olbutton', renderOlButton);
  
  // Watch for going offline
  $(document).on('cipapi-offline', function() {
    if ($('div#olbutton-content-area').length > 0) {
      log.info('Went Offline - Navigating to Main');
      CIPAPI.router.goTo('main');
    }
  });
})(window);
