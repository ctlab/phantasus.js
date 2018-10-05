module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - '
      + '<%= grunt.template.today("yyyy-mm-dd") %>\n'
      + '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>'
      + '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>; %> */'
    },
    uglify: {
      extJs: {
        options: {
          mangle: false,
          compress: false,
          preserveComments: false
        },
        files: {
          'js/phantasus-external-other.min.js': ['js/phantasus-external-other.js'],
          'js/phantasus-external-pdfkit-xlsx.min.js': ['js/phantasus-external-pdfkit-xlsx.js'],
          'js/phantasus-external-plotly-echarts.min.js': ['js/phantasus-external-plotly-echarts.js']
        }
      }
    },
    cssmin: {
      css: {
        src: 'css/phantasus.all.css',
        dest: 'css/phantasus-latest.min.css'
      }
    },
    concat: {
      css: {
        src: [
          'css/bootstrap.min.css',
          'css/bootstrap-select.min.css',
          'css/jquery-ui.min.css',
          'css/font-awesome.min.css',
          'css/slick.grid.css', 'css/phantasus.grid.css',
          'css/animate.css', 'css/phantasus.css'],
        dest: 'css/phantasus.all.css'
      },
      extJs: {
        nonull: true,
        dest: 'js/phantasus-external-other.js',
        src: [
          'js/d3.min.js', 'js/jquery-2.2.4.min.js',
          'js/bootstrap.min.js', 'js/underscore-min.js',
          'js/newick.js', 'js/hammer.min.js',
          'js/jquery.mousewheel.min.js',
          'js/bootstrap-select.min.js',
          'js/canvas2svg.js',
          'js/canvg.js', 'js/rgbcolor.js',
          'js/jquery-ui.min.js', 'js/parser.js',
          'js/FileSaver.min.js', 'js/colorbrewer.js',
          'js/jquery.event.drag-2.2.js', 'js/slick.min.js', 'js/canvas-toBlob.js',
          'js/js.cookie.js', 'js/long.js', 'js/bytebuffer.js', 'js/protobuf.js',
          'js/opencpu-0.5.js', 'js/jstat.min.js', 'js/blob-stream.js',
          'js/canvas2pdf.js', 'js/papaparse.min.js']
      },
      extJs2: {
        nonull: true,
        dest: 'js/phantasus-external-pdfkit-xlsx.js',
        src: [
          'js/pdfkit.js', 'js/xlsx.full.min.js']
      },
      extJs3: {
        nonull: true,
        dest: 'js/phantasus-external-plotly-echarts.js',
        src: [
          'js/plotly-latest.min.js', 'js/echarts.min.js', 'js/d3-labeler.js', 'js/plotly.annotate.js']
      },
      phantasus: {
        options: {
          banner: '(function(global){\n\'use strict\';\n',
          footer: '\n})(typeof window !== \'undefined\' ? window : this);\n'
        },
        dest: 'js/phantasus.js',
        src: [
          'src/util/util.js', 'src/util/*.js',
          'src/io/*.js', 'src/matrix/vector_adapter.js',
          'src/matrix/*.js', 'src/*.js',
          'src/tools/*.js', 'src/ui/*.js', 'src/**/*.js']
      }
    },
    watch: {
      phantasus: {
        files: ['src/*.js', 'src/**/*.js'],
        tasks: ['concat:phantasus'],
        options: {
          livereload: true
        }
      },
      ext: {
        files: ['js/*.js',
          //ignore
          '!js/phantasus-external*.js',
          '!js/phantasus.js'],
        tasks: ['concat', 'uglify']
      }
    },
    connect: {
      server: {
        options: {
          port: grunt.option('port') || 3000,
          base: './',
          livereload: true,
          keepalive: true,
          hostname: '127.0.0.1',
          middleware: function (connect, options, middlewares) {
            middlewares.unshift(function (req, res, next) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              return next();
            });

            if (grunt.option('prefix')) {
              console.log('Found prefix for OpenCPU library:' + grunt.option('prefix'));
              middlewares.unshift(function (req, res, next) {
                if (res.inject) {
                  res.inject('<script>window.libraryPrefix = \'' + grunt.option('prefix') + '\'</script>');
                }
                return next();
              });
            }

            return middlewares;
          },
        }
      }
    },
    concurrent: {
      dev: {
        tasks: ['watch', 'connect'],
        options: {logConcurrentOutput: true}
      }
    }
  });

  grunt.registerTask('serve', function () {
    grunt.task.run('dist');
    grunt.task.run('concurrent');
  });

  grunt.registerTask('default', 'serve');
  grunt.registerTask('dist', function () {
    grunt.task.run('concat');
    grunt.task.run('uglify');
    grunt.task.run('cssmin');
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-contrib-connect');

};
