#!/usr/bin/env node
//
// -- Zetta Polymer Library
//
//  Copyright (c) 2011-2014 ASPECTRON Inc.
//  All Rights Reserved.
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
// 
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
// 
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//  THE SOFTWARE.
//

var path 		= require('path');
var ServeStatic = require('serve-static');
var util 		= require('util');
var _ 			= require('underscore');
var fs 			= require('fs');
var crypto 		= require('crypto');
/*var jsp	= require('uglify-js').parser;
var pro	= require('uglify-js').uglify;
console.log("jsp",jsp);
console.log("pro",pro)
*/
function ZETTA_Polymer(core, options) {
	var self = this;
	options 		= options || {};
	var combiner 	= options.httpCombiner || core.httpCombiner;

	self.initHttp = function(app) {
		var depsComponetsPath = path.join(__dirname,'/bower_components/');
		var componetsPath = path.join(__dirname,'/http/zetta/');
		var scriptsPath   = path.join(__dirname,'/http/scripts/');

		if (combiner && combiner.addHttpFolders) {
			combiner.addHttpFolders([
				scriptsPath,
				componetsPath,
				componetsPath+'icons/',
				depsComponetsPath
			]);
			combiner.addHttpFolderAlias({
				deps: depsComponetsPath,
				ZETTA:componetsPath,
				'ZETTA/scripts': scriptsPath
			})
		};

		var list = fs.readdirSync(componetsPath);
		var ignoreList = ['.', '..', '.DS_Store'];
		if (_.isArray(app.get('views'))) {
			app.get('views').push(componetsPath);
		}else{
			app.set('views', [app.get('views'), componetsPath]);
		}

		_.each(list, function(file){
			if (_.contains(ignoreList, file))
				return;
			// console.log("file", file)
			app.get('/ZETTA/'+file, function(req, res, next) {
	            res.render(file, {req: req});
	        });
		});

		app.use('/deps', ServeStatic(depsComponetsPath));
		app.use('/ZETTA/scripts', ServeStatic(scriptsPath));
	    app.use('/ZETTA', ServeStatic(componetsPath));
	}
}

module.exports = ZETTA_Polymer;
