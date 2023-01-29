const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d0ehoon.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// token function
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        const usersCollection = client.db('powerHack').collection('users');

        app.get('/users', async (req, res) => {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        });

        // get user by email
        app.get('/api/user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user?.email) {
                res.send({ verify: true, email: user?.email })
            }
            res.send({ verify: false })
        })

        // login 
        app.post('/api/login', async (req, res) => {
            const email = req.body.email;
            const password = req.body.password;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user?.password === password) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
                return res.send({ email: user?.email, accessToken: token });
            }
            else if (user?.email && user?.password !== password) {
                res.send({ message: 'wrong password' })
            }
            res.status(403).send({ message: 'user not found' })
        });

        //add & update  user
        app.put('/api/registration/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)

            res.send(result);
        })


    }
    finally {

    }
}

run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('power running');
})

app.listen(port, () => console.log(port))