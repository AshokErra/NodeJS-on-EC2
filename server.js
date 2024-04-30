const express = require("express");
const app = express();
const { resolve } = require("path");
const port = process.env.PORT || 3100;

// Importing the dotenv module to use environment variables:
require("dotenv").config();

const api_key = process.env.SECRET_KEY;

const stripe = require("stripe")(api_key);

// Import prom-client library
const prometheus = require('prom-client');

// Define a counter metric
const requestCounter = new prometheus.Counter({
    name: 'myapp_requests_total',
    help: 'Total number of requests received',
});

// Setting up the static folder:
app.use(express.static(resolve(__dirname, process.env.STATIC_DIR)));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
    requestCounter.inc();
    const path = resolve(process.env.STATIC_DIR + "/index.html");
    res.sendFile(path);
});

// Other routes...

app.post("/create-checkout-session/:pid", async (req, res) => {
    requestCounter.inc();
    const priceId = req.params.pid;
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${process.env.DOMAIN}/success?id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.DOMAIN}/cancel`,
        payment_method_types: ["card"],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        // allowing the use of promo-codes:
        allow_promotion_codes: true,
    });
    res.json({
        id: session.id,
    });
});

// Expose metrics for Prometheus at /metrics endpoint
app.get('/metrics', (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(prometheus.register.metrics());
});

// Server listening:
app.listen(port, () => {
    console.log(`Server listening on port: ${port}`);
    console.log(`You may access your app at: ${process.env.DOMAIN}`);
});
