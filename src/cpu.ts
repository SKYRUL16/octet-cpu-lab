export const hex=(n:number)=>n.toString(16).toUpperCase().padStart(2,'0');
export const bin=(n:number)=>n.toString(2).padStart(8,'0');
export const ISA = [
 ['NOP',0x00,0,'No operation. Advance to the next instruction.'],
 ['LDA',0x10,1,'Load an immediate byte into accumulator A. Update Z and N.'],
 ['LDB',0x11,1,'Load an immediate byte into register B. Update Z and N.'],
 ['LDM',0x12,1,'Read RAM at the operand address into A. Update Z and N.'],
 ['STA',0x20,1,'Store A in RAM at the operand address. Flags are unchanged.'],
 ['ADD',0x30,0,'Add B to A. Keep the low 8 bits; C indicates unsigned overflow.'],
 ['SUB',0x31,0,'Subtract B from A. Keep the low 8 bits; C indicates a borrow.'],
 ['INC',0x32,0,'Increment A by one. C indicates overflow beyond 255.'],
 ['DEC',0x33,0,'Decrement A by one. C indicates a borrow below zero.'],
 ['CMP',0x34,0,'Compare A with B by subtracting without changing A. Update Z, C, N.'],
 ['AND',0x40,0,'Bitwise AND of A and B into A. Clear C; update Z and N.'],
 ['OR',0x41,0,'Bitwise OR of A and B into A. Clear C; update Z and N.'],
 ['XOR',0x42,0,'Bitwise XOR of A and B into A. Clear C; update Z and N.'],
 ['JMP',0x50,1,'Unconditionally set the program counter to the operand address.'],
 ['JZ',0x51,1,'Jump to the operand address if the zero flag is set.'],
 ['JNZ',0x52,1,'Jump to the operand address if the zero flag is clear.'],
 ['JC',0x53,1,'Jump to the operand address if the carry / borrow flag is set.'],
 ['OUT',0x60,0,'Append the unsigned value in A to the output buffer.'],
 ['HLT',0xFF,0,'Halt the processor. Reset to start again.']
] as const;
export type Program={ram:number[];lines:Record<number,number>;size:number};
export function assemble(source:string):Program {
 const labels:Record<string,number>={};const lines:Record<number,number>={};const entries:{op:string;arg?:string;line:number;pc:number}[]=[];let pc=0;
 source.split('\n').forEach((raw,i)=>{let s=raw.split(';')[0].trim().toUpperCase();if(!s)return;
 const label=s.match(/^([A-Z_]\w*):/);if(label){if(label[1] in labels)throw Error(`Line ${i+1}: duplicate label`);labels[label[1]]=pc;s=s.slice(label[0].length).trim();}if(!s)return;
 const [op,arg,...extra]=s.split(/[\s,]+/);const def=ISA.find(x=>x[0]===op);if(!def)throw Error(`Line ${i+1}: unknown instruction ${op}`);if(extra.length||Boolean(arg)!==Boolean(def[2]))throw Error(`Line ${i+1}: ${op} expects ${def[2]} operand(s)`);
 entries.push({op,arg,line:i+1,pc});lines[pc]=i+1;pc+=1+def[2];if(pc>256)throw Error('Program exceeds 256 bytes');});
 const ram=Array(256).fill(0);for(const e of entries){const def=ISA.find(x=>x[0]===e.op)!;ram[e.pc]=def[1];if(e.arg){const a=e.arg.replace(/^#/,'');const n=a in labels?labels[a]:/^0X[0-9A-F]+$|^0B[01]+$|^\d+$/.test(a)?Number(a):NaN;if(!Number.isInteger(n)||n<0||n>255)throw Error(`Line ${e.line}: invalid byte or label ${e.arg}`);ram[e.pc+1]=n;}}
 return {ram,lines,size:pc};
}
export type CPU={ram:number[];a:number;b:number;pc:number;ir:number;operand:number;z:boolean;c:boolean;n:boolean;phase:'fetch'|'decode'|'execute';cycles:number;instructions:number;halted:boolean;error:string;output:number[];address:number;bus:number;route:string;message:string;alu:string;trace:string[]};
export function initial(p:Program):CPU{return {ram:[...p.ram],a:0,b:0,pc:0,ir:0,operand:0,z:false,c:false,n:false,phase:'fetch',cycles:0,instructions:0,halted:false,error:'',output:[],address:0,bus:0,route:'Ready',message:'Program loaded. Step through the first fetch cycle.',alu:'A + B',trace:[]};}
export function tick(prev:CPU):CPU{
 if(prev.halted)return prev;const s={...prev,ram:[...prev.ram],output:[...prev.output],trace:[...prev.trace],cycles:prev.cycles+1};
 const transfer=(route:string,value:number,msg:string)=>{s.route=route;s.bus=value;s.message=msg;};
 if(s.phase==='fetch'){s.address=s.pc;s.ir=s.ram[s.pc];s.pc=(s.pc+1)&255;s.phase='decode';transfer('RAM → IR',s.ir,`Fetch opcode 0x${hex(s.ir)} from RAM[0x${hex(s.address)}]. PC advances to 0x${hex(s.pc)}.`);}
 else if(s.phase==='decode'){const def=ISA.find(x=>x[1]===s.ir);if(!def){s.error=`Invalid opcode 0x${hex(s.ir)} at 0x${hex(s.address)}`;s.halted=true;s.message=s.error;}else {s.operand=def[2]?s.ram[s.pc]:0;if(def[2])s.pc=(s.pc+1)&255;s.phase='execute';transfer(def[2]?'RAM → Decoder':'IR → Decoder',def[2]?s.operand:s.ir,`Decode ${def[0]}${def[2]?` 0x${hex(s.operand)}`:''}. ${def[3]}`);}}
 else {const def=ISA.find(x=>x[1]===s.ir)!;const op=def[0];let result:number|undefined;const flags=(v:number,carry?:boolean)=>{s.z=(v&255)===0;s.n=!!(v&128);if(carry!==undefined)s.c=carry;};transfer('Decoder → Control',s.ir,`Execute ${op}.`);
 switch(op){case 'LDA':s.a=s.operand;flags(s.a);transfer('Decoder → A',s.a,`A ← ${s.a} (0x${hex(s.a)}).`);break;
 case 'LDB':s.b=s.operand;flags(s.b);transfer('Decoder → B',s.b,`B ← ${s.b} (0x${hex(s.b)}).`);break;
 case 'LDM':s.a=s.ram[s.operand];flags(s.a);transfer('RAM → A',s.a,`Load RAM[0x${hex(s.operand)}] = ${s.a} into A.`);break;
 case 'STA':s.ram[s.operand]=s.a;transfer('A → RAM',s.a,`RAM[0x${hex(s.operand)}] ← ${s.a}.`);break;
 case 'ADD':result=s.a+s.b;s.alu=`${s.a} + ${s.b}`;break;case 'SUB':case 'CMP':result=s.a-s.b;s.alu=`${s.a} − ${s.b}`;break;
 case 'INC':result=s.a+1;s.alu=`${s.a} + 1`;break;case 'DEC':result=s.a-1;s.alu=`${s.a} − 1`;break;
 case 'AND':result=s.a&s.b;s.alu=`${s.a} AND ${s.b}`;break;case 'OR':result=s.a|s.b;s.alu=`${s.a} OR ${s.b}`;break;case 'XOR':result=s.a^s.b;s.alu=`${s.a} XOR ${s.b}`;break;
 case 'JMP':case 'JZ':case 'JNZ':case 'JC':{const take=op==='JMP'||(op==='JZ'&&s.z)||(op==='JNZ'&&!s.z)||(op==='JC'&&s.c);if(take)s.pc=s.operand;transfer('Decoder → PC',s.pc,`${op}: branch ${take?'taken':'not taken'}. PC = 0x${hex(s.pc)}.`);break;}
 case 'OUT':s.output.push(s.a);transfer('A → Output',s.a,`Output ${s.a}.`);break;case 'HLT':s.halted=true;s.message='Processor halted. Reset to run again.';break;
 }
 if(result!==undefined){flags(result,result>255||result<0);if(op!=='CMP')s.a=result&255;transfer('ALU → A',result&255,`${s.alu} = ${result}. ${op==='CMP'?'A unchanged.':`A ← ${result&255}.`} Z=${+s.z} C=${+s.c} N=${+s.n}`);}
 s.instructions++;s.phase='fetch';s.trace=[`${hex(s.address)}  ${op}${def[2]?' '+hex(s.operand):''}  ·  A=${hex(s.a)} B=${hex(s.b)}`,...s.trace].slice(0,100);
 }return s;
}
export const examples={
 'Addition':`; Add two numbers, store the result\n; Expected output: 42\n\nLDA #25       ; A ← 25\nLDB #17       ; B ← 17\nADD           ; A ← A + B\nSTA 0xF0      ; Save to RAM\nOUT           ; Output 42\nHLT           ; Stop execution`,
 'Countdown':`; Conditional branching\n; Expected output: 5, 4, 3, 2, 1\n\nLDA #5\nloop:\nOUT\nDEC\nJNZ loop\nHLT`,
 'Overflow':`; 250 + 10 wraps to 4, carry = 1\nLDA #250\nLDB #10\nADD\nJC overflow\nHLT\noverflow:\nOUT\nHLT`,
 'Memory & logic':`; RAM and bitwise operations\nLDA #0b10101010\nSTA 0xF0\nLDB #0b00001111\nAND\nOUT\nLDM 0xF0\nXOR\nOUT\nHLT`
};
