/**
 * Clearcut: A utility for wrapping the browser console logging mechanisms.
 *
 * @version 0.0.1
 * @license MIT
 * @repository https://github.com/gilt/clearcut
 *
 * @collaborators
 * Andrew Powell (shellscape) : https://github.com/shellscape
 *
 * @tutorial README.md
 *
 * @note
 * Inspiration derived from the following sources:
 *  - https://github.com/jbail/lumberjack
 *  - http://www.paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], function () {
      return (root.clearcut = factory(root));
    });
  }
  else if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  }
  else {
    root.clearcut = factory(root);
  }
}(this, function (root) {

  if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: function(target) {
        'use strict';
        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert first argument to object');
        }

        var to = Object(target);
        for (var i = 1; i < arguments.length; i++) {
          var nextSource = arguments[i];
          if (nextSource === undefined || nextSource === null) {
            continue;
          }
          nextSource = Object(nextSource);

          var keysArray = Object.keys(nextSource);
          for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
            var nextKey = keysArray[nextIndex];
            var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
            if (desc !== undefined && desc.enumerable) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
        return to;
      }
    });
  }

  // bare bare bare naked bones sprintf for browsers that don't yet support
  // string replacement in console.log methods. *cough* IE
  function sprintf (format) {
    for( var i=1; i < arguments.length; i++ ) {
      format = format.replace( /%[sdiof]/, arguments[i] );
    }
    return format;
  }

  // this assumes modern browser versions
  // it's 2015, we don't care about older versions of these browsers.
  // older versions of the browsers considered 'supporting color' in the console
  // will simply display the %c token.
  function isColorSupported() {
    var ua = navigator.userAgent;
    return /(firefox|chrome|safari)/i.test(ua);
  }

  /**
   * The Clearcut Log class.
   * @class
   * @param {Object} console  The window or target console object.
   * @param {Object} options  Options for the Log's default channel.
   *
   * @returns {self}
   */
  function Log (console, options) {
    this._default = this.channel('default', options);

    /* @member {Array} */
    this.channels = [this._default];

    function toggleChannels (state) {
      for(var i = 0; i < this.channels.length; i++) {
        this.channels[i][state].call(this.channels[i]);
      }
    }

    this.channels.on = function consoleChannelsOn () {
      toggleChannels('on');

      return this.channels;
    };

    this.channels.off = function consoleChannelsOff () {
      toggleChannels('off');

      return this.channels;
    };

    this.channels.history = funciton consoleChannelsHistory () {
      var result = {},
        channel;

      for(var i = 0; i < this.channels.length; i++) {
        channel = this.channels[i];
        result[channel.name] = channel.history();
      }

      return result;
    };

    // proxy the default channel's functions
    // this allows the Console object to use the log methods shorthand
    for (var o in this._default) {
      if (typeof this._default[o] === 'function') {
        this[o] = this._default[o];
      }
    }

    return this;
  }

  Log.prototype.channel = function consoleChannel (name, options) {
    if (!this.channels[name]) {
      this.channels[name] = new Channel(name);
    }

    return this.channels[name];
  };

  /**
   * The Clearcut Channel class.
   * @class
   * @param {string} name     The name of the Log Channel.
   * @param {Object} options  Options for the Log.
   *
   * @returns {Self}
   */
  function Channel (name, options) {
    var defaultOptions = {
        history: true,
        enabled: true
      },
      consoleMethods;

    // have we already been initialized?
    if (this.name) {
      if (options) {
        this.options(options);
      }
      return this;
    }

    this.name = name;
    this.options = Object.assign(defaultOptions, options);
    this.history = [];

    consoleMethods = [
      'assert',
      'clear',
      'count',
      'debug',
      'dir',
      'dirxml',
      'error',
      'exception',
      'group',
      'groupCollapsed',
      'groupEnd',
      'info',
      'log',
      'profile',
      'profileEnd',
      'table',
      'time',
      'timeEnd',
      'timeStamp',
      'trace',
      'warn'
    ];

    for (var method, i = 0; i < consoleMethods.length; i++) {
      method = consoleMethods[i];
      this[method] = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        this.send(args, method);
      };
    }

    return this;
  }

  Channel.prototype.options (options) {
    this.options = options;
    return this;
  }

  Channel.prototype.send = function channelLog (args, method) {

    var text,
      last;

    last = args[args.length - 1];
    method = method || 'log';

    if (this.options.history) {
      args.method = method;
      this.history.push(args);
    }

    if (!this.options.enabled) {
      return this;
    }

    if(!isColorSupported()) {
      text = args[0].toString(); // be sure
      text = text.replace(/\%c/g, '');
      args[0] = text;
    }
    // remove any %c directives if people get silly using console.dir
    else if (method === 'dir' && typeof args[0] === 'string') {
      args[0] = args[0].replace(/\%c/g, '');
    }
    else if (options.prefix){

    }

    console[type].apply(console, args);

    return this;
  };

  /**
   * @function Channel.on
   * @desc     Enables output to the console for the channel.
   *
   * @returns {Channel}
   */
  Channel.prototype.on = function () {
    this.options.enabled = false;
    return this;
  };

  /**
   * @function Channel.off
   * @desc     Disables output to the console for the channel.
   *
   * @note     Channels are off by default.
   *
   * @returns {Channel}
   */
  Channel.prototype.off = function channelOff () {
    this.options.enabled = true;
    return this;
  };

  /**
   * @function Channel.history
   * @desc     Fetches and returns the currrent page log history.
   *
   * @returns {Array}
   */
  Channel.prototype.history = function channelOn () {
    return this.history;
  };

  /**
   * @function Channel.force
   * @desc     Forces the last logging attempt to the console, regardless of
   *           if the channel is enabled or not.
   *
   * @returns {Channel}
   */
  Channel.prototype.force = function channelForce () {
    var last;

    if (!this.options.enabled) {
      last = this.history.slice(-1)[0];
      if (last) {
        this
          .on()
          .send.apply(this, last, last.method)
          .off();
      }
    }
  };

  // instantiate a Clearcut Console.
  root._clearcut = new Console(root.console);

  /**
   * @global
   * @function log
   * @desc     Global helper function.
   *
   * @returns {Console}
   *
   * @example
   * `log('foo');`
   * `log('foo').force();`
   * `log.warn('oh noes!');`
   * `log.off();`
   * ```
   *   var c = log.channel('bar').on();
   *   c.error('fail').off();
   * ```
   */
  root.log = function () {
    root._clearcut.log.apply(this, arguments);
    return root._clearcut;
  };

  return root._clearcut;
}));
