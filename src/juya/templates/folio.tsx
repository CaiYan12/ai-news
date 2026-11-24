import { Fragment } from "react";
import { makeJuyaTemplate } from "./base";
import { OverviewItems } from "./shared";
import type { JuyaContentBlock, JuyaEntry, JuyaImage, JuyaLink } from "../parseJuyaIssue";
import type { JuyaIssueProps } from "../templateTypes";
import "../folio.css";

function Plate({
	image,
	inset = false,
	right = false,
}: {
	image: JuyaImage;
	inset?: boolean;
	right?: boolean;
}): JSX.Element {
	return (
		<figure
			className={`juya-plate${inset ? " jyfolio-plate-inset" : ""}${right ? " jyfolio-plate-right" : ""}`}
		>
			<img src={image.src} alt={image.alt} loading="lazy" />
			{image.alt && <figcaption>{image.alt}</figcaption>}
		</figure>
	);
}

function EntryFlow({ entry }: { entry: JuyaEntry }): JSX.Element {
	const blocks: JuyaContentBlock[] = entry.blocks.length
		? entry.blocks
		: [
				...entry.paragraphs.map((text) => ({
					kind: "paragraph" as const,
					text,
				})),
				...entry.images.map((image) => ({
					kind: "image" as const,
					image,
				})),
			];
	const cover = blocks.find((block) => block.kind === "image");
	let insetIndex = 0;
	return (
		<>
			{cover?.kind === "image" && <Plate image={cover.image} />}
			{blocks.map((block, i) => {
				if (block === cover) return null;
				if (block.kind === "paragraph") return <p key={i}>{block.text}</p>;
				const right = insetIndex++ % 2 === 1;
				return <Plate key={i} image={block.image} inset right={right} />;
			})}
		</>
	);
}

function EntryTitle({
	entry,
	onOpenLink,
}: {
	entry: JuyaEntry;
	onOpenLink: (href: string) => void;
}): JSX.Element {
	return (
		<h3>
			{entry.titleLink ? (
				<a
					href={entry.titleLink}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(event) => {
						event.preventDefault();
						onOpenLink(entry.titleLink as string);
					}}
				>
					{entry.title}
				</a>
			) : (
				entry.title
			)}
			{entry.index && <span className="juya-index">#{entry.index}</span>}
		</h3>
	);
}

function LinksBlock({
	links,
	onOpenLink,
}: {
	links: JuyaLink[];
	onOpenLink: (href: string) => void;
}): JSX.Element | null {
	if (links.length === 0) return null;
	return (
		<>
			<p className="juya-links-label">相关链接</p>
			<ul className="juya-links">
				{links.map((link, i) => (
					<li key={i}>
						<a
							href={link.href}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(event) => {
								event.preventDefault();
								onOpenLink(link.href);
							}}
						>
							{link.text}
						</a>
					</li>
				))}
			</ul>
		</>
	);
}

function FolioIssue({ article, issue, onOpenLink, variantId }: JuyaIssueProps): JSX.Element {
	return (
		<div className="juya-root jyfolio" data-juya-variant={variantId}>
			<div className="juya-issue">
				<div className="juya-masthead">
					<h1>{issue.heading || article.title}</h1>
					<span className="juya-date-line">
						{new Date(article.pubDate).toLocaleDateString("zh-CN", {
							year: "numeric",
							month: "long",
							day: "numeric",
							weekday: "long",
						})}
					</span>
				</div>
				{issue.overview && <OverviewItems overview={issue.overview} onOpenLink={onOpenLink} />}
				{issue.sections.map((section) => (
					<section className="juya-section" key={section.heading}>
						<h2>{section.heading}</h2>
						{section.entries.map((entry, i) => (
							<Fragment key={i}>
								{i > 0 && (
									<div className="jyfolio-divider" aria-hidden="true">
										<span />
									</div>
								)}
								<article className="juya-entry">
									<EntryTitle entry={entry} onOpenLink={onOpenLink} />
									{entry.lead && <blockquote className="juya-lead">{entry.lead}</blockquote>}
									<EntryFlow entry={entry} />
									<LinksBlock links={entry.links} onOpenLink={onOpenLink} />
								</article>
							</Fragment>
						))}
					</section>
				))}
			</div>
		</div>
	);
}

function FeedMasthead({ sourceName, sourceUrl }: { sourceName: string; sourceUrl: string }): JSX.Element {
	let hostname = "";
	try {
		hostname = new URL(sourceUrl).hostname;
	} catch {
		// A missing or invalid source URL has no host line.
	}
	return (
		<div className="jyfolio-feed-masthead">
			<p className="jyfolio-feed-masthead-kicker">订阅源</p>
			<h1>{sourceName}</h1>
			{hostname && (
				<>
					<div className="jyfolio-divider" aria-hidden="true">
						<span />
					</div>
					<p className="jyfolio-feed-masthead-domain">{hostname}</p>
				</>
			)}
		</div>
	);
}

const sharedTemplate = makeJuyaTemplate({
	variantClass: "jyfolio",
	feedScene: ({ name, url }) => <FeedMasthead sourceName={name} sourceUrl={url} />,
});

export const folioTemplate = { ...sharedTemplate, IssueView: FolioIssue };
