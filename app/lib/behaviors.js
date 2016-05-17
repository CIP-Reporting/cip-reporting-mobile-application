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

  var scrollEnabled = false;
  
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
    $('.cipapi-behaviors-radios-to-buttons label.radio').click(function(e) {
      e.preventDefault();
    }).each(function(e) {
      $(this).addClass('btn').find('span').attr('data-value', $(this).find('input').val());
    });
    
    // Right click / press (right click unselects)
    if (CIPAPI.device.hasRightClick()) {
      $('.cipapi-behaviors-radios-to-buttons label.radio').on('mousedown', function(e) {
        if (e.button == 2) { // Right click (press)
          var inp = $(this).find('input');
          if ($(inp).prop('checked')) {
            $(inp).prop('checked', false).change();
            $(document).trigger('cipapi-behaviors-haptic-feedback', 'CIPAPI.behaviors.forms.radiosToButtons (hold)');
          }
          return false;        
        }
      });
    } else {
      // Device does not support right click or press so use hammer.js press events
      $('.cipapi-behaviors-radios-to-buttons label.radio').hammer({}).bind('press', function(e) {
        var inp = $(this).find('input');
        if ($(inp).prop('checked')) {
          $(inp).prop('checked', false).change();
          $(document).trigger('cipapi-behaviors-haptic-feedback', 'CIPAPI.behaviors.forms.radiosToButtons (press)');
        }
        return false;        
      });
    }
    
    // Handle click
    $('.cipapi-behaviors-radios-to-buttons label.radio').on('click', function(e) {
      var $this = $(this);

      // Going to check if selected button is the leftmost button/input
      var firstBtnLabel = $this.parent().children().first().text();

      var inp = $this.find('input');
      if (!$(inp).prop('checked')) {
        $(inp).prop('checked', true).change();

        // Only give haptic feedback if not first button/input
        if ($this.text() !== firstBtnLabel)
          $(document).trigger('cipapi-behaviors-haptic-feedback', 'CIPAPI.behaviors.forms.radiosToButtons (click)');
      }
      return false;
    });
  }
  
  // *.cipapi-behaviors-swipe-left-select-left-and-scroll-next
  // 
  // For any element with this class, seek form element children and if visible
  // select the left most value and continue iterating form elements.  When complete
  // scroll to the next sibling of the container if available.
  CIPAPI.behaviors.forms.swipeLeftSelectLeftAndScroll = function() {
    $('.cipapi-behaviors-swipe-left-select-left-and-scroll-next').parent().hammer({}).bind('swipeleft', function(e) {
      // Disable per Customer Request
      // $(document).trigger('cipapi-behaviors-haptic-feedback', 'CIPAPI.behaviors.forms.swipeLeftSelectLeftAndScroll');

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
            elem.prop('checked', true).change();
          }
          
          if (inputType == 'text') {
            elem.val('');
          }
        }
        
        // TODO: Support other input types as needed such as selects
      });
      
      // Scroll to top of the next element
      if (scrollEnabled) {
        var nextSibling = $(this).next();
        if (nextSibling.length) {
          $('html, body').delay(500).animate({
            scrollTop: nextSibling.offset().top - $('div.navbar').height()
          }, 500);
        }
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
    $('.cipapi-behaviors-swipe-right-select-second-then-image-then-string').parent().hammer({}).bind('swiperight', function(e) {
      $(document).trigger('cipapi-behaviors-haptic-feedback', 'CIPAPI.behaviors.forms.swipeRightSelectSecondThenImageThenString');

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
            elem.prop('checked', true).change();
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
        $(me).find('a.cipform_image_from_camera').click();
        
        $(document).one('cipapi-forms-media-complete', function() {
          // Focus the last string based input if found
          //if (lastTextInput) lastTextInput.focus();

          // Scroll ourselves to the top just to help out
          if (scrollEnabled) {
            $('html, body').delay(500).animate({
              scrollTop: $(me).offset().top - $('div.navbar').height()
            }, 500);
          }
        });
      } else {
        // If a single item scroll to top of next element assuming this is a data 
        // capture type yes / no question
        if (scrollEnabled) {
          var nextSibling = $(this).next();
          if (nextSibling.length) {
            $('html, body').delay(500).animate({
              scrollTop: nextSibling.offset().top - $('div.navbar').height()
            }, 500);
          }
        }
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
  CIPAPI.behaviors.forms.swipeRightSelectNextRightImageThenStringIfThree = function() {
    $('.cipapi-behaviors-swipe-right-select-next-right-image-then-string-if-three').parent().hammer({}).bind('swiperight', function(e) {
      $(document).trigger('cipapi-behaviors-haptic-feedback', 'CIPAPI.behaviors.forms.swipeRightSelectNextRightImageThenStringIfThree');

      var numChanges = 0; var lastName = ''; var me = this; var lastTextInput = false; var farRight = false;
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
        
        if (elements.length > 2 && elem.prop('checked') === true) {
          farRight = true;
          elem = $(elements[2]);
        }
        
        var tagName = elem.get(0).tagName;
        if (tagName == "INPUT") {
          var inputType = elem.attr('type');
          if (inputType == 'radio' || inputType == 'checkbox') {
            elem.prop('checked', true).change();
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
        if (farRight) {
          log.debug("Taking far right actions")

          // Force image capture
          $(me).find('a.cipform_image_from_camera').click();
          
          $(document).one('cipapi-forms-media-complete', function() {
            // Focus the last string based input if found
            //if (lastTextInput) lastTextInput.focus();

            // Scroll ourselves to the top just to help out
            if (scrollEnabled) {
              $('html, body').delay(500).animate({
                scrollTop: $(me).offset().top - $('div.navbar').height()
              }, 500);
            }
          });
        } else {
          log.debug("Not taking far right actions")
          
          // Focus the last string based input if found
          //if (lastTextInput) lastTextInput.focus();

          // Scroll ourselves to the top just to help out
          if (scrollEnabled) {
            $('html, body').delay(500).animate({
              scrollTop: $(me).offset().top - $('div.navbar').height()
            }, 500);
          }
        }
      } else {
        // If a single item scroll to top of next element assuming this is a data 
        // capture type yes / no question
        if (scrollEnabled) {
          var nextSibling = $(this).next();
          if (nextSibling.length) {
            $('html, body').delay(500).animate({
              scrollTop: nextSibling.offset().top - $('div.navbar').height()
            }, 500);
          }
        }
      }
    });
  }

  CIPAPI.behaviors.forms.clickRightThenImage = function() {
    $('.cipapi-behaviors-click-right-then-image label.radio').on('click', function(e) {
      var $this      = $(this);
      var lastVal    = $this.parent().children().last().text();

      // Yes/No questions don't render camera; requires a 3 option question
      var numOptions = $this.parent().children().length;
      if ( numOptions < 3 ) { return; } 

      // Check the other btn group to see if already right clicked
      var $otherBtnGroup = $this.closest('.cipapi-behaviors-radios-to-buttons').siblings('.cipapi-behaviors-radios-to-buttons');
      var $lastRadioBtn  = $otherBtnGroup.find('*').filter(':input').filter(':visible').last();
      var isLastRadioBtnChecked = $lastRadioBtn.prop('checked') === true ? true : false;
      if ( isLastRadioBtnChecked ) { return; }

      if ($this.text() == lastVal) { 
        log.debug("Clicked right, capture photos");
        $this.closest('.cipapi-behavior-element-grouping-container').find('a.cipform_image_from_camera').click();
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
    $(document).trigger('cipapi-behaviors-haptic-feedback', 'cipapi-behaviors-button-click');
    
    $('div#loading').show();
  
    // A little deferment ...
    setTimeout(function() { info.callback(info);}, 250);
  });
  
  $(document).on('cipapi-routed', function(event, info) {
    $('div#loading').hide();
  });
  
  // Give the user a little tactile feedback
  $(document).on('cipapi-behaviors-haptic-feedback', function(event, info) {
    // Vibrate for a moment
    if (window.cordova) {
      navigator.vibrate(25);
    } else {
      log.warn("Haptic bzzzz - " + info);
    }
  });
  
})(window);
