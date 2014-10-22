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
  
  CIPAPI.forms.Render = function(formDefinition, formSelector) {
    // Default form selector
    if (!formSelector) formSelector = 'form.form-cip-reporting';
    
    $(formSelector).jsonForm(formDefinition);
    $(formSelector).append($('<div class="clearfix"></div>'));
    
    // Before form validation and submit we must perform some actions
    //
    // Fire the date filters on all date fields by forcing the blur event on them
    // because rich HTML5 date fields never fire the onblur leaving the validation
    // pattern to fail if the device doesn't happen to use the identical pattern.
    //
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

    // Bind date and time pickers to the picker dialog ... must make fields read only
    // to stop virtual keyboards from popping open!
    $(formSelector + ' .cipform-datetime-datetime input').datetimepicker({
         showAnim: '',
      controlType: 'select',
       dateFormat: "yy-mm-dd",
       timeFormat: "HH:mm:ss Z",
       beforeShow: function() { $(document).trigger('cipapi-datepicker-show', 'datetime'); },
          onClose: function() { $(document).trigger('cipapi-datepicker-hide', 'datetime'); }
    }).prop('readonly', 'readonly').addClass('cipapi-fau-read-only');
    
    $(formSelector + ' .cipform-datetime-time input').timepicker({
         showAnim: '',
      controlType: 'select',
       timeFormat: "HH:mm:ss",
       beforeShow: function() { $(document).trigger('cipapi-datepicker-show', 'time'); },
          onClose: function() { $(document).trigger('cipapi-datepicker-hide', 'time'); }
    }).prop('readonly', 'readonly').addClass('cipapi-fau-read-only');

    $(formSelector + ' .cipform-datetime-date input').datepicker({
         showAnim: '',
      dateFormat: "yy-mm-dd",
       beforeShow: function() { $(document).trigger('cipapi-datepicker-show', 'date'); },
          onClose: function() { $(document).trigger('cipapi-datepicker-hide', 'date'); }
    }).prop('readonly', 'readonly').addClass('cipapi-fau-read-only');

    // Set default times and dates - for now just set them all but some day when we get to
    // editing reports via this interfae we will need to understand new vs. edit.
    var isNewReport = true;
    if (isNewReport) {
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
                  fileName: fileName
              });
            },
            // On Error
            function(msg) {
              log.error(msg);
              $('#form-cip-media-spinner').hide();
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
                    fileName: file.name
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
  }
  
})(window);

