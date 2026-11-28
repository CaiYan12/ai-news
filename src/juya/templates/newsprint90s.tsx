import { makeJuyaTemplate } from "./base";
import { EntryBlocks, EntryTitle, IssueFooter, OverviewItems } from "./shared";
import { NewsprintFeedMasthead } from "./newsprint90s-feed-craft";
import type { JuyaIssueProps, JuyaTemplate } from "../templateTypes";

const VARIANT_CLASS = "jynews";

function mastheadParts(pubDate: string): { date: string; weekday: string } {
	const date = new Date(pubDate);
	return {
		date: date.toLocaleDateString("zh-CN", {
			year: "numeric",
			month: "long",
			day: "numeric",
		}),
		weekday: date.toLocaleDateString("zh-CN", { weekday: "long" }),
	};
}

function IssueView({ article, issue, onOpenLink, variantId }: JuyaIssueProps): JSX.Element {
	const { date, weekday } = mastheadParts(article.pubDate);
	return (
		<div className="juya-root jynews" data-juya-variant={variantId}>
			<div className="juya-issue">
				<header className="juya-masthead">
					<div className="juya-date-line">{date}</div>
					<h1 className="juya-masthead-title">{issue.heading || article.title}</h1>
					<div className="juya-masthead-weekday">{weekday}</div>
				</header>
				{issue.overview && (
					<aside className="jynews-overview">
						<p className="jynews-overview-label">导读</p>
						<OverviewItems overview={issue.overview} onOpenLink={onOpenLink} />
					</aside>
				)}
				{issue.sections.map((section, sectionIndex) => (
					<section className="juya-section" key={`${section.heading}-${sectionIndex}`}>
						<h2>{section.heading}</h2>
						{section.entries.map((entry, index) => (
							<article className="juya-entry" key={index}>
								<EntryTitle entry={entry} onOpenLink={onOpenLink} />
								<div className="juya-entry-columns">
									<EntryBlocks entry={entry} onOpenLink={onOpenLink} />
								</div>
							</article>
						))}
					</section>
				))}
				<IssueFooter footer={issue.footer} />
			</div>
		</div>
	);
}

const feedTemplate = makeJuyaTemplate({
	variantClass: VARIANT_CLASS,
	entryColumns: true,
	feedScene: ({ name, url }) => <NewsprintFeedMasthead sourceName={name} sourceUrl={url} />,
});

export const newsprint90sTemplate: JuyaTemplate = { ...feedTemplate, IssueView };
