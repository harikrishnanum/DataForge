const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('elasticsearch');
const amqp = require('amqplib');
require('dotenv').config();
const swagger = require('./swagger');

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

// Healthcheck api 
app.get('/healthcheck', (req, res) => {
  res.send('OK');
});

// Endpoint to search for dataset
app.get('/search/:datasetName', async (req, res) => {
  const datasetName = req.params.datasetName
  const { query, fields, pagination = 1, pageSize = 10 } = req.query;
  elasticsearchClient.search({
    index: datasetName,
    body: {
      from: (pagination - 1) * pageSize,
      size : pageSize,
      query: query ? { query_string: { query : `${query}*` } } : undefined,
      _source: fields ? fields.split(',') : undefined,
    }
  }).then((result) => {
    // Extract hits and total count
    const { hits } = result;
    const { total } = hits;

    console.log(hits.hits);
    // Return response
    res.json({
      total,
      pagination,
      pageSize,
      results: hits.hits.map((hit) => hit._source),
    });
    // res.send(searchResponse.hits.hits);
  }).catch((e) => {
    console.log("Error --")
    console.log(e)
  });
});

// Endpoint for filtering
app.post('/filter', async (req, res) => {
  // dummy implementation for now
  res.send('Dummy filter endpoint');
});

app.get('/datasets', async (req, res) => {
  const { datasetName } = req.query;
  try {
    const searchResponse = await elasticsearchClient.search({
      index: 'datasets',
      body: {
        query: {
          query_string: {
            default_field: 'name',
            query: `${datasetName}*`
          }
        }
      }
    });
    res.send(searchResponse.hits.hits);
  }
  catch (e) {
    console.log(e)
  }
});

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
}

// || Event Receiver ||
// Consume RabbitMQ queue and index metadata to Elasticsearch
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

          const datasetDetails = metadata.dataset_details;
          await elasticsearchClient.index({
            index: 'datasets',
            body: datasetDetails
          });

          await bulk_index(metadata['files'], index);
        } catch (error) {
          console.error(error);
          consumeQueue()
        } finally {
          channel.ack(msg);
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error(error);
    consumeQueue()
  }
}

// start consuming RabbitMQ queue
consumeQueue();

// Swagger documentation of the API
swagger(app);

// start server
app.listen(port, () => {
  console.log(`Server listening at http://${host}:${port}`);
});
