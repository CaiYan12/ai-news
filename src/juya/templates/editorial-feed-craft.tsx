import { sourceHostname } from "./shared";

export function EditorialFeedMasthead({
	sourceName,
	sourceUrl,
}: {
	sourceName: string;
	sourceUrl: string;
}): JSX.Element {
	const hostname = sourceHostname(sourceUrl);
	return (
		<div className="jyedit-feed-masthead">
			<span aria-hidden="true" className="jyedit-feed-masthead-corner jyedit-feed-masthead-corner-tl" />
			<span aria-hidden="true" className="jyedit-feed-masthead-corner jyedit-feed-masthead-corner-br" />
			<p className="jyedit-feed-masthead-kicker">订阅源</p>
			<h1>{sourceName}</h1>
			{hostname && <p className="jyedit-feed-masthead-domain">{hostname}</p>}
		</div>
	);
}
