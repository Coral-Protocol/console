<script lang="ts">
	import { VList } from 'virtua/svelte';
	import type { VListHandle } from 'virtua/svelte';
	import { flip } from 'svelte/animate';
	import { fade, scale } from 'svelte/transition';

	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import { Checkbox } from '@coral-os/component-library/ui/checkbox/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';

	import Filter from '@lucide/svelte/icons/filter';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Clock from '@lucide/svelte/icons/clock';
	import Minimize2 from '@lucide/svelte/icons/minimize-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';

	import type {
		AgentLane,
		Session,
		SessionEventEntry,
		SessionEventType
	} from '../session.svelte';
	import { allEventTypes, eventMetaByType } from './event-meta';
	import { colorClasses } from './event-color';
	import { buildLayout, formatDuration } from './layout';
	import type { WaterfallRow } from './layout';

	import EventChip from './EventChip.svelte';
	import EventDialog from './EventDialog.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		session: Session;
	}

	let { session }: Props = $props();

	/* ──────────────────────────────────────────────────────────────────
	   Layout constants
	   These are tuned for a comfortable density at 1× zoom while still
	   leaving the virtualization pipeline plenty of headroom. They are
	   intentionally local to the component — layout/render concerns live
	   here, while the *math* of producing rows is in ./layout.ts.
	   ────────────────────────────────────────────────────────────────── */
	const LANE_WIDTH = 140;
	const LANE_PAD = 24;
	const TIME_GUTTER = 88;
	const ROW_HEIGHT = 36;
	const GAP_HEIGHT = 28;
	const MIN_ROW_GAP = 6;
	const COLLAPSE_THRESHOLD_PX = 96;
	const HEADER_HEIGHT = 48;

	/* ──────────────────────────────────────────────────────────────────
	   Filter state
	   ────────────────────────────────────────────────────────────────── */
	let hideSleeping = $state(false);
	// Empty set = "all types allowed". This keeps the common case cheap
	// and avoids forcing users to manually opt-in every event type.
	let allowedTypes = new SvelteSet<SessionEventType>();
	let zoom = $state(1); // multiplier on pxPerMs

	// Adaptive base scale: clamp the timeline so it doesn't explode to
	// gigapixel heights for long sessions and doesn't collapse to nothing
	// for short ones. Tuned to give ~120 px / 10s at zoom=1.
	const BASE_PX_PER_MS = 0.012;
	let pxPerMs = $derived(BASE_PX_PER_MS * zoom);

	/* ──────────────────────────────────────────────────────────────────
	   Layout snapshot
	   We pass primitive arrays into the pure layout function and re-derive
	   on any input change. The function is fast enough (~O(events)) that
	   we don't need incremental updates for the planned event volumes.
	   ────────────────────────────────────────────────────────────────── */
	let lanes = $derived(Object.values(session.agentLanes) as AgentLane[]);
	let layout = $derived(
		buildLayout({
			events: session.events,
			lanes,
			agentStatuses: session.agents,
			hideSleeping,
			allowedTypes,
			pxPerMs,
			minRowGap: MIN_ROW_GAP,
			collapseThresholdPx: COLLAPSE_THRESHOLD_PX,
			gapHeight: GAP_HEIGHT,
			rowHeight: ROW_HEIGHT
		})
	);

	let visibleLanes = $derived(layout.visibleLanes);
	let rows = $derived(layout.rows);

	// Width of the lane area; the timestamp gutter sits to its left.
	let lanesWidth = $derived(Math.max(LANE_WIDTH, visibleLanes.length * LANE_WIDTH));
	let totalWidth = $derived(TIME_GUTTER + LANE_PAD * 2 + lanesWidth);

	/* ──────────────────────────────────────────────────────────────────
	   Click → modal
	   ────────────────────────────────────────────────────────────────── */
	let activeEntry = $state<SessionEventEntry | null>(null);
	const openEntry = (entry: SessionEventEntry) => (activeEntry = entry);
	const handleDialogChange = (open: boolean) => {
		if (!open) activeEntry = null;
	};

	/* ──────────────────────────────────────────────────────────────────
	   Lane geometry helpers
	   Lane X is the horizontal center of a lane column, relative to the
	   row's content box (which already excludes the timestamp gutter).
	   ────────────────────────────────────────────────────────────────── */
	function laneCenterX(visibleIndex: number): number {
		return LANE_PAD + visibleIndex * LANE_WIDTH + LANE_WIDTH / 2;
	}

	function toggleType(type: SessionEventType) {
		if (allowedTypes.has(type)) allowedTypes.delete(type);
		else allowedTypes.add(type);
	}

	function selectAllTypes() {
		allowedTypes.clear();
	}


	/* ──────────────────────────────────────────────────────────────────
	   Auto-scroll-to-bottom when new events arrive, but only if the user
	   is already pinned to the tail. virtua owns the vertical scroll, so
	   we use its imperative handle to drive follow-tail.
	   ────────────────────────────────────────────────────────────────── */
	let stickToBottom = $state(true);
	let vlist = $state<VListHandle | null>(null);

	function handleScroll(offset: number) {
		if (!vlist) return;
		const total = vlist.getScrollSize();
		const viewport = vlist.getViewportSize();
		const distance = total - offset - viewport;
		stickToBottom = distance < 32;
	}

	// Auto-follow tail: when a new row is added and we were pinned, scroll
	// the virtua viewport to the last index on the next microtask.
	let lastRowCount = $state(0);
	$effect(() => {
		const n = rows.length;
		if (n > lastRowCount && stickToBottom && vlist) {
			queueMicrotask(() => {
				vlist?.scrollToIndex(rows.length - 1, { align: 'end' });
			});
		}
		lastRowCount = n;
	});
</script>

<div class="flex h-full min-h-0 flex-col">
	<!-- ─── Toolbar ─────────────────────────────────────────────────── -->
	<div class="flex flex-wrap items-center gap-2 border-b px-3 py-2">
		<label class="flex items-center gap-2 text-sm">
			<Checkbox bind:checked={hideSleeping} />
			<EyeOff class="size-3.5" />
			Hide sleeping agents
		</label>

		<Separator orientation="vertical" class="h-5" />

		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm">
						<Filter class="size-3.5" />
						Event types
						<span class="text-muted-foreground ml-1 text-xs">
							{allowedTypes.size === 0 ? 'all' : `${allowedTypes.size}/${allEventTypes.length}`}
						</span>
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-72" align="start">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm font-semibold">Event types</span>
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground text-xs"
						onclick={selectAllTypes}
					>
						Show all
					</button>
				</div>
				<div class="grid max-h-72 grid-cols-1 gap-1 overflow-auto">
    {#each allEventTypes as type (type)}
						{@const m = eventMetaByType[type]}
						{@const colors = colorClasses(m.color)}
						{@const active = allowedTypes.size === 0 || allowedTypes.has(type)}
						{@const Icon = m.icon}
						<button
							type="button"
							class="hover:bg-accent flex items-center gap-2 rounded px-2 py-1 text-left text-xs"
							onclick={() => toggleType(type)}
						>
							<Icon class="size-3.5 {colors.icon}" />
							<span class="flex-1 truncate">{m.label}</span>
							<span class="text-muted-foreground text-[10px]">
								{active ? 'on' : 'off'}
							</span>
						</button>
					{/each}
				</div>
			</Popover.Content>
		</Popover.Root>

		<Separator orientation="vertical" class="h-5" />

		<div class="flex items-center gap-1 text-sm">
			<Clock class="size-3.5" />
			<button
				type="button"
				class="hover:bg-accent rounded p-1"
				aria-label="Zoom out"
				onclick={() => (zoom = Math.max(0.1, zoom / 1.5))}
			>
				<Minus class="size-3.5" />
			</button>
			<span class="text-muted-foreground w-12 text-center font-mono text-xs">
				{zoom.toFixed(2)}×
			</span>
			<button
				type="button"
				class="hover:bg-accent rounded p-1"
				aria-label="Zoom in"
				onclick={() => (zoom = Math.min(20, zoom * 1.5))}
			>
				<Plus class="size-3.5" />
			</button>
		</div>

		<div class="text-muted-foreground ml-auto text-xs">
			{session.events.length} event{session.events.length === 1 ? '' : 's'} ·
			{visibleLanes.length}/{lanes.length} agent{lanes.length === 1 ? '' : 's'}
		</div>
	</div>

	<!-- ─── Body ────────────────────────────────────────────────────── -->
	{#if visibleLanes.length === 0 || rows.length === 0}
		<div class="text-muted-foreground flex flex-1 items-center justify-center text-sm">
			No events match the current filter.
		</div>
	{:else}
		<!--
		  Outer container scrolls horizontally only (for wide lane grids).
		  virtua's VList owns the vertical scroll inside it, so the lane
		  header is a regular sibling above the list rather than
		  position:sticky inside a scrollable parent (which won't work
		  because vertical scroll happens inside VList).
		-->
		<div class="relative flex min-h-0 flex-1 flex-col overflow-x-auto" style="width: 100%;">
			<!-- Lane header. width matches the row content so chips and header -->
			<!-- lane columns align pixel-for-pixel. -->
			<div
				class="bg-background/95 z-20 flex shrink-0 border-b backdrop-blur"
				style="height: {HEADER_HEIGHT}px; width: {totalWidth}px;"
			>
				<div class="text-muted-foreground flex shrink-0 items-center justify-end pr-3 text-[10px]"
					style="width: {TIME_GUTTER}px;">
					time
				</div>
				<div class="relative" style="width: {LANE_PAD * 2 + lanesWidth}px;">
					{#each visibleLanes as { lane, visibleIndex } (lane.name)}
						<div
							class="absolute top-0 flex h-full flex-col items-center justify-center overflow-hidden px-2"
							style="left: {laneCenterX(visibleIndex) - LANE_WIDTH / 2}px; width: {LANE_WIDTH}px;"
							in:scale={{ duration: 200, start: 0.85 }}
							animate:flip={{ duration: 200 }}
						>
							<span
								class="block w-full truncate text-center text-xs font-medium"
								class:text-muted-foreground={!lane.present}
								title={lane.name}
							>
								{lane.name}
							</span>
							<span class="text-muted-foreground block w-full truncate text-center font-mono text-[10px]">
								#{lane.index}{lane.present ? '' : ' · gone'}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Virtualized row list. Each row paints its own lane lines so -->
			<!-- the sequence-diagram effect survives even on long idle gaps. -->
			<!--
			  VList owns the vertical scroll. We pin its width to totalWidth
			  so horizontal overflow is driven by the outer container, and
			  give it min-h-0 flex-1 so it actually gets a non-zero height
			  inside the flex column (without this it collapses and no rows
			  render).
			-->
			<div class="min-h-0 flex-1" style="width: {totalWidth}px;">
				<VList
					bind:this={vlist}
					data={rows}
					getKey={(row: WaterfallRow) => row.key}
					itemSize={ROW_HEIGHT}
					onscroll={handleScroll}
					style="height: 100%;"
				>
					{#snippet children(row: WaterfallRow)}
						{#if row.kind === 'event'}
							{@const e = row}
							<div
								class="relative flex items-stretch"
								style="height: {e.height + e.gapBefore}px; padding-top: {e.gapBefore}px;"
								in:fade={{ duration: 160 }}
							>
								<!-- timestamp gutter -->
								<div
									class="text-muted-foreground flex shrink-0 items-center justify-end pr-3 font-mono text-[10px]"
									style="width: {TIME_GUTTER}px;"
								>
									{new Date(e.entry.time).toLocaleTimeString(undefined, { hour12: false })}
								</div>

								<!-- lane canvas: SVG vertical lines + chip overlay -->
								<div class="relative flex-1" style="width: {LANE_PAD * 2 + lanesWidth}px;">
									<!--
									  Lane connector lines. Rendered per-row so virtua can
									  freely mount/unmount rows without breaking the visual
									  continuity of the sequence diagram. Each line spans
									  the full row height; together they form a continuous
									  column down the timeline.
									-->
									<svg
										class="pointer-events-none absolute inset-0"
										aria-hidden="true"
										width="100%"
										height="100%"
									>
										{#each visibleLanes as { lane, visibleIndex } (lane.name)}
											<line
												x1={laneCenterX(visibleIndex)}
												x2={laneCenterX(visibleIndex)}
												y1={0}
												y2={e.height + e.gapBefore}
												stroke="currentColor"
												class="text-border"
												stroke-width="1"
												stroke-dasharray={lane.present ? '0' : '2 3'}
											/>
										{/each}
									</svg>

									{#if e.visibleLaneIndex !== null}
										<div
											class="absolute flex items-center"
											style="left: {laneCenterX(e.visibleLaneIndex) - LANE_WIDTH / 2}px; top: {e.gapBefore}px; height: {e.height}px; width: {LANE_WIDTH}px; justify-content: center;"
										>
											<EventChip
												entry={e.entry}
												onclick={openEntry}
												anchorSide={e.visibleLaneIndex > visibleLanes.length / 2
													? 'right'
													: 'left'}
											/>
										</div>
									{:else}
										<!-- Session-scoped events (e.g. thread_created) get a -->
										<!-- centered chip spanning the lane block. -->
										<div
											class="absolute inset-x-0 flex items-center justify-center"
											style="top: {e.gapBefore}px; height: {e.height}px;"
										>
											<EventChip entry={e.entry} onclick={openEntry} />
										</div>
									{/if}
								</div>
							</div>
						{:else}
							<!-- Collapsed idle / filtered gap row -->
							<div
								class="text-muted-foreground flex items-center"
								style="height: {row.height}px;"
								in:fade={{ duration: 140 }}
							>
								<div
									class="flex shrink-0 items-center justify-end pr-3 text-[10px]"
									style="width: {TIME_GUTTER}px;"
								>
									<Minimize2 class="size-3" />
								</div>
								<div
									class="border-border/60 mx-2 flex flex-1 items-center gap-2 border-y border-dashed px-3 py-1 text-xs italic"
								>
									<span>{formatDuration(row.durationMs)} idle</span>
									{#if row.hiddenCount > 0}
										<span class="text-muted-foreground/80">
											· {row.hiddenCount} event{row.hiddenCount === 1 ? '' : 's'} hidden
										</span>
									{/if}
								</div>
							</div>
						{/if}
					{/snippet}
				</VList>
			</div>
		</div>
	{/if}
</div>

<EventDialog entry={activeEntry} onOpenChange={handleDialogChange} />
