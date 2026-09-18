const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '..', '.env');

// Read DATABASE_URL from process.env or fallback to .env file
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
  if (match) {
    dbUrl = match[1];
  }
}

if (!fs.existsSync(schemaPath)) {
  console.error('[prepare-db] prisma/schema.prisma not found!');
  process.exit(0);
}

let schemaContent = fs.readFileSync(schemaPath, 'utf8');
const isPostgres = dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'));
const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

const providerRegex = /(datasource\s+db\s*\{[^}]*provider\s*=\s*")([^"]+)(")/s;
const match = schemaContent.match(providerRegex);

if (match && match[2] !== targetProvider) {
  schemaContent = schemaContent.replace(providerRegex, `$1${targetProvider}$3`);
  fs.writeFileSync(schemaPath, schemaContent, 'utf8');
  console.log(`[prepare-db] Updated prisma/schema.prisma datasource provider: ${match[2]} -> ${targetProvider}`);
} else {
  console.log(`[prepare-db] Datasource provider is already "${targetProvider}".`);
}
