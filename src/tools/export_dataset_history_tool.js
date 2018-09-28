phantasus.ExportDatasetHistory = function () {
};
phantasus.ExportDatasetHistory.prototype = {
  toString: function () {
    return 'DEBUG: Export Dataset History';
  },
  execute: function (options) {
    var project = options.project;
    var dataset = project.getFullDataset();
    var promise = $.Deferred();

    dataset.getESSession().then(function (esSession) {
      ocpu.call('exportDatasetHistory', {
        sessionName: esSession.key,
        esVariable: dataset.getESVariable()
      }, function (newSession) {
        newSession.getMessages(function (a) {
          console.log(a);
        });
        newSession.getObject(function (success) {
          console.log(JSON.parse(success)[0])
        });
      })
    });

    return promise;
  }
};
