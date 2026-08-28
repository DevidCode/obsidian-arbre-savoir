import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian'
import MindElixir from 'mind-elixir'
import { carte, analyserNom } from './antinet'
import type { Note, Noeud } from './antinet'
import { construire, parIdentifiant, RACINE } from './carte'

export const TYPE_VUE = 'arbre-savoir-carte'

// L'Arbre du savoir, dessiné dans Obsidian.
//
// ⛔ LECTURE SEULE, ET C'EST STRUCTUREL. Mind Elixir est un ÉDITEUR : par
// défaut on renomme un nœud d'un double-clic, on déplace une branche au
// glisser. Tout est bridé. La vérité, ce sont les fichiers — un rangement
// accepté à l'écran et perdu au rechargement serait pire qu'une carte figée :
// on croirait avoir rangé quelque chose.
export class VueArbre extends ItemView {
	private dossier: string
	private me: any = null
	private vivant = false
	private panneau: HTMLElement | null = null
	private surRedimensionnement: (() => void) | null = null

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

		// ⚠️ Mind Elixir mesure son conteneur AU MONTAGE : dans une boîte qui se
		// dimensionne sur son contenu il mesure zéro, et la carte ne s'affiche
		// pas — sans erreur. La hauteur vient donc du CSS, pas du contenu.
		const me = new MindElixir({
			el: toile,
			// Le seul sens vertical que connaît la bibliothèque. Un arbre pousse
			// vers le haut : le miroir est posé en CSS, voir styles.css.
			direction: MindElixir.DOWN,
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
		const centrer = (el: HTMLElement | null) => {
			if (!el || !this.vivant) return
			const n = el.getBoundingClientRect()
			const c = cadre.getBoundingClientRect()
			me.move(c.left + c.width / 2 - (n.left + n.width / 2), c.top + c.height / 2 - (n.top + n.height / 2))
		}

		me.bus.addListener('selectNodes', (objets: any[]) => {
			const o = objets && objets[0]
			if (!o) return
			this.montrerPanneau(cadre, parId.get(o.id) || null)
			// Le clic déplie, le bouton emmène lire. Deux gestes séparés :
			// explorer la carte ne doit jamais faire quitter la carte.
			if (o.children && o.children.length) {
				const el = me.findEle(o.id)
				if (el) me.expandNode(el, !o.expanded)
				// ⚠️ Déplier SANS recentrer ne sert à rien : les enfants
				// naissent à côté du parent, donc hors du cadre dès le
				// troisième étage, et le clic semble n'avoir rien fait. Le
				// recentrage attend le redessin.
				requestAnimationFrame(() => centrer(me.findEle(o.id)))
			}
		})
		me.bus.addListener('unselectNodes', () => this.montrerPanneau(cadre, null))

		centrer(me.findEle(RACINE))
		this.surRedimensionnement = () => centrer(me.findEle(RACINE))
		this.registerDomEvent(window, 'resize', this.surRedimensionnement)
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
