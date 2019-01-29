phantasus.SavedSessionReader = function () {
};

phantasus.SavedSessionReader.prototype = {
  read: function(name, callback) {
    console.log("saved session read", name);
    name = typeof name === "string" ? { sessionName : name } : name;

    var afterLoaded = function (err, dataset) {
      if (!err) {
        var datasetTitle = "permanent linked dataset";
        var experimentData = dataset[0].getExperimentData();
        if (experimentData) datasetTitle = experimentData.title.values.toString() || datasetTitle;

        phantasus.datasetHistory.store({
          name: name.name,
          description: datasetTitle,
          openParameters: {
            file: name.sessionName,
            options: {
              interactive: true,
              session: true
            }
          }
        });
      }

      callback(err, dataset);
    };

    var req = ocpu.call('loadSesssion', name, function(session) {
      session.loc = session.loc.split(session.key).join(name.sessionName);
      session.key = name.sessionName;
      session.getLoc = function () {
        return session.loc;
      };

      session.getKey = function () {
        return session.key;
      };

      phantasus.ParseDatasetFromProtoBin.parse(session, afterLoaded, { preloaded : true });
    });
    req.fail(function () {
      callback(req.responseText);
    })
  }
};
