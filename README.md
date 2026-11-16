# Octet · 8-bit CPU lab

A React + TypeScript + Tailwind CSS / Vite app with a deterministic CPU engine, two-pass assembler, and live architecture dashboard. No backend or external data services are required.

## Run and verify

```
npm install
npm run dev
npm test
npm run build
```

The tests cover arithmetic overflow and borrow, flags, taken and untaken branches, labels, memory, logical operations, phase timing, invalid opcodes, address wrapping, and assembler errors.

## Machine model

A and B are unsigned 8-bit registers. PC, instruction register, and operand latch are also 8-bit. All 256 bytes of RAM are addressable; code and data share RAM, so stores can modify instructions. Execution uses three real clock ticks per instruction: fetch opcode and increment PC; decode and fetch any operand; execute. PC wraps modulo 256. Step advances one tick; clock speed is ticks per second. HLT and invalid opcodes stop execution. Reset reloads the assembled memory image. Breakpoints stop immediately before opcode fetch and can be resumed or stepped through. Editing source pauses execution and requires assembly before running. Trace retains the last 100 instructions.

Numbers accept decimal, `0xFF`, or `0b11111111`; an optional `#` prefix denotes an immediate operand. Mnemonics and labels are case insensitive. Labels use `name:`; comments start with `;`. Operands must fit 0–255. Programs may occupy up to 256 bytes. Invalid source reports a line-specific error and does not replace the loaded program.

## Instruction set

One-byte opcode followed by one operand byte where indicated. Every instruction takes three ticks in this educational architecture, including one-byte instructions. Z means result is zero; N is bit 7; C means unsigned overflow or borrow. Arithmetic wraps modulo 256. Loads update Z/N and preserve C; arithmetic and CMP update all flags; logical operations update Z/N and clear C. Other instructions preserve flags.

| Mnemonic | Opcode | Bytes | Behavior |
|---|---|---|---|
| NOP | 00 | 1 | No operation |
| LDA byte | 10 | 2 | A ← immediate |
| LDB byte | 11 | 2 | B ← immediate |
| LDM addr | 12 | 2 | A ← RAM[addr] |
| STA addr | 20 | 2 | RAM[addr] ← A |
| ADD | 30 | 1 | A ← A + B |
| SUB | 31 | 1 | A ← A − B; C is borrow |
| INC | 32 | 1 | A ← A + 1 |
| DEC | 33 | 1 | A ← A − 1 |
| CMP | 34 | 1 | Flags from A − B; A unchanged |
| AND | 40 | 1 | A ← A AND B |
| OR | 41 | 1 | A ← A OR B |
| XOR | 42 | 1 | A ← A XOR B |
| JMP addr | 50 | 2 | PC ← addr |
| JZ addr | 51 | 2 | Jump if Z = 1 |
| JNZ addr | 52 | 2 | Jump if Z = 0 |
| JC addr | 53 | 2 | Jump if C = 1 |
| OUT | 60 | 1 | Append unsigned A to output |
| HLT | FF | 1 | Stop execution |

## Interface

Use the example menu to load Addition, Countdown, Overflow, or Memory & logic. Click instruction line numbers for breakpoints. Click any RAM cell to inspect its binary value. The live bus shows the last actual engine transfer; the animation is a visual cue attached to that transfer. The instruction panel explains both the opcode semantics and the current micro-operation. Output and execution trace are separate tabs. The in-app instruction set includes all opcode definitions.

Engine: `src/cpu.ts`; engine tests: `src/cpu.test.ts`; interface: `src/main.tsx`; styling: `src/style.css`.
