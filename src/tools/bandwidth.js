const bandwidth = require('node-bandwidth');

const monitor = new bandwidth.BandwidthMonitor();

monitor.start();

setInterval(() => {
	console.log(monitor.getAllStats());
}, 5000);

