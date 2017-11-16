(function(){
"use strict";


function OKIM6295() {
	if (!this instanceof OKIM6295) return new OKIM6295();
	this.version = 0x100;
	this.label = "OKIM6295";
	this.attenuation = (1<<16);
	this.volume = 100;
	this.start = 0;
	this.count = 0;
	this.sampleRate = 44100;
	this.chip = null;
}

(function(O){

const MAX_SAMPLE_CHUNK = 0x10;

/* tables computed? */
var tables_computed = 0;	// int

/* step size index shift table */
const index_shift = [-1, -1, -1, -1, 2, 4, 6, 8];

/* lookup table for the precomputed difference */
var diff_lookup = new Int32Array(49*16);

/* volume lookup table. The manual lists only 9 steps, ~3dB per step. Given the dB values,
   that seems to map to a 5-bit volume control. Any volume parameter beyond the 9th index
   results in silent playback. */
const volume_table = [	// int[16]
	0x20,	//   0 dB
	0x16,	//  -3.2 dB
	0x10,	//  -6.0 dB
	0x0b,	//  -9.2 dB
	0x08,	// -12.0 dB
	0x06,	// -14.5 dB
	0x04,	// -18.0 dB
	0x03,	// -20.5 dB
	0x02,	// -24.0 dB
	0x00,
	0x00,
	0x00,
	0x00,
	0x00,
	0x00,
	0x00,
];

function _adpcm() {
	this.signal = -2;	// int32
	this.step = 0;	// int32
	this.reset = function() {
		/* make sure we have our tables */
		if (!tables_computed) compute_tables();
		/* reset the signal/step */
		this.signal = -2;
		this.step = 0;
	};
	this.clock = function(nib){
		var adv = arguments.length>1?arguments[1]|0:1;
		if (adv) {
			this.signal += diff_lookup[(this.step<<4)+(nib&15)];
			/* clamp to the maximum */
			if (this.signal>2047) this.signal = 2047;
			else if (this.signal<-2048) this.signal = -2048;
			/* adjust the step size and clamp */
			this.step += index_shift[nib&7];
			if (this.step>48) this.step = 48;
			else if (this.step<0) this.step = 0;
		}
		/* return the signal */
		return this.signal;
	};
}

function adpcm_voice() {
	return {
		"playing":0,	// uint8, 1 if we are actively playing
		"base_offset":0,	// uint32, pointer to the base memory location
		"sample":0,	// uint32, current sample number
		"adpcm":new _adpcm(),	// current adpcm state
		"volume":0,	// uint32, output volume
		"muted":0	// uint8
	};
}

const OKIM6295_VOICES = 4;

function okim_state() {
	this.voice = [],
	this.command = 0,	// int16
	this.bank_offs = 0,	// int32
	this.pin7_state = 0,	// uint8
	this.nmk_mode = 0,	// uint8
	this.nmk_bank = [0,0,0,0]	// uint8[4]
	this.master_clock = 0,	// uint32, master clock frequency
	this.initial_clock = 0,	// uint32
	this.scale = 1,
	this.romsize = 0,	// uint32
	this.rom = [],	// uint8[]
	//this.smpratefunc = function(d){},	// SRATE_CALLBACK
	//this.smpratedata = [];	// void*
	this.sample_rate = 44100;
	this.smp_last = 0x00;
	(function(x, n){
		for (var i=0; i<n; ++i) x[i] = new adpcm_voice();
	})(this["voice"], OKIM6295_VOICES);
	//// memory_raw_read_byte for generate_adpcm
	const NMK_BNKTBLBITS = 8;
	const NMK_BNKTBLSIZE = (1 << NMK_BNKTBLBITS);	// 0x100
	const NMK_TABLESIZE = (4 * NMK_BNKTBLSIZE);	// 0x400
	const NMK_TABLEMASK = (NMK_TABLESIZE - 1);		// 0x3FF
	const NMK_BANKBITS = 16;
	const NMK_BANKSIZE = (1 << NMK_BANKBITS);		// 0x10000
	const NMK_BANKMASK = (NMK_BANKSIZE - 1);		// 0xFFFF
	const NMK_ROMBASE = (4 * NMK_BANKSIZE);		// 0x40000
	this.raw_read = function(off) {
		var cur_off;
		if (!this.nmk_mode) cur_off = this.bank_offs|off;
		else {
			var _bank_id;	// uint8
			if (off<NMK_TABLESIZE && (this.nmk_mode&0x80)>0) {
				// pages sample table
				_bank_id = off>>NMK_BNKTBLBITS;
				cur_off = off&NMK_TABLEMASK;	// 0x3FF, not 0xFF
			}
			else {
				_bank_id = off>>NMK_BANKBITS;
				cur_off = off&NMK_BANKMASK;
			}
			cur_off |= (this.nmk_bank[_bank_id&0x03]<<NMK_BANKBITS);
		}
		if (cur_off<this.romsize) return this.rom[cur_off];
		else return 0x00;
	};
	function _interpolateLinearPCM(r,v,b,smp,adv) {
		var s1 = smp|0, s2 = s1+1, d = smp-s1;
		var n1 = r.raw_read(b+(s1>>1))>>(((s1&1)<<2)^4),
			n2 = r.raw_read(b+(s2>>1))>>(((s2&1)<<2)^4);
		var o1 = v.adpcm.clock(n1,adv), o2 = v.adpcm.clock(n2,adv);
		return (o1*(1.0-d)+o2*(d))*0.5;
	}
	this.generate_adpcm = function(vid, /*buf,*/ len/*, z*/) {
		var ret = new Int16Array(len);
		var samples = len|0;
		var n = 0;
		/* if this voice is active */
		if (this["voice"][vid]&&this["voice"][vid].playing) {
			(function(ref, v){
				var sr_sc = ref.scale/ref.sample_rate;
				var base = v.base_offset;	// offs_t
				var smp = v.sample|0;	// int
				var c = v.count;	// int
				var v2 = v.volume/2.0;
				var smp_last = smp|0;
				var adv = 1;
				/* loop while we still have samples to generate */
				while (samples>0) {
					/* compute the new amplitude and update the current step */
					//var nib = ref.raw_read(base+(smp>>1))>>(((smp&1)<<2)^4);
					/* output to the buffer, scaling by the volume */
					/* signal in range -2048..2047, volume in range 2..32 => signal * volume / 2 in range -32768..32767 */
					//var out = v.adpcm.clock(nib)*v.volume/2;
					if (smp_last!==(smp|0)) {
						smp_last = smp|0;
						adv = 1;
					}
					var out = _interpolateLinearPCM(ref,v,base,smp,adv)*v2;
					ret[n++] = out|0;
					--samples;
					/* next! */
					if ((smp+=sr_sc)>=c) {
						v.playing = 0;
						break;
					}
					adv = 0;
				}
				/* update the parameters */
				v.sample = smp;
			})(this, this["voice"][vid]);
		}
		/* fill the rest with silence */
		while (samples--) {
			ret[n++] = 0;
		}
		return ret;
	};
	this.set_bank_base = function(b) {this.bank_offs = b;};
	this.set_pin7 = function(p, f, n) {
		this.pin7_state = p|0;
		O.onsampleratechange(f,n);
	};
	this.read = function(off) {
		var res = 0xf0;	/* naname expects bits 4-7 to be 1 */
		for (var i=0, l=this.voice.length; i<l; ++i) {
			if (this.voice[i].playing) res |= 1<<i;
		}
		return res;
	};
	this.write_command = function(d) {
		if (-1 !== this.command) {
			/* if a command is pending, process the second half */
			var tmp = d>>4;
			/* the manual explicitly says that it's not possible to start multiple voices at the same time */
			if (0!==tmp&&1!==tmp&&2!==tmp&&4!==tmp&&8!==tmp) throw "OKI6295 start "+(tmp.toString(16))+" contact MAMEDEV";
			var st, en, base;
			/* determine which voice(s) (voice is set by a 1 bit in the upper 4 bits of the second byte) */
			for (var i=0, l=this.voice.length; i<l; ++i, tmp >>= 1) {
				if (tmp&1) {
					/* determine the start/stop positions */
					base = this.command<<3;
					st = this.raw_read(base+0)<<16;
					st |= this.raw_read(base+1)<<8;
					st |= this.raw_read(base+2)<<0;
					st &= 0x3ffff;
					en = this.raw_read(base+3)<<16;
					en |= this.raw_read(base+4)<<8;
					en |= this.raw_read(base+5)<<0;
					en &= 0x3ffff;
					/* set up the voice to play this sample */
					if (st<en) {
						if (!this.voice[i].playing) {	/* fixes Got-cha and Steel Force */
							this.voice[i].playing = 1;
							this.voice[i].base_offset = st;
							this.voice[i].sample = 0;
							this.voice[i].count = (en-st+1)<<1;
							/* also reset the ADPCM parameters */
							this.voice[i].adpcm.reset();
							this.voice[i].volume = volume_table[d&0x0f];
						}
						else {
							//
						}
					}
					else {
						/* invalid samples go here */
						console.log("OKIM6295: Voice "+i+"  requested to play invalid sample",this.command.toString(16),st,en);
						this.voice[i].playing = 0;
					}
				}
			}
			/* reset the command */
			this.command = -1;
		}
		else if (!!(d&0x80)) {
			/* if this is the start of a command, remember the sample number for next time */
			this.command = d&0x7f;
		}
		else {
			/* otherwise, see if this is a silence command */
			var tmp = d>>3;
			/* determine which voice(s) (voice is set by a 1 bit in bits 3-6 of the command */
			for (var i=0, l=this.voice.length; i<l; ++i, tmp >>= 1) {
				if (tmp&1) this.voice[i].playing = 0;
			}
		}
	};
}

const MAX_CHIPS = 0x02;
var _data = [];
(function(n){
	for (var i=0; i<n; ++i) _data[i] = new okim_state();
})(MAX_CHIPS);

function compute_tables() {
	/* nibble to bit map */
	var nbl2bit = [
		[1, 0, 0, 0], [ 1, 0, 0, 1], [ 1, 0, 1, 0], [ 1, 0, 1, 1],
		[1, 1, 0, 0], [ 1, 1, 0, 1], [ 1, 1, 1, 0], [ 1, 1, 1, 1],
		[-1, 0, 0, 0], [-1, 0, 0, 1], [-1, 0, 1, 0], [-1, 0, 1, 1],
		[-1, 1, 0, 0], [-1, 1, 0, 1], [-1, 1, 1, 0], [-1, 1, 1, 1]
	];
	var step, nib;
	var stepval, div = 11.0/10.0;
	/* loop over all possible steps */
	for (step=0; step <= 48; ++step) {
		/* compute the step value */
		stepval = (16.0*Math.pow(div, step*1.0))|0;
		/* loop over all nibbles and compute the difference */
		for (nib=0; nib<16; ++nib) {
			diff_lookup[nib+(step<<4)] = nbl2bit[nib][0] * (
				(stepval>>0) * nbl2bit[nib][1] +
				(stepval>>1) * nbl2bit[nib][2] +
				(stepval>>2) * nbl2bit[nib][3] +
				(stepval>>3)
			);
		}
	}
	//console.log("TBL",diff_lookup);
	tables_computed = 1;
}


O.prototype.init = function(cl, sr) {
	this.chip = _data;
	var div;
	compute_tables();
	this.chip.forEach(function(x,i,a){
		x.command = -1;
		x.bank_offs = 0;
		x.nmk_mode = 0x00;
		x.nmk_bank = new Uint8Array(4); for (var i=0; i<4; ++i) x.nmk_bank[i] = 0x00;
		x.initial_clock = cl;
		x.master_clock = cl&0x7FFFFFFF;
		x.pin7_state = (cl&0x80000000)>>31;
		//x.smpratefunc = null;
		div = !!x.pin7_state ? 132 : 165;
		x.scale = x.master_clock/div;
		x.sample_rate = sr;
	});
	this.sampleRate = sr;
	console.log("M6295::init","cl",this.chip[0].master_clock,"sc",this.chip[0].scale);
	return this.chip[0].scale;
};
O.prototype.reset = function() {
	this.chip.forEach(function(x,i,a){
		var v, l;
		x.command = -1;
		x.bank_offs = 0;
		x.nmk_mode = 0x00;
		for (var i=0; i<4; ++i) x.nmk_bank[i] = 0x00;
		x.master_clock = x.initial_clock&0x7FFFFFFF;
		x.pin7_state = (x.initial_clock&0x80000000)>>31;
		for (v=0, l=x.voice.length; v<l; ++v) {
			x.voice[v].volume = 0;
			x.voice[v].adpcm.reset();
			x.voice[v].playing = 0;
		}
	});
};
function _interpolateLinear(b, i) {
	var n = i|0, q = i-n;
	var r = b[n]*(1.0-q);
	if (++n<b.length) r = (r+b[n]*q);
	return r;
}
O.prototype.update = function(buf, len, z) {
	//// TODO: CHANGE THIS TO BE SIMILAR TO THE OTHER CHIP UPDATES
	var _sc = 1.0/this.attenuation;
	var _v = this.volume/100.0;
	this.chip.forEach(function(x,i,a){
		var rem, s, q;
		for (var i=0, l=x.voice.length; i<l; ++i) {
			if (!x.voice[i].muted) {
				rem = len|0;
				var n = z|0;
				/* loop while we have samples remaining */
				while (rem>0) {
					s = rem>MAX_SAMPLE_CHUNK?MAX_SAMPLE_CHUNK:rem;
					var out = x.generate_adpcm(i, s);
					for (q=0; q<s; ++q) {
						buf[n++] += out[q];
						buf[n++] += out[q];	// stereo
					}
					rem -= s;
				}
			}
		}
	});
};
function _zeroed_16(q) {
	var ret = new Int16Array(q);
	for (var i=0; i<q; ++i) ret[q] = 0;
	return ret;
}

O.prototype.mixStereo = function(buf, len, z) {
	var _sc = 1.0/this.attenuation;
	var _v = this.volume/100.0;
	this.chip.forEach(function(x,i,a){
		var rem, s, q;
		var sr_sc = x.scale/x.sample_rate; sr_sc = 1.0;	//// TODO: FIX THIS SOMEHOW!
		var gen = 1.0/sr_sc;
		var lengen = (len*gen)|0;
		//console.log("MIX::SCALE",sr_sc);
		var outs = [];
		for (var i=0, l=x.voice.length; i<l; ++i) {
			var tmp = x.generate_adpcm(i, (len)|0);
			//if (!x.voice[i].muted) {
				outs[i] = tmp;
				//rem = len|0;
				//var n = z|0;
				/* loop while we have samples remaining */
				//while (rem>0) {
				//	s = rem>MAX_SAMPLE_CHUNK?MAX_SAMPLE_CHUNK:rem;
				//	var out = x.generate_adpcm(i, s);
				//	for (q=0; q<s; ++q) {
				//		buf[n++] += out[q]*_sc*_v;
				//		buf[n++] += out[q]*_sc*_v;	// stereo
						//buf[n++] += out[q]*_sc*_v;
						//buf[n++] += out[q]*_sc*_v;	// stereo
				//	}
				//	rem -= s;
				//}
			//}
			//else outs[i] = _zeroed_16(len);
		}
		var n = z|0;
		var sc_i = 0;
		for (q=0; q<len; ++q) {
			var o = 0;
			for (i=0, l=x.voice.length; i<l; ++i) {
				if (!x.voice[i].muted) {
					var tmp = _interpolateLinear(outs[i], sc_i);
					o += tmp;
				}
			}
			buf[n++] += o*_sc*_v;
			buf[n++] += o*_sc*_v;	// stereo
			sc_i += sr_sc;
		}
	});
	return buf;
};

function _onsampleratechange(x, sr) {
	if (x.sample_rate!==sr) {
		x.sample_rate = sr;
		x.smp_p = 1;
		x.smp_next -= x.smp_last;
		x.smp_last = 0x00;
	}
}

O.prototype.write = function(off, d, n) {
	n = n||0;
	switch (off) {
		case 0x00:
			this.chip[n].write_command(d);
			break;
		case 0x08:
			//this.chip[n].master_clock &= ~0x000000FF;
			this.chip[n].master_clock &= 0xFFFFFF00;
			this.chip[n].master_clock |= d<<0;
			break;
		case 0x09:
			//this.chip[n].master_clock &= ~0x0000FF00;
			this.chip[n].master_clock &= 0xFFFF00FF;
			this.chip[n].master_clock |= d<<8;
			break;
		case 0x0A:
			//this.chip[n].master_clock &= ~0x00FF0000;
			this.chip[0].master_clock &= 0xFF00FFFF;
			this.chip[0].master_clock |= d<<16;
			break;
		case 0x0B:
			d &= 0x7f;
			//this.chip[n].master_clock &= ~0xFF000000;
			this.chip[n].master_clock &= 0x00FFFFFF;
			this.chip[n].master_clock |= d<<24;
			this.onsampleratechange(_onsampleratechange, n);
			break;
		case 0x0C:
			this.chip[n].set_pin7(d, _onsampleratechange, n);
			break;
		case 0x0E:	// NMK112 bank switch enable
			this.chip[n].nmk_mode = d;
			break;
		case 0x0F:
			this.chip[n].set_bank_base(d<<18);
			break;
		case 0x10:
		case 0x11:
		case 0x12:
		case 0x13:
			this.chip[n].nmk_bank[off&0x03] = d;
			break;
		default: break;
	}
};
O.prototype.writeROM = function(sz, st, len, d, c) {
	c = c||0;
	if (this.chip[c].romsize!==sz) {
		this.chip[c].rom.length = sz;
		this.chip[c].romsize = sz;
		for (var i=0; i<sz; ++i) this.chip[c].rom[i] = 0xff;
	}
	if (st>sz) {}
	else {
		var n = len|0;
		if (st+n>sz) n = sz-st;
		//// TODO: memcpy d.slice(0, n) to this.chip[c].rom[st]
		// simplest method
		for (var i=0; i<n; ++i) {
			this.chip[c].rom[st+i] = d[i];
		}
		// do this if you get it to work instead
		//this.chip[c].rom = this.chip[c].rom.splice(st, n, d.slice(0,n));
	}
};
O.prototype.toggle = function(ch,m, c) {
	c = c||0;
	if (ch<OKIM6295_VOICES) this.chip[c].voice[ch].muted = !m;
};

O.prototype.onsampleratechange = function(f, n) {
	n = n||0;
	var div = this.chip[n].pin7_state?132:165;
	if ("function"===typeof f)
		f(this.chip[n], this.chip[n].master_clock/div);
};

})(OKIM6295);


module.exports = {
	get label(){return "OKIM6295"},
	get channels(){return ["Ch 1","Ch 2","Ch 3","Ch 4"];},
	"create":function(pcl, sr, num){
		var ret = new OKIM6295();
		var dcl = ret.init(pcl, sr, num);
		//ret.reset();
		return ret;
	}
};
})();