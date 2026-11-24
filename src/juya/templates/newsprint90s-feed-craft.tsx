import { sourceHostname } from "./shared";

export function NewsprintFeedMasthead({
	sourceName,
	sourceUrl,
}: {
	sourceName: string;
	sourceUrl: string;
}): JSX.Element {
	const hostname = sourceHostname(sourceUrl);
	return (
		<div className="jynews-feed-masthead">
			<p className="jynews-feed-masthead-kicker">订阅源</p>
			<h1>{sourceName}</h1>
			{hostname && <p className="jynews-feed-masthead-domain">{hostname}</p>}
		</div>
	);
}
