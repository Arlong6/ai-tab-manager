//#region src/shared/constants.ts
var e = /* @__PURE__ */ function(e) {
	return e.GET_TABS = "GET_TABS", e.GROUP_TABS_AI = "GROUP_TABS_AI", e.GROUP_TABS_DOMAIN = "GROUP_TABS_DOMAIN", e.UNGROUP_ALL = "UNGROUP_ALL", e.CLOSE_TAB = "CLOSE_TAB", e.GET_SESSIONS = "GET_SESSIONS", e.SAVE_SESSION = "SAVE_SESSION", e.RESTORE_SESSION = "RESTORE_SESSION", e.DELETE_SESSION = "DELETE_SESSION", e.SUMMARIZE_TAB = "SUMMARIZE_TAB", e.SEARCH_TABS = "SEARCH_TABS", e.EXTRACT_CONTENT = "EXTRACT_CONTENT", e.GET_SETTINGS = "GET_SETTINGS", e.SET_API_KEY = "SET_API_KEY", e.VALIDATE_API_KEY = "VALIDATE_API_KEY", e.OPEN_SIDE_PANEL = "OPEN_SIDE_PANEL", e;
}({}), t = {
	SESSIONS: "sessions",
	SETTINGS: "settings",
	SUMMARY_CACHE: "summaryCache"
}, n = {
	FREE_MAX_SESSIONS: 3,
	CONTENT_MAX_CHARS: 15e3,
	SUMMARY_CACHE_TTL: 36e5,
	TAB_COLORS: [
		"grey",
		"blue",
		"red",
		"yellow",
		"green",
		"pink",
		"purple",
		"cyan",
		"orange"
	]
};
//#endregion
//#region src/shared/storage.ts
async function r(e) {
	return (await chrome.storage.local.get(e))[e];
}
async function i(e, t) {
	await chrome.storage.local.set({ [e]: t });
}
//#endregion
//#region src/background/tab-manager.ts
async function a() {
	return (await chrome.tabs.query({})).map((e) => ({
		id: e.id,
		windowId: e.windowId,
		url: e.url || "",
		title: e.title || "Untitled",
		favIconUrl: e.favIconUrl,
		pinned: e.pinned,
		groupId: e.groupId,
		active: e.active
	}));
}
async function o(e) {
	await chrome.tabs.remove(e);
}
async function s(e) {
	for (let t of e) {
		if (t.tabIds.length === 0) continue;
		let e = await chrome.tabs.group({ tabIds: t.tabIds });
		await chrome.tabGroups.update(e, {
			title: t.name,
			color: t.color
		});
	}
}
async function c() {
	let e = await chrome.tabs.query({});
	for (let t of e) t.id && t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && await chrome.tabs.ungroup(t.id);
}
async function l() {
	let e = await a(), t = /* @__PURE__ */ new Map();
	for (let n of e) try {
		let e = new URL(n.url).hostname.replace("www.", "");
		t.has(e) || t.set(e, []), t.get(e).push(n.id);
	} catch {}
	let r = n.TAB_COLORS, i = 0;
	for (let [e, n] of t) {
		if (n.length < 2) continue;
		let t = await chrome.tabs.group({ tabIds: n });
		await chrome.tabGroups.update(t, {
			title: e,
			color: r[i % r.length]
		}), i++;
	}
}
async function u() {
	return await r(t.SESSIONS) || [];
}
async function d(e) {
	let a = await u();
	if (((await r(t.SETTINGS))?.tier || "free") === "free" && a.length >= n.FREE_MAX_SESSIONS) throw Error(`Free tier limited to ${n.FREE_MAX_SESSIONS} sessions. Upgrade to Pro for unlimited.`);
	let o = await chrome.tabs.query({}), s = /* @__PURE__ */ new Map();
	for (let e of o) if (e.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && !s.has(e.groupId)) try {
		let t = await chrome.tabGroups.get(e.groupId);
		s.set(e.groupId, t);
	} catch {}
	let c = o.map((e) => ({
		url: e.url || "",
		title: e.title || "Untitled",
		favIconUrl: e.favIconUrl,
		groupName: e.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE ? void 0 : s.get(e.groupId)?.title
	})), l = [...s.values()].map((e) => ({
		name: e.title || "Unnamed",
		color: e.color
	})), d = {
		id: crypto.randomUUID(),
		name: e,
		createdAt: Date.now(),
		tabs: c,
		groups: l
	};
	return a.push(d), await i(t.SESSIONS, a), d;
}
async function f(e) {
	let t = (await u()).find((t) => t.id === e);
	if (!t) throw Error("Session not found");
	let n = /* @__PURE__ */ new Map();
	for (let e of t.tabs) {
		let t = await chrome.tabs.create({
			url: e.url,
			active: !1
		});
		e.groupName && t.id && (n.has(e.groupName) || n.set(e.groupName, []), n.get(e.groupName).push(t.id));
	}
	for (let e of t.groups) {
		let t = n.get(e.name);
		if (t && t.length > 0) {
			let n = await chrome.tabs.group({ tabIds: t });
			await chrome.tabGroups.update(n, {
				title: e.name,
				color: e.color
			});
		}
	}
}
async function p(e) {
	let n = (await u()).filter((t) => t.id !== e);
	await i(t.SESSIONS, n);
}
//#endregion
//#region src/background/ai-service.ts
var m = "gemini-2.5-flash";
async function h() {
	let e = await r(t.SETTINGS);
	if (!e?.apiKey) throw Error("API key not set. Please add your Gemini API key in Settings.");
	return e.apiKey;
}
function g(e) {
	let t = e.replace(/```json?\s*/g, "").replace(/```/g, "").trim(), n = t.match(/\{[\s\S]*\}/);
	return n && (t = n[0]), t = t.replace(/,\s*([}\]])/g, "$1"), t;
}
async function _(e, t) {
	let n = await h(), r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${n}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: e }] },
			contents: [{ parts: [{ text: t }] }],
			generationConfig: {
				maxOutputTokens: 1024,
				temperature: .2,
				thinkingConfig: { thinkingBudget: 0 }
			}
		})
	});
	if (!r.ok) {
		let e = await r.json().catch(() => ({}));
		if (r.status === 400) throw Error("Invalid API key. Please check your Gemini API key in Settings.");
		if (r.status === 429) throw Error("Rate limit exceeded. Please wait a moment and try again.");
		let t = e.error?.message || r.statusText;
		throw Error(`Gemini API error: ${t}`);
	}
	let i = (await r.json()).candidates[0].content.parts;
	for (let e of i) if (e.text && !e.thought) return e.text;
	return i[i.length - 1].text || "";
}
async function v(e) {
	try {
		return (await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${e}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: "Hi" }] }],
				generationConfig: { maxOutputTokens: 10 }
			})
		})).ok;
	} catch {
		return !1;
	}
}
async function y(e) {
	let t = e.map((e) => `- Tab ${e.id}: "${e.title}" - ${e.url}`).join("\n"), r = g(await _(`You are a tab organizer. Given a list of browser tabs, group them by topic.
Return valid JSON: { "groups": [{ "name": "Topic Name", "color": "blue", "tabIds": [1, 2, 3] }] }
Colors must be one of: ${n.TAB_COLORS.join(", ")}.
Every tab must be assigned to exactly one group. Use concise group names (2-4 words).`, `Group these tabs:\n${t}`));
	return JSON.parse(r).groups;
}
async function b(e) {
	let t = e.slice(0, n.CONTENT_MAX_CHARS), r = await h(), i = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${r}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: "Summarize the following webpage content in 2-3 concise sentences. Focus on the key points." }] },
			contents: [{ parts: [{ text: t }] }],
			generationConfig: {
				maxOutputTokens: 256,
				temperature: .2
			}
		})
	});
	if (!i.ok) throw Error("Failed to summarize");
	let a = (await i.json()).candidates[0].content.parts;
	for (let e of a) if (e.text && !e.thought) return e.text;
	return a[a.length - 1].text || "";
}
async function x(e, t) {
	let n = g(await _("You are a search assistant. Given a search query and tab contents, rank the tabs by relevance.\nReturn valid JSON: { \"results\": [{ \"tabId\": number, \"relevance\": 0-100, \"snippet\": \"relevant excerpt\" }] }\nOnly include tabs with relevance > 20. Order by relevance descending.", `Query: "${e}"\n\nTabs:\n${t.map((e) => `[Tab ${e.tabId}] "${e.title}" (${e.url})\nContent preview: ${e.content.slice(0, 500)}`).join("\n\n")}`));
	return JSON.parse(n).results;
}
chrome.runtime.onMessage.addListener((e, t, n) => (C(e, t).then(n).catch((e) => n({
	success: !1,
	error: e instanceof Error ? e.message : String(e)
})), !0)), chrome.tabs.onCreated.addListener(S), chrome.tabs.onRemoved.addListener(S), chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: !1 }).catch(() => {});
async function S() {
	let e = await chrome.tabs.query({});
	chrome.action.setBadgeText({ text: e.length.toString() }), chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
}
S();
async function C(n, m) {
	switch (n.type) {
		case e.GET_TABS: return {
			success: !0,
			data: await a()
		};
		case e.CLOSE_TAB: return await o(n.payload), { success: !0 };
		case e.GROUP_TABS_AI: {
			let e = await y((await a()).filter((e) => e.url.startsWith("http")));
			return await s(e), {
				success: !0,
				data: e
			};
		}
		case e.GROUP_TABS_DOMAIN: return await l(), { success: !0 };
		case e.UNGROUP_ALL: return await c(), { success: !0 };
		case e.GET_SESSIONS: return {
			success: !0,
			data: await u()
		};
		case e.SAVE_SESSION: return {
			success: !0,
			data: await d(n.payload)
		};
		case e.RESTORE_SESSION: return await f(n.payload), { success: !0 };
		case e.DELETE_SESSION: return await p(n.payload), { success: !0 };
		case e.SUMMARIZE_TAB: {
			let { tabId: e } = n.payload, [{ result: t }] = await chrome.scripting.executeScript({
				target: { tabId: e },
				func: () => document.body.innerText
			});
			return {
				success: !0,
				data: await b(t)
			};
		}
		case e.SEARCH_TABS: {
			let { query: e } = n.payload, t = (await a()).filter((e) => e.url.startsWith("http"));
			return {
				success: !0,
				data: await x(e, (await Promise.all(t.map(async (e) => {
					try {
						let [{ result: t }] = await chrome.scripting.executeScript({
							target: { tabId: e.id },
							func: () => document.body.innerText
						});
						return {
							tabId: e.id,
							title: e.title,
							url: e.url,
							content: t || ""
						};
					} catch {
						return {
							tabId: e.id,
							title: e.title,
							url: e.url,
							content: ""
						};
					}
				}))).filter((e) => e.content))
			};
		}
		case e.GET_SETTINGS: return {
			success: !0,
			data: await r(t.SETTINGS) || {
				apiKey: "",
				tier: "free"
			}
		};
		case e.SET_API_KEY: {
			let e = n.payload, a = await r(t.SETTINGS);
			return await i(t.SETTINGS, {
				...a,
				apiKey: e,
				tier: a?.tier || "free"
			}), { success: !0 };
		}
		case e.VALIDATE_API_KEY: {
			let e = n.payload;
			return {
				success: !0,
				data: await v(e)
			};
		}
		case e.OPEN_SIDE_PANEL: {
			let [e] = await chrome.tabs.query({
				active: !0,
				currentWindow: !0
			});
			return e?.windowId && await chrome.sidePanel.open({ windowId: e.windowId }), { success: !0 };
		}
		default: return {
			success: !1,
			error: `Unknown message type: ${n.type}`
		};
	}
}
//#endregion
