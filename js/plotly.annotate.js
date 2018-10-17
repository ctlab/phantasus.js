Plotly.annotate = function (plot) {

  plot.layout.annotations = plot.layout.annotations || [];

  var rendered = {};
  d3.select(plot)
    .select('.cartesianlayer .xy .plot .scatterlayer')
    .selectAll('.text .textpoint text')
    .each(function () {
      rendered[this.textContent] = { // FIXME: Improve support of different font sizes
        width: this.getBBox().width,
        height: this.getBBox().height
      };
    });

  var points = [].concat.apply([], plot._fullData.map(function (trace) {
    return trace.x.reduce(function (acc, item, i) {
      if (trace.text && trace.text[i]) {
        var point = {
          x: trace.x[i] || 0,
          y: trace.y[i] || 0,
          width: rendered[trace.text[i]].width || 0,
          height: rendered[trace.text[i]].height || 0,
          r: (Array.isArray(trace.marker.size) ? trace.marker.size[i] : trace.marker.size) / 2,
          annotation: {
            x: trace.x[i] || 0,
            y: trace.y[i] || 0,
            ax: 20,
            ay: 20,
            xref: 'x',
            yref: 'y',
            text: trace.text[i],
            font: {
              size: Array.isArray(trace.textfont.size) ? trace.textfont.size[i] : trace.textfont.size
            },
            showarrow: true,
            arrowhead: 0,
            arrowsize: 1,
            arrowwidth: 1,
            arrowcolor: '#636363'
          }
        };
        acc.push(point);
        plot.layout.annotations.push(point.annotation);
      }
      return acc;
    }, []);
  }));

  plot.data.forEach(function (trace) {
    trace.text = null;
  });

  var annotating = false;

  function updateAnnotations() {
    if (annotating) {
      annotating = false;
      return;
    }
    annotating = true;

    var xrange = plot._fullLayout.xaxis.range, yrange = plot._fullLayout.yaxis.range;

    var pointsInRange = points.filter(function (point) {
      return point.x >= xrange[0] && point.x <= xrange[1] && point.y >= yrange[0] && point.y <= yrange[1]
    });

    var labels = pointsInRange.map(function (point) {
      return {
        x: plot._fullLayout.xaxis.l2p(point.x),
        y: plot._fullLayout.yaxis.l2p(point.y),
        width: point.width,
        height: point.height
      }
    });

    var anchors = pointsInRange.map(function (point) {
      return {
        x: plot._fullLayout.xaxis.l2p(point.x),
        y: plot._fullLayout.yaxis.l2p(point.y),
        r: point.r * 2 + 2
      }
    });

    d3.labeler()
      .label(labels)
      .anchor(anchors)
      .width(plot._fullLayout._size.w)
      .height(plot._fullLayout._size.h)
      .force_bounds(true)
      .start(1000);

    pointsInRange.forEach(function (point, i) {
      var annotation_x = labels[i].x + labels[i].width / 2;
      var annotation_y = labels[i].y - labels[i].height / 2;
      var dx = annotation_x - anchors[i].x;
      var dy = annotation_y - anchors[i].y;
      var outer = 1 - point.r / Math.sqrt(dx * dx + dy * dy);

      point.annotation.x = plot._fullLayout.xaxis.p2l(annotation_x - dx * outer);
      point.annotation.y = plot._fullLayout.yaxis.p2l(annotation_y - dy * outer);
      point.annotation.ax = dx * outer;
      point.annotation.ay = dy * outer;
    });

    Plotly.redraw(plot);
  }

  plot.on('plotly_afterplot', updateAnnotations);

  updateAnnotations();
};
