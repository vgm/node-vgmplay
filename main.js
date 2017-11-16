const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');
var ipc = require('electron').ipcMain;
//const notifier = require('node-notifier');
//const {NotificationCenter} = notifier;

//// TODO: use react-desktop for stuff
const React = require('react');
const ReactDOM = require('react-dom');

const {Menu} = require('electron');
const app_menu_tmpl = require('./res/js/app.menubar.js')

let lux = require('./res/js/app.req.js');

let menu = null;

menu = Menu.buildFromTemplate(app_menu_tmpl);

/*let nc = new NotificationCenter({	// macos-specific notifications
	withFallback:false,
	customPath:void 0
});*/

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
//let win = [];
//let lux = {
//	"debug":true
//};

function createWindow () {
	lux.win[0] = (function(w){
		// Create the browser window.
		var w = new BrowserWindow({
			icon:path.join(__dirname,'res/img/icon.png'),	// TODO
			backgroundColor: '#2e2c29',
			width: 800, height: lux.compact?40:600,
			titleBarStyle: lux.compact?'hiddenInset':lux.style, frame: false, acceptFirstMouse: true,
			minWidth: 560, minHeight: 40
		});
	
		// and load the index.html of the app.
		w.loadURL(url.format({
			pathname: path.join(__dirname, 'index.html'),
			protocol: 'file:',
			slashes: true
		}));
	
		// Open the DevTools.
		if (lux.debug) w.webContents.openDevTools();
	
		// Emitted when the window is closed.
		w.on('blur', () => {
			w.webContents.send('app-blur');
		});
		w.on('focus', () => {
			w.webContents.send('app-focus');
		});
		w.on('closed', () => {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			lux.currentVGM = null;
			delete w;//win = null;
		});
		if (menu) {
			Menu.setApplicationMenu(menu);
			menu = null;
		}
		return w;
	})();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (lux.win === null || lux.win.length === 0) {
		createWindow();
	}
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

let vgm = require('./res/js/app.vgm.js');

var vg_out = '';

ipc.on('vgm-open-async', (evt, arg) => {
	var f, vg = null;
	if (typeof arg === 'array') f = arg[0];	// just one for now
	else f = arg.toString();
	//console.log(evt);
	console.log(`OPENING VGM ${f}...`);
	if (f) vg = vgm.read(f);
	if (vg) {
		vg.filename = `${f}`;
		lux.currentVGM = vg;
		evt.sender.send('title-change',`${path.posix.basename(f)} - ${app.getName()}`);
	}
	evt.sender.send('vgm-ready',vg);
});

ipc.on('konami', (evt, arg) => {
	evt.sender.send('konami-ack', arg);
});

ipc.on('vgm-notify', (evt, arg) => {
	let app_name = app.getName(),
		app_ver = app.getVersion(),
		app_icon = path.join(__dirname, './res/img/icon.png'),
		ic_play = path.join(__dirname, './res/img/ic-play.png'),
		ic_stop = path.join(__dirname, './res/img/ic-stop.png'),
		snd_sos = 'Basso';//path.join(__dirname, './res/Sosumi.aiff');
	var opts = {
		'title':app_name,
		'message':lux.currentVGM.filename,
		'sound':false,//snd_sos,
		'icon':app_icon,
		'wait':false,
		//'group':'',
		//'remove':'',
		//'list':'',
		'reply':false
	};
	if ('play'===arg) {
		opts.subtitle = "Now Playing",
		opts.contentImage = ic_play,
		opts.actions = 'Skip';
		/*notifier.notify(opts, (err, resp, meta) => {
			console.log(resp, meta);
			if ('activate'===resp) {
				var at = meta.activationType, av = meta.activationValue;
				if ('actionClicked'===at && 'Skip'===av) {
					console.log('TODO: SKIP TO NEXT!');
				}
			}
		});
		notifier.on('click', (no, opt) => {
			if (lux.win[0]) lux.win[0].focus();
			//else console.log(lux.win);
		});*/
		//console.log(nc);
		/*let vgmNotify = new Notification(, {
			body:
			badge:app_icon,
			icon:ic_play,	// right side on mac, use 'play' arrow and such
			silent:true
		});
		vgmNotify.onclick = () => {
			//document.dispatchEvent(new Event('vgm-play'));
			// TODO: what usually do when clicking 'now playing' notification from music app? window focus?
			lux.win[0].focus();
		};*/
	}
	else if ('stop'===arg) {
		opts.subtitle = "Stopped",
		opts.contentImage = ic_stop,
		opts.actions = 'Skip';
		//opts.sound = snd_sos;
		/*notifier.notify(opts, (err, resp, meta) => {
			if ('activate'===resp) {
				var at = meta.activationType, av = meta.activationValue;
				if ('actionClicked'===at && 'Skip'===av) {
					console.log('TODO: SKIP TO NEXT!');
				}
			}
		});
		notifier.on('click', (no, opt) => {
			if (lux.win[0]) lux.win[0].focus();
			//else console.log(lux.win);
		});*/
		/*let vgmNotify = new Notification("Stopped", {
			body:lux.currentVGM.filename,
			badge:app_icon,
			icon:ic_stop,	// right side on mac, use 'play' arrow and such
			silent:true
		});
		vgmNotify.onclick = () => {
			//document.dispatchEvent(new Event('vgm-play'));
			// TODO: what usually do when clicking 'now playing' notification from music app? window focus?
			lux.win[0].focus();
		};*/
	}
});

/*var vg = vgm.read('./test.vgz');
/*vg.on('data', (chunk) => {
	vg_out += chunk;
	console.log(`VGM ${chunk.length} byte(s)`);
});
vg.on('finish', function() {
	console.log(`VGM total ${vg_out.length} byte(s)`);
	global.vgmfile = vg_out;
});*/
//global.vgmfile = vg;

