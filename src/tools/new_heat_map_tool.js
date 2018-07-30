phantasus.NewHeatMapTool = function () {
};
phantasus.NewHeatMapTool.prototype = {
  toString: function () {
    return 'New Heat Map';
  },
  // gui : function() {
  // return [ {
  // name : 'name',
  // type : 'text'
  // }, {
  // name : 'include_selected_rows',
  // type : 'checkbox',
  // value : true
  // }, {
  // name : 'include_selected_columns',
  // type : 'checkbox',
  // value : true
  // } ];
  // },
  execute: function (options) {
    var project = options.project;
    var heatMap = options.heatMap;
    var dataset = project.getSelectedDataset({
      selectedRows: true,
      selectedColumns: true
    });
    phantasus.DatasetUtil.shallowCopy(dataset);
    var oldSession = dataset.getESSession();
    var oldVariable = dataset.getESVariable();

    dataset.setESSession(new Promise(function (resolve, reject) {
      oldSession.then(function (esSession) {
        var args = {
          es: esSession,
          rows: dataset.rowIndices,
          columns: dataset.columnIndices
        };

        var req = ocpu.call("subsetES", args, function (newSession) {
          dataset.setESVariable('es');
          resolve(newSession);
          console.log('Old dataset session: ', esSession, ', New dataset session: ', newSession);
        }, false, "::" + oldVariable);

        req.fail(function () {
          reject();
        });
      })
    }));


    //phantasus.DatasetUtil.toESSessionPromise(dataset);
    // console.log(dataset);
    // TODO see if we can subset dendrograms
    // only handle contiguous selections for now
    // if (heatMap.columnDendrogram != null) {
    // var indices = project.getColumnSelectionModel().getViewIndices()
    // .toArray();
    // phantasus.DendrogramUtil.leastCommonAncestor();
    // }
    // if (heatMap.rowDendrogram != null) {
    //
    // }
    var heatmap = new phantasus.HeatMap({
      name: heatMap.getName(),
      dataset: dataset,
      parent: heatMap,
      symmetric: project.isSymmetric() && dataset.getColumnCount() === dataset.getRowCount()
    });
  }
};
