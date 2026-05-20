/**
 * Tiny force-directed layout for the session graph. We deliberately roll
 * our own (a few dozen lines) instead of pulling in d3-force or the
 * @unovis VisGraph because we need fine-grained control over per-frame
 * animations (message flashes traveling along live edges) and stable
 * node positions when topology updates incrementally.
 *
 * Forces, all integrated with explicit Euler:
 *   - Spring along every link (rest length = link.distance).
 *   - Coulomb-like repulsion approximated with a uniform spatial grid
 *     (each node only considers others in its cell + 8 neighbors). This
 *     turns the per-frame cost from strict O(n²) into O(n + k·n) on
 *     near-uniform distributions, which is what lets the view scale to
 *     thousands of nodes without freezing the tab.
 *   - Soft centering toward (width/2, height/2).
 *   - Hard clamp to the canvas bounds so nodes can't escape.
 *
 * Speeds are scaled by the per-frame `dt` (clamped) so the layout looks
 * the same whether the browser hits 30 or 144 fps.
 */

export interface GraphNode {
	id: string;
	kind: 'agent' | 'thread';
	label: string;
	x: number;
	y: number;
	vx: number;
	vy: number;
	/** When true the simulation will not update x/y/vx/vy for this node
	 *  (used while dragging or for sticky selections). */
	pinned?: boolean;
}

export interface GraphLink {
	id: string;
	source: string;
	target: string;
	kind: 'group' | 'participation';
	distance: number;
	strength: number;
}

export interface GraphData {
	nodes: { id: string; kind: 'agent' | 'thread'; label: string }[];
	links: Omit<GraphLink, never>[];
}

export interface GraphLayout {
	nodes: GraphNode[];
	links: GraphLink[];
	/** O(1) node lookup, rebuilt by the host whenever `nodes` changes. */
	nodeIndex: Map<string, GraphNode>;
}

/**
 * Runtime-tunable physics parameters. Exposed by the floating control
 * panel so the user can dial in the look without recompiling.
 */
export interface SimParams {
	/** Node-node repulsion strength (Coulomb-like). */
	repulsion: number;
	/** Multiplier applied to every link's stored `strength`. 1 = neutral. */
	linkStrength: number;
	/** Multiplier applied to every link's stored `distance`. 1 = neutral. */
	linkDistance: number;
	/** Pull toward the canvas centre. */
	centerStrength: number;
	/** Velocity damping per ~16ms frame (0..1). */
	damping: number;
	/** Hard cap on |velocity|. */
	maxVelocity: number;
}

export const DEFAULT_SIM_PARAMS: SimParams = {
	repulsion: 6000,
	linkStrength: 1,
	linkDistance: 1,
	centerStrength: 0.0008,
	damping: 0.85,
	maxVelocity: 3
};

interface SimOpts {
	width: number;
	height: number;
	dt: number; // ms since last tick
	params?: SimParams;
}

const PADDING = 40;
/** Cell size for the spatial repulsion grid (pixels). */
const GRID_CELL = 80;
/** Cap the repulsive force per-pair to avoid extreme jitter when two
 *  nodes get spatially coincident. */
const MAX_PAIR_FORCE = 200;

export function buildNodeIndex(nodes: GraphNode[]): Map<string, GraphNode> {
	const m = new Map<string, GraphNode>();
	for (const n of nodes) m.set(n.id, n);
	return m;
}

export function simulate(layout: GraphLayout, _data: GraphData, opts: SimOpts): GraphLayout {
	const { width, height, dt } = opts;
	const params = opts.params ?? DEFAULT_SIM_PARAMS;
	const step = Math.max(0.001, dt / 16.67); // normalise to ~60fps units
	const cx = width / 2;
	const cy = height / 2;
	const nodes = layout.nodes;
	const links = layout.links;
	const nodeIndex = layout.nodeIndex;
	if (nodes.length === 0) return layout;

	// ── Repulsion via uniform spatial grid ──────────────────────────────
	// Each node only repels nodes in its own cell + 8 neighbours, turning
	// the dominant per-frame term from n² into ~n on uniform layouts.
	const cols = Math.max(1, Math.ceil(width / GRID_CELL));
	const rows = Math.max(1, Math.ceil(height / GRID_CELL));
	const cells: GraphNode[][] = new Array(cols * rows);
	for (let i = 0; i < cells.length; i++) cells[i] = [];
	for (const n of nodes) {
		const cxIdx = Math.min(cols - 1, Math.max(0, Math.floor(n.x / GRID_CELL)));
		const cyIdx = Math.min(rows - 1, Math.max(0, Math.floor(n.y / GRID_CELL)));
		cells[cyIdx * cols + cxIdx]!.push(n);
	}
	for (let cyi = 0; cyi < rows; cyi++) {
		for (let cxi = 0; cxi < cols; cxi++) {
			const bucket = cells[cyi * cols + cxi]!;
			if (bucket.length === 0) continue;
			// Walk this cell and the 4 cells at (+1,0), (-1,+1), (0,+1),
			// (+1,+1) — together with the inner self-pair loop this visits
			// every unordered pair within the 3×3 neighbourhood exactly once.
			for (let i = 0; i < bucket.length; i++) {
				const a = bucket[i]!;
				// self bucket: pairs (i, j>i)
				for (let j = i + 1; j < bucket.length; j++) {
					applyRepel(a, bucket[j]!, step, params.repulsion);
				}
				// other buckets in the half-neighbourhood
				applyBucket(a, cells, cols, rows, cxi + 1, cyi, step, params.repulsion);
				applyBucket(a, cells, cols, rows, cxi - 1, cyi + 1, step, params.repulsion);
				applyBucket(a, cells, cols, rows, cxi, cyi + 1, step, params.repulsion);
				applyBucket(a, cells, cols, rows, cxi + 1, cyi + 1, step, params.repulsion);
			}
		}
	}

	// ── Springs along each link (O(1) endpoint lookup via the map) ──────
	for (const link of links) {
		const a = nodeIndex.get(link.source);
		const b = nodeIndex.get(link.target);
		if (!a || !b) continue;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
		const diff = d - link.distance * params.linkDistance;
		const f = diff * link.strength * params.linkStrength;
		const fx = (dx / d) * f;
		const fy = (dy / d) * f;
		a.vx += fx * step;
		a.vy += fy * step;
		b.vx -= fx * step;
		b.vy -= fy * step;
	}

	// ── Centering + integration + clamp ─────────────────────────────────
	const damp = Math.pow(params.damping, step);
	const maxV = params.maxVelocity;
	for (const n of nodes) {
		if (n.pinned) {
			n.vx = 0;
			n.vy = 0;
			continue;
		}
		n.vx += (cx - n.x) * params.centerStrength * step;
		n.vy += (cy - n.y) * params.centerStrength * step;
		n.vx *= damp;
		n.vy *= damp;
		const v = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
		if (v > maxV) {
			n.vx = (n.vx / v) * maxV;
			n.vy = (n.vy / v) * maxV;
		}
		n.x += n.vx * step;
		n.y += n.vy * step;
		if (n.x < PADDING) {
			n.x = PADDING;
			n.vx = Math.abs(n.vx) * 0.3;
		} else if (n.x > width - PADDING) {
			n.x = width - PADDING;
			n.vx = -Math.abs(n.vx) * 0.3;
		}
		if (n.y < PADDING) {
			n.y = PADDING;
			n.vy = Math.abs(n.vy) * 0.3;
		} else if (n.y > height - PADDING) {
			n.y = height - PADDING;
			n.vy = -Math.abs(n.vy) * 0.3;
		}
	}

	return layout;
}

function applyBucket(
	a: GraphNode,
	cells: GraphNode[][],
	cols: number,
	rows: number,
	cxi: number,
	cyi: number,
	step: number,
	repulsion: number
) {
	if (cxi < 0 || cyi < 0 || cxi >= cols || cyi >= rows) return;
	const bucket = cells[cyi * cols + cxi]!;
	for (let k = 0; k < bucket.length; k++) applyRepel(a, bucket[k]!, step, repulsion);
}

function applyRepel(a: GraphNode, b: GraphNode, step: number, repulsion: number) {
	let dx = a.x - b.x;
	let dy = a.y - b.y;
	let d2 = dx * dx + dy * dy;
	if (d2 < 1) {
		dx = Math.random() - 0.5;
		dy = Math.random() - 0.5;
		d2 = dx * dx + dy * dy + 0.01;
	}
	const len = Math.sqrt(d2);
	let f = repulsion / d2;
	if (f > MAX_PAIR_FORCE) f = MAX_PAIR_FORCE;
	const fx = (dx / len) * f;
	const fy = (dy / len) * f;
	a.vx += fx * step;
	a.vy += fy * step;
	b.vx -= fx * step;
	b.vy -= fy * step;
}
