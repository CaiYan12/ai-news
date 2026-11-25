import { makeJuyaTemplate } from "./base";
import { EntryTitle, ImageGrid, Lead, LinksBlock, OverviewItems, Paragraphs } from "./shared";
import { PopFeedMasthead } from "./pop-feed-craft";
import type { JuyaTemplate, JuyaIssueProps } from "../templateTypes";

const VARIANT_CLASS = "jypop";

function issueNoOf(heading: string, pubDate: string): string | null {
	const match =
		/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/.exec(heading) ??
		/(\d{4})-(\d{1,2})-(\d{1,2})/.exec(pubDate);
	if (!match) return null;
	return `${match[2].padStart(2, "0")}.${match[3].padStart(2, "0")}`;
}

function IssueView({ article, issue, onOpenLink, variantId }: JuyaIssueProps): JSX.Element {
	const issueNo = issueNoOf(issue.heading || article.title, article.pubDate);
	return (
		<div className={`juya-root ${VARIANT_CLASS}`} data-juya-variant={variantId}>
			<div className="juya-issue">
				<header className="juya-masthead">
					<div className="jypop-title-panel">
						<h1>{issue.heading || article.title}</h1>
					</div>
					{issueNo && (
						<div className="jypop-issue-panel">
							<span className="jypop-issue-no" aria-hidden="true">
								{issueNo}
							</span>
						</div>
					)}
					<div className="jypop-strip" aria-hidden="true" />
				</header>
				{issue.overview && <OverviewItems overview={issue.overview} onOpenLink={onOpenLink} />}
				{issue.sections.map((section, sectionIndex) => (
					<section className="juya-section" key={`${section.heading}-${sectionIndex}`}>
						<h2>{section.heading}</h2>
						{section.entries.map((entry, index) => (
							<article className="juya-entry" key={index}>
								<EntryTitle entry={entry} onOpenLink={onOpenLink} />
								{entry.lead && <Lead lead={entry.lead} />}
								<Paragraphs paragraphs={entry.paragraphs} />
								{entry.images.length > 0 && (
									<ImageGrid images={entry.images} mode={index === 0 ? "hero" : "grid"} />
								)}
								<LinksBlock links={entry.links} onOpenLink={onOpenLink} />
							</article>
						))}
					</section>
				))}
			</div>
		</div>
	);
}

const feedTemplate = makeJuyaTemplate({
	variantClass: VARIANT_CLASS,
	feedScene: ({ name, url }) => <PopFeedMasthead sourceName={name} sourceUrl={url} />,
});

export const popTemplate: JuyaTemplate = { ...feedTemplate, IssueView };
