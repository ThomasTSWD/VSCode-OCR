# VSCode OCR

[![Release](https://img.shields.io/github/v/release/ThomasTSWD/VSCode-OCR)](https://github.com/ThomasTSWD/VSCode-OCR/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Extract text from images with OCR, right inside VS Code.

## Features

- Right-click an image in the Explorer and extract its text in one step
- Drag and drop (hold Shift), browse or paste (Ctrl+V) an image into the OCR panel
- Copy the result or open it in an editor
- Runs locally: your images are never uploaded
- English, French, German, Spanish, Italian, Portuguese and Dutch

## Installation

1. Download the latest `.vsix` from the [Releases](https://github.com/ThomasTSWD/VSCode-OCR/releases/latest) page
2. In VS Code, run **Extensions: Install from VSIX...** and select the file

## Usage

VS Code needs **Shift** held to drop a file onto the panel. Right-click a PNG, JPEG, BMP, WebP or GIF file and choose **Extract Text from Image**, or run **OCR: Open OCR Panel** from the Command Palette. Set the default language with `codeocr.defaultLanguage`.

## Requirements

Language data (a few MB) is downloaded on first use of each language, then cached. Virtual workspaces are not supported.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
