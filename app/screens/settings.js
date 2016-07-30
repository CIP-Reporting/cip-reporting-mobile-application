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

  var log = log4javascript.getLogger("CIPAPI.settings");

  $(document).on('cipapi-handle-settings', function(event, info) {
    var html = '' + 
      '<h2>' + CIPAPI.translations.translate('User Settings') + '</h2>' + 
      '<p>'  + CIPAPI.translations.translate('Change or configure the default behaviors of the application.') + '</p>' +
      '<form class="form-horizontal">';
    
    // Dynamic stuff!
    $.each(CIPAPI.usersettings, function(k1, v1) {
      html += '<div class="cipapi-user-setting">';
      html += '<h3>' + v1.title + '</h3>';
      html += '<p>' + v1.description + '</p>';
      
      $.each(v1.options, function(k2, v2) {
        var checked = v1.current == k2 ? ' checked' : '';
        
        html += '' +
          '<div class="form-group">' +
          '  <div class="col-sm-12">' +
          '    <div class="checkbox">' +
          '      <label>' +
          '        <input class="cipapi-user-setting" type="radio" name="' + k1 + '" id="' + k1 + '" value="' + k2 + '" data-setting="' + k1 + '"' + checked + '> ' + v2 +
          '      </label>' +
          '    </div>' +
          '  </div>' +
          '</div>';
      });
      
      html += '</div>';
    });
    
    html += '' +
      '</form>';
    
    $('div#settings-content-area').html(html);
    
    // Attach on change handlers
    $('input.cipapi-user-setting').change(function() {
      var el = $(this);
      CIPAPI.usersettings[el.attr('data-setting')].set(el.val());
    });
  });
  
})(window);
