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
  CIPAPI.forms = {};

  var log = log4javascript.getLogger("CIPAPI.forms");

  function equalizeElementSizes(selector) {
    var widest = 0;

    $(selector).each(function() {
      var elem = $(this);
      widest = Math.max(widest, elem.width());
    });

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

    jsonForm = $(formSelector).jsonForm(formDefinition);
    $(formSelector).append($('<div class="clearfix"></div>'));
    
    // Before form validation and submit we must perform some actions

    // Give currency fields an auto-complete handler
    $(formSelector + ' div.cipform_currency_custom_field input').blur(CIPAPI.forms.AutoCompleteUSD);
    
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
      var zone = utc == 0 ? 'Z' : (gg + th + ':' + tm);
      
      var time = hh + ':' + ii + ':' + ss;
      var date = yy + '-' + mm + '-' + dd;
      var full = date + ' ' + time + ' ' + zone;
      
      $(formSelector + ' .cipform_timenow_custom_field input').val(full);
      $(formSelector + ' .cipform_timenowro_custom_field input').val(full);
      $(formSelector + ' .cipform_invtimenow_custom_field input').val(full);
      $(formSelector + ' .cipform_justtimenow_custom_field input').val(time);
      $(formSelector + ' .cipform_justdatenow_custom_field input').val(date);
    }
    
    // Set the width of multi-select and radio group options to be equal so that if the CSS
    // floats the items they will line up like table cells
    equalizeElementSizes(formSelector + 'div.cipform_multi_custom_field label.checkbox');
    equalizeElementSizes(formSelector + 'div.cipform_check_m_custom_field label.checkbox');
    equalizeElementSizes(formSelector + 'div.cipform_check_s_custom_field label.checkbox');
    equalizeElementSizes(formSelector + 'div.cipform_check_a_custom_field label.checkbox');
    equalizeElementSizes(formSelector + 'div.cipform_radio_custom_field label.radio');
    
    // If phonegap is loaded AND phonegap camera controls are available use it...
    if (window.cordova && window.navigator && window.navigator.camera) {
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
        function captureImage(src) {
          $('#form-cip-media-spinner').show();
          log.debug("Showing spinner");
          
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
            {
                 destinationType: Camera.DestinationType.FILE_URI,
                   encodingType : Camera.EncodingType.JPEG,
              correctOrientation: true,
                      sourceType: src
            }
          );
        };
        
        // From the camera
        fromCam.on('click', function() { captureImage(Camera.PictureSourceType.CAMERA); });

        // From the library
        fromLib.on('click', function() { captureImage(Camera.PictureSourceType.PHOTOLIBRARY); });

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
  }
})(window);
