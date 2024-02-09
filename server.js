//Calling all the required modules
const express = require("express");
const http = require("http");
const path = require("path");
const app = express();
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;

//Setting up the middleware to parse JSON data
app.use(express.json());
const portNum = 3000;
app.set("port", portNum);

//CORS Configuration set up to allow cross-origin resource sharing
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

//Serving static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

//MongoDB connection being set up
let db;
MongoClient.connect(
  "mongodb+srv://VA2002:VisheshArora2002@cluster0.rvb1dw1.mongodb.net",
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.error("ERROR ", err);
    } else {
      db = client.db("CW2");
      //Create a compound text index on 'name', 'code', 'teacher', and 'location' fields to allow search function to work based on these
      db.collection("Lessons").createIndex({
        name: "text",
        code: "text",
        teacher: "text",
        location: "text"
      });
      console.log("Connected to MongoDB");
    }
  }
);

//Logger middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleString()} - ${req.method} ${req.url}`);
  next();
});

//Route to root endpoint
app.get("/", (req, res) => {
  res.send(
    "Hello! Select a MongoDB collection, ex: /collection/Lessons or /collection/Orders"
  );
  console.log(__dirname);
});

//Middleware to handle collection name parameter
app.param("collectionName", (req, res, next, collectionName) => {
  req.collection = db.collection(collectionName);
  return next();
});

//Route to get all documents from a collection (to display all lessons)
app.get("/collection/:collectionName", (req, res, next) => {
  req.collection.find({}).toArray((e, results) => {
    if (e) return next(e);
    res.send(results);
  });
});

//Route to insert a new document into a collection (meant for storing orders)
app.post("/collection/:collectionName", (req, res, next) => {
  req.collection.insert(req.body, (e, results) => {
    if (e) return next(e);
    res.send(results.ops);
  });
});

//Route to retrieve a document by ID from a collection
app.get("/collection/:collectionName/:id", (req, res, next) => {
  req.collection.findOne({ _id: new ObjectID(req.params.id) }, (e, results) => {
    if (e) return next(e);
    res.send(results);
  });
});

//Route to update lesson's space value after order is placed
app.put("/collection/:collectionName/:id", (req, res, next) => {
  req.collection.update(
    { _id: new ObjectID(req.params.id) },
    { $set: { space: req.body.space } },
    { safe: true, multi: false },
    (e, result) => {
      if (e) return next(e);
      res.send(result.result.n === 1) ? { msg: "success" } : { msg: "error" };
    }
  );
});

//Route to handle order submission
app.post("/order", (req, res, next) => {
  // Extract order details from the request body
  const orderDetails = {
    fname: req.body.fname,
    mname: req.body.mname,
    lname: req.body.lname,
    studentid: req.body.studentid,
    phone: req.body.phone,
    email: req.body.email,
    cardno: req.body.cardno,
    cvv: req.body.cvv,
    cardexp: req.body.cardexp,
    cartitems: req.body.cartitems,
    payment: req.body.payment
  };

  //Extract lesson IDs and corresponding updated spaces from the order details
  const lessonUpdates = req.body.cartitems.map(cartItem => ({
    _id: new ObjectID(cartItem.lessonId),
    space: cartItem.space
  }));

  //Update lesson spaces in the Lessons collection and handle order submission
  Promise.all(
    lessonUpdates.map(lessonUpdate => {
      const lessonId = lessonUpdate._id;
      const newSpace = lessonUpdate.space;

      return new Promise((resolve, reject) => {
        db.collection("Lessons").updateOne(
          { _id: lessonId },
          { $set: { space: newSpace } },
          (err, result) => {
            if (err) {
              console.error(
                `Failed to update space for lesson with ID ${lessonId}`
              );
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      });
    })
  )
    .then(() => {
      db.collection("Orders").insertOne(orderDetails, (e, results) => {
        if (e) {
          console.error("Error during order submission:", e);
          res
            .status(500)
            .json({ error: "Internal server error during order submission." });
        } else {
          res.status(200).json({ message: "Order submitted successfully!" });
          console.log("Order submitted");
        }
      });
    })
    .catch(error => {
      console.error("Error during order submission:", error);
      res
        .status(500)
        .json({ error: "Internal server error during order submission." });
    });
});

//Route to search for lessons based on lesson name, code, teacher or location
app.get("/collection/:collectionName/search/:searchTerm", (req, res, next) => {
  const collection = req.collection;
  const searchTerm = req.params.searchTerm;

  //Perform a case-insensitive regex search for partial matches
  collection
    .find({
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { code: { $regex: searchTerm, $options: "i" } },
        { teacher: { $regex: searchTerm, $options: "i" } },
        { location: { $regex: searchTerm, $options: "i" } }
      ]
    })
    .toArray((err, results) => {
      if (err) {
        console.error("ERROR:", err);
        res.status(500).json({ error: "Internal server error during search." });
      } else {
        res.json(results);
        console.log("Search results are ", results);
      }
    });
});

//Start the server on the specified port. This is done for AWS.
const port = process.env.PORT || portNum;

//Listen to this port
app.listen(port, () => {
  console.log("Running on Port " + portNum);
});
