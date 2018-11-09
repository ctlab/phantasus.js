/**
 *
 * @param pageOptions.el
 * @param pageOptions.tabManager
 * @constructor
 */
phantasus.LandingPage = function (pageOptions) {
  pageOptions = $.extend({}, {
    el: $('#vis')
  }, pageOptions);
  this.pageOptions = pageOptions;
  var _this = this;

  var $el = $('<div class="container" style="display: none;"></div>');
  this.$el = $el;
  var html = [];
  phantasus.Util.createPhantasusHeader().appendTo($el);
  html.push('<div data-name="help" class="pull-right"></div>');

  html.push('<h4>Open your own file</h4>');
  html.push('<div data-name="formRow" class="center-block"></div>');
  html.push('<div data-name="historyRow" class="center-block"></div>');
  html.push('<div style="display: none;" data-name="preloadedDataset"><h4>Or select a preloaded' +
    ' dataset</h4></div>');
  html.push('</div>');
  var $html = $(html.join(''));

  $html.appendTo($el);
  new phantasus.HelpMenu().$el.appendTo($el.find('[data-name=help]'));
  var formBuilder = new phantasus.FormBuilder();
  formBuilder.append({
    name: 'file',
    showLabel: false,
    value: '',
    type: 'file',
    required: true,
    help: phantasus.DatasetUtil.DATASET_FILE_FORMATS
  });

  formBuilder.$form.appendTo($el.find('[data-name=formRow]'));
  this.formBuilder = formBuilder;
  this.$sampleDatasetsEl = $el.find('[data-name=preloadedDataset]');

  this.tabManager = new phantasus.TabManager({landingPage: this});
  this.tabManager.on('change rename add remove', function (e) {
    var title = _this.tabManager.getTabText(_this.tabManager.getActiveTabId());
    if (title == null || title === '') {
      title = 'phantasus';
    }
    document.title = title;
  });
  if (pageOptions.tabManager) {
    this.tabManager = pageOptions.tabManager;
  } else {
    this.tabManager = new phantasus.TabManager({landingPage: this});
    this.tabManager.on('change rename add remove', function (e) {
      var title = _this.tabManager.getTabText(_this.tabManager.getActiveTabId());
      if (title == null || title === '') {
        title = 'phantasus';
      }
      document.title = title;
    });

    this.tabManager.$nav.appendTo($(this.pageOptions.el));
    this.tabManager.$tabContent.appendTo($(this.pageOptions.el));
  }

  this.$historyDatsetsEl = $el.find('[data-name=historyRow]');
  this.datasetHistory = new phantasus.DatasetHistory();

  this.datasetHistory.on('open', function (evt) {
    var dataset = evt.dataset;

    _this.open({dataset: dataset});
  });

  this.datasetHistory.on('changed', function () {
    _this.datasetHistory.render(_this.$historyDatsetsEl);
  });

  this.datasetHistory.render(this.$historyDatsetsEl);
}
;

phantasus.LandingPage.prototype = {
  open: function (openOptions) {
    this.dispose();
    var _this = this;

    var createGEOHeatMap = function(options)  {
      var req = ocpu.call('checkGPLs', { name : options.dataset.file }, function (session) {
        session.getMessages(function(success) {
          console.log('checkGPLs messages', '::', success);
        });
        session.getObject(function (filenames) {
          filenames = JSON.parse(filenames);
          // console.log("filenames", filenames, filenames.length);
          if (!filenames.length) {
            _this.show();
            throw new Error("Dataset" + " " + options.dataset.file + " does not exist");
          }
          if (filenames.length === 1) {
            new phantasus.HeatMap(options);
          }
          else {
            for (var j = 0; j < filenames.length; j++) {
              var specificOptions = options;
              specificOptions.dataset.file = filenames[j];

              new phantasus.HeatMap(specificOptions);
            }
          }
        })
      });
      req.fail(function () {
        throw new Error("Checking GPLs call to OpenCPU failed" + req.responseText);
      });
    };

    var createPreloadedHeatMap = function(options) {
      var req = ocpu.call('checkPreloadedNames', { name : options.dataset.file }, function(session) {
        session.getMessages(function(success) {
          console.log('checkPreloadedNames messages', success);
        });
        session.getObject(function(success) {
          var names = JSON.parse(success);
          // console.log(names);

          if (names.length === 0) {
            _this.show();
            throw new Error("Dataset" + " " + options.dataset.file + " does not exist");

          }

          for (var j = 0; j < names.length; j++) {
            var specificOptions = options;

            specificOptions.dataset.options.exactName = names[j];
            // console.log("specific", specificOptions);

            new phantasus.HeatMap(specificOptions);
          }

        })
      });
      req.fail(function () {
        throw new Error("Checking inside names call to OpenCPU failed" + req.responseText);
      });
    };

    var optionsArray = _.isArray(openOptions) ? openOptions : [openOptions];

    // console.log(optionsArray);
    for (var i = 0; i < optionsArray.length; i++) {
      var originalOptions = _.clone(optionsArray[i]);
      var options = optionsArray[i];
      options.tabManager = _this.tabManager;
      options.focus = i === 0;
      options.standalone = true;
      options.landingPage = _this;

      if (options.dataset.options && options.dataset.options.isGEO) {
        createGEOHeatMap(options);
        _this.datasetHistory.store(originalOptions)
      } else if (options.dataset.options && options.dataset.options.preloaded) {
        createPreloadedHeatMap(options);
        _this.datasetHistory.store(originalOptions)
      }
      else {
        // console.log("before loading heatmap from landing_page", options);
        new phantasus.HeatMap(options);
      }
    }

  },
  dispose: function () {
    this.formBuilder.setValue('file', '');
    this.$el.hide();
    $(window)
      .off(
        'paste.phantasus drop.phantasus dragover.phantasus dragenter.phantasus');
    this.formBuilder.off('change');
  },
  show: function () {
    var _this = this;
    this.$el.show();

    this.formBuilder.on('change', function (e) {
      var value = e.value;
      if (value !== '' && value != null) {
        _this.openFile(value);
      }
    });

    $(window).on('beforeunload.phantasus', function () {
      if (_this.tabManager.getTabCount() > 0) {
        return 'Are you sure you want to close phantasus?';
      }
    });
    $(window).on('paste.phantasus', function (e) {
      var tagName = e.target.tagName;
      if (tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA') {
        return;
      }

      var text = e.originalEvent.clipboardData.getData('text/plain');
      if (text != null && text.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        var url;
        if (text.indexOf('http') === 0) {
          url = text;
        } else {
          var blob = new Blob([text]);
          url = window.URL.createObjectURL(blob);
        }

        _this.openFile(url);
      }

    }).on('dragover.phantasus dragenter.phantasus', function (e) {
      e.preventDefault();
      e.stopPropagation();
    }).on(
      'drop.phantasus',
      function (e) {
        if (e.originalEvent.dataTransfer
          && e.originalEvent.dataTransfer.files.length) {
          e.preventDefault();
          e.stopPropagation();
          var files = e.originalEvent.dataTransfer.files;
          _this.openFile(files[0]);
        } else if (e.originalEvent.dataTransfer) {
          var url = e.originalEvent.dataTransfer.getData('URL');
          e.preventDefault();
          e.stopPropagation();
          _this.openFile(url);
        }
      });
    if (navigator.onLine && !this.sampleDatasets) {
      this.sampleDatasets = new phantasus.SampleDatasets({
        $el: this.$sampleDatasetsEl,
        show: true,
        callback: function (heatMapOptions) {
          _this.open(heatMapOptions);
        }
      });
    }
  },
  openFile: function (value) {
    var _this = this;
    var isGEO;
    var preloaded;
    if (value.name && (value.isGEO || value.preloaded)) {
      isGEO = value.isGEO;
      preloaded = value.preloaded;
      value = value.name;
    }

    var fileName = phantasus.Util.getFileName(value);
    if (fileName.toLowerCase().indexOf('.json') === fileName.length - 5) {
      phantasus.Util.getText(value).done(function (text) {
        _this.open(JSON.parse(text));
      }).fail(function (err) {
        phantasus.FormBuilder.showMessageModal({
          title: 'Error',
          message: 'Unable to load session'
        });
      });
    } else {
      var options = {
        dataset: {
          file: value,
          options: {
            interactive: true,
            isGEO: isGEO,
            preloaded: preloaded
          }
        }
      };

      phantasus.OpenDatasetTool.fileExtensionPrompt(fileName, function (readOptions) {
        // console.log("fileExtensionPrompt", readOptions);
        if (readOptions) {
          for (var key in readOptions) {
            options.dataset.options[key] = readOptions[key];
          }
        }
        _this.open(options);
      });
    }
  }
};
