const mongoose = require('mongoose');
const { Resolver } = require('dns').promises;

const connectDB = async () => {
    try {
        let uri = process.env.MONGO_URI;

        // If using mongodb+srv://, manually resolve SRV records using Google DNS
        if (uri.startsWith('mongodb+srv://')) {
            const resolver = new Resolver();
            resolver.setServers(['8.8.8.8', '8.8.4.4']);

            // Parse the SRV hostname from the URI
            const srvMatch = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?/);
            if (!srvMatch) throw new Error('Invalid mongodb+srv:// URI format');

            const [, user, pass, srvHost, dbPath = '', queryStr = ''] = srvMatch;

            // Resolve SRV records using Google DNS
            console.log(`🔍 Resolving SRV records for ${srvHost} via Google DNS...`);
            const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${srvHost}`);

            // Also resolve TXT records for connection options
            let txtOptions = '';
            try {
                const txtRecords = await resolver.resolveTxt(srvHost);
                txtOptions = txtRecords.flat().join('');
            } catch (e) {
                // TXT records are optional
            }

            // Build standard mongodb:// connection string
            const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(',');
            const dbName = dbPath || '/';

            // Merge query string params and TXT record options, avoiding duplicates
            const paramMap = new Map();

            // Parse TXT record options first (lower priority)
            if (txtOptions) {
                txtOptions.split('&').forEach(p => {
                    const [key, val] = p.split('=');
                    if (key) paramMap.set(key, val || '');
                });
            }

            // Parse query string params (higher priority, overwrites TXT)
            if (queryStr) {
                queryStr.substring(1).split('&').forEach(p => {
                    const [key, val] = p.split('=');
                    if (key) paramMap.set(key, val || '');
                });
            }

            // Ensure required params are present
            if (!paramMap.has('ssl') && !paramMap.has('tls')) paramMap.set('ssl', 'true');
            if (!paramMap.has('authSource')) paramMap.set('authSource', 'admin');

            const params = Array.from(paramMap.entries()).map(([k, v]) => `${k}=${v}`).join('&');
            uri = `mongodb://${user}:${pass}@${hosts}${dbName}?${params}`;
            console.log(`✅ SRV resolved to ${srvRecords.length} hosts`);
        }

        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
