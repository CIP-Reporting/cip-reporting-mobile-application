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

  var lastPause   = 0;     // Track last pause
  var initialized = false; // Draw the lock screen on demand
  var justBooted  = true;  // Debounce lock on boot
  var lastToken   = false; // Cannot set token until credentials are set

  // A little helper
  function displayErrorForInput(id) {
    log.debug('Display error for input ' + id);

    $('div#cipapi-lock-screen .failed-validation').removeClass('failed-validation');

    $('#' + id).parent().addClass('failed-validation');
    $('.failed-validation input:first').focus();
    return 1;
  }

  // If the login screen renders we disregard justBooted which may force a lock screen
  $(document).on('cipapi-handle-login cipapi-update-login', function() {
    justBooted = false;
  });

  // Store last good login time for optional debounce and capture password if applicable
  $(document).on('cipapi-credentials-set', function() {
    var credentials = CIPAPI.credentials.get();
    if (credentials.pass && credentials.pass != '') {
      CIPAPI.storage.setItem('unlock-password', credentials.pass);
      log.debug('Last password updated');
    }
    else {
      CIPAPI.storage.removeItem('unlock-password');
      log.debug('Last password removed');
    }

    if (lastToken !== false) {
      CIPAPI.storage.setItem('unlock-token', lastToken);
      lastToken = false;
      log.debug('Last QR token updated');
    }
  });

  // Store last used QR code lookup token for unlock
  $(document).on('cipapi-login-qrcode-lookup-by-token', function(evt, token) {
    lastToken = token;
  });

  // Handle cold start (boot) with memorized credentials
  $(document).on('cipapi-metadata-validated', function() {
    if (!justBooted) {
      return;
    }
    
    justBooted = false;
    
    if (CIPAPI.config.lockOnResume === false) {
      return;
    }
    
    if (!CIPAPI.credentials.areValid()) {
      log.debug('Not logged in - leaving screen unlocked on boot');
      return;
    }

    log.debug('Forcing lock screen on boot');
    return CIPAPI.resume.showLockScreen();
  });

  // On resume apply logic for lock screen (active is iOS specific for unlock while active app)
  $(document).on('resume active', function() {
    if (CIPAPI.config.lockOnResume === false) {
      return;
    }
    
    else if (CIPAPI.config.lockOnResume === true) {
      log.debug('Forcing lock screen on resume');
      return CIPAPI.resume.showLockScreen();
    }
    
    else if (!isNaN(CIPAPI.config.lockOnResume)) {
      var secondsSinceLastPause = Math.floor(Date.now() / 1000) - lastPause;
      
      if (secondsSinceLastPause >= CIPAPI.config.lockOnResume) {
        log.debug('Forcing lock screen on resume with debounce: ' + secondsSinceLastPause + ' since last pause');
        return CIPAPI.resume.showLockScreen();
      }
      
      log.debug('Not forcing logout on resume: ' + secondsSinceLastPause + ' since last pause');
    }
    
    else log.error('Invalid value for lockOnResume');
  });

  $(document).on('pause resign', function() {
    if (!CIPAPI.credentials.areValid()) {
      log.debug('Not logged in - forcing logout');
      return CIPAPI.credentials.reset();
    }
    else lastPause = Math.floor(Date.now() / 1000); // Seconds since epoch
  });

  // Always hide the lock screen on the login screen
  $(document).on('cipapi-handle-login', function() { CIPAPI.resume.hideLockScreen(); });
  $(document).on('cipapi-update-login', function() { CIPAPI.resume.hideLockScreen(); });

  // Initialize lock screen HTML
  CIPAPI.resume.initialize = function() {
    var html = '' +
      '<div id="cipapi-lock-screen" class="unlocked">' +
      '  <div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
      '    <div class="navbar-header"></div>' +
      '  </div>' +
      '  <div id="cipapi-lock-screen-content">' +
      '    <h2 class="form-signin-heading">Application Locked</h2>' +
      '    <p>You may unlock the application with your mobile credentials using the options below.</p>' +
      '    <div id="lock-screen-password-control">' +
      '      <div class="form-group">'+
      '        <input id="lock-screen-password" type="password" class="form-control" placeholder="Password">' +
      '        <span class="help-block">You must provide a password</span>' +
      '      </div>' +
      '      <button id="lock-screen-password-button" class="btn btn-lg btn-primary btn-block btn-custom"><span class="glyphicon glyphicon-log-in"></span> Verify Password</button>' +
      '    </div>' +
      '    <div class="form-group">'+
      '      <button id="lock-screen-barcode" class="btn btn-lg btn-primary btn-block btn-custom"><span class="glyphicon glyphicon-barcode"></span> Scan Login Barcode</button>' +
      '      <span class="help-block">Invalid Login Code</span>' +
      '    </div>' +
      '    <button id="lock-screen-log-out" class="btn btn-lg btn-primary btn-block btn-custom"><span class="glyphicon glyphicon-search"></span> Log Out</button>' +
      '  </div>' +
      '</div>';

    $(html).appendTo('body');
  
    $('button#lock-screen-log-out').on('click', function() {
      log.debug('Lock screen log out selected');
      CIPAPI.credentials.reset();
    });
  
    $('button#lock-screen-barcode').on('click', function() {
      CIPAPI.barcode.scan(function(url) {
        log.debug('Decoding URL: ' + url);

        try {
          var parser = document.createElement('a');
          parser.href = url;

          if (parser.protocol != 'https:')               throw "Bad namespace protocol";
          if (parser.hostname != 'www.cipreporting.com') throw "Bad namespace";

          // CIP Login QR Code Scan?
          if (parser.pathname.lastIndexOf('/login',  0) === 0 || 
              parser.pathname.lastIndexOf('/lookup', 0) === 0) {
            var credentials = CIPAPI.barcode.getJsonFromUrl(parser.search.substr(1));
            
            if (credentials['token'] === CIPAPI.storage.getItem('unlock-token')) {
              return CIPAPI.resume.hideLockScreen();
            }
            
            throw "Invalid token";
          }
        }
        catch (err) {
          log.error(err);
          displayErrorForInput('lock-screen-barcode');
        }
      });
    });
    
    $('button#lock-screen-password-button').on('click', function() {
      var pwField = $('input#lock-screen-password').val();
      if (pwField !== CIPAPI.storage.getItem('unlock-password')) {
        return displayErrorForInput('lock-screen-password');
      }
      
      CIPAPI.resume.hideLockScreen();
    });
    
    $('input#lock-screen-password').on('keyup', function(e) {
      if (e.keyCode == 13) {
        $('button#lock-screen-password-button').trigger('click');
      }
    });
    
    return true;
  }

  // Show the lock screen
  CIPAPI.resume.showLockScreen = function() {
    if ($('div#cipapi-lock-screen.locked').length > 0) {
      log.debug('Lock screen already visible');
      return;
    }
    
    if (CIPAPI.config.forceLogoutOnLock === true) {
      log.debug('Forcing logout from lock screen');
      return CIPAPI.credentials.reset();
    }
    
    if (!initialized) {
      log.debug('Lazy loading lock screen');
      initialized = CIPAPI.resume.initialize();
    }
    
    $('div#cipapi-lock-screen .failed-validation').removeClass('failed-validation');
    
    // Show or hide password unlock depending on if password is known
    if (CIPAPI.storage.getItem('unlock-password') !== false) {
      $('input#lock-screen-password').val('');
      
      $('div#lock-screen-password-control').show();
    }
    else {
      $('div#lock-screen-password-control').hide();
    }
    
    // If we are not logged in just force another log out to be safe...
    if (!CIPAPI.credentials.areValid()) {
      log.debug('Not logged in - forcing logout');
      return CIPAPI.credentials.reset();
    }
    
    else $('div#cipapi-lock-screen').removeClass('unlocked').addClass('locked');
  }
  
  // Hide the lock screen
  CIPAPI.resume.hideLockScreen = function() {
    $('div#cipapi-lock-screen').removeClass('locked').addClass('unlocked');
    
    lastPause = Math.floor(Date.now() / 1000); // Seconds since epoch
  }
  
  // Simulate resume event
  CIPAPI.resume.forceResume = function() {
    $(document).trigger('resume');
  }
  
  // Simulate pause event
  CIPAPI.resume.forcePause = function() {
    $(document).trigger('pause');
  }
})(window);
