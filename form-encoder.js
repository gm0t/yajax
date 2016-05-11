module.exports = function (params) {
  var data = [], k;

  for (k in params) {
    if (params.hasOwnProperty(k)) {
      data.push(k + "=" + encodeURIComponent(params[k]));
    }
  }

  return data.join("&");
}