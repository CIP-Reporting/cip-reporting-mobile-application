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

  CIPAPI.navbar.render = function(conentID) {
    var logoURL = CIPAPI.config.isPackaged ? './res/logo_mono_grey_thin.png' : '../../res/logo_mono_grey_thin.png';
  
    var html = '' +  
      '<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
      '  <div class="navbar-header">' +
      '    <i id="navbar-network-access">' +
      '      <img id="cipapi-navbar-logo" src="' + logoURL + '" />' +
      '    </i>' +
      '    <i id="navbar-pending-reports" style="display: none;"><span class="glyphicon glyphicon-send"></span> <span id="navbar-pending-count">0</span> Pending</i>' +
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
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#logout"><span class="glyphicon glyphicon-log-out"></span> Sign Out</a></li>' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#help"><span class="glyphicon glyphicon-question-sign"></span> Help</a></li>';
    } else {
      // If not authenticated...
      html += '' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#logout"><span class="glyphicon glyphicon-repeat"></span> Start Over</a></li>' +
        '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#help"><span class="glyphicon glyphicon-question-sign"></span> Help</a></li>';
    }
    
    html += '' +
      '      <li><a data-toggle="collapse" data-target=".navbar-collapse" href="#diagnostics"><span class="glyphicon glyphicon-check"></span> Diagnostics</a></li>' +
      '    </ul>' +
      '  </div>' +
      '</div>' +
      '<div id="' + conentID + '"><form class="form-cip-reporting" role="form"></form></div>';
    
    $('div#container').html(html);

    $('a#cipapi-server-synchronize').on('click', function(evt) { $(document).trigger('cipapi-credentials-set'); });

    if (CIPAPI.credentials.areValid()) {
      // Force an update of the reportstore monitor
      $(document).trigger('cipapi-reportstore-change');
    }
  
    // Hide splash screen?
    $(document).trigger('cipapi-hide-splash-screen');
  }

  // Attach to pre-route automagically
  $(document).on('cipapi-pre-handle', function(event, info) {
    CIPAPI.navbar.render(info.hash + '-content-area');
  });
  
})(window);
