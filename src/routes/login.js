const path = require('path');
const express = require('express');

const router = express.Router();

const accounts = require(path.join(__dirname, "../tools/account_tools.js"))

router.post('/', (req, res) => {
	let { username, password } = req.body;
	accounts.login(username, password)
	.then((data) => {
		if (data.success) {
			req.session.loggedin = true;
			req.session.username = username;
			res.redirect('/domains');
		}
	})
	.catch((err) => {
		res.send('Password or username incorrect.<br><br><a href="/">Back</a>');
	})
})

module.exports = router;
