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
      @keyframes rainbowText {
  0% { background-position: 0% }
  100% { background-position: 100% }
}

#clickGUI {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow-y: auto;
  background: linear-gradient(135deg, rgba(10,10,15,0.95), rgba(35,35,45,0.92));
  color: white;
  font-family: monospace;
  padding: 32px 48px;
  border: none;
  border-radius: 0;
  z-index: 999999;
  display: none;
  backdrop-filter: blur(14px);
  box-shadow: inset 0 0 60px rgba(0,255,180,0.05);
}

#clickGUI h2 {
  text-align: center;
  font-size: 36px;
  font-weight: bold;
  background: linear-gradient(270deg, red, orange, yellow, green, blue, indigo, violet);
  background-size: 1400% 1400%;
  -webkit-background-clip: text;
  color: transparent;
  animation: rainbowText 6s linear infinite;
  margin-bottom: 28px;
  cursor: move;
}

.module {
  width: 100%;
  margin-bottom: 20px;
  padding: 18px;
  background: rgba(40,40,55,0.75);
  border-radius: 10px;
  border: 1px solid rgba(100,255,220,0.1);
  box-shadow: 0 0 10px rgba(0,255,200,0.1);
  transition: background 0.3s ease, transform 0.2s ease;
}

.module:hover {
  background: rgba(60,70,90,0.85);
  transform: translateY(-3px);
}

.toggle-btn {
  float: right;
  background: lime;
  color: black;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s;
}

.toggle-btn:hover {
  background: #00ffaa;
}

.option-line {
  margin: 6px 0;
  font-size: 14px;
  position: relative;
}

input[type="range"] {
  width: calc(100% - 40px);
  vertical-align: middle;
}

input[type="text"] {
  width: 100%;
  font-size: 13px;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid lime;
  background: #111;
  color: lime;
}

.live-label {
  position: absolute;
  right: 0;
  top: 2px;
  font-size: 12px;
  color: lime;
}

#guiControls {
  margin-top: 24px;
  text-align: center;
}

button.control {
  background: black;
  color: lime;
  border: 1px solid lime;
  padding: 6px 10px;
  margin: 4px;
  cursor: pointer;
  font-family: monospace;
  border-radius: 6px;
  transition: all 0.3s;
}

button.control:hover {
  background: lime;
  color: black;
}
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
