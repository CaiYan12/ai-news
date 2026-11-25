import { makeJuyaTemplate } from "./base";
import {
	EntryTitle,
	ImageGrid,
	Lead,
	LinksBlock,
	OverviewItems,
	Paragraphs,
} from "./shared";
import { Scene } from "./scene";
import type { JuyaTemplate, JuyaIssueProps } from "../templateTypes";
import { useAppStore } from "../../stores/useAppStore";
import "../juya.css";

function IssueView({ article, issue, onOpenLink, variantId }: JuyaIssueProps): JSX.Element {
	return (
		<div className="juya-root jysynth" data-juya-variant={variantId}>
			<Scene sun grid="perspective" />
			<div className="juya-issue">
				<header className="juya-masthead">
					<h1>{issue.heading || article.title}</h1>
				</header>
				{issue.overview && (
					<OverviewItems overview={issue.overview} onOpenLink={onOpenLink} />
				)}
				{issue.sections.map((section, sectionIndex) => (
					<section className="juya-section" key={`${section.heading}-${sectionIndex}`}>
						<h2>{section.heading}</h2>
						{section.entries.map((entry, i) => (
							<article className="juya-entry" key={i}>
								<EntryTitle entry={entry} onOpenLink={onOpenLink} />
								{entry.lead && <Lead lead={entry.lead} />}
								<Paragraphs paragraphs={entry.paragraphs} />
								{entry.images.length > 0 && (
									<ImageGrid images={entry.images} mode="hero" />
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

function SynthwaveFeedMasthead(): JSX.Element {
	const source = useAppStore((state) => state.source);
	let hostname = "";
	try { hostname = new URL(source.url).hostname; } catch { /* Source metadata may be incomplete. */ }
	return (
		<div className="jysynth-feed-masthead">
			<p className="jysynth-feed-kicker">订阅源</p>
			<h1>{source.name}</h1>
			{hostname && <p className="jysynth-feed-domain">{hostname}</p>}
		</div>
	);
}

const sharedTemplate = makeJuyaTemplate({
	variantClass: "jysynth",
	feedScene: () => (
		<>
			<Scene sun grid="perspective" />
			<SynthwaveFeedMasthead />
		</>
	),
});
export const synthwaveTemplate: JuyaTemplate = { ...sharedTemplate, IssueView };
