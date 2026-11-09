import { Skia } from '@shopify/react-native-skia';

/**
 * One GPU colour-grading shader drives every filter; presets are just uniform sets.
 * Uniform layout (must match the SkSL declaration order):
 *   0 warmth   -1..1   shift red/blue balance
 *   1 contrast  0.5..1.6
 *   2 saturation 0..1.6
 *   3 fade      0..0.3  lifts blacks (film look)
 *   4 vignette  0..1
 *   5 tintAmount 0..1  split-tone strength toward brand colour
 *   6 width, 7 height  (frame size in px, for the vignette)
 *   8-10 tint rgb (0..1)
 */
const SKSL = `
uniform shader image;
uniform float warmth;
uniform float contrast;
uniform float saturation;
uniform float fade;
uniform float vignette;
uniform float tintAmount;
uniform float2 size;
uniform float3 tint;

half4 main(float2 xy) {
  half4 c = image.eval(xy);
  float3 rgb = float3(c.rgb);

  rgb.r += warmth * 0.06;
  rgb.b -= warmth * 0.06;

  float luma = dot(rgb, float3(0.2126, 0.7152, 0.0722));
  rgb = mix(float3(luma), rgb, saturation);
  rgb = (rgb - 0.5) * contrast + 0.5;
  rgb = rgb * (1.0 - fade) + fade;

  // Split-tone: shadows lean toward the brand colour, highlights keep their own colour.
  float shadowMask = 1.0 - smoothstep(0.0, 0.7, luma);
  rgb = mix(rgb, rgb * 0.6 + tint * 0.5, tintAmount * shadowMask * 0.7);

  float2 uv = xy / size - 0.5;
  float v = 1.0 - vignette * smoothstep(0.25, 0.85, length(uv));
  rgb *= v;

  return half4(half3(clamp(rgb, 0.0, 1.0)), c.a);
}
`;

export const colorGradeEffect = Skia.RuntimeEffect.Make(SKSL);

export * from './filterParams';
