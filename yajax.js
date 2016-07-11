/**
 * yayax (c) Mikhail Bogdanov 2015
 * based on https://github.com/radiosilence/xr
 * URL: https://github.com/gm0t/yajax
 * License: MIT
 */

var Events = {
  READY_STATE_CHANGE: "readystatechange",
  LOAD_START: "loadstart",
  PROGRESS: "progress",
  ABORT: "abort",
  ERROR: "error",
  LOAD: "load",
  TIMEOUT: "timeout",
  LOAD_END: "loadend"
};

var defaults = {
  method: "GET",
  data: undefined,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json"
  },
  dataEncoder: JSON.stringify,
  responseDecoder: JSON.parse,
  xmlHttpRequest: function () {
    return new XMLHttpRequest();
  },
  promise: function (fn) {
    return new Promise(fn);
  }
};

var interceptors = {
  send: [],
  complete: [],
  error: []
}

function onError(xhr, opts, reject) {
  // onComplete interceptors
  (interceptors.error || []).forEach(function onErrorInterceptor(fn) {
    fn(xhr);
  });

  reject({
    status: xhr.status,
    response: xhr.response,
    xhr: xhr
  });
}

function stringify(params) {
  params = params || {};

  var k, result = "", sep = "";
  for (k in params) {
    if (params.hasOwnProperty(k)) {
      result += sep + encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      sep = "&";
    }
  }

  return result;
}

var config = {};

function configure(opts) {
  config = Object.assign({}, config, opts);
}

function createPromise(args, fn) {
  return ((args && args.promise)
      ? args.promise
      : (config.promise || defaults.promise)
  )(fn);
}

function yajax(args) {
  var xhr;
  var promise = createPromise(args, function(resolve, reject) {
    var opts = Object.assign({}, defaults, config, args);

    xhr = opts.xmlHttpRequest();
    var failed = onError.bind(null, xhr, opts, reject)

    if (opts.withCredentials) {
      xhr.withCredentials = true;
    }

    var url = opts.url;
    if (opts.params) {
      url = url.split("?")[0] + "?" + stringify(opts.params);
    }
    xhr.open(opts.method, url, true);

    xhr.addEventListener(Events.LOAD, function () {
      if (xhr.status < 200 || xhr.status >= 300) {
        return failed();
      }

      // onComplete interceptors
      (interceptors.complete || []).forEach(function onCompleteInterceptor(fn) {
        fn(xhr, opts);
      });

      var data;
      if (!xhr.responseType || xhr.responseType === "text") {
        data = xhr.responseText;
      } else {
        data = xhr.response;
      }

      if (data && !opts.raw) {
        data = opts.responseDecoder(data);
      }
      resolve(data, xhr);
    });

    xhr.addEventListener(Events.ABORT, failed);
    xhr.addEventListener(Events.ERROR, failed);
    xhr.addEventListener(Events.TIMEOUT, failed);

    var k, headers = opts.headers;
    for (k in headers) {
      if (headers.hasOwnProperty(k)) {
        xhr.setRequestHeader(k, headers[k]);
      }
    }

    var events = opts.events;
    for (k in events) {
      if (events.hasOwnProperty(k)) {
        xhr.addEventListener(k, events[k].bind(null, xhr), false);
      }
    }

    if (opts.timeout !== void 0) {
        xhr.timeout = opts.timeout;
    }

    // onSend interceptors
    (interceptors.send || []).forEach(function onSendInterceptor(fn) {
      fn(xhr, opts);
    });

    var data = opts.data;
    if (typeof opts.data === "object" && !opts.raw) {
      data = opts.dataEncoder(data, xhr);
    }

    if (xhr.readyState !== 1) {
      //one of the intercepters has called abort
      return failed();
    }

    if (opts.responseType) {
        xhr.responseType = opts.responseType;
    }

    xhr.send(data);
  });

  promise.abort = function () {
    return xhr.abort();
  }

  return promise;
}

yajax.configure = configure;
yajax.Events = Events;
yajax.defaults = defaults;

yajax.get = function (url, params, args) {
  return yajax(Object.assign({url: url, method: "GET", params: params}, args));
};
yajax.put = function (url, data, args) {
  return yajax(Object.assign({url: url, method: "PUT", data: data}, args));
};
yajax.post = function (url, data, args) {
  return yajax(Object.assign({url: url, method: "POST", data: data}, args));
};
yajax.patch = function (url, data, args) {
  return yajax(Object.assign({url: url, method: "PATCH", data: data}, args));
};
yajax.del = function (url, args) {
  return yajax(Object.assign({url: url, method: "DELETE"}, args));
};
yajax.options = function (url, args) {
  return yajax(Object.assign({url: url, method: "OPTIONS"}, args));
};

yajax.addInterceptor = function addInterceptor(type, fn, asFirst) {
  var list = interceptors[type];
  if (!list) {
    throw new Error("Unknown interceptor type: " + type + " available: send, complete");
  }

  if (asFirst) {
    list.unshift(fn);
  }  else {
    list.push(fn);
  }
};

yajax.removeInterceptor = function removeInterceptor(type, fn) {
  var list = interceptors[type];
  if (!list) {
    throw new Error("Unknown interceptor type: " + type + " available: send, complete");
  }

  var idx = list.indexOf(fn);
  if (idx !== -1) {
    list.splice(idx, 1);
    return true;
  }

  return false;
}

module.exports = yajax;
