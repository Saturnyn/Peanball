module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				separator: ';'
			},
			dist: {
				src: ['src/**/*.js'],
				dest: 'bin-debug/<%= pkg.name %>.js'
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
			},
			dist: {
				files: {
					'bin-release/<%= pkg.name %>.js': ['<%= concat.dist.dest %>']
				}
			}
		},
		jshint: {
			files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
			options: {
				// options here to override JSHint defaults
				globals: {
					jQuery: true,
					console: true,
					module: true,
					document: true
				}
			}
		},
		copy: {
			'dist-debug': {
				expand:true,
				cwd    : 'src/',
				src: ['*.html'],
				dest: 'bin-debug/'
			},
			'dist-release': {
				expand:true,
				cwd    : 'src/',
				src: ['*.html'],
				dest: 'bin-release/'
			}
		},
		watch: {
			files: ['src/**/*'],
			tasks: ['jshint', 'concat', 'uglify','copy']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');

	grunt.registerTask('test', ['jshint']);

	grunt.registerTask('default', ['jshint', 'concat', 'uglify','copy']);

};