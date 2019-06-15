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
  CIPAPI.help = {};

  var log = CIPAPI.logger.getLogger("CIPAPI.help");

  var converter = new Markdown.Converter();
  
  CIPAPI.help.getHTML = function() {
    var handler = CIPAPI.router.getCurrentHandler();
    
    // Per screen help
    if (handler == 'login') {
      return converter.makeHtml(loginHelp);
    }

    // Default to main
    return converter.makeHtml(CIPAPI.config.helpOverride !== false ? CIPAPI.config.helpOverride : mainHelp);
  }

  // Login screen help  
  var loginHelp = '' +
    '##CIP Reporting Mobile\n' +
    'Welcome to the CIP Reporting mobile application.\n' +
    'This mobile application allows submitting customized reports from mobile devices to your CIP Reporting server.\n' +
    'You must have access to a CIP Reporting server which has been configured for mobile access to use this application.\n' +
    '\n' +
    '## Accessing Your Account\n' +
    'You can access your account (login) on the CIP Reporting Mobile client either by an automatic lookup using your email address or by manually\n' +
    'specifying the full set of credentials to your CIP Reporting server.  Once you have authenticated in the CIP Reporting Mobile client you will\n' +
    'not be prompted to authenticate again unless there are changes to your account.\n' +
    '\n' +
    '*We highly recommend using the Account Lookup option.*\n' +
    '\n' +
    '### Account Look Up\n' +
    'The account lookup tool attempts to cross reference your email address with a known CIP Reporting server.\n' +
    'In order for this lookup to work, your CIP Reporting server and email address must have been configured in the CIP Reporting account lookup service.\n' +
    'Simply enter your email address and select **Look Up Account**.  If your CIP Reporting server can be found you will be prompted for your password.\n' +
    '\n' +
    '#### Failure to Look Up Account\n' +
    'If the account look up tool fails to find your CIP Reporting server based on your email address you have a few options available to you:\n' +
    '\n' +
    '* Try a different email address\n' +
    '* Use the manual authentication method\n' +
    '* Contact your IT department for support\n' +
    '\n' +
    '### Manual Sign In\n' +
    'In order to manually sign into the CIP Reporting Mobile client you must have a complete set of credentials.\n' +
    'You can obtain these credentials from your IT department. The credentials required to find your CIP Reporting server ' +
    'and authenticate are:\n' +
    '\n' +
    '* URL to Your CIP Reporting Server\n' +
    '* Your Report Engine Name\n' +
    '* Your User Name\n' +
    '* Your User Context\n' +
    '* Your Password\n' +
    '\n' +
    'You can enter your credentials manually by selecting the **Manual Sign In** link found on the account look up screen.\n' +
    'Enter the credentials into the form and select **Sign In**.  Sample values for manual credentials are:\n' +
    '\n' +
    '* **Server URL:** *https://mobiledemo.trial.cipreporting.com*\n' +
    '* **User ID:** *test@mobiledemo/Test*\n' +
    '* **Password:** *test*\n' +
    '\n' +
    '### Troubleshooting\n' +
    'If you have continued issues signing into your CIP Reporting Mobile client you should contact your IT department for support.\n' +
    '';
  
  // Main screen help
  var mainHelp = '' +
    '##CIP Reporting Mobile\n' +
    'Welcome to the CIP Reporting mobile application.\n' +
    'This mobile application allows submitting customized reports from mobile devices to your CIP Reporting server.\n' +
    'You must have access to a CIP Reporting server which has been configured for mobile access to use this application.\n' +
    '\n' +
    '## Writing Reports\n' +
    'Once you have authenticated you will be shown the **Report List**.  Each report which you can write will have its own\n' +
    'button on the list.  To start writinig a report simply select the type of report you want to write from the list.\n' +
    'Upon selection of a report type a form will be displayed for you to complete.  Complete all the fields in the form and\n' +
    'select **Save Report**.\n' +
    '\n' +
    '*TIP: Return to the report list any time using the top navigation menu!*\n' +
    '\n' +
    '## Sychronization\n' +
    'The forms available for you to write are periodically updated from the server when a network connection is available.\n' +
    'Additionally reports are stored on the device and sent to the server when a network connection is available.\n' +
    'You can force a synchronization to both update the available forms and submit reports by clicking the **Synchronize** menu option at any time.\n' +
    '\n' +
    '### Writing Reports Offline\n' +
    'When you write reports without a network connection they are stored locally on the device.\n' +
    'The reports will be sent when a network connection is available as long as the application is in the foreground on your device.\n' +
    'If you close the application or activate another application you must return to the application when a network connection is available for the reports to be sent.\n' +
    'Reports stored locally on the device are displayed as **Pending** in the top menu.\n' +
    '\n' +
    '## Changes to Reports\n' +
    'Your CIP Reporting administrator controls the forms available on the mobile client.  Contact your IT department for support\n' +
    'with adding, removing or changing your available reports.\n' +
    '\n' +
  '';
  
})(window);
