/**
 * This script should be ran after pushing a commit.
 * It:
 * - updates `main.js` to update the sha256 hash in the `@require` tag, also updates the `@\version tag`
 * - change version variable in `injection.js`
 * - creates a commit in the format of "release!: {version}"
 * - pushes the changes
*/

import { simpleGit } from "simple-git";

const git = simpleGit();
const splitted = import.meta.dirname?.split("/");
splitted?.pop();
const baseDirPath = splitted?.join("/");
const injectionPath = `${baseDirPath}/injection.js`;
const mainPath = `${baseDirPath}/main.js`;

const version = Deno.args[0];

if (!version) {
	console.log("No version provided");
	Deno.exit(1);
}

// change version in injection.js
const injection = await Deno.readTextFile(injectionPath);
await Deno.writeTextFile(
	injectionPath,
	injection
		.replace(
			/const VERSION = "[^"]+"/g,
			`const VERSION = "${version}"`
		)
);

let main = await Deno.readTextFile(mainPath);
// fix @require in main.js so greasyfork doesn't complain
const regex = /(\/\/ @require +)([^\r\n]+)/g;
const matches = main.matchAll(regex);

for (const match of matches) {
  const all = match[0];
  const beforeMatch = match[1];
  const urlStr = match[2];
  const url = new URL(urlStr);
  url.pathname = url.pathname.replace("/branch/main", `/tag/${version}`).replaceAll(/\/tag\/[^/]+/g, `/tag/${version}`);
  url.hash = "";
  const path = `${baseDirPath}/${url.pathname.split("/").slice(6).join("/")}`;
  const fileContent = Deno.readTextFileSync(path);
  const messageBuffer = new TextEncoder().encode(fileContent);
  const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
  const hash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
  url.hash = `sha256=${hash}`;
  main = main.replace(all, `${beforeMatch}${url}`);
}

// change version in main.js
await Deno.writeTextFile(
	mainPath,
	main.replace(/(\/\/ @version +)([^\r\n]+)/g, (_, p1, p2) => {
		console.log(`Changing version from ${p2} to ${version}`);
		return `${p1}${version}`;
	})
);

git
	.add([injectionPath, mainPath])
	.commit(`release!: ${version}`)
	.addTag(`v${version}`)
	.push();
