\echo 'Delete and recreate venue db?'
\prompt 'Return for yes or control-c to cancel > ' foo

DROP DATABASE venue_db;
CREATE DATABASE venue_db;
\connect venue_db;

\i venue-schema.sql
