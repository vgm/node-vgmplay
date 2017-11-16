//const {app, BrowserWindow} = require('electron');
//const path = require('path');
//const {dialog} = require('electron').remote;

//let lux = require('./app.req.js');

//if (typeof lux === 'undefined') var lux = {};
lux["menu"]["main"] = {
	"home":new Menu(),
	"open":new Menu()
};
lux["act"]["main"] = {
	"open":null
};
lux["act"]["xport"] = {
	"play":null,
	"prev":null,
	"next":null
};
lux["act"]["help"] = {
	"about":null
};

(function(a){
	function _attach_vgm_click(q) {
		let lcs = document.querySelectorAll(q);
		//console.log(q);
		//var _ht = document.getElementById("hdr-title");
		lcs.forEach(function(el){
			el.addEventListener('click', function (evt) {
				evt.preventDefault();
				var lca = document.querySelectorAll(`${q}.active`);
				//console.log("ACTIVES",lca.length);
				lca.forEach(function(e){
					e.classList.remove('active');
				});
				el.classList.add('active');
				var fn = el.dataset["file"];
				//console.log(fn,el.dataset);
				//if (_ht) _ht.innerHTML = `${path.posix.basename(fn)} - ${app.getName()}`;
				ipc.send('vgm-open-async',fn);	// just one for now
				/*var id = el.id, what = id.split('-');
				if ('menu'===what[0]&&lux[what[0]]&&lux[what[0]][what[1]]&&lux[what[0]][what[1]][what[2]])
					lux[what[0]][what[1]][what[2]].popup(remote.getCurrentWindow());
				else if ('act'===what[0]&&lux[what[0]]&&lux[what[0]][what[1]]&&lux[what[0]][what[1]][what[2]]) {	// it's an 
					//alert("TODO: add action ("+id+")!");
					lux[what[0]][what[1]][what[2]](evt);
				}
				else alert("TODO: add something ("+id+")!"), console.log(what);*/
			});
		});
	}
	a["open"] = function(evt) {
		if (!lux.dialog||!lux.dialog.open)
			alert('TODO: open file dialog (VGM, VGZ)');
		else {
            var _ofl = document.getElementById("open-files");
            var _w = BrowserWindow.getFocusedWindow();
			lux.dialog.open(
				_w, //(process.platform === 'darwin') ? null : _w,
				function(f) {
					_w.webContents.send('vgm-list-files', f);
				}
			);
		}
	};
})(lux["act"]["main"]);
(function(a){
	a["prev"] = function(evt) {
		var el = evt.srcElement;
		if (el.classList.contains('icon')) el = el.parentElement;
		var _li = document.querySelector("#open-files-list .vgm-item[data-index='"+el.dataset["index"]+"']");
		//console.log("PREV",evt,el,_li);
		//alert("TODO: go to previous vgm!");
		//_li.dispatchEvent(new MouseEvent('click'));
		_li.click();
	};
	a["next"] = function(evt) {
		var el = evt.srcElement;
		if (el.classList.contains('icon')) el = el.parentElement;
		var _li = document.querySelector("#open-files-list .vgm-item[data-index='"+el.dataset["index"]+"']");
		//console.log("NEXT",evt,el,_li);
		//alert("TODO: go to next vgm!");
		//_li.dispatchEvent(new MouseEvent('click'));
		_li.click();
	};
	a["play"] = function(evt) {
		if (lux.currentVGM) {
			if (!lux.currentVGM.isPlaying) lux.currentVGM.play();
			else lux.currentVGM.stop();
		}
	};
})(lux["act"]["xport"]);
(function(a){
	a["about"] = function(evt) {
		lux.dialog.about(null);
	};
})(lux["act"]["help"]);


(function(m){
	//console.log("menuy");
	m.append(new MenuItem({
		label: 'Open…',
		click: lux["act"]["main"]["open"]||function(){alert("TODO: fix open func");}
	}));
	m.append(new MenuItem({
		label: 'Open VGM Playlist…',
		click: function() {
			// Trigger an alert when menu item is clicked
			alert('TODO: open file dialog (M3U)');
		}
	}));
	//m.popup(null);
})(lux["menu"]["main"]["home"]);

function addMenus(q) {
	let lcs = document.querySelectorAll(q);
	lcs.forEach(function(el){
		el.addEventListener('click', function (evt) {
			evt.preventDefault();
			var id = this.id, what = id.split('-');
			if (lux[what[0]]&&lux[what[0]][what[1]]&&lux[what[0]][what[1]][what[2]]) {
				if ('menu'===what[0])
					lux[what[0]][what[1]][what[2]].popup(remote.getCurrentWindow());
					//console.log("MENU",what);
				else if ('act'===what[0]) {	// it's an 
					//alert("TODO: add action ("+id+")!");
					if (!this.classList.contains('disabled')&&!this.getAttribute('disabled')) {
						lux[what[0]][what[1]][what[2]](evt);
					}
					//console.log("ACT",what);
				}
				else alert("TODO: add something ("+id+")!"), console.log(what);
			}
			else alert("TODO: missing something ("+id+")!"), console.log(what);
		});
	});
}

// Add menu listeners
document.addEventListener('DOMContentLoaded', function () {
	//alert("Welcome to VGMPlayer!");
	addMenus('.app-lc');
});
