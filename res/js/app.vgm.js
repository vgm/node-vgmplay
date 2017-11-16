(function(){

'use strict';

const Electron = (typeof LUX_FROM_WEB==='undefined')?require('electron'):require('electron').remote;

const {app, BrowserWindow} = Electron;
const path = require('path');
const url = require('url');

var zlib = require('zlib');
var fs = require('fs');
var gz = zlib.createGzip();
var guz = zlib.createGunzip();

let lux = require('./app.req.js');

let _v = {};
_v.sn76489 = require('./vgm/sn76489.js');
_v.ym2413 = require('./vgm/ym2413.js');
_v.ym2612 = require('./vgm/ym2612.js');
_v.ym2151 = require('./vgm/ym2151.js');
_v.okim6295 = require('./vgm/okim6295.js');
//_v.rf5c68 = require('./vgm/rf5c68.js');
//...
_v.qsound = require('./vgm/qsound.js');
//_v.huc6280 = require('./vgm/c6280.js');


/********
VGM 1.71 header
      00  01  02  03   04  05  06  07   08  09  0A  0B  0C  0D  0E  0F
0x00 ["Vgm " ident   ][EoF offset     ][Version        ][SN76489 clock  ]
0x10 [YM2413 clock   ][GD3 offset     ][Total # samples][Loop offset    ]
0x20 [Loop # samples ][Rate           ][SN FB ][SNW][SF][YM2612 clock   ]
0x30 [YM2151 clock   ][VGM data offset][Sega PCM clock ][SPCM Interface ]
0x40 [RF5C68 clock   ][YM2203 clock   ][YM2608 clock   ][YM2610/B clock ]
0x50 [YM3812 clock   ][YM3526 clock   ][Y8950 clock    ][YMF262 clock   ]
0x60 [YMF278B clock  ][YMF271 clock   ][YMZ280B clock  ][RF5C164 clock  ]
0x70 [PWM clock      ][AY8910 clock   ][AYT][AY Flags  ][VM] *** [LB][LM]
0x80 [GB DMG clock   ][NES APU clock  ][MultiPCM clock ][uPD7759 clock  ]
0x90 [OKIM6258 clock ][OF][KF][CF] *** [OKIM6295 clock ][K051649 clock  ]
0xA0 [K054539 clock  ][HuC6280 clock  ][C140 clock     ][K053260 clock  ]
0xB0 [Pokey clock    ][QSound clock   ][SCSP clock     ][Extra Hdr ofs  ]
0xC0 [WSwan clock    ][VSU clock      ][SAA1099 clock  ][ES5503 clock   ]
0xD0 [ES5506 clock   ][EC][EC][CD] *** [X1-010 clock   ][C352 clock     ]
0xE0 [GA20 clock     ] *** *** *** ***  *** *** *** ***  *** *** *** ***
0xF0  *** *** *** ***  *** *** *** ***  *** *** *** ***  *** *** *** ***

********/

function _vgm_obj(f, d, sr) {
	if (!this instanceof _vgm_obj) return new _vgm_obj(f, d);
	const VGM_HDR_LEN = 256;
	var _c = {}, _gd3 = {
		"getString":function(s) {
			var i = lux.GD3_STRINGS.indexOf(s);
			if (i>-1) return this.strings[i];
			else return null;
		}
	};
	var _playing = false,	// is song playing?
		_pos = 0,	// current file position
		_smp = 0,	// current audio sample
		_data_end = false;	// is data block done?
	var _fr_60 = 735, _fr_50 = 882;
	var _st = 0x34;	// this + data offset = start of data
	var _chips = {};
	var _blocks = [];
	var _dac = [];
	var Chip = {
		"ENUM":{
			"SN76496":0,
			"YM2413":1,
			"YM2612":2,
			"YM2151":3,
			"SegaPCM":4,
			"RF5C68":5,
			"YM2203":6,
			"YM2608":7,
			"YM2610":8,
			"YM3812":9,
			"YM3526":10,
			"Y8950":11,
			"YMF262":12,
			"YMF278B":13,
			"YMF271":14,
			"YMZ280B":15,
			"RF5C164":16,
			"PWM":17,
			"AY8910":18,
			"GameBoy":19,
			"NES":20,
			"MultiPCM":21,
			"uPD7759":22,
			"OKIM6258":23,
			"OKIM6295":24,
			"K051649":25,
			"K054539":26,
			"HuC6280":27,
			"C140":28,
			"K053260":29,
			"Pokey":30,
			"QSound":31,
			"SCSP":32,
			"WSwan":33,
			"VSU":34,
			"SAA1099":35,
			"ES5503":36,
			"ES5506":37,
			"X1-010":38,
			"C352":39,
			"GA20":40
		},
		"Name":[
			"SN76496", "YM2413", "YM2612", "YM2151", "SegaPCM", "RF5C68", "YM2203", "YM2608",
			"YM2610", "YM3812", "YM3526", "Y8950", "YMF262", "YMF278B", "YMF271", "YMZ280B",
			"RF5C164", "PWM", "AY8910", "GameBoy", "NES APU", "MultiPCM", "uPD7759", "OKIM6258",
			"OKIM6295", "K051649", "K054539", "HuC6280", "C140", "K053260", "Pokey", "QSound",
			"SCSP", "WSwan", "VSU", "SAA1099", "ES5503", "ES5506", "X1-010", "C352",
			"GA20"
		]
	};
	var Data = {
		"ENUM":{
			"YM2612":0x00,
			"RF5C68":0x01,
			"RF5C164":0x02,
			"PWM":0x03,
			"OKIM6258":0x04,
			"HuC6280":0x05,
			"SCSP":0x06,
			"NES":0x07,
			"SPCM":0x80,
			"OKIM6295":0x8b,
			"K054539":0x8c,
			"C140":0x8d,
			"K053260":0x8e,
			"QSOUND":0x8f
		},
		"Types":[
			"YM2612","RF5C68","RF5C164","PWM","OKIM6258","HuC6280","SCSP","NES",null,null,null,null,null,null,null,null,
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			"cYM2612","cRF5C68","cRF5C164","cPWM","cOKIM6258","cHuC6280","cSCSP","cNES",null,null,null,null,null,null,null,null,
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			"SPCM","YM2608dT","YM2610","YM2610dT","YMF278B","YMF271","YMZ280B","YMF278Br",
			"Y8950dT","MPCM","uPD7759","OKIM6295","K054539","C140","K053260","QSound",
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			"RF5C68w","RF5C164w","NESw",null,null,null,null,null,null,null,null,null,null,null,null,null,
			null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
			"SCSPw",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null
		]
	};
	//console.log("VGM",d.length);
	function _parse_uint32(b,st) {
		var _b = new Uint8Array(b.slice(st, st+4)), ret;
		//if (st&3) {
			//if (st&3) console.log("apparently need to manually uint32 on non-4s", st);
			/*var ret = 0;
			ret = (ret<<4)+b[st];
			ret = (ret<<4)+b[st+1];
			ret = (ret<<4)+b[st+2];
			ret = (ret<<4)+b[st+3];
			return ret;*/
			//_b = new Uint8Array(b.slice(st, st+4));
			ret  = new Uint32Array(_b.buffer, 0, 1);
			//console.log(_b, ret);
			//}
		///else {
		//	_b = b;
			//ret = new Uint32Array(_b, st, 1);
			//}
		return ret[0];
	}
	function _parse_uint16(b,st) {
		var _b = new Uint8Array(b.slice(st, st+2)), ret;
		//if (st&3) {
			//_b = new Uint8Array(b.slice(st, st+2));
			ret = new Uint16Array(_b.buffer, 0, 1);
			//}
		//else {
			//_b = b;
			//ret = new Uint16Array(b, st, 1);
			//}
		return ret[0];
	}
	function _parse_gd3(b) {
		// TODO: parse GD3 if any
		var st = _c["offset"]["gd3"]+0x14;
		var id = b.slice(st, st+4).toString();
		if (id!=="Gd3 ") {
			console.log("couldn't gd3 here",st);
			throw "Invalid GD3 signature";
		}
		_gd3["version"] = _parse_uint32(b,st+4)||0;
		_gd3["length"] = _parse_uint32(b,st+8)||0;
		var _ucs_chars;
		if (st&3) {
			_ucs_chars = new Uint8Array(b.slice(st+12, st+12+_gd3["length"]));
			_ucs_chars = new Uint16Array(_ucs_chars.buffer, 0, (_gd3["length"])>>1)
		}
		else _ucs_chars = new Uint16Array(b.buffer, st+12, (_gd3["length"])>>1);
		_gd3["strings"] = [];
		for (var i=0, l=_ucs_chars.length, t="", n, x=0; i<l; ++i) {
			if (x>10) break;
			n = _ucs_chars[i];
			if (n===0) _gd3["strings"].push(t), t = "", ++x;
			else {
				t += String.fromCharCode(n);
			}
		}
	}
	function _parse_header(b) {
		if (b.length<VGM_HDR_LEN) throw "Invalid VGM header";
		else {
			//console.log(`TODO: parse ${b.length} as header`);
			//console.log(b);
			//console.log(b.slice(0,12));
			var id = b.slice(0,4).toString();
			if ("Vgm "!==id) throw "Invalid VGM signature";
			_c["id"] = id||"";	// byte[4] "Vgm "
			_c["eof"] = _parse_uint32(b,4)||0;	// uint32 vgm_eof
			_c["version"] = _parse_uint32(b,8).toString(16)||0;	// BCD[4] vgm_version
			//console.log(_c);
			var can_101 = _c["version"]>=101,
				can_110 = _c["version"]>=110,
				can_150 = _c["version"]>=150,
				can_151 = _c["version"]>=151,
				can_160 = _c["version"]>=160,
				can_161 = _c["version"]>=161,
				can_170 = _c["version"]>=170,
				can_171 = _c["version"]>=171;
			_c["clock"] = {
				"sn76489":_parse_uint32(b,12)||0,
				"ym2413":_parse_uint32(b,16)||0,
				"ym2612":can_110?_parse_uint32(b,0x2c)||0:0,
				"ym2151":can_110?_parse_uint32(b,0x30)||0:0,
				"spcm":can_151?_parse_uint32(b,0x38)||0:0,
				"rf5c68":can_151?_parse_uint32(b,0x40)||0:0,
				"ym2203":can_151?_parse_uint32(b,0x44)||0:0,
				"ym2608":can_151?_parse_uint32(b,0x48)||0:0,
				"ym2610":can_151?_parse_uint32(b,0x4c)||0:0,
				"ym3812":can_151?_parse_uint32(b,0x50)||0:0,
				"ym3526":can_151?_parse_uint32(b,0x54)||0:0,
				"y8950":can_151?_parse_uint32(b,0x58)||0:0,
				"ymf262":can_151?_parse_uint32(b,0x5c)||0:0,
				"ymf278b":can_151?_parse_uint32(b,0x60)||0:0,
				"ymf271":can_151?_parse_uint32(b,0x64)||0:0,
				"ymz280b":can_151?_parse_uint32(b,0x68)||0:0,
				"rf5c164":can_151?_parse_uint32(b,0x6c)||0:0,
				"pwm":can_151?_parse_uint32(b,0x70)||0:0,
				"ay8910":can_151?_parse_uint32(b,0x74)||0:0,
				"gbdmg":can_161?_parse_uint32(b,0x80)||0:0,
				"nes":can_161?_parse_uint32(b,0x84)||0:0,
				"mpcm":can_161?_parse_uint32(b,0x88)||0:0,
				"upd7759":can_161?_parse_uint32(b,0x8c)||0:0,
				"okim6258":can_161?_parse_uint32(b,0x90)||0:0,
				"okim6295":can_161?(_parse_uint32(b,0x98))||0:0,
				"k051649":can_161?_parse_uint32(b,0x9c)||0:0,
				"k054539":can_161?_parse_uint32(b,0xa0)||0:0,
				"huc6280":can_161?_parse_uint32(b,0xa4)||0:0,
				"c140":can_161?_parse_uint32(b,0xa8)||0:0,
				"k053260":can_161?_parse_uint32(b,0xac)||0:0,
				"pokey":can_161?_parse_uint32(b,0xb0)||0:0,
				"qsound":can_161?_parse_uint32(b,0xb4)||0:0,
				"scsp":can_171?_parse_uint32(b,0xb8)||0:0,
				"ws":can_171?_parse_uint32(b,0xc0)||0:0,
				"vbvsu":can_171?_parse_uint32(b,0xc4)||0:0,
				"saa1099":can_171?_parse_uint32(b,0xc8)||0:0,
				"es5503":can_171?_parse_uint32(b,0xcc)||0:0,
				"es5505":can_171?_parse_uint32(b,0xd0)||0:0,
				"x1010":can_171?_parse_uint32(b,0xd8)||0:0,
				"c352":can_171?_parse_uint32(b,0xdc)||0:0,
				"ga20":can_171?_parse_uint32(b,0xe0)||0:0,
			};
			_c["offset"] = {
				"gd3":_parse_uint32(b,20)||0,
				"loop":_parse_uint32(b,28)||0,
				"data":can_150?_parse_uint32(b,0x34)||0:0,
				"header_extra":can_170?_parse_uint32(b,0xbc)||0:0,
			};
			//console.log(_c["offset"]);
			// uint32 clock_sn76489
			// uint32 clock_ym2413
			// uint32 offset_gd3
			_c["sample_count"] = _parse_uint32(b,0x18)||0; // uint32 sample_count
			// uint32 offset_loop
			_c["loop_sample_count"] = _parse_uint32(b,32)||0;	// uint32 loop_sample_count
			_c["frame_rate"] = can_101?_parse_uint32(b,0x24)||0:0;	// uint32 frame_rate
			_c["sn76489_feedback"] = can_101?_parse_uint16(b,0x28)||0:0;	// uint16 sn76489_feedback
			_c["sn76489_srw"] = b[0x2a];	// byte sn76489_srw
			_c["flags"] = {
				"sn76489":can_151?b[0x2b]:0,
				"ay8910":can_151?b[0x79]:0,
				"ay8910_ym2203":can_151?b[0x7a]:0,
				"ay8910_ym2608":can_151?b[0x7b]:0,
				"okim6258":can_161?b[0x94]:0,
				"k054539":can_161?b[0x95]:0
			};
			// byte sn76489_flags
			// uint32 clock_ym2612
			// uint32 clock_ym2151
			// uint32 offset_data
			// uint32 clock_spcm
			_c["spcm_interface"] = can_151?_parse_uint32(b,0x3c)||0:0;	// uint32 spcm_interface
			// uint32 clock_rf5c68
			// uint32 clock_ym2203
			// uint32 clock_ym2608
			// uint32 clock_ym2610
			// uint32 clock_ym3812
			// uint32 clock_ym3526
			// uint32 clock_y8950
			// uint32 clock_ymf262
			// uint32 clock_ymf278b
			// uint32 clock_ymf271
			// uint32 clock_ymz280b
			// uint32 clock_rf5c164
			// uint32 clock_pwm
			// uint32 clock_ay8910
			_c["ay8910_type"] = b[0x78];	// byte ay8910_type
			// byte ay8910_flags
			// byte ay8910_flags_ym2203
			// byte ay8910_flags_ym2608
			_c["volume_mod"] = b[0x7c];	// byte volume_mod
			_c["reserved_7D"] = b[0x7d];	// byte reserved_x7D
			_c["loop_count"] = b[0x7e];	// byte loop_count
			_c["loop_count_mod"] = b[0x7f];	// byte loop_count_mod
			// uint32 clock_gbdmg
			// uint32 clock_nes
			// uint32 clock_mpcm
			// uint32 clock_upd7759
			// uint32 clock_okim6258
			// byte okim6258_flags
			// byte k054539_flags
			_c["c140_type"] = b[0x96];	// byte c140_type
			_c["reserved_97"] = b[0x97];	// byte reserved_x97
			// uint32 clock_okim6295
			// uint32 clock_k051649
			// uint32 clock_k054539
			// uint32 clock_huc6280
			// uint32 clock_c140
			// uint32 clock_k053260
			// uint32 clock_pokey
			// uint32 clock_qsound
			// uint32 clock_scsp
			// uint32 offset_header_extra
			// uint32 clock_ws
			// uint32 clock_vbvsu
			// uint32 clock_saa1099
			// uint32 clock_es5503
			// uint32 clock_es5505
			_c["es5503_chan_count"] = b[0xd4];	// byte es5503_channel_count
			_c["es5505_chan_count"] = b[0xd5];	// byte es5505_channel_count
			_c["c352_div"] = b[0xd6]; // byte c352_div
			_c["reserved_D7"] = b[0xd7];	// byte reserved_xD7
			// uint32 clock_x1010
			// uint32 clock_c352
			// uint32 clock_ga20
			// byte[28] reserved_xE4
			//console.log(_c);
			_st += can_150?_c["offset"]["data"]:0x0c;
		}
	}
	//console.log(`FILE ${f}`);
	this.filename = f||null;
	this.data = d||null;
	try {
		_parse_header(this.data.slice(0,256));
	} catch (err) {
		console.log(err);
		return null;
	}
	if (_c["offset"]["gd3"]>0) _parse_gd3(this.data);
	Object.defineProperty(this, 'header', {get:function(){return _c;}});
	Object.defineProperty(this, 'gd3', {get:function(){return _gd3;}});
	Object.defineProperty(this, 'isPlaying', {get:function(){return !!_playing;}});
	Object.defineProperty(this, 'position', {get:function(){return _smp;}});
	Object.defineProperty(this, 'length', {get:function(){return _c["sample_count"];}});
	for (var ci in _c["clock"]) {
		if (_c["clock"][ci]>0) {
			if (ci in _v && !(ci in _chips)) {
				var n = 1+((_c["clock"][ci]>0x3FFFFFFF)|0);
				_chips[ci] = _v[ci].create(_c["clock"][ci]&0x3FFFFFFF, lux.config.sampleRate, n);
				console.log("creating chip",ci,n);
			}
			//console.log(ci);
		}
	}
	this.play = () => {
		//console.log("vgm play");
		if (!_playing) {
			_playing = true;
			document.dispatchEvent(new Event('vgm-play'));
		}
	};
	this.stop = () => {
		//console.log("vgm stop");
		if (_playing) {
			_playing = false;
			document.dispatchEvent(new Event('vgm-stop'));
		}
		//else console.log("something's up");
	};
	this.reset = () => {
		_pos = 0, _smp = 0;
		_data_end = false;
		_fr_60 = 735, _fr_50 = 882;
		document.dispatchEvent(new Event('vgm-reset'));
	};
	var _proc = {
		0x40:function(b, z/*, buf*/){
			// 0x4F dd    : Game Gear PSG stereo, write dd to port 0x06
			if (0x4f===b[z]) {
				if (_chips["sn76489"]) {
					_chips["sn76489"].GGStereoWrite(b[z+1]);
				}
				_pos += 2;
			}
			else if (_c["version"]>=161) _pos += 3;
			else _pos += 2;
			return 0;
		},
		0x50:function(b, z/*, buf*/){
			// 0x50 dd    : PSG (SN76489/SN76496) write value dd
			// 0x51 aa dd : YM2413, write value dd to register aa
			// 0x52 aa dd : YM2612 port 0, write value dd to register aa
			// 0x53 aa dd : YM2612 port 1, write value dd to register aa
			// 0x54 aa dd : YM2151, write value dd to register aa
			// 0x55 aa dd : YM2203, write value dd to register aa
			// 0x56 aa dd : YM2608 port 0, write value dd to register aa
			// 0x57 aa dd : YM2608 port 1, write value dd to register aa
			// 0x58 aa dd : YM2610 port 0, write value dd to register aa
			// 0x59 aa dd : YM2610 port 1, write value dd to register aa
			// 0x5A aa dd : YM3812, write value dd to register aa
			// 0x5B aa dd : YM3526, write value dd to register aa
			// 0x5C aa dd : Y8950, write value dd to register aa
			// 0x5D aa dd : YMZ280B, write value dd to register aa
			// 0x5E aa dd : YMF262 port 0, write value dd to register aa
			// 0x5F aa dd : YMF262 port 1, write value dd to register aa

			if (0x50===b[z]) {
				if (_chips["sn76489"]) {
					_chips["sn76489"].write(b[z+1]);
				}
				_pos += 2;
			}
			else {
				switch (b[z]) {
					case 0x51:
						if (_chips["ym2413"]) {
							_chips["ym2413"].write(b[z+1], b[z+2]);
						}
						break;
					case 0x52:
						//console.log(z,"0x52 YM2612:0",b[z+1].toString(16),b[z+2].toString(16));
						if (_chips["ym2612"]) {
							_chips["ym2612"].write(b[z+1], b[z+2]);
						}
						break;
					case 0x53:
						//console.log(z,"0x53 YM2612:1",b[z+1].toString(16),b[z+2].toString(16));
						if (_chips["ym2612"]) {
							_chips["ym2612"].write(0x100|b[z+1], b[z+2]);
						}
						break;
					case 0x54:
						if (_chips["ym2151"]) {
							_chips["ym2151"].SetReg(b[z+1], b[z+2]);
						}
						break;
				}
				_pos += 3;
			}
			return 0;
		},
		0x60:function(b, z/*, buf*/){
			// 0x61 nn nn : Wait n samples, n can range from 0 to 65535 (approx 1.49
			// 0x62       : wait 735 samples (60th of a second)
			// 0x63       : wait 882 samples (50th of a second)
			// 0x64 cc nn nn : override length of 0x62/0x63
            //      cc - command (0x62/0x63)
            //      nn - delay in samples
            //      [Note: Not yet implemented. Am I really sure about this?]
			// 0x66       : end of sound data
			// 0x67 ...   : data block: see below
			// 0x68 ...   : PCM RAM write: see below
			//// TODO: if wait, generate N samples
			var ret = 0;
			switch (b[z]) {
				case 0x61:
					ret = _parse_uint16(b, z+1);
					_pos += 3;
					break;
				case 0x62:
					ret = _fr_60;
					++_pos;
					break;
				case 0x63:
					ret = _fr_50;
					++_pos;
					break;
				case 0x64:
					_pos += 4;
					break;
				case 0x67:
					_pos += 1;
					//// TODO: CHANGE THIS WHEN WORKING
					if (0x66===b[z+1]) {
						//console.log("process",z,"start of data block");
						_pos += 1;
						var n = _blocks.length;
						var l = _parse_uint32(b, z+3);
						var c = 0;
						if (l&0x80000000) {
							c++, l &= 0x7FFFFFF;
						}
						_blocks[n] = {
							"type":b[z+2],
							"offset":z+7,
							"data":new Uint8Array(b.slice(z+4, z+4+l)),
							"data_uncmp":null,
							"muted":0
						};
						var _bc = (b[z+2]&0x40);
						function _pcm_dec(d) {
							var ct = d[0], cd = _parse_uint32(d, 1);
							console.log("pcm::dec",ct,cd);
							var bd = d[5], bc = d[6], st = d[7], aa = _parse_uint16(d, 8);
							switch (ct) {
								case 0:	// 00 - n-Bit-Compression
									console.log("pcm::dec","n-Bit-Compression",cd,bd,bc,st,aa);
									break;
								case 1:	// 01 - DPCM-Compression
									console.log("pcm::dec","DPCM-Compression",cd,bd,bc,st,aa);
									break;
								default:
									console.log("pcm::dec","unsupported compression type",ct);
									break;
							}
							return d;
						}
						if (0x40===_bc) {
							if (0x7F===b[z+2]) {
								// 7F     : Decompression Table
							}
							else _blocks[n]["data_uncmp"] = _pcm_dec(_blocks[n]["data"]);
						}
						else if (0x00===_bc) {
							_blocks[n]["data_uncmp"] = _blocks[n]["data"];//new Uint8Array(b.slice(z+7, z+7+l));
						}
						//// TODO: process data block properly
						switch (b[z+2]) {
							case Data.ENUM.YM2612:
								if (_v.ym2612&&-1===_v.ym2612.data.index) _v.ym2612.data.index = n;
								break;
							default:
								if (b[z+2]>=0x80&&b[z+2]<0xc0) {	// rom/ram image dumps, usually contain samples
									var rs = _parse_uint32(b, z+7),	// rom size
										st = _parse_uint32(b, z+11),	// data start addr
										du = new Uint8Array(b.slice(z+15, z+15+l-8)),
										ds = new Int8Array(b.slice(z+15, z+15+l-8));
									switch (b[z+2]) {
										case Data.ENUM.OKIM6295:
											//console.log("DATABLOCK",n,"OKIM6295","TODO",rs,st, d.length, d);
											if (_chips["okim6295"]) {
												_chips["okim6295"].writeROM(rs, st, d.length, du, c);
											}
											break;
										case Data.ENUM.QSOUND:
											console.log("DATABLOCK",n,"QSOUND","TODO",rs,st, ds.length);
											if (_chips["qsound"]) {
												//z = blocks[n].data.charCodeAt(0)+(blocks[n].data.charCodeAt(1)<<8)+(blocks[n].data.charCodeAt(2)<<16)+(blocks[n].data.charCodeAt(3)<<24);
												//st = blocks[n].data.charCodeAt(4)+(blocks[n].data.charCodeAt(5)<<8)+(blocks[n].data.charCodeAt(6)<<16)+(blocks[n].data.charCodeAt(7)<<24);
												//l = b[2]-8;
												//d = blocks[n].data.substr(8,l);
												_chips['qsound'].set(rs, st, l, ds);
											}
											//else if (settings.strict) throw new Error("VGM::read - attempted to read QSound data block without QSound support");
											//else console.log("couldn't set qsound data");
											break;
									}
								}
								break;
						}
						//console.log(z,"0x67 DATA",b[z+2],l);
						console.log(z,"0x67 DATA",_blocks[n]);
						_pos += 1+4+l;
					}
					else console.log("process","start of data block error");
					break;
				case 0x68:
					_pos += 1;
					if (0x66===b[z+1]) {
						_pos += 1;
						var t = b[z+2];
						_pos += 1+3+3+3;
					}
					break;
				case 0x66:
					// 0x66       : end of sound data
					++_pos;
					_data_end = true;
					//console.log("process",z,"end of data block");
					break;
			}
			return ret;
		},
		0x70:function(b, z/*, buf*/){
			// 0x7n       : wait n+1 samples, n can range from 0 to 15.
			var ret = b[z]&0xf;
			//console.log(z,"0x7x WAIT N+1",ret);
			++_pos;
			return ret+1;
		},
		0x80:function(b, z/*, buf*/){
			// 0x8n       : YM2612 port 0 address 2A write from the data bank, then wait n samples; n can range from 0 to 15. Note that the wait is n, NOT n+1. (Note: Written to first chip instance only.)
			var ret = b[z]&0xf;
			//console.log(z,"0x8x YM2612 DAC+WAIT",ret.toString(16));
			if (_v.ym2612) {
				if (_v.ym2612.data.index>-1) {
					if (_v.ym2612.data.pointer<_blocks[_v.ym2612.data.index].data.length-1) {
						_v.ym2612.data.current = _blocks[_v.ym2612.data.index].data[_v.ym2612.data.pointer++];
					}
				}
				else {
					_v.ym2612.data.current = 128;
				}
				if (_chips["ym2612"]) {
					_chips["ym2612"].write(0x2A, _v.ym2612.data.current);
				}
			}
			++_pos;
			return ret;
		},
		0x90:function(b, z/*, buf*/){
			// 0x90-0x95  : DAC Stream Control Write: see below
			switch (b[z]) {
				case 0x90:	// Setup Stream Control:  0x90 ss tt pp cc
					var ss = b[z+1], tt = b[z+2], pp = b[z+3], cc = b[z+4];
					_dac[ss] = {
						"id":ss,
						"type":tt&0x7f,
						"num":(tt&0x80)>>7,
						"addr":pp,
						"cmd":cc
					};
					//console.log(_pos,"0x90 stream::setup",ss,tt,pp,cc);
					console.log(_pos,"0x90 stream::setup",ss,_dac[ss]);
					_pos += 1+1+1+1+1;
					break;
				case 0x91:	// Set Stream Data:  0x91 ss dd ll bb
					var ss = b[z+1], dd = b[z+2], ll = b[z+3], bb = b[z+4];
					if (!_dac[ss]) _dac[ss] = {
						"id":ss
					};
					_dac[ss]["bank"] = dd;
					_dac[ss]["step"] = ll;
					_dac[ss]["base"] = bb;
					//console.log(_pos,"0x91 stream::set_data",ss,dd,ll,bb);
					console.log(_pos,"0x91 stream::set_data",ss,_dac[ss]);
					_pos += 1+1+1+1+1;
					break;
				case 0x92:	// Set Stream Frequency:  0x92 ss ff ff ff ff
					var ss = b[z+1], ff = _parse_uint32(b, z+2);
					if (!_dac[ss]) _dac[ss] = {
						"id":ss
					};
					_dac[ss]["freq"] = ff;
					//console.log(_pos,"0x92 stream::set_freq",ss,ff);
					console.log(_pos,"0x92 stream::set_freq",ss,_dac[ss]);
					_pos += 1+1+4;
					break;
				case 0x93:	// Start Stream:  0x93 ss aa aa aa aa mm ll ll ll ll
					var ss = b[z+1], aa = _parse_uint32(b, z+2),
						mm = b[z+6], ll = _parse_uint32(b, z+7);
					if (!_dac[ss]) _dac[ss] = {
						"id":ss
					};
					_dac[ss]["start"] = aa;
					_dac[ss]["mode"] = mm;
					_dac[ss]["playing"] = ll;
					//console.log(_pos,"0x93 stream::start",ss,aa,mm,ll);
					console.log(_pos,"0x93 stream::start",ss,_dac[ss]);
					_pos += 1+1+4+1+4;
					break;
				case 0x94:	// Stop Stream:  0x94 ss
					var ss = b[z+1];
					if (!_dac[ss]) _dac[ss] = {
						"id":ss
					};
					_dac[ss]["playing"] = 0;
					//console.log(_pos,"0x94 stream::stop",ss);
					console.log(_pos,"0x94 stream::stop",ss);
					_pos += 1+1;
					break;
				case 0x95:	// Start Stream (fast call):  0x95 ss bb bb ff
					var ss = b[z+1], bb = _parse_uint16(b, z+2), ff = b[z+4];
					//console.log(_pos,"0x95 stream::start_fast",ss,bb,ff);
					console.log(_pos,"0x95 stream::start_fast",ss,_dac[ss]);
					_pos += 1+1+1+1+1;
					break;
				default:
					++_pos;
					break;
			}
			return 0;
		},
		0xa0:function(b, z/*, buf*/){
			// 0xA0 aa dd : AY8910, write value dd to register aa
			_pos += 3;
			return 0;
		},
		0xb0:function(b, z/*, buf*/){
			switch (b[z]) {
				case 0xB8:	// 0xB8 aa dd : OKIM6295, write value dd to register aa
					if (_chips["okim6295"]) {
						var c = (b[z+1]&0x80)>>7;
						//console.log(_pos,"okim6295",c,b[z+1].toString(16),b[z+2].toString(16));
						_chips["okim6295"].write(b[z+1], b[z+2], c);
					}
					break;
			}
			_pos += 3;
			return 0;
		},
		0xc0:function(b, z/*, buf*/){
			switch (b[z]) {
				case 0xC4:
					if (_chips["qsound"]) {
						_chips['qsound'].write(b[z+3],(b[z+1]<<8)+b[z+2]);
					}
					break;
			}
			_pos += 4;
			return 0;
		},
		0xd0:function(b, z/*, buf*/){
			_pos += 4;
			return 0;
		},
		0xe0:function(b, z/*, buf*/){
			if (0xe0===b[z]) {
				var b = _parse_uint32(b, z+1);
				//console.log(z,"0xE0 YM2612 DAC SEEK",b);
				if (_v.ym2612&&_v.ym2612.data.index>-1) _v.ym2612.data.pointer = b;
			}
			_pos += 5;
			return 0;
		},
		0xf0:function(b, z/*, buf*/){
			_pos += 5;
			return 0;
		},
	};
	function processCmd(b/*, buf*/) {
		var z = _st+_pos;
		//console.log('cmd',b[z].toString(16));
		var ret = 0, c = b[z]&0xf0;
		if (_proc[c]) {
			ret = _proc[c](b, z/*, buf*/);
		}
		else ++_pos;
		return ret;
	}
	var _buf_remaining = 0;
	function _fill(buf, n, off) {
		//// TODO: fillSamples
		if ({} !== _chips) {
			//console.log("fill",n);
			//if (z>(buf.length>>1))
			//var z = off, l = off+(n<<1); while (z<l) buf[z++] = 0.0;
			for (var ci in _chips) {
				if (_c["clock"][ci]>0) _chips[ci].mixStereo(buf, n, off);
			}
			//_buf_remaining = 
			//if (z>0) _buf_remaining = 
			//console.log(buf);
		}
	}
	this.process = function(n, buf) {
		//console.log("vgm::process",n);
		// TODO: process N samples
		var goal = _smp+n, i = 0, z = 0;
		var done = _playing?false:true;
		// 1. while (_pos<goal&&!_data_end) process next command
		while (!done) {
			if (_buf_remaining>0) z = _buf_remaining, _buf_remaining = 0;
			else z = processCmd(this.data/*, buf*/);
			_smp += z;
			if (_smp>goal) _buf_remaining = (_smp-goal), z = (z-_buf_remaining);
			if (_playing&&z>0) _fill(buf, z, i<<1);
			if (_data_end) {
				if (_c["offset"]["loop"]>0&&_c["loop_sample_count"]>0) {
					_pos = _c["offset"]["loop"]-(0x1c);
					_data_end = false;
					//done = true, this.stop(), console.log("process","looping not yet supported");	// TODO: FIX THIS
				}
				else done = true, this.stop(), this.reset(), document.dispatchEvent(new Event('vgm-auto-next'));	//// TODO: ALLOW PLAYLIST NEXT
			}
			//done = true;	// TODO: remove this when working
			if (_smp>=goal) {
				done = true;
				//_buf_remaining += _smp-goal;
			}
			i += z; if (i>n) done = true;	// hard cutoff at bufferSize samples
		}
		//console.log("vgm::process",n,goal,_smp);
	};
	this.setVolume = function(ch, v) {
		if ({} !== _chips && ch in _chips) {
			//console.log(ch,v);
			_chips[ch].volume = v>100?100:(v<0?0:v|0);
		}
	};
	return this;
}

let mod = {
	get chips(){return _v;},
	"read":function(f) {
		//console.log(`Loading ${f}`);
		try {
			var q = fs.readFileSync(f), ret;
			//console.log("VGM READ",q.length);
			//console.log("SIG",q[0],q[1]);
			if (0x1f===q[0]&&0x8b===q[1]) {
				//console.log("GZ");
				ret = zlib.gunzipSync(q);
			}
			else ret = q;
			//console.log(`Loaded ${f}`);
			return new _vgm_obj(f, ret);
		} catch (e) {
			console.log("vgm read error",e);
			throw e;
		}
	},
	"fromData":function(d) {
		return new _vgm_obj(d.filename, d.data);
	}
};

module.exports = mod;
})();