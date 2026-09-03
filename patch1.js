const fs=require('fs');
let s=fs.readFileSync('lib/products/multimodalMatch.ts','utf8').replace(/^\uFEFF/,'');
const oldHeader = `  // -- Text / description similarity --
  const productText = String(
    product?.title || product?.name || product?.displayName || product?.product_title || ""
  );
  const textMatch = textSimilarity(customerFeatures.description, productText);`;

const newHeader = `  // -- Text / description similarity (title + rich content) --
  // Catalog products (e.g. crawled knowledge_pages) carry the readable
  // material in content: "FABRIC: LAWN COLOR: YELLOW Embroidered & Printed Lawn".
  // Scoring against content lets a real photo vision description match without
  // a visible SKU, without inventing identity.
  const productTitle = String(
    product?.title || product?.name || product?.displayName || product?.product_title || ""
  );
  const productContent = String(
    product?.content ||
      product?.description ||
      product?.body_html ||
      product?.text ||
      product?.page_content ||
      ""
  );
  const productText =
    [productTitle, productContent].filter(Boolean).join(" ") ||
    productTitle;
  const textMatch = textSimilarity(customerFeatures.description, productText);`;

if(s.includes(oldHeader)){
  s=s.replace(oldHeader,newHeader);
}else{
  console.log('WARN: oldHeader not found');
}
fs.writeFileSync('lib/products/multimodalMatch.ts',s);
console.log('patched matcher text scoring');
