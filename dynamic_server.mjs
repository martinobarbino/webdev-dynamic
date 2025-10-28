import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';
import { default as getCountryISO2 } from 'country-to-iso';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8080;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

let app = express();
app.use(express.static(root));

const db = new sqlite3.Database('./db.sqlite3', sqlite3.OPEN_READONLY, (err) => {
        if (err)
            console. log( 'Error connecting to database');
        else 
            console. log('Successfully connected to database');
        
});

app.get('/', (req, res) => {
    fs.readFile(path.join(template, 'list-pages.html'), 'utf-8', (err, data) => {
        if (err) {
            res.status(500).type('txt').send('File Error');
        } else {
            const routes = '<li><a href="/fuel-types">Fuel Types</a></li>' +
                                 '<li><a href="/countries">Countries</a></li>' +
                                 '<li><a href="/power-capacities">Power Capacities</a></li>';
            let page = data.replace('%%title%%', 'Powerplant Data');
            page = data.replace('%%title%%', 'Powerplant Data');
            page = page.replace('%%list%%', routes);
            res.status(200).type('html').send(page);
        }
    });
}); 

app.get('/countries/:country', (req, res) => {
    const countrySlug = req.params.country;
    const countryName = countrySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    db.all('SELECT * FROM Powerplants WHERE country = ?', [countryName], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        } else {
            fs.readFile(path.join(template, 'energy-type.html'), 'utf-8', (err, data) => {
                if (err) {
                    res.status(500).type('txt').send('File Error');
                } else {
                    let powerplantList = '<table><tr><th>Name</th><th>Capacity (MW)</th><th>Primary Fuel</th></tr>';
                    for (const plant of rows) {
                        powerplantList += `<tr><td>${plant.name}</td><td>${plant.capacity_mw}</td><td>${plant.fuel1}</td></tr>`;
                    }
                    powerplantList += '</table>';
                    let page = data.replace(/%%country%%/g, countryName);
                    page = page.replace('%%powerplants%%', powerplantList);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
});

app.get('/countries', (req, res) => {
    db.all('SELECT DISTINCT country FROM Powerplants ORDER BY country', (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        } else {
            fs.readFile(path.join(template, 'list-pages.html'), 'utf-8', (err, data) => {
                if (err) {
                    res.status(500).type('txt').send('File Error');
                } else {
                    let countryList = '';
                    for (const country of rows) {
                        const countryName = country.country;
                        const slug = countryName.replace(/ /g, '-').toLowerCase();
                        countryList += `<li><a href="/countries/${slug}">${countryName}</a></li>\n`;
                    }
                    let page = data.replace(/%%title%%/g, 'Countries');
                    page = page.replace('%%list%%', countryList);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
}); 

app.get('/fuel-types', (req, res) => {
    db.all('SELECT DISTINCT fuel1 FROM Powerplants ORDER BY fuel1', (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        } else {
            fs.readFile(path.join(template, 'list-pages.html'), 'utf-8', (err, data) => {
                if (err) {
                    res.status(500).type('txt').send('File Error');
                } else {
                    let powerplantList = '';
                    for (const powerplant of rows) {
                        const powerplantType = powerplant.fuel1;
                        const slug = powerplantType.replace(/ /g, '-').toLowerCase();
                        powerplantList += `<li><a href="/fuel-types/${slug}">${powerplantType}</a></li>\n`;
                    }
                    let page = data.replace(/%%title%%/g, 'Fuel Types');
                    page = page.replace('%%list%%', powerplantList);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
}); 

app.get('/power-capacities', (req, res) => {
    fs.readFile(path.join(template, 'list-pages.html'), 'utf-8', (err, data) => {
        if (err) {
            res.status(500).type('txt').send('File Error');
        } else {
            const capacityLevels = '<li><a href="/power-capacities/low">Low</a></li>' +
                                 '<li><a href="/power-capacities/medium">Medium</a></li>' +
                                 '<li><a href="/power-capacities/high">High</a></li>';
            let page = data.replace(/%%title%%/g, 'Capacity Levels');
            page = page.replace('%%list%%', capacityLevels);
            res.status(200).type('html').send(page);
        }
    });
}); 

app.listen(port, () => {
    console.log('Now listening on port ' + port);
}); 
