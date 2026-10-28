// Privy identity parsing and placeholder emails, no network: npx tsx scripts/privy.test.ts
import assert from "node:assert/strict";
import { identityFromClaims } from "../lib/privy";
import { accountLabel, isPlaceholderEmail, placeholderEmail } from "../lib/account-email";

const did = "did:privy:cmabc123";
const ext = "0xAbCdEf0000000000000000000000000000000001";
const emb = "0x2222222222222222222222222222222222222222";

// email account with an embedded wallet; linked_accounts arrives as a JSON string
let id = identityFromClaims({ sub: did, linked_accounts: JSON.stringify([
  { type: "email", address: "Maya@Example.com" },
  { type: "wallet", address: emb, chain_type: "ethereum", wallet_client_type: "privy", connector_type: "embedded" },
]) });
assert.deepEqual(id, { did, email: "maya@example.com", wallet: emb, embeddedWallet: true });

// external wallet wins over the embedded one; Google email is used when there is no email account
id = identityFromClaims({ sub: did, linked_accounts: [
  { type: "wallet", address: emb, chain_type: "ethereum", wallet_client_type: "privy" },
  { type: "google_oauth", email: "joao@gmail.com" },
  { type: "wallet", address: ext, chain_type: "ethereum", wallet_client_type: "metamask", connector_type: "injected" },
] });
assert.equal(id.wallet, ext.toLowerCase()); assert.equal(id.embeddedWallet, false); assert.equal(id.email, "joao@gmail.com");

// wallet-only; solana wallets and junk are ignored
id = identityFromClaims({ sub: did, linked_accounts: [{ type: "wallet", address: "So1ana111", chain_type: "solana" }, { type: "wallet", address: ext }] });
assert.equal(id.email, null); assert.equal(id.wallet, ext.toLowerCase());
assert.deepEqual(identityFromClaims({ sub: did, linked_accounts: "not json" }), { did, email: null, wallet: null, embeddedWallet: false });
assert.throws(() => identityFromClaims({ sub: "user_1" }));

// placeholder emails for wallet-only accounts
const pe = placeholderEmail("did:privy:CMabc123");
assert.equal(pe, "cmabc123@users.buildoriel.com");
assert.ok(isPlaceholderEmail(pe)); assert.ok(!isPlaceholderEmail("maya@example.com")); assert.ok(!isPlaceholderEmail(null));
assert.equal(accountLabel({ id: "u1", email: pe }), "u1");
assert.equal(accountLabel({ id: "u1", email: "maya@example.com" }), "maya@example.com");
console.log("privy: ok");
