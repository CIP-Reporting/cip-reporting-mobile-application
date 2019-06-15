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
  CIPAPI.router = {};
  
  var log = CIPAPI.logger.getLogger("CIPAPI.router");

  var hasRouted = false;
  
  // Track the last hash tag and parameters
  var lastHash  = '?&This will never exist&?';
  var lastParam = '?&Neither will this abc&?';
  
   // Route requests through the event system based on the URL hash tag
  CIPAPI.router.route = function() {
    var components = window.location.hash.split('!');
    var currHash   = components.shift().replace(/^#/, '');
    var currParams = components.length > 0 ? components.join('!') : '';
    
    // Convert the parameter components into a JSON object for easy access
    var paramObj = {};
    for (var i=0; i<components.length; i++) {
      var bits = components[i].split('=', 2);
      if (bits.length == 2) {
        paramObj[unescape(bits[0])] = unescape(bits[1]);
      }
    }
    
    // Default to #main
    if (currHash == '') {
      return CIPAPI.router.goTo(CIPAPI.config && CIPAPI.config.defaultRoute ? CIPAPI.config.defaultRoute : 'main');
    }
    
    // If this is a new hash, always clear the contents and invoke the handler
    if (currHash != lastHash) {
      lastHash  = currHash;
      lastParam = currParams;

      log.info("Invoking handler cipapi-handle-" + currHash + ' (' + currParams + ')');

      // Clean up ... Clean up ... Everybody Clean up...
      $(document).trigger('cipapi-unbind');
      $('div#container > *').remove();

      // Put a CSS class on the body tag for styling assistance based on the route...
      // BUT DO NOT ASSUME WE OWN THE TAG!  Lazy load a data attribute with the original
      // classes and always append to it.  Greedy use of classes on the body tag makes for
      // poor integrations it does.
      var priorCSS = '' + $('body').attr('data-original-classes');
      if (!priorCSS || priorCSS == 'undefined') {
        priorCSS = $('body').attr('class') ? $('body').attr('class') : '';
        $('body').attr('data-original-classes', priorCSS);
      }
      if (priorCSS.length) priorCSS += ' ';
      $('body').attr('class', priorCSS + currHash);

      // Let someone else render the screen now
      $(document).trigger('cipapi-pre-handle', { hash: currHash, params: paramObj });
      $(document).trigger('cipapi-handle-' + currHash, { hash: currHash, params: paramObj });
      $(document).trigger('cipapi-routed');
    }

    // If the hash is the same invoke the updater
    else {
      lastParam = currParams;

      log.info("Invoking updater cipapi-update-" + currHash + ' (' + currParams + ')');

      $(document).trigger('cipapi-pre-update', { hash: currHash, params: paramObj });
      $(document).trigger('cipapi-update-' + currHash, { hash: currHash, params: paramObj });
      $(document).trigger('cipapi-routed');
    }
    
    hasRouted = true;
  }
  
  // Called by all metadata resources to validate everyone is loaded by using veto power
  CIPAPI.router.validateMetadata = function() {
    // Any resource which needs to be loaded before continuing to the application should monitor this event and set the
    // validation value to false if not loaded.  After the event is done firing the object can be checked to see if any
    // particular resource executed veto power.
    var validation = { validated: true };
    $(document).trigger('cipapi-metadata-validate', validation);
    if (validation.validated) {
      log.debug("Metadata validated");
      $(document).trigger('cipapi-metadata-validated');
    }
  }

  // Hash tag navigation
  CIPAPI.router.goTo = function(hash, params) {
    if (!hash) hash = '';
    if (!params) params = {};
    
    var paramArray = [];
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        paramArray.push(escape(key) + '=' + escape(params[key]));
      }
    }
    var paramString = paramArray.join('!');
    
    if (paramArray.length > 0) hash += '!' + paramString;
    log.debug("Navigating to " + hash);
    
    if (window.location.hash == '#' + hash) CIPAPI.router.route(); // Force a route manually
    else window.location.hash = hash;
  }

  // A common way to see our current page handler
  CIPAPI.router.getCurrentHandler = function() {
    var components = window.location.hash.split('!');
    return components.shift().replace(/^#/, '');
  }
  
  // A common way to see our current page handler arguments
  CIPAPI.router.getCurrentHandlerArguments = function() {
    var components = window.location.hash.split('!');
    components.shift();
    return components;
  }

  // On application initialization force the initial route
  $(document).on('cipapi-metadata-validated', function(event) {
    // If we are on the login screen and have a full metadata load go to the main application
    var components = window.location.hash.split('!');
    var currHash   = components.shift().replace(/^#/, '');
    if (currHash == 'login') {
      log.debug("Metadata validated, routing to #main");
      CIPAPI.router.goTo('main');
    } else if (!hasRouted) {
      log.debug("Metadata validated, kicking initial route");
      CIPAPI.router.route();
    }
  });
  
  // When credentials are reset head on over to login
  $(document).on('cipapi-credentials-reset', function(event) {
    CIPAPI.router.goTo('login');
  });
  
  // When the hash changes fire off the router
  $(window).on('hashchange', CIPAPI.router.route);
  
})(jQuery, window);
