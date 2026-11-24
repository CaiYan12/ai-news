import type { JuyaStyleId } from "../shared/types";

/** 橘鸦定制阅读风格注册表（内置、只读，不进主题体系）。
 *  五种可选风格 × 亮暗双变体。旧 card 偏好在存储读取时迁移，不再进入运行时注册表。 */

export type JuyaStyleVariantId =
	| "folio-light"
	| "folio-dark"
	| "y2k-light"
	| "y2k-dark"
	| "pop-light"
	| "pop-dark"
	| "newsprint90s-light"
	| "newsprint90s-dark"
	| "dreamcore-light"
	| "dreamcore-dark";

export interface JuyaStyleMeta {
	/** 变体唯一 id：`${styleId}-${colorScheme}` */
	id: JuyaStyleVariantId;
	/** 所属风格（不含 'off'） */
	styleId: Exclude<JuyaStyleId, "off" | "card">;
	/** 展示名（设置下拉用） */
	name: string;
	colorScheme: "light" | "dark";
	/** 模板内 :focus-visible 焦点色（风格自有，不取全局 --t-accent） */
	focusColor: string;
	/** 背景材质：固定 css-svg（纯 CSS + 内联 SVG），禁止位图 */
	background: "css-svg";
}

export const JUYA_STYLES: JuyaStyleMeta[] = [
	{
		id: "folio-light",
		styleId: "folio",
		name: "纸感精读式",
		colorScheme: "light",
		focusColor: "#b3452e",
		background: "css-svg",
	},
	{
		id: "folio-dark",
		styleId: "folio",
		name: "纸感精读式",
		colorScheme: "dark",
		focusColor: "#e0956f",
		background: "css-svg",
	},
	{
		id: "y2k-light",
		styleId: "y2k",
		name: "千禧网页式",
		colorScheme: "light",
		focusColor: "#0050c8",
		background: "css-svg",
	},
	{
		id: "y2k-dark",
		styleId: "y2k",
		name: "千禧网页式",
		colorScheme: "dark",
		focusColor: "#7db8ff",
		background: "css-svg",
	},
	{
		id: "pop-light",
		styleId: "pop",
		name: "波普艺术式",
		colorScheme: "light",
		focusColor: "#d81b60",
		background: "css-svg",
	},
	{
		id: "pop-dark",
		styleId: "pop",
		name: "波普艺术式",
		colorScheme: "dark",
		focusColor: "#ff80ab",
		background: "css-svg",
	},
	{
		id: "newsprint90s-light",
		styleId: "newsprint90s",
		name: "90 年代报刊式",
		colorScheme: "light",
		focusColor: "#8b1a1a",
		background: "css-svg",
	},
	{
		id: "newsprint90s-dark",
		styleId: "newsprint90s",
		name: "90 年代报刊式",
		colorScheme: "dark",
		focusColor: "#e8b4b4",
		background: "css-svg",
	},
	{
		id: "dreamcore-light",
		styleId: "dreamcore",
		name: "蒸汽梦核式",
		colorScheme: "light",
		focusColor: "#7c4dff",
		background: "css-svg",
	},
	{
		id: "dreamcore-dark",
		styleId: "dreamcore",
		name: "蒸汽梦核式",
		colorScheme: "dark",
		focusColor: "#b388ff",
		background: "css-svg",
	},
];

/** 按亮暗隔离规则取某侧可选风格（亮侧只列 light 变体，暗侧只列 dark 变体）。 */
export function juyaStylesForScheme(scheme: "light" | "dark"): JuyaStyleMeta[] {
	return JUYA_STYLES.filter((s) => s.colorScheme === scheme);
}
