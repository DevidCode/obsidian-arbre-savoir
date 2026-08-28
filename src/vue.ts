import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian'
import MindElixir from 'mind-elixir'
import { carte, analyserNom } from './antinet'
import type { Note, Noeud } from './antinet'
import { construire, parIdentifiant, RACINE } from './carte'

export const TYPE_VUE = 'arbre-savoir-carte'

// L'Arbre du savoir, dessiné dans Obsidian.
//
// ⛔ CE PLUGIN EST EN LECTURE SEULE, PAR CHOIX — pas parce qu'une règle
// l'imposerait à tout le monde. Mind Elixir est un ÉDITEUR : par
// défaut on renomme un nœud d'un double-clic, on déplace une branche au
// glisser. Tout est bridé. La vérité, ce sont les fichiers — un rangement
// accepté à l'écran et perdu au rechargement serait pire qu'une carte figée :
// on croirait avoir rangé quelque chose.
export class VueArbre extends ItemView {
	private dossier: string
	private me: any = null
	private vivant = false
	private panneau: HTMLElement | null = null

	constructor(leaf: WorkspaceLeaf, dossier: string) {
		super(leaf)
		this.dossier = dossier
	}

	getViewType() { return TYPE_VUE }
	getDisplayText() { return 'Arbre du savoir' }
	getIcon() { return 'network' }

	// ⚠️ LES NOTES SE LISENT DANS L'INDEX, PAS SUR LE DISQUE. `metadataCache`
	// tient déjà l'en-tête de chaque fichier : demander le `type` par une
	// lecture ouvrirait quatre cents fichiers à chaque ouverture de la carte,
	// sur téléphone comme sur PC.
	private lireLesNotes(): Note[] {
		const prefixe = this.dossier.replace(/\/+$/, '') + '/'
		const notes: Note[] = []
		for (const f of this.app.vault.getMarkdownFiles()) {
			if (!f.path.startsWith(prefixe)) continue
			const n = analyserNom(f.basename)
			if (!n) continue
			const entete = this.app.metadataCache.getFileCache(f)?.frontmatter
			notes.push({ ...n, chemin: f.path, type: String(entete?.type ?? '').trim() })
		}
		return notes
	}

	async onOpen() {
		this.vivant = true
		const racine = this.contentEl
		racine.empty()
		racine.addClass('arbre-savoir')

		const notes = this.lireLesNotes()
		if (!notes.length) {
			// ⚠️ DIRE OÙ ON A CHERCHÉ. « Aucune note » tout court laisse croire à
			// un arbre vide alors que c'est le chemin qui est faux.
			racine.createEl('p', {
				text: `Aucune note numérotée dans « ${this.dossier} ». Le dossier se règle dans les paramètres du plugin.`,
			})
			return
		}

		const noeuds = carte(notes)
		const parId = parIdentifiant(noeuds)

		const legende = racine.createDiv({ cls: 'arbre-savoir-legende' })
		legende.createSpan({ text: `${noeuds.length} notes`, cls: 'arbre-savoir-compte' })
		legende.createSpan({ text: 'Un clic déplie une branche.' })
		legende.createSpan({ text: '✏️ exercice' })
		legende.createSpan({ text: '🖥 exemple' })
		legende.createSpan({ text: '📋 formulaire' })

		const cadre = racine.createDiv({ cls: 'arbre-savoir-cadre' })
		const toile = cadre.createDiv({ cls: 'arbre-savoir-toile' })

		// ⛔ SUR UN VOLET ÉTROIT, L'ARBRE VERTICAL NE TIENT PAS, et aucun réglage
		// n'y changera rien : onze frères côte à côte ne rentreront jamais dans
		// 380 px. Mesuré sur un écran de 412 px — même resserré au maximum, la
		// carte tombait à l'échelle 0,36, soit un texte de 5 px de haut.
		//
		// En dessous de 640 px, on passe donc au sens LATÉRAL : les frères
		// s'empilent, la largeur ne dépend plus que de la profondeur, l'échelle
		// tient à 0,78 et le texte se lit. On défile du doigt, ce qui est le
		// geste naturel là-bas. La forme d'arbre est un luxe d'écran large.
		//
		// ⚠️ On mesure LE VOLET, pas la fenêtre : dans Obsidian la carte vit dans
		// un panneau, et un panneau étroit sur un grand écran a exactement le
		// même problème qu'un téléphone.
		const etroit = cadre.getBoundingClientRect().width < 640
		if (etroit) racine.addClass('arbre-savoir-lateral')

		const me = new MindElixir({
			el: toile,
			direction: etroit ? MindElixir.RIGHT : MindElixir.DOWN,
			editable: false,
			draggable: false,
			contextMenu: false,
			allowUndo: false,
			keypress: false,
			toolBar: true,
			theme: document.body.hasClass('theme-dark') ? MindElixir.DARK_THEME : undefined,
		})
		this.me = me
		me.init({ nodeData: construire(noeuds) })

		// ⛔ `toCenter()` ET `scrollIntoView()` DE LA BIBLIOTHÈQUE SONT
		// INUTILISABLES ICI. Elles calculent sur les positions de mise en page,
		// qui ignorent le miroir : elles centreraient sur l'image inversée du
		// nœud, c'est-à-dire à l'exact opposé de l'endroit où il se voit. On
		// mesure donc à l'écran — `getBoundingClientRect` tient compte des
		// transformations, elle rend la position VUE.
		//
		// ⛔ ET ON CADRE UNE ZONE, JAMAIS UN NŒUD. Centrer sur le nœud touché
		// paraissait juste et ne l'était pas : ses enfants naissent à côté de
		// lui, donc la moitié tombait hors du cadre. Sur un téléphone, un seul
		// des cinq nœuds de départ restait atteignable — mesuré.
		const PLANCHER = 0.35   // en dessous, le texte ne se lit plus

		const boites = (zone?: Element | null) =>
			Array.from((zone || cadre).querySelectorAll('me-tpc')).map((n) => n.getBoundingClientRect())

		const cadrer = (zone?: Element | null) => {
			if (!this.vivant) return
			const bs = boites(zone)
			if (!bs.length) return
			const gauche = Math.min(...bs.map((b) => b.left)), droite = Math.max(...bs.map((b) => b.right))
			const haut = Math.min(...bs.map((b) => b.top)), bas = Math.max(...bs.map((b) => b.bottom))
			const c = cadre.getBoundingClientRect()
			// On ne grossit jamais au-delà de 1 : une branche minuscule ne doit
			// pas remplir l'écran, sinon l'échelle saute à chaque appui.
			const facteur = Math.min(1, (c.width * 0.94) / (droite - gauche), (c.height * 0.94) / (bas - haut))
			const voulu = Math.max(PLANCHER, me.scaleVal * facteur)
			if (Math.abs(voulu - me.scaleVal) > 0.01) me.scale(voulu)

			// ⚠️ Le recentrage attend le redessin : mesuré avant, il viserait des
			// positions que le zoom va déplacer.
			requestAnimationFrame(() => {
				if (!this.vivant) return
				const b2 = boites(zone)
				if (!b2.length) return
				const g = Math.min(...b2.map((b) => b.left)), d = Math.max(...b2.map((b) => b.right))
				const h = Math.min(...b2.map((b) => b.top)), ba = Math.max(...b2.map((b) => b.bottom))
				const c2 = cadre.getBoundingClientRect()
				me.move(c2.left + c2.width / 2 - (g + d) / 2, c2.top + c2.height / 2 - (h + ba) / 2)
			})
		}

		// ⛔ NE PAS SE FIER À LA SÉLECTION DE LA BIBLIOTHÈQUE : ELLE NE MARCHE PAS
		// AU DOIGT. Son gestionnaire abandonne dès que son détecteur croit que le
		// pointeur a bougé — ce qui arrive à CHAQUE appui tactile, un doigt
		// n'étant pas un point. Mesuré sur un profil de téléphone : l'appui ne
		// faisait strictement rien, ni dépliage ni panneau, et sans erreur.
		//
		// On détecte donc l'appui nous-mêmes, avec une tolérance de déplacement.
		// Les événements de pointeur couvrent le doigt ET la souris : un seul
		// chemin, donc un seul comportement à vérifier.
		const TOLERANCE = 12          // px : en dessous, c'est un appui, pas un glissement
		const actifs = new Set<number>()
		let depart: { id: number; x: number; y: number; cible: EventTarget | null } | null = null

		this.registerDomEvent(toile, 'pointerdown', (e: PointerEvent) => {
			actifs.add(e.pointerId)
			// ⛔ Deux doigts, c'est un zoom — jamais un appui.
			depart = actifs.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY, cible: e.target } : null
		})

		this.registerDomEvent(toile, 'pointercancel', (e: PointerEvent) => {
			actifs.delete(e.pointerId)
			depart = null
		})

		this.registerDomEvent(toile, 'pointerup', (e: PointerEvent) => {
			actifs.delete(e.pointerId)
			const d = depart
			depart = null
			if (!d || d.id !== e.pointerId) return
			if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TOLERANCE) return   // c'était un déplacement
			const cible = d.cible instanceof Element ? d.cible : null
			// Le petit rond de dépliage fait 18 px de côté : la bibliothèque s'en
			// occupe, et on ne fait surtout pas dépendre l'action de cette cible.
			if (cible && cible.closest('me-epd')) return
			const tpc = cible ? (cible.closest('me-tpc') as HTMLElement | null) : null

			if (!tpc) { this.montrerPanneau(cadre, null); return }
			const cle = (tpc.dataset.nodeid || '').replace(/^me/, '')
			this.montrerPanneau(cadre, parId.get(cle) || null)
			me.selectNode(tpc as any)

			// Une branche se déplie quand elle a un rond — l'élément que la
			// bibliothèque pose elle-même sur les nœuds qui ont des enfants. Le
			// lire dans le document évite de tenir un second compte qui pourrait
			// mentir.
			if (!tpc.parentElement?.querySelector('me-epd')) return

			// ⛔ SANS SECOND ARGUMENT. Avec une valeur explicite, la donnée change
			// mais la carte n'est pas redessinée : le nœud passe « déplié » sans
			// que rien n'apparaisse à l'écran.
			me.expandNode(tpc as any)
			requestAnimationFrame(() => cadrer(me.findEle(cle)?.closest('me-wrapper')))
		})

		// À l'ouverture, c'est l'arbre entier qu'il faut faire tenir : il n'y a
		// que le tronc et les domaines de tête, et ils doivent TOUS être
		// atteignables.
		cadrer()
		this.registerDomEvent(window, 'resize', () => cadrer())
	}

	private montrerPanneau(cadre: HTMLElement, noeud: Noeud | null) {
		this.panneau?.remove()
		this.panneau = null
		if (!noeud) return

		const p = cadre.createDiv({ cls: 'arbre-savoir-panneau' })
		p.createEl('p', { text: noeud.numero, cls: 'arbre-savoir-numero' })
		p.createEl('p', { text: noeud.titre, cls: 'arbre-savoir-titre' })
		const bouton = p.createEl('button', { text: '📖 Ouvrir la note à côté' })
		bouton.addEventListener('click', () => this.ouvrir(noeud.chemin))
		this.panneau = p
	}

	// ⚠️ La note s'ouvre DANS UN VOLET À CÔTÉ, jamais par-dessus la carte :
	// c'est tout l'intérêt d'avoir la carte sous les yeux pendant la lecture.
	private async ouvrir(chemin: string) {
		const f = this.app.vault.getAbstractFileByPath(chemin)
		if (!(f instanceof TFile)) {
			// ⚠️ Le chemin a été lu à l'ouverture de la carte. Une note renommée
			// depuis le dit, au lieu d'ouvrir un onglet vide.
			new Notice(`« ${chemin} » n'existe plus — recharge la carte.`)
			return
		}
		await this.app.workspace.getLeaf('split').openFile(f)
	}

	async onClose() {
		this.vivant = false
		this.me?.destroy?.()
		this.me = null
		this.panneau = null
	}
}
