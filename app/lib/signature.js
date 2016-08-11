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
      
      $('.signature-block').jSignature();
      
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
        capture(cb);
      });
    } else {
      log.debug('No message, just capture');
      capture(cb);
    }
  }
  
})(window);
