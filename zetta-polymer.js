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


function ZETTA_Polymer(core) {
	var self = this;

	self._httpFolders = [];
	self.addHttpResourcesFolders = function(folders){
		if (_.isArray(folders)) {
			self._httpFolders = self._httpFolders.concat(folders);
		}else{
			self._httpFolders.push(folders);
		}
		self._httpFolders = _.uniq(self._httpFolders);
	}

	self.initHttp = function(app) {
		var componetsPath = path.join(__dirname,'/http/zetta/');
		var scriptsPath   = path.join(__dirname,'/http/scripts/');

		self.addHttpResourcesFolders([
			scriptsPath,
			core.appFolder+'/http/',
			core.appFolder+'/http/scripts/',
			core.appFolder+'/lib/manage/resources/'
		]);

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
		app.get('/scripts/combine/:files', function(req, res, next){
			var files = req.params.files, folder;
			var data = [];
			var fileName = crypto.createHash('md5').update(files).digest('hex')+'.js';
			// console.log("cripts/combine".greenBG.bold, fileName, files)
			if(fs.existsSync(scriptsPath+fileName)){
				res.setHeader('Content-Type', 'text/javascript');
				var r = fs.createReadStream(scriptsPath+fileName);
                r.pipe(res)//.send(data.join("\n\r"))
                return;
			}
			core.asyncMap(files.split('|'), function(file, callback){
				folder = _.find(self._httpFolders, function(_folder){
					//console.log("_folder+file".greenBG, _folder+file)
					return fs.existsSync(_folder+file);
				});
				if (!folder)
					return callback({error:file+": File not found"});
				//console.log("reading js file:", p)
				fs.readFile(folder+file, function(err, _data){
					if (err)
						return callback(err);

					data.push("\n\r/*####"+file+"###\*/\r\n"+_data);
					callback()
				});

			}, function(err){
				if (err){
					next()
					return console.log("combine-js:1:".greenBG, err);
				}
				fileName = scriptsPath+fileName;
				fs.writeFile(fileName, data.join("\n\r"), function (err, status) {
                    //if (err)
                        //return console.log("combine-js:2:".greenBG, err);
                    res.setHeader('Content-Type', 'text/javascript');
                    res.send(data.join("\n\r"))
                    //callback(null, {fields:fields, file:file});
                });
			})
			//next()
		});
		app.use('/deps', ServeStatic(path.join(__dirname, 'bower_components')));
		app.use('/ZETTA/scripts', ServeStatic(path.join(__dirname, 'http/scripts')));
	    app.use('/ZETTA', ServeStatic(path.join(__dirname, 'http/zetta')));
	}
}

module.exports = ZETTA_Polymer;
