const fs=require('fs');
let s=fs.readFileSync('app/api/chat/route.ts','utf8').replace(/^\uFEFF/,'');
// Ensure consistent CRLF handling: split leaving the \r handled by regex on write
const lines=s.split(/\r\n/);
// line 4252 (index 4251) is '        const imageMatchResult ='
for(let i=0;i<lines.length;i++){
  if(lines[i].trim().startsWith('const imageMatchResult =') && lines[i+1] && lines[i+1].includes('await determineImageMatchType')){
    lines[i]=lines[i].replace('const imageMatchResult','let imageMatchResult');
    console.log('replaced at line',i+1);
    break;
  }
}
fs.writeFileSync('app/api/chat/route.ts', lines.join('\r\n'));
console.log('done');
