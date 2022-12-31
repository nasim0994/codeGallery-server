const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.port || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.mongoDB_user}:${process.env.mongoDB_password}@cluster0.bnskqpv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.jwt_token, function (error, decoded) {
    if (error) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const usersCollection = client.db("CodeGallery").collection("users");
    const blogsCollection = client.db("CodeGallery").collection("blogs");
    const commentsCollection = client.db("CodeGallery").collection("comments");
    const categorysCollection = client
      .db("CodeGallery")
      .collection("categorys");

    // Jwt token send
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (!user) {
        return res.status(403).send({ accessToken: "" });
      }

      const token = jwt.sign({ email }, process.env.jwt_token);
      res.send({ accessToken: token });
    });

    // Create user save database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const filetr = { email: user.email };
      const oldUser = await usersCollection.findOne(filetr);
      if (oldUser) {
        return { message: "already added user" };
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // All users
    app.get("/users", verifyJWT, async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // Singel User
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const user = await usersCollection.findOne(filter);
      res.send(user);
    });

    // user Admin check
    app.get("/users/admin", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ Admin: user?.role === "admin" });
    });

    // Delete User
    app.delete("/users/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // Get categorys
    app.get("/categorys", async (req, res) => {
      const categorys = await categorysCollection.find({}).toArray();
      res.send(categorys);
    });

    //Add a Blog
    app.post("/blogs", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const blog = req.body;
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    });

    // Get All Blogs
    app.get("/blogs", async (req, res) => {
      const category = req.query.category;
      if (category) {
        const filter = { category: category };
        const blogs = await blogsCollection.find(filter).toArray();
        return res.send(blogs);
      }
      const blogs = await blogsCollection.find({}).toArray();
      res.send(blogs);
    });

    // Get Last Blogs
    app.get("/recentBlog", async (req, res) => {
      const blogs = await (
        await blogsCollection.find({}).limit(5).toArray()
      ).reverse();
      res.send(blogs);
    });

    // Get a Blogs
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const blog = await blogsCollection.findOne(filter);
      res.send(blog);
    });

    // Delete a Blogs
    app.delete("/blogs/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await blogsCollection.deleteOne(filter);
      res.send(result);
    });

    // Comments post
    app.post("/comments", async (req, res) => {
      const comment = req.body;
      const result = await commentsCollection.insertOne(comment);
      res.send(result);
    });

    // Update blogs comment Length
    app.put("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };

      const blog = await blogsCollection.findOne(filter);

      const options = { upsert: true };
      const updateDoc = {
        $set: {
          comment: blog.comment + 1,
        },
      };
      const result = await blogsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Get comments by id
    app.get("/comments/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { blogId: id };
      const comments = await (
        await commentsCollection.find(filter).toArray()
      ).reverse();
      res.send(comments);
    });

    //
    //
    //
  } catch {
    console.log(error);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is Running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
