const db = require('./models');
const httpServer = require('./app/lib/io');
const app = require('./app');
require('dotenv').config();
const env = process.env.NODE_ENV;
const redisconnect = require('./app/utils/redis');
// start function
const serverfunctions = async () => {
   
    await redisconnect.connect();

    // Test the db connection
    db.sequelize
        .authenticate()
        .then(() => {
            console.log('postgres connection has been established successfully. -- ' + env);
        })
        .catch((err) => {
            console.error('Unable to connect to the database:', err);
            if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
                console.error('The database is disconnected. Please check the connection and try again.');
            } else {
                console.error('An error occured while connecting to the database:', err);
            }
        });

    let PORT = process.env.PORT;
    let drop; 

    if (env === 'test') {
        PORT = process.env.TEST_PORT
        drop = { force: true };
    };

    // sdding {force: true} will drop the table if it already exists 
    // db.sequelize.sync().then(() => {
        db.sequelize.sync({ force: true }).then(() => {
        console.log('All Tables synchronized successfully');

        app.listen(PORT, () => {
        // httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}........`);
        });
    });
}

serverfunctions();
