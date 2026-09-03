const fs=require('fs');
const f='lib/products/multimodalMatch.ts';
let s=fs.readFileSync(f,'utf8');
const orig=s;

// 1. Add attributeGroupSimilarity to MatchSignals interface
s=s.replace(
  "  metadataSimilarity: number; // 0..1 brand/category/price/color context\n}",
  "  metadataSimilarity: number; // 0..1 brand/category/price/color context\n  /** 0..1 genuine shared garment/category attributes; 0 means NO real attribute overlap. */\n  attributeGroupSimilarity: number;\n}"
);

// 2. Return attrSim in scoreProductAgainstFeatures signals
s=s.replace(
  "  return {\n    skuMatch,\n    textMatch,\n    visualSimilarity,\n    metadataSimilarity,\n  };\n}",
  "  return {\n    skuMatch,\n    textMatch,\n    visualSimilarity,\n    metadataSimilarity,\n    attributeGroupSimilarity: attrSim,\n  };\n}"
);

// 3. Gate non-SKU matches on genuine attribute-group overlap in aggregateMatch
s=s.replace(
  "  if (weighted >= MATCH_THRESHOLDS.similar) {\n    return {\n      matchType: \"similar\",",
  "  if (hasGenuineSharedAttribute && weighted >= MATCH_THRESHOLDS.similar) {\n    return {\n      matchType: \"similar\","
);

// 4. Add the field to the two no_match signal literals in matchCustomerImageToProducts
s=s.replace(
  "      signals: {\n        skuMatch: false,\n        textMatch: 0,\n        visualSimilarity: 0,\n        metadataSimilarity: 0,\n      },\n      source: \"none\",",
  "      signals: {\n        skuMatch: false,\n        textMatch: 0,\n        visualSimilarity: 0,\n        metadataSimilarity: 0,\n        attributeGroupSimilarity: 0,\n      },\n      source: \"none\","
);
s=s.replace(
  "      signals: { skuMatch: false, textMatch: 0, visualSimilarity: 0, metadataSimilarity: 0 },\n      source: \"none\",\n    };\n  }\n\n  return {",
  "      signals: { skuMatch: false, textMatch: 0, visualSimilarity: 0, metadataSimilarity: 0, attributeGroupSimilarity: 0 },\n      source: \"none\",\n    };\n  }\n\n  return {"
);

// 3b. Add the hasGenuineSharedAttribute const before high_confidence check
s=s.replace(
  "  const weighted =\n    signals.visualSimilarity * 0.55 +\n    signals.textMatch * 0.2 +\n    signals.metadataSimilarity * 0.25;\n\n  if (weighted >= MATCH_THRESHOLDS.highConfidence) {",
  "  const weighted =\n    signals.visualSimilarity * 0.55 +\n    signals.textMatch * 0.2 +\n    signals.metadataSimilarity * 0.25;\n\n  // HONESTY GATE: Without a verified SKU, we only claim a product match when\n  // the customer image genuinely shares at least one real garment/category\n  // attribute (fabric, decoration, silhouette, sleeves, neckline, ...) with the\n  // catalog product. Color + neutral-category noise alone must never push an\n  // unrelated image (e.g. a car) into similar/high_confidence.\n  const hasGenuineSharedAttribute = signals.attributeGroupSimilarity > 0;\n\n  if (hasGenuineSharedAttribute && weighted >= MATCH_THRESHOLDS.highConfidence) {"
);

if(s===orig){console.error('NO CHANGES APPLIED');process.exit(1);}
fs.writeFileSync(f,s);
console.log('Edited multimodalMatch.ts. attributeGroupSimilarity occurrences:', (s.match(/attributeGroupSimilarity/g)||[]).length);
console.log('hasGenuineSharedAttribute occurrences:', (s.match(/hasGenuineSharedAttribute/g)||[]).length);
