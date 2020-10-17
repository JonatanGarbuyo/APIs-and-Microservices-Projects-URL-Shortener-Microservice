'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');

var cors = require('cors');
var dns = require("dns");

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.DB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true, 
  useFindAndModify: true 
});

// create the Model
const Schema = mongoose.Schema;

const urlSchema = new Schema({
  "urlId": {"type": "Number", "index": true, "unique": true, },
  "url": {"type": "String", "required" : true}
})

const counterSchema = new Schema({
  "_id": {"type": "String"},
  "sequence_value": {"type": "Number"}
})

const Url = mongoose.model("Url", urlSchema);
const Counter = mongoose.model("Counter", counterSchema);


app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


// the 1st part validates the url passed. the 2nd save it to DB an return the result
app.post("/api/shorturl/new", (req, res, next) => {
  // get the domain from req.body.url
      console.log(req.body.url);//////////////////////////////////////
  let urlArr = req.body.url.split("/");
      console.log("url: " + urlArr);///////////
  
  let domain = urlArr[2].split(":")[0];
      console.log("domain: " + domain);///////////
  
  let regex = /^http(s)?:\/\/(www\.)?\w+\.\w+/;
      console.log("valid: " + regex.test(req.body.url));//////////////////////
  
  // validate the domain
  dns.lookup(domain, (err, addresses, family) => {
    console.log("error: " + err);////////////////////
    console.log("addresses: " + addresses);////////////////////
    
    // validate URL
    if (!regex.test(req.body.url) || err) {
      return res.json({"error":"invalid URL"});
    }
  });

  next();
}, (req, res) => {
  
  // get the next id from db
  Counter.findOneAndUpdate(
    {"_id":"counterId"},
    {$inc:{sequence_value:1}},
    {new: true},
    function(err, data) {
      if (err) return console.log(err);
      
      //Save in database and return the _id
      let urlToStore = new Url({"urlId": data.sequence_value, "url": req.body.url})

      urlToStore.save(function(err, doc) {
        if (err) return console.log(err);
        console.log(req.protocol+"://"+req.headers.host + "/api/shorturl/" + doc.urlId);/////
        res.json({
          "shortUrl": req.protocol+"://"+req.headers.host + "/api/shorturl/" + doc.urlId
        });
      });
    });
});


// lookup for the urlId in the DB and redirect
app.get("/api/shorturl/:id", (req, res) => {
  console.log(req.params.id);////////////////////
  
  Url.findOne({"urlId": req.params.id})
     .select('url')
     .exec(function(err, doc){
            if(err) return console.log(err);
            res.redirect(doc.url);
          }
      );
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});