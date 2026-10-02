import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { decodeImage, isLanguage, recognize } from './ocr';
import { getHtml } from './webview';

const IMAGE_MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.bmp': 'image/bmp',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
};

let panel: vscode.WebviewPanel | undefined;
let running: AbortController | undefined;
let ready = false;
let pending: object | undefined;

function defaultLanguage(): string {
	const value = vscode.workspace.getConfiguration('codeocr').get('defaultLanguage');
	return isLanguage(value) ? value : 'eng';
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function handleMessage(
	context: vscode.ExtensionContext,
	webview: vscode.Webview,
	message: { type: string; [key: string]: unknown }
): Promise<void> {
	switch (message.type) {
		case 'ready':
			ready = true;
			if (pending) {
				void webview.postMessage(pending);
				pending = undefined;
			}
			break;
		case 'recognize': {
			running?.abort();
			const controller = new AbortController();
			running = controller;
			try {
				const image = decodeImage(message.dataUrl);
				if (!isLanguage(message.language)) {
					throw new Error('Unsupported language.');
				}
				const cachePath = path.join(context.globalStorageUri.fsPath, 'tessdata');
				await fs.mkdir(cachePath, { recursive: true });
				const text = await recognize(
					image,
					message.language,
					cachePath,
					(progress) => void webview.postMessage({ type: 'progress', ...progress }),
					controller.signal
				);
				void webview.postMessage({ type: 'result', text });
			} catch (error) {
				if (controller.signal.aborted) {
					void webview.postMessage({ type: 'cancelled' });
				} else {
					void webview.postMessage({ type: 'error', message: errorMessage(error) });
				}
			} finally {
				if (running === controller) {
					running = undefined;
				}
			}
			break;
		}
		case 'cancel':
			running?.abort();
			break;
		case 'copy':
			if (typeof message.text === 'string') {
				await vscode.env.clipboard.writeText(message.text);
				void webview.postMessage({ type: 'copied' });
			}
			break;
		case 'openInEditor':
			if (typeof message.text === 'string') {
				const document = await vscode.workspace.openTextDocument({ content: message.text });
				await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
			}
			break;
	}
}

function showPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
	if (panel) {
		panel.reveal();
		return panel;
	}
	const created = vscode.window.createWebviewPanel('codeocr', 'OCR', vscode.ViewColumn.Beside, {
		enableScripts: true,
		retainContextWhenHidden: true,
		localResourceRoots: [],
	});
	created.webview.html = getHtml(randomBytes(16).toString('base64'), defaultLanguage());
	created.webview.onDidReceiveMessage(
		(message) => handleMessage(context, created.webview, message),
		undefined,
		context.subscriptions
	);
	created.onDidDispose(() => {
		running?.abort();
		panel = undefined;
		ready = false;
		pending = undefined;
	});
	panel = created;
	return created;
}

async function recognizeImage(context: vscode.ExtensionContext, uri?: vscode.Uri): Promise<void> {
	if (!uri || uri.scheme !== 'file') {
		vscode.window.showErrorMessage('Select an image file on disk.');
		return;
	}
	const mime = IMAGE_MIME[path.extname(uri.fsPath).toLowerCase()];
	if (!mime) {
		vscode.window.showErrorMessage('This file is not a supported image.');
		return;
	}
	try {
		const data = await fs.readFile(uri.fsPath);
		const target = showPanel(context);
		const message = {
			type: 'loadImage',
			dataUrl: `data:${mime};base64,${data.toString('base64')}`,
			name: path.basename(uri.fsPath),
			size: data.length,
			language: defaultLanguage(),
		};
		if (ready) {
			void target.webview.postMessage(message);
		} else {
			pending = message;
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Could not read the image: ${errorMessage(error)}`);
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('codeocr.open', () => void showPanel(context)),
		vscode.commands.registerCommand('codeocr.recognizeImage', (uri?: vscode.Uri) =>
			recognizeImage(context, uri)
		)
	);
}

export function deactivate() {
	running?.abort();
}
