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
        db.all('SELECT * FROM Powerplants', (err, rows) => {
            if (err) {
                res.status(500).type('txt').send('SQL Error');
            }
            else {
                res.status(200).type('json').send(JSON.stringify(rows));
            }
        });
    });

app.listen(port, () => {
    console.log('Now listening on port ' + port);
}); 
