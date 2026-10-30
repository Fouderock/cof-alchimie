// Logique pure du système d'alchimie (aucune dépendance à Foundry).
// Source : document « L'Alchimie — Système de création — Chroniques Oubliées Fantasy » (v5).

/** Les 32 mots d'essence, par famille. */
export const ESSENCES = {
  vitalite: ["Soin", "Vie", "Mort", "Douleur", "Chair", "Sang", "Os", "Souffle"],
  elements: ["Feu", "Froid", "Acide", "Eclair", "Pierre", "Eau", "Air", "Metal"],
  esprit: ["Mental", "Sens", "Son", "Sommeil", "Image", "Emotion", "Ombre", "Lumiere"],
  forces: ["Magie", "Mouvement", "Lien", "Changement", "Vegetal", "Animal", "Espace", "Temps"],
};
export const ALL_ESSENCES = Object.values(ESSENCES).flat();

/** Bases : forme de livraison, DIF de base. */
export const BASES = {
  liquide: { label: "Liquide", dif: 0 },
  grasse: { label: "Grasse", dif: 2 },
  aerienne: { label: "Aérienne", dif: 4 },
  solide: { label: "Solide", dif: 6 },
};

/** Méthodes : DIF de méthode, besoin de cibles. */
export const METHODS = {
  melange: { label: "Mélange (défaut)", dif: 0, standard: true, targets: 0 },
  infusion: { label: "Infusion", dif: 0, standard: true, targets: 1 },
  maceration: { label: "Macération (12 h)", dif: 0, standard: true, targets: 1 },
  distillation: { label: "Distillation (atelier)", dif: 3, standard: false, targets: 1 },
  fermentation: { label: "Fermentation (atelier)", dif: 3, standard: false, targets: 2 },
  transmutation: { label: "Transmutation (atelier)", dif: 3, standard: false, targets: 0 },
};

/** Actifs selon le nombre d'apparitions. */
export const POWER = {
  2: { name: "Paire", dice: "1d8", bonus: 1, malus: -1, note: "Effet de base" },
  3: { name: "Trio", dice: "2d8", bonus: 2, malus: -2, note: "Effet solide" },
  4: { name: "Quatuor", dice: "4d6", bonus: 4, malus: -4, note: "Effet puissant" },
  5: { name: "Quintessence", dice: "7d6", bonus: 10, malus: -10, note: "Légendaire" },
};

/** Table des catastrophes (d6). Un échec simple utilise 1d4 (résultats 1 à 4). */
export const CATASTROPHES = [
  { nom: "Pestilence", effet: "Odeur abominable — malus −4 aux jets sociaux dans un rayon de 5 m (1 heure)." },
  { nom: "Effet inversé", effet: "La préparation produit l'effet opposé (Soin → Dégâts). Même niveau d'Actif." },
  { nom: "Explosion", effet: "L'Actif se libère en dégâts bruts dans un rayon de 2 m (REF DIF 12)." },
  { nom: "Mutation", effet: "Transformation temporaire liée au mot-clé de l'impureté (1d6 heures)." },
  { nom: "Auto-inoculation", effet: "L'alchimiste est lui-même la première cible de sa propre préparation." },
  { nom: "Heureuse surprise", effet: "Actif +1 apparition inattendue. Le MJ choisit un effet bonus lié aux mots-clés." },
];

/**
 * Valide une préparation et calcule sa composition.
 * @param {object} prep
 * @param {string[][]} prep.ingredients  deux listes d'essences (1 à 5, doublons permis)
 * @param {string} prep.base             clé de BASES
 * @param {string} prep.method           clé de METHODS
 * @param {object} [prep.options]        cibles de méthode : {target, targets[], from, to, keep[]}
 * @param {boolean} [prep.recipeKnown]   recette connue : −3 à la DIF
 * @returns {object} composition, actifs, impuretés, DIF
 */
export function preparer(prep) {
  const { ingredients, base, method, options = {}, recipeKnown = false } = prep;
  if (!Array.isArray(ingredients) || ingredients.length !== 2)
    throw new Error("Une préparation demande exactement 2 ingrédients.");
  for (const ing of ingredients) {
    if (!Array.isArray(ing) || ing.length < 1 || ing.length > 5)
      throw new Error("Chaque ingrédient porte de 1 à 5 essences.");
    for (const e of ing) if (!ALL_ESSENCES.includes(e)) throw new Error(`Essence inconnue : ${e}`);
  }
  if (!BASES[base]) throw new Error(`Base inconnue : ${base}`);
  if (!METHODS[method]) throw new Error(`Méthode inconnue : ${method}`);

  // 1. Comptage des apparitions : les essences partagées deviennent Actif.
  const counts = Object.fromEntries(ALL_ESSENCES.map((e) => [e, 0]));
  for (const ing of ingredients) for (const e of ing) counts[e] += 1;

  // 2. Application de la méthode.
  const m = METHODS[method];
  const targets = [options.target, ...(options.targets ?? [])].filter(Boolean);
  if (targets.length < m.targets)
    throw new Error(`La méthode ${m.label} demande ${m.targets} cible(s).`);

  const actifs = () => ALL_ESSENCES.filter((e) => counts[e] >= 2);
  const impuretes = () => ALL_ESSENCES.filter((e) => counts[e] === 1);

  switch (method) {
    case "melange": {
      // Choisit librement parmi les Actifs : les autres sont ignorés.
      if (options.keep) {
        for (const e of actifs()) if (!options.keep.includes(e)) counts[e] = 0;
      }
      break;
    }
    case "infusion": {
      const t = options.target;
      if (counts[t] !== 1) throw new Error("L'infusion vise une impureté.");
      counts[t] += 1;
      break;
    }
    case "maceration": {
      const t = options.target;
      if (counts[t] < 2) throw new Error("La macération duplique un Actif.");
      counts[t] += 1;
      break;
    }
    case "distillation": {
      const t = options.target;
      for (const e of impuretes()) counts[e] = 0;
      if (counts[t] < 2) throw new Error("La distillation duplique un Actif.");
      counts[t] += 1;
      break;
    }
    case "fermentation": {
      const [a, b] = targets;
      if (a === b) throw new Error("La fermentation duplique deux Actifs distincts.");
      for (const t of [a, b]) {
        if (counts[t] < 2) throw new Error("La fermentation duplique deux Actifs.");
        counts[t] += 1;
      }
      break;
    }
    case "transmutation": {
      const { from, to } = options;
      if (!from || !to || counts[from] < 1) throw new Error("La transmutation transforme une essence présente.");
      if (!ALL_ESSENCES.includes(to)) throw new Error(`Essence inconnue : ${to}`);
      counts[from] -= 1;
      counts[to] += 1;
      break;
    }
  }

  // 3. Résultat : Actifs (≥ 2 apparitions) et impuretés (1 apparition).
  const actives = actifs().map((e) => ({
    essence: e,
    apparitions: counts[e],
    puissance: POWER[Math.min(counts[e], 5)],
  }));
  const impurities = impuretes();
  const dif = 10 + BASES[base].dif + m.dif - (recipeKnown ? 3 : 0);

  return { counts, actives, impurities, dif, base, method };
}

/**
 * Résout le jet d'artisanat.
 * @param {object} args
 * @param {number} args.nat      résultat du d20 (1 à 20)
 * @param {number} args.total    d20 + INT + Artisanat
 * @param {number} args.dif      DIF de la préparation
 * @param {number} args.impuretes nombre d'impuretés
 */
export function resoudre({ nat, total, dif, impuretes }) {
  if (nat === 20 || total >= dif + 10) {
    return { issue: "succes_critique", libelle: "Succès critique", actifBonus: 1,
      recetteInedite: true, difProchainJet: -3, details: "Actif +1 apparition gratuite. Recette inédite notée, DIF −3 aux prochains jets." };
  }
  if (nat === 1 || total <= dif - 10) {
    return { issue: "echec_critique", libelle: "Échec critique",
      catastrophes: impuretes, details: `Chaque impureté se réveille : 1d6 par impureté (${impuretes}) sur la table des catastrophes.` };
  }
  if (total >= dif) {
    return { issue: "succes", libelle: "Succès", details: "Préparation réussie, effet normal." };
  }
  return { issue: "echec", libelle: "Échec", catastrophes: 1,
    details: "Préparation créée mais imparfaite : 1 effet secondaire (1d4 sur la table des catastrophes)." };
}

/** Retourne la catastrophe pour un d6 (1 à 6). */
export function catastrophe(d) {
  if (!Number.isInteger(d) || d < 1 || d > 6) throw new Error("La table des catastrophes va de 1 à 6.");
  return CATASTROPHES[d - 1];
}
