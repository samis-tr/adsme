/// <reference types="jest" />
import { buildUniforms, FILTER_ORDER, FILTER_PARAMS, hexToRgb01 } from '../filterParams';

describe('hexToRgb01', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb01('#FF8000')).toEqual([1, 128 / 255, 0]);
  });
  it('parses 3-digit hex', () => {
    expect(hexToRgb01('#fff')).toEqual([1, 1, 1]);
  });
});

describe('buildUniforms', () => {
  it('matches the SkSL uniform layout (11 floats, brand colour last)', () => {
    const u = buildUniforms('brand', '#000000');
    expect(u).toHaveLength(11);
    expect(u.slice(8)).toEqual([0, 0, 0]);
    expect(u[5]).toBe(FILTER_PARAMS.brand.tintAmount);
  });
  it('natural filter is an identity grade', () => {
    const [warmth, contrast, saturation, fade, vignette, tint] = buildUniforms('natural', '#8B5CF6');
    expect([warmth, contrast, saturation, fade, vignette, tint]).toEqual([0, 1, 1, 0, 0, 0]);
  });
  it('every filter in the strip has params', () => {
    for (const f of FILTER_ORDER) expect(FILTER_PARAMS[f]).toBeDefined();
  });
});
