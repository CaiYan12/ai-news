import { makeJuyaTemplate } from "./base";
import { EntryTitle, Lead, LinksBlock, OverviewItems } from "./shared";
import { WabiFeedMasthead } from "./wabi-feed-craft";
import { WabiReadingMasthead } from "./wabi-reading-craft";
import type { JuyaIssueProps, JuyaTemplate } from "../templateTypes";

const VARIANT_CLASS = "jywabi";

function WabiIssue({ article, issue, onOpenLink, variantId }: JuyaIssueProps): JSX.Element {
	return (
		<div className={`juya-root ${VARIANT_CLASS} wabi-reading-craft`} data-juya-variant={variantId}>
			<div className="juya-issue">
				<WabiReadingMasthead heading={issue.heading || article.title} pubDate={article.pubDate} />
				{issue.overview && <OverviewItems overview={issue.overview} onOpenLink={onOpenLink} />}
				{issue.sections.map((section) => (
					<section className="juya-section" key={section.heading}>
						<h2>{section.heading}</h2>
						{section.entries.map((entry, index) => {
							const blocks = entry.blocks.length
								? entry.blocks
								: [
										...entry.paragraphs.map((text) => ({ kind: "paragraph" as const, text })),
										...entry.images.map((image) => ({ kind: "image" as const, image })),
									];
							return (
								<article className="juya-entry" key={index}>
									<EntryTitle entry={entry} onOpenLink={onOpenLink} />
									{entry.lead && <Lead lead={entry.lead} />}
									{blocks.map((block, blockIndex) =>
										block.kind === "paragraph" ? (
											<p key={`p-${blockIndex}`}>{block.text}</p>
										) : (
											<figure className="jywabi-figure" key={`img-${blockIndex}`}>
												<img src={block.image.src} alt={block.image.alt} loading="lazy" />
												{block.image.alt && <figcaption>{block.image.alt}</figcaption>}
											</figure>
										)
									)}
									<LinksBlock links={entry.links} onOpenLink={onOpenLink} />
								</article>
							);
						})}
					</section>
				))}
			</div>
		</div>
	);
}

const sharedTemplate = makeJuyaTemplate({
	variantClass: VARIANT_CLASS,
	feedScene: ({ name, url }) => <WabiFeedMasthead sourceName={name} sourceUrl={url} />,
});

export const wabiTemplate: JuyaTemplate = { ...sharedTemplate, IssueView: WabiIssue };
