import { sourceHostname } from "./shared";

export function PopFeedMasthead({
	sourceName,
	sourceUrl,
}: {
	sourceName: string;
	sourceUrl: string;
}): JSX.Element {
	const hostname = sourceHostname(sourceUrl);
	return (
		<div className="jypop-feed-masthead">
			<div className="jypop-feed-masthead-panel">
				<p className="jypop-feed-masthead-kicker">订阅源</p>
				<h1>{sourceName}</h1>
			</div>
			{hostname && (
				<div className="jypop-feed-masthead-side">
					<p className="jypop-feed-masthead-domain">{hostname}</p>
				</div>
			)}
			<span className="jypop-feed-masthead-strip" aria-hidden="true" />
		</div>
	);
}
