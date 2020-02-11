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

  var log = CIPAPI.logger.getLogger("CIPAPI.behaviors");

  // Helper function to debounce events by name and duration
  var debounceEventList = {};
  function debouncedEventIsAllowable(eventName, durationInMS) {
    if (durationInMS == 0) {
      return true;
    }
    
    if (typeof debounceEventList[eventName] == 'undefined') {
      debounceEventList[eventName] = 0;
    }
    
    var now = Date.now();
    var elapsed = now - debounceEventList[eventName];

    debounceEventList[eventName] = now;
    return elapsed > durationInMS;
  }
  
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
      if (false == debouncedEventIsAllowable('cipapi-behaviors-swipe-left-select-left-and-scroll-next', CIPAPI.config.swipeDebounce)) {
        log.warn('swipeleft event ignored due to debounce');
        return;
      }
      
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
      if (CIPAPI.usersettings.autoScrollInBehaviors.current == 'enabled') {
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
      if (false == debouncedEventIsAllowable('cipapi-behaviors-swipe-right-select-second-then-image-then-string', CIPAPI.config.swipeDebounce)) {
        log.warn('swipeleft event ignored due to debounce');
        return;
      }
      
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
          // Scroll ourselves to the top just to help out
          if (CIPAPI.usersettings.autoScrollInBehaviors.current == 'enabled') {
            $('html, body').delay(500).animate({
              scrollTop: $(me).offset().top - $('div.navbar').height()
            }, 500);
          }
        });
      } else {
        // If a single item scroll to top of next element assuming this is a data 
        // capture type yes / no question
        if (CIPAPI.usersettings.autoScrollInBehaviors.current == 'enabled') {
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
      if (false == debouncedEventIsAllowable('cipapi-behaviors-swipe-right-select-next-right-image-then-string-if-three', CIPAPI.config.swipeDebounce)) {
        log.warn('swipeleft event ignored due to debounce');
        return;
      }
      
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
        
        if (elements.length > 2 && $(elements[2]).prop('checked') === true) {
          log.debug("Already far right actioned, taking no further action");
          return;
        }
        
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
            // Scroll ourselves to the top just to help out
            if (CIPAPI.usersettings.autoScrollInBehaviors.current == 'enabled') {
              $('html, body').delay(500).animate({
                scrollTop: $(me).offset().top - $('div.navbar').height()
              }, 500);
            }
          });
        } else {
          log.debug("Not taking far right actions")
          // Scroll ourselves to the top just to help out
          if (CIPAPI.usersettings.autoScrollInBehaviors.current == 'enabled') {
            $('html, body').delay(500).animate({
              scrollTop: $(me).offset().top - $('div.navbar').height()
            }, 500);
          }
        }
      } else {
        // If a single item scroll to top of next element assuming this is a data 
        // capture type yes / no question
        if (CIPAPI.usersettings.autoScrollInBehaviors.current == 'enabled') {
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

  // *.cipapi-behaviors-click-right-then-image
  //
  // For any element with this class, which has 3 state radios, on the first right
  // click (severe) of any radio group, launch the camera.  Basically the first time
  // you make something severe within a group launch the camera.
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
  
  // *.cipapi-behaviors-remember-field-value-by-field-name
  //
  // For any element with this class, use onchange to capture and store field changes and
  // always restore the last value to this field on a new form load.
  CIPAPI.behaviors.forms.rememberFieldValueByFieldName = function() {
    $('.cipapi-behaviors-remember-field-value-by-field-name div input.form-control').each(function() {
      var field = $(this);
      var fieldName = field.attr('name');
      var fieldValue = CIPAPI.storage.getItem('cipapi-behaviors-remember-field-value-by-field-name - ' + fieldName);
      if (false !== fieldValue) {
        field.val(fieldValue);
        log.debug('Rememebred field value: ' + fieldName + ' <- ' + fieldValue);
      }
    }).on('change', function() {
      var field = $(this);
      var fieldName = field.attr('name');
      var fieldValue = field.val();
      CIPAPI.storage.setItem('cipapi-behaviors-remember-field-value-by-field-name - ' + fieldName, fieldValue);
      log.debug('Remembering field value: ' + fieldName + ' -> ' + fieldValue);
    });
  }
  
  // *.cipform_image_from_camera *.cipform_image_from_library
  //
  // For any element with this class, set attributes for image width, height, and quality
  CIPAPI.behaviors.forms.applyImageMaxSizeAndQualityAttributes = function() {
    var sizes   = CIPAPI.usersettings.maxImageSize.current.split(',');
    
    var quality = parseInt(CIPAPI.usersettings.imageQuality.current, 10);
    var width   = parseInt(sizes[0]);
    var height  = parseInt(sizes[1]);
    
    log.debug('Setting image size and quality attributes: ' + width + '/' + height + ' (' + quality + ')');
    
    $('.cipform_image_from_camera, .cipform_image_from_library').each(function() {
      $(this).attr('data-max-height', height);
      $(this).attr('data-max-width', width);
      $(this).attr('data-quality', quality);
    });
  }

  CIPAPI.behaviors.forms.generateBCAPTenanFileReview = function() {
    log.debug('Setting Tenant File Review configuration');
    $('.cipapi-behaviors-tenant-file-review').each(function (o, el) {
      var tfrPlaceholder = $(this);
      var cachedVal = tfrPlaceholder.find($("input")).first().val();
      var fieldsDefinition = null;
      if (cachedVal !== '') {
        fieldsDefinition = JSON.parse(cachedVal);
        $.each(fieldsDefinition.formulas, function(i, v) {
          if (v.hasOwnProperty('callback')) v.callback = eval("(" + v.callback + ")");
        });
        $.each(fieldsDefinition.input, function(i, v) {
          if (v.hasOwnProperty('schema')) {
            $.each(v.schema, function(i, f) {
              if (f.hasOwnProperty('callback')) f.callback = eval("(" + f.callback + ")");
            });
          }
        });
      } else {
       fieldsDefinition = {'input': {}, 'output': {}, 'formulas': {}};
      }
      tfrPlaceholder.children().hide();
      
      // Group callbacks by trigger field or they won't run.
      var callbackMapping = {};

      // Get our containers ready
      var masterForm = $('<div></div>');
      var results = $(
        '<div>' +
          '<h4 class="page-header text-center"><strong>Results</strong></h4>' +
          '<div class="row">' + 
            '<h5 class="col-xs-9"><strong><u>Maximum Income Limits</u></strong></h5>' +
            '<button style="margin-top:5px" class="small btn btn-sm btn-primary list-collapser">More</button>' +
          '</div>' +
          '<div id="max-income-limit-lists" class="row"></div>' +
          '<div class="row">' + 
            '<h5 class="col-xs-9"><strong><u>Maximum Gross Rent Limits</u></strong></h5>' +
            '<button style="margin-top:5px" class="small btn btn-sm btn-primary list-collapser">More</button>' +
          '</div>' +
          '<div id="max-gross-rent-limit-lists" class="row"></div>' +
        '</div>'
      );
      tfrPlaceholder.append(masterForm);
      
      $.each(fieldsDefinition.input, function(key, field) {
        var input = field['type'] === 'group' ? getGroupElements(key, field) : getFieldHTML(key, field);

        var sectionName = field.hasOwnProperty('section') ? field['section'].split(' ').join('-').toLowerCase() : 'General';
        field['section'] = field.hasOwnProperty('section') ? field['section'] : 'General';
        var section = false;
        if ($('#section-' + sectionName).length === 0) {
          section = $('<div id="section-'+ sectionName +'"><h4 class="page-header">'+ field['section'] +'</h4></div>');
          masterForm.append(section);
        } else {
          section = $('#section-' + sectionName);
        }
        section.append(input);
        // Allow formulas to work on the contents of groups so they can perform aggregations based on the values present in all of them
        if (field['type'] === 'group') {
          var trigger = key.replace(/_/g, '-');
          var timeout = null;
          $('#' + key).on('change', function() { 
            clearTimeout(timeout);
            timeout = setTimeout(function() {$(document).trigger('cipapi-behaviors-' + trigger)}, 250);
          });
        }
      });
      masterForm.append(results); // Append after input fields are generated
      
      // Catch events to handle reactivity on formula fields based on input.
      $.each(fieldsDefinition.formulas, function(key, field) {
        var input = getFieldHTML(key, field);
        results.append(input);
        mapEventTriggers(field)
      });
      
      // Trigger an initial update from our fields
      insertInputVals(fieldsDefinition.input);
      insertInputVals(fieldsDefinition.formulas);

      // Formula fields defined in the fieldsDefinition will reference this function
      function setFormulaValue(key, value, formatCallback) {
        fieldsDefinition.output[key] = value;
        if (formatCallback) {value = formatCallback(value);} 
        $('#' + key).val(value).trigger('change'); // Only apply the formatter to the HTML input for display purposes
      }

      function mapEventTriggers(field) {
        $.each(field.listens, function(i, v) {
          var trigger = v.replace(/_/g, '-');
          var eventKey = 'cipapi-behaviors-' + trigger;
          if (callbackMapping.hasOwnProperty(eventKey) === false) callbackMapping[eventKey] = [];
          callbackMapping[eventKey].push(field.callback.bind(field));
        });
      }

      function insertInputVals(schema, prepend) {
        $.each(schema, function(key, field) {
          if (field['type'] === 'group') {
            var related = fieldsDefinition.input.hasOwnProperty(key) ? fieldsDefinition.input[key].related : [];
            $.each(related, function(i, v) {
              insertInputVals(field.schema, v);
              var offset = fieldsDefinition.input[key].related.indexOf(v);
              if (offset === -1) fieldsDefinition.input[key].related.push(v);
            })
            $('#' + key).trigger('change');
          } else {
            key = typeof(prepend) !== 'undefined' ? prepend + '_' + key : key;
            var input = $('#' + key);
            var value = fieldsDefinition.output.hasOwnProperty(key) ? fieldsDefinition.output[key] : '';
            input.val(value).trigger('change');
          }
        });
      }

      function getGroupElements(key, field) {
        var output = $('#' + key).length === 0 ?
        $('<div id="'+ key +'" class="col-xs-12 input-group">'+
              '<label class="col-xs-12" style="padding:10px;background:#FAFAFA;">' + field['title'] + '</label>' +
              '<div class="group-container"></div>' +
              '<button data-key="'+ key +'" class="btn btn-success btn-xs col-xs-2 group-add" style="margin-bottom:20px">Add</button>'+
            '</div>') 
        : $('#' + key);
        var related = field.related.length ? field.related : fieldsDefinition.input.hasOwnProperty(key) ? fieldsDefinition.input[key].related : [];
        $.each(related, function(i, v) {
          if ($('#' + v).length === 0) {
            output.find('.group-container').append(getFieldHTML(v, field));
          } 
        });
        return output;
      }

      function evalMaxGrossRentLimit(event, baseValue) {
        return new Promise(function(resolve, reject) {
          var bedrooms = ['efficiency', 1, 2, 3, 4];
          var rentLimits = [25, 30, 40, 45, 50, 60]; // Percent Values
            
          $.each(rentLimits, function(key, value) {
            var factor = 0;
            $.each(bedrooms, function(index, content) {
              var id = content + '_bedroom_' + value + '_gross_rent_limit';
              var combination = fieldsDefinition.output[(index === 4 ? index+2 : index+1) + '_person_' + value + '_income_limit'];
              if (index % 2 !== 0 && index > 0) { // Uneven bedrooms combine 2 columns from max income table
                combination = (fieldsDefinition.output[(index+factor) + '_person_' + value + '_income_limit'] + fieldsDefinition.output[(index+factor+1) + '_person_' + value + '_income_limit']) / 2;
                factor++;
              }
              fieldsDefinition.output[id] = combination * 0.3 / 12;
              if ($("input[id=" + id + ']').length > 0) {
                $("input[id=" + id + ']').val(parseFloat(fieldsDefinition.output[id].toFixed(2)).toLocaleString());
              } else {
                var title = index !== 0 ? index + '  Bedroom' : 'Efficiency';
                var ul = $('#max-gross-rent-bedroom-' + (index+1)).length === 0 ? $('<ul class="row col-xs-12" id="max-gross-rent-bedroom-' + (index+1) + '"><h6 class="col-xs-12 small"><u><strong>' + title + '</strong></u></h6></ul>') : $('#max-gross-rent-bedroom-' + (index+1));
                var element = $('<li class="list-unstyled">' +
                                  '<label class="col-xs-6 small">' + value + '% Rent Limits</label>' +
                                  '<span class="col-xs-1"><strong>$</strong></span>' +
                                '</li>');
                var input = $('<input class="col-xs-4" type="text" id="' + id + '" value="' + parseFloat(fieldsDefinition.output[id].toFixed(2)).toLocaleString() + '" disabled="disabled">');
                $(element).append(input);
                $(ul).append(element);
                $('#max-gross-rent-limit-lists').append(ul);
                if (index+1 > 1) ul.hide();
              }
            });
          });
          storeFieldsDefinitionInField()
          resolve(true);
        });
      }

      function evalMaxIncomeLimit(event, baseValue) {
        return new Promise(function(resolve, reject) {
          // A secondary field may trigger this change so we check if we're overriding. If not use tha main field
          baseValue = fieldsDefinition.output['4_person_50_percent_override'] == '' ? fieldsDefinition.output['4_person_50_percent'].replace(/ *\([^)]*\) */g, '') : fieldsDefinition.output['4_person_50_percent_override'];
          var basePercent = 50;
          var people = [0.7, 0.8, 0.9, 1, 1.08, 1.16, 1.24, 1.32]; // 1 person, 2 person ... will skip #4 since it's our input
          var incomeLimits = [25, 30, 40, 45, 50, 60]; // Percent Values
    
          $.each(people, function(i, v) {
            var value = (baseValue * v);
            if (i !== 3) { // Person 4 is input field, skip calculation
              var remainder = value % basePercent;
              if (remainder) value = remainder >= basePercent / 2 ? value + (basePercent - remainder) : value - remainder + basePercent;
            }
            fieldsDefinition.output[(i+1) + '_person_' + basePercent + '_income_limit'] = value;
          });
    
          $.each(incomeLimits, function(key, value) {
            $.each(people, function(index, content) {
              var id = (index+1) + '_person_' + value + '_income_limit';
              fieldsDefinition.output[id] = (fieldsDefinition.output[(index+1) + '_person_' + basePercent + '_income_limit'] * ((value * 2) / 100));
              if ($("input[id=" + id + ']').length > 0) {
                $("input[id=" + id + ']').val(parseFloat(fieldsDefinition.output[id].toFixed(2)).toLocaleString());
              } else {
                var ul = $('#max-income-persons-' + (index+1)).length === 0 ? $('<ul class="row col-xs-12" id="max-income-persons-' + (index+1) + '"><h6 class="col-xs-12 small"><u><strong>' + (index+1) + ' Person</strong></u></h6></ul>') : $('#max-income-persons-' + (index+1));
                var element = $('<li class="list-unstyled">' +
                                  '<label class="col-xs-6 small">' + value + '% Income Limits</label>' +
                                  '<span class="col-xs-1"><strong>$</strong></span>' +
                                '</li>');
                var input = $('<input class="col-xs-4" type="text" id="' + id + '" value="' + parseFloat(fieldsDefinition.output[id].toFixed(2)).toLocaleString() + '" disabled="disabled">');
                $(element).append(input);
                $(ul).append(element);
                $('#max-income-limit-lists').append(ul);
                if (index+1 > 1) ul.hide();
              }
            });
          });
          storeFieldsDefinitionInField();
          resolve(true);
        });
      }

      function getFieldHTML(key, field) {
        var element = $('<div style="margin-bottom:5px"></div>');
        var title = $('<label>' + field['title'] + '</label>');
        var input = false;
        switch(field['type']) {
          case 'group':
            title = false;
            input = $('<div id="'+ key +'" style="margin-top:10px;background:#FAFAFA;padding:10px;">' +
                        '<div class="row"><button style="margin:0 15px;" class="group-remove btn btn-xs btn-danger pull-right">Remove</button></div>' +
                      '</div>');
            $.each(field.schema, function(i,v) {
              var child = getFieldHTML(key + '_' + i, v);
              if (v.hasOwnProperty('listens')) { // Map callbacks for fields within a group
                var clonedChild = Object.assign({}, v);
                clonedChild.listens = clonedChild.listens.map(function(el) {if (field.schema.hasOwnProperty(el)) {return key + '_' + el;} return el;});
                clonedChild.parentKey = key;
                mapEventTriggers(clonedChild);
              }
              input.append(child);
            });
            break;
          case 'select': 
            input = $('<select class="col-xs-12 form-control" id="' + key + '"><option></option></select>');
            $.each(field.enum, function(i,v) {
              var child = $('<option value="' + v + '">' + v + '</option>');
              input.append(child);
            });
            break;
          case 'readonly':
            input = $('<input class="col-xs-12 form-control" type="' + field['type'] + '" id="' + key + '" disabled="disabled">');
            break;
          case 'hidden':
            title = false;
            input = $('<input class="col-xs-12 form-control" type="' + field['type'] + '" id="' + key + '" style="display:none">');
            break;
          case 'date':
            input = $('<div class="cipform-datetime-date"><input class="col-xs-12 form-control" type="text" id="' + key + '"></div>');
            break;
          default:
            input = $('<input class="col-xs-12 form-control" type="' + field['type'] + '" id="' + key + '">');
        }
        element.append(title);
        element.append(input);
        setOnChangeTriggerForInput(input, key);
        return element;
      }

      function setOnChangeTriggerForInput(input, key) {
        var timeout = null;
        input.on('keyup change dp.change', function(event) {
          clearTimeout(timeout);
          timeout = setTimeout(function () {
            if (input.hasClass('cipform-datetime-datetime') || input.hasClass('cipform-datetime-date') || input.hasClass('cipform-datetime-time')) input = $(input.children()[0]); // Default to first child for date fields
            fieldsDefinition.output[key] = input.val();
            storeFieldsDefinitionInField();
            $(document).trigger('cipapi-behaviors-' + key.replace(/_/g, '-'), input.val());
          }, 200);
        });
      }

      // Save the changes from calculations into our input field
      function storeFieldsDefinitionInField() {
        tfrPlaceholder.find('input').first().val(JSON.stringify(fieldsDefinition, function(key, value) {
          return typeof value === 'function' ? value.toString() : value;
        }));
      }

      // Generate our event handlers from our callback mapping, we need to keep the off() call to clean our event listeners
      function processCallbackMappings() {
        $.each(callbackMapping, function(i, callbacks) {
          $(document).off(i);
          $.each(callbacks, function(o, v) {
            $(document).on(i, v);
          });
        });
        // Bind date and time pickers to the picker dialog. 
        // We happen to generate a custom form that will use date fields so we need to load this here since we don't
        // use the standard CIPAPI.forms.Render method... Extracted from CIPAPI/forms
        if ($().datetimepicker) {
          if (typeof formSelector === 'undefined') var formSelector = 'form.form-cip-reporting';
          // Put the buttons on these bad boys...
          $([ formSelector + ' .cipform-datetime-datetime input',
              formSelector + ' .cipform-datetime-time input',
              formSelector + ' .cipform-datetime-date input'
            ].join(', ')).each(function() {
            var inp = $(this);
            inp.parent().addClass('input-group date');
            inp.after('<span class="input-group-addon"><span class="glyphicon glyphicon-calendar"></span></span>');
          });
          
          $(formSelector + ' .cipform-datetime-datetime input').each(function() {
            $(this).parent().datetimepicker({
              showTodayButton: true,
                  focusOnShow: false,
                    showClose: true,
                    showClear: true,
                      format: 'YYYY-MM-DD HH:mm:ss Z'
            });
          });

          $(formSelector + ' .cipform-datetime-time input').each(function() {
            $(this).parent().datetimepicker({
              showTodayButton: true,
                  focusOnShow: false,
                    showClose: true,
                    showClear: true,
                      format: 'HH:mm:ss'
            });
          });

          $(formSelector + ' .cipform-datetime-date input').each(function() {
            $(this).parent().datetimepicker({
              showTodayButton: true,
                  focusOnShow: false,
                    showClose: true,
                    showClear: true,
                      format: 'YYYY-MM-DD'
            });
          });
        }
      }

      // Buttons available in each new group need to have their listener added since these
      // elements did not exist when the form was render, thus not hooked.
      function hookEventListenersOnGroupButtons() {
        $(".group-remove").off('click').on('click', function (e) {
          e.preventDefault();
          var groupKey = $(this).parent().parent().attr('id');
          var parentKey = $(this).parent().parent().parent().parent().parent().attr('id');
          // Delete from our output
          $.each(fieldsDefinition.input[parentKey].schema, function(i, v) {
            delete fieldsDefinition.output[groupKey + '_' + i];
          });
          // Delete from our input relationship
          var offset = fieldsDefinition.input[parentKey].related.indexOf(groupKey);
          if (offset >= 0) { fieldsDefinition.input[parentKey].related.splice(offset, 1) }
          // Trigger a recalculation
          $(this).trigger('change');
          $(this).parent().parent().parent().remove();
          storeFieldsDefinitionInField();
        });
      }

      $(".group-add").off('click').on('click', function (e) {
        e.preventDefault();
        var key = $(this).data('key');
        var random = Math.random().toString(36).substring(2, 15);
        var offset = fieldsDefinition.input[key].related.indexOf((key + '_' + random));
        if (offset === -1) fieldsDefinition.input[key].related.push((key + '_' + random));
        
        $.each(fieldsDefinition.input[key].schema, function(i, v) {
          fieldsDefinition.output[key + '_' + random + '_' + i] = '';
        });
        $('#' + key).append(getGroupElements(key, fieldsDefinition.input[key]));
        hookEventListenersOnGroupButtons();
        processCallbackMappings();
      }); 
      $(".list-collapser").off('click').on('click', function (e) {
        e.preventDefault();
        $(this).parent().next().children().not(':first').toggle();
        $(this).text($(this).text() == 'More' ? 'Less' : 'More');
      });

      // Some final touches
      hookEventListenersOnGroupButtons();
      processCallbackMappings();
    });
  }
  
  // Helper function to apply behaviors
  function applyBehaviors(behaviors) {
    $.each(behaviors, function(i, behavior) { 
      log.debug(i);
      behavior(); 
    });
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
    if (window.cordova && CIPAPI.usersettings.enableHapticFeedback.current == 'enabled') {
      log.debug("Haptic bzzzz - " + info);
      navigator.vibrate(25);
    } else {
      log.debug("Haptic disabled - " + info);
    }
  });
  
})(window);
