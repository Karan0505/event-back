require('dotenv').config();
const connectDB = require('./config/db');
const Event = require('./models/Event');

async function check() {
    await connectDB();
    const e = await Event.find();
    console.log(e.length, 'events found in DB');
    console.log(e.map(ev => ({ t: ev.title, cat: ev.category, d: ev.date })));
    process.exit(0);
}

check();
