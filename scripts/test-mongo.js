const path = require('path');
const vcPath = 'C:\\Program Files\\Microsoft OneDrive\\26.173.0906.0008';
process.env.PATH = `${vcPath};${process.env.PATH}`;

const { MongoMemoryServer } = require('mongodb-memory-server');

async function test() {
  try {
    console.log('Attempting MongoMemoryServer with MSVC in PATH...');
    const fs = require('fs');
    const localBin = path.join(__dirname, '..', 'node_modules', '.cache', 'mongodb-memory-server', 'mongod-x64-win32-8.2.6.exe');
    const binaryConfig = fs.existsSync(localBin) ? { systemBinary: localBin } : { version: '8.2.6' };
    const mongod = await MongoMemoryServer.create({
      binary: binaryConfig
    });
    const uri = mongod.getUri();
    console.log('SUCCESS! Real MongoDB mongod running at:', uri);
    await mongod.stop();
    console.log('MongoDB server stopped gracefully.');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
