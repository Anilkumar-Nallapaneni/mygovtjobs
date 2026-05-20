/**
 * Loads the India map SVG markup. The SVG lives in `public/india.svg` so it is
 * served as a static asset instead of being bundled into the JS payload.
 */
export const fetchSVGContent = async (): Promise<string> => {
  try {
    const res = await fetch("/india.svg");
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
};
