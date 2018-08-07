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


  var annotations = ['(None)'].concat(phantasus.MetadataUtil.getMetadataNames(fullDataset.getColumnMetadata()))

  this.$dialog = $('<div style="background:white;" title="gsea plot tool"><h4>Please select rows.</h4></div>');
  this.$el = $('<div class="container-fluid" style="height: 100%">'
    + '<div class="row" style="height: 100%">'
    + '<div data-name="configPane" class="col-xs-2"></div>'
    + '<div class="col-xs-10" style="height: 100%">'
    + '   <div style="position:relative; height: 100%;" data-name="chartDiv"></div>'
    + '</div>'
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
  }, {
    name: 'annotate_by',
    options: annotations,
    value: _.first(annotations),
    type: 'select'
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
    open: function (event, ui) {
      $(this).css('overflow', 'hidden'); //this line does the actual hiding
    },
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
    var fullDataset = project.getFullDataset();

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

    var vertical = this.formBuilder.getValue('vertical');


    var height = 4;//this.formBuilder.getValue('chart_height');
    var width = 6;//this.formBuilder.getValue('chart_width');
    if (vertical) {
        height = 6;
        width = 6;
    }

    var request = {
      rankBy: rankBy,
      selectedGenes: idxs,
      width: width,
      height: height,
      vertical: vertical,
      addHeatmap: true
    };

    var annotateBy = this.formBuilder.getValue('annotate_by');
    (annotateBy === "(None)") ?
      request.width = width - 1 :
      request.showAnnotation = annotateBy;



    fullDataset.getESSession().then(function (esSession) {
      request.es = esSession;

      ocpu.call('gseaPlot', request, function (session) {
        session.getObject(function (filenames) {
          var svgPath = JSON.parse(filenames)[0];
          var absolutePath = phantasus.Util.getFilePath(session, svgPath);
          phantasus.BlobFromPath.getFileObject(absolutePath, function (blob) {
            self.imageURL = URL.createObjectURL(blob);
            self.promise.resolve(self.imageURL);
          });
        });
      }, false, "::" + fullDataset.getESVariable())
        .fail(function () {
          self.promise.reject();
        });
    })

    return self.promise;
  },
  draw: function (url) {
    this.$chart.empty();
    var svg = $('<img src="' + url + '" style="max-width: 100%; height: 100%; position: absolute; margin: auto; top: 0; left: 0; right: 0; bottom: 0;">');
    svg.appendTo(this.$chart);
  }
};
