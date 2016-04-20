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
  CIPAPI.behaviors = { forms: {} };

  var log = log4javascript.getLogger("CIPAPI.behaviors");

  // Certain styles can be injected onto the form definitions that drive us to make changes
  // to the page.  This allows for servers to generate forms with some customizations on a per
  // customer basis.  This is extensible assuming new releases of the mobile application.

  // *.cipapi-behaviors-prepend-p-element
  //
  // For any element with this class, prepend a P element into the first help block
  // Useful for styling / push / pull / etc.
  CIPAPI.behaviors.forms.prependPElement = function() {
    $('.cipapi-behaviors-prepend-p-element-first-help').each(function() {
      $(this).find('span.help-block:eq(0)').each(function() { 
        $('<p class="cipapi-behaviors-prepend-p"></p>').prependTo($(this)); 
      })
    });
  }
  
  // *.cipapi-behaviors-element-grouping
  //
  // For any element with this class, grab this elements and its next siblings which do not
  // have this class and place them into a grouping div.
  CIPAPI.behaviors.forms.fieldGroupings = function() {
    $('.cipapi-behaviors-element-grouping').each(function() {
      var wrapperDiv = $('<div class="cipapi-behavior-element-grouping-container"></div>');
      wrapperDiv.insertBefore(this);
      $(this).nextUntil(".cipapi-behaviors-element-grouping").appendTo(wrapperDiv);
      $(this).prependTo(wrapperDiv);
    });
  }
  
  // *.cipapi-behaviors-radios-to-buttons
  //  
  // For any element with this class, seek radio labels and conver them to buttons
  CIPAPI.behaviors.forms.radiosToButtons = function() {
    $('.cipapi-behaviors-radios-to-buttons label.radio').each(function() {      
      $(this).addClass('btn').on('taphold', function(e) {
        $(this).find('input').val([]).change(); 
        $(document).trigger('cipapi-behaviors-haptic-feedback');
      }).find('span').attr('data-value', $(this).find('input').val());
    });
  }
  
  // *.cipapi-behaviors-swipe-left-select-left-and-scroll-next
  // 
  // For any element with this class, seek form element children and if visible
  // select the left most value and continue iterating form elements.  When complete
  // scroll to the next sibling of the container if available.
  CIPAPI.behaviors.forms.swipeLeftSelectLeftAndScroll = function() {
    $('.cipapi-behaviors-swipe-left-select-left-and-scroll-next').parent().on('swipeleft', function(e) {
      $(document).trigger('cipapi-behaviors-haptic-feedback');

      var lastName = '';
      $(this).find('*').filter(':input').each(function() {
        var elem = $(this);
        
        // Radio groups only work on first element
        var currentName = elem.attr('name');
        if (currentName == lastName) return;
        lastName = currentName;
        
        // Make sure the element is visible
        if (elem.is(':hidden') == true) return;
        
        var tagName = elem.get(0).tagName;
        if (tagName == "INPUT") {
          var inputType = elem.attr('type');
          if (inputType == 'radio' || inputType == 'checkbox') {
            elem.click().change();
          }
          
          if (inputType == 'text') {
            elem.val('');
          }
        }
        
        // TODO: Support other input types as needed such as selects
      });
      
      // Scroll to top of the next element
      var nextSibling = $(this).next();
      if (nextSibling.length) {
        $('html, body').delay(500).animate({
          scrollTop: nextSibling.offset().top - $('div.navbar').height()
        }, 500);
      }
    });
  }
  
  // *.cipapi-behaviors-swipe-right-select-second-then-image-then-string
  // 
  // For any element with this class, seek form element children and if visible
  // find the first two inputs of the same form name and use the last one found
  // which is typically the second, but can be the first if only one is available.
  // Select that item and move to the next visible form element.  When done, if
  // more than 2 changes were made assume we need to capture photos and notes;
  // Issue a media capture, and when done with that, focus the last string element.
  CIPAPI.behaviors.forms.swipeRightSelectSecondThenImageThenString = function() {
    $('.cipapi-behaviors-swipe-right-select-second-then-image-then-string').parent().on('swiperight', function(e) {
      $(document).trigger('cipapi-behaviors-haptic-feedback');

      var numChanges = 0; var lastName = ''; var me = this; var lastTextInput = false;
      $(this).find('*').filter(':input').each(function() {
        var elem = $(this);
        
        // Radio groups only work on first element
        var currentName = elem.attr('name');
        if (currentName == lastName) return;
        lastName = currentName;
        
        // Go get the FIRST or SECOND VISIBLE form element with the same name - prefers the SECOND
        var elements = $(me).find('*').filter(':input').filter(':visible').filter('[name="' + currentName + '"]');
        if (elements.length == 0) return;
        elem = $(elements.length > 1 ? elements[1] : elements[0]);
        
        var tagName = elem.get(0).tagName;
        if (tagName == "INPUT") {
          var inputType = elem.attr('type');
          if (inputType == 'radio' || inputType == 'checkbox') {
            elem.click().change();
            numChanges++;
          }
          
          if (inputType == 'text') { // Keep for later
            lastTextInput = elem;
          }
        }
        
        // TODO: Support other input types as needed such as selects
      });
      
      // If number of changes is greater than 1, we need to capture photos and notes
      if (numChanges > 1) {
        // Force image capture
        $(this).find('a.cipform_image_from_camera').click();
        
        // Focus the last string based input if found
        if (lastTextInput) lastTextInput.focus();

        // Scroll ourselves to the top just to help out
        $('html, body').delay(500).animate({
          scrollTop: $(this).offset().top - $('div.navbar').height()
        }, 500);
      } else {
        // If a single item scroll to top of next element assuming this is a data 
        // capture type yes / no question
        var nextSibling = $(this).next();
        if (nextSibling.length) {
          $('html, body').delay(500).animate({
            scrollTop: nextSibling.offset().top - $('div.navbar').height()
          }, 500);
        }
      }
    });
  }
  
  // Helper function to apply behaviors
  function applyBehaviors(behaviors) {
    $.each(behaviors, function(i, behavior) { behavior(); });
  }
  
  // Apply forms behaviors
  $(document).on('cipapi-behaviors-apply-forms', function() { applyBehaviors(CIPAPI.behaviors.forms); });
  
  $(document).on('cipapi-behaviors-button-click', function(event, info) {
    $(document).trigger('cipapi-behaviors-haptic-feedback');
    
    info.button.find('span.glyphicon').each(function() {
      this.className = 'glyphicon glyphicon-refresh cipapi-behaviors-glyph-spin';
    });
    
    // A little deferment ...
    setTimeout(function() { info.callback(info);}, 250);
  });
  
})(window);
