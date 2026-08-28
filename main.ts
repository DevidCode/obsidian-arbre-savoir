import { Plugin, PluginSettingTab, Setting, App, WorkspaceLeaf } from 'obsidian'
import { VueArbre, TYPE_VUE } from './src/vue'

type Reglages = { dossier: string }

const PAR_DEFAUT: Reglages = { dossier: '3 Garden/Mon arbre du savoir' }

export default class ArbreDuSavoir extends Plugin {
	reglages: Reglages = PAR_DEFAUT

	async onload() {
		this.reglages = Object.assign({}, PAR_DEFAUT, await this.loadData())

		this.registerView(TYPE_VUE, (leaf: WorkspaceLeaf) => new VueArbre(leaf, this.reglages.dossier))

		this.addRibbonIcon('network', 'Arbre du savoir', () => this.ouvrir())
		this.addCommand({ id: 'ouvrir', name: "Ouvrir l'Arbre du savoir", callback: () => this.ouvrir() })
		this.addSettingTab(new Reglage(this.app, this))
	}

	// ⚠️ UN SEUL ONGLET DE CARTE. Sans ce test, chaque clic sur l'icône en
	// ouvrait un de plus — et chacun redessinait quatre cents nœuds.
	async ouvrir() {
		const dejaLa = this.app.workspace.getLeavesOfType(TYPE_VUE)
		if (dejaLa.length) {
			this.app.workspace.revealLeaf(dejaLa[0])
			return
		}
		const leaf = this.app.workspace.getLeaf('tab')
		await leaf.setViewState({ type: TYPE_VUE, active: true })
		this.app.workspace.revealLeaf(leaf)
	}

	async enregistrer() {
		await this.saveData(this.reglages)
	}
}

class Reglage extends PluginSettingTab {
	plugin: ArbreDuSavoir

	constructor(app: App, plugin: ArbreDuSavoir) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		this.containerEl.empty()
		new Setting(this.containerEl)
			.setName('Dossier de l’Arbre')
			.setDesc("Le dossier dont les notes numérotées forment l'arbre. Rien d'autre n'est lu, et rien n'est jamais écrit.")
			.addText((t) => t
				.setPlaceholder(PAR_DEFAUT.dossier)
				.setValue(this.plugin.reglages.dossier)
				.onChange(async (v) => {
					this.plugin.reglages.dossier = v.trim() || PAR_DEFAUT.dossier
					await this.plugin.enregistrer()
				}))
		this.containerEl.createEl('p', {
			text: 'Le dossier changé prend effet à la prochaine ouverture de la carte.',
			cls: 'setting-item-description',
		})
	}
}
