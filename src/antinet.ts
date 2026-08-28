// La numérotation Antinet, lue dans les NOMS DE FICHIERS.
//
// ⛔ RIEN N'EST DÉCLARÉ NULLE PART. Le nom porte le numéro et le titre —
// « 4221.E Power Query M ». C'est la seule source : ni en-tête, ni index, ni
// fichier de configuration. Une note écrite dans Obsidian entre dans l'arbre
// toute seule.
//
// ⚠️ CE FICHIER EST UNE COPIE des règles qui vivent aussi dans `vault-outils`
// (`serveur/arbre.js`). Décision assumée : le plugin doit rester autonome, sans
// dépendance à installer ni à synchroniser. Le jour où une règle de
// numérotation change, il faut la changer AUX DEUX ENDROITS — sinon les deux
// écrans dessinent deux arbres différents sans rien dire.

export type Note = { numero: string; titre: string; chemin: string; type: string }

export type Noeud = {
	numero: string
	titre: string
	chemin: string
	parent: string | null
	exercices: number
	exemples: number
	formulaires: number
}

const NOM = /^(\d{4}(?:\.[A-Za-z0-9]+)*)\s+(.+)$/

export function analyserNom(nom: string): { numero: string; titre: string } | null {
	const m = NOM.exec(nom.replace(/\.md$/, ''))
	return m ? { numero: m[1], titre: m[2] } : null
}

const segments = (n: string) => n.split('.')

// ⚠️ TRIER COMME DU TEXTE METTRAIT « .10 » AVANT « .2 ».
// Trois branches dépassent déjà dix enfants : l'ordre de lecture serait faux,
// et faux EN SILENCE — l'arbre s'afficherait entier, simplement dans le
// désordre. C'est le genre de défaut qu'on ne voit pas tant qu'une branche
// n'atteint pas dix enfants.
export function comparerNumeros(a: string, b: string): number {
	const A = segments(a)
	const B = segments(b)
	for (let i = 0; i < Math.max(A.length, B.length); i++) {
		const x = A[i]
		const y = B[i]
		if (x === undefined) return -1          // le parent passe avant ses enfants
		if (y === undefined) return 1
		if (x === y) continue
		const nx = /^\d+$/.test(x)
		const ny = /^\d+$/.test(y)
		if (nx && ny) return Number(x) - Number(y)
		if (nx !== ny) return nx ? -1 : 1        // les chiffres avant les lettres
		return x.localeCompare(y, 'fr')
	}
	return 0
}

// ⚠️ LE SQUELETTE À QUATRE CHIFFRES EST DÉCIMAL, PAS UN SEUL NIVEAU.
// `4221 Outils Microsoft` est sous `4220`, lui-même sous `4200`, lui-même sous
// `4000`. Traiter les quatre chiffres comme un niveau unique donnait une entrée
// de trente et une branches en vrac — Psychologie, Géopolitique et Power Query
// côte à côte. On remonte en remettant à zéro le dernier chiffre non nul :
// 4221 → 4220 → 4200 → 4000 → (plus rien).
export function parent(numero: string): string | null {
	const s = segments(numero)
	if (s.length > 1) return s.slice(0, -1).join('.')
	const d = s[0].split('')
	for (let i = d.length - 1; i >= 0; i--) {
		if (d[i] === '0') continue
		d[i] = '0'
		const p = d.join('')
		return /^0+$/.test(p) ? null : p
	}
	return null
}

// ⚠️ UN MAILLON PEUT MANQUER. `2412.E.1.A` existe alors que `2412.E.1` a pu ne
// jamais être écrit : la note se rattache au premier ancêtre QUI EXISTE, au
// lieu de disparaître de l'arbre. Une note invisible est pire qu'une note mal
// placée — la première ne se remarque jamais.
export function parentReel(numero: string, existe: (n: string) => boolean): string | null {
	let p = parent(numero)
	while (p && !existe(p)) p = parent(p)
	return p
}

// ⛔ NI UN EXERCICE NI UN EXEMPLE NE PREND DE NŒUD. C'est la règle de lecture
// de l'Arbre : un exercice se pose DANS son chapitre, pas à côté. Il laisse une
// MARQUE sur son parent — on voit où il y a de quoi s'entraîner sans dessiner
// une entrée de sommaire de plus.
//
// ⚠️ Un spécial peut être le parent d'un autre : on remonte donc jusqu'au
// premier ancêtre qui existe ET qui porte un nœud, sinon un exemple rattaché à
// un exercice disparaîtrait du comptage sans rien dire.
const SPECIAUX: Record<string, 'exercices' | 'exemples' | 'formulaires'> = {
	exercice: 'exercices',
	exemple: 'exemples',
	formulaire: 'formulaires',
}

const aucune = () => ({ exercices: 0, exemples: 0, formulaires: 0 })

export function carte(notes: Note[]): Noeud[] {
	const par = new Map(notes.map((n) => [n.numero, n]))
	const existe = (n: string) => par.has(n)
	const special = (n: string) => Boolean(SPECIAUX[par.get(n)?.type || ''])

	const parentNoeud = (numero: string) => {
		let p = parentReel(numero, existe)
		while (p && special(p)) p = parentReel(p, existe)
		return p
	}

	const noeuds: Noeud[] = []
	const marques = new Map<string, ReturnType<typeof aucune>>()

	for (const numero of [...par.keys()].sort(comparerNumeros)) {
		const note = par.get(numero) as Note
		const cle = SPECIAUX[note.type]
		if (cle) {
			const p = parentNoeud(numero)
			if (!p) continue
			if (!marques.has(p)) marques.set(p, aucune())
			;(marques.get(p) as Record<string, number>)[cle]++
			continue
		}
		noeuds.push({ numero, titre: note.titre, chemin: note.chemin, parent: parentNoeud(numero), ...aucune() })
	}

	// ⚠️ Les marques sont recollées APRÈS la boucle : un exercice peut se lire
	// avant son parent dès qu'un maillon manque. Compter d'abord, distribuer
	// ensuite, et l'ordre cesse de compter.
	return noeuds.map((n) => ({ ...n, ...(marques.get(n.numero) || aucune()) }))
}
