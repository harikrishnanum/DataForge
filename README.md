<hr/>
<br/>
<div align="center"> <h1 style="text-align: center;">Software Requirements & Design Specification <br/><br/> for <br/> <br/> MinIO Data Search  <br/> <br/></h1> </div>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<div align="center"> <h3 style="text-align: center;"> Project Category : Data Search </h3> </div>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<div align="center"> <h2 style="text-align: center;"> Team Members : </h2> </div>
<div align="center"> <h3 style="text-align: center;"> Hari Krishnan U M - 2021202022 </h3> </div>
<div align="center"> <h3 style="text-align: center;"> Manu Gupta - 2021202025 </h3> </div>
<div align="center"> <h3 style="text-align: center;"> Shaon Dasgupta - 2021201068 </h3> </div>

<hr/>

<br/>
<br/>

<h1>Table of Content :</h1>

<h2> Software Requirements </h2>

1. [ Introduction. ](#intro)
2. [ Overall Description. ](#desc)
3. [ System Features. ](#feat)
4. [ Non Functional Requirements. ](#nonfunc)

<h2> Design Specification </h2>

1. [ High Level Design. ](#hld)
2. [ Proposed Design. ](#pd)
3. [ High Level API. ](#hla)

<br/>
<hr/>
<br/>

<h1>Software Requirements</h1>

<a name="intro"></a>
## 1. Introduction

The system provides an efficient solution for uploading and managing datasets. Users can upload their datasets to Minio, a high-performance object storage solution, and have their associated metadata indexed in Elasticsearch. The system also includes an API that allows users to search and retrieve their data using Elasticsearch. This streamlined process reduces the time and effort required to manage and access large amounts of data.

<a name="desc"></a>
## 2. Overall Description

The system is a comprehensive solution for uploading, storing, and retrieving datasets. It consists of two main components: Minio, an object storage solution that provides reliable and scalable data storage, and Elasticsearch, a powerful search and analytics engine that enables efficient data retrieval. The system provides a user-friendly API that allows users to upload their datasets to Minio and index the associated metadata in Elasticsearch. This allows for fast and accurate searching and retrieval of data. The system is designed to meet the needs of various user groups, such as data scientists, researchers, and others who require a reliable and efficient way to manage their data.

<a name="feat"></a>
## 3. System Features

- Data Upload: The system provides an easy-to-use interface for uploading datasets to Minio.

- Metadata Indexing: The associated metadata of the uploaded datasets is automatically indexed in Elasticsearch for efficient data retrieval.

- Search and Retrieval: The system provides an API that allows users to search and retrieve their data using Elasticsearch.

<a name="nonfunc"></a>
## 4. Non Functional Requirements

- Performance: The system should be able to handle large amounts of data and perform efficiently, with quick response times for data searches and retrievals.

- Scalability: The system should be able to scale to meet the changing needs of its users, including the ability to store increasing amounts of data.

- Security: The system should implement appropriate security measures to protect users' data, such as encryption and secure access controls.

- Availability: The system should have high availability, ensuring that users can access their data whenever they need it.

- Interoperability: The system should be able to integrate with other software solutions, allowing users to access their data in a variety of ways.

- User-friendly: The system should be easy to use, with a user-friendly interface and intuitive functionality.

- Reliability: The system should be reliable, with minimal downtime and a high degree of stability.

- Compatibility: The system should be compatible with various data formats, allowing users to upload and access their data in a variety of formats.

- Maintainability: The system should be easy to maintain and upgrade, with clear documentation and a robust architecture.


<br/>
<hr/>
<br/>
<h1>Design Specification</h1>

<a name="hld"></a>
## 1. High Level Design

On a high level the design consists of mainly 2 workflows:
- DataSets Upload: Uploader will upload data to MinIO, as data is uploaded, an event will be triggered and added to a Messaging Queue, There will be an event listener which will then take data from the MQ and add it to Elastic Search or Solr service for future queries.
- When an API call is made by the user, it will first go to API handler where the processing of query will take place, it will then forward the request to File Searcher which will then communicate with Elastic Search to get the Object IDs, which can then be used to fetch data from MinIO. It will then return the result from MinIO to the API handler and finally to end user. 

<img src="HLD.png"
     alt="High Level Design Image"
     style="float: center;" />


<a name="hla"></a>
## 2. High Level API Design

The API will consist of a main endpoint:
- /query : The body of the query should consist of access token (if required), information about the category of images, fine grained filters (if any), any other misc. information required to process the query

<img src="API.png"
     alt="API Design Image"
     style="float: center;" />
