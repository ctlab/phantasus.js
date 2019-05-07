/**
 *
 * @param pageOptions.el
 * @param pageOptions.tabManager
 * @constructor
 */
phantasus.LandingPage = function (pageOptions) {
  pageOptions = $.extend({}, {
    el: $('#vis'),
    autoInit: true
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

  phantasus.datasetHistory.on('open', function (evt) {
    _this.open({dataset: evt});
  });

  phantasus.datasetHistory.on('changed', function () {
    phantasus.datasetHistory.render(_this.$historyDatsetsEl);
  });

  phantasus.datasetHistory.render(this.$historyDatsetsEl);

  if (this.pageOptions.autoInit) {
    var searchString = window.location.search;
    if (searchString.length === 0) {
      searchString = window.location.hash;
    }
    this.$el.prependTo($(document.body));
    if (searchString.length === 0) {
      this.show();
    } else {
      searchString = searchString.substring(1);
      var keyValuePairs = searchString.split('&');
      var params = {};
      for (var i = 0; i < keyValuePairs.length; i++) {
        var pair = keyValuePairs[i].split('=');
        params[pair[0]] = decodeURIComponent(pair[1]);
      }
      // console.log(params);
      if (params.json) {
        var options = JSON.parse(decodeURIComponent(params.json));
        _this.open(options);
      } else if (params.url) { // url to config
        var $loading = phantasus.Util.createLoadingEl();
        $loading.appendTo($('#vis'));
        phantasus.Util.getText(params.url).done(function (text) {
          var options = JSON.parse(text);
          _this.open(options);
        }).fail(function (err) {
          console.log('Unable to get config file');
          _this.show();
        }).always(function () {
          $loading.remove();
        });
      } else if (params.geo) {
        var options = {
          dataset: {
            file: params.geo.toUpperCase(),
            options: {
              interactive: true,
              isGEO: true
            }
          }
        };
        this.open(options);
      } else if (params.session) {
        var options = {
          dataset: {
            file: params.session,
            options: {
              interactive: true,
              session: true
            }
          }
        };
        _this.open(options);
      } else if (params.preloaded) {
        var options = {
          dataset: {
            file: params.preloaded,
            options: {
              interactive: true,
              preloaded: true
            }
          }
        };
        _this.open(options);
      } else {
        this.show();
      }
    }
  }
};

phantasus.LandingPage.prototype = {
  open: function (openOptions) {
    this.dispose();
    var _this = this;

    var createGEOHeatMap = function(options)  {
      var req = ocpu.call('checkGPLs/print', { name : options.dataset.file }, function (session) {
        // session.getMessages(function(success) {
        //   console.log('checkGPLs messages', '::', success);
        // });
        var filenames = JSON.parse(session.txt);
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
      });
      req.fail(function () {
        _this.show();
        throw new Error("Checking GPLs call to OpenCPU failed" + req.responseText);
      });
    };

    var createPreloadedHeatMap = function(options) {
      options.dataset.options.exactName = options.dataset.file;
      new phantasus.HeatMap(options);
    };

    var createSessionHeatMap = function (options) {
      //http://localhost:3000/?session=x06c106048e7cb1
      var req = ocpu.call('sessionExists/print', { sessionName : options.dataset.file }, function(session) {
        var result = JSON.parse(session.txt);

        if (!result.result) {
          _this.show();
          throw new Error("Dataset" + " " + options.dataset.file + " does not exist");
        }

        var specificOptions = options;
        new phantasus.HeatMap(specificOptions);
      });
      req.fail(function () {
        _this.show();
        throw new Error("Failed to check if the session exists:" + req.responseText);
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
      } else if (options.dataset.options && options.dataset.options.preloaded) {
        createPreloadedHeatMap(options);
      } else if (options.dataset.options && options.dataset.options.session) {
        createSessionHeatMap(options);
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
    if (fileName.toLowerCase().endsWith('.json')) {
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
