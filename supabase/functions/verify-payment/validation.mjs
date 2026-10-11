// EasySlip v2 response validation. Never infer success from image text or a QR alone.
const digits=s=>typeof s==='string'?s.replace(/[^0-9]/g,''):'';
export function normalizedName(value){return typeof value==='string'?value.normalize('NFKC').replace(/^(?:ด\.ช\.|ด\.ญ\.|น\.ส\.|เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง)\s*/u,'').replace(/[\s.]/g,'').toLowerCase():''}
export function maskedAccountMatches(mask,full){if(typeof mask!=='string')return false;const pattern=mask.replace(/[\s-]/g,'').toLowerCase();const expected=digits(full);if(!expected||pattern.length!==expected.length||!/^([0-9x*])+$/i.test(pattern))return false;let visible=0;for(let i=0;i<pattern.length;i++){if(/[0-9]/.test(pattern[i])){visible++;if(pattern[i]!==expected[i])return false}}return visible>=4}

function tlv(text){const fields=[];for(let i=0;i<text.length;){const id=text.slice(i,i+2),len=text.slice(i+2,i+4);if(!/^\d{2}$/.test(id)||!/^\d{2}$/.test(len))throw Error();const n=Number(len),value=text.slice(i+4,i+4+n);if(value.length!==n||fields.some(f=>f.id===id))throw Error();fields.push({id,value});i+=4+n}return fields}
export function promptPayReceiver(payload){try{if(typeof payload!=='string'||payload.length>512)return null;const fields=tlv(payload);let crc=0xffff;for(const c of payload.slice(0,-4)){crc^=c.charCodeAt(0)<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff}if(fields.at(-1)?.id!=='63'||fields.at(-1).value!==crc.toString(16).toUpperCase().padStart(4,'0'))return null;const receiver=tlv(fields.find(f=>f.id==='29')?.value||'');const id=receiver.find(f=>f.id==='03')?.value;if(receiver.find(f=>f.id==='00')?.value!=='A000000677010111'||receiver.some(f=>['01','02','04'].includes(f.id))||!/^\d{15}$/.test(id||''))return null;return {type:'EWALLETID',account:id}}catch{return null}}
function abbreviatedNameMatches(raw,full){if(normalizedName(raw)===normalizedName(full))return true;const parts=x=>typeof x==='string'?x.normalize('NFKC').replace(/^(?:ด\.ช\.|ด\.ญ\.|น\.ส\.|เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง)\s*/u,'').trim().split(/\s+/):[];const a=parts(raw),b=parts(full);return a.length===2&&b.length===2&&a[0]===b[0]&&a[1].replace(/\.$/,'').length===1&&a[1].replace(/\.$/,'')===b[1][0]}
function identity(data,payment){
 const raw=data.rawSlip,matched=data.matchedAccount,expected=digits(payment.recipient?.account_number),name=normalizedName(payment.recipient?.recipient_name);
 if(expected&&matched?.bank?.code==='004'&&digits(matched.bankNumber)===expected&&raw.receiver?.bank?.id==='004'){
  if(!maskedAccountMatches(raw.receiver.account?.bank?.account,expected))return {code:'RECIPIENT_ACCOUNT_UNCERTAIN'};
  if(!name||normalizedName(raw.receiver.account?.name?.th)!==name)return {code:'RECIPIENT_NAME_UNCERTAIN'};
  return {bank_code:'004',recipient_account:expected};
 }
 const pp=promptPayReceiver(payment.recipient?.qr_payload);
 // A provider-confirmed full registered ID is required. Matching four visible
 // digits alone is never sufficient, even when the name resembles the receiver.
 if(!pp||matched?.bank?.code!=='PROMPTPAY'||digits(matched.bankNumber)!==pp.account)return {code:'RECIPIENT_MISMATCH'};
 if(!name||normalizedName(matched.nameTh)!==name)return {code:'RECIPIENT_NAME_UNCERTAIN'};
 const account=raw.receiver?.account,proxy=account?.proxy;
 const mask=proxy?.type===pp.type?proxy.account:raw.receiver?.bank?.id==='PROMPTPAY'&&['TOKEN','DUMMY','BANKAC'].includes(account?.bank?.type)?account.bank.account:null;
 if(!maskedAccountMatches(mask,pp.account))return {code:'RECIPIENT_ACCOUNT_UNCERTAIN'};
 if(!abbreviatedNameMatches(account?.name?.th,payment.recipient.recipient_name))return {code:'RECIPIENT_NAME_UNCERTAIN'};
 return {bank_code:'PROMPTPAY',recipient_account:pp.account,recipient_type:pp.type};
}

export function evaluateSlip(response,payment,now=Date.now()){
 const fail=code=>({verified:false,code});
 if(response?.success!==true||!response.data)return fail('PROVIDER_UNAVAILABLE');
 const data=response.data,raw=data.rawSlip,matched=data.matchedAccount;
 if(data.isDuplicate!==false)return fail('DUPLICATE_SLIP');
 if(!raw||raw.countryCode!=='TH'||raw.amount?.local?.currency!=='THB')return fail('INVALID_CURRENCY');
 if(typeof data.amountInSlip!=='number'||data.amountInSlip!==payment.amount||raw.amount?.amount!==payment.amount||data.isAmountMatched!==true)return fail('AMOUNT_MISMATCH');
 const receiver=identity(data,payment);if(receiver.code)return fail(receiver.code);
 const paid=Date.parse(raw.date),created=Date.parse(payment.created_at);
 if(!Number.isFinite(paid)||!Number.isFinite(created)||paid<created-300000||paid>now+300000)return fail('TRANSFER_TIME_MISMATCH');
 if(typeof raw.transRef!=='string'||raw.transRef.length<6||raw.transRef.length>200)return fail('INVALID_REFERENCE');
 return {verified:true,code:'VERIFIED',amount:data.amountInSlip,...receiver,currency:'THB',transferred_at:raw.date,duplicate:false,trans_ref:raw.transRef};
}

// A previously inspected slip is not necessarily consumed. The database receipt ledger
// atomically enforces one credit/fulfilment per bank reference across all products.
export function evaluateReceipt(response,payment,now=Date.now()){
 const fail=code=>({verified:false,code});
 if(response?.success!==true||typeof response.data?.isDuplicate!=='boolean')return fail('PROVIDER_UNAVAILABLE');
 const d=response.data,raw=d.rawSlip,amount=d.amountInSlip;
 if(typeof amount!=='number'||!Number.isFinite(amount)||amount<=0||amount>1000000||Math.abs(amount*100-Math.round(amount*100))>0.000001||raw?.amount?.amount!==amount)return fail('INVALID_RECEIVED_AMOUNT');
 // Empty local currency is used by domestic slips without a foreign-currency leg.
 // A specified non-THB local currency must still be rejected.
 const currency=raw?.amount?.local?.currency;
 if(raw?.countryCode!=='TH'||!['THB','764',''].includes(currency))return fail('INVALID_CURRENCY');
 if(currency===''&&![0,amount].includes(raw.amount.local.amount))return fail('INVALID_CURRENCY');
 const normalized=structuredClone(response);normalized.data.isDuplicate=false;normalized.data.isAmountMatched=true;normalized.data.rawSlip.amount.local.currency='THB';
 const receipt=evaluateSlip(normalized,{...payment,amount},now);
 return receipt.verified?{...receipt,amount_cents:Math.round(amount*100)}:receipt;
}
