const mysql = require('mysql');

const connect = {
	host: '127.0.0.1',
	user: 'routeup',
	password: 'Router123',
	database: 'router'
}

const connection = mysql.createConnection(connect);

connection.connect((err) => {
	if (err) {
		console.error('Error connecting to MySQL database,', err);
		return;
	}
	console.log('Router connected to MySQL!');
})

module.exports = connection;
