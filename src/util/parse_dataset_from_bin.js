phantasus.ParseDatasetFromProtoBin = function () {
};

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
  var flatPdata = jsondata.pdata.values;
  var annotation = jsondata.fdata.values;
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
      var curVec = dataset.getColumnMetadata().add(metaNames[i]);
      for (j = 0; j < ncolData; j++) {
        curVec.setValue(j, phantasus.Util.safeTrim(flatPdata[j + i * ncolData]));
      }
    }
  }
  // console.log(seriesName, "meta?");


  //var rowIds = dataset.getRowMetadata().add('id');

  // console.log(rowMetaNames);

  for (i = 0; i < rowMetaNames.length; i++) {
    curVec = dataset.getRowMetadata().add(rowMetaNames[i]);
    for (j = 0; j < nrowData; j++) {
      curVec.setValue(j, phantasus.Util.safeTrim(annotation[j + i * nrowData]));
      //rowIds.setValue(j, id[j])
    }
  }
  phantasus.MetadataUtil.maybeConvertStrings(dataset.getRowMetadata(), 1);
  phantasus.MetadataUtil.maybeConvertStrings(dataset.getColumnMetadata(),
    1);

  return dataset;
};
