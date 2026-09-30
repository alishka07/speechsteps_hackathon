import { writeFile } from 'node:fs/promises';

// GitHub Pages serves this file for a direct visit to a React Router route.
await writeFile(new URL('../dist/404.html', import.meta.url), `<!doctype html>
<html lang="ru"><meta charset="utf-8"><title>SpeechSteps</title>
<script>
var base='/speechsteps_hackathon/';
var route=location.pathname.slice(base.length-1)+location.search+location.hash;
location.replace(base+'?__spa='+encodeURIComponent(route));
</script><p>Открываем Остров Эха…</p></html>`);
await writeFile(new URL('../dist/.nojekyll', import.meta.url), '');
