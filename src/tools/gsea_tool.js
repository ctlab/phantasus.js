phantasus.gseaTool = function (project) {
  var self = this;

  var fullDataset = project.getFullDataset();
  var numberFields = phantasus.MetadataUtil.getMetadataSignedNumericFields(fullDataset
    .getRowMetadata());

  if (numberFields.length === 0) {
    throw new Error('No number fields available. Cannot rank by');
  }

  var rows = numberFields.map(function (field) {
    return field.getName();
  });

  this.$dialog = $('<div style="background:white;" title="gsea plot tool"><h4>Please select rows.</h4></div>');
  this.$el = $('<div class="container-fluid">'
    + '<div class="row">'
    + '<div data-name="configPane" class="col-xs-2"></div>'
    + '<div class="col-xs-10"><div style="position:relative;" data-name="chartDiv"></div></div>'
    + '</div></div>');

  var $notifyRow = this.$dialog.find('h4');

  this.formBuilder = new phantasus.FormBuilder({
    formStyle: 'vertical'
  });

  [{
    name: 'rank_by',
    options: rows,
    value: _.first(rows),
    type: 'select'
  }, {
    name: 'vertical',
    type: 'checkbox',
    value: false
  }/*, {
    name: 'chart_width',
    type: 'range',
    value: 400,
    min: 60,
    max: 800,
    step: 10
  }, {
    name: 'chart_height',
    type: 'range',
    value: 400,
    min: 60,
    max: 800,
    step: 10
  }*/].forEach(function (a) {
    self.formBuilder.append(a);
  });

  var onChange = _.debounce(function (e) {
    var selectedDataset = project.getSelectedDataset();
    var fullDataset = project.getSortedFilteredDataset();
    $notifyRow.toggle(selectedDataset.getRowCount() === fullDataset.getRowCount());

    if (selectedDataset.getRowCount() === fullDataset.getRowCount()) {
      return;
    }

    if (self.promise) {
      self.promise.reject('Cancelled');
    }

    self.request(project).then(self.draw.bind(self), function (e) {
      self.$chart.empty();
    });
  }, 500);

  this.formBuilder.$form.on('change', 'select', onChange);
  this.formBuilder.$form.on('change', 'input', onChange);
  project.getRowSelectionModel().on('selectionChanged.chart', onChange);


  var $configPane = this.$el.find('[data-name=configPane]');
  this.formBuilder.$form.appendTo($configPane);
  this.$el.appendTo(this.$dialog);
  this.$chart = this.$el.find("[data-name=chartDiv]");
  this.$dialog.dialog({
    close: function (event, ui) {
      project.getRowSelectionModel().off("selectionChanged.chart", onChange);
      self.$dialog.dialog('destroy').remove();
      event.stopPropagation();
    },

    resizable: true,
    height: 600,
    width: 900
  });

  onChange();
};

phantasus.gseaTool.prototype = {
  toString: function () {
    return 'gsea Plot';
  },
  request: function (project) {
    this.$chart.empty();
    phantasus.Util.createLoadingEl().appendTo(this.$chart);
    this.promise = $.Deferred();

    var selectedDataset = project.getSelectedDataset();
    var fullDataset = project.getSortedFilteredDataset();

    if (selectedDataset.getRowCount() === fullDataset.getRowCount()) {
      this.promise.reject('Invalid rows');
      // throw new Error('Invalid amount of rows are selected (zero rows or whole dataset selected)');
        return this.promise;
    }

    var idxs = selectedDataset.rowIndices.map(function (idx) {
      return idx + 1; // #' @param selectedGenes indexes of selected genes (starting from one, in the order of fData)
    });

    var self = this;
    var rankBy = this.formBuilder.getValue('rank_by');
    var rows = phantasus.Dataset.toJSON(fullDataset).rowMetadataModel.vectors;
    rows = rows.filter(function(row) { return row.name === rankBy; });

    var fvarLabels = rows.map(function (row) {
      return row.name
    });
    var fData = rows.reduce(function (acc, currentRow) {
      acc[currentRow.name] = currentRow.array;
      return acc;
    }, {});

    var vertical = this.formBuilder.getValue('vertical');

    var height = 4;//this.formBuilder.getValue('chart_height');
    var width = 6;//this.formBuilder.getValue('chart_width');
    if (vertical) {
        height = 6;
        width = 3;
    }


    var req = ocpu.call('gseaPlot', {
      fData: fData,
      fvarLabels: fvarLabels,
      rankBy: rankBy,
      selectedGenes: idxs,
      width: width,
      height: height,
      vertical: vertical
    }, function (session) {
      session.getObject(function (filenames) {
        var svgPath = JSON.parse(filenames)[0];
        var absolutePath = phantasus.Util.getFilePath(session, svgPath);
        phantasus.BlobFromPath.getFileObject(absolutePath, function (blob) {
          self.imageURL = URL.createObjectURL(blob);
          self.promise.resolve(self.imageURL);
        });
      });
    }).fail(function () {
      self.promise.reject();
    });

    return self.promise;
  },
  draw: function (url) {
    this.$chart.empty();
    var svg = $('<img src="' + url + '" style="max-width: 100%; height: 100%">');
    svg.appendTo(this.$chart);
  }
};
