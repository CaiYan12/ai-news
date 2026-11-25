import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const cleanEnv = { ...process.env };
delete cleanEnv.AI_NEWS_OLD_DIST;
delete cleanEnv.AI_NEWS_PRE_THEME_DIST;

function run(script, overrides = {}) {
	return spawnSync(process.execPath, [script], {
		cwd: process.cwd(),
		env: { ...cleanEnv, ...overrides },
		encoding: "utf8",
	});
}

const missingPreTheme = run("tests/visual-matrix.mjs", {
	AI_NEWS_OLD_DIST: "fixture-old-site-dist",
});
assert.notEqual(missingPreTheme.status, 0);
assert.match(
	missingPreTheme.stderr,
	/both AI_NEWS_OLD_DIST and AI_NEWS_PRE_THEME_DIST/,
);

const sameDist = run("tests/visual-matrix.mjs", {
	AI_NEWS_OLD_DIST: "same-dist",
	AI_NEWS_PRE_THEME_DIST: "same-dist",
});
assert.notEqual(sameDist.status, 0);
assert.match(sameDist.stderr, /must point to different dist roots/);

const compareWithoutPair = run("tests/compare-matrix.mjs");
assert.notEqual(compareWithoutPair.status, 0);
assert.match(
	compareWithoutPair.stderr,
	/both AI_NEWS_OLD_DIST and AI_NEWS_PRE_THEME_DIST/,
);

const compareSameDist = run("tests/compare-matrix.mjs", {
	AI_NEWS_OLD_DIST: "same-dist",
	AI_NEWS_PRE_THEME_DIST: "same-dist",
});
assert.notEqual(compareSameDist.status, 0);
assert.match(compareSameDist.stderr, /must point to different dist roots/);

console.log("PASS historical visual/compare commands refuse missing or identical targets");
