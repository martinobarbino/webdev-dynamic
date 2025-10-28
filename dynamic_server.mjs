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
    res.redirect('/powerplants/united-states-of-america');
}); 

app.get('/powerplants/united-states-of-america', (req, res) => {
    
});

app.get('/countries', (req, res) => {
    db.all('SELECT DISTINCT country_long FROM Powerplants ORDER BY country_long', (err, rows) => {
        if (err) {
            res.status(500).type('txt').send('SQL Error');
        } else {
            fs.readFile(path.join(template, 'country.html'), 'utf-8', (err, data) => {
                if (err) {
                    res.status(500).type('txt').send('File Error');
                } else {
                    let countryList = '';
                    for (const country of rows) {
                        const countryName = country.country_long;
                        const iso2 = getCountryISO2(countryName)?.toLowerCase() || '';
                        const slug = countryName.replace(/ /g, '-').toLowerCase();
                        countryList += `<li><span class="fi fi-${iso2}"></span> <a href="/powerplants/${slug}">${countryName}</a></li>\n`;
                    }
                    const page = data.replace('%%countries%%', countryList);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
}); 

app.listen(port, () => {
    console.log('Now listening on port ' + port);
}); 
