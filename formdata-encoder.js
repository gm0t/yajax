module.exports = function (params) {
  var formData = new FormData(), k;

  for (k in params) {
    if (params.hasOwnProperty(k)) {
      formData.append(k, params[k]);
    }
  }

  return formData;
}