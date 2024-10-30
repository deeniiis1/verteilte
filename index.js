const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = 6010;
app.listen(PORT, () => {
    console.info(`Server is running on port ${PORT}`);
});

// In-Memory-Speicher für Orders
const orders = [];

// POST-Methode zum Erstellen einer neuen Order
app.post('/api/orders', (req, res) => {
    const { name, isin, amount } = req.body;

    if (!name || !isin || !amount) {
        return res.status(400).send({ error: "Name, ISIN und Menge sind erforderlich" });
    }

    const id = randomBytes(4).toString('hex'); // 32-Bit-Hexadezimal-ID

    const newOrder = {
        id: id,
        name: name,
        isin: isin,
        amount: amount,
        price: 0,
        state: 0 // 0 = erstellt
    };

    orders.push(newOrder);

    res.status(201).send(newOrder);
});

// GET-Methode für das Abrufen aller Orders
app.get('/api/orders', (req, res) => {
    const { state } = req.query;

    if (state) {
        const filteredOrders = orders.filter(order => order.state == state);
        return res.status(200).send(filteredOrders);
    }

    res.status(200).send(orders);
});

// GET-Methode für das Abrufen einer einzelnen Order anhand der ID
app.get('/api/orders/:id', (req, res) => {
    const { id } = req.params;

    const order = orders.find(order => order.id === id);

    if (!order) {
        return res.status(404).send({ error: "Order nicht gefunden" });
    }

    res.status(200).send(order);
});

// PATCH-Methode zum Aktualisieren der Menge einer Order
app.patch('/api/orders/:id/amount', (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    const order = orders.find(order => order.id === id);

    if (!order) {
        return res.status(404).send({ error: "Order nicht gefunden" });
    }

    if (order.state !== 0) {
        return res.status(400).send({ error: "Nur Orders im Zustand 0 können aktualisiert werden." });
    }

    order.amount = amount;

    res.status(200).send(order);
});

// Order states
const STATE_CREATED = 0;
const STATE_PROCESSED = 1;
const STATE_COMPLETED = 2;

const validTransitions = {
    [STATE_CREATED]: [STATE_PROCESSED],
    [STATE_PROCESSED]: [STATE_COMPLETED]
};

// Helper function to find an order by ID
function getOrder(id) {
    const order = orders.find(order => order.id === id);
    if (!order) {
        throw new Error('Order not found');
    }
    return order;
}

// PATCH-Methode zum Aktualisieren des Status einer Order
app.patch('/api/orders/:id/state', (req, res) => {
    const id = req.params.id;
    const newState = req.body.state;

    try {
        if (newState == null) throw new Error('You need to define a state');

        const order = getOrder(id);

        // Überprüfe, ob der neue Zustand eine gültige Übergangsregel ist
        if (validTransitions[order.state]?.includes(newState)) {
            console.info(`Changed state of order ${id} from ${order.state} to ${newState}`);
            order.state = newState;
            res.status(200).send(order);
        } else {
            throw new Error("This state change is not possible.");
        }
    } catch (e) {
        console.warn({ error: e.message });
        res.status(400).send({ error: e.message });
    }
});

// DELETE-Methode zum Löschen einer Order
app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;

    const index = orders.findIndex(order => order.id === id);

    if (index === -1) {
        return res.status(404).send({ error: "Order nicht gefunden" });
    }

    orders.splice(index, 1);

    res.status(204).send();
});
