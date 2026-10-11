// EasySlip v2 response validation. Never infer success from image text or a QR alone.
const digits=s=>typeof s==='string'?s.replace(/[^0-9]/g,''):'';
export function normalizedName(value){return typeof value==='string'?value.normalize('NFKC').replace(/^(?:ด\.ช\.|ด\.ญ\.|น\.ส\.|เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง)\s*/u,'').replace(/[\s.]/g,'').toLowerCase():''}
export function maskedAccountMatches(mask,full){if(typeof mask!=='string')return false;const pattern=mask.replace(/[\s-]/g,'').toLowerCase();const expected=digits(full);if(!expected||pattern.length!==expected.length||!/^([0-9x*])+$/i.test(pattern))return false;let visible=0;for(let i=0;i<pattern.length;i++){if(/[0-9]/.test(pattern[i])){visible++;if(pattern[i]!==expected[i])return false}}return visible>=4}
export function evaluateSlip(response,payment,now=Date.now()){
 const fail=code=>({verified:false,code});
 if(response?.success!==true||!response.data)return fail('PROVIDER_UNAVAILABLE');
 const data=response.data,raw=data.rawSlip,matched=data.matchedAccount;
 if(data.isDuplicate!==false)return fail('DUPLICATE_SLIP');
 if(!raw||raw.countryCode!=='TH'||raw.amount?.local?.currency!=='THB')return fail('INVALID_CURRENCY');
 if(typeof data.amountInSlip!=='number'||data.amountInSlip!==payment.amount||raw.amount?.amount!==payment.amount||data.isAmountMatched!==true)return fail('AMOUNT_MISMATCH');
 const expected=digits(payment.recipient?.account_number);
 if(!expected||matched?.bank?.code!=='004'||digits(matched.bankNumber)!==expected||raw.receiver?.bank?.id!=='004')return fail('RECIPIENT_MISMATCH');
 if(!maskedAccountMatches(raw.receiver.account?.bank?.account,expected))return fail('RECIPIENT_ACCOUNT_UNCERTAIN');
 const name=normalizedName(payment.recipient?.recipient_name);
 if(!name||normalizedName(raw.receiver.account?.name?.th)!==name)return fail('RECIPIENT_NAME_UNCERTAIN');
 const paid=Date.parse(raw.date),created=Date.parse(payment.created_at);
 if(!Number.isFinite(paid)||!Number.isFinite(created)||paid<created-300000||paid>now+300000)return fail('TRANSFER_TIME_MISMATCH');
 if(typeof raw.transRef!=='string'||raw.transRef.length<6||raw.transRef.length>200)return fail('INVALID_REFERENCE');
 return {verified:true,code:'VERIFIED',amount:data.amountInSlip,bank_code:'004',recipient_account:expected,currency:'THB',transferred_at:raw.date,duplicate:false,trans_ref:raw.transRef};
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
