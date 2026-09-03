const fs=require('fs');
const f='lib/products/multimodalMatch.ts';
let s=fs.readFileSync(f,'utf8');
const NL='\r\n';
const orig=s;

const rep=(from,to)=>{ if(!s.includes(from)){console.error('NOT FOUND:\n---\n'+from+'\n---');process.exit(1);} s=s.split(from).join(to); };

rep(
  "  metadataSimilarity: number; // 0..1 brand/category/price/color context"+NL+"}",
  "  metadataSimilarity: number; // 0..1 brand/category/price/color context"+NL+"  /** 0..1 genuine shared garment/category attributes; 0 means NO real attribute overlap. */"+NL+"  attributeGroupSimilarity: number;"+NL+"}"
);

rep(
  "  return {"+NL+"    skuMatch,"+NL+"    textMatch,"+NL+"    visualSimilarity,"+NL+"    metadataSimilarity,"+NL+"  };"+NL+"}",
  "  return {"+NL+"    skuMatch,"+NL+"    textMatch,"+NL+"    visualSimilarity,"+NL+"    metadataSimilarity,"+NL+"    attributeGroupSimilarity: attrSim,"+NL+"  };"+NL+"}"
);

rep(
  "  if (weighted >= MATCH_THRESHOLDS.similar) {"+NL+"    return {"+NL+"      matchType: \"similar\",",
  "  if (hasGenuineSharedAttribute && weighted >= MATCH_THRESHOLDS.similar) {"+NL+"    return {"+NL+"      matchType: \"similar\","
);

rep(
  "        metadataSimilarity: 0,"+NL+"      },"+NL+"      source: \"none\",",
  "        metadataSimilarity: 0,"+NL+"        attributeGroupSimilarity: 0,"+NL+"      },"+NL+"      source: \"none\","
);

rep(
  "      signals: { skuMatch: false, textMatch: 0, visualSimilarity: 0, metadataSimilarity: 0 },"+NL+"      source: \"none\","+NL+"    };"+NL+"  }"+NL+""+NL+"  return {",
  "      signals: { skuMatch: false, textMatch: 0, visualSimilarity: 0, metadataSimilarity: 0, attributeGroupSimilarity: 0 },"+NL+"      source: \"none\","+NL+"    };"+NL+"  }"+NL+""+NL+"  return {"
);

rep(
  "  const weighted ="+NL+"    signals.visualSimilarity * 0.55 +"+NL+"    signals.textMatch * 0.2 +"+NL+"    signals.metadataSimilarity * 0.25;"+NL+""+NL+"  if (weighted >= MATCH_THRESHOLDS.highConfidence) {",
  "  const weighted ="+NL+"    signals.visualSimilarity * 0.55 +"+NL+"    signals.textMatch * 0.2 +"+NL+"    signals.metadataSimilarity * 0.25;"+NL+""+NL+"  // HONESTY GATE: Without a verified SKU, we only claim a product match when"+NL+"  // the customer image genuinely shares at least one real garment/category"+NL+"  // attribute (fabric, decoration, silhouette, sleeves, neckline, ...) with the"+NL+"  // catalog product. Color + neutral-category noise alone must never push an"+NL+"  // unrelated image (e.g. a car) into similar/high_confidence."+NL+"  const hasGenuineSharedAttribute = signals.attributeGroupSimilarity > 0;"+NL+""+NL+"  if (hasGenuineSharedAttribute && weighted >= MATCH_THRESHOLDS.highConfidence) {"
);

fs.writeFileSync(f,s);
console.log('OK. attrGroup occurrences:', (s.match(/attributeGroupSimilarity/g)||[]).length);
console.log('gate occurrences:', (s.match(/hasGenuineSharedAttribute/g)||[]).length);
