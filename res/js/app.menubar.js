'use strict';

// edited from https://github.com/react-photonkit/epp/blob/master/scripts/menu.js

const Electron = (typeof LUX_FROM_WEB==='undefined')?require('electron'):require('electron').remote;
const {app, dialog} = Electron;
const path = require('path');
var ipc = require('electron').ipcMain;
//const dialog = require('dialog');
const NativeImage = require('electron').nativeImage;

let lux = require('./app.req.js');

(function(){

function _menu_item_basic(l, a, r) {
	var ret = {
		label: l,
		//accelerator: a,
	};
	if (a) ret["accelerator"] = a;
	if (typeof r==='function') ret["click"] = r;
	else if (r) ret["role"] = r;
	return ret;
}

const appName = app.getName();
var menu_file = [
	_menu_item_basic('Open…', 'CmdOrCtrl+O', function(item, focusedWindow, evt){
		lux.dialog.open(focusedWindow, function(f){
			focusedWindow.webContents.send('vgm-list-files', f);
			//focusedWindow.webContents.executeJavaScript("_list_files()");
		});
	})
];
var menu_help = [
	{
		label: 'Learn More',
		click: function() {
			//// TODO: SOME README LINK OR SETTINGS > ABOUT!
			//require('shell').openExternal('https://github.com/importre/epp')
		}
	},
];

var _prefs_item = _menu_item_basic('Preferences…', 'CmdOrCtrl+,',function(item, focusedWindow) {
	//lux.dialog.info(focusedWindow||null, "Preferences", "TODO: select Preferences tab!");
	focusedWindow.webContents.send('tab-change', 'sec-settings');
});

if (process.platform !== 'darwin')
	menu_file.unshift(
		{type:'separator'},
		 _prefs_item,
		{type:'separator'},
		{
			'role':'quit',
			/*label: 'Quit',
			accelerator: 'Cmd+Q',
			click() {
				app.quit();
			}*/
		}
	)
	menu_help.unshift(
		_menu_item_basic('About ' + app.getName(), 'F1', function(item, focusedWindow){lux.dialog.about(focusedWindow);}),
		{type:'separator'}
	);

const menu_template = [
	{
		label: 'File',
		role:'file',
		submenu: menu_file
	},
	/*{
		label: 'Edit',
		submenu: [
			{
				label: 'Undo',
				accelerator: 'CmdOrCtrl+Z',
				role: 'undo'
			},
			{
				label: 'Redo',
				accelerator: 'Shift+CmdOrCtrl+Z',
				role: 'redo'
			},
			{type: 'separator'},
			{
				label: 'Cut',
				accelerator: 'CmdOrCtrl+X',
				role: 'cut'
			},
			{
				label: 'Copy',
				accelerator: 'CmdOrCtrl+C',
				role: 'copy'
			},
			{
				label: 'Paste',
				accelerator: 'CmdOrCtrl+V',
				role: 'paste'
			},
			{
				label: 'Select All',
				accelerator: 'CmdOrCtrl+A',
				role: 'selectall'
			},
		]
	},*/
	{
		label: 'View',
		submenu: [
			_menu_item_basic('Reload', 'CmdOrCtrl+R', function(item, focusedWindow) {
				if (focusedWindow) focusedWindow.reload();
			}),
			_menu_item_basic(
				'Toggle Full Screen',
				(function() {
					if (process.platform == 'darwin') return 'Ctrl+Command+F';
					else return 'F11';
				})(),
				function(item, focusedWindow) {
					if (focusedWindow) focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
				}
			),
			_menu_item_basic(
				'Toggle Developer Tools',
				(function() {
					if (process.platform == 'darwin') return 'Alt+Command+I';
					else return 'Ctrl+Shift+I';
				})(),
				function(item, focusedWindow) {
					if (focusedWindow) focusedWindow.toggleDevTools();
				}
			),
		]
	},
	{
		label: 'Window',
		role: 'window',
		submenu: [
			_menu_item_basic('Minimize', 'CmdOrCtrl+M', 'minimize'),
			_menu_item_basic('Close', 'CmdOrCtrl+W', 'close'),
		]
	},
	{
		label: 'Help',
		role: 'help',
		submenu: menu_help
	}
];

var darwinMenu = [
	{
		label: appName,
		//role: 'services',
		submenu: [
			{
				label: 'About ' + appName,
				//role:'about',
				click: function(item, focusedWindow) {
					//lux.dialog.about(focusedWindow);
					lux.dialog.about(null);
				}
			},
			{type: 'separator'},
			_prefs_item,
			{type: 'separator'},
			{
				role: 'services',
				submenu: []
			},
			{type: 'separator'},
			{
				//label: 'Hide',
				//accelerator: 'Esc',
				role:'hide',
				//selector: 'hide:'
			},
			{
				//label: 'Hide',
				//accelerator: 'Esc',
				role:'hideothers',
				//selector: 'hide:'
			},
			{
				//label: 'Hide',
				//accelerator: 'Esc',
				role:'unhide',
				//selector: 'hide:'
			},
			{type: 'separator'},
			{
				role:'quit',
				accelerator: 'CmdOrCtrl+Q',
				/*label: 'Quit',
				click() {
					app.quit();
				}*/
			}
		]
	}
];

var menu = menu_template;
if (process.platform === 'darwin') {
	menu = darwinMenu.concat(menu_template);
}

module.exports = menu;
})();