import {evaluateReceipt} from './validation.mjs';
export async function verifyBankSlip({apiKey,blob,payment,fetcher=fetch,now=Date.now()}){
 const request=async(checkDuplicate)=>{
  const form=new FormData();form.append('image',blob,'slip');form.append('matchAccount','true');form.append('matchAmount',String((payment.amount_due_cents??payment.amount*100)/100));form.append('checkDuplicate',String(checkDuplicate));
  const response=await fetcher('https://api.easyslip.com/v2/verify/bank',{method:'POST',headers:{Authorization:'Bearer '+apiKey},body:form,signal:AbortSignal.timeout(20000)});
  if(!response.ok)return {result:{verified:false,code:'PROVIDER_UNAVAILABLE'}};
  const body=await response.json();return {result:evaluateReceipt(body,payment,now),duplicate:body?.data?.isDuplicate};
 };
 const first=await request(true);
 // Old cached matching results may predate a corrected receiver registration.
 // Refresh only that failure, once per invocation. Our receipt ledger remains
 // authoritative for preventing duplicate money or entitlement allocation.
 if(first.duplicate===true&&first.result.code==='RECIPIENT_MISMATCH')return (await request(false)).result;
 return first.result;
}
