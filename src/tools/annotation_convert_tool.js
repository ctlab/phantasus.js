phantasus.annotationDBMeta = {
  init: false,
  dbs: {}
};

phantasus.initAnnotationConvertTool = function (options) {
  if (!phantasus.annotationDBMeta.init) {
    var $el = $('<div style="background:white;" title="Init"><h5>Loading AnnotationDB meta information</h5></div>');
    phantasus.Util.createLoadingEl().appendTo($el);
    $el.dialog({
      resizable: false,
      height: 150,
      width: 300
    });

    var req = ocpu.call("queryAnnotationDBMeta", {}, function (newSession) {
      newSession.getObject(function (success) {
        var result = JSON.parse(success);
        phantasus.annotationDBMeta.init = true;

        phantasus.annotationDBMeta.dbs = result;
        phantasus.HeatMap.showTool(new phantasus.AnnotationConvertTool(), options.heatMap);
        $el.dialog('destroy').remove();
      })
    });

    req.fail(function () {
      $el.dialog('destroy').remove();
      throw new Error("Couldn't load Annotation DB meta information" + req.responseText);
    });
  } else {
    phantasus.HeatMap.showTool(new phantasus.AnnotationConvertTool(), options.heatMap);
  }
};

phantasus.AnnotationConvertTool = function () {
};
phantasus.AnnotationConvertTool.prototype = {
  toString: function () {
    return "AnnotationDB convert";
  },
  init: function (project, form) {
    form.$form.find('[name=specimen_DB]').on('change', function (e) {
      var newVal = $(this).val();
      var newDb = newVal.split(' - ')[0];
      var newColumns = phantasus.annotationDBMeta.dbs[newDb].columns;

      form.setOptions('source_column_type', newColumns);
      form.setOptions('result_column_type', newColumns);
    });
  },
  gui: function (project) {
    if (phantasus.annotationDBMeta.init && !_.size(phantasus.annotationDBMeta.dbs)) {
      throw new Error('There is no AnnotationDB on server. Ask administator to put AnnotationDB sqlite databases in cacheDir/annotationdb folder');
    }

    var names = _.map(phantasus.annotationDBMeta.dbs, function (value, dbName) {
      return dbName + ' - ' + value.species.toString();
    });

    var featureColumns = phantasus
      .MetadataUtil
      .getMetadataNames(project.getFullDataset().getRowMetadata());

    if (!_.size(featureColumns)) {
      throw new Error('There is no columns in feature data');
    }

    var firstDBName = _.first(names).split(' - ')[0];

    return [{
      name: 'specimen_DB',
      type: 'select',
      options: names,
      value: _.first(names)
    }, {
      name: 'source_column',
      type: 'select',
      options: featureColumns,
      value: _.first(featureColumns)
    }, {
      name: 'source_column_type',
      type: 'select',
      options: phantasus.annotationDBMeta.dbs[firstDBName].columns,
      value: _.first(phantasus.annotationDBMeta.dbs[firstDBName].columns)
    }, {
      name: 'result_column_type',
      type: 'select',
      options: phantasus.annotationDBMeta.dbs[firstDBName].columns,
      value: _.first(phantasus.annotationDBMeta.dbs[firstDBName].columns)
    }];
  },
  execute: function (options) {
    var project = options.project;
    var dataset = project.getFullDataset();
    var promise = $.Deferred();

    var selectedDB = options.input.specimen_DB.split(' - ')[0];
    var selectedFeatureName = options.input.source_column;
    var columnType = options.input.source_column_type;
    var keyType = options.input.result_column_type;

    if (columnType === keyType) {
      throw new Error('Converting column from ' + columnType + ' to ' + keyType + ' is invalid');
    }

    dataset.getESSession().then(function (essession) {
      var args = {
        es: essession,
        dbName: selectedDB,
        columnName: selectedFeatureName,
        columnType: columnType,
        keyType: keyType
      };
      var req = ocpu.call("convertByAnnotationDB", args, function (newSession) {
        newSession.getObject(function (success) {
          var result = JSON.parse(success);

          var v = dataset.getRowMetadata().add(keyType);
          for (var i = 0; i < dataset.getRowCount(); i++) {
            v.setValue(i, result[i].toString());
          }

          v.getProperties().set("phantasus.dataType", "string");

          dataset.setESSession(Promise.resolve(newSession));
          promise.resolve();

          project.trigger("trackChanged", {
            vectors: [v],
            display: []
          });
        })
      }, false, "::es");

      req.fail(function () {
        promise.reject();
        throw new Error("convertByAnnotationDB call to OpenCPU failed " + req.responseText);
      });

    });

    return promise;
  }
};
