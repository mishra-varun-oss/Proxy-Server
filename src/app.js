const path = require('path');
const express = require('express');
const body_parser = require('body-parser');
const session = require('express-session');
const prom_bundle = require('express-prom-bundle');

const app = express();
const port = 3000;

const public_directory = path.join(__dirname, "../public");
const views_directory  = path.join(__dirname, "../templates/views");

const login = require(path.join(__dirname, "./routes/login.js"));
const register = require(path.join(__dirname, "./routes/register.js"));
const domains = require(path.join(__dirname, "./routes/domains.js"));

const metrics_middleware = prom_bundle({ 
	includeMethod: true,
	includePath: true,
	promClient: {
		collectDefaultMetrics: {
			timeout: 1000
		}
	}
})

app.set('view engine', 'hbs');
app.set('views', views_directory);

app.use(session({
	secret: 'iron_strong_gateway',
	resave: false,
	saveUninitialized: false
}))
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));
app.use(metrics_middleware);

app.use('/login', login);
app.use('/domains', domains);
app.use('/register', register);
app.get('/', (req, res) => {
	res.render('index');
})
app.get('/metrics', (req, res) => {
	res.set('Content-Type', client.register.contentType);
	res.end(client.register.metrics());
})

app.listen(port, () => {
	console.log(`Server is running on port ${port}!`);
})
