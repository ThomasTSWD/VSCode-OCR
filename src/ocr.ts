import { createWorker, OEM } from 'tesseract.js';

export const LANGUAGES: Record<string, string> = {
	eng: 'English',
	fra: 'French',
	deu: 'German',
	spa: 'Spanish',
	ita: 'Italian',
	por: 'Portuguese',
	nld: 'Dutch',
};

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/bmp', 'image/webp', 'image/gif'];
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export interface Progress {
	status: string;
	progress: number;
}

const STATUS_LABELS: Record<string, string> = {
	'loading tesseract core': 'Loading OCR engine',
	'initializing tesseract': 'Loading OCR engine',
	'loading language traineddata': 'Loading language data (downloaded once)',
	'initializing api': 'Preparing recognition',
	'recognizing text': 'Recognizing text',
};

export function isLanguage(value: unknown): value is string {
	return typeof value === 'string' && Object.hasOwn(LANGUAGES, value);
}

/**
 * Parses a base64 data URL and checks it is a supported image of a reasonable size.
 */
export function decodeImage(dataUrl: unknown): Buffer {
	const match = typeof dataUrl === 'string' ? /^data:([\w/+.-]+);base64,/.exec(dataUrl) : null;
	if (!match || !IMAGE_TYPES.includes(match[1])) {
		throw new Error('Unsupported file. Use a PNG, JPEG, BMP, WebP or GIF image.');
	}
	const image = Buffer.from((dataUrl as string).slice(match[0].length), 'base64');
	if (image.length > MAX_IMAGE_BYTES) {
		throw new Error('The image is larger than 25 MB.');
	}
	return image;
}

export async function recognize(
	image: Buffer,
	language: string,
	cachePath: string,
	onProgress: (progress: Progress) => void,
	signal: AbortSignal
): Promise<string> {
	const worker = await createWorker(language, OEM.LSTM_ONLY, {
		cachePath,
		logger: (message) => {
			const status = STATUS_LABELS[message.status];
			if (status && !signal.aborted) {
				onProgress({ status, progress: message.progress });
			}
		},
	});
	const abort = () => void worker.terminate();
	signal.addEventListener('abort', abort);
	try {
		if (signal.aborted) {
			throw new Error('Cancelled');
		}
		const { data } = await worker.recognize(image);
		return data.text.trim();
	} catch (error) {
		throw signal.aborted ? new Error('Cancelled') : error;
	} finally {
		signal.removeEventListener('abort', abort);
		await worker.terminate().catch(() => undefined);
	}
}
