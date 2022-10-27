const express = require('express');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRETE_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const port = 4000;

const app = express()

app.use(express.json())
app.use(cors());
app.use(express.urlencoded({extended:true}))



const uri = process.env.MONGODB_URI;
function mongodbConnection () {     
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    client.connect(err => {
        const orderCollection = client.db("stripe").collection("order");
        const paymentCollection = client.db("stripe").collection("payment");
        app.post('/order', async (req, res) => {
            const {title, price, quantity, category} = req.body.product;            
            const {email} = req.body;            
            const result = await orderCollection.insertOne({title, price, quantity, category, email})
       
            res.status(201).json({
                message: 'Order Successfully Placed',
                document: result
            })
        })

        app.get('/getAllOrders', async (req, res) => {
           try {
            const email = req.query.email;       
            const query = {email: email}
            const cursor = orderCollection.find(query)            
            const orders = await cursor.toArray();

            res.status(200).json({
                document: orders, 
                success: true
            })
           } catch (error) {
            res.send("Error", error).json({success: false})
            console.log(error)
           }
        })
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await orderCollection.findOne(query);
          
            res.json({document: order, success: true})
        })  

        app.patch('/order/:id', async (req, res) => {
            const payment = req.body;
            console.log(payment)
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const updatedDoc = {
                $set: {
                    paid: true, 
                    transactionId: payment.transactionId
                }
            }
            const updatedOrder = await orderCollection.updateOne(query, updatedDoc);
            const result = await paymentCollection.insertOne(payment)
          
           res.send(updatedOrder)
        })  

        app.post('/create-payment-intent', async (req, res) => {
           try {
            const {amount} = req.body;
           
            const price = amount * 100;  
            

            const paymentIntent = await stripe.paymentIntents.create({
                amount: price, 
                currency: "usd", 
                payment_method_types: ['card'],          
                

            })
            
            res.send({clientSecret: paymentIntent.client_secret})
            
           } catch (error) {
            console.log(error)
           }
        })


        console.log('database connected successfully')
    
    });
} 
mongodbConnection()



app.get('/', (req, res)=> {
    res.send('Local server is ok')
})

app.listen(port, () => {
    console.log(`Server is running at port:http://localhost:${port}`)
})

