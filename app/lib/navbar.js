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
  CIPAPI.navbar = {};

  var log = log4javascript.getLogger("CIPAPI.navbar");

  var backButtonQueue = [];
  
  // Draw some navbar!
  CIPAPI.navbar.render = function(conentID) {
    var logoURL = CIPAPI.config.isPackaged ? './res/logo_mono_grey_thin.png' : '../../res/logo_mono_grey_thin.png';
  
    var html = '' +  
      '<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
      '  <div class="navbar-header">' +
      '    <div class="navbar-back-button"><a id="navbar-back-button" href="javascript: void(0)"><span class="glyphicon glyphicon-share-alt"></span></a></div>' +
      '    <div class="navbar-network-access"><a id="navbar-network-access">' +
      '      <img id="cipapi-navbar-logo" src="' + logoURL + '" />' +
      '    </a></div>' +
      '    <div class="navbar-pending-reports"><i id="navbar-pending-reports" style="display: none;"><span class="glyphicon glyphicon-send"></span> <span id="navbar-pending-count">0</span> Pending</i></div>' +
      '    <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">' +
      '      <span class="sr-only">Toggle navigation</span>' +
      '      <span class="icon-bar"></span>' +
      '      <span class="icon-bar"></span>' +
      '      <span class="icon-bar"></span>' +
      '    </button>' +
      '  </div>' +
      '  <div class="navbar-collapse collapse">' +
      '    <ul class="nav navbar-nav navbar-right">';
    
    if (CIPAPI.credentials.areValid()) {
      // If authenticated...
      html += '' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#main!action=list"><span class="glyphicon glyphicon-list-alt"></span> Report List</a></li>' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" id="cipapi-server-synchronize" href="javascript: void(0)"><span class="glyphicon glyphicon-refresh"></span> Synchronize</a></li>' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#help"><span class="glyphicon glyphicon-question-sign"></span> Help</a></li>' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#diagnostics"><span class="glyphicon glyphicon-check"></span> Diagnostics</a></li>' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#logout"><span class="glyphicon glyphicon-log-out"></span> Sign Out</a></li>';
    } else {
      // If not authenticated...
      html += '' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#help"><span class="glyphicon glyphicon-question-sign"></span> Help</a></li>' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#diagnostics"><span class="glyphicon glyphicon-check"></span> Diagnostics</a></li>' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#logout"><span class="glyphicon glyphicon-log-out"></span> Start Over</a></li>';
    }
    
    html += '' +
      '    </ul>' +
      '  </div>' +
      '</div>' +
      '<div id="' + conentID + '"><form class="form-cip-reporting" role="form"></form></div>';
    
    // Clean up like a good little boy...
    $('div#container > *').remove();

    $('div#container').html(html);

    $('a#cipapi-server-synchronize').on('click', function(evt) { $(document).trigger('cipapi-credentials-set'); });

    if (CIPAPI.credentials.areValid()) {
      // Force an update of the reportstore monitor
      $(document).trigger('cipapi-reportstore-change');
    }
  }
  
  // Hide splash screen when routed
  $(document).on('cipapi-routed', function(event, info) {
    if (window.cordova) {
      navigator.splashscreen.hide();
    }
  });
  
  // Go back ... maybe!
  CIPAPI.navbar.goBack = function() {
    // Require at least 2 - one for current page and one to go back to
    if (backButtonQueue.length < 2) {
      if (CIPAPI.device.platform == "Android") {
        log.debug("No where to go back to - terminating");
        navigator.app.exitApp();
        return;
      }
      
      log.debug("Not going back: " + backButtonQueue.length);
      return;
    }
    
    var goBackHash = '#' + backButtonQueue[backButtonQueue.length - 2];
    log.debug("Going back to " + goBackHash);
    window.location.href = 'index.html' + goBackHash;
  }

  // Attach to pre-route automagically
  $(document).on('cipapi-pre-handle', function(event, info) {
    CIPAPI.navbar.render(info.hash + '-content-area');
  });
  
  // After routing manage the stack and set the back link up if prudent
  $(document).on('cipapi-routed', function(event, info) {
    var currHash = window.location.hash.replace(/^#/, '');
    log.debug("Current hash: " + currHash);
    
    // Anywhere on the login screen is a full reset
    if (currHash.match(/^login/)) {
      log.debug("Resetting back button queue");
      backButtonQueue = [ ];
    }

    // Main button list is a full reset
    if (currHash == 'main!action=list') {
      log.debug("Resetting back button queue");
      backButtonQueue = [ ];
    }
    
    // See if this hash is in the stack, if so do some pruning
    var inQueue = $.inArray(currHash, backButtonQueue);
    if (inQueue > -1) {
      backButtonQueue = backButtonQueue.slice(0, inQueue);
      log.debug("Pruned back button queue: " + backButtonQueue.length);
    }

    // If the queue has any entries in it, enable the back button
    if (backButtonQueue.length > 0) {
      log.debug("Back button queue: " + backButtonQueue.length);
      $('a#navbar-back-button').addClass('navbar-back-button-active').click(function() {
        CIPAPI.navbar.goBack();
      });
    } else {
      log.debug("Back button queue exhausted, removing handlers");
      $('a#navbar-back-button').removeClass('navbar-back-button-active').off('click');
    }
    
    // Add the current has to the end of the queue
    log.debug("Adding to back button queue: " + currHash);
    backButtonQueue.push(currHash);
  });

  // Handle the back button on Android
  document.addEventListener("backbutton", function (e) {
    e.preventDefault();
    
    // This event only fires in phonegap / cordova land FYI
    
    // If the top menu is visible, hide it and do nothing else...
    var _opened = $(".navbar-collapse").hasClass("navbar-collapse in");
    if (_opened === true) {
      log.debug("Closing top navigation menu for back button");
      $("button.navbar-toggle").click();
      return;
    }
    
    // If a datepicker control is visible, hide it and do nothing else...
    if ($('div#ui-datepicker-div').is(':visible')) {
      // It will hide itself by simulating a click on the overlay
      log.debug("Closing datepicker for back button");
      $('div#cipapi-screen-overlay').click();
      return;
    }
    
    CIPAPI.navbar.goBack();
  });
  
  // Monitor for changes in the report store
  $(document).on('cipapi-reportstore-change', function(event, info) {
    var storedReports = CIPAPI.reportstore.getNumberOfStoredReports();
    
    $('span#navbar-pending-count').html(storedReports);
    
    if (storedReports == 0 && $('i#navbar-pending-reports').is(':visible')) {
      $('i#navbar-pending-reports').fadeOut();
    } else if (storedReports > 0 && !$('i#navbar-pending-reports').is(':visible')) {
      $('i#navbar-pending-reports').fadeIn();
    }
  });  
  
  // Notification when all reports have been sent
  $(document).on('cipapi-reportstore-empty', function(event, info) {
    // Vibrate for a second
    if (window.cordova) {
      navigator.vibrate(1000);
    }
    
    bootbox.dialog({
      message: "All pending reports have been successfully sent",
        title: "All Reports Sent",
      buttons: {
        success: {
              label: '<span class="glyphicon glyphicon-thumbs-up"></span> Success',
          className: "btn btn-lg btn-primary btn-custom",
        }
      }
    });
  });
  
  // Fired when the REST engine is active
  var activelySpinning = false;
  $(document).on('cipapi-rest-active', function(event, info) {
    $('#cipapi-navbar-logo').addClass('cipapi-logo-spin');

    // Do not re-spin when already spinning which keeps the rotation smooth for a full 360 degrees
    if (activelySpinning) {
      return;
    }
    
    var rotation = function() {
      var logo = $("img.cipapi-logo-spin");
      activelySpinning = logo.length == 1;
      
      logo.rotate({
        angle: 0, 
        animateTo: 360, 
        callback: rotation,
        easing: function(x, t, b, c, d) {
          // t: current time, b: begInnIng value, c: change In value, d: duration
          return c * (t / d) + b;
        }
      });
    }
    rotation();
  });
  
  // Fired when the REST engine is inactive
  $(document).on('cipapi-rest-inactive', function(event, info) {
    $('#cipapi-navbar-logo').removeClass('cipapi-logo-spin');
  });
  
  // Close navbar on click ANYWHERE
  $(document).click(function (event) {
    var clickover = $(event.target);
    var _opened = $(".navbar-collapse").hasClass("navbar-collapse in");
    if (_opened === true && !clickover.hasClass("navbar-toggle")) {
      $("button.navbar-toggle").click();
    }
  });

  // Close navbar on click of logger body
  $(document).on('cipapi-logger-body-click', function(event) {
    if ($(".navbar-collapse").hasClass("navbar-collapse in") === true) {
      $("button.navbar-toggle").click();
    }
  });
  
  // Show the overlay when a datepicker is displayed (and collapse navigation menu if visible)
  $(document).on('cipapi-datepicker-show', function(event, info) {
    var _opened = $(".navbar-collapse").hasClass("navbar-collapse in");
    if (_opened === true) {
      log.debug("Closing top navigation menu for back button");
      $("button.navbar-toggle").click();
    }

    // A little JS layout help to keep it centered
    if (info == 'datetime') {
      $('#ui-datepicker-div').css('margin-top', '-229px');
    } else if (info == 'date') {
      $('#ui-datepicker-div').css('margin-top', '-116px');
    } else if (info == 'time') {
      $('#ui-datepicker-div').css('margin-top', '-116px');
    }
    
    $('#cipapi-screen-overlay').show();
  });
  
  // Hide the overlay when a datepicker is displayed
  $(document).on('cipapi-datepicker-hide', function(event, info) {
    $('#cipapi-screen-overlay').hide();
  });
  
})(window);
