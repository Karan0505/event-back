const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Event = require('./models/Event');

dotenv.config();

const seedEvents = async () => {
    try {
        await connectDB();
        console.log('\n🌱 Starting database seed...\n');

        // ── Create organizer user if not exists ──
        let organizer = await User.findOne({ role: 'organizer' });
        if (!organizer) {
            organizer = await User.create({
                name: 'Event Organizer',
                email: 'organizer@events.com',
                password: 'organizer123',
                role: 'organizer',
            });
            console.log('✅ Created organizer user: organizer@events.com / organizer123');
        } else {
            console.log(`✅ Using existing organizer: ${organizer.email}`);
        }

        // ── Create admin user if not exists ──
        let admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            admin = await User.create({
                name: 'Admin User',
                email: 'karanparmar0915@gmail.com',
                password: 'admin123',
                role: 'admin',
            });
            console.log('✅ Created admin user: karanparmar0915@gmail.com / admin123');
        } else {
            console.log(`✅ Using existing admin: ${admin.email}`);
        }

        // ── Create attendee user if not exists ──
        let attendee = await User.findOne({ role: 'attendee' });
        if (!attendee) {
            attendee = await User.create({
                name: 'John Doe',
                email: 'john@events.com',
                password: 'john1234',
                role: 'attendee',
            });
            console.log('✅ Created attendee user: john@events.com / john1234');
        } else {
            console.log(`✅ Using existing attendee: ${attendee.email}`);
        }

        // ── Sample Events ──
        const sampleEvents = [
            {
                title: 'TechCon 2026 — Future of AI',
                description: 'Join industry leaders for an immersive deep-dive into large language models, generative AI, and what the future holds for artificial intelligence in business. Featuring hands-on workshops, keynote speakers from Google, Microsoft, and OpenAI, and networking sessions.',
                date: new Date('2026-03-15'),
                time: '09:00',
                location: 'Bangalore International Exhibition Centre, Bangalore',
                category: 'Technology',
                price: 2999,
                image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Indie Music Festival',
                description: 'A two-day celebration of independent music featuring 20+ emerging artists across 3 stages. From electronic beats to acoustic soul, discover the sounds that are shaping the underground music scene. Food trucks, art installations, and after-parties included.',
                date: new Date('2026-03-22'),
                time: '16:00',
                location: 'Mehboob Studio Grounds, Mumbai',
                category: 'Music',
                price: 1499,
                image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Startup Pitch Night',
                description: 'Watch 10 promising early-stage startups pitch their ideas to a panel of seasoned venture capitalists and angel investors. Network with founders, investors, and fellow entrepreneurs. Previous editions have led to over ₹50 crore in funding.',
                date: new Date('2026-04-05'),
                time: '18:30',
                location: 'WeWork Galaxy, Residency Road, Bangalore',
                category: 'Business',
                price: 799,
                image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Marathon for a Cause — Run for Education',
                description: 'Lace up for a 10K/21K marathon supporting underprivileged children\'s education. Route passes through scenic Marine Drive and ends at Gateway of India. Hydration stations every 3km, live tracking, and finisher medals for all participants.',
                date: new Date('2026-04-12'),
                time: '06:00',
                location: 'Marine Drive, Mumbai',
                category: 'Sports',
                price: 999,
                image: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Contemporary Art Exhibition — "Fragments"',
                description: 'Explore thought-provoking works by 15 contemporary Indian artists examining identity, memory, and urban life. The exhibition features paintings, sculptures, digital installations, and interactive pieces. Guided tours available twice daily.',
                date: new Date('2026-04-18'),
                time: '10:00',
                location: 'National Gallery of Modern Art, New Delhi',
                category: 'Art',
                price: 499,
                image: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Street Food Festival — Flavours of India',
                description: 'Taste your way through 50+ curated street food stalls representing every state of India. From Kolkata kathi rolls to Hyderabadi biryani, Goan vindaloo to Rajasthani dal baati. Live cooking demos by celebrity chefs, food competitions, and cultural performances.',
                date: new Date('2026-05-01'),
                time: '11:00',
                location: 'JLN Stadium Grounds, New Delhi',
                category: 'Food',
                price: 349,
                image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Hackathon: Code for Good',
                description: '48-hour hackathon challenging developers to build solutions for social impact. Themes include healthcare access, education technology, environmental monitoring, and financial inclusion. Prizes worth ₹5 lakhs, mentorship from industry experts, and job opportunities.',
                date: new Date('2026-05-10'),
                time: '09:00',
                location: 'IIIT Hyderabad Campus, Hyderabad',
                category: 'Technology',
                price: 199,
                image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Classical Music Night — Raaga & Rhythm',
                description: 'An enchanting evening of Indian classical music featuring sitar maestro Anoushka Shankar and tabla virtuoso Zakir Hussain (tribute performance). Experience the depth and beauty of Hindustani classical music under the stars in an open-air amphitheatre.',
                date: new Date('2026-05-20'),
                time: '19:00',
                location: 'Dilli Haat Open Air Theatre, New Delhi',
                category: 'Music',
                price: 1999,
                image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Entrepreneurship Summit 2026',
                description: 'India\'s premier business conference bringing together 500+ entrepreneurs, investors, and thought leaders. Three tracks: Scale-Up Strategies, Tech Innovation, and Social Entrepreneurship. Includes fireside chats, panel discussions, and 1-on-1 mentor meetings.',
                date: new Date('2026-06-01'),
                time: '08:30',
                location: 'Taj Palace Convention Centre, New Delhi',
                category: 'Business',
                price: 4999,
                image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Weekend Cricket Tournament',
                description: 'T20-format corporate cricket tournament open to all skill levels. 16 teams compete over two days. Professional umpires, live scorecard, commentary, and prize money for top 3 teams. Individual awards for Man of the Match and best bowler.',
                date: new Date('2026-06-14'),
                time: '07:00',
                location: 'Chinnaswamy Stadium Practice Grounds, Bangalore',
                category: 'Sports',
                price: 599,
                image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Pottery & Ceramics Workshop',
                description: 'Learn the ancient art of pottery in this hands-on beginner-friendly workshop. Work with clay on a wheel, learn hand-building techniques, and glaze your creations. All materials included. Take home 2 finished pieces after firing. Led by award-winning ceramic artist Priya Menon.',
                date: new Date('2026-06-22'),
                time: '10:00',
                location: 'The Clay Studio, Koramangala, Bangalore',
                category: 'Art',
                price: 1299,
                image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Community Meetup — Open Mic & Networking',
                description: 'Monthly community gathering with an open mic segment, lightning talks, and casual networking. Whether you want to share poetry, stand-up comedy, a business idea, or just meet interesting people — this is your stage. Snacks and beverages included.',
                date: new Date('2026-03-28'),
                time: '17:00',
                location: 'Social Café, Church Street, Bangalore',
                category: 'General',
                price: 149,
                image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800',
                organizer: organizer._id,
            },
            {
                title: 'Movie Premiere — "The Last Orbit"',
                description: 'Be the first to watch the highly anticipated sci-fi thriller "The Last Orbit". Experience breathtaking visual effects and a gripping storyline in IMAX 3D. Ticket includes a complimentary popcorn and soda combo, plus a chance to win exclusive movie merchandise in a lucky draw.',
                date: new Date('2026-04-10'),
                time: '21:00',
                location: 'PVR IMAX, VR Mall, Surat',
                category: 'Movies',
                price: 750,
                image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
                organizer: organizer._id,
            },
        ];

        // ── Clear existing events (optional — keeps it idempotent) ──
        const existingCount = await Event.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  Found ${existingCount} existing events. Clearing them...`);
            await Event.deleteMany({});
        }

        // ── Insert events ──
        const inserted = await Event.insertMany(sampleEvents);
        console.log(`\n🎉 Successfully seeded ${inserted.length} events!\n`);

        // ── Print summary ──
        console.log('📋 Events added:');
        console.log('─'.repeat(60));
        inserted.forEach((event, i) => {
            console.log(`  ${(i + 1).toString().padStart(2, '0')}. [${event.category.padEnd(10)}] ${event.title}`);
            console.log(`      📅 ${event.date.toLocaleDateString('en-IN')} | 📍 ${event.location.split(',')[0]} | 💰 ₹${event.price}`);
        });
        console.log('─'.repeat(60));

        console.log('\n👤 Test accounts:');
        console.log('   Organizer:  organizer@events.com      /  organizer123');
        console.log('   Admin:      karanparmar0915@gmail.com /  admin123');
        console.log('   Attendee:   john@events.com           /  john1234');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }
};

seedEvents();
