# Along the Lake

A short, playable browser adventure that introduces six Ojibwe words through a fictional lakeshore journey. Includes six chapters, retryable questions, hints, a word journal, an ending, and automatic browser saves.

## Website

`index.html` is the website home page. Hosting needs no build, backend, API keys, or dependencies. A GitHub Pages workflow is included. After pushing to the repository's `main` branch, open repository Settings → Pages and choose **GitHub Actions** as the source. Run the **Publish game website** workflow if needed. GitHub reports the public address after a successful deployment; do not assume it is live before then.

Keep `PLAY.html` in sync with `index.html` when editing; it is the optional offline copy.

## Play on your own computer

Open `PLAY.html` in a web browser. No installation, terminal, account, or internet connection is required to play. Browser privacy settings may prevent saving; the game still works for that session.

## Development in the cloud workspace

From `/workspace/ojibwe`, run `python3 -m http.server 8000 --bind 0.0.0.0`. Use local HTTP requests or browser automation for validation. A cloud localhost address is not a public game link.

There are no third-party dependencies or build steps. The complete application is in `PLAY.html` and works both as a local file and over HTTP.

## Language scope

This is a beginner prototype using standalone words in double-vowel spelling: nibi (water), jiimaan (canoe), giizis (sun), makwa (bear), ishkode (fire), and dibik-giizis (moon). Ojibwe vocabulary, meanings, and usage vary across dialects and communities. The Ojibwe People's Dictionary at https://ojibwe.lib.umn.edu/ is a reference for fuller entries and speaker recordings. Live reference access was blocked in this setup environment; fluent-speaker review is recommended before expanding or publishing language lessons. No pronunciation audio, grammatical instruction, or traditional teachings are represented here.
