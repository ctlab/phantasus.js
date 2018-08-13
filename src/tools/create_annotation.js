phantasus.CreateAnnotation = function () {
};
phantasus.CreateAnnotation.prototype = {
  toString: function () {
    return 'Create Calculated Annotation';
  },
  gui: function () {
    this.operationDict = {
      'MEAN()': 'Mean',
      'MAD()': 'MAD',
      'MAX()': 'Max',
      'MEDIAN()': 'Median',
      'MIN()': 'Min',
      'SUM()': 'Sum'
    };

    return [{
        name: 'operation',
        value: _.first(Object.keys(this.operationDict)),
        type: 'select',
        options: Object.keys(this.operationDict)
      }];
  },
  execute: function (options) {
    var self = this;

    var project = options.project;
    var operation = options.input.operation;
    var name = this.operationDict[operation];
    var dataset = options.project.getFullDataset();
    var promise = $.Deferred();

    var rowView = new phantasus.DatasetRowView(dataset);
    var vector = dataset.getRowMetadata().add(name);

    var MAD = function () {
      return phantasus.MAD(rowView);
    };
    var MAX = function () {
      return phantasus.Max(rowView);
    };
    var MEAN = function () {
      return phantasus.Mean(rowView);
    };
    var MEDIAN = function (p) {
      return phantasus.Percentile(rowView, 50);
    };
    var MIN = function () {
      return phantasus.Min(rowView);
    };
    var SUM = function () {
      return phantasus.Sum(rowView);
    };
    var idx = 0;

    for (var size = dataset.getRowCount(); idx < size; idx++) {
      rowView.setIndex(idx);
      var val = eval(operation);
      vector.setValue(idx, val.valueOf());
    }

    phantasus.VectorUtil.maybeConvertStringToNumber(vector);

    dataset.getESSession().then(function (esSession) {
      var args = {
        es: esSession,
        operation: self.operationDict[operation]
      };

      ocpu
        .call("calculatedAnnotation", args, function (newSession) {
          dataset.setESSession(new Promise(function (resolve) {resolve(newSession)}));
          dataset.setESVariable('es');
          phantasus.DatasetUtil.probeDataset(dataset).then(function (result) {console.log(result);});

          project.trigger('trackChanged', {
            vectors: [vector],
            display: ['text']
          });
          promise.resolve();
        }, false, "::" + dataset.getESVariable())
        .fail(function () {
          promise.reject();
          throw new Error("Calculated annotation failed. See console");
        });

    });


    return promise;
  }
};
