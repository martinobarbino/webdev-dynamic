import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';
import { countryToAlpha2 } from "country-to-iso";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8080;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

let app = express();
app.use(express.static(root));

function sendErrorPage(res, statusCode, errorMessage) {
    fs.readFile(path.join(template, 'error.html'), 'utf-8', (err, data) => {
        if (err) {
            res.status(500).type('txt').send('A server error occurred and the error page could not be displayed.');
        } else {
            let page = data.replace('%%error-message%%', errorMessage);
            res.status(statusCode).type('html').send(page);
        }
    });
}

const db = new sqlite3.Database('./db.sqlite3', sqlite3.OPEN_READONLY, (err) => {
        if (err)
            console. log( 'Error connecting to database');
        else 
            console. log('Successfully connected to database');
        
});

app.get('/', (req, res) => {
    fs.readFile(path.join(template, 'list-pages.html'), 'utf-8', (err, data) => {
        if (err) {
            sendErrorPage(res, 500, 'File Error');
        } else {
            const routes = '<li><a href="/fuel-types">Fuel Types</a></li>' +
                                 '<li><a href="/countries">Countries</a></li>' +
                                 '<li><a href="/power-capacities">Power Capacities</a></li>';
            let page = data.replace(/%%title%%/g, 'Powerplant Data');
            page = page.replace('%%img-src%%', '/images/powerplant.png');
            page = page.replace("%%img-alt%%", 'A picture of a powerplant.');
            page = page.replace('%%list%%', routes);
            res.status(200).type('html').send(page);
        }
    });
}); 

app.get('/countries/:country', (req, res) => {
    const countrySlug = req.params.country;
    const countryName = countrySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // First, get the full ordered list of all countries to determine previous/next
    db.all('SELECT DISTINCT country FROM Powerplants WHERE country IS NOT NULL AND country != "" ORDER BY country', (err, allCountries) => {
        if (err) {
            return sendErrorPage(res, 500, 'SQL Error getting country list');
        }

        const countryNames = allCountries.map(c => c.country);
        const currentIndex = countryNames.indexOf(countryName);

        if (currentIndex === -1) {
            return sendErrorPage(res, 404, `Error: no data for country: ${countryName}`);
        }

        // Looping logic for previous and next
        const prevIndex = (currentIndex - 1 + countryNames.length) % countryNames.length;
        const nextIndex = (currentIndex + 1) % countryNames.length;

        const prevLink = `/countries/${countryNames[prevIndex].replace(/ /g, '-').toLowerCase()}`;
        const nextLink = `/countries/${countryNames[nextIndex].replace(/ /g, '-').toLowerCase()}`;

        db.all('SELECT * FROM Powerplants WHERE country = ?', [countryName], (err, rows) => {
        if (err) {
            sendErrorPage(res, 500, 'SQL Error');
        } else {
            if (rows.length === 0) {
                sendErrorPage(res, 404, `Error: no data for country: ${countryName}`);
                return;
            }
            fs.readFile(path.join(template, 'country.html'), 'utf-8', (err, data) => {
                if (err) {
                    sendErrorPage(res, 500, 'File Error');
                } else {
                    let powerplantList = '<table><tr><th>Name</th><th>Capacity (MW)</th><th>Primary Fuel</th></tr>';
                    for (const plant of rows) {
                        powerplantList += `<tr><td>${plant.name}</td><td>${plant.capacity}</td><td>${plant.fuel1}</td></tr>`;
                    }
                    powerplantList += '</table>';
                    const navHtml = `<div class="prev-next-nav"><a href="${prevLink}">← Previous</a><a href="${nextLink}">Next →</a></div>`;

                    let page = data.replace(/%title%/g, countryName);
                    page = page.replace("%%flag-icon%%", countryToAlpha2(countryName).toLowerCase());
                    page = page.replace('%%powerplants%%', powerplantList);
                    page = page.replace('%%prev-next-nav%%', navHtml);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
  });
});

app.get('/countries', (req, res) => {
    db.all('SELECT DISTINCT country FROM Powerplants ORDER BY country', (err, rows) => {
        if (err) {
            sendErrorPage(res, 500, 'SQL Error');
        } else {
            fs.readFile(path.join(template, 'list-pages.html'), 'utf-8', (err, data) => {
                if (err) {
                    sendErrorPage(res, 500, 'File Error');
                } else {
                    let countryList = '';
                    for (const country of rows) {
                        const countryName = country.country;
                        const slug = countryName.replace(/ /g, '-').toLowerCase();
                        countryList += `<li><a href="/countries/${slug}">${countryName}</a></li>\n`;
                    }
                    let page = data.replace(/%%title%%/g, 'Countries');
                    page = page.replace('%%img-src%%', '/images/countries.png');
                    page = page.replace("%%img-alt%%", 'A picture of the Earth.');
                    page = page.replace('%%list%%', countryList);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
}); 

app.get('/fuel-types/:type', (req, res) => {
    const fuelSlug = req.params.type;
    let fuelType = fuelSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    if (fuelType === 'Wave And Tidal') {
        fuelType = 'Wave and Tidal';
    }

    // First, get the full ordered list of all fuel types
    db.all('SELECT DISTINCT fuel1 FROM Powerplants WHERE fuel1 IS NOT NULL AND fuel1 != "" ORDER BY fuel1', (err, allFuelTypes) => {
        if (err) {
            return sendErrorPage(res, 500, 'SQL Error getting fuel type list');
        }

        const fuelTypeNames = allFuelTypes.map(f => f.fuel1);
        const currentIndex = fuelTypeNames.indexOf(fuelType);

        if (currentIndex === -1) {
            return sendErrorPage(res, 404, `Error: no data for fuel type: ${fuelType}`);
        }

        // Looping logic for previous and next
        const prevIndex = (currentIndex - 1 + fuelTypeNames.length) % fuelTypeNames.length;
        const nextIndex = (currentIndex + 1) % fuelTypeNames.length;

        const prevLink = `/fuel-types/${fuelTypeNames[prevIndex].replace(/ /g, '-').toLowerCase()}`;
        const nextLink = `/fuel-types/${fuelTypeNames[nextIndex].replace(/ /g, '-').toLowerCase()}`;

        db.all('SELECT * FROM Powerplants WHERE fuel1 = ?', [fuelType], (err, rows) => {
        if (err) {
            sendErrorPage(res, 500, 'SQL Error');
        } else {
            if (rows.length === 0) {
                sendErrorPage(res, 404, `Error: no data for fuel type: ${fuelType}`);
                return;
            }
            fs.readFile(path.join(template, 'fuel-type.html'), 'utf-8', (err, data) => {
                fuelSlug;
                if (err) {
                    sendErrorPage(res, 500, 'File Error');
                } else {
                    let powerplantList = '<table><tr><th>Name</th><th>Country</th><th>Capacity (MW)</th></tr>';
                    for (const plant of rows) {
                        powerplantList += `<tr><td>${plant.name}</td><td>${plant.country}</td><td>${plant.capacity}</td></tr>`;
                    }
                    powerplantList += '</table>';

                    const navHtml = `<div class="prev-next-nav"><a href="${prevLink}">← Previous</a><a href="${nextLink}">Next →</a></div>`;

                    let page = data.replace(/%%fuel-type%%/g, fuelType);
                    page = page.replace("%%img-src%%", `/images/${fuelSlug}.png`);
                    page = page.replace("%%img-alt%%", `A photo of a powerplant that is fueled by ${fuelType.toLowerCase()}.`);
                    page = page.replace('%%powerplants%%', powerplantList);
                    page = page.replace('%%prev-next-nav%%', navHtml);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
  });
});

app.get('/fuel-types', (req, res) => {
    db.all('SELECT DISTINCT fuel1 FROM Powerplants ORDER BY fuel1', (err, rows) => {
        if (err) {
            sendErrorPage(res, 500, 'SQL Error');
        } else {
            fs.readFile(path.join(template, 'list-pages.html'), 'utf-8', (err, data) => {
                if (err) {
                    sendErrorPage(res, 500, 'File Error');
                } else {
                    let powerplantList = '';
                    for (const powerplant of rows) {
                        const powerplantType = powerplant.fuel1;
                        const slug = powerplantType.replace(/ /g, '-').toLowerCase();
                        powerplantList += `<li><a href="/fuel-types/${slug}">${powerplantType}</a></li>\n`;
                    }
                    let page = data.replace(/%%title%%/g, 'Fuel Types');
                    page = page.replace('%%img-src%%', '/images/fuel-types.png');
                    page = page.replace("%%img-alt%%", 'A picture of a powerplant.');
                    page = page.replace('%%list%%', powerplantList);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
}); 

app.get('/power-capacities/:range', (req, res) => {
    const range = req.params.range;
    let query = '';
    let title = '';
    let prevNextNav = '';

    switch (range) {
        case 'low':
            query = 'SELECT * FROM Powerplants WHERE capacity BETWEEN 0 AND 7499 ORDER BY capacity';
            title = 'Low Capacity Power Plants';
            prevNextNav = '| <a href="/power-capacities/medium">Next</a>'
            break;
        case 'medium':
            query = 'SELECT * FROM Powerplants WHERE capacity BETWEEN 7499 AND 14998 ORDER BY capacity';
            title = 'Medium Capacity Power Plants';
            prevNextNav = '<a href="/power-capacities/low">Prev</a> | <a href="/power-capacities/high">Next</a>'
            break;
        case 'high':
            query = 'SELECT * FROM Powerplants WHERE capacity > 14998 ORDER BY capacity';
            title = 'High Capacity Power Plants';
            prevNextNav = '<a href="/power-capacities/medium">Prev</a> |'
            break;
        default:
            sendErrorPage(res, 404, 'Invalid capacity range');
            return;
    }

    db.all(query, (err, rows) => {
        if (err) {
            sendErrorPage(res, 500, 'SQL Error');
        } else {
            if (rows.length === 0) {
                sendErrorPage(res, 404, `Error: no data for the requested capacity: ${range}`);
                return;
            }
            fs.readFile(path.join(template, 'capacity.html'), 'utf-8', (err, data) => {
                if (err) {
                    sendErrorPage(res, 500, 'File Error');
                } else {
                    let powerplantList = '<table><tr><th>Name</th><th>Country</th><th>Capacity (MW)</th></tr>';
                    for (const plant of rows) {
                        powerplantList += `<tr><td>${plant.name}</td><td>${plant.country}</td><td>${plant.capacity}</td></tr>`;
                    }
                    powerplantList += '</table>';
                    let page = data.replace(/%%capacity%%/g, title);
                    page = page.replace("%%img-src%%", `/images/${range}.png`);
                    page = page.replace("%%img-alt%%", `A graphic representing ${range} power capacity.`);
                    page = page.replace("%%prev-next-nav%%", prevNextNav);
                    page = page.replace('%%powerplants%%', powerplantList);
                    res.status(200).type('html').send(page);
                }
            });
        }
    });
});

app.get('/power-capacities', (req, res) => {
    fs.readFile(path.join(template, 'list-pages.html'), 'utf-8', (err, data) => {
        if (err) {
            sendErrorPage(res, 500, 'File Error');
        } else {
            const capacityLevels = '<li><a href="/power-capacities/low">Low</a></li>' +
                                 '<li><a href="/power-capacities/medium">Medium</a></li>' +
                                 '<li><a href="/power-capacities/high">High</a></li>';
            let page = data.replace(/%%title%%/g, 'Capacity Levels');
            page = page.replace('%%img-src%%', '/images/power-capacities.png');
            page = page.replace("%%img-alt%%", 'A picture of three power plants with different power capacities.');
            page = page.replace('%%list%%', capacityLevels);
            res.status(200).type('html').send(page);
        }
    });
}); 

app.use((req, res) => {
    sendErrorPage(res, 404, `Error: 404 Not Found. The requested path '${req.originalUrl}' does not exist on this website.`);
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
}); 
