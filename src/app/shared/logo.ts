/* Logo de PlumaViva (SVG generado, sin archivos externos). */
export const svgUri = (s: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
const logoSvg = (c: any) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 60" width="250" height="60">
<rect x="2" y="2" width="56" height="56" rx="16" fill="${c.bg}"/>
<path d="M16 45C12 28 23 14 45 11C47 30 37 44 19 46Z" fill="${c.pluma}"/>
<path d="M16 46L40 20" stroke="${c.bg}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
<path d="M26 37l6-1M31 31l6-1M22 41l4-.8" stroke="${c.bg}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
<circle cx="47" cy="15" r="5" fill="${c.punto}"/>
<text x="70" y="36" font-family="'Nunito Sans','Segoe UI',Arial,sans-serif" font-size="29" font-weight="800" fill="${c.t1}">Pluma<tspan fill="${c.t2}">Viva</tspan></text>
<text x="71.5" y="52" font-family="'Nunito Sans','Segoe UI',Arial,sans-serif" font-size="10.5" font-weight="700" letter-spacing="2.4" fill="${c.sub}">BIENESTAR AVIAR</text></svg>`;
export const LOGO = svgUri(logoSvg({ bg: "#317330", pluma: "#FFFFFF", punto: "#86B327", t1: "#317330", t2: "#86B327", sub: "#737476" }));
export const LOGO_W = svgUri(logoSvg({ bg: "#FFFFFF", pluma: "#317330", punto: "#C6C309", t1: "#FFFFFF", t2: "#C6C309", sub: "#E7F1DE" }));

/* ---------- 2 · importancia y obligatoriedad (parametrizable) ---------- */
