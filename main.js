// ==UserScript==
// @name         Vape V4
// @namespace    http://7granddadpgn.github.io
// @version      3.0.5
// @description  A browser script made to give enhancements on Miniblox
// @author       7GrandDad
// @match        https://miniblox.io/*
// @match        https://miniblox.org/*
// @match        https://miniblox.online/*
// @match        https://bloxbattles.io/*
// @icon         https://miniblox.io/favicon.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @require      https://codeberg.org/RealPacket/VapeForMiniblox/raw/tag/3.0.5/injection.js#sha256=0315c01c380cb2db15565a3adda06968a5ab62593d889d5ad61c871ed64172ff
// @run-at       document-start
// ==/UserScript==

// would reuse this, but Codeberg doesn't have CORS headers so we can't use it.
// this would fix the caching issues, but sadly CORS moment.
/*
(function() {
	'use strict';

	async function execute(url, oldScript) {
		if (oldScript) oldScript.type = 'javascript/blocked';
		let data = await fetch("https://raw.githubusercontent.com/7GrandDadPGN/VapeForMiniblox/main/injection.js").then(e => e.text());
		if (oldScript) oldScript.type = 'module';
		eval(data.replace("scripturl", url));
	}

	// https://stackoverflow.com/questions/22141205/intercept-and-alter-a-sites-javascript-using-greasemonkey
	if(navigator.userAgent.indexOf("Firefox") != -1)
	{
		window.addEventListener("beforescriptexecute", function(e) {
			if(e.target.src.includes("https://miniblox.io/assets/index"))
			{
				e.preventDefault();
				e.stopPropagation();
				execute(e.target.src);
			}
		}, false);
	}
	else
	{
		new MutationObserver(async (mutations, observer) => {
			let oldScript = mutations
				.flatMap(e => [...e.addedNodes])
				.filter(e => e.tagName == 'SCRIPT')
				.find(e => e.src.includes("https://miniblox.io/assets/index"));

			if (oldScript) {
				observer.disconnect();
				execute(oldScript.src, oldScript);
			}
		}).observe(document, {
			childList: true,
			subtree: true,
		});
	}
})();
*/