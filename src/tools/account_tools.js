const path = require('path');

const db = require(path.join(__dirname, "./db.js"));

const login = (username, password) => {
	return new Promise((resolve, reject) => {
		let q = `SELECT * FROM users WHERE username = '${username}'`;
		db.query(q, (err, results) => {
			if (err) {
				reject({ success: false, message: err });
			} else {
				if (results.length > 0) {
					if (results[0].password == password) {
						resolve({ success: true, results: results[0] });
					} else {
						reject({ success: false });
					}
				} else {
					reject({ success: false });
				}
			}
		})
	})
}

const register = (username, password) => {
	return new Promise((resolve, reject) => {
		let q = `INSERT INTO users VALUES (default, ?, ?, '')`;
		db.query(q, [username, password], (err, results) => {
			if (err) {
				reject({ success: false, message: err })
			} else {
				resolve({ success: true, username: username, id: results.insertId })
			}
		})
	})
}

module.exports = { login, register }
