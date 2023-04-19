phantasus.voomNormalizationTool = function () {
};




phantasus.voomNormalizationTool.prototype = {
  toString: function () {
    return "Mean-variance modelling at the observational level";
  },
  init: function (project, form) {
    var _this = this;
    let dataset = project.getFullDataset();
    var $add_data = form.$form.find("[name=add_data]");
    var $byArea = form.$form.find("[name=byArea]");
    let fields = phantasus.MetadataUtil.getMetadataNames(dataset.getColumnMetadata());
    form.$form.prepend("<p>Voom normalization transforms count data to log2-counts per million (logCPM), estimates the mean-variance relationship and uses this to compute appropriate observation-level weights.<\p> <p>By default all samples are treated as replicates (<i>`~1`</i> design). Add annotations to build design matrix.<\p>"); 
    
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

    form.$form.on('click', '[data-name=delete]', function (e) {
      var $this = $(this);
      var $row = $this.closest('.phantasus-entry');
      $row.remove();
      _this.reEvaluateAvailableOptions($byArea);
      checkDesignLength($byArea);
      e.preventDefault();
    });

    form.$form.on('change', '[name=by]',function(e){
      _this.reEvaluateAvailableOptions($byArea);
    })

  },
  gui: function (project) {
  

    if (_.size(project.getRowFilter().enabledFilters) > 0 || _.size(project.getColumnFilter().enabledFilters) > 0) {
      phantasus.FormBuilder.showInModal({
        title: 'Warning',
        html: 'Your dataset is filtered.<br/>' + this.toString() + ' will apply to unfiltered dataset. Consider using New Heat Map tool.',
        z: 10000
      });
    }
    return [ 
      {
        name: "byArea",
        type: "select-list",
        showLabel: false
      },{
        name: "add_data",
        title: "add",
        type: "button",
        help: ""
      }];
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
  execute: function (options) {
    var d = $.Deferred();
    let project = options.project;
    let selectedFields = options.input.byArea;
    let heatMap = options.heatMap;

    // console.log(dataset);
    let oldDataset = project.getSortedFilteredDataset();
    var sortedFilteredDataset = phantasus.DatasetUtil.copy(oldDataset);
    var dataset = sortedFilteredDataset;
    var currentSessionPromise = dataset.getESSession();
    dataset.setESSession(new Promise(function (resolve, reject) {
        if (currentSessionPromise){
            currentSessionPromise.then(function (essession) {
                var args = {
                    es: essession,
                    fieldNames: selectedFields,
                  };

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
                          let metaNames = jsondata.colMetaNames.values;
                          
    
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
