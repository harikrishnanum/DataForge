const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('elasticsearch');
const amqp = require('amqplib');
const MongoClient = require('mongodb').MongoClient;

// const uri = 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority';
const uri = 'mongodb://192.168.1.189:27017/mydatabase';
const mongo_client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
const port = 3000;

const ELASTICSEARCH_HOST = 'http://192.168.1.189:9200';
const RABBITMQ_HOST = 'amqp://192.168.1.189';

const elasticsearchClient = new Client({
  host: ELASTICSEARCH_HOST
});

// middleware to parse request body as JSON
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});
// endpoint to search for dataset
app.get('/search/:datasetName', async (req, res) => {
  res.send('Dummy search endpoint');
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

const bulk_index = async (indexing_data,index_name) => {
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
  console.log(`Server listening at http://localhost:${port}`);
});
