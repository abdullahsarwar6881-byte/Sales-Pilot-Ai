const fs=require('fs');
let s=fs.readFileSync('app/api/chat/route.ts','utf8').replace(/^\uFEFF/,'');
const lines=s.split(/\r?\n/);
// find index of the image match result block
let idx=-1;
for(let i=0;i<lines.length;i++){
  if(lines[i].includes('const imageMatchResult =') && lines[i+1] && lines[i+1].includes('await determineImageMatchType')){
    idx=i; break;
  }
}
console.log('idx found:', idx, 'line', idx+1);
if(idx<0){console.error('not found');process.exit(1);}
// idx line = '        const imageMatchResult ='
// idx+4 = '          );'
// next non-empty after that is const matchType
const insertAt=idx+5;
const block=[
`        // For a product-intent image that produced no decisive match from the`,
`        // text-search subset (e.g. a real product photo with no readable SKU),`,
`        // retry the multimodal matcher against the FULL catalog so visual`,
`        // feature similarity can identify the product. This only runs when an`,
`        // image is present and the initial search found no products, so it`,
`        // never perturbs text-only flows.`,
`        if (`,
`          imageMatchResult.matchType === "no_match" &&`,
`          actionProductData.length === 0`,
`        ) {`,
`          try {`,
`            const fullCatalog = await safeProductSearch(profileId, "products");`,
`            if (fullCatalog.length > 0) {`,
`              imageMatchResult =`,
`                await determineImageMatchType(`,
`                  imageDescription,`,
`                  fullCatalog`,
`                );`,
`            }`,
`          } catch (catalogError) {`,
`            console.error("IMAGE FULL-CATALOG MATCH ERROR:", catalogError);`,
`          }`,
`        }`,
``
];
lines.splice(insertAt,0,...block);
fs.writeFileSync('app/api/chat/route.ts',lines.join('\r\n'));
console.log('inserted full-catalog retry at line', insertAt+1);
