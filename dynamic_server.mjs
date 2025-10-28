import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

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
    res.redirect('/powerplants/united-states-of-america');
}); 

app.get('/powerplants/:country', (req, res) => {
    const countrySlug = req.params.country;
    const countryName = countrySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    db.all('SELECT * FROM Powerplants WHERE country_long = ?', [countryName], (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        } else {
            fs.readFile(path.join(template, 'energy-type.html'), 'utf-8', (err, data) => {
                if (err) {
                    res.status(500).type('txt').send('File Error');
                } else {
                    let powerplantList = '<table><tr><th>Name</th><th>Capacity (MW)</th><th>Primary Fuel</th></tr>';
                    for (const plant of rows) {
                        powerplantList += `<tr><td>${plant.name}</td><td>${plant.capacity_mw}</td><td>${plant.primary_fuel}</td></tr>`;
                    }
                    powerplantList += '</table>';
                    let page = data.replace('%%country%%', countryName);
                    page = page.replace('%%powerplants%%', powerplantList);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
}); 

app.listen(port, () => {
    console.log('Now listening on port ' + port);
}); 
