export function fullscreenElement(doc){return doc.fullscreenElement||doc.webkitFullscreenElement||null;}

// A camera gesture is not a browser user activation. Keep the request on the
// trusted click/key call stack, and report a usable activation button otherwise.
export class FullscreenControl{
 constructor(doc,navigator,onStatus=()=>{}){this.doc=doc;this.navigator=navigator;this.onStatus=onStatus;this.status='idle';this.pending=false;}
 setStatus(status){this.status=status;this.onStatus(status);}
 async toggle({gesture=false}={}){
  if(this.pending)return false;
  const exiting=!!fullscreenElement(this.doc),target=exiting?this.doc:this.doc.documentElement;
  const action=exiting?(this.doc.exitFullscreen||this.doc.webkitExitFullscreen):(target.requestFullscreen||target.webkitRequestFullscreen);
  if(!action){this.setStatus('unsupported');return false;}
  if(!exiting&&gesture&&this.navigator.userActivation&&!this.navigator.userActivation.isActive){this.setStatus('needs-activation');return false;}
  this.pending=true;
  try{const request=action.call(target);await request;this.setStatus('idle');return true;}
  catch{this.setStatus('blocked');return false;}
  finally{this.pending=false;}
 }
 changed(){this.setStatus('idle');}
}
