# Reverse Geocoding with Postgis + OSM Data

By request of Diego Guiraldes i did a little research about how to do a very simple reverse geocoding of a pair of `latitude`/`longitude` with the data distributed by [Open Street Maps](https://www.openstreetmap.org/).

## Get the OSM Data

OSM has a [Planet wide data source of map and tiles](https://planet.openstreetmap.org/), but it's too big (about 93 GB when this readme is made) but there's some already curated files by a German company (GeoFabrik) by continent and country.

To download the data go [to this link](https://download.geofabrik.de/south-america.html) and click on `.osm.pbf` option.

## Load the data into Postgres

To load the data into PostGres first need to enable `Postgis` extension and `hstore`.

I used a tool named [osm2pgsql](https://github.com/openstreetmap/osm2pgsql) to load the file into the database like:

```bash
$ createdb some_database
$ psql -d some_database -c 'CREATE EXTENSION postgis; CREATE EXTENSION hstore;'
$ osm2pgsql --create --database some_database peru-latest.osm.pbf
```

After this, the database already has the tables `planet_osm_point`, `planet_osm_line`, `planet_osm_roads`, and `planet_osm_polygon` that can be used to query with any `Postgis` function.

## Query for a specific point

Since we want to ask for an specific pair of coordinates, i just ran a query to do that:

```sql
SELECT admin_level, boundary, landuse, name, population, ref, ST_AsGeoJSON(ST_Transform(way, 4326))
FROM planet_osm_polygon
WHERE ST_CONTAINS(ST_Transform(way, 4326), ST_SetSRID(ST_Point(LONGITUDE, LATITUDE), 4326))
ORDER BY admin_level DESC
```

That will result in something like this:

![ss example](https://i.ibb.co/GsytjYB/Captura-de-Pantalla-2020-11-16-a-la-s-20-00-10.png)

We want to obtain the District of Perubian coordinates so for that we care about the `admin_level` = `8` since thats district ([see OSM docs about levels](https://wiki.openstreetmap.org/wiki/Tag:boundary%3Dadministrative)).

An important thing here is that i'm using the `SRID` 4326, both `SRID`s must be same to do comparissions. By default it's using `3857` but after a few tests i couln't get any results on that projection (probably some conversion missmatch of my part).

The last column can be used in any `GeoJSON` app to display it (i use geojson.io).

## Code Snippet

I did a very simple snippet that will use a `csv` as input data and will output a `json` and a `csv` with the rows processed with a new column for `district`.


### Run Snippet

1. Clone this repository
2. Install dependencies `npm install`
3. Run the code `node index.js`
4. Wait until it finish

At the end, will show the rows that couldn't get the district:

![Alt Text](http://g.recordit.co/WyKhcCsLN4.gif)

In the repo are 2 examples of the result `output_sample.csv` and `output_sample.json`, and it's using the file Diego sent to me with 100 addresses.
