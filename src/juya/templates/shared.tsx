import type { JuyaEntry, JuyaOverviewEntry } from "../parseJuyaIssue";

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

/** 语义层共享构件：只负责「语义模型 → 安全的 React 元素」映射（文本经 React 转义，
 *  链接经 onOpenLink 拦截，图片懒加载）。版式差异由各风格模板的组合方式与 CSS 承担。 */

export function OverviewItems({
	overview,
	onOpenLink,
}: {
	overview: JuyaOverviewEntry[];
	onOpenLink: (href: string) => void;
}): JSX.Element {
	return (
		<ul className="juya-overview">
			{overview.map((o, i) => (
				<li key={i}>
					{o.index && <span className="juya-index">{o.index}</span>}
					{o.href ? (
						<a
							href={o.href}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(e) => {
								e.preventDefault();
								onOpenLink(o.href as string);
							}}
						>
							{o.title}
						</a>
					) : (
						<span>{o.title}</span>
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
