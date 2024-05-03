const path = require('path');
const express = require('express');

const router = express.Router();

const accounts = require(path.join(__dirname, "../tools/account_tools.js"));
const domains = require(path.join(__dirname, "../tools/domain_tools.js"));

router.use('/*', (req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});

router.post('/user', (req, res) => {
	let { username, password } = req.body;
	accounts.register(username, password)
	.then((data) => {
		if (data.success) {
			res.send({ success: true, username: data.username, id: data.id })
		} else {
			res.send({ success: false })
		}
	})
	.catch((err) => {
		res.send({ success: false })
	})

})

router.post('/user/returning', (req, res) => {
	let { username, password } = req.body;
	accounts.login(username, password)
	.then((data) => {
		if (data.success) {
			res.send({ success: true, username: data.results.username, id: data.results.id })
		} else {
			res.send({ success: false })
		}
	})
	.catch((err) => {
		res.send({ success: false })
	})
})

router.post('/domain', (req, res) => {
	let { domain, servers } = req.body;

	domains.domain_register(req.body.user, domain)
	.then((data) => {
		if (data.success) {
			let domain_id = data.domain_id;
			domains.server_db_entry(servers, domain_id)
			.then((server_data) => {
				if (server_data.success) {
					domains.create_site_config(domain)
					.then(() => { domains.create_upstream_servers(servers, domain_id) })
					.then(() => { domains.restart_nginx() })
					.then(() => {
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
						res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
						res.send({ success: true });
					})
					.catch((err) => {
						console.log(err);
						res.send({ success: false, err: err })
					})
				}
			})
		}
	})
	.catch((err) => {
		console.log(err);
		res.send({ success: false })
	})
})

module.exports = router;
