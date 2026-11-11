import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function linkedFiles(file){
 return [...read(file).matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)].map(m=>m[1]).filter(x=>!/^https?:/.test(x)).map(x=>path.normalize(path.join(path.dirname(file),x)));
}
test('初始契约和 Task Zero 都能到达同一 Agent 架构设计方法，方法可达参考与现有资产',()=>{
 const guide='prompts/agent-architecture-initialization.md';
 for(const entry of ['workflows/v3-2-contract.md','prompts/project-bootstrap.md']) assert.ok(linkedFiles(entry).includes(guide),entry);
 const refs=linkedFiles(guide);
 for(const expected of ['decisions/agent-kernel-references.md','decisions/assets/ASSET_INDEX.md','templates/SYSTEM_ARCHITECTURE_TEMPLATE.md'])assert.ok(refs.includes(expected),expected);
 for(const f of refs)assert.ok(fs.existsSync(path.join(root,f)),f);
});
test('结构模板承接采用决定、目录 owner 与初始化证据，而非只检查 import',()=>{
 const source=read('templates/SYSTEM_ARCHITECTURE_TEMPLATE.md');
 for(const heading of ['内核与复用决定','目录与依赖所有者','初始化验证'])assert.ok(source.includes(heading),heading);
});
test('普通 S BUILD 仍只加载原来的 core+build，不因新增方法常驻架构材料',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-arch-routing-'));
 try{
  fs.mkdirSync(path.join(dir,'orchestrator/process'),{recursive:true});
  fs.writeFileSync(path.join(dir,'orchestrator/ARTIFACT_MANIFEST.yaml'),'current_stage: "4-build"\nscale_class: "S"\n');
  fs.writeFileSync(path.join(dir,'orchestrator/process/reconcile.config.json'),JSON.stringify({context_policy:{mode:'adaptive',project_packs:[]}}));
  const run=spawnSync(process.execPath,[path.join(root,'process/context-plan.mjs'),'--root',dir,'--json'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);const result=JSON.parse(run.stdout);
  assert.deepEqual(result.packs.map(p=>p.id),['core','build']);
  assert.equal(result.required_reads.length,5);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
