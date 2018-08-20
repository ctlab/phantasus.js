phantasus.ProbeDebugTool = function () {
};
phantasus.ProbeDebugTool.prototype = {
  toString: function () {
    return 'DEBUG: Probe Debug Tool';
  },
  execute: function (options) {
    var project = options.project;
    var dataset = project.getFullDataset();
    var promise = $.Deferred();

    phantasus.DatasetUtil.probeDataset(dataset).then(function (status) {
      alert('Sync status:' + status.toString());
      promise.resolve();
    });

    return promise;
  }
};
