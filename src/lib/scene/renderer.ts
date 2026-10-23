import { PCFShadowMap, WebGLRenderer, type Camera, type Scene } from 'three';

const MAX_PIXEL_RATIO = 2;
export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
	// preserveDrawingBuffer: browser screenshots and screen captures of the canvas come out blank without it.
	const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
	renderer.setPixelRatio(pixelRatio());
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFShadowMap;
	return renderer;
}

interface LoopHooks {
	/** Called with the canvas CSS size whenever it changes. */
	onResize(width: number, height: number): void;
	/** Called every frame before rendering. */
	onFrame(): void;
}

/** Sizes the drawing buffer to the canvas and renders every frame. Returns a stop function. */
export function startLoop(
	renderer: WebGLRenderer,
	scene: Scene,
	camera: Camera,
	hooks: LoopHooks
): () => void {
	const canvas = renderer.domElement;

	const resize = () => {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (width === 0 || height === 0) return;
		renderer.setPixelRatio(pixelRatio());
		renderer.setSize(width, height, false);
		hooks.onResize(width, height);
	};

	const observer = new ResizeObserver(resize);
	observer.observe(canvas);
	resize();

	renderer.setAnimationLoop(() => {
		// devicePixelRatio changes (e.g. moving to another monitor) don't resize the canvas.
		if (renderer.getPixelRatio() !== pixelRatio()) resize();
		hooks.onFrame();
		renderer.render(scene, camera);
	});

	return () => {
		renderer.setAnimationLoop(null);
		observer.disconnect();
	};
}
