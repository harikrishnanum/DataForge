const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

const uri = process.env.MONGO_URI;

let client = null;

async function mongo_connect() {
    if (!client) {
        client = await MongoClient.connect(uri, { useNewUrlParser: true });
        await client.db('my-database').collection('my-collection').createIndex({ name: 'text' });
        console.log('Text index created successfully');
    }
    return client.db('my-database');
}

module.exports = { mongo_connect };
