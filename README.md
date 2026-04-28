# Behavioral Finance Moduldeck

Repo-fähige HTML-Struktur für GitHub Pages.

## Struktur

```text
behavioral-finance/
├── index.html
├── assets/
│   ├── css/deck.css
│   └── js/deck.js
├── topics/
│   ├── manifest.js
│   ├── kapitel-2-zwei-systeme-kahneman.html
│   ├── kapitel-3-heuristiken-biases.html
│   └── kapitel-4-entscheidungen-unter-unsicherheit.html
├── single-file/behavioral-finance-click.html
└── docs/CODEX_PROMPT_ADD_TOPIC.md
```

## Hinweise

- `index.html` lädt Topic-Fragmente über `topics/manifest.js`.
- Die modulare Version sollte über GitHub Pages oder einen lokalen Server geöffnet werden.
- Die Single-File-Version funktioniert lokal ohne Fetch.
- Optik und Deck-Logik wurden aus dem Asset-Management-Referenzmodul übernommen und nur auf Behavioral Finance umbenannt.
