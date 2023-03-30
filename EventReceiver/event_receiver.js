const { Client } = require('elasticsearch');
const amqp = require('amqplib');
require('dotenv').config();

const ELASTICSEARCH_HOST = process.env.ELASTICSEARCH_HOST
const RABBITMQ_HOST = `amqp://${process.env.RM_HOST}`;

const elasticsearchClient = new Client({
    host: ELASTICSEARCH_HOST
});

const bulkIndex = async (indexingData, indexName) => {
    const body = indexingData.reduce((bulkRequestBody, doc) => {
        bulkRequestBody += JSON.stringify({ index: { _index: indexName } }) + '\n';
        bulkRequestBody += JSON.stringify(doc) + '\n';
        return bulkRequestBody;
    }, '');

    const response = await elasticsearchClient.bulk({
        body: body
    });

    console.log('Indexing completed');
};

const consumeQueueAndIndex = async () => {
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

                    await bulkIndex(metadata['files'], index);
                } catch (error) {
                    console.error(error);
                    consumeQueueAndIndex();
                } finally {
                    channel.ack(msg);
                }
            },
            { noAck: false }
        );
    } catch (error) {
        console.error(error);
        consumeQueueAndIndex();
    }
};

consumeQueueAndIndex();
