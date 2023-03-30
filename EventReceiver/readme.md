# EventReceiver 
## Steps to run
1. Create a .env file with the following content:
```
    RM_QUEUE= <queue name>
    RM_HOST=...
    RM_PORT=...
    RM_USERNAME=...
    RM_PASSWORD=...
    ELASTICSEARCH_HOST= <host-name>:<elastic-search-port (9200 by default)>
```
2. Install the required Node.js packages by running: `npm install`
3. Run the event receiver script by running: `node event_receiver.js`
4. Keep the process running in the background to index the data.