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

  var log = log4javascript.getLogger("CIPAPI.login");

  // May be provided by a schema URL open...
  var passwordFromURL = false;
  
  $(document).on('cipapi-handle-login', function(event, info) {
    renderLoginScreen(info);
  });
  
  // Updates are fired to login on failed logins
  $(document).on('cipapi-update-login', function(event, info) {
    // Unauthorized - NOTE: If unauthorized shows up as a new navigation to login we know this
    // is a set of credentials that once worked and are now failed.  If this shows up in the
    // update navigation handler we know this is a failure from the login handler itself.
    if (info.params.action == 'unauthorized') {
      // Re-enable UI components and show the sad screen
      $('form#form-manual-sign-in input').prop('readonly', false);
      $('button#form-signin').prop('disabled', false);
      $('a#form-account-lookup').show();

      slideInForm('form-try-again');
      return;
    }
    
    // Else draw some stuff!
    renderLoginScreen(info);
  });
  
  // Rotate a form into view
  function slideInForm(id, callback) {
    log.debug('Sliding in ' + id);
    
    $('.failed-validation').removeClass('failed-validation');
    
    $('form.form-signin:visible').fadeOut(100, function() {
      $('form#' + id).fadeIn(100, function() {
        $('form#' + id + ' input:first').focus();
        
        if (typeof callback == 'function') {
          callback(id);
        }
      });
    });
  }
  
  // A little helper class
  function displayErrorForInput(id) {
    log.debug('Display error for input ' + id);

    $('#' + id).parent().addClass('failed-validation');
    $('.failed-validation input:first').focus();
    return 1;
  }
    
  function renderLoginScreen(info) {
    log.debug("Cleaning login screen");
    
    // Clean up
    $('div#login-content-area > *').remove();

    // Show login forms
    if (info.params.action == 'login') {
      log.debug("Render login screen");
      renderLogin();
    }

    // Unauthorized - NOTE: If unauthorized shows up as a new navigation to login we know this
    // is a set of credentials that once worked and are now failed.  If this shows up in the
    // update navigation handler we know this is a failure from the login handler itself.
    else if (info.params.action == 'unauthorized') {
      log.debug("Render login screen for unauthorized");
      renderLogin();
    }

    // Navigate to the button list if all else fails
    else {
      log.debug("Redirecting to login!action=login");
      CIPAPI.router.goTo('login', { action: 'login' });
    }
  }

  // Show the forms
  function renderLogin() {
    var html = '' +
      '<form class="form-signin" id="form-account-lookup" style="display: none;">' +
      '  <h2 class="form-signin-heading">Account Look Up</h2>' +
      '  <p>You must be a customer of CIP Reporting in order to use this application.  You can learn more at <a id="form-visit-cip" href="javascript: void(0)">www.cipreporting.com</a>.</p>' +
      '  <p>Please help us find your account by entering your email address.  You can select manual sign in if you have been provided credentials.</p>' +
      '  <div class="form-group">'+
      '    <input id="form-signin-email" type="text" class="form-control" placeholder="Email Address" autofocus>' +
      '    <span for="firstname" class="help-block">You must provide a valid email address</span>' +
      '  </div>' +
      '  <button id="form-lookup" class="btn btn-lg btn-primary btn-block btn-custom" type="submit"><span class="glyphicon glyphicon-search"></span> Look Up Account</button>' +
      '  <a id="form-signin-manual" class="form-signin-control" href="javascript: void(0)">Manual Sign In</a>' +
      '</form>' +
      '<form class="form-signin" id="form-account-password" style="display: none;">' +
      '  <h2 class="form-signin-heading">Password Required</h2>' +
      '  <p>Success! Your account was located.  Please enter your password to continue.</p>' +
      '  <div class="form-group">'+
      '    <input id="form-signin-pass-proxy" type="password" class="form-control" placeholder="Password" required>' +
      '    <span for="firstname" class="help-block">You must provide a password</span>' +
      '  </div>' +
      '  <button id="form-signin-proxy" class="btn btn-lg btn-primary btn-block btn-custom" type="submit"><span class="glyphicon glyphicon-log-in"></span> Sign in</button>' +
      '  <a id="form-account-lookup" class="form-signin-control" href="javascript: void(0)">Account Look Up</a>' +
      '</form>' +
      '<form class="form-signin" id="form-manual-sign-in" style="display: none;">' +
      '  <h2 class="form-signin-heading">Manual Sign In</h2>' +
      '  <p>You must be a customer of CIP Reporting in order to use this application.  You can learn more at <a href="http://www.cipreporting.com">www.cipreporting.com</a>.</p>' +
      '  <p>Please enter the full credential set provided to you in order to continue.  You can select account look up to if you do not have credentials.</p>' +
      '  <div class="form-group">'+
      '    <input id="form-signin-host" type="text" class="form-control" placeholder="Server URL" autofocus>' +
      '    <span for="firstname" class="help-block">You must provide a valid server URL</span>' +
      '  </div>' +
      '  <div class="form-group">'+
      '    <input id="form-signin-user" type="text" class="form-control" placeholder="User ID">' +
      '    <span for="firstname" class="help-block">You must provide a valid user ID</span>' +
      '  </div>' +
      '  <div class="form-group">'+
      '    <input id="form-signin-pass" type="password" class="form-control" placeholder="Password">' +
      '    <span for="firstname" class="help-block">You must provide a password</span>' +
      '  </div>' +
      '  <button id="form-signin" class="btn btn-lg btn-primary btn-block btn-custom" type="submit"><span class="glyphicon glyphicon-log-in"></span> Sign in</button>' +
      '  <a id="form-account-lookup" class="form-signin-control" href="javascript: void(0)">Account Look Up</a>' +
      '</form>' +
      '<form class="form-signin" id="form-account-in-progress" style="display: none;">' +
      '  <h2 class="form-signin-heading">Signing In...</h2>' +
      '  <p>Please wait while we sign into your account.</p>' +
      '</form>' +
      '<form class="form-signin" id="form-account-not-found" style="display: none;">' +
      '  <h2 class="form-signin-heading">Account Not Found</h2>' +
      '  <p>We apologize for the inconvenience but we are not able to locate your account at this time.</p>' +
      '  <p>Please verify your credentials and try again.</p>' +
      '  <button id="form-try-again" class="btn btn-lg btn-primary btn-block btn-custom"><span class="glyphicon glyphicon-arrow-left"></span> Try Again</button>' +
      '  <h3 class="form-signin-demo">Take a Quick Demo</h3>' +
      '  <p>' +
      '    Would you like to try out the CIP Reporting Mobile client?' +
      '    Click the quick demo button below to access a demo server which has some sample reports for you to write.' +
      '  </p>' +
      '  <button id="form-quick-demo" class="btn btn-lg btn-primary btn-block btn-custom"><span class="glyphicon glyphicon-gift"></span> Take a Quick Demo</button>' +
      '</form>' +
      '<form class="form-signin" id="form-try-again" style="display: none;">' +
      '  <h2 class="form-signin-heading">Sign In Failed</h2>' +
      '  <p>We apologize for the inconvenience but we are not able to authorize your account at this time.</p>' +
      '  <p>Please verify your credentials and try again.</p>' +
      '  <button id="form-try-again" class="btn btn-lg btn-primary btn-block btn-custom"><span class="glyphicon glyphicon-arrow-left"></span> Try Again</button>' +
      '</form>' +
      '<form class="form-signin" id="form-sso-pw" style="display: none;">' +
      '  <h2 class="form-signin-heading">Create New Password</h2>' +
      '  <p>You need to create a mobile password if you have not already or you can change your mobile password by creating a new one.</p>' +
      '  <button id="form-create-pw" class="btn btn-lg btn-primary btn-block btn-custom"><span class="glyphicon glyphicon-lock"></span> Create New Password</button>' +
      '  <h4 class="form-signin-heading">No Thanks</h4>' +
      '  <p>If you have already created a mobile password you can skip this step and sign in now.  You must create a mobile password at least once.</p>' +
      '  <button id="form-no-new-pw" class="btn btn-lg btn-primary btn-block btn-custom"><span class="glyphicon glyphicon-log-in"></span> Sign In</button>' +
      '  <a id="form-account-lookup" class="form-signin-control" href="javascript: void(0)">Account Look Up</a>' +
      '</form>' +
      '<form class="form-signin" id="form-looking-up" style="display: none;">' +
      '  <h2 class="form-signin-heading">Looking Up Account</h2>' +
      '  <p>Please wait while we look up your account.</p>' +
      '</form>';
    
    $('div#login-content-area').html(html);

    // Load any known credentials into the forms
    var credentials = CIPAPI.credentials.get();
    $('input#form-signin-host').val(credentials.host);
    $('input#form-signin-user').val(credentials.user);
    $('input#form-signin-pass').val(credentials.pass);
    $('input#form-signin-pass-proxy').val(credentials.pass);
    
    // See if a password was provided by schema URL, if so - run with it!
    if (typeof passwordFromURL == 'string') {
      log.debug("Password provided from external schema URL - going for it!");
      $('input#form-signin-pass').val(passwordFromURL);
      $('input#form-signin-pass-proxy').val(passwordFromURL);
      $('#form-account-password').fadeIn(100, function() {
        $('button#form-signin-proxy').click();
      });
    } else {
      log.debug("Rendering account lookup screen");
      $('#form-account-lookup').fadeIn(100);
    }
    
    // Controls to flip flop sign in mode
    $('a#form-signin-manual' ).click(function () { slideInForm('form-manual-sign-in');   });
    $('a#form-account-lookup').click(function () { slideInForm('form-account-lookup');   });

    // Try to look up account again
    $('button#form-try-again').click(function (evt) { 
      evt.preventDefault(); // Stop the form from submitting and causing a page reload
      slideInForm('form-account-lookup');
    });

    // Already have a password    
    $('button#form-no-new-pw').click(function (evt) { 
      evt.preventDefault(); // Stop the form from submitting and causing a page reload
      slideInForm('form-account-password');
    });
    
    // Open CIP Reporting link
    $('a#form-visit-cip').click(function () { window.open('http://www.cipreporting.com', '_system')});

    $('button#form-quick-demo').on('click', function(evt) {
      evt.preventDefault(); // Stop the form from submitting and causing a page reload
      log.debug("Quick Demo Click");
      
      // Show the account lookup screen
      slideInForm('form-account-lookup', function(id) {
        $('#form-signin-email').val('mobiledemo@cipreporting.com');
        $('button#form-lookup').click();
      });      
    });
    
    // Account Lookup Click Handler
    $('button#form-lookup').on('click', function(evt) {
      evt.preventDefault(); // Stop the form from submitting and causing a page reload

      var emailAddress = $('input#form-signin-email').val();
      log.debug("Look up email address: " + emailAddress);

      if (!emailAddress.match(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/)) {
        return displayErrorForInput('form-signin-email');
      }

      // Let the world know...
      $(document).trigger('cipapi-lookup-email', emailAddress);
      
      slideInForm('form-looking-up', function() {
        $(document).trigger('cipapi-rest-active'); // Must simulate due to direct access
        log.debug("Creating look up request");
        
        // Try and lookup the account details
        $.ajax({ url: 'http://rslookup.cipreporting.com?i=' + escape(emailAddress), timeout: 30000, dataType: 'json' }).done(function (cfg) {
          try {
            log.debug("Look up response received: " + cfg);
            
            if (typeof cfg[0]          == 'undefined') throw "Invalid Response";
            if (typeof cfg[0].host     == 'undefined') throw "Invalid Host";
            if (typeof cfg[0].user     == 'undefined') throw "Invalid User";
            if (typeof cfg[0].database == 'undefined') throw "Invalid Database";
            if (typeof cfg[0].profile  == 'undefined') throw "Invalid Profile";
            if (typeof cfg[0].password == 'undefined') throw "Invalid Password";
            if (typeof cfg[0].sso      == 'undefined') throw "Invalid SSO";

            // Lookup successful!
            log.debug("Look up response validated");
            $('input#form-signin-host').val(cfg[0].host);
            $('input#form-signin-user').val(cfg[0].user + '@' + cfg[0].database + '/' + cfg[0].profile);
            $('input#form-signin-pass').val(cfg[0].password);
            $('input#form-signin-pass-proxy').val(cfg.password);

            log.debug("Login form completed from look up response");
            
            // If a password is given, lets go!
            if (cfg[0].password != '') {
              log.debug("Password given - signing in");
              $('button#form-signin').click();
            } else if (cfg[0].sso) {
              log.debug("Requesting SSO password creation");
              
              // Store partial credentials because we will likely leave the app and re-initialize after setting a mobile password
              var credentials = {
                host: $('input#form-signin-host').val().trim(),
                user: $('input#form-signin-user').val().trim(),
                pass: '',
                save: true
              };
              CIPAPI.credentials.set(credentials);
              
              slideInForm('form-sso-pw');
            } else {
              log.debug("Showing password prompt");
              slideInForm('form-account-password');
            }
          } catch (e) {
            log.error("Error decoding look up response: " + e);
            $('input#form-signin-host').val('');
            $('input#form-signin-user').val('');
            $('input#form-signin-pass').val('');
            slideInForm('form-account-not-found');
          }
        }).fail(function(jqXHr, textStatus, errorThrown) {
          log.error("Failed to perform look up");
          log.error("textStatus: " + textStatus); // error
          log.error("errorThrown: " + errorThrown); // Not Found
          log.error("XHR Status: " + jqXHr.status);
          log.error("XHR Status Text: " + jqXHr.statusText);
          
          $('input#form-signin-host').val('');
          $('input#form-signin-user').val('');
          $('input#form-signin-pass').val('');
          slideInForm('form-account-not-found');
        }).always(function() {
          $(document).trigger('cipapi-rest-inactive'); // Must simulate due to direct access
          log.debug("Ending look up request");
        });
      });
    });

    // Password Proxy On-Click Handler
    $('button#form-signin-proxy').on('click', function(evt) {
      evt.preventDefault(); // Stop the form from submitting and causing a page reload

      if ($('input#form-signin-pass-proxy').val() == '') {
        return displayErrorForInput('form-signin-pass-proxy');
      }
      
      $('input#form-signin-pass').val($('input#form-signin-pass-proxy').val());
      $('button#form-signin').click();
    });

    $('button#form-create-pw').on('click', function(evt) {
      evt.preventDefault(); // Stop the form from submitting and causing a page reload
      
      var passwordURL = $('input#form-signin-host').val() + '/sso?mobilepw=1';
      
      var passwordWindow = window.open(passwordURL, '_system');
      
      // iOS and browser just go to account password screen, but android exits
      setTimeout(function() { 
        slideInForm('form-account-password'); 
        if (window.cordova) {
          navigator.app.exitApp();
        }
      }, 2000);
    });
    
    // Log In Click Handler    
    $('button#form-signin').on('click', function(evt) {
      evt.preventDefault(); // Stop the form from submitting and causing a page reload
      
      var credentials = {
        host: $('input#form-signin-host').val().trim(),
        user: $('input#form-signin-user').val().trim(),
        pass: $('input#form-signin-pass').val().trim(),
        save: true
      };

      var totalErrors = 0;
      if (credentials.host === '') totalErrors += displayErrorForInput('form-signin-host');
      if (credentials.user === '') totalErrors += displayErrorForInput('form-signin-user');
      if (credentials.pass === '') totalErrors += displayErrorForInput('form-signin-pass');
      if (totalErrors > 0) return;

      // Set the credentials and verify
      slideInForm('form-account-in-progress', function(id) {
        CIPAPI.credentials.set(credentials);
      });
      
      // Avoid UI confusion by disabling things while we wait...
      $('form#form-manual-sign-in input').prop('readonly', true);
      $('button#form-signin').prop('disabled', true);
      $('a#form-account-lookup').hide();
    });
  }

  // Handle URL schema opens
  window.handleOpenURL = function(url) {
    var parsedURL = $.url(url);
    var password = parsedURL.param('p');
    
    if (typeof password == 'undefined') {
      log.debug("Opened by URL schema but no password provided");
      return;
    }
    
    log.debug("Opened by URL and password is provided, setting into credentials");
    passwordFromURL = password;
  }
  
})(window);
