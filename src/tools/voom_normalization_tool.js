phantasus.voomNormalizationTool = function () {
};




phantasus.voomNormalizationTool.prototype = {
  toString: function () {
    return "Voom: Mean-variance modelling at the observational level";
  },
  init: function (project, form) {
    let $filter_div = form.$form.find('[name=filter_message]');
    if ($filter_div.length){
      $filter_div[0].parentElement.classList.remove('col-xs-offset-4');
      $filter_div[0].parentElement.classList.add('col-xs-offset-1');
      $filter_div[0].parentElement.classList.remove('col-xs-8');
      $filter_div[0].parentElement.classList.add('col-xs-10');
      return;
    }

    var _this = this;
    var dataset = project.getFullDataset();
    var $add_data = form.$form.find("[name=add_data]");
    var $byArea = form.$form.find("[name=byArea]");
    var $designMatrix = form.$form.find('.slick-table')[0];
    var $showDesign = form.$form.find("[name=showDesign]");
    var columnMeta = dataset.getColumnMetadata();
    let fields = phantasus.MetadataUtil.getMetadataNames(columnMeta);
    let geo = fields.indexOf("geo_accession");
    if (geo > 0){
      fields.splice(geo,1);
    }
    form.$form.prepend('<div class="col-xs-10 col-xs-offset-1"><p>Use column annotations to modify design matrix. By default all samples are treated as replicates.</p></div>');   
    form.$form.prepend("");
    const checkDesignLength = ($container) =>{
      let selectElements = $container.find("[name=by]");
      if (selectElements.length >= fields.length){
        $add_data[0].disabled = "disabled";
        $add_data.parent().find("[data-name=add_data_help]")[0].textContent = "Nothing to add.";
      } else {
        $add_data[0].disabled = false;
        $add_data.parent().find("[data-name=add_data_help]")[0].textContent  = "";
      }
    };
    checkDesignLength($byArea);
    $add_data.on('click',  function (e) {
      let $this = $(this);
      $byArea.append(_this.getSelectorHtml(null, fields));
      _this.reEvaluateAvailableOptions($byArea);
      checkDesignLength($byArea);
      e.preventDefault();
    });

    let data = [];
    let columns = [];
    var grid = new Slick.Grid($designMatrix , data, columns, {
      enableCellNavigation: true,
      headerRowHeight: 0,
      showHeaderRow: false,
      multiColumnSort: false,
      multiSelect: false,
      enableColumnReorder: false,
      enableTextSelectionOnCells: true,
      forceFitColumns: false,
      topPanelHeight: 20
    });



    this.updateDesignGrid(grid, $byArea, columnMeta);
    form.$form.on('change', '[name=by]',function(e){
      _this.reEvaluateAvailableOptions($byArea);
      _this.updateDesignGrid(grid, $byArea, columnMeta);

    });
    form.$form.on('click', '[data-name=delete]', function (e) {
      var $this = $(this);
      var $row = $this.closest('.phantasus-entry');
      $row.remove();
      _this.reEvaluateAvailableOptions($byArea);
      checkDesignLength($byArea);
      _this.updateDesignGrid(grid, $byArea, columnMeta);
      e.preventDefault();
    });
    $designMatrix.parentElement.classList.remove('col-xs-offset-4');
    $designMatrix.parentElement.classList.add('col-xs-offset-1');
    $designMatrix.parentElement.classList.remove('col-xs-8');
    $designMatrix.parentElement.classList.add('col-xs-10');
    $designMatrix.setAttribute("style","height:320px");
    $($designMatrix).data('SlickGrid', grid);
    $($designMatrix).hide();
    $designMatrix.hiden = true;
    form.$form.on('click', '[data-name=showDesignLink]', function (e) {
      var $this = $(this);
      if ($designMatrix.hiden) {
        $($designMatrix).show();
        $designMatrix.hiden = false;
        $this.text("Hide design matrix");
      } else{
        $($designMatrix).hide();
        $designMatrix.hiden = true;
        $this.text("Show design matrix");
      }
  ;
      e.preventDefault();
    });

  },
  gui: function (project) {
  

    if (_.size(project.getRowFilter().enabledFilters) > 0 || _.size(project.getColumnFilter().enabledFilters) > 0) {

      let html = [];
      html.push('<div name="filter_message">');
      html.push('Your dataset has been filtered, resulting in a partial view.');
      html.push('<br/>' + this.toString() + ' tool will treat the displayed data as a new dataset in a new tab.');
      html.push('<br/> To analyze the whole dataset, remove filters before running the tool.');
      html.push('</div>');
      return [
        {
          name: "message",
          type: "custom",
          value: html.join('\n'),
          showLabel: false
        }
      ];
    };
    return [ 
      {
        name: "byArea",
        type: "select-list",
        showLabel: false
      },
      {
        name: "add_data",
        title: "add",
        type: "button",
        help: ""
      },
      {
        name: "filterByExp",
        title: "Apply filter by expression before the normalization",
        type: "checkbox"
      },
      { name: "showDesign",
        title: "show design matrix",
        type: "custom",
        showLabel: false,
        value: '<a data-name="showDesignLink" href="#">Show design matrix</a>'
      },
      {
        name: "designMatrix",
        type: "slick-table",
        showLabel: false,
        style: "width:100%;height:300px;"
      }
    ];
  },
  getSelectorHtml: function (selValue, fields) {
    var html = [];
    html.push('<div class="phantasus-entry">');
    html.push('<label>Field:</label>');
    // field
    html.push('<select style="max-width:150px;overflow-x:hidden; display: inline-block; margin: 5px; padding: 5px; line-height: normal; height: auto;" name="by" class="form-control input-sm">');
    html.push('<option disabled selected value style="display: none">--select field--</option>');
    _.each(fields, function (field) {
      html.push('<option value="' + field + '"');
      if (field === selValue) {
        html.push(' selected');
      }
      html.push('>');
      html.push(field);
      html.push('</option>');
    });
    html.push('</select>');
    html.push('&nbsp<button type="button" class="close" aria-label="Close" data-name="delete" style="float:none;"><span aria-hidden="true">×</span></button> ');
    
    html.push('</div>'); // phantasus-entry
    return html.join('');
  },
  reEvaluateAvailableOptions: function($container){
    let selectElements = $container.find("[name=by]")
    let selectedValues = [];
    selectElements.each(function() {
      let value = $(this).val();
      value != null && selectedValues.push(value);
    });
    selectElements.each(function() {
      let currentValue = $(this).val();
      $(this).children('option')
        .removeAttr("disabled")
        .each(function() {
          let value = this.value;
          if (selectedValues.indexOf(value) >= 0 && currentValue != value) {
            $(this).attr('disabled', "disabled");
          }
        });
    });

  },
  updateDesignGrid: function( grid, $selectListCont, columnMeta){
    let selectElements = $selectListCont.find("[name=by]")
    let selectedValues = [];
    let factorNames = [];
    let factorIndices = [];
    selectElements.each(function() {
      let value = $(this).val();
      value != null && value != '' && selectedValues.push(value);
    });
    selectedValues.forEach(function(value,index) {
      let factor_map =  phantasus.VectorUtil.createValuesToIndicesMap([columnMeta.getByName(value)]);
      if (index !== 0){
        factor_map.remove(factor_map.keys()[0]);
      };
      factor_map.forEach(function(ind_list, key){
        factorNames.push(value + "" +key);
        factorIndices.push(ind_list);
      });
    });
    let id_column = undefined;
    let id_values = [];
    if (phantasus.MetadataUtil.indexOf(columnMeta, "geo_accession") !== -1 ){
      id_values = columnMeta.getByName( "geo_accession").getArray();
    };
    if (id_values.length == 0){
      for (let i = 1; i <= dataset.columns; i++) {
        id_values.push(i);
      };
    };
    id_column = "sample";
    var columns = [ {
      id: "id",
      name: id_column,
      field: "id",
      width: 120,
      cssClass: "design-grid"
    }];
    var data = [];
    if (factorNames.length === 0){
      columns.push({
        id: "intercept",
        name: "intercept",
        field: "intercept",
        width: 80,
        cssClass: "design-grid factor"
      });
      for (let i = 0; i < columnMeta.itemCount; i++) {
        data[i] = {
          id: id_values[i],
          intercept:1
        };
      };
    } else {
      factorNames.forEach(function(fact_name){
        columns.push({
          id: fact_name,
          name: fact_name,
          field: fact_name,
          width: 80,
          cssClass: "design-grid factor"
        });
      });
      for (let i = 0; i < columnMeta.itemCount; i++) {
        data[i] = { id: id_values[i]};
        factorNames.forEach(function(fact_name){ data[i][fact_name] = 0}); 
      };
      factorNames.forEach(function(value,index){
        factorIndices[index].forEach(function(sample){
          data[sample][value]=1;
        })
      });
     

    }
    grid.setData(data);
    grid.setColumns(columns);
    grid.resizeCanvas();
    grid.invalidate();

  },
  execute: function (options) {

    if (!options.input.designMatrix){
      let new_heatmap = (new phantasus.NewHeatMapTool()).execute({heatMap: options.heatMap, project: options.project});
      new_heatmap.getActionManager().execute(this.toString());
      return;
    }

    var d = $.Deferred();
    let project = options.project;
    let selectedFields = options.input.byArea;
    let designData = options.input.designMatrix.getData();
    let heatMap = options.heatMap;

    // console.log(dataset);
    let oldDataset = project.getSortedFilteredDataset();
    var dataset = phantasus.DatasetUtil.copy(oldDataset);
    var currentSessionPromise = dataset.getESSession();
    dataset.setESSession(new Promise(function (resolve, reject) {
        if (currentSessionPromise){
            currentSessionPromise.then(function (essession) {
                var args = {
                    es: essession,
                    designData: designData,
                  };
                if (options.input.filterByExp){
                  args.filterByExp = options.input.filterByExp
                }  
                var req = ocpu.call("voomNormalization/print", args, function (newSession) {
                    let r = new FileReader();
                    let filePath = phantasus.Util.getFilePath(newSession, JSON.parse(newSession.txt)[0]);
                    r.onload = function (e) {
                        let contents = e.target.result;
                        protobuf.load("./message.proto", function (error, root) {
                          if (error) {
                            alert(error);
                          }
                          let REXP = root.lookupType("REXP");
                          let rclass = REXP.RClass;
                          let res = REXP.decode(new Uint8Array(contents));
                          let jsondata = phantasus.Util.getRexpData(res, rclass);
    
                          let  flatData = jsondata.data.values;
                          let nrowData = jsondata.data.dim[0];
                          var ncolData = jsondata.data.dim[1];
                          let keepIndexes = jsondata.keep.values;
                          if (nrowData < dataset.getRowCount()){
                            dataset = new phantasus.SlicedDatasetView(dataset, keepIndexes);
                          }
                          for (let i = 0; i < nrowData; i++) {
                            for (let j = 0; j < ncolData; j++) {
                              dataset.setValue(i,j,flatData[i + j * nrowData]);
                            }
                          }
                          resolve(newSession);
                          d.resolve(dataset);
                          
                        });
                      };
                      phantasus.BlobFromPath.getFileObject(filePath, function (file) {
                        r.readAsArrayBuffer(file);
                      });
                }, false, "::es");
                req.fail(function () {
                    d.reject();
                    throw (new Error("Voom normalization failed." + _.first(req.responseText.split('\n'))));
                  });

            });
        }
        

  

    }));
    
    d.done(function (newDataset) {
        new phantasus.HeatMap({
            name: heatMap.getName(),
            dataset: newDataset,
            parent: heatMap,
            inheritFromParent: false,
            symmetric: false
        }); 
    })
    return d;
  }
};
