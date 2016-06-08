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
  CIPAPI.images = {};

  var log = log4javascript.getLogger("CIPAPI.images");
  
  var imageStorage = [];
  var reportUUID = false;

  // Statistics
  var statsGroup = 'Image Store';
  CIPAPI.stats.total(statsGroup, 'Total Images', 0);
  
  CIPAPI.images.reset = function(UUID) {
    log.debug('Resetting image store');
    imageStorage = [];
    reportUUID = UUID;
  }
  
  CIPAPI.images.get = function() {
    log.debug('Fetching image store');
    return imageStorage;
  }
  
  // Store images for packaging later  
  $(document).on('cipapi-forms-media-added', function(event, info) {
    log.debug('Storing image: ' + info.fileName);
    CIPAPI.stats.count(statsGroup, 'Total Images');

    // Rename the image
    var nameParts = info.fileName.split('.')
    var extension = nameParts.length > 1 ? ('.' + nameParts.pop()) : '';
    
    info.fileName = reportUUID + '_' + info.formName + '_' + info.timeStamp + extension;
    log.debug('New image name: ' + info.fileName);

    // The phonegap way...
    if (typeof window.resolveLocalFileSystemURL != 'undefined') {
      log.debug("Resolving local file URL");
      window.resolveLocalFileSystemURL(info.imageURI, function(fileEntry) { 
        fileEntry.file(function(file) {
          log.debug("Reading image");
          var reader = new FileReader();
          reader.onloadend = function(evt) {
            var dataURI = "data:image/jpeg;base64," + window.btoa(evt.target.result);
            log.debug("Composed data URI - length = " + dataURI.length);
            
            log.debug("Parsing mime type from data URI");
            var matches  = dataURI.match(/^data:(.*?);base64/);
            var mimeType = matches[1];
            
            log.debug("Mime type from URL: " + mimeType);

            // Verify mime type matches up to file name because some URLs do not and the server
            // determines the mime type by the inbound file name.  The mime type known here is
            // most accurate because it was parsed from a data url with embedded mime type. The
            // file name can be really weird especially when grabbing from the library or album.
            // If they do not match up, generate a new file name and matching extension.
            if (mimeType != CIPAPI.mime.getMimeTypeForFileName(info.fileName)) {
              var newExt = CIPAPI.mime.getExtensionForMimeType(mimeType);
              var timeStamp = Math.round(new Date().getTime() / 1000);
              info.fileName = timeStamp + newExt;
              log.debug("Changed file name to " + info.fileName);
            }

            // Store for later
            imageStorage.push({
              formType: 'jsonfile',
              mimeType: mimeType,
              fileName: info.fileName,
               b64File: dataURI
            });
            
            log.debug("Image stored as base64 for jsonfile upload");
          };
          reader.readAsBinaryString(file);
        }, function(err) {
          log.error("Error reading image: " + err.code);
        });
      }, function(err) {
        log.error("Error resolving file: " + err.code);
      }); 
    }
    
    // Else the old fashioned way which does not seem to work for phonegap anyhow
    else {
      log.debug("Capturing image data by loading hidden image");
      var deferredImage = $('<img />');
      
      deferredImage.on('load', function(evt) {
        // Convert to data URI and parse then add to existing form
        var dataURL   = CIPAPI.forms.imageToDataURL(deferredImage.get(0));
        var matches   = dataURL.match(/^data:(.*?);base64,(.*)$/);
        var mimeType  = matches[1];
        var imageData = matches[2];

        // Store for later
        imageStorage.push({
          formType: 'file',
           content: CIPAPI.forms.b64toBlob(imageData, mimeType),
          fileName: info.fileName
        });

        log.debug("Image stored as blob for file upload");
      });
      
      deferredImage.attr('src', info.imageURI);
    }
  });
  
})(window);
