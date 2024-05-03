const path = require('path');
const express = require('express');

const router = express.Router();

const {	get_user_domains, 
	get_hostname,
	get_database_records,
	parse_logs,
	get_servers } = require(path.join(__dirname, "../tools/domain_tools.js"));

router.use('/*', (req, res, next) => {
	if (req.session.loggedin) {
		next();
	} else {
		res.redirect('/');
	}
})

router.get('/', (req, res) => {
	get_user_domains(req.session.username)
	.then((data) => {
		res.render('domains', {
			username: req.session.username,
			domain: data
		});
	})
	.catch((error) => {
		console.log(data);
	})
})

router.get('/:domain_id', (req, res) => {
	let id = req.params.domain_id;
	get_servers(id)
	.then((data) => {
		res.render('domain_details', {
			username: req.session.username, 
			server: data,
			domain_id: id
		})
	})
})

router.get('/traffic_log/:domain_id', (req, res) => {
	let id = req.params.domain_id;
	try {
		get_hostname(id)
		.then((hostname) => { 
			parse_logs(id, hostname.split('.')[0]) 
			.then(() => {
				get_database_records(id)
				.then((records) => {
					res.render('domain_traffic_log', {
						username: req.session.username,
						records: records,
						domain_id: id,
						hostname: hostname
					})
				})
			})
		})
	} catch(e) {
		console.log(e);
	}
})

module.exports = router;

