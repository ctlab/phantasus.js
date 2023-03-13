phantasus.tmmNormalizationTool = function () {
};
phantasus.tmmNormalizationTool.prototype = {
  toString: function () {
    return "Trimmed Mean of M-values";
  },
  init: function (project, form) {
    var $field = form.$form.find("[name=reference_variable]");
    if ($field[0].options.length > 0) {
      $field.val($field[0].options[0].value);
    }
    $field.on('change', function (e) {
        const val = $(this).val();
        if (val !== 'None'){
            let dataset = project
            .getFullDataset();
            const vector =  dataset.getColumnMetadata().getByName(val).array;
            if (vector.length < dataset.columns){
                    phantasus.FormBuilder.showInModal({
                      title: 'Warning',
                      html: 'Selected variable contains empty strings. Trimmed Mean of M-values normalization will assign the same group to the samples with such values.',
                      z: 10000
                    });
            };
        }
      });
    const debounce = (fn, delay = 500) => {
        let timeoutId;
        return (...args) => {
            // cancel the previous timer
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // setup a new timer
            timeoutId = setTimeout(() => {
                fn.apply(null, args)
            }, delay);
        };
    };
    var $logratioTrim = form.$form.find("[name=logratioTrim]");
    var $sumTrim = form.$form.find("[name=sumTrim]");
    const checkParam = (cur_element) =>{
        const val = cur_element.val();
        if (val === "" || val <0 || val > 0.5){
            cur_element.parent().parent()[0].classList.add('has-error');
            document.getElementsByName("ok")[0].disabled = "disabled";
        } else {
            cur_element.parent().parent()[0].classList.remove('has-error');
            document.getElementsByName("ok")[0].disabled = false;
        }
    }
    form.$form.on('input', debounce(function (e) {
        switch (e.target.name) {
            case 'logratioTrim':
                checkParam($logratioTrim);
                break;
            case 'sumTrim':
                checkParam($sumTrim);
                break;
        };
    }));


  },
  gui: function (project) {
    var dataset = project.getFullDataset();

    if (_.size(project.getRowFilter().enabledFilters) > 0 || _.size(project.getColumnFilter().enabledFilters) > 0) {
      phantasus.FormBuilder.showInModal({
        title: 'Warning',
        html: 'Your dataset is filtered.<br/>' + this.toString() + ' will apply to unfiltered dataset. Consider using New Heat Map tool.',
        z: 10000
      });
    }

    var fields = phantasus.MetadataUtil.getMetadataNames(dataset
      .getColumnMetadata());
    fields.unshift("None")
    return [{
            name: "reference_variable",
            options: fields,
            type: "select",
            multiple: false,
            help: ''
            }, {
            name: "logratioTrim",
            min: 0,
            max: 0.5,
            step:0.01,
            value: 0.3,
            type: 'number',
            help: 'The fraction (0 to 0.5) of observations to be trimmed from each tail of the distribution of log-ratios (M-values) before computing the mean.'
            }, {
            name: "sumTrim",
            type: "number",
            value: 0.05,
            min: 0,
            max: 0.5,
            step:0.01,
            help: 'The fraction (0 to 0.5) of observations to be trimmed from each tail of the distribution of A-values before computing the mean.'
            }];
  },
  execute: function (options) {
    var d = $.Deferred();
    let project = options.project;
    let field = options.input.reference_variable;
    let logratioTrim = options.input.logratioTrim;
    let sumTrim = options.input.sumTrim;
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
                    fieldName: field,
                    logratioTrim: logratioTrim,
                    sumTrim: sumTrim 
                  };

                  var req = ocpu.call("tmmNormalization/print", args, function (newSession) {
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
    
                          // alert("Limma finished successfully");
                          resolve(newSession);
                          d.resolve(dataset);
                          
                        });
                      };
                      phantasus.BlobFromPath.getFileObject(filePath, function (file) {
                        r.readAsArrayBuffer(file);
                      });
                  }, false, "::es");
                req.fail(function () {
                    reject();
                    d.reject();
                    throw new Error("Trimmed Mean of M-values normalization failed dataset failed. See console");
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
