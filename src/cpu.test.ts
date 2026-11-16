import {test} from 'node:test';import assert from 'node:assert/strict';import {assemble,initial,tick,examples} from './cpu';
function run(source:string){let s=initial(assemble(source));for(let i=0;i<3000&&!s.halted;i++)s=tick(s);assert.ok(s.halted,'program terminates');assert.equal(s.error,'');return s;}
test('addition and RAM store',()=>{const s=run(examples.Addition);assert.equal(s.a,42);assert.equal(s.ram[240],42);assert.deepEqual(s.output,[42]);assert.equal(s.cycles,18)});
test('countdown takes and exits conditional branch',()=>{assert.deepEqual(run(examples.Countdown).output,[5,4,3,2,1])});
test('unsigned overflow and carry branch',()=>{const s=run(examples.Overflow);assert.equal(s.a,4);assert.equal(s.c,true);assert.deepEqual(s.output,[4])});
test('borrow and negative flag',()=>{const s=run('LDA 0\nLDB 1\nSUB\nHLT');assert.equal(s.a,255);assert.equal(s.c,true);assert.equal(s.n,true)});
test('CMP preserves A; JZ and JMP follow labels',()=>{const s=run('LDA 7\nLDB 7\nCMP\nJZ equal\nLDA 99\nequal:\nOUT\nJMP done\nLDA 100\ndone:\nHLT');assert.equal(s.a,7);assert.deepEqual(s.output,[7]);assert.equal(s.z,true)});
test('logical ops and memory loading',()=>{assert.deepEqual(run(examples['Memory & logic']).output,[10,165]);assert.equal(run('LDA 128\nLDB 1\nOR\nHLT').a,129)});
test('increment wrap and decrement wrap',()=>{const s=run('LDA 255\nINC\nOUT\nDEC\nOUT\nHLT');assert.deepEqual(s.output,[0,255])});
test('fetch and decode have no premature ALU side effects',()=>{let s=initial(assemble('LDA 42\nHLT'));s=tick(s);assert.equal(s.a,0);assert.equal(s.pc,1);s=tick(s);assert.equal(s.a,0);assert.equal(s.operand,42);s=tick(s);assert.equal(s.a,42)});
test('invalid opcode halts with fault',()=>{let s=initial(assemble('HLT'));s.ram[0]=254;s=tick(tick(s));assert.ok(s.halted);assert.match(s.error,/Invalid opcode/)});
test('assembler rejects invalid input',()=>{for(const code of ['LDA 256','LDA -1','JMP missing','ADD 1','LDA','foo: NOP\nfoo: HLT','WHAT','NOP\n'.repeat(257)])assert.throws(()=>assemble(code))});
test('PC wraps after address FF',()=>{let s=initial(assemble('NOP'));s.pc=255;s=tick(s);assert.equal(s.pc,0)});
