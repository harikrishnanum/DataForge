const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('elasticsearch');
const amqp = require('amqplib');
require('dotenv').config();

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
app.get('/search:datasetName', async (req, res) => {
  console.log("Inside")
  const datasetName = req.params.datasetName
  const { query, fields, sorting = 0, pagination = 1, size = 10, facets } = req.query;
  // Query Parameters
  // datasetName - Name of the dataset to search on.
  // query - 
  // pagination - maximum number
  // const searchQuery = req.params.searchText;
  elasticsearchClient.search({
    index: datasetName,
    body: {
      from: (pagination - 1) * size,
      size,
      query: {
        // match: {
        //   _all: query
        // }
        bool: {
          must: query ? { match: { _all: query } } : undefined,
        },
      },
      _source: fields ? fields.split(',') : undefined,
      aggs: facets
        ? JSON.parse(facets).reduce((acc, cur) => {
          acc[cur] = { terms: { field: cur } };
          return acc;
        }, {})
        : undefined,
    }
  }).then((result) => {
    // Extract hits and total count
    const { hits, aggregations } = result;
    const { total } = hits;

    // Extract facets
    const parsedFacets = facets
      ? JSON.parse(facets).reduce((acc, cur) => {
        acc[cur] = aggregations[cur].buckets.map((b) => b.key);
        return acc;
      }, {})
      : undefined;

    // Return response
    res.json({
      total,
      pagination,
      size,
      results: hits.hits.map((hit) => hit._source),
      facets: parsedFacets,
    });
    // res.send(searchResponse.hits.hits);
  }).catch((e) => {
    console.log(e)
  });
});

// endpoint for filtering
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
          match: {
            datasetName: datasetName
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

          const datasetDetails = metadata.dataset_details;
          await elasticsearchClient.index({
            index: 'datasets',
            body: datasetDetails
          });

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
