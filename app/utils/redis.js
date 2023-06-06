const Redis = require('redis');
const { REDIS_CONNECTION_URL } = require('./configs');

let client;
if (process.env.NODE_ENV === 'production') {
    client = Redis.createClient({ url: REDIS_CONNECTION_URL})
} else {
    client = Redis.createClient({ url: REDIS_CONNECTION_URL })
}

console.log('Redis client created');
client.on('connect', function () {
    console.log('Redis client connected');
});

client.on('ready', function () {
    console.log('Client connected to redis an ready to use...');
});

client.on('error', function (err) {
    console.error('Error connecting to Redis:', err);
});

client.on('end', function () {
    console.error(' Client disconnected from redis')
});

process.on('SIGINT', function () {
    client.quit();
});

module.exports = client