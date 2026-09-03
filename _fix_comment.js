const fs=require('fs');
const f='lib/products/multimodalMatch.ts';
let s=fs.readFileSync(f,'utf8');
const NL='\r\n';
const from="  // HONESTY GATE: Without a verified SKU, we only claim a product match when"+NL+"  // the customer image genuinely shares at least one real garment/category"+NL+"  // attribute (fabric, decoration, silhouette, sleeves, neckline, ...) with the"+NL+"  // catalog product. Color + neutral-category noise alone must never push an"+NL+"  // unrelated image (e.g. a car) into similar/high_confidence.";
const to="  // HONESTY GATE: Without a verified SKU, we only claim a product match when"+NL+"  // the customer image genuinely shares at least TWO independent attribute groups"+NL+"  // (fabric, decoration, silhouette, sleeves, neckline, ...) with the catalog product."+NL+"  // A real product photo does this naturally; an unrelated image (e.g. a car) only"+NL+"  // coincidentally overlaps a single generic token. Color + neutral-category noise"+NL+"  // alone must never push it into similar/high_confidence.";
if(!s.includes(from)){console.error('NOT FOUND');process.exit(1);}
s=s.split(from).join(to);
fs.writeFileSync(f,s);
console.log('comment updated');
