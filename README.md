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

...

<a name="desc"></a>
## 2. Overall Description

...

<a name="feat"></a>
## 3. System Features

...

<a name="nonfunc"></a>
## 4. Non Functional Requirements

...

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
## 3. High Level API

The API will consist of a main endpoint:
- /query : The body of the query should consist of access token (if required), information about the category of images, fine grained filters (if any), any other misc. information required to process the query

<img src="API.png"
     alt="API Design Image"
     style="float: center;" />
