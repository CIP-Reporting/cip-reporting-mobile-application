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
(function($, window, undefined) {

  if (typeof CIPAPI == 'undefined') CIPAPI = {};
  CIPAPI.forms = {};

  var log = log4javascript.getLogger("CIPAPI.forms");

  function equalizeElementSizes(selector) {
    var widest = 0;

    $(selector).each(function() {
      var elem = $(this);
      widest = Math.max(widest, elem.width());
    });

    widest += 10;
    
    $(selector).each(function() {
      var elem = $(this);
      elem.width(widest);
    });
  }
  
  CIPAPI.forms.b64toBlob = function(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      var slice = byteCharacters.slice(offset, offset + sliceSize);

      var byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      var byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    var blob = false;
    
    try {
      blob = new Blob(byteArrays, {type: contentType});
    } catch(err) {
      // TypeError old chrome and FF
      window.BlobBuilder = window.BlobBuilder || 
        window.WebKitBlobBuilder || 
        window.MozBlobBuilder || 
        window.MSBlobBuilder;
      
      if (window.BlobBuilder) {
        var bb = new BlobBuilder();
        bb.append(byteArrays);
        var blob = bb.getBlob(contentType);
      } else {
        log.error("Failed to find any method to create a blob");
      }
    }
    
    return blob;
  }  
  
  CIPAPI.forms.imageToDataURL = function(image) {
    var canvas    = $('<canvas />').get(0);
    canvas.width  = image.naturalWidth;
    canvas.height = image.naturalHeight;

    log.debug('Canvas dimensions: ' + canvas.width + ' / ' + canvas.height);

    var context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    
    return canvas.toDataURL();
  }
  
  CIPAPI.forms.AutoCompleteUSD = function() {
    var input = this;
    
    var tmp = input.value.replace(/^\$/, '');
    var pieces = tmp.split('.', 2);
    if (!pieces[1]) pieces[1] = '0';
    
    var front = parseInt(pieces[0].replace(/\D/g, ''), 10);
    if (isNaN(front)) front = 0;
    var back = parseInt(pieces[1].replace(/\D/g, ''), 10);
    if (isNaN(back)) back = 0;

    if (back > 99)
    {
      var tmp = '' + back;
      back = parseInt(tmp.substring(0, 2));
    }
    
    var fixed = '$' + front + '.';
    if (back < 10) fixed += '0';
    fixed += '' + back;

    input.value = fixed;  
  }
  
  CIPAPI.forms.hexToAscii = function(h) {
    var hex = h.toString(); // Force conversion
    var str = '';
    
    for (var i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    
    return str;
  }
  
  CIPAPI.forms.asciiToHex = function(a) {
    var arr = [];
  
    for (var i = 0, l = a.length; i < l; i ++) {
      var hex = Number(a.charCodeAt(i)).toString(16);
      arr.push(hex);
    }
  
    return arr.join('');    
  }

  CIPAPI.forms.calculatePercentageComplete = function(formDefinition, formValues, fieldDependencies) {
    // First build a map of form fields and values
    var fieldValueMap = {};
    $.each(formDefinition.form, function(key, obj) {
      if (!obj.key) return; // Non-input form elements have no key (like help text)
      fieldValueMap[obj.key] = formValues[obj.key] ? formValues[obj.key] : null;
    });
    
    var visibleFieldMap = CIPAPI.fielddeps.filterFieldValueMapByVisibleFields(fieldValueMap, fieldDependencies);
    
    var visibleFields = 0;
    var completedFields = 0;
    $.each(formDefinition.form, function(key, obj) {
      if (obj.htmlClass.match(/cipapi-behaviors-ignore-field-for-progress/)) return; // Not included...
      if (obj.htmlClass.match(/cipform_invisible/)) return; // Invisible...

      if (obj.type && obj.type == 'help') return; // No value for help fields
      if (obj.type && obj.type == 'null') return; // No value for null fields
      
      if (!obj.key) return; // No key, no consideration (non-input type form elements like help)
      
      if (typeof visibleFieldMap[obj.key] == 'undefined') return; // Not currently visible...
      
      visibleFields++;
      if (formValues[obj.key]) completedFields++;
    });
    
    return Math.floor(100 * (completedFields / visibleFields));
  }
  
  CIPAPI.forms.validate = function(jsonForm) {
    var results = jsonForm.validate();
    
    if (results.errors && results.errors.length > 0) {
      return false;
    }
    
    return true;
  }
  
  CIPAPI.forms.getValues = function(jsonForm) {
    var values = jsonForm.root.getFormValues();
    
    // If flatpickr is loaded
    if ($().flatpickr) {
      // When flatpickr is loaded we need to prepend the fake date component to just time fields
      for (var i=0; i<jsonForm.formDesc.form.length; i++) {
        if (!jsonForm.formDesc.form[i].htmlClass.match(/(cipform_justtime_custom_field|cipform_justtimenow_custom_field)/)) continue;
        
        var key = jsonForm.formDesc.form[i].key;
        if (values[key]) {
          values[key] = '1980-01-01 ' + values[key];
        }
      }
    }
    
    // Headers / Help fields do not pass back values but we need to
    for (var i=0; i<jsonForm.formDesc.form.length; i++) {
      if (jsonForm.formDesc.form[i].type != 'help') continue;
      
      var key = jsonForm.formDesc.form[i].helpkey;
      values[key] = jsonForm.formDesc.value[key];
    }
    
    return values;
  }
  
  CIPAPI.forms.validateAndGetValues = function(jsonForm) {
    return CIPAPI.forms.validate(jsonForm) ? CIPAPI.forms.getValues(jsonForm) : false;
  }
  
  CIPAPI.forms.Render = function(formDefinition, formSelector, editExisting) {
    // Default form selector
    if (!formSelector) formSelector = 'form.form-cip-reporting';

    var jsonForm = false;
    
    // If CIPAPI.fielddeps is loaded we need to assign onChange handlers
    if (CIPAPI.fielddeps) {    
      log.debug("Assigning field dependency onChange handlers");
      
      $(formDefinition.form).each(function (i, v) {
        if (formDefinition.form[i].type && formDefinition.form[i].type == 'submit') return; // Leave the submit button alone...
        
        formDefinition.form[i]['onChange'] = function(event, info) { 
          $(document).trigger('cipapi-fieldvalues-change', { 
            formDefinition: formDefinition,
              formSelector: formSelector,
              editExisting: editExisting,
              changeTarget: event.target,
                  jsonForm: jsonForm
          }); 
        }
      });
    }

    // If slimselect is loaded allow short width multi-selects
    if (typeof SlimSelect != 'undefined') {
      for (var i=0; i<formDefinition.form.length; i++) {
        if (!formDefinition.form[i].htmlClass.match(/cipform_multi_custom_field/)) {
          continue;
        }
        
        // Checkboxes were hard coded to full width no matter the field size but the original size is provided
        // in another class name.  Remove the hard coded full width and convert the requested to the correct
        // class names.
        formDefinition.form[i].htmlClass = formDefinition.form[i].htmlClass.replace(/col-md-12 /, '');
        formDefinition.form[i].htmlClass = formDefinition.form[i].htmlClass.replace(/cipform_requested_width_long/,  'col-md-12');
        formDefinition.form[i].htmlClass = formDefinition.form[i].htmlClass.replace(/cipform_requested_width_short/, 'col-md-6');
      }
    }    
    
    jsonForm = $(formSelector).jsonForm(formDefinition);
    $(formSelector).append($('<div class="clearfix"></div>'));

    // Store for later
    jsonForm.formSelector = formSelector;
    jsonForm.editExisting = editExisting;
    
    // If slim select is loaded after form creation we need to convert multi-selects into real
    // multi-selects and apply values accordingly.  Then we apply slim select behavior to all selects.    
    if (typeof SlimSelect != 'undefined') {
      function getAddNewClosure(container, i) {
        if (container.hasClass('cipform_cannotadd')) return false;
        
        return function(v) {
          if (formDefinition.schema[formDefinition.form[i].key].enum) {
            formDefinition.schema[formDefinition.form[i].key].enum.push(v);
          } else {
            formDefinition.schema[formDefinition.form[i].key].items.enum.push(v);
          }
          return v;
        }
      }
      
      for (var i=0; i<formDefinition.form.length; i++) {
        var container = $(formSelector + ' div.jsonform-error-' + formDefinition.form[i].key);

        if (!formDefinition.form[i].htmlClass.match(/cipform_multi_custom_field/)) {

          if (formDefinition.form[i].htmlClass.match(/(cipform_single_custom_field|cipform_singlerandom_custom_field)/)) {
            container.find('select option[value=""]').remove();
            
            if (formDefinition.form[i].htmlClass.match(/cipform_empty_value/)) {
              container.find('select option:selected').removeAttr('selected');
              container.find('select').prop('selectedIndex', -1);
            }
            
            new SlimSelect({ select: container.find('select')[0], allowDeselect: true, addable: getAddNewClosure(container, i) });
          }
          
          continue;
        }

        if (formDefinition.schema[formDefinition.form[i].key].enum) {
          formDefinition.schema[formDefinition.form[i].key].enum.push('');
        } else {
          formDefinition.schema[formDefinition.form[i].key].items.enum.push('');
        }

        var mainLabel   = container.find('> label');
        var childLabels = container.find('> div > div > label');

        var sel = $('<select multiple="multiple"></select>');
        sel.attr('id',    mainLabel.attr('for'));
        sel.attr('class', 'form-control');
        sel.attr('name',  mainLabel.attr('for').replace(/.*-/, '') + '[0]');

        $.each(childLabels, function(o) {
          var el = $(childLabels[o]);

          var name     = el.find('span').text();
          var value    = el.find('input').attr('name');
          var selected = el.find('input').attr('checked') == 'checked';
          
          var opt = $('<option></option>');
          opt.text(name);
          opt.attr('value', value);
          if (selected) opt.attr('selected', 'selected');
          opt.appendTo(sel);
        });

        container.find('> div > div > span').appendTo(container.find('> div'));
        container.find('> div > div').remove();
        sel.prependTo(container.find('> div'));
        
        new SlimSelect({ select: container.find('select')[0], placeholder: ' ', addable: getAddNewClosure(container, i), closeOnSelect: false });
      }
    }

    // Disable native browser form validation in HTML5
    $(formSelector).attr('novalidate', 'novalidate');
    
    // Before form validation and submit we must perform some actions

    // Give currency fields an auto-complete handler
    $(formSelector + ' div.cipform_currency_custom_field input').blur(CIPAPI.forms.AutoCompleteUSD);

    // If flatpickr is loaded
    if ($().flatpickr) {
      $(formSelector + ' .cipform-datetime-datetime input').flatpickr({ allowInput: true, enableTime: true,  dateFormat: 'Y-m-d H:i:S', time_24hr: true });
      $(formSelector + ' .cipform-datetime-date input'    ).flatpickr({ allowInput: true, enableTime: false, dateFormat: 'Y-m-d' });
      $(formSelector + ' .cipform-datetime-time input'    ).flatpickr({ allowInput: true, enableTime: true,  dateFormat: 'H:i:S', noCalendar: true, time_24hr: true });

      // When flatpickr is used we do not render the time zone - web application generally, but maybe mobile some day?  We will go and strip the time
      // zones off of read only and invisible time fields.  Further complicated by hidden fields not being wrapped in DIVs like other fields means 
      // we cann use selectors with our custom class names.  L.A.M.E.
      $(formSelector + ' .cipform_timero_custom_field input').each(function() { var el = $(this); el.val(el.val().replace(/ (\+|\-)\d\d:\d\d$/, '')); });
      for (var i=0; i<formDefinition.form.length; i++) {
        if (!formDefinition.form[i].htmlClass.match(/(cipform_invtime_custom_field|cipform_invtimenow_custom_field)/)) continue;
        
        var key = formDefinition.form[i].key;
        $(formSelector + ' input[name="' + key + '"]').each(function() { var el = $(this); el.val(el.val().replace(/ (\+|\-)\d\d:\d\d$/, '')); });
      }
    }
    
    // If summernote is loaded
    if ($().summernote) {
      // For rich text editing we have to initialize and also hook onto the submit button
      // and move the content back into the text area for validation and delivery.
      $(formSelector + ' div.cipform_richtext_custom_field textarea').summernote({ height: 300 });
      $(formSelector + ' :submit').click(function() { 
        // Take content from rich text editor back to the hidden textarea
        $(formSelector + 'div.cipform_richtext_custom_field textarea').each(function() {
          var e = $(this);
          this.innerHTML = e.code();
        });
      });
    }

    // If trumbowyg editor is loaded
    if ($().trumbowyg) {
      $(formSelector + ' div.cipform_richtext_custom_field textarea').trumbowyg({ 
         svgPath: '/lib/contrib/trumbowyg/ui/icons.svg',
        resetCss: true,
            btns: [ 
              [
                'formatting',    'strong',       'em',            'del',           'superscript', 
                'subscript',     'justifyLeft',  'justifyCenter', 'justifyRight',  'justifyFull', 
                'unorderedList', 'orderedList',  'removeformat' ],
              [ 'fullscreen' ]
            ]
      });
    }

    // Disable tab focus on readonly text areas
    $(formSelector + ' textarea[readonly], ' + formSelector + ' input[readonly]').attr('tabindex', '-1');
    
    // Bind date and time pickers to the picker dialog
    if ($().datetimepicker) {
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
    
    // Deal with selects that have no default value
    $(formSelector + ' .cipform_empty_value select').prop('selectedIndex', -1);

    // Apply auto-complete to fields with it defined
    if ($.fn.inlineComplete) {
      $.each(formDefinition['form'], function(key, val) {
        if (!val['autocomplete']) return;

        // Create a datalist if not already existing
        if (false && $('datalist#cip-' + val['key']).length == 0) {
          var datalist = $('<datalist></datalist>').attr('id', 'cip-' + val['key']);
          
          $.each(val['autocomplete'], function(index, value) {
            datalist.append($('<option></option>').attr('value', value));
          });
          
          $('body').append(datalist);
        }
        
        $(formSelector + ' input[name=' + val['key'] + ']').inlineComplete({ list: val['autocomplete'] });
      });
    }
    
    // Set default times and dates for new reports - on edit leave them alone...
    if (!editExisting) {
      var now = new Date();
      var yy = now.getFullYear();
      var mm = ('0' + (now.getMonth() + 1)).slice(-2);
      var dd = ('0' + now.getDate()).slice(-2);
      var hh = ('0' + now.getHours()).slice(-2);
      var ii = ('0' + now.getMinutes()).slice(-2);
      var ss = ('0' + now.getSeconds()).slice(-2);
      
      var utc = now.getTimezoneOffset(); // Minutes offset
      var gg = utc > 0 ? '-' : '+';
      var th = ('0' + Math.floor(utc / 60)).slice(-2);
      var tm = ('0' + (utc % 60)).slice(-2);
      var zone = ' ' + (utc == 0 ? 'Z' : (gg + th + ':' + tm));
      
      // If flatpickr is loaded do not render with time zones
      if ($().flatpickr) {
        zone = '';
      }
      
      var time = hh + ':' + ii + ':' + ss;
      var date = yy + '-' + mm + '-' + dd;
      var full = date + ' ' + time + zone;
      
      $(formSelector + ' .cipform_timenow_custom_field input').val(full);
      $(formSelector + ' .cipform_timenowro_custom_field input').val(full);
      $(formSelector + ' .cipform_invtimenow_custom_field input').val(full);
      $(formSelector + ' .cipform_justtimenow_custom_field input').val(time);
      $(formSelector + ' .cipform_justdatenow_custom_field input').val(date);
    }
    
    // Set the width of multi-select and radio group options to be equal so that if the CSS
    // floats the items they will line up like table cells
    equalizeElementSizes(formSelector + ' label.checkbox, ' + formSelector + ' label.radio');
    
    // Allow radios to deselect by clicking them
    $(formSelector + ' .cipform_radios label.radio input:radio:checked').data("chk", true);
    $(formSelector + ' .cipform_radios label.radio input:radio').click(function() {
      $("input[name='"+$(this).attr("name")+"']:radio").not(this).removeData("chk");
      $(this).data("chk",!$(this).data("chk"));
      $(this).prop("checked",$(this).data("chk"));
      $(this).button('refresh'); // in case you change the radio elements dynamically      
    });
    
    // A little debug help
    var debug = false;
    if (debug) {
      // Create a fake camera object for the required constants
      window.Camera = {
        PictureSourceType: { CAMERA: 'Camera', PHOTOLIBRARY: 'Library' },
          DestinationType: { FILE_URI: 1 },
             EncodingType: { JPEG: 1 }
      }
    }
    
    // If phonegap is loaded AND phonegap camera controls are available use it...
    if (debug == true || (window.cordova && window.navigator && window.navigator.camera)) {
      $(formSelector + ' div.cipform_invisible_custom_field input[type=file]').each(function() {
        // Put a media gallery into place
        var name      = $(this).attr('name');
        var container = $(this).closest('div.form-group');
        var fromCam   = $('<a class="cipform_image_from_camera"  href="javascript: void(0)">From Camera</a>');
        var fromLib   = $('<a class="cipform_image_from_library" href="javascript: void(0)">From Library</a>');
        var gallery   = $('<div class="form-cip-media-thumbnails"></div>');
        var clearfix  = $('<div style="clear: both;"></div>');
        var spinner   = $('<div id="form-cip-media-spinner" class="form-cip-media-container" style="display: none; width: ' + 
          CIPAPI.config.thumbMaxWidth + '; height: ' + CIPAPI.config.thumbMaxHeight + ';"><div></div></div>');

        container.append(fromCam).append(fromLib).append(gallery).append(spinner).append(clearfix);
        
        // Shared camera code
        function captureImage(btn, src) {
          if (!debug) {
            $('#form-cip-media-spinner').show();
            log.debug("Showing spinner");
          }
          
          var cameraOptions = {
               destinationType: Camera.DestinationType.FILE_URI,
                 encodingType : Camera.EncodingType.JPEG,
            correctOrientation: true,
                    sourceType: src
          }

          // Set a max width and height if specified in the button attributes          
          var maxHeight = $(btn).attr('data-max-height');
          var maxWidth = $(btn).attr('data-max-width');
          if (typeof maxHeight != 'undefined' && typeof maxWidth != 'undefined') {
            log.debug('Setting image max to ' + maxWidth + '/' + maxHeight);
            cameraOptions.targetHeight = parseInt(maxHeight, 10);
            cameraOptions.targetWidth = parseInt(maxWidth, 10);
          }

          // Set quality if specified in the button attributes          
          var quality = $(btn).attr('data-quality');
          if (typeof quality != 'undefined') {
            log.debug('Setting image quality to ' + quality);
            cameraOptions.quality = parseInt(quality, 10);
          }
          
          // If debugging in a browser do not attempt to capture a picture
          if (debug) {
            alert('Image capture would be initiated from ' + src);
            return;
          }
          
          navigator.camera.getPicture(
            // On Success
            function(imageURI) {
              // Display on screen
              var fileName = imageURI.substring(imageURI.lastIndexOf('/') + 1);
              log.debug("Capturing image: " + fileName);
              
              var div = $('<div data-toggle="tooltip" data-placement="bottom" class="form-cip-media-container" style="width: ' + CIPAPI.config.thumbMaxWidth + '; height: ' + CIPAPI.config.thumbMaxHeight + ';"></div>');
              var img = $('<img data-scale="best-fit" />');
              div.tooltip({ title: fileName });
              container.find('div.form-cip-media-thumbnails').append(div.append(img));
              
              log.debug("Setting image src: " + imageURI);
              img.attr('src', imageURI).on('load', function() {
                log.debug("Hiding spinner");
                $('#form-cip-media-spinner').hide();
              });
              
              log.debug("Scaling image");
              img.imageScale();
              
              // Also let the world know...
              log.debug("Sending notification");
              $(document).trigger('cipapi-forms-media-added', {
                 imageURI: imageURI,
                 fileName: fileName,
                 formName: name,
                timeStamp: Math.floor(Date.now() / 1000)
              });

              $(document).trigger('cipapi-forms-media-complete');
            },
            
            // On Error
            function(msg) {
              log.error(msg);
              $('#form-cip-media-spinner').hide();
              $(document).trigger('cipapi-forms-media-complete');
            },
            
            // Options
            cameraOptions
          );
        };
        
        // From the camera
        fromCam.on('click', function() { captureImage(this, Camera.PictureSourceType.CAMERA); });

        // From the library
        fromLib.on('click', function() { captureImage(this, Camera.PictureSourceType.PHOTOLIBRARY); });

        $(this).remove(); // Nuke the file input all together...
      });
    }
    
    // Setup AJAX image upload handlers if browser is capable, else hide any file upload inputs
    var formData = window.FormData ? new FormData() : false;
    if (formData) {
      $(formSelector + ' div.cipform_invisible_custom_field input[type=file]').each(function() {
        var name = $(this).attr('name');
        // Put a media gallery into place
        var container = $(this).closest('div.form-group');
        container.append('<div class="form-cip-media-thumbnails"></div><div style="clear: both;"></div>');

        this.addEventListener("change", function (evt) {
          var len = this.files.length;

          for (var i=0; i<len; i++) {
            var file = this.files[i];

            if (window.FileReader) {
              var reader = new FileReader();
              reader.onloadend = function (e) {
                var div = $('<div data-toggle="tooltip" data-placement="bottom" class="form-cip-media-container" style="width: ' + CIPAPI.config.thumbMaxWidth + '; height: ' + CIPAPI.config.thumbMaxHeight + ';"></div>');
                var img = $('<img data-scale="best-fit" />');
                img.attr('src', file.type.match(/image.*/) ? e.target.result : 'attachment.png');
                
                container.find('div.form-cip-media-thumbnails').append(div.append(img));
                img.imageScale();
                div.tooltip({ title: file.name });
                
                // Also let the world know...
                $(document).trigger('cipapi-forms-media-added', {
                    imageURI: e.target.result, // Data URL
                    fileName: file.name,
                    formName: name,
                   timeStamp: Math.floor(Date.now() / 1000)
                });

              };
              reader.readAsDataURL(file);
            }
            
            formData.append("file[]", file, file.name);
          }
        });
      });
    } else {
      // Remove file upload controls, they will not work...
      $(formSelector + ' input[type=file]').closest('div.form-group').remove();
    }

    // If CIPAPI.fielddeps is loaded we need to fire the dependency engine on form initialization
    if (CIPAPI.fielddeps) {    
      log.debug("Firing initial field value change for field dependencies");
      
      $(document).trigger('cipapi-fieldvalues-change', {
        formDefinition: formDefinition,
          formSelector: formSelector,
          editExisting: editExisting,
          changeTarget: false,
              jsonForm: jsonForm
      });
    }
  
    return jsonForm;
  }
})(jQuery, window);
