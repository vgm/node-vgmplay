(function(){
'use strict';

function QSound() {
	if (!this instanceof QSound) return new QSound();
	this.version = 0x100;
	this.attenuation = 32768;
	this.volume = 100;
	this.chip = null;
}

(function(Q){
"use strict";

/**** CONFIG ****/
var cfg = {
	debug:0,	// for logging
	strict:0	// abort on bad input if true
};

var _QS = {
	"div":166,
	"channels":16,
	"pan":(function(l){var r = new Array(l), s = 256/Math.sqrt(32.0), i = l; while (--i>0) r[i] = (s*Math.sqrt(i))|0; r[0]=0; return r;})(33)
};

function QSoundChannel() {
	this.bank = 0;
	this.address = 0;
	this.loop = 0;
	this.end = 0;
	this.freq = 0;
	this.vol = 0;

	this.enabled = 0;
	this.lvol = 0;
	this.rvol = 0;
	this.step = 0;
	this.muted = 0;

	this.reset = function() {
		this.bank = 0;
		this.address = 0;
		this.loop = 0;
		this.end = 0;
		this.freq = 0;
		this.vol = 0;
		this.enabled = 0;
		this.lvol = 0;
		this.rvol = 0;
		this.step = 0;
		this.muted = 0;
	};
}

function QS(c,r) {
	this.channels = (function(l){
		var r = [], i = l;
		while (--i>-1) r.push(new QSoundChannel());
		return r;
	})(_QS.channels);
	this.rom = {
		"data":null,
		"interpolateLinear":function(bk,addr,sc){
			var r = 0, of1, of2, a1, a2, s1, s2;
			a1 = addr&0xffff; a2 = (a1+1)&0xffff;
			s2 = addr-(addr|0); s1 = 1.0-s2;
			of1 = (bk|a1)%this.length;
			of2 = (bk|a2)%this.length;
			r = (this.data[of1]*s1+this.data[of2]*s2);
			return r;
		},
		"length":0
	};
	this.latch = 0;
	this.clock = c||3579545;	/* master clock  (Hz) */
	this.rate = r||44100;	/* output sampling rate (Hz)  */
	this.sampleRate = this.clock/_QS.div;
	this.scale = this.sampleRate/this.rate;
	console.log("QSound::init",this.clock,this.rate,this.sampleRate,this.scale);
	function _reset_ch(){
		if (this.channels) {
			var i = this.channels.length; while (--i>-1) this.channels[i].reset();
		}
	}	//// !!!!
	this.init = function(clk,rate) {
		this.clock = clk||3579545;	/* master clock  (Hz) */
		this.rate = rate||44100;	/* output sampling rate (Hz)  */
		this.sampleRate = this.clock/_QS.div;
		this.scale = this.sampleRate/this.rate;
		console.log("QSound::init",this.clock,this.rate,this.sampleRate,this.scale);
		_reset_ch();//var i = this.channels.length; while (--i>-1) this.channels[i].reset();
	};
	this.reset = function() {
		var i; _reset_ch();//i = this.channels.length; while (--i>-1) this.channels[i].reset();	//// !!!!
		i = 0x80; while (--i>-1) this.write(i,0);
		i = 0x7f; while (++i<0x90) this.write(i,0x120);
	}
	//var i = this.channels.length; while (--i>-1) this.channels[i].reset();
}

Q.prototype.init = function(c,r) {
	//console.log("QSound init");
	if (!this.chip) this.chip = new QS(c,r);
	else this.chip.init(c,r);
};
Q.prototype.reset = function() {
	if (this.chip) this.chip.reset();	//// !!!!
};
Q.prototype.update = function(len) {
	var buf = [[],[]];
	if (!this.chip.rom.data||!this.chip.rom.length) return buf;
	var outl, outr, smp;
	function _upd_ch(ch,rom) {
		var r = 0, adv, off;
		if (ch.enabled) {
			adv = ch.step>>12;
			ch.step = (ch.step&0xfff)+ch.freq;
			if (adv) {
				ch.address += adv;
				if (ch.freq&&ch.address>=ch.end) {
					if (ch.loop) {	// Reached the end, restart the loop
						ch.address -= ch.loop;
						if (ch.address>=ch.end) ch.address = ch.end-ch.loop;
						ch.address &= 0xffff;
					}
					else {	// Reached the end of a non-looped sample
						--ch.address;
						ch.step += 0x1000;
						return r;
					}
				}
			}
			off = (ch.bank|ch.address)%rom.length;
			r = rom.data[off];
		}
		return r;
	}
	var c, i = -1; while (++i<len) {
		outl = 0, outr = 0;
		c = -1; while (++c<_QS.channels) {
			s = _upd_ch(this.chip.channels[c],this.chip.rom)*this.chip.channels[c].vol;
			if (!this.chip.channels[c].muted) {
				outl += (smp*this.chip.channels[c].lvol)>>14,
				outr += (smp*this.chip.channels[c].rvol)>>14;
			}
		}
		buf[0][i] = outl;
		buf[1][i] = outr;
	}
	return buf;
};
/** interleaved stereo mix +neo **/
Q.prototype.mixStereo = function(buf, len, z) {
	if (!this.chip.rom.data||!this.chip.rom.length) return buf;
	var n = z|0, _sc = 1.0/this.attenuation;
	var _v = this.volume/100.0;
	var outl, outr, smp;
	function _upd_ch(ch,rom,sc) {	//// TODO: FIX THIS SOMEHOW!
		var r = 0, adv;
		if (ch.enabled) {
			adv = (ch.step>>12);
			ch.step = (ch.step&0xfff)+ch.freq;
			if (adv) {
				ch.address += adv*sc;
				if (ch.freq&&(ch.address>=ch.end)) {
					if (ch.loop) {	// Reached the end, restart the loop
						ch.address -= ch.loop;
						if (ch.address>=ch.end) ch.address = ch.end-ch.loop;
						//ch.address &= 0xffff;
					}
					else {	// Reached the end of a non-looped sample
						--ch.address;
						ch.step += 0x1000;
						return r;
					}
				}
			}
			//a1 = ch.address&0xffff; a2 = (a1+1);
			//s2 = ch.address-(ch.address|0); s1 = 1.0-s2;
			//of1 = (ch.bank|a1)%rom.length;
			//of2 = (ch.bank|a2)%rom.length;
			r = rom.interpolateLinear(ch.bank,ch.address,sc);//rom.data[of1]*s1+rom.data[of2]*s2;
		}
		return r;
	}
	//var _dbg_ar = [];
	var c, i = -1; while (++i<len) {
		outl = 0, outr = 0;
		c = -1; while (++c<_QS.channels) {
			smp = _upd_ch(this.chip.channels[c],this.chip.rom,this.chip.scale)*this.chip.channels[c].vol;
			if (!this.chip.channels[c].muted) {
				outl += ((smp*this.chip.channels[c].lvol)>>14),
				outr += ((smp*this.chip.channels[c].rvol)>>14);
			}
		}
		//_dbg_ar[_dbg_ar.length] = outl;
		buf[n++] += outl*_sc*_v;
		buf[n++] += outr*_sc*_v;
	}
	//console.log(_dbg_ar);
	return buf;
};

Q.prototype.write = function(a,d) {
	var ch, reg;
	if (a<0x80) ch = a>>3, reg = a&0x07;
	else if (a<0x90) ch = a&0x0f, reg = 8;
	else if (a>=0xba&&a<0xca) ch = a-0xba, reg = 9;
	else ch = 0, reg = 99;
	switch (reg) {
		case 0:	// bank, high bits unknown
			ch = (ch+1)&0x0f;
			this.chip.channels[ch].bank = (d&0x7f)<<16;
			break;
		case 1:	// start/current address
			this.chip.channels[ch].address = d&0xffff;
			break;
		case 2:	// frequency
			this.chip.channels[ch].freq = d&0xffff;
			// TODO: chan off if 0, anticlick
			break;
		case 3:	// enable
			this.chip.channels[ch].enabled = (d&0x8000)>>15;
			this.chip.channels[ch].step = 0;
			break;
		case 4:	// loop address
			this.chip.channels[ch].loop = d;
			break;
		case 5:	// end address
			this.chip.channels[ch].end = d;
			break;
		case 6:	// master volume
			this.chip.channels[ch].vol = d;
			break;
		case 7:	// unused reg
			if (cfg.strict) throw new Error("QSound::write - unused reg 0x7");
			break;
		case 8:	// panning
			var pan = (d&0x3f)-0x10;
			if (pan>0x20) pan = 0x20;
			else if (pan<0) pan = 0;
			this.chip.channels[ch].rvol = _QS.pan[pan];
			this.chip.channels[ch].lvol = _QS.pan[0x20-pan];
			break;
		case 9:	// unknown reg, ADSR?
			if (cfg.strict) throw new Error("QSound::write - unknown reg 0x9");
			break;
		default:	// unsupported reg
			if (cfg.strict) throw new Error("QSound::write - unsupported reg "+reg);
			break;
	}
};
Q.prototype.read = function(offset) {return 0x80};

Q.prototype.set = function(z, st, len, d) {
	if (this.chip.rom.length!==z) {
		if (!this.chip.rom.data) this.chip.rom.data = new Array(z);
		else {this.chip.rom.data.length = 0; this.chip.rom.data.length = z;}
		this.chip.rom.length = z;
		var i = z; while (--i>-1) this.chip.rom.data[i] = 0xff;
	}
	if (st<=z) {
		var q = 0;
		if (st+len>z) len = z-st;
		i = st; while (q<len) this.chip.rom.data[i++] = d[q++];	// TODO: replace with proper substring replace
		//console.log("QSound::setROM","size",z,"start",st,"length",len);
	}
};

/* Toggle channel muting +neo */
Q.prototype.toggle = function(ch,m) {
	if (ch<_QS.channels) this.chip.channels[ch].muted = !m;
}

})(QSound);


module.exports = {
	get label(){return "QSound"},
	get channels(){return [
		"Ch 1","Ch 2","Ch 3","Ch 4","Ch 5","Ch 6","Ch 7","Ch 8",
		"Ch 9","Ch10","Ch11","Ch12","Ch13","Ch14","Ch15","Ch16"
	];},
	"data":{index:-1, pointer:-1, current:128},
	"create":function(pcl, sr, num){
		var ret = new QSound();
		ret.init(pcl, sr);
		//ret.toggle(1,0); ret.toggle(2,0); ret.toggle(3,0); ret.toggle(4,0); ret.toggle(5,0); ret.toggle(6,0); ret.toggle(7,0);
		//ret.toggle(8,0); ret.toggle(9,0); ret.toggle(10,0); ret.toggle(11,0); ret.toggle(12,0); ret.toggle(13,0); ret.toggle(14,0); ret.toggle(15,0);
		//ret.config(9);
		//ret.reset();	//// !!!!
		//ret.write(0x28,0x00);
		return ret;
	}
};
})();
