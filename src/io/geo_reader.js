phantasus.GeoReader = function () {
};

phantasus.GeoReader.prototype = {
  read: function (name, callback) {
    // console.log("read", name);
    var afterLoaded = function (err, dataset) {
      if (!err) {
        var datasetTitle = "GEO dataset";
        var experimentData = dataset[0].getExperimentData();
        if (experimentData) datasetTitle = experimentData.title.values.toString() || datasetTitle;
        var geoAccesion = name.split('-')[0];

        phantasus.datasetHistory.store({
          name: geoAccesion,
          description: datasetTitle,
          openParameters: {
            file: geoAccesion,
            options: {
              interactive: true,
              isGEO: true
            }
          }
        });
      }

      callback(err, dataset);
    };


    var req = ocpu.call('loadGEO/print', { name: name }, function (session) {
      // session.getMessages(function (success) {
      //   console.log('loadGEO messages', '::', success);
      // });
      phantasus.ParseDatasetFromProtoBin.parse(session, afterLoaded, { isGEO : true, pathFunction: phantasus.GeoReader.prototype.getPath });
    });
    req.fail(function () {
      callback(req.responseText);
    });

  },
  getPath: function (fragment) {
    return window.libraryPrefix.slice(0, -1) + fragment;
  }
};



