phantasus.OpenFileTool = function (options) {
  this.options = options || {};
};
phantasus.OpenFileTool.prototype = {
  toString: function () {
    return 'Open' + (this.options.file != null ? (' - ' + this.options.file.name) : '');
  },
  gui: function () {
    var array = [{
      name: 'open_file_action',
      value: 'open',
      type: 'bootstrap-select',
      options: [{
        name: 'Open session',
        value: 'Open session'
      }, {
        divider: true
      }, {
        name: 'Append rows to current dataset',
        value: 'append'
      }, {
        name: 'Append columns to current dataset',
        value: 'append columns'
      }, {
        name: 'Overlay onto current dataset',
        value: 'overlay'
      }, {
        name: 'Open dataset in new tab',
        value: 'open'
      }, {
        divider: true
      }, {
        name: 'Open dendrogram',
        value: 'Open dendrogram'
      }]
    }];
    if (this.options.file == null) {
      array.push({
        name: 'file',
        showLabel: false,
        placeholder: 'Open your own file',
        value: '',
        type: 'file',
        required: true,
        help: phantasus.DatasetUtil.DATASET_AND_SESSION_FILE_FORMATS
      });
    }
    array.options = {
      ok: this.options.file != null,
      size: 'modal-lg'
    };
    return array;
  },
  init: function (project, form, initOptions) {
    var $preloaded = $('<div></div>');
    form.$form
      .find('[name=open_file_action]')
      .on('change', function (e) {
        var action = $(this).val();
        if (action === 'append columns' ||
          action === 'append' ||
          action === 'open' ||
          action === 'overlay') {
          form.setHelpText('file',
            phantasus.DatasetUtil.DATASET_FILE_FORMATS);
          $preloaded.show();
        } else if (action === 'Open dendrogram') {
          form.setHelpText('file',
            phantasus.DatasetUtil.DENDROGRAM_FILE_FORMATS);
          $preloaded.hide();
        } else if (action === 'Open session') {
          form.setHelpText('file', phantasus.DatasetUtil.SESSION_FILE_FORMAT);
          $preloaded.hide();
        }
      });

    if (this.options.file == null) {
      var _this = this;
      var collapseId = _.uniqueId('phantasus');
      $('<h4><a role="button" data-toggle="collapse" href="#'
        + collapseId
        + '" aria-expanded="false" aria-controls="'
        + collapseId + '">Preloaded datasets</a></h4>').appendTo($preloaded);
      var $sampleDatasets = $('<div data-name="sampleData" id="' + collapseId + '" class="collapse"' +
        ' id="' + collapseId + '" style="overflow:auto;"></div>');
      $preloaded.appendTo(form.$form);
      var sampleDatasets = new phantasus.SampleDatasets({
        $el: $sampleDatasets,
        callback: function (heatMapOptions) {
          _this.options.file = heatMapOptions.dataset;
          _this.ok();
        }
      });
      $sampleDatasets.appendTo($preloaded);
    }

    form.on('change', function (e) {
      var value = e.value;
      if (value !== '' && value != null) {
        form.setValue('file', value);
        _this.options.file = value;
        _this.ok();
      }
    });

  },

  execute: function (options) {
    var _this = this;
    var isInteractive = this.options.file == null;
    var heatMap = options.heatMap;
    if (!isInteractive) {
      options.input.file = this.options.file;
    }
    if (options.input.file.isGEO) {
      options.input.isGEO = options.input.file.isGEO;
      options.input.file = options.input.file.name;
    }
    if (options.input.file.preloaded) {
      options.input.preloaded = options.input.file.preloaded;
      options.input.file = options.input.file.name;
    }
    var project = options.project;
    if (options.input.open_file_action === 'Open session') {
      return phantasus.Util.getText(options.input.file).done(function (text) {
        var options = JSON.parse(text);
        options.tabManager = heatMap.getTabManager();
        options.focus = true;
        options.inheritFromParent = false;
        options.landingPage = heatMap.options.landingPage;
        new phantasus.HeatMap(options);
      }).fail(function (err) {
        phantasus.FormBuilder.showMessageModal({
          title: 'Error',
          message: 'Unable to load session',
          focus: document.activeElement
        });
      });
    } else if (options.input.open_file_action === 'append columns' ||
      options.input.open_file_action === 'append' ||
      options.input.open_file_action === 'open' ||
      options.input.open_file_action === 'overlay') {
      return new phantasus.OpenDatasetTool().execute(options);
    } else if (options.input.open_file_action === 'Open dendrogram') {
      phantasus.HeatMap.showTool(new phantasus.OpenDendrogramTool(
        options.input.file), options.heatMap);
    }
  }
};
