// Usage: node scripts/hash-password.js "your-new-password"
// Prints a bcrypt hash to paste into .env.local as ADMIN_PASSWORD_HASH.
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js "your-new-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

// Next.js's env loader treats unescaped `$` as variable-expansion syntax
// (e.g. "$2b" looks like a variable reference), which corrupts a bcrypt hash
// pasted in plain. Escaping each `$` as `\$` stops that, so print the
// ready-to-paste line directly instead of the raw hash.
console.log(`ADMIN_PASSWORD_HASH=${hash.replace(/\$/g, "\\$")}`);
