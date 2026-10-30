import { test } from "node:test";
import assert from "node:assert/strict";
import { preparer, resoudre, catastrophe, ALL_ESSENCES, POWER } from "../scripts/logic.mjs";

test("32 essences exactement", () => {
  assert.equal(ALL_ESSENCES.length, 32);
  assert.equal(new Set(ALL_ESSENCES).size, 32);
});

test("deux essences partagées forment une Paire, les autres sont des impuretés", () => {
  // Exemple du document : Feuille de morelle noire / Moisissure des cryptes
  const r = preparer({
    ingredients: [["Mort", "Sommeil", "Sens", "Ombre"], ["Mort", "Ombre", "Chair"]],
    base: "liquide",
    method: "melange",
  });
  assert.deepEqual(r.actives.map((a) => a.essence), ["Mort", "Ombre"]);
  assert.equal(r.actives[0].puissance.name, "Paire");
  assert.deepEqual(r.impurities.sort(), ["Chair", "Sens", "Sommeil"].sort());
  assert.equal(r.dif, 10);
});

test("DIF = 10 + base + méthode, −3 si recette connue", () => {
  const ing = [["Soin", "Vie"], ["Soin", "Vie"]];
  assert.equal(preparer({ ingredients: ing, base: "solide", method: "distillation", options: { target: "Soin" } }).dif, 19);
  assert.equal(preparer({ ingredients: ing, base: "grasse", method: "melange", recipeKnown: true }).dif, 9);
});

test("distillation efface les impuretés et duplique un Actif", () => {
  const r = preparer({
    ingredients: [["Feu", "Eau"], ["Feu", "Air"]],
    base: "liquide",
    method: "distillation",
    options: { target: "Feu" },
  });
  assert.deepEqual(r.impurities, []);
  assert.equal(r.counts.Feu, 3);
  assert.equal(r.actives[0].puissance.name, "Trio");
});

test("transmutation déplace une essence", () => {
  const r = preparer({
    ingredients: [["Feu", "Eau"], ["Feu", "Air"]],
    base: "liquide",
    method: "transmutation",
    options: { from: "Feu", to: "Lumiere" },
  });
  assert.equal(r.counts.Feu, 1);
  assert.equal(r.counts.Lumiere, 1);
});

test("mélange : les Actifs non choisis sont ignorés", () => {
  const r = preparer({
    ingredients: [["Mort", "Ombre"], ["Mort", "Ombre"]],
    base: "liquide",
    method: "melange",
    options: { keep: ["Mort"] },
  });
  assert.deepEqual(r.actives.map((a) => a.essence), ["Mort"]);
});

test("validation des entrées", () => {
  assert.throws(() => preparer({ ingredients: [["Feu"]], base: "liquide", method: "melange" }));
  assert.throws(() => preparer({ ingredients: [["Inconnu"], ["Feu"]], base: "liquide", method: "melange" }));
  assert.throws(() => preparer({ ingredients: [["Feu"], ["Feu"]], base: "solide", method: "fermentation" }));
});

test("résolution du jet", () => {
  assert.equal(resoudre({ nat: 20, total: 22, dif: 15, impuretes: 0 }).issue, "succes_critique");
  assert.equal(resoudre({ nat: 1, total: 3, dif: 15, impuretes: 2 }).issue, "echec_critique");
  assert.equal(resoudre({ nat: 10, total: 14, dif: 14, impuretes: 0 }).issue, "succes");
  assert.equal(resoudre({ nat: 10, total: 13, dif: 14, impuretes: 0 }).issue, "echec");
  // total ≤ DIF − 10 : échec critique même sans nat 1
  assert.equal(resoudre({ nat: 8, total: 4, dif: 14, impuretes: 1 }).issue, "echec_critique");
});

test("table des catastrophes", () => {
  assert.equal(catastrophe(1).nom, "Pestilence");
  assert.equal(catastrophe(6).nom, "Heureuse surprise");
  assert.throws(() => catastrophe(7));
});

test("paliers de puissance", () => {
  assert.equal(POWER[5].dice, "7d6");
  assert.equal(POWER[5].bonus, 10);
});
