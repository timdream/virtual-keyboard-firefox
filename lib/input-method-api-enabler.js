'use strict';

var { Ci, Cu, Cc } = require('chrome');
var browserWindows = require("sdk/windows").browserWindows;

/**
 * This module enable mozInputMethod API on data/ dir of the same add-on.
 */

function InputMethodAPIEnabler() {
  this.apiEnabled = false;
  this.moduleEnabled = false;

  this.focused = false;
}

InputMethodAPIEnabler.prototype.onfocuschange = null;

InputMethodAPIEnabler.prototype._enableAPI = function() {
  if (this.apiEnabled) {
    return;
  }
  this.apiEnabled = true;

  // Enable mozInputMethod API itself
  var PreferencesService = require('sdk/preferences/service');
  var PREF_NAME = 'dom.mozInputMethod.enabled';
  PreferencesService.set(PREF_NAME, true);

  // Allow mozInputMethod API to be accessed by pages in add-on's data/ dir.
  var self = require('sdk/self');
  Cu.import('resource://gre/modules/Services.jsm');
  var uri = Services.io.newURI(self.data.url(''), null, null);
  var principal = Services.scriptSecurityManager.getNoAppCodebasePrincipal(uri);
  Services.perms.addFromPrincipal(
    principal, 'input', Ci.nsIPermissionManager.ALLOW_ACTION);
};

InputMethodAPIEnabler.prototype._enableKeyboardJSModule = function() {
  if (this.moduleEnabled) {
    return;
  }
  this.moduleEnabled = true;

  // Insert keyboard.jsm
  let KeyboardGlobal = Cu.import('resource://gre/modules/Keyboard.jsm');

  // SystemAppProxy.jsm doesn't ship into Firefox.
  // Keyboard.jsm is the only one user of it outside of b2g/ folder.
  // So hack it, in order to allow keyboard to send events to the system app
  Object.defineProperty(KeyboardGlobal, 'SystemAppProxy', {
    value: { dispatchEvent: function () {} }
  });

  // Prepare a message manager so we could insert input monitor (forms.js)
  // and activate the API for the virtual page page.
  var mm = Cc['@mozilla.org/globalmessagemanager;1']
    .getService(Ci.nsIMessageBroadcaster);
  Keyboard.initFormsFrameScript(mm);
  mm.loadFrameScript('chrome://global/content/forms.js', true);

  // Make sure we are aware of focus change
  mm.addMessageListener('Forms:Input', function(msg) {
    this.focused = (msg.data.type !== 'blur');
    if (typeof this.onfocuschange === 'function') {
      this.onfocuschange(this.focused);
    }
  }.bind(this));

  var APIEnablerFrameScript = function APIEnablerFrameScript() {
    // Turn on the mozInputMethod API instance if it's available in the frame.
    // (only our frame has access to the API.)
    addEventListener('DOMContentLoaded', function() {
      let nav = XPCNativeWrapper.unwrap(content.document.defaultView.navigator);
      if (nav.mozInputMethod) {
        // Wrap to access the chrome-only attribute setActive.
        new XPCNativeWrapper(nav.mozInputMethod).setActive(true);
      }
    }, true, false);
  };

  mm.loadFrameScript('data:,(' +
    encodeURIComponent(APIEnablerFrameScript.toString()) + ')();', true);
};

InputMethodAPIEnabler.prototype.enable = function() {
  this._enableKeyboardJSModule();
  this._enableAPI();
};

InputMethodAPIEnabler.prototype.disable = function() {
  throw new Error('Not implemented.');
};

exports.InputMethodAPIEnabler = InputMethodAPIEnabler;
