'use strict;'

class ColumnResizeCapture {
  constructor(header, key, initialX) {
    this.header = header;
    this.key = key;
    this.initialWidth = this.header.width(key);
    this.initialX = initialX;
  }

  onMove(x) {
    const delta = x - this.initialX;
    const width = Math.max(10, this.initialWidth + delta);
    this.header.updateWidth(this.key, width);
  }

  onEnd(x) {
    this.onMove(x);
  }

  onAbort() {
    this.header.updateWidth(this.key, this.initialWidth);
  }
}

module.exports = ColumnResizeCapture;
