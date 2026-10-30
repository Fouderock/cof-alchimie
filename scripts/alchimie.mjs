// Couche Foundry VTT (v13) : formulaire de préparation, jet et message de chat.
import { ALL_ESSENCES, ESSENCES, BASES, METHODS, preparer, resoudre, catastrophe } from "./logic.mjs";

const MODULE_ID = "cof-alchimie";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const options = (items, selected = "") =>
  items.map((v) => `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(v)}</option>`).join("");

function essenceChecks(prefix) {
  return Object.entries(ESSENCES)
    .map(([famille, liste]) => `<fieldset style="border:1px solid #888;margin:4px 0;padding:4px">
      <legend>${esc(famille)}</legend>
      ${liste.map((e) => `<label style="display:inline-block;width:48%;"><input type="checkbox" name="${prefix}" value="${esc(e)}"> ${esc(e)}</label>`).join("")}
    </fieldset>`)
    .join("");
}

function formContent() {
  return `
  <div style="max-height:65vh;overflow-y:auto;padding-right:8px;">
  <form class="cof-alchimie">
    <h3>Ingrédient 1 (cocher 1 à 5 essences)</h3>${essenceChecks("ing1")}
    <h3>Ingrédient 2 (cocher 1 à 5 essences)</h3>${essenceChecks("ing2")}
    <div class="form-group"><label>Base</label>
      <select name="base">${options(Object.keys(BASES).map((k) => k), "liquide")}</select></div>
    <div class="form-group"><label>Méthode</label>
      <select name="method">${options(Object.keys(METHODS), "melange")}</select></div>
    <h3>Cibles de méthode (si besoin)</h3>
    <div class="form-group"><label>Cible 1 (infusion, macération, distillation, fermentation)</label>
      <select name="target1"><option value="">—</option>${options(ALL_ESSENCES)}</select></div>
    <div class="form-group"><label>Cible 2 (fermentation)</label>
      <select name="target2"><option value="">—</option>${options(ALL_ESSENCES)}</select></div>
    <div class="form-group"><label>Transmutation : essence à changer</label>
      <select name="from"><option value="">—</option>${options(ALL_ESSENCES)}</select></div>
    <div class="form-group"><label>Transmutation : nouvelle essence</label>
      <select name="to"><option value="">—</option>${options(ALL_ESSENCES)}</select></div>
    <h3>Jet</h3>
    <div class="form-group"><label>Modificateur d'INT</label><input type="number" name="int" value="0"></div>
    <div class="form-group"><label>Bonus d'Artisanat</label><input type="number" name="art" value="0"></div>
    <div class="form-group"><label><input type="checkbox" name="known"> Recette connue (−3 à la DIF)</label></div>
  </form>
  </div>`;
}

function readForm(form) {
  const data = new FormData(form);
  const get = (k) => (data.get(k) ?? "").toString();
  const ing = (p) => data.getAll(p).map(String).filter(Boolean);
  const targets = [get("target1"), get("target2")].filter(Boolean);
  return {
    ingredients: [ing("ing1"), ing("ing2")],
    base: get("base"),
    method: get("method"),
    options: { target: targets[0], targets, from: get("from") || undefined, to: get("to") || undefined },
    recipeKnown: data.get("known") === "on",
    int: Number(get("int")) || 0,
    art: Number(get("art")) || 0,
  };
}

function resultHtml(prep, res, roll, nat) {
  const actives = prep.result.actives.length
    ? prep.result.actives.map((a) => `<li>${esc(a.essence)} — ${esc(a.puissance.name)} (${esc(a.puissance.dice)}, bonus ${a.puissance.bonus >= 0 ? "+" : ""}${a.puissance.bonus} / malus ${a.puissance.malus})</li>`).join("")
    : "<li>Aucun Actif</li>";
  const imp = prep.result.impurities.length ? esc(prep.result.impurities.join(", ")) : "aucune";
  let extra = "";
  if (res.catastrophes) {
    const n = typeof res.catastrophes === "number" ? res.catastrophes : res.catastrophes;
    const dieSize = res.issue === "echec" ? 4 : 6;
    const count = res.issue === "echec" ? 1 : n;
    const rolls = [];
    for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * dieSize) + 1);
    extra = rolls
      .map((d) => {
        const c = catastrophe(Math.min(d, 6));
        return `<p><strong>Catastrophe (d${dieSize} = ${d}) :</strong> ${esc(c.nom)} — ${esc(c.effet)}</p>`;
      })
      .join("");
  }
  return `
  <div class="cof-alchimie-result">
    <p><strong>${esc(res.libelle)}</strong> — jet ${roll.total} (d20 = ${nat}) contre DIF ${prep.result.dif}</p>
    <p><em>${esc(res.details)}</em></p>
    <p><strong>Actifs :</strong></p><ul>${actives}</ul>
    <p><strong>Impuretés :</strong> ${imp}</p>
    ${extra}
  </div>`;
}

async function preparation() {
  const { DialogV2 } = foundry.applications.api;
  await DialogV2.prompt({
    window: { title: "Préparation alchimique" },
    content: formContent(),
    ok: {
      label: "Préparer",
      callback: async (event, button) => {
        const prep = readForm(button.form);
        try {
          prep.result = preparer({ ingredients: prep.ingredients, base: prep.base, method: prep.method,
            options: prep.options, recipeKnown: prep.recipeKnown });
        } catch (err) {
          ui.notifications.error(err.message);
          return;
        }
        const roll = await new Roll("1d20 + @int + @art", { int: prep.int, art: prep.art }).evaluate();
        const nat = roll.dice[0].total;
        const res = resoudre({ nat, total: roll.total, dif: prep.result.dif, impuretes: prep.result.impurities.length });
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker(),
          content: resultHtml(prep, res, roll, nat),
          flags: { [MODULE_ID]: { dif: prep.result.dif } },
        });
      },
    },
    rejectClose: false,
  });
}

Hooks.once("init", () => {
  game.modules.get(MODULE_ID).api = { preparation };
});

Hooks.once("ready", () => {
  game[MODULE_ID] = { preparation };
  console.log(`${MODULE_ID} | prêt — macro : game['${MODULE_ID}'].preparation()`);
});
