// La liste plate des notes devient un arbre que Mind Elixir sait dessiner.
//
// ⛔ AUCUN DOM ICI. Ce fichier ne fait que la mise en forme — c'est ce qui le
// rend vérifiable sans lancer Obsidian.
import type { Noeud } from './antinet'

export type NoeudCarte = {
	id: string
	topic: string
	tags?: string[]
	children?: NoeudCarte[]
	expanded?: boolean
}

// ⚠️ LE NUMÉRO NE PEUT PAS SERVIR D'IDENTIFIANT TEL QUEL. Mind Elixir retrouve
// un nœud dans la page à partir de son identifiant, et un point y a un sens en
// CSS : `4221.A` se lirait « l'élément 4221 de classe A ». Le nœud serait
// introuvable, sans la moindre erreur.
export const identifiant = (numero: string) => 'n' + numero.split('.').join('_')

export function marques(n: Noeud): string[] {
	const t: string[] = []
	const s = (nb: number, un: string, plusieurs: string) => `${nb} ${nb > 1 ? plusieurs : un}`
	if (n.exercices) t.push(`✏️ ${s(n.exercices, 'exercice', 'exercices')}`)
	if (n.exemples) t.push(`🖥 ${s(n.exemples, 'exemple', 'exemples')}`)
	if (n.formulaires) t.push(`📋 ${s(n.formulaires, 'formulaire', 'formulaires')}`)
	return t
}

export const RACINE = 'racine'

// ⚠️ UNE SEULE RACINE. L'Arbre en a quatre — Sciences humaines, sociales,
// formelles, de la vie — et une carte n'a qu'un centre. On en fabrique un, qui
// ne correspond à aucune note : c'est le seul nœud qui n'ouvre rien.
export function construire(noeuds: Noeud[], titre = 'Mon Arbre du savoir'): NoeudCarte {
	const par = new Map<string, NoeudCarte>()
	for (const n of noeuds) {
		const m = marques(n)
		par.set(n.numero, { id: identifiant(n.numero), topic: n.titre, ...(m.length ? { tags: m } : {}) })
	}

	const racines: NoeudCarte[] = []
	for (const n of noeuds) {
		const moi = par.get(n.numero) as NoeudCarte
		const p = n.parent ? par.get(n.parent) : null
		if (!p) { racines.push(moi); continue }
		// ⚠️ `children: []` ferait apparaître le bouton de dépliage sur une
		// feuille — un rond qui n'ouvre rien. La liste ne naît qu'au premier
		// enfant.
		if (!p.children) p.children = []
		p.children.push(moi)
	}

	// ⛔ TOUT REPLIÉ SAUF LES DOMAINES DE TÊTE. Quatre cents notes dépliées d'un
	// coup, c'est un mur : la carte ne montrerait plus la structure, qui est la
	// seule chose qu'elle apporte par rapport au navigateur de fichiers.
	for (const n of par.values()) if (n.children) n.expanded = false

	return { id: RACINE, topic: titre, expanded: true, children: racines }
}

// La correspondance identifiant → note, pour relire un clic de Mind Elixir.
export const parIdentifiant = (noeuds: Noeud[]) =>
	new Map(noeuds.map((n) => [identifiant(n.numero), n]))
