/** Shared decorative scenery. Families opt into only the elements used by their template. */
export function Scene({
	sun = false,
	stars = false,
	grid,
}: {
	sun?: boolean;
	stars?: boolean;
	grid?: "perspective" | "horizon";
}): JSX.Element {
	return (
		<div className="juya-scene" aria-hidden="true">
			{stars && <div className="juya-scene-stars" />}
			{sun && <div className="juya-scene-sun" />}
			{grid && <div className={`juya-scene-grid juya-scene-grid-${grid}`} />}
		</div>
	);
}
