const { extractVisionFeatures, scoreProductAgainstFeatures, aggregateMatch } = await import("./lib/products/multimodalMatch.ts");

const fspContent = `EMBROIDERED & PRINTED LAWN 2 PCS (UNSTITCHED) SKU: FSP1266-YELLOW-2000000221311 Regular price Rs.6,999.00 In Stock PRODUCT DETAIL:FABRIC: LAWN COLOR: YELLOW DESCRIPTION: Embroidered & Printed Lawn Wider Width Shirt 1.75 Mtr. Printed Chiffon Dupatta 2.5 Mtr.`;
const fspTitle = "EMBROIDERED & PRINTED LAWN 2 PCS (UNSTITCHED)";

// A few decoy products from the catalog (approximate).
const decoys = [
  { title: "Premium Embroidered Chiffon Formal Dress", content: "FABRIC: CHIFFON COLOR: BLACK DESCRIPTION: Embroidered formal dress with sequin work", sku: "TFS-2001" },
  { title: "Casual Cotton Lawn Kurti", content: "FABRIC: LAWN COLOR: GREEN DESCRIPTION: Solid casual kurti", sku: "TFS-3002" },
  { title: "Embroidered Lawn 2 Pcs (Unstitched)", content: "EMBROIDERED & PRINTED LAWN WIDER WIDTH SHIRT FABRIC LAWN", sku: "FSP9999" },
  { title: "Wool Winter Jacket", content: "FABRIC: WOOL COLOR: GREY DESCRIPTION: Heavy winter jacket", sku: "TFS-5005" },
];

function classify(desc) {
  const features = extractVisionFeatures(desc);
  const scored = [fspContent].concat(decoys.map(d=>d.content)).map((_, i) => {
    const p = i === 0 ? { title: fspTitle, content: fspContent } : decoys[i-1];
    const s = scoreProductAgainstFeatures(features, p);
    const d = aggregateMatch(s, p);
    return { name: p.title.slice(0,35), visual: +s.visualSimilarity.toFixed(3), weighted: +d.confidence.toFixed(3), type: d.matchType };
  }).sort((a,b)=>b.weighted-a.weighted);
  return scored;
}

console.log("=== REAL FSP1266 PHOTO (yellow lawn set) ===");
console.table(classify(`Women's three-piece ethnic set: long straight kurta with matching wide pants and dupatta. Color: pastel lemon yellow with small white/pale-pink floral print. White scalloped lace trim at round neckline, sleeve cuffs and hem; lace border on trouser hem; lightweight cotton/lawn fabric. Dupatta: light blue/white striped panel with lace edging. No visible brand or SKU.`));

console.log("=== UNRELATED CAR PHOTO (must be NO_MATCH) ===");
console.table(classify(`A silver sedan car parked on a street. Four doors, alloy wheels, chrome grille, tinted windows. Outdoor daylight scene. No product text or logo visible.`));

console.log("=== DIFFERENT MODEL / BACKGROUND same product ===");
console.table(classify(`A woman modeling a three-piece lawn suit in a garden with green grass background. She wears a long straight kurti in lemon yellow with small white floral print, matching straight trousers, and a light blue striped dupatta with lace edging. Embroidered and printed lawn fabric. Neckline and cuff trimmed in lace.`));

console.log("=== SIMILAR but NOT identical (different color) ===");
console.table(classify(`Women's three-piece ethnic suit: long straight kurta with matching pants and dupatta. Color: solid emerald green with subtle embroidery at the neckline. Plain green dupatta. Cotton lawn fabric.`));
