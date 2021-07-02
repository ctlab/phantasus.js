phantasus.ParseDatasetFromProtoBin = function () {
};
phantasus.ParseDatasetFromProtoBin.LAYOUT_VERSION = [0x00, 0x02];

phantasus.ParseDatasetFromProtoBin.parse = function (session, callback, options) {
  var response = JSON.parse(session.txt)[0];
  var filePath = options.pathFunction ?
    options.pathFunction(response) :
    phantasus.Util.getFilePath(session, response);

  var r = new FileReader();

  r.onload = function (e) {
    var contents = e.target.result;
    protobuf.load("./message.proto", function (error, root) {
      if (error) {
        throw new Error(error);
      }
      var REXP = root.lookupType("REXP");
      var rclass = REXP.RClass;
      var res = REXP.decode(new Uint8Array(contents));

      var jsondata = phantasus.Util.getRexpData(res, rclass);
      if (jsondata["layout_version"]){
        let in_file_version = jsondata["layout_version"].values;
        let in_js_version = phantasus.ParseDatasetFromProtoBin.LAYOUT_VERSION;
        
        let versions_are_equal = (in_file_version.length == in_js_version.length) && 
                                  in_file_version.every(function(element, index) {
                                                                                    return element === in_js_version[index]; 
                                                                                  });
        if (!versions_are_equal){
          throw( new Error("Wrong version of session binnary file. Please contact administrator."));
          
        }
      }
      else {
        throw( new Error("Wrong version of session binnary file. Please contact administrator."));
      }
      jsondata = jsondata.ess;
      var datasets = [];
      for (var k = 0; k < Object.keys(jsondata).length; k++) {
        var dataset = phantasus.ParseDatasetFromProtoBin.getDataset(new Promise(function (resolve) {resolve(session)}),
                                                                    Object.keys(jsondata)[k],
                                                                    jsondata[Object.keys(jsondata)[k]],
                                                                    options);
        datasets.push(dataset);
      }
      callback(null, datasets);
    });
  };

  phantasus.BlobFromPath.getFileObject(filePath, function (f) {
    r.readAsArrayBuffer(f);
  });
};

phantasus.ParseDatasetFromProtoBin.getDataset = function (session, seriesName, jsondata, options) {
  var flatData = jsondata.data.values;
  var nrowData = jsondata.data.dim[0];
  var ncolData = jsondata.data.dim[1];
  var pData = jsondata.pdata;
  var annotation = jsondata.fdata;
  //var id = jsondata.rownames.values;
  var metaNames = jsondata.colMetaNames.values;
  var rowMetaNames = jsondata.rowMetaNames.values;
  var experimentData = jsondata.experimentData;

  // console.log(seriesName, jsondata);

  var matrix = [];
  for (var i = 0; i < nrowData; i++) {
    var curArray = new Float32Array(ncolData);
    for (var j = 0; j < ncolData; j++) {
      curArray[j] = flatData[i + j * nrowData];
    }
    matrix.push(curArray);
  }
  var dataset = new phantasus.Dataset({
    name: seriesName,
    rows: nrowData,
    columns: ncolData,
    array: matrix,
    dataType: 'Float32',
    esSession: session,
    isGEO: options.isGEO,
    preloaded: options.preloaded,
    experimentData: experimentData
  });

  // console.log(seriesName, dataset);

  if (metaNames) {
    for (i = 0; i < metaNames.length; i++) {
      let curVec = dataset.getColumnMetadata().add(metaNames[i]);
      let sourceVec = pData[metaNames[i]].values
      for (j = 0; j < sourceVec.length; j++) {
        curVec.setValue(j, phantasus.Util.safeTrim(sourceVec[j]));
      }
      curVec.setDatatype(pData[metaNames[i]][phantasus.VectorKeys.DATA_TYPE]);
      let is_factor = pData[metaNames[i]][phantasus.VectorKeys.IS_PHANTASUS_FACTOR];
      if(is_factor){
          curVec.levels = pData[metaNames[i]]["levels"];
          curVec.getProperties().set(phantasus.VectorKeys.IS_PHANTASUS_FACTOR, is_factor);
      }
      
    
    }
  }
  // console.log(seriesName, "meta?");


  //var rowIds = dataset.getRowMetadata().add('id');

  // console.log(rowMetaNames);

  for (i = 0; i < rowMetaNames.length; i++) {
    let curVec = dataset.getRowMetadata().add(rowMetaNames[i]);
    let sourceVec = annotation[rowMetaNames[i]].values
    for (j = 0; j < nrowData; j++) {
      curVec.setValue(j, phantasus.Util.safeTrim(sourceVec[j]));
      //rowIds.setValue(j, id[j])
    }
    curVec.setDatatype(annotation[rowMetaNames[i]][phantasus.VectorKeys.DATA_TYPE]);
  }
  phantasus.MetadataUtil.maybeConvertStringsArray(dataset.getRowMetadata());
  phantasus.MetadataUtil.maybeConvertStringsArray(dataset.getColumnMetadata());

  return dataset;
};
