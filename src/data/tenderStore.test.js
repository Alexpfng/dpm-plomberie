import test from 'node:test';
import assert from 'node:assert/strict';
import { findQtyInCCTP } from './tenderStore.js';

test('returns a non-empty block for schema and calculation requirements', () => {
  const cctpText = `
2.7 - Schémas d'armoire et calculs
L'entreprise réalisera les schémas complets d'armoire.
Elle fournira les notes de calcul de court-circuit, sélectivité et chute de tension.
Les documents seront remis au format PDF et DWG.

2.8 - Autre poste
Sans objet
  `.trim();

  const result = findQtyInCCTP({ num: '2.7.X', description: "Schémas d'armoire et calculs" }, cctpText);

  assert.ok(result);
  assert.ok(result.block.includes("schémas complets d'armoire"));
  assert.equal(result.qty, null);
});

test('extracts cable tray technical specs and keeps the block', () => {
  const cctpText = `
2.6 - Chemin de câble CFO
Chemin de câble 200 mm en tôle acier galvanisée.
La fourniture comprendra les supports, éclisses et boulonnerie.
Pose en faux-plafond et en locaux techniques.

2.7 - Schémas
Documents d'exécution.
  `.trim();

  const result = findQtyInCCTP({ num: '2.6', description: 'Chemin de câble CFO 200mm' }, cctpText);

  assert.ok(result);
  assert.ok(result.specs.some(s => /200 mm/i.test(s) || /200mm/i.test(s)));
  assert.ok(result.specs.some(s => /galvanis/i.test(s)));
  assert.ok(result.specs.some(s => /tole acier|tôle acier/i.test(s)));
});

test('does not return unrelated content for vague TGBT adaptation line', () => {
  const cctpText = `
2.6 - Chemin de câble CFO
Chemin de câble 200 mm en tôle acier galvanisée.

2.7 - Schémas d'armoire et calculs
L'entreprise réalisera les schémas complets d'armoire.
  `.trim();

  const result = findQtyInCCTP({ num: '', description: 'Adaptation du TGBT' }, cctpText);

  assert.equal(result, null);
});

test('extracts explicit quantity from tree planting section', () => {
  const cctpText = `
3.4.1 - Plantations
16 arbres tiges à planter sur la zone d'entrée.
Les fosses seront préparées et amendées.
  `.trim();

  const result = findQtyInCCTP({ num: '3.4.1', description: 'Arbres tiges' }, cctpText);

  assert.ok(result);
  assert.equal(result.qty, 16);
});

test('returns null for line without num and overly vague description', () => {
  const cctpText = `
2.13 - Radiateurs
Marque : ATLANTIC ou équivalent
Puissance : 500 W et 1500 W
  `.trim();

  const result = findQtyInCCTP({ num: '', description: 'Divers' }, cctpText);

  assert.equal(result, null);
});

test('finds radiator section and functional specs for 500 W line', () => {
  const cctpText = `
2.13 - Radiateurs
Marque : ATLANTIC ou équivalent
Modèle : AGILIA ou équivalent
Caractéristiques :
• Homologués CE, NF Electricité Performance
• Classe II, IP 24, IK07
• Pilotage Intelligent
• Façade en aluminium
• Coloris : blanc (RAL 9016)
• Puissance : 500 W et 1500 W
  `.trim();

  const result = findQtyInCCTP({ num: '2.13', description: 'Radiateur 500 W' }, cctpText);

  assert.ok(result);
  assert.ok(result.block.includes('ATLANTIC'));
  assert.ok(result.specs.some(s => /nf electricite performance|nf electricité performance/i.test(s)));
  assert.ok(result.specs.some(s => /ip 24|ik07/i.test(s)));
});
