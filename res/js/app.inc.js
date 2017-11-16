const LUX_FROM_WEB = true;

const Electron = (typeof LUX_FROM_WEB==='undefined')?require('electron'):require('electron').remote;

const remote = Electron;
const {app, BrowserWindow} = remote;
const {Menu,MenuItem} = remote;
const path = require('path');
var ipc = require('electron').ipcRenderer;


let lux = require('./res/js/app.req.js');
let vgm = require('./res/js/app.vgm.js');

lux.currentVGM = null;
var _open_vgms = [];
var _audio = null,
	_audio_proc = null,
	_audio_gain = null,
	_audio_filt = null,
	_audio_spec = null;
var _spec_id = null;

function setTitle(s) {
	var t = document.getElementById("hdr-title");
	if (t) t.innerHTML = s;//v+" HI";
	t = document.getElementsByTagName("title")[0];
	t.innerHTML = s;//v+" HI";
	//console.log('title change', s);
}

ipc.on('title-change', (evt, v) => {
	setTitle(v);
});
ipc.on('konami-ack', (evt, v) => {
	alert("30 LIVES!");
	++lux.konami;
	//console.log('KONAMI',v);
});

/*function _attach_vgm_click(q) {
	let lcs = document.querySelectorAll(q);
	//console.log(q);
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
			ipc.send('vgm-open-async',fn);	// just one for now
		});
	});
}*/
function _list_files(pl_id, fl) {
	var _pl = document.getElementById(pl_id), _fl;
	var _pl_tab = document.querySelector("#nav-tabs .tab-item[for="+pl_id+"]");
	if (fl&&fl.length>0) {
		_open_vgms.length = 0;
		_open_vgms = fl;
		var _of_id = "open-files";
		//var _of = document.getElementById(_of_id);
		//console.log("got filelist",fl);
		_fl = document.getElementById(_of_id+"-list");
		if (_fl) {
			var _frag = document.createDocumentFragment(), el;
			//var _fln = '';
			while (_fl.firstChild) _fl.removeChild(_fl.firstChild);
			lux.currentVGM = null;
			_open_vgms.forEach(function(e,i,a){
				el = document.createElement('li');
				el.className = 'nav-group-item vgm-item';
				el.id = 'vgm-item-'+i;
				el.title = e;
				el.dataset["file"] = e;
				el.dataset["tip"] = e;
				el.dataset["index"] = i;
				el.innerHTML = "<i class='icon icon-note'></i>"+path.posix.basename(e);
				/*var fn = function(evt){
					evt.preventDefault();
					if (lux.currentVGM&&lux.currentVGM.isPlaying) lux.currentVGM.stop();
					var lca = this.parentElement.querySelectorAll(":scope .active");
					//console.log("PREV ACTIVES",lca);
					lca.forEach(function(elem){
						elem.classList.remove('active');
					});
					this.classList.add('active');
					var fn = this.dataset["file"];
					ipc.send('vgm-open-async',fn);	// just one for now
				};*/
				_frag.appendChild(el);
				//_fln += `<li class='nav-group-item vgm-item' title="${e}" data-file="${e}">${path.posix.basename(e)}</li>`;
				//_open_vgms.push(e);
			});
			//_fl.innerHTML = _fln;
			_fl.appendChild(_frag);
			//_enable_xport();
			var _xpr = document.getElementById("act-xport-prev"),
				_xnx = document.getElementById("act-xport-next");
			if (_open_vgms.length>0) {
				//_of.classList.remove('disabled');
				_pl.classList.remove('disabled');
				if (_pl_tab) _pl_tab.dispatchEvent(new MouseEvent('click'));
				if (1===_open_vgms.length) {
					console.log("dispatching auto-click first item");
					_fl.querySelector('#vgm-item-0').click();//dispatchEvent(new MouseEvent('click'));
				}
			}
			else {
				//_of.classList.add('disabled');
			}
			_enable_xport(_of_id);
			//_attach_vgm_click(".vgm-item");
		}
		//ipc.send('vgm-open-async',f[0]);	// just one for now
	}
	if (_open_vgms.length>0) {
		//if (_xpr) _xpr.removeAttribute('disabled');
		//if (_xnx) _xnx.removeAttribute('disabled');
		if (_pl) _pl.classList.remove('disabled');
	}
	else {
		//if (_xpr) _xpr.setAttribute('disabled','disabled');
		//if (_xnx) _xnx.setAttribute('disabled','disabled');
		if (_fl) _fl.classList.add('disabled');
		if (_pl) _pl.classList.add('disabled');
	}
}
function _populate_gd3(id) {
	var el = document.getElementById(id);
	if (el) {
		//console.log('pop_gd3',id);
		//el.innerHTML = JSON.stringify(lux.currentVGM.header);
		while (el.firstChild) el.removeChild(el.firstChild);
		if (!lux.currentVGM) return;
		var _frag = document.createDocumentFragment();
		var t = document.createElement('table');
		t.classList.add('table-striped');
		var th = document.createElement('thead'), tb = document.createElement('tbody');
		(function(){
			var _1 = document.createElement('th'), _2 = document.createElement('th');
			_1.innerHTML = "Name";
			th.appendChild(_1);
			_2.innerHTML = "Value";
			th.appendChild(_2);
		})();
		t.appendChild(th);
		(function(){
			lux.GD3_STRINGS.forEach(function(e,i,a){
				var tr = document.createElement('tr');
				var _1 = document.createElement('td'), _2 = document.createElement('td');
				_1.innerHTML = e;
				_2.innerHTML = lux.currentVGM.gd3.getString(e);
				tr.appendChild(_1); tr.appendChild(_2);
				tb.appendChild(tr);
			});
			var chips = Object.keys(lux.currentVGM.header.clock).filter(function(c){
				return lux.currentVGM.header.clock[c]>0;
			});
			var ch_msg = ""; chips.forEach(function(c,i,a){
				if(""!==ch_msg)ch_msg+=", ";
				ch_msg += c+"/"+(lux.currentVGM.header.clock[c]&0x3FFFFFFF)+((lux.currentVGM.header.clock[c]>0x3FFFFFFF)?"&times;2":"");
			});
			
			/*for (var c in lux.currentVGM.header.clock) {
				if (lux.currentVGM.header.clock[c]>0) chips.push(c);
			}*/
			[
				["Version",lux.currentVGM.header.version],
				["Length",lux.toTimeString((lux.currentVGM.length/lux.config.sampleRate)|0)],
				["Looping",(lux.currentVGM.header.offset.loop?"Yes":"No")+` / ${lux.currentVGM.header.loop_sample_count} sample(s)`],
				["Chips",ch_msg]
			].forEach(function(e,i,a){
				var tr = document.createElement('tr');
				var _1 = document.createElement('td'), _2 = document.createElement('td');
				_1.innerHTML = e[0];
				_2.innerHTML = e[1];
				tr.appendChild(_1); tr.appendChild(_2); tb.appendChild(tr);
			});
			var es = document.querySelectorAll("input[data-chip]");
			if (es) es.forEach(function(e,i,a){e.value=e.value;e.sliderVisualCalc();});
		})();
		t.appendChild(tb);
		_frag.appendChild(t);
		//console.log(_frag);
		el.appendChild(_frag);
	}
}

function _enable_xport(_of_id) {
	//console.log(typeof lux.currentVGM, lux.currentVGM);
	var _of = document.getElementById(_of_id);
	var x = document.getElementById("xport-bar-range");
	if (x) x.dispatchEvent(new Event('attach-xport'));
	if (!lux.currentVGM) {	// TODO: disable xport
		document.getElementById("act-xport").classList.add("disabled");
		document.getElementById("xport-bar").classList.add("disabled");
		/*if (x)
			x.setAttribute("min",0),
			x.setAttribute("max",0),
			x.setAttribute("value",0),
			x.sliderVisualCalc();*/
	}
	else {
		document.getElementById("act-xport").classList.remove("disabled");
		document.getElementById("xport-bar").classList.remove("disabled");
		/*if (x)
			x.setAttribute("min",0),
			x.setAttribute("max",lux.currentVGM.length),
			x.setAttribute("value",lux.currentVGM.position),
			x.sliderVisualCalc();*/
		var _ov = _of.querySelector(".vgm-item.active");
		if (_ov) {
			var n = _ov.dataset["index"]|0;
			var _xpr = document.getElementById("act-xport-prev"),
				_xnx = document.getElementById("act-xport-next");
			_xpr.dataset["index"] = n-1;
			_xnx.dataset["index"] = n+1;
			if (_xpr) {
				if (n>0) _xpr.removeAttribute('disabled');
				else _xpr.setAttribute('disabled','disabled');
			}
			if (_xnx) {
				if ((n+1)<_open_vgms.length) _xnx.removeAttribute('disabled');
				else _xnx.setAttribute('disabled','disabled');
			}
		}
	}
	_populate_gd3('vgm-details');
	if (_open_vgms.length>0) {
		_of.classList.remove('disabled');
	}
	else {
		_of.classList.add('disabled');
	}
}

ipc.on('vgm-list-files', (evt, fl) => {
	_list_files("sec-playlist", fl);
});

ipc.on('vgm-ready', (evt, v) => {
	if (v) {
		//var t = document.getElementById("hdr-title");
		//if (t&&v.filename) t.innerText = `${v.filename} - ${app.getName()}`, console.log('title change', v.filename);

		//console.log(typeof v, v);
		if (lux.currentVGM&&lux.currentVGM.isPlaying) lux.currentVGM.stop();
		lux.currentVGM = vgm.fromData(v);
		//lux.currentVGM.reset();
		_enable_xport("open-files");
		//console.log("VGM",v.data.length);
	}
	else alert(`Couldn't load VGM file`);
});

ipc.on('app-blur', (evt, v) => {
	document.body.classList.add('blurred');
});
ipc.on('app-focus', (evt, v) => {
	document.body.classList.remove('blurred');
});


function updateOsc() {
	var ret = null;
	if (_audio_spec) {
		console.log("attaching visualizer");
		//// LEAVE AS IS IF CANVAS AND ANALYZER ARE CONSTANT
		var fft = _audio_spec.fftSize,
			len = _audio_spec.frequencyBinCount;
		var d = new Uint8Array(len);
		_audio_spec.getByteTimeDomainData(d);
		var _c = document.getElementById('vgm-spec'), c = _c?_c.getContext('2d'):null;
		const CW = _c.width, CH = _c.height;
		//var x = document.getElementById("xport-bar-range");
		//if (_c) c = _c.getContext('2d');
		//console.log(c);
		if (c) {
			c.clearRect(0,0, CW,CH);
			c.fillStyle = 'rgba(224,224,240,0.0)';
			c.lineWidth = 1; c.strokeStyle = 'rgb(0,0,128)';
			var sw = _c.width*1.0/len,	// slice width
				h2 = CH/2,	// canvas middle
			ret = function() {
				lux.raf = requestAnimationFrame(ret);
				document.getElementById("xport-bar-range").dispatchEvent(new Event('update-xport'));
				_audio_spec.getByteTimeDomainData(d);
				// PLOT CURRENT OSC
				c.clearRect(0,0, CW,CH); c.fillRect(0, 0, CW, CH);
				c.beginPath();
				//var msg = "";
				for (var i=0, x = 0; i<len; ++i) {
					var v = d[i]/128.0;
					var y = v*h2;
					if (0 === i) c.moveTo(x|0, y|0);
					else c.lineTo(x|0, y|0);
					//msg += `[${x},${y}]`;
					x += sw;
				}
				c.lineTo(CW, h2);
				c.stroke();
				//c.endPath();
				//console.log("vizzing",sw,msg);
			};
		}
		else ret = function() {
			lux.raf = requestAnimationFrame(ret);
			document.getElementById("xport-bar-range").dispatchEvent(new Event('update-xport'));
			_audio_spec.getByteTimeDomainData(d);
		};
		//console.log("vis ready");
		//else return null;
	}
	return ret;
}

document.addEventListener('vgm-play', function(e){
	ipc.send('vgm-notify','play');
	//alert(app_icon);
	// TODO: play vgm
	function zeroed(n) {var ret = new Float32Array(n); while (--n>-1) ret[n] = 0; return ret;}
	function zero_it(buf, n) {while (--n>-1) buf[n] = 0;}
	// 1. WebAudio.scriptProcessorNode stuff
	if (_audio_proc&&lux.currentVGM) {
		//if (_audio_proc.onaudioprocess) _audio_proc.resume();
		//else {
			var n = lux.config.bufferSize<<1;
			var buf = zeroed(n);
			lux.draw = updateOsc();
			_audio_proc.onaudioprocess = function(ae) {
				var outL = ae.outputBuffer.getChannelData(0),
					outR = ae.outputBuffer.getChannelData(1),
					i = 0, j = 0;
				// TODO: process N samples of VGM
				zero_it(buf, n);
				lux.currentVGM.process(lux.config.bufferSize, buf);
				//console.log("audioprocess",buf);
				while (i<lux.config.bufferSize) {//lux.config.bufferSize) {
					outL[i] = buf[j]; ++j;
					outR[i] = buf[j]; ++j;
					++i;
				}
				//x.dispatchEvent(new Event('update-xport'));
				//console.log("audioprocess",i);
			};
			if (_audio_filt) _audio_proc.connect(_audio_filt);
			else if (_audio_gain) _audio_proc.connect(_audio_gain);
			else if (_audio_spec) _audio_proc.connect(_audio_spec);
			else if (_audio) _audio_proc.connect(_audio.destination);
			if (lux.draw) lux.draw();
			//}
	}
	var msg = `${lux.currentVGM.filename} - ${lux.currentVGM.data.length} byte(s)`;
	//lux.dialog.info(null, "TODO: play VGM!", msg);
	// 2. turn play button action into stop
	var _pb = document.getElementById("act-xport-play");
	if (_pb) {
		_pb.classList.add('active');
		var _ic = _pb.querySelector('.icon');
		if (_ic) {
			_ic.classList.remove('icon-play');
			_ic.classList.add('icon-stop');
		}
		_pb.dataset["tip"] = "Stop song";
	}
});
document.addEventListener('vgm-stop', function(e){
	ipc.send('vgm-notify','stop');
	//alert(app_icon);
	// TODO: stop vgm
	// 1. detach WebAudio.scriptProcessorNode stuff
	if (_audio_proc) {
		_audio_proc.disconnect();
		_audio_proc.onaudioprocess = null;
		if (lux.raf) cancelAnimationFrame(lux.raf);
		lux.draw = null;
		console.log("Stopping audio...");
		//if (_audio_spec) _audio_proc.disconnect(_audio_spec);
		//else if (_audio_gain) _audio_proc.disconnect(_audio_gain);
		//else if (_audio) _audio_proc.disconnect(_audio.destination);
	}
	var msg = `${lux.currentVGM.filename} - ${lux.currentVGM.data.length} byte(s)`;
	//lux.dialog.info(null, "TODO: stop VGM!", msg);
	// 2. revert stop button action to play
	var _pb = document.getElementById("act-xport-play");
	if (_pb) {
		_pb.classList.remove('active');
		var _ic = _pb.querySelector('.icon');
		if (_ic) {
			_ic.classList.remove('icon-stop');
			_ic.classList.add('icon-play');
		}
		_pb.dataset["tip"] = "Play selected";
	}
});
document.addEventListener('vgm-reset', function(e){
	var msg = `${lux.currentVGM.filename} - ${lux.currentVGM.data.length} byte(s)`;
	//lux.dialog.info(null, "TODO: reset VGM!", msg);
});
document.addEventListener('vgm-auto-next', function(e){
	if (_open_vgms.length>1) {
		var nb = document.getElementById("act-xport-next");
		if (nb&&!nb.getAttribute('disabled')) {
			nb.dispatchEvent(new MouseEvent('click'));
			setTimeout(function(){
				document.getElementById("act-xport-play").dispatchEvent(new MouseEvent('click'));
			}, 100);
		}
	}
	var msg = `${lux.currentVGM.filename} - ${lux.currentVGM.data.length} byte(s)`;
	//lux.dialog.info(null, "TODO: play next VGM if possible!", msg);
});
