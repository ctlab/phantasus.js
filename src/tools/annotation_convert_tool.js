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

    var req = ocpu.call("queryAnnotationDBMeta/print", {}, function (newSession) {
      var result = JSON.parse(newSession.txt);
      phantasus.annotationDBMeta.init = true;

      phantasus.annotationDBMeta.dbs = result;
      $el.dialog('destroy').remove();
      new phantasus.AnnotationConvertTool(options.heatMap);
    });

    req.fail(function () {
      $el.dialog('destroy').remove();
      throw new Error("Couldn't load Annotation DB meta information. Please try again in a moment. Error:" + req.responseText);
    });
  } else {
    new phantasus.AnnotationConvertTool(options.heatMap);
  }
};

phantasus.AnnotationConvertTool = function (heatMap) {
  var self = this;
  var project = heatMap.getProject();
  if (phantasus.annotationDBMeta.init && !_.size(phantasus.annotationDBMeta.dbs)) {
    throw new Error('There is no AnnotationDB on server. Ask administrator to put AnnotationDB sqlite databases in cacheDir/annotationdb folder');
  }

  var names = _.map(phantasus.annotationDBMeta.dbs, function (value, dbName) {
    return dbName + ' - ' + value.species.toString();
  });

  var rowMetadata = project.getFullDataset().getRowMetadata();
  var featureColumns = phantasus
    .MetadataUtil
    .getMetadataNames(rowMetadata);

  if (!_.size(featureColumns)) {
    throw new Error('There is no columns in feature data');
  }

  var firstDBName = _.first(names).split(' - ')[0];
  var $dialog = $('<div style="background:white;" title="' + this.toString() + '"></div>');
  var form = new phantasus.FormBuilder({
    formStyle: 'vertical'
  });

  [{
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
  }].forEach(function (a) {
    form.append(a);
  });

  form.$form.appendTo($dialog);
  form.$form.find('[name=specimen_DB]').on('change', function (e) {
    var newVal = $(this).val();
    var newDb = newVal.split(' - ')[0];
    var newColumns = phantasus.annotationDBMeta.dbs[newDb].columns;

    form.setOptions('source_column_type', newColumns, true);
    form.setOptions('result_column_type', newColumns, true);
  });

  $dialog.dialog({
    close: function (event, ui) {
      $dialog.dialog('destroy').remove();
    },

    resizable: true,
    height: 450,
    width: 600,
    buttons: [
      {
        text: "Cancel",
        click: function () {
          $(this).dialog("destroy").remove();
        }
      },
      {
        text: "Submit",
        click: function () {
          var $dialogContent = $('<div><span>' + self.toString() + '...</span><button class="btn' +
            ' btn-xs btn-default" style="margin-left:6px;display: none;">Cancel</button></div>');

          var $dialog = phantasus.FormBuilder.showInDraggableDiv({
            $content: $dialogContent,
            appendTo: heatMap.getContentEl(),
            width: 'auto'
          });

          self.execute({
            project: project,
            form: form
          }).always(function () {
            $dialog.remove();
          });
          $(this).dialog("destroy").remove();
        }
      }
    ]
  });
  this.$dialog = $dialog;
};

phantasus.AnnotationConvertTool.prototype = {
  toString: function () {
    return "Annotate from AnnotationDB";
  },
  execute: function (options) {
    var project = options.project;
    var dataset = project.getFullDataset();
    var promise = $.Deferred();

    var selectedFeatureName = options.form.getValue('source_column');
    var selectedDB = options.form.getValue('specimen_DB').split(' - ')[0];
    var columnType = options.form.getValue('source_column_type').split(' - ')[0];
    var keyType = options.form.getValue('result_column_type').split(' - ')[0];

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
      var req = ocpu.call("convertByAnnotationDB/print", args, function (newSession) {
        var result = JSON.parse(newSession.txt);

        var v = dataset.getRowMetadata().add(keyType);
        for (var i = 0; i < dataset.getRowCount(); i++) {
          v.setValue(i, result[i].toString());
        }

        v.getProperties().set("phantasus.dataType", "string");

        dataset.setESSession(Promise.resolve(newSession));

        project.trigger("trackChanged", {
          vectors: [v],
          display: []
        });

        promise.resolve();
      }, false, "::es");

      req.fail(function () {
        promise.reject();
        throw new Error("Could not annotate dataset. Please double check your parameters or contact administrator. Error: " + req.responseText);
      });

    });

    return promise;
  }
};
