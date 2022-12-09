/**
 * Action object contains
 * @param options.which Array of key codes
 * @param options.shift Whether shift key is required
 * @param options.commandKey Whether command key is required
 * @param options.name Shortcut name
 * @param options.cb Function callback
 * @param options.accept Additional function to test whether to accept shortcut
 * @param options.icon Optional icon to display
 */
phantasus.ActionManager = function () {
  this.actionNameToAction = new phantasus.Map();
  this.actions = [];
  // TODO copy all row/column metadata
  // pin/unpin tab,
  // header stuff-display, delete.
  this.add({
    ellipsis: false,
    name: 'Sort/Group',
    cb: function (options) {
      new phantasus.SortDialog(options.heatMap.getProject());
    },
    icon: 'fa fa-sort-alpha-asc'
  });

  var $filterModal = null;
  this.add({
    name: 'Filter',
    ellipsis: false,
    cb: function (options) {
      if ($filterModal == null) {
        var filterModal = [];
        var filterLabelId = _.uniqueId('phantasus');
        filterModal
          .push('<div class="modal" tabindex="1" role="dialog" aria-labelledby="'
            + filterLabelId + '">');
        filterModal.push('<div class="modal-dialog" role="document">');
        filterModal.push('<div class="modal-content">');
        filterModal.push('<div class="modal-header">');
        filterModal
          .push('<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>');
        filterModal.push('<h4 class="modal-title" id="' + filterLabelId
          + '">Filter</h4>');
        filterModal.push('</div>');
        filterModal.push('<div class="modal-body"></div>');
        filterModal.push('<div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div>');
        filterModal.push('</div>');
        filterModal.push('</div>');
        filterModal.push('</div>');
        $filterModal = $(filterModal.join(''));
        $filterModal.on('mousewheel', function (e) {
          e.stopPropagation();
        });
        var $filter = $('<div></div>');
        $filter.appendTo($filterModal.find('.modal-body'));
        var filterHtml = ['<ul class="nav nav-tabs" id="rowsOrColumns">',
                          ' <li class="active"><a>Rows</a></li>',
                          ' <li><a>Columns</a></li>',
                          '</ul>'];
        // filterHtml
        //   .push('<div class="radio"><label><input type="radio" name="rowsOrColumns" value="rows" checked>Rows</label></div> ');
        // filterHtml
        //   .push('<div class="radio"><label><input type="radio" name="rowsOrColumns" value="columns">Columns</label></div>');

        var $filterChooser = $(filterHtml.join(''));
        $filterChooser.appendTo($filter);
        var columnFilterUI = new phantasus.FilterUI(options.heatMap.getProject(), true);
        var rowFilterUI = new phantasus.FilterUI(options.heatMap.getProject(), false);
        // options.heatMap.getProject().getRowFilter().on('focus', function (e) {
        //   $filterChooser.find('[value=rows]').prop('checked', true);
        //   columnFilterUI.$div.hide();
        //   rowFilterUI.$div.show();
        //   $filterModal.modal('show');
        //   phantasus.Util.trackEvent({
        //     eventCategory: '',
        //     eventAction: 'rowFilter'
        //   });
        //
        // });
        // options.heatMap.getProject().getColumnFilter().on('focus', function (e) {
        //   $filterChooser.find('[value=columns]').prop('checked', true);
        //   columnFilterUI.$div.show();
        //   rowFilterUI.$div.hide();
        //   $filterModal.modal('show');
        //   phantasus.Util.trackEvent({
        //     eventCategory: '',
        //     eventAction: 'columnFilter'
        //   });
        // });
        rowFilterUI.$div.appendTo($filter);
        columnFilterUI.$div.appendTo($filter);
        columnFilterUI.$div.css('display', 'none');
        var filterTabs = $filterChooser.find('li');
        filterTabs.on('click', function (e) {
          filterTabs.toggleClass('active', false);
          var target = $(e.currentTarget);
          var mode = target.text();
          target.toggleClass('active', true);
          if (mode === 'Columns') {
            columnFilterUI.$div.show();
            rowFilterUI.$div.hide();
          } else {
            columnFilterUI.$div.hide();
            rowFilterUI.$div.show();
          }
          e.preventDefault();
        });
        $filterModal.appendTo(options.heatMap.$content);
        $filterModal.on('hidden.bs.modal', function () {
          options.heatMap.focus();
        });
      }
      $filterModal.modal('show');
    },
    icon: 'fa fa-filter'
  });

  this.add({
    name: 'Options',
    ellipsis: false,
    cb: function (options) {
      options.heatMap.showOptions();
    },
    icon: 'fa fa-cog'
  });

  this.add({
    which: [191], // slash
    commandKey: true,
    global: true,
    name: 'Toggle Search',
    cb: function (options) {
      options.heatMap.getToolbar().toggleSearch();
    }
  });

  //
  this.add({
    name: 'Close Tab',
    cb: function (options) {
      options.heatMap.getTabManager().remove(options.heatMap.tabId);
    }
  });
  this.add({
    name: 'Rename Tab',
    ellipsis: false,
    cb: function (options) {
      options.heatMap.getTabManager().rename(options.heatMap.tabId);
    }
  });

  this.add({
    which: [88], // x
    commandKey: true,
    name: 'New Heat Map',
    accept: function (options) {
      return (!options.isInputField || window.getSelection().toString() === '');
    },

    cb: function (options) {
      phantasus.HeatMap.showTool(new phantasus.NewHeatMapTool(),
        options.heatMap);
    }
  });

  this.add({
    name: 'Submit to Shiny GAM',
    cb: function (options) {
      phantasus.HeatMap.showTool(new phantasus.shinyGamTool(), options.heatMap);
    },
    icon: 'fa fa-share-square-o'
  });

  if (phantasus.Util.getURLParameter('debug') !== null) {
    this.add({
      name: phantasus.ProbeDebugTool.prototype.toString(),
      cb: function (options) {
        phantasus.HeatMap.showTool(new phantasus.ProbeDebugTool(), options.heatMap)
      }
    });

    this.add({
      name: "DEBUG: Expose project",
      cb: function (options) {
        window.project = options.heatMap.project;
        window.dataset = options.heatMap.project.getFullDataset();
        window.heatmap = options.heatMap;
      }
    });


    this.add({
      name: phantasus.ReproduceTool.prototype.toString(),
      cb: function (options) {
        new phantasus.ReproduceTool(
          options.heatMap.getProject()
        );
      }
    });
  }


  this.add({
    name: 'Submit to Enrichr',
    cb: function (options) {
      new phantasus.enrichrTool(
        options.heatMap.getProject()
      );
    },
    icon: 'fa'
  });

  this.add({
    name: phantasus.fgseaTool.prototype.toString(),
    cb: function (options) {
      phantasus.initFGSEATool(options);
    },
    icon: 'fa'
  });

  this.add({
    name: phantasus.gseaTool.prototype.toString(),
    cb: function (options) {
      new phantasus.gseaTool(
        options.heatMap,
        options.heatMap.getProject()
      );
    }
  });

  this.add({
    name: phantasus.volcanoTool.prototype.toString(),
    cb: function (options) {
      new phantasus.volcanoTool(
        options.heatMap,
        options.heatMap.getProject()
      );
    }
  });

  this.add({
    which: [67], // C
    commandKey: true,
    name: 'Copy'
  });

  this.add({
    which: [86], // V
    commandKey: true,
    name: 'Paste Dataset'
  });

  this.add({
    global: true,
    name: 'Open',
    ellipsis: false,
    cb: function (options) {
      phantasus.HeatMap.showTool(new phantasus.OpenFileTool(), options.heatMap);
    },
    which: [79],
    commandKey: true,
    icon: 'fa fa-folder-open-o'
  });


  this.add({
    name: 'Annotate',
    children: [
      'Annotate rows',
      'Annotate columns'],
    icon: 'fa fa-list'
  });

  this.add({
    name: 'Annotate rows',
    children: [
      'From file', 'From database']
  });

  this.add({
    name: 'Differential expression',
    children: [
      'Limma',
      'DESeq2 (experimental)',
      'Marker Selection'],
    icon: 'fa fa-list'
  });

  this.add({
    name: 'Clustering',
    children: [
      'K-means',
      'Nearest Neighbors',
      'Hierarchical Clustering'],
    icon: 'fa'
  });

  this.add({
    name: 'Plots',
    children: [
      'Chart',
      'PCA Plot',//why this is not done the same way as below
      phantasus.gseaTool.prototype.toString(),
      phantasus.volcanoTool.prototype.toString()],
    icon: 'fa fa-line-chart'
  });

  this.add({
    name: 'Pathway analysis',
    children: [
      'Submit to Enrichr',
      phantasus.fgseaTool.prototype.toString()],
    icon: 'fa fa-table'
  });

  this.add({
    name: 'Annotate columns',
    cb: function (options) {
      phantasus.HeatMap.showTool(new phantasus.AnnotateDatasetTool({target: 'Columns'}), options.heatMap);
    }
  });

  this.add({
    name: 'From file',
    cb: function (options) {
      phantasus.HeatMap.showTool(new phantasus.AnnotateDatasetTool({target: 'Rows'}), options.heatMap);
    }
  });

  this.add({
    name: 'From database',
    cb: function (options) {
      phantasus.initAnnotationConvertTool(options);
    }
  });

  this.add({
    ellipsis: false,
    name: 'Save Image',
    gui: function () {
      return new phantasus.SaveImageTool();
    },
    cb: function (options) {
      phantasus.HeatMap.showTool(this.gui(),
        options.heatMap);
    },
    which: [83],
    commandKey: true,
    global: true,
    icon: 'fa fa-file-image-o'
  });

  this.add({
    ellipsis: false,
    name: 'Save Dataset',
    gui: function () {
      return new phantasus.SaveDatasetTool();
    },
    cb: function (options) {
      phantasus.HeatMap.showTool(this.gui(),
        options.heatMap);
    },
    // shiftKey: true,
    // which: [83],
    // commandKey: true,
    // global: true,
    icon: 'fa fa-floppy-o'
  });

  this.add({
    ellipsis: false,
    name: 'Save Session',
    gui: function () {
      return new phantasus.SaveSessionTool();
    },
    cb: function (options) {
      phantasus.HeatMap.showTool(this.gui(), options.heatMap);
    },
    icon: 'fa fa-anchor'
  });

  this.add({
    ellipsis: true,
    name: 'Get session link',
    cb: function (options) {
      var dataset = options.heatMap.getProject().getFullDataset();
      dataset.getESSession().then(function (es) {
        var key = es.getKey();
        var location = window.location;
        var datasetName = options.heatMap.getName();
        var heatmapJson = options.heatMap.toJSON({dataset: false});

        var publishReq = ocpu.call('publishSession/print', { sessionName: key, datasetName: datasetName, heatmapJson: heatmapJson }, function (tempSession) {
          var parsedJSON = JSON.parse(tempSession.txt);
          if (!parsedJSON.result === false) {
            throw new Error('Failed to make session accessible');
          }

          var newLocation = location.origin + location.pathname + '?session=' + tempSession.key;
          var formBuilder = new phantasus.FormBuilder();
          formBuilder.append({
            name: 'Link',
            readonly: true,
            value: newLocation
          });

          formBuilder.append({
            name: 'copy',
            type: 'button'
          });

          formBuilder.$form.find('button').on('click', function () {
            formBuilder.$form.find('input')[0].select();
            document.execCommand('copy');
          });

          formBuilder.appendContent('<h4>Please note that link will be valid for 30 days.</h4>');

          phantasus.FormBuilder.showInModal({
            title: 'Get session link',
            close: 'Close',
            html: formBuilder.$form,
            focus: options.heatMap.getFocusEl()
          });
        });

        publishReq.fail(function () {
          throw new Error('Failed to make session accessible: ' + publishReq.responseText);
        });
      })
    }
  });
  this.add({
    name: 'About',
    cb: function (options) {
      var $div = $([
        '<div>',
        'Phantasus version: ' + PHANTASUS_VERSION + ', build: ' + PHANTASUS_BUILD + '<br/>',
        'Changelog available at: <a href="https://raw.githubusercontent.com/ctlab/phantasus/master/NEWS" target="_blank">Github</a><br/>',
        'Source Code available at: <a href="http://github.com/ctlab/phantasus" target="_blank">Github</a>',
        '</div>'
      ].join('\n'));

      phantasus.FormBuilder.showInModal({
        title: 'About Phantasus',
        close: 'Close',
        html: $div,
        focus: options.heatMap.getFocusEl()
      });
    }
  });

  this.add({
    name: phantasus.aboutDataset.prototype.toString(),
    cb: function (options) {
      phantasus.aboutDataset({
        project: options.heatMap.getProject()
      })
    },
  });

  if (typeof Plotly !== 'undefined') {
    this.add({
      name: 'Chart',
      cb: function (options) {
        new phantasus.ChartTool({
          project: options.heatMap.getProject(),
          heatmap: options.heatMap,
          getVisibleTrackNames: _.bind(
            options.heatMap.getVisibleTrackNames, options.heatMap)
        });
      },
      icon: 'fa'
    });

    this.add({
      name: 'PCA Plot',
      cb: function (options) {
        new phantasus.PcaPlotTool({
          project: options.heatMap.getProject()
        });
      },
      icon: 'fa'
    });
  }

  this.add({
    name: 'Zoom In',
    cb: function (options) {
      options.heatMap.zoom(true);
    },
    which: [107, 61, 187]
  });
  this.add({
    name: 'Zoom Out',
    cb: function (options) {
      options.heatMap.zoom(false);
    },
    which: [173, 189, 109]
  });

  this.add({
    name: 'Fit To Window',
    cb: function (options) {
      options.heatMap.fitToWindow({fitRows: true, fitColumns: true, repaint: true});
    },
    which: [48], // zero
    commandKey: true,
    icon: 'fa fa-compress'
  });
  this.add({
    name: 'Fit Columns To Window',
    cb: function (options) {
      options.heatMap.fitToWindow({fitRows: false, fitColumns: true, repaint: true});
    }
  });
  this.add({
    name: 'Fit Rows To Window',
    cb: function (options) {
      options.heatMap.fitToWindow({fitRows: true, fitColumns: false, repaint: true});
    }
  });
  this.add({
    name: '100%',
    cb: function (options) {
      options.heatMap.resetZoom();
    },
    button: '100%'
  });

  this.add({
    which: [35],
    name: 'Go To End',
    cb: function (options) {
      options.heatMap.scrollLeft(options.heatMap.heatmap.getPreferredSize().width);
      options.heatMap.scrollTop(options.heatMap.heatmap.getPreferredSize().height);
    }
  });
  this.add({
    which: [36], // home key
    name: 'Go To Start',
    cb: function (options) {
      options.heatMap.scrollLeft(0);
      options.heatMap.scrollTop(0);
    }
  });
  this.add({
    which: [34], // page down
    commandKey: true,
    name: 'Go To Bottom',
    cb: function (options) {
      options.heatMap
        .scrollTop(options.heatMap.heatmap.getPreferredSize().height);
    }
  });
  this.add({
    which: [34], // page down
    commandKey: false,
    name: 'Scroll Page Down',
    cb: function (options) {
      var pos = options.heatMap.scrollTop();
      options.heatMap.scrollTop(pos + options.heatMap.heatmap.getUnscaledHeight()
        - 2);
    }
  });

  this.add({
    which: [33], // page up
    commandKey: true,
    name: 'Go To Top',
    cb: function (options) {
      options.heatMap
        .scrollTop(0);
    }
  });
  this.add({
    which: [33], // page up
    commandKey: false,
    name: 'Scroll Page Up',
    cb: function (options) {
      var pos = options.heatMap.scrollTop();
      options.heatMap.scrollTop(pos - options.heatMap.heatmap.getUnscaledHeight()
        + 2);
    }
  });

  this.add({
    which: [38], // up arrow
    commandKey: true,
    name: 'Zoom Out Rows',
    cb: function (options) {
      options.heatMap.zoom(false, {
        columns: false,
        rows: true
      });
    }
  });
  this.add({
    which: [38], // up arrow
    commandKey: false,
    name: 'Scroll Up',
    cb: function (options) {
      options.heatMap.scrollTop(options.heatMap.scrollTop() - 8);
    }
  });

  this.add({
    which: [40], // down arrow
    commandKey: true,
    name: 'Zoom In Rows',
    cb: function (options) {
      options.heatMap.zoom(true, {
        columns: false,
        rows: true
      });
    }
  });
  this.add({
    which: [40], // down arrow
    commandKey: false,
    name: 'Scroll Down',
    cb: function (options) {
      options.heatMap.scrollTop(options.heatMap.scrollTop() + 8);
    }
  });

  this.add({
    which: [37], // left arrow
    commandKey: true,
    name: 'Zoom Out Columns',
    cb: function (options) {
      options.heatMap.zoom(false, {
        columns: true,
        rows: false
      });
    }
  });
  this.add({
    which: [37], // left arrow
    commandKey: false,
    name: 'Scroll Left',
    cb: function (options) {
      options.heatMap.scrollLeft(options.heatMap.scrollLeft() - 8);
    }
  });

  this.add({
    which: [39], // right arrow
    commandKey: true,
    name: 'Zoom In Columns',
    cb: function (options) {
      options.heatMap.zoom(true, {
        columns: true,
        rows: false
      });
    }
  });
  this.add({
    which: [39], // right arrow
    commandKey: false,
    name: 'Scroll Right',
    cb: function (options) {
      options.heatMap.scrollLeft(options.heatMap.scrollLeft() + 8);
    }
  });
  this.add({
    name: 'Documentation',
    cb: function () {
      window
        .open('https://ctlab.github.io/phantasus-doc/');
    }
  });
  this.add({
    icon: 'fa fa-code',
    name: 'Source Code',
    cb: function () {
      window.open('https://github.com/ctlab/phantasus');
    }
  });
  var $findModal;
  var $search;

  this.add({
    which: [65],
    ellipsis: false,
    shiftKey: true,
    commandKey: true,
    name: 'Search Menus',
    cb: function (options) {
      if ($findModal == null) {
        var findModal = [];
        var id = _.uniqueId('phantasus');
        findModal
          .push('<div class="modal" tabindex="1" role="dialog" aria-labelledby="'
            + id + '">');
        findModal.push('<div class="modal-dialog" role="document">');
        findModal.push('<div class="modal-content">');
        findModal.push('<div class="modal-header">');
        findModal
          .push('<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>');
        findModal.push('<h4 class="modal-title" id="' + id
          + '">Enter action</h4>');
        findModal.push('</div>');
        findModal.push('<div class="modal-body ui-front"><input class="form-control input-sm"></div>');
        findModal.push('</div>');
        findModal.push('</div>');
        findModal.push('</div>');
        $findModal = $(findModal.join(''));
        $findModal.appendTo(options.heatMap.$content);
        var allActions = options.heatMap.getActionManager().getActions();
        $search = $findModal.find('input');
        $search.on('keyup', function (e) {
          if (e.which === 13) {
            var text = $search.val().trim();
            if (text !== '') {
              var action = _this.getAction(text);
              if (action) {
                $findModal.modal('hide');
                _this.execute(text, {event: e});
              }
            }
          }
        });
        phantasus.Util.autosuggest({
          $el: $search,
          multi: false,
          suggestWhenEmpty: false,
          //  history: options.history,
          filter: function (tokens, response) {
            var token = tokens[0].trim();
            var matches = [];
            var replaceRegex = new RegExp('(' + phantasus.Util.escapeRegex(token) + ')', 'i');
            for (var i = 0; i < allActions.length; i++) {
              if (allActions[i].cb) {
                var name = allActions[i].name;
                if (replaceRegex.test(name)) {
                  matches.push({
                    clear: true,
                    value: name,
                    label: '<span style="margin-left: 10px">'
                    + name.replace(replaceRegex, '<b>$1</b>') + '</span>'
                  });
                }
              }
            }
            response(matches);

          },
          select: function () {
            setTimeout(function () {
              var text = $search.val().trim();
              if (text !== '') {
                var action = _this.getAction(text);
                if (action) {
                  $findModal.modal('hide');
                  _this.execute(text);
                }
              }
            }, 20);

          }
        });
        $findModal.on('hidden.bs.modal', function () {
          options.heatMap.focus();
        });
      }
      $findModal.modal('show');
      $search.focus();
    }
  });
  this.add({
    name: 'Keyboard Shortcuts',
    cb: function (options) {
      new phantasus.HeatMapKeyListener(options.heatMap).showKeyMapReference();
    }
  });

  /*this.add({
    name: 'Linking',
    cb: function () {
      window
        .open('/linking.html');
    }
  });*/
  this.add({
    name: 'Contact',
    icon: 'fa fa-envelope-o',
    cb: function (options) {
      phantasus.FormBuilder.showInModal({
        title: 'Contact',
        html: 'Please email us at alsergbox@gmail.com',
        focus: options.heatMap.getFocusEl()
      });
    }
  });

  this.add({
    which: [65], // a
    commandKey: true,
    name: 'Select All',
    accept: function (options) {
      var active = options.heatMap.getActiveComponent();
      return (active === 'rowTrack' || active === 'columnTrack');
    },
    cb: function (options) {
      var active = options.heatMap.getActiveComponent();
      var selectionModel = active === 'rowTrack' ? options.heatMap.getProject()
        .getRowSelectionModel() : options.heatMap.getProject()
        .getColumnSelectionModel();
      var count = active === 'rowTrack' ? options.heatMap.getProject()
        .getSortedFilteredDataset().getRowCount() : options.heatMap
        .getProject().getSortedFilteredDataset()
        .getColumnCount();
      var indices = new phantasus.Set();
      for (var i = 0; i < count; i++) {
        indices.add(i);
      }
      selectionModel.setViewIndices(indices, true);
    }
  });

  var invertAction = function (options, isColumns) {
    var model = isColumns ? options.heatMap.getProject().getColumnSelectionModel() : options.heatMap.getProject().getRowSelectionModel();
    var viewIndices = model.getViewIndices();
    var inverse = new phantasus.Set();
    var n = n = isColumns ? options.heatMap.getProject().getSortedFilteredDataset().getColumnCount() : options.heatMap.getProject().getSortedFilteredDataset().getRowCount();
    for (var i = 0; i < n; i++) {
      if (!viewIndices.has(i)) {
        inverse.add(i);
      }
    }
    model.setViewIndices(inverse, true);
  };
  this.add({
    name: 'Invert Selected Rows',
    cb: function (options) {
      invertAction(options, false);
    }
  });
  this.add({
    name: 'Invert Selected Columns',
    cb: function (options) {
      invertAction(options, true);
    }
  });
  var clearAction = function (options, isColumns) {
    var model = isColumns ? options.heatMap.getProject()
      .getColumnSelectionModel() : options.heatMap.getProject()
      .getRowSelectionModel();
    model.setViewIndices(new phantasus.Set(), true);
  };
  this.add({
    name: 'Clear Selected Rows',
    cb: function (options) {
      clearAction(options, false);
    }
  });
  this.add({
    name: 'Clear Selected Columns',
    cb: function (options) {
      clearAction(options, true);
    }
  });

  var moveToTop = function (options, isColumns) {
    var project = options.heatMap.getProject();
    var selectionModel = !isColumns ? project.getRowSelectionModel()
      : project
        .getColumnSelectionModel();
    var viewIndices = selectionModel.getViewIndices().values();
    if (viewIndices.length === 0) {
      return;
    }
    viewIndices.sort(function (a, b) {
      return (a === b ? 0 : (a < b ? -1 : 1));
    });
    var converter = isColumns ? project.convertViewColumnIndexToModel
      : project.convertViewRowIndexToModel;
    converter = _.bind(converter, project);
    var modelIndices = [];
    for (var i = 0, n = viewIndices.length; i < n; i++) {
      modelIndices.push(converter(viewIndices[i]));
    }
    var sortKey = new phantasus.MatchesOnTopSortKey(project, modelIndices, 'selection on top', isColumns);
    sortKey.setLockOrder(1);
    sortKey.setUnlockable(false);
    if (isColumns) {
      project
      .setColumnSortKeys(
        phantasus.SortKey
        .keepExistingSortKeys(
          [sortKey],
          project
          .getColumnSortKeys().filter(function (key) {
            return !(key instanceof phantasus.MatchesOnTopSortKey && key.toString() === sortKey.toString());
          })),
        true);
    } else {
      project
      .setRowSortKeys(
        phantasus.SortKey
        .keepExistingSortKeys(
          [sortKey],
          project
          .getRowSortKeys().filter(function (key) {
            return !(key instanceof phantasus.MatchesOnTopSortKey && key.toString() === sortKey.toString());
          })),
        true);
    }
  };
  this.add({
    name: 'Move Selected Rows To Top',
    cb: function (options) {
      moveToTop(options, false);
    }
  });
  this.add({
    name: 'Move Selected Columns To Top',
    cb: function (options) {
      moveToTop(options, true);
    }
  });
  var selectAll = function (options, isColumns) {
    var project = options.heatMap.getProject();
    var selectionModel = !isColumns ? project.getRowSelectionModel()
      : project
        .getColumnSelectionModel();
    var count = !isColumns ? project
      .getSortedFilteredDataset()
      .getRowCount() : project
      .getSortedFilteredDataset()
      .getColumnCount();
    var indices = new phantasus.Set();
    for (var i = 0; i < count; i++) {
      indices.add(i);
    }
    selectionModel.setViewIndices(indices, true);
  };
  this.add({
    name: 'Select All Rows',
    cb: function (options) {
      selectAll(options, false);
    }
  });
  this.add({
    name: 'Select All Columns',
    cb: function (options) {
      selectAll(options, true);
    }
  });
  var copySelection = function (options, isColumns) {
    var project = options.heatMap.getProject();
    var dataset = project
      .getSortedFilteredDataset();
    var activeTrackName = options.heatMap.getSelectedTrackName(isColumns);
    var v;
    if (activeTrackName == null) {
      v = isColumns ? dataset.getColumnMetadata()
        .get(0) : dataset
        .getRowMetadata().get(0);
    } else {
      v = isColumns ? dataset.getColumnMetadata()
        .getByName(activeTrackName) : dataset
        .getRowMetadata().getByName(activeTrackName);
    }

    var selectionModel = isColumns ? project
      .getColumnSelectionModel() : project
      .getRowSelectionModel();
    var text = [];
    var toStringFunction = phantasus.VectorTrack.vectorToString(v);
    selectionModel.getViewIndices().forEach(
      function (index) {
        text.push(toStringFunction(v
          .getValue(index)));
      });
    phantasus.Util.setClipboardData(text.join('\n'));
  };
  this.add({
    name: 'Copy Selected Rows',
    cb: function (options) {
      copySelection(options, false);
    }
  });
  this.add({
    name: 'Copy Selected Columns',
    cb: function (options) {
      copySelection(options, true);
    }
  });

  var annotateSelection = function (options, isColumns) {

    var project = options.heatMap.getProject();
    var selectionModel = isColumns ? project
        .getColumnSelectionModel()
      : project
        .getRowSelectionModel();
    if (selectionModel.count() === 0) {
      phantasus.FormBuilder
        .showMessageModal({
          title: 'Annotate Selection',
          html: 'No ' + (isColumns ? 'columns' : 'rows') + ' selected.',
          focus: options.heatMap.getFocusEl()
        });
      return;
    }
    var formBuilder = new phantasus.FormBuilder();
    formBuilder.append({
      name: 'annotation_name',
      type: 'text',
      required: true
    });
    formBuilder.append({
      name: 'annotation_value',
      type: 'text',
      required: true
    });
    phantasus.FormBuilder
      .showOkCancel({
        title: 'Annotate',
        content: formBuilder.$form,
        focus: options.heatMap.getFocusEl(),
        okCallback: function () {
          var value = formBuilder
            .getValue('annotation_value');
          var annotationName = formBuilder
            .getValue('annotation_name');
          var dataset = project
            .getSortedFilteredDataset();
          var fullDataset = project
            .getFullDataset();
          if (isColumns) {
            dataset = phantasus.DatasetUtil
              .transposedView(dataset);
            fullDataset = phantasus.DatasetUtil
              .transposedView(fullDataset);
          }

          var existingVector = fullDataset
            .getRowMetadata()
            .getByName(
              annotationName);
          var v = dataset
            .getRowMetadata().add(
              annotationName);

          selectionModel
            .getViewIndices()
            .forEach(
              function (index) {
                v
                  .setValue(
                    index,
                    value);
              });
          phantasus.VectorUtil
            .maybeConvertStringToNumber(v);
          project
            .trigger(
              'trackChanged',
              {
                vectors: [v],
                display: existingVector != null ? []
                  : [phantasus.VectorTrack.RENDER.TEXT],
                columns: isColumns
              });
        }
      });
  };
  this.add({
    ellipsis: false,
    name: 'Annotate Selected Rows',
    cb: function (options) {
      annotateSelection(options, false);
    }
  });
  this.add({
    ellipsis: false,
    name: 'Annotate Selected Columns',
    cb: function (options) {
      annotateSelection(options, true);
    }
  });
  this.add({
    name: 'Copy Selected Dataset',
    cb: function (options) {
      var project = options.heatMap.getProject();
      var dataset = project.getSelectedDataset({
        emptyToAll: false
      });
      var columnMetadata = dataset
        .getColumnMetadata();
      var rowMetadata = dataset.getRowMetadata();
      // only copy visible tracks
      var visibleColumnFields = options.heatMap
        .getVisibleTrackNames(true);
      var columnFieldIndices = [];
      _.each(visibleColumnFields, function (name) {
        var index = phantasus.MetadataUtil.indexOf(
          columnMetadata, name);
        if (index !== -1) {
          columnFieldIndices.push(index);
        }
      });
      columnMetadata = new phantasus.MetadataModelColumnView(
        columnMetadata, columnFieldIndices);
      var rowMetadata = dataset.getRowMetadata();
      // only copy visible tracks
      var visibleRowFields = options.heatMap
        .getVisibleTrackNames(false);
      var rowFieldIndices = [];
      _.each(visibleRowFields, function (name) {
        var index = phantasus.MetadataUtil.indexOf(
          rowMetadata, name);
        if (index !== -1) {
          rowFieldIndices.push(index);
        }
      });
      rowMetadata = new phantasus.MetadataModelColumnView(
        rowMetadata, rowFieldIndices);

      var text = new phantasus.GctWriter()
        .write(dataset);
      phantasus.Util.setClipboardData(text);

    }
  });
  var _this = this;
  //console.log(_this);
  [
    new phantasus.HClusterTool(), new phantasus.MarkerSelection(),
    new phantasus.NearestNeighbors(), new phantasus.AdjustDataTool(),
    new phantasus.CollapseDatasetTool(), new phantasus.CreateAnnotation(), new phantasus.SimilarityMatrixTool(),
    new phantasus.TransposeTool(), new phantasus.TsneTool(),
    new phantasus.KmeansTool(), new phantasus.LimmaTool(), new phantasus.DESeqTool()].forEach(function (tool) {
    _this.add({
      ellipsis: false,
      name: tool.toString(),
      gui: function () {
        return tool;
      },
      cb: function (options) {
        phantasus.HeatMap.showTool(tool, options.heatMap);
      }
    });
  });
  this.add({
    name: 'Edit Fonts',
    ellipse: true,
    cb: function (options) {
      var trackInfo = options.heatMap.getLastSelectedTrackInfo();
      var project = options.heatMap.getProject();
      var model = trackInfo.isColumns ? project
        .getColumnFontModel() : project
        .getRowFontModel();
      var chooser = new phantasus.FontChooser({fontModel: model, track: options.heatMap.getTrack(trackInfo.name, trackInfo.isColumns), heatMap: options.heatMap});
      phantasus.FormBuilder.showInModal({
        title: 'Edit Fonts',
        html: chooser.$div,
        close: 'Close',
        focus: options.heatMap.getFocusEl()
      });
    }
  });

};
phantasus.ActionManager.prototype = {
  getActions: function () {
    return this.actions;
  },
  getAction: function (name) {
    return this.actionNameToAction.get(name);
  },
  execute: function (name, args) {
    var action = this.getAction(name);
    if (args == null) {
      args = {};
    }

    args.heatMap = this.heatMap;
    action.cb(args);

    phantasus.Util.trackEvent({
      eventCategory: 'Tool',
      eventAction: name
    });
  },
  add: function (action) {
    this.actions.push(action);
    this.actionNameToAction.set(action.name, action);
  }
};
