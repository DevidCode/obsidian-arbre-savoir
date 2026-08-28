import esbuild from 'esbuild'
import process from 'process'
import { builtinModules } from 'module'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const banner = `/*
CE FICHIER EST CONSTRUIT PAR ESBUILD — ne pas le modifier à la main.
Source : https://github.com/DevidCode/obsidian-arbre-savoir
*/`

const mode = process.argv[2]

// ── LES ÉPREUVES ────────────────────────────────────────────────────────────
// Les règles de numérotation sont en TypeScript ; `node --test` ne les lit pas.
// On les traduit dans un dossier de passage, et les épreuves jouent dessus.
// ⚠️ C'est bien LE code livré qui est éprouvé, pas une deuxième écriture des
// mêmes règles — une copie de plus finirait par diverger de celle-ci.
if (mode === 'epreuves') {
	mkdirSync('.epreuves', { recursive: true })
	await esbuild.build({
		entryPoints: ['src/antinet.ts', 'src/carte.ts'],
		outdir: '.epreuves',
		outExtension: { '.js': '.mjs' },
		format: 'esm',
		bundle: false,
		logLevel: 'warning',
	})
	process.exit(0)
}

// ── LA FEUILLE DE STYLE ─────────────────────────────────────────────────────
// ⛔ Obsidian ne charge qu'UN fichier, `styles.css`, à la racine du plugin. La
// feuille de Mind Elixir doit donc y être recopiée : importée depuis le code,
// elle ne serait jamais servie et la carte s'afficherait en texte brut.
const style = () =>
	writeFileSync('styles.css',
		'/* Mind Elixir — recopié depuis node_modules à la construction */\n' +
		readFileSync('node_modules/mind-elixir/dist/MindElixir.css', 'utf8') +
		'\n\n' + readFileSync('src/styles-carte.css', 'utf8'))

const prod = mode === 'production'

const context = await esbuild.context({
	banner: { js: banner },
	entryPoints: ['main.ts'],
	bundle: true,
	external: ['obsidian', 'electron', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
	format: 'cjs',
	target: 'es2018',
	logLevel: 'info',
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outfile: 'main.js',
	// La feuille de Mind Elixir est importée par la bibliothèque : on l'écarte
	// du paquet et on la recopie nous-mêmes dans styles.css.
	loader: { '.css': 'empty' },
})

style()

if (prod) {
	await context.rebuild()
	process.exit(0)
} else {
	await context.watch()
}
