import { useState } from "react";
import { makeJuyaTemplate } from "./base";
import { EntryTitle, IssueFooter, Lead, LinksBlock, OverviewItems, sourceHostname } from "./shared";
import { EditorialFeedMasthead } from "./editorial-feed-craft";
import type { JuyaContentBlock, JuyaEntry } from "../parseJuyaIssue";
import type { JuyaIssueProps, JuyaTemplate } from "../templateTypes";

const VARIANT_CLASS = "jyedit";

function entryBlocks(entry: JuyaEntry): JuyaContentBlock[] {
	return entry.blocks.length
		? entry.blocks
		: [
				...entry.paragraphs.map((text) => ({ kind: "paragraph" as const, text })),
				...entry.images.map((image) => ({ kind: "image" as const, image })),
			];
}

function EditorialEntry({
	entry,
	onOpenLink,
	sectionOpening = false,
}: {
	entry: JuyaEntry;
	onOpenLink: JuyaIssueProps["onOpenLink"];
	sectionOpening?: boolean;
}): JSX.Element {
	const [openingLayout, setOpeningLayout] = useState<"landscape" | "stacked">("stacked");
	const blocks = entryBlocks(entry);
	const openingImageIndex = sectionOpening
		? blocks.findIndex((block) => block.kind === "image")
		: -1;
	const openingImage = openingImageIndex >= 0 ? blocks[openingImageIndex] : undefined;
	return (
		<article className="juya-entry">
			{sectionOpening ? (
				<div className="juya-editorial-opening" data-image-layout={openingLayout}>
					<div className="juya-editorial-opening-copy">
						<EntryTitle entry={entry} onOpenLink={onOpenLink} />
						{entry.lead && <Lead lead={entry.lead} />}
						{openingImageIndex > 0 &&
							blocks.slice(0, openingImageIndex).map((block, index) =>
								block.kind === "paragraph" ? <p key={index}>{block.text}</p> : null,
							)}
					</div>
					{openingImage?.kind === "image" && (
						<figure className="juya-plate juya-editorial-opening-image">
							<img
								src={openingImage.image.src}
								alt={openingImage.image.alt}
								loading="lazy"
								onLoad={(event) => {
									const { naturalWidth, naturalHeight } = event.currentTarget;
									setOpeningLayout(naturalWidth / naturalHeight >= 1.3 ? "landscape" : "stacked");
								}}
							/>
							{openingImage.image.alt && <figcaption>{openingImage.image.alt}</figcaption>}
						</figure>
					)}
				</div>
			) : (
				<>
					<EntryTitle entry={entry} onOpenLink={onOpenLink} />
					{entry.lead && <Lead lead={entry.lead} />}
				</>
			)}
			{blocks.map((block, index) => {
				if (openingImageIndex >= 0 && index <= openingImageIndex) return null;
				if (block.kind === "paragraph") return <p key={index}>{block.text}</p>;
				return (
					<figure className="juya-plate" key={index}>
						<img src={block.image.src} alt={block.image.alt} loading="lazy" />
						{block.image.alt && <figcaption>{block.image.alt}</figcaption>}
					</figure>
				);
			})}
			<LinksBlock links={entry.links} onOpenLink={onOpenLink} />
		</article>
	);
}

function EditorialIssue({ article, issue, onOpenLink, variantId }: JuyaIssueProps): JSX.Element {
	const date = new Date(article.pubDate);
	const publicationDay = Number.isFinite(date.getTime())
		? [String(date.getFullYear()).padStart(4, "0"), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-")
		: "";
	return (
		<div className={`juya-root ${VARIANT_CLASS}`} data-juya-variant={variantId}>
			<div className="juya-issue">
				<header className="juya-masthead">
					<h1>{issue.heading || article.title}</h1>
					{Number.isFinite(date.getTime()) && (
						<div className="juya-date-line">
							{date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
						</div>
					)}
				</header>
				{article.summary && <p className="juya-deck">{article.summary}</p>}
				{issue.overview && <OverviewItems overview={issue.overview} onOpenLink={onOpenLink} />}
				{issue.sections.map((section, sectionIndex) => (
					<section className="juya-section" key={`${section.heading}-${sectionIndex}`}>
						<h2>{section.heading}</h2>
						{section.entries.map((entry, index) => (
							<EditorialEntry key={index} entry={entry} onOpenLink={onOpenLink} sectionOpening={index === 0} />
						))}
					</section>
				))}
				<IssueFooter footer={issue.footer} />
				{publicationDay && <footer className="juya-colophon">本期编辑 · 橘鸦日报 · {publicationDay}</footer>}
			</div>
		</div>
	);
}

const sharedTemplate = makeJuyaTemplate({
	variantClass: VARIANT_CLASS,
	feedScene: ({ name, url }) => <EditorialFeedMasthead sourceName={name} sourceUrl={url} />,
});

export const editorialTemplate: JuyaTemplate = { ...sharedTemplate, IssueView: EditorialIssue };
