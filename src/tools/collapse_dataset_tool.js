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
    if (!collapseToFields || collapseToFields.length === 0) {
      throw new Error('Please select one or more fields to collapse to');
    }

    var dataset = project.getFullDataset();
    var rows = options.input.collapse === 'Rows';

    if (!rows) {
      dataset = new phantasus.TransposedDatasetView(dataset);
    }

    var allFields = phantasus.MetadataUtil.getMetadataNames(dataset.getRowMetadata());
    var collapseMethod = f.selectOne ? phantasus.SelectRow : phantasus.CollapseDataset;
    dataset = collapseMethod(dataset, collapseToFields, f, true);

    if (!rows) {
      dataset = phantasus.DatasetUtil.copy(new phantasus.TransposedDatasetView(dataset));
    }

    var set = new phantasus.Map();
    _.each(allFields, function (field) {
      set.set(field, true);
    });
    _.each(collapseToFields, function (field) {
      set.remove(field);
    });
    // hide fields that were not part of collapse to
    // console.log("Collapse ", set);
    // set.forEach(function (val, name) {
    //   heatMap.setTrackVisible(name, false, !rows);
    // });
    return new phantasus.HeatMap({
      name: heatMap.getName(),
      dataset: dataset,
      parent: heatMap,
      symmetric: false
    });
  }
};
