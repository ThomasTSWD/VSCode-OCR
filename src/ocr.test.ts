import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeImage, isLanguage, MAX_IMAGE_BYTES } from './ocr';
import { getHtml } from './webview';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

test('decodeImage accepts supported images and rejects everything else', () => {
	assert.ok(decodeImage(PNG).length > 0);
	assert.throws(() => decodeImage('data:text/html;base64,AAAA'), /Unsupported file/);
	assert.throws(() => decodeImage('not a data url'), /Unsupported file/);
	assert.throws(() => decodeImage(undefined), /Unsupported file/);
});

test('decodeImage rejects images over the size limit', () => {
	const huge = 'data:image/png;base64,' + Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64');
	assert.throws(() => decodeImage(huge), /larger than 25 MB/);
});

test('isLanguage only accepts supported language codes', () => {
	assert.equal(isLanguage('fra'), true);
	assert.equal(isLanguage('xxx'), false);
	assert.equal(isLanguage('toString'), false);
	assert.equal(isLanguage(42), false);
});

test('getHtml locks the page down with a nonce-based CSP', () => {
	const html = getHtml('abc123', 'fra');
	assert.match(html, /default-src 'none'/);
	assert.match(html, /script-src 'nonce-abc123'/);
	assert.match(html, /<option value="fra" selected>/);
	assert.doesNotMatch(html, /https?:\/\//);
});
