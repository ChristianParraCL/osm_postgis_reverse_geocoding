const parse = require('csv-parse/lib/sync');
const stringify = require('csv-stringify/lib/sync');

const fs = require('fs').promises;
const cliProgress = require('cli-progress');

const { Client } = require('pg');

const pgClient = new Client({
  database: 'osm_peru',
});

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

(async function () {
  // Read the content
  const content = await fs.readFile(`peru_addresses.csv`);
  // Parse the CSV content
  const records = parse(content, { columns: true });

  const records_processed = [];
  const records_no_result = [];

  await pgClient
    .connect()
    .then(() => console.log('db connected'))
    .catch((err) => console.error('connection error', err.stack));

  progressBar.start(records.length, 0);

  await Promise.all(
    records.map(async (row, index) => {
      // i'm filtering by admin_level = 8 because that's districts on PERU
      // more info: https://wiki.openstreetmap.org/wiki/Tag:boundary%3Dadministrative
      const SQL = `SELECT admin_level, boundary, landuse, name, population, ref, ST_AsGeoJSON(ST_Transform(way, 4326))
      FROM planet_osm_polygon
      WHERE ST_CONTAINS(ST_Transform(way, 4326), ST_SetSRID(ST_Point($1, $2),4326))
      AND admin_level = '8'
      ORDER BY admin_level DESC`;

      result = await pgClient
        .query(SQL, [row.lng, row.lat])
        .catch((e) => console.error(e.stack));

      if(result.rows.length){
        const first = result.rows[0];

        records_processed.push({
          ...row,
          district: first.name
        })
      }else{
        records_processed.push(row);
        records_no_result.push(row);
      }

      progressBar.increment();
    })
  );

  await pgClient.end();

  const json = JSON.stringify(records_processed);
  const csv = stringify(records_processed, { header: true });

  await fs.writeFile(`output.json`, json);
  await fs.writeFile(`output.csv`, csv);
  
  console.debug(`\n\nFinished with ${records_no_result.length} rows with no result`);
  console.debug(records_no_result);

  process.exit()
})();
