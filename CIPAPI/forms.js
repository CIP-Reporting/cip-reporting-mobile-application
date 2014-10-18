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

  // Apply formatting magic for datetime fields
  function bindDateCleanup(selector, pattern) {
    $(selector).each(function() {
      var control = $(this);
      control.blur(function() {
        var theDate = Date.parse(this.value);
        if (null !== theDate) {
          this.value = theDate.toString(pattern);
        }
      });
    });
  }

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

    var blob = new Blob(byteArrays, {type: contentType});
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
      // Force the onblur event onto date fields for magic cleanup
      $(formSelector + ' input[type=datetime]').blur();
      $(formSelector + ' input[type=time]').blur();
      $(formSelector + ' input[type=date]').blur();
    
      // Take content from rich text editor back to the hidden textarea
      $(formSelector + 'div.cipform_richtext_custom_field textarea').each(function() {
        var e = $(this);
        this.innerHTML = e.code();
      });
    });

    // Bind the date cleanup library to all date fields
    bindDateCleanup(formSelector + ' input[type=datetime]', 'yyyy-MM-dd HH:mm:ss');
    bindDateCleanup(formSelector + ' input[type=time]',     'HH:mm:ss');
    bindDateCleanup(formSelector + ' input[type=date]',     'yyyy-MM-dd');
        
    // Set the width of multi-select and radio group options to be equal so that if the CSS
    // floats the items they will line up like table cells
    equalizeElementSizes(formSelector + 'div.cipform_multi_custom_field label.checkbox');
    equalizeElementSizes(formSelector + 'div.cipform_check_m_custom_field label.checkbox');
    equalizeElementSizes(formSelector + 'div.cipform_check_s_custom_field label.checkbox');
    equalizeElementSizes(formSelector + 'div.cipform_check_a_custom_field label.checkbox');
    equalizeElementSizes(formSelector + 'div.cipform_radio_custom_field label.radio');
    
    // If phonegap is loaded AND phonegap camera controls are available use it...
    if (window.cordova && window.navigator && window.navigator.camera) {
      $(formSelector + ' input[type=file]').each(function() {
        // Put a media gallery into place
        var container = $(this).closest('div.form-group');
        var fromCam = $('<a class="cipform_image_from_camera"  href="javascript: void(0)">From Camera</a>');
        var fromLib = $('<a class="cipform_image_from_library" href="javascript: void(0)">From Library</a>');
        var gallery = $('<div class="form-cip-media-thumbnails"></div><div style="clear: both;"></div>');
        container.append(fromCam).append(fromLib).append(gallery);
        
        // Shared camera code
        function captureImage(src) {
          navigator.camera.getPicture(
            // On Success
            function(imageURL) {
              // Display on screen
              var fileName = imageURL.substring(imageURL.lastIndexOf('/') + 1);
              var div = $('<div data-toggle="tooltip" data-placement="bottom" class="form-cip-media-container" style="width: ' + CIPAPI.config.thumbMaxWidth + '; height: ' + CIPAPI.config.thumbMaxHeight + ';"></div>');
              var img = $('<img data-scale="best-fit" />');
              div.tooltip({ title: fileName });
              container.find('div.form-cip-media-thumbnails').append(div.append(img));
              img.attr('src', imageURL).on('load', function() {
                // Throw into a timer so the image can render
                setTimeout(function() {
                  // Convert to data URI and parse then add to existing form
                  var dataURL   = CIPAPI.forms.imageToDataURL(img.get(0));
                  var matches   = dataURL.match(/^data:(.*?);base64,(.*)$/);
                  var mimeType  = matches[1];
                  var imageData = matches[2];

                  var formData = new FormData(); 
                  formData.append("file[]", CIPAPI.forms.b64toBlob(imageData, mimeType), fileName);
                
                  // Also let the world know...
                  $(document).trigger('cipapi-forms-media-added', {
                      imageURL: imageURL,
                      fileName: fileName,
                      mimeType: mimeType
                  });
                }, 1);
              });
              img.imageScale();
            },
            // On Error
            function(msg) {
              log.error(msg);
            }, 
            // Options
            {
                 destinationType: Camera.DestinationType.FILE_URI,
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
      $(formSelector + ' input[type=file]').each(function() {
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
                var regex = /^data:(.*?);base64,(.*)$/;
                var matches = e.target.result.match(regex);
                var mimeType = matches[1];
                var b64Content = matches[2] == '' ? 'application/octet-stream' : matches[2];
                $(document).trigger('cipapi-forms-media-added', {
                    imageURL: e.target.result, // Data URL
                    fileName: file.name,
                    mimeType: mimeType
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

