import l from"bn.js";var Z=new l(0),D=new l(1),Q=new l(2),rr=new l(3),er=new l(5),v=new l(10),S=new l(100),tr=new l(1e3),nr=new l(1e4);import z from"big.js";import J from"decimal.js-light";import{PublicKey as Or}from"@solana/web3.js";import{PublicKey as k,SystemProgram as j}from"@solana/web3.js";import{PublicKey as K}from"@solana/web3.js";var w="1.1.0-beta.0";import"@colors/colors";var x=!1,B=!1,b={debug:1,default:2,info:2,warning:3,error:4,off:5},U={},O;function G(){try{let n=[];if(["NFD","NFC","NFKD","NFKC"].forEach(r=>{try{if("test".normalize(r)!=="test")throw new Error("bad normalize")}catch{n.push(r)}}),n.length)throw new Error("missing "+n.join(", "));if(String.fromCharCode(233).normalize("NFD")!==String.fromCharCode(101,769))throw new Error("broken implementation")}catch(n){if(n instanceof Error)return n.message}return""}var P=G(),I=(p=>(p.DEBUG="DEBUG",p.INFO="INFO",p.WARNING="WARNING",p.ERROR="ERROR",p.OFF="OFF",p))(I||{}),F=(u=>(u.UNKNOWN_ERROR="UNKNOWN_ERROR",u.NOT_IMPLEMENTED="NOT_IMPLEMENTED",u.UNSUPPORTED_OPERATION="UNSUPPORTED_OPERATION",u.NETWORK_ERROR="NETWORK_ERROR",u.RPC_ERROR="RPC_ERROR",u.TIMEOUT="TIMEOUT",u.BUFFER_OVERRUN="BUFFER_OVERRUN",u.NUMERIC_FAULT="NUMERIC_FAULT",u.MISSING_NEW="MISSING_NEW",u.INVALID_ARGUMENT="INVALID_ARGUMENT",u.MISSING_ARGUMENT="MISSING_ARGUMENT",u.UNEXPECTED_ARGUMENT="UNEXPECTED_ARGUMENT",u.INSUFFICIENT_FUNDS="INSUFFICIENT_FUNDS",u))(F||{}),W="0123456789abcdef";function _(n,r=!1){let e=n;try{if(n instanceof Uint8Array){let t="";for(let o=0;o<n.length;o++)t+=W[n[o]>>4],t+=W[n[o]&15];e=`Uint8Array(0x${t})`}else if(n instanceof K)e=`PublicKey(${n.toBase58()})`;else if(n instanceof Object&&!r){let t={};Object.entries(n).forEach(([o,p])=>{t[o]=_(p,!0)}),e=JSON.stringify(t)}else r||(e=JSON.stringify(n))}catch{e=JSON.stringify(n.toString())}return e}var s=class{constructor(r){this.version=w;this.moduleName=r}_log(r,e){let t=r.toLowerCase();b[t]==null&&this.throwArgumentError("invalid log level name","logLevel",r),!((U[this.moduleName]||b.default)>b[t])&&console.log(...e)}debug(...r){this._log(s.levels.DEBUG,["[DEBUG]".blue,...r])}info(...r){this._log(s.levels.INFO,["[INFO]".green,...r])}warn(...r){this._log(s.levels.WARNING,["[WARN]".yellow,...r])}makeError(r,e,t){if(B)return this.makeError("censored error",e,{});e||(e=s.errors.UNKNOWN_ERROR),t||(t={});let o=[];Object.entries(t).forEach(([E,T])=>{o.push(`${E}=${_(T)})`)}),o.push(`code=${e}`),o.push(`module=${this.moduleName}`),o.push(`version=${this.version}`);let p=r;o.length&&(r+=" ("+o.join(", ")+")");let h=new Error(r);return h.reason=p,h.code=e,Object.entries(t).forEach(([E,T])=>{h[E]=T}),h}throwError(r,e,t){throw this.makeError(r,e,t)}throwArgumentError(r,e,t){return this.throwError(r,s.errors.INVALID_ARGUMENT,{argument:e,value:t})}assert(r,e,t,o){r||this.throwError(e,t,o)}assertArgument(r,e,t,o){r||this.throwArgumentError(e,t,o)}checkNormalize(r){r==null&&(r="platform missing String.prototype.normalize"),P&&this.throwError("platform missing String.prototype.normalize",s.errors.UNSUPPORTED_OPERATION,{operation:"String.prototype.normalize",form:P})}checkSafeUint53(r,e){typeof r=="number"&&(e==null&&(e="value not safe"),(r<0||r>=9007199254740991)&&this.throwError(e,s.errors.NUMERIC_FAULT,{operation:"checkSafeInteger",fault:"out-of-safe-range",value:r}),r%1&&this.throwError(e,s.errors.NUMERIC_FAULT,{operation:"checkSafeInteger",fault:"non-integer",value:r}))}checkArgumentCount(r,e,t){t?t=": "+t:t="",r<e&&this.throwError("missing argument"+t,s.errors.MISSING_ARGUMENT,{count:r,expectedCount:e}),r>e&&this.throwError("too many arguments"+t,s.errors.UNEXPECTED_ARGUMENT,{count:r,expectedCount:e})}checkNew(r,e){(r===Object||r==null)&&this.throwError("missing new",s.errors.MISSING_NEW,{name:e.name})}checkAbstract(r,e){r===e?this.throwError("cannot instantiate abstract class "+JSON.stringify(e.name)+" directly; use a sub-class",s.errors.UNSUPPORTED_OPERATION,{name:r.name,operation:"new"}):(r===Object||r==null)&&this.throwError("missing new",s.errors.MISSING_NEW,{name:e.name})}static globalLogger(){return O||(O=new s(w)),O}static setCensorship(r,e){if(!r&&e&&this.globalLogger().throwError("cannot permanently disable censorship",s.errors.UNSUPPORTED_OPERATION,{operation:"setCensorship"}),x){if(!r)return;this.globalLogger().throwError("error censorship permanent",s.errors.UNSUPPORTED_OPERATION,{operation:"setCensorship"})}B=!!r,x=!!e}static setLogLevel(r,e){let t=b[e.toLowerCase()];if(t==null){s.globalLogger().warn("invalid log level - "+e);return}U[r]=t}static from(r){return new s(r)}},c=s;c.errors=F,c.levels=I;import{ASSOCIATED_TOKEN_PROGRAM_ID as br,TOKEN_PROGRAM_ID as Nr}from"@solana/spl-token";import{SYSVAR_CLOCK_PUBKEY as Rr,SYSVAR_RENT_PUBKEY as Er}from"@solana/web3.js";var lr=c.from("common/pubkey"),fr=j.programId,gr=new k("Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo");import{PublicKey as xr}from"@solana/web3.js";import Ur from"bn.js";import{PACKET_DATA_SIZE as Kr,PublicKey as Gr,Transaction as $r}from"@solana/web3.js";var Vr=c.from("common/web3");import N from"bn.js";var y=c.from("entity/bignumber"),M=9007199254740991;function f(n){return n instanceof N?n:typeof n=="string"?n.match(/^-?[0-9]+$/)?new N(n):y.throwArgumentError("invalid BigNumberish string","value",n):typeof n=="number"?n%1?y.throwArgumentError("BigNumberish number underflow","value",n):n>=M||n<=-M?y.throwArgumentError("BigNumberish number overflow","value",n):new N(String(n)):typeof n=="bigint"?new N(n.toString()):y.throwArgumentError("invalid BigNumberish value","value",n)}import $ from"toformat";var q=$,A=q;var R=c.from("entity/fraction"),g=A(z),d=A(J),V={[0]:d.ROUND_DOWN,[1]:d.ROUND_HALF_UP,[2]:d.ROUND_UP},H={[0]:g.roundDown,[1]:g.roundHalfUp,[2]:g.roundUp},i=class{constructor(r,e=D){this.numerator=f(r),this.denominator=f(e)}get quotient(){return this.numerator.div(this.denominator)}invert(){return new i(this.denominator,this.numerator)}add(r){let e=r instanceof i?r:new i(f(r));return this.denominator.eq(e.denominator)?new i(this.numerator.add(e.numerator),this.denominator):new i(this.numerator.mul(e.denominator).add(e.numerator.mul(this.denominator)),this.denominator.mul(e.denominator))}sub(r){let e=r instanceof i?r:new i(f(r));return this.denominator.eq(e.denominator)?new i(this.numerator.sub(e.numerator),this.denominator):new i(this.numerator.mul(e.denominator).sub(e.numerator.mul(this.denominator)),this.denominator.mul(e.denominator))}mul(r){let e=r instanceof i?r:new i(f(r));return new i(this.numerator.mul(e.numerator),this.denominator.mul(e.denominator))}div(r){let e=r instanceof i?r:new i(f(r));return new i(this.numerator.mul(e.denominator),this.denominator.mul(e.numerator))}toSignificant(r,e={groupSeparator:""},t=1){R.assert(Number.isInteger(r),`${r} is not an integer.`),R.assert(r>0,`${r} is not positive.`),d.set({precision:r+1,rounding:V[t]});let o=new d(this.numerator.toString()).div(this.denominator.toString()).toSignificantDigits(r);return o.toFormat(o.decimalPlaces(),e)}toFixed(r,e={groupSeparator:""},t=1){return R.assert(Number.isInteger(r),`${r} is not an integer.`),R.assert(r>=0,`${r} is negative.`),g.DP=r,g.RM=H[t],new g(this.numerator.toString()).div(this.denominator.toString()).toFormat(r,e)}};var C=new i(S),L=class extends i{toSignificant(r=5,e,t){return this.mul(C).toSignificant(r,e,t)}toFixed(r=2,e,t){return this.mul(C).toFixed(r,e,t)}};export{L as Percent,C as _100_PERCENT};
//# sourceMappingURL=percent.mjs.map