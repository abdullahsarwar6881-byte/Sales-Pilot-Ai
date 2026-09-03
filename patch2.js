const fs=require('fs');
let s=fs.readFileSync('lib/products/multimodalMatch.ts','utf8').replace(/^\uFEFF/,'');
const old = `  // -- Catalog image features (if the product already has an indexed image) --
  const catalogFeatures = extractVisionFeatures(
    product?.image_metadata?.description ||
      product?.imageDescription ||
      product?.image_visual_features ||
      ""
  );`;
const neu = `  // -- Catalog features (image index if present, else rich content) --
  const catalogFeatures = extractVisionFeatures(
    product?.image_metadata?.description ||
      product?.imageDescription ||
      product?.image_visual_features ||
      product?.content ||
      product?.description ||
      product?.body_html ||
      ""
  );`;
if(s.includes(old)){s=s.replace(old,neu);}else{console.log('WARN catalogFeatures block not found');}
// Also fallback attr set: use content tokens
const old2 = `  const attrSim = setSimilarity(
    customerFeatures.attributes,
    catalogFeatures.attributes.length > 0
      ? catalogFeatures.attributes
      : tokenize(productText)
  );`;
const neu2 = `  const attrSim = setSimilarity(
    customerFeatures.attributes,
    catalogFeatures.attributes.length > 0
      ? catalogFeatures.attributes
      : tokenize(productText)
  );`;
fs.writeFileSync('lib/products/multimodalMatch.ts',s);
console.log('patched catalogFeatures');
