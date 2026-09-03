const fs=require('fs');
const f='lib/products/multimodalMatch.ts';
let s=fs.readFileSync(f,'utf8');
const NL='\r\n';
const orig=s;
const rep=(from,to)=>{ if(!s.includes(from)){console.error('NOT FOUND:\n---\n'+from+'\n---');process.exit(1);} s=s.split(from).join(to); };

// 1. Add countSharedAttributeGroups helper right after attributeGroupSimilarity
rep(
  "  if (totalWeight === 0) return 0;"+NL+"  return weightedHits / totalWeight;"+NL+"}",
  "  if (totalWeight === 0) return 0;"+NL+"  return weightedHits / totalWeight;"+NL+"}"+NL+""+NL+"// Count how many independent attribute groups are genuinely shared by BOTH sides."+NL+"// A real product photo shares several garment dimensions (fabric + decoration + silhouette +"+NL+"// sleeves/neckline ...). An unrelated image (e.g. a car) may coincidentally share only a"+NL+"// single generic token (such as the word \"printed\" in its description), so requiring"+NL+"// overlap in at least 2 groups is a robust, catalog-agnostic honesty gate."+NL+"function countSharedAttributeGroups(aAttrs: string[], bAttrs: string[]): number {"+NL+"  if (aAttrs.length === 0 || bAttrs.length === 0) return 0;"+NL+"  const ag = new Set(aAttrs.map((x) => x.toLowerCase()));"+NL+"  const bg = new Set(bAttrs.map((x) => x.toLowerCase()));"+NL+"  let shared = 0;"+NL+"  for (const g of ATTRIBUTE_GROUPS) {"+NL+"    const aHas = g.members.some((m) => ag.has(m));"+NL+"    const bHas = g.members.some((m) => bg.has(m));"+NL+"    if (aHas && bHas) shared++;"+NL+"  }"+NL+"  return shared;"+NL+"}"
);

// 2. Add sharedAttributeGroupCount to MatchSignals
rep(
  "  /** 0..1 genuine shared garment/category attributes; 0 means NO real attribute overlap. */"+NL+"  attributeGroupSimilarity: number;"+NL+"}",
  "  /** 0..1 genuine shared garment/category attributes; 0 means NO real attribute overlap. */"+NL+"  attributeGroupSimilarity: number;"+NL+"  /** number of attribute groups shared by both sides (>=2 required to claim a match). */"+NL+"  sharedAttributeGroupCount: number;"+NL+"}"
);

// 3. In scoreProductAgainstFeatures, compute and return sharedAttributeGroupCount
rep(
  "  const attrSim = attributeGroupSimilarity("+NL+"    customerFeatures.attributes,"+NL+"    catalogFeatures.attributes"+NL+"  );",
  "  const attrSim = attributeGroupSimilarity("+NL+"    customerFeatures.attributes,"+NL+"    catalogFeatures.attributes"+NL+"  );"+NL+"  const sharedAttrGroups = countSharedAttributeGroups("+NL+"    customerFeatures.attributes,"+NL+"    catalogFeatures.attributes"+NL+"  );"
);
rep(
  "    metadataSimilarity,"+NL+"    attributeGroupSimilarity: attrSim,"+NL+"  };",
  "    metadataSimilarity,"+NL+"    attributeGroupSimilarity: attrSim,"+NL+"    sharedAttributeGroupCount: sharedAttrGroups,"+NL+"  };"
);

// 4. Update the gate in aggregateMatch
rep(
  "  const hasGenuineSharedAttribute = signals.attributeGroupSimilarity > 0;",
  "  const hasGenuineSharedAttribute = signals.sharedAttributeGroupCount >= 2;"
);

// 5. Update the two no_match signal literals
rep(
  "        metadataSimilarity: 0,"+NL+"        attributeGroupSimilarity: 0,"+NL+"      },",
  "        metadataSimilarity: 0,"+NL+"        attributeGroupSimilarity: 0,"+NL+"        sharedAttributeGroupCount: 0,"+NL+"      },"
);
rep(
  "      signals: { skuMatch: false, textMatch: 0, visualSimilarity: 0, metadataSimilarity: 0, attributeGroupSimilarity: 0 },",
  "      signals: { skuMatch: false, textMatch: 0, visualSimilarity: 0, metadataSimilarity: 0, attributeGroupSimilarity: 0, sharedAttributeGroupCount: 0 },"
);

fs.writeFileSync(f,s);
console.log('OK. sharedAttributeGroupCount occurrences:', (s.match(/sharedAttributeGroupCount/g)||[]).length);
console.log('countSharedAttributeGroups occurrences:', (s.match(/countSharedAttributeGroups/g)||[]).length);
