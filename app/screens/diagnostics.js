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

  var log = log4javascript.getLogger("CIPAPI.diagnostics");

  function formatKVPObject(title, obj) {
    var html = '';
    
    html += '<div class="col-lg-12"><h3>' + title + '</h3></div>';
    
    $.each(obj, function(key, val) {
      html += '<div class="col-xs-12 col-sm-6 col-md-4 col-lg-3"><dl class="dl-horizontal">';
      html += '<dt>' + key + ':</dt>';
      html += '<dd>' + val + '</dd>';
      html += '</dl></div>';
    });
    
    html += '<div class="clearfix"></div>';
    
    return html;  
  }
  
  $(document).on('cipapi-handle-diagnostics', function(event, info) {
    var html = '';
  
    html += '' +
      '<a id="cipapi-view-logs" data-ajax="false" href="#logger" class="btn btn-primary btn-md btn-custom cipform-diagnostics-btn"><span class="glyphicon glyphicon-list-alt"></span> ' + CIPAPI.translations.translate('View Logs') + '</a>' +
      '<a id="cipapi-factory-reset" href="javascript: void(0)" class="btn btn-primary btn-md btn-custom cipform-diagnostics-btn"><span class="glyphicon glyphicon-trash"></span> ' + CIPAPI.translations.translate('Factory Reset') + '</a>';

    $.each(CIPAPI.stats.fetch(), function(key, val) {
      html += formatKVPObject(key, val);
    });
  
    $('div#diagnostics-content-area').html(html);
    
    // Kaboom!
    $('a#cipapi-factory-reset').click(function() {
      bootbox.dialog({
        message: CIPAPI.translations.translate('WARNING: You will lose any stored data and be required to repeat your authentication process!'),
        title: CIPAPI.translations.translate('Factory Reset'),
        buttons: {
          danger: {
            label: CIPAPI.translations.translate('Factory Reset'),
            className: "btn-danger",
            callback: function() {
              // Clear both local storage and our storage which might or might not be one and the same...
              CIPAPI.storage.clear();
              localStorage.clear();
              CIPAPI.router.goTo('logout');
            }
          },
          main: {
            label: CIPAPI.translations.translate('Cancel'),
            className: "btn-primary btn-custom",
            callback: function() {
              bootbox.hideAll();
            }
          }
        }
      });
    });
  });
  
})(window);
