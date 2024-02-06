const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.use(express.json());
const portNum = 3000;
app.set("port", portNum);

// CORS Configuration
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

let db;

// Update the MongoDB connection string with your database name
MongoClient.connect(
  "mongodb+srv://VA2002:VisheshArora2002@cluster0.rvb1dw1.mongodb.net",
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.error("ERROR ", err);
    } else {
      db = client.db("CW2");
      console.log("Connected to MongoDB");
    }
  }
);

app.use((req, res, next) => {
  console.log(`${new Date().toLocaleString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.get("/", (req, res) => {
  res.send(
    "Hello! Select a MongoDB collection, ex: /collection/Lessons or /collection/Orders"
  );
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

app.get("/collection/:collectionName/:id", (req, res, next) => {
  req.collection.findOne({ _id: new ObjectID(req.params.id) }, (e, results) => {
    if (e) return next(e);
    res.send(results);
  });
});

app.put('/collection/Lessons/:id', (req, res, next) => {
  const lessonId = req.params.id;
  const newSpace = req.body.space;

  req.collection.updateOne(
    { _id: new ObjectID(lessonId) },
    { $set: { space: newSpace } },
    (err, result) => {
      if (err) {
        return next(err);
      }

      const response = result.modifiedCount === 1 ? { msg: 'success' } : { msg: 'error' };

      // Send a JSON response
      res.json(response);
    }
  );
});



app.delete("/collection/:collectionName/:id", (req, res, next) => {
  req.collection.deleteOne(
    { _id: new ObjectID(req.params.id) },
    (e, result) => {
      if (e) return next(e);
      res.send(result.result.n === 1 ? { msg: "Success" } : { msg: "error" });
    }
  );
});

app.post("/order", (req, res, next) => {
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

  // Get the lesson IDs and corresponding updated spaces from the order details
  const lessonUpdates = req.body.cartitems.map(cartItem => ({
    _id: new ObjectID(cartItem.lessonId),
    space: cartItem.space
  }));

  // Update lesson spaces in the Lessons collection
  Promise.all(
    lessonUpdates.map(lessonUpdate => {
      const lessonId = lessonUpdate._id;
      const newSpace = lessonUpdate.space;

      // Update the lesson's space in the database
      return new Promise((resolve, reject) => {
        db.collection("Lessons").updateOne(
          { _id: lessonId },
          { $set: { space: newSpace } },
          (err, result) => {
            if (err) {
              console.error(`Failed to update space for lesson with ID ${lessonId}`);
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
      // Insert the order details into the Orders collection
      db.collection("Orders").insertOne(orderDetails, (e, results) => {
        if (e) {
          console.error("Error during order submission:", e);
          res.status(500).json({ error: "Internal server error during order submission." });
        } else {
          res.status(200).json({ message: "Order submitted successfully!" });
          console.log("Order submitted");
        }
      });
    })
    .catch(error => {
      console.error("Error during order submission:", error);
      res.status(500).json({ error: "Internal server error during order submission." });
    });
});


// Function to update lesson spaces based on cart items
const updateLessonSpace = cartItems => {
  const updatePromises = cartItems.map(cartItem => {
    const lessonId = cartItem.lessonId;
    const quantity = cartItem.quantity;

    // Prepare the updated space object
    const spaceUpdate = { $inc: { space: -quantity } };

    // Sending a PUT request to update lesson space
    return req.collection.updateOne(
      { _id: new ObjectID(lessonId) },
      spaceUpdate
    );
  });

  // Wait for all updates to complete
  return Promise.all(updatePromises);
};

// ... Your existing server.js code ...

app.get("/collection/:collectionName/search/:searchTerm", (req, res, next) => {
  const collection = req.collection;
  const searchTerm = req.params.searchTerm;

  // Perform a full-text search using a case-insensitive regex
  collection
    .find({ $text: { $search: searchTerm, $caseSensitive: false } })
    .toArray((err, results) => {
      if (err) {
        console.error("Error performing search:", err);
        // Send a meaningful error response
        res.status(500).json({ error: "Internal server error during search." });
      } else {
        res.json(results);
      }
    });
});

// ... Your existing server.js code ...

// ... Your existing server.js code ...

const port = process.env.PORT || portNum;

// Start the server on port 8000
app.listen(port, () => {
  console.log("Running on Port " + portNum);
});
