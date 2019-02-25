phantasus.PreloadedReader = function () {
};

phantasus.PreloadedReader.prototype = {
  read: function(name, callback) {
    console.log("preloaded read", name);
    name = typeof name === "string" ? { name : name } : name;

    var afterLoaded = function (err, dataset) {
      if (!err) {
        var datasetTitle = "preloaded dataset";
        var experimentData = dataset[0].getExperimentData();
        if (experimentData) datasetTitle = experimentData.title.values.toString() || datasetTitle;

        phantasus.datasetHistory.store({
          name: name.name,
          description: datasetTitle,
          openParameters: {
            file: name.name,
            options: {
              interactive: true,
              preloaded: true
            }
          }
        });
      }

      callback(err, dataset);
    };

    var req = ocpu.call('loadPreloaded', name, function(session) {
      phantasus.ParseDatasetFromProtoBin.parse(session, afterLoaded, { preloaded : true, pathFunction: phantasus.PreloadedReader.prototype.getPath });
    });
    req.fail(function () {
      callback(req.responseText);
    })
  },
  getPath: function (fragment) {
    return window.libraryPrefix.slice(0, -1) + fragment;
  }
};
