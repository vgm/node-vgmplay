'use strict';
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.

const Electron = (typeof LUX_FROM_WEB==='undefined')?require('electron'):require('electron').remote;
const {app, dialog} = Electron;
const path = require('path');
//const dialog = require('dialog');
const NativeImage = Electron.nativeImage;

let lux;
(function(req){
let app_name = app.getName(),
	app_ver = app.getVersion(),
	app_icon = path.join(__dirname, '../img/icon.png');

req = {
	"debug":false,
	//"title":app.getName(),
	//"version":app.getVersion(),
	"dialog":{},
	"win":[],
	"draw":null,
	"raf":null,
	"isDef":function(x){return (typeof x)!=='undefined';},
	"isNull":function(x){return (x===null);},
	"padLeft":function(s,n,c){
		var ret = s+"";
		while (ret.length<n) ret = c+""+ret;
		return ret;
	},
	"toTimeString":function(s){
		var m = (s/60)|0, h = (m/60)|0;
		return (h>0?(h|0)+":":'')+
			(m%60<10?'0':'')+(m%60)+":"+
			(s%60<10?'0':'')+((s%60)|0);
	},
	"config":{
		"bufferSize":512,
		"sampleRate":44100
	},
	"compact":false,
	"currentVGM":null,
	"style":"hidden",//"hiddenInset",
	"konami":0,
	"menu":{},
	"act":{}
};
req.GD3_STRINGS = [
	'trackNameEn',
	'trackNameJp',
	'gameNameEn',
	'gameNameJp',
	'systemNameEn',
	'systemNameJp',
	'trackAuthorEn',
	'trackAuthorJp',
	'releaseDate',
	'convertedBy',
	'notes'
];


req.dialog.info = function(w, t, s) {
	var appIcon = NativeImage.createFromPath(app_icon);
	dialog.showMessageBox(w, {
		'type': 'info',
		'title': app_name,
		'message': t,
		'detail': s,
		'icon': appIcon,
		//'checkboxLabel':"Ok, I got it",
		'buttons': ['OK']
	});
}
req.dialog.open = function(w, f) {
	var filt = [
		{name:"VGM file",extensions:['vgm','vgz']},
		{name:"Playlist",extensions:['m3u']},
		{name:"All Supported Types (*.vgm, *.vgz, *.m3u)", extensions:['vgm','vgz','m3u']}
	]
	var props = ['multiSelections', 'createDirectory', 'openFile'];
	var cfg = {
		"filters":filt,
		"properties":props
	};
	dialog.showOpenDialog(w, cfg, f);
}
req.dialog.about = function(w) {
	var appIcon = NativeImage.createFromPath(app_icon);
	dialog.showMessageBox(w, {
		'type': 'info',
		'title': app_name,
		'message': app_name,
		'detail':`Version ${app_ver}, built with Electron\n©2017 Alex Rosario`,
		'icon': appIcon,
		//'checkboxLabel':"Ok, I got it",
		'buttons': ['OK']
	});
};

module.exports = req;
})(lux);
