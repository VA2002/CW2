var express = require("express");
var app = express();

app.use(express.json());
app.set("port", 3000);
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  next();
});

const MongoClient = require("mongodb").MongoClient;

let db;

MongoClient.connect(
  "mongodb+srv://VA2002:VisheshArora2002@cluster0.rvb1dw1.mongodb.net",
  (err, client) => {
    db = client.db("CW2");
  }
);

app.get("/", (req, res) => {
  res.send("Select a collection e.g. /collection/messages");
});

app.param("collectionName", (req, res, next, collectionName) => {
  req.collection = db.collection(collectionName);
  return next();
});

app.get("/collection/:collectionName", (req, res, next) => {
  req.collection.find({}).toArray((e, results) => {
    if (e) return next(e);
    res.send(results);
  });
});

app.post("/collection/:collectionName", (req, res, next) => {
    req.collection.insert(req.body, (e, results) => {
      if (e) return next(e);
      res.send(results.ops);
    });
  });

const ObjectID = require('mongodb').ObjectID;
app.get('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: new ObjectID(req.params.id)}, (e, results) => {
        if (e) return next(e);
        res.send(results);
    });
});

app.put('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.update(
        {_id: new ObjectID(req.params.id)},
        {$set: req.body},
        {safe: true, multi: false},
        (e, result) => {
            if (e) return next(e)
            res.send(result.result.n === 1) ? {msg: 'success'}:{msg: 'error'}
        }
    )
})

app.delete('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.deleteOne(
        {_id: ObjectID(req.params.id)}, (e, result) => {
            if (e) return next(e)
            res.send((result.result.n === 1)) ?
            {msg: 'Success'}:{msg: 'error'}
        }
    )
})

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log("Port 3000");
});
