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
  this.$el = $('<div class="container-fluid" style="height: 100%">'
    + '<div class="row" style="height: 100%">'
    + '<div data-name="configPane" class="col-xs-2"></div>'
    + '<div class="col-xs-10" id="draw-place-holder" style="height: 100%">'
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
    tooltipHelp: 'Places plot vertically and draws heatmap of selected dataset',
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

    if (self.promise) {
      self.promise.reject('Cancelled');
    }

    if (selectedDataset.getRowCount() === fullDataset.getRowCount()) {
      return;
    }

    self.promise = self.request(project);
    self.promise.then(self.draw.bind(self));
  }, 500);

  var updateHeatMap = _.debounce(function () {
    self.drawHeatmap();
  }, 500);

  this.formBuilder.$form.on('change', 'select', onChange);
  this.formBuilder.$form.on('change', 'input', onChange);
  project.getRowSelectionModel().on('selectionChanged.chart', onChange);
  project.on(phantasus.Project.Events.ROW_SORT_ORDER_CHANGED, updateHeatMap);
  project.on(phantasus.Project.Events.COLUMN_SORT_ORDER_CHANGED, updateHeatMap);

  this.project = project;

  var $configPane = this.$el.find('[data-name=configPane]');
  this.formBuilder.$form.appendTo($configPane);
  this.$el.appendTo(this.$dialog);
  this.$drawPlaceHolder = this.$el.find('#draw-place-holder');
  this.$dialog.dialog({
    open: function (event, ui) {
      $(this).css('overflow', 'hidden'); //this line does the actual hiding
    },
    close: function (event, ui) {
      project.getRowSelectionModel().off("selectionChanged.chart", onChange);
      self.$dialog.dialog('destroy').remove();
      event.stopPropagation();
    },
    /*resize: function () { //Don't let user change dialog screen for now
      updateHeatMap();
    },*/

    resizable: false,
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
    this.$drawPlaceHolder.empty();
    phantasus.Util.createLoadingEl().appendTo(this.$drawPlaceHolder);
    var promise = $.Deferred();

    var selectedDataset = project.getSelectedDataset();
    var fullDataset = project.getFullDataset();

    if (selectedDataset.getRowCount() === fullDataset.getRowCount()) {
      promise.reject('Invalid rows');
      // throw new Error('Invalid amount of rows are selected (zero rows or whole dataset selected)');
      return promise;
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
        width = 3;
    }


    fullDataset.getESSession().then(function (esSession) {
      ocpu.call('gseaPlot', {
        es: esSession,
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
            promise.resolve(self.imageURL);
          });
        });
      }, false, "::" + fullDataset.getESVariable())
        .fail(function () {
          promise.reject();
        });
    });

    return promise;
  },
  draw: function (url) {
    var vertical = this.formBuilder.getValue('vertical');
    this.$drawPlaceHolder.empty();
    var result;

    if (!vertical) {
      result = $( '<div style="position:relative; height: 100%;">' +
                    '<img src="' + url + '" style="max-width: 100%; height: 100%; position: absolute; margin: auto; top: 0; left: 0; right: 0; bottom: 0;">' +
                  '</div>');
      result.appendTo(this.$drawPlaceHolder);
    } else {
      result = $(['<div class="col-sm-5" style="height: 100%" id="heatmap-container"></div>',
                  '<div class="col-sm-7" style="position:relative; height: 100%;">',
                  '   <img src="' + url + '" style="max-width: 100%; height: 100%; position: absolute; margin: auto; top: 0; left: 0; right: 0; bottom: 0;">',
                  '</div>'].join(''));
      result.appendTo(this.$drawPlaceHolder);
      this.drawHeatmap();
    }
  },

  drawHeatmap: function () {
    var vertical = this.formBuilder.getValue('vertical');
    if (!vertical) {
      return;
    }


    var heatmapContainer = $('#heatmap-container');
    heatmapContainer.empty();
    var heatmap = new phantasus.HeatMapElementCanvas(this.project);
    heatmap.setDataset(this.project.getSortedFilteredDataset());

    var cs = new phantasus.HeatMapColorScheme(this.project);
    cs.setColorSupplierForCurrentValue(phantasus.AbstractColorSupplier.fromJSON({
      scalingMode: 'relative'
    }));

    heatmap.setColorScheme(cs);

    var canvas = $('<canvas></canvas>')[0];
    canvas.height = phantasus.CanvasUtil.BACKING_SCALE * $(heatmapContainer).height();
    canvas.style.height = $(heatmapContainer).height() + 'px';
    canvas.width = phantasus.CanvasUtil.BACKING_SCALE * $(heatmapContainer).width();
    canvas.style.width = $(heatmapContainer).width() + 'px';
    var context = canvas.getContext('2d');

    var positions = heatmap.getRowPositions();
    var totalCurrent = positions.getItemSize(positions.getLength() - 1)
      + positions.getPosition(positions.getLength() - 1);

    var size = positions.getSize();
    size = size * ($(heatmapContainer).height() / totalCurrent);
    size = Math.min(13, size);

    positions.setSize(size);


    var positions = heatmap.getColumnPositions();
    var totalCurrent = positions.getItemSize(positions.getLength() - 1)
      + positions.getPosition(positions.getLength() - 1);
    var size = positions.getSize();
    size = size * ($(heatmapContainer).width() / totalCurrent);
    size = Math.min(13, size);
    positions.setSize(size);


    $(canvas).appendTo(heatmapContainer);
    heatmap.draw({
      x: 0,
      y: 0,
      width: $(heatmapContainer).width(),
      height: $(heatmapContainer).height()
    }, context);

    heatmap.repaint();
  }
};
