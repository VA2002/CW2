const express = require("express");
const app = express();
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;

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

app.put("/collection/:collectionName/:id", (req, res, next) => {
  const id = req.params.id;
  const newSpace = req.body.space;

  // Update the lesson's space in the database
  req.collection.updateOne(
    { _id: new ObjectID(id) },
    { $set: { space: newSpace } },
    (err, result) => {
      if (err) {
        return next(err);
      }

      // Return the updated lesson
      req.collection.findOne({ _id: new ObjectID(id) }, (error, updatedLesson) => {
        if (error) {
          return next(error);
        }

        res.json(updatedLesson);
      });
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


You're right, my apologies for the oversight. I should have used updateResult to ensure that the update operation was successful. Here's the corrected code:

javascript
Copy code
// ... (Your existing imports and configuration)

app.put("/collection/:collectionName/:id", (req, res, next) => {
  const id = req.params.id;
  const newSpace = req.body.space;

  // Update the lesson's space in the database
  req.collection.updateOne(
    { _id: new ObjectID(id) },
    { $set: { space: newSpace } },
    (err, result) => {
      if (err) {
        return next(err);
      }

      // Return the updated lesson
      req.collection.findOne({ _id: new ObjectID(id) }, (error, updatedLesson) => {
        if (error) {
          return next(error);
        }

        res.json(updatedLesson);
      });
    }
  );
});

// NEW POST REQUEST FOR ORDER DETAILS
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
    // Add any other order details you want to include
  };

  db.collection("Orders").insert(orderDetails, (e, results) => {
    if (e) return next(e);

    // Update lesson space based on cart items
    req.body.cartitems.forEach((cartItem) => {
      const lessonId = cartItem.lessonId;
      const quantityOrdered = cartItem.quantity;

      // Fetch lesson from the collection
      req.collection.findOne({ _id: new ObjectID(lessonId) }, (error, lesson) => {
        if (error) {
          console.error("Error fetching lesson for update:", error);
          // Handle the error as needed
        } else {
          // Calculate the new space for the lesson
          const newSpace = lesson.space - quantityOrdered;

          // Update the lesson's space in the database
          req.collection.updateOne(
            { _id: new ObjectID(lessonId) },
            { $set: { space: newSpace } },
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error("Error updating lesson space:", updateErr);
                // Handle the update error as needed
              } else {
                console.log("Lesson space updated successfully:", updateResult);
              }
            }
          );
        }
      });
    });

    res.status(200).json({ message: "Order submitted successfully!" });
  });
});


// ... Your existing server.js code ...

// ... Your existing server.js code ...

const port = process.env.PORT || portNum;

// Start the server on port 8000
app.listen(port, () => {
  console.log("Running on Port " + portNum);
});
