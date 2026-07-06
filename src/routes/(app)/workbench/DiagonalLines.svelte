<svg
	xmlns="http://www.w3.org/2000/svg"
	width="400"
	height="400"
	viewBox="0 0 400 400"
	class="text-foreground absolute top-0 left-0"
>
	<defs>
		<pattern
			id="diagonalLines"
			width="24"
			height="24"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(45)"
		>
			<line x1="0" y1="0" x2="0" y2="24" stroke="currentColor" stroke-width="2" />
		</pattern>

		<linearGradient id="fade" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="white" stop-opacity="0.15" />
			<stop offset="50%" stop-color="white" stop-opacity="0.05" />
			<stop offset="100%" stop-color="white" stop-opacity="0" />
		</linearGradient>

		<mask id="mask">
			<rect width="100%" height="100%" fill="url(#fade)" />
		</mask>
	</defs>

	<rect width="100%" height="100%" fill="url(#diagonalLines)" mask="url(#mask)" />
</svg>
