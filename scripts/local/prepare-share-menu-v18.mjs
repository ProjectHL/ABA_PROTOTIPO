import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,constants} from 'node:fs';
import {createHash} from 'node:crypto';
assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO');
const file='src/features/students/ShareButton.tsx',before=readFileSync(file,'utf8');
assert.equal(before.split('return <>').length,2);assert.equal(before.split('}}/></>;').length,2);
copyFileSync(file,'.aba.local/qa/ShareButton.before-v18.tsx',constants.COPYFILE_EXCL);
const after=before.replace('return <>','return <div style={{display:\'contents\'}} onClick={event=>event.stopPropagation()}>').replace('}}/></>;','}}/></div>;');
writeFileSync(file,after);
writeFileSync('.aba.local/qa/share-menu-v18-source-change.json',JSON.stringify({file,before:createHash('sha256').update(before).digest('hex'),after:createHash('sha256').update(after).digest('hex'),reason:'Keep share trigger and modal portal clicks from reaching parent student card navigation'},null,2)+'\n',{flag:'wx'});
for(const prefix of ['build','start']){const old='scripts/local/docker-tools/'+prefix+'-clinical-header-v17.mjs';let source=readFileSync(old,'utf8');source=source.replaceAll('v17','v18').replaceAll('V17','V18').replaceAll('v16','v17').replaceAll('V16','V17');writeFileSync('scripts/local/docker-tools/'+prefix+'-clinical-header-v18.mjs',source,{flag:'wx'});}
console.log(JSON.stringify({sourceUpdated:file,newCandidate:'V18',priorEvidencePreserved:true}));
