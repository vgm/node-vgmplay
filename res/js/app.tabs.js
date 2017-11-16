//// attach basic tab functionality
document.addEventListener('DOMContentLoaded', function () {
	//// TODO: SET ONTABCLICK
	function switchToPane(el) {
		var pe = el.parentElement;
		pe.dataset["tabActive"] = el.id;
	}
	function _switchToPane(el) {
		for (var pi=0, pl=el.parentElement.children.length; pi<pl; ++pi) {
			var pe = el.parentElement.children[pi];
			pe.classList.remove("active");
			//console.log(pe);
		}
		el.classList.add("active");
	}
	function switchToTab(tabs, el) {
		var _tab_active = Array.prototype.filter.call(tabs, function(e){return e.classList.contains('active');}); //document.querySelectorAll(sel+'.active');
		if (_tab_active) {
			//console.log(typeof _tab_active, _tab_active);
			_tab_active.forEach(function(e,i,a){
				e.classList.remove('active');
			})
			//console.log('still active',_tab_active);
		}
		el.classList.add('active');
	}
	function clickTab(sel){
		var _tabs = document.querySelectorAll(sel);
		if (_tabs) {
			_tabs.forEach(function(te, ti, ta){
				te.addEventListener('click', function(e){
					var _pid = this.attributes.getNamedItem("for").value;
					var _pane = document.getElementById(_pid);
					if (_pane && !this.getAttribute('disabled')) {
						switchToPane(_pane);
						//console.log('tabbed to',_pid);
						switchToTab(_tabs, this);
					}
					else console.log('tab does not exist',_pid);
					//console.log(i,_pid,e.attributes);
				});
			});
		}
	}
	clickTab(".tab-group .tab-item[for]");
	clickTab("#settings-tabs .btn[for]");
});

ipc.on('tab-change', (evt, v) => {
	var _tab = document.querySelector("#nav-tabs .tab-item[for="+v+"]");
	if (_tab) _tab.dispatchEvent(new MouseEvent('click'));
});
