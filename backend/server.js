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
  const { query, fields, pagination = 1, pageSize = 10, eq_filters, range_filters } = req.query;
  let filter_data_list = []
  let range_filter_list = []

  if(eq_filters)
    filter_data_list = eq_filters.match(/(\\.|[^&])+/g)
                                                            
  if(range_filters)
    range_filter_list = range_filters.match(/(\\.|[^&])+/g)  // key=gt:3|lt:32&key=gt:3|lt:32

  let must_clause_list = []
  // Eq filter
  for (var i = 0; i < filter_data_list.length; i++) { 
    key_val = filter_data_list[i].match(/(\\.|[^=])+/g)
    // console.log(key_val)
    key_val_obj = {}
    key_val_obj[key_val[0]] = key_val[1]
    predicate_obj = {"match_phrase" : key_val_obj}
    must_clause_list.push(predicate_obj)
  }

  // Range filter
  // for (var i = 0; i < range_filter_list.length; i++) {
  //   key_val = range_filter_list[i].match(/(\\.|[^=])+/g)
  //   // console.log(key_val)

  //   // key_val_obj = {}
  //   // key_val_obj[key_val[0]] = key_val[1]
  //   // predicate_obj = {"match_phrase" : key_val_obj}
  //   // must_clause_list.push(predicate_obj)
  // }  

  console.log(must_clause_list)
  elasticsearchClient.search({
    index: datasetName,
    body: {
      from: (pagination - 1) * pageSize,
      size : pageSize,
      query : 
      {
        bool: {
          must : [
            { 
              query_string: 
              { 
                query : query ? `${query}*` : `*` 
              } 
          }, {
            bool : {
              must : must_clause_list
            }
          }
        ]
        }
      },
      _source: fields ? fields.split(',') : undefined,
      
    }
  }).then((result) => {
    // Extract hits and total count
    const { hits } = result;
    const { total } = hits;

    // console.log(hits.hits);
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
    res.status(e.status).send(e.body.error)
  });
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
