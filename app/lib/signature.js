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
  CIPAPI.signature = {};

  var log = log4javascript.getLogger("CIPAPI.signature");
  
  var converter = new Markdown.Converter();

  CIPAPI.signature.name    = false;
  CIPAPI.signature.svgURL  = false;
  CIPAPI.signature.pngURL  = false;
  CIPAPI.signature.capture = function(cb, message) {
    function capture(cb) {
      log.debug('Capture');
      $(
        '<div class="modal-backdrop">' +
        '  <div class="signaure-outer"><div class="signaure-middle"><div class="signaure-inner">' +
        '    <div class="signaure-wrapper">' +       
        '      <div class="signature-block"></div>' +
        '    </div>' +
        '  </div></div></div>' +
        '  <div class="signature-buttons text-center">' +
        '    <button id="signature-save"   type="button" class="btn btn-default signature-button"><span class="glyphicon glyphicon-ok"></span>&nbsp;'      + CIPAPI.translations.translate('Save Signature')   + '</button>' +
        '    <button id="signature-reset"  type="button" class="btn btn-default signature-button"><span class="glyphicon glyphicon-refresh"></span>&nbsp;' + CIPAPI.translations.translate('Reset Signature')  + '</button>' +
        '    <button id="signature-cancel" type="button" class="btn btn-default signature-button"><span class="glyphicon glyphicon-remove"></span>&nbsp;'  + CIPAPI.translations.translate('Cancel Signature') + '</button>' +
        '  </div>' +
        '</div>'
      ).appendTo(document.body);
      
      $('.signature-block').jSignature({
        'background-color': 'transparent',
             'decor-color': 'transparent',
               'lineWidth': CIPAPI.usersettings.signatureWidth.current
      });
      
      $('#signature-save').on('click', function(e) {
        log.debug('Save');
        CIPAPI.signature.svgURL = $('.signature-block').jSignature('getData', 'svgbase64');
        CIPAPI.signature.pngURL = $('.signature-block').jSignature('getData', 'image');
        $('.modal-backdrop').remove();
        if (cb) cb(CIPAPI.signature);
      });
      
      $('#signature-cancel').on('click', function(e) {
        log.debug('Cancel');
        $('.modal-backdrop').remove();
      });

      $('#signature-reset').on('click', function(e) {
        log.debug('Reset');
        $('.signature-block').jSignature('reset');
      });
    }
    
    function displayMessage(message, cb) {
      $(
        '<div class="modal-backdrop">' +
        '  <div class="disclosure-window">' + 
        '    <div class="disclosure-content"></div>' +
        '  </div>' +
        '  <div class="signature-buttons text-center">' +
        '    <button id="signature-accept" type="button" class="btn btn-default signature-button"><span class="glyphicon glyphicon-thumbs-up"></span>&nbsp;'   + CIPAPI.translations.translate('Accept') + '</button>' +
        '    <button id="signature-deny"   type="button" class="btn btn-default signature-button"><span class="glyphicon glyphicon-thumbs-down"></span>&nbsp;' + CIPAPI.translations.translate('Reject') + '</button>' +
        '  </div>' +
        '</div>'
      ).appendTo(document.body);
      
      var html = converter.makeHtml(message);
      $('.disclosure-content').html(html);
      
      $('#signature-accept').on('click', function(e) {
        log.debug('Accept');
        $('.modal-backdrop').remove();
        if (cb) cb();
      });

      $('#signature-deny').on('click', function(e) {
        log.debug('Deny');
        $('.modal-backdrop').remove();
      });
    }
    
    if (message) {
      log.debug('Displaying message');
      displayMessage(message, function() {
        log.debug('Capturing after message');
        if (CIPAPI.signature.name === false) {
          bootbox.prompt(CIPAPI.translations.translate('Please Type Your Name'), function(name) {
            CIPAPI.signature.name = name;
            capture(cb);
          });        
        }
        else capture(cb);
      });
    } else {
      log.debug('No message, just capture');
      if (CIPAPI.signature.name === false) {
        bootbox.prompt(CIPAPI.translations.translate('Please Type Your Name'), function(name) {
          if (!name) return;
          if ($.trim(name) == '') return;

          CIPAPI.signature.name = name;
          capture(cb);
        });        
      }
      else capture(cb);
    }
  }
  
  // Apply forms behaviors
  $(document).on('cipapi-behaviors-apply-forms', function() { 
    $('div.cipform_signature_custom_field').each(function() {
      var outerDiv = $(this);
      var label = outerDiv.find('label').text();
      var container = outerDiv.find('> div');
      var textarea = outerDiv.find('textarea');
      
      var imgSrc = $.trim(textarea.val());
      if (imgSrc == '') {
        imgSrc = CIPAPI.config.applicationVersion == '[APPVERSION]' ? './no_signature.png' : './app/no_signature.png';
      }
      
      var image = $('<img src="' + imgSrc + '" class="cip-signature"></img>');
      container.prepend(image);
      
      var signBtn = $('<a class="btn btn-primary btn-lg btn-custom btn-signature" href="javascript: void(0)"><span class="glyphicon glyphicon-pencil"></span></a>');
      signBtn.on('click', function() {
        var captureSignature = function() {
          image.attr('src', CIPAPI.config.applicationVersion == '[APPVERSION]' ? './no_signature.png' : './app/no_signature.png');
          textarea.val('');
          
          CIPAPI.signature.name = false;

          if (outerDiv.hasClass('cipform_signature_currentuser')) {
            CIPAPI.signature.name = $.trim(CIPAPI.me.firstname + ' ' + CIPAPI.me.lastname);
          }
          
          if (outerDiv.hasClass('cipform_signature_currentfulluser')) {
            CIPAPI.signature.name = CIPAPI.me.fullname;
          }
          
          var template = '[[ ' + label + ' Signature Message ]]';
          CIPAPI.signature.capture(function() {
            var desiredWidth = 600;
            var desiredHeight = 48;
            var desiredRatio = desiredWidth / desiredHeight;
            log.debug('Desired: ' + desiredWidth + 'px / ' + desiredHeight + 'px (' + desiredRatio + ')');

            var loader = document.createElement('img');
            loader.addEventListener('load', function() {
              var realWidth = loader.width;
              var realHeight = loader.height;
              var realRatio = realWidth / realHeight;
              
              log.debug('Real: ' + realWidth + 'px / ' + realHeight + 'px (' + realRatio + ')');
              
              var finalWidth = 0;
              var finalHeight = 0;
              if (desiredRatio > realRatio) {
                // Resize to height and adjust width
                finalHeight = desiredHeight;
                finalWidth = finalHeight * realRatio;
              } else {
                // Resize to width and adjust height
                finalWidth = desiredWidth;
                finalHeight = finalWidth / realRatio;
              }
              
              log.info('Final: ' + finalWidth + 'px / ' + finalHeight + 'px');

              // We create a canvas and get its context.
              var canvas = document.createElement('canvas');
              var ctx = canvas.getContext('2d');

              // We set the dimensions at the wanted size.
              canvas.width = desiredWidth;
              canvas.height = desiredHeight;

              // We resize the image with the canvas method drawImage();
              ctx.drawImage(this, 0, 0, finalWidth, finalHeight);

              var now = new Date();
              var footer = CIPAPI.signature.name + ' - ' +
                ('0' + (now.getMonth() + 1)).slice(-2) + '/' +
                ('0' + now.getDate()).slice(-2) + '/' +
                now.getFullYear() + ' ' +
                ('0' + now.getHours()).slice(-2) + ':' +
                ('0' + now.getMinutes()).slice(-2) +
                (now.getHours < 12 ? 'AM' : 'PM');

              var ctx = canvas.getContext("2d");
              ctx.font = "bold 12px Courier";
              ctx.fillText(footer, desiredWidth / 3, desiredHeight - 4);
              
              var dataURI = canvas.toDataURL();
              image.attr('src', dataURI);
              textarea.val(dataURI);
            });
            loader.src = 'data:' + CIPAPI.signature.pngURL[0] + ',' + CIPAPI.signature.pngURL[1];
          }, CIPAPI.translations.translate(template) == template ? null : CIPAPI.translations.translate(template));
        }
        
        if (textarea.val() != '') {
          bootbox.confirm(CIPAPI.translations.translate('This will remove the current signature, are you sure?'), function(confirmed) {
            if (confirmed) {
              captureSignature();
            }
          });
        }
        else captureSignature();
      });
      
      container.prepend(signBtn);
    });
  });
  
})(window);
