// Ce qui casserait EN SILENCE :
//
//   1. un tri alphabétique qui met « .10 » avant « .2 » — l'arbre se dessine
//      entier, dans le désordre, et rien ne le signale ;
//   2. le squelette à quatre chiffres aplati — trente et une branches en vrac
//      au lieu de quatre domaines ;
//   3. une note dont le maillon parent n'a jamais été écrit : rattachée à rien,
//      elle disparaît de l'arbre sans erreur ;
//   4. un exercice devenu un nœud comme un autre — la carte dirait le contraire
//      de la façon dont l'Arbre se lit ;
//   5. un point laissé dans l'identifiant d'un nœud : Mind Elixir y lit une
//      classe CSS, ne trouve rien, et ne se plaint pas.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyserNom, comparerNumeros, parent, parentReel, carte } from '../.epreuves/antinet.mjs'
import { construire, identifiant, marques } from '../.epreuves/carte.mjs'

const note = (numero, titre, type = '') => ({ numero, titre, chemin: `A/${numero} ${titre}.md`, type })

const ARBRE = [
	note('1000', 'Sciences humaines'),
	note('4000', 'Sciences formelles'),
	note('4200', 'Informatique'),
	note('4280', 'Réseaux'),
	note('4280.A', 'DNS'),
	note('4280.A.1', 'Le nom de domaine'),
	note('4280.A.1.A', 'À toi — découper un nom', 'exercice'),
	note('4280.A.2', 'Chez moi', 'exemple'),
	note('4280.A.3', 'Une trame', 'formulaire'),
]

test('le nom du fichier donne le numéro et le titre', () => {
	assert.deepEqual(analyserNom('4221.E Power Query M.md'), { numero: '4221.E', titre: 'Power Query M' })
	assert.deepEqual(analyserNom('1200 Psychologie'), { numero: '1200', titre: 'Psychologie' })
	assert.equal(analyserNom('Index des auteurs.md'), null)
})

test('le dixième enfant se range APRÈS le deuxième, pas avant', () => {
	assert.deepEqual(['2412.B.10', '2412.B.2', '2412.B.15', '2412.B.1'].sort(comparerNumeros),
		['2412.B.1', '2412.B.2', '2412.B.10', '2412.B.15'])
})

test('un parent passe avant ses enfants, et les chiffres avant les lettres', () => {
	assert.deepEqual(['4270.B.3', '4270.C', '4270.B', '4270', '4270.A.1'].sort(comparerNumeros),
		['4270', '4270.A.1', '4270.B', '4270.B.3', '4270.C'])
})

test('les quatre chiffres remontent de dizaine en dizaine', () => {
	assert.equal(parent('4221'), '4220')
	assert.equal(parent('4220'), '4200')
	assert.equal(parent('4200'), '4000')
	assert.equal(parent('4000'), null)
	assert.equal(parent('2413.A.1.B'), '2413.A.1')
})

test('un maillon manquant ne fait pas disparaître la note', () => {
	const connus = new Set(['2412', '2412.E.1.A'])
	assert.equal(parentReel('2412.E.1.A', (n) => connus.has(n)), '2412')
})

test('la carte porte TOUTES les notes, feuilles comprises', () => {
	const n = carte(ARBRE).map((x) => x.numero).sort()
	assert.deepEqual(n, ['1000', '4000', '4200', '4280', '4280.A', '4280.A.1'].sort())
})

test('exercice, exemple et formulaire marquent leur parent sans prendre de nœud', () => {
	const n = carte(ARBRE)
	const dns = n.find((x) => x.numero === '4280.A')
	assert.deepEqual([dns.exercices, dns.exemples, dns.formulaires], [0, 1, 1])
	assert.equal(n.find((x) => x.numero === '4280.A.1').exercices, 1)
})

test('chaque nœud se rattache à un parent qui existe VRAIMENT', () => {
	const n = carte(ARBRE)
	const connus = new Set(n.map((x) => x.numero))
	for (const x of n) if (x.parent) assert.ok(connus.has(x.parent), `${x.numero} pend dans le vide`)
	assert.deepEqual(n.filter((x) => !x.parent).map((x) => x.numero).sort(), ['1000', '4000'])
})

test("un point ne survit pas dans l'identifiant d'un nœud", () => {
	assert.equal(identifiant('4280.A.1'), 'n4280_A_1')
})

test('la carte a un seul centre, et les domaines de tête sont ses branches', () => {
	const r = construire(carte(ARBRE))
	assert.equal(r.expanded, true)
	assert.deepEqual(r.children.map((c) => c.topic), ['Sciences humaines', 'Sciences formelles'])
})

test('tout arrive replié, sinon quatre cents notes s’ouvrent d’un coup', () => {
	const parcourir = (n) => [n, ...(n.children || []).flatMap(parcourir)]
	for (const n of parcourir(construire(carte(ARBRE))).slice(1)) {
		if (n.children) assert.equal(n.expanded, false, `${n.topic} arrive déplié`)
	}
})

test("une feuille n'a pas de liste d'enfants vide (elle porterait un rond qui n'ouvre rien)", () => {
	const parcourir = (n) => [n, ...(n.children || []).flatMap(parcourir)]
	assert.equal(parcourir(construire(carte(ARBRE))).find((n) => n.topic === 'Le nom de domaine').children, undefined)
})

test('les marques se lisent sans légende, au singulier comme au pluriel', () => {
	assert.deepEqual(marques({ exercices: 1, exemples: 2, formulaires: 0 }), ['✏️ 1 exercice', '🖥 2 exemples'])
	assert.deepEqual(marques({ exercices: 0, exemples: 0, formulaires: 0 }), [])
})
