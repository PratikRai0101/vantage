const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Expo's ViewDefinitionBuilder reflects on these signatures. GLView extends
// TextureView, not ExpoView, so the usual ExpoView keep rule doesn't cover it.
const rule = `
# Vantage: preserve Expo GL's reflectively instantiated native view.
-keep class expo.modules.gl.GLView {
    public <init>(android.content.Context, expo.modules.kotlin.AppContext);
}
# EXGLJniApi.cpp looks up this callback with GetMethodID("flush", "()V").
-keepclassmembers class expo.modules.gl.GLContext {
    public void flush();
}
`;
module.exports = config => withDangerousMod(config, ['android', async config => {
  const file = path.join(config.modRequest.platformProjectRoot, 'app/proguard-rules.pro');
  const source = await fs.readFile(file, 'utf8');
  const marker = '# Vantage: preserve Expo GL\'s reflectively instantiated native view.';
  const previous = source.indexOf(marker);
  const base = previous < 0 ? source : source.slice(0, previous);
  await fs.writeFile(file, base + rule);
  return config;
}]);
