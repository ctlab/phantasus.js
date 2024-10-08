phantasus.CollapseDatasetTool = function () {
};

phantasus.CollapseDatasetTool.Functions = [
  phantasus.Mean, phantasus.Median, phantasus.Min,
  phantasus.Max, phantasus.Sum, phantasus.MaximumMeanProbe,
  phantasus.MaximumMedianProbe
];

phantasus.CollapseDatasetTool.Functions.fromString = function (s) {
  for (var i = 0; i < phantasus.CollapseDatasetTool.Functions.length; i++) {
    if (phantasus.CollapseDatasetTool.Functions[i].toString() === s) {
      return phantasus.CollapseDatasetTool.Functions[i];
    }
  }
  throw new Error(s + ' not found');
};

phantasus.CollapseDatasetTool.prototype = {
  toString: function () {
    return 'Collapse';
  },

  init: function (project, form) {
    var setValue = function (val) {
      var isRows = val === 'Rows';
      var names = phantasus
        .MetadataUtil
        .getMetadataNames(
          isRows ?
            project.getFullDataset().getRowMetadata() :
            project.getFullDataset().getColumnMetadata());

      form.setOptions('collapse_to_fields', names);
    };

    form.$form.find('[name=collapse]').on('change', function (e) {
      setValue($(this).val());
    });

    form.$form.find('[name=collapse_method]').on('change', function (e) {
      form.setVisible('percentile', $(this).val() === phantasus.Percentile.toString());
      var collapsableColumns = !phantasus.CollapseDatasetTool.Functions.fromString($(this).val()).selectOne;
      form.setVisible('collapse', collapsableColumns);

      if (!collapsableColumns) {
        setValue('Rows');
      }
    });


    setValue('Rows');
  },

  gui: function () {
    return [{
      name: 'collapse_method',
      options: phantasus.CollapseDatasetTool.Functions,
      value: phantasus.CollapseDatasetTool.Functions[1],
      type: 'select'
    }, {
      name: 'collapse',
      options: ['Columns', 'Rows'],
      value: 'Rows',
      type: 'radio'
    }, {
      name: 'collapse_to_fields',
      options: [],
      type: 'select',
      multiple: true
    }, {
      name: 'omit_unannotated',
      type: 'checkbox',
      value: true
    }];
  },

  execute: function (options) {
    var project = options.project;
    var heatMap = options.heatMap;
    var f = phantasus
      .CollapseDatasetTool
      .Functions
      .fromString(options.input.collapse_method);

    var collapseToFields = options.input.collapse_to_fields;
    var omitUnannotated = options.input.omit_unannotated;
    if (!collapseToFields || collapseToFields.length === 0) {
      throw new Error('Please select one or more fields to collapse to');
    }

    var dataset = project.getFullDataset();
    var rows = options.input.collapse === 'Rows';
    if (!rows) {
      dataset = new phantasus.TransposedDatasetView(dataset);
    }

    if (omitUnannotated) {
      var omitCheck = function (x) {
        return !x || x.toString() === '' || x.toString() === 'NA'
      };
      var fieldMeta = dataset.getRowMetadata();
      var aoa = collapseToFields
        .map(function (field) {
          return phantasus.VectorUtil.toArray(fieldMeta.getByName(field));
        })

      var keepIndexes = _.zip
        .apply(null, aoa)
        .reduce(function (acc, value, index) {
          if (value.some(omitCheck)) {
            return acc;
          }

          acc.push(index);
          return acc;
        }, []);

      dataset = new phantasus.SlicedDatasetView(dataset, keepIndexes);
    }

    var collapseMethod = f.selectOne ? phantasus.SelectRow : phantasus.CollapseDataset;
    dataset = collapseMethod(dataset, collapseToFields, f, true);
    if (!rows) {
      dataset = phantasus.DatasetUtil.copy(new phantasus.TransposedDatasetView(dataset));
    }

    var oldDataset = project.getFullDataset();
    var oldSession = oldDataset.getESSession();
    if (oldSession) {
      dataset.setESSession(new Promise(function (resolve, reject) {
        oldSession.then(function (esSession) {
          var args = {
            es: esSession,
            selectOne: Boolean(f.selectOne),
            isRows: rows,
            fn: f.rString(),
            fields: collapseToFields,
            removeEmpty: omitUnannotated
          };

          ocpu
            .call("collapseDataset", args, function (newSession) {
              resolve(newSession);
            }, false, "::es")
            .fail(function () {
              reject();
              throw new Error("Collapse dataset failed. See console");
            });
        });
      }));

    }

    return new phantasus.HeatMap({
      name: heatMap.getName(),
      dataset: dataset,
      parent: heatMap,
      symmetric: false
    });
  }
};
