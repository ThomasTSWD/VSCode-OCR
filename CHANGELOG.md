# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.3] - 2026-10-03

### Changed

- Account renamed to thomas-serment: publisher, author and repository links updated

## [1.1.2] - 2026-10-02

### Changed

- Repository renamed to VSCode-OCR and display name prefixed with VSCode

## [1.1.1] - 2026-10-02

### Fixed

- Dropping an image on the panel opened it in a new tab: the panel now says to hold Shift while dropping

## [1.1.0] - 2026-10-02

### Added

- Right-click an image in the Explorer to extract its text directly
- Drag and drop, browse or paste an image into the OCR panel
- Cancel button, progress status, word and character count
- Copy and Open in editor actions for the result
- Dutch, German, Italian, Portuguese and Spanish, with a `codeocr.defaultLanguage` setting
- WebP and GIF support

### Changed

- Redesigned panel that follows the VS Code theme
- Text recognition runs in the extension instead of the webview, with a strict content security policy
- Language data is downloaded once and cached, so later runs work offline
- Rewritten in TypeScript, with automated tests
- Commands renamed to `codeocr.open` and `codeocr.recognizeImage`
- Requires VS Code 1.120 or later

### Fixed

- Recognition errors are now shown instead of silently failing
- Oversized and unsupported files are rejected with a clear message

### Removed

- Bundled copies of Tesseract.js, replaced by the npm dependency

## [1.0.147] - 2024-08-04

### Changed

- Packaging update
