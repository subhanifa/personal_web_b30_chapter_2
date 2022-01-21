// import postgreSQL

const { Pool } = require('pg')

// setup connection pool
const dbPool = new Pool ({
    database: 'personal_web_b30_sesi1',
    port: 5432,
    user: 'postgres',
    password: 'sasalely01'
})

module.exports = dbPool