phantasus.shinyGamTool = function () {
};
phantasus.shinyGamTool.prototype = {
  toString: function () {
    return "Submit to Shiny GAM";
  },
  gui: function () {
    return [];
  },
  init: function (heatMap, form) {
    form.appendContent('<p>Are you sure you want to submit to Shiny GAM analysis?');

    var rows = phantasus.Dataset.toJSON(heatMap.getFullDataset()).rowMetadataModel.vectors;
    var pValuePresent = _.size(_.where(rows, {'name': 'P.Value'})) > 0;
    if (!pValuePresent) {
      form.appendContent('<span class="phantasus-warning-color">Warning:</span>' +
        'differential expression analysis (limma) is required to be run before submitting to Shiny GAM.');
    }

    form.appendContent('</p>');
    form.appendContent('Result will open in a new window automatically. <br/>' +
      'Your browser may be irresponsive for an amount of time');
  },
  execute: function (options) {
    var dataset = options.project.getFullDataset();


    var promise = $.Deferred();

    dataset.getESSession().then(function (oldSession) {
      ocpu.call('shinyGAMAnalysis', {
        es: oldSession
      }, function (context) {
        context.getObject('.val', null, function (link) {
          window.open(link.split('"')[1], '_blank');
        });
        promise.resolve();
      }, false, '::es').fail(function () {
        console.error('Failed to submit to shiny GAM analysis');
        promise.reject();
      });
    });
    return promise;
  }
};
