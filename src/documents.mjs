// Safe local ingestion. All uploads stay inside the private Skill Factory directory.
import { promises as fs } from 'node:fs';
import { execFile as callbackExecFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import crypto from 'node:crypto';
const execFile=promisify(callbackExecFile);
const MAX_BYTES=12*1024*1024; // hard raw upload limit
const MAX_TEXT=800_000; // explicit extraction ceiling, never claim full coverage if truncated
const MAX_BUFFER=14*1024*1024;
const fileTypes={pdf:'application/pdf',epub:'application/epub+zip',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain',md:'text/markdown'};
const fail=(s,status=400)=>Object.assign(new Error(s),{status});
function decodeXml(s){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,(_,x)=>x).replace(/<\/?(?:w:p|p|h[1-6]|div|li|br|section|article|title)(?:\s[^>]*)?\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(_,k)=>{if(k[0]==='#'){const cp=k[1].toLowerCase()==='x'?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return Number.isFinite(cp)&&cp<=0x10ffff?String.fromCodePoint(cp):''}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[k]||''}).replace(/\r/g,'').replace(/[ \t]{2,}/g,' ').replace(/\n\s*\n\s*\n+/g,'\n\n').trim();}
const execOpts={timeout:30_000,maxBuffer:MAX_BUFFER,windowsHide:true};
async function zipList(file){try{const {stdout}=await execFile('unzip',['-Z','-1',file],execOpts);return stdout.split(/\r?\n/).filter(Boolean).filter(x=>!x.startsWith('/')&&!x.split('/').includes('..'))}catch{throw fail('无法读取 ZIP 书籍，需安装系统 unzip，或文件已损坏',422)}}
async function zipRead(file,entry){if(!entry||entry.startsWith('/')||entry.split('/').includes('..'))throw fail('非法 ZIP 路径');try{const {stdout}=await execFile('unzip',['-p',file,entry],{...execOpts,encoding:'utf8'});return stdout}catch{throw fail(`无法读取书籍条目 ${entry}`,422)}}
function xmlAttr(tag,name){const m=tag.match(new RegExp(`\\b${name}\\s*=\\s*['\"]([^'\"]+)['\"]`,'i'));return m?.[1]||'';}
async function parseDocx(file){const entries=await zipList(file);if(!entries.includes('word/document.xml'))throw fail('不是有效 DOCX 文件',422);let xml=await zipRead(file,'word/document.xml');return decodeXml(xml.replace(/<w:tab\b[^>]*\/?\s*>/g,'\t').replace(/<w:br\b[^>]*\/?\s*>/g,'\n').replace(/<\/w:p>/g,'\n'))}
async function parseEpub(file){const entries=await zipList(file);const opf=entries.filter(x=>/\.opf$/i.test(x))[0];const htmls=entries.filter(x=>/\.(xhtml|html|htm)$/i.test(x));let order=[];if(opf){const xml=await zipRead(file,opf);const manifest=new Map();for(const el of xml.match(/<item\b[^>]*>/gi)||[]){const id=xmlAttr(el,'id'),href=xmlAttr(el,'href');if(id&&href)manifest.set(id,href)}const base=path.posix.dirname(opf);for(const el of xml.match(/<itemref\b[^>]*>/gi)||[]){const href=manifest.get(xmlAttr(el,'idref'));if(href){const loc=path.posix.normalize(path.posix.join(base,decodeURIComponent(href.split('#')[0])));if(!htmls.includes(loc))throw fail('EPUB 阅读顺序引用了缺失或不支持的章节',422);order.push(loc)}}}
 if(!order.length)order=htmls.sort(); const unique=[...new Set(order)]; if(!unique.length)throw fail('EPUB 中没有可解析的文本章节',422);let total='';let count=0;for(const name of unique){if(total.length>MAX_TEXT*1.1)break;const data=await zipRead(file,name);const title=name.split('/').pop();total+=`\n\n[章节文件 ${++count}: ${title}]\n`+decodeXml(data.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));}return total.trim();}
async function parsePdf(file){ // Respect host capabilities: poppler on Linux/brew, PDFKit on macOS.
 try{const {stdout}=await execFile('pdftotext',['-layout','-enc','UTF-8',file,'-'],execOpts);if(stdout.trim())return stdout}catch(e){if(e.code!=='ENOENT'&&e.killed)throw fail('PDF 解析超时',422)}
 if(process.platform==='darwin'){
  const script=`ObjC.import('Foundation'); ObjC.import('PDFKit'); function run(argv) { var url=$.NSURL.fileURLWithPath($(argv[0])); var doc=$.PDFDocument.alloc.initWithURL(url); if (!doc) throw Error('invalid PDF'); var pages=Number(doc.pageCount); var arr=[]; for(var i=0;i<pages;i++){var page=doc.pageAtIndex(i);var s=page.string;arr.push('\\n[第 '+(i+1)+' 页]\\n'+(s?ObjC.unwrap(s):''))} return arr.join('\\n') }`;
  try{const {stdout}=await execFile('/usr/bin/osascript',['-l','JavaScript','-e',script,file],{...execOpts,timeout:90_000});if(stdout.trim())return stdout}catch{/* inform user below */}
 }
 throw fail('PDF 未提取到文字。扫描版需要 OCR；普通 PDF 请确认系统支持 pdftotext 或 macOS PDFKit',422);
}
export async function parseDocument(file,extension){if(extension==='txt'||extension==='md')return (await fs.readFile(file)).toString('utf8').replace(/^\uFEFF/,'');if(extension==='pdf')return parsePdf(file);if(extension==='docx')return parseDocx(file);if(extension==='epub')return parseEpub(file);throw fail('不支持的文档类型');}
/** Validate large Base64 payloads in linear time without a quantified capturing group.
 * Previous v0.2.0 pattern /^(....)*...$/ could overflow the JS regexp VM stack
 * on a perfectly valid multi-megabyte uploaded book. */
export function validBase64Payload(value) {
 if(typeof value!=='string'||value.length===0||value.length%4!==0) return false;
 const n=value.length;
 let pad=0;
 if(value.charCodeAt(n-1)===61) {pad=1;if(value.charCodeAt(n-2)===61) pad=2;}
 for(let i=0;i<n-pad;i++){
  const c=value.charCodeAt(i);
  if(!((c>=65&&c<=90)||(c>=97&&c<=122)||(c>=48&&c<=57)||c===43||c===47))return false;
 }
 for(let i=n-pad;i<n;i++)if(value.charCodeAt(i)!==61)return false;
 return true;
}
export function checkUpload({filename,base64}){if(typeof filename!=='string'||filename.length>200)throw fail('文件名称无效');const ext=filename.split('.').pop().toLowerCase();if(!fileTypes[ext])throw fail('仅支持 PDF、EPUB、DOCX、TXT、MD');if(typeof base64!=='string'||base64.length>Math.ceil(MAX_BYTES*4/3)+8||!validBase64Payload(base64))throw fail('文件编码无效或过大',413);const bytes=Buffer.from(base64,'base64');if(bytes.length<8||bytes.length>MAX_BYTES)throw fail('文件大小必须在 8B 至 12MB 内',413);if(ext==='pdf'&&bytes.subarray(0,5).toString()!=='%PDF-')throw fail('PDF 文件头无效',422);if(['docx','epub'].includes(ext)&&bytes.subarray(0,2).toString()!=='PK')throw fail('ZIP 类型书籍文件头无效',422);return {ext,bytes};}
export async function saveAndParse(root,slug,upload){const {ext,bytes}=checkUpload(upload);const uuid=crypto.randomUUID();const dir=path.join(root,'documents',slug);await fs.mkdir(dir,{recursive:true,mode:0o700});const name='raw-'+uuid+'.'+ext;const full=path.join(dir,name);await fs.writeFile(full,bytes,{flag:'wx',mode:0o600});let parsed;try{parsed=await parseDocument(full,ext)}catch(e){await fs.rm(full,{force:true});throw e}const all=parsed.replace(/\x00/g,'').replace(/\r\n/g,'\n').trim();if(all.length<80){await fs.rm(full,{force:true});throw fail('提取文字不足80字；可能是扫描件或加密文件',422)}const truncated=all.length>MAX_TEXT;const clipped=all.slice(0,MAX_TEXT);const textFile=path.join(dir,uuid+'.txt');await fs.writeFile(textFile,clipped,{flag:'wx',mode:0o600});return {id:uuid,name:upload.filename.slice(0,200),type:ext,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),characters:clipped.length,truncated,uploadedAt:new Date().toISOString(),textPath:textFile};}
export async function documentText(root,slug,doc){const expected=path.join(root,'documents',slug,doc.id+'.txt');if(doc.textPath!==expected)throw fail('文档索引与路径不一致',409);const st=await fs.lstat(expected);if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_TEXT*4)throw fail('文档存储不安全',409);return fs.readFile(expected,'utf8')}
export function splitText(text,maxChars=7000){const pieces=[];for(let i=0;i<text.length;i+=maxChars)pieces.push({index:pieces.length+1,start:i,end:Math.min(i+maxChars,text.length),content:text.slice(i,i+maxChars)});return pieces;}
