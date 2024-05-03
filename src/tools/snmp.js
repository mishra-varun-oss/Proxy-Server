const path = require('path');
const snmp = require('net-snmp');

const { get_servers } = require(path.join(__dirname, "./domain_tools.js"));

const test_OID = '1.3.6.1.2.1.1.1.0';

const send_snmp_request = (server) => {
	return new Promise((resolve, reject) => {
		const session = snmp.createSession('172.31.81.61', 'public');
		console.log('starting!');
		const start_time = process.hrtime();
		session.get({ oid: test_OID }, (error, varbinds) => {
			session.close();
			console.log('helloo!!!');
			if (error) {
				reject(error);
			} else {
				const end_time = process.hrtime(start_time);
				const response_time = end_time[0] * 1000 + end_time[1] / 1000000; //milliseconds
				resolve(response_time);
			}
		})
	})
}	

const test_servers = (domain_id) => {
	return new Promise((resolve, reject) => {
		let response_times = [];
		get_servers(domain_id)
		.then((servers) => {
			for (let i = 0; i < servers.length; i++) {
				console.log('testing', servers[i]);
				send_snmp_request(servers[i])
				.then((response_time) => {
					response_times.push({ server: servers[i].ip, response_time })
					if (i + 1 == servers.length) {
						resolve(response_times);
					}
				})
				.catch((error) => {
					console.log(error);
				})
			}
		})
	})
}

test_servers('0HKpeao')
.then((response_times) => {
	console.log(response_times);
})
