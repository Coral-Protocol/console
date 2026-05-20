<script lang="ts">
	let { class: class_ }: { class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width="1em"
	height="1em"
	viewBox="0 0 24 24"
	pointer-events="none"
	display="inline-block"
	class={class_}
	aria-hidden="true"
>
	<path d="M0 0h24v24H0z" fill="none" />
	<g
		fill="none"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
	>
		<rect width="18" height="12" x="2" y="9" rx="4" />
		<circle cx="12" cy="3" r="2" />
		<path d="M12 5v4m-3 8v-2m6 0v2" />
	</g>
</svg>
