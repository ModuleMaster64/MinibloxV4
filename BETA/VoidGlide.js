let voidglide;

const glideSafeHeight = 62; // Adjust this for your map's danger zone

const VoidGlide = new Module("VoidGlide", function(callback) {
    if (callback) {
        tickLoop["VoidGlide"] = function() {
            const pos = new BlockPos(
                Math.floor(player.pos.x),
                Math.floor(player.pos.y) - 1,
                Math.floor(player.pos.z)
            );

            const stateBelow = game.world.getBlockState(pos);
            const isVoid = stateBelow.getBlock().material === Materials.air;

            if (isVoid && player.motion.y < 0 && player.pos.y < glideSafeHeight) {
                // 🕊️ Apply glide mechanics
                player.motion.y *= 0.6;
                player.motion.x *= 1.05;
                player.motion.z *= 1.05;

                // ✨ Optional eye candy
                hud3D.addParticle("cloud", player.pos.x, player.pos.y - 0.2, player.pos.z);
                game.sound.play("entity.elder_guardian.ambient", player.pos, 0.2, 1.5);
            }
        };
    } else {
        delete tickLoop["VoidGlide"];
    }
});

voidglide = VoidGlide.addoption("GlideZone", Number, glideSafeHeight);