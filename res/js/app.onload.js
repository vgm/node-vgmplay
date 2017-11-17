// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
//var remote = require('electron').remote;
//var ipc = require('electron').ipcRenderer;

(function(){
var KEY_RIGHT = 39;
var KEY_LEFT = 37;
var KEY_SPACE = 32;
var KEY_UP = 38;
var KEY_DOWN = 40;
var KEY_A = 65;
var KEY_B = 66;

function attachSecretCode(KONAMI, f) {
	var keyPos = 0;
	document.addEventListener( 'keyup', function( ev ) {
		if ( KONAMI[keyPos] === ev.keyCode ) {
			++keyPos;

			if ( keyPos === KONAMI.length ) {
				keyPos = 0;
				f(ev);
			}
		}
		else {
			keyPos = 0;
		}
		//console.log('CODE',keyPos);
	} );
}
attachSecretCode(
	[ KEY_UP, KEY_UP, KEY_DOWN, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_LEFT, KEY_RIGHT, KEY_B, KEY_A ],
	function(ev){ipc.send( 'konami', 1 );}
);

function attachAudio() {
	if (!_audio) {
		var AC = window.AudioContext || window.webkitAudioContext;
		_audio = new AC();
		lux.config.sampleRate = _audio.sampleRate;
		_audio_proc = _audio.createScriptProcessor(lux.config.bufferSize, 2, 2);
		_audio_gain = _audio.createGain();
		_audio_gain.gain.value = 1.0;	//// TODO: ATTACH TO VOL SLIDER
		_audio_spec = _audio.createAnalyser();
		_audio_spec.fftSize = lux.config.bufferSize;
		_audio_filt = _audio.createBiquadFilter();
		_audio_filt.type = "lowpass";
		_audio_filt.frequency.value = 0.45*_audio.sampleRate;
		_audio_filt.Q.value = Math.SQRT1_2;
		_audio_filt.connect(_audio_gain);
		_audio_gain.connect(_audio_spec);
		_audio_gain.connect(_audio.destination);
	}	
}

function disableUI() {
	if (!lux.currentVGM) {
		document.getElementById("act-xport").classList.add("disabled");
		document.getElementById("xport-bar").classList.add("disabled");
	}
	var _id_to_disable = "sec-playlist";	//"open-files"
	var _ofl = document.getElementById(_id_to_disable);
	if (_ofl) {
		if (_open_vgms.length===0) _ofl.classList.add('disabled');
	};
}

function attachXport() {
	var x = document.getElementById("xport-bar-range");
	if (x) {
		x.addEventListener('attach-xport', function(e){
			//alert("attached");
			if (lux.currentVGM) {
				this.setAttribute("min",0);
				this.setAttribute("max",lux.currentVGM.length);
				//this.setAttribute("value",lux.currentVGM.position);
			}
			else {
				this.setAttribute("min",0);
				this.setAttribute("max",0);
				//this.setAttribute("value",0);
			}
			this.setAttribute("value",0);
			delete this.dataset["tip"], delete this.dataset["pos"];
			document.getElementById('cfg-volume-chips').dispatchEvent(new Event('enable-chip-vols'));
			this.sliderVisualCalc();
			
			//console.log("xport attached");
		});
		x.addEventListener('update-xport', function(e){
			if (lux.currentVGM) {
				//if (lux.currentVGM.position<lux.currentVGM.length)
				//	this.value = lux.currentVGM.position;
				//else {
					var lp = lux.currentVGM.length-lux.currentVGM.header.loop_sample_count;
					var v = (lux.currentVGM.header.loop_sample_count>0&&lux.currentVGM.position>lux.currentVGM.length) ?
						(lux.currentVGM.position-lp)%lux.currentVGM.header.loop_sample_count :
						lux.currentVGM.position;
					//this.min = 0, this.max = lux.currentVGM.length;
					//this.setAttribute("min",0);
					//this.setAttribute("max",lux.currentVGM.length);
					this.value = (lp+v)%lux.currentVGM.length;//((100.0*(lp+v))/lux.currentVGM.length)|0;
				//}
				//x.dispatchEvent(new Event('input'));
				this.dataset["tip"] = lux.toTimeString((lux.currentVGM.position/lux.config.sampleRate));
				this.dataset["pos"] = lux.currentVGM.position;
			}
			else {
				//this.value = 0;
				//delete this.dataset["tip"], delete this.dataset["pos"];
			}
			this.sliderVisualCalc();
			//console.log('xport');
		});
	}
}

function attachListClick() {
	var _fl = document.getElementById("open-files-list");
	if (_fl) _fl.addEventListener('click',function(e) {
		e.preventDefault();
		if (e.srcElement.classList.contains('vgm-item')) {
			//console.log('click',e);
			var el = e.srcElement;
			if (lux.currentVGM&&lux.currentVGM.isPlaying) lux.currentVGM.stop();
			var lca = el.parentElement.querySelectorAll(":scope .active");
			//console.log("PREV ACTIVES",lca);
			lca.forEach(function(elem){
				elem.classList.remove('active');
			});
			el.classList.add('active');
			var fn = el.dataset["file"];
			ipc.send('vgm-open-async',fn);	// just one for now
		}
	});
}

function loadConfig() {
	document.getElementById('cfg-sampleRate').innerText = lux.config.sampleRate;
	document.getElementById('cfg-bufferSize').innerText = lux.config.bufferSize;
	document.getElementById('cfg-compactMode').checked = lux.compact;
	if (_audio_gain) {
		var v = document.getElementById('cfg-volume');
		if (v) {
			v.value = (_audio_gain.gain.value*100)|0;
			v.sliderVisualCalc();
		}
	}
	window.addEventListener("input", function(event) {
		var _e = event.target;
		if ('cfg-volume' === _e.id) {
			_audio_gain.gain.value = v.value/100.0;
			//event.target.sliderVisualCalc();
		}
		else if ("chip" in _e.dataset) {
			if (!_e.disabled) {
				//// TODO: SET CHIP VOLUME
				if (lux.currentVGM) lux.currentVGM.setVolume(_e.dataset["chip"], _e.value);
				else console.log(_e.dataset["chip"],_e.value);
			}
		}
	}, false);
	var vc = document.getElementById('cfg-volume-chips');
	if (vc&&vgm) {
		vc.addEventListener('enable-chip-vols',function(e){
			e.preventDefault();
			// TODO: enable/disable chip volume sliders
			var _els = vc.querySelectorAll('[disabled]');
			_els.forEach(function(e,i,a){
				e.removeAttribute('disabled');
				var _i = e.querySelector('input[disabled]');
				if (_i) _i.removeAttribute('disabled');
			});
			_els = vc.querySelectorAll('.cfg-volume-item');
			_els.forEach(function(e,i,a){
				var _id = e.dataset['chip'];
				if (lux.currentVGM) {
					if (lux.currentVGM.header.clock[_id]>0) ;
					else {
						e.setAttribute('disabled','disabled');
						e.querySelector('input').setAttribute('disabled','disabled');
					}
				}
				else {
					e.setAttribute('disabled','disabled');
					e.querySelector('input').setAttribute('disabled','disabled');
				}
			});
		});
		function _makeSlider(id) {
			if (id in vgm.chips) {
				var _ch = vgm.chips[id];
				var ret = document.createElement('label');
				ret.className = 'cfg-volume-item';
				ret.id = `cfg-volume-wr-${id}`;
				ret.title = `${_ch.label}`;
				ret.dataset['chip'] = id;
				ret.setAttribute('disabled','disabled');
				ret.innerHTML = `<span>${_ch.label}</span> <span><i class="icon icon-volume"></i> <input type="range" data-chip="${id}" id="cfg-volume-${id}" class="slider slider-round slider-small" min="0" max="100" value="100" /></span>`;
				return ret;
			}
			else return null;
		}
		//console.log('attaching chip vol cfg',vgm);
		var _frag = document.createDocumentFragment();
		['sn76489','ym2413','ym2612','ym2151','okim6295','huc6280','qsound'].forEach(function(e,i,a) {
			//console.log(vgm[e]);
			if (e in vgm.chips) {
				var sl = _makeSlider(e);
				if (sl) _frag.appendChild(sl);
				//else console.log('missing chip',e);
			}
			//else console.log('missing chip',e);
		});
		vc.appendChild(_frag);
	}
	else console.log("couldn't attach config");
}

document.addEventListener('DOMContentLoaded', function () {
	//alert("Welcome to VGMPlayer!");
	//addMenus('.app-lc');
	if (lux.compact) {
		document.body.classList.add('compact', 'hiddenInset');
		var h = document.getElementById('hdr'), t = document.getElementById('hdr-title');
		h.appendChild(t);
	}
	else document.body.classList.add(lux.style);
	if (lux.debug) {
		console.log(process);
		console.log(app);
	}
	attachAudio();
	disableUI();
	setTitle(app.getName());
	attachXport();
	attachListClick();
	loadConfig();
	//var vg_out = '';

	//var vg = vgm.read('./test.vgz');
/*vg.on('data', (chunk) => {
	vg_out += chunk;
	console.log(`VGM ${chunk.length} byte(s)`);
});
vg.on('finish', function() {
	console.log(`VGM total ${vg_out.length} byte(s)`);
	global.vgmfile = vg_out;
});*/

	//var vgm = remote.getGlobal('vgmfile');
	//if (vg) vg.parse();
	//console.log("VGM",vg.data.length);
});

})();
