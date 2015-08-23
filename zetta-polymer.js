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

		var cache = { }
		var componetsPath = path.join(__dirname,'/http/zetta/');
		var scriptsPath   = path.join(__dirname,'/http/scripts/');

		self.addHttpResourcesFolders([
			scriptsPath,
			componetsPath+'icons/',
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

		app.get('/combine:*', function(req, res, next){
			var files = req.originalUrl.split('/combine:')[1], folder;
			if (!files)
				return next();

			var data = [];
			var hash = crypto.createHash('md5').update(files).digest('hex');
			//console.log("scripts/combine".greenBG.bold, hash, files, files.split(';').length)
			if(cache[hash])				
				return self.sendHashContent({files:files, hash: hash, req:req, res:res, next:next});

			core.asyncMap(files.split(';'), function(file, callback){
				if (!file)
					return callback();

				folder = _.find(self._httpFolders, function(_folder){
					//console.log("_folder+file".greenBG, _folder+file)
					return fs.existsSync(_folder+file);
				});
				if (!folder)
					return callback({error:file+": File not found"});
				if (file.indexOf('..') > -1)
					return callback({error: file+": is not valid name"})

				fs.readFile(folder+file, function(err, _data){
					if (err)
						return callback(err);

					data.push("\n\r/* ---["+file+"]---\*/\r\n"+_data);
					callback()
				});
			}, function(err){
				if (err) {
					next()
					return console.log("combine-js:1:".greenBG, err);
				}

				cache[hash] = data.join("\n\r");
				self.sendHashContent({files:files, hash: hash, req:req, res:res, next:next});
			});


		});

		app.get('/icons:*', function(req, res, next){
			var files = req.originalUrl.split('/icons:')[1], folder;
			if (!files)
				return next();

			var data = {};
			var hash = crypto.createHash('md5').update(files).digest('hex');
			// console.log("icons".greenBG.bold, hash, files, files.split(';').length)
			if(cache[hash]) {
				res.setHeader('Content-Type', 'text/html');
				res.end(cache[hash]);
				return;
			}
/*
			var list = [ ]
			files = files.split(';');
			_.each(files, function(f) {
				var parts = f.split(':');
				var path = parts[0];
				var icons = parts[1];
				if(!path || !icons)
					return;
				var file = path+'.html';
				var category = path.split('/').pop();

				if(!data[category])
					data[category] = []

				_.each(icons.split(','), function(icon) {

					list.push()

				})

			})
*/


			core.asyncMap(files.split(';'), function(ident, callback){
				if (!ident)
					return callback();

				var parts = ident.split(':');
				if(parts.length == 1) {
					var t = parts.shift().split('/');
					parts[1] = t.pop();
					parts[0] = t.join('/');
				}
				var ref = parts.shift();
				var file = ref+'.html';
				var category = ref.split('/').pop();
				var id = parts.shift();
				if(!data[category])
					data[category] = [ ]

				// console.log(ident,file,category,id);

				folder = _.find(self._httpFolders, function(_folder){
					//console.log("_folder+file".greenBG, _folder+file)
					return fs.existsSync(path.join(_folder,file));
				});

				if (!folder)
					return callback({error:file+": File not found"});

				if (file.indexOf('..') > -1)
					return callback({error: file+": is not valid name"})

				fs.readFile(path.join(folder,file), function(err, _data){
					if (err)
						return callback(err);

//console.log(_data.toString())
var regexpA = new RegExp("<g\\sid=\""+id+"\"><g>.*<\/g><\/g>","ig");
var regexpB = new RegExp("<g\\sid=\""+id+"\">.*<\/g>","ig");
//console.log(regexp);
					var text = _data.toString();
					var icon = text.match(regexpA);
					if (!icon)
						icon = text.match(regexpB);
					if (!icon)
						return callback({error:ident+": Icon not found"});

					data[category].push(icon.shift());
					callback()
				});
			}, function(err){
				if (err) {
					next()
					return console.log("icons-js:1:".greenBG, err);
				}
//console.log(data);
				var text = '<link rel="import" href="/deps/iron-iconset-svg/iron-iconset-svg.html">';

//				var text = '';

				_.each(data, function(g, category) {
//console.log("category:",category);
					text += '<iron-iconset-svg name="'+category+'" size="50"><svg><defs>';
					_.each(g, function(g) {
						// console.log(g);
						text += g;
					})
					text += '</defs></svg></icon-iconset-svg>';

				})


				cache[hash] = text;
				res.setHeader('Content-Type', 'text/html');
				res.end(text);
			});


		});

		self.sendHashContent = function(args){
			var files 	= args.files;
			var res 	= args.res;
			var hash    = args.hash;
			if (files.indexOf('.html;') > -1){
				res.setHeader('Content-Type', 'text/html');
			}else{
				res.setHeader('Content-Type', 'text/javascript');
			}
			res.end(cache[hash]);
		}

		app.use('/deps', ServeStatic(path.join(__dirname, 'bower_components')));
		app.use('/ZETTA/scripts', ServeStatic(path.join(__dirname, 'http/scripts')));
	    app.use('/ZETTA', ServeStatic(path.join(__dirname, 'http/zetta')));
	}
}

module.exports = ZETTA_Polymer;
