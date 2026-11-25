import { makeJuyaTemplate } from "./base";
import { EntrySplit, OverviewItems } from "./shared";
import { Scene } from "./scene";
import type { JuyaTemplate, JuyaIssueProps } from "../templateTypes";
import "../juya.css";

function IssueView({ article, issue, onOpenLink, variantId }: JuyaIssueProps): JSX.Element {
	return (
		<div className="juya-root jyy2k" data-juya-variant={variantId}>
			{variantId === "y2k-dark" && <Scene stars grid="horizon" />}
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
							<EntrySplit
								key={i}
								entry={entry}
								onOpenLink={onOpenLink}
								flip={i % 2 === 1}
							/>
						))}
					</section>
				))}
			</div>
		</div>
	);
}

function Y2kFeedMasthead({ name, url }: { name: string; url: string }): JSX.Element {
	let hostname = "";
	try { hostname = new URL(url).hostname; } catch { /* Source metadata may be incomplete. */ }
	return (
		<div className="jyy2k-feed-masthead">
			<div className="jyy2k-feed-titlebar" aria-hidden="true">
				<span>◆ {name}.EXE — 运行中</span>
				<span>_ □ ×</span>
			</div>
			<p className="jyy2k-feed-kicker">订阅源</p>
			<h1>{name}</h1>
			{hostname && <p className="jyy2k-feed-domain">{hostname}</p>}
		</div>
	);
}

const sharedTemplate = makeJuyaTemplate({
	variantClass: "jyy2k",
	feedScene: ({ name, url, variantId }) => (
		<>
			{variantId === "y2k-dark" && <Scene stars grid="horizon" />}
			<Y2kFeedMasthead name={name} url={url} />
		</>
	),
});
export const y2kTemplate: JuyaTemplate = { ...sharedTemplate, IssueView };
