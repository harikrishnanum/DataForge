const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('elasticsearch');
const amqp = require('amqplib');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

const uri = process.env.MONGO_URI;
const mongo_client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

const ELASTICSEARCH_HOST = process.env.ELASTICSEARCH_HOST
const RABBITMQ_HOST = `amqp://${process.env.RM_HOST}`;

const elasticsearchClient = new Client({
  host: ELASTICSEARCH_HOST
});

// middleware to parse request body as JSON
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});
// endpoint to search for dataset
app.get('/search/', async (req, res) => {
  console.log("Inside")
  const { datasetName, query, fields, sorting, pagination, facets } = req.query;
  // Query Parameters
  // queryText - string value that will be used for querying in the indexed data. 
  // pagination - maximum number
  // const searchQuery = req.params.searchText;
  elasticsearchClient.search({
    index: datasetName,
    body: {
      "query": {
        "match": {
          "_all": query
        }
      }
    }
  }).then((searchResponse) => {
    res.send(searchResponse.hits.hits);
  }).catch((e) => {
    console.log(e)
  });
});

// endpoint for filtering
app.post('/filter', async (req, res) => {
  // dummy implementation for now
  res.send('Dummy filter endpoint');
});

const update_mongo_status = async (dataset_name) => {
  console.log('updating mongo status for dataset: ' + dataset_name);

  try {
    const client = await mongo_client.connect();
    const collection = client.db("my-database").collection("my-collection");

    console.log('connected to mongo');

    const result = await collection.updateOne(
      { bucket: dataset_name },
      { $set: { status: "Indexing Completed!" } }
    );
    console.log(result.modifiedCount + " document updated");
  } catch (err) {
    console.error(err);
  } finally {
    mongo_client.close();
  }
};

const bulk_index = async (indexing_data, index_name) => {
  const body = indexing_data.reduce((bulkRequestBody, doc) => {
    bulkRequestBody += JSON.stringify({ index: { _index: index_name } }) + '\n';
    bulkRequestBody += JSON.stringify(doc) + '\n';
    return bulkRequestBody;
  }, '');

  const response = await elasticsearchClient.bulk({
    body: body
  });
  console.log('indexing completed');
  update_mongo_status(index_name);
}

// consume RabbitMQ queue and index metadata to Elasticsearch
async function consumeQueue() {
  try {
    const connection = await amqp.connect(RABBITMQ_HOST);
    const channel = await connection.createChannel();

    const queue = 'my-queue';

    await channel.assertQueue(queue, { durable: true });

    console.log(`Waiting for messages in queue '${queue}'...`);

    channel.consume(
      queue,
      async (msg) => {
        const metadata = JSON.parse(msg.content.toString());

        console.log(`Received metadata for dataset ${metadata.dataset_name}`);
        try {
          const index = metadata.dataset_name;
          bulk_index(metadata['files'], index);
        } catch (error) {
          console.error(error);
        } finally {
          channel.ack(msg);
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error(error);
  }
}

// start consuming RabbitMQ queue
consumeQueue();

// start server
app.listen(port, () => {
  console.log(`Server listening at http://${host}:${port}`);
});
