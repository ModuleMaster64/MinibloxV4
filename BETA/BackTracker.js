const Backtrack = new Module("Backtrack", function(callback) {
    let lastSafePos = { x: 0, y: 0, z: 0 };

    if (callback) {
        tickLoop["Backtrack"] = function() {
            const player = unsafeWindow?.game?.world?.localPlayer;
            if (!player || !player.position || !player.velocity) return;

            // Save safe position if above void and stable
            if (player.position.y > 0 && player.velocity.y >= -0.1) {
                lastSafePos = {
                    x: player.position.x,
                    y: player.position.y,
                    z: player.position.z
                };
            }

            // Void fall check
            if (player.position.y < -5) {
                player.position.x = lastSafePos.x;
                player.position.y = lastSafePos.y;
                player.position.z = lastSafePos.z;
            }
        };
    } else {
        delete tickLoop["Backtrack"];
    }
});
