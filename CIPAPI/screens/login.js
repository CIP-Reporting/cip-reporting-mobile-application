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

  var log = CIPAPI.logger.getLogger("CIPAPI.login");

  var attemptInProgress = false;
  
  $(document).on('cipapi-handle-login', function(event, info) {
    var html = '' +
      '<form class="form-signin">' +
      '  <h2 class="form-signin-heading">Please sign in</h2>' +
      '  <input id="form-signin-host" type="text" class="form-control" placeholder="Server URL" autofocus>' +
      '  <input id="form-signin-user" type="text" class="form-control" placeholder="User ID">' +
      '  <input id="form-signin-pass" type="password" class="form-control" placeholder="Password">' +
      '  <label class="checkbox">' +
      '    <input id="form-signin-remember" type="checkbox" value="remember-me"> Remember me' +
      '  </label>' +
      '  <button id="form-signin" class="btn btn-lg btn-primary btn-block" type="submit">Sign in</button>' +
      '</form>';
    
    $('div#container').html(html);

    attemptInProgress = false;

    $('button#form-signin').on('click', function(evt) {
      evt.preventDefault(); // Stop the form from submitting and causing a page reload
      
      var credentials = {
        host: $('input#form-signin-host').val().trim(),
        user: $('input#form-signin-user').val().trim(),
        pass: $('input#form-signin-pass').val().trim(),
        save: $('input#form-signin-remember').is(':checked'),
        token: null
      };

      if (credentials.host === '' ||
          credentials.user === '' ||
          credentials.pass === '') {
        bootbox.alert("You must provide a complete set of credentials");
        return;
      }
      
      log.debug(credentials);
      CIPAPI.credentials.set(credentials);
      attemptInProgress = true;

      // Any resource which needs to be loaded before continuing to the application should monitor this event and set the
      // validation value to false if not loaded.  After the event is done firing the object can be checked to see if any
      // particular resource executed veto power.
      var validation = { validated: true };
      $(document).trigger('cipapi-metadata-validate', validation);
      if (validation.validated) {
        log.debug("Metadata validated");
        $(document).trigger('cipapi-metadata-validated');
      }
    });
  });
  
  // Updates are fired to login on failed logins
  $(document).on('cipapi-update-login', function(event, info) {
    if (attemptInProgress) {
      attemptInProgress = false;
      bootbox.alert("You must provide a valid set of credentials");
    }
  });

  // Rest errors while an attempt is in progress are from a bad URL
  $(document).on('cipapi-rest-error', function(event, info) {
    if (attemptInProgress) {
      attemptInProgress = false;
      bootbox.alert("You must provide a valid server URL");
    }
  });
  
  // On metadata validation mark the attempt in progress as done
  $(document).on('cipapi-metadata-validated', function(event, info) {
    attemptInProgress = false;
  });
  
})(jQuery, window);
