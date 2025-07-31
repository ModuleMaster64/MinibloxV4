/**
 * @type {Record<string | RegExp, string>}
 */
let replacements = {};
let dumpedVarNames = {};
const storeName = "a" + crypto.randomUUID().replaceAll("-", "").substring(16);
const vapeName = crypto.randomUUID().replaceAll("-", "").substring(16);
const VERSION = "3.30-dev";

// ANTICHEAT HOOK
function replaceAndCopyFunction(oldFunc, newFunc) {
	return new Proxy(oldFunc, {
		apply(orig, origIden, origArgs) {
			const result = orig.apply(origIden, origArgs);
			newFunc(result);
			return result;
		},
		get(orig) {
			return orig;
		}
	});
}

Object.getOwnPropertyNames = replaceAndCopyFunction(Object.getOwnPropertyNames, function(list) {
	if (list.indexOf(storeName) != -1) list.splice(list.indexOf(storeName), 1);
	return list;
});
Object.getOwnPropertyDescriptors = replaceAndCopyFunction(Object.getOwnPropertyDescriptors, function(list) {
	delete list[storeName];
	return list;
});

/**
 *
 * @param {string} replacement
 * @param {string} code
 * @param {boolean} replace
 */
function addModification(replacement, code, replace) {
	replacements[replacement] = [code, replace];
}

function addDump(replacement, code) {
	dumpedVarNames[replacement] = code;
}

/**
 *
 * @param {string} text
 */
function modifyCode(text) {
	let modifiedText = text;
	for(const [name, regex] of Object.entries(dumpedVarNames)) {
		const matched = modifiedText.match(regex);
		if (matched) {
			for(const [replacement, code] of Object.entries(replacements)){
				delete replacements[replacement];
				replacements[replacement.replaceAll(name, matched[1])] = [code[0].replaceAll(name, matched[1]), code[1]];
			}
		}
	}
	const unmatchedDumps = Object.entries(dumpedVarNames).filter(e => !modifiedText.match(e[1]));
	if (unmatchedDumps.length > 0) console.warn("Unmatched dumps:", unmatchedDumps);

	const unmatchedReplacements = Object.entries(replacements).filter(r => modifiedText.replace(r[0]) === text);
	if (unmatchedReplacements.length > 0) console.warn("Unmatched replacements:", unmatchedReplacements);

	for(const [replacement, code] of Object.entries(replacements)) {
		modifiedText = modifiedText.replace(replacement, code[1] ? code[0] : replacement + code[0]);
		// TODO: handle the 2nd occurrence, which inside a string in a varible called "jsContent".
		// (screw you vector)
	}

	const newScript = document.createElement("script");
	newScript.type = "module";
	newScript.crossOrigin = "";
	newScript.textContent = modifiedText;
	const head = document.querySelector("head");
	head.appendChild(newScript);
	newScript.textContent = "";
	newScript.remove();
}

(function() {
	'use strict';

	// DUMPING
	addDump('moveStrafeDump', 'this\\.([a-zA-Z]+)=\\([a-zA-Z]+\\.right');
	addDump('moveForwardDump', 'this\\.([a-zA-Z]+)=\\([a-zA-Z]+\\.(up|down)');
	addDump('keyPressedDump', 'function ([a-zA-Z]*)\\([a-zA-Z]*\\)\{return keyPressed\\([a-zA-Z]*\\)');
	addDump('entitiesDump', 'this\.([a-zA-Z]*)\.values\\(\\)\\)[a-zA-Z]* instanceof EntityTNTPrimed');
	addDump('isInvisibleDump', '[a-zA-Z]*\.([a-zA-Z]*)\\(\\)\\)&&\\([a-zA-Z]*=new ([a-zA-Z]*)\\(new');
	addDump('attackDump', 'hitVec.z\}\\)\}\\)\\),player\.([a-zA-Z]*)');
	addDump('lastReportedYawDump', 'this\.([a-zA-Z]*)=this\.yaw,this\.last');
	addDump('windowClickDump', '([a-zA-Z]*)\\(this\.inventorySlots\.windowId');
	addDump('playerControllerDump', 'const ([a-zA-Z]*)=new PlayerController,');
	addDump('damageReduceAmountDump', 'ItemArmor&&\\([a-zA-Z]*\\+\\=[a-zA-Z]*\.([a-zA-Z]*)');
	addDump('boxGeometryDump', 'w=new Mesh\\(new ([a-zA-Z]*)\\(1');
	addDump('syncItemDump', 'playerControllerMP\.([a-zA-Z]*)\\(\\),ClientSocket\.sendPacket');

	// PRE
	addModification('document.addEventListener("DOMContentLoaded",startGame,!1);', `
		setTimeout(function() {
			var DOMContentLoaded_event = document.createEvent("Event");
			DOMContentLoaded_event.initEvent("DOMContentLoaded", true, true);
			document.dispatchEvent(DOMContentLoaded_event);
		}, 0);
	`);
	addModification('y:this.getEntityBoundingBox().min.y,', 'y:sendY != false ? sendY : this.getEntityBoundingBox().min.y,', true);
	addModification('Potions.jump.getId(),"5");', `
		let blocking = false;
		let sendYaw = false;
		let sendY = false;
		let breakStart = Date.now();
		let noMove = Date.now();

		let enabledModules = {};
		let modules = {};

		let keybindCallbacks = {};
		let keybindList = {};

		let tickLoop = {};
		let renderTickLoop = {};

		let lastJoined, velocityhori, velocityvert, chatdisablermsg, textguifont, textguisize, textguishadow, attackedEntity, stepheight;
		let attackTime = Date.now();
		let chatDelay = Date.now();

		function getModule(str) {
			for(const [name, module] of Object.entries(modules)) {
				if (name.toLocaleLowerCase() == str.toLocaleLowerCase()) return module;
			}
		}

		let j;
		for (j = 0; j < 26; j++) keybindList[j + 65] = keybindList["Key" + String.fromCharCode(j + 65)] = String.fromCharCode(j + 97);
		for (j = 0; j < 10; j++) keybindList[48 + j] = keybindList["Digit" + j] = "" + j;
		window.addEventListener("keydown", function(key) {
			const func = keybindCallbacks[keybindList[key.code]];
			if (func) func(key);
		});
	`);

	addModification('VERSION$1," | ",', `"${vapeName} v${VERSION}"," | ",`);
	addModification('if(!x.canConnect){', 'x.errorMessage = x.errorMessage === "Could not join server. You are connected to a VPN or proxy. Please disconnect from it and refresh the page." ? "[Vape] You\'re IP banned (these probably don\'t exist now anyways)" : x.errorMessage;');

	// DRAWING SETUP
	addModification('I(this,"glintTexture");', `
		I(this, "vapeTexture");
		I(this, "v4Texture");
	`);
	/**
	 * @param {string} url
	 * @returns
	 */
	const corsMoment = url => {
		return new URL(`https://corsproxy.io/?url=${url}`).href;
	}
	addModification('skinManager.loadTextures(),', ',this.loadVape(),');
	addModification('async loadSpritesheet(){', `
		async loadVape() {
			this.vapeTexture = await this.loader.loadAsync("${corsMoment("https://codeberg.org/ee6-lang/CookForMiniblox/raw/branch/main/assets/cooking.png")}");
			this.v4Texture = await this.loader.loadAsync("${corsMoment("https://codeberg.org/RealPacket/VapeForMiniblox/raw/branch/main/assets/logov4.png")}");
		}
		async loadSpritesheet(){
	`, true);

	// TELEPORT FIX
	addModification('player.setPositionAndRotation(h.x,h.y,h.z,h.yaw,h.pitch),', `
		noMove = Date.now() + 500;
		player.setPositionAndRotation(h.x,h.y,h.z,h.yaw,h.pitch),
	`, true);

	addModification('COLOR_TOOLTIP_BG,BORDER_SIZE)}', `
		function drawImage(ctx, img, posX, posY, sizeX, sizeY, color) {
			if (color) {
				ctx.fillStyle = color;
				ctx.fillRect(posX, posY, sizeX, sizeY);
				ctx.globalCompositeOperation = "destination-in";
			}
			ctx.drawImage(img, posX, posY, sizeX, sizeY);
			if (color) ctx.globalCompositeOperation = "source-over";
		}
	`);

	// TEXT GUI
	addModification('(this.drawSelectedItemStack(),this.drawHintBox())', /*js*/`
		if (ctx$5 && enabledModules["TextGUI"]) {
			const colorOffset = (Date.now() / 4000);
			const posX = 15;
			const posY = 17;
			ctx$5.imageSmoothingEnabled = true;
			ctx$5.imageSmoothingQuality = "high";
			drawImage(ctx$5, textureManager.vapeTexture.image, posX, posY, 80, 21, \`HSL(\${(colorOffset % 1) * 360}, 100%, 50%)\`);
			drawImage(ctx$5, textureManager.v4Texture.image, posX + 81, posY + 1, 33, 18);

			let offset = 0;
			let stringList = [];
			for(const [module, value] of Object.entries(enabledModules)) {
				if (!value || module == "TextGUI") continue;
				stringList.push(module);
			}

			stringList.sort(function(a, b) {
				const compA = ctx$5.measureText(a).width;
				const compB = ctx$5.measureText(b).width;
				return compA < compB ? 1 : -1;
			});

			for(const module of stringList) {
				offset++;
				drawText(ctx$5, module, posX + 6, posY + 12 + ((textguisize[1] + 3) * offset), textguisize[1] + "px " + textguifont[1], \`HSL(\${((colorOffset - (0.025 * offset)) % 1) * 360}, 100%, 50%)\`, "left", "top", 1, textguishadow[1]);
			}
		}
	`);

	// HOOKS
	// instructions because this replacement is very vague when trying to find it after an update:
	// 1. search for "moveFlying("
	// 2. select the first result
	// 3. look for "this.motion.z+="
	// 4. use that as the replacement
	// thanks GOD that I had the old bundle to find this
	addModification('+=h*y+u*x}', `
		if (this == player) {
			for(const [index, func] of Object.entries(tickLoop)) if (func) func();
		}
	`);
	addModification('this.game.unleash.isEnabled("disable-ads")', 'true', true);
	// in EntityManager, renderEntities function
	addModification('h.render()})', '; for(const [index, func] of Object.entries(renderTickLoop)) if (func) func();');
	addModification('updateNameTag(){let h="white",p=1;', 'this.entity.team = this.entity.profile.cosmetics.color;');
	addModification('connect(u,h=!1,p=!1){', 'lastJoined = u;');
	addModification('SliderOption("Render Distance ",2,8,3)', 'SliderOption("Render Distance ",2,64,3)', true);
	addModification('ClientSocket.on("CPacketDisconnect",h=>{', `
		if (enabledModules["AutoRejoin"]) {
			setTimeout(function() {
				j.connect(lastJoined);
			}, 400);
		}
	`);
	// MUSIC FIX
	addModification('const u=lodashExports.sample(MUSIC);',
		`const vol = Options$1.sound.music.volume / BASE_VOLUME;
		if (vol <= 0 && enabledModules["MusicFix"])
			return; // don't play, we don't want to waste resources or bandwidth on this.
		const u = lodashExports.sample(MUSIC);`, true)
	addModification('ClientSocket.on("CPacketMessage",h=>{', `
		if (player && h.text && !h.text.startsWith(player.name) && enabledModules["ChatDisabler"] && chatDelay < Date.now()) {
			chatDelay = Date.now() + 1000;
			setTimeout(function() {
				ClientSocket.sendPacket(new SPacketMessage({text: Math.random() + ("\\n" + chatdisablermsg[1]).repeat(20)}));
			}, 50);
		}

		if (h.text && h.text.startsWith("\\\\bold\\\\How to play:")) {
			breakStart = Date.now() + 25000;
		}

		if (h.text && h.text.indexOf("Poll started") != -1 && h.id == undefined && enabledModules["AutoVote"]) {
			ClientSocket.sendPacket(new SPacketMessage({text: "/vote 2"}));
		}

		if (h.text && h.text.indexOf("won the game") != -1 && h.id == undefined && enabledModules["AutoQueue"]) {
			game.requestQueue();
		}
	`);
	addModification('ClientSocket.on("CPacketUpdateStatus",h=>{', `
		if (h.rank && h.rank != "" && RANK.LEVEL[$.rank].permLevel > 2) {
			game.chat.addChat({
				text: "STAFF DETECTED : " + h.rank + "\\n".repeat(10),
				color: "red"
			});
		}
	`);

	// REBIND
	addModification('bindKeysWithDefaults("b",m=>{', 'bindKeysWithDefaults("semicolon",m=>{', true);
	addModification('bindKeysWithDefaults("i",m=>{', 'bindKeysWithDefaults("apostrophe",m=>{', true);

	// SPRINT
	addModification('b=keyPressedDump("shift")||touchcontrols.sprinting', '||enabledModules["Sprint"]');

	// VELOCITY
	addModification('"CPacketEntityVelocity",h=>{const p=m.world.entitiesDump.get(h.id);', `
		if (player && h.id == player.id && enabledModules["Velocity"]) {
			if (velocityhori[1] == 0 && velocityvert[1] == 0) return;
			h.motion = new Vector3$1($.motion.x * velocityhori[1], h.motion.y * velocityvert[1], h.motion.z * velocityhori[1]);
		}
	`);
	addModification('"CPacketExplosion",h=>{', `
		if (h.playerPos && enabledModules["Velocity"]) {
			if (velocityhori[1] == 0 && velocityvert[1] == 0) return;
			h.playerPos = new Vector3$1(h.playerPos.x * velocityhori[1], h.playerPos.y * velocityvert[1], h.playerPos.z * velocityhori[1]);
		}
	`);

	// KEEPSPRINT
	addModification('g>0&&(h.addVelocity(-Math.sin(this.yaw*Math.PI/180)*g*.5,.1,Math.cos(this.yaw*Math.PI/180)*g*.5),this.motion.x*=.6,this.motion.z*=.6)', `
		if (g > 0) {
h.addVelocity(-Math.sin(this.yaw) * g * .5, .1, -Math.cos(this.yaw) * g * .5);
			if (this != player || !enabledModules["KeepSprint"]) {
				this.motion.x *= .6;
				this.motion.z *= .6;
				this.setSprinting(!1);
			}
		}
	`, true);

	// KILLAURA
	addModification('else player.isBlocking()?', 'else (player.isBlocking() || blocking)?', true);
	addModification('this.entity.isBlocking()', '(this.entity.isBlocking() || this.entity == player && blocking)', true);
	addModification('this.yaw-this.', '(sendYaw || this.yaw)-this.', true);
	addModification("x.yaw=player.yaw", 'x.yaw=(sendYaw || this.yaw)', true);
	addModification('this.lastReportedYawDump=this.yaw,', 'this.lastReportedYawDump=(sendYaw || this.yaw),', true);
	addModification('this.neck.rotation.y=controls.yaw', 'this.neck.rotation.y=(sendYaw||controls.yaw)', true);

	// NOSLOWDOWN
	addModification('updatePlayerMoveState(),this.isUsingItem()', 'updatePlayerMoveState(),(this.isUsingItem() && !enabledModules["NoSlowdown"])', true);
	addModification('S&&!this.isUsingItem()', 'S&&!(this.isUsingItem() && !enabledModules["NoSlowdown"])', true);
	// TODO: fix this
	// addModification('0),this.sneak', ' && !enabledModules["NoSlowdown"]');

	// STEP
	addModification('p.y=this.stepHeight;', 'p.y=(enabledModules["Step"]?Math.max(stepheight[1],this.stepHeight):this.stepHeight);', true);

	// WTAP
	addModification('this.dead||this.getHealth()<=0)return;', `
		if (enabledModules["WTap"]) player.serverSprintState = false;
	`);

	// FASTBREAK
	addModification('u&&player.mode.isCreative()', `||enabledModules["FastBreak"]`);

	// INVWALK
	addModification('keyPressed(m)&&Game.isActive(!1)', 'keyPressed(m)&&(Game.isActive(!1)||enabledModules["InvWalk"]&&!game.chat.showInput)', true);

	// TIMER
	addModification('MSPT=50,', '', true);
	addModification('MODE="production";', 'let MSPT = 50;');
	addModification('I(this,"controller");', 'I(this, "tickLoop");');
	addModification('setInterval(()=>this.fixedUpdate(),MSPT)', 'this.tickLoop=setInterval(()=>this.fixedUpdate(),MSPT)', true);

	// PHASE
	addModification('calculateXOffset(A,this.getEntityBoundingBox(),g.x)', 'enabledModules["Phase"] ? g.x : calculateXOffset(A,this.getEntityBoundingBox(),g.x)', true);
	addModification('calculateYOffset(A,this.getEntityBoundingBox(),g.y)', 'enabledModules["Phase"] && !enabledModules["Scaffold"] && keyPressedDump("shift") ? g.y : calculateYOffset(A,this.getEntityBoundingBox(),g.y)', true);
	addModification('calculateZOffset(A,this.getEntityBoundingBox(),g.z)', 'enabledModules["Phase"] ? g.z : calculateZOffset(A,this.getEntityBoundingBox(),g.z)', true);
	addModification('pushOutOfBlocks(u,h,p){', 'if (enabledModules["Phase"]) return;');

	// AUTORESPAWN
	addModification('this.game.info.showSignEditor=null,exitPointerLock())', `
		if (this.showDeathScreen && enabledModules["AutoRespawn"]) {
			ClientSocket.sendPacket(new SPacketRespawn$1);
		}
	`);

	// CHAMS
	addModification(')&&(p.mesh.visible=this.shouldRenderEntity(p))', `
		if (enabledModules["Chams"] && p && p.id != player.id) {
			for(const mesh in p.mesh.meshes) {
				p.mesh.meshes[mesh].material.depthTest = false;
				p.mesh.meshes[mesh].renderOrder = 3;
			}

			for(const mesh in p.mesh.armorMesh) {
				p.mesh.armorMesh[mesh].material.depthTest = false;
				p.mesh.armorMesh[mesh].renderOrder = 4;
			}

			if (p.mesh.capeMesh) {
				p.mesh.capeMesh.children[0].material.depthTest = false;
				p.mesh.capeMesh.children[0].renderOrder = 5;
			}

			if (p.mesh.hatMesh) {
				for(const mesh of p.mesh.hatMesh.children[0].children) {
					if (!mesh.material) continue;
					mesh.material.depthTest = false;
					mesh.renderOrder = 4;
				}
			}
		}
	`);

	// SKIN
	addModification('ClientSocket.on("CPacketSpawnPlayer",h=>{const p=m.world.getPlayerById(h.id);', `
		if (h.socketId === player.socketId && enabledModules["AntiBan"]) {
			hud3D.remove(hud3D.rightArm);
			hud3D.rightArm = undefined;
			player.profile.cosmetics.skin = "GrandDad";
			h.cosmetics.skin = "GrandDad";
			h.cosmetics.cape = "GrandDad";
		}
	`);
	addModification('bob:{id:"bob",name:"Bob",tier:0,skinny:!1},', 'GrandDad:{id:"GrandDad",name:"GrandDad",tier:2,skinny:!1},');
	addModification('cloud:{id:"cloud",name:"Cloud",tier:2},', 'GrandDad:{id:"GrandDad",name:"GrandDad",tier:2},');
	addModification('async downloadSkin(u){', `
		if (u == "GrandDad") {
			const $ = skins[u];
			return new Promise((et, tt) => {
				textureManager.loader.load("${corsMoment("https://codeberg.org/RealPacket/VapeForMiniblox/raw/branch/main/assets/skin.png")}", rt => {
					const nt = {
						atlas: rt,
						id: u,
						skinny: $.skinny,
						ratio: rt.image.width / 64
					};
					SkinManager.createAtlasMat(nt), this.skins[u] = nt, et();
				}, void 0, function(rt) {
					console.error(rt), et();
				});
			});
		}
	`);
	addModification('async downloadCape(u){', `
		if (u == "GrandDad") {
			const $ = capes[u];
			return new Promise((et, tt) => {
				textureManager.loader.load("${corsMoment("https://codeberg.org/ee6-lang/MinibloxV4/raw/branch/main/assets/duck.png")}", rt => {
					const nt = {
						atlas: rt,
						id: u,
						name: $.name,
						ratio: rt.image.width / 64,
						rankLevel: $.tier,
						isCape: !0
					};
					SkinManager.createAtlasMat(nt), this.capes[u] = nt, et();
				}, void 0, function(rt) {
					console.error(rt), et();
				});
			});
		}
	`);

	// LOGIN BYPASS
	addModification('new SPacketLoginStart({requestedUuid:localStorage.getItem(REQUESTED_UUID_KEY)??void 0,session:localStorage.getItem(SESSION_TOKEN_KEY)??"",hydration:localStorage.getItem("hydration")??"0",metricsId:localStorage.getItem("metrics_id")??"",clientVersion:VERSION$1})', 'new SPacketLoginStart({requestedUuid:void 0,session:(enabledModules["AntiBan"] ? "" : (localStorage.getItem(SESSION_TOKEN_KEY) ?? "")),hydration:"0",metricsId:uuid$1(),clientVersion:VERSION$1})', true);

	// KEY FIX
	addModification('Object.assign(keyMap,u)', '; keyMap["Semicolon"] = "semicolon"; keyMap["Apostrophe"] = "apostrophe";');

	// SWING FIX
	addModification('player.getActiveItemStack().item instanceof', 'null == ', true);

	// CONTAINER FIX (vector is very smart)
	/**
	 Description:
	 In some cases, player.openChest may not be defined.
	 In those cases, it will be undefined.
	 ```js
	 const m = player.openContainer,
	 u = m.getLowerChestInventory(),
	 h = m.getLowerChestInventory().getSizeInventory() > 27,
	 p = h ? 27 : 0;
	 ```
	 and because `u` is invoking a function in `m`,
	 it'll throw an error and break all of the UI.
	 */
	addModification(
		'const m=player.openContainer',
		`const m = player.openContainer ?? { getLowerChestInventory: () => {getSizeInventory: () => 0} }`,
		true
	);

	// COMMANDS
	addModification('submit(u){', `
		const str = this.inputValue.toLocaleLowerCase();
		const args = str.split(" ");
		let chatString;
		switch (args[0]) {
			case ".bind": {
				const module = args.length > 2 && getModule(args[1]);
				if (module) module.setbind(args[2] == "none" ? "" : args[2], true);
				return this.closeInput();
			}
			case ".t":
			case ".toggle":
				if (args.length > 1) {
					const module = args.length > 1 && getModule(args[1]);
					if (module) {
						module.toggle();
						game.chat.addChat({
							text: module.name + (module.enabled ? " Enabled!" : " Disabled!"),
							color: module.enabled ? "lime" : "red"
						});
					}
					else if (args[1] == "all") {
						for(const [name, module] of Object.entries(modules)) module.toggle();
					}
				}
				return this.closeInput();
			case ".modules":
				chatString = "Module List\\n";
				for(const [name, module] of Object.entries(modules)) chatString += "\\n" + name;
				game.chat.addChat({text: chatString});
				return this.closeInput();
			case ".binds":
				chatString = "Bind List\\n";
				for(const [name, module] of Object.entries(modules)) chatString += "\\n" + name + " : " + (module.bind != "" ? module.bind : "none");
				game.chat.addChat({text: chatString});
				return this.closeInput();
			case ".setoption":
			case ".reset": {
				const module = args.length > 1 && getModule(args[1]);
				const reset = args[0] == ".reset";
				if (module) {
					if (args.length < 3) {
						chatString = module.name + " Options";
						for(const [name, value] of Object.entries(module.options)) chatString += "\\n" + name + " : " + value[0].name + " : " + value[1];
						game.chat.addChat({text: chatString});
						return this.closeInput();
					}

					let option;
					for(const [name, value] of Object.entries(module.options)) {
						if (name.toLocaleLowerCase() == args[2].toLocaleLowerCase()) option = value;
					}
					if (!option) return;
					// the last value is the default value.
					// ! don't change the default value (the last option), otherwise .reset won't work properly!
					if (reset) {
						option[1] = option[option.length - 1];
						game.chat.addChat({text: "Reset " + module.name + " " + option[2] + " to " + option[1]});
						return this.closeInput();
					}
					if (option[0] == Number) option[1] = !isNaN(Number.parseFloat(args[3])) ? Number.parseFloat(args[3]) : option[1];
					else if (option[0] == Boolean) option[1] = args[3] == "true";
					else if (option[0] == String) option[1] = args.slice(3).join(" ");
					game.chat.addChat({text: "Set " + module.name + " " + option[2] + " to " + option[1]});
				}
				return this.closeInput();
			}
			case ".config":
			case ".profile":
				if (args.length > 1) {
					switch (args[1]) {
						case "save":
							globalThis.${storeName}.saveVapeConfig(args[2]);
							game.chat.addChat({text: "Saved config " + args[2]});
							break;
						case "load":
							globalThis.${storeName}.saveVapeConfig();
							globalThis.${storeName}.loadVapeConfig(args[2]);
							game.chat.addChat({text: "Loaded config " + args[2]});
							break;
						case "import":
							globalThis.${storeName}.importVapeConfig(args[2]);
							game.chat.addChat({text: "Imported config"});
							break;
						case "export":
							globalThis.${storeName}.exportVapeConfig();
							game.chat.addChat({text: "Config set to clipboard!"});
							break;
					}
				}
				return this.closeInput();
		}
		if (enabledModules["FilterBypass"] && !this.inputValue.startsWith('/')) {
			const words = this.inputValue.split(" ");
			let newwords = [];
			for(const word of words) newwords.push(word.charAt(0) + '‎' + word.slice(1));
			this.inputValue = newwords.join(' ');
		}
	`);

	// MAIN
	addModification('document.addEventListener("contextmenu",m=>m.preventDefault());', /*js*/`
		// my code lol
		(function() {
			class Module {
				constructor(name, func) {
					this.name = name;
					this.func = func;
					this.enabled = false;
					this.bind = "";
					this.options = {};
					modules[this.name] = this;
				}
				toggle() {
					this.enabled = !this.enabled;
					enabledModules[this.name] = this.enabled;
					this.func(this.enabled);
				}
				setbind(key, manual) {
					if (this.bind != "") delete keybindCallbacks[this.bind];
					this.bind = key;
					if (manual) game.chat.addChat({text: "Bound " + this.name + " to " + (key == "" ? "none" : key) + "!"});
					if (key == "") return;
					const module = this;
					keybindCallbacks[this.bind] = function(j) {
						if (Game.isActive()) {
							module.toggle();
							game.chat.addChat({
								text: module.name + (module.enabled ? " Enabled!" : " Disabled!"),
								color: module.enabled ? "lime" : "red"
							});
						}
					};
				}
				addoption(name, typee, defaultt) {
					// ! the last item in the option array should never be changed.
					// ! because it is used in the .reset command
					this.options[name] = [typee, defaultt, name, defaultt];
					return this.options[name];
				}
			}

			let clickDelay = Date.now();
			new Module("AutoClicker", function(callback) {
				if (callback) {
					tickLoop["AutoClicker"] = function() {
						if (clickDelay < Date.now() && playerControllerDump.key.leftClick && !player.isUsingItem()) {
							playerControllerDump.leftClick();
							clickDelay = Date.now() + 60;
						}
					}
				} else delete tickLoop["AutoClicker"];
			});
			new Module("AntiCheat", function(callback) {
				if (!callback)
					return; // TODO: deinitialization logic
				const entities = game.world.entitiesDump;
				for (const entity of entities) {
						if (!entity instanceof EntityPlayer)
							continue; // only go through players
						if (entity.mode.isCreative() || entity.mode.isSpectator())
							continue; // ignore Albert einstein or someone who died
						// TODO: track the player's position and get the difference from previous position to new position.
				}
			})

            function reloadTickLoop(value) {
				if (game.tickLoop) {
					MSPT = value;
					clearInterval(game.tickLoop);
					game.tickLoop = setInterval(() => game.fixedUpdate(), MSPT);
				}
			}

			new Module("Sprint", function() {});
			const velocity = new Module("Velocity", function() {});
			velocityhori = velocity.addoption("Horizontal", Number, 0);
			velocityvert = velocity.addoption("Vertical", Number, 0);

			// NoFall
			new Module("NoFall", function(callback) {
				if (callback) {
					let ticks = 0;
					tickLoop["NoFall"] = function() {
        				const ray = rayTraceBlocks(player.getEyePos(), player.getEyePos().clone().setY(0), false, false, false, game.world);
						if (player.fallDistance > 2.5 && ray) {
							ClientSocket.sendPacket(new SPacketPlayerPosLook({pos: {x: player.pos.x, y: ray.hitVec.y, z: player.pos.z}, onGround: true}));
							player.fallDistance = 0;
						}
					};
				}
				else delete tickLoop["NoFall"];
			});

			// WTap
			new Module("WTap", function() {});

			// AntiVoid
			new Module("AntiFall", function(callback) {
				if (callback) {
					let ticks = 0;
					tickLoop["AntiFall"] = function() {
        				const ray = rayTraceBlocks(player.getEyePos(), player.getEyePos().clone().setY(0), false, false, false, game.world);
						if (!ray) {
							player.motion.y = 0;
						}
					};
				}
				else delete tickLoop["AntiFall"];
			});

			// Killaura
			let attackDelay = Date.now();
			let didSwing = false;
			let attacked = 0;
			let attackedPlayers = {};
			let attackList = [];
			let boxMeshes = [];
			let killaurarange, killaurablock, killaurabox, killauraangle, killaurawall, killauraitem;

			function wrapAngleTo180_radians(j) {
				return j = j % (2 * Math.PI),
				j >= Math.PI && (j -= 2 * Math.PI),
				j < -Math.PI && (j += 2 * Math.PI),
				j
			}

			function killauraAttack(entity, first) {
				if (attackDelay < Date.now()) {
					const aimPos = player.pos.clone().sub(entity.pos);
					const newYaw = wrapAngleTo180_radians(Math.atan2(aimPos.x, aimPos.z) - player.lastReportedYawDump);
					const checkYaw = wrapAngleTo180_radians(Math.atan2(aimPos.x, aimPos.z) - player.yaw);
					if (first) sendYaw = Math.abs(checkYaw) > degToRad(30) && Math.abs(checkYaw) < degToRad(killauraangle[1]) ? player.lastReportedYawDump + newYaw : false;
					if (Math.abs(newYaw) < degToRad(30)) {
						if ((attackedPlayers[entity.id] || 0) < Date.now()) attackedPlayers[entity.id] = Date.now() + 100;
						if (!didSwing) {
							hud3D.swingArm();
							ClientSocket.sendPacket(new SPacketClick({}));
							didSwing = true;
						}
						const box = entity.getEntityBoundingBox();
						const hitVec = player.getEyePos().clone().clamp(box.min, box.max);
						attacked++;
						playerControllerMP.syncItemDump();
						ClientSocket.sendPacket(new SPacketUseEntity({
							id: entity.id,
							action: 1,
							hitVec: new PBVector3({
								x: hitVec.x,
								y: hitVec.y,
								z: hitVec.z
							})
						}));
						player.attackDump(entity);
					}
				}
			}

			function swordCheck() {
				const item = player.inventory.getCurrentItem();
				return item && item.getItem() instanceof ItemSword;
			}

			function block() {
				if (attackDelay < Date.now()) attackDelay = Date.now() + (Math.round(attacked / 2) * 100);
				if (swordCheck() && killaurablock[1]) {
					if (!blocking) {
						playerControllerMP.syncItemDump();
						ClientSocket.sendPacket(new SPacketUseItem);
						blocking = true;
					}
				} else blocking = false;
			}

			function unblock() {
				if (blocking && swordCheck()) {
					playerControllerMP.syncItemDump();
					ClientSocket.sendPacket(new SPacketPlayerAction({
						position: BlockPos.ORIGIN.toProto(),
						facing: EnumFacing.DOWN.getIndex(),
						action: PBAction.RELEASE_USE_ITEM
					}));
				}
				blocking = false;
			}

			function getTeam(entity) {
				const entry = game.playerList.playerDataMap.get(entity.id);
				if (!entry) return;
				return entry.color != "white" ? entry.color : undefined;
			}

			const killaura = new Module("Killaura", function(callback) {
				if (callback) {
					for(let i = 0; i < 10; i++) {
						const mesh = new Mesh(new boxGeometryDump(1, 2, 1));
						mesh.material.depthTest = false;
						mesh.material.transparent = true;
						mesh.material.opacity = 0.5;
						mesh.material.color.set(255, 0, 0);
						mesh.renderOrder = 6;
						game.gameScene.ambientMeshes.add(mesh);
						boxMeshes.push(mesh);
					}
					tickLoop["Killaura"] = function() {
						attacked = 0;
						didSwing = false;
						const localPos = controls.position.clone();
						const localTeam = getTeam(player);
						const entities = game.world.entitiesDump;

						attackList = [];
						if (!killauraitem[1] || swordCheck()) {
							for (const entity of entities.values()) {
								if (entity.id == player.id) continue;
								const newDist = player.getDistanceSqToEntity(entity);
								if (newDist < (killaurarange[1] * killaurarange[1]) && entity instanceof EntityPlayer) {
									if (entity.mode.isSpectator() || entity.mode.isCreative() || entity.isInvisibleDump()) continue;
									if (localTeam && localTeam == getTeam(entity)) continue;
									if (killaurawall[1] && !player.canEntityBeSeen(entity)) continue;
									attackList.push(entity);
								}
							}
						}

						attackList.sort((a, b) => {
							return (attackedPlayers[a.id] || 0) > (attackedPlayers[b.id] || 0) ? 1 : -1;
						});

						for(const entity of attackList) killauraAttack(entity, attackList[0] == entity);

						if (attackList.length > 0) block();
						else {
							unblock();
							sendYaw = false;
						}
					};

					renderTickLoop["Killaura"] = function() {
						for(let i = 0; i < boxMeshes.length; i++) {
							const entity = attackList[i];
							const box = boxMeshes[i];
							box.visible = entity != undefined && killaurabox[1];
							if (box.visible) {
								const pos = entity.mesh.position;
								box.position.copy(new Vector3$1(pos.x, pos.y + 1, pos.z));
							}
						}
					};
				}
				else {
					delete tickLoop["Killaura"];
					delete renderTickLoop["Killaura"];
					for(const box of boxMeshes) box.visible = false;
					boxMeshes.splice(boxMeshes.length);
					sendYaw = false;
					unblock();
				}
			});
			killaurarange = killaura.addoption("Range", Number, 9);
			killauraangle = killaura.addoption("Angle", Number, 360);
			killaurablock = killaura.addoption("AutoBlock", Boolean, true);
			killaurawall = killaura.addoption("Wallcheck", Boolean, false);
			killaurabox = killaura.addoption("Box", Boolean, true);
			killauraitem = killaura.addoption("LimitToSword", Boolean, false);

			new Module("FastBreak", function() {});

			function getMoveDirection(moveSpeed) {
				let moveStrafe = player.moveStrafeDump;
				let moveForward = player.moveForwardDump;
				let speed = moveStrafe * moveStrafe + moveForward * moveForward;
				if (speed >= 1e-4) {
					speed = Math.sqrt(speed), speed < 1 && (speed = 1), speed = 1 / speed, moveStrafe = moveStrafe * speed, moveForward = moveForward * speed;
					const rt = Math.cos(player.yaw) * moveSpeed;
					const nt = -Math.sin(player.yaw) * moveSpeed;
					return new Vector3$1(moveStrafe * rt - moveForward * nt, 0, moveForward * rt + moveStrafe * nt);
				}
				return new Vector3$1(0, 0, 0);
			}

			new Module("InvWalk", function() {});
			new Module("KeepSprint", function() {});
			new Module("NoSlowdown", function() {});
			new Module("MusicFix", function() {});

			// Speed
			let speedvalue, speedjump, speedauto;
			const speed = new Module("Speed", function(callback) {
				if (callback) {
					let lastjump = 10;
					tickLoop["Speed"] = function() {
						lastjump++;
						const oldMotion = new Vector3$1(player.motion.x, 0, player.motion.z);
						const dir = getMoveDirection(Math.max(oldMotion.length(), speedvalue[1]));
						lastjump = player.onGround ? 0 : lastjump;
						player.motion.x = dir.x;
						player.motion.z = dir.z;
						player.motion.y = player.onGround && dir.length() > 0 && speedauto[1] && !keyPressedDump("space") ? speedjump[1] : player.motion.y;
					};
				}
				else delete tickLoop["Speed"];
			});
			speedvalue = speed.addoption("Speed", Number, 0.39);
			speedjump = speed.addoption("JumpHeight", Number, 0.42);
			speedauto = speed.addoption("AutoJump", Boolean, true);

			const step = new Module("Step", function() {});
			stepheight = step.addoption("Height", Number, 2);

			new Module("Chams", function() {});
			const textgui = new Module("TextGUI", function() {});
			textguifont = textgui.addoption("Font", String, "Arial");
			textguisize = textgui.addoption("TextSize", Number, 15);
			textguishadow = textgui.addoption("Shadow", Boolean, true);
			textgui.toggle();
			new Module("AutoRespawn", function() {});

			// Breaker
			let breakerrange;
			const breaker = new Module("Breaker", function(callback) {
				if (callback) {
					let attemptDelay = {};
					tickLoop["Breaker"] = function() {
						if (breakStart > Date.now()) return;
						let offset = breakerrange[1];
						for (const block of BlockPos.getAllInBoxMutable(new BlockPos(player.pos.x - offset, player.pos.y - offset, player.pos.z - offset), new BlockPos(player.pos.x + offset, player.pos.y + offset, player.pos.z + offset))) {
							if (game.world.getBlockState(block).getBlock() instanceof BlockDragonEgg) {
								if ((attemptDelay[block] || 0) > Date.now()) continue;
								attemptDelay[block] = Date.now() + 500;
								ClientSocket.sendPacket(new SPacketClick({
									location: block
								}));
							}
						}
					}
				}
				else delete tickLoop["Breaker"];
			});
			breakerrange = breaker.addoption("Range", Number, 10);

			function getItemStrength(stack) {
				if (stack == null) return 0;
				const itemBase = stack.getItem();
				let base = 1;

				if (itemBase instanceof ItemSword) base += itemBase.attackDamage;
				else if (itemBase instanceof ItemArmor) base += itemBase.damageReduceAmountDump;

				const nbttaglist = stack.getEnchantmentTagList();
				if (nbttaglist != null) {
					for (let i = 0; i < nbttaglist.length; ++i) {
						const id = nbttaglist[i].id;
						const lvl = nbttaglist[i].lvl;

						if (id == Enchantments.sharpness.effectId) base += lvl * 1.25;
						else if (id == Enchantments.protection.effectId) base += Math.floor(((6 + lvl * lvl) / 3) * 0.75);
						else if (id == Enchantments.efficiency.effectId) base += (lvl * lvl + 1);
						else if (id == Enchantments.power.effectId) base += lvl;
						else base += lvl * 0.01;
					}
				}

				return base * stack.stackSize;
			}

			// AutoArmor
			function getArmorSlot(armorSlot, slots) {
				let returned = armorSlot;
				let dist = 0;
				for(let i = 0; i < 40; i++) {
					const stack = slots[i].getHasStack() ? slots[i].getStack() : null;
					if (stack && stack.getItem() instanceof ItemArmor && (3 - stack.getItem().armorType) == armorSlot) {
						const strength = getItemStrength(stack);
						if (strength > dist) {
							returned = i;
							dist = strength;
						}
					}
				}
				return returned;
			}

			new Module("AutoArmor", function(callback) {
				if (callback) {
					tickLoop["AutoArmor"] = function() {
						if (player.openContainer == player.inventoryContainer) {
							for(let i = 0; i < 4; i++) {
								const slots = player.inventoryContainer.inventorySlots;
								const slot = getArmorSlot(i, slots);
								if (slot != i) {
									if (slots[i].getHasStack()) {
										playerControllerDump.windowClickDump(player.openContainer.windowId, i, 0, 0, player);
										playerControllerDump.windowClickDump(player.openContainer.windowId, -999, 0, 0, player);
									}
									playerControllerDump.windowClickDump(player.openContainer.windowId, slot, 0, 1, player);
								}
							}
						}
					}
				}
				else delete tickLoop["AutoArmor"];
			});

			function craftRecipe(recipe) {
				if (canCraftItem(player.inventory, recipe)) {
					craftItem(player.inventory, recipe, false);
					ClientSocket.sendPacket(new SPacketCraftItem({
						data: JSON.stringify({
							recipe: recipe,
							shiftDown: false
						})
					}));
					playerControllerDump.windowClickDump(player.openContainer.windowId, 36, 0, 0, player);
				}
			}

			let checkDelay = Date.now();
			new Module("AutoCraft", function(callback) {
				if (callback) {
					tickLoop["AutoCraft"] = function() {
						if (checkDelay < Date.now() && player.openContainer == player.inventoryContainer) {
							checkDelay = Date.now() + 300;
							if (!player.inventory.hasItem(Items.emerald_sword)) craftRecipe(recipes[1101][0]);
						}
					}
				}
				else delete tickLoop["AutoCraft"];
			});

			// ChestSteal OP
			let cheststealblocks, cheststealtools;
const cheststeal = new Module("ChestSteal", function(callback) {
    if (callback) {
        let lastContainer = null;
        tickLoop["ChestSteal"] = function() {
            if (
                player.openContainer &&
                player.openContainer instanceof ContainerChest &&
                player.openContainer !== lastContainer
            ) {
                lastContainer = player.openContainer;
                // Instantly steal items and close the GUI before it becomes visible
                for(let i = 0; i < player.openContainer.numRows * 9; i++) {
                    const slot = player.openContainer.inventorySlots[i];
                    const item = slot.getHasStack() ? slot.getStack().getItem() : null;
                    if (item && (
                        item instanceof ItemSword ||
                        item instanceof ItemArmor ||
                        item instanceof ItemAppleGold ||
                        (cheststealblocks[1] && item instanceof ItemBlock) ||
                        (cheststealtools[1] && item instanceof ItemTool)
                    )) {
                        playerControllerDump.windowClickDump(player.openContainer.windowId, i, 0, 1, player);
                    }
                }
                player.closeScreen();
            }
            // Reset lastContainer when chest GUI is closed
            if (!player.openContainer && lastContainer) lastContainer = null;
        }
    } else {
        delete tickLoop["ChestSteal"];
    }
});
cheststealblocks = cheststeal.addoption("Blocks", Boolean, true);
cheststealtools = cheststeal.addoption("Tools", Boolean, true);



			let scaffoldtower, oldHeld, scaffoldextend, scaffoldcycle;
let tickCount = 0;

function getPossibleSides(pos) {
    const possibleSides = [];
    for (const side of EnumFacing.VALUES) {
        const offset = side.toVector();
        const state = game.world.getBlockState(pos.add(offset.x, offset.y, offset.z));
        if (state.getBlock().material !== Materials.air) {
            possibleSides.push(side.getOpposite());
        }
    }
    return possibleSides.length > 0 ? possibleSides[0] : null;
}

function switchSlot(slot) {
    player.inventory.currentItem = slot;
    game.info.selectedSlot = slot;
}

const scaffold = new Module("Scaffold", function(callback) {
    if (callback) {
        if (player) oldHeld = game.info.selectedSlot;

        tickLoop["Scaffold"] = function() {
            tickCount++;

            // 🔁 Auto-select blocks & cycle between them
            let slotsWithBlocks = [];
            for (let i = 0; i < 9; i++) {
                const item = player.inventory.main[i];
                if (
                    item &&
                    item.item instanceof ItemBlock &&
                    item.item.block.getBoundingBox().max.y === 1 &&
                    item.item.name !== "tnt"
                ) {
                    slotsWithBlocks.push(i);
                }
            }

            if (slotsWithBlocks.length >= 2) {
                const selected = Math.floor(tickCount / scaffoldcycle[1]) % slotsWithBlocks.length;
                switchSlot(slotsWithBlocks[selected]);
            } else if (slotsWithBlocks.length > 0) {
                switchSlot(slotsWithBlocks[0]); // fallback
            }

            const item = player.inventory.getCurrentItem();
            if (!item || !(item.getItem() instanceof ItemBlock)) return;

            let flooredX = Math.floor(player.pos.x);
            let flooredY = Math.floor(player.pos.y);
            let flooredZ = Math.floor(player.pos.z);

            let futureX = player.pos.x + player.motion.x;
            let futureZ = player.pos.z + player.motion.z;
            let flooredFutureX = Math.floor(futureX);
            let flooredFutureZ = Math.floor(futureZ);

            let positionsToCheck = [
                new BlockPos(flooredX, flooredY - 1, flooredZ),
                new BlockPos(flooredFutureX, flooredY - 1, flooredFutureZ)
            ];

            for (let pos of positionsToCheck) {
                if (game.world.getBlockState(pos).getBlock().material === Materials.air) {
                    let placeSide = getPossibleSides(pos);

                    if (!placeSide) {
                        let closestSide = null;
                        let closestPos = null;
                        let closestDist = Infinity;

                        for (let x = -5; x <= 5; x++) {
                            for (let z = -5; z <= 5; z++) {
                                const newPos = new BlockPos(pos.x + x, pos.y, pos.z + z);
                                const side = getPossibleSides(newPos);
                                if (side) {
                                    const dist = player.pos.distanceTo(new Vector3$1(newPos.x, newPos.y, newPos.z));
                                    if (dist < closestDist) {
                                        closestDist = dist;
                                        closestSide = side;
                                        closestPos = newPos;
                                    }
                                }
                            }
                        }

                        if (closestPos) {
                            pos = closestPos;
                            placeSide = closestSide;
                        }
                    }

                    if (placeSide) {
                        const dir = placeSide.getOpposite().toVector();

                        let offsetX = dir.x;
                        let offsetY = dir.y;
                        let offsetZ = dir.z;

                        if (scaffoldextend[1] > 0) {
                            offsetX *= scaffoldextend[1];
                            offsetZ *= scaffoldextend[1];
                        }

                        const placeX = pos.x + offsetX;
                        const placeY = keyPressedDump("shift")
                            ? pos.y - (dir.y + 2)
                            : pos.y + dir.y;
                        const placeZ = pos.z + offsetZ;

                        const placePosition = new BlockPos(placeX, placeY, placeZ);

                        function randomFaceOffset(face) {
                            const rand = () => 0.1 + Math.random() * 0.8;
                            if (face.getAxis() === "Y") {
                                return {
                                    x: placePosition.x + rand(),
                                    y: placePosition.y + (face === EnumFacing.UP ? 0.95 : 0.05) + Math.random() * 0.04,
                                    z: placePosition.z + rand()
                                };
                            } else if (face.getAxis() === "X") {
                                return {
                                    x: placePosition.x + (face === EnumFacing.EAST ? 0.95 : 0.05) + Math.random() * 0.04,
                                    y: placePosition.y + rand(),
                                    z: placePosition.z + rand()
                                };
                            } else {
                                return {
                                    x: placePosition.x + rand(),
                                    y: placePosition.y + rand(),
                                    z: placePosition.z + (face === EnumFacing.SOUTH ? 0.95 : 0.05) + Math.random() * 0.04
                                };
                            }
                        }

                        const hitOffsets = randomFaceOffset(placeSide);
                        const hitVec = new Vector3$1(hitOffsets.x, hitOffsets.y, hitOffsets.z);

                        const dx = hitVec.x - player.pos.x;
                        const dy = hitVec.y - (player.pos.y + player.getEyeHeight());
                        const dz = hitVec.z - player.pos.z;
                        const distHorizontal = Math.sqrt(dx * dx + dz * dz);

                        const rotYaw = Math.atan2(dz, dx) * (180 / Math.PI) - 90;
                        const rotPitch = -Math.atan2(dy, distHorizontal) * (180 / Math.PI);
                        player.rotationYaw = rotYaw;
                        player.rotationPitch = Math.max(-90, Math.min(90, rotPitch));

                        if (
                            scaffoldtower[1] &&
                            keyPressedDump("space") &&
                            dir.y === -1 &&
                            Math.abs(player.pos.x - flooredX - 0.5) < 0.2 &&
                            Math.abs(player.pos.z - flooredZ - 0.5) < 0.2
                        ) {
                            if (player.motion.y < 0.2 && player.motion.y > 0.15) {
                                player.motion.y = 0.42;
                            }
                        }

                        if (keyPressedDump("shift") && dir.y === 1) {
                            if (player.motion.y > -0.2 && player.motion.y < -0.15) {
                                player.motion.y = -0.42;
                            }
                        }

                        if (playerControllerDump.onPlayerRightClick(player, game.world, item, placePosition, placeSide, hitVec)) {
                            hud3D.swingArm();
                        }

                        if (item.stackSize === 0) {
                            player.inventory.main[player.inventory.currentItem] = null;
                        }
                    }

                    break; // ✅ Stop checking after placing
                }
            }
        };
    } else {
        if (player && oldHeld !== undefined) {
            switchSlot(oldHeld);
        }
        delete tickLoop["Scaffold"];
    }
});

scaffoldtower = scaffold.addoption("Tower", Boolean, true);
scaffoldextend = scaffold.addoption("Extend", Number, 1);
scaffoldcycle = scaffold.addoption("CycleSpeed", Number, 10);

			let timervalue;
			const timer = new Module("Timer", function(callback) {
				reloadTickLoop(callback ? 50 / timervalue[1] : 50);
			});
			timervalue = timer.addoption("Value", Number, 1.2);
			new Module("Phase", function() {});

			const antiban = new Module("AntiBan", function() {});
			antiban.toggle();
			new Module("AutoRejoin", function() {});
			new Module("AutoQueue", function() {});
			new Module("AutoVote", function() {});
			const chatdisabler = new Module("ChatDisabler", function() {});
			chatdisablermsg = chatdisabler.addoption("Message", String, "youtube.com/c/7GrandDadVape");
			new Module("FilterBypass", function() {});

			const survival = new Module("SurvivalMode", function(callback) {
				if (callback) {
					if (player) player.setGamemode(GameMode.fromId("survival"));
					survival.toggle();
				}
			});

			function dropSlot(index) {
	playerControllerDump.windowClickDump(player.openContainer.windowId, index, 0, 0, player);
	playerControllerDump.windowClickDump(player.openContainer.windowId, -999, 0, 0, player);
}

const InvCleaner = new Module("InvCleaner", function (callback) {
    if (!callback) {
        delete tickLoop["InvCleaner"];
        return;
    }

    const bestArmor = {};
    const weaponClasses = new Set(["ItemSword", "ItemAxe", "ItemBow", "ItemPickaxe"]);
    const essentialsKeywords = ["gapple", "golden apple", "ender pearl", "fire charge"];
    const armorMaterialPriority = ["leather", "chain", "iron", "diamond"];
    const customArmorKeepList = ["god helmet", "legend boots"];
    let lastRun = 0;

    function getArmorScore(stack) {
        const item = stack.getItem();
        const material = item.getArmorMaterial?.()?.toLowerCase?.() || "unknown";
        const materialIndex = armorMaterialPriority.indexOf(material);
        const materialScore = materialIndex === -1 ? -999 : materialIndex * 1000;
        const durabilityScore = stack.getMaxDamage() - stack.getItemDamage();
        return materialScore + durabilityScore;
    }

    tickLoop["InvCleaner"] = function () {
        const now = Date.now();
        if (now - lastRun < 45) return;
        lastRun = now;

        const keptTypes = new Set();
        const toDrop = [];

        if (!player.openContainer || player.openContainer !== player.inventoryContainer) return;
        const slots = player.inventoryContainer.inventorySlots;
        if (!slots || slots.length < 36) return;

        Object.keys(bestArmor).forEach(k => delete bestArmor[k]);

        [5, 6, 7, 8].forEach(i => {
            const slot = slots[i];
            if (!slot?.getHasStack()) return;
            const stack = slot.getStack();
            if (!(stack.getItem() instanceof ItemArmor)) return;
            const armorType = stack.getItem().armorType ?? "unknown";
            bestArmor["armor_" + armorType] = { stack, index: i };
        });

        for (let i = 0; i < 36; i++) {
            const slot = slots[i];
            if (!slot?.getHasStack()) continue;

            const stack = slot.getStack();
            const item = stack.getItem();
            const name = stack.getDisplayName().toLowerCase();

            if (essentialsKeywords.some(k => name.includes(k))) continue;
            if (customArmorKeepList.some(k => name.includes(k))) continue;

            if (item instanceof ItemBlock) {
                if (stack.stackSize < 5) {
                    toDrop.push(i);
                }
                continue;
            }

            if (item instanceof ItemArmor) {
                const armorType = item.armorType ?? "unknown";
                const key = "armor_" + armorType;
                const score = getArmorScore(stack);
                const existing = bestArmor[key];
                const existingScore = existing ? getArmorScore(existing.stack) : -1;

                if (!existing || score > existingScore) {
                    if (existing && existing.index !== i) toDrop.push(existing.index);
                    bestArmor[key] = { stack, index: i };
                } else {
                    toDrop.push(i);
                }
                continue;
            }

            const className = item.constructor.name;
            if (weaponClasses.has(className)) {
                if (!keptTypes.has(className)) {
                    keptTypes.add(className);
                } else {
                    toDrop.push(i);
                }
                continue;
            }

            toDrop.push(i);
        }

        toDrop.forEach(dropSlot);
    };
});

function dropSlot(index) {
    playerControllerDump.windowClickDump(player.openContainer.windowId, index, 0, 0, player);
    playerControllerDump.windowClickDump(player.openContainer.windowId, -999, 0, 0, player);
}

let funnyMessages = [
  "Analyzing target... ▒▒▒ complete.",
  "No soul detected. Protocol: Δ.404",
  "Signal faded ▸ consciousness terminated.",
  "Entity response: null / void.",
  "Exit timestamp: [0xFE4C]",
  "Scan mismatch ⚠ integrity: zero.",
  "Neural echo silenced.",
  "Memory fragment purged ▓▓▓",
  "Vital sequence collapsed. ✓",
  "XFA.031 ▸ subject removed",
  "[CORE] Terminate ➜ ID:X09A",
  "SEQ#31.x purge executed",
  "Subject tagged ▸ TRACE-XΔ",
  "kill.sig(ΔC7-003)",
  "Encrypted kill fr ▸ φσX",
  "Exit granted [v3.1.0.alpha]",
  "NODE[XA7]: corpse logged",
  "Terminal: Target ID 0x4E erased",
  "░░System response: SUCCESSFUL PURGE",
  "Imagine losing in Miniblox... tragic. 😬",
    "Analyzing corpse... 💉",
  "No soul detected. ⚠️",
  "Target integrity: compromised.",
  "Residual heat signature: null.",
  "Scanning DNA... mismatch. ❌",
  "Consciousness expired. 💤",
  "Signal disconnected.",
  "Vital signs terminated.",
  "Syntax error: Humanity not found.",
  "Skeletal integrity dissolved.",
  "Neural response: silent.",
  "Final echo: none.",
  "Target offline. 💡",
  "Purification complete. 🔻",
  "Emotional trace: zeroed.",
  "Movement signature deleted.",
  "Memory block corrupted.",
  "Identity unresolved. 🧠",
  "Entity tagged: obsolete.",
   "X0001 eliminated",
  "XFA204 purged",
  "Target erased [vX.03]",
  "Δ protocol complete",
  "Entity shutdown: SEQ#19",
  "kill.sig(XFA201)",
  "Hitt! ▸ 0xA3",
  "Operation successful [logged#72]",
  "👁‍🗨 Memory wipe initiated",
  "Error 47: Subject deleted",
  "Removed from system root",
  "Null trace identified ▸ removed",
  "Purge complete ☑",
  "Contact terminated (γ.92)",
  "⚠ Anomaly resolved",
  "Exit granted — X019C",
  "✓ Signal matched and dissolved",
  "Echo silenced [Node.AV7]",
  "Deleted from grid (ID#E2)",
  "Signature nullified 🔻",
  "Node.js booted fr",
  "Error 1029 you just got shut down"
];

const AutoFunnyChat = new Module("AutoFunnyChat", function(callback) {
    if (!callback) {
        delete tickLoop["AutoFunnyChat"];
        if (window.__autoFunnyKillMsgListener) {
            ClientSocket.off && ClientSocket.off("CPacketMessage", window.__autoFunnyKillMsgListener);
            window.__autoFunnyKillMsgListener = undefined;
        }
        return;
    }
    // Periodic random funny message
    let lastSent = 0;
    tickLoop["AutoFunnyChat"] = function() {
        if (Date.now() - lastSent > 50000) { // Sends every 50 seconds
            const msg = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
            ClientSocket.sendPacket(new SPacketMessage({text: msg}));
            lastSent = Date.now();
        }
    };

    // Also send on kill events (Miniblox chat detection)
    if (!window.__autoFunnyKillMsgListener) {
        window.__autoFunnyKillMsgListener = function(h) {
            if (
                h.text &&
                (
                    h.text.includes("You eliminated") ||
                    h.text.includes("You knocked out") ||
                    h.text.includes("You sent") ||
                    (h.text.includes("eliminated by") && h.text.includes(player.name)) ||
                    h.text.includes(player.name + " eliminated")
                )
            ) {
                const msg = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
                setTimeout(function() {
                    ClientSocket.sendPacket(new SPacketMessage({text: msg}));
                }, 500 + Math.random() * 1000); // slight delay for realism
            }
        };
        ClientSocket.socket.off("CPacketMessage", window.__autoFunnyKillMsgListener);
    }
});

const spiderclimb = new Module("SpiderClimb", function(callback) {
    if (!callback) {
        delete tickLoop["SpiderClimb"];
        return;
    }

    tickLoop["SpiderClimb"] = function() {
        if (!player || !player.pos || !game.world) return;

        const pos = new BlockPos(player.pos.x, player.pos.y, player.pos.z);
        const sides = [EnumFacing.NORTH, EnumFacing.SOUTH, EnumFacing.EAST, EnumFacing.WEST];

        for (const side of sides) {
            const blockState = game.world.getBlockState(pos.offset(side));
            const block = blockState.getBlock();
            const isClingable = block.material !== Materials.air && !block.isTransparent;

            const sneakRequired = spiderclimb.options["Enable Sneak Climb"][1];
            const allowAir = spiderclimb.options["Allow Air Cling"][1];
            const climbSpeed = spiderclimb.options["Climb Speed"][1];

            const isSneaking = sneakRequired ? keyPressedDump("shift") : true;
            const nearWall = isClingable && (allowAir || player.onGround);
            const verticalMotionSafe = player.motion.y <= 0.05;

            if (nearWall && isSneaking && verticalMotionSafe) {
                player.motion.y = climbSpeed;
                player.onGround = true;
                break;
            }
        }
    };
});

spiderclimb.addoption("Cling Height", Number, 1.4);
spiderclimb.addoption("Enable Sneak Climb", Boolean, true);
spiderclimb.addoption("Allow Air Cling", Boolean, true);
spiderclimb.addoption("Climb Speed", Number, 0.18);

			globalThis.${storeName}.modules = modules;
			globalThis.${storeName}.profile = "default";
		})();
	`);

	async function saveVapeConfig(profile) {
		if (!loadedConfig) return;
		let saveList = {};
		for(const [name, module] of Object.entries(unsafeWindow.globalThis[storeName].modules)) {
			saveList[name] = {enabled: module.enabled, bind: module.bind, options: {}};
			for(const [option, setting] of Object.entries(module.options)) {
				saveList[name].options[option] = setting[1];
			}
		}
		GM_setValue("vapeConfig" + (profile ?? unsafeWindow.globalThis[storeName].profile), JSON.stringify(saveList));
		GM_setValue("mainVapeConfig", JSON.stringify({profile: unsafeWindow.globalThis[storeName].profile}));
	};

	async function loadVapeConfig(switched) {
		loadedConfig = false;
		const loadedMain = JSON.parse(await GM_getValue("mainVapeConfig", "{}")) ?? {profile: "default"};
		unsafeWindow.globalThis[storeName].profile = switched ?? loadedMain.profile;
		const loaded = JSON.parse(await GM_getValue("vapeConfig" + unsafeWindow.globalThis[storeName].profile, "{}"));
		if (!loaded) {
			loadedConfig = true;
			return;
		}

		for(const [name, module] of Object.entries(loaded)) {
			const realModule = unsafeWindow.globalThis[storeName].modules[name];
			if (!realModule) continue;
			if (realModule.enabled != module.enabled) realModule.toggle();
			if (realModule.bind != module.bind) realModule.setbind(module.bind);
			if (module.options) {
				for(const [option, setting] of Object.entries(module.options)) {
					const realOption = realModule.options[option];
					if (!realOption) continue;
					realOption[1] = setting;
				}
			}
		}
		loadedConfig = true;
	};

	async function exportVapeConfig() {
		navigator.clipboard.writeText(await GM_getValue("vapeConfig" + unsafeWindow.globalThis[storeName].profile, "{}"));
	};

	async function importVapeConfig() {
		const arg = await navigator.clipboard.readText();
		if (!arg) return;
		GM_setValue("vapeConfig" + unsafeWindow.globalThis[storeName].profile, arg);
		loadVapeConfig();
	};

	let loadedConfig = false;
	async function execute(src, oldScript) {
		Object.defineProperty(unsafeWindow.globalThis, storeName, {value: {}, enumerable: false});
		if (oldScript) oldScript.type = 'javascript/blocked';
		await fetch(src).then(e => e.text()).then(e => modifyCode(e));
		if (oldScript) oldScript.type = 'module';
		await new Promise((resolve) => {
			const loop = setInterval(async function() {
				if (unsafeWindow.globalThis[storeName].modules) {
					clearInterval(loop);
					resolve();
				}
			}, 10);
		});
		unsafeWindow.globalThis[storeName].saveVapeConfig = saveVapeConfig;
		unsafeWindow.globalThis[storeName].loadVapeConfig = loadVapeConfig;
		unsafeWindow.globalThis[storeName].exportVapeConfig = exportVapeConfig;
		unsafeWindow.globalThis[storeName].importVapeConfig = importVapeConfig;
		loadVapeConfig();
		setInterval(async function() {
			saveVapeConfig();
		}, 10000);
	}

	const publicUrl = "scripturl";
	// https://stackoverflow.com/questions/22141205/intercept-and-alter-a-sites-javascript-using-greasemonkey
	if (publicUrl == "scripturl") {
		if (navigator.userAgent.indexOf("Firefox") != -1) {
			window.addEventListener("beforescriptexecute", function(e) {
				if (e.target.src.includes("https://miniblox.io/assets/index")) {
					e.preventDefault();
					e.stopPropagation();
					execute(e.target.src);
				}
			}, false);
		}
		else {
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
	}
	else {
		execute(publicUrl);
	}
})();
(async function() {
  // Load Minecraft font
  const fontLink = document.createElement("link");
  fontLink.href = "https://fonts.cdnfonts.com/css/minecraft-4";
  fontLink.rel = "stylesheet";
  document.head.appendChild(fontLink);

  // Wait for modules
  await new Promise(resolve => {
    const loop = setInterval(() => {
      if (unsafeWindow.globalThis[storeName]?.modules) {
        clearInterval(loop);
        resolve();
      }
    }, 10);
  });

  // Inject GUI
  injectGUI(unsafeWindow.globalThis[storeName]);

  async function injectGUI(store) {
    const moduleCategories = {
      Combat: ["aura", "reach", "velocity", "crit", "hit", "attack"],
      Movement: ["fly", "speed", "step", "bhop", "sprint"],
      Render: ["esp", "tracer", "fullbright", "nametag"],
      Misc: ["autogg", "scaffold", "spammer", "inv", "chest", "timer"]
    };
    const categoryIcons = { Combat: "⚔️", Movement: "🏃", Render: "👁️", Misc: "🧰" };

    // Styles including rainbow header & live slider labels
    const style = document.createElement("style");
    style.textContent = `
      @keyframes rainbowText { 0% { background-position: 0% } 100% { background-position: 100% } }
      #clickGUI { position: fixed; top:100px; left:100px; width:360px; max-height:80vh;
        overflow-y:auto; background:rgba(15,15,15,0.95); color:white; font-family:monospace;
        border:2px solid lime; padding:12px; border-radius:8px; z-index:999999; display:none; }
      #clickGUI h2 { text-align:center; font-size:24px; font-weight:bold;
        background:linear-gradient(270deg, red, orange, yellow, green, blue, indigo, violet);
        background-size:1400% 1400%; -webkit-background-clip:text; color:transparent;
        animation:rainbowText 6s linear infinite; cursor:move; }
      .module { margin-bottom:10px; padding-bottom:6px; border-bottom:1px dashed #444; }
      .toggle-btn { float:right; background:lime; color:black; border:none;
        padding:2px 6px; border-radius:4px; cursor:pointer; font-weight:bold; }
      .option-line { margin:4px 0; font-size:13px; position:relative; }
      input[type="range"] { width:calc(100% - 40px); vertical-align:middle; }
      input[type="text"] { width:100%; font-size:12px; }
      .live-label { position:absolute; right:0; top:2px; font-size:12px; color:lime; }
      #guiControls { margin-top:12px; text-align:center; }
      button.control { background:black; color:lime; border:1px solid lime;
        padding:5px 8px; margin:2px; cursor:pointer; font-family:monospace; border-radius:4px; }
    `;
    document.head.appendChild(style);

    // Notification container
    const notifWrap = document.createElement("div");
    notifWrap.style = `
      position: fixed;
      bottom: 40px;
      right: 30px;
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    `;
    document.body.appendChild(notifWrap);

    function showNotif(text) {
  const notif = document.createElement("div");
  notif.textContent = text;
  notif.style = `
    background: rgba(20,20,20,0.96);
    color: lime;
    font-family: monospace;
    font-size: 16px;
    margin-top: 8px;
    padding: 10px 18px;
    border-radius: 8px;
    border: 2px solid lime;
    box-shadow: 0 2px 12px #000a;
    opacity: 1;
    transition: opacity 0.4s, transform 0.5s cubic-bezier(.23,1.29,.56,1.01);
    transform: translateX(120%);
    pointer-events: none;
  `;
  notifWrap.appendChild(notif);

  // Start slide-in after appending
  setTimeout(() => { notif.style.transform = "translateX(0)"; }, 10);

  setTimeout(() => { notif.style.opacity = 0; notif.style.transform = "translateX(120%)"; }, 4800);
  setTimeout(() => { notif.remove(); }, 5200);
}

    // Build GUI
    const gui = document.createElement("div");
    gui.id = "clickGUI";
    gui.innerHTML = `<h2 id="clickHeader">Massive GUI</h2>`;
    document.body.appendChild(gui);

    // Enable dragging
    let dragging = false, offsetX = 0, offsetY = 0;
    const header = gui.querySelector("#clickHeader");
    header.onmousedown = e => {
      dragging = true;
      offsetX = e.clientX - gui.offsetLeft;
      offsetY = e.clientY - gui.offsetTop;
    };
    document.onmouseup = () => (dragging = false);
    document.onmousemove = e => {
      if (dragging) {
        gui.style.left = `${e.clientX - offsetX}px`;
        gui.style.top = `${e.clientY - offsetY}px`;
      }
    };

    // Prevent context menu
    gui.oncontextmenu = e => e.preventDefault();

    // Tabs & search bar
    const tabWrap = document.createElement("div");
    tabWrap.style = "display:flex; gap:6px; margin-bottom:10px; justify-content:center;";
    gui.appendChild(tabWrap);

    const searchBar = document.createElement("input");
    searchBar.type = "text";
    searchBar.placeholder = "🔍 Search modules...";
    searchBar.style = `
      width:calc(100% - 20px); margin:0 auto 10px; display:block;
      padding:5px 8px; border:1px solid lime; background:black; color:lime; font-family:monospace;
    `;
    gui.appendChild(searchBar);

    const tabModules = {};
    let currentTab = "Combat";
    for (const tabName of Object.keys(moduleCategories)) {
      const btn = document.createElement("button");
      btn.className = "control";
      btn.textContent = tabName;
      btn.onclick = () => switchTab(tabName);
      tabWrap.appendChild(btn);
      tabModules[tabName] = [];
    }

    // Create modules
    Object.entries(store.modules).forEach(([name, mod]) => {
      const box = document.createElement("div");
      box.className = "module";

      // Choose icon
      let icon = "❓";
      for (const [cat, keys] of Object.entries(moduleCategories)) {
        if (keys.some(k => name.toLowerCase().includes(k))) {
          icon = categoryIcons[cat] || icon;
          break;
        }
      }

      const toggle = document.createElement("button");
      toggle.className = "toggle-btn";
      toggle.textContent = mod.enabled ? "ON" : "OFF";
      toggle.onclick = () => {
        mod.toggle();
        toggle.textContent = mod.enabled ? "ON" : "OFF";
        showNotif(`${name} module has been toggled ${mod.enabled ? "ON" : "OFF"}`);
      };

      box.innerHTML = `<b>${icon} ${name}</b>`;
      box.appendChild(toggle);

      if (mod.options) {
        Object.values(mod.options).forEach(opt => {
          const [type, val, label] = opt;
          const line = document.createElement("div");
          line.className = "option-line";
          line.innerText = label + ": ";

          if (type === Boolean) {
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = val;
            cb.onchange = () => (opt[1] = cb.checked);
            line.appendChild(cb);
          } else if (type === Number) {
            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = 0;
            slider.max = 10;
            slider.step = 0.1;
            slider.value = val;

            const liveLabel = document.createElement("span");
            liveLabel.className = "live-label";
            liveLabel.textContent = val;

            slider.oninput = () => {
              opt[1] = parseFloat(slider.value);
              liveLabel.textContent = slider.value;
            };

            line.appendChild(slider);
            line.appendChild(liveLabel);
          } else if (type === String) {
            const input = document.createElement("input");
            input.type = "text";
            input.value = val;
            input.onchange = () => (opt[1] = input.value);
            line.appendChild(input);
          }
          box.appendChild(line);
        });
      }

      const bindLine = document.createElement("div");
      bindLine.className = "option-line";
      bindLine.innerHTML = `Bind: <input type="text" style="width:60px" value="${mod.bind}">`;
      bindLine.querySelector("input").onchange = e => mod.setbind(e.target.value);
      box.appendChild(bindLine);

      let cat = "Misc";
      for (const [k, keys] of Object.entries(moduleCategories)) {
        if (keys.some(x => name.toLowerCase().includes(x))) {
          cat = k;
          break;
        }
      }
      tabModules[cat].push(box);
      box.style.display = cat === currentTab ? "block" : "none";
      gui.appendChild(box);
    });

    function switchTab(tab) {
      currentTab = tab;
      const q = searchBar.value.toLowerCase();
      Object.entries(tabModules).forEach(([cat, boxes]) => {
        boxes.forEach(b => {
          const nm = b.querySelector("b").textContent.toLowerCase();
          b.style.display = cat === tab && (nm.includes(q) || q.split("").every(ch => nm.includes(ch)))
            ? "block" : "none";
        });
      });
    }
    searchBar.addEventListener("input", () => switchTab(currentTab));

    // Control buttons, themes & profiles
    const ctrl = document.createElement("div");
    ctrl.id = "guiControls";
    gui.appendChild(ctrl);

    const themes = ["dark", "minecraft", "neon", "glass", "frame", "sunset", "ocean", "chrome", "terminal"];
    let themeIndex = themes.indexOf(await GM_getValue("guiTheme", "dark"));

    const themeBtn = document.createElement("button");
    themeBtn.className = "control";
    themeBtn.textContent = "Toggle Theme";
    themeBtn.onclick = () => {
      themeIndex = (themeIndex + 1) % themes.length;
      GM_setValue("guiTheme", themes[themeIndex]);
      applyTheme(themes[themeIndex]);
    };
    ctrl.appendChild(themeBtn);

    const exportBtn = document.createElement("button");
    exportBtn.className = "control";
    exportBtn.textContent = "Export";
    exportBtn.onclick = () => {
      const prof = store.profile;
      const cfg = GM_getValue("vapeConfig" + prof, "{}");
      navigator.clipboard.writeText(cfg).then(() => alert("✅ Exported"));
    };
    ctrl.appendChild(exportBtn);

    const importBtn = document.createElement("button");
    importBtn.className = "control";
    importBtn.textContent = "Import";
    importBtn.onclick = async () => {
      const prof = store.profile;
      const txt = await navigator.clipboard.readText();
      if (txt) {
        await GM_setValue("vapeConfig" + prof, txt);
        await store.loadVapeConfig(prof);
        alert("✅ Imported");
      } else {
        alert("❌ Clipboard empty");
      }
    };
    ctrl.appendChild(importBtn);

    const saveBtn = document.createElement("button");
    saveBtn.className = "control";
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => store.saveVapeConfig();
    ctrl.appendChild(saveBtn);

    const loadBtn = document.createElement("button");
    loadBtn.className = "control";
    loadBtn.textContent = "Load";
    loadBtn.onclick = () => store.loadVapeConfig();
    ctrl.appendChild(loadBtn);

    applyTheme(themes[themeIndex]);

    // Theme application logic
    function applyTheme(m) {
      const root = document.getElementById("clickGUI");
      const buttons = root.querySelectorAll("button");
      // Reset styles
      root.style.backdropFilter = root.style.background = root.style.border = root.style.color = "";
      buttons.forEach(b => b.style.background = b.style.color = b.style.border = "");

      const setBtn = (bg, clr, border) => buttons.forEach(b => { b.style.background = bg; b.style.color = clr; b.style.border = border; });

      switch (m) {
        case "dark":
          root.style.background = "rgba(15,15,15,0.95)";
          root.style.color = "#fff";
          root.style.border = "2px solid lime";
          setBtn("black", "lime", "1px solid lime");
          break;
        case "minecraft":
          root.style.background = 'url("https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets/assets/minecraft/textures/block/stone.png") repeat';
          root.style.backgroundSize = "64px 64px";
          root.style.imageRendering = "pixelated";
          root.style.color = "#0f0";
          root.style.fontFamily = '"Minecraft", monospace';
          root.style.border = "3px double #0f0";
          setBtn("#1a1a1a", "#0f0", "1px solid #0f0");
          break;
        case "neon":
          root.style.background = "#000";
          root.style.color = "#0ff";
          root.style.border = "2px solid #0ff";
          setBtn("#111", "#0ff", "1px solid #0ff");
          break;
        case "glass":
          root.style.background = "rgba(255,255,255,0.08)";
          root.style.color = "#fff";
          root.style.backdropFilter = "blur(10px)";
          root.style.border = "1px solid rgba(255,255,255,0.2)";
          setBtn("rgba(255,255,255,0.15)", "#fff", "1px solid rgba(255,255,255,0.3)");
          break;
        case "frame":
          root.style.background = "#ddd";
          root.style.color = "#111";
          root.style.border = "2px solid #444";
          setBtn("#eee", "#111", "1px solid #888");
          break;
        case "sunset":
          root.style.background = "linear-gradient(135deg,#ff5f6d,#ffc371)";
          root.style.color = "#fff";
          root.style.border = "2px solid #ffb347";
          setBtn("#ff7e5f", "#fff", "1px solid #fff");
          break;
        case "ocean":
          root.style.background = "linear-gradient(135deg,#2b5876,#4e4376)";
          root.style.color = "#ccf";
          root.style.border = "2px solid #88f";
          setBtn("#334", "#ccf", "1px solid #ccf");
          break;
        case "chrome":
          root.style.background = "#dfe4ea";
          root.style.color = "#2f3542";
          root.style.border = "2px solid #57606f";
          setBtn("#f1f2f6", "#2f3542", "1px solid #57606f");
          break;
        case "terminal":
          root.style.background = "#000";
          root.style.color = "#0f0";
          root.style.border = "2px solid #0f0";
          setBtn("#000", "#0f0", "1px solid #0f0");
          break;
      }
    }

    // Toggle visibility with Backslash (\\)
    let visible = false;
    document.addEventListener("keydown", e => {
      if (e.code === "Backslash") {
        visible = !visible;
        gui.style.display = visible ? "block" : "none";
      }
    });
  }
})();