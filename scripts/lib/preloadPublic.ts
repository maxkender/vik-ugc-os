// Plugin Vite (18/11, performance de /join) : précharge dès le HTML ce que la page publique attend sinon après
// l'exécution du bundle principal : le code de la page (Landing / Apply + dépendances), le fichier de langue du
// visiteur et les polices latines d'Inter. Un petit script inline choisit selon l'URL et la langue détectée.
import type { Plugin } from "vite";
import type { OutputBundle, OutputChunk } from "rollup";

const PAGES: Record<string, RegExp> = { join: /pages\/public\/Landing\.tsx$/, apply: /pages\/public\/Apply\.tsx$/ };
const LANG_FILE = /i18n\/(?:locales\/(?:space\/|job\/)?)?([a-z]{2,3})\.(?:ts|json)$/;

export function preloadPublic(): Plugin {
  return {
    name: "preload-public",
    apply: "build",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const bundle = ctx.bundle as OutputBundle | undefined;
        if (!bundle) return html;
        const chunks = Object.values(bundle).filter((c): c is OutputChunk => c.type === "chunk");
        const byFile = new Map(chunks.map((c) => [c.fileName, c]));
        const entry = chunks.find((c) => c.isEntry);
        const inEntry = new Set<string>([entry?.fileName ?? "", ...(entry?.imports ?? [])]);
        const deps = (c: OutputChunk, seen = new Set<string>()): string[] => {
          if (seen.has(c.fileName) || inEntry.has(c.fileName)) return [];
          seen.add(c.fileName);
          return [c.fileName, ...c.imports.flatMap((f) => (byFile.get(f) ? deps(byFile.get(f)!, seen) : []))];
        };
        const map: { pages: Record<string, string[]>; lang: Record<string, string[]> } = { pages: {}, lang: {} };
        for (const [k, re] of Object.entries(PAGES)) {
          const c = chunks.find((x) => x.facadeModuleId && re.test(x.facadeModuleId));
          if (c) map.pages[k] = deps(c).map((f) => "/" + f);
        }
        for (const c of chunks) {
          const m = c.facadeModuleId?.match(LANG_FILE);
          if (m && !/(index|types|labels)$/.test(m[1])) (map.lang[m[1]] ??= []).push("/" + c.fileName);
        }
        const fonts = Object.keys(bundle).filter((f) => /inter-latin-(400|600)-normal-.*\.woff2$/.test(f));
        const fontLinks = fonts.map((f) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="/${f}" />`).join("\n    ");
        const script = `<script>(function(){try{var m=${JSON.stringify(map)},p=location.pathname,l="en";` +
          `try{l=new URLSearchParams(location.search).get("lang")||localStorage.getItem("i18nextLng")||navigator.language||"en"}catch(e){}` +
          `l=String(l).split("-")[0].toLowerCase();var u=(p.indexOf("/join")===0?m.pages.join:p.indexOf("/apply")===0&&p.indexOf("/apply/video")!==0?m.pages.apply:null);` +
          `if(!u)return;u=u.concat(m.lang[l]||[]);for(var i=0;i<u.length;i++){var e=document.createElement("link");e.rel="modulepreload";e.href=u[i];document.head.appendChild(e)}}catch(e){}})()</script>`;
        return html.replace("</head>", `    ${fontLinks}\n    ${script}\n  </head>`);
      },
    },
  };
}
