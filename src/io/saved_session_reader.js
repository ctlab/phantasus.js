phantasus.SavedSessionReader = function () {
};

phantasus.SavedSessionReader.prototype = {
  read: function(name, callback) {
    console.log("saved session read", name);
    name = typeof name === "string" ? { sessionName : name } : name;

    var sessionWithLoadedMeta;
    var afterLoaded = function (err, dataset) {
      if (!err) {
        var datasetTitle = "permanent linked dataset";
        var experimentData = dataset[0].getExperimentData();
        var seriesName = dataset[0].seriesNames[0];

        if (experimentData) datasetTitle = experimentData.title.values.toString() || seriesName || datasetTitle;
        else datasetTitle = seriesName || datasetTitle;

        phantasus.datasetHistory.store({
          name: name.sessionName,
          description: datasetTitle,
          openParameters: {
            file: name.sessionName,
            options: {
              interactive: true,
              session: true
            }
          }
        });

        dataset[0].setESSession(new Promise(function (rs) { rs(sessionWithLoadedMeta); }));
      }

      callback(err, dataset);
    };

    var req = ocpu.call('loadSession/print', name, function(session) {
      sessionWithLoadedMeta = session;
      sessionWithLoadedMeta.loc = sessionWithLoadedMeta.loc.split(sessionWithLoadedMeta.key).join(name.sessionName);
      sessionWithLoadedMeta.key = name.sessionName;
      sessionWithLoadedMeta.getLoc = function () {
        return sessionWithLoadedMeta.loc;
      };

      sessionWithLoadedMeta.getKey = function () {
        return sessionWithLoadedMeta.key;
      };

      phantasus.ParseDatasetFromProtoBin.parse(session, afterLoaded, {
        preloaded : true
      });
    });

    req.fail(function () {
      callback(req.responseText);
    })
  }
};
