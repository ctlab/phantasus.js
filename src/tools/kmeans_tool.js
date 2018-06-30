/**
 * Created by dzenkova on 11/18/16.
 */
phantasus.KmeansTool = function () {
};
phantasus.KmeansTool.prototype = {
  toString: function () {
    return "K-means";
  },
  gui: function (project) {
    // z-score, robust z-score, log2, inverse log2
    if (_.size(project.getRowFilter().enabledFilters) > 0 || _.size(project.getColumnFilter().enabledFilters) > 0) {
      phantasus.FormBuilder.showInModal({
        title: 'Warning',
        html: 'Your dataset is filtered.<br/>' + this.toString() + ' will apply to unfiltered dataset. Consider using New Heat Map tool.',
        z: 10000
      });
    }

    return [{
      name: "number_of_clusters",
      type: "text"
    }];
  },
  execute: function (options) {
    var project = options.project;
    var dataset = project.getFullDataset();
    var promise = $.Deferred();

    var number = parseInt(options.input.number_of_clusters);
    if (isNaN(number)) {
      throw new Error("Enter the expected number of clusters");
    }
    var replacena = "mean";
    //console.log(dataset);

    dataset.getESSession().then(function (essession) {
      var args = {
        es: essession,
        k: number,
        replacena: replacena
      };
      var req = ocpu.call("performKmeans", args, function (newSession) {
        newSession.getObject(function (success) {
          var result = JSON.parse(success);

          var v = dataset.getRowMetadata().add('clusters');
          for (var i = 0; i < dataset.getRowCount(); i++) {
            v.setValue(i, result[i].toString());
          }

          v.getProperties().set("phantasus.dataType", "string");

          dataset.setESSession(Promise.resolve(newSession));
          dataset.setESVariable("es");
          promise.resolve();

          project.trigger("trackChanged", {
            vectors: [v],
            display: ["color"]
          });
        })
      }, false, "::" + dataset.getESVariable());
      req.fail(function () {
        promise.reject();
        throw new Error("Kmeans call to OpenCPU failed" + req.responseText);
      });

    });

    return promise;
  }
};
