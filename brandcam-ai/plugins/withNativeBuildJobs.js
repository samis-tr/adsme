// Expo config plugin: cap parallel C++ compile jobs in every Android CMake build.
//
// Why: on the free EAS "medium" worker (4 vCPU / 16 GB, no swap allowed) Ninja
// starts ~6 clang processes per native module. Skia, VisionCamera/Nitro,
// Reanimated and skia-video sources each need 1-2 GB in debug builds, so RAM
// runs out and the kernel kills the Gradle JVM ("daemon disappeared").
// CMake job pools (Ninja generator) limit concurrency without touching any
// library source. Combined with Gradle --max-workers=1 this bounds the total.
const { withProjectBuildGradle } = require('expo/config-plugins');

const MARK = '// @brandcam/native-build-jobs';

module.exports = function withNativeBuildJobs(config, props = {}) {
  const jobs = Number(props.jobs) > 0 ? Number(props.jobs) : 2;
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withNativeBuildJobs: expected a Groovy android/build.gradle');
    }
    if (!cfg.modResults.contents.includes(MARK)) {
      cfg.modResults.contents += `
${MARK}
subprojects { p ->
  ['com.android.library', 'com.android.application'].each { pluginId ->
    p.plugins.withId(pluginId) {
      p.android.defaultConfig.externalNativeBuild.cmake.arguments(
        "-DCMAKE_JOB_POOLS=compile=${jobs};link=1",
        "-DCMAKE_JOB_POOL_COMPILE=compile",
        "-DCMAKE_JOB_POOL_LINK=link"
      )
    }
  }
}
`;
    }
    return cfg;
  });
};
