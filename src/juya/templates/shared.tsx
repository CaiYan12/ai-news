import { Fragment, useEffect, useRef } from "react";
import type { JuyaEntry, JuyaIssue, JuyaOverviewEntry } from "../parseJuyaIssue";

export function IssueFooter({ footer }: { footer: JuyaIssue["footer"] }): JSX.Element | null {
	if (!footer) return null;
	return (
		<footer className="juya-issue-footer">
			{footer.notice && <p>{footer.notice}</p>}
			<p>
				{footer.links.map(({ text, href }, index) => (
					<Fragment key={text}>
						{index > 0 && <span aria-hidden="true"> · </span>}
						<a href={href} target="_blank" rel="noopener noreferrer">{text}</a>
					</Fragment>
				))}
			</p>
		</footer>
	);
}

export function sourceHostname(sourceUrl: string): string {
	if (!sourceUrl) return "";
	try {
		return new URL(sourceUrl).hostname;
	} catch {
		return "";
	}
}

export function EntryTitle({
	entry,
	onOpenLink,
}: {
	entry: JuyaEntry;
	onOpenLink: (href: string) => void;
}): JSX.Element {
	return (
		<h3 id={entry.anchorId} tabIndex={-1}>
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

export function Lead({ lead }: { lead: string }): JSX.Element {
	return <blockquote className="juya-lead">{lead}</blockquote>;
}

export function Paragraphs({ paragraphs }: { paragraphs: string[] }): JSX.Element {
	return <>{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</>;
}

export function ImageGrid({
	images,
	mode = "stack",
}: {
	images: JuyaEntry["images"];
	mode?: "stack" | "grid" | "hero";
}): JSX.Element {
	return (
		<div className={`juya-media${mode === "stack" ? "" : ` juya-media-${mode}`}`}>
			{images.map((image, i) => (
				<img key={i} src={image.src} alt={image.alt} loading="lazy" />
			))}
		</div>
	);
}

export function LinksBlock({
	links,
	onOpenLink,
}: {
	links: JuyaEntry["links"];
	onOpenLink: (href: string) => void;
}): JSX.Element | null {
	if (!links.length) return null;
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

export function EntrySplit({
	entry,
	onOpenLink,
	flip = false,
}: {
	entry: JuyaEntry;
	onOpenLink: (href: string) => void;
	flip?: boolean;
}): JSX.Element {
	return (
		<article className={`juya-entry juya-entry-split${flip ? " juya-entry-alt" : ""}`}>
			<div className="juya-entry-row">
				<div className="juya-entry-body">
					<EntryTitle entry={entry} onOpenLink={onOpenLink} />
					{entry.lead && <Lead lead={entry.lead} />}
					<Paragraphs paragraphs={entry.paragraphs} />
				</div>
				{entry.images.length > 0 && (
					<div className="juya-entry-figure">
						<ImageGrid images={entry.images} mode="grid" />
					</div>
				)}
			</div>
			<LinksBlock links={entry.links} onOpenLink={onOpenLink} />
		</article>
	);
}

function scrollToEntry(targetId: string): (() => void) | undefined {
	const heading = document.getElementById(targetId);
	if (!heading) return;
	const header = document.querySelector("[data-reader-header]");
	const scrollBelowHeader = (behavior: ScrollBehavior) => {
		const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
		window.scrollBy({
			top: heading.getBoundingClientRect().top - headerBottom - 12,
			behavior,
		});
	};
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	heading.focus({ preventScroll: true });
	scrollBelowHeader(reduceMotion ? "instant" : "smooth");

	const issue = heading.closest(".juya-issue");
	if (!issue) return;
	let headingPosition = heading.getBoundingClientRect().top + window.scrollY;
	const observer = new ResizeObserver(() => {
		const newPosition = heading.getBoundingClientRect().top + window.scrollY;
		if (Math.abs(newPosition - headingPosition) < 1) return;
		headingPosition = newPosition;
		scrollBelowHeader("instant");
	});
	const controller = new AbortController();
	const stopFollowing = () => {
		observer.disconnect();
		controller.abort();
	};
	// 前方图片加载会移动标题。读者恢复操作后把滚动控制交还给浏览器。
	const { signal } = controller;
	heading.addEventListener("blur", stopFollowing, { signal });
	for (const event of ["keydown", "pointerdown", "wheel"]) {
		window.addEventListener(event, stopFollowing, { passive: true, signal });
	}
	observer.observe(issue);
	return stopFollowing;
}

export function OverviewItems({
	overview,
	onOpenLink,
}: {
	overview: JuyaOverviewEntry[];
	onOpenLink: (href: string) => void;
}): JSX.Element {
	const stopFollowing = useRef<(() => void) | undefined>(undefined);
	useEffect(() => () => stopFollowing.current?.(), []);

	return (
		<ul className="juya-overview">
			{overview.map(({ title, index, targetId, href }, i) => (
				<li key={i}>
					{index && <span className="juya-index">{index}</span>}
					{targetId ? (
						<button
							type="button"
							aria-controls={targetId}
							onClick={() => {
								stopFollowing.current?.();
								stopFollowing.current = scrollToEntry(targetId);
							}}
						>
							{title}
						</button>
					) : (
						<span>
							<span>{title}</span>
							{href && (
								<a
									className="juya-overview-source"
									href={href}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={title ? `查看来源（${title}）` : undefined}
									onClick={(event) => {
										event.preventDefault();
										onOpenLink(href);
									}}
								>
									查看来源
								</a>
							)}
						</span>
					)}
				</li>
			))}
		</ul>
	);
}

/** 条目正文块：段落 + 图片（懒加载）+ 相关链接 */
export function EntryBlocks({
	entry,
	onOpenLink,
}: {
	entry: JuyaEntry;
	onOpenLink: (href: string) => void;
}): JSX.Element {
	return (
		<>
			{entry.lead && (
				<blockquote className="juya-lead">{entry.lead}</blockquote>
			)}
			{entry.paragraphs.map((p, i) => (
				<p key={i}>{p}</p>
			))}
			{entry.images.length > 0 && (
				<div className="juya-media">
					{entry.images.map((img, i) => (
						<img
							key={i}
							src={img.src}
							alt={img.alt}
							loading="lazy"
						/>
					))}
				</div>
			)}
			{entry.links.length > 0 && (
				<>
					<p className="juya-links-label">相关链接</p>
					<ul className="juya-links">
						{entry.links.map((l, i) => (
							<li key={i}>
								<a
									href={l.href}
									target="_blank"
									rel="noopener noreferrer"
									onClick={(e) => {
										e.preventDefault();
										onOpenLink(l.href);
									}}
								>
									{l.text}
								</a>
							</li>
						))}
					</ul>
				</>
			)}
		</>
	);
}
