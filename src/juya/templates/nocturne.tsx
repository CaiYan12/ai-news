import { makeJuyaTemplate } from "./base";
import { EntryTitle, IssueFooter, Lead, LinksBlock, OverviewItems, Paragraphs, sourceHostname } from "./shared";
import { Scene } from "./scene";
import type { JuyaEntry } from "../parseJuyaIssue";
import type { JuyaTemplate, JuyaIssueProps } from "../templateTypes";
import "../nocturne.css";

const VARIANT_CLASS = "jynoct";
const NOCTURNE_FIGURE_LIMIT = 2;

function NocturneEntrySplit({
	entry,
	onOpenLink,
}: {
	entry: JuyaEntry;
	onOpenLink: (href: string) => void;
}): JSX.Element {
	const figureImages = entry.images.slice(0, NOCTURNE_FIGURE_LIMIT);
	const overflowImages = entry.images.slice(NOCTURNE_FIGURE_LIMIT);
	return (
		<article className="juya-entry juya-entry-split">
			<div className="juya-entry-row">
				<div className="juya-entry-body">
					<EntryTitle entry={entry} onOpenLink={onOpenLink} />
					{entry.lead && <Lead lead={entry.lead} />}
					<Paragraphs paragraphs={entry.paragraphs} />
				</div>
				{figureImages.length > 0 && (
					<div className="juya-entry-figure">
						<div className="juya-media juya-media-plate">
							{figureImages.map((image, index) => (
								<figure className="juya-plate" key={index}>
									<img src={image.src} alt={image.alt} loading="lazy" />
									{image.alt && <figcaption>{image.alt}</figcaption>}
								</figure>
							))}
						</div>
					</div>
				)}
			</div>
			{overflowImages.length > 0 && (
				<div className="jynoct-overflow-media">
					<div className="juya-media juya-media-grid">
						{overflowImages.map((image, index) => (
							<img key={index} src={image.src} alt={image.alt} loading="lazy" />
						))}
					</div>
				</div>
			)}
			<LinksBlock links={entry.links} onOpenLink={onOpenLink} />
		</article>
	);
}

function IssueView({ article, issue, onOpenLink, variantId }: JuyaIssueProps): JSX.Element {
	return (
		<div className={`juya-root ${VARIANT_CLASS}`} data-juya-variant={variantId}>
			<Scene dust nebula stars />
			<div className="juya-issue">
				<header className="juya-masthead">
					<h1>{issue.heading || article.title}</h1>
				</header>
				{issue.overview && <OverviewItems overview={issue.overview} onOpenLink={onOpenLink} />}
				{issue.sections.map((section, sectionIndex) => (
					<section className="juya-section" key={`${section.heading}-${sectionIndex}`}>
						<h2>{section.heading}</h2>
						{section.entries.map((entry, index) => (
							<NocturneEntrySplit key={index} entry={entry} onOpenLink={onOpenLink} />
						))}
					</section>
				))}
				<IssueFooter footer={issue.footer} />
			</div>
		</div>
	);
}

function FeedMasthead({ sourceName, sourceUrl }: { sourceName: string; sourceUrl: string }): JSX.Element {
	const hostname = sourceHostname(sourceUrl);
	return (
		<div className="jynoct-feed-masthead">
			<p className="jynoct-feed-masthead-kicker">订阅源</p>
			<h1>{sourceName}</h1>
			{hostname && <p className="jynoct-feed-masthead-domain">{hostname}</p>}
		</div>
	);
}

const sharedTemplate = makeJuyaTemplate({
	variantClass: VARIANT_CLASS,
	feedScene: ({ name, url }) => (
		<>
			<Scene dust nebula stars />
			<FeedMasthead sourceName={name} sourceUrl={url} />
		</>
	),
});

export const nocturneTemplate: JuyaTemplate = { ...sharedTemplate, IssueView };
