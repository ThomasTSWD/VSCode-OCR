import { IMAGE_TYPES, LANGUAGES } from './ocr';

const STYLE = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body {
	margin: 0; padding: 24px 16px 40px;
	color: var(--vscode-foreground); background: var(--vscode-editor-background);
	font: var(--vscode-font-size, 13px) var(--vscode-font-family, sans-serif);
}
main { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
h1 { margin: 0; font-size: 1.5em; font-weight: 600; }
.subtitle { margin: 4px 0 0; color: var(--vscode-descriptionForeground); }
.drop {
	display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
	min-height: 150px; padding: 20px; text-align: center; cursor: pointer;
	border: 2px dashed var(--vscode-input-border, var(--vscode-panel-border));
	border-radius: 8px; background: var(--vscode-input-background);
}
.drop:hover, .drop.over { border-color: var(--vscode-focusBorder); background: var(--vscode-list-hoverBackground); }
.drop:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
.drop strong { font-size: 1.1em; }
.drop span { color: var(--vscode-descriptionForeground); }
.preview { display: flex; gap: 12px; align-items: center; }
.preview img {
	max-width: 160px; max-height: 110px; object-fit: contain; border-radius: 4px;
	border: 1px solid var(--vscode-panel-border); background: var(--vscode-input-background);
}
.preview .name { font-weight: 600; word-break: break-all; }
.preview .meta { color: var(--vscode-descriptionForeground); }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
label { color: var(--vscode-descriptionForeground); }
select {
	padding: 4px 6px; color: var(--vscode-dropdown-foreground); background: var(--vscode-dropdown-background);
	border: 1px solid var(--vscode-dropdown-border); border-radius: 2px; font: inherit;
}
button {
	padding: 6px 14px; border: 1px solid transparent; border-radius: 2px; cursor: pointer; font: inherit;
	color: var(--vscode-button-foreground); background: var(--vscode-button-background);
}
button:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
button.secondary {
	color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground);
}
button.secondary:hover:not(:disabled) { background: var(--vscode-button-secondaryHoverBackground); }
button:disabled { opacity: 0.5; cursor: default; }
button:focus-visible, select:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
.spacer { flex: 1; }
.progress-label { display: flex; justify-content: space-between; color: var(--vscode-descriptionForeground); }
.bar { height: 4px; margin-top: 6px; overflow: hidden; border-radius: 2px; background: var(--vscode-input-background); }
.bar > div { width: 0; height: 100%; background: var(--vscode-progressBar-background); transition: width 0.2s; }
.error {
	padding: 8px 12px; border-radius: 4px; color: var(--vscode-errorForeground);
	border: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
	background: var(--vscode-inputValidation-errorBackground, transparent);
}
.result-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.result-head h2 { margin: 0; font-size: 1.1em; font-weight: 600; }
.count { color: var(--vscode-descriptionForeground); }
textarea {
	width: 100%; min-height: 240px; padding: 10px; resize: vertical; line-height: 1.5;
	color: var(--vscode-input-foreground); background: var(--vscode-input-background);
	border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 4px;
	font-family: var(--vscode-editor-font-family, monospace); font-size: var(--vscode-editor-font-size, 13px);
}
textarea:focus-visible { outline: 1px solid var(--vscode-focusBorder); }
`;

const SCRIPT = `
const vscode = acquireVsCodeApi();
const $ = (id) => document.getElementById(id);
const state = { dataUrl: undefined, running: false };

const els = {
	drop: $('drop'), file: $('file'), preview: $('preview'), thumb: $('thumb'), name: $('name'), meta: $('meta'),
	language: $('language'), run: $('run'), cancel: $('cancel'),
	progress: $('progress'), progressText: $('progress-text'), progressValue: $('progress-value'), bar: $('bar-fill'),
	error: $('error'), result: $('result'), text: $('text'), count: $('count'),
	copy: $('copy'), open: $('open'), clear: $('clear'),
};

function setRunning(running) {
	state.running = running;
	els.run.disabled = running || !state.dataUrl;
	els.cancel.hidden = !running;
	els.language.disabled = running;
	els.progress.hidden = !running;
	if (running) { setProgress('Starting', 0); }
}

function setProgress(status, progress) {
	els.progressText.textContent = status;
	els.progressValue.textContent = Math.round(progress * 100) + '%';
	els.bar.style.width = Math.round(progress * 100) + '%';
}

function showError(message) {
	els.error.textContent = message;
	els.error.hidden = !message;
}

function formatSize(bytes) {
	return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function setImage(dataUrl, name, size) {
	state.dataUrl = dataUrl;
	els.thumb.src = dataUrl;
	els.name.textContent = name || 'Pasted image';
	els.meta.textContent = size ? formatSize(size) : '';
	els.preview.hidden = false;
	els.result.hidden = true;
	showError('');
	setRunning(false);
}

function loadFile(file) {
	if (!file) { return; }
	if (!/^image\\//.test(file.type)) { showError('This file is not an image.'); return; }
	const reader = new FileReader();
	reader.onload = () => setImage(reader.result, file.name, file.size);
	reader.onerror = () => showError('The file could not be read.');
	reader.readAsDataURL(file);
}

function run() {
	if (!state.dataUrl || state.running) { return; }
	showError('');
	els.result.hidden = true;
	setRunning(true);
	vscode.postMessage({ type: 'recognize', dataUrl: state.dataUrl, language: els.language.value });
}

function updateCount() {
	const text = els.text.value.trim();
	const words = text ? text.split(/\\s+/).length : 0;
	els.count.textContent = words + ' word' + (words === 1 ? '' : 's') + ', ' + els.text.value.length + ' characters';
}

els.drop.addEventListener('click', () => els.file.click());
els.drop.addEventListener('keydown', (event) => {
	if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); els.file.click(); }
});
els.file.addEventListener('change', () => { loadFile(els.file.files[0]); els.file.value = ''; });
['dragenter', 'dragover'].forEach((type) => els.drop.addEventListener(type, (event) => {
	event.preventDefault(); els.drop.classList.add('over');
}));
['dragleave', 'drop'].forEach((type) => els.drop.addEventListener(type, () => els.drop.classList.remove('over')));
els.drop.addEventListener('drop', (event) => { event.preventDefault(); loadFile(event.dataTransfer.files[0]); });
document.addEventListener('paste', (event) => {
	const file = Array.from(event.clipboardData.files).find((item) => /^image\\//.test(item.type));
	if (file) { event.preventDefault(); loadFile(file); }
});

els.run.addEventListener('click', run);
els.cancel.addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));
els.copy.addEventListener('click', () => vscode.postMessage({ type: 'copy', text: els.text.value }));
els.open.addEventListener('click', () => vscode.postMessage({ type: 'openInEditor', text: els.text.value }));
els.clear.addEventListener('click', () => { els.text.value = ''; els.result.hidden = true; });
els.text.addEventListener('input', updateCount);

window.addEventListener('message', (event) => {
	const message = event.data;
	switch (message.type) {
		case 'loadImage':
			setImage(message.dataUrl, message.name, message.size);
			els.language.value = message.language;
			run();
			break;
		case 'progress':
			setProgress(message.status, message.progress);
			break;
		case 'result':
			setRunning(false);
			els.text.value = message.text;
			els.result.hidden = false;
			updateCount();
			if (!message.text) { showError('No text was found in this image.'); }
			break;
		case 'error':
			setRunning(false);
			showError(message.message);
			break;
		case 'cancelled':
			setRunning(false);
			break;
		case 'copied':
			els.copy.textContent = 'Copied';
			setTimeout(() => { els.copy.textContent = 'Copy'; }, 1500);
			break;
	}
});
vscode.postMessage({ type: 'ready' });
`;

export function getHtml(nonce: string, language: string): string {
	const options = Object.entries(LANGUAGES)
		.map(([code, name]) => `<option value="${code}"${code === language ? ' selected' : ''}>${name}</option>`)
		.join('');
	const accept = IMAGE_TYPES.join(',');
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OCR</title>
<style nonce="${nonce}">${STYLE}</style>
</head>
<body>
<main>
	<header>
		<h1>Extract text from an image</h1>
		<p class="subtitle">Text recognition runs on your machine. Your images are never uploaded.</p>
	</header>

	<div class="drop" id="drop" role="button" tabindex="0" aria-label="Choose an image">
		<strong>Drop an image here</strong>
		<span>or click to browse, or paste one with Ctrl+V</span>
		<span>PNG, JPEG, BMP, WebP, GIF</span>
	</div>
	<input type="file" id="file" accept="${accept}" hidden>

	<div class="preview" id="preview" hidden>
		<img id="thumb" alt="Selected image">
		<div><div class="name" id="name"></div><div class="meta" id="meta"></div></div>
	</div>

	<div class="row">
		<label for="language">Language</label>
		<select id="language">${options}</select>
		<button id="run" disabled>Extract text</button>
		<button id="cancel" class="secondary" hidden>Cancel</button>
	</div>

	<div id="progress" hidden aria-live="polite">
		<div class="progress-label"><span id="progress-text"></span><span id="progress-value"></span></div>
		<div class="bar"><div id="bar-fill"></div></div>
	</div>

	<div class="error" id="error" role="alert" hidden></div>

	<section id="result" hidden>
		<div class="result-head">
			<h2>Result</h2>
			<span class="count" id="count"></span>
			<span class="spacer"></span>
			<button id="copy">Copy</button>
			<button id="open" class="secondary">Open in editor</button>
			<button id="clear" class="secondary">Clear</button>
		</div>
		<textarea id="text" spellcheck="false" aria-label="Recognized text"></textarea>
	</section>
</main>
<script nonce="${nonce}">${SCRIPT}</script>
</body>
</html>`;
}
