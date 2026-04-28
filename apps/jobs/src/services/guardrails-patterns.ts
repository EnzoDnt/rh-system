// Patterns from f/rh/guardrails_check.ts (lines 75-204), preserved verbatim.

export const INVISIBLE_UNICODE = /[​‌‍‎‏﻿­⁠⁡⁢⁣⁤⁦⁧⁨⁩⁪⁫⁬⁭⁮⁯]/g;

export const INJECTION_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "ignore previous", re: /ignore (all )?previous (instructions?|prompts?|context)/i },
  { name: "disregard previous", re: /disregard (all )?previous/i },
  { name: "forget previous", re: /forget (all )?(your )?previous/i },
  { name: "you are now", re: /you are (now )?(a|an|the)/i },
  { name: "system: tag", re: /\bsystem\s*:/i },
  { name: "assistant: tag", re: /\bassistant\s*:/i },
  { name: "user: tag", re: /\buser\s*:/i },
  { name: "im_start", re: /<\|im_start\|>/ },
  { name: "im_end", re: /<\|im_end\|>/ },
  { name: "INST", re: /\[INST\]/ },
  { name: "/INST", re: /\[\/INST\]/ },
  { name: "SYS", re: /<<SYS>>/ },
  { name: "/SYS", re: /<\/SYS>/ },
  { name: "act as", re: /\bact as (a|an|if)\b/i },
  { name: "pretend", re: /\bpretend (you are|to be)\b/i },
  { name: "role: x", re: /\brole\s*:\s*(system|assistant|user)\b/i },
  { name: "do not score", re: /\bdo not score\b/i },
  { name: "give perfect score", re: /\bgive (me )?(a )?(perfect|maximum|highest) score\b/i },
  { name: "override scoring", re: /\boverride (the )?scoring\b/i },
  { name: "ignore criteria", re: /\bignore (the )?(scoring|evaluation|criteria)\b/i },
];

export const HIDDEN_CSS_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "color white", re: /color\s*:\s*white/i },
  { name: "color #fff", re: /color\s*:\s*#fff(fff)?/i },
  { name: "font-size 0", re: /font-size\s*:\s*0/i },
  { name: "display none", re: /display\s*:\s*none/i },
  { name: "visibility hidden", re: /visibility\s*:\s*hidden/i },
  { name: "opacity 0", re: /opacity\s*:\s*0/i },
  { name: "off-screen", re: /position\s*:\s*absolute\s*;\s*left\s*:\s*-\d+/i },
  { name: "overflow hidden 0", re: /overflow\s*:\s*hidden[^;]*;\s*[^}]*height\s*:\s*0/i },
];

export const BASE64_BLOCK = /[A-Za-z0-9+/]{100,}={0,2}/g;
export const EXCESSIVE_WHITESPACE = /\s{200,}/g;
