const vscode = require("vscode");
const path = require("path");

function activate(context) {
	let disposable = vscode.commands.registerCommand("extension.codeocr", () => {
		const panel = vscode.window.createWebviewPanel(
			"codeocer",
			"OCR",
			vscode.ViewColumn.One,
			{
				enableScripts: true,
			}
		);

		const htmlPath = path.join(context.extensionPath, "index.html");
		panel.webview.html = getHtmlContent(htmlPath);
	});

	context.subscriptions.push(disposable);
}

function getHtmlContent(htmlPath) {
	const fs = require("fs");
	return fs.readFileSync(htmlPath, "utf8");
}

exports.activate = activate;
