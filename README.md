# COF - Alchimie

Module Foundry VTT (v13) qui implémente le système d'alchimie de Chroniques Oubliées Fantasy : essences, bases, méthodes, jets et table des catastrophes.

## Utilisation

Dans une macro (type script) :

```js
game["cof-alchimie"].preparation();
```

Le formulaire demande deux ingrédients (1 à 5 essences chacun), une base, une méthode, les cibles éventuelles, la recette connue, puis les modificateurs d'INT et d'Artisanat. Le jet est publié dans le chat.

## Logique

- `scripts/logic.mjs` : calcul pur (comptage des Paires, DIF, résolution, catastrophes). Aucune dépendance à Foundry.
- `scripts/alchimie.mjs` : formulaire, jet et message de chat.
- `test/logic.test.mjs` : tests unitaires (`node --test test/logic.test.mjs`).

## Limites de la v0.1

- Pas de lecture automatique de l'INT et de l'Artisanat depuis la fiche du personnage : saisie manuelle.
- Pas de contrôle de la règle « deux fois le même type d'effet » (le document ne définit pas les types).
- La Fusion (effet narratif) reste à valider par le MJ.
- Les recettes ne sont pas encore des items : la case « recette connue » est manuelle.
- Les catastrophes sont tirées avec `Math.random`, pas avec des jets Foundry.
