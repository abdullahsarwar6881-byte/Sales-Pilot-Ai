import { extractVisionFeatures, scoreProductAgainstFeatures, attributeGroupSimilarity, aggregateMatch } from './lib/products/multimodalMatch.ts';

const carA = `Flat vector illustration of a red car on a road with grass and blue sky. Square image (512x512) featuring: simple cartoon-style red car body with rounded corners, small rounded red roof with vertical window divider, two black wheels with gray hubs, dark gray road stripe, green grass bands, light blue sky. Black serif text "A CAR" printed above the vehicle. No visible brand or model. Suitable keywords: children's wall art, nursery print, cartoon car illustration, printable poster, vector graphic.`;

const carB = `Flat vector illustration / clipart of a red car on a road. Features: simple rounded-rectangle red car body with small rounded red roof/window section, two black wheels with gray centers, light blue sky background, green grass strips above and below a dark gray road. Black uppercase text "A CAR" printed centered above the vehicle. No visible brand or model. Plain digital graphic / children's style illustration.`;

for (const [name, desc] of [['carA', carA], ['carB', carB]]) {
  const cf = extractVisionFeatures(desc);
  console.log(`\n== ${name} features ==`);
  console.log('attrs:', JSON.stringify(cf.attributes));
  console.log('colors:', JSON.stringify(cf.colors));
  console.log('category:', cf.category);
  console.log('sku:', cf.sku);

  // representative catalog products (lawn etc)
  const products = [
    { title: 'EMBROIDERED & PRINTED LAWN 2 PCS (UNSTITCHED) - TFS', content: 'FABRIC: LAWN DESCRIPTION: Embroidered & Printed Lawn Shirt. Embroidered Chiffon Dupatta. Plain Cambric Trouser. FSP1266-YELLOW', sku: 'FSP1266-YELLOW' },
    { title: 'PRINTED LAWN 3 PCS (UNSTITCHED) - TFS', content: 'FABRIC: LAWN COLOR: BEIGE DESCRIPTION: Printed Lawn Wider Width Shirt 1.75 Mtr. Printed Lawn Dupatta 2.5 Mtr. Plain Cambric Wider Width Trouser 1.75 Mtr.', sku: 'FSP1413-BEIGE' },
    { title: 'PRET EMBROIDERED & EMBELISHED LAWN 3 PCS - TFS', content: 'FABRIC: LAWN COLOR: LILAC DESCRIPTION: Embroidered & Sheesha Work Lawn Shirt. Embroidered Chiffon Dupatta. Plain Cambric Trouser.', sku: 'FSP1331' },
  ];
  for (const p of products) {
    const sig = scoreProductAgainstFeatures(cf, p);
    const dec = aggregateMatch(sig, p);
    console.log(` product(${p.sku}): sharedGroups=${sig.sharedAttributeGroupCount} matchType=${dec.matchType} conf=${dec.confidence.toFixed(3)} visual=${sig.visualSimilarity.toFixed(3)}`);
  }
}
