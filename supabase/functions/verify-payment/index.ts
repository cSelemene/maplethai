import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {verifyBankSlip} from './provider.mjs';
const headers={'Access-Control-Allow-Origin':'https://cselemene.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const envKey=(name:string,legacy:string)=>{try{return JSON.parse(Deno.env.get(name)||'{}').default||Deno.env.get(legacy)||''}catch{return Deno.env.get(legacy)||''}};
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return reply({error:'UNAUTHORIZED'},401);
 const url=Deno.env.get('SUPABASE_URL')||'';
 const userClient=createClient(url,envKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:auth}}});
 const {data:{user},error:authError}=await userClient.auth.getUser(auth.slice(7));
 if(authError||!user)return reply({error:'UNAUTHORIZED'},401);
 let body;try{if(Number(req.headers.get('Content-Length')||0)>1024)return reply({error:'INVALID_REQUEST'},400);const text=await req.text();if(text.length>1024)return reply({error:'INVALID_REQUEST'},400);body=JSON.parse(text)}catch{return reply({error:'INVALID_REQUEST'},400)}
 if(!Number.isSafeInteger(body?.payment_id)||body.payment_id<=0)return reply({error:'INVALID_REQUEST'},400);
 const admin=createClient(url,envKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:start,error:startError}=await admin.rpc('svc_begin_payment_verification',{p_payment:body.payment_id,p_user:user.id});
 if(startError)return reply({error:'PAYMENT_NOT_AVAILABLE'},403);
 if(!start?.lease)return reply({status:start?.status||'pending',code:start?.code||'ALREADY_VERIFIED'});
 let result={verified:false,code:'PROVIDER_UNAVAILABLE'};
 try{
  const {data:blob,error}=await admin.storage.from('slips').download(start.payment.slip_path);
  if(error||!blob)result={verified:false,code:'SLIP_NOT_AVAILABLE'};
  else if(blob.size>4194304||!['image/jpeg','image/png','image/webp'].includes(blob.type))result={verified:false,code:'MANUAL_IMAGE_REVIEW'};
  else{
   result=await verifyBankSlip({apiKey:start.api_key,blob,payment:start.payment});
  }
 }catch{/* Never log provider credentials, images or bank response data. */}
 const {data:done,error:doneError}=await admin.rpc('svc_finish_payment_verification',{p_payment:body.payment_id,p_lease:start.lease,p_result:result});
 if(doneError)return reply({status:'pending',code:'MANUAL_REVIEW'});
 return reply(done);
});
