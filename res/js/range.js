HTMLInputElement.prototype.sliderVisualCalc = function() {
  if (this.min === "") {
    this.min = 0;
  }
  if (this.max === "") {
    this.max = 100;
  }
  this.style.backgroundSize = ((100 * ((this.value - this.min) / (this.max - this.min)))|0) + "% 100%";
  if (this.classList.contains("slider-vertical")) {
    this.style.marginBottom = this.offsetWidth + "px";
  }
}
window.addEventListener("load", function(event) {
  var sliders = document.getElementsByClassName("slider");
  for (var i = 0; i < sliders.length; i++) {
    sliders[i].sliderVisualCalc();
  }
}, false);
window.addEventListener("input", function(event) {
  if (event.target.type === "range") {
    event.target.sliderVisualCalc();
  }
}, false);
//console.log(HTMLInputElement.prototype);
