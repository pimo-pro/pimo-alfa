#!/usr/bin/env node
/* eslint-disable no-console */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_MAX = 10;

function suffix(pieceNumber, pieceDigits) {
  const max = 10 ** pieceDigits - 1;
  const safe = ((Math.max(1, Math.floor(pieceNumber)) - 1) % max) + 1;
  return String(safe).padStart(pieceDigits, "0");
}

function deterministicPrefix(seed, len) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  let out = "";
  let current = hash >>> 0;
  for (let i = 0; i < len; i += 1) {
    current = (Math.imul(current, 1103515245) + 12345) >>> 0;
    out += ALPHABET[current % ALPHABET.length];
  }
  return out;
}

function buildToken(seed, pieceNumber, pieceDigits) {
  const prefixLen = Math.max(1, TOKEN_MAX - pieceDigits);
  return `${deterministicPrefix(seed, prefixLen)}${suffix(pieceNumber, pieceDigits)}`.slice(0, TOKEN_MAX);
}

function run() {
  const pieceDigits = Number.parseInt(process.env.PIECE_DIGITS || "3", 10);
  const safeDigits = pieceDigits <= 2 ? 2 : pieceDigits >= 4 ? 4 : 3;
  const total = Number.parseInt(process.env.TOKEN_COUNT || "10000", 10);
  const seen = new Set();
  let invalid = 0;
  let collisions = 0;

  for (let i = 1; i <= total; i += 1) {
    let token = buildToken(`project:box:item-${i}:${i}`, i, safeDigits);
    if (seen.has(token)) {
      for (let attempt = 1; attempt <= 16; attempt += 1) {
        const candidate = buildToken(`project:box:item-${i}:${i}:retry:${attempt}`, i, safeDigits);
        if (!seen.has(candidate)) {
          token = candidate;
          break;
        }
      }
    }
    if (!/^[A-Z0-9]{1,10}$/.test(token)) invalid += 1;
    if (token.length > 10) invalid += 1;
    if (!token.endsWith(suffix(i, safeDigits))) invalid += 1;
    if (seen.has(token)) collisions += 1;
    seen.add(token);
  }

  const result = {
    generated: total,
    unique: seen.size,
    collisions,
    invalid,
    pieceDigits: safeDigits,
  };
  console.log(JSON.stringify(result, null, 2));
  if (collisions > 0 || invalid > 0) process.exit(1);
}

run();
