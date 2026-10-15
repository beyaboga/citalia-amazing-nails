#!/usr/bin/env node
/**
 * Genera la línea SQL para cambiarle la contraseña a un usuario, sin tocar la
 * base de datos: la contraseña se escribe oculta y solo se imprime su hash
 * bcrypt (el mismo formato que valida /api/auth/login).
 *
 * Uso:  node scripts/hash-password.js correo@ejemplo.com
 * Luego pegue la línea UPDATE que imprime en el SQL Editor de Supabase
 * (o en psql contra la base local).
 */
const readline = require('readline');
const bcrypt = require('bcryptjs');

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Uso: node scripts/hash-password.js correo@ejemplo.com');
  process.exit(1);
}

// Una sola interfaz para ambas preguntas; lo que se teclea no aparece en pantalla.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let currentQuestion = '';
rl._writeToOutput = (s) => {
  if (s.includes(currentQuestion)) rl.output.write(currentQuestion);
};

// Cola de líneas: así no se pierde ninguna si llegan antes de hacer la pregunta.
const lines = [];
let waiting = null;
rl.on('line', (line) => {
  rl.output.write('\n');
  if (waiting) {
    const resolve = waiting;
    waiting = null;
    resolve(line);
  } else {
    lines.push(line);
  }
});

function askHidden(question) {
  currentQuestion = question;
  rl.setPrompt(question);
  rl.prompt();
  if (lines.length > 0) return Promise.resolve(lines.shift());
  return new Promise((resolve) => {
    waiting = resolve;
  });
}

(async () => {
  const pass1 = await askHidden('Nueva contraseña: ');
  const pass2 = await askHidden('Repita la contraseña: ');
  rl.close();
  if (pass1 !== pass2) {
    console.error('Las contraseñas no coinciden. No se generó nada.');
    process.exit(1);
  }
  if (pass1.length < 8) {
    console.error('Use al menos 8 caracteres. No se generó nada.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(pass1, 10);
  console.log('\nPegue esta línea en el SQL Editor y presione Run:\n');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE lower(email) = '${email.replace(/'/g, "''")}';\n`);
})();
