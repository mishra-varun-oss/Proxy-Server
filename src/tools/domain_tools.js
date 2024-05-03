const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const db = require(path.join(__dirname, "./db.js"));
const utils = require(path.join(__dirname, "./utils.js"));

const get_host_name = (domain_id) => {
	return new Promise((resolve, reject) => {
		let q = `SELECT * FROM domains WHERE id = '${domain_id}'`;
		db.query(q, (err, results) => {
			if (err) {
				reject(err);
			} else {
				if (results.length > 0) {
					resolve(results[0]);	
				} else {
					reject({ success: false })
				}
			}
		})
	})
}

const get_servers = (domain_id) => {
	return new Promise((resolve, reject) => {
		let q = `SELECT * FROM servers WHERE domain_id = '${domain_id}'`;
		db.query(q, (err, results) => {
			if (err) { 
				reject(err);
			} else {
				resolve(results);
			}
		})
	})
}

const get_user_domains = (username) => {
	return new Promise((resolve, reject) => {
		let q = `SELECT * FROM users WHERE username = '${username}'`;
		db.query(q, (err, results) => {
			if (err) {
				reject(err);
			} else {
				let domain_ids = results[0].domain_ids.split(',');
				let user_domains = [];
				if (domain_ids.length > 0) {
					for (let i = 0; i < domain_ids.length; i++) {
						get_host_name(domain_ids[i])
						.then((data) => {
							user_domains.push(data);
							if (i + 1 == domain_ids.length) {
								resolve(user_domains);
							}
						})
						.catch((error) => {
							console.log(error);
						})
					}
				}
			}
		})
	})
}

const domain_register = (user, domain) => {
	return new Promise((resolve, reject) => {
		let { username, user_id } = user;
		let domain_id = utils.generate_id();
		let q = `INSERT INTO domains VALUES (?, ?)`;
		db.query(q, [domain_id, domain], (err, results) => {
			if (err) {
				reject(err);
			} else {
				let q = `SELECT * FROM users WHERE id = ?`;
				db.query(q, user_id, (err, results) => {
					if (err) {
						reject(err);
					} else {
						if (results.length > 0) {
							let current_user_domains = results[0].domain_ids;
							let q;
							if (current_user_domains == '') {
								q = `UPDATE users SET domain_ids = '${domain_id}' where id = ${user_id}`;
							} else {
								let domains_id_list = current_user_domains.split(',');
								domains_id_list.push(domain_id);
								q = `UPDATE users SET domain_ids = '${domains_id_list.join(',')}' where id = ${user_id}`;
							}
							db.query(q, (err, results) => {
								if (err) {
									reject(err);
								} else {
									resolve({ 
										success: true, 
										domain_id: domain_id, 
										user_id: user_id 
									})
								}
							})
						} else {
							reject()
						}
					}
				})
			}		
		})
	})
}

const server_db_entry = (servers, domain_id) => {
	return new Promise((resolve, reject) => {
		for (let i = 0; i < servers.length; i++) {
			let q = `INSERT INTO servers VALUES (default, ?, ?, ?)`;
			let server = servers[i];
			db.query(q, [domain_id, server['ip_address'], server['port']], (err, results) => {
				if (err) {
					reject(err);
				} else {
					if (i + 1 == servers.length) {
						resolve({ success: true, id: domain_id })
					}
				}
			})
		}
	})
}

const get_hostname = (domain_id) => {
	return new Promise((resolve, reject) => {
		let q = `SELECT * FROM domains WHERE id = '${domain_id}'`;
		db.query(q, (err, results) => {
			if (err) throw err;
			resolve(results[0].hostname);
		})
	})
}

const create_upstream_servers = (servers, domain_id) => {
	return new Promise((resolve, reject) => {
		get_hostname(domain_id)
		.then((hostname) => {
			let upstream_server_config = `/etc/nginx/conf.d/${hostname.split('.')[0]}_servers.conf`;
			fs.access(upstream_server_config, fs.constants.F_OK, (err) => {
				if (err) {
					const upstream_server_text = create_upstream_server_text(servers, hostname);
					fs.writeFile(upstream_server_config, upstream_server_text, (err) => {
						if (err) {
							reject();
						} else {
							resolve({ success: true })
						}
					})
				} else {
					reject();
				}
			})
		})
	})
}

const create_upstream_server_text = (servers, hostname) => {
	let domain = hostname.split('.')[0];
	let config = `upstream ${domain}_servers {\n`;
	for (let i = 0; i < servers.length; i++) {
		let server = `server ${servers[i].ip_address}:${servers[i].port};\n`;
		config += server;
		if (i + 1 == servers.length) {
			config += '}';
			return config;
		}
	}
}

const create_site_config = (hostname) => {
	return new Promise((resolve, reject) => {
		let h = hostname;
		let d = h.split('.')[0];
		let config = `
			server {
				listen 80;
				listen [::]:80;
			    server_name ${h} www.${h};

			    access_log /var/log/nginx/${d}.access.log request_info;

			    location / {
				proxy_pass http://${d}_servers;
				proxy_http_version 1.1;
				proxy_set_header Upgrade $http_upgrade;
				proxy_set_header Connection 'upgrade';
				proxy_set_header Host $host;
				proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
				proxy_set_header X-Real-IP $remote_addr;
				proxy_set_header X-Forwarded-Proto $scheme;
				proxy_cache_bypass $http_upgrade;
			    }
			}
		`;

		let config_file = `/etc/nginx/sites-available/${h}`;
		fs.access(config_file, fs.constants.F_OK, (err) => {
			if (err) {
				fs.writeFile(config_file, config, (err) => {
					if (err) {
						reject(err);
					} else {
						let enabled_path = `/etc/nginx/sites-enabled/${h}`;
						fs.symlink(config_file, enabled_path, 'file', (err) => {
							if (err) {
								reject(err);
							} else {
								resolve();
							}
						})
					}
				})
			} else {
				reject(err);
			}
		})
	})

}

const restart_nginx = () => {
	return new Promise((resolve, reject) => {
		exec('systemctl restart nginx.service', (error, stdout, stderr) => {
			if (error) {
				reject(error);
			}
			if (stderr) {
				reject(stderr);
			}
			console.log(stdout);
			resolve()
		})
	})
}

const parse_logs = (id, d) => {
	return new Promise((resolve, reject) => {
		let log_path = `/var/log/nginx/${d}.access.log`;
		read_logs(log_path)
		.then((log_data) => {
			let logs = log_data.split('\n');
			if (logs.length > 1) {
				for (let i = 0; i < logs.length; i++) {
					let log = logs[i];
					let log_contents = log.split('|');
					if (log_contents.length > 1) {
						let q = `INSERT INTO logs VALUES (default, '${id}', ?, ?, ?, ?, ?)`;
						db.query(q, log.split('|'), (err, results) => {
							if (err) {
								reject(err);
							} else {
								if (i + 1 + 1 == logs.length) {
									clear_file(log_path)
									.then(() => {
										resolve()
									})
									.catch((error) => {
										console.log(error);
									})
								}
							}
						})
					}
				}
			} else {
				resolve()
			}
		})
		.catch((error) => {
			reject(error);
		})
	})
}

const read_logs = (log_path) => {
	return new Promise((resolve, reject) => {
		fs.readFile(log_path, 'utf8', (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		})
	})
}

const clear_file = (file_path) => {
	return new Promise((resolve, reject) => {
		fs.writeFile(file_path, '', (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		})
	})
}

const get_database_records = (id) => {
	return new Promise((resolve, reject) => {
		let q = `SELECT * FROM logs WHERE domain_id = '${id}'`;
		db.query(q, (err, results) => {
			if (err) {
				reject(err);
			} else {
				resolve(results);
			}
		})
	})
}

module.exports = { 
	domain_register, 
	server_db_entry,
	create_upstream_servers,
	get_user_domains,
	create_site_config,
	restart_nginx,
	get_hostname,
	parse_logs,
	get_database_records,
	get_servers
}
